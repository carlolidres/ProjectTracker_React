import { MenuUnfoldOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: Readonly<AppShellProps>) {
  const sidebar = useSidebarState();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isCollapsed = sidebar.state === "collapsed";
  // Keep FAB through the exit fade, then unmount so it cannot linger when chrome is open.
  const [showExpandFab, setShowExpandFab] = useState(isCollapsed);
  const [fabExiting, setFabExiting] = useState(false);

  useEffect(() => {
    if (isCollapsed) {
      setShowExpandFab(true);
      setFabExiting(false);
      return;
    }
    setFabExiting(true);
    const timer = window.setTimeout(() => {
      setShowExpandFab(false);
      setFabExiting(false);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [isCollapsed]);

  return (
    <div className={cn("app-root", isCollapsed && "sidebar-collapsed")}>
      <Sidebar
        state={sidebar.state}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onExpandSidebar={sidebar.expand}
      />
      <div className="app-main">
        <Topbar
          sidebarState={sidebar.state}
          onToggleSidebar={sidebar.toggle}
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
        />
        <main className="app-content">{children}</main>
      </div>
      {showExpandFab ? (
        <Tooltip title="Expand sidebar and header" placement="right" open={fabExiting ? false : undefined}>
          <button
            type="button"
            className={cn(
              "sidebar-expand-fab desktop-only",
              (!isCollapsed || fabExiting) && "sidebar-expand-fab--hidden",
            )}
            aria-label="Expand sidebar and header"
            aria-hidden={!isCollapsed || fabExiting}
            tabIndex={isCollapsed && !fabExiting ? 0 : -1}
            onClick={sidebar.expand}
          >
            <MenuUnfoldOutlined className="sidebar-expand-fab-icon" aria-hidden />
          </button>
        </Tooltip>
      ) : null}
    </div>
  );
}
