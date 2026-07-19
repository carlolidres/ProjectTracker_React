import assert from "node:assert/strict";
import {
  normalizeWorkflowStatusLabel,
  workflowStatusDescription,
} from "../src/lib/workflowStatus";

assert.equal(normalizeWorkflowStatusLabel("in-process"), "In-process");
assert.equal(workflowStatusDescription("Approved"), "Document has been approved.");
assert.equal(workflowStatusDescription("in-process"), "Document work is underway.");
assert.equal(workflowStatusDescription("N/A"), "No status recorded for this document.");
assert.ok(workflowStatusDescription("Routing")?.includes("circulating"));

console.log("verify-workflow-status: PASS");
