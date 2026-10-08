export const BOARD_STATUSES = ["Not Started", "Working on it", "Done", "Stuck"] as const;
export const BOARD_PRIORITIES = ["Low", "Medium", "High"] as const;
export const WORKSPACE_ROLES = ["Owner", "Admin", "Member"] as const;
export const PROJECT_ACCESS_ROLES = ["Owner", "Editor", "Commenter", "Viewer"] as const;

export type BoardStatus = (typeof BOARD_STATUSES)[number];
export type BoardPriority = (typeof BOARD_PRIORITIES)[number];
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];
export type ProjectAccess = (typeof PROJECT_ACCESS_ROLES)[number];
export type ProjectVisibility = "workspace" | "invited";
export type BoardGroupBy = "group" | "status" | "priority";

export const STATUS_COLOR: Record<BoardStatus, string> = {
  "Not Started": "#c4c4c4",
  "Working on it": "#fdab3d",
  Done: "#00c875",
  Stuck: "#e2445c",
};

export const PRIORITY_COLOR: Record<BoardPriority, string> = {
  Low: "#579bfc",
  Medium: "#5559df",
  High: "#401694",
};

export const STANDARD_GROUPS = [
  { name: "Planned", color: "#579bfc" },
  { name: "On-going", color: "#fdab3d" },
  { name: "Done", color: "#00c875" },
] as const;

export const LAST_BOARD_KEY = "project-tracker:pm-board:last";

export interface PmWorkspace {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  archivedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  role: WorkspaceRole;
}

export interface PmProject {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  visibility: ProjectVisibility;
  sortOrder: number;
  archivedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  scheduleMode: ScheduleMode;
  workingDays: number[];
  holidays: string[];
  sourceKind: "spreadsheet" | "support" | null;
  sourceId: string;
  sourceRecordId: string;
}

export interface PmMembership {
  userId: string;
  role: string;
  createdAt: string;
}

export interface PmGroup {
  id: string;
  projectId: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface PmBoardTask {
  id: string;
  projectId: string;
  groupId: string;
  parentTaskId: string | null;
  title: string;
  description: string;
  status: BoardStatus;
  priority: BoardPriority;
  startDate: string;
  dueDate: string;
  ownerId: string;
  sortOrder: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type BoardSortKey = "priority" | "updated" | "title" | "due";

const STATUS_RANK: Record<BoardStatus, number> = {
  Stuck: 0,
  "Not Started": 1,
  "Working on it": 2,
  Done: 3,
};

const PRIORITY_RANK: Record<BoardPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

function groupNameKey(name: string): string {
  const value = name.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (value === "ongoing" || value === "on-going") return "on-going";
  return value;
}

/** Working on it → On-going, Done → Done, Not Started and Stuck → Planned. */
export function groupIdForStatus(status: BoardStatus, groups: Pick<PmGroup, "id" | "name">[]): string | null {
  const wanted = status === "Working on it" ? "on-going" : status === "Done" ? "done" : "planned";
  return groups.find((group) => groupNameKey(group.name) === wanted)?.id ?? null;
}

/** Stuck before Not Started, then High, Medium, Low. Other sorts stay explicit. */
export function compareBoardTasks(a: PmBoardTask, b: PmBoardTask, sortKey: BoardSortKey): number {
  if (sortKey === "title") return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  if (sortKey === "due") return (a.dueDate || "9999-99-99").localeCompare(b.dueDate || "9999-99-99") || a.id.localeCompare(b.id);
  if (sortKey === "updated") return b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);
  const status = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  if (status) return status;
  const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (priority) return priority;
  return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
}

export interface BoardFilters {
  search: string;
  ownerId: string;
  status: BoardStatus | "all";
  priority: BoardPriority | "all";
  groupId: string;
}

export const EMPTY_BOARD_FILTERS: BoardFilters = {
  search: "",
  ownerId: "all",
  status: "all",
  priority: "all",
  groupId: "all",
};

/** Mirrors pm_project_access. Workspace membership never opens an invited project. */
export function resolveProjectAccess(input: {
  workspaceRole: WorkspaceRole | null;
  visibility: ProjectVisibility;
  projectRole: ProjectAccess | null;
}): ProjectAccess | null {
  if (input.visibility === "invited") return input.projectRole;
  if (input.projectRole) return input.projectRole;
  if (input.workspaceRole === "Owner" || input.workspaceRole === "Admin") return "Owner";
  if (input.workspaceRole === "Member") return "Editor";
  return null;
}

export function canEditBoard(access: ProjectAccess | null): boolean {
  return access === "Owner" || access === "Editor";
}

export function canCommentOnBoard(access: ProjectAccess | null): boolean {
  return access === "Owner" || access === "Editor" || access === "Commenter";
}

export function datesAreOrdered(start: string | null | undefined, due: string | null | undefined): boolean {
  const startDay = (start ?? "").trim();
  const dueDay = (due ?? "").trim();
  if (!startDay || !dueDay) return true;
  return dueDay >= startDay;
}

export function canDeleteGroup(taskCount: number): boolean {
  return taskCount === 0;
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daySpan(start: string, due: string): number {
  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = due.split("-").map(Number);
  const a = Date.UTC(ys, (ms ?? 1) - 1, ds ?? 1);
  const b = Date.UTC(ye, (me ?? 1) - 1, de ?? 1);
  return Math.round((b - a) / 86400000) + 1;
}

export function shiftTaskDates(start: string, due: string, days: number): { startDate: string; dueDate: string } {
  return { startDate: addDays(start, days), dueDate: addDays(due, days) };
}

export const RELATION_TYPES = ["FS", "SS", "FF", "SF"] as const;
export type RelationType = (typeof RELATION_TYPES)[number];
export type ScheduleMode = "flexible" | "strict" | "none";

export const RELATION_LABEL: Record<RelationType, string> = {
  FS: "Finish-to-Start",
  SS: "Start-to-Start",
  FF: "Finish-to-Finish",
  SF: "Start-to-Finish",
};

export interface PmDependency {
  id: string;
  projectId: string;
  successorId: string;
  predecessorId: string;
  relation: RelationType;
  lagDays: number;
}

export interface ScheduleSettings {
  mode: ScheduleMode;
  /** 1 = Monday through 7 = Sunday. */
  workingDays: number[];
  holidays?: string[];
}

export const DEFAULT_SCHEDULE: ScheduleSettings = { mode: "flexible", workingDays: [1, 2, 3, 4, 5], holidays: [] };

export interface ScheduleUpdate {
  id: string;
  startDate: string;
  dueDate: string;
}

export interface ScheduleOutcome {
  updates: ScheduleUpdate[];
  conflicts: { id: string; message: string }[];
  datesRequired: string[];
}

export function isoWeekday(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  const sunday = date.getUTCDay();
  return sunday === 0 ? 7 : sunday;
}

export function isWorkingDay(iso: string, workingDays: number[], holidays: string[] = []): boolean {
  if (holidays.includes(iso)) return false;
  return workingDays.includes(isoWeekday(iso));
}

/** Signed working-day steps. Zero snaps a non-working day forward. Holidays are not working days. */
export function addWorkingDays(iso: string, delta: number, workingDays: number[], holidays: string[] = []): string {
  const open = (day: string) => isWorkingDay(day, workingDays, holidays);
  if (workingDays.length === 0) return addDays(iso, delta);
  let cursor = iso;
  if (delta === 0) {
    while (!open(cursor)) cursor = addDays(cursor, 1);
    return cursor;
  }
  const step = delta > 0 ? 1 : -1;
  let remaining = Math.abs(delta);
  while (remaining > 0) {
    cursor = addDays(cursor, step);
    if (open(cursor)) remaining -= 1;
  }
  return cursor;
}

export function workingDaySpan(start: string, due: string, workingDays: number[], holidays: string[] = []): number {
  let count = 0;
  let cursor = start;
  for (let guard = 0; cursor <= due && guard < 800; guard += 1) {
    if (isWorkingDay(cursor, workingDays, holidays)) count += 1;
    cursor = addDays(cursor, 1);
  }
  return Math.max(count, 1);
}

export function wouldCycle(
  links: { successorId: string; predecessorId: string }[],
  successorId: string,
  predecessorId: string,
): boolean {
  if (successorId === predecessorId) return true;
  const next = new Map<string, string[]>();
  for (const link of links) {
    const list = next.get(link.predecessorId) ?? [];
    list.push(link.successorId);
    next.set(link.predecessorId, list);
  }
  const stack = [successorId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    if (id === predecessorId) return true;
    seen.add(id);
    for (const child of next.get(id) ?? []) stack.push(child);
  }
  return false;
}

function constraintDate(
  predecessor: Pick<PmBoardTask, "startDate" | "dueDate">,
  relation: RelationType,
  lagDays: number,
  settings: ScheduleSettings,
): { anchor: "start" | "due"; date: string } | null {
  const source = relation === "SS" || relation === "SF" ? predecessor.startDate : predecessor.dueDate;
  if (!source) return null;
  const steps = relation === "FS" ? 1 + lagDays : lagDays;
  return {
    anchor: relation === "FS" || relation === "SS" ? "start" : "due",
    date: addWorkingDays(source, steps, settings.workingDays, settings.holidays ?? []),
  };
}

function latest(current: string | null, next: string): string {
  return !current || next > current ? next : current;
}

/** Moves a task only when it already has both dates. Blank timelines stay blank. */
export function applyDependencyConstraints(
  successor: Pick<PmBoardTask, "id" | "startDate" | "dueDate">,
  links: { predecessor: Pick<PmBoardTask, "startDate" | "dueDate">; relation: RelationType; lagDays: number }[],
  settings: ScheduleSettings,
): { status: "ok" | "dates-required" | "conflict"; startDate?: string; dueDate?: string; message?: string } {
  if (links.length === 0) return { status: "ok" };
  let requiredStart: string | null = null;
  let requiredDue: string | null = null;
  let missingPredecessor = false;
  for (const link of links) {
    const constraint = constraintDate(link.predecessor, link.relation, settings.mode === "strict" ? link.lagDays : 0, settings);
    if (!constraint) {
      missingPredecessor = true;
      continue;
    }
    if (constraint.anchor === "start") requiredStart = latest(requiredStart, constraint.date);
    else requiredDue = latest(requiredDue, constraint.date);
  }
  if (!successor.startDate || !successor.dueDate) {
    return requiredStart || requiredDue || missingPredecessor
      ? { status: "dates-required", message: "Dates required" }
      : { status: "ok" };
  }
  if (!requiredStart && !requiredDue) {
    return missingPredecessor ? { status: "dates-required", message: "Dates required" } : { status: "ok" };
  }

  const holidays = settings.holidays ?? [];
  const span = workingDaySpan(successor.startDate, successor.dueDate, settings.workingDays, holidays);
  const fromStart = (start: string) => ({
    startDate: start,
    dueDate: span <= 1 ? start : addWorkingDays(start, span - 1, settings.workingDays, holidays),
  });
  const fromDue = (due: string) => ({
    startDate: span <= 1 ? due : addWorkingDays(due, 1 - span, settings.workingDays, holidays),
    dueDate: due,
  });
  const violates = (start: string, due: string) => (
    (requiredStart !== null && start < requiredStart) || (requiredDue !== null && due < requiredDue)
  );
  if (settings.mode === "none") {
    return violates(successor.startDate, successor.dueDate)
      ? { status: "conflict", message: "These dates conflict with a predecessor. No action leaves them unchanged." }
      : { status: "ok" };
  }

  let next = { startDate: successor.startDate, dueDate: successor.dueDate };
  const strict = settings.mode === "strict";
  if (requiredStart && (strict || next.startDate < requiredStart)) next = fromStart(requiredStart);
  if (requiredDue && (strict || next.dueDate < requiredDue)) {
    const shifted = fromDue(requiredDue);
    if (requiredStart && shifted.startDate < requiredStart) {
      return {
        status: "conflict",
        message: "These predecessors cannot all be met without changing the task duration.",
      };
    }
    next = shifted;
  }
  if (violates(next.startDate, next.dueDate)) {
    return {
      status: "conflict",
      message: "These predecessors cannot all be met without changing the task duration.",
    };
  }
  if (next.startDate === successor.startDate && next.dueDate === successor.dueDate) return { status: "ok" };
  return { status: "ok", startDate: next.startDate, dueDate: next.dueDate };
}

export function rescheduleFrom(
  tasks: PmBoardTask[],
  links: PmDependency[],
  originId: string,
  settings: ScheduleSettings,
): ScheduleOutcome {
  const byId = new Map(tasks.map((task) => [task.id, { ...task }]));
  const outgoing = new Map<string, string[]>();
  for (const link of links) {
    const list = outgoing.get(link.predecessorId) ?? [];
    list.push(link.successorId);
    outgoing.set(link.predecessorId, list);
  }
  const order: string[] = [];
  const seen = new Set<string>();
  const stack = [originId];
  while (stack.length) {
    const id = stack.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    for (const child of outgoing.get(id) ?? []) stack.push(child);
  }
  const updates: ScheduleUpdate[] = [];
  const conflicts: { id: string; message: string }[] = [];
  const datesRequired: string[] = [];
  for (const id of order) {
    const task = byId.get(id);
    if (!task) continue;
    const incoming = links
      .filter((link) => link.successorId === id)
      .map((link) => ({ predecessor: byId.get(link.predecessorId), relation: link.relation, lagDays: link.lagDays }))
      .filter((link): link is { predecessor: PmBoardTask; relation: RelationType; lagDays: number } => Boolean(link.predecessor));
    const result = applyDependencyConstraints(task, incoming, settings);
    if (result.status === "dates-required") datesRequired.push(id);
    if (result.status === "conflict" && result.message) conflicts.push({ id, message: result.message });
    if (result.startDate && result.dueDate) {
      task.startDate = result.startDate;
      task.dueDate = result.dueDate;
      updates.push({ id, startDate: result.startDate, dueDate: result.dueDate });
    }
  }
  return { updates, conflicts, datesRequired };
}

export type SearchColumn = "title" | "owner" | "status" | "timeline" | "priority" | "updated";

export const DEFAULT_SEARCH_COLUMNS: SearchColumn[] = ["title", "owner", "status", "timeline", "priority"];

export function taskMatchesSearch(
  task: PmBoardTask,
  query: string,
  columns: SearchColumn[],
  ownerName: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    columns.includes("title") ? `${task.title} ${task.description}` : "",
    columns.includes("owner") ? ownerName : "",
    columns.includes("status") ? task.status : "",
    columns.includes("timeline") ? `${task.startDate} ${task.dueDate}` : "",
    columns.includes("priority") ? task.priority : "",
    columns.includes("updated") ? task.updatedAt : "",
  ].join(" ").toLowerCase();
  return haystack.includes(needle);
}

export function filterBoardTasks(
  tasks: PmBoardTask[],
  filters: BoardFilters,
  options?: { columns?: SearchColumn[]; ownerName?: (ownerId: string) => string },
): PmBoardTask[] {
  const columns = options?.columns?.length ? options.columns : DEFAULT_SEARCH_COLUMNS;
  return tasks.filter((task) => {
    if (!taskMatchesSearch(task, filters.search, columns, options?.ownerName?.(task.ownerId) ?? "")) return false;
    if (filters.ownerId === "unassigned") {
      if (task.ownerId) return false;
    } else if (filters.ownerId !== "all" && task.ownerId !== filters.ownerId) return false;
    if (filters.status !== "all" && task.status !== filters.status) return false;
    if (filters.priority !== "all" && task.priority !== filters.priority) return false;
    if (filters.groupId !== "all" && task.groupId !== filters.groupId) return false;
    return true;
  });
}

export function topLevelTasks(tasks: PmBoardTask[]): PmBoardTask[] {
  return tasks.filter((task) => !task.parentTaskId);
}

export function subtasksOf(tasks: PmBoardTask[], parentId: string): PmBoardTask[] {
  return tasks.filter((task) => task.parentTaskId === parentId);
}

export function readLastBoard(): { workspaceId: string; projectId: string } | null {
  try {
    const raw = localStorage.getItem(LAST_BOARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { workspaceId?: string; projectId?: string };
    if (!parsed.workspaceId || !parsed.projectId) return null;
    return { workspaceId: parsed.workspaceId, projectId: parsed.projectId };
  } catch {
    return null;
  }
}

export function writeLastBoard(workspaceId: string, projectId: string) {
  localStorage.setItem(LAST_BOARD_KEY, JSON.stringify({ workspaceId, projectId }));
}
