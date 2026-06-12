import { MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useState } from "react";
import { NotificationCenter } from "@/components/layout/notification-center";
import type { SidebarState } from "@/hooks/use-sidebar-state";

interface TopbarProps {
  sidebarState: SidebarState;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}

export function Topbar({ sidebarState, onToggleSidebar, onOpenMobileSidebar }: TopbarProps) {
  const isCollapsed = sidebarState === "collapsed";
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="topbar">
      <Button
        type="text"
        icon={<MenuOutlined />}
        className="mobile-only"
        aria-label="Open navigation"
        onClick={onOpenMobileSidebar}
      />
      <Tooltip title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
        <Button
          type="text"
          className="desktop-only topbar-sidebar-toggle"
          icon={isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleSidebar}
        />
      </Tooltip>
      <div className="topbar-title">
        <p className="topbar-title-main">Project Tracker</p>
        <p className="topbar-title-sub">CNF and support activity monitoring</p>
      </div>
      <div className="topbar-actions">
        <NotificationCenter open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      </div>
    </header>
  );
}
