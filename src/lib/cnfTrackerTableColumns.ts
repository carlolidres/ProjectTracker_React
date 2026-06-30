/** Shared CNF Tracker list table column metadata — single source for headers and body cells. */

export const CNF_TRACKER_LIST_COLUMN_KEYS = [
  "cnfNo",
  "qrmrNo",
  "productName",
  "productCode",
  "uniqueBatchNo",
  "client",
  "descriptionOfChange",
  "department",
  "valActivity",
  "valBatchSeqNo",
  "poControlNumber",
  "fgMonthDate",
  "closedDate",
  "protocolNo",
  "protocolStatus",
  "interimReportNo",
  "interimReportStatus",
  "finalReportNo",
  "finalReportStatus",
  "endorsementNo",
  "endorsementStatus",
  "load",
] as const;

export type CnfTrackerListColumnKey = (typeof CNF_TRACKER_LIST_COLUMN_KEYS)[number];

export const CNF_TRACKER_LIST_COLUMN_LABELS: Record<CnfTrackerListColumnKey, string> = {
  cnfNo: "CNF No.",
  qrmrNo: "QRMR No.",
  productName: "Product Name",
  productCode: "Product Code",
  uniqueBatchNo: "Unique Batch No.",
  client: "Client",
  descriptionOfChange: "Description of Change",
  department: "Department",
  valActivity: "Val Activity",
  valBatchSeqNo: "Val Batch Seq. No.",
  poControlNumber: "PO Control Number",
  fgMonthDate: "FG Month Date",
  closedDate: "Closed Date",
  protocolNo: "Protocol No.",
  protocolStatus: "Protocol Status",
  interimReportNo: "Interim Report No.",
  interimReportStatus: "Interim Report Status",
  finalReportNo: "Final Report No.",
  finalReportStatus: "Final Report Status",
  endorsementNo: "Endorsement No.",
  endorsementStatus: "Endorsement Status",
  load: "Action",
};

export const CNF_TRACKER_LIST_DEFAULT_WIDTHS: Record<CnfTrackerListColumnKey, number> = {
  cnfNo: 200,
  qrmrNo: 120,
  productName: 180,
  productCode: 120,
  uniqueBatchNo: 140,
  client: 160,
  descriptionOfChange: 220,
  department: 120,
  valActivity: 120,
  valBatchSeqNo: 140,
  poControlNumber: 150,
  fgMonthDate: 130,
  closedDate: 130,
  protocolNo: 130,
  protocolStatus: 150,
  interimReportNo: 150,
  interimReportStatus: 170,
  finalReportNo: 140,
  finalReportStatus: 160,
  endorsementNo: 140,
  endorsementStatus: 170,
  load: 90,
};

export const CNF_TRACKER_LIST_PINNED_LEFT: CnfTrackerListColumnKey[] = ["cnfNo"];
export const CNF_TRACKER_LIST_PINNED_RIGHT: CnfTrackerListColumnKey[] = ["load"];

export function isCnfTrackerListPinnedColumn(key: CnfTrackerListColumnKey): boolean {
  return key === "cnfNo" || key === "load";
}

export interface CnfTrackerTableColumnShape {
  key: string;
  title?: unknown;
  width?: number;
  fixed?: "left" | "right";
}

/** Ensures header definitions align with body cells (one column per key, pinned columns present). */
export function validateCnfTrackerTableColumnAlignment(columns: CnfTrackerTableColumnShape[]): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const keys = columns.map((column) => String(column.key));

  if (keys.length !== CNF_TRACKER_LIST_COLUMN_KEYS.length) {
    errors.push(`Expected ${CNF_TRACKER_LIST_COLUMN_KEYS.length} columns, received ${keys.length}.`);
  }

  for (const expectedKey of CNF_TRACKER_LIST_COLUMN_KEYS) {
    if (!keys.includes(expectedKey)) {
      errors.push(`Missing column key: ${expectedKey}`);
    }
  }

  const loadColumn = columns.find((column) => column.key === "load");
  if (!loadColumn) {
    errors.push("Missing Load column.");
  } else {
    if (loadColumn.title !== CNF_TRACKER_LIST_COLUMN_LABELS.load) {
      errors.push("Action column header must be labeled Action.");
    }
    if (loadColumn.fixed !== "right") {
      errors.push("Load column must be fixed to the right.");
    }
  }

  const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicateKeys.length) {
    errors.push(`Duplicate column keys: ${[...new Set(duplicateKeys)].join(", ")}`);
  }

  return { ok: errors.length === 0, errors };
}

export function filterCnfTrackerVisibleColumnKeys(
  hiddenColumns: Set<CnfTrackerListColumnKey>,
): CnfTrackerListColumnKey[] {
  return CNF_TRACKER_LIST_COLUMN_KEYS.filter((key) => {
    if (isCnfTrackerListPinnedColumn(key)) return true;
    return !hiddenColumns.has(key);
  });
}
