import { getTodayManila } from "@/lib/date";
import {
  findExactCnfReferenceDuplicate,
  findProbableCnfDuplicates,
  type CnfTrackerHeaderFields,
} from "@/lib/cnfProjectIntegration";
import { getNextCnfTrackerId } from "@/lib/idGeneration";
import { normalizeCnfReference } from "@/lib/cnfTrackerAggregation";
import { supabase } from "@/lib/supabaseClient";
import { valueOrEmpty, valueOrNA } from "@/lib/utils";
import { logAuditDiff, logAuditEntries, logAuditTrail } from "@/services/auditService";
import { CnfDuplicateError, type CnfTrackerRecord, type CnfTrackerStatus } from "@/types/cnfTracker";

function mapRow(row: Record<string, unknown>): CnfTrackerRecord {
  const classification = String(row.cnf_classification ?? "process").trim().toLowerCase();
  return {
    record_id: String(row.record_id ?? ""),
    cnf_tracker_id: String(row.cnf_tracker_id ?? ""),
    cnf_reference: String(row.cnf_reference ?? ""),
    cnf_initiator: String(row.cnf_initiator ?? "N/A"),
    cnf_details: String(row.cnf_details ?? "N/A"),
    product_name: String(row.product_name ?? "N/A"),
    client_name: String(row.client_name ?? "N/A"),
    qrmr_no: String(row.qrmr_no ?? "N/A"),
    unique_batch_no: String(row.unique_batch_no ?? "N/A"),
    change_description: String(row.change_description ?? "N/A"),
    cnf_classification: classification === "non_process" ? "non_process" : "process",
    tracker_status: (String(row.tracker_status ?? "Open") as CnfTrackerStatus),
    closed_date: row.closed_date ? String(row.closed_date) : undefined,
    created_by: String(row.created_by ?? "N/A"),
    updated_by: String(row.updated_by ?? "N/A"),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    is_active: Boolean(row.is_active ?? true),
  };
}

function isUniqueViolation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return /duplicate|unique/i.test(String(error.message ?? ""));
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

export async function getCnfTrackerByRecordId(recordId: string): Promise<CnfTrackerRecord | null> {
  const { data, error } = await supabase
    .from("cnf_tracker_records")
    .select("*")
    .eq("record_id", recordId)
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

export async function findCnfTrackerByReference(
  reference: string,
  excludeTrackerId?: string,
): Promise<CnfTrackerRecord | null> {
  const records = await listActiveCnfTrackerRecords();
  return findExactCnfReferenceDuplicate(records, reference, excludeTrackerId);
}

export interface CnfTrackerSavePayload {
  cnf_tracker_id: string;
  cnf_reference: string;
  cnf_initiator?: string;
  cnf_details?: string;
  product_name?: string;
  client_name?: string;
  qrmr_no?: string;
  unique_batch_no?: string;
  change_description?: string;
  cnf_classification?: "process" | "non_process" | string;
  tracker_status: CnfTrackerStatus;
  /** When true, skip soft probable-duplicate check (caller already confirmed). */
  allowProbableDuplicate?: boolean;
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
  const reference = valueOrEmpty(payload.cnf_reference).trim().replace(/\s+/g, " ");

  const { data: existingData, error: fetchError } = await supabase
    .from("cnf_tracker_records")
    .select("*")
    .eq("cnf_tracker_id", trackerId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  const existing = existingData ? mapRow(existingData) : null;
  const active = await listActiveCnfTrackerRecords();

  const exact = findExactCnfReferenceDuplicate(active, reference, trackerId);
  if (exact) {
    await logAuditTrail({
      module: "CNF Tracker",
      action: "DUPLICATE_BLOCKED",
      recordId: String(exact.record_id ?? exact.cnf_tracker_id),
      projectId: exact.cnf_tracker_id,
      fieldName: "cnf_reference",
      oldValue: "",
      newValue: reference,
      remarks: `Duplicate CNF Reference blocked; existing ${exact.cnf_reference}`,
      userEmail,
    });
    throw new CnfDuplicateError(
      exact,
      "reference",
      `A CNF with reference "${exact.cnf_reference}" already exists.`,
    );
  }

  if (!payload.allowProbableDuplicate) {
    const header: CnfTrackerHeaderFields = {
      cnf_reference: reference,
      cnf_initiator: String(payload.cnf_initiator ?? ""),
      cnf_details: String(payload.cnf_details ?? ""),
      product_name: String(payload.product_name ?? ""),
      client_name: String(payload.client_name ?? ""),
      qrmr_no: String(payload.qrmr_no ?? ""),
      unique_batch_no: String(payload.unique_batch_no ?? ""),
      change_description: String(payload.change_description ?? ""),
    };
    const probable = findProbableCnfDuplicates(active, header, trackerId);
    if (probable.length > 0) {
      throw new CnfDuplicateError(
        probable[0],
        "probable",
        `A related CNF already exists (${probable[0].cnf_reference}).`,
      );
    }
  }

  const status = payload.tracker_status;
  const closedDate = status === "Closed" ? (existing?.closed_date ?? today) : null;
  const classification =
    String(payload.cnf_classification ?? existing?.cnf_classification ?? "process").trim().toLowerCase()
    === "non_process"
      ? "non_process"
      : "process";

  const row = {
    cnf_tracker_id: trackerId,
    cnf_reference: reference || "N/A",
    cnf_initiator: valueOrEmpty(payload.cnf_initiator) || "N/A",
    cnf_details: valueOrEmpty(payload.cnf_details) || "N/A",
    product_name: valueOrEmpty(payload.product_name) || "N/A",
    client_name: valueOrEmpty(payload.client_name) || "N/A",
    qrmr_no: valueOrEmpty(payload.qrmr_no) || "N/A",
    unique_batch_no: valueOrEmpty(payload.unique_batch_no) || "N/A",
    change_description: valueOrEmpty(payload.change_description) || "N/A",
    cnf_classification: classification,
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
    if (error) {
      if (isUniqueViolation(error)) {
        const dup = await findCnfTrackerByReference(reference, trackerId);
        if (dup) {
          throw new CnfDuplicateError(
            dup,
            "reference",
            `A CNF with reference "${dup.cnf_reference}" already exists.`,
          );
        }
      }
      throw error;
    }
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
  if (error) {
    if (isUniqueViolation(error)) {
      const dup = await findCnfTrackerByReference(reference, trackerId);
      if (dup) {
        throw new CnfDuplicateError(
          dup,
          "reference",
          `A CNF with reference "${dup.cnf_reference}" already exists.`,
        );
      }
    }
    throw error;
  }
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

export function matchesNormalizedReference(a: string, b: string): boolean {
  return normalizeCnfReference(a) === normalizeCnfReference(b);
}
