import dayjs from "dayjs";
import { isApprovedOrNotApplicableStatus, isMissingValue } from "@/lib/utils";

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
