import { parseAppDateValue } from "@/lib/date";
import { isProjectFieldComplete } from "@/lib/projectPriority";
import { mapTaskStatusFromField } from "@/lib/projectManagementWorkflow";
import { isApprovedOrNotApplicableStatus, isMissingValue, valueOrNA } from "@/lib/utils";
import type { ProjectRow, SupportActivity } from "@/types";
import type { BoardStatus } from "@/features/project-management/board/boardRules";

export interface BoardTaskSeed {
  title: string;
  status: BoardStatus;
  dueDate: string;
  subtasks: Array<{ title: string; status: BoardStatus; dueDate: string }>;
}

type PmStatus = ReturnType<typeof mapTaskStatusFromField>;

function isoDate(value: unknown): string {
  const parsed = parseAppDateValue(value == null ? "" : String(value));
  return parsed ? parsed.format("YYYY-MM-DD") : "";
}

function fromPmStatus(status: PmStatus): BoardStatus {
  if (status === "Done") return "Done";
  if (status === "In-process") return "Working on it";
  if (status === "Delayed" || status === "Blocked") return "Stuck";
  return "Not Started";
}

function parentStatus(children: BoardStatus[]): BoardStatus {
  if (children.length === 0 || children.every((status) => status === "Not Started")) return "Not Started";
  if (children.every((status) => status === "Done")) return "Done";
  if (children.some((status) => status === "Stuck") && children.every((status) => status === "Stuck" || status === "Not Started")) return "Stuck";
  return "Working on it";
}

function pack(title: string, subtasks: BoardTaskSeed["subtasks"], dueDate: string): BoardTaskSeed {
  return { title, status: parentStatus(subtasks.map((item) => item.status)), dueDate, subtasks };
}

function latestRow(rows: ProjectRow[]): ProjectRow | undefined {
  return [...rows].sort((a, b) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0))[0];
}

function statusOf(complete: boolean, rawStatus: string, hasValue: boolean): BoardStatus {
  return fromPmStatus(mapTaskStatusFromField(complete, rawStatus, hasValue));
}

function dateFieldStatus(rows: ProjectRow[], key: keyof ProjectRow): BoardStatus {
  if (rows.length === 0) return "Not Started";
  if (rows.every((row) => isProjectFieldComplete(row, key))) return "Done";
  if (rows.some((row) => !isMissingValue(row[key]))) return "Working on it";
  return "Not Started";
}

function shown(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "—";
}

function capsPart(value: unknown): string {
  const text = shown(value);
  return text === "—" ? text : text.toUpperCase();
}

/** Unique Batch No. | Control # | Kind | Product, in capitals. Kind is omitted when the record has none. */
export function spreadsheetRowLabel(row: Pick<ProjectRow, "unique_batch" | "po_control_no" | "activity_type" | "product_name">): string {
  const kind = capsPart(row.activity_type);
  return [capsPart(row.unique_batch), capsPart(row.po_control_no), kind === "—" ? "" : kind, capsPart(row.product_name)]
    .filter(Boolean)
    .join(" | ");
}

/** Activity kind | Title / Activity Name, in capitals. */
export function supportActivityLabel(row: Pick<SupportActivity, "activity_kind" | "non_process_description">): string {
  return `${capsPart(row.activity_kind)} | ${capsPart(row.non_process_description)}`;
}

/** Protocol, execution, report, and endorsement, with the fields each step needs. */
export function planSpreadsheetTasks(rows: ProjectRow[]): BoardTaskSeed[] {
  const row = latestRow(rows);
  if (!row) return [];
  const protocolApproved = isApprovedOrNotApplicableStatus(row.protocol_Status);
  return [
    pack("Protocol", [
      {
        title: "Protocol number",
        status: statusOf(!isMissingValue(row.protocol_no) || protocolApproved, row.protocol_no, !isMissingValue(row.protocol_no)),
        dueDate: "",
      },
      {
        title: "Protocol status",
        status: statusOf(protocolApproved, row.protocol_Status, !isMissingValue(row.protocol_Status)),
        dueDate: isoDate(row.protocol_target_date),
      },
    ], isoDate(row.protocol_target_date)),
    pack("Execution", [
      { title: "Manufacturing start week", key: "manufacturing_start_week" as const },
      { title: "MO/BMR/PO activation date", key: "mo_bmr_po_activation_date" as const },
      { title: "AR availability date", key: "ar_availability_date" as const },
      { title: "Packaging schedule", key: "packaging_schedule" as const },
    ].map((field) => ({
      title: field.title,
      status: dateFieldStatus(rows, field.key),
      dueDate: isoDate(row[field.key]),
    })), ""),
    pack("Report", [
      {
        title: "Validation report status",
        status: statusOf(isApprovedOrNotApplicableStatus(row.validation_report_status), row.validation_report_status, !isMissingValue(row.validation_report_status)),
        dueDate: isoDate(row.validation_report_target_date),
      },
    ], isoDate(row.validation_report_target_date)),
    pack("Endorsement", [
      {
        title: "Endorsement report status",
        status: statusOf(isApprovedOrNotApplicableStatus(row.endorsement_report_status), row.endorsement_report_status, !isMissingValue(row.endorsement_report_status)),
        dueDate: isoDate(row.endorsement_acceptance_target_date),
      },
    ], isoDate(row.endorsement_acceptance_target_date)),
  ];
}

function supportProtocolDone(row: SupportActivity): boolean {
  if (isApprovedOrNotApplicableStatus(row.protocol_status)) return true;
  if (row.activity_kind === "TSD" || row.activity_kind === "RnD") {
    return isApprovedOrNotApplicableStatus(row.Machinability_Protocol_Status);
  }
  return false;
}

function supportActivityDone(row: SupportActivity): boolean {
  const status = valueOrNA(row.status).toLowerCase();
  return status === "done" || status === "closed" || status === "completed";
}

/** Protocol, execution, report, and endorsement for a support activity. */
export function planSupportTasks(row: SupportActivity): BoardTaskSeed[] {
  const target = isoDate(row.Target_Date);
  const machinability = row.activity_kind === "TSD" || row.activity_kind === "RnD";
  const protocolSubs: BoardTaskSeed["subtasks"] = machinability
    ? [
      {
        title: "Machinability protocol",
        status: statusOf(!isMissingValue(row.Machinability_Protocol), row.Machinability_Protocol, !isMissingValue(row.Machinability_Protocol)),
        dueDate: "",
      },
      {
        title: "Machinability protocol status",
        status: statusOf(isApprovedOrNotApplicableStatus(row.Machinability_Protocol_Status), row.Machinability_Protocol_Status, !isMissingValue(row.Machinability_Protocol_Status)),
        dueDate: target,
      },
    ]
    : [
      {
        title: "Protocol number",
        status: statusOf(!isMissingValue(row.protocol_number) || supportProtocolDone(row), row.protocol_number, !isMissingValue(row.protocol_number)),
        dueDate: "",
      },
      {
        title: "Protocol status",
        status: statusOf(supportProtocolDone(row), row.protocol_status, !isMissingValue(row.protocol_status)),
        dueDate: target,
      },
    ];
  const started = !isMissingValue(row.status) && valueOrNA(row.status).toLowerCase() !== "planned";
  return [
    pack("Protocol", protocolSubs, target),
    pack("Execution", [
      {
        title: "Activity status",
        status: statusOf(supportActivityDone(row), row.status, started),
        dueDate: isoDate(row.status_date) || target,
      },
    ], target),
    pack("Report", [
      {
        title: "Report status",
        status: statusOf(isApprovedOrNotApplicableStatus(row.report_status), row.report_status, !isMissingValue(row.report_status)),
        dueDate: "",
      },
    ], ""),
    pack("Endorsement", [
      {
        title: "Endorsement status",
        status: statusOf(isApprovedOrNotApplicableStatus(row.endorsement_status), row.endorsement_status, !isMissingValue(row.endorsement_status)),
        dueDate: "",
      },
    ], ""),
  ];
}

export interface SourceColumnPatch {
  column: string;
  value: string | null;
  /** Project-level spreadsheet fields update every line. Row fields update the linked line. */
  scope: "project" | "row";
  date: boolean;
}

/** Document status written back to a spreadsheet or support protocol/report field. */
export function documentStatusFromBoard(status: BoardStatus, current: string): string | null {
  if (status === "Stuck") return null;
  if (status === "Done" && isApprovedOrNotApplicableStatus(current)) return null;
  if (status === "Done") return "Approved";
  if (status === "Working on it") return "In-process";
  return "";
}

/** Support activity status written back from a board status. */
export function supportActivityStatusFromBoard(status: BoardStatus): string | null {
  if (status === "Done") return "Done";
  if (status === "Working on it") return "In-process";
  if (status === "Not Started") return "Planned";
  return null;
}

function datePatch(column: string, dueDate: string, scope: "project" | "row"): SourceColumnPatch {
  return { column, value: dueDate || null, scope, date: true };
}

function statusPatch(column: string, value: string | null, scope: "project" | "row"): SourceColumnPatch | null {
  if (value === null) return null;
  return { column, value: value || null, scope, date: false };
}

/** Columns a board task should write on the linked spreadsheet project. */
export function spreadsheetPatchesForTask(
  title: string,
  status: BoardStatus,
  dueDate: string,
  currentStatus: string,
): SourceColumnPatch[] {
  const docs: Record<string, { status: string; date: string }> = {
    Protocol: { status: "protocol_status", date: "protocol_target_date" },
    "Protocol status": { status: "protocol_status", date: "protocol_target_date" },
    Report: { status: "validation_report_status", date: "validation_report_target_date" },
    "Validation report status": { status: "validation_report_status", date: "validation_report_target_date" },
    Endorsement: { status: "endorsement_report_status", date: "endorsement_acceptance_target_date" },
    "Endorsement report status": { status: "endorsement_report_status", date: "endorsement_acceptance_target_date" },
  };
  const dates: Record<string, string> = {
    "Manufacturing start week": "manufacturing_start_week",
    "MO/BMR/PO activation date": "mo_bmr_po_activation_date",
    "AR availability date": "ar_availability_date",
    "Packaging schedule": "packaging_schedule",
  };
  const doc = docs[title];
  if (doc) {
    const next = statusPatch(doc.status, documentStatusFromBoard(status, currentStatus), "project");
    return [next, datePatch(doc.date, dueDate, "project")].filter((item): item is SourceColumnPatch => Boolean(item));
  }
  const dateColumn = dates[title];
  if (!dateColumn) return [];
  return [datePatch(dateColumn, dueDate, "row")];
}

/** Columns a board task should write on the linked support activity. */
export function supportPatchesForTask(
  title: string,
  status: BoardStatus,
  dueDate: string,
  startDate: string,
  currentStatus: string,
): SourceColumnPatch[] {
  const activity = supportActivityStatusFromBoard(status);
  if (title === "Execution") {
    const next = statusPatch("status", activity, "project");
    return [
      next,
      datePatch("target_date", dueDate, "project"),
      datePatch("planning_schedule", startDate, "project"),
    ].filter((item): item is SourceColumnPatch => Boolean(item));
  }
  if (title === "Activity status") {
    const next = statusPatch("status", activity, "project");
    return [next, datePatch("status_date", dueDate, "project")].filter((item): item is SourceColumnPatch => Boolean(item));
  }
  const docs: Record<string, { status: string; date?: string }> = {
    Protocol: { status: "protocol_status", date: "target_date" },
    "Protocol status": { status: "protocol_status", date: "target_date" },
    "Machinability protocol status": { status: "machinability_protocol_status", date: "target_date" },
    Report: { status: "report_status" },
    "Report status": { status: "report_status" },
    Endorsement: { status: "endorsement_status" },
    "Endorsement status": { status: "endorsement_status" },
  };
  const doc = docs[title];
  if (!doc) return [];
  const next = statusPatch(doc.status, documentStatusFromBoard(status, currentStatus), "project");
  return [next, doc.date ? datePatch(doc.date, dueDate, "project") : null].filter((item): item is SourceColumnPatch => Boolean(item));
}
