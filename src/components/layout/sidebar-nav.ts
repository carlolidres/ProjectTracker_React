import {
  ApartmentOutlined,
  AuditOutlined,
  BookOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  InboxOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import type { MenuPermissionOverride } from "@/lib/menuPermissions";
import { canAccessRoute } from "@/lib/roleAccess";
import type { NavItem, UserRole } from "@/types";

export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardOutlined },
  { label: "Projects", href: "/projects", icon: FileTextOutlined },
  { label: "Projects Database", href: "/projects/database", icon: DatabaseOutlined },
  { label: "Support Activities", href: "/support-activities", icon: ToolOutlined },
  { label: "CNF Tracker", href: "/cnf-tracker", icon: BookOutlined },
  { label: "Endorsement Tracker", href: "/endorsement-tracker", icon: FileProtectOutlined },
  { label: "Lessons Learned", href: "/lessons-learned", icon: ReadOutlined },
  { label: "Audit Trail", href: "/audit-trail", icon: AuditOutlined },
];

export const SIDEBAR_ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Archived", href: "/archived", icon: InboxOutlined },
  { label: "Registry", href: "/registry", icon: SettingOutlined },
  { label: "User Management", href: "/admin/users", icon: TeamOutlined },
  { label: "Access Matrix", href: "/admin/access", icon: SafetyCertificateOutlined },
  { label: "Data Map", href: "/admin/data-map", icon: ApartmentOutlined },
];

export const ALL_SIDEBAR_NAV_ITEMS: NavItem[] = [...SIDEBAR_NAV_ITEMS, ...SIDEBAR_ADMIN_NAV_ITEMS];

export function filterSidebarNavItems(
  items: NavItem[],
  role: UserRole | undefined,
  overrides: MenuPermissionOverride[],
): NavItem[] {
  return items.filter((item) => {
    if (item.roles && (!role || !item.roles.includes(role))) return false;
    return canAccessRoute(role, item.href, overrides);
  });
}

export function getVisibleSidebarNavItems(
  role: UserRole | undefined,
  overrides: MenuPermissionOverride[],
): NavItem[] {
  return filterSidebarNavItems(ALL_SIDEBAR_NAV_ITEMS, role, overrides);
}
