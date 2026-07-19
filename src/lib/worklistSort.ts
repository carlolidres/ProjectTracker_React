import { getTodayManila } from "@/lib/date";
import { parseFgDeliveryDate, supportTargetDays } from "@/lib/fgUrgency";
import type { FocusGroup } from "@/lib/projectPriority";
import { isMissingValue, valueOrNA } from "@/lib/utils";
import type { SupportActivity, SupportWorklistItem, UserRole, WorklistItem } from "@/types";

export type SupportWorklistSeverity = "overdue" | "critical" | "high" | "medium" | "low";

const SEVERITY_RANK: Record<string, number> = {
  overdue: 0,
  critical: 1,
  high: 2,
  medium: 3,
  moderate: 3,
  low: 4,
};

export function focusGroupForRole(role: UserRole | undefined): FocusGroup | null {
  switch (role) {
    case "am_bm_pl":
      return "AM/BM/PL";
    case "qa":
      return "QA";
    case "pp":
      return "PP";
    case "tsd":
      return "TSD";
    case "val":
      return "VAL";
    case "qc":
      return "QC";
    default:
      return null;
  }
}

export function supportKindForRole(role: UserRole | undefined): string | null {
  if (role === "tsd") return "TSD";
  if (role === "rnd") return "RnD";
  return null;
}

export function isActiveProcessWorklistItem(item: WorklistItem): boolean {
  const severity = String(item.severity ?? "").toLowerCase();
  if (severity === "closed" || severity === "cancelled") return false;
  return item.priorityRank < 5;
}

function dateSortValue(value: string): number {
  const text = String(value ?? "").trim();
  if (!text || text === "N/A") return Number.MAX_SAFE_INTEGER;
  const fg = parseFgDeliveryDate(text);
  if (fg) return fg.valueOf();
  const days = supportTargetDays(text);
  if (days === null) return Number.MAX_SAFE_INTEGER;
  return getTodayManila().add(days, "day").valueOf();
}

export function supportSeverityFromDays(days: number | null): {
  severity: SupportWorklistSeverity;
  priorityRank: number;
} {
  if (days !== null && days < 0) return { severity: "overdue", priorityRank: 0 };
  if (days !== null && days <= 15) return { severity: "critical", priorityRank: 1 };
  if (days !== null && days <= 30) return { severity: "high", priorityRank: 2 };
  if (days !== null && days <= 60) return { severity: "medium", priorityRank: 3 };
  return { severity: "low", priorityRank: 4 };
}

export function buildSupportWorklistItem(
  row: SupportActivity,
  today = getTodayManila(),
): SupportWorklistItem {
  const planningDays = supportTargetDays(row.Planning_Schedule, today);
  const targetDays = supportTargetDays(row.Target_Date, today);
  // Severity follows Target Date; Planning Schedule drives primary sort.
  const { severity, priorityRank } = supportSeverityFromDays(targetDays ?? planningDays);
  return {
    activity_id: row.activity_id,
    activity_kind: valueOrNA(row.activity_kind),
    Department: valueOrNA(row.Department),
    Principal: valueOrNA(row.Principal),
    Product: valueOrNA(row.Product),
    Material: valueOrNA(row.Material),
    Line: valueOrNA(row.Line),
    non_process_description: valueOrNA(row.non_process_description),
    Planning_Schedule: valueOrNA(row.Planning_Schedule),
    Target_Date: valueOrNA(row.Target_Date),
    status: valueOrNA(row.status),
    severity,
    priorityRank,
    planningSort: dateSortValue(row.Planning_Schedule),
    targetSort: dateSortValue(row.Target_Date),
  };
}

export function isOpenSupportActivity(row: SupportActivity): boolean {
  const status = valueOrNA(row.status).toLowerCase();
  if (status === "done" || status === "closed" || status === "cancelled") return false;
  return true;
}

export function filterAndSortProcessWorklist(
  items: WorklistItem[],
  role: UserRole | undefined,
  showAll: boolean,
): WorklistItem[] {
  const preferred = focusGroupForRole(role);
  let rows = items.filter(isActiveProcessWorklistItem);
  if (!showAll && preferred) {
    rows = rows.filter((item) => item.focusGroup === preferred);
  }
  return [...rows].sort((a, b) => {
    if (showAll && preferred) {
      const aMatch = a.focusGroup === preferred ? 0 : 1;
      const bMatch = b.focusGroup === preferred ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }
    return (
      a.priorityRank - b.priorityRank
      || (a.fgSort ?? Number.MAX_SAFE_INTEGER) - (b.fgSort ?? Number.MAX_SAFE_INTEGER)
      || b.incompleteCount - a.incompleteCount
      || String(a.project_id).localeCompare(String(b.project_id))
    );
  });
}

export function filterAndSortSupportWorklist(
  items: SupportWorklistItem[],
  role: UserRole | undefined,
  showAll: boolean,
): SupportWorklistItem[] {
  const preferredKind = supportKindForRole(role);
  let rows = [...items];
  if (!showAll && preferredKind) {
    rows = rows.filter((item) => item.activity_kind === preferredKind);
  }
  return rows.sort((a, b) => {
    if (showAll && preferredKind) {
      const aMatch = a.activity_kind === preferredKind ? 0 : 1;
      const bMatch = b.activity_kind === preferredKind ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }
    return (
      a.planningSort - b.planningSort
      || a.targetSort - b.targetSort
      || (SEVERITY_RANK[a.severity] ?? 99) - (SEVERITY_RANK[b.severity] ?? 99)
      || String(a.activity_id).localeCompare(String(b.activity_id))
    );
  });
}

/** Default: role-scoped list (All Worklist off for every role). */
export function defaultShowAllWorklist(_role?: UserRole): boolean {
  return false;
}

export function supportWorklistTitle(row: SupportWorklistItem): string {
  if (!isMissingValue(row.non_process_description)) return row.non_process_description;
  if (!isMissingValue(row.Product)) return row.Product;
  if (!isMissingValue(row.Material)) return row.Material;
  return row.activity_id;
}
