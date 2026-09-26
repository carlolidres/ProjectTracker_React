import { collectCnfChangeDescriptions } from "@/lib/cnfTrackerAggregation";
import { formatAppDate, parseAppDateValue } from "@/lib/date";
import { parseFgDeliveryDate } from "@/lib/fgUrgency";
import { deriveWorkflowSnapshot, WORKFLOW_PHASE_LABELS } from "@/lib/projectManagementWorkflow";
import { isMissingValue, valueOrNA } from "@/lib/utils";
import type {
  PhaseOverrideRecord,
  PmTaskPriority,
  PortfolioBoardStatus,
  PortfolioFilters,
  PortfolioItem,
  PortfolioSortKey,
  PortfolioStatusGroup,
  PortfolioSummary,
  Profile,
  ProjectManagementPageView,
  ProjectManagementTask,
  ProjectRow,
  SupportActivity,
  WorkflowPhase,
} from "@/types";

export const PORTFOLIO_STATUS_ORDER: readonly PortfolioStatusGroup[] = [
  "Ongoing",
  "Completed",
  "Cancelled",
];

export const PORTFOLIO_RETURN_PATH = "/project-management";

export const BOARD_STATUS_ORDER: readonly PortfolioBoardStatus[] = [
  "Ongoing",
  "For Review",
  "At Risk",
  "Blocked",
  "Completed",
  "Cancelled",
];

export const BOARD_STATUS_COLORS: Record<PortfolioBoardStatus, string> = {
  Ongoing: "blue",
  "For Review": "purple",
  "At Risk": "orange",
  Blocked: "red",
  Completed: "green",
  Cancelled: "default",
};

const REVIEW_PHASES = new Set<WorkflowPhase>(["protocol_review", "report_review"]);
const PRIORITY_RANK: Record<PmTaskPriority, number> = { High: 3, Medium: 2, Low: 1 };

export function isPortfolioOverdue(
  item: Pick<PortfolioItem, "statusGroup" | "targetDate">,
  today = new Date(),
): boolean {
  if (item.statusGroup === "Completed" || item.statusGroup === "Cancelled") return false;
  const parsed = parseAppDateValue(item.targetDate) ?? parseFgDeliveryDate(item.targetDate);
  if (!parsed) return false;
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  return parsed.valueOf() < end.valueOf();
}

export function deriveBoardStatus(
  item: Pick<PortfolioItem, "statusGroup" | "incompleteCount" | "phase" | "targetDate">,
  tasks: Array<Pick<ProjectManagementTask, "status">> = [],
  today = new Date(),
): PortfolioBoardStatus {
  if (item.statusGroup === "Cancelled") return "Cancelled";
  if (item.statusGroup === "Completed") return "Completed";
  if (tasks.some((task) => task.status === "Blocked")) return "Blocked";
  if (isPortfolioOverdue(item, today)) return "At Risk";
  if (item.incompleteCount > 0 || REVIEW_PHASES.has(item.phase)) return "For Review";
  return "Ongoing";
}

export function derivePortfolioPriority(
  tasks: Array<Pick<ProjectManagementTask, "priority" | "status">> = [],
): PmTaskPriority | "" {
  const open = tasks.filter((task) => task.status !== "Done");
  const pool = open.length > 0 ? open : tasks;
  let best: PmTaskPriority | "" = "";
  let rank = 0;
  for (const task of pool) {
    const next = PRIORITY_RANK[task.priority] ?? 0;
    if (next > rank) {
      rank = next;
      best = task.priority;
    }
  }
  return best;
}

export function derivePortfolioProgress(
  item: Pick<PortfolioItem, "protocolComplete" | "executionComplete" | "reportComplete">,
  tasks: Array<Pick<ProjectManagementTask, "percentComplete">> = [],
): number {
  if (tasks.length > 0) {
    const total = tasks.reduce((sum, task) => sum + Math.min(100, Math.max(0, task.percentComplete || 0)), 0);
    return Math.round(total / tasks.length);
  }
  const done = [item.protocolComplete, item.executionComplete, item.reportComplete].filter(Boolean).length;
  return Math.round((done / 3) * 100);
}

export function parseProjectManagementView(value: string | null | undefined): ProjectManagementPageView {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "tasks" || normalized === "my_tasks") return "my_tasks";
  if (normalized === "board") return "board";
  if (normalized === "calendar") return "calendar";
  if (normalized === "gantt") return "gantt";
  return "portfolio";
}

export function projectManagementViewParam(view: ProjectManagementPageView): string | null {
  if (view === "portfolio") return null;
  return view === "my_tasks" ? "tasks" : view;
}

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

type LinkedTask = Pick<
  ProjectManagementTask,
  "sourceType" | "sourceId" | "phase" | "status" | "priority" | "percentComplete"
>;

function tasksFor(all: LinkedTask[], sourceType: PortfolioItem["sourceType"], sourceId: string) {
  return all.filter((row) => row.sourceType === sourceType && row.sourceId === sourceId);
}

function withBoardMetrics(
  item: Omit<PortfolioItem, "boardStatus" | "priority" | "progress">,
  tasks: LinkedTask[],
): PortfolioItem {
  const next: PortfolioItem = {
    ...item,
    boardStatus: "Ongoing",
    priority: "",
    progress: 0,
  };
  next.boardStatus = deriveBoardStatus(next, tasks);
  next.priority = derivePortfolioPriority(tasks);
  next.progress = derivePortfolioProgress(next, tasks);
  return next;
}

function aggregateProcessProjects(
  rows: ProjectRow[],
  overrides: Array<Pick<PhaseOverrideRecord, "sourceType" | "sourceId" | "gate">>,
  tasks: LinkedTask[],
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
    const linked = tasksFor(tasks, "process", projectId);
    const snapshot = deriveWorkflowSnapshot({
      sourceType: "process",
      projectRows: groupRows,
      overrides: overridesFor(overrides, "process", projectId),
      userTasks: linked,
    });
    items.push(withBoardMetrics({
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
    }, linked));
  }
  return items;
}

function mapSupportActivity(
  row: SupportActivity,
  overrides: Array<Pick<PhaseOverrideRecord, "sourceType" | "sourceId" | "gate">>,
  tasks: LinkedTask[],
): PortfolioItem {
  const title = !isMissingValue(row.non_process_description)
    ? valueOrNA(row.non_process_description)
    : !isMissingValue(row.Product)
      ? valueOrNA(row.Product)
      : displayText(row.Material, displayText(row.activity_kind));
  const linked = tasksFor(tasks, "support", row.activity_id);
  const snapshot = deriveWorkflowSnapshot({
    sourceType: "support",
    support: row,
    overrides: overridesFor(overrides, "support", row.activity_id),
    userTasks: linked,
  });
  return withBoardMetrics({
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
  }, linked);
}

export function buildPortfolioItems(
  projects: ProjectRow[],
  support: SupportActivity[],
  overrides: Array<Pick<PhaseOverrideRecord, "sourceType" | "sourceId" | "gate">> = [],
  tasks: LinkedTask[] = [],
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
    if ((filters.boardStatus ?? "all") !== "all" && item.boardStatus !== filters.boardStatus) return false;
    if ((filters.phase ?? "all") !== "all" && item.phase !== filters.phase) return false;
    if ((filters.owner ?? "all") && filters.owner !== "all" && item.owner !== filters.owner) return false;
    if ((filters.priority ?? "all") !== "all" && item.priority !== filters.priority) return false;
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

export function summarizePortfolio(items: PortfolioItem[], myTaskCount = 0): PortfolioSummary {
  const summary: PortfolioSummary = {
    total: items.length,
    process: 0,
    support: 0,
    ongoing: 0,
    forReview: 0,
    atRisk: 0,
    blocked: 0,
    completed: 0,
    cancelled: 0,
    myTasks: myTaskCount,
  };
  for (const item of items) {
    if (item.sourceType === "process") summary.process += 1;
    else summary.support += 1;
    if (item.statusGroup === "Ongoing") summary.ongoing += 1;
    else if (item.statusGroup === "Completed") summary.completed += 1;
    else summary.cancelled += 1;
    if (item.boardStatus === "For Review") summary.forReview += 1;
    if (item.boardStatus === "At Risk") summary.atRisk += 1;
    if (item.boardStatus === "Blocked") summary.blocked += 1;
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

export function groupPortfolioByBoardStatus(
  items: PortfolioItem[],
): Record<PortfolioBoardStatus, PortfolioItem[]> {
  const grouped = Object.fromEntries(BOARD_STATUS_ORDER.map((status) => [status, [] as PortfolioItem[]])) as Record<
    PortfolioBoardStatus,
    PortfolioItem[]
  >;
  for (const item of items) {
    grouped[item.boardStatus ?? deriveBoardStatus(item)].push(item);
  }
  return grouped;
}

export function sortPortfolioItems(
  items: PortfolioItem[],
  key: PortfolioSortKey = "updated",
  direction: "asc" | "desc" = "desc",
): PortfolioItem[] {
  const sign = direction === "asc" ? 1 : -1;
  const dueMs = (item: PortfolioItem) => {
    const parsed = parseAppDateValue(item.targetDate) ?? parseFgDeliveryDate(item.targetDate);
    return parsed ? parsed.valueOf() : Number.POSITIVE_INFINITY;
  };
  const priorityRank = (item: PortfolioItem) => (item.priority ? PRIORITY_RANK[item.priority] : 0);
  const statusRank = (item: PortfolioItem) => BOARD_STATUS_ORDER.indexOf(item.boardStatus);
  return [...items].sort((a, b) => {
    let cmp = 0;
    if (key === "project") cmp = a.title.localeCompare(b.title);
    else if (key === "priority") cmp = priorityRank(a) - priorityRank(b);
    else if (key === "status") cmp = statusRank(a) - statusRank(b);
    else if (key === "phase") cmp = WORKFLOW_PHASE_LABELS[a.phase].localeCompare(WORKFLOW_PHASE_LABELS[b.phase]);
    else if (key === "owner") cmp = a.owner.localeCompare(b.owner);
    else if (key === "progress") cmp = a.progress - b.progress;
    else if (key === "due") cmp = dueMs(a) - dueMs(b);
    else cmp = (Date.parse(a.updatedAt) || 0) - (Date.parse(b.updatedAt) || 0);
    if (cmp !== 0) return cmp * sign;
    return a.identifier.localeCompare(b.identifier);
  });
}

export function dueDateTone(item: Pick<PortfolioItem, "statusGroup" | "targetDate" | "boardStatus">): "overdue" | "today" | "soon" | "done" | "neutral" {
  if (item.statusGroup === "Completed" || item.boardStatus === "Completed") return "done";
  const parsed = parseAppDateValue(item.targetDate) ?? parseFgDeliveryDate(item.targetDate);
  if (!parsed) return "neutral";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((parsed.startOf("day").valueOf() - today.valueOf()) / 86_400_000);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "soon";
  return "neutral";
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
  return {
    search: "",
    sourceType: "all",
    statusGroup: "all",
    boardStatus: "all",
    phase: "all",
    owner: "all",
    priority: "all",
  };
}

export function portfolioFiltersAreActive(filters: PortfolioFilters): boolean {
  return (
    Boolean(filters.search.trim())
    || filters.sourceType !== "all"
    || filters.statusGroup !== "all"
    || filters.boardStatus !== "all"
    || filters.phase !== "all"
    || filters.owner !== "all"
    || filters.priority !== "all"
  );
}

export type PortfolioGroupBy = "status" | "owner" | "phase";

export function portfolioGroupId(item: PortfolioItem, groupBy: PortfolioGroupBy): string {
  if (groupBy === "owner") return item.owner && item.owner !== "N/A" ? item.owner : "Unassigned";
  if (groupBy === "phase") return item.phase;
  return item.boardStatus;
}

export function summarizePortfolioGroup(items: PortfolioItem[]): {
  high: number;
  medium: number;
  low: number;
  dueLabel: string;
  statusCounts: Record<PortfolioBoardStatus, number>;
} {
  let high = 0;
  let medium = 0;
  let low = 0;
  let earliest = "";
  let latest = "";
  const statusCounts = Object.fromEntries(BOARD_STATUS_ORDER.map((status) => [status, 0])) as Record<PortfolioBoardStatus, number>;
  for (const item of items) {
    statusCounts[item.boardStatus] += 1;
    if (item.priority === "High") high += 1;
    else if (item.priority === "Medium") medium += 1;
    else if (item.priority === "Low") low += 1;
    const parsed = parseAppDateValue(item.targetDate) ?? parseFgDeliveryDate(item.targetDate);
    if (!parsed) continue;
    const iso = parsed.format("YYYY-MM-DD");
    if (!earliest || iso < earliest) earliest = iso;
    if (!latest || iso > latest) latest = iso;
  }
  const start = earliest ? formatAppDate(earliest) : "";
  const end = latest ? formatAppDate(latest) : "";
  const dueLabel = !start ? "—" : start === end ? start : `${start} – ${end}`;
  return { high, medium, low, dueLabel, statusCounts };
}

export function portfolioTimeline(
  tasks: Array<Pick<ProjectManagementTask, "startDate" | "targetDate">>,
): { start: string; end: string; label: string } {
  const isos: string[] = [];
  for (const task of tasks) {
    for (const value of [task.startDate, task.targetDate]) {
      const parsed = parseAppDateValue(value);
      if (parsed) isos.push(parsed.format("YYYY-MM-DD"));
    }
  }
  if (isos.length === 0) return { start: "", end: "", label: "" };
  isos.sort();
  const start = isos[0] ?? "";
  const end = isos[isos.length - 1] ?? start;
  const startLabel = formatAppDate(start);
  const endLabel = formatAppDate(end);
  return { start, end, label: start === end ? startLabel : `${startLabel} – ${endLabel}` };
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
