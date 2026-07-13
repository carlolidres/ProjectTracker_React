import { CNF_ENTRY_KEYS } from "@/lib/constants";
import { isMissingValue, valueOrNA } from "@/lib/utils";
import type { CnfTrackerRecord } from "@/types/cnfTracker";
import type { CnfEntry, ProjectRow } from "@/types";

export interface CnfMatchedLine {
  row: ProjectRow;
  entryIndex: number;
  entry: CnfEntry;
}

function rowAsCnfEntry(row: ProjectRow): CnfEntry {
  const entry = {} as CnfEntry;
  for (const key of CNF_ENTRY_KEYS) {
    entry[key] = String(row[key as keyof ProjectRow] ?? "");
  }
  return entry;
}

function parseCnfEntries(row: ProjectRow): CnfEntry[] {
  const raw = String(row.cnf_entries_json ?? "").trim();
  if (raw && raw !== "N/A") {
    try {
      const parsed = JSON.parse(raw) as CnfEntry[];
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((entry) => {
          const normalized = {} as CnfEntry;
          for (const key of CNF_ENTRY_KEYS) {
            normalized[key] = valueOrNA(entry[key]);
          }
          return normalized;
        });
      }
    } catch {
      // fall through
    }
  }
  return [rowAsCnfEntry(row)];
}

/** Case-insensitive CNF key: trim + collapse internal whitespace + uppercase. */
export function normalizeCnfReference(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function normalizeCnfTextKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isBlankOrNaCnfValue(value: string | undefined | null): boolean {
  const key = normalizeCnfTextKey(String(value ?? ""));
  return !key || key === "n/a";
}

export function isSmokeTestCnfReference(value: string): boolean {
  const normalized = normalizeCnfReference(value);
  if (!normalized || normalized === "N/A") return false;
  return normalized.includes("SMOKE");
}

export function collectAllCnfMatchedLines(rows: ProjectRow[]): CnfMatchedLine[] {
  const matches: CnfMatchedLine[] = [];
  const seenKeys = new Set<string>();

  for (const row of rows) {
    const entries = parseCnfEntries(row);
    entries.forEach((entry, entryIndex) => {
      const cnfRef = String(entry.cnf_reference ?? "").trim();
      if (isMissingValue(cnfRef) || isSmokeTestCnfReference(cnfRef)) return;
      const key = `${row.record_id}:${entryIndex}:${normalizeCnfReference(cnfRef)}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      matches.push({ row, entryIndex, entry });
    });
  }

  return matches.sort((a, b) => {
    const cnfCompare = normalizeCnfReference(a.entry.cnf_reference).localeCompare(
      normalizeCnfReference(b.entry.cnf_reference),
    );
    if (cnfCompare !== 0) return cnfCompare;
    return String(a.row.po_control_no).localeCompare(String(b.row.po_control_no));
  });
}

export function matchProjectLinesByCnfReference(
  rows: ProjectRow[],
  cnfReference: string,
): CnfMatchedLine[] {
  const needle = normalizeCnfReference(cnfReference);
  if (!needle || needle === "N/A") return [];

  const matches: CnfMatchedLine[] = [];
  for (const row of rows) {
    const entries = parseCnfEntries(row);
    let matched = false;
    entries.forEach((entry, entryIndex) => {
      if (normalizeCnfReference(entry.cnf_reference) !== needle) return;
      matches.push({ row, entryIndex, entry });
      matched = true;
    });
    if (!matched && normalizeCnfReference(row.cnf_reference) === needle) {
      matches.push({ row, entryIndex: 0, entry: entries[0] ?? rowAsCnfEntry(row) });
    }
  }
  return matches;
}

export interface CnfTrackerAggregatedView {
  cnfInitiator: string;
  qrmrRefNo: string;
  changeDescription: string;
  uniqueBatch: string;
  productName: string;
  clientName: string;
  moControlNo: string;
  poControlNo: string;
  protocolNo: string;
  interimReportStatus: string;
  validationReportStatus: string;
  endorsementReportStatus: string;
  cnfStatus: string;
  poLines: Array<{
    projectId: string;
    productName: string;
    poControlNo: string;
    protocolNo: string;
    interimReportNo: string;
    validationReportNo: string;
    endorsementNo: string;
    valActivity: string;
    valStability: string;
    valBatchSeqNo: string;
  }>;
}

export interface CnfReferenceListItem {
  cnfReference: string;
  projectOwner: string;
  uniqueBatch: string;
  poControlNo: string;
}

function extractCnfReferencesFromRow(row: ProjectRow): string[] {
  const refs = new Set<string>();
  const add = (value: string) => {
    const trimmed = value.trim();
    if (isMissingValue(trimmed)) return;
    refs.add(trimmed);
  };
  for (const entry of parseCnfEntries(row)) {
    add(entry.cnf_reference);
  }
  add(String(row.cnf_reference ?? ""));
  return Array.from(refs);
}

export function collectRegisteredCnfReferences(
  projects: ProjectRow[],
  trackerRecords: CnfTrackerRecord[],
): CnfReferenceListItem[] {
  const byKey = new Map<string, CnfReferenceListItem>();

  const remember = (cnfReference: string, row?: ProjectRow, fallbackOwner?: string) => {
    const trimmed = cnfReference.trim();
    if (isMissingValue(trimmed) || isSmokeTestCnfReference(trimmed)) return;
    const key = normalizeCnfReference(trimmed);
    if (byKey.has(key)) return;
    byKey.set(key, {
      cnfReference: trimmed,
      projectOwner: valueOrNA(row?.project_owner ?? fallbackOwner),
      uniqueBatch: valueOrNA(row?.unique_batch),
      poControlNo: valueOrNA(row?.po_control_no),
    });
  };

  for (const row of projects) {
    for (const ref of extractCnfReferencesFromRow(row)) {
      remember(ref, row);
    }
  }

  for (const record of trackerRecords) {
    if (isMissingValue(record.cnf_reference)) continue;
    const matches = matchProjectLinesByCnfReference(projects, record.cnf_reference);
    remember(record.cnf_reference, matches[0]?.row, record.cnf_initiator);
  }

  return Array.from(byKey.values()).sort((a, b) => a.cnfReference.localeCompare(b.cnfReference));
}

export function aggregateCnfTrackerView(matches: CnfMatchedLine[]): CnfTrackerAggregatedView {
  const primary = matches[0];
  const row = primary?.row;
  const entry = primary?.entry;

  return {
    cnfInitiator: valueOrNA(row?.project_owner),
    qrmrRefNo: valueOrNA(entry?.qrmr_ref_no),
    changeDescription: valueOrNA(entry?.change_description),
    uniqueBatch: valueOrNA(row?.unique_batch),
    productName: valueOrNA(row?.product_name),
    clientName: valueOrNA(row?.client_name),
    moControlNo: valueOrNA(row?.mo_control_no),
    poControlNo: valueOrNA(row?.po_control_no),
    protocolNo: valueOrNA(row?.protocol_no),
    interimReportStatus: valueOrNA(row?.val_interim_report_status),
    validationReportStatus: valueOrNA(row?.validation_report_status),
    endorsementReportStatus: valueOrNA(row?.endorsement_report_status),
    cnfStatus: valueOrNA(entry?.cnf_status),
    poLines: matches.map(({ row: matchRow }) => ({
      projectId: valueOrNA(matchRow.project_id),
      productName: valueOrNA(matchRow.product_name),
      poControlNo: valueOrNA(matchRow.po_control_no),
      protocolNo: valueOrNA(matchRow.protocol_no),
      interimReportNo: valueOrNA(matchRow.val_interim_report_no),
      validationReportNo: valueOrNA(matchRow.validation_report_no),
      endorsementNo: valueOrNA(matchRow.endorsement_report_no),
      valActivity: valueOrNA(matchRow.Val_Activity),
      valStability: valueOrNA(matchRow.Val_Stability),
      valBatchSeqNo: valueOrNA(matchRow.Val_Batch_Seq_No),
    })),
  };
}

export interface CnfMatchedProjectLine extends ProjectRow {
  matchingEntry: CnfEntry;
  matchingEntryIndex: number;
}

export interface CnfTrackerByReferenceAggregation extends CnfTrackerAggregatedView {
  matchingLines: CnfMatchedProjectLine[];
  firstMatch: CnfMatchedProjectLine | null;
  defaultInitiator: string;
}

export function aggregateCnfTrackerByReference(
  rows: ProjectRow[],
  cnfReference: string,
): CnfTrackerByReferenceAggregation {
  const matches = matchProjectLinesByCnfReference(rows, cnfReference);
  const matchingLines: CnfMatchedProjectLine[] = matches.map((match) => ({
    ...match.row,
    matchingEntry: match.entry,
    matchingEntryIndex: match.entryIndex,
  }));
  const view = aggregateCnfTrackerView(matches);
  return {
    ...view,
    matchingLines,
    firstMatch: matchingLines[0] ?? null,
    defaultInitiator: view.cnfInitiator,
  };
}
