import { CNF_ENTRY_KEYS } from "@/lib/constants";
import { generateHierarchyId } from "@/lib/utils";
import type { BatchControl, CnfEntry, PoControl, ProjectHierarchy } from "@/types";

export function emptyCnfEntry(): CnfEntry {
  return {
    cnf_reference: "",
    qrmr_ref_no: "",
    change_description: "",
    cnf_status: "",
    client_approval_target_date: "",
    remarks: "",
  };
}

export function getCnfEntryCount(po: PoControl | undefined): number {
  return Math.max(po?.cnf_entries?.length ?? 0, 1);
}

export function buildEmptyCnfEntries(count: number): CnfEntry[] {
  const target = Math.max(count, 1);
  return Array.from({ length: target }, () => emptyCnfEntry());
}

export function clearPoLevelCnfFields(po: PoControl) {
  const first = po.cnf_entries?.[0] ?? emptyCnfEntry();
  CNF_ENTRY_KEYS.forEach((key) => {
    (po as unknown as Record<string, string>)[key] = first[key];
  });
}

export function resizeCnfEntries(po: PoControl, count: number) {
  const target = Math.max(count, 1);
  const current = po.cnf_entries?.length ? [...po.cnf_entries] : [emptyCnfEntry()];
  while (current.length < target) current.push(emptyCnfEntry());
  while (current.length > target) current.pop();
  po.cnf_entries = current.length ? current : [emptyCnfEntry()];
  clearPoLevelCnfFields(po);
}

export function getCanonicalCnfEntryCount(project: ProjectHierarchy): number {
  const canonicalPo = project.batches[0]?.mo_controls[0]?.po_controls[0];
  return getCnfEntryCount(canonicalPo);
}

export function isCanonicalPo(batchIndex: number, moIndex: number, poIndex: number): boolean {
  return batchIndex === 0 && moIndex === 0 && poIndex === 0;
}

export function syncProjectCnfEntryCounts(project: ProjectHierarchy) {
  const count = getCanonicalCnfEntryCount(project);
  project.batches.forEach((batch) => {
    batch.mo_controls.forEach((mo) => {
      mo.po_controls.forEach((po) => resizeCnfEntries(po, count));
    });
  });
}

export function clonePoForAdd(referencePo: PoControl, cnfCount: number): PoControl {
  const clone = structuredClone(referencePo);
  delete clone.record_id;
  clone.po_instance_id = generateHierarchyId("PO");
  clone.so_no = "";
  clone.po_control_no = "";
  clone.fg_month = "";
  resizeCnfEntries(clone, cnfCount);
  clearPoLevelCnfFields(clone);
  return clone;
}

export function cloneBatchDefaults(source: BatchControl, cnfCount: number): BatchControl {
  const clone = structuredClone(source);
  clone.batch_instance_id = generateHierarchyId("BAT");
  clone.mo_controls = clone.mo_controls.map((mo) => {
    const moClone = structuredClone(mo);
    moClone.mo_instance_id = generateHierarchyId("MO");
    moClone.po_controls = mo.po_controls.map((po) => clonePoForAdd(po, cnfCount));
    return moClone;
  });
  return clone;
}
