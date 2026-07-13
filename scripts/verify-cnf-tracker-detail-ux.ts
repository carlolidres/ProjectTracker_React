import assert from "node:assert/strict";
import {
  buildCreatableOptionsFromValues,
  mergeTrackerWithProjectSnapshot,
  normalizeOptionalToNa,
  projectSnapshotForTrackerSync,
} from "../src/lib/cnfTrackerSync.ts";
import { normalizeCnfTextKey } from "../src/lib/cnfTrackerAggregation.ts";
import { sanitizeAlphanumericInput } from "../src/lib/utils.ts";
import type { CnfTrackerRecord } from "../src/types/cnfTracker.ts";
import type { ProjectHierarchy } from "../src/types/index.ts";

function sampleProject(): ProjectHierarchy {
  return {
    project_id: "PROJ-2026-010",
    project_owner: "Owner",
    activity_type: "",
    client_name: "Acme Pharma",
    so_no: "",
    fg_code: "FG-9",
    product_name: "Product X",
    validation_report_no: "",
    validation_report_status: "",
    validation_report_target_date: "",
    batches: [
      {
        batch_instance_id: "BAT-1",
        unique_batch: "2026BAKS-9",
        mo_controls: [
          {
            mo_instance_id: "MO-1",
            mo_control_no: "MO-1",
            po_controls: [
              {
                so_no: "",
                po_control_no: "PO-1",
                fg_month: "",
                business_unit: "",
                updatedDocsVer: "",
                order_quantity: "",
                uom: "",
                prod_ver: "",
                cnf_reference: "CNF-1",
                qrmr_ref_no: "QR-99",
                qrmr_status: "",
                qrmr_target_date: "",
                risk_control: "",
                change_description: "Updated change",
                cnf_status: "Approved",
                client_approval_target_date: "",
                remarks: "",
                manufacturing_start_week: "",
                mo_bmr_po_submission_status: "",
                mo_bmr_po_target_date: "",
                mo_bmr_po_activation_status: "",
                mo_bmr_po_activation_date: "",
                protocol_no: "PROT-1",
                protocol_Status: "",
                protocol_target_date: "",
                Val_Activity: "VAL",
                Val_Stability: "Yes",
                Val_Batch_Seq_No: "1",
                Val_Strategy: "",
                Val_Strategy_remarks: "",
                val_interim_report_no: "INT-1",
                val_interim_report_status: "",
                val_interim_report_target_date: "",
                validation_report_no: "VAL-1",
                validation_report_status: "",
                validation_report_target_date: "",
                endorsement_report_no: "END-1",
                endorsement_report_status: "",
                endorsement_report_target_date: "",
                cnf_entries: [
                  {
                    cnf_reference: "CNF-1",
                    qrmr_ref_no: "QR-99",
                    qrmr_status: "",
                    qrmr_target_date: "",
                    risk_control: "",
                    change_description: "Updated change",
                    cnf_status: "Approved",
                    client_approval_target_date: "",
                    remarks: "",
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

// NA normalization
assert.equal(normalizeOptionalToNa(""), "N/A");
assert.equal(normalizeOptionalToNa("  "), "N/A");
assert.equal(normalizeOptionalToNa("na"), "N/A");
assert.equal(normalizeOptionalToNa("Product X"), "Product X");

// Creatable option dedupe (case-insensitive)
const options = buildCreatableOptionsFromValues(["Alpha", "alpha", "Beta", "N/A", ""]);
assert.equal(options.length, 2);
assert.equal(normalizeCnfTextKey(options[0].value), "alpha");

// Project → tracker sync snapshot
const snapshot = projectSnapshotForTrackerSync(sampleProject());
assert.equal(snapshot.product_name, "Product X");
assert.equal(snapshot.client_name, "Acme Pharma");
assert.equal(snapshot.qrmr_no, "QR-99");
assert.equal(snapshot.change_description, "Updated change");

const tracker: CnfTrackerRecord = {
  record_id: "rec-1",
  cnf_tracker_id: "CNF-2026-001",
  cnf_reference: "CNF-1",
  cnf_initiator: "Alice",
  product_name: "Old Product",
  client_name: "Old Client",
  qrmr_no: "OLD",
  change_description: "Old",
  tracker_status: "Open",
  is_active: true,
};

const merged = mergeTrackerWithProjectSnapshot(tracker, snapshot);
assert.equal(merged.product_name, "Product X");
assert.equal(merged.client_name, "Acme Pharma");
assert.equal(merged.cnf_reference, "CNF-1");
assert.equal(merged.cnf_initiator, "Alice");

// Special characters preserved
assert.ok(sanitizeAlphanumericInput("Prod-01/A_B (rev.1)").includes("/"));
assert.ok(sanitizeAlphanumericInput('Client & Co. #1').includes("&"));
assert.equal(sanitizeAlphanumericInput("Bad<script>").includes("<"), false);

// Validation PO fields present on sample project
const po = sampleProject().batches[0].mo_controls[0].po_controls[0];
assert.equal(po.protocol_no, "PROT-1");
assert.equal(po.val_interim_report_no, "INT-1");
assert.equal(po.validation_report_no, "VAL-1");
assert.equal(po.endorsement_report_no, "END-1");

console.log("verify-cnf-tracker-detail-ux: all assertions passed");
