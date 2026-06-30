import type { Notification } from "@/types";

export const NOTIFICATION_REFRESH_RETRY_MS = 400;

export type NotificationDbRow = {
  notification_id: string;
  project_id: string;
  record_id: string;
  fg_month: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  created_at: string;
  dismissed_at: string | null;
  resolved_at: string | null;
};

export function toNotificationDbRow(notification: Notification): NotificationDbRow {
  return {
    notification_id: notification.notification_id,
    project_id: notification.project_id,
    record_id: notification.record_id,
    fg_month: notification.fg_month,
    severity: notification.severity,
    title: notification.title,
    message: notification.message,
    status: notification.status,
    created_at: notification.created_at,
    dismissed_at: notification.dismissed_at ?? null,
    resolved_at: notification.resolved_at ?? null,
  };
}

export async function runWithRetry<T>(
  operation: () => Promise<T>,
  options?: { maxAttempts?: number; delayMs?: number },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 2;
  const delayMs = options?.delayMs ?? NOTIFICATION_REFRESH_RETRY_MS;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => {
          setTimeout(resolve, delayMs);
        });
      }
    }
  }
  throw lastError;
}

export const NOTIFICATION_DB_BATCH_SIZE = 100;

export function chunkValues<T>(values: T[], batchSize = NOTIFICATION_DB_BATCH_SIZE): T[][] {
  if (!values.length) return [];
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += batchSize) {
    chunks.push(values.slice(index, index + batchSize));
  }
  return chunks;
}
