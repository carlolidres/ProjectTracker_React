import dayjs, { type Dayjs } from "dayjs";
import { parseAppDateValue } from "@/lib/date";

export interface GanttWeek {
  start: string;
  end: string;
  label: string;
  month: string;
}

export interface GanttSpan {
  start: string;
  end: string;
}

function asDay(value: string | undefined): Dayjs | null {
  const parsed = parseAppDateValue(value);
  return parsed ? parsed.startOf("day") : null;
}

export function ganttBounds(spans: GanttSpan[], today = new Date()): { start: string; end: string } {
  const days: Dayjs[] = [dayjs(today).startOf("day")];
  for (const span of spans) {
    const start = asDay(span.start);
    const end = asDay(span.end) ?? start;
    if (start) days.push(start);
    if (end) days.push(end);
  }
  const earliest = days.reduce((min, day) => (day.isBefore(min) ? day : min));
  const latest = days.reduce((max, day) => (day.isAfter(max) ? day : max));
  const start = earliest.startOf("week");
  let end = latest.endOf("week").startOf("day");
  if (end.diff(start, "day") < 27) end = start.add(27, "day");
  return { start: start.format("YYYY-MM-DD"), end: end.format("YYYY-MM-DD") };
}

export function ganttWeeks(rangeStart: string, rangeEnd: string): GanttWeek[] {
  const weeks: GanttWeek[] = [];
  let cursor = dayjs(rangeStart).startOf("day");
  const end = dayjs(rangeEnd).startOf("day");
  while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
    const weekEnd = cursor.endOf("week").startOf("day");
    const capped = weekEnd.isAfter(end) ? end : weekEnd;
    weeks.push({
      start: cursor.format("YYYY-MM-DD"),
      end: capped.format("YYYY-MM-DD"),
      label: `${cursor.format("D")}–${capped.format("D")}`,
      month: cursor.format("MMMM YYYY"),
    });
    cursor = capped.add(1, "day");
  }
  return weeks;
}

export function ganttBarPercent(
  start: string,
  end: string,
  rangeStart: string,
  rangeEnd: string,
): { left: number; width: number } | null {
  const taskStart = asDay(start);
  const taskEnd = asDay(end) ?? taskStart;
  const rangeFrom = asDay(rangeStart);
  const rangeTo = asDay(rangeEnd);
  if (!taskStart || !taskEnd || !rangeFrom || !rangeTo) return null;
  const total = Math.max(1, rangeTo.diff(rangeFrom, "day") + 1);
  const leftDays = taskStart.diff(rangeFrom, "day");
  const spanDays = Math.max(1, taskEnd.diff(taskStart, "day") + 1);
  const left = Math.max(0, (leftDays / total) * 100);
  const width = Math.min(100 - left, (spanDays / total) * 100);
  if (width <= 0) return null;
  return { left, width };
}

export type GanttZoom = "week" | "month";

export const GANTT_DAY_PX: Record<GanttZoom, number> = { week: 36, month: 16 };

export interface GanttColumn {
  start: string;
  days: number;
  label: string;
  weekday: string;
  month: string;
  week: string;
}

export interface GanttLink {
  from: string;
  to: string;
}

export function ganttColumns(rangeStart: string, rangeEnd: string, zoom: GanttZoom): GanttColumn[] {
  const start = dayjs(rangeStart).startOf("day");
  const end = dayjs(rangeEnd).startOf("day");
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return [];
  const columns: GanttColumn[] = [];
  let cursor = start;
  while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
    if (zoom === "month") {
      const weekEnd = cursor.endOf("week").startOf("day");
      const capped = weekEnd.isAfter(end) ? end : weekEnd;
      const weekStart = cursor.startOf("week");
      columns.push({
        start: cursor.format("YYYY-MM-DD"),
        days: capped.diff(cursor, "day") + 1,
        label: weekLabel(cursor, capped),
        weekday: "",
        month: cursor.format("MMMM YYYY"),
        week: weekLabel(weekStart, weekEnd),
      });
      cursor = capped.add(1, "day");
      continue;
    }
    const weekStart = cursor.startOf("week");
    const weekEnd = cursor.endOf("week").startOf("day");
    columns.push({
      start: cursor.format("YYYY-MM-DD"),
      days: 1,
      label: cursor.format("D"),
      weekday: cursor.format("ddd"),
      month: cursor.format("MMMM YYYY"),
      week: weekLabel(weekStart, weekEnd),
    });
    cursor = cursor.add(1, "day");
  }
  return columns;
}

function weekLabel(start: Dayjs, end: Dayjs): string {
  if (start.isSame(end, "month")) return `${start.format("D")}–${end.format("D")}`;
  return `${start.format("D MMM")} – ${end.format("D MMM")}`;
}

export function ganttDurationDays(span: GanttSpan | null): number | null {
  if (!span) return null;
  const start = asDay(span.start);
  const end = asDay(span.end);
  if (!start || !end) return null;
  return Math.max(1, end.diff(start, "day") + 1);
}

export function ganttShiftSpan(span: GanttSpan, deltaDays: number, edge: "move" | "start" | "end"): GanttSpan {
  const start = dayjs(span.start).startOf("day");
  const end = dayjs(span.end).startOf("day");
  if (!start.isValid() || !end.isValid()) return span;
  if (edge === "start") {
    const next = start.add(deltaDays, "day");
    const clamped = next.isAfter(end) ? end : next;
    return { start: clamped.format("YYYY-MM-DD"), end: span.end };
  }
  if (edge === "end") {
    const next = end.add(deltaDays, "day");
    const clamped = next.isBefore(start) ? start : next;
    return { start: span.start, end: clamped.format("YYYY-MM-DD") };
  }
  return {
    start: start.add(deltaDays, "day").format("YYYY-MM-DD"),
    end: end.add(deltaDays, "day").format("YYYY-MM-DD"),
  };
}

export function ganttBarPx(
  start: string,
  end: string,
  rangeStart: string,
  rangeEnd: string,
  pxPerDay: number,
): { left: number; width: number } | null {
  const taskStart = asDay(start);
  const taskEnd = asDay(end) ?? taskStart;
  const rangeFrom = asDay(rangeStart);
  const rangeTo = asDay(rangeEnd);
  if (!taskStart || !taskEnd || !rangeFrom || !rangeTo) return null;
  if (taskEnd.isBefore(rangeFrom) || taskStart.isAfter(rangeTo)) return null;
  const visibleStart = taskStart.isBefore(rangeFrom) ? rangeFrom : taskStart;
  const visibleEnd = taskEnd.isAfter(rangeTo) ? rangeTo : taskEnd;
  const left = visibleStart.diff(rangeFrom, "day") * pxPerDay + 3;
  const width = Math.max(20, (visibleEnd.diff(visibleStart, "day") + 1) * pxPerDay - 6);
  return { left, width };
}

/** One stored predecessor per task. Fan-out uses that link. Fan-in is the next phase bar. */
export function ganttWorkflowLinks(
  phases: ReadonlyArray<{ step: string; taskIds: readonly string[] }>,
  dependsOn: ReadonlyArray<{ id: string; dependsOnTaskId: string | null }>,
): GanttLink[] {
  const known = new Set(dependsOn.map((row) => row.id));
  const predecessor = new Map(
    dependsOn.map((row) => [row.id, row.dependsOnTaskId && known.has(row.dependsOnTaskId) ? row.dependsOnTaskId : null]),
  );
  const successors = new Set([...predecessor.values()].filter((id): id is string => Boolean(id)));
  const links: GanttLink[] = [];
  const push = (from: string, to: string) => {
    if (from !== to && !links.some((link) => link.from === from && link.to === to)) links.push({ from, to });
  };
  for (const row of dependsOn) {
    const from = predecessor.get(row.id);
    if (from) push(`task:${from}`, `task:${row.id}`);
  }
  phases.forEach((phase, index) => {
    for (const taskId of phase.taskIds) {
      if (!predecessor.get(taskId)) push(`phase:${phase.step}`, `task:${taskId}`);
    }
    const next = phases[index + 1];
    if (!next) return;
    const sources = phase.taskIds.length > 0 ? phase.taskIds.map((id) => `task:${id}`) : [`phase:${phase.step}`];
    for (const source of sources) {
      const taskId = source.startsWith("task:") ? source.slice(5) : "";
      if (taskId && successors.has(taskId)) continue;
      push(source, `phase:${next.step}`);
    }
  });
  return links;
}

export function ganttLinkPath(
  from: { x: number; y: number; w: number; h: number },
  to: { x: number; y: number; w: number; h: number },
  lane = 0,
): string {
  const y1 = from.y + from.h / 2;
  const y2 = to.y + to.h / 2;
  const x2 = to.x;
  const sourceEnd = from.x + from.w;
  if (x2 >= sourceEnd + 12) {
    const elbow = Math.min(sourceEnd + 14 + lane * 8, sourceEnd + (x2 - sourceEnd) / 2);
    return `M ${sourceEnd} ${y1} H ${elbow} V ${y2} H ${x2 - 2}`;
  }
  if (y2 > from.y + from.h && x2 <= sourceEnd + 8) {
    const leaveX = Math.min(Math.max(x2 + lane * 6, from.x + 8), Math.max(from.x + 8, sourceEnd - 4));
    return `M ${leaveX} ${from.y + from.h} V ${y2}`;
  }
  const drop = Math.max(from.y + from.h, to.y + to.h) + 8 + Math.abs(lane) * 4;
  return `M ${sourceEnd} ${y1} H ${sourceEnd + 12} V ${drop} H ${Math.max(8, x2 - 12)} V ${y2} H ${x2 - 2}`;
}

export function ganttBandLabel(label: string, widthPx: number): string {
  const month = /^([A-Za-z]+)\s+(\d{4})$/.exec(label);
  if (month) {
    if (widthPx >= 108) return label;
    if (widthPx >= 36) return month[1]?.slice(0, 3) ?? label;
    return "";
  }
  if (widthPx >= 96) return label;
  if (widthPx >= 40) return label.split("–")[0]?.trim() ?? label;
  return "";
}

export function ganttTodayPercent(rangeStart: string, rangeEnd: string, today = new Date()): number | null {
  const from = asDay(rangeStart);
  const to = asDay(rangeEnd);
  const day = dayjs(today).startOf("day");
  if (!from || !to || day.isBefore(from) || day.isAfter(to)) return null;
  const total = Math.max(1, to.diff(from, "day") + 1);
  return (day.diff(from, "day") / total) * 100;
}
