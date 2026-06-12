import { BellOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Badge, Button, Drawer, Empty, List, Space, Spin, Tag, Tooltip, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatAppDateTime } from "@/lib/date";
import { getNotificationCount, listNotifications, refreshAllNotifications } from "@/services/notificationService";
import type { Notification } from "@/types";

const severityColor: Record<string, string> = {
  critical: "red",
  high: "orange",
  medium: "gold",
  low: "green",
};

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationCenter({ open, onOpenChange }: Readonly<NotificationCenterProps>) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [items, count] = await Promise.all([listNotifications(), getNotificationCount()]);
      setNotifications(items);
      setUnreadCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function generateAndRefresh() {
    setIsGenerating(true);
    setError(null);
    try {
      await refreshAllNotifications();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh notifications");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <Tooltip title="Notifications">
        <Badge count={unreadCount} size="small">
          <Button type="text" icon={<BellOutlined />} aria-label="Open notifications" onClick={() => onOpenChange(true)} />
        </Badge>
      </Tooltip>

      <Drawer
        title="Notifications"
        placement="right"
        width={460}
        open={open}
        onClose={() => onOpenChange(false)}
        extra={
          <Button icon={<ReloadOutlined />} loading={isGenerating || isLoading} onClick={() => void generateAndRefresh()}>
            Refresh
          </Button>
        }
      >
        {error ? <Alert type="error" showIcon message="Notification action failed" description={error} style={{ marginBottom: 16 }} /> : null}
        {isLoading ? (
          <div className="notification-loading"><Spin aria-label="Loading notifications" /></div>
        ) : (
          <List
            dataSource={notifications}
            locale={{ emptyText: <Empty description="No notifications yet" /> }}
            renderItem={(notification) => (
              <List.Item
                actions={[
                  <Button key="view" type="link" onClick={() => navigate(`/projects?projectId=${notification.project_id}`)}>
                    View Project
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space size={6} wrap>
                      <Typography.Text strong>{notification.title}</Typography.Text>
                      <Tag color={severityColor[notification.severity] ?? "default"}>{notification.severity}</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4}>
                      <Typography.Text>{notification.message}</Typography.Text>
                      <Typography.Text type="secondary">Project: {notification.project_id}</Typography.Text>
                      <Typography.Text type="secondary">FG Month: {notification.fg_month}</Typography.Text>
                      <Typography.Text type="secondary">Created: {formatAppDateTime(notification.created_at)}</Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </>
  );
}
