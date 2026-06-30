import assert from "node:assert/strict";
import { validateCnfTrackerClosure } from "../src/lib/cnfClosureValidation";
import type { CnfEntry, ProjectRow } from "../src/types";

function entry(overrides: Partial<CnfEntry> = {}): CnfEntry {
  return {
    cnf_reference: "CNF-001",
    qrmr_ref_no: "",
    qrmr_status: "In-Process",
    qrmr_target_date: "",
    risk_control: "",
    change_description: "",
    cnf_status: "Routing",
    client_approval_target_date: "",
    remarks: "",
    ...overrides,
  };
}

function sampleRow(
  entryOverrides: Partial<CnfEntry> = {},
  rowOverrides: Partial<ProjectRow> = {},
): ProjectRow {
  const cnfEntry = entry(entryOverrides);
  return {
    record_id: "REC-1",
    project_id: "PROJ-1",
    product_name: "Product",
    client_name: "Client",
    po_control_no: "PO-1",
    fg_month: "2026-06",
    protocol_Status: "",
    val_interim_report_status: "",
    validation_report_status: "",
    endorsement_report_status: "",
    cnf_entries_json: JSON.stringify([cnfEntry]),
    ...rowOverrides,
  } as ProjectRow;
}

// Approved CNF shortcut allows close
assert.equal(
  validateCnfTrackerClosure([sampleRow({ cnf_status: "Approved" })], "CNF-001").canClose,
  true,
);

// All gate fields Approved
assert.equal(
  validateCnfTrackerClosure(
    [
      sampleRow(
        { qrmr_status: "Approved" },
        {
          protocol_Status: "Approved",
          val_interim_report_status: "Approved",
          validation_report_status: "Approved",
          endorsement_report_status: "Approved",
        },
      ),
    ],
    "CNF-001",
  ).canClose,
  true,
);

// Not Applicable on applicable statuses
assert.equal(
  validateCnfTrackerClosure(
    [
      sampleRow(
        { qrmr_status: "Not Applicable" },
        {
          protocol_Status: "Not Applicable",
          val_interim_report_status: "Not Applicable",
          validation_report_status: "Not Applicable",
          endorsement_report_status: "Not Applicable",
        },
      ),
    ],
    "CNF-001",
  ).canClose,
  true,
);

// Mixed Approved and Not Applicable
assert.equal(
  validateCnfTrackerClosure(
    [
      sampleRow(
        { qrmr_status: "Approved" },
        {
          protocol_Status: "Not Applicable",
          val_interim_report_status: "Approved",
          validation_report_status: "Not Applicable",
          endorsement_report_status: "Approved",
        },
      ),
    ],
    "CNF-001",
  ).canClose,
  true,
);

// Blank status blocks closure
assert.equal(
  validateCnfTrackerClosure(
    [
      sampleRow(
        { qrmr_status: "Approved" },
        {
          protocol_Status: "",
          val_interim_report_status: "Approved",
          validation_report_status: "Approved",
          endorsement_report_status: "Approved",
        },
      ),
    ],
    "CNF-001",
  ).canClose,
  false,
);

// Pending status blocks closure
assert.equal(
  validateCnfTrackerClosure(
    [
      sampleRow(
        { qrmr_status: "Approved" },
        {
          protocol_Status: "Routing",
          val_interim_report_status: "Approved",
          validation_report_status: "Approved",
          endorsement_report_status: "Approved",
        },
      ),
    ],
    "CNF-001",
  ).canClose,
  false,
);

// In-process blocks closure
assert.equal(
  validateCnfTrackerClosure(
    [
      sampleRow(
        { qrmr_status: "Approved" },
        {
          protocol_Status: "Approved",
          val_interim_report_status: "In-process",
          validation_report_status: "Approved",
          endorsement_report_status: "Approved",
        },
      ),
    ],
    "CNF-001",
  ).canClose,
  false,
);

console.log("verify-cnf-closure-validation: PASS");
