import { getTodayManila } from "@/lib/date";
import { getNextCnfTrackerId } from "@/lib/idGeneration";
import { supabase } from "@/lib/supabaseClient";
import { valueOrEmpty, valueOrNA } from "@/lib/utils";
import { logAuditDiff, logAuditEntries } from "@/services/auditService";
import type { CnfTrackerRecord, CnfTrackerStatus } from "@/types/cnfTracker";

function mapRow(row: Record<string, unknown>): CnfTrackerRecord {
  return {
    record_id: String(row.record_id ?? ""),
    cnf_tracker_id: String(row.cnf_tracker_id ?? ""),
    cnf_reference: String(row.cnf_reference ?? ""),
    cnf_initiator: String(row.cnf_initiator ?? "N/A"),
    tracker_status: (String(row.tracker_status ?? "Open") as CnfTrackerStatus),
    closed_date: row.closed_date ? String(row.closed_date) : undefined,
    created_by: String(row.created_by ?? "N/A"),
    updated_by: String(row.updated_by ?? "N/A"),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    is_active: Boolean(row.is_active ?? true),
  };
}

export async function getCnfTrackerById(cnfTrackerId: string): Promise<CnfTrackerRecord | null> {
  const { data, error } = await supabase
    .from("cnf_tracker_records")
    .select("*")
    .eq("cnf_tracker_id", cnfTrackerId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function listActiveCnfTrackerRecords(): Promise<CnfTrackerRecord[]> {
  const { data, error } = await supabase
    .from("cnf_tracker_records")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export interface CnfTrackerSavePayload {
  cnf_tracker_id: string;
  cnf_reference: string;
  cnf_initiator?: string;
  tracker_status: CnfTrackerStatus;
}

export async function saveCnfTrackerRecord(
  payload: CnfTrackerSavePayload,
  userEmail: string,
): Promise<CnfTrackerRecord> {
  const trackerId = valueOrNA(payload.cnf_tracker_id) === "N/A"
    ? await getNextCnfTrackerId()
    : String(payload.cnf_tracker_id).trim();
  const now = new Date().toISOString();
  const today = getTodayManila().format("YYYY-MM-DD");

  const { data: existingData, error: fetchError } = await supabase
    .from("cnf_tracker_records")
    .select("*")
    .eq("cnf_tracker_id", trackerId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  const existing = existingData ? mapRow(existingData) : null;
  const status = payload.tracker_status;
  const closedDate = status === "Closed" ? (existing?.closed_date ?? today) : null;

  const row = {
    cnf_tracker_id: trackerId,
    cnf_reference: valueOrEmpty(payload.cnf_reference),
    cnf_initiator: valueOrEmpty(payload.cnf_initiator) || "N/A",
    tracker_status: status,
    closed_date: closedDate,
    created_by: existing?.created_by ?? userEmail,
    created_at: existing?.created_at ?? now,
    updated_by: userEmail,
    updated_at: now,
    is_active: true,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("cnf_tracker_records")
      .update(row)
      .eq("cnf_tracker_id", trackerId)
      .select("*")
      .single();
    if (error) throw error;
    await logAuditDiff(
      "CNF Tracker",
      "UPDATE",
      String(existing.record_id ?? trackerId),
      trackerId,
      existing as unknown as Record<string, unknown>,
      row,
      userEmail,
    );
    return mapRow(data);
  }

  const { data, error } = await supabase
    .from("cnf_tracker_records")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  await logAuditEntries(
    "CNF Tracker",
    "CREATE",
    String(data.record_id),
    trackerId,
    {},
    row,
    "CNF tracker record created",
    userEmail,
  );
  return mapRow(data);
}
