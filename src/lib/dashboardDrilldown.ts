export type ProjectDrillFilter = "pending_cnf" | "pending_protocol" | "pending_report";

export function projectsDatabaseRoute(params?: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `/projects/database?${query}` : "/projects/database";
}

export function supportActivitiesRoute(params?: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `/support-activities?${query}` : "/support-activities";
}

export function pendingCnfDatabaseRoute() {
  return projectsDatabaseRoute({ drill: "pending_cnf" });
}

export function pendingProtocolDatabaseRoute() {
  return projectsDatabaseRoute({ drill: "pending_protocol" });
}

export function pendingReportDatabaseRoute() {
  return projectsDatabaseRoute({ drill: "pending_report" });
}
