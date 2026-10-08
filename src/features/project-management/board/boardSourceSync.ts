import type { DateFieldChange } from "@/lib/dateAdjustmentReview";
import { shouldRequireDateAdjustmentReason } from "@/lib/dateAdjustmentReview";
import { emitProjectDataChanged, emitSupportDataChanged } from "@/lib/projectDataEvents";
import { supabase } from "@/lib/supabaseClient";
import { isMissingValue } from "@/lib/utils";
import { logAuditTrail } from "@/services/auditService";
import { listActiveProjects } from "@/services/projectService";
import { listProcessRowsByProjectId } from "@/services/projectManagementService";
import { listActiveSupportActivities } from "@/services/supportActivityService";
import type { ProjectRow, SupportActivity } from "@/types";
import {
  spreadsheetPatchesForTask,
  spreadsheetRowLabel,
  supportActivityLabel,
  supportPatchesForTask,
  planSpreadsheetTasks,
  planSupportTasks,
  type SourceColumnPatch,
} from "@/features/project-management/board/boardSourcePlan";
import { groupIdForStatus, type PmBoardTask, type PmGroup, type PmProject } from "@/features/project-management/board/boardRules";
import { linkProjectSource, updateProject, updateTask } from "@/features/project-management/board/boardService";

let boardOwnsSourceWrite = false;

export function boardOwnsSourceWriteNow(): boolean {
  return boardOwnsSourceWrite;
}

export function markBoardSourceWrite(active: boolean): void {
  boardOwnsSourceWrite = active;
}

const SHEET_KEY: Record<string, keyof ProjectRow> = {
  protocol_status: "protocol_Status",
  protocol_target_date: "protocol_target_date",
  validation_report_status: "validation_report_status",
  validation_report_target_date: "validation_report_target_date",
  endorsement_report_status: "endorsement_report_status",
  endorsement_acceptance_target_date: "endorsement_acceptance_target_date",
  manufacturing_start_week: "manufacturing_start_week",
  mo_bmr_po_activation_date: "mo_bmr_po_activation_date",
  ar_availability_date: "ar_availability_date",
  packaging_schedule: "packaging_schedule",
};

const SUPPORT_KEY: Record<string, keyof SupportActivity> = {
  status: "status",
  status_date: "status_date",
  target_date: "Target_Date",
  planning_schedule: "Planning_Schedule",
  protocol_status: "protocol_status",
  report_status: "report_status",
  endorsement_status: "endorsement_status",
  machinability_protocol_status: "Machinability_Protocol_Status",
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function sameValue(left: unknown, right: string | null, date: boolean): boolean {
  const current = text(left);
  const next = text(right);
  if (date) return current.slice(0, 10) === next.slice(0, 10);
  if (isMissingValue(current) && !next) return true;
  return current === next;
}

async function rememberLink(project: PmProject): Promise<PmProject> {
  if (project.sourceKind && project.sourceId) return project;
  if (project.description.startsWith("From Support ")) {
    const id = project.description.slice("From Support ".length).trim();
    if (!id) return project;
    await linkProjectSource(project.id, { kind: "support", id });
    return { ...project, sourceKind: "support", sourceId: id };
  }
  if (project.description.startsWith("From Spreadsheet ")) {
    const label = project.description.slice("From Spreadsheet ".length).trim();
    const rows = await listActiveProjects();
    const wanted = label.toLowerCase();
    const row = rows.find((item) => {
      if (spreadsheetRowLabel(item).toLowerCase() === wanted) return true;
      const legacy = [item.unique_batch, item.po_control_no, item.product_name]
        .map((value) => String(value ?? "").trim() || "—")
        .join(" | ");
      return legacy.toLowerCase() === wanted;
    });
    if (!row?.project_id) return project;
    await linkProjectSource(project.id, { kind: "spreadsheet", id: row.project_id, recordId: row.record_id });
    return { ...project, sourceKind: "spreadsheet", sourceId: row.project_id, sourceRecordId: row.record_id ?? "" };
  }
  return project;
}

function sheetStatus(row: ProjectRow, title: string): string {
  if (title === "Protocol" || title === "Protocol status") return text(row.protocol_Status);
  if (title === "Report" || title === "Validation report status") return text(row.validation_report_status);
  if (title === "Endorsement" || title === "Endorsement report status") return text(row.endorsement_report_status);
  return "";
}

function supportStatus(row: SupportActivity, title: string): string {
  if (title === "Execution" || title === "Activity status") return text(row.status);
  if (title === "Machinability protocol status") return text(row.Machinability_Protocol_Status);
  if (title === "Report" || title === "Report status") return text(row.report_status);
  if (title === "Endorsement" || title === "Endorsement status") return text(row.endorsement_status);
  return text(row.protocol_status);
}

export async function pushTaskToSource(
  project: PmProject,
  task: PmBoardTask,
  userEmail: string,
  confirmDates: (changes: DateFieldChange[]) => Promise<boolean>,
): Promise<void> {
  const linked = await rememberLink(project);
  if (!linked.sourceKind || !linked.sourceId) return;
  if (linked.sourceKind === "spreadsheet") {
    const rows = await listProcessRowsByProjectId(linked.sourceId);
    const row = rows.find((item) => item.record_id === linked.sourceRecordId) ?? rows[0];
    if (!row) return;
    const patches = spreadsheetPatchesForTask(task.title, task.status, task.dueDate, sheetStatus(row, task.title))
      .filter((patch) => !sameValue(row[SHEET_KEY[patch.column]], patch.value, patch.date));
    if (!patches.length) return;
    const ordered = [row, ...rows.filter((item) => item.record_id !== row.record_id)];
    await confirmAndWrite(patches, ordered.map((item) => item as unknown as Record<string, unknown>), linked, userEmail, confirmDates, "Projects");
    return;
  }
  const activity = (await listActiveSupportActivities()).find((item) => item.activity_id === linked.sourceId);
  if (!activity) return;
  const patches = supportPatchesForTask(task.title, task.status, task.dueDate, task.startDate, supportStatus(activity, task.title))
    .filter((patch) => !sameValue(activity[SUPPORT_KEY[patch.column]], patch.value, patch.date));
  if (!patches.length) return;
  await confirmAndWrite(patches, [activity as unknown as Record<string, unknown>], linked, userEmail, confirmDates, "Support Activities");
}

async function confirmAndWrite(
  patches: SourceColumnPatch[],
  rows: Record<string, unknown>[],
  project: PmProject,
  userEmail: string,
  confirmDates: (changes: DateFieldChange[]) => Promise<boolean>,
  moduleName: "Projects" | "Support Activities",
) {
  const keys = moduleName === "Projects" ? SHEET_KEY : SUPPORT_KEY;
  const dateChanges: DateFieldChange[] = [];
  for (const patch of patches.filter((item) => item.date)) {
    const key = keys[patch.column] as string;
    const oldValue = text(rows[0]?.[key]);
    const newValue = text(patch.value);
    if (!shouldRequireDateAdjustmentReason(oldValue, newValue)) continue;
    dateChanges.push({
      fieldName: patch.column,
      fieldLabel: patch.column.replace(/_/g, " "),
      oldDate: oldValue,
      newDate: newValue,
      recordContext: project.name,
      sourceModule: moduleName,
      projectId: project.sourceId,
    });
  }
  if (dateChanges.length && !await confirmDates(dateChanges)) {
    throw new Error("Date change was cancelled.");
  }
  const payload: Record<string, string | null> = { updated_at: new Date().toISOString() };
  for (const patch of patches) payload[patch.column] = patch.value;
  if (moduleName === "Projects") {
    const projectPatches = patches.filter((patch) => patch.scope === "project");
    const rowPatches = patches.filter((patch) => patch.scope === "row");
    if (projectPatches.length) {
      const projectPayload: Record<string, string | null> = { updated_at: payload.updated_at };
      for (const patch of projectPatches) projectPayload[patch.column] = patch.value;
      const { error } = await supabase.from("cnf_projects").update(projectPayload).eq("project_id", project.sourceId).eq("is_active", true);
      if (error) throw error;
    }
    if (rowPatches.length) {
      const rowPayload: Record<string, string | null> = { updated_at: payload.updated_at };
      for (const patch of rowPatches) rowPayload[patch.column] = patch.value;
      const query = supabase.from("cnf_projects").update(rowPayload).eq("project_id", project.sourceId).eq("is_active", true);
      const { error } = project.sourceRecordId ? await query.eq("record_id", project.sourceRecordId) : await query;
      if (error) throw error;
    }
    emitProjectDataChanged({ projectId: project.sourceId, action: "update" });
  } else {
    const { error } = await supabase.from("support_activities").update(payload).eq("activity_id", project.sourceId).eq("is_active", true);
    if (error) throw error;
    emitSupportDataChanged(project.sourceId);
  }
  for (const patch of patches) {
    const key = keys[patch.column] as string;
    await logAuditTrail({
      module: moduleName,
      action: "UPDATE",
      recordId: project.sourceRecordId || project.sourceId,
      projectId: project.sourceId,
      fieldName: patch.column,
      oldValue: text(rows[0]?.[key]),
      newValue: text(patch.value),
      remarks: `Updated from the project board (${project.name})`,
      userEmail,
    });
  }
}

export async function alignBoardFromSource(
  project: PmProject,
  tasks: PmBoardTask[],
  groups: PmGroup[],
  userEmail: string,
): Promise<{ project: PmProject; tasks: PmBoardTask[] }> {
  const linked = await rememberLink(project);
  if (!linked.sourceKind || !linked.sourceId) return { project: linked, tasks };
  let seeds;
  let sourceName = "";
  if (linked.sourceKind === "spreadsheet") {
    const rows = await listProcessRowsByProjectId(linked.sourceId);
    seeds = planSpreadsheetTasks(rows);
    const row = rows.find((item) => item.record_id === linked.sourceRecordId) ?? rows[0];
    sourceName = row ? spreadsheetRowLabel(row) : "";
  } else {
    const activity = (await listActiveSupportActivities()).find((item) => item.activity_id === linked.sourceId);
    if (!activity) return { project: linked, tasks };
    seeds = planSupportTasks(activity);
    sourceName = supportActivityLabel(activity);
  }
  let next = tasks;
  const wanted = seeds.flatMap((seed) => [seed, ...seed.subtasks.map((sub) => ({ ...sub, parent: seed.title }))]);
  for (const task of tasks) {
    const match = wanted.find((item) => item.title === task.title);
    if (!match) continue;
    const groupId = task.parentTaskId ? task.groupId : (groupIdForStatus(match.status, groups) ?? task.groupId);
    const dueDate = "dueDate" in match ? match.dueDate : "";
    if (task.status === match.status && task.dueDate.slice(0, 10) === dueDate.slice(0, 10) && task.groupId === groupId) continue;
    const patch = { status: match.status, dueDate, groupId };
    await updateTask(task, patch, userEmail);
    next = next.map((item) => (item.id === task.id ? { ...item, ...patch } : item));
  }
  let named = linked;
  if (sourceName && sourceName !== linked.name) {
    try {
      await updateProject(linked, { name: sourceName }, userEmail);
    } catch {
      // The title still follows the source record when this user cannot rename the project.
    }
    named = { ...linked, name: sourceName };
  }
  return { project: named, tasks: next };
}
