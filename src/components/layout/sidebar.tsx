import {
  CloseOutlined,
  LogoutOutlined,
  MoonOutlined,
  SunOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Drawer, Dropdown, Tooltip, Typography } from "antd";
import type { MenuProps } from "antd";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "@/components/common/lucide-icon";
import { ProfileSettingsModal } from "@/components/layout/profile-settings-modal";
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item";
import { ProjectBoardPopup } from "@/features/project-management/board/ProjectBoardPopup";
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
  const [boardOpen, setBoardOpen] = useState(false);
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
  const [menuOrder, setMenuOrder] = useState<string[]>(readSidebarOrder);
  const orderedSections = useMemo(
    () => applySidebarOrder(visibleNavSections, menuOrder, sectionKey),
    [menuOrder, visibleNavSections],
  );
  const gesture = useRef<{
    key: string;
    pointerId: number;
    startX: number;
    startY: number;
    from: number;
    rects: DOMRect[];
    strides: number[];
  } | null>(null);
  const dragRef = useRef<{ key: string; from: number; to: number; dy: number; stride: number } | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<{ key: string; from: number; to: number; dy: number; stride: number } | null>(null);
  const [freezeMotion, setFreezeMotion] = useState(false);

  useLayoutEffect(() => {
    if (!freezeMotion) return undefined;
    const frame = requestAnimationFrame(() => setFreezeMotion(false));
    return () => cancelAnimationFrame(frame);
  }, [freezeMotion]);

  const saveOrder = (next: string[]) => {
    setMenuOrder(next);
    localStorage.setItem(SIDEBAR_ORDER_KEY, JSON.stringify(next));
  };

  const onMovablePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const block = event.currentTarget.closest(".sidebar-nav-block");
    const nav = event.currentTarget.closest(".sidebar-nav");
    if (!(block instanceof HTMLElement) || !(nav instanceof HTMLElement)) return;
    const key = block.dataset.navKey;
    if (!key) return;
    const blocks = [...nav.querySelectorAll<HTMLElement>(".sidebar-nav-block")];
    const from = blocks.findIndex((node) => node.dataset.navKey === key);
    if (from < 0) return;
    const rects = blocks.map((node) => node.getBoundingClientRect());
    const strides = rects.map((rect, index) => {
      const next = rects[index + 1];
      return next ? next.top - rect.top : rect.height + 4;
    });
    gesture.current = { key, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, from, rects, strides };
  };

  const onMovablePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!dragRef.current && Math.hypot(dx, dy) < 8) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    let insertAt = 0;
    for (let index = 0; index < current.rects.length; index += 1) {
      const rect = current.rects[index];
      if (!rect) continue;
      if (event.clientY > rect.top + rect.height / 2) insertAt = index + 1;
    }
    const without = current.rects.length - 1;
    const to = Math.max(0, Math.min(without, insertAt > current.from ? insertAt - 1 : insertAt));
    const next = { key: current.key, from: current.from, to, dy, stride: current.strides[current.from] ?? 48 };
    dragRef.current = next;
    setDrag(next);
  };

  const onMovablePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || event.pointerId !== current.pointerId) return;
    gesture.current = null;
    const active = dragRef.current;
    dragRef.current = null;
    if (active) {
      suppressClick.current = true;
      if (active.to !== active.from) {
        const keys = orderedSections.map(sectionKey);
        const next = keys.filter((key) => key !== active.key);
        next.splice(active.to, 0, active.key);
        setFreezeMotion(true);
        saveOrder(next);
      }
    }
    setDrag(null);
  };

  const shiftFor = (index: number) => {
    if (!drag) return 0;
    if (index === drag.from) return drag.dy;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -drag.stride;
    if (drag.to < drag.from && index >= drag.to && index < drag.from) return drag.stride;
    return 0;
  };

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

      <nav className={cn("sidebar-nav", drag && "is-sorting", freezeMotion && "is-frozen")} aria-label="Primary navigation">
        {orderedSections.map((section, index) => {
          const key = sectionKey(section);
          const shift = shiftFor(index);
          const lifted = drag?.key === key;
          const blockClass = cn(
            "sidebar-nav-block",
            lifted && "is-dragging",
            drag && !lifted && drag.to === index && drag.to !== drag.from && (drag.to < drag.from ? "is-drop-before" : "is-drop-after"),
          );
          const blockStyle = shift ? { transform: `translateY(${shift}px)` } : undefined;
          const movable = {
            onPointerDown: onMovablePointerDown,
            onPointerMove: onMovablePointerMove,
            onPointerUp: onMovablePointerUp,
            onPointerCancel: onMovablePointerUp,
          };
          if (section.type === "link") {
            return (
              <div
                key={key}
                className={blockClass}
                style={blockStyle}
                data-nav-key={key}
                onClickCapture={(event) => {
                  if (!suppressClick.current) return;
                  suppressClick.current = false;
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <div className="sidebar-nav-movable" {...movable}>
                  <SidebarNavItem
                    item={section.item}
                    state={state}
                    onNavigate={onCloseMobile}
                    onPopup={section.item.openInWindow ? () => setBoardOpen(true) : undefined}
                  />
                </div>
              </div>
            );
          }
          const open = Boolean(openGroups[section.id]);
          return (
            <div key={key} className={cn(blockClass, "sidebar-nav-group", open && "is-open")} style={blockStyle} data-nav-key={key} role="group" aria-label={section.label}>
              <button
                type="button"
                className="sidebar-nav-group-label sidebar-nav-movable"
                aria-expanded={open}
                {...movable}
                onClick={(event) => {
                  if (suppressClick.current) {
                    suppressClick.current = false;
                    event.preventDefault();
                    return;
                  }
                  setOpenGroups((current) => (current[section.id] ? {} : { [section.id]: true }));
                }}
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
      <ProjectBoardPopup open={boardOpen} onClose={() => setBoardOpen(false)} />
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
