import {
  mapDbToEndorsement,
  mapDbToEndorsementItem,
  mapEndorsementItemToDb,
  renumberEndorsementItems,
} from "@/lib/endorsementMappers";
import {
  buildEndorsementPayloadFromProject,
  buildEndorsementPayloadFromSupport,
  pickSyncMappedFields,
  shouldOpenEndorsementTrackerFromProjectStatus,
  shouldOpenEndorsementTrackerFromSupportStatus,
  shouldSkipEchoSync,
  type EndorsementSourceType,
} from "@/lib/endorsementSync";
import { getNextEndorsementTrackerId } from "@/lib/idGeneration";
import { normalizeOptionalNaForSubmit } from "@/lib/naField";
import { supabase } from "@/lib/supabaseClient";
import { formatServiceError, valueOrEmpty, valueOrNA } from "@/lib/utils";
import { logAuditDiff, logAuditEntries } from "@/services/auditService";
import type {
  EndorsementTrackerFilters,
  EndorsementTrackerItem,
  EndorsementTrackerRecord,
} from "@/types/endorsementTracker";

function mapRow(row: Record<string, unknown>): EndorsementTrackerRecord {
  return mapDbToEndorsement(row);
}

function mapItem(row: Record<string, unknown>): EndorsementTrackerItem {
  return mapDbToEndorsementItem(row);
}

export async function listActiveEndorsements(): Promise<EndorsementTrackerRecord[]> {
  const { data, error } = await supabase
    .from("endorsement_tracker_records")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function getEndorsementByTrackerId(
  trackerId: string,
): Promise<EndorsementTrackerRecord | null> {
  const { data, error } = await supabase
    .from("endorsement_tracker_records")
    .select("*")
    .eq("endorsement_tracker_id", trackerId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function getEndorsementByRecordId(
  recordId: string,
): Promise<EndorsementTrackerRecord | null> {
  const { data, error } = await supabase
    .from("endorsement_tracker_records")
    .select("*")
    .eq("record_id", recordId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export interface EnsureEndorsementResult {
  created: boolean;
  record_id: string;
  endorsement_tracker_id: string;
  sync_version: number;
}

export async function getEndorsementBySource(
  sourceType: EndorsementSourceType,
  sourceRecordId: string,
): Promise<EndorsementTrackerRecord | null> {
  const id = valueOrEmpty(sourceRecordId);
  if (!id) return null;
  const { data, error } = await supabase
    .from("endorsement_tracker_records")
    .select("*")
    .eq("is_active", true)
    .eq("source_type", sourceType)
    .eq("source_record_id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function getEndorsementByNumber(
  endorsementNumber: string,
): Promise<EndorsementTrackerRecord | null> {
  const number = valueOrEmpty(endorsementNumber);
  if (!number || number.toUpperCase() === "N/A") return null;
  const { data, error } = await supabase
    .from("endorsement_tracker_records")
    .select("*")
    .eq("is_active", true)
    .ilike("endorsement_number", number)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function getEndorsementByProjectId(
  projectId: string,
): Promise<EndorsementTrackerRecord | null> {
  const id = valueOrEmpty(projectId);
  if (!id || id.toUpperCase() === "N/A") return null;
  const { data, error } = await supabase
    .from("endorsement_tracker_records")
    .select("*")
    .eq("is_active", true)
    .eq("project_id", id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
}

function toEnsureResult(record: EndorsementTrackerRecord): EnsureEndorsementResult {
  return {
    created: false,
    record_id: record.record_id,
    endorsement_tracker_id: record.endorsement_tracker_id,
    sync_version: record.sync_version,
  };
}

export function filterEndorsementRows(
  rows: EndorsementTrackerRecord[],
  filters: EndorsementTrackerFilters,
): EndorsementTrackerRecord[] {
  return rows.filter((row) => {
    const search = filters.search?.toLowerCase();
    if (search) {
      const blob = Object.values(row).join(" ").toLowerCase();
      if (!blob.includes(search)) return false;
    }
    if (filters.endorsement_status && valueOrNA(row.endorsement_status) !== filters.endorsement_status) {
      return false;
    }
    if (
      filters.process_classification
      && valueOrNA(row.process_classification) !== filters.process_classification
    ) {
      return false;
    }
    if (filters.source_type && valueOrNA(row.source_type) !== filters.source_type) return false;
    return true;
  });
}

export async function listEndorsementItems(
  endorsementRecordId: string,
): Promise<EndorsementTrackerItem[]> {
  const { data, error } = await supabase
    .from("endorsement_tracker_items")
    .select("*")
    .eq("endorsement_tracker_record_id", endorsementRecordId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("item_number", { ascending: true });
  if (error) throw error;
  return renumberEndorsementItems((data ?? []).map((row) => mapItem(row as Record<string, unknown>)));
}

export async function ensureEndorsementFromSource(params: {
  sourceType: EndorsementSourceType;
  sourceRecordId: string;
  payload: Record<string, string>;
  userEmail: string;
}): Promise<EnsureEndorsementResult> {
  const { data, error } = await supabase.rpc("ensure_endorsement_from_source", {
    p_source_type: params.sourceType,
    p_source_record_id: params.sourceRecordId,
    p_payload: params.payload,
    p_user_email: params.userEmail,
  });
  if (error) throw new Error(formatServiceError(error, "Failed to ensure endorsement tracker."));
  const result = data as EnsureEndorsementResult;
  return result;
}

export async function ensureEndorsementFromSupportSave(params: {
  activity: {
    activity_id: string;
    endorsement_number?: string;
    endorsement_status?: string;
    non_process_description?: string;
    cnf_tracker_record_id?: string | null;
    cnf_number_display?: string;
  };
  userEmail: string;
}): Promise<EnsureEndorsementResult | null> {
  if (!shouldOpenEndorsementTrackerFromSupportStatus(params.activity.endorsement_status)) {
    return null;
  }
  const number = valueOrEmpty(params.activity.endorsement_number);
  if (number && number.toUpperCase() !== "N/A") {
    return ensureEndorsementFromSource({
      sourceType: "non_process_support_activity",
      sourceRecordId: params.activity.activity_id,
      payload: buildEndorsementPayloadFromSupport(params.activity),
      userEmail: params.userEmail,
    });
  }
  // Blank/N/A number: do not stub-create; reopen existing source-linked tracker if any.
  const existing = await getEndorsementBySource(
    "non_process_support_activity",
    params.activity.activity_id,
  );
  return existing ? toEnsureResult(existing) : null;
}

export async function ensureEndorsementFromProjectSave(params: {
  project: {
    project_id: string;
    record_id: string;
    product_name?: string;
    fg_code?: string;
    endorsement_report_no?: string;
    endorsement_report_status?: string;
    cnf_reference?: string;
  };
  userEmail: string;
}): Promise<EnsureEndorsementResult | null> {
  if (!shouldOpenEndorsementTrackerFromProjectStatus(params.project.endorsement_report_status)) {
    return null;
  }
  const number = valueOrEmpty(params.project.endorsement_report_no);
  if (number && number.toUpperCase() !== "N/A") {
    return ensureEndorsementFromSource({
      sourceType: "process_validation_project",
      sourceRecordId: params.project.record_id,
      payload: buildEndorsementPayloadFromProject(params.project),
      userEmail: params.userEmail,
    });
  }
  // Blank/N/A number: do not stub-create; reopen existing linked tracker if any.
  const existing =
    (await getEndorsementBySource("process_validation_project", params.project.record_id))
    ?? (await getEndorsementByProjectId(params.project.project_id));
  return existing ? toEnsureResult(existing) : null;
}

export async function syncEndorsementMappedFields(params: {
  endorsementRecordId: string;
  expectedSyncVersion: number;
  direction: "to_source" | "to_tracker";
  fields: Record<string, unknown>;
  userEmail: string;
  lastSyncSource?: string | null;
}): Promise<{ sync_version: number; endorsement_tracker_id: string }> {
  const origin = params.direction === "to_tracker" ? "source" : "tracker";
  if (shouldSkipEchoSync(params.lastSyncSource, origin)) {
    return {
      sync_version: params.expectedSyncVersion,
      endorsement_tracker_id: "",
    };
  }

  const mapped = pickSyncMappedFields(params.fields);
  const { data, error } = await supabase.rpc("sync_endorsement_mapped_fields", {
    p_endorsement_record_id: params.endorsementRecordId,
    p_expected_sync_version: params.expectedSyncVersion,
    p_direction: params.direction,
    p_fields: mapped,
    p_user_email: params.userEmail,
  });
  if (error) {
    const message = formatServiceError(error, "Failed to synchronize endorsement fields.");
    if (message.includes("STALE_VERSION")) {
      throw new Error(
        "This endorsement was updated elsewhere. Reload the record before saving to avoid overwriting newer values.",
      );
    }
    throw new Error(message);
  }
  const result = data as { sync_version: number; endorsement_tracker_id: string };
  return result;
}

export async function saveIndependentEndorsement(
  payload: Partial<EndorsementTrackerRecord>,
  userEmail: string,
): Promise<EndorsementTrackerRecord> {
  const now = new Date().toISOString();
  const existingId = valueOrEmpty(payload.record_id);
  let existing: EndorsementTrackerRecord | null = null;

  if (existingId) {
    existing = await getEndorsementByRecordId(existingId);
  }

  const trackerId = existing?.endorsement_tracker_id
    ?? (valueOrEmpty(payload.endorsement_tracker_id) || (await getNextEndorsementTrackerId()));

  const row = {
    record_id: existing?.record_id,
    endorsement_tracker_id: trackerId,
    endorsement_number: normalizeOptionalNaForSubmit(payload.endorsement_number),
    endorsement_status: normalizeOptionalNaForSubmit(payload.endorsement_status),
    process_classification: payload.process_classification || "unset",
    source_type: payload.source_type || "independent",
    source_record_id: payload.source_record_id || null,
    project_id: payload.project_id || null,
    project_record_id: payload.project_record_id || null,
    cnf_tracker_record_id: payload.cnf_tracker_record_id || null,
    support_activity_id: payload.support_activity_id || null,
    cnf_number_display: normalizeOptionalNaForSubmit(payload.cnf_number_display),
    project_name: normalizeOptionalNaForSubmit(payload.project_name),
    product_name: normalizeOptionalNaForSubmit(payload.product_name),
    product_code: normalizeOptionalNaForSubmit(payload.product_code),
    non_process_description: normalizeOptionalNaForSubmit(payload.non_process_description),
    last_sync_source: "tracker",
    last_synced_at: now,
    sync_version: existing ? existing.sync_version + 1 : 1,
    created_by: existing?.created_by ?? userEmail,
    created_at: existing?.created_at ?? now,
    updated_by: userEmail,
    updated_at: now,
    is_active: true,
  };

  if (existing) {
    if (payload.sync_version != null && payload.sync_version !== existing.sync_version) {
      throw new Error(
        "This endorsement was updated elsewhere. Reload the record before saving to avoid overwriting newer values.",
      );
    }
    const { data, error } = await supabase
      .from("endorsement_tracker_records")
      .update(row)
      .eq("record_id", existing.record_id)
      .eq("sync_version", existing.sync_version)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new Error(
        "This endorsement was updated elsewhere. Reload the record before saving to avoid overwriting newer values.",
      );
    }
    await logAuditDiff(
      "Endorsement Tracker",
      "UPDATE",
      trackerId,
      row.project_id ?? "N/A",
      existing as unknown as Record<string, unknown>,
      mapRow(data as Record<string, unknown>) as unknown as Record<string, unknown>,
      userEmail,
    );

    if (existing.source_type !== "independent" && existing.record_id) {
      try {
        await syncEndorsementMappedFields({
          endorsementRecordId: existing.record_id,
          expectedSyncVersion: row.sync_version,
          direction: "to_source",
          fields: row,
          userEmail,
          lastSyncSource: existing.last_sync_source,
        });
      } catch (syncError) {
        throw new Error(
          formatServiceError(syncError, "Endorsement saved, but linked source could not be synchronized."),
        );
      }
    }

    return mapRow(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("endorsement_tracker_records")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  const saved = mapRow(data as Record<string, unknown>);
  await logAuditEntries(
    "Endorsement Tracker",
    "CREATE",
    trackerId,
    saved.project_id ?? "N/A",
    {},
    saved as unknown as Record<string, unknown>,
    "Independent endorsement created",
    userEmail,
  );
  return saved;
}

export async function saveEndorsementItems(
  endorsementRecordId: string,
  items: Partial<EndorsementTrackerItem>[],
  userEmail: string,
): Promise<EndorsementTrackerItem[]> {
  const numbered = renumberEndorsementItems(
    items.map((item, index) => ({
      ...item,
      item_id: item.item_id || crypto.randomUUID(),
      endorsement_tracker_record_id: endorsementRecordId,
      item_number: index + 1,
      sort_order: index,
    })),
  );

  const rows = numbered.map((item) => mapEndorsementItemToDb(item, userEmail));
  const { error } = await supabase.from("endorsement_tracker_items").upsert(rows, {
    onConflict: "item_id",
  });
  if (error) throw error;
  return listEndorsementItems(endorsementRecordId);
}

export async function softDeleteEndorsementItem(
  itemId: string,
  userEmail: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { data: existing, error: fetchError } = await supabase
    .from("endorsement_tracker_items")
    .select("*")
    .eq("item_id", itemId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Endorsement item not found.");

  const { error } = await supabase
    .from("endorsement_tracker_items")
    .update({ is_active: false, updated_by: userEmail, updated_at: now })
    .eq("item_id", itemId);
  if (error) throw error;

  const headerId = String((existing as { endorsement_tracker_record_id: string }).endorsement_tracker_record_id);
  const remaining = await listEndorsementItems(headerId);
  if (remaining.length) {
    await saveEndorsementItems(headerId, remaining, userEmail);
  }

  await logAuditEntries(
    "Endorsement Tracker",
    "DELETE",
    itemId,
    "N/A",
    existing as unknown as Record<string, unknown>,
    {},
    "Endorsement item soft-deleted",
    userEmail,
  );
}

export function emptyEndorsementItem(
  endorsementRecordId = "",
): Partial<EndorsementTrackerItem> {
  return {
    item_id: crypto.randomUUID(),
    endorsement_tracker_record_id: endorsementRecordId,
    item_number: 1,
    endorsement_entry: "",
    target_implementation_date: "",
    implemented_by: "",
    implementation_date: "",
    verified_by_validation: "",
    validation_verification_date: "",
    verified_by_qa: "",
    qa_verification_date: "",
    sort_order: 0,
    is_active: true,
  };
}
