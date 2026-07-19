import {
  normalizeStoredAppDate,
  normalizeStoredFgMonth,
  parseAppDateValue,
  parseFgMonthValue,
} from "@/lib/date";
import type { SpreadsheetColumnDef } from "@/lib/projectsDatabaseColumns";
import { valueOrNA } from "@/lib/utils";

export interface CellValidationResult {
  ok: boolean;
  /** Storage-ready value when ok. */
  normalized: string;
  message?: string;
}

const ALPHANUMERIC_RE = /^[A-Za-z0-9\-_/().\s]*$/;
const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

function isBlankOrNa(value: string): boolean {
  const text = value.trim();
  return !text || valueOrNA(text) === "N/A";
}

/**
 * Validate + normalize a spreadsheet cell value for the column editor type.
 * Empty / N/A clears are allowed (required checks apply at project form save, not every grid clear).
 */
export function validateSpreadsheetCellValue(
  column: SpreadsheetColumnDef,
  raw: string,
  registry: Record<string, string[]>,
): CellValidationResult {
  const text = String(raw ?? "").trim();

  if (column.readOnlyAlways || column.editor === "readonly") {
    return { ok: false, normalized: text, message: `${column.headerName} is read-only.` };
  }

  if (isBlankOrNa(text)) {
    return { ok: true, normalized: text === "N/A" ? "N/A" : "" };
  }

  switch (column.editor) {
    case "select": {
      // Creatable registry fields accept new values; prefer the saved casing when known.
      if (column.creatable) {
        const options = column.registry ? registry[column.registry] ?? [] : [];
        const match = options.find((option) => option.toLowerCase() === text.toLowerCase());
        return { ok: true, normalized: match ?? text };
      }
      const options = column.registry ? registry[column.registry] ?? [] : [];
      if (!options.length) {
        return { ok: true, normalized: text };
      }
      const match = options.find((option) => option.toLowerCase() === text.toLowerCase());
      if (!match) {
        return {
          ok: false,
          normalized: text,
          message: `${column.headerName} must be one of: ${options.slice(0, 8).join(", ")}${options.length > 8 ? "…" : ""}`,
        };
      }
      return { ok: true, normalized: match };
    }
    case "date": {
      if (!parseAppDateValue(text)) {
        return {
          ok: false,
          normalized: text,
          message: `${column.headerName} must be a valid date (e.g. 31 Aug 2026).`,
        };
      }
      return { ok: true, normalized: normalizeStoredAppDate(text) };
    }
    case "month": {
      if (!parseFgMonthValue(text)) {
        return {
          ok: false,
          normalized: text,
          message: `${column.headerName} must be a valid month (e.g. Jun 2026).`,
        };
      }
      return { ok: true, normalized: normalizeStoredFgMonth(text) };
    }
    case "numeric":
    case "order_quantity": {
      const cleaned = text.replace(/,/g, "");
      if (!NUMERIC_RE.test(cleaned)) {
        return {
          ok: false,
          normalized: text,
          message: `${column.headerName} must be a number.`,
        };
      }
      return { ok: true, normalized: cleaned };
    }
    case "alphanumeric": {
      if (!ALPHANUMERIC_RE.test(text)) {
        return {
          ok: false,
          normalized: text,
          message: `${column.headerName} allows letters, numbers, and -_/(). only.`,
        };
      }
      return { ok: true, normalized: text };
    }
    default:
      return { ok: true, normalized: text };
  }
}

export function cellErrorKey(recordId: string, field: string): string {
  return `${recordId}:${field}`;
}
