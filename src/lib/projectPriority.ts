import {
  AM_CNF_ENTRY_KEYS,
  AM_FIELDS,
  QA_CNF_ENTRY_KEYS,
  PP_FIELDS,
  QC_FIELDS,
  TSD_FIELDS,
  VAL_FIELDS,
} from "@/lib/constants";
import { fgDaysRemaining, fgSortValue } from "@/lib/fgUrgency";
import { getTodayManila } from "@/lib/date";
import {
  isQaCnfFieldComplete,
  isValStatusFieldComplete,
  isValStatusFieldKey,
  isValTargetDateFieldComplete,
} from "@/lib/valReportDates";
import { isMissingValue, valueOrNA } from "@/lib/utils";
import type { CnfEntry, ProjectRow } from "@/types";

export type FocusGroup = "AM/BM/PL" | "QA" | "PP" | "TSD" | "VAL" | "QC" | "None";

const PRIORITY_ACTION_LABELS: Record<string, string> = {
  cnf_reference: "Enter CNF Reference",
  qrmr_ref_no: "Enter QRMR No.",
  qrmr_status: "Complete QRMR Status",
  qrmr_target_date: "Set QRMR Target Date",
  change_description: "Enter Change Description",
  cnf_status: "Complete CNF Status / Client Approval",
  client_approval_target_date: "Set Client Approval Target Date",
  protocol_no: "Enter Validation Protocol No.",
  protocol_Status: "Complete Protocol Status",
  protocol_target_date: "Set Protocol Target Date",
  Val_Activity: "Select Validation Activity",
  Val_Strategy: "Select Validation Strategy",
  manufacturing_start_week: "Set Manufacturing Start Week",
  mo_bmr_po_submission_status: "Set MO/BMR/PO Submission Status",
  mo_bmr_po_target_date: "Set MO/BMR/PO Target Date",
  mo_bmr_po_activation_status: "Set MO/BMR/PO Activation Status",
  mo_bmr_po_activation_date: "Set MO/BMR/PO Activation Date",
  ar_availability_date: "Set AR Availability Date",
  packaging_schedule: "Set Packaging Schedule",
  validation_report_target_date: "Set Validation Report Target Date",
  validation_report_status: "Complete Validation Report Status",
  endorsement_acceptance_target_date: "Set Endorsement Target Date",
  endorsement_report_status: "Complete Endorsement Report Status",
  final_status: "Complete Final Status",
  fg_month: "Set FG Month",
};

const FIELD_TO_GROUP: Record<string, FocusGroup> = {
  fg_month: "AM/BM/PL",
  client_approval_target_date: "AM/BM/PL",
  cnf_reference: "AM/BM/PL",
  qrmr_ref_no: "QA",
  qrmr_status: "QA",
  qrmr_target_date: "QA",
  change_description: "AM/BM/PL",
  cnf_status: "AM/BM/PL",
  remarks: "AM/BM/PL",
  manufacturing_start_week: "PP",
  packaging_schedule: "PP",
  final_status: "PP",
  mo_bmr_po_submission_status: "TSD",
  mo_bmr_po_target_date: "TSD",
  mo_bmr_po_activation_status: "TSD",
  mo_bmr_po_activation_date: "TSD",
  protocol_no: "VAL",
  protocol_Status: "VAL",
  protocol_target_date: "VAL",
  Val_Activity: "VAL",
  Val_Strategy: "VAL",
  validation_report_no: "VAL",
  validation_report_target_date: "VAL",
  validation_report_status: "VAL",
  endorsement_report_status: "VAL",
  endorsement_acceptance_target_date: "VAL",
  ar_availability_date: "QC",
};

const PRIORITY_FIELD_ORDER = [
  "cnf_status",
  "client_approval_target_date",
  "cnf_reference",
  "protocol_no",
  "protocol_Status",
  "protocol_target_date",
  "Val_Activity",
  "Val_Strategy",
  "manufacturing_start_week",
  "mo_bmr_po_target_date",
  "mo_bmr_po_activation_date",
  "ar_availability_date",
  "packaging_schedule",
  "validation_report_target_date",
  "validation_report_status",
  "endorsement_acceptance_target_date",
  "endorsement_report_status",
  "final_status",
  "fg_month",
] as const;

function parseCnfEntriesJson(row: ProjectRow): CnfEntry[] {
  const raw = String(row.cnf_entries_json ?? "").trim();
  if (!raw || raw === "N/A") return [];
  try {
    const parsed = JSON.parse(raw) as CnfEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function fieldLabel(field: string): string {
  return PRIORITY_ACTION_LABELS[field]?.replace(/^Set |^Enter |^Complete |^Select /, "") ?? field;
}

export function isProjectFieldComplete(row: ProjectRow, field: string): boolean {
  if (field === "cnf_status") return valueOrNA(row.cnf_status) === "Approved";
  if (isValStatusFieldKey(field)) {
    return isValStatusFieldComplete(String(row[field as keyof ProjectRow] ?? ""));
  }
  if (field === "client_approval_target_date") {
    if (valueOrNA(row.cnf_status) === "Approved") return true;
    return !isMissingValue(row.client_approval_target_date);
  }
  if (
    field === "protocol_target_date"
    || field === "val_interim_report_target_date"
    || field === "validation_report_target_date"
    || field === "endorsement_acceptance_target_date"
  ) {
    return isValTargetDateFieldComplete(row as unknown as Record<string, string | undefined>, field);
  }
  return !isMissingValue(row[field as keyof ProjectRow]);
}

function isFieldComplete(row: ProjectRow, field: string): boolean {
  return isProjectFieldComplete(row, field);
}

function isCnfEntryFieldComplete(entry: CnfEntry, field: string): boolean {
  if ((QA_CNF_ENTRY_KEYS as readonly string[]).includes(field)) {
    return isQaCnfFieldComplete(entry, field);
  }
  if (field === "cnf_status") return valueOrNA(entry.cnf_status) === "Approved";
  return !isMissingValue(entry[field as keyof CnfEntry]);
}

function isAmCnfEntryIncomplete(entry: CnfEntry): boolean {
  return AM_CNF_ENTRY_KEYS.some((key) => !isCnfEntryFieldComplete(entry, key));
}

function isQaCnfEntryIncomplete(entry: CnfEntry): boolean {
  return QA_CNF_ENTRY_KEYS.some((key) => !isCnfEntryFieldComplete(entry, key));
}

export function countIncompleteMilestones(row: ProjectRow): number {
  let count = PRIORITY_FIELD_ORDER.reduce((total, field) => {
    return total + (isFieldComplete(row, field) ? 0 : 1);
  }, 0);

  const entries = parseCnfEntriesJson(row);
  entries.forEach((entry, index) => {
    for (const key of AM_CNF_ENTRY_KEYS) {
      if (!isCnfEntryFieldComplete(entry, key)) {
        count += 1;
        if (index > 0) break;
      }
    }
    for (const key of QA_CNF_ENTRY_KEYS) {
      if (!isCnfEntryFieldComplete(entry, key)) {
        count += 1;
        if (index > 0) break;
      }
    }
  });

  return count;
}

export function getNextRequiredAction(row: ProjectRow): string {
  for (const field of PRIORITY_FIELD_ORDER) {
    if (!isFieldComplete(row, field)) {
      return PRIORITY_ACTION_LABELS[field] ?? `Complete ${fieldLabel(field)}`;
    }
  }

  const entries = parseCnfEntriesJson(row);
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    for (const key of AM_CNF_ENTRY_KEYS) {
      if (!isCnfEntryFieldComplete(entry, key)) {
        const prefix = entries.length > 1 ? `CNF Entry ${index + 1}: ` : "";
        return `${prefix}${PRIORITY_ACTION_LABELS[key] ?? `Complete ${fieldLabel(key)}`}`;
      }
    }
  }
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    for (const key of QA_CNF_ENTRY_KEYS) {
      if (!isCnfEntryFieldComplete(entry, key)) {
        const prefix = entries.length > 1 ? `CNF Entry ${index + 1}: ` : "";
        return `${prefix}${PRIORITY_ACTION_LABELS[key] ?? `Complete ${fieldLabel(key)}`}`;
      }
    }
  }

  return "Monitor project readiness";
}

export function getFocusGroup(row: ProjectRow): FocusGroup {
  for (const field of PRIORITY_FIELD_ORDER) {
    if (!isFieldComplete(row, field)) {
      return FIELD_TO_GROUP[field] ?? "AM/BM/PL";
    }
  }

  const entries = parseCnfEntriesJson(row);
  for (const entry of entries) {
    if (isAmCnfEntryIncomplete(entry)) return "AM/BM/PL";
  }
  for (const entry of entries) {
    if (isQaCnfEntryIncomplete(entry)) return "QA";
  }

  return "None";
}

export function hasMissingFieldsForGroup(row: ProjectRow, group: FocusGroup): boolean {
  if (group === "None") return false;
  const fieldMap: Record<FocusGroup, string[]> = {
    "AM/BM/PL": [...AM_FIELDS, ...AM_CNF_ENTRY_KEYS],
    QA: [...QA_CNF_ENTRY_KEYS],
    PP: PP_FIELDS,
    TSD: TSD_FIELDS,
    VAL: VAL_FIELDS,
    QC: QC_FIELDS,
    None: [],
  };

  const fields = fieldMap[group];
  if (group === "AM/BM/PL" || group === "QA") {
    const entryKeys = group === "AM/BM/PL" ? AM_CNF_ENTRY_KEYS : QA_CNF_ENTRY_KEYS;
    const entries = parseCnfEntriesJson(row);
    const poFields = fields.filter(
      (field) => !(entryKeys as readonly string[]).includes(field as typeof entryKeys[number]),
    );
    const poIncomplete = poFields.some((field) => !isProjectFieldComplete(row, field));
    if (poIncomplete) return true;
    if (!entries.length) {
      return entryKeys.some((key) => isMissingValue(row[key as keyof ProjectRow]));
    }
    return entries.some((entry) =>
      entryKeys.some((key) => isCnfEntryFieldComplete(entry, key) === false),
    );
  }

  return fields.some((field) => !isProjectFieldComplete(row, field));
}

export interface ProjectPriorityMeta {
  rank: number;
  severity: string;
  daysRemaining: number | null;
  fgSort: number;
  incompleteCount: number;
  nextAction: string;
  focusGroup: FocusGroup;
}

export function getProjectPriority(row: ProjectRow, today = getTodayManila()): ProjectPriorityMeta {
  const status = valueOrNA(row.final_status);
  const fgSort = fgSortValue(row.fg_month);
  const nextAction = getNextRequiredAction(row);
  const focusGroup = getFocusGroup(row);
  const incompleteCount = countIncompleteMilestones(row);

  if (status === "CANCELLED") {
    return {
      rank: 6,
      severity: "cancelled",
      daysRemaining: null,
      fgSort,
      incompleteCount: 0,
      nextAction: "No active action",
      focusGroup: "None",
    };
  }

  if (status === "CLOSED") {
    return {
      rank: 5,
      severity: "closed",
      daysRemaining: null,
      fgSort,
      incompleteCount: 0,
      nextAction: "No active action",
      focusGroup: "None",
    };
  }

  const days = fgDaysRemaining(row.fg_month, today);
  let rank = 4;
  let severity = "low";
  if (days !== null && days < 0) {
    rank = 0;
    severity = "overdue";
  } else if (days !== null && days <= 15) {
    rank = 1;
    severity = "critical";
  } else if (days !== null && days <= 30) {
    rank = 2;
    severity = "high";
  } else if (days !== null && days <= 60) {
    rank = 3;
    severity = "moderate";
  }

  return {
    rank,
    severity,
    daysRemaining: days,
    fgSort,
    incompleteCount,
    nextAction,
    focusGroup,
  };
}

export function compareProjectPriority(a: ProjectRow, b: ProjectRow): number {
  const pa = getProjectPriority(a);
  const pb = getProjectPriority(b);
  return (
    pa.rank - pb.rank
    || pa.fgSort - pb.fgSort
    || pb.incompleteCount - pa.incompleteCount
    || String(a.project_id).localeCompare(String(b.project_id))
  );
}
