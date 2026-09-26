import {
  CloseOutlined,
  LogoutOutlined,
  MoonOutlined,
  SunOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Drawer, Dropdown, Tooltip, Typography } from "antd";
import type { MenuProps } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "@/components/common/lucide-icon";
import { ProfileSettingsModal } from "@/components/layout/profile-settings-modal";
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item";
import { getVisibleSidebarNavSections } from "@/components/layout/sidebar-nav";
import { useAuth } from "@/app/auth-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { useAppTheme } from "@/app/theme-provider";
import type { SidebarState } from "@/hooks/use-sidebar-state";
import { signOut } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { getProfileDisplayName, getProfileInitials } from "@/lib/profileName";
import { cn } from "@/lib/utils";
import { applySidebarOrder, type SidebarNavLeaf } from "@/components/layout/sidebar-nav-tree";
import type { SidebarNavSection } from "@/components/layout/sidebar-nav";

const SIDEBAR_ORDER_KEY = "project-tracker:sidebar-nav-order";

function sectionKey(section: SidebarNavSection): string {
  return section.type === "link" ? section.item.href : section.id;
}

function readSidebarOrder(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SIDEBAR_ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
}

function groupContainsPath(items: SidebarNavLeaf[], pathname: string): boolean {
  return items.some((item) => (
    item.href === "/projects"
      ? pathname === "/projects"
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
  ));
}

interface SidebarProps {
  state: SidebarState;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onExpandSidebar?: () => void;
}

export function Sidebar({ state, isMobileOpen, onCloseMobile, onExpandSidebar }: SidebarProps) {
  const location = useLocation();
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

  const visibleNavSections = useMemo(
    () => getVisibleSidebarNavSections(profile?.role, overrides),
    [profile?.role, overrides],
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [menuOrder] = useState<string[]>(readSidebarOrder);
  const orderedSections = useMemo(
    () => applySidebarOrder(visibleNavSections, menuOrder, sectionKey),
    [menuOrder, visibleNavSections],
  );

  useEffect(() => {
    const active = visibleNavSections.find(
      (section) => section.type === "group" && groupContainsPath(section.items, location.pathname),
    );
    setOpenGroups(active?.type === "group" ? { [active.id]: true } : {});
  }, [location.pathname, visibleNavSections]);

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
        {orderedSections.map((section) => {
          if (section.type === "link") {
            return (
              <SidebarNavItem
                key={section.item.href}
                item={section.item}
                state={state}
                onNavigate={onCloseMobile}
              />
            );
          }
          const open = Boolean(openGroups[section.id]);
          return (
            <div key={section.id} className={cn("sidebar-nav-group", open && "is-open")} role="group" aria-label={section.label}>
              <button
                type="button"
                className="sidebar-nav-group-label"
                aria-expanded={open}
                onClick={() => setOpenGroups((current) => (current[section.id] ? {} : { [section.id]: true }))}
              >
                <span>{section.label}</span>
                <LucideIcon name="chevron-right" size={16} className="sidebar-nav-chevron" aria-hidden />
              </button>
              <div className="sidebar-nav-group-items">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    state={state}
                    nested
                    onNavigate={onCloseMobile}
                  />
                ))}
              </div>
            </div>
          );
        })}
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
