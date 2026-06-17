import type { UserRole } from "@/types";

export interface RouteAccess {
  path: string;
  roles: UserRole[] | "all";
}

export const ROUTE_ACCESS: RouteAccess[] = [
  { path: "/dashboard", roles: "all" },
  { path: "/projects", roles: "all" },
  { path: "/projects/database", roles: "all" },
  { path: "/support-activities", roles: "all" },
  { path: "/lessons-learned", roles: "all" },
  { path: "/audit-trail", roles: "all" },
  { path: "/archived", roles: ["admin"] },
  { path: "/registry", roles: ["admin"] },
  { path: "/admin/users", roles: ["admin"] },
  { path: "/admin/data-map", roles: ["admin"] },
];

export function isAdminRole(role: UserRole | undefined): boolean {
  return role === "admin";
}

export function canArchiveRecords(role: UserRole | undefined): boolean {
  return isAdminRole(role);
}

export function canManageRegistry(role: UserRole | undefined): boolean {
  return isAdminRole(role);
}

export function canAccessRoute(role: UserRole | undefined, path: string): boolean {
  if (!role) return false;
  const entry = ROUTE_ACCESS.find((item) => path === item.path || path.startsWith(`${item.path}/`));
  if (!entry) return true;
  if (entry.roles === "all") return true;
  return entry.roles.includes(role);
}

export function isViewerRole(role: UserRole | undefined): boolean {
  return role === "view";
}

export function canCopyCnfFromProject(role: UserRole | undefined): boolean {
  return role === "admin" || role === "am_bm_pl";
}

export function canEditProjectFields(role: UserRole, fieldGroup: "am" | "qa" | "pp" | "tsd" | "val" | "qc"): boolean {
  if (role === "admin") return true;
  if (role === "view") return false;
  const map: Record<string, UserRole[]> = {
    am: ["am_bm_pl"],
    qa: ["qa"],
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
