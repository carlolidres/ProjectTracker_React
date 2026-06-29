import type { Notification } from "@/types";

const RETAINED_NOTIFICATION_SEVERITIES = new Set(["logic", "critical", "high"]);
const NOTIFICATION_RETENTION_MS = 24 * 60 * 60 * 1000;
export const ACTIVE_NOTIFICATION_STATUSES = new Set(["OPEN"]);

export function buildStableNotificationId(projectId: string, recordId: string, title: string): string {
  const slug = title.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 48);
  return `NTF-${projectId}-${recordId}-${slug || "alert"}`;
}

export function isRetainedNotificationSeverity(severity: string): boolean {
  return RETAINED_NOTIFICATION_SEVERITIES.has(severity.toLowerCase());
}

export function isActiveNotificationStatus(status: string): boolean {
  return ACTIVE_NOTIFICATION_STATUSES.has(String(status ?? "OPEN").toUpperCase());
}

export function applyNotificationRetention(
  notifications: Notification[],
  now = Date.now(),
): Notification[] {
  return notifications.filter((notification) => {
    if (isRetainedNotificationSeverity(notification.severity)) return true;
    const createdAt = new Date(notification.created_at).getTime();
    if (Number.isNaN(createdAt)) return true;
    return now - createdAt < NOTIFICATION_RETENTION_MS;
  });
}

export function filterActiveNotifications(
  notifications: Notification[],
  now = Date.now(),
): Notification[] {
  return applyNotificationRetention(
    notifications.filter((notification) => isActiveNotificationStatus(notification.status)),
    now,
  );
}

export { NOTIFICATION_RETENTION_MS };
