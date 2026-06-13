import { collectSupportDateChanges } from "@/lib/dateAdjustmentReview";
import { rowMatchesDueWindow, supportTargetDays } from "@/lib/fgUrgency";
import { mapDbToSupport, mapSupportToDb } from "@/lib/mappers";
import { getNextSupportActivityId, getNextSupportProjectId } from "@/lib/idGeneration";
import { supabase } from "@/lib/supabaseClient";
import { valueOrEmpty, valueOrNA } from "@/lib/utils";
import { logAuditDiff, logAuditEntries } from "@/services/auditService";
import type { SupportActivity, SupportActivityFilters } from "@/types";

function mapRow(row: Record<string, unknown>): SupportActivity {
  return mapDbToSupport(row);
}

export async function listActiveSupportActivities(): Promise<SupportActivity[]> {
  const { data, error } = await supabase.from("support_activities").select("*").eq("is_active", true);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function listArchivedSupportActivities(): Promise<SupportActivity[]> {
  const { data, error } = await supabase.from("support_activities").select("*").eq("is_active", false);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export function filterSupportRows(rows: SupportActivity[], filters: SupportActivityFilters): SupportActivity[] {
  return rows.filter((row) => {
    const search = filters.search?.toLowerCase();
    if (search) {
      const blob = Object.values(row).join(" ").toLowerCase();
      if (!blob.includes(search)) return false;
    }
    if (filters.activity_kind && valueOrNA(row.activity_kind) !== filters.activity_kind) return false;
    if (filters.department && valueOrNA(row.Department) !== filters.department) return false;
    if (filters.due_window) {
      const days = supportTargetDays(row.Target_Date);
      if (!rowMatchesDueWindow(days, true, filters.due_window)) return false;
    }
    return true;
  });
}

export interface SupportSaveOptions {
  dateAdjustmentsConfirmed?: boolean;
}

export async function saveSupportActivity(
  payload: Partial<SupportActivity>,
  userEmail: string,
  options?: SupportSaveOptions,
) {
  const activityId = valueOrNA(payload.activity_id) === "N/A"
    ? getNextSupportActivityId()
    : String(payload.activity_id).trim();
  const now = new Date().toISOString();

  const { data: existingData } = await supabase
    .from("support_activities")
    .select("*")
    .eq("activity_id", activityId)
    .maybeSingle();

  const existing = existingData ? mapRow(existingData) : null;
  const requiredDateChanges = collectSupportDateChanges(
    (existing ?? {}) as Record<string, string | undefined>,
    payload as Record<string, string | undefined>,
    { projectId: existing?.project_id ?? payload.project_id, activityId: activityId },
  );
  if (requiredDateChanges.length && !options?.dateAdjustmentsConfirmed) {
    throw new Error("Date adjustments require a documented reason before saving.");
  }

  const supportProjectId = existing?.project_id ?? (await getNextSupportProjectId());

  const row = {
    activity_id: activityId,
    project_id: supportProjectId,
    activity_kind: valueOrEmpty(payload.activity_kind),
    Department: valueOrEmpty(payload.Department),
    Material: valueOrEmpty(payload.Material),
    Line: valueOrEmpty(payload.Line),
    Bulk: valueOrEmpty(payload.Bulk),
    Machinability_Protocol: valueOrEmpty(payload.Machinability_Protocol),
    Machinability_Protocol_Status: valueOrEmpty(payload.Machinability_Protocol_Status),
    Machinability_Report: valueOrEmpty(payload.Machinability_Report),
    Machinability_Report_Status: valueOrEmpty(payload.Machinability_Report_Status),
    Product_User: valueOrEmpty(payload.Product_User),
    Principal: valueOrEmpty(payload.Principal),
    Product: valueOrEmpty(payload.Product),
    Target_Date: valueOrEmpty(payload.Target_Date),
    Planning_Schedule: valueOrEmpty(payload.Planning_Schedule),
    created_by: existing?.created_by ?? userEmail,
    created_at: existing?.created_at ?? now,
    updated_by: userEmail,
    updated_at: now,
    is_active: true,
  };

  if (existing) {
    const { error } = await supabase.from("support_activities").update(mapSupportToDb(row)).eq("activity_id", activityId);
    if (error) throw error;
    await logAuditDiff("Support Activities", "UPDATE", activityId, supportProjectId, existing as unknown as Record<string, unknown>, row, userEmail);
  } else {
    const { error } = await supabase.from("support_activities").insert(mapSupportToDb(row));
    if (error) throw error;
    await logAuditEntries("Support Activities", "CREATE", activityId, supportProjectId, {}, row, "Support activity created", userEmail);
  }

  return { activity_id: activityId, project_id: supportProjectId, record: row };
}

export async function archiveSupportActivity(activityId: string, userEmail: string) {
  const { data, error: fetchError } = await supabase
    .from("support_activities")
    .select("*")
    .eq("activity_id", activityId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!data) throw new Error(`Support activity ${activityId} not found.`);

  const existing = mapRow(data);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("support_activities")
    .update({ is_active: false, updated_by: userEmail, updated_at: now })
    .eq("activity_id", activityId);
  if (error) throw error;
  await logAuditEntries("Support Activities", "DELETE", activityId, existing.project_id, existing as unknown as Record<string, unknown>, {}, "Support activity archived", userEmail);
}
