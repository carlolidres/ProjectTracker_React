import { BellOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Badge, Button, Drawer, Empty, List, Space, Spin, Tag, Tooltip, Typography } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatAppDateTime, formatAppMonth } from "@/lib/date";
import {
  LOGIC_VIOLATION_EVENT,
  vibrateNotificationAlert,
  type LogicViolationEventDetail,
} from "@/lib/logicViolationEvents";
import {
  countCriticalLogicViolations,
  isCriticalLogicViolation,
  isInfoLogicViolation,
} from "@/lib/logicViolations";
import { getNotificationCount, listNotifications, refreshAllNotifications } from "@/services/notificationService";
import type { Notification } from "@/types";

const severityColor: Record<string, string> = {
  logic: "magenta",
  info: "blue",
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
  const previousCriticalCountRef = useRef(0);

  const triggerLogicAlert = useCallback(() => {
    vibrateNotificationAlert();
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [items, count] = await Promise.all([listNotifications(), getNotificationCount()]);
      const criticalCount = countCriticalLogicViolations(items);
      if (criticalCount > previousCriticalCountRef.current) {
        triggerLogicAlert();
      }
      previousCriticalCountRef.current = criticalCount;
      setNotifications(items);
      setUnreadCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [triggerLogicAlert]);

  useEffect(() => {
    void refresh();
    const intervalId = window.setInterval(() => {
      void refresh();
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [refresh]);

  useEffect(() => {
    function handleLogicViolation(event: Event) {
      const detail = (event as CustomEvent<LogicViolationEventDetail>).detail;
      if (detail?.message) {
        triggerLogicAlert();
        void refresh();
      }
    }
    window.addEventListener(LOGIC_VIOLATION_EVENT, handleLogicViolation);
    return () => window.removeEventListener(LOGIC_VIOLATION_EVENT, handleLogicViolation);
  }, [refresh, triggerLogicAlert]);

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

  const criticalLogicCount = countCriticalLogicViolations(notifications);
  const hasCriticalLogicViolations = criticalLogicCount > 0;

  return (
    <>
      <Tooltip title={hasCriticalLogicViolations ? "Critical logic violations — open notifications" : "Notifications"}>
        <span className={hasCriticalLogicViolations ? "notification-bell-alert" : undefined}>
          <Badge
            count={unreadCount}
            size="small"
            offset={hasCriticalLogicViolations ? [2, 2] : undefined}
          >
            <Button
              type="text"
              icon={<BellOutlined />}
              aria-label={hasCriticalLogicViolations ? "Open notifications — critical logic violations detected" : "Open notifications"}
              onClick={() => onOpenChange(true)}
            />
          </Badge>
        </span>
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
        {hasCriticalLogicViolations ? (
          <Alert
            type="error"
            showIcon
            message={`${criticalLogicCount} critical logic violation${criticalLogicCount === 1 ? "" : "s"} detected`}
            description="Duplicate SO No. or PO Control No. must be resolved."
            style={{ marginBottom: 16 }}
          />
        ) : null}
        {error ? <Alert type="error" showIcon message="Notification action failed" description={error} style={{ marginBottom: 16 }} /> : null}
        {isLoading ? (
          <div className="notification-loading"><Spin aria-label="Loading notifications" /></div>
        ) : (
          <List
            dataSource={notifications}
            locale={{ emptyText: <Empty description="No notifications yet" /> }}
            renderItem={(notification) => (
              <List.Item
                className={
                  isCriticalLogicViolation(notification)
                    ? "notification-list-item-logic-critical"
                    : isInfoLogicViolation(notification)
                      ? "notification-list-item-logic-info"
                      : undefined
                }
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
                      <Typography.Text type="secondary">FG Month: {formatAppMonth(notification.fg_month)}</Typography.Text>
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
