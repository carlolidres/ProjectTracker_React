import { collectSupportDateChanges } from "@/lib/dateAdjustmentReview";
import { normalizeStoredAppDate, parseAppDateValue } from "@/lib/date";
import { shouldOpenEndorsementTrackerFromSupportStatus } from "@/lib/endorsementSync";
import { rowMatchesDueWindow, supportTargetDays } from "@/lib/fgUrgency";
import { mapDbToSupport, mapSupportToDb } from "@/lib/mappers";
import { normalizeOptionalNaForSubmit } from "@/lib/naField";
import { getNextSupportActivityId, getNextSupportProjectId } from "@/lib/idGeneration";
import { supabase } from "@/lib/supabaseClient";
import { formatServiceError, sanitizeAlphanumericInput, valueOrEmpty, valueOrNA } from "@/lib/utils";
import { logAuditDiff, logAuditEntries } from "@/services/auditService";
import { ensureEndorsementFromSupportSave } from "@/services/endorsementTrackerService";
import type { SupportActivity, SupportActivityFilters } from "@/types";

function mapRow(row: Record<string, unknown>): SupportActivity {
  return mapDbToSupport(row);
}

function statusDateToIso(value: unknown): string | null {
  if (value == null || String(value).trim() === "") return null;
  const parsed = parseAppDateValue(String(value));
  return parsed ? parsed.format("YYYY-MM-DD") : null;
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
    if (filters.status && valueOrNA(row.status) !== filters.status) return false;
    if (filters.due_window) {
      const days = supportTargetDays(row.Target_Date);
      if (!rowMatchesDueWindow(days, true, filters.due_window)) return false;
    }
    return true;
  });
}

export interface SupportSaveOptions {
  dateAdjustmentsConfirmed?: boolean;
  /** When creating a brand-new CNF from Non-Process form. */
  newCnfReference?: string;
}

export interface SupportSaveResult {
  activity_id: string;
  project_id: string;
  record: SupportActivity;
  endorsement_tracker_id?: string;
  endorsement_record_id?: string;
  /** New CNF reference that does not exist yet — UI should open CNF Tracker create. */
  pending_cnf_reference?: string;
}

function buildSupportPayload(payload: Partial<SupportActivity>): Partial<SupportActivity> {
  const isNonProcess = payload.activity_kind === "Non-Process";
  return {
    ...payload,
    status: normalizeOptionalNaForSubmit(payload.status),
    status_date: valueOrEmpty(payload.status_date),
    Department: normalizeOptionalNaForSubmit(payload.Department),
    Material: normalizeOptionalNaForSubmit(payload.Material),
    Line: normalizeOptionalNaForSubmit(payload.Line),
    Bulk: normalizeOptionalNaForSubmit(payload.Bulk),
    Product_User: normalizeOptionalNaForSubmit(payload.Product_User),
    Principal: normalizeOptionalNaForSubmit(payload.Principal),
    Product: normalizeOptionalNaForSubmit(payload.Product),
    Target_Date: normalizeStoredAppDate(valueOrEmpty(payload.Target_Date)),
    Planning_Schedule: normalizeStoredAppDate(valueOrEmpty(payload.Planning_Schedule)),
    cnf_link_state: payload.cnf_link_state ?? "unset",
    cnf_tracker_record_id:
      payload.cnf_link_state === "not_applicable" ? null : (payload.cnf_tracker_record_id ?? null),
    cnf_number_display:
      payload.cnf_link_state === "not_applicable"
        ? "Not Applicable"
        : valueOrEmpty(payload.cnf_number_display),
    // Title / Activity Name is shared across kinds; empty -> N/A on save.
    non_process_description: normalizeOptionalNaForSubmit(payload.non_process_description),
    activity_type: isNonProcess
      ? normalizeOptionalNaForSubmit(payload.activity_type)
      : valueOrEmpty(payload.activity_type),
    type_of_validation: isNonProcess
      ? normalizeOptionalNaForSubmit(payload.type_of_validation)
      : valueOrEmpty(payload.type_of_validation),
    protocol_number: isNonProcess
      ? normalizeOptionalNaForSubmit(payload.protocol_number)
      : valueOrEmpty(payload.protocol_number),
    protocol_status: isNonProcess
      ? normalizeOptionalNaForSubmit(payload.protocol_status)
      : valueOrEmpty(payload.protocol_status),
    report_number: isNonProcess
      ? normalizeOptionalNaForSubmit(payload.report_number)
      : valueOrEmpty(payload.report_number),
    report_status: isNonProcess
      ? normalizeOptionalNaForSubmit(payload.report_status)
      : valueOrEmpty(payload.report_status),
    endorsement_number: isNonProcess
      ? normalizeOptionalNaForSubmit(payload.endorsement_number)
      : valueOrEmpty(payload.endorsement_number),
    endorsement_status: isNonProcess
      ? normalizeOptionalNaForSubmit(payload.endorsement_status)
      : valueOrEmpty(payload.endorsement_status),
  };
}

export async function saveSupportActivity(
  payload: Partial<SupportActivity>,
  userEmail: string,
  options?: SupportSaveOptions,
): Promise<SupportSaveResult> {
  const normalized = buildSupportPayload(payload);
  const activityId = valueOrNA(normalized.activity_id) === "N/A"
    ? getNextSupportActivityId()
    : String(normalized.activity_id).trim();
  const now = new Date().toISOString();

  const { data: existingData } = await supabase
    .from("support_activities")
    .select("*")
    .eq("activity_id", activityId)
    .maybeSingle();

  const existing = existingData ? mapRow(existingData as Record<string, unknown>) : null;
  const requiredDateChanges = collectSupportDateChanges(
    (existing ?? {}) as Record<string, string | undefined>,
    normalized as Record<string, string | undefined>,
    { projectId: existing?.project_id ?? normalized.project_id, activityId },
  );
  if (requiredDateChanges.length && !options?.dateAdjustmentsConfirmed) {
    throw new Error("Date adjustments require a documented reason before saving.");
  }

  const supportProjectId = existing?.project_id ?? (await getNextSupportProjectId());
  const createEndorsement =
    normalized.activity_kind === "Non-Process"
    && shouldOpenEndorsementTrackerFromSupportStatus(normalized.endorsement_status);

  // New CNF: link if it already exists; otherwise keep display text and redirect to CNF Tracker create.
  let pendingCnfReference: string | undefined;
  if (
    normalized.activity_kind === "Non-Process"
    && options?.newCnfReference
    && normalized.cnf_link_state !== "not_applicable"
  ) {
    const ref = options.newCnfReference.trim();
    if (ref) {
      const { data: dup } = await supabase
        .from("cnf_tracker_records")
        .select("record_id, cnf_reference")
        .eq("is_active", true)
        .ilike("cnf_reference", ref)
        .maybeSingle();
      if (dup) {
        normalized.cnf_tracker_record_id = String((dup as { record_id: string }).record_id);
        normalized.cnf_link_state = "linked";
        normalized.cnf_number_display = String((dup as { cnf_reference: string }).cnf_reference);
      } else {
        normalized.cnf_tracker_record_id = null;
        normalized.cnf_link_state = "unset";
        normalized.cnf_number_display = ref;
        pendingCnfReference = ref;
      }
    }
  }

  // Prefer atomic RPC when endorsement linkage is required.
  if (createEndorsement) {
    try {
      const activityJson = {
        activity_id: activityId,
        project_id: supportProjectId,
        activity_kind: valueOrEmpty(normalized.activity_kind),
        department: valueOrEmpty(normalized.Department),
        material: valueOrEmpty(normalized.Material),
        line: valueOrEmpty(normalized.Line),
        bulk: valueOrEmpty(normalized.Bulk),
        machinability_protocol: valueOrEmpty(normalized.Machinability_Protocol),
        machinability_protocol_status: valueOrEmpty(normalized.Machinability_Protocol_Status),
        machinability_report: valueOrEmpty(normalized.Machinability_Report),
        machinability_report_status: valueOrEmpty(normalized.Machinability_Report_Status),
        product_user: valueOrEmpty(normalized.Product_User),
        principal: valueOrEmpty(normalized.Principal),
        product: valueOrEmpty(normalized.Product),
        target_date: valueOrEmpty(normalized.Target_Date),
        planning_schedule: valueOrEmpty(normalized.Planning_Schedule),
        status: valueOrEmpty(normalized.status),
        status_date: statusDateToIso(normalized.status_date) ?? "",
        cnf_tracker_record_id: normalized.cnf_tracker_record_id ?? "",
        cnf_link_state: normalized.cnf_link_state ?? "unset",
        cnf_number_display: valueOrEmpty(normalized.cnf_number_display),
        non_process_description: valueOrEmpty(normalized.non_process_description),
        activity_type: valueOrEmpty(normalized.activity_type),
        type_of_validation: valueOrEmpty(normalized.type_of_validation),
        protocol_number: valueOrEmpty(normalized.protocol_number),
        protocol_status: valueOrEmpty(normalized.protocol_status),
        report_number: valueOrEmpty(normalized.report_number),
        report_status: valueOrEmpty(normalized.report_status),
        endorsement_number: valueOrEmpty(normalized.endorsement_number),
        endorsement_status: valueOrEmpty(normalized.endorsement_status),
      };

      // #region agent log
      fetch('http://127.0.0.1:7283/ingest/45f27f5f-a181-4aac-bd0e-0f472992dd4a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b98299'},body:JSON.stringify({sessionId:'b98299',runId:'post-fix',hypothesisId:'F,I',location:'supportActivityService.ts:rpc-enter',message:'Calling save_support_activity_with_links',data:{activityId,createEndorsement,endorsementStatus:valueOrEmpty(normalized.endorsement_status),endorsementNumber:valueOrEmpty(normalized.endorsement_number),activityKind:valueOrEmpty(normalized.activity_kind),hasCnf:Boolean(normalized.cnf_tracker_record_id),isExistingRow:Boolean(existing)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      const { data, error } = await supabase.rpc("save_support_activity_with_links", {
        p_activity: activityJson,
        p_user_email: userEmail,
        p_create_endorsement: createEndorsement,
        p_cnf_create: null,
      });
      if (error) {
        // #region agent log
        fetch('http://127.0.0.1:7283/ingest/45f27f5f-a181-4aac-bd0e-0f472992dd4a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b98299'},body:JSON.stringify({sessionId:'b98299',runId:'post-fix',hypothesisId:'A,B,C,D',location:'supportActivityService.ts:rpc-error',message:'RPC save_support_activity_with_links failed',data:{code:(error as {code?:string}).code,message:error.message,details:(error as {details?:string}).details,hint:(error as {hint?:string}).hint,activityId},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        throw error;
      }

      // #region agent log
      fetch('http://127.0.0.1:7283/ingest/45f27f5f-a181-4aac-bd0e-0f472992dd4a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b98299'},body:JSON.stringify({sessionId:'b98299',runId:'post-fix',hypothesisId:'I',location:'supportActivityService.ts:rpc-success',message:'RPC save_support_activity_with_links succeeded',data:{resultActivityId:(data as {activity_id?:string})?.activity_id,endorsementTrackerId:(data as {endorsement?:{endorsement_tracker_id?:string}|null})?.endorsement?.endorsement_tracker_id??null,endorsementNumber:valueOrEmpty(normalized.endorsement_number)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      const result = data as {
        activity_id: string;
        project_id: string;
        endorsement?: { endorsement_tracker_id?: string; record_id?: string } | null;
      };

      const { data: savedRow, error: reloadError } = await supabase
        .from("support_activities")
        .select("*")
        .eq("activity_id", result.activity_id)
        .single();
      if (reloadError) throw reloadError;

      return {
        activity_id: result.activity_id,
        project_id: result.project_id,
        record: mapRow(savedRow as Record<string, unknown>),
        endorsement_tracker_id: result.endorsement?.endorsement_tracker_id,
        endorsement_record_id: result.endorsement?.record_id,
        pending_cnf_reference: pendingCnfReference,
      };
    } catch (rpcError) {
      // Fall through to non-RPC path only when RPC is missing (migration not applied).
      const message = formatServiceError(rpcError, "");
      // #region agent log
      fetch('http://127.0.0.1:7283/ingest/45f27f5f-a181-4aac-bd0e-0f472992dd4a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b98299'},body:JSON.stringify({sessionId:'b98299',runId:'post-fix',hypothesisId:'E',location:'supportActivityService.ts:rpc-catch',message:'RPC catch path',data:{message,willFallback:message.includes('Could not find the function')||message.includes('404'),code:(rpcError as {code?:string})?.code},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!message.includes("Could not find the function") && !message.includes("404")) {
        throw rpcError instanceof Error ? rpcError : new Error(message);
      }
    }
  }

  const row = {
    activity_id: activityId,
    project_id: supportProjectId,
    activity_kind: valueOrEmpty(normalized.activity_kind),
    Department: valueOrEmpty(normalized.Department),
    Material: valueOrEmpty(normalized.Material),
    Line: valueOrEmpty(normalized.Line),
    Bulk: valueOrEmpty(normalized.Bulk),
    Machinability_Protocol: valueOrEmpty(normalized.Machinability_Protocol),
    Machinability_Protocol_Status: valueOrEmpty(normalized.Machinability_Protocol_Status),
    Machinability_Report: valueOrEmpty(normalized.Machinability_Report),
    Machinability_Report_Status: valueOrEmpty(normalized.Machinability_Report_Status),
    Product_User: valueOrEmpty(normalized.Product_User),
    Principal: valueOrEmpty(normalized.Principal),
    Product: valueOrEmpty(normalized.Product),
    Target_Date: valueOrEmpty(normalized.Target_Date),
    Planning_Schedule: valueOrEmpty(normalized.Planning_Schedule),
    status: valueOrEmpty(normalized.status),
    status_date: valueOrEmpty(normalized.status_date),
    cnf_tracker_record_id: normalized.cnf_tracker_record_id,
    cnf_link_state: normalized.cnf_link_state ?? "unset",
    cnf_number_display: valueOrEmpty(normalized.cnf_number_display),
    non_process_description: valueOrEmpty(normalized.non_process_description),
    activity_type: valueOrEmpty(normalized.activity_type),
    type_of_validation: valueOrEmpty(normalized.type_of_validation),
    protocol_number: valueOrEmpty(normalized.protocol_number),
    protocol_status: valueOrEmpty(normalized.protocol_status),
    report_number: valueOrEmpty(normalized.report_number),
    report_status: valueOrEmpty(normalized.report_status),
    endorsement_number: valueOrEmpty(normalized.endorsement_number),
    endorsement_status: valueOrEmpty(normalized.endorsement_status),
    endorsement_tracker_record_id: existing?.endorsement_tracker_record_id ?? null,
    sync_version: (existing?.sync_version ?? 0) + 1,
    created_by: existing?.created_by ?? userEmail,
    created_at: existing?.created_at ?? now,
    updated_by: userEmail,
    updated_at: now,
    is_active: true,
  };

  if (existing) {
    const { error } = await supabase
      .from("support_activities")
      .update(mapSupportToDb(row))
      .eq("activity_id", activityId);
    if (error) throw error;
    await logAuditDiff(
      "Support Activities",
      "UPDATE",
      activityId,
      supportProjectId,
      existing as unknown as Record<string, unknown>,
      row,
      userEmail,
    );
  } else {
    const { error } = await supabase.from("support_activities").insert(mapSupportToDb(row));
    if (error) throw error;
    await logAuditEntries(
      "Support Activities",
      "CREATE",
      activityId,
      supportProjectId,
      {},
      row,
      "Support activity created",
      userEmail,
    );
  }

  let endorsementTrackerId: string | undefined;
  let endorsementRecordId: string | undefined;
  if (createEndorsement) {
    const ensured = await ensureEndorsementFromSupportSave({
      activity: {
        activity_id: activityId,
        endorsement_number: row.endorsement_number,
        endorsement_status: row.endorsement_status,
        non_process_description: row.non_process_description,
        cnf_tracker_record_id: row.cnf_tracker_record_id,
        cnf_number_display: row.cnf_number_display,
      },
      userEmail,
    });
    if (ensured) {
      endorsementTrackerId = ensured.endorsement_tracker_id;
      endorsementRecordId = ensured.record_id;
      await supabase
        .from("support_activities")
        .update({ endorsement_tracker_record_id: ensured.record_id })
        .eq("activity_id", activityId);
    }
  }

  const { data: savedRow } = await supabase
    .from("support_activities")
    .select("*")
    .eq("activity_id", activityId)
    .single();

  return {
    activity_id: activityId,
    project_id: supportProjectId,
    record: savedRow ? mapRow(savedRow as Record<string, unknown>) : mapDbToSupport(mapSupportToDb(row)),
    endorsement_tracker_id: endorsementTrackerId,
    endorsement_record_id: endorsementRecordId,
    pending_cnf_reference: pendingCnfReference,
  };
}

export async function getSupportActivityById(activityId: string): Promise<SupportActivity | null> {
  const { data, error } = await supabase
    .from("support_activities")
    .select("*")
    .eq("activity_id", activityId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
}

/** First active Non-Process support activity linked to a CNF Tracker record. */
export async function findNonProcessByCnfTrackerRecordId(
  cnfTrackerRecordId: string,
): Promise<SupportActivity | null> {
  const { data, error } = await supabase
    .from("support_activities")
    .select("*")
    .eq("is_active", true)
    .eq("activity_kind", "Non-Process")
    .eq("cnf_tracker_record_id", cnfTrackerRecordId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
}

/** All active Non-Process support activities linked to a CNF Tracker record. */
export async function listNonProcessByCnfTrackerRecordId(
  cnfTrackerRecordId: string,
): Promise<SupportActivity[]> {
  const { data, error } = await supabase
    .from("support_activities")
    .select("*")
    .eq("is_active", true)
    .eq("activity_kind", "Non-Process")
    .eq("cnf_tracker_record_id", cnfTrackerRecordId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

/**
 * Build lookup of Title / Type of Validation for CNF list Non-Process columns.
 */
export async function buildSupportTitleLookupByCnfRecordId(): Promise<
  Map<string, { titleActivityName: string; activityType: string }>
> {
  const { data, error } = await supabase
    .from("support_activities")
    .select("cnf_tracker_record_id, non_process_description, type_of_validation, activity_type, updated_at")
    .eq("is_active", true)
    .eq("activity_kind", "Non-Process")
    .not("cnf_tracker_record_id", "is", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const map = new Map<string, { titleActivityName: string; activityType: string }>();
  for (const row of data ?? []) {
    const key = String((row as { cnf_tracker_record_id?: string }).cnf_tracker_record_id ?? "");
    if (!key || map.has(key)) continue;
    const typed = row as {
      non_process_description?: string;
      type_of_validation?: string;
      activity_type?: string;
    };
    map.set(key, {
      titleActivityName: String(typed.non_process_description ?? ""),
      activityType: String(typed.type_of_validation || typed.activity_type || ""),
    });
  }
  return map;
}

/**
 * Sync Title + Activity Type onto a Non-Process support activity and optionally link a CNF record.
 * CNF UI "Activity Type" maps to Support `type_of_validation` (mirrored on `activity_type`).
 * Used from CNF Tracker Details (no new CNF column).
 */
export async function syncNonProcessFieldsFromCnf(options: {
  activityId?: string | null;
  cnfTrackerRecordId?: string | null;
  cnfReference?: string | null;
  titleActivityName?: string;
  activityType?: string;
  userEmail: string;
}): Promise<SupportActivity | null> {
  const title = sanitizeAlphanumericInput(String(options.titleActivityName ?? "")).slice(0, 50).trim();
  const activityType = normalizeOptionalNaForSubmit(
    sanitizeAlphanumericInput(String(options.activityType ?? "")).trim(),
  );
  const now = new Date().toISOString();

  let activityId = options.activityId?.trim() || "";
  if (!activityId && options.cnfTrackerRecordId) {
    const linked = await findNonProcessByCnfTrackerRecordId(options.cnfTrackerRecordId);
    activityId = linked?.activity_id ?? "";
  }
  if (!activityId && options.cnfReference) {
    const ref = options.cnfReference.trim();
    const { data, error } = await supabase
      .from("support_activities")
      .select("*")
      .eq("is_active", true)
      .eq("activity_kind", "Non-Process")
      .ilike("cnf_number_display", ref)
      .is("cnf_tracker_record_id", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    activityId = data ? String((data as { activity_id: string }).activity_id) : "";
  }
  if (!activityId) return null;

  const { data: existingData, error: fetchError } = await supabase
    .from("support_activities")
    .select("*")
    .eq("activity_id", activityId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existingData) return null;

  const existing = mapRow(existingData as Record<string, unknown>);
  const patch: Record<string, unknown> = {
    updated_by: options.userEmail,
    updated_at: now,
  };
  if (options.titleActivityName !== undefined) {
    patch.non_process_description = title || "N/A";
  }
  if (options.activityType !== undefined) {
    // CNF Non-Process "Activity Type" ↔ Support "Type of Validation" (also mirror activity_type).
    patch.type_of_validation = activityType || "N/A";
    patch.activity_type = activityType || "N/A";
  }
  if (options.cnfTrackerRecordId) {
    patch.cnf_tracker_record_id = options.cnfTrackerRecordId;
    patch.cnf_link_state = "linked";
    if (options.cnfReference) {
      patch.cnf_number_display = options.cnfReference.trim();
    }
  }

  const { data: updated, error } = await supabase
    .from("support_activities")
    .update(patch)
    .eq("activity_id", activityId)
    .select("*")
    .single();
  if (error) throw error;

  await logAuditDiff(
    "Support Activities",
    "UPDATE",
    activityId,
    existing.project_id,
    existing as unknown as Record<string, unknown>,
    { ...existing, ...patch } as unknown as Record<string, unknown>,
    options.userEmail,
  );

  return mapRow(updated as Record<string, unknown>);
}

export async function archiveSupportActivity(activityId: string, userEmail: string) {
  const { data, error: fetchError } = await supabase
    .from("support_activities")
    .select("*")
    .eq("activity_id", activityId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!data) throw new Error(`Support activity ${activityId} not found.`);

  const existing = mapRow(data as Record<string, unknown>);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("support_activities")
    .update({ is_active: false, updated_by: userEmail, updated_at: now })
    .eq("activity_id", activityId);
  if (error) throw error;
  await logAuditEntries(
    "Support Activities",
    "DELETE",
    activityId,
    existing.project_id,
    existing as unknown as Record<string, unknown>,
    {},
    "Support activity archived",
    userEmail,
  );
}

export async function restoreSupportActivity(activityId: string, userEmail: string) {
  const { data, error: fetchError } = await supabase
    .from("support_activities")
    .select("*")
    .eq("activity_id", activityId)
    .eq("is_active", false)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!data) throw new Error(`Archived support activity ${activityId} not found.`);

  const existing = mapRow(data as Record<string, unknown>);
  const now = new Date().toISOString();
  const updates = { is_active: true, updated_by: userEmail, updated_at: now };
  const { error } = await supabase
    .from("support_activities")
    .update(updates)
    .eq("activity_id", activityId);
  if (error) throw error;
  await logAuditDiff(
    "Support Activities",
    "UPDATE",
    activityId,
    existing.project_id,
    existing as unknown as Record<string, unknown>,
    { ...existing, ...updates } as unknown as Record<string, unknown>,
    userEmail,
  );
}
