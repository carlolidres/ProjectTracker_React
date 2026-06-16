import dayjs from "dayjs";
import { isMissingValue } from "@/lib/utils";

export function endorsementDateFromValidationTarget(validationTargetDate: string): string {
  if (isMissingValue(validationTargetDate)) return "";
  const parsed = dayjs(validationTargetDate);
  if (!parsed.isValid()) return "";
  return parsed.add(1, "month").format("YYYY-MM-DD");
}
