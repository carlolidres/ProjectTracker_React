import {
  AuditOutlined,
  CloseOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  InboxOutlined,
  LogoutOutlined,
  MoonOutlined,
  SettingOutlined,
  SunOutlined,
  ToolOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Drawer, Dropdown, Tooltip, Typography } from "antd";
import type { MenuProps } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item";
import { useAuth } from "@/app/auth-provider";
import { useAppTheme } from "@/app/theme-provider";
import type { SidebarState } from "@/hooks/use-sidebar-state";
import { signOut } from "@/lib/auth";
import { canAccessRoute } from "@/lib/roleAccess";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { NavItem, UserRole } from "@/types";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardOutlined },
  { label: "Projects", href: "/projects", icon: FileTextOutlined },
  { label: "Projects Database", href: "/projects/database", icon: DatabaseOutlined },
  { label: "Support Activities", href: "/support-activities", icon: ToolOutlined },
];

const adminNavItems: NavItem[] = [
  { label: "Audit Trail", href: "/audit-trail", icon: AuditOutlined },
  { label: "Archived", href: "/archived", icon: InboxOutlined },
  { label: "Registry", href: "/registry", icon: SettingOutlined },
];

interface SidebarProps {
  state: SidebarState;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

function filterNavItems(items: NavItem[], role: UserRole | undefined) {
  return items.filter((item) => canAccessRoute(role, item.href));
}

export function Sidebar({ state, isMobileOpen, onCloseMobile }: SidebarProps) {
  const { profile, user } = useAuth();
  const { appTheme, toggleTheme } = useAppTheme();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? "User";
  const roleLabel = profile?.role ? ROLE_LABELS[profile.role] ?? profile.role : "Account";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("");

  const accountItems: MenuProps["items"] = [
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
        navigate("/login", { replace: true });
      },
    },
  ];

  const visibleNavItems = [
    ...filterNavItems(navItems, profile?.role),
    ...filterNavItems(adminNavItems, profile?.role),
  ];

  const content = (
    <div className="sidebar-inner">
      <div className="sidebar-brand">
        <Link to="/dashboard" className="sidebar-logo" onClick={onCloseMobile} aria-label="Go to dashboard">
          PT
        </Link>
        <div className="sidebar-label sidebar-brand-text">
          <Typography.Text className="sidebar-brand-title">Project Tracker</Typography.Text>
          <Typography.Paragraph className="sidebar-brand-subtitle">CNF implementation workflow</Typography.Paragraph>
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

      <Dropdown menu={{ items: accountItems }} trigger={["click"]} placement="topLeft">
        <Tooltip title={isCollapsed ? `${displayName} - ${roleLabel}` : undefined} placement="right">
          <button
            type="button"
            className={cn("sidebar-user-button", isCollapsed && "sidebar-user-button-collapsed")}
            aria-label={`Open account menu for ${displayName}, ${roleLabel}`}
          >
            <Avatar
              className="sidebar-user-avatar"
              size={38}
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
  );

  return (
    <>
      <aside className={cn("sidebar-shell sidebar-desktop", isCollapsed && "sidebar-shell-collapsed")}>{content}</aside>
      <Drawer
        placement="left"
        open={isMobileOpen}
        onClose={onCloseMobile}
        width={300}
        closable={false}
        styles={{ body: { padding: 0 } }}
      >
        {content}
      </Drawer>
    </>
  );
}
