import {
  ApartmentOutlined,
  AuditOutlined,
  BookOutlined,
  CommentOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  InboxOutlined,
  ProjectOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import type { ComponentType } from "react";
import {
  AI_ASSISTANT_NAV_LEAF,
  ALL_SIDEBAR_NAV_LEAVES,
  SIDEBAR_ADMIN_NAV_LEAVES,
  SIDEBAR_NAV_LEAVES,
  SIDEBAR_NAV_TREE_SPEC,
  filterSidebarNavSections as filterSidebarNavSectionSpecs,
  sidebarLeafVisible,
  type SidebarNavLeaf,
  type SidebarNavSectionSpec,
} from "@/components/layout/sidebar-nav-tree";
import type { MenuPermissionOverride } from "@/lib/menuPermissions";
import type { NavItem, UserRole } from "@/types";

export { canViewAskAi } from "@/components/layout/sidebar-nav-tree";

export type SidebarNavSection =
  | { type: "link"; item: NavItem }
  | { type: "group"; id: string; label: string; items: NavItem[] };

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "/dashboard": DashboardOutlined,
  "/project-management": ProjectOutlined,
  "/projects": FileTextOutlined,
  "/projects/database": DatabaseOutlined,
  "/support-activities": ToolOutlined,
  "/cnf-tracker": BookOutlined,
  "/endorsement-tracker": FileProtectOutlined,
  "/lessons-learned": ReadOutlined,
  "/audit-trail": AuditOutlined,
  "/archived": InboxOutlined,
  "/registry": SettingOutlined,
  "/admin/users": TeamOutlined,
  "/admin/access": SafetyCertificateOutlined,
  "/admin/data-map": ApartmentOutlined,
  "/ai-assistant": CommentOutlined,
};

function toNavItem(leaf: SidebarNavLeaf): NavItem {
  const icon = ICONS[leaf.href];
  if (!icon) throw new Error(`Missing sidebar icon for ${leaf.href}`);
  return { ...leaf, icon };
}

function toNavSection(section: SidebarNavSectionSpec): SidebarNavSection {
  if (section.type === "link") return { type: "link", item: toNavItem(section.item) };
  return { type: "group", id: section.id, label: section.label, items: section.items.map(toNavItem) };
}

export const AI_ASSISTANT_NAV_ITEM = toNavItem(AI_ASSISTANT_NAV_LEAF);
export const SIDEBAR_NAV_TREE = SIDEBAR_NAV_TREE_SPEC.map(toNavSection);
export const SIDEBAR_NAV_ITEMS = SIDEBAR_NAV_LEAVES.map(toNavItem);
export const SIDEBAR_ADMIN_NAV_ITEMS = SIDEBAR_ADMIN_NAV_LEAVES.map(toNavItem);
export const ALL_SIDEBAR_NAV_ITEMS = ALL_SIDEBAR_NAV_LEAVES.map(toNavItem);

export function filterSidebarNavItems(
  items: NavItem[],
  role: UserRole | undefined,
  overrides: MenuPermissionOverride[],
): NavItem[] {
  return items.filter((item) => sidebarLeafVisible(item, role, overrides));
}

export function getVisibleSidebarNavSections(
  role: UserRole | undefined,
  overrides: MenuPermissionOverride[],
): SidebarNavSection[] {
  return filterSidebarNavSectionSpecs(role, overrides).map(toNavSection);
}

function flattenSidebarNavSections(sections: SidebarNavSection[]): NavItem[] {
  return sections.flatMap((section) => (section.type === "link" ? [section.item] : section.items));
}

export function getVisibleSidebarNavItems(
  role: UserRole | undefined,
  overrides: MenuPermissionOverride[],
): NavItem[] {
  return flattenSidebarNavSections(getVisibleSidebarNavSections(role, overrides));
}
