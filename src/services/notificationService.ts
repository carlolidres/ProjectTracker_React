import { buildLogicViolationNotifications } from "@/lib/logicViolations";
import {
  applyNotificationRetention,
  buildStableNotificationId,
  isRetainedNotificationSeverity,
  NOTIFICATION_RETENTION_MS,
} from "@/lib/notificationRetention";
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

async function loadStoredNotificationTimestamps(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("notifications")
    .select("notification_id, created_at");
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.notification_id, row.created_at]));
}

function mergeNotificationTimestamps(
  notifications: Omit<Notification, "created_at">[],
  storedTimestamps: Map<string, string>,
): Notification[] {
  const now = new Date().toISOString();
  return notifications.map((notification) => ({
    ...notification,
    created_at: storedTimestamps.get(notification.notification_id) ?? now,
  }));
}

export async function refreshAllNotifications(): Promise<void> {
  const rows = await listActiveProjects();
  const notifications = buildAllNotifications(rows);
  const storedTimestamps = await loadStoredNotificationTimestamps();
  const now = new Date().toISOString();
  const currentIds = new Set(notifications.map((notification) => notification.notification_id));

  const staleIds = [...storedTimestamps.keys()].filter((notificationId) => !currentIds.has(notificationId));
  const expiredIds = notifications
    .filter((notification) => {
      if (isRetainedNotificationSeverity(notification.severity)) return false;
      const createdAt = storedTimestamps.get(notification.notification_id);
      if (!createdAt) return false;
      const createdMs = new Date(createdAt).getTime();
      return !Number.isNaN(createdMs) && Date.now() - createdMs >= NOTIFICATION_RETENTION_MS;
    })
    .map((notification) => notification.notification_id);

  const deleteIds = [...new Set([...staleIds, ...expiredIds])];
  if (deleteIds.length) {
    const { error } = await supabase.from("notifications").delete().in("notification_id", deleteIds);
    if (error) throw error;
  }

  const payload = notifications
    .filter((notification) => !expiredIds.includes(notification.notification_id))
    .map((notification) => ({
      ...notification,
      created_at: storedTimestamps.get(notification.notification_id) ?? now,
    }));

  if (!payload.length) return;

  const { error } = await supabase.from("notifications").upsert(payload, { onConflict: "notification_id" });
  if (error) throw error;
}

export async function listNotifications(): Promise<Notification[]> {
  const rows = await listActiveProjects();
  const notifications = buildAllNotifications(rows);
  let storedTimestamps = new Map<string, string>();
  try {
    storedTimestamps = await loadStoredNotificationTimestamps();
  } catch {
    // Listing still works when the notifications table is unavailable.
  }
  return applyNotificationRetention(mergeNotificationTimestamps(notifications, storedTimestamps));
}

export async function getNotificationCount(): Promise<number> {
  const notifications = await listNotifications();
  return notifications.length;
}
