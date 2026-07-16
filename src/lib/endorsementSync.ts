/** Canonical endorsement / workflow status values for Non-Process + Endorsement Tracker. */
export const ENDORSEMENT_STATUS_OPTIONS = ["In Process", "Routing", "Done"] as const;

export const SUPPORT_ACTIVITY_STATUS_OPTIONS = ["In-process", "Planned", "Done"] as const;

export type EndorsementSourceType =
  | "process_validation_project"
  | "non_process_support_activity"
  | "independent";

export type ProcessClassification = "unset" | "process" | "non_process";

export const SYNC_MAPPED_FIELDS = [
  "endorsement_number",
  "endorsement_status",
  "cnf_tracker_record_id",
  "cnf_number_display",
  "project_id",
  "project_record_id",
  "product_name",
  "product_code",
  "non_process_description",
] as const;

export type SyncMappedField = (typeof SYNC_MAPPED_FIELDS)[number];

/** Preserve legacy "In-process" while treating "In Process" as canonical. */
export function canonicalizeEndorsementStatus(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text || text.toUpperCase() === "N/A" || text.toUpperCase() === "NA") return "";
  const key = text.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ");
  if (key === "in process") return "In Process";
  if (key === "routing") return "Routing";
  if (key === "done" || key === "approved") return key === "approved" ? text : "Done";
  return text;
}

export function isInProcessEndorsementStatus(value: unknown): boolean {
  return canonicalizeEndorsementStatus(value) === "In Process";
}

/**
 * Project VAL Endorsement Report Status values that should open Endorsement Tracker
 * after save. Any status other than blank / N/A / Not Applicable opens the tracker
 * (ensure/link when a report number exists; otherwise New or reopen existing).
 */
export function shouldOpenEndorsementTrackerFromProjectStatus(value: unknown): boolean {
  const text = String(value ?? "").trim();
  if (!text) return false;
  const key = text.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ");
  if (key === "n/a" || key === "na" || key === "not applicable") return false;
  return true;
}

/**
 * Support Non-Process Endorsement Status values that should open Endorsement Tracker
 * after save (In Process / Routing / Done).
 */
export function shouldOpenEndorsementTrackerFromSupportStatus(value: unknown): boolean {
  const canonical = canonicalizeEndorsementStatus(value);
  if (!canonical) return false;
  const key = canonical.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ");
  return key === "in process" || key === "routing" || key === "done";
}

export function pickSyncMappedFields(
  source: Record<string, unknown>,
): Partial<Record<SyncMappedField, string>> {
  const out: Partial<Record<SyncMappedField, string>> = {};
  for (const key of SYNC_MAPPED_FIELDS) {
    if (key in source && source[key] != null) {
      out[key] = String(source[key]);
    }
  }
  if (out.endorsement_status) {
    out.endorsement_status = canonicalizeEndorsementStatus(out.endorsement_status) || out.endorsement_status;
  }
  return out;
}

/**
 * Loop prevention: skip reverse sync when the last write originated from the same side
 * within the same save chain (echo suppression).
 */
export function shouldSkipEchoSync(
  lastSyncSource: string | null | undefined,
  incomingOrigin: "source" | "tracker",
): boolean {
  if (!lastSyncSource) return false;
  return lastSyncSource === incomingOrigin;
}

export function buildEndorsementPayloadFromSupport(activity: {
  activity_id?: string;
  endorsement_number?: string;
  endorsement_status?: string;
  non_process_description?: string;
  cnf_tracker_record_id?: string | null;
  cnf_number_display?: string;
}): Record<string, string> {
  return {
    endorsement_number: String(activity.endorsement_number ?? "N/A"),
    endorsement_status: canonicalizeEndorsementStatus(activity.endorsement_status) || "N/A",
    process_classification: "non_process",
    support_activity_id: String(activity.activity_id ?? ""),
    cnf_tracker_record_id: String(activity.cnf_tracker_record_id ?? ""),
    cnf_number_display: String(activity.cnf_number_display ?? "N/A"),
    non_process_description: String(activity.non_process_description ?? "N/A"),
    last_sync_source: "source",
  };
}

export function buildEndorsementPayloadFromProject(project: {
  project_id?: string;
  record_id?: string;
  product_name?: string;
  fg_code?: string;
  endorsement_report_no?: string;
  endorsement_report_status?: string;
  cnf_reference?: string;
}): Record<string, string> {
  return {
    endorsement_number: String(project.endorsement_report_no ?? "N/A"),
    endorsement_status: canonicalizeEndorsementStatus(project.endorsement_report_status) || "N/A",
    process_classification: "process",
    project_id: String(project.project_id ?? ""),
    project_record_id: String(project.record_id ?? ""),
    product_name: String(project.product_name ?? "N/A"),
    product_code: String(project.fg_code ?? "N/A"),
    cnf_number_display: String(project.cnf_reference ?? "N/A"),
    last_sync_source: "source",
  };
}
