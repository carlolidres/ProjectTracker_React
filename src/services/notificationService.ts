import { supabase } from "@/lib/supabaseClient";
import { fgSortValue, projectRowFgDays } from "@/lib/fgUrgency";
import { getFocusGroup } from "@/lib/projectPriority";
import { generateId, isOpenFinalStatus, valueOrNA } from "@/lib/utils";
import { listActiveProjects } from "@/services/projectService";
import type { Notification, ProjectRow } from "@/types";

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
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
      notification_id: generateId("NTF"),
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
    notifications.push({
      notification_id: generateId("NTF"),
      project_id: row.project_id,
      record_id: row.record_id,
      fg_month: row.fg_month,
      severity: "medium",
      title: "CNF approval pending",
      message: `CNF status is not Approved for PO ${row.po_control_no}`,
      status: "OPEN",
      fgSort,
    });
  }

  const focusGroup = getFocusGroup(row);
  if (focusGroup !== "None") {
    notifications.push({
      notification_id: generateId("NTF"),
      project_id: row.project_id,
      record_id: row.record_id,
      fg_month: row.fg_month,
      severity: days < 0 ? "critical" : days <= 7 ? "high" : "medium",
      title: `${focusGroup} action required`,
      message: `Missing or N/A fields need attention for PO ${row.po_control_no}`,
      status: "OPEN",
      fgSort,
    });
  }

  return notifications;
}

export async function refreshAllNotifications(): Promise<void> {
  const rows = await listActiveProjects();
  await supabase.from("notifications").delete().neq("notification_id", "");

  const notifications = sortNotifications(rows.flatMap(buildNotificationsForRow));

  if (notifications.length) {
    const withTimestamps = notifications.map((n) => ({ ...n, created_at: new Date().toISOString() }));
    const { error } = await supabase.from("notifications").insert(withTimestamps);
    if (error) throw error;
  }
}

export async function listNotifications(): Promise<Notification[]> {
  const rows = await listActiveProjects();
  const notifications = sortNotifications(rows.flatMap(buildNotificationsForRow));
  return notifications.map((n, index) => ({
    ...n,
    created_at: new Date(Date.now() - index * 1000).toISOString(),
  }));
}

export async function getNotificationCount(): Promise<number> {
  const rows = await listActiveProjects();
  return rows.flatMap(buildNotificationsForRow).length;
}
