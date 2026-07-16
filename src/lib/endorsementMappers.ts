import { APP_DATE_DISPLAY_FORMAT, parseAppDateValue } from "@/lib/date";
import { toEditableNaField } from "@/lib/naField";
import type {
  EndorsementTrackerItem,
  EndorsementTrackerRecord,
  ReusableOption,
} from "@/types/endorsementTracker";
import type { SupportActivity } from "@/types/supportActivity";

function str(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  return String(value);
}

function dateToDisplay(value: unknown): string {
  if (value == null || value === "") return "";
  const parsed = parseAppDateValue(String(value));
  return parsed ? parsed.format(APP_DATE_DISPLAY_FORMAT) : String(value);
}

function displayToIsoDate(value: unknown): string | null {
  if (value == null || String(value).trim() === "" || String(value).trim().toUpperCase() === "N/A") {
    return null;
  }
  const parsed = parseAppDateValue(String(value));
  return parsed ? parsed.format("YYYY-MM-DD") : null;
}

export function mapDbToSupport(row: Record<string, unknown>): SupportActivity {
  return {
    activity_id: str(row.activity_id),
    project_id: str(row.project_id),
    activity_kind: str(row.activity_kind),
    Department: toEditableNaField(row.department),
    Material: toEditableNaField(row.material),
    Line: toEditableNaField(row.line),
    Bulk: toEditableNaField(row.bulk),
    Machinability_Protocol: toEditableNaField(row.machinability_protocol),
    Machinability_Protocol_Status: toEditableNaField(row.machinability_protocol_status),
    Machinability_Report: toEditableNaField(row.machinability_report),
    Machinability_Report_Status: toEditableNaField(row.machinability_report_status),
    Product_User: toEditableNaField(row.product_user),
    Principal: toEditableNaField(row.principal),
    Product: toEditableNaField(row.product),
    Target_Date: str(row.target_date),
    Planning_Schedule: str(row.planning_schedule),
    status: toEditableNaField(row.status),
    status_date: dateToDisplay(row.status_date),
    cnf_tracker_record_id: row.cnf_tracker_record_id ? str(row.cnf_tracker_record_id) : null,
    cnf_link_state: (str(row.cnf_link_state, "unset") as SupportActivity["cnf_link_state"]) || "unset",
    cnf_number_display: toEditableNaField(row.cnf_number_display),
    non_process_description: toEditableNaField(row.non_process_description),
    activity_type: toEditableNaField(row.activity_type),
    type_of_validation: toEditableNaField(row.type_of_validation),
    protocol_number: toEditableNaField(row.protocol_number),
    protocol_status: toEditableNaField(row.protocol_status),
    report_number: toEditableNaField(row.report_number),
    report_status: toEditableNaField(row.report_status),
    endorsement_number: toEditableNaField(row.endorsement_number),
    endorsement_status: toEditableNaField(row.endorsement_status),
    endorsement_tracker_record_id: row.endorsement_tracker_record_id
      ? str(row.endorsement_tracker_record_id)
      : null,
    sync_version: Number(row.sync_version ?? 1),
    created_by: str(row.created_by),
    created_at: str(row.created_at),
    updated_by: str(row.updated_by),
    updated_at: str(row.updated_at),
    is_active: Boolean(row.is_active),
  };
}

export function mapSupportToDb(row: Record<string, unknown>) {
  return {
    activity_id: row.activity_id,
    project_id: row.project_id,
    activity_kind: row.activity_kind,
    department: row.Department,
    material: row.Material,
    line: row.Line,
    bulk: row.Bulk,
    machinability_protocol: row.Machinability_Protocol,
    machinability_protocol_status: row.Machinability_Protocol_Status,
    machinability_report: row.Machinability_Report,
    machinability_report_status: row.Machinability_Report_Status,
    product_user: row.Product_User,
    principal: row.Principal,
    product: row.Product,
    target_date: row.Target_Date,
    planning_schedule: row.Planning_Schedule,
    status: row.status == null || String(row.status).trim() === "" ? null : row.status,
    status_date: displayToIsoDate(row.status_date),
    cnf_tracker_record_id: row.cnf_tracker_record_id || null,
    cnf_link_state: row.cnf_link_state ?? "unset",
    cnf_number_display: row.cnf_number_display ?? "",
    non_process_description: row.non_process_description ?? "",
    activity_type: row.activity_type ?? "",
    type_of_validation: row.type_of_validation ?? "",
    protocol_number: row.protocol_number ?? "",
    protocol_status: row.protocol_status ?? "",
    report_number: row.report_number ?? "",
    report_status: row.report_status ?? "",
    endorsement_number: row.endorsement_number ?? "",
    endorsement_status: row.endorsement_status ?? "",
    endorsement_tracker_record_id: row.endorsement_tracker_record_id || null,
    sync_version: row.sync_version ?? 1,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_by: row.updated_by,
    updated_at: row.updated_at,
    is_active: row.is_active,
  };
}

export function mapDbToEndorsement(row: Record<string, unknown>): EndorsementTrackerRecord {
  return {
    record_id: str(row.record_id),
    endorsement_tracker_id: str(row.endorsement_tracker_id),
    endorsement_number: str(row.endorsement_number, "N/A"),
    endorsement_status: str(row.endorsement_status, "N/A"),
    process_classification: str(row.process_classification, "unset"),
    source_type: str(row.source_type, "independent"),
    source_record_id: row.source_record_id == null ? null : str(row.source_record_id),
    project_id: row.project_id == null ? null : str(row.project_id),
    project_record_id: row.project_record_id == null ? null : str(row.project_record_id),
    cnf_tracker_record_id: row.cnf_tracker_record_id == null ? null : str(row.cnf_tracker_record_id),
    support_activity_id: row.support_activity_id == null ? null : str(row.support_activity_id),
    cnf_number_display: str(row.cnf_number_display, "N/A"),
    project_name: str(row.project_name, "N/A"),
    product_name: str(row.product_name, "N/A"),
    product_code: str(row.product_code, "N/A"),
    non_process_description: str(row.non_process_description, "N/A"),
    last_sync_source: row.last_sync_source == null ? null : str(row.last_sync_source),
    last_synced_at: row.last_synced_at == null ? null : str(row.last_synced_at),
    sync_version: Number(row.sync_version ?? 1),
    created_by: str(row.created_by),
    created_at: str(row.created_at),
    updated_by: str(row.updated_by),
    updated_at: str(row.updated_at),
    is_active: Boolean(row.is_active),
  };
}

export function mapDbToEndorsementItem(row: Record<string, unknown>): EndorsementTrackerItem {
  return {
    item_id: str(row.item_id),
    endorsement_tracker_record_id: str(row.endorsement_tracker_record_id),
    item_number: Number(row.item_number ?? 1),
    endorsement_entry: str(row.endorsement_entry),
    target_implementation_date: dateToDisplay(row.target_implementation_date),
    implemented_by: toEditableNaField(row.implemented_by),
    implementation_date: dateToDisplay(row.implementation_date),
    verified_by_validation: toEditableNaField(row.verified_by_validation),
    validation_verification_date: dateToDisplay(row.validation_verification_date),
    verified_by_qa: toEditableNaField(row.verified_by_qa),
    qa_verification_date: dateToDisplay(row.qa_verification_date),
    sort_order: Number(row.sort_order ?? 0),
    created_by: str(row.created_by),
    created_at: str(row.created_at),
    updated_by: str(row.updated_by),
    updated_at: str(row.updated_at),
    is_active: Boolean(row.is_active),
  };
}

export function mapEndorsementItemToDb(item: Partial<EndorsementTrackerItem>, userEmail: string) {
  const now = new Date().toISOString();
  return {
    item_id: item.item_id,
    endorsement_tracker_record_id: item.endorsement_tracker_record_id,
    item_number: item.item_number ?? 1,
    endorsement_entry: item.endorsement_entry ?? "",
    target_implementation_date: displayToIsoDate(item.target_implementation_date),
    implemented_by: item.implemented_by?.trim() ? item.implemented_by : "N/A",
    implementation_date: displayToIsoDate(item.implementation_date),
    verified_by_validation: item.verified_by_validation?.trim() ? item.verified_by_validation : "N/A",
    validation_verification_date: displayToIsoDate(item.validation_verification_date),
    verified_by_qa: item.verified_by_qa?.trim() ? item.verified_by_qa : "N/A",
    qa_verification_date: displayToIsoDate(item.qa_verification_date),
    sort_order: item.sort_order ?? 0,
    created_by: item.created_by ?? userEmail,
    created_at: item.created_at ?? now,
    updated_by: userEmail,
    updated_at: now,
    is_active: item.is_active ?? true,
  };
}

export function mapDbToReusableOption(row: Record<string, unknown>): ReusableOption {
  return {
    option_id: str(row.option_id),
    category: str(row.category),
    option_value: str(row.option_value),
    option_value_key: str(row.option_value_key),
    is_active: Boolean(row.is_active),
  };
}

/** Recalculate visible 1-based item numbers after add/remove; preserve stable item_id. */
export function renumberEndorsementItems<T extends { item_id: string; item_number?: number; sort_order?: number }>(
  items: T[],
): T[] {
  return items.map((item, index) => ({
    ...item,
    item_number: index + 1,
    sort_order: index,
  }));
}
