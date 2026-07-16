import assert from "node:assert/strict";
import {
  canonicalizeEndorsementStatus,
  isInProcessEndorsementStatus,
  pickSyncMappedFields,
  shouldOpenEndorsementTrackerFromProjectStatus,
  shouldOpenEndorsementTrackerFromSupportStatus,
  shouldSkipEchoSync,
  buildEndorsementPayloadFromSupport,
  buildEndorsementPayloadFromProject,
} from "../src/lib/endorsementSync.ts";
import {
  normalizeOptionalNaForSubmit,
  toEditableNaField,
  shouldShowNaGuide,
} from "../src/lib/naField.ts";
import { renumberEndorsementItems } from "../src/lib/endorsementMappers.ts";
import {
  canManageEndorsementTracker,
  canEditEndorsementQaOnly,
  canRemoveReusableOptions,
  canAccessRoute,
  isViewerRole,
  ROUTE_ACCESS,
} from "../src/lib/roleAccess.ts";

function testNaNormalization() {
  assert.equal(normalizeOptionalNaForSubmit(""), "N/A");
  assert.equal(normalizeOptionalNaForSubmit("  "), "N/A");
  assert.equal(normalizeOptionalNaForSubmit("NA"), "N/A");
  assert.equal(normalizeOptionalNaForSubmit("Value"), "Value");
  assert.equal(toEditableNaField(null), "");
  assert.equal(toEditableNaField("N/A"), "");
  assert.equal(toEditableNaField("Kept"), "Kept");
  assert.equal(shouldShowNaGuide("", false, false), true);
  assert.equal(shouldShowNaGuide("", true, false), false);
  assert.equal(shouldShowNaGuide("X", false, false), false);
}

function testEndorsementStatusCanon() {
  assert.equal(canonicalizeEndorsementStatus("In-process"), "In Process");
  assert.equal(canonicalizeEndorsementStatus("In Process"), "In Process");
  assert.equal(canonicalizeEndorsementStatus("in_process"), "In Process");
  assert.equal(isInProcessEndorsementStatus("In-process"), true);
  assert.equal(isInProcessEndorsementStatus("Routing"), false);
  assert.equal(isInProcessEndorsementStatus("N/A"), false);
  assert.equal(shouldOpenEndorsementTrackerFromProjectStatus("In-process"), true);
  assert.equal(shouldOpenEndorsementTrackerFromProjectStatus("Routing"), true);
  assert.equal(shouldOpenEndorsementTrackerFromProjectStatus("Approved"), true);
  assert.equal(shouldOpenEndorsementTrackerFromProjectStatus("Custom Status"), true);
  assert.equal(shouldOpenEndorsementTrackerFromProjectStatus("Not Applicable"), false);
  assert.equal(shouldOpenEndorsementTrackerFromProjectStatus("N/A"), false);
  assert.equal(shouldOpenEndorsementTrackerFromProjectStatus(""), false);
  assert.equal(shouldOpenEndorsementTrackerFromSupportStatus("In Process"), true);
  assert.equal(shouldOpenEndorsementTrackerFromSupportStatus("In-process"), true);
  assert.equal(shouldOpenEndorsementTrackerFromSupportStatus("Routing"), true);
  assert.equal(shouldOpenEndorsementTrackerFromSupportStatus("Done"), true);
  assert.equal(shouldOpenEndorsementTrackerFromSupportStatus("Planned"), false);
}

function testSyncMappingAndLoops() {
  const mapped = pickSyncMappedFields({
    endorsement_number: "END-1",
    endorsement_status: "In-process",
    product_name: "Prod",
    unrelated: "skip-me",
  });
  assert.equal(mapped.endorsement_number, "END-1");
  assert.equal(mapped.endorsement_status, "In Process");
  assert.equal(mapped.product_name, "Prod");
  assert.equal((mapped as Record<string, unknown>).unrelated, undefined);
  assert.equal(shouldSkipEchoSync("source", "source"), true);
  assert.equal(shouldSkipEchoSync("tracker", "source"), false);
  assert.equal(shouldSkipEchoSync(null, "source"), false);
}

function testPayloadBuilders() {
  const fromSupport = buildEndorsementPayloadFromSupport({
    activity_id: "SUP-1",
    endorsement_number: "E-1",
    endorsement_status: "In-process",
    non_process_description: "Desc",
    cnf_tracker_record_id: "uuid-1",
    cnf_number_display: "CNF-A",
  });
  assert.equal(fromSupport.process_classification, "non_process");
  assert.equal(fromSupport.endorsement_status, "In Process");
  assert.equal(fromSupport.support_activity_id, "SUP-1");

  const fromProject = buildEndorsementPayloadFromProject({
    project_id: "PROJ-1",
    record_id: "REC-1",
    product_name: "P",
    fg_code: "FG",
    endorsement_report_no: "ER-1",
    endorsement_report_status: "In Process",
    cnf_reference: "CNF-1",
  });
  assert.equal(fromProject.process_classification, "process");
  assert.equal(fromProject.project_record_id, "REC-1");
  assert.equal(fromProject.product_code, "FG");
}

function testItemRenumber() {
  const items = [
    { item_id: "a", item_number: 9, sort_order: 9 },
    { item_id: "b", item_number: 2, sort_order: 2 },
  ];
  const renumbered = renumberEndorsementItems(items);
  assert.equal(renumbered[0].item_id, "a");
  assert.equal(renumbered[0].item_number, 1);
  assert.equal(renumbered[1].item_id, "b");
  assert.equal(renumbered[1].item_number, 2);
  assert.equal(renumbered[1].sort_order, 1);
}

function testPermissionsAndRoute() {
  assert.equal(canManageEndorsementTracker("admin"), true);
  assert.equal(canManageEndorsementTracker("val"), true);
  assert.equal(canManageEndorsementTracker("qa"), false);
  assert.equal(canEditEndorsementQaOnly("qa"), true);
  assert.equal(canRemoveReusableOptions("admin"), true);
  assert.equal(canRemoveReusableOptions("val"), false);
  assert.equal(isViewerRole("view"), true);
  assert.equal(canAccessRoute("view", "/endorsement-tracker"), true);
  assert.ok(ROUTE_ACCESS.some((entry) => entry.path === "/endorsement-tracker"));
}

function testSupportKindIncludesNonProcess() {
  const kinds = ["TSD", "RnD", "Non-Process"] as const;
  assert.ok(kinds.includes("Non-Process"));
}

testNaNormalization();
testEndorsementStatusCanon();
testSyncMappingAndLoops();
testPayloadBuilders();
testItemRenumber();
testPermissionsAndRoute();
testSupportKindIncludesNonProcess();

console.log("verify-endorsement-support: all checks passed");
