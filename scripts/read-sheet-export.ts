/**
 * Reads Google Sheets export files (CSV, XLSX, JSON) for migration.
 */

import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import * as XLSX from "xlsx";
import {
  detectTableFromHeaders,
  mapProjectRow,
  mapSupportRow,
  rowHasData,
  type SheetTable,
  validateProjectRows,
  validateSupportRows,
} from "./migration-utils";

export interface ParsedSheet {
  table: SheetTable;
  source: string;
  rawCount: number;
  rows: Record<string, unknown>[];
}

function sheetToRows(workbook: XLSX.WorkBook, sheetName?: string): Record<string, unknown>[] {
  const sheet = sheetName
    ? workbook.Sheets[sheetName]
    : workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) return [];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return json.filter(rowHasData);
}

export function readExportFile(filePath: string): ParsedSheet {
  const absolute = resolve(filePath);
  if (!existsSync(absolute)) {
    throw new Error(`Export file not found: ${absolute}`);
  }

  const ext = extname(absolute).toLowerCase();

  if (ext === ".json") {
    const parsed = JSON.parse(readFileSync(absolute, "utf8")) as Record<string, unknown>[];
    if (!Array.isArray(parsed)) throw new Error(`${absolute} must contain a JSON array`);
    const rows = parsed.filter(rowHasData);
    const headers = Object.keys(rows[0] ?? {});
    const table = detectTableFromHeaders(headers);
    if (!table) throw new Error(`Could not detect table type from JSON headers in ${absolute}`);
    return { table, source: absolute, rawCount: rows.length, rows };
  }

  const workbook =
    ext === ".csv"
      ? XLSX.read(readFileSync(absolute, "utf8"), { type: "string" })
      : XLSX.readFile(absolute);

  const rows = sheetToRows(workbook);
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const table = detectTableFromHeaders(headers);
  if (!table) {
    throw new Error(
      `Could not detect table type from ${absolute}. Expected PROJECTS or SUPPORT_ACTIVITIES headers.`,
    );
  }

  return { table, source: absolute, rawCount: rows.length, rows };
}

export function prepareMigrationRows(parsed: ParsedSheet) {
  if (parsed.table === "projects") {
    const mapped = parsed.rows.map((row) => mapProjectRow(row));
    const errors = validateProjectRows(mapped);
    return {
      table: "projects" as const,
      mapped,
      errors,
      active: mapped.filter((r) => r.is_active).length,
    };
  }

  const mapped = parsed.rows.map((row) => mapSupportRow(row));
  const errors = validateSupportRows(mapped);
  return {
    table: "support" as const,
    mapped,
    errors,
    active: mapped.filter((r) => r.is_active).length,
  };
}

export function summarizePrepared(
  label: string,
  prepared: ReturnType<typeof prepareMigrationRows>,
) {
  console.log(`\n${label}`);
  console.log(`  Table: ${prepared.table}`);
  console.log(`  Rows: ${prepared.mapped.length}`);
  console.log(`  Active: ${prepared.active}`);
  console.log(`  Archived/inactive: ${prepared.mapped.length - prepared.active}`);
  if (prepared.errors.length) {
    console.log(`  Validation errors: ${prepared.errors.length}`);
    prepared.errors.slice(0, 10).forEach((error) => console.log(`    - ${error}`));
    if (prepared.errors.length > 10) {
      console.log(`    ... and ${prepared.errors.length - 10} more`);
    }
  } else {
    console.log("  Validation: PASS");
  }
}
