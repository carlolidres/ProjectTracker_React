import {
  isBlankOrNaCnfValue,
  normalizeCnfReference,
  normalizeCnfTextKey,
} from "@/lib/cnfTrackerAggregation";
import { isMissingValue, valueOrNA } from "@/lib/utils";
import type { CnfTrackerRecord } from "@/types/cnfTracker";
import type { CnfEntry, ProjectHierarchy } from "@/types";

export interface CnfTrackerHeaderFields {
  cnf_reference: string;
  cnf_initiator: string;
  cnf_details: string;
  product_name: string;
  client_name: string;
  qrmr_no: string;
  unique_batch_no: string;
  change_description: string;
}

export function emptyCnfTrackerHeaderFields(): CnfTrackerHeaderFields {
  return {
    cnf_reference: "",
    cnf_initiator: "",
    cnf_details: "",
    product_name: "",
    client_name: "",
    qrmr_no: "",
    unique_batch_no: "",
    change_description: "",
  };
}

export function headerFieldsFromTracker(record: CnfTrackerRecord): CnfTrackerHeaderFields {
  return {
    cnf_reference: String(record.cnf_reference ?? ""),
    cnf_initiator: String(record.cnf_initiator ?? ""),
    cnf_details: String(record.cnf_details ?? ""),
    product_name: String(record.product_name ?? ""),
    client_name: String(record.client_name ?? ""),
    qrmr_no: String(record.qrmr_no ?? ""),
    unique_batch_no: String(record.unique_batch_no ?? ""),
    change_description: String(record.change_description ?? ""),
  };
}

export function isCnfTrackerCreateRequiredComplete(fields: CnfTrackerHeaderFields): boolean {
  return (
    !isBlankOrNaCnfValue(fields.cnf_reference) &&
    !isBlankOrNaCnfValue(fields.cnf_initiator) &&
    !isBlankOrNaCnfValue(fields.change_description)
  );
}

export function findExactCnfReferenceDuplicate(
  records: CnfTrackerRecord[],
  reference: string,
  excludeTrackerId?: string,
): CnfTrackerRecord | null {
  const needle = normalizeCnfReference(reference);
  if (!needle || needle === "N/A") return null;
  for (const record of records) {
    if (!record.is_active && record.is_active !== undefined) continue;
    if (excludeTrackerId && record.cnf_tracker_id === excludeTrackerId) continue;
    if (normalizeCnfReference(record.cnf_reference) === needle) return record;
  }
  return null;
}

/** Soft match on QRMR or Unique Batch when those values are present. */
export function findProbableCnfDuplicates(
  records: CnfTrackerRecord[],
  fields: Pick<CnfTrackerHeaderFields, "qrmr_no" | "unique_batch_no">,
  excludeTrackerId?: string,
): CnfTrackerRecord[] {
  const qrmr = normalizeCnfTextKey(fields.qrmr_no);
  const batch = normalizeCnfTextKey(fields.unique_batch_no);
  if ((!qrmr || qrmr === "n/a") && (!batch || batch === "n/a")) return [];

  const matches: CnfTrackerRecord[] = [];
  for (const record of records) {
    if (!record.is_active && record.is_active !== undefined) continue;
    if (excludeTrackerId && record.cnf_tracker_id === excludeTrackerId) continue;
    const recordQrmr = normalizeCnfTextKey(String(record.qrmr_no ?? ""));
    const recordBatch = normalizeCnfTextKey(String(record.unique_batch_no ?? ""));
    const qrmrHit = Boolean(qrmr && qrmr !== "n/a" && recordQrmr === qrmr);
    const batchHit = Boolean(batch && batch !== "n/a" && recordBatch === batch);
    if (qrmrHit || batchHit) matches.push(record);
  }
  return matches;
}

export function cnfEntryHasExistingData(entry: CnfEntry | undefined): boolean {
  if (!entry) return false;
  return (
    !isMissingValue(entry.cnf_reference) ||
    !isMissingValue(entry.change_description) ||
    !isMissingValue(entry.qrmr_ref_no) ||
    !isMissingValue(entry.cnf_initiator) ||
    !isMissingValue(entry.cnf_details)
  );
}

export function applyTrackerToCnfEntry(
  entry: CnfEntry,
  tracker: CnfTrackerRecord,
): CnfEntry {
  return {
    ...entry,
    cnf_reference: valueOrNA(tracker.cnf_reference),
    change_description: valueOrNA(tracker.change_description),
    qrmr_ref_no: valueOrNA(tracker.qrmr_no),
    cnf_initiator: valueOrNA(tracker.cnf_initiator),
    cnf_details: valueOrNA(tracker.cnf_details),
    cnf_tracker_record_id: String(tracker.record_id ?? ""),
  };
}

/** Carry CNF header into a fresh project; clear product-specific fields. */
export function applyNewProductFromCnf(
  blank: ProjectHierarchy,
  source: ProjectHierarchy,
  tracker?: CnfTrackerRecord | null,
): ProjectHierarchy {
  const sourcePo = source.batches[0]?.mo_controls[0]?.po_controls[0];
  const sourceEntry = sourcePo?.cnf_entries?.[0];
  const next = structuredClone(blank);

  next.product_name = "";
  next.fg_code = "";
  next.client_name = source.client_name;
  next.project_owner = source.project_owner;

  // ponytail: New Product keeps Unique Batch blank; only CNF header carries over.
  if (next.batches[0]) {
    next.batches[0].unique_batch = "";
  }

  const targetPo = next.batches[0]?.mo_controls[0]?.po_controls[0];
  if (targetPo) {
    const baseEntry = targetPo.cnf_entries?.[0] ?? {
      cnf_reference: "N/A",
      qrmr_ref_no: "N/A",
      qrmr_status: "N/A",
      qrmr_target_date: "",
      risk_control: "N/A",
      change_description: "N/A",
      cnf_status: "N/A",
      client_approval_target_date: "",
      remarks: "N/A",
    };

    let entry: CnfEntry;
    if (tracker) {
      entry = applyTrackerToCnfEntry(baseEntry, tracker);
    } else if (sourceEntry) {
      entry = {
        ...baseEntry,
        cnf_reference: valueOrNA(sourceEntry.cnf_reference),
        change_description: valueOrNA(sourceEntry.change_description),
        qrmr_ref_no: valueOrNA(sourceEntry.qrmr_ref_no),
        cnf_initiator: valueOrNA(sourceEntry.cnf_initiator),
        cnf_details: valueOrNA(sourceEntry.cnf_details),
        cnf_tracker_record_id: String(sourceEntry.cnf_tracker_record_id ?? ""),
      };
    } else {
      entry = baseEntry;
    }

    targetPo.cnf_entries = [entry];
    targetPo.cnf_reference = entry.cnf_reference;
    targetPo.change_description = entry.change_description;
    targetPo.qrmr_ref_no = entry.qrmr_ref_no;
  }

  return next;
}

export function filterCnfTrackerRecords(
  records: CnfTrackerRecord[],
  search: string,
): CnfTrackerRecord[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return records;
  return records.filter((record) => {
    const haystack = [
      record.cnf_reference,
      record.cnf_initiator,
      record.change_description,
      record.qrmr_no,
      record.unique_batch_no,
      record.tracker_status,
      record.cnf_details,
    ]
      .map((v) => String(v ?? "").toLowerCase())
      .join(" ");
    return haystack.includes(needle);
  });
}

export function isValidUniqueBatchForNavigation(value: string | undefined | null): boolean {
  return !isBlankOrNaCnfValue(value);
}
