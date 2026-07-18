import type { ProjectFilters } from "@/types/project";
import type { SupportActivityFilters } from "@/types/supportActivity";
import type { AuditFilters } from "@/types";

const PROJECT_URL_FILTER_KEYS = [
  "cnf_status",
  "final_status",
  "due_window",
  "pending_role",
  "drill",
  "fg_month",
  "fg_year",
  "delivery_status",
  "sort",
  "order",
] as const satisfies ReadonlyArray<keyof ProjectFilters>;

const SUPPORT_URL_FILTER_KEYS = [
  "due_window",
  "status",
  "activity_kind",
  "sort",
  "order",
] as const satisfies ReadonlyArray<keyof SupportActivityFilters>;

const AUDIT_URL_FILTER_KEYS = ["search", "module", "action", "user", "project_id"] as const satisfies ReadonlyArray<
  keyof AuditFilters
>;

const CNF_URL_FILTER_KEYS = ["search", "status", "classification", "sort", "order"] as const;

export type CnfListUrlFilters = {
  search?: string;
  status?: string;
  classification?: string;
  sort?: string;
  order?: string;
};

function pickUrlFilters<T extends string>(
  searchParams: URLSearchParams,
  keys: readonly T[],
): Partial<Record<T, string>> {
  const urlFilters: Partial<Record<T, string>> = {};
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value) urlFilters[key] = value;
  }
  return urlFilters;
}

export function projectFiltersFromSearchParams(
  searchParams: URLSearchParams,
  manualFilters: ProjectFilters,
): ProjectFilters {
  const urlFilters = pickUrlFilters(searchParams, PROJECT_URL_FILTER_KEYS);
  const manual = { ...manualFilters };
  for (const key of PROJECT_URL_FILTER_KEYS) {
    delete manual[key];
  }
  return { ...manual, ...urlFilters };
}

export function supportFiltersFromSearchParams(
  searchParams: URLSearchParams,
  manualFilters: SupportActivityFilters,
): SupportActivityFilters {
  const urlFilters = pickUrlFilters(searchParams, SUPPORT_URL_FILTER_KEYS);
  const manual = { ...manualFilters };
  for (const key of SUPPORT_URL_FILTER_KEYS) {
    delete manual[key];
  }
  return { ...manual, ...urlFilters };
}

export function auditFiltersFromSearchParams(
  searchParams: URLSearchParams,
  manualFilters: AuditFilters,
): AuditFilters {
  const urlFilters = pickUrlFilters(searchParams, AUDIT_URL_FILTER_KEYS);
  const manual = { ...manualFilters };
  for (const key of AUDIT_URL_FILTER_KEYS) {
    delete manual[key];
  }
  return { ...manual, ...urlFilters };
}

export function cnfFiltersFromSearchParams(
  searchParams: URLSearchParams,
  manualFilters: CnfListUrlFilters,
): CnfListUrlFilters {
  const urlFilters = pickUrlFilters(searchParams, [...CNF_URL_FILTER_KEYS]);
  const manual = { ...manualFilters };
  for (const key of CNF_URL_FILTER_KEYS) {
    delete manual[key as keyof CnfListUrlFilters];
  }
  return { ...manual, ...urlFilters };
}

export function projectFilterBannerLabels(filters: ProjectFilters): string[] {
  const labels: string[] = [];
  if (filters.final_status) labels.push(`Final Status: ${filters.final_status}`);
  if (filters.cnf_status) labels.push(`CNF Status: ${filters.cnf_status}`);
  if (filters.due_window) labels.push(`Due: ${filters.due_window}`);
  if (filters.pending_role) labels.push(`Pending: ${filters.pending_role}`);
  if (filters.drill) labels.push(`Drill: ${filters.drill}`);
  if (filters.fg_month) labels.push(`FG Month: ${filters.fg_month}`);
  if (filters.fg_year) labels.push(`FG Year: ${filters.fg_year}`);
  if (filters.delivery_status) labels.push(`Delivery: ${filters.delivery_status}`);
  if (filters.sort) labels.push(`Sort: ${filters.sort}${filters.order ? ` ${filters.order}` : ""}`);
  return labels;
}

export function supportFilterBannerLabels(filters: SupportActivityFilters): string[] {
  const labels: string[] = [];
  if (filters.due_window) labels.push(`Due: ${filters.due_window}`);
  if (filters.status) labels.push(`Status: ${filters.status}`);
  if (filters.activity_kind) labels.push(`Kind: ${filters.activity_kind}`);
  if (filters.sort) labels.push(`Sort: ${filters.sort}${filters.order ? ` ${filters.order}` : ""}`);
  return labels;
}

export function clearProjectUrlFilterParams(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  for (const key of PROJECT_URL_FILTER_KEYS) next.delete(key);
  return next;
}

export function clearSupportUrlFilterParams(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  for (const key of SUPPORT_URL_FILTER_KEYS) next.delete(key);
  return next;
}
