import { BellOutlined, EyeInvisibleOutlined, EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Badge, Button, Drawer, Empty, List, Popconfirm, Space, Spin, Tag, Tooltip, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  generateDueDateNotificationsForCurrentUser,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  markNotificationAsUnread,
  sortNotifications,
} from "@/lib/notifications";
import { formatAppDate, formatAppDateTime } from "@/lib/date";
import type { Notification, NotificationCriticality } from "@/types";

const criticalityColor: Record<NotificationCriticality, string> = {
  overdue: "red",
  critical: "volcano",
  high: "orange",
  medium: "gold",
  low: "green",
};

function formatDate(value?: string | null) {
  return formatAppDate(value);
}

function formatDateTime(value?: string | null) {
  return formatAppDateTime(value);
}

function formatDays(notification: Notification) {
  if (notification.days_overdue != null) return `${notification.days_overdue} overdue`;
  if (notification.days_remaining != null) {
    if (notification.days_remaining === 0) return "Due today";
    return `${notification.days_remaining} remaining`;
  }

  return "-";
}

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sampleMode?: boolean;
}

const sampleNotifications = [
  "SAMPLE-CNF-004 is overdue and assigned to VAL.",
  "SAMPLE-CNF-001 is due today.",
  "SAMPLE-CNF-002 is due within 3 days.",
  "SAMPLE-CNF-003 requires TSD follow-up.",
  "SAMPLE-CNF-005 is approaching its manufacturing target.",
];

export function NotificationCenter({ open, onOpenChange, sampleMode = false }: Readonly<NotificationCenterProps>) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [notificationResult, countResult] = await Promise.all([listNotifications(), getUnreadNotificationCount()]);
    setIsLoading(false);

    if (notificationResult.error) {
      setError(notificationResult.error.message);
      return;
    }

    if (countResult.error) {
      setError(countResult.error.message);
      return;
    }

    setNotifications(sortNotifications(notificationResult.data ?? []));
    setUnreadCount(countResult.count ?? 0);
  }, []);

  useEffect(() => {
    if (!sampleMode) void refresh();
  }, [refresh, sampleMode]);

  async function generateAndRefresh() {
    setIsGenerating(true);
    const result = await generateDueDateNotificationsForCurrentUser();
    setIsGenerating(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    await refresh();
  }

  async function toggleRead(notification: Notification) {
    const result =
      notification.notification_status === "unread"
        ? await markNotificationAsRead(notification.id)
        : await markNotificationAsUnread(notification.id);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    await refresh();
  }

  async function markAllRead() {
    const result = await markAllNotificationsAsRead();

    if (result.error) {
      setError(result.error.message);
      return;
    }

    await refresh();
  }

  return (
    <>
      <Tooltip title="Notifications">
        <Badge count={sampleMode ? sampleNotifications.length : unreadCount} size="small">
          <Button type="text" icon={<BellOutlined />} aria-label="Open notifications" onClick={() => onOpenChange(true)} />
        </Badge>
      </Tooltip>

      <Drawer
        title="Notifications"
        placement="right"
        width={460}
        open={open}
        onClose={() => onOpenChange(false)}
        extra={sampleMode ? (
          <Tag color="blue">Sample Mode</Tag>
        ) : (
          <Space>
            <Button icon={<ReloadOutlined />} loading={isGenerating || isLoading} onClick={() => void generateAndRefresh()}>
              Refresh
            </Button>
            <Popconfirm title="Mark all notifications as read?" onConfirm={() => void markAllRead()}>
              <Button disabled={unreadCount === 0}>Mark all read</Button>
            </Popconfirm>
          </Space>
        )}
      >
        {sampleMode ? (
          <>
            <Alert
              type="info"
              showIcon
              message="Demonstration notifications"
              description="These notifications exist only in Dashboard Sample Mode and are not stored in Supabase."
              style={{ marginBottom: 16 }}
            />
            <List
              dataSource={sampleNotifications}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta title="Sample CNF notification" description={item} />
                </List.Item>
              )}
            />
          </>
        ) : (
          <>
        {error ? <Alert type="error" showIcon message="Notification action failed" description={error} style={{ marginBottom: 16 }} /> : null}

        {isLoading ? (
          <div className="notification-loading">
            <Spin aria-label="Loading notifications" />
          </div>
        ) : (
          <List
            dataSource={notifications}
            locale={{ emptyText: <Empty description="No notifications yet" /> }}
            renderItem={(notification) => (
              <List.Item
                actions={[
                  <Button key="view" type="link" onClick={() => notification.cnf_record_id && navigate(`/cnf/${notification.cnf_record_id}`)}>
                    View CNF
                  </Button>,
                  <Button
                    key="read"
                    type="text"
                    icon={notification.notification_status === "unread" ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    onClick={() => void toggleRead(notification)}
                  >
                    {notification.notification_status === "unread" ? "Read" : "Unread"}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space size={6} wrap>
                      <Typography.Text strong>{notification.cnf_reference ?? "CNF"}</Typography.Text>
                      <Tag color={criticalityColor[notification.criticality]}>{notification.criticality}</Tag>
                      <Tag>{notification.notification_status}</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4}>
                      <Typography.Text>{notification.title}</Typography.Text>
                      <Typography.Text type="secondary">{notification.message}</Typography.Text>
                      <Typography.Text type="secondary">Product: {notification.product ?? "-"}</Typography.Text>
                      <Typography.Text type="secondary">Responsible Department: {notification.responsible_department ?? "-"}</Typography.Text>
                      <Typography.Text type="secondary">Target Field: {notification.target_field ?? "-"}</Typography.Text>
                      <Typography.Text type="secondary">Due Date / Target Date: {formatDate(notification.due_date)}</Typography.Text>
                      <Typography.Text type="secondary">Days Remaining / Overdue Days: {formatDays(notification)}</Typography.Text>
                      <Typography.Text type="secondary">Created: {formatDateTime(notification.created_at)}</Typography.Text>
                      {notification.read_at ? <Typography.Text type="secondary">Read: {formatDateTime(notification.read_at)}</Typography.Text> : null}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
          </>
        )}
      </Drawer>
    </>
  );
}
