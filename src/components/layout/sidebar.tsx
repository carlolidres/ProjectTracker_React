import {
  ApartmentOutlined,
  AuditOutlined,
  BookOutlined,
  CloseOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  InboxOutlined,
  LogoutOutlined,
  MoonOutlined,
  SettingOutlined,
  SunOutlined,
  ToolOutlined,
  TeamOutlined,
  UserOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Drawer, Dropdown, Tooltip, Typography } from "antd";
import type { MenuProps } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ProfileSettingsModal } from "@/components/layout/profile-settings-modal";
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item";
import { useAuth } from "@/app/auth-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { useAppTheme } from "@/app/theme-provider";
import type { SidebarState } from "@/hooks/use-sidebar-state";
import { signOut } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import type { MenuPermissionOverride } from "@/lib/menuPermissions";
import { getProfileDisplayName, getProfileInitials } from "@/lib/profileName";
import { canAccessRoute } from "@/lib/roleAccess";
import { cn } from "@/lib/utils";
import type { NavItem, UserRole } from "@/types";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardOutlined },
  { label: "Projects", href: "/projects", icon: FileTextOutlined },
  { label: "Projects Database", href: "/projects/database", icon: DatabaseOutlined },
  { label: "Support Activities", href: "/support-activities", icon: ToolOutlined },
  { label: "CNF Tracker", href: "/cnf-tracker", icon: BookOutlined },
  { label: "Endorsement Tracker", href: "/endorsement-tracker", icon: FileProtectOutlined },
  { label: "Lessons Learned", href: "/lessons-learned", icon: ReadOutlined },
  { label: "Audit Trail", href: "/audit-trail", icon: AuditOutlined },
];

const adminNavItems: NavItem[] = [
  { label: "Archived", href: "/archived", icon: InboxOutlined },
  { label: "Registry", href: "/registry", icon: SettingOutlined },
  { label: "User Management", href: "/admin/users", icon: TeamOutlined },
  { label: "Access Matrix", href: "/admin/access", icon: SafetyCertificateOutlined },
  { label: "Data Map", href: "/admin/data-map", icon: ApartmentOutlined },
];

const allNavItems: NavItem[] = [...navItems, ...adminNavItems];

interface SidebarProps {
  state: SidebarState;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onExpandSidebar?: () => void;
}

function filterNavItems(
  items: NavItem[],
  role: UserRole | undefined,
  overrides: MenuPermissionOverride[],
) {
  return items.filter((item) => {
    if (item.roles && (!role || !item.roles.includes(role))) return false;
    return canAccessRoute(role, item.href, overrides);
  });
}

export function Sidebar({ state, isMobileOpen, onCloseMobile, onExpandSidebar }: SidebarProps) {
  const { profile, user } = useAuth();
  const { overrides } = useMenuPermissions();
  const { appTheme, toggleTheme } = useAppTheme();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const isCollapsed = state === "collapsed";
  const displayName =
    getProfileDisplayName(profile)
    || (typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "")
    || profile?.email
    || user?.email
    || "User";
  const roleLabel = profile?.role ? ROLE_LABELS[profile.role] ?? profile.role : "Account";
  const initials = getProfileInitials(profile);
  const avatarUrl = profile?.avatar_url
    ?? (typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined);

  const accountItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => setProfileModalOpen(true),
    },
    {
      key: "theme",
      icon: appTheme === "dark" ? <SunOutlined /> : <MoonOutlined />,
      label: appTheme === "dark" ? "Use light theme" : "Use dark theme",
      onClick: toggleTheme,
    },
    {
      key: "sign-out",
      icon: <LogoutOutlined />,
      danger: true,
      label: "Sign out",
      onClick: async () => {
        await signOut();
      },
    },
  ];

  const visibleNavItems = filterNavItems(allNavItems, profile?.role, overrides);

  const content = (
    <div className="sidebar-inner">
      <div className="sidebar-brand">
        {isCollapsed && onExpandSidebar ? (
          <button
            type="button"
            className="sidebar-logo sidebar-logo-button"
            onClick={onExpandSidebar}
            aria-label="Expand sidebar and top bar"
            title="Expand sidebar"
          >
            PT
          </button>
        ) : (
          <Link to="/dashboard" className="sidebar-logo" onClick={onCloseMobile} aria-label="Go to dashboard">
            PT
          </Link>
        )}
        <div className="sidebar-label sidebar-brand-text">
          <Typography.Text className="sidebar-brand-title">Project Tracker</Typography.Text>
        </div>
        <Button
          type="text"
          className="sidebar-close-mobile mobile-only"
          icon={<CloseOutlined />}
          aria-label="Close navigation"
          onClick={onCloseMobile}
        />
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {visibleNavItems.map((item) => (
          <SidebarNavItem key={item.label} item={item} state={state} onNavigate={onCloseMobile} />
        ))}
      </nav>

      <div className="sidebar-footer">
        <Dropdown menu={{ items: accountItems }} trigger={["click"]} placement="topLeft">
          <Tooltip title={isCollapsed ? `${displayName} - ${roleLabel}` : undefined} placement="right">
            <button
              type="button"
              className={cn("sidebar-user-button", isCollapsed && "sidebar-user-button-collapsed")}
              aria-label={`Open account menu for ${displayName}, ${roleLabel}`}
            >
              <Avatar
                className="sidebar-user-avatar"
                size={isCollapsed ? 36 : 38}
                src={avatarUrl}
                icon={<UserOutlined />}
              >
                {initials}
              </Avatar>
              <div className="sidebar-label sidebar-user-text">
                <p className="sidebar-user-name">{displayName}</p>
                <p className="sidebar-user-role">{roleLabel}</p>
              </div>
            </button>
          </Tooltip>
        </Dropdown>
      </div>
    </div>
  );

  return (
    <>
      <ProfileSettingsModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
      <aside className={cn("sidebar-shell sidebar-desktop", isCollapsed && "sidebar-shell-collapsed")}>{content}</aside>
      <Drawer
        placement="left"
        open={isMobileOpen}
        onClose={onCloseMobile}
        width={300}
        closable={false}
        rootClassName="sidebar-mobile-drawer"
        styles={{
          body: {
            padding: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        }}
      >
        {content}
      </Drawer>
    </>
  );
}
