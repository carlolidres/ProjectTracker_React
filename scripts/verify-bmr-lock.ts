import {
  isProjectBmrLocked,
  projectBmrLockStatusLabel,
  projectHasValidationStudy,
} from "../src/lib/bmrLock";
import type { PoControl, ProjectHierarchy } from "../src/types";

function po(overrides: Partial<PoControl> = {}): PoControl {
  return {
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
    manufacturing_start_week: "",
    mo_bmr_po_submission_status: "",
    mo_bmr_po_target_date: "",
    mo_bmr_po_activation_status: "",
    mo_bmr_po_activation_date: "",
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
    packaging_schedule: "",
    final_status: "OPEN",
    final_status_other: "",
    ...overrides,
  };
}

function projectWithBatches(
  batches: Array<{ unique_batch: string; pos: PoControl[] }>,
): ProjectHierarchy {
  return {
    project_id: "PROJ-TEST",
    project_owner: "Test",
    activity_type: "VAL/VER",
    client_name: "Client",
    so_no: "",
    fg_code: "FG",
    product_name: "Product",
    validation_report_no: "",
    validation_report_status: "",
    validation_report_target_date: "",
    batches: batches.map((batch, batchIndex) => ({
      unique_batch: batch.unique_batch,
      mo_controls: [
        {
          mo_control_no: `MO-${batchIndex + 1}`,
          po_controls: batch.pos,
        },
      ],
    })),
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const validationPo = po({ Val_Activity: "VAL", endorsement_report_status: "In-process" });
const commercialPo = po({ Val_Activity: "COMML" });

const singleValidationBatch = projectWithBatches([
  { unique_batch: "26ASEC-1", pos: [validationPo] },
]);
assert(projectHasValidationStudy(singleValidationBatch), "validation study detected");
assert(projectBmrLockStatusLabel(singleValidationBatch) === "Locked", "pending endorsement shows Locked");
assert(isProjectBmrLocked(singleValidationBatch), "banner should show while endorsement pending");

const commlOnly = projectWithBatches([
  { unique_batch: "COMML-1", pos: [commercialPo] },
]);
assert(projectBmrLockStatusLabel(commlOnly) === "Not Applicable", "no validation study");
assert(!isProjectBmrLocked(commlOnly), "no lock without validation study");

const unlocked = projectWithBatches([
  { unique_batch: "26ASEC-1", pos: [po({ Val_Activity: "VAL", endorsement_report_status: "Approved" })] },
  { unique_batch: "26ASEC-2", pos: [commercialPo] },
]);
assert(projectBmrLockStatusLabel(unlocked) === "Unlocked", "approved endorsement shows Unlocked");
assert(!isProjectBmrLocked(unlocked), "no banner after endorsement approved");

const notApplicableEndorsement = projectWithBatches([
  { unique_batch: "26ASEC-1", pos: [po({ Val_Activity: "VER", endorsement_report_status: "Not Applicable" })] },
]);
assert(projectBmrLockStatusLabel(notApplicableEndorsement) === "Unlocked", "NA endorsement shows Unlocked");

console.log("verify-bmr-lock: ok");
