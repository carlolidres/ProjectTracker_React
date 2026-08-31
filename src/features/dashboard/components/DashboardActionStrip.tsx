import {
  FileAddOutlined,
  FolderAddOutlined,
  FormOutlined,
  ToolOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Button, Space, Typography } from "antd";
import { useMeetingViewReadOnly } from "@/app/meeting-view-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { useAuth } from "@/app/auth-provider";
import { dashboardDoNextHint } from "@/lib/dashboardPmHub";
import { canEditCnfTracker } from "@/lib/roleAccess";

export interface DashboardActionStripProps {
  sandboxMode?: boolean;
  hubEnabled?: boolean;
  onNewProject: () => void;
  onBrowseOverdue: () => void;
  onNewSupport: () => void;
  onNewCnf: () => void;
  onOpenWorklist: () => void;
  onNewTask?: () => void;
  onBrowsePendingProtocol?: () => void;
}

export function DashboardActionStrip({
  sandboxMode,
  hubEnabled,
  onNewProject,
  onBrowseOverdue,
  onNewSupport,
  onNewCnf,
  onOpenWorklist,
  onNewTask,
  onBrowsePendingProtocol,
}: DashboardActionStripProps) {
  const { profile } = useAuth();
  const { can } = useMenuPermissions();
  const meetingViewReadOnly = useMeetingViewReadOnly();
  const disabled = Boolean(sandboxMode || meetingViewReadOnly);

  const canCreateProject = can("projects_entry", "create") && !disabled;
  const canCreateSupport = can("support_activities", "create") && !disabled;
  const canCreateCnf =
    can("cnf_tracker", "create") && canEditCnfTracker(profile?.role) && !disabled;
  const canCreateTask = Boolean(hubEnabled) && can("project_management", "create") && !disabled;
  const showPendingProtocol = Boolean(hubEnabled) && profile?.role === "val" && !sandboxMode;
  const roleHint = hubEnabled
    ? dashboardDoNextHint(profile?.role)
    : "Create records or open your work. Use Browse cards above for filtered lists.";

  return (
    <div className="dashboard-action-strip" style={{ marginBottom: 16 }}>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
        Do next
      </Typography.Text>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
        {roleHint}
      </Typography.Text>
      <Space wrap size={[8, 8]}>
        {canCreateTask && onNewTask ? (
          <Button type="primary" icon={<FormOutlined />} onClick={onNewTask}>
            New task
          </Button>
        ) : null}
        {canCreateProject ? (
          <Button type={canCreateTask ? "default" : "primary"} icon={<FolderAddOutlined />} onClick={onNewProject}>
            New Project
          </Button>
        ) : null}
        <Button icon={<WarningOutlined />} onClick={onBrowseOverdue} disabled={Boolean(sandboxMode)}>
          {hubEnabled ? "Browse overdue" : "Browse Overdue"}
        </Button>
        {showPendingProtocol && onBrowsePendingProtocol ? (
          <Button onClick={onBrowsePendingProtocol}>Pending protocol</Button>
        ) : null}
        <Button onClick={onOpenWorklist} disabled={Boolean(sandboxMode)}>
          {hubEnabled ? "My work" : "My Worklist"}
        </Button>
        {canCreateSupport ? (
          <Button icon={<ToolOutlined />} onClick={onNewSupport}>
            New Support
          </Button>
        ) : null}
        {canCreateCnf ? (
          <Button icon={<FileAddOutlined />} onClick={onNewCnf}>
            New CNF
          </Button>
        ) : null}
      </Space>
    </div>
  );
}
