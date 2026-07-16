import { NA_VALUE } from "@/lib/constants";
import { isMissingValue, valueOrEmpty } from "@/lib/utils";

/** Normalize optional text for persistence: blank / missing -> N/A. */
export function normalizeOptionalNaForSubmit(value: unknown): string {
  const text = valueOrEmpty(value);
  if (!text || text === NA_VALUE || text.toUpperCase() === "NA") return NA_VALUE;
  return text;
}

/**
 * Display helper: treat blank/null/N/A as missing without rewriting stored nulls on load.
 * Forms should keep "" in state for missing values and show gray NA via shared inputs.
 */
export function toEditableNaField(value: unknown): string {
  if (value == null) return "";
  const text = String(value).trim();
  if (!text || text === NA_VALUE || text.toUpperCase() === "NA") return "";
  return text;
}

/** Whether a field value should show the gray NA guide (not a user-typed NA). */
export function shouldShowNaGuide(value: unknown, focused: boolean, readOnly?: boolean): boolean {
  return !readOnly && !focused && isMissingValue(value);
}

export function isOptionalNaFieldEmpty(value: unknown): boolean {
  return isMissingValue(value);
}
