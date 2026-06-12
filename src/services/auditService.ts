import { supabase } from "@/lib/supabaseClient";
import { nowStamp } from "@/lib/date";
import { auditDisplayValue } from "@/lib/auditFormat";
import { sanitizeAuditValue } from "@/lib/utils";
import type { AuditFilters, AuditLog } from "@/types";

function summarizeAuditRow(row: Record<string, unknown>): string {
  const parts = Object.entries(row)
    .filter(([, value]) => sanitizeAuditValue(value) !== "")
    .slice(0, 6)
    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${auditDisplayValue(value)}`);
  return parts.join(". ");
}

export async function logAuditTrail(entry: {
  module: string;
  action: string;
  recordId: string;
  projectId: string;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  remarks: string;
  userEmail: string;
}) {
  const { error } = await supabase.from("audit_logs").insert({
    timestamp: nowStamp(),
    user_email: entry.userEmail,
    module: entry.module,
    action: entry.action,
    record_id: entry.recordId,
    project_id: entry.projectId,
    field_name: entry.fieldName,
    old_value: sanitizeAuditValue(entry.oldValue),
    new_value: sanitizeAuditValue(entry.newValue),
    remarks: entry.remarks,
  });
  if (error) throw error;
}

export async function logAuditDiff(
  module: string,
  action: string,
  recordId: string,
  projectId: string,
  oldRow: Record<string, unknown>,
  newRow: Record<string, unknown>,
  userEmail: string,
) {
  const skip = new Set(["updated_by", "updated_at"]);
  for (const field of Object.keys(newRow)) {
    if (skip.has(field)) continue;
    const oldVal = sanitizeAuditValue(oldRow[field]);
    const newVal = sanitizeAuditValue(newRow[field]);
    if (oldVal !== newVal) {
      await logAuditTrail({
        module,
        action,
        recordId,
        projectId,
        fieldName: field,
        oldValue: oldVal,
        newValue: newVal,
        remarks: "Field updated via Project Tracker",
        userEmail,
      });
    }
  }
}

export async function logAuditEntries(
  module: string,
  action: "CREATE" | "DELETE" | "UPDATE",
  recordId: string,
  projectId: string,
  oldRow: Record<string, unknown>,
  newRow: Record<string, unknown>,
  remarks: string,
  userEmail: string,
) {
  if (action === "CREATE" || action === "DELETE") {
    await logAuditTrail({
      module,
      action,
      recordId,
      projectId,
      fieldName: "ALL",
      oldValue: action === "DELETE" ? summarizeAuditRow(oldRow) : "",
      newValue: action === "CREATE" ? summarizeAuditRow(newRow) : "",
      remarks,
      userEmail,
    });
    return;
  }
  await logAuditDiff(module, action, recordId, projectId, oldRow, newRow, userEmail);
}

export async function listAuditLogs(filters: AuditFilters = {}): Promise<AuditLog[]> {
  let query = supabase.from("audit_logs").select("*").order("timestamp", { ascending: false });

  if (filters.module) query = query.eq("module", filters.module);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.user) query = query.ilike("user_email", `%${filters.user}%`);
  if (filters.project_id) query = query.ilike("project_id", `%${filters.project_id}%`);
  if (filters.startDate) query = query.gte("timestamp", filters.startDate);
  if (filters.endDate) query = query.lte("timestamp", filters.endDate);

  const { data, error } = await query.limit(500);
  if (error) throw error;

  let rows = (data ?? []) as AuditLog[];
  if (filters.search) {
    const search = filters.search.toLowerCase();
    rows = rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(search)),
    );
  }
  return rows;
}
