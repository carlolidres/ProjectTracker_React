import { formatAppDate, formatAppDateTime } from "@/lib/date";
import {
  BATCH_FIELDS,
  HEADER_FIELDS,
  MO_FIELDS,
  PO_FIELDS,
  type ProjectFieldDef,
} from "@/lib/projectFormFields";
import { NA_VALUE } from "@/lib/constants";
import { isMissingValue } from "@/lib/utils";
import type { AuditLog } from "@/types";

const SUPPORT_FIELD_LABELS: Record<string, string> = {
  activity_id: "Activity ID",
  activity_kind: "Activity Kind",
  Department: "Department",
  Material: "Material",
  Line: "Line",
  Bulk: "Bulk",
  Machinability_Protocol: "Machinability Protocol",
  Machinability_Protocol_Status: "Machinability Protocol Status",
  Machinability_Report: "Machinability Report",
  Machinability_Report_Status: "Machinability Report Status",
  Product_User: "Product User",
  Principal: "Principal",
  Product: "Product",
  Target_Date: "Target Date to Execute",
  Planning_Schedule: "Planning Schedule",
  project_id: "Project ID",
  status: "Status",
  registry_type: "Registry Type",
  registry_value: "Registry Value",
  description: "Description",
};

const KNOWN_FIELDS: ProjectFieldDef[] = [...HEADER_FIELDS, ...BATCH_FIELDS, ...MO_FIELDS, ...PO_FIELDS];

function auditFieldLabel(field: string): string {
  const known = KNOWN_FIELDS.find((item) => item.key === field);
  if (known) return known.label;
  if (SUPPORT_FIELD_LABELS[field]) return SUPPORT_FIELD_LABELS[field];
  return String(field || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function auditDisplayValue(value: unknown): string {
  if (isMissingValue(value)) return "Not provided";
  const text = String(value).trim();
  if (text.toUpperCase() === "TRUE") return "Yes";
  if (text.toUpperCase() === "FALSE") return "No";
  const formattedDate = formatAppDate(text);
  if (formattedDate !== text) return formattedDate;
  return text;
}

function safeJsonParse(value: string): Record<string, unknown> | null {
  if (isMissingValue(value)) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function formatAuditActivity(row: AuditLog): string {
  const action = row.action || "";
  const module = row.module || "";
  const noun = module === "Projects"
    ? "project record"
    : module === "Support Activities"
      ? "supporting activity"
      : module === "Registry"
        ? "registry value"
        : module.toLowerCase();

  if (action === "CREATE") return `Created ${noun}`;
  if (action === "DELETE") return `Archived ${noun}`;
  if (row.field_name && row.field_name !== "ALL") {
    return `Updated ${auditFieldLabel(row.field_name)}`;
  }
  return `Updated ${noun}`;
}

export function formatAuditDetails(row: AuditLog): string {
  const field = row.field_name || "";
  const oldValue = row.old_value ?? "";
  const newValue = row.new_value ?? "";
  const remarks = row.remarks ?? "";

  if (field && field !== "ALL") {
    return `${auditFieldLabel(field)} changed from ${auditDisplayValue(oldValue)} to ${auditDisplayValue(newValue)}`;
  }

  const parsedNew = safeJsonParse(newValue);
  const parsedOld = safeJsonParse(oldValue);
  if (!parsedNew && !parsedOld) {
    if (!isMissingValue(oldValue) && !isMissingValue(newValue)) {
      return `${auditDisplayValue(oldValue)} to ${auditDisplayValue(newValue)}`;
    }
    if (!isMissingValue(newValue)) return auditDisplayValue(newValue);
    if (!isMissingValue(oldValue)) return auditDisplayValue(oldValue);
  }

  const payload = parsedNew || parsedOld;
  if (payload) {
    const summaryFields = row.module === "Support Activities"
      ? ["activity_kind", "Department", "Material", "Principal", "Product", "Target_Date"]
      : row.module === "Registry"
        ? ["registry_type", "registry_value", "description", "status"]
        : ["project_owner", "activity_type", "client_name", "product_name", "po_control_no", "fg_month", "final_status"];

    const parts = summaryFields
      .filter((key) => !isMissingValue(payload[key]))
      .slice(0, 5)
      .map((key) => `${auditFieldLabel(key)}: ${auditDisplayValue(payload[key])}`);

    if (parts.length) return parts.join(". ");
  }

  if (!isMissingValue(remarks)) return remarks;
  if (actionIsArchive(row)) return "Record archived.";
  if (row.action === "CREATE") return "Record created.";
  return "Record-level change completed.";
}

function actionIsArchive(row: AuditLog): boolean {
  return row.action === "DELETE" || /archived/i.test(row.remarks ?? "");
}

export function formatAuditTimestamp(value: string): string {
  return formatAppDateTime(value);
}

export function formatAuditProjectId(projectId: string): string {
  return isMissingValue(projectId) ? NA_VALUE : projectId;
}
