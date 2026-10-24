import { addDays, addWorkingDays, daySpan, type RelationType } from "./boardRules";

export type LaunchImpact = "NO_IMPACT" | "AT_RISK" | "DELAYED" | "NOT_ASSESSED";
export type QualityRelease = "CLEAR" | "BLOCKED" | "PENDING_ASSESSMENT";

export const IMPACT_COPY: Record<LaunchImpact, string> = {
  NO_IMPACT: "The current forecast meets the approved launch target with no identified schedule risk.",
  AT_RISK: "The launch target remains achievable, but schedule float is low or a critical dependency requires attention.",
  DELAYED: "The forecast launch date is later than the approved target. Review the critical path and recovery options.",
  NOT_ASSESSED: "Required schedule or dependency information is missing. Launch impact cannot yet be calculated reliably.",
};

export const IMPACT_LABEL: Record<LaunchImpact, string> = {
  NO_IMPACT: "No Impact",
  AT_RISK: "At Risk",
  DELAYED: "Delayed",
  NOT_ASSESSED: "Not Assessed",
};

export type DerivedPriority = "Low" | "Medium" | "High";

/** Priority follows the task timeline and the quality gate. A blocked gate or a late finish is High. */
export function priorityFromLaunch(impact: LaunchImpact | null, qualityBlocked: boolean): DerivedPriority {
  if (qualityBlocked || impact === "DELAYED") return "High";
  if (impact === "NO_IMPACT") return "Low";
  return "Medium";
}

export function priorityReason(impact: LaunchImpact | null, qualityBlocked: boolean): string {
  const priority = priorityFromLaunch(impact, qualityBlocked);
  if (qualityBlocked && impact === "DELAYED") return `${priority}: the quality gate is Blocked and this task finishes after the target launch.`;
  if (qualityBlocked) return `${priority}: the quality gate is Blocked, so this task stays urgent until it is Clear.`;
  if (impact === "DELAYED") return `${priority}: this task finishes after the target launch.`;
  if (impact === "AT_RISK") return `${priority}: this task is close to the target launch and the quality gate is Clear.`;
  if (impact === "NO_IMPACT") return `${priority}: this task meets the target launch and the quality gate is Clear.`;
  return `${priority}: launch impact is not assessed yet and the quality gate is Clear.`;
}

export const QUALITY_LABEL: Record<QualityRelease, string> = {
  CLEAR: "Clear",
  BLOCKED: "Blocked",
  PENDING_ASSESSMENT: "Pending assessment",
};

export interface ScheduleNode {
  id: string;
  title: string;
  start: string;
  finish: string;
  baselineFinish: string;
  qualityBlocker: boolean;
  isLaunch: boolean;
}

export interface ScheduleEdge {
  predecessorId: string;
  successorId: string;
  relation: RelationType;
  lagDays: number;
}

export interface TaskImpact {
  impact: LaunchImpact;
  floatWorkdays: number | null;
  late: boolean;
  reasons: string[];
}

export interface LaunchReport {
  ok: boolean;
  error: string;
  impact: LaunchImpact;
  reasons: string[];
  copy: string;
  baselineLaunchDate: string;
  forecastLaunchDate: string;
  varianceWorkdays: number | null;
  varianceCalendarDays: number | null;
  path: string[];
  qualityRelease: QualityRelease;
  tasks: Record<string, TaskImpact>;
}

/** Working days from `from` to `to`. Positive means `to` is later. Date-only; no browser timezone. */
export function workdayDifference(from: string, to: string, workingDays: number[], holidays: string[] = []): number {
  if (!from || !to || from === to) return 0;
  const sign = to > from ? 1 : -1;
  const start = sign > 0 ? from : to;
  const end = sign > 0 ? to : from;
  let count = 0;
  let cursor = start;
  while (cursor < end && count < 800) {
    cursor = addWorkingDays(cursor, 1, workingDays, holidays);
    count += 1;
  }
  return sign * count;
}

export function calendarDayDifference(from: string, to: string): number {
  if (!from || !to) return 0;
  return daySpan(from < to ? from : to, from < to ? to : from) - 1;
}

/** A sprint boundary is a planning window. It does not move task forecasts. */
export function finishesIgnoringSprint(finishes: Record<string, string>): Record<string, string> {
  return { ...finishes };
}

/** Baseline dates change only through an explicit rebaseline. */
export function baselineChangeAllowed(nextBaseline: string, approvedBaseline: string, rebaseline: boolean): boolean {
  if (!approvedBaseline || nextBaseline === approvedBaseline) return true;
  return rebaseline;
}

export function scheduleVersionsMatch(saved: number, attempted: number): boolean {
  return saved === attempted;
}

function hasCycle(edges: ScheduleEdge[]): boolean {
  const next = new Map<string, string[]>();
  for (const edge of edges) {
    const list = next.get(edge.predecessorId) ?? [];
    list.push(edge.successorId);
    next.set(edge.predecessorId, list);
  }
  const color = new Map<string, number>();
  const visit = (id: string): boolean => {
    const state = color.get(id) ?? 0;
    if (state === 1) return true;
    if (state === 2) return false;
    color.set(id, 1);
    for (const child of next.get(id) ?? []) {
      if (visit(child)) return true;
    }
    color.set(id, 2);
    return false;
  };
  const ids = new Set(edges.flatMap((edge) => [edge.predecessorId, edge.successorId]));
  for (const id of ids) {
    if (visit(id)) return true;
  }
  return false;
}

function graphError(nodes: ScheduleNode[], edges: ScheduleEdge[]): string {
  const ids = new Set(nodes.map((node) => node.id));
  for (const edge of edges) {
    if (edge.predecessorId === edge.successorId) return "A task cannot depend on itself. Nothing was saved.";
    if (!ids.has(edge.predecessorId) || !ids.has(edge.successorId)) {
      return "A dependency points outside this project. Nothing was saved.";
    }
  }
  const pairs = new Set<string>();
  for (const edge of edges) {
    const key = `${edge.predecessorId}:${edge.successorId}:${edge.relation}`;
    if (pairs.has(key)) return "That dependency is already on the task. Nothing was saved.";
    pairs.add(key);
  }
  if (hasCycle(edges)) return "Those tasks depend on each other in a circle. Nothing was saved.";
  return "";
}

function notAssessed(partial: Partial<LaunchReport> & { reasons: string[]; qualityRelease: QualityRelease; tasks?: Record<string, TaskImpact> }): LaunchReport {
  return {
    ok: partial.ok ?? true,
    error: partial.error ?? "",
    impact: "NOT_ASSESSED",
    reasons: partial.reasons,
    copy: IMPACT_COPY.NOT_ASSESSED,
    baselineLaunchDate: partial.baselineLaunchDate ?? "",
    forecastLaunchDate: partial.forecastLaunchDate ?? "",
    varianceWorkdays: null,
    varianceCalendarDays: null,
    path: [],
    qualityRelease: partial.qualityRelease,
    tasks: partial.tasks ?? {},
  };
}

export function assessLaunch(input: {
  nodes: ScheduleNode[];
  edges: ScheduleEdge[];
  baselineLaunchDate: string;
  bufferWorkdays: number;
  workingDays: number[];
  holidays?: string[];
  qualityRelease: QualityRelease;
}): LaunchReport {
  const holidays = input.holidays ?? [];
  const qualityRelease = input.qualityRelease;
  const error = graphError(input.nodes, input.edges);
  if (error) {
    return notAssessed({ ok: false, error, reasons: [error], qualityRelease });
  }
  const target = input.baselineLaunchDate;
  if (!target) {
    return notAssessed({ reasons: ["Set the target launch date for the whole project."], qualityRelease });
  }
  const dated = input.nodes.filter((node) => node.finish);
  if (!dated.length) {
    return notAssessed({
      reasons: ["Add a timeline before launch impact can be calculated."],
      baselineLaunchDate: target,
      qualityRelease,
    });
  }
  const forecast = dated.map((node) => node.finish).sort().at(-1) ?? "";
  const varianceWorkdays = workdayDifference(target, forecast, input.workingDays, holidays);
  const varianceCalendarDays = (forecast > target ? 1 : forecast < target ? -1 : 0) * calendarDayDifference(target, forecast);
  const tasks: Record<string, TaskImpact> = {};
  for (const node of input.nodes) {
    const late = Boolean(node.baselineFinish && node.finish && node.finish > node.baselineFinish);
    if (!node.finish) {
      tasks[node.id] = {
        impact: "NOT_ASSESSED",
        floatWorkdays: null,
        late,
        reasons: [`${node.title} has no timeline, so its effect on the target launch cannot be calculated.`],
      };
      continue;
    }
    const float = workdayDifference(node.finish, target, input.workingDays, holidays);
    let taskImpact: LaunchImpact = "NO_IMPACT";
    if (float < 0) taskImpact = "DELAYED";
    else if (float <= input.bufferWorkdays || node.qualityBlocker) taskImpact = "AT_RISK";
    const room = float < 0 ? `${Math.abs(float)} working days after the target launch` : `${float} working days before the target launch`;
    tasks[node.id] = {
      impact: taskImpact,
      floatWorkdays: float,
      late,
      reasons: [IMPACT_COPY[taskImpact], `${node.title} finishes ${node.finish}, ${room}. Target launch is ${target}.`].filter(Boolean),
    };
  }
  const blocked = dated.some((node) => node.qualityBlocker);
  let impact: LaunchImpact = "NO_IMPACT";
  if (varianceWorkdays > 0) impact = "DELAYED";
  else if (blocked || Object.values(tasks).some((item) => item.impact === "AT_RISK")) impact = "AT_RISK";
  const path = dated
    .filter((node) => (tasks[node.id]?.floatWorkdays ?? 0) < 0)
    .sort((a, b) => a.finish.localeCompare(b.finish) || a.title.localeCompare(b.title))
    .map((node) => node.title);
  const sign = varianceCalendarDays > 0 ? "+" : "";
  const detail = `Project finish ${forecast} vs target launch ${target} (${sign}${varianceCalendarDays} calendar days, ${sign}${varianceWorkdays} working days).`;
  const chain = path.length ? ` Past the target: ${path.join(", ")}.` : "";
  const reasons = [IMPACT_COPY[impact], detail, chain.trim()].filter(Boolean);
  return {
    ok: true,
    error: "",
    impact,
    reasons,
    copy: IMPACT_COPY[impact],
    baselineLaunchDate: input.baselineLaunchDate,
    forecastLaunchDate: forecast,
    varianceWorkdays,
    varianceCalendarDays,
    path,
    qualityRelease,
    tasks,
  };
}

export interface ForwardNode {
  id: string;
  title: string;
  durationWorkdays: number;
  anchorStart: string | null;
  isLaunch?: boolean;
}

/** Finish-to-start forward pass. Parallel branches use the later predecessor, not the sum of slips. */
export function simulateForward(
  nodes: ForwardNode[],
  links: { predecessorId: string; successorId: string; lagWorkdays?: number }[],
  calendar: { workingDays: number[]; holidays?: string[] },
): { ok: boolean; error: string; finishes: Record<string, string>; starts: Record<string, string> } {
  const holidays = calendar.holidays ?? [];
  const edges: ScheduleEdge[] = links.map((link) => ({
    predecessorId: link.predecessorId,
    successorId: link.successorId,
    relation: "FS",
    lagDays: link.lagWorkdays ?? 0,
  }));
  const stored: ScheduleNode[] = nodes.map((node) => ({
    id: node.id,
    title: node.title,
    start: node.anchorStart ?? "",
    finish: node.anchorStart ?? "",
    baselineFinish: "",
    qualityBlocker: false,
    isLaunch: Boolean(node.isLaunch),
  }));
  const error = graphError(stored, edges);
  if (error) return { ok: false, error, finishes: {}, starts: {} };
  const incoming = new Map<string, { predecessorId: string; lag: number }[]>();
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  for (const link of links) {
    const list = incoming.get(link.successorId) ?? [];
    list.push({ predecessorId: link.predecessorId, lag: link.lagWorkdays ?? 0 });
    incoming.set(link.successorId, list);
    indegree.set(link.successorId, (indegree.get(link.successorId) ?? 0) + 1);
  }
  const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
  const starts: Record<string, string> = {};
  const finishes: Record<string, string> = {};
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let guard = 0;
  while (queue.length && guard < nodes.length + 2) {
    guard += 1;
    const id = queue.shift();
    if (!id) break;
    const node = byId.get(id);
    if (!node) continue;
    let start = node.anchorStart;
    for (const link of incoming.get(id) ?? []) {
      const predFinish = finishes[link.predecessorId];
      if (!predFinish) return { ok: false, error: "A predecessor has no forecast.", finishes: {}, starts: {} };
      const constrained = addWorkingDays(predFinish, 1 + link.lag, calendar.workingDays, holidays);
      start = !start || constrained > start ? constrained : start;
    }
    if (!start) return { ok: false, error: `Missing a start for ${node.title}.`, finishes: {}, starts: {} };
    const duration = Math.max(node.durationWorkdays, 0);
    const finish = duration <= 1 ? start : addWorkingDays(start, duration - 1, calendar.workingDays, holidays);
    starts[id] = start;
    finishes[id] = finish;
    for (const link of links.filter((item) => item.predecessorId === id)) {
      const left = (indegree.get(link.successorId) ?? 1) - 1;
      indegree.set(link.successorId, left);
      if (left === 0) queue.push(link.successorId);
    }
  }
  if (Object.keys(finishes).length !== nodes.length) {
    return { ok: false, error: "Those tasks depend on each other in a circle. Nothing was saved.", finishes: {}, starts: {} };
  }
  return { ok: true, error: "", finishes, starts };
}

export function addCalendarDays(iso: string, days: number): string {
  return addDays(iso, days);
}
