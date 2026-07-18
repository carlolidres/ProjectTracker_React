import {
  canMenuPath,
  getMenuPermissionOverrideCache,
  isMenuMatrixEnabled,
  type MenuPermissionOverride,
} from "@/lib/menuPermissions";
import type { UserRole } from "@/types";

export interface RouteAccess {
  path: string;
  roles: UserRole[] | "all";
}

/** Legacy path allow-list — used when VITE_FEATURE_MENU_MATRIX is off. */
export const ROUTE_ACCESS: RouteAccess[] = [
  { path: "/dashboard", roles: "all" },
  { path: "/projects", roles: "all" },
  { path: "/projects/database", roles: "all" },
  { path: "/support-activities", roles: "all" },
  { path: "/cnf-tracker", roles: "all" },
  { path: "/endorsement-tracker", roles: "all" },
  { path: "/lessons-learned", roles: "all" },
  { path: "/audit-trail", roles: ["admin", "view"] },
  { path: "/archived", roles: ["admin"] },
  { path: "/registry", roles: ["admin"] },
  { path: "/admin/users", roles: ["admin"] },
  { path: "/admin/access", roles: ["admin"] },
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

function legacyCanAccessRoute(role: UserRole, path: string): boolean {
  const entry = ROUTE_ACCESS.find((item) => path === item.path || path.startsWith(`${item.path}/`));
  if (!entry) return true;
  if (entry.roles === "all") return true;
  return entry.roles.includes(role);
}

export function canAccessRoute(
  role: UserRole | undefined,
  path: string,
  overrides: MenuPermissionOverride[] = getMenuPermissionOverrideCache(),
): boolean {
  if (!role) return false;
  if (!isMenuMatrixEnabled()) return legacyCanAccessRoute(role, path);
  return canMenuPath(role, path, "view", overrides);
}

export function isViewerRole(role: UserRole | undefined): boolean {
  return role === "view";
}

export function canCopyCnfFromProject(role: UserRole | undefined): boolean {
  return role === "admin" || role === "am_bm_pl";
}

export function canEditCnfTracker(role: UserRole | undefined): boolean {
  return role === "admin" || role === "qa" || role === "val";
}

/** Admin and VAL manage endorsement records. */
export function canManageEndorsementTracker(role: UserRole | undefined): boolean {
  return role === "admin" || role === "val";
}

/** QA may update QA verification fields only. */
export function canEditEndorsementQaFields(role: UserRole | undefined): boolean {
  return role === "admin" || role === "qa" || role === "val";
}

export function canEditEndorsementQaOnly(role: UserRole | undefined): boolean {
  return role === "qa";
}

/** Only admin may remove reusable dropdown options. */
export function canRemoveReusableOptions(role: UserRole | undefined): boolean {
  return isAdminRole(role);
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

/**
 * Whether the user may select a Projects Database role-legend chip to focus columns.
 * View-only: does not grant edit rights — only column visibility for roles they own (none) or admin (all).
 */
export function canFocusProjectsDbRoleColumns(
  role: UserRole | undefined,
  fieldGroup: "am" | "qa" | "pp" | "tsd" | "val" | "qc",
): boolean {
  if (!role) return false;
  return canEditProjectFields(role, fieldGroup);
}

/** Admin and AM/BM/PL may change a saved FG Month (reason logged to Lessons Learned on save). */
export function canAdjustSavedFgMonth(role: UserRole | undefined): boolean {
  return role === "admin" || role === "am_bm_pl";
}

export function getVisibleNavPaths(role: UserRole | undefined): string[] {
  if (!role) return [];
  return ROUTE_ACCESS.filter((entry) => canAccessRoute(role, entry.path)).map((entry) => entry.path);
}
