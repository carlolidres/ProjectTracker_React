import { MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useState } from "react";
import { AppVersionButton } from "@/components/layout/app-version-button";
import { FeedbackChat } from "@/components/layout/feedback-chat";
import { NotificationCenter } from "@/components/layout/notification-center";
import type { SidebarState } from "@/hooks/use-sidebar-state";
import { cn } from "@/lib/utils";

interface TopbarProps {
  sidebarState: SidebarState;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}

export function Topbar({ sidebarState, onToggleSidebar, onOpenMobileSidebar }: TopbarProps) {
  const isCollapsed = sidebarState === "collapsed";
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className={cn("topbar", isCollapsed && "topbar-hidden-when-sidebar-collapsed")}>
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
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleSidebar}
          icon={
            <span className={cn("topbar-sidebar-toggle-icons", isCollapsed && "is-collapsed")}>
              <MenuFoldOutlined className="topbar-sidebar-toggle-icon topbar-sidebar-toggle-icon-fold" />
              <MenuUnfoldOutlined className="topbar-sidebar-toggle-icon topbar-sidebar-toggle-icon-unfold" />
            </span>
          }
        />
      </Tooltip>
      <div className="topbar-title">
        <p className="topbar-title-main">Project Tracker</p>
        <p className="topbar-title-sub">An End-to-End Project Monitoring System</p>
      </div>
      <div className="topbar-actions">
        <AppVersionButton />
        <FeedbackChat />
        <NotificationCenter open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      </div>
    </header>
  );
}
