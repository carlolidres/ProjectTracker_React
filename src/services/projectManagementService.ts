import { getCurrentUser } from "@/lib/auth";
import { mapDbToProject } from "@/lib/mappers";
import { buildPortfolioItems } from "@/lib/projectManagementPortfolio";
import { normalizeProfile } from "@/lib/roleMapping";
import { formatServiceError } from "@/lib/utils";
import { logAuditTrail } from "@/services/auditService";
import { listActiveProjects } from "@/services/projectService";
import { getSupportActivityById, listActiveSupportActivities } from "@/services/supportActivityService";
import { supabase } from "@/lib/supabaseClient";
import type {
  PhaseOverrideRecord,
  PortfolioItem,
  PortfolioSourceType,
  Profile,
  ProjectManagementComment,
  ProjectManagementTask,
  ProjectManagementTaskInput,
  ProjectRow,
  SupportActivity,
  WorkflowGate,
} from "@/types";

const MODULE = "Project Management";

function isMissingRelationError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "42P01"
    || code === "PGRST205"
    || message.includes("does not exist")
    || message.includes("could not find the table")
    || message.includes("schema cache")
  );
}

function workflowUnavailableMessage(): string {
  return "Project Management workflow tables are not applied yet. Ask an administrator to apply the migration.";
}

function emptyDate(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function mapTaskRow(row: Record<string, unknown>, assigneeIds: string[]): ProjectManagementTask {
  return {
    id: String(row.id),
    sourceType: row.source_type === "support" ? "support" : "process",
    sourceId: String(row.source_id ?? ""),
    parentTaskId: row.parent_task_id ? String(row.parent_task_id) : null,
    title: String(row.title ?? ""),
    instructions: String(row.instructions ?? ""),
    phase: (row.phase as ProjectManagementTask["phase"]) || "execution",
    status: (row.status as ProjectManagementTask["status"]) || "Planned",
    priority: (row.priority as ProjectManagementTask["priority"]) || "Medium",
    percentComplete: Number(row.percent_complete ?? 0),
    startDate: emptyDate(row.start_date),
    targetDate: emptyDate(row.target_date),
    actualDate: emptyDate(row.actual_date),
    category: (row.category as ProjectManagementTask["category"]) || "Other",
    dependsOnTaskId: row.depends_on_task_id ? String(row.depends_on_task_id) : null,
    attachmentUrl: String(row.attachment_url ?? ""),
    assigneeIds,
    createdBy: String(row.created_by ?? ""),
    updatedBy: String(row.updated_by ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapOverrideRow(row: Record<string, unknown>): PhaseOverrideRecord {
  return {
    id: String(row.id),
    sourceType: row.source_type === "support" ? "support" : "process",
    sourceId: String(row.source_id ?? ""),
    gate: row.gate === "report" ? "report" : "execution",
    justification: String(row.justification ?? ""),
    createdBy: String(row.created_by ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

async function requireActor(): Promise<{ userId: string; email: string }> {
  const { user, error } = await getCurrentUser();
  if (error || !user) throw new Error("Not signed in.");
  return { userId: user.id, email: user.email ?? user.id };
}

function toDateOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function replaceAssignees(taskId: string, assigneeIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from("project_management_task_assignees")
    .delete()
    .eq("task_id", taskId);
  if (deleteError) throw deleteError;
  const unique = [...new Set(assigneeIds.filter(Boolean))];
  if (unique.length === 0) return;
  const { error } = await supabase.from("project_management_task_assignees").insert(
    unique.map((userId) => ({ task_id: taskId, user_id: userId })),
  );
  if (error) throw error;
}

async function loadAssigneesByTask(taskIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (taskIds.length === 0) return map;
  const { data, error } = await supabase
    .from("project_management_task_assignees")
    .select("task_id, user_id")
    .in("task_id", taskIds);
  if (error) {
    if (isMissingRelationError(error)) return map;
    throw error;
  }
  for (const row of data ?? []) {
    const taskId = String(row.task_id);
    const list = map.get(taskId) ?? [];
    list.push(String(row.user_id));
    map.set(taskId, list);
  }
  return map;
}

async function listTaskRows(filters?: {
  sourceType?: PortfolioSourceType;
  sourceId?: string;
}): Promise<ProjectManagementTask[]> {
  let query = supabase.from("project_management_tasks").select("*").order("created_at", { ascending: true });
  if (filters?.sourceType) query = query.eq("source_type", filters.sourceType);
  if (filters?.sourceId) query = query.eq("source_id", filters.sourceId);
  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
  const rows = data ?? [];
  const assignees = await loadAssigneesByTask(rows.map((row) => String(row.id)));
  return rows.map((row) => mapTaskRow(row as Record<string, unknown>, assignees.get(String(row.id)) ?? []));
}

export async function listPhaseOverrides(): Promise<PhaseOverrideRecord[]> {
  const { data, error } = await supabase
    .from("project_management_phase_overrides")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
  return (data ?? []).map((row) => mapOverrideRow(row as Record<string, unknown>));
}

export async function listProjectManagementTasks(filters?: {
  sourceType?: PortfolioSourceType;
  sourceId?: string;
}): Promise<ProjectManagementTask[]> {
  return listTaskRows(filters);
}

export async function listAssignableProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, first_name, middle_initial, last_name, role, status, department, avatar_url, requested_role, approved_by, approved_at, created_at, updated_at, pm_task_eligible")
    .eq("status", "active")
    .order("full_name");
  if (error) {
    const message = (error.message ?? "").toLowerCase();
    const missingColumn = message.includes("pm_task_eligible") || error.code === "PGRST204";
    if (!missingColumn) throw error;
    const fallback = await supabase
      .from("profiles")
      .select("id, email, full_name, first_name, middle_initial, last_name, role, status, department, avatar_url, requested_role, approved_by, approved_at, created_at, updated_at")
      .eq("status", "active")
      .order("full_name");
    if (fallback.error) throw fallback.error;
    return (fallback.data ?? []).map((row) => normalizeProfile({ ...row, pm_task_eligible: false } as Profile));
  }
  return (data ?? []).map((row) => normalizeProfile(row as Profile));
}

export async function listProjectManagementPortfolio(): Promise<PortfolioItem[]> {
  const [projects, support, overrides, tasks] = await Promise.all([
    listActiveProjects(),
    listActiveSupportActivities(),
    listPhaseOverrides(),
    listTaskRows(),
  ]);
  return buildPortfolioItems(projects, support, overrides, tasks);
}

export async function listProcessRowsByProjectId(projectId: string): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("cnf_projects")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_active", true);
  if (error) throw error;
  return (data ?? []).map((row) => mapDbToProject(row as Record<string, unknown>));
}

export async function createProjectManagementTask(
  input: ProjectManagementTaskInput,
): Promise<ProjectManagementTask> {
  const actor = await requireActor();
  const payload = {
    source_type: input.sourceType,
    source_id: input.sourceId,
    parent_task_id: input.parentTaskId,
    title: input.title.trim(),
    instructions: input.instructions.trim(),
    phase: input.phase,
    status: input.status,
    priority: input.priority,
    percent_complete: input.status === "Done" ? 100 : Math.min(100, Math.max(0, input.percentComplete)),
    start_date: toDateOrNull(input.startDate),
    target_date: toDateOrNull(input.targetDate),
    actual_date: toDateOrNull(input.actualDate),
    category: input.category,
    depends_on_task_id: input.dependsOnTaskId,
    attachment_url: input.attachmentUrl.trim(),
    created_by: actor.userId,
    updated_by: actor.userId,
  };
  const { data, error } = await supabase.from("project_management_tasks").insert(payload).select("*").single();
  if (error) {
    if (isMissingRelationError(error)) throw new Error(workflowUnavailableMessage());
    throw new Error(formatServiceError(error, "Failed to create task"));
  }
  await replaceAssignees(String(data.id), input.assigneeIds);
  await logAuditTrail({
    module: MODULE,
    action: "CREATE",
    recordId: String(data.id),
    projectId: input.sourceId,
    fieldName: "task",
    oldValue: "",
    newValue: input.title,
    remarks: `Created ${input.phase} task for ${input.sourceType} ${input.sourceId}`,
    userEmail: actor.email,
  });
  return mapTaskRow(data as Record<string, unknown>, input.assigneeIds);
}

export async function updateProjectManagementTask(
  taskId: string,
  input: ProjectManagementTaskInput,
  options?: { reopenReason?: string },
): Promise<ProjectManagementTask> {
  const actor = await requireActor();
  const payload = {
    parent_task_id: input.parentTaskId,
    title: input.title.trim(),
    instructions: input.instructions.trim(),
    phase: input.phase,
    status: input.status,
    priority: input.priority,
    percent_complete: input.status === "Done" ? 100 : Math.min(100, Math.max(0, input.percentComplete)),
    start_date: toDateOrNull(input.startDate),
    target_date: toDateOrNull(input.targetDate),
    actual_date: toDateOrNull(input.actualDate),
    category: input.category,
    depends_on_task_id: input.dependsOnTaskId,
    attachment_url: input.attachmentUrl.trim(),
    updated_by: actor.userId,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("project_management_tasks")
    .update(payload)
    .eq("id", taskId)
    .select("*")
    .single();
  if (error) {
    if (isMissingRelationError(error)) throw new Error(workflowUnavailableMessage());
    throw new Error(formatServiceError(error, "Failed to update task"));
  }
  await replaceAssignees(taskId, input.assigneeIds);
  await logAuditTrail({
    module: MODULE,
    action: "UPDATE",
    recordId: taskId,
    projectId: input.sourceId,
    fieldName: "status",
    oldValue: "",
    newValue: input.status,
    remarks: options?.reopenReason
      ? `Reopened task: ${options.reopenReason}`
      : `Updated task ${input.title}`,
    userEmail: actor.email,
  });
  return mapTaskRow(data as Record<string, unknown>, input.assigneeIds);
}

export async function deleteProjectManagementTask(task: ProjectManagementTask): Promise<void> {
  const actor = await requireActor();
  const { error } = await supabase.from("project_management_tasks").delete().eq("id", task.id);
  if (error) {
    if (isMissingRelationError(error)) throw new Error(workflowUnavailableMessage());
    throw new Error(formatServiceError(error, "Failed to delete task"));
  }
  await logAuditTrail({
    module: MODULE,
    action: "DELETE",
    recordId: task.id,
    projectId: task.sourceId,
    fieldName: "task",
    oldValue: task.title,
    newValue: "",
    remarks: `Deleted ${task.phase} task`,
    userEmail: actor.email,
  });
}

export async function listTaskComments(taskId: string): Promise<ProjectManagementComment[]> {
  const { data, error } = await supabase
    .from("project_management_comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
  return (data ?? []).map((row) => ({
    id: String(row.id),
    taskId: String(row.task_id),
    body: String(row.body ?? ""),
    createdBy: String(row.created_by ?? ""),
    createdAt: String(row.created_at ?? ""),
  }));
}

export async function addTaskComment(task: ProjectManagementTask, body: string): Promise<ProjectManagementComment> {
  const actor = await requireActor();
  const { data, error } = await supabase
    .from("project_management_comments")
    .insert({ task_id: task.id, body: body.trim(), created_by: actor.userId })
    .select("*")
    .single();
  if (error) {
    if (isMissingRelationError(error)) throw new Error(workflowUnavailableMessage());
    throw new Error(formatServiceError(error, "Failed to add comment"));
  }
  await logAuditTrail({
    module: MODULE,
    action: "UPDATE",
    recordId: task.id,
    projectId: task.sourceId,
    fieldName: "comment",
    oldValue: "",
    newValue: body.trim(),
    remarks: "Added task comment",
    userEmail: actor.email,
  });
  return {
    id: String(data.id),
    taskId: task.id,
    body: String(data.body ?? ""),
    createdBy: actor.userId,
    createdAt: String(data.created_at ?? ""),
  };
}

export async function savePhaseOverride(input: {
  sourceType: PortfolioSourceType;
  sourceId: string;
  gate: WorkflowGate;
  justification: string;
}): Promise<PhaseOverrideRecord> {
  const actor = await requireActor();
  const { data, error } = await supabase
    .from("project_management_phase_overrides")
    .upsert(
      {
        source_type: input.sourceType,
        source_id: input.sourceId,
        gate: input.gate,
        justification: input.justification.trim(),
        created_by: actor.userId,
      },
      { onConflict: "source_type,source_id,gate" },
    )
    .select("*")
    .single();
  if (error) {
    if (isMissingRelationError(error)) throw new Error(workflowUnavailableMessage());
    throw new Error(formatServiceError(error, "Failed to save phase override"));
  }
  await logAuditTrail({
    module: MODULE,
    action: "UPDATE",
    recordId: `${input.sourceType}:${input.sourceId}`,
    projectId: input.sourceId,
    fieldName: `${input.gate}_override`,
    oldValue: "",
    newValue: input.justification.trim(),
    remarks: `Documented ${input.gate} phase override`,
    userEmail: actor.email,
  });
  return mapOverrideRow(data as Record<string, unknown>);
}

export interface ProjectManagementWorkspace {
  item: PortfolioItem;
  projectRows: ProjectRow[];
  support: SupportActivity | null;
  tasks: ProjectManagementTask[];
  overrides: PhaseOverrideRecord[];
}

export async function loadProjectManagementWorkspace(
  item: PortfolioItem,
): Promise<ProjectManagementWorkspace> {
  const [projectRows, support, tasks, allOverrides] = await Promise.all([
    item.sourceType === "process" ? listProcessRowsByProjectId(item.sourceId) : Promise.resolve([]),
    item.sourceType === "support" ? getSupportActivityById(item.sourceId) : Promise.resolve(null),
    listTaskRows({ sourceType: item.sourceType, sourceId: item.sourceId }),
    listPhaseOverrides(),
  ]);
  return {
    item,
    projectRows,
    support,
    tasks,
    overrides: allOverrides.filter(
      (row) => row.sourceType === item.sourceType && row.sourceId === item.sourceId,
    ),
  };
}
