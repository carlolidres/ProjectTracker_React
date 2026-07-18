import { CNF_ENTRY_KEYS } from "@/lib/constants";
import { COPY_FROM_FIRST_PO_AM_FIELDS, PO_FIELDS } from "@/lib/projectFormFields";
import { generateHierarchyId } from "@/lib/utils";
import type { BatchControl, CnfEntry, MoControl, PoControl, ProjectHierarchy } from "@/types";

export function emptyCnfEntry(): CnfEntry {
  return {
    cnf_reference: "",
    qrmr_ref_no: "",
    qrmr_status: "",
    qrmr_target_date: "",
    risk_control: "",
    change_description: "",
    cnf_status: "",
    client_approval_target_date: "",
    remarks: "",
  };
}

function emptyPoControl(): PoControl {
  return {
    po_instance_id: generateHierarchyId("PO"),
    so_no: "",
    po_control_no: "",
    fg_month: "",
    business_unit: "",
    updatedDocsVer: "",
    order_quantity: "",
    uom: "",
    prod_ver: "",
    cnf_reference: "",
    qrmr_ref_no: "",
    qrmr_status: "",
    qrmr_target_date: "",
    risk_control: "",
    change_description: "",
    cnf_status: "",
    client_approval_target_date: "",
    remarks: "",
    cnf_entries: [emptyCnfEntry()],
    manufacturing_start_week: "",
    mo_bmr_po_submission_status: "",
    mo_bmr_po_target_date: "",
    mo_bmr_po_activation_status: "",
    mo_bmr_po_activation_date: "",
    tsd_remarks: "",
    protocol_no: "",
    protocol_Status: "",
    protocol_target_date: "",
    Val_Activity: "",
    Val_Stability: "",
    Val_Batch_Seq_No: "",
    Val_Strategy: "",
    Val_Strategy_remarks: "",
    val_interim_report_no: "",
    val_interim_report_status: "",
    val_interim_report_target_date: "",
    validation_report_no: "",
    validation_report_status: "",
    validation_report_target_date: "",
    endorsement_report_no: "",
    endorsement_report_status: "",
    endorsement_acceptance_target_date: "",
    ar_availability_date: "",
    qc_remarks: "",
    packaging_schedule: "",
    final_status: "OPEN",
    final_status_other: "",
  };
}

function emptyMoControl(): MoControl {
  return {
    mo_instance_id: generateHierarchyId("MO"),
    mo_control_no: "",
    po_controls: [emptyPoControl()],
  };
}

/** Blank Project → Batch → MO → PO hierarchy for create flows. */
export function emptyProjectHierarchy(projectOwner = ""): ProjectHierarchy {
  return {
    project_id: "N/A",
    project_owner: projectOwner,
    activity_type: "",
    client_name: "",
    so_no: "",
    fg_code: "",
    product_name: "",
    validation_report_no: "",
    validation_report_status: "",
    validation_report_target_date: "",
    batches: [
      {
        batch_instance_id: generateHierarchyId("BAT"),
        unique_batch: "",
        mo_controls: [emptyMoControl()],
      },
    ],
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

/** Copy AM/BM/PL and copyFromFirst PO fields from the first PO in the same MO. */
export function copyPoFieldsFromFirstPo(
  target: PoControl,
  source: PoControl,
) {
  for (const key of COPY_FROM_FIRST_PO_AM_FIELDS) {
    (target as unknown as Record<string, string>)[key] = String(
      (source as unknown as Record<string, string>)[key] ?? "",
    );
  }

  for (const field of PO_FIELDS) {
    if (!field.copyFromFirst) continue;
    (target as unknown as Record<string, string>)[field.key] = String(
      (source as unknown as Record<string, string>)[field.key] ?? "",
    );
  }

  if (source.cnf_entries?.length) {
    target.cnf_entries = structuredClone(source.cnf_entries);
    clearPoLevelCnfFields(target);
  }
}
