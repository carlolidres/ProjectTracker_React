import type { UserRole } from "@/types";

export interface RouteAccess {
  path: string;
  roles: UserRole[] | "all";
}

export const ROUTE_ACCESS: RouteAccess[] = [
  { path: "/dashboard", roles: "all" },
  { path: "/projects", roles: ["am_bm_pl", "pp", "tsd", "val", "qc", "admin"] },
  { path: "/projects/database", roles: "all" },
  { path: "/support-activities", roles: ["tsd", "val", "admin", "view", "am_bm_pl"] },
  { path: "/audit-trail", roles: ["admin", "view"] },
  { path: "/archived", roles: ["admin"] },
  { path: "/registry", roles: ["admin"] },
];

export function canAccessRoute(role: UserRole | undefined, path: string): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  const rule = ROUTE_ACCESS.find((entry) => path.startsWith(entry.path));
  if (!rule) return true;
  if (rule.roles === "all") return true;
  return rule.roles.includes(role);
}

export function canEditProjectFields(role: UserRole, fieldGroup: "am" | "pp" | "tsd" | "val" | "qc"): boolean {
  if (role === "admin") return true;
  const map: Record<string, UserRole[]> = {
    am: ["am_bm_pl"],
    pp: ["pp"],
    tsd: ["tsd"],
    val: ["val"],
    qc: ["qc"],
  };
  return map[fieldGroup]?.includes(role) ?? false;
}

export function getVisibleNavPaths(role: UserRole | undefined): string[] {
  if (!role) return [];
  return ROUTE_ACCESS.filter((entry) => canAccessRoute(role, entry.path)).map((entry) => entry.path);
}
