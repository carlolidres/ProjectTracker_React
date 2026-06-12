import { supabase } from "@/lib/supabaseClient";
import { daysBetween, getTodayManila, parseDateValue } from "@/lib/date";
import { generateId, isOpenFinalStatus, valueOrNA } from "@/lib/utils";
import { listActiveProjects } from "@/services/projectService";
import type { Notification } from "@/types";

export async function refreshAllNotifications(): Promise<void> {
  const rows = await listActiveProjects();
  const today = getTodayManila();

  await supabase.from("notifications").delete().neq("notification_id", "");

  const notifications: Omit<Notification, "created_at">[] = [];

  for (const row of rows) {
    const fgDate = parseDateValue(row.fg_month);
    if (!fgDate) continue;
    const days = daysBetween(today, fgDate);
    const isOpen = isOpenFinalStatus(row.final_status);
    if (!isOpen) continue;

    if (days < 0) {
      notifications.push({
        notification_id: generateId("NTF"),
        project_id: row.project_id,
        record_id: row.record_id,
        fg_month: row.fg_month,
        severity: "critical",
        title: "FG Month overdue",
        message: `FG Month target has passed for PO ${row.po_control_no}`,
        status: "OPEN",
      });
    } else if (days <= 7) {
      notifications.push({
        notification_id: generateId("NTF"),
        project_id: row.project_id,
        record_id: row.record_id,
        fg_month: row.fg_month,
        severity: "high",
        title: "FG Month due soon",
        message: `FG Month is within 7 days for PO ${row.po_control_no}`,
        status: "OPEN",
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
      });
    }
  }

  if (notifications.length) {
    const withTimestamps = notifications.map((n) => ({ ...n, created_at: new Date().toISOString() }));
    const { error } = await supabase.from("notifications").insert(withTimestamps);
    if (error) throw error;
  }
}

export async function listNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function getNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("status", "OPEN");
  if (error) throw error;
  return count ?? 0;
}
