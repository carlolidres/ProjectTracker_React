import type { UserRole } from "@/types";

export type MenuKey =
  | "dashboard"
  | "projects_entry"
  | "projects_database"
  | "support_activities"
  | "cnf_tracker"
  | "endorsement_tracker"
  | "lessons_learned"
  | "audit_trail"
  | "archived"
  | "registry"
  | "admin_users"
  | "admin_access"
  | "admin_data_map";

export type MenuAction = "view" | "create" | "edit" | "export";

export interface MenuCapabilities {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_export: boolean;
}

export interface MenuPermissionOverride {
  role: UserRole;
  menu_key: MenuKey;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_export: boolean;
}

/** Seven default menus for new / non-admin users. */
export const DEFAULT_USER_MENU_KEYS: readonly MenuKey[] = [
  "dashboard",
  "projects_entry",
  "projects_database",
  "support_activities",
  "cnf_tracker",
  "endorsement_tracker",
  "lessons_learned",
] as const;

export const ALL_MENU_KEYS: readonly MenuKey[] = [
  ...DEFAULT_USER_MENU_KEYS,
  "audit_trail",
  "archived",
  "registry",
  "admin_users",
  "admin_access",
  "admin_data_map",
] as const;

export const MENU_LABELS: Record<MenuKey, string> = {
  dashboard: "Dashboard",
  projects_entry: "Projects",
  projects_database: "Projects Database",
  support_activities: "Support Activities",
  cnf_tracker: "CNF Tracker",
  endorsement_tracker: "Endorsement Tracker",
  lessons_learned: "Lessons Learned",
  audit_trail: "Audit Trail",
  archived: "Archived",
  registry: "Registry",
  admin_users: "User Management",
  admin_access: "Access Matrix",
  admin_data_map: "Data Map",
};

export const MENU_ROUTE: Record<MenuKey, string> = {
  dashboard: "/dashboard",
  projects_entry: "/projects",
  projects_database: "/projects/database",
  support_activities: "/support-activities",
  cnf_tracker: "/cnf-tracker",
  endorsement_tracker: "/endorsement-tracker",
  lessons_learned: "/lessons-learned",
  audit_trail: "/audit-trail",
  archived: "/archived",
  registry: "/registry",
  admin_users: "/admin/users",
  admin_access: "/admin/access",
  admin_data_map: "/admin/data-map",
};

/** Capabilities that are never applicable for a menu (UI disables these cells). */
export const MENU_NA_ACTIONS: Partial<Record<MenuKey, MenuAction[]>> = {
  dashboard: ["create", "edit", "export"],
  projects_entry: ["export"],
  audit_trail: ["create", "edit"],
  admin_users: ["create", "export"],
  admin_access: ["create", "export"],
  admin_data_map: ["create", "edit", "export"],
};

const none: MenuCapabilities = {
  can_view: false,
  can_create: false,
  can_edit: false,
  can_export: false,
};

const viewOnly: MenuCapabilities = {
  can_view: true,
  can_create: false,
  can_edit: false,
  can_export: false,
};

const viewExport: MenuCapabilities = {
  can_view: true,
  can_create: false,
  can_edit: false,
  can_export: true,
};

const viewEditExport: MenuCapabilities = {
  can_view: true,
  can_create: false,
  can_edit: true,
  can_export: true,
};

const full: MenuCapabilities = {
  can_view: true,
  can_create: true,
  can_edit: true,
  can_export: true,
};

const entryFull: MenuCapabilities = {
  can_view: true,
  can_create: true,
  can_edit: true,
  can_export: false,
};

function applyNa(menu: MenuKey, caps: MenuCapabilities): MenuCapabilities {
  const na = MENU_NA_ACTIONS[menu] ?? [];
  const next = { ...caps };
  if (na.includes("create")) next.can_create = false;
  if (na.includes("edit")) next.can_edit = false;
  if (na.includes("export")) next.can_export = false;
  return next;
}

function buildNonAdminDefaults(role: UserRole): Record<MenuKey, MenuCapabilities> {
  const base = Object.fromEntries(ALL_MENU_KEYS.map((key) => [key, { ...none }])) as Record<
    MenuKey,
    MenuCapabilities
  >;

  for (const key of DEFAULT_USER_MENU_KEYS) {
    base[key] = { ...viewOnly };
  }

  if (role === "view") {
    return Object.fromEntries(
      ALL_MENU_KEYS.map((key) => [key, applyNa(key, base[key])]),
    ) as Record<MenuKey, MenuCapabilities>;
  }

  // Operational roles: Create/Edit/Export aligned with existing can* helpers.
  base.projects_entry = { ...entryFull };
  base.projects_database = { ...viewEditExport };
  base.support_activities = { ...full };
  base.lessons_learned = { ...full };

  if (role === "qa" || role === "val") {
    base.cnf_tracker = { ...full };
  } else {
    base.cnf_tracker = { ...viewExport };
  }

  if (role === "val") {
    base.endorsement_tracker = { ...full };
  } else if (role === "qa") {
    base.endorsement_tracker = { ...viewEditExport };
  } else {
    base.endorsement_tracker = { ...viewExport };
  }

  return Object.fromEntries(
    ALL_MENU_KEYS.map((key) => [key, applyNa(key, base[key])]),
  ) as Record<MenuKey, MenuCapabilities>;
}

function buildAdminDefaults(): Record<MenuKey, MenuCapabilities> {
  const base = Object.fromEntries(
    ALL_MENU_KEYS.map((key) => {
      if (key === "dashboard") return [key, applyNa(key, viewOnly)];
      if (key === "projects_entry") return [key, applyNa(key, entryFull)];
      if (key === "audit_trail") return [key, applyNa(key, viewExport)];
      if (key === "admin_data_map") return [key, applyNa(key, viewOnly)];
      if (key === "admin_users" || key === "admin_access") {
        return [key, applyNa(key, { can_view: true, can_create: false, can_edit: true, can_export: false })];
      }
      return [key, applyNa(key, full)];
    }),
  ) as Record<MenuKey, MenuCapabilities>;
  return base;
}

const ROLE_ORDER: UserRole[] = ["am_bm_pl", "qa", "pp", "tsd", "val", "qc", "admin", "view"];

export const DEFAULT_MENU_PERMISSIONS: Record<UserRole, Record<MenuKey, MenuCapabilities>> =
  Object.fromEntries(
    ROLE_ORDER.map((role) => [
      role,
      role === "admin" ? buildAdminDefaults() : buildNonAdminDefaults(role),
    ]),
  ) as Record<UserRole, Record<MenuKey, MenuCapabilities>>;

let overrideCache: MenuPermissionOverride[] = [];

export function setMenuPermissionOverrideCache(overrides: MenuPermissionOverride[]) {
  overrideCache = overrides;
}

export function getMenuPermissionOverrideCache(): MenuPermissionOverride[] {
  return overrideCache;
}

export function isMenuMatrixEnabled(): boolean {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const flag = String(env?.VITE_FEATURE_MENU_MATRIX ?? "true").trim().toLowerCase();
  return flag !== "false" && flag !== "0" && flag !== "off";
}

export function menuKeyFromPath(path: string): MenuKey | null {
  const normalized = path.split("?")[0] || path;
  const exact = (Object.entries(MENU_ROUTE) as Array<[MenuKey, string]>).find(
    ([, route]) => route === normalized,
  );
  if (exact) return exact[0];
  // Longest prefix match for nested paths
  let best: MenuKey | null = null;
  let bestLen = -1;
  for (const [key, route] of Object.entries(MENU_ROUTE) as Array<[MenuKey, string]>) {
    if (normalized.startsWith(`${route}/`) && route.length > bestLen) {
      best = key;
      bestLen = route.length;
    }
  }
  return best;
}

export function getDefaultCapabilities(role: UserRole, menu: MenuKey): MenuCapabilities {
  return { ...DEFAULT_MENU_PERMISSIONS[role][menu] };
}

export function resolveMenuCapabilities(
  role: UserRole | undefined,
  menu: MenuKey,
  overrides: MenuPermissionOverride[] = overrideCache,
): MenuCapabilities {
  if (!role) return { ...none };
  const defaults = getDefaultCapabilities(role, menu);
  const override = overrides.find((row) => row.role === role && row.menu_key === menu);
  if (!override) return applyNa(menu, defaults);
  return applyNa(menu, {
    can_view: override.can_view,
    can_create: override.can_create,
    can_edit: override.can_edit,
    can_export: override.can_export,
  });
}

export function canMenu(
  role: UserRole | undefined,
  menu: MenuKey,
  action: MenuAction,
  overrides: MenuPermissionOverride[] = overrideCache,
): boolean {
  if (!isMenuMatrixEnabled()) {
    // Legacy fallback handled by callers for route access; for actions, keep role heuristics.
    if (action === "view") return true;
    if (role === "view") return false;
    if (role === "admin") return action !== "export" || menu !== "dashboard";
    return action !== "create" || menu !== "dashboard";
  }
  const caps = resolveMenuCapabilities(role, menu, overrides);
  if (action === "view") return caps.can_view;
  if (action === "create") return caps.can_view && caps.can_create;
  if (action === "edit") return caps.can_view && caps.can_edit;
  return caps.can_view && caps.can_export;
}

export function canMenuPath(
  role: UserRole | undefined,
  path: string,
  action: MenuAction,
  overrides: MenuPermissionOverride[] = overrideCache,
): boolean {
  const menu = menuKeyFromPath(path);
  if (!menu) return action === "view";
  return canMenu(role, menu, action, overrides);
}

export function resolveAllMenuCapabilities(
  role: UserRole,
  overrides: MenuPermissionOverride[] = overrideCache,
): Record<MenuKey, MenuCapabilities> {
  return Object.fromEntries(
    ALL_MENU_KEYS.map((menu) => [menu, resolveMenuCapabilities(role, menu, overrides)]),
  ) as Record<MenuKey, MenuCapabilities>;
}
