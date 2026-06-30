import { buildLogicViolationNotifications } from "@/lib/logicViolations";
import {
  buildStableNotificationId,
  filterActiveNotifications,
  filterDisplayedNotifications,
  isRetainedNotificationSeverity,
  NOTIFICATION_RETENTION_MS,
  shouldPersistNotificationOnRefresh,
} from "@/lib/notificationRetention";
import {
  deleteNotificationIds,
  removeExpiredStandardNotifications,
  upsertNotificationRows,
} from "@/lib/notificationDb";
import { runWithRetry, toNotificationDbRow } from "@/lib/notificationRefresh";
import { supabase } from "@/lib/supabaseClient";
import { fgSortValue, projectRowFgDays } from "@/lib/fgUrgency";
import { getFocusGroup } from "@/lib/projectPriority";
import { isOpenFinalStatus, valueOrNA } from "@/lib/utils";
import { listActiveProjects } from "@/services/projectService";
import type { Notification, ProjectRow } from "@/types";

const SEVERITY_ORDER: Record<string, number> = {
  logic: -1,
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

function urgencySeverity(days: number): { severity: string; title: string; message: string } | null {
  if (days < 0) {
    return {
      severity: "critical",
      title: "FG Delivery overdue",
      message: "FG Delivery date has passed for PO",
    };
  }
  if (days === 0) {
    return {
      severity: "critical",
      title: "FG Delivery due today",
      message: "FG Delivery is due today for PO",
    };
  }
  if (days <= 3) {
    return {
      severity: "high",
      title: "FG Delivery within 3 days",
      message: "FG Delivery is within 3 days for PO",
    };
  }
  if (days <= 7) {
    return {
      severity: "high",
      title: "FG Delivery within 7 days",
      message: "FG Delivery is within 7 days for PO",
    };
  }
  if (days <= 15) {
    return {
      severity: "medium",
      title: "FG Delivery within 15 days",
      message: "FG Delivery is within 15 days for PO",
    };
  }
  if (days <= 30) {
    return {
      severity: "medium",
      title: "FG Delivery within 30 days",
      message: "FG Delivery is within 30 days for PO",
    };
  }
  return {
    severity: "low",
    title: "FG Delivery more than 30 days away",
    message: "FG Delivery is more than 30 days away for PO",
  };
}

function sortNotifications(
  rows: Array<Omit<Notification, "created_at"> & { fgSort: number }>,
): Omit<Notification, "created_at">[] {
  return rows
    .sort((a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99)
      || a.fgSort - b.fgSort
      || String(a.project_id).localeCompare(String(b.project_id)),
    )
    .map(({ fgSort: _fgSort, ...notification }) => notification);
}

function buildNotificationsForRow(row: ProjectRow): Array<Omit<Notification, "created_at"> & { fgSort: number }> {
  const notifications: Array<Omit<Notification, "created_at"> & { fgSort: number }> = [];
  const isOpen = isOpenFinalStatus(row.final_status);
  if (!isOpen) return notifications;

  const days = projectRowFgDays(row);
  const fgSort = fgSortValue(row.fg_month);
  if (days === null) return notifications;

  const urgency = urgencySeverity(days);
  if (urgency) {
    notifications.push({
      notification_id: buildStableNotificationId(row.project_id, row.record_id, urgency.title),
      project_id: row.project_id,
      record_id: row.record_id,
      fg_month: row.fg_month,
      severity: urgency.severity,
      title: urgency.title,
      message: `${urgency.message} ${row.po_control_no}`,
      status: "OPEN",
      fgSort,
    });
  }

  if (valueOrNA(row.cnf_status) !== "Approved" && days <= 14) {
    const title = "CNF approval pending";
    notifications.push({
      notification_id: buildStableNotificationId(row.project_id, row.record_id, title),
      project_id: row.project_id,
      record_id: row.record_id,
      fg_month: row.fg_month,
      severity: "medium",
      title,
      message: `CNF status is not Approved for PO ${row.po_control_no}`,
      status: "OPEN",
      fgSort,
    });
  }

  const focusGroup = getFocusGroup(row);
  if (focusGroup !== "None") {
    const title = `${focusGroup} action required`;
    notifications.push({
      notification_id: buildStableNotificationId(row.project_id, row.record_id, title),
      project_id: row.project_id,
      record_id: row.record_id,
      fg_month: row.fg_month,
      severity: days < 0 ? "critical" : days <= 7 ? "high" : "medium",
      title,
      message: `Missing or N/A fields need attention for PO ${row.po_control_no}`,
      status: "OPEN",
      fgSort,
    });
  }

  return notifications;
}

function buildAllNotifications(rows: ProjectRow[]) {
  const logic = buildLogicViolationNotifications(rows);
  const urgency = rows.flatMap(buildNotificationsForRow);
  return sortNotifications([
    ...logic.map((n) => ({ ...n, fgSort: -1 })),
    ...urgency,
  ]);
}

async function loadStoredNotificationState(): Promise<
  Map<string, { created_at: string; status: string; dismissed_at?: string | null; resolved_at?: string | null }>
> {
  const { data, error } = await supabase
    .from("notifications")
    .select("notification_id, created_at, status, dismissed_at, resolved_at");
  if (error) throw error;
  return new Map(
    (data ?? []).map((row) => [
      row.notification_id,
      {
        created_at: row.created_at,
        status: row.status,
        dismissed_at: row.dismissed_at,
        resolved_at: row.resolved_at,
      },
    ]),
  );
}

function mergeNotificationState(
  notifications: Omit<Notification, "created_at">[],
  stored: Map<string, { created_at: string; status: string; dismissed_at?: string | null; resolved_at?: string | null }>,
): Notification[] {
  const now = new Date().toISOString();
  return notifications.map((notification) => {
    const existing = stored.get(notification.notification_id);
    return {
      ...notification,
      created_at: existing?.created_at ?? now,
      status: existing?.status ?? notification.status ?? "OPEN",
      dismissed_at: existing?.dismissed_at ?? null,
      resolved_at: existing?.resolved_at ?? null,
    };
  });
}

async function purgeExpiredStandardNotifications(): Promise<void> {
  const { error } = await supabase.rpc("purge_expired_standard_notifications");
  if (error) {
    // Best-effort: RPC may be missing or session may not satisfy is_active_user().
    return;
  }
}

export async function refreshAllNotifications(): Promise<void> {
  await purgeExpiredStandardNotifications();
  await removeExpiredStandardNotifications();

  const rows = await listActiveProjects();
  const notifications = buildAllNotifications(rows);
  const storedState = await loadStoredNotificationState();
  const now = new Date().toISOString();
  const currentIds = new Set(notifications.map((notification) => notification.notification_id));

  const staleIds = [...storedState.keys()].filter((notificationId) => !currentIds.has(notificationId));
  if (staleIds.length) {
    await deleteNotificationIds(staleIds);
  }

  const payload = notifications.map((notification) => {
    const existing = storedState.get(notification.notification_id);
    const createdAt = existing?.created_at ?? now;
    const isExpiredStandard =
      existing?.status === "OPEN"
      && !isRetainedNotificationSeverity(notification.severity)
      && Date.now() - new Date(createdAt).getTime() >= NOTIFICATION_RETENTION_MS;

    return {
      ...notification,
      created_at: createdAt,
      status: isExpiredStandard ? "EXPIRED" : existing?.status ?? "OPEN",
      dismissed_at: existing?.dismissed_at ?? null,
      resolved_at: existing?.resolved_at ?? null,
    };
  }).filter((notification) =>
    shouldPersistNotificationOnRefresh(notification, storedState, notification.notification_id),
  );

  if (payload.length) {
    await upsertNotificationRows(payload.map(toNotificationDbRow));
  }

  await removeExpiredStandardNotifications();
}

export async function refreshAllNotificationsWithRetry(maxAttempts = 2): Promise<void> {
  await runWithRetry(() => refreshAllNotifications(), { maxAttempts });
}

export async function dismissNotification(notificationId: string, userEmail: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({
      status: "DISMISSED",
      dismissed_at: now,
      dismissed_by: userEmail,
    })
    .eq("notification_id", notificationId);
  if (error) throw error;
}

export async function resolveNotification(notificationId: string, userEmail: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({
      status: "RESOLVED",
      resolved_at: now,
      resolved_by: userEmail,
    })
    .eq("notification_id", notificationId);
  if (error) throw error;
}

export async function listNotifications(): Promise<Notification[]> {
  await purgeExpiredStandardNotifications();
  await removeExpiredStandardNotifications().catch(() => undefined);

  const rows = await listActiveProjects();
  const notifications = buildAllNotifications(rows);
  let storedState = new Map<string, { created_at: string; status: string; dismissed_at?: string | null; resolved_at?: string | null }>();
  try {
    storedState = await loadStoredNotificationState();
  } catch {
    // Listing still works when the notifications table is unavailable.
  }
  return filterDisplayedNotifications(
    filterActiveNotifications(mergeNotificationState(notifications, storedState)),
  );
}

export async function getNotificationCount(): Promise<number> {
  const notifications = await listNotifications();
  return notifications.length;
}
