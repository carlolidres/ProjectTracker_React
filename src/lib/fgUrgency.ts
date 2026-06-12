import dayjs from "dayjs";
import { daysBetween, getTodayManila } from "@/lib/date";
import { isOpenFinalStatus, valueOrNA } from "@/lib/utils";
import type { ProjectRow } from "@/types";

export type DueWindowKey =
  | "overdue"
  | "today"
  | "within3"
  | "within7"
  | "within15"
  | "within30"
  | "beyond30";

export interface DueDateCounts {
  overdue: number;
  today: number;
  within3: number;
  within7: number;
  within15: number;
  within30: number;
  beyond30: number;
}

/** FG Delivery date: month-only values use the last day of that month. */
export function parseFgDeliveryDate(value: unknown): dayjs.Dayjs | null {
  const text = String(value ?? "").trim();
  if (!text || text === "N/A") return null;

  if (/^\d{4}-\d{2}$/.test(text)) {
    return dayjs(`${text}-01`).endOf("month").startOf("day");
  }

  const parsed = dayjs(text);
  return parsed.isValid() ? parsed.startOf("day") : null;
}

export function fgDaysRemaining(
  fgMonth: string,
  today = getTodayManila(),
): number | null {
  const fgDate = parseFgDeliveryDate(fgMonth);
  if (!fgDate) return null;
  return daysBetween(today, fgDate);
}

export function classifyDueWindow(days: number | null): DueWindowKey | null {
  if (days === null) return null;
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 3) return "within3";
  if (days <= 7) return "within7";
  if (days <= 15) return "within15";
  if (days <= 30) return "within30";
  return "beyond30";
}

/** Cumulative counts aligned with database drill-down filters. */
export function buildCumulativeDueDateCounts(
  rows: Array<{ days: number | null; isOpen: boolean }>,
): DueDateCounts {
  const counts: DueDateCounts = {
    overdue: 0,
    today: 0,
    within3: 0,
    within7: 0,
    within15: 0,
    within30: 0,
    beyond30: 0,
  };

  for (const row of rows) {
    if (!row.isOpen || row.days === null) continue;
    const days = row.days;
    if (days < 0) counts.overdue += 1;
    if (days === 0) counts.today += 1;
    if (days >= 0 && days <= 3) counts.within3 += 1;
    if (days >= 0 && days <= 7) counts.within7 += 1;
    if (days >= 0 && days <= 15) counts.within15 += 1;
    if (days >= 0 && days <= 30) counts.within30 += 1;
    if (days > 30) counts.beyond30 += 1;
  }

  return counts;
}

export function rowMatchesDueWindow(days: number | null, isOpen: boolean, windowKey?: string): boolean {
  if (!windowKey || !isOpen || days === null) return !windowKey;
  if (windowKey === "overdue") return days < 0;
  if (windowKey === "today") return days === 0;
  if (windowKey === "within3") return days >= 0 && days <= 3;
  if (windowKey === "within7") return days >= 0 && days <= 7;
  if (windowKey === "within15") return days >= 0 && days <= 15;
  if (windowKey === "within30") return days >= 0 && days <= 30;
  if (windowKey === "beyond30") return days > 30;
  return true;
}

export function projectRowFgDays(row: ProjectRow, today = getTodayManila()): number | null {
  return fgDaysRemaining(row.fg_month, today);
}

export function isOpenProjectRow(row: ProjectRow): boolean {
  return isOpenFinalStatus(valueOrNA(row.final_status));
}

export function fgSortValue(fgMonth: string): number {
  const fgDate = parseFgDeliveryDate(fgMonth);
  return fgDate ? fgDate.valueOf() : Number.MAX_SAFE_INTEGER;
}

export const DUE_WINDOW_FILTER_OPTIONS = [
  { label: "Overdue", value: "overdue" },
  { label: "Due Today", value: "today" },
  { label: "Within 3 Days", value: "within3" },
  { label: "Within 7 Days", value: "within7" },
  { label: "Within 15 Days", value: "within15" },
  { label: "Within 30 Days", value: "within30" },
  { label: "More Than 30 Days", value: "beyond30" },
] as const;

export const PENDING_ROLE_FILTER_OPTIONS = [
  { label: "AM / BM / PL", value: "AM/BM/PL" },
  { label: "PP", value: "PP" },
  { label: "TSD", value: "TSD" },
  { label: "VAL", value: "VAL" },
  { label: "QC", value: "QC" },
] as const;

export function supportTargetDays(targetDate: string, today = getTodayManila()): number | null {
  const text = String(targetDate ?? "").trim();
  if (!text || text === "N/A") return null;
  const parsed = dayjs(text);
  if (!parsed.isValid()) return null;
  return daysBetween(today, parsed.startOf("day"));
}
