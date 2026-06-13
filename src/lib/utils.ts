export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function valueOrNA(value: unknown): string {
  if (value === null || value === undefined || String(value).trim() === "") return "N/A";
  return String(value).trim();
}

export function valueOrEmpty(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function isActiveValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "TRUE" || normalized === "1" || normalized === "YES";
}

export function generateId(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

export function generateProjectId(): string {
  return generateId("PRJ");
}

export function generateRecordId(): string {
  return generateId("REC");
}

export function generateSupportId(): string {
  return generateId("SUP");
}

export function generateHierarchyId(prefix: "BAT" | "MO" | "PO"): string {
  return generateId(prefix);
}

export function idsEqual(a: unknown, b: unknown): boolean {
  return String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
}

export function sanitizeAuditValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function isOpenFinalStatus(status: string): boolean {
  return ["OPEN", "Others", "N/A", ""].includes(valueOrNA(status));
}

export function isApprovedStatus(status: string): boolean {
  return valueOrNA(status) === "Approved";
}

export function isMissingValue(value: unknown): boolean {
  const normalized = valueOrNA(value);
  return normalized === "N/A" || normalized === "";
}

/** Capitalize the first letter of each word (e.g. "kenvue" → "Kenvue"). */
export function toTitleCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}
