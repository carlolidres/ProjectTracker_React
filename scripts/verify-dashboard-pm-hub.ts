import assert from "node:assert/strict";
import {
  dashboardDoNextHint,
  defaultMyWorkTab,
  defaultTaskPhaseForSource,
  groupedSourceSelectOptions,
  parseSourceKey,
  pendingProtocolWorkFilter,
  processRowMatchesWorkFilter,
  shouldExpandTaskFormDetails,
  sourceKey,
  sourceOptionsFromPortfolio,
  stubPortfolioItem,
  dueWindowWorkFilter,
  taskSourceSelectLabel,
} from "../src/lib/dashboardPmHub";
import { taskPhaseAllowed } from "../src/lib/projectManagementWorkflow";
import type { WorklistItem, WorkflowSnapshot } from "../src/types";

function row(overrides: Partial<WorklistItem>): WorklistItem {
  return {
    recordId: "r1",
    project_id: "PROJ-1",
    product_name: "Product",
    client_name: "Client",
    project_owner: "Owner",
    po_control_no: "PO-1",
    fg_month: "2026-08-01",
    cnf_status: "Approved",
    final_status: "OPEN",
    daysRemaining: 10,
    severity: "high",
    priorityRank: 2,
    incompleteCount: 1,
    nextAction: "Complete protocol",
    focusGroup: "VAL",
    protocolPending: false,
    reportPending: false,
    cnfPending: false,
    ...overrides,
  };
}

assert.equal(defaultMyWorkTab({ role: "pp", assignedTaskCount: 5, filter: null }), "process");
assert.equal(defaultMyWorkTab({ role: "tsd", assignedTaskCount: 5, filter: null }), "support");
assert.equal(defaultMyWorkTab({ role: "admin", assignedTaskCount: 2, filter: null }), "tasks");
assert.equal(defaultMyWorkTab({ role: "admin", assignedTaskCount: 0, filter: null }), "process");
assert.equal(
  defaultMyWorkTab({ role: "admin", assignedTaskCount: 9, filter: pendingProtocolWorkFilter() }),
  "process",
);

assert.equal(processRowMatchesWorkFilter(row({ protocolPending: true }), pendingProtocolWorkFilter()), true);
assert.equal(processRowMatchesWorkFilter(row({ protocolPending: false }), pendingProtocolWorkFilter()), false);
assert.equal(
  processRowMatchesWorkFilter(row({ daysRemaining: -3, final_status: "OPEN" }), dueWindowWorkFilter("overdue", "Overdue")),
  true,
);
assert.equal(
  processRowMatchesWorkFilter(row({ daysRemaining: 5, final_status: "OPEN" }), dueWindowWorkFilter("overdue", "Overdue")),
  false,
);

assert.equal(shouldExpandTaskFormDetails(null), false);
assert.equal(shouldExpandTaskFormDetails({ title: "Task" }), false);
assert.equal(shouldExpandTaskFormDetails({ instructions: "Do the protocol review" }), false);
assert.equal(shouldExpandTaskFormDetails({ percentComplete: 40, status: "In-process" }), true);
assert.equal(shouldExpandTaskFormDetails({ percentComplete: 100, status: "Done" }), false);

assert.equal(defaultTaskPhaseForSource(false, false), "protocol");
assert.equal(defaultTaskPhaseForSource(true, false), "execution");
assert.equal(defaultTaskPhaseForSource(true, true), "report");

assert.equal(sourceKey("process", "PROJ-1"), "process:PROJ-1");
assert.deepEqual(parseSourceKey("support:SUP-1"), { sourceType: "support", sourceId: "SUP-1" });
assert.equal(parseSourceKey("nope"), null);

assert.equal(taskSourceSelectLabel({
  uniqueBatch: "2026BAKS-1",
  product: "Advil Infant",
  fallback: "PROJ-1",
}), "2026BAKS-1 · Advil Infant");
assert.equal(taskSourceSelectLabel({
  uniqueBatch: "N/A",
  product: "",
  projectName: "Calibration",
  fallback: "SPROJ-1",
}), "Calibration");
assert.equal(taskSourceSelectLabel({ uniqueBatch: "", product: "", fallback: "PROJ-9" }), "PROJ-9");

const grouped = groupedSourceSelectOptions([
  { sourceType: "process", sourceId: "PROJ-1", label: "2026BAKS-1 · Product" },
  { sourceType: "support", sourceId: "SUP-1", label: "Activity" },
]);
assert.equal(grouped[0]?.label, "Projects Database");
assert.equal(grouped[1]?.label, "Support Activities");

const portfolioOptions = sourceOptionsFromPortfolio([
  {
    ...stubPortfolioItem("process", "PROJ-1"),
    product: "Advil Infant",
    uniqueBatch: "2026BAKS-1",
    statusGroup: "Ongoing",
  },
  { ...stubPortfolioItem("process", "PROJ-2"), product: "Closed", statusGroup: "Completed" },
]);
assert.equal(portfolioOptions.map((row) => row.sourceId).join(","), "PROJ-1");
assert.equal(portfolioOptions[0]?.label, "2026BAKS-1 · Advil Infant");
assert.equal(portfolioOptions[0]?.uniqueBatch, "2026BAKS-1");
assert.equal(groupedSourceSelectOptions(portfolioOptions)[0]?.options[0]?.uniqueBatch, "2026BAKS-1");

assert.match(dashboardDoNextHint("val"), /protocol/i);
assert.match(dashboardDoNextHint("view"), /view-only/i);

const gated: WorkflowSnapshot = {
  phase: "protocol_prep",
  protocolComplete: false,
  executionComplete: false,
  reportComplete: false,
  canEnterExecution: false,
  canEnterReport: false,
  incompleteRequirements: [{ gate: "protocol", label: "Protocol status", fieldKey: "protocol_Status" }],
  protocolStatus: "Draft",
  executionStatus: "Incomplete",
  reportStatus: "N/A",
  category: "Validation",
  changeLabel: "Change",
  client: "Client",
  product: "Product",
};
assert.equal(taskPhaseAllowed(gated, "protocol"), true);
assert.equal(taskPhaseAllowed(gated, "execution"), false);
assert.equal(taskPhaseAllowed(gated, "report"), false);

console.log("verify-dashboard-pm-hub: ok");
