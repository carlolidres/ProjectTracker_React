import { NA_VALUE } from "@/lib/constants";
import { isMissingValue } from "@/lib/utils";

/** Allow digits, comma thousands separators, and up to two decimal places. */
export function sanitizeOrderQuantityInput(value: string): string {
  let next = value.replace(/[^\d.,]/g, "");
  const dotIndex = next.indexOf(".");
  if (dotIndex !== -1) {
    const before = next.slice(0, dotIndex + 1);
    const after = next.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
    next = before + after;
  }
  return next;
}

export function isValidOrderQuantity(value: string): boolean {
  if (isMissingValue(value)) return true;
  const trimmed = value.trim();
  return /^(\d{1,3}(,\d{3})*|\d+)(\.\d{1,2})?$/.test(trimmed);
}

export function normalizeOrderQuantityOnBlur(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === NA_VALUE) return "";
  const sanitized = sanitizeOrderQuantityInput(trimmed);
  return isValidOrderQuantity(sanitized) ? sanitized : sanitized;
}

export function sanitizeNumericDigits(value: string): string {
  return value.replace(/\D/g, "");
}
