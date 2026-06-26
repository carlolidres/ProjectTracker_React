import type { ProjectFilters } from "@/types/project";
import type { SupportActivityFilters } from "@/types/supportActivity";

const PROJECT_URL_FILTER_KEYS = [
  "cnf_status",
  "final_status",
  "due_window",
  "pending_role",
  "drill",
] as const satisfies ReadonlyArray<keyof ProjectFilters>;

export function projectFiltersFromSearchParams(
  searchParams: URLSearchParams,
  manualFilters: ProjectFilters,
): ProjectFilters {
  const urlFilters: ProjectFilters = {};
  for (const key of PROJECT_URL_FILTER_KEYS) {
    const value = searchParams.get(key);
    if (value) urlFilters[key] = value;
  }

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
  const dueWindow = searchParams.get("due_window");
  const manual = { ...manualFilters };
  if (dueWindow) {
    return { ...manual, due_window: dueWindow };
  }
  const { due_window: _removed, ...rest } = manual;
  return rest;
}
