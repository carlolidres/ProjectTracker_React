import { useState } from "react";
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

  return (
    <div className={cn("app-root", sidebar.state === "collapsed" && "sidebar-collapsed")}>
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
    </div>
  );
}
