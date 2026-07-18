import { Tooltip } from "antd";
import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { getVisibleSidebarNavItems } from "@/components/layout/sidebar-nav";
import { cn } from "@/lib/utils";

function hoverChromeContainer(trigger: HTMLElement): HTMLElement {
  return (trigger.closest(".sidebar-hover-chrome") as HTMLElement | null) ?? document.body;
}

export function CollapsedNavRail() {
  const { profile } = useAuth();
  const { overrides } = useMenuPermissions();
  const items = useMemo(
    () => getVisibleSidebarNavItems(profile?.role, overrides),
    [profile?.role, overrides],
  );

  return (
    <nav className="sidebar-collapsed-rail" aria-label="Quick navigation">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Tooltip
            key={item.href}
            title={item.label}
            placement="right"
            mouseEnterDelay={0.15}
            getPopupContainer={hoverChromeContainer}
          >
            <NavLink
              to={item.href}
              end={item.href === "/projects"}
              className={({ isActive }) =>
                cn("sidebar-collapsed-rail-item", isActive && "sidebar-collapsed-rail-item-active")
              }
              aria-label={item.label}
            >
              <Icon className="sidebar-collapsed-rail-icon" aria-hidden />
            </NavLink>
          </Tooltip>
        );
      })}
    </nav>
  );
}
