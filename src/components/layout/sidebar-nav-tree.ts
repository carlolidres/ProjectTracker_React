import type { MenuPermissionOverride } from "@/lib/menuPermissions";
import { canAccessRoute } from "@/lib/roleAccess";
import type { UserRole } from "@/types";

export interface SidebarNavLeaf {
  label: string;
  href: string;
  roles?: UserRole[];
}

export type SidebarNavSectionSpec =
  | { type: "link"; item: SidebarNavLeaf }
  | { type: "group"; id: string; label: string; items: SidebarNavLeaf[] };

const DASHBOARD: SidebarNavLeaf = { label: "Dashboard", href: "/dashboard" };
const MY_WORK: SidebarNavLeaf = { label: "Project Management", href: "/project-management" };
const PROJECT_ENTRY: SidebarNavLeaf = { label: "Entry", href: "/projects" };
const PROJECT_SPREADSHEET: SidebarNavLeaf = { label: "Spreadsheet", href: "/projects/database" };
const SUPPORT: SidebarNavLeaf = { label: "Support", href: "/support-activities" };
const CNF: SidebarNavLeaf = { label: "CNF", href: "/cnf-tracker" };
const ENDORSEMENT: SidebarNavLeaf = { label: "Endorsement", href: "/endorsement-tracker" };
const LESSONS: SidebarNavLeaf = { label: "Lessons learned", href: "/lessons-learned" };
const AUDIT: SidebarNavLeaf = { label: "Audit trail", href: "/audit-trail" };
const ARCHIVES: SidebarNavLeaf = { label: "Archives", href: "/archived" };
const REGISTRY: SidebarNavLeaf = { label: "Registry", href: "/registry" };
const USERS: SidebarNavLeaf = { label: "Users", href: "/admin/users" };
const ACCESS: SidebarNavLeaf = { label: "Access", href: "/admin/access" };
const SCHEMA: SidebarNavLeaf = { label: "Schema", href: "/admin/data-map" };

/** Header shortcut. Same route and menu key; not a sidebar row. */
export const AI_ASSISTANT_NAV_LEAF: SidebarNavLeaf = { label: "Ask AI", href: "/ai-assistant" };

export const SIDEBAR_NAV_TREE_SPEC: SidebarNavSectionSpec[] = [
  { type: "link", item: DASHBOARD },
  { type: "link", item: MY_WORK },
  { type: "group", id: "projects", label: "Projects", items: [PROJECT_ENTRY, PROJECT_SPREADSHEET] },
  { type: "link", item: SUPPORT },
  { type: "group", id: "trackers", label: "Trackers", items: [CNF, ENDORSEMENT] },
  { type: "link", item: LESSONS },
  { type: "group", id: "admin", label: "Admin", items: [AUDIT, ARCHIVES, REGISTRY, USERS, ACCESS, SCHEMA] },
];

export const SIDEBAR_NAV_LEAVES: SidebarNavLeaf[] = [
  DASHBOARD,
  MY_WORK,
  PROJECT_ENTRY,
  PROJECT_SPREADSHEET,
  SUPPORT,
  CNF,
  ENDORSEMENT,
  LESSONS,
];

export const SIDEBAR_ADMIN_NAV_LEAVES: SidebarNavLeaf[] = [AUDIT, ARCHIVES, REGISTRY, USERS, ACCESS, SCHEMA];

export const ALL_SIDEBAR_NAV_LEAVES: SidebarNavLeaf[] = [...SIDEBAR_NAV_LEAVES, ...SIDEBAR_ADMIN_NAV_LEAVES];

export function sidebarLeafVisible(
  item: SidebarNavLeaf,
  role: UserRole | undefined,
  overrides: MenuPermissionOverride[],
): boolean {
  if (item.roles && (!role || !item.roles.includes(role))) return false;
  return canAccessRoute(role, item.href, overrides);
}

export function filterSidebarNavSections(
  role: UserRole | undefined,
  overrides: MenuPermissionOverride[],
): SidebarNavSectionSpec[] {
  const next: SidebarNavSectionSpec[] = [];
  for (const section of SIDEBAR_NAV_TREE_SPEC) {
    if (section.type === "link") {
      if (sidebarLeafVisible(section.item, role, overrides)) next.push(section);
      continue;
    }
    const items = section.items.filter((item) => sidebarLeafVisible(item, role, overrides));
    if (items.length) next.push({ ...section, items });
  }
  return next;
}

export function flattenSidebarNavLeaves(sections: SidebarNavSectionSpec[]): SidebarNavLeaf[] {
  return sections.flatMap((section) => (section.type === "link" ? [section.item] : section.items));
}

export function getVisibleSidebarNavLeaves(
  role: UserRole | undefined,
  overrides: MenuPermissionOverride[],
): SidebarNavLeaf[] {
  return flattenSidebarNavLeaves(filterSidebarNavSections(role, overrides));
}

export function canViewAskAi(role: UserRole | undefined, overrides: MenuPermissionOverride[]): boolean {
  return sidebarLeafVisible(AI_ASSISTANT_NAV_LEAF, role, overrides);
}

export function moveSidebarKey(order: string[], from: string, to: string): string[] {
  if (!from || from === to || !order.includes(from) || !order.includes(to)) return order;
  const next = order.filter((key) => key !== from);
  const index = next.indexOf(to);
  if (index < 0) return order;
  next.splice(index, 0, from);
  return next;
}

export function applySidebarOrder<T>(sections: T[], saved: string[], keyOf: (section: T) => string): T[] {
  const index = new Map(sections.map((section, position) => [keyOf(section), position]));
  const rank = new Map(saved.map((key, position) => [key, position]));
  return [...sections].sort((left, right) => {
    const leftKey = keyOf(left);
    const rightKey = keyOf(right);
    const leftRank = rank.has(leftKey) ? rank.get(leftKey)! : saved.length + (index.get(leftKey) ?? 0);
    const rightRank = rank.has(rightKey) ? rank.get(rightKey)! : saved.length + (index.get(rightKey) ?? 0);
    return leftRank - rightRank;
  });
}
