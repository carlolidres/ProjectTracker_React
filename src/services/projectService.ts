import { CNF_ENTRY_KEYS, NA_VALUE } from "@/lib/constants";
import { collectProjectDateChanges } from "@/lib/dateAdjustmentReview";
import { monthYearMatches, normalizeStoredFgMonth } from "@/lib/date";
import { projectRowFgDeliveryStatus } from "@/lib/fgDeliveryMetrics";
import { projectRowFgDays, rowMatchesDueWindow } from "@/lib/fgUrgency";
import { compareProjectPriority, hasMissingFieldsForGroup, type FocusGroup } from "@/lib/projectPriority";
import { mapDbToProject, mapProjectToDb } from "@/lib/mappers";
import { emptyProjectHierarchy } from "@/lib/projectHierarchy";
import { emitProjectDataChanged } from "@/lib/projectDataEvents";
import { findDuplicateSoNumbers } from "@/lib/soNoValidation";
import { getNextProjectId } from "@/lib/idGeneration";
import { formatServiceError } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import {
  generateHierarchyId,
  generateRecordId,
  idsEqual,
  isActiveValue,
  isApprovedOrNotApplicableStatus,
  isOpenFinalStatus,
  valueOrNA,
} from "@/lib/utils";
import { logAuditDiff, logAuditEntries } from "@/services/auditService";
import {
  enforceLinkedChildCnfOnSave,
  getProjectCnfLink,
  propagateMotherCnfToLinkedChildren,
  validateChildProjectCnfSave,
} from "@/services/cnfLinkService";
import { syncLinkedTrackersFromProject } from "@/services/cnfTrackerLinkService";
import { ensureEndorsementFromProjectSave } from "@/services/endorsementTrackerService";
import { projectSnapshotForTrackerSync } from "@/lib/cnfTrackerSync";
import type {
  BatchControl,
  CnfEntry,
  PoControl,
  ProjectFilters,
  ProjectHierarchy,
  ProjectRow,
} from "@/types";

function normalizeProjectValue(value: unknown): string {
  return valueOrNA(value);
}

function normalizeCnfEntries(entries: CnfEntry[] | undefined, legacyRow: Partial<PoControl>): CnfEntry[] {
  const source = entries?.length ? entries : [legacyRow as CnfEntry];
  return source.map((entry) => {
    const normalized = {} as CnfEntry;
    for (const key of CNF_ENTRY_KEYS) {
      normalized[key] = normalizeProjectValue(entry[key]);
    }
    if (entry.cnf_initiator !== undefined) normalized.cnf_initiator = normalizeProjectValue(entry.cnf_initiator);
    if (entry.cnf_details !== undefined) normalized.cnf_details = normalizeProjectValue(entry.cnf_details);
    if (entry.cnf_tracker_record_id) {
      normalized.cnf_tracker_record_id = String(entry.cnf_tracker_record_id).trim();
    }
    return normalized;
  });
}

/** Strip tracker-only snapshot keys before spreading onto flat cnf_projects columns. */
function stripTrackerOnlyCnfFields(entry: CnfEntry): Omit<CnfEntry, "cnf_initiator" | "cnf_details" | "cnf_tracker_record_id"> {
  const {
    cnf_initiator: _initiator,
    cnf_details: _details,
    cnf_tracker_record_id: _trackerId,
    ...flat
  } = entry;
  return flat;
}

function parseCnfEntries(row: Partial<ProjectRow | PoControl>): CnfEntry[] {
  const raw = String(row.cnf_entries_json ?? "").trim();
  if (raw && raw !== NA_VALUE) {
    try {
      const parsed = JSON.parse(raw) as CnfEntry[];
      if (Array.isArray(parsed) && parsed.length) return normalizeCnfEntries(parsed, row);
    } catch {
      // fall through
    }
  }
  return normalizeCnfEntries([], row as PoControl);
}

function poLineKey(row: { po_instance_id?: string; po_control_no?: string }): string {
  if (valueOrNA(row.po_instance_id) !== NA_VALUE) return String(row.po_instance_id);
  return valueOrNA(row.po_control_no);
}

export function flattenProjectPayload(payload: ProjectHierarchy, projectId: string) {
  const lines: Record<string, unknown>[] = [];
  const head = {
    project_id: projectId,
    project_owner: payload.project_owner,
    activity_type: payload.activity_type,
    client_name: payload.client_name,
    so_no: payload.batches[0]?.mo_controls[0]?.po_controls[0]?.so_no ?? payload.so_no,
    fg_code: payload.fg_code,
    product_name: payload.product_name,
  };

  for (const batch of payload.batches ?? []) {
    for (const mo of batch.mo_controls ?? []) {
      for (const po of mo.po_controls ?? []) {
        const cnfEntries = normalizeCnfEntries(po.cnf_entries, po);
        const firstCnf = cnfEntries[0] ?? ({} as CnfEntry);
        const line: Record<string, unknown> = {
          ...head,
          batch_instance_id: batch.batch_instance_id,
          unique_batch: batch.unique_batch,
          mo_instance_id: mo.mo_instance_id,
          mo_control_no: mo.mo_control_no,
          ...po,
          ...stripTrackerOnlyCnfFields(firstCnf),
          cnf_entries_json: JSON.stringify(cnfEntries),
        };
        delete line.cnf_entries;
        delete line.cnf_initiator;
        delete line.cnf_details;
        delete line.cnf_tracker_record_id;
        lines.push(line);
      }
    }
  }
  return lines;
}

function extractPoFields(row: ProjectRow): PoControl {
  const po: PoControl = {
    po_instance_id: row.po_instance_id,
    so_no: row.so_no,
    po_control_no: row.po_control_no,
    fg_month: row.fg_month,
    business_unit: row.business_unit,
    updatedDocsVer: row.updatedDocsVer,
    order_quantity: row.order_quantity,
    uom: row.uom,
    prod_ver: row.prod_ver,
    cnf_reference: row.cnf_reference,
    qrmr_ref_no: row.qrmr_ref_no,
    qrmr_status: row.qrmr_status,
    qrmr_target_date: row.qrmr_target_date,
    risk_control: "",
    change_description: row.change_description,
    cnf_status: row.cnf_status,
    client_approval_target_date: row.client_approval_target_date,
    remarks: row.remarks,
    manufacturing_start_week: row.manufacturing_start_week,
    mo_bmr_po_submission_status: row.mo_bmr_po_submission_status,
    mo_bmr_po_target_date: row.mo_bmr_po_target_date,
    mo_bmr_po_activation_status: row.mo_bmr_po_activation_status,
    mo_bmr_po_activation_date: row.mo_bmr_po_activation_date,
    tsd_remarks: row.tsd_remarks,
    protocol_no: row.protocol_no,
    protocol_Status: row.protocol_Status,
    protocol_target_date: row.protocol_target_date,
    Val_Activity: row.Val_Activity,
    Val_Stability: row.Val_Stability,
    Val_Batch_Seq_No: row.Val_Batch_Seq_No,
    Val_Strategy: row.Val_Strategy,
    Val_Strategy_remarks: row.Val_Strategy_remarks,
    val_interim_report_no: row.val_interim_report_no,
    val_interim_report_status: row.val_interim_report_status,
    val_interim_report_target_date: row.val_interim_report_target_date,
    validation_report_no: row.validation_report_no,
    validation_report_status: row.validation_report_status,
    validation_report_target_date: row.validation_report_target_date,
    endorsement_report_no: row.endorsement_report_no,
    endorsement_report_status: row.endorsement_report_status,
    endorsement_acceptance_target_date: row.endorsement_acceptance_target_date,
    ar_availability_date: row.ar_availability_date,
    qc_remarks: row.qc_remarks,
    packaging_schedule: row.packaging_schedule,
    final_status: row.final_status,
    final_status_other: row.final_status_other,
    record_id: row.record_id,
    cnf_entries_json: row.cnf_entries_json,
  };
  po.cnf_entries = parseCnfEntries(row);
  const firstEntry = po.cnf_entries[0];
  if (firstEntry) {
    po.risk_control = firstEntry.risk_control;
  }
  return po;
}

export function buildProjectHierarchy(rows: ProjectRow[]): ProjectHierarchy | null {
  if (!rows.length) return null;
  const head = rows[0];
  const project: ProjectHierarchy = {
    project_id: head.project_id,
    project_owner: head.project_owner,
    activity_type: head.activity_type,
    client_name: head.client_name,
    so_no: head.so_no,
    fg_code: head.fg_code,
    product_name: head.product_name,
    validation_report_no: head.validation_report_no,
    validation_report_status: head.validation_report_status,
    validation_report_target_date: head.validation_report_target_date,
    batches: [],
  };

  const batchMap: Record<string, BatchControl> = {};
  const moMaps: Record<string, Record<string, { mo_instance_id?: string; mo_control_no: string; po_controls: PoControl[] }>> = {};

  for (const row of rows) {
    const batchKey = valueOrNA(row.batch_instance_id) !== NA_VALUE ? row.batch_instance_id : valueOrNA(row.unique_batch);
    if (!batchMap[batchKey]) {
      batchMap[batchKey] = {
        batch_instance_id: valueOrNA(row.batch_instance_id) !== NA_VALUE ? row.batch_instance_id : generateHierarchyId("BAT"),
        unique_batch: row.unique_batch,
        mo_controls: [],
      };
      project.batches.push(batchMap[batchKey]);
      moMaps[batchKey] = {};
    }

    const moKey = valueOrNA(row.mo_instance_id) !== NA_VALUE ? row.mo_instance_id : valueOrNA(row.mo_control_no);
    if (!moMaps[batchKey][moKey]) {
      moMaps[batchKey][moKey] = {
        mo_instance_id: valueOrNA(row.mo_instance_id) !== NA_VALUE ? row.mo_instance_id : generateHierarchyId("MO"),
        mo_control_no: row.mo_control_no,
        po_controls: [],
      };
      batchMap[batchKey].mo_controls.push(moMaps[batchKey][moKey]);
    }
    moMaps[batchKey][moKey].po_controls.push(extractPoFields(row));
  }

  const canonicalPo = project.batches[0]?.mo_controls[0]?.po_controls[0];
  if (canonicalPo) {
    project.validation_report_no = canonicalPo.validation_report_no;
    project.validation_report_status = canonicalPo.validation_report_status;
    project.validation_report_target_date = canonicalPo.validation_report_target_date;
  }

  return project;
}

function mapDbRow(row: Record<string, unknown>): ProjectRow {
  return mapDbToProject(row);
}

function toDbRow(line: Record<string, unknown>, meta: { userEmail: string; now: string; isNew: boolean }) {
  return {
    record_id: line.record_id ?? generateRecordId(),
    project_id: line.project_id,
    project_owner: normalizeProjectValue(line.project_owner),
    activity_type: normalizeProjectValue(line.activity_type),
    client_name: normalizeProjectValue(line.client_name),
    so_no: normalizeProjectValue(line.so_no),
    fg_code: normalizeProjectValue(line.fg_code),
    product_name: normalizeProjectValue(line.product_name),
    batch_instance_id: normalizeProjectValue(line.batch_instance_id),
    unique_batch: normalizeProjectValue(line.unique_batch),
    mo_instance_id: normalizeProjectValue(line.mo_instance_id),
    mo_control_no: normalizeProjectValue(line.mo_control_no),
    po_instance_id: normalizeProjectValue(line.po_instance_id ?? generateHierarchyId("PO")),
    po_control_no: normalizeProjectValue(line.po_control_no),
    fg_month: (() => {
      const raw = normalizeProjectValue(line.fg_month);
      return raw === NA_VALUE ? raw : normalizeStoredFgMonth(raw) || raw;
    })(),
    business_unit: normalizeProjectValue(line.business_unit),
    updatedDocsVer: normalizeProjectValue(line.updatedDocsVer),
    order_quantity: normalizeProjectValue(line.order_quantity),
    uom: normalizeProjectValue(line.uom),
    prod_ver: normalizeProjectValue(line.prod_ver),
    cnf_reference: normalizeProjectValue(line.cnf_reference),
    qrmr_ref_no: normalizeProjectValue(line.qrmr_ref_no),
    qrmr_status: normalizeProjectValue(line.qrmr_status),
    qrmr_target_date: normalizeProjectValue(line.qrmr_target_date),
    change_description: normalizeProjectValue(line.change_description),
    cnf_status: normalizeProjectValue(line.cnf_status),
    client_approval_target_date: normalizeProjectValue(line.client_approval_target_date),
    remarks: normalizeProjectValue(line.remarks),
    cnf_entries_json: String(line.cnf_entries_json ?? "[]"),
    manufacturing_start_week: normalizeProjectValue(line.manufacturing_start_week),
    mo_bmr_po_submission_status: normalizeProjectValue(line.mo_bmr_po_submission_status),
    mo_bmr_po_target_date: normalizeProjectValue(line.mo_bmr_po_target_date),
    mo_bmr_po_activation_status: normalizeProjectValue(line.mo_bmr_po_activation_status),
    mo_bmr_po_activation_date: normalizeProjectValue(line.mo_bmr_po_activation_date),
    tsd_remarks: normalizeProjectValue(line.tsd_remarks),
    protocol_no: normalizeProjectValue(line.protocol_no),
    protocol_Status: normalizeProjectValue(line.protocol_Status),
    protocol_target_date: normalizeProjectValue(line.protocol_target_date),
    Val_Activity: normalizeProjectValue(line.Val_Activity),
    Val_Stability: normalizeProjectValue(line.Val_Stability),
    Val_Batch_Seq_No: normalizeProjectValue(line.Val_Batch_Seq_No),
    Val_Strategy: normalizeProjectValue(line.Val_Strategy),
    Val_Strategy_remarks: normalizeProjectValue(line.Val_Strategy_remarks),
    val_interim_report_no: normalizeProjectValue(line.val_interim_report_no),
    val_interim_report_status: normalizeProjectValue(line.val_interim_report_status),
    val_interim_report_target_date: normalizeProjectValue(line.val_interim_report_target_date),
    validation_report_no: normalizeProjectValue(line.validation_report_no),
    validation_report_status: normalizeProjectValue(line.validation_report_status),
    validation_report_target_date: normalizeProjectValue(line.validation_report_target_date),
    endorsement_report_no: normalizeProjectValue(line.endorsement_report_no),
    endorsement_report_status: normalizeProjectValue(line.endorsement_report_status),
    endorsement_acceptance_target_date: normalizeProjectValue(line.endorsement_acceptance_target_date),
    val_report_no: normalizeProjectValue(line.validation_report_no),
    report_sub_status: normalizeProjectValue(line.validation_report_status),
    report_target_date: normalizeProjectValue(line.validation_report_target_date),
    ar_availability_date: normalizeProjectValue(line.ar_availability_date),
    qc_remarks: normalizeProjectValue(line.qc_remarks),
    packaging_schedule: normalizeProjectValue(line.packaging_schedule),
    final_status: normalizeProjectValue(line.final_status),
    final_status_other: normalizeProjectValue(line.final_status_other),
    created_by: meta.isNew ? meta.userEmail : undefined,
    created_at: meta.isNew ? meta.now : undefined,
    updated_by: meta.userEmail,
    updated_at: meta.now,
    is_active: true,
  };
}

export async function listActiveProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabase.from("cnf_projects").select("*").eq("is_active", true);
  if (error) throw error;
  return (data ?? []).map(mapDbRow);
}

export async function listArchivedProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabase.from("cnf_projects").select("*").eq("is_active", false);
  if (error) throw error;
  return (data ?? []).map(mapDbRow);
}

export async function getProjectById(projectId: string): Promise<ProjectHierarchy | null> {
  const normalizedProjectId = projectId.trim();
  if (!normalizedProjectId || valueOrNA(normalizedProjectId) === NA_VALUE) {
    return null;
  }

  const { data, error } = await supabase
    .from("cnf_projects")
    .select("*")
    .eq("project_id", normalizedProjectId)
    .eq("is_active", true);
  if (error) throw error;
  return buildProjectHierarchy((data ?? []).map(mapDbRow));
}

export function filterProjectRows(rows: ProjectRow[], filters: ProjectFilters): ProjectRow[] {
  const filtered = rows.filter((row) => {
    const search = filters.search?.toLowerCase();
    if (search) {
      const blob = [
        row.project_id, row.project_owner, row.client_name, row.product_name,
        row.so_no, row.fg_code, row.unique_batch, row.mo_control_no, row.po_control_no,
        row.cnf_reference, row.final_status,
      ].join(" ").toLowerCase();
      if (!blob.includes(search)) return false;
    }
    if (filters.owner && valueOrNA(row.project_owner) !== filters.owner) return false;
    if (filters.activity_type && valueOrNA(row.activity_type) !== filters.activity_type) return false;
    if (filters.cnf_status && valueOrNA(row.cnf_status) !== filters.cnf_status) return false;
    if (filters.final_status && valueOrNA(row.final_status) !== filters.final_status) return false;
    if (filters.fg_month || filters.fg_year) {
      if (!monthYearMatches(row.fg_month, filters.fg_month, filters.fg_year)) return false;
    }
    if (filters.due_window) {
      const days = projectRowFgDays(row);
      const isOpen = isOpenFinalStatus(row.final_status);
      if (!rowMatchesDueWindow(days, isOpen, filters.due_window)) return false;
    }
    if (filters.pending_role) {
      const isOpen = isOpenFinalStatus(row.final_status);
      if (!isOpen || !hasMissingFieldsForGroup(row, filters.pending_role as FocusGroup)) return false;
    }
    if (filters.drill === "pending_cnf") {
      if (!isOpenFinalStatus(row.final_status)) return false;
      if (valueOrNA(row.cnf_status) === "Approved") return false;
    }
    if (filters.drill === "pending_protocol") {
      if (!isOpenFinalStatus(row.final_status)) return false;
      if (isApprovedOrNotApplicableStatus(row.protocol_Status)) return false;
    }
    if (filters.drill === "pending_report") {
      if (!isOpenFinalStatus(row.final_status)) return false;
      if (isApprovedOrNotApplicableStatus(row.validation_report_status)) return false;
    }
    if (filters.delivery_status === "on_time" || filters.delivery_status === "late") {
      if (projectRowFgDeliveryStatus(row) !== filters.delivery_status) return false;
    }
    return true;
  });

  if (filters.sort) {
    const field = filters.sort as keyof ProjectRow;
    const dir = filters.order === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const av = String(a[field] ?? "");
      const bv = String(b[field] ?? "");
      return av.localeCompare(bv) * dir;
    });
  }

  return [...filtered].sort(compareProjectPriority);
}

export interface ProjectSaveOptions {
  dateAdjustmentsConfirmed?: boolean;
}

function assertDateAdjustmentsConfirmed(
  baseline: ProjectHierarchy | null,
  payload: ProjectHierarchy,
  options?: ProjectSaveOptions,
) {
  if (!baseline) return;
  const requiredChanges = collectProjectDateChanges(baseline, payload);
  if (requiredChanges.length && !options?.dateAdjustmentsConfirmed) {
    throw new Error("Date adjustments require a documented reason before saving.");
  }
}

async function ensureProjectEndorsementTracker(
  projectId: string,
  payload: ProjectHierarchy,
  canonicalRecordId: string,
  userEmail: string,
): Promise<{ endorsement_tracker_id?: string; endorsement_record_id?: string }> {
  const canonicalPo = payload.batches[0]?.mo_controls[0]?.po_controls[0];
  if (!canonicalPo || !canonicalRecordId) return {};
  try {
    const ensured = await ensureEndorsementFromProjectSave({
      project: {
        project_id: projectId,
        record_id: canonicalRecordId,
        product_name: payload.product_name,
        fg_code: payload.fg_code,
        endorsement_report_no: canonicalPo.endorsement_report_no,
        endorsement_report_status: canonicalPo.endorsement_report_status,
        cnf_reference: canonicalPo.cnf_reference,
      },
      userEmail,
    });
    if (!ensured) return {};
    return {
      endorsement_tracker_id: ensured.endorsement_tracker_id,
      endorsement_record_id: ensured.record_id,
    };
  } catch (error) {
    throw new Error(
      formatServiceError(error, "Project saved, but endorsement tracker could not be created or linked."),
    );
  }
}

export async function saveProject(payload: ProjectHierarchy, userEmail: string) {
  const projectId =
    valueOrNA(payload.project_id) === NA_VALUE
      ? await getNextProjectId()
      : payload.project_id.trim();
  const link = await getProjectCnfLink(projectId);
  let payloadToSave = { ...payload, project_id: projectId };
  await validateChildProjectCnfSave(projectId, payloadToSave, link, userEmail);
  if (link?.link_status === "linked") {
    payloadToSave = await enforceLinkedChildCnfOnSave(projectId, payloadToSave, link, userEmail);
  }

  const duplicateSoNumbers = await findDuplicateSoNumbers(payloadToSave);
  if (duplicateSoNumbers.length) {
    throw new Error(`SO No. already exists on another active project: ${duplicateSoNumbers.join(", ")}`);
  }

  const lines = flattenProjectPayload(payloadToSave, projectId);
  if (!lines.length) throw new Error("At least one PO control line is required.");

  const now = new Date().toISOString();
  const dbRows = lines.map((line) => toDbRow(line, { userEmail, now, isNew: true }));

  const { error } = await supabase.from("cnf_projects").insert(dbRows.map((row) => mapProjectToDb(row)));
  if (error) {
    throw new Error(formatServiceError(error, "Failed to save project to the database."));
  }

  for (const row of dbRows) {
    await logAuditEntries("Projects", "CREATE", row.record_id as string, projectId, {}, row, "Project created", userEmail);
  }

  await syncLinkedTrackersFromProject(
    projectId,
    projectSnapshotForTrackerSync({ ...payloadToSave, project_id: projectId }),
    userEmail,
  );

  const endorsement = await ensureProjectEndorsementTracker(
    projectId,
    payloadToSave,
    String(dbRows[0]?.record_id ?? ""),
    userEmail,
  );

  return { project_id: projectId, records: dbRows, ...endorsement };
}

/** Creates an OPEN project with one blank PO line (spreadsheet “Add row”). */
export async function createBlankProject(userEmail: string, projectOwner = "") {
  const result = await saveProject(emptyProjectHierarchy(projectOwner), userEmail);
  emitProjectDataChanged({ projectId: result.project_id, action: "create" });
  return result;
}

export async function updateProject(
  projectId: string,
  payload: ProjectHierarchy,
  userEmail: string,
  options?: ProjectSaveOptions,
) {
  const { data: existingData, error: fetchError } = await supabase
    .from("cnf_projects")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_active", true);
  if (fetchError) throw fetchError;

  const existing = (existingData ?? []).map(mapDbRow);
  if (!existing.length) throw new Error(`Project ${projectId} not found.`);

  const existingHierarchy = buildProjectHierarchy(existing);
  assertDateAdjustmentsConfirmed(existingHierarchy, payload, options);

  const link = await getProjectCnfLink(projectId);
  let payloadToSave = payload;
  await validateChildProjectCnfSave(projectId, payloadToSave, link, userEmail);
  if (link?.link_status === "linked") {
    payloadToSave = await enforceLinkedChildCnfOnSave(projectId, payloadToSave, link, userEmail);
  }

  const duplicateSoNumbers = await findDuplicateSoNumbers(payloadToSave, projectId);
  if (duplicateSoNumbers.length) {
    throw new Error(`SO No. already exists on another active project: ${duplicateSoNumbers.join(", ")}`);
  }

  const lines = flattenProjectPayload(payloadToSave, projectId);
  if (!lines.length) throw new Error("At least one PO control line is required.");

  const now = new Date().toISOString();
  const existingByKey: Record<string, ProjectRow> = {};
  for (const row of existing) existingByKey[poLineKey(row)] = row;

  const incomingKeys = new Set<string>();
  let canonicalRecordId = "";

  for (const line of lines) {
    const key = poLineKey(line);
    incomingKeys.add(key);
    const prior = existingByKey[key];
    const dbRow = toDbRow({ ...line, record_id: prior?.record_id }, { userEmail, now, isNew: !prior });
    if (!canonicalRecordId) canonicalRecordId = String(dbRow.record_id ?? prior?.record_id ?? "");

    if (prior) {
      const { error } = await supabase.from("cnf_projects").update(mapProjectToDb(dbRow)).eq("record_id", prior.record_id);
      if (error) throw error;
      await logAuditDiff("Projects", "UPDATE", prior.record_id, projectId, prior as unknown as Record<string, unknown>, dbRow, userEmail);
    } else {
      const { error } = await supabase.from("cnf_projects").insert(mapProjectToDb(dbRow));
      if (error) throw error;
      await logAuditEntries("Projects", "CREATE", dbRow.record_id as string, projectId, {}, dbRow, "PO line added", userEmail);
    }
  }

  for (const row of existing) {
    const key = poLineKey(row);
    if (!incomingKeys.has(key)) {
      const updates = { is_active: false, updated_by: userEmail, updated_at: now };
      const { error } = await supabase.from("cnf_projects").update(updates).eq("record_id", row.record_id);
      if (error) throw error;
      await logAuditEntries("Projects", "DELETE", row.record_id, projectId, row as unknown as Record<string, unknown>, {}, "PO line removed", userEmail);
    }
  }

  await propagateMotherCnfToLinkedChildren(projectId, payloadToSave, userEmail);

  await syncLinkedTrackersFromProject(
    projectId,
    projectSnapshotForTrackerSync({ ...payloadToSave, project_id: projectId }),
    userEmail,
  );

  const endorsement = await ensureProjectEndorsementTracker(
    projectId,
    payloadToSave,
    canonicalRecordId,
    userEmail,
  );

  return { project_id: projectId, ...endorsement };
}

export async function archiveProject(projectId: string, userEmail: string) {
  const { data, error: fetchError } = await supabase
    .from("cnf_projects")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_active", true);
  if (fetchError) throw fetchError;

  const existing = (data ?? []).map(mapDbRow);
  if (!existing.length) throw new Error(`Project ${projectId} not found.`);

  const now = new Date().toISOString();
  for (const row of existing) {
    const { error } = await supabase
      .from("cnf_projects")
      .update({ is_active: false, updated_by: userEmail, updated_at: now })
      .eq("record_id", row.record_id);
    if (error) throw error;
    await logAuditEntries("Projects", "DELETE", row.record_id, projectId, row as unknown as Record<string, unknown>, {}, "Project archived", userEmail);
  }
}

export async function restoreProject(projectId: string, userEmail: string) {
  const { data, error: fetchError } = await supabase
    .from("cnf_projects")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_active", false);
  if (fetchError) throw fetchError;

  const existing = (data ?? []).map(mapDbRow);
  if (!existing.length) throw new Error(`No archived records found for project ${projectId}.`);

  const now = new Date().toISOString();
  for (const row of existing) {
    const updates = { is_active: true, updated_by: userEmail, updated_at: now };
    const { error } = await supabase
      .from("cnf_projects")
      .update(updates)
      .eq("record_id", row.record_id);
    if (error) throw error;
    await logAuditDiff(
      "Projects",
      "UPDATE",
      row.record_id,
      projectId,
      row as unknown as Record<string, unknown>,
      { ...row, ...updates } as unknown as Record<string, unknown>,
      userEmail,
    );
  }
}

export function findDuplicateProjects(rows: ProjectRow[], payload: ProjectHierarchy): ProjectRow[] {
  const client = valueOrNA(payload.client_name).toLowerCase();
  const product = valueOrNA(payload.product_name).toLowerCase();
  return rows.filter((row) => {
    if (idsEqual(row.project_id, payload.project_id)) return false;
    return valueOrNA(row.client_name).toLowerCase() === client &&
      valueOrNA(row.product_name).toLowerCase() === product;
  });
}

export function isActiveRow(row: ProjectRow): boolean {
  return isActiveValue(row.is_active);
}
