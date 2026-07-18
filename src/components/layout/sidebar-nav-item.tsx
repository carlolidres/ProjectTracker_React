import { Tooltip } from "antd";
import { NavLink } from "react-router-dom";
import type { SidebarState } from "@/hooks/use-sidebar-state";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";

interface SidebarNavItemProps {
  item: NavItem;
  state: SidebarState;
  onNavigate?: () => void;
}

export function SidebarNavItem({ item, state, onNavigate }: SidebarNavItemProps) {
  const Icon = item.icon;
  const isCollapsed = state === "collapsed";

  const link = (
    <NavLink
      to={item.href}
      end={item.href === "/projects"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn("sidebar-nav-item", isCollapsed && "sidebar-nav-item-collapsed", isActive && "sidebar-nav-item-active")
      }
      aria-label={item.label}
      title={isCollapsed ? undefined : item.label}
    >
      <Icon className="sidebar-icon" aria-hidden />
      <span className="sidebar-label">{item.label}</span>
    </NavLink>
  );

  // Collapsed: navigate on icon click only — do not expand the sidebar.
  if (!isCollapsed) return link;
  return (
    <Tooltip title={item.label} placement="right" mouseEnterDelay={0.35}>
      {link}
    </Tooltip>
  );
}
