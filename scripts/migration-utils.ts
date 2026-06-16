/**
 * Shared helpers for Google Sheets → Supabase migration scripts.
 */

export const PROJECT_SHEET_HEADERS = [
  "Record ID",
  "project_id",
  "project_owner",
  "activity_type",
  "client_name",
  "so_no",
  "fg_code",
  "product_name",
  "batch_instance_id",
  "unique_batch",
  "mo_instance_id",
  "mo_control_no",
  "po_instance_id",
  "po_control_no",
  "fg_month",
  "business_unit",
  "updatedDocsVer",
  "order_quantity",
  "uom",
  "prod_ver",
  "cnf_reference",
  "qrmr_ref_no",
  "change_description",
  "cnf_status",
  "client_approval_target_date",
  "remarks",
  "cnf_entries_json",
  "manufacturing_start_week",
  "mo_bmr_po_submission_status",
  "mo_bmr_po_target_date",
  "mo_bmr_po_activation_status",
  "mo_bmr_po_activation_date",
  "protocol_no",
  "protocol_Status",
  "protocol_target_date",
  "Val_Activity",
  "Val_Stability",
  "Val_Batch_Seq_No",
  "Val_Strategy",
  "Val_Strategy_remarks",
  "val_interim_report_no",
  "val_interim_report_status",
  "val_interim_report_target_date",
  "validation_report_no",
  "validation_report_status",
  "validation_report_target_date",
  "endorsement_report_no",
  "endorsement_report_status",
  "endorsement_acceptance_target_date",
  "val_report_no",
  "Report_Sub_Status",
  "Report_target_Date",
  "ar_availability_date",
  "packaging_schedule",
  "final_status",
  "final_status_other",
  "Created By",
  "Created At",
  "Updated By",
  "Updated At",
  "Is Active",
] as const;

export const SUPPORT_SHEET_HEADERS = [
  "activity_id",
  "project_id",
  "activity_kind",
  "Department",
  "Material",
  "Line",
  "Bulk",
  "Machinability_Protocol",
  "Machinability_Protocol_Status",
  "Machinability_Report",
  "Machinability_Report_Status",
  "Product_User",
  "Principal",
  "Product",
  "Target_Date",
  "Planning_Schedule",
  "Created By",
  "Created At",
  "Updated By",
  "Updated At",
  "Is Active",
] as const;

export function cleanValue(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  const text = String(value).trim();
  if (text === "" || text.toUpperCase() === "N/A") return "N/A";
  return text;
}

export function toBool(value: unknown, defaultValue = true): boolean {
  if (value === null || value === undefined || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  const text = String(value).trim().toUpperCase();
  if (text === "TRUE" || text === "1" || text === "YES" || text === "Y") return true;
  if (text === "FALSE" || text === "0" || text === "NO" || text === "N") return false;
  return defaultValue;
}

export function toTimestamp(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return new Date().toISOString();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const text = String(value).trim();
  if (!text) return new Date().toISOString();
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date().toISOString();
}

export function rowHasData(row: Record<string, unknown>): boolean {
  return Object.values(row).some((value) => {
    if (value === null || value === undefined) return false;
    return String(value).trim() !== "";
  });
}

function mapLegacyReportStatus(value: unknown): string {
  const cleaned = cleanValue(value);
  if (cleaned === "Client Approval") return "Routing";
  return cleaned;
}

export function mapProjectRow(row: Record<string, unknown>) {
  const recordId = cleanValue(row["Record ID"] ?? row.record_id);
  const projectId = cleanValue(row.project_id);

  return {
    record_id: recordId,
    project_id: projectId,
    project_owner: cleanValue(row.project_owner),
    activity_type: cleanValue(row.activity_type),
    client_name: cleanValue(row.client_name),
    so_no: cleanValue(row.so_no),
    fg_code: cleanValue(row.fg_code),
    product_name: cleanValue(row.product_name),
    batch_instance_id: cleanValue(row.batch_instance_id),
    unique_batch: cleanValue(row.unique_batch),
    mo_instance_id: cleanValue(row.mo_instance_id),
    mo_control_no: cleanValue(row.mo_control_no),
    po_instance_id: cleanValue(row.po_instance_id),
    po_control_no: cleanValue(row.po_control_no),
    fg_month: cleanValue(row.fg_month),
    business_unit: cleanValue(row.business_unit),
    updateddocsver: cleanValue(row.updatedDocsVer ?? row.updateddocsver),
    order_quantity: cleanValue(row.order_quantity),
    uom: cleanValue(row.uom),
    prod_ver: cleanValue(row.prod_ver),
    cnf_reference: cleanValue(row.cnf_reference),
    qrmr_ref_no: cleanValue(row.qrmr_ref_no),
    change_description: cleanValue(row.change_description),
    cnf_status: cleanValue(row.cnf_status),
    client_approval_target_date: cleanValue(row.client_approval_target_date),
    remarks: cleanValue(row.remarks),
    cnf_entries_json:
      cleanValue(row.cnf_entries_json) === "N/A" ? "[]" : cleanValue(row.cnf_entries_json),
    manufacturing_start_week: cleanValue(row.manufacturing_start_week),
    mo_bmr_po_submission_status: cleanValue(row.mo_bmr_po_submission_status),
    mo_bmr_po_target_date: cleanValue(row.mo_bmr_po_target_date),
    mo_bmr_po_activation_status: cleanValue(row.mo_bmr_po_activation_status),
    mo_bmr_po_activation_date: cleanValue(row.mo_bmr_po_activation_date),
    protocol_no: cleanValue(row.protocol_no),
    protocol_status: cleanValue(row.protocol_Status ?? row.protocol_status),
    protocol_target_date: cleanValue(row.protocol_target_date),
    val_activity: cleanValue(row.Val_Activity ?? row.val_activity),
    val_stability: cleanValue(row.Val_Stability ?? row.val_stability),
    val_batch_seq_no: cleanValue(row.Val_Batch_Seq_No ?? row.val_batch_seq_no),
    val_strategy: cleanValue(row.Val_Strategy ?? row.val_strategy),
    val_strategy_remarks: cleanValue(row.Val_Strategy_remarks ?? row.val_strategy_remarks),
    val_interim_report_no: cleanValue(row.val_interim_report_no),
    val_interim_report_status: cleanValue(row.val_interim_report_status),
    val_interim_report_target_date: cleanValue(row.val_interim_report_target_date),
    validation_report_no: cleanValue(row.validation_report_no ?? row.val_report_no),
    validation_report_status: mapLegacyReportStatus(
      row.validation_report_status ?? row.Report_Sub_Status ?? row.report_sub_status,
    ),
    validation_report_target_date: cleanValue(
      row.validation_report_target_date ?? row.Report_target_Date ?? row.report_target_date,
    ),
    endorsement_report_no: cleanValue(row.endorsement_report_no),
    endorsement_report_status: cleanValue(row.endorsement_report_status),
    endorsement_acceptance_target_date: cleanValue(row.endorsement_acceptance_target_date),
    val_report_no: cleanValue(row.validation_report_no ?? row.val_report_no),
    report_sub_status: mapLegacyReportStatus(
      row.validation_report_status ?? row.Report_Sub_Status ?? row.report_sub_status,
    ),
    report_target_date: cleanValue(
      row.validation_report_target_date ?? row.Report_target_Date ?? row.report_target_date,
    ),
    ar_availability_date: cleanValue(row.ar_availability_date),
    packaging_schedule: cleanValue(row.packaging_schedule),
    final_status: cleanValue(row.final_status),
    final_status_other: cleanValue(row.final_status_other),
    created_by: cleanValue(row["Created By"] ?? row.created_by),
    created_at: toTimestamp(row["Created At"] ?? row.created_at),
    updated_by: cleanValue(row["Updated By"] ?? row.updated_by),
    updated_at: toTimestamp(row["Updated At"] ?? row.updated_at),
    is_active: toBool(row["Is Active"] ?? row.is_active, true),
  };
}

export function mapSupportRow(row: Record<string, unknown>) {
  return {
    activity_id: cleanValue(row.activity_id),
    project_id: cleanValue(row.project_id),
    activity_kind: cleanValue(row.activity_kind),
    department: cleanValue(row.Department ?? row.department),
    material: cleanValue(row.Material ?? row.material),
    line: cleanValue(row.Line ?? row.line),
    bulk: cleanValue(row.Bulk ?? row.bulk),
    machinability_protocol: cleanValue(row.Machinability_Protocol ?? row.machinability_protocol),
    machinability_protocol_status: cleanValue(
      row.Machinability_Protocol_Status ?? row.machinability_protocol_status,
    ),
    machinability_report: cleanValue(row.Machinability_Report ?? row.machinability_report),
    machinability_report_status: cleanValue(
      row.Machinability_Report_Status ?? row.machinability_report_status,
    ),
    product_user: cleanValue(row.Product_User ?? row.product_user),
    principal: cleanValue(row.Principal ?? row.principal),
    product: cleanValue(row.Product ?? row.product),
    target_date: cleanValue(row.Target_Date ?? row.target_date),
    planning_schedule: cleanValue(row.Planning_Schedule ?? row.planning_schedule),
    created_by: cleanValue(row["Created By"] ?? row.created_by),
    created_at: toTimestamp(row["Created At"] ?? row.created_at),
    updated_by: cleanValue(row["Updated By"] ?? row.updated_by),
    updated_at: toTimestamp(row["Updated At"] ?? row.updated_at),
    is_active: toBool(row["Is Active"] ?? row.is_active, true),
  };
}

export function validateProjectRows(rows: ReturnType<typeof mapProjectRow>[]) {
  const errors: string[] = [];
  const ids = new Set<string>();

  rows.forEach((row, index) => {
    const line = index + 2;
    if (row.record_id === "N/A") errors.push(`Row ${line}: missing Record ID`);
    if (row.project_id === "N/A") errors.push(`Row ${line}: missing project_id`);
    if (row.record_id !== "N/A" && ids.has(row.record_id)) {
      errors.push(`Row ${line}: duplicate Record ID ${row.record_id}`);
    }
    if (row.record_id !== "N/A") ids.add(row.record_id);
  });

  return errors;
}

export function validateSupportRows(rows: ReturnType<typeof mapSupportRow>[]) {
  const errors: string[] = [];
  const ids = new Set<string>();

  rows.forEach((row, index) => {
    const line = index + 2;
    if (row.activity_id === "N/A") errors.push(`Row ${line}: missing activity_id`);
    if (row.project_id === "N/A") errors.push(`Row ${line}: missing project_id`);
    if (row.activity_id !== "N/A" && ids.has(row.activity_id)) {
      errors.push(`Row ${line}: duplicate activity_id ${row.activity_id}`);
    }
    if (row.activity_id !== "N/A") ids.add(row.activity_id);
  });

  return errors;
}

export type SheetTable = "projects" | "support";

export function detectTableFromHeaders(headers: string[]): SheetTable | null {
  const normalized = headers.map((h) => String(h ?? "").trim());
  if (normalized.includes("Record ID") || normalized.includes("record_id")) return "projects";
  if (normalized.includes("activity_id")) return "support";
  return null;
}
