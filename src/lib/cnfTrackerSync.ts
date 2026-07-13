import {
  findExactCnfReferenceDuplicate,
  findProbableCnfDuplicates,
  isCnfTrackerCreateRequiredComplete,
  type CnfTrackerHeaderFields,
} from "@/lib/cnfProjectIntegration";
import { isBlankOrNaCnfValue, normalizeCnfTextKey } from "@/lib/cnfTrackerAggregation";
import { NA_VALUE } from "@/lib/constants";
import { isMissingValue, valueOrNA } from "@/lib/utils";
import type { CnfTrackerRecord } from "@/types/cnfTracker";
import type { ProjectHierarchy } from "@/types";

/** Fields the Project form owns once a CNF is linked. */
export const PROJECT_OWNED_CNF_FIELDS = [
  "product_name",
  "client_name",
  "qrmr_no",
  "change_description",
] as const;

export function normalizeOptionalToNa(value: string | undefined | null): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed.toUpperCase() === "NA" || trimmed.toUpperCase() === "N/A") {
    return NA_VALUE;
  }
  return trimmed;
}

export function displayNaGuide(value: string | undefined | null): boolean {
  return isMissingValue(value);
}

export function buildCreatableOptionsFromValues(values: string[]): { value: string }[] {
  const byKey = new Map<string, string>();
  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (isBlankOrNaCnfValue(trimmed)) continue;
    const key = normalizeCnfTextKey(trimmed);
    if (!byKey.has(key)) byKey.set(key, trimmed);
  }
  return Array.from(byKey.values())
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value }));
}

export function headerFieldsFromTrackerV2(record: CnfTrackerRecord): CnfTrackerHeaderFields & {
  product_name: string;
  client_name: string;
} {
  return {
    cnf_reference: String(record.cnf_reference ?? ""),
    cnf_initiator: String(record.cnf_initiator ?? ""),
    cnf_details: String(record.cnf_details ?? ""),
    qrmr_no: String(record.qrmr_no ?? ""),
    unique_batch_no: String(record.unique_batch_no ?? ""),
    change_description: String(record.change_description ?? ""),
    product_name: String(record.product_name ?? ""),
    client_name: String(record.client_name ?? ""),
  };
}

export function projectSnapshotForTrackerSync(project: ProjectHierarchy): {
  product_name: string;
  client_name: string;
  qrmr_no: string;
  change_description: string;
  unique_batch_no: string;
} {
  const po = project.batches[0]?.mo_controls[0]?.po_controls[0];
  const entry = po?.cnf_entries?.[0];
  return {
    product_name: normalizeOptionalToNa(project.product_name),
    client_name: normalizeOptionalToNa(project.client_name),
    qrmr_no: normalizeOptionalToNa(entry?.qrmr_ref_no ?? po?.qrmr_ref_no),
    change_description: normalizeOptionalToNa(entry?.change_description ?? po?.change_description),
    unique_batch_no: normalizeOptionalToNa(project.batches[0]?.unique_batch),
  };
}

export function mergeTrackerWithProjectSnapshot(
  tracker: CnfTrackerRecord,
  snapshot: ReturnType<typeof projectSnapshotForTrackerSync>,
): CnfTrackerRecord {
  return {
    ...tracker,
    product_name: snapshot.product_name,
    client_name: snapshot.client_name,
    qrmr_no: snapshot.qrmr_no,
    change_description: snapshot.change_description,
    unique_batch_no: isBlankOrNaCnfValue(snapshot.unique_batch_no)
      ? valueOrNA(tracker.unique_batch_no)
      : snapshot.unique_batch_no,
  };
}

export {
  findExactCnfReferenceDuplicate,
  findProbableCnfDuplicates,
  isCnfTrackerCreateRequiredComplete,
};
