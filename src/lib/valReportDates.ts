import dayjs from "dayjs";
import { isApprovedOrNotApplicableStatus, isMissingValue, isNotApplicableStatus } from "@/lib/utils";
import type { CnfEntry, PoControl } from "@/types";

export function endorsementDateFromValidationTarget(validationTargetDate: string): string {
  if (isMissingValue(validationTargetDate)) return "";
  const parsed = dayjs(validationTargetDate);
  if (!parsed.isValid()) return "";
  return parsed.add(1, "month").format("YYYY-MM-DD");
}

/** VAL status fields paired with their target date fields. */
export const VAL_STATUS_TARGET_DATE_PAIRS = [
  { statusKey: "protocol_Status", targetDateKey: "protocol_target_date" },
  { statusKey: "val_interim_report_status", targetDateKey: "val_interim_report_target_date" },
  { statusKey: "validation_report_status", targetDateKey: "validation_report_target_date" },
  { statusKey: "endorsement_report_status", targetDateKey: "endorsement_acceptance_target_date" },
] as const;

/** VAL status fields whose paired number/date inputs are disabled when status is Not Applicable. */
export const VAL_STATUS_NOT_APPLICABLE_DISABLED_PAIRS = [
  {
    statusKey: "protocol_Status",
    disabledKeys: ["protocol_no", "protocol_target_date"],
  },
  {
    statusKey: "val_interim_report_status",
    disabledKeys: ["val_interim_report_no", "val_interim_report_target_date"],
  },
  {
    statusKey: "validation_report_status",
    disabledKeys: ["validation_report_no", "validation_report_target_date"],
  },
  {
    statusKey: "endorsement_report_status",
    disabledKeys: ["endorsement_report_no", "endorsement_acceptance_target_date"],
  },
] as const;

const QA_NOT_APPLICABLE_DISABLED_KEYS = new Set(["qrmr_ref_no", "qrmr_target_date"]);

const VAL_STATUS_KEYS = new Set(
  VAL_STATUS_TARGET_DATE_PAIRS.map((pair) => pair.statusKey),
);

const TARGET_DATE_TO_STATUS = Object.fromEntries(
  VAL_STATUS_TARGET_DATE_PAIRS.map((pair) => [pair.targetDateKey, pair.statusKey]),
) as Record<string, string>;

export function isValStatusFieldComplete(status: string): boolean {
  return isApprovedOrNotApplicableStatus(status);
}

export function isValTargetDateFieldComplete(
  row: Record<string, string | undefined>,
  targetDateKey: string,
): boolean {
  const statusKey = TARGET_DATE_TO_STATUS[targetDateKey];
  if (statusKey && isValStatusFieldComplete(String(row[statusKey] ?? ""))) {
    return true;
  }
  return !isMissingValue(row[targetDateKey]);
}

export function isValStatusFieldKey(fieldKey: string): boolean {
  return VAL_STATUS_KEYS.has(fieldKey as (typeof VAL_STATUS_TARGET_DATE_PAIRS)[number]["statusKey"]);
}

export function isPoFieldDisabledByValNotApplicable(po: PoControl, fieldKey: string): boolean {
  for (const pair of VAL_STATUS_NOT_APPLICABLE_DISABLED_PAIRS) {
    if (!(pair.disabledKeys as readonly string[]).includes(fieldKey)) continue;
    const status = String((po as unknown as Record<string, string>)[pair.statusKey] ?? "");
    if (isNotApplicableStatus(status)) return true;
  }
  return false;
}

export function isQaCnfFieldDisabledByNotApplicable(entry: CnfEntry, fieldKey: string): boolean {
  if (!isNotApplicableStatus(entry.qrmr_status)) return false;
  return QA_NOT_APPLICABLE_DISABLED_KEYS.has(fieldKey);
}

export function isQaCnfFieldComplete(entry: CnfEntry, field: string): boolean {
  if (field === "qrmr_status") return isApprovedOrNotApplicableStatus(entry.qrmr_status);
  if (field === "qrmr_ref_no") {
    if (isNotApplicableStatus(entry.qrmr_status)) return true;
    return !isMissingValue(entry.qrmr_ref_no);
  }
  if (field === "qrmr_target_date") {
    if (isApprovedOrNotApplicableStatus(entry.qrmr_status)) return true;
    return !isMissingValue(entry.qrmr_target_date);
  }
  return !isMissingValue(entry[field as keyof CnfEntry]);
}
