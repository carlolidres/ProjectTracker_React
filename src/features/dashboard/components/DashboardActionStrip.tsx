import {
  FileAddOutlined,
  FolderAddOutlined,
  ToolOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Button, Space, Typography } from "antd";
import { useMeetingViewReadOnly } from "@/app/meeting-view-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { useAuth } from "@/app/auth-provider";
import { canEditCnfTracker } from "@/lib/roleAccess";

export interface DashboardActionStripProps {
  sandboxMode?: boolean;
  onNewProject: () => void;
  onBrowseOverdue: () => void;
  onNewSupport: () => void;
  onNewCnf: () => void;
  onOpenWorklist: () => void;
}

export function DashboardActionStrip({
  sandboxMode,
  onNewProject,
  onBrowseOverdue,
  onNewSupport,
  onNewCnf,
  onOpenWorklist,
}: DashboardActionStripProps) {
  const { profile } = useAuth();
  const { can } = useMenuPermissions();
  const meetingViewReadOnly = useMeetingViewReadOnly();
  const disabled = Boolean(sandboxMode || meetingViewReadOnly);

  const canCreateProject = can("projects_entry", "create") && !disabled;
  const canCreateSupport = can("support_activities", "create") && !disabled;
  const canCreateCnf =
    can("cnf_tracker", "create") && canEditCnfTracker(profile?.role) && !disabled;

  return (
    <div className="dashboard-action-strip" style={{ marginBottom: 16 }}>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
        Do next
      </Typography.Text>
      <Space wrap size={[8, 8]}>
        {canCreateProject ? (
          <Button type="primary" icon={<FolderAddOutlined />} onClick={onNewProject}>
            New Project
          </Button>
        ) : null}
        <Button icon={<WarningOutlined />} onClick={onBrowseOverdue} disabled={Boolean(sandboxMode)}>
          Browse Overdue
        </Button>
        <Button onClick={onOpenWorklist} disabled={Boolean(sandboxMode)}>
          My Worklist
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
