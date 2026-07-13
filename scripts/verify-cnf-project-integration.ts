import assert from "node:assert/strict";
import {
  applyNewProductFromCnf,
  applyTrackerToCnfEntry,
  cnfEntryHasExistingData,
  findExactCnfReferenceDuplicate,
  findProbableCnfDuplicates,
  isCnfTrackerCreateRequiredComplete,
  isValidUniqueBatchForNavigation,
} from "../src/lib/cnfProjectIntegration.ts";
import {
  isBlankOrNaCnfValue,
  normalizeCnfReference,
  normalizeCnfTextKey,
} from "../src/lib/cnfTrackerAggregation.ts";
import { canEditCnfTracker, canEditProjectFields, isViewerRole } from "../src/lib/roleAccess.ts";
import { sanitizeAlphanumericInput } from "../src/lib/utils.ts";
import type { CnfTrackerRecord } from "../src/types/cnfTracker.ts";
import type { CnfEntry, ProjectHierarchy } from "../src/types/index.ts";

function sampleTracker(overrides: Partial<CnfTrackerRecord> = {}): CnfTrackerRecord {
  return {
    record_id: "rec-1",
    cnf_tracker_id: "CNF-2026-001",
    cnf_reference: "CNF-ABC-01",
    cnf_initiator: "Alice",
    cnf_details: "Detail",
    qrmr_no: "QR-1",
    unique_batch_no: "2026BAKS-1",
    change_description: "Change A",
    tracker_status: "Open",
    is_active: true,
    ...overrides,
  };
}

function blankProject(): ProjectHierarchy {
  return {
    project_id: "PROJ-2026-001",
    project_owner: "Owner",
    activity_type: "",
    client_name: "Client",
    so_no: "",
    fg_code: "FG-1",
    product_name: "Product A",
    validation_report_no: "",
    validation_report_status: "",
    validation_report_target_date: "",
    batches: [
      {
        batch_instance_id: "BAT-1",
        unique_batch: "2026BAKS-1",
        mo_controls: [
          {
            mo_instance_id: "MO-1",
            mo_control_no: "MO-1",
            po_controls: [
              {
                so_no: "SO-1",
                po_control_no: "PO-1",
                fg_month: "",
                business_unit: "",
                updatedDocsVer: "",
                order_quantity: "",
                uom: "",
                prod_ver: "",
                cnf_reference: "CNF-ABC-01",
                qrmr_ref_no: "QR-1",
                qrmr_status: "",
                qrmr_target_date: "",
                risk_control: "",
                change_description: "Change A",
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
                endorsement_report_target_date: "",
                cnf_entries: [
                  {
                    cnf_reference: "CNF-ABC-01",
                    qrmr_ref_no: "QR-1",
                    qrmr_status: "",
                    qrmr_target_date: "",
                    risk_control: "",
                    change_description: "Change A",
                    cnf_status: "",
                    client_approval_target_date: "",
                    remarks: "",
                    cnf_initiator: "Alice",
                    cnf_details: "Detail",
                    cnf_tracker_record_id: "rec-1",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

// Normalize + duplicate prevention
assert.equal(normalizeCnfReference("  cnf  abc  "), "CNF ABC");
assert.equal(normalizeCnfTextKey("  QR-1  "), "qr-1");
assert.equal(isBlankOrNaCnfValue("N/A"), true);
assert.equal(isBlankOrNaCnfValue("  "), true);

const trackers = [
  sampleTracker(),
  sampleTracker({
    record_id: "rec-2",
    cnf_tracker_id: "CNF-2026-002",
    cnf_reference: "CNF-XYZ",
    qrmr_no: "QR-9",
    unique_batch_no: "BATCH-9",
  }),
];

assert.ok(findExactCnfReferenceDuplicate(trackers, "  cnf-abc-01  "));
assert.equal(findExactCnfReferenceDuplicate(trackers, "  cnf-abc-01  ", "CNF-2026-001"), null);
assert.equal(findProbableCnfDuplicates(trackers, { qrmr_no: "QR-1", unique_batch_no: "" }).length, 1);
assert.equal(
  findProbableCnfDuplicates(trackers, { qrmr_no: "QR-1", unique_batch_no: "" }, "CNF-2026-001").length,
  0,
);

assert.equal(
  isCnfTrackerCreateRequiredComplete({
    cnf_reference: "CNF-1",
    cnf_initiator: "A",
    cnf_details: "",
    qrmr_no: "",
    unique_batch_no: "",
    change_description: "Desc",
  }),
  true,
);
assert.equal(
  isCnfTrackerCreateRequiredComplete({
    cnf_reference: "",
    cnf_initiator: "A",
    cnf_details: "",
    qrmr_no: "",
    unique_batch_no: "",
    change_description: "Desc",
  }),
  false,
);

// CNF selection / apply
const baseEntry: CnfEntry = {
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
const applied = applyTrackerToCnfEntry(baseEntry, sampleTracker());
assert.equal(applied.cnf_reference, "CNF-ABC-01");
assert.equal(applied.cnf_tracker_record_id, "rec-1");
assert.equal(applied.cnf_initiator, "Alice");
assert.equal(cnfEntryHasExistingData(applied), true);
assert.equal(cnfEntryHasExistingData(baseEntry), false);

// New Product carry-over
const blank = blankProject();
blank.product_name = "";
blank.fg_code = "";
blank.batches[0].mo_controls[0].po_controls[0].cnf_entries = [baseEntry];
blank.batches[0].mo_controls[0].po_controls[0].so_no = "";
blank.batches[0].mo_controls[0].po_controls[0].po_control_no = "";
const source = blankProject();
const nextProduct = applyNewProductFromCnf(blank, source, sampleTracker());
assert.equal(nextProduct.product_name, "");
assert.equal(nextProduct.fg_code, "");
assert.equal(nextProduct.batches[0].mo_controls[0].po_controls[0].cnf_entries?.[0]?.cnf_reference, "CNF-ABC-01");
assert.equal(nextProduct.batches[0].unique_batch, "");
assert.notEqual(nextProduct.batches[0].mo_controls[0].po_controls[0].so_no, "SO-1");

// Unique batch navigation gate
assert.equal(isValidUniqueBatchForNavigation("N/A"), false);
assert.equal(isValidUniqueBatchForNavigation("2026BAKS-1"), true);

// Special characters
assert.match(sanitizeAlphanumericInput("CNF-01/A_B (rev.1); #2 & \"x\" @y"), /CNF-01/);
assert.ok(sanitizeAlphanumericInput("A&B#1%").includes("&"));
assert.ok(sanitizeAlphanumericInput("A&B#1%").includes("#"));
assert.equal(sanitizeAlphanumericInput("A<script>").includes("<"), false);

// Permissions
assert.equal(canEditCnfTracker("admin"), true);
assert.equal(canEditCnfTracker("view"), false);
assert.equal(canEditCnfTracker("am_bm_pl"), false);
assert.equal(isViewerRole("view"), true);
assert.equal(canEditProjectFields("am_bm_pl", "am"), true);
assert.equal(canEditProjectFields("view", "am"), false);

console.log("verify-cnf-project-integration: all assertions passed");
