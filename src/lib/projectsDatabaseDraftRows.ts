import { PROJECTS_DB_DATA_COLUMNS } from "@/lib/projectsDatabaseColumns";
import { valueOrNA } from "@/lib/utils";
import type { ProjectRow } from "@/types";

export interface DraftCellEdit {
  recordId: string;
  projectId: string;
  field: string;
  oldValue: string;
  newValue: string;
}

/** Local-only ids until Save creates real PROJ-YYYY-NNN records. */
export const DRAFT_SPREADSHEET_ID_PREFIX = "__draft__";

let draftSeq = 0;

export function isDraftSpreadsheetId(id: string | undefined | null): boolean {
  return Boolean(id && String(id).startsWith(DRAFT_SPREADSHEET_ID_PREFIX));
}

export function isDraftProjectRow(row: Pick<ProjectRow, "project_id" | "record_id">): boolean {
  return isDraftSpreadsheetId(row.project_id) || isDraftSpreadsheetId(row.record_id);
}

function isMeaningfulCellValue(value: unknown): boolean {
  const text = String(value ?? "").trim();
  return Boolean(text) && valueOrNA(text) !== "N/A";
}

/**
 * True when the row has no user-entered spreadsheet content.
 * Prefills (default owner, OPEN final status) do not count as content.
 */
export function isBlankDraftProjectRow(
  row: ProjectRow,
  defaultProjectOwner = "",
): boolean {
  for (const column of PROJECTS_DB_DATA_COLUMNS) {
    const value = (row as unknown as Record<string, unknown>)[column.field];
    if (column.field === "project_owner") {
      const owner = String(value ?? "").trim();
      if (!owner || owner === defaultProjectOwner) continue;
      if (isMeaningfulCellValue(owner)) return false;
      continue;
    }
    if (column.field === "final_status") {
      const status = String(value ?? "").trim();
      if (!status || status === "OPEN") continue;
      if (isMeaningfulCellValue(status)) return false;
      continue;
    }
    if (isMeaningfulCellValue(value)) return false;
  }
  return true;
}

export function createBlankProjectRow(projectOwner = ""): ProjectRow {
  draftSeq += 1;
  const id = `${DRAFT_SPREADSHEET_ID_PREFIX}${draftSeq}`;
  return {
    record_id: id,
    project_id: id,
    project_owner: projectOwner,
    activity_type: "",
    client_name: "",
    so_no: "",
    fg_code: "",
    product_name: "",
    batch_instance_id: "",
    unique_batch: "",
    mo_instance_id: "",
    mo_control_no: "",
    po_instance_id: "",
    po_control_no: "",
    fg_month: "",
    business_unit: "",
    updatedDocsVer: "",
    order_quantity: "",
    uom: "",
    prod_ver: "",
    cnf_reference: "",
    qrmr_ref_no: "",
    qrmr_status: "",
    qrmr_target_date: "",
    risk_control: "",
    change_description: "",
    cnf_status: "",
    client_approval_target_date: "",
    remarks: "",
    cnf_entries_json: "",
    manufacturing_start_week: "",
    mo_bmr_po_submission_status: "",
    mo_bmr_po_target_date: "",
    mo_bmr_po_activation_status: "",
    mo_bmr_po_activation_date: "",
    tsd_remarks: "",
    protocol_no: "",
    protocol_Status: "",
    protocol_target_date: "",
    Val_Activity: "",
    Val_Stability: "",
    Val_Batch_Seq_No: "",
    Val_Strategy: "",
    Val_Strategy_remarks: "",
    val_interim_report_no: "",
    val_interim_report_status: "",
    val_interim_report_target_date: "",
    validation_report_no: "",
    validation_report_status: "",
    validation_report_target_date: "",
    endorsement_report_no: "",
    endorsement_report_status: "",
    endorsement_acceptance_target_date: "",
    ar_availability_date: "",
    qc_remarks: "",
    packaging_schedule: "",
    final_status: "OPEN",
    final_status_other: "",
    created_by: "",
    created_at: "",
    updated_by: "",
    updated_at: "",
    is_active: true,
  };
}

function sameDraftIds(a: ProjectRow[], b: ProjectRow[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, index) => row.record_id === b[index]?.record_id);
}

function applyDraftEditsToRow(row: ProjectRow, edits: DraftCellEdit[]): ProjectRow {
  let next: ProjectRow | null = null;
  for (const edit of edits) {
    if (edit.recordId !== row.record_id) continue;
    if (!next) next = { ...row };
    (next as unknown as Record<string, string>)[edit.field] = edit.newValue;
  }
  return next ?? row;
}

/**
 * Keep filled draft rows, then enough trailing blank rows to fill the viewport
 * (always at least one trailing blank for continuous entry).
 */
export function reconcileDraftProjectRows(
  current: ProjectRow[],
  dirtyEdits: DraftCellEdit[],
  existingRowCount: number,
  viewportRowCapacity: number,
  defaultProjectOwner = "",
): ProjectRow[] {
  const capacity = Math.max(1, viewportRowCapacity);
  const filled: ProjectRow[] = [];
  const blanks: ProjectRow[] = [];

  for (const shell of current) {
    const view = applyDraftEditsToRow(shell, dirtyEdits);
    if (isBlankDraftProjectRow(view, defaultProjectOwner)) blanks.push(shell);
    else filled.push(shell);
  }

  const minDraftCount = Math.max(filled.length + 1, capacity - existingRowCount);
  const blankNeeded = Math.max(1, minDraftCount - filled.length);
  while (blanks.length < blankNeeded) {
    blanks.push(createBlankProjectRow(defaultProjectOwner));
  }

  const next = [...filled, ...blanks.slice(0, blankNeeded)];
  return sameDraftIds(current, next) ? current : next;
}

export function groupDraftEditsByRecord(
  dirtyEdits: DraftCellEdit[],
): Map<string, DraftCellEdit[]> {
  const byRecord = new Map<string, DraftCellEdit[]>();
  for (const edit of dirtyEdits) {
    if (!isDraftSpreadsheetId(edit.projectId) && !isDraftSpreadsheetId(edit.recordId)) {
      continue;
    }
    const list = byRecord.get(edit.recordId) ?? [];
    list.push(edit);
    byRecord.set(edit.recordId, list);
  }
  return byRecord;
}

export function estimateProjectsDbViewportRows(
  shellHeightPx: number,
  headerHeightPx: number,
  rowHeightPx: number,
): number {
  const body = Math.max(0, shellHeightPx - Math.max(0, headerHeightPx));
  const rowHeight = Math.max(24, rowHeightPx);
  return Math.max(1, Math.floor(body / rowHeight));
}
