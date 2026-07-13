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

const BUSINESS_SPECIAL_CHARS = new Set([
  "-", "_", "\\", "/", "(", ")", ".", ",", ":", ";", "&", "+", "=", "#", "%", "'", '"', "@", " ",
]);

function isAllowedBusinessChar(ch: string): boolean {
  if (ch === "<" || ch === ">") return false;
  const code = ch.codePointAt(0) ?? 0;
  if (code < 32 || code === 127) return false;
  if (/\p{L}|\p{N}/u.test(ch)) return true;
  return BUSINESS_SPECIAL_CHARS.has(ch);
}

/** Allow business/document specials; strip control chars and HTML/script delimiters. */
export function sanitizeAlphanumericInput(value: string): string {
  return Array.from(value).filter(isAllowedBusinessChar).join("");
}

export function sanitizePoControlNoInput(value: string): string {
  return Array.from(value).filter(isAllowedBusinessChar).join("");
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

/** Exact registry value — not the empty-field display sentinel `N/A`. */
export function isNotApplicableStatus(status: string): boolean {
  return String(status ?? "").trim() === "Not Applicable";
}

/** CNF closure gate: Approved completes the requirement; Not Applicable waives it. */
export function isClosureAcceptable(status: string | null | undefined): boolean {
  const trimmed = String(status ?? "").trim();
  return trimmed === "Approved" || trimmed === "Not Applicable";
}

/** VAL workflow statuses that resolve a status field and waive its paired target date. */
export function isApprovedOrNotApplicableStatus(status: string): boolean {
  return isClosureAcceptable(status);
}

export function isMissingValue(value: unknown): boolean {
  const normalized = valueOrNA(value);
  return normalized === "N/A" || normalized === "";
}

/** Capitalize the first letter of each word (e.g. "kenvue" → "Kenvue"). */
/** Readable message for Supabase/PostgREST and standard Error failures. */
export function formatServiceError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = typeof record.message === "string" ? record.message.trim() : "";
    const code = typeof record.code === "string" ? record.code : "";
    const details = typeof record.details === "string" ? record.details.trim() : "";
    const hint = typeof record.hint === "string" ? record.hint.trim() : "";
    const parts = [message || fallback];
    if (code) parts.push(`Code: ${code}`);
    if (details) parts.push(details);
    if (hint) parts.push(hint);
    return parts.join(" — ");
  }
  return fallback;
}

export function toTitleCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}
