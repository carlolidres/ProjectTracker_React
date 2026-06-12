import { CloseOutlined, DashboardOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";

interface MeetingViewBarProps {
  onExit: () => void;
  onBack: () => void;
}

export function MeetingViewBar({ onExit, onBack }: MeetingViewBarProps) {
  return (
    <div className="meeting-view-mode-bar" role="status" aria-live="polite">
      <span className="meeting-view-mode-bar-label">
        <EyeOutlined aria-hidden />
        Meeting View — read-only browsing
      </span>
      <div className="meeting-view-mode-bar-actions">
        <Tooltip title="Back to Meeting Dashboard">
          <Button
            size="small"
            type="default"
            icon={<DashboardOutlined />}
            aria-label="Back to Meeting Dashboard"
            onClick={onBack}
          />
        </Tooltip>
        <Button size="small" icon={<CloseOutlined />} onClick={onExit}>
          Exit Meeting View
        </Button>
      </div>
    </div>
  );
}
