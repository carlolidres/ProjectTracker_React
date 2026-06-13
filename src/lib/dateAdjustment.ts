import { shouldRequireDateAdjustmentReason } from "@/lib/dateAdjustmentReview";
import { PO_FIELDS, type ProjectFieldDef } from "@/lib/projectFormFields";

export const SUPPORT_DATE_FIELDS = ["Target_Date", "Planning_Schedule"] as const;

export const TRACKED_PROJECT_DATE_FIELDS = new Set(
  PO_FIELDS.filter((field) => field.type === "date" || field.type === "month").map((field) => field.key),
);

const SUPPORT_DATE_LABELS: Record<string, string> = {
  Target_Date: "Target Date to Execute",
  Planning_Schedule: "Planning Schedule",
};

export function getSupportDateFieldLabel(fieldName: string): string {
  return SUPPORT_DATE_LABELS[fieldName] ?? fieldName;
}

export function isTrackedProjectDateField(field: Pick<ProjectFieldDef, "key" | "type">): boolean {
  return field.type === "date" || field.type === "month";
}

/** @deprecated Use shouldRequireDateAdjustmentReason from dateAdjustmentReview */
export function shouldPromptDateAdjustment(oldValue: string, newValue: string): boolean {
  return shouldRequireDateAdjustmentReason(oldValue, newValue);
}
