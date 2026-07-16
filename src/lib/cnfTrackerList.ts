import {
  collectAllCnfMatchedLines,
  isSmokeTestCnfReference,
  normalizeCnfReference,
} from "@/lib/cnfTrackerAggregation";import { parseAppDateValue, parseFgMonthValue } from "@/lib/date";
import { isMissingValue, valueOrNA } from "@/lib/utils";
import type { CnfTrackerRecord } from "@/types/cnfTracker";
import type { ProjectRow } from "@/types";

/** Field mapping for CNF Tracker list columns (display header → database source). */
export const CNF_TRACKER_COLUMN_MAPPING = [
  { header: "CNF No.", source: "cnf_entries.cnf_reference / cnf_projects.cnf_reference", type: "Direct" },
  { header: "QRMR No.", source: "cnf_entries.qrmr_ref_no", type: "Direct" },
  { header: "Product Name", source: "cnf_projects.product_name", type: "Direct" },
  { header: "Product Code", source: "cnf_projects.fg_code", type: "Direct" },
  { header: "Unique Batch No.", source: "cnf_projects.unique_batch", type: "Direct" },
  { header: "Client", source: "cnf_projects.client_name", type: "Direct" },
  { header: "Description of Change", source: "cnf_entries.change_description", type: "Direct" },
  { header: "Department", source: "cnf_projects.business_unit", type: "Direct" },
  { header: "Val Activity", source: "cnf_projects.Val_Activity", type: "Direct" },
  { header: "Val Batch Seq. No.", source: "cnf_projects.Val_Batch_Seq_No", type: "Direct" },
  { header: "PO Control Number", source: "cnf_projects.po_control_no", type: "Direct" },
  { header: "FG Month Date", source: "cnf_projects.fg_month", type: "Direct" },
  { header: "Closed Date", source: "cnf_tracker_records.closed_date", type: "Related" },
  { header: "Protocol No.", source: "cnf_projects.protocol_no", type: "Direct" },
  { header: "Protocol Status", source: "cnf_projects.protocol_Status", type: "Direct" },
  { header: "Interim Report No.", source: "cnf_projects.val_interim_report_no", type: "Direct" },
  { header: "Interim Report Status", source: "cnf_projects.val_interim_report_status", type: "Direct" },
  { header: "Final Report No.", source: "cnf_projects.validation_report_no", type: "Direct" },
  { header: "Final Report Status", source: "cnf_projects.validation_report_status", type: "Direct" },
  { header: "Endorsement No.", source: "cnf_projects.endorsement_report_no", type: "Direct" },
  { header: "Endorsement Status", source: "cnf_projects.endorsement_report_status", type: "Direct" },
] as const;

export interface CnfTrackerListRow {
  rowKey: string;
  cnfNo: string;
  cnfInitiator: string;
  qrmrNo: string;
  productName: string;
  productCode: string;
  uniqueBatchNo: string;
  client: string;
  descriptionOfChange: string;
  department: string;
  valActivity: string;
  valBatchSeqNo: string;
  poControlNumber: string;
  fgMonthRaw: string;
  closedDateRaw: string;
  protocolNo: string;
  protocolStatus: string;
  interimReportNo: string;
  interimReportStatus: string;
  finalReportNo: string;
  finalReportStatus: string;
  endorsementNo: string;
  endorsementStatus: string;
  titleActivityName: string;
  activityType: string;
  cnfClassification: "process" | "non_process";
  projectId: string;
  trackerId: string;
  trackerRecordId: string;
}

const SEARCH_FIELDS: Array<keyof CnfTrackerListRow> = [
  "cnfNo",
  "cnfInitiator",
  "qrmrNo",
  "productName",
  "productCode",
  "client",
  "descriptionOfChange",
  "protocolNo",
  "interimReportNo",
  "finalReportNo",
  "endorsementNo",
  "titleActivityName",
  "activityType",
];

function classifyTracker(record?: CnfTrackerRecord): "process" | "non_process" {
  return String(record?.cnf_classification ?? "process").trim().toLowerCase() === "non_process"
    ? "non_process"
    : "process";
}

function trackerByReference(records: CnfTrackerRecord[]): Map<string, CnfTrackerRecord> {
  const map = new Map<string, CnfTrackerRecord>();
  for (const record of records) {
    const key = normalizeCnfReference(record.cnf_reference);
    if (!key || key === "N/A") continue;
    if (!map.has(key)) map.set(key, record);
  }
  return map;
}

function rowFromMatch(
  match: ReturnType<typeof collectAllCnfMatchedLines>[number],
  tracker?: CnfTrackerRecord,
  supportTitle?: string,
  supportType?: string,
): CnfTrackerListRow {
  const { row: projectRow, entryIndex, entry } = match;
  const cnfNo = valueOrNA(entry.cnf_reference);
  const key = normalizeCnfReference(cnfNo);
  return {
    rowKey: `${projectRow.record_id}:${entryIndex}:${key}`,
    cnfNo,
    cnfInitiator: valueOrNA(tracker?.cnf_initiator),
    qrmrNo: valueOrNA(entry.qrmr_ref_no),
    productName: valueOrNA(projectRow.product_name),
    productCode: valueOrNA(projectRow.fg_code),
    uniqueBatchNo: valueOrNA(projectRow.unique_batch),
    client: valueOrNA(projectRow.client_name),
    descriptionOfChange: valueOrNA(entry.change_description),
    department: valueOrNA(projectRow.business_unit),
    valActivity: valueOrNA(projectRow.Val_Activity),
    valBatchSeqNo: valueOrNA(projectRow.Val_Batch_Seq_No),
    poControlNumber: valueOrNA(projectRow.po_control_no),
    fgMonthRaw: valueOrNA(projectRow.fg_month),
    closedDateRaw: tracker?.closed_date ? String(tracker.closed_date) : "",
    protocolNo: valueOrNA(projectRow.protocol_no),
    protocolStatus: valueOrNA(projectRow.protocol_Status),
    interimReportNo: valueOrNA(projectRow.val_interim_report_no),
    interimReportStatus: valueOrNA(projectRow.val_interim_report_status),
    finalReportNo: valueOrNA(projectRow.validation_report_no),
    finalReportStatus: valueOrNA(projectRow.validation_report_status),
    endorsementNo: valueOrNA(projectRow.endorsement_report_no),
    endorsementStatus: valueOrNA(projectRow.endorsement_report_status),
    titleActivityName: valueOrNA(supportTitle),
    activityType: valueOrNA(supportType),
    cnfClassification: classifyTracker(tracker),
    projectId: valueOrNA(projectRow.project_id),
    trackerId: tracker?.cnf_tracker_id ?? "",
    trackerRecordId: tracker?.record_id ?? "",
  };
}

function rowFromTrackerOnly(
  record: CnfTrackerRecord,
  supportTitle?: string,
  supportType?: string,
): CnfTrackerListRow {
  const cnfNo = valueOrNA(record.cnf_reference);
  const key = normalizeCnfReference(cnfNo);
  return {
    rowKey: `tracker:${record.cnf_tracker_id}:${key}`,
    cnfNo,
    cnfInitiator: valueOrNA(record.cnf_initiator),
    qrmrNo: valueOrNA(record.qrmr_no),
    productName: valueOrNA(record.product_name),
    productCode: "N/A",
    uniqueBatchNo: valueOrNA(record.unique_batch_no),
    client: valueOrNA(record.client_name),
    descriptionOfChange: valueOrNA(record.change_description),
    department: "N/A",
    valActivity: "N/A",
    valBatchSeqNo: "N/A",
    poControlNumber: "N/A",
    fgMonthRaw: "",
    closedDateRaw: record.closed_date ? String(record.closed_date) : "",
    protocolNo: "N/A",
    protocolStatus: "N/A",
    interimReportNo: "N/A",
    interimReportStatus: "N/A",
    finalReportNo: "N/A",
    finalReportStatus: "N/A",
    endorsementNo: "N/A",
    endorsementStatus: "N/A",
    titleActivityName: valueOrNA(supportTitle),
    activityType: valueOrNA(supportType),
    cnfClassification: classifyTracker(record),
    projectId: "N/A",
    trackerId: record.cnf_tracker_id,
    trackerRecordId: record.record_id ?? "",
  };
}

export type SupportTitleLookup = Map<
  string,
  { titleActivityName: string; activityType: string }
>;

export function buildCnfTrackerListRows(
  projects: ProjectRow[],
  trackerRecords: CnfTrackerRecord[],
  supportByTrackerRecordId: SupportTitleLookup = new Map(),
): CnfTrackerListRow[] {
  const trackers = trackerByReference(trackerRecords);
  const matches = collectAllCnfMatchedLines(projects);
  const coveredRefs = new Set<string>();

  const rows = matches.map((match) => {
    const key = normalizeCnfReference(match.entry.cnf_reference);
    coveredRefs.add(key);
    const tracker = trackers.get(key);
    const support = tracker?.record_id
      ? supportByTrackerRecordId.get(String(tracker.record_id))
      : undefined;
    return rowFromMatch(
      match,
      tracker,
      support?.titleActivityName,
      support?.activityType,
    );
  });

  for (const record of trackerRecords) {
    const key = normalizeCnfReference(record.cnf_reference);
    if (!key || key === "N/A" || coveredRefs.has(key) || isSmokeTestCnfReference(record.cnf_reference)) {
      continue;
    }
    const support = record.record_id
      ? supportByTrackerRecordId.get(String(record.record_id))
      : undefined;
    rows.push(rowFromTrackerOnly(record, support?.titleActivityName, support?.activityType));
  }

  return rows.sort((a, b) => a.cnfNo.localeCompare(b.cnfNo));
}

export function filterCnfTrackerListRows(
  rows: CnfTrackerListRow[],
  search: string,
): CnfTrackerListRow[] {
  const query = search.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter((row) =>
    SEARCH_FIELDS.some((field) => {
      const value = row[field];
      return value !== "N/A" && String(value).toLowerCase().includes(query);
    }),
  );
}

export function fgMonthSortValue(value: string): number {
  const parsed = parseFgMonthValue(value);
  return parsed ? parsed.valueOf() : Number.NEGATIVE_INFINITY;
}

export function dateSortValue(value: string): number {
  if (isMissingValue(value)) return Number.NEGATIVE_INFINITY;
  const parsed = parseAppDateValue(value);
  if (parsed) return parsed.valueOf();
  const fgParsed = parseFgMonthValue(value);
  return fgParsed ? fgParsed.valueOf() : Number.NEGATIVE_INFINITY;
}
