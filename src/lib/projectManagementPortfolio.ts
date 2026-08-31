import { collectCnfChangeDescriptions } from "@/lib/cnfTrackerAggregation";
import { parseFgDeliveryDate } from "@/lib/fgUrgency";
import { deriveWorkflowSnapshot, WORKFLOW_PHASE_LABELS } from "@/lib/projectManagementWorkflow";
import { isMissingValue, valueOrNA } from "@/lib/utils";
import type {
  PhaseOverrideRecord,
  PortfolioFilters,
  PortfolioItem,
  PortfolioStatusGroup,
  PortfolioSummary,
  Profile,
  ProjectManagementTask,
  ProjectRow,
  SupportActivity,
} from "@/types";

export const PORTFOLIO_STATUS_ORDER: readonly PortfolioStatusGroup[] = [
  "Ongoing",
  "Completed",
  "Cancelled",
];

export const PORTFOLIO_RETURN_PATH = "/project-management";

export function mapSourceStatusToGroup(status: string): PortfolioStatusGroup {
  const normalized = valueOrNA(status).toLowerCase();
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelled";
  if (normalized === "closed" || normalized === "done" || normalized === "completed") {
    return "Completed";
  }
  return "Ongoing";
}

function displayText(value: unknown, fallback = "N/A"): string {
  const text = valueOrNA(value);
  return text === "N/A" ? fallback : text;
}

function uniqueStatuses(values: string[]): string {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    const label = valueOrNA(value);
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(label);
  }
  return ordered.join(" / ") || "N/A";
}

function uniqueDisplayValues(values: unknown[]): string {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    const label = valueOrNA(value);
    if (label === "N/A") continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(label);
  }
  return ordered.join(" · ") || "N/A";
}

function pickStatusGroup(groups: PortfolioStatusGroup[]): PortfolioStatusGroup {
  if (groups.includes("Ongoing")) return "Ongoing";
  if (groups.includes("Completed")) return "Completed";
  return "Cancelled";
}

function latestTimestamp(values: string[]): string {
  let latest = "";
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) continue;
    if (ms >= latestMs) {
      latestMs = ms;
      latest = value;
    }
  }
  return latest;
}

function pickTargetDate(rows: ProjectRow[], groups: PortfolioStatusGroup[]): string {
  const preferred = rows.filter((_, index) => groups[index] === "Ongoing");
  const pool = preferred.length > 0 ? preferred : rows;
  let earliest: string | null = null;
  let earliestMs = Number.POSITIVE_INFINITY;
  for (const row of pool) {
    const parsed = parseFgDeliveryDate(row.fg_month);
    if (!parsed) continue;
    const ms = parsed.valueOf();
    if (ms < earliestMs) {
      earliestMs = ms;
      earliest = valueOrNA(row.fg_month);
    }
  }
  return earliest ?? displayText(pool[0]?.fg_month);
}

function overridesFor(
  all: Array<Pick<PhaseOverrideRecord, "sourceType" | "sourceId" | "gate">>,
  sourceType: PortfolioItem["sourceType"],
  sourceId: string,
): Array<Pick<PhaseOverrideRecord, "gate">> {
  return all.filter((row) => row.sourceType === sourceType && row.sourceId === sourceId);
}

function tasksFor(
  all: Array<Pick<ProjectManagementTask, "sourceType" | "sourceId" | "phase" | "status">>,
  sourceType: PortfolioItem["sourceType"],
  sourceId: string,
) {
  return all.filter((row) => row.sourceType === sourceType && row.sourceId === sourceId);
}

function aggregateProcessProjects(
  rows: ProjectRow[],
  overrides: Array<Pick<PhaseOverrideRecord, "sourceType" | "sourceId" | "gate">>,
  tasks: Array<Pick<ProjectManagementTask, "sourceType" | "sourceId" | "phase" | "status">>,
): PortfolioItem[] {
  const byProject = new Map<string, ProjectRow[]>();
  for (const row of rows) {
    const projectId = valueOrNA(row.project_id);
    if (projectId === "N/A") continue;
    const group = byProject.get(projectId) ?? [];
    group.push(row);
    byProject.set(projectId, group);
  }

  const items: PortfolioItem[] = [];
  for (const [projectId, groupRows] of byProject) {
    const groups = groupRows.map((row) => mapSourceStatusToGroup(row.final_status));
    const representative = [...groupRows].sort((a, b) => {
      const aMs = Date.parse(a.updated_at) || 0;
      const bMs = Date.parse(b.updated_at) || 0;
      return bMs - aMs;
    })[0];
    const snapshot = deriveWorkflowSnapshot({
      sourceType: "process",
      projectRows: groupRows,
      overrides: overridesFor(overrides, "process", projectId),
      userTasks: tasksFor(tasks, "process", projectId),
    });
    items.push({
      id: `process:${projectId}`,
      sourceType: "process",
      sourceId: projectId,
      title: displayText(representative?.product_name, displayText(representative?.client_name)),
      identifier: projectId,
      owner: displayText(representative?.project_owner),
      targetDate: pickTargetDate(groupRows, groups),
      sourceStatus: uniqueStatuses(groupRows.map((row) => row.final_status)),
      statusGroup: pickStatusGroup(groups),
      recordCount: groupRows.length,
      updatedAt: latestTimestamp(groupRows.map((row) => row.updated_at)),
      phase: snapshot.phase,
      category: snapshot.category,
      changeLabel: collectCnfChangeDescriptions(groupRows) || snapshot.changeLabel,
      uniqueBatch: uniqueDisplayValues(groupRows.map((row) => row.unique_batch)),
      client: snapshot.client,
      product: snapshot.product,
      protocolStatus: snapshot.protocolStatus,
      incompleteCount: snapshot.incompleteRequirements.length,
      protocolComplete: snapshot.protocolComplete,
      executionComplete: snapshot.executionComplete,
      reportComplete: snapshot.reportComplete,
    });
  }
  return items;
}

function mapSupportActivity(
  row: SupportActivity,
  overrides: Array<Pick<PhaseOverrideRecord, "sourceType" | "sourceId" | "gate">>,
  tasks: Array<Pick<ProjectManagementTask, "sourceType" | "sourceId" | "phase" | "status">>,
): PortfolioItem {
  const title = !isMissingValue(row.non_process_description)
    ? valueOrNA(row.non_process_description)
    : !isMissingValue(row.Product)
      ? valueOrNA(row.Product)
      : displayText(row.Material, displayText(row.activity_kind));
  const snapshot = deriveWorkflowSnapshot({
    sourceType: "support",
    support: row,
    overrides: overridesFor(overrides, "support", row.activity_id),
    userTasks: tasksFor(tasks, "support", row.activity_id),
  });
  return {
    id: `support:${row.activity_id}`,
    sourceType: "support",
    sourceId: row.activity_id,
    title,
    identifier: row.activity_id,
    owner: displayText(row.Department),
    targetDate: displayText(row.Target_Date),
    sourceStatus: displayText(row.status),
    statusGroup: mapSourceStatusToGroup(row.status),
    recordCount: 1,
    updatedAt: row.updated_at,
    phase: snapshot.phase,
    category: snapshot.category,
    changeLabel: snapshot.changeLabel,
    uniqueBatch: "N/A",
    client: snapshot.client,
    product: snapshot.product,
    protocolStatus: snapshot.protocolStatus,
    incompleteCount: snapshot.incompleteRequirements.length,
    protocolComplete: snapshot.protocolComplete,
    executionComplete: snapshot.executionComplete,
    reportComplete: snapshot.reportComplete,
  };
}

export function buildPortfolioItems(
  projects: ProjectRow[],
  support: SupportActivity[],
  overrides: Array<Pick<PhaseOverrideRecord, "sourceType" | "sourceId" | "gate">> = [],
  tasks: Array<Pick<ProjectManagementTask, "sourceType" | "sourceId" | "phase" | "status">> = [],
): PortfolioItem[] {
  return [
    ...aggregateProcessProjects(projects, overrides, tasks),
    ...support.map((row) => mapSupportActivity(row, overrides, tasks)),
  ];
}

export function filterPortfolioItems(
  items: PortfolioItem[],
  filters: PortfolioFilters,
): PortfolioItem[] {
  const search = filters.search.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.sourceType !== "all" && item.sourceType !== filters.sourceType) return false;
    if (filters.statusGroup !== "all" && item.statusGroup !== filters.statusGroup) return false;
    if ((filters.phase ?? "all") !== "all" && item.phase !== filters.phase) return false;
    if (!search) return true;
    const haystack = [
      item.title,
      item.identifier,
      item.owner,
      item.sourceStatus,
      item.sourceType,
      item.client,
      item.product,
      item.uniqueBatch,
      item.changeLabel,
      item.category,
      WORKFLOW_PHASE_LABELS[item.phase],
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  });
}

export function summarizePortfolio(items: PortfolioItem[]): PortfolioSummary {
  const summary: PortfolioSummary = {
    total: items.length,
    process: 0,
    support: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const item of items) {
    if (item.sourceType === "process") summary.process += 1;
    else summary.support += 1;
    if (item.statusGroup === "Ongoing") summary.ongoing += 1;
    else if (item.statusGroup === "Completed") summary.completed += 1;
    else summary.cancelled += 1;
  }
  return summary;
}

export function groupPortfolioItems(
  items: PortfolioItem[],
): Record<PortfolioStatusGroup, PortfolioItem[]> {
  const grouped: Record<PortfolioStatusGroup, PortfolioItem[]> = {
    Ongoing: [],
    Completed: [],
    Cancelled: [],
  };
  for (const item of items) {
    grouped[item.statusGroup].push(item);
  }
  for (const status of PORTFOLIO_STATUS_ORDER) {
    grouped[status].sort((a, b) => {
      const aMs = Date.parse(a.updatedAt) || 0;
      const bMs = Date.parse(b.updatedAt) || 0;
      if (aMs !== bMs) return bMs - aMs;
      return a.identifier.localeCompare(b.identifier);
    });
  }
  return grouped;
}

export function portfolioSourcePath(item: PortfolioItem): string {
  const params = new URLSearchParams();
  if (item.sourceType === "process") params.set("projectId", item.sourceId);
  else params.set("activityId", item.sourceId);
  params.set("return_to", PORTFOLIO_RETURN_PATH);
  const base = item.sourceType === "process" ? "/projects" : "/support-activities";
  return `${base}?${params.toString()}`;
}

export function emptyPortfolioFilters(): PortfolioFilters {
  return { search: "", sourceType: "all", statusGroup: "all", phase: "all" };
}

export function portfolioAssigneeKey(sourceType: string, sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

export function assigneesByPortfolioSource(
  tasks: Array<Pick<ProjectManagementTask, "sourceType" | "sourceId" | "assigneeIds">>,
  profiles: Profile[],
): Record<string, Profile[]> {
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  const idsByKey = new Map<string, string[]>();
  for (const task of tasks) {
    const key = portfolioAssigneeKey(task.sourceType, task.sourceId);
    const current = idsByKey.get(key) ?? [];
    for (const assigneeId of task.assigneeIds) {
      if (assigneeId && !current.includes(assigneeId)) current.push(assigneeId);
    }
    idsByKey.set(key, current);
  }
  const next: Record<string, Profile[]> = {};
  for (const [key, ids] of idsByKey) {
    const people = ids.map((id) => byId.get(id)).filter((profile): profile is Profile => Boolean(profile));
    if (people.length > 0) next[key] = people;
  }
  return next;
}
