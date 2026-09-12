import assert from "node:assert/strict";
import {
  canAssignPmTasks,
  canOverridePmPhase,
  canReopenPmTask,
  canUpdateAssignedPmTask,
  isPmTaskAssigneeOption,
} from "../src/lib/projectManagementPermissions";
import {
  buildCreateTaskDraftFromWorkspace,
  buildDerivedWorkflowItems,
  buildTaskDraftFromBoardItem,
  deriveWorkflowSnapshot,
  findUserTaskForBoardItem,
  mergeWorkflowBoardItems,
  myTaskSection,
  taskPhaseAllowed,
  taskPhaseFromWorkflowPhase,
  toPmTaskPhase,
} from "../src/lib/projectManagementWorkflow";
import type { ProjectRow, SupportActivity } from "../src/types";

function project(overrides: Partial<ProjectRow>): ProjectRow {
  return {
    record_id: "REC-1",
    project_id: "PROJ-2026-001",
    project_owner: "Owner A",
    activity_type: "PV",
    client_name: "Client",
    so_no: "SO-1",
    fg_code: "FG-1",
    product_name: "Product A",
    batch_instance_id: "BAT-1",
    unique_batch: "UB-1",
    mo_instance_id: "MO-1",
    mo_control_no: "MO-1",
    po_instance_id: "PO-1",
    po_control_no: "PO-1",
    fg_month: "2026-08",
    business_unit: "BU",
    updatedDocsVer: "1",
    order_quantity: "1",
    uom: "EA",
    prod_ver: "1",
    cnf_reference: "CNF-1",
    qrmr_ref_no: "N/A",
    qrmr_status: "N/A",
    qrmr_target_date: "N/A",
    risk_control: "N/A",
    change_description: "New product",
    cnf_status: "Approved",
    client_approval_target_date: "N/A",
    remarks: "N/A",
    cnf_entries_json: "[]",
    manufacturing_start_week: "N/A",
    mo_bmr_po_submission_status: "N/A",
    mo_bmr_po_target_date: "N/A",
    mo_bmr_po_activation_status: "N/A",
    mo_bmr_po_activation_date: "N/A",
    tsd_remarks: "N/A",
    protocol_no: "N/A",
    protocol_Status: "N/A",
    protocol_target_date: "N/A",
    Val_Activity: "VAL",
    Val_Stability: "N/A",
    Val_Batch_Seq_No: "N/A",
    Val_Strategy: "N/A",
    Val_Strategy_remarks: "N/A",
    val_interim_report_no: "N/A",
    val_interim_report_status: "N/A",
    val_interim_report_target_date: "N/A",
    validation_report_no: "N/A",
    validation_report_status: "N/A",
    validation_report_target_date: "N/A",
    endorsement_report_no: "N/A",
    endorsement_report_status: "N/A",
    endorsement_acceptance_target_date: "N/A",
    ar_availability_date: "N/A",
    qc_remarks: "N/A",
    packaging_schedule: "N/A",
    final_status: "OPEN",
    final_status_other: "N/A",
    created_by: "",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_by: "",
    updated_at: "2026-08-01T00:00:00.000Z",
    is_active: true,
    ...overrides,
  };
}

function support(overrides: Partial<SupportActivity>): SupportActivity {
  return {
    activity_id: "SUP-1",
    project_id: "SPROJ-2026-001",
    activity_kind: "Non-Process",
    Department: "VAL",
    Material: "N/A",
    Line: "N/A",
    Bulk: "N/A",
    Machinability_Protocol: "N/A",
    Machinability_Protocol_Status: "N/A",
    Machinability_Report: "N/A",
    Machinability_Report_Status: "N/A",
    Product_User: "N/A",
    Principal: "ILI",
    Product: "N/A",
    Target_Date: "30 Aug 2026",
    Planning_Schedule: "N/A",
    status: "Planned",
    status_date: "N/A",
    cnf_tracker_record_id: null,
    cnf_link_state: "unset",
    cnf_number_display: "N/A",
    non_process_description: "Calibration",
    activity_type: "N/A",
    type_of_validation: "VAL",
    protocol_number: "N/A",
    protocol_status: "N/A",
    report_number: "N/A",
    report_status: "N/A",
    endorsement_number: "N/A",
    endorsement_status: "N/A",
    endorsement_tracker_record_id: null,
    sync_version: 1,
    created_by: "",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_by: "",
    updated_at: "2026-08-01T00:00:00.000Z",
    is_active: true,
    ...overrides,
  };
}

const noProtocol = deriveWorkflowSnapshot({
  sourceType: "process",
  projectRows: [project({})],
});
assert.equal(noProtocol.phase, "protocol_prep");
assert.equal(noProtocol.canEnterExecution, false);
assert.equal(noProtocol.canEnterReport, false);
assert.equal(taskPhaseAllowed(noProtocol, "execution"), false);
assert.ok(noProtocol.incompleteRequirements.some((item) => item.fieldKey === "protocol_Status"));

const routing = deriveWorkflowSnapshot({
  sourceType: "process",
  projectRows: [project({ protocol_no: "PV-1", protocol_Status: "Routing" })],
});
assert.equal(routing.phase, "protocol_review");
assert.equal(routing.canEnterExecution, false);

const clientApproval = deriveWorkflowSnapshot({
  sourceType: "process",
  projectRows: [project({ protocol_no: "PV-1", protocol_Status: "Client Approval" })],
});
assert.equal(clientApproval.phase, "protocol_approval");

const protocolApproved = deriveWorkflowSnapshot({
  sourceType: "process",
  projectRows: [project({ protocol_no: "PV-1", protocol_Status: "Approved" })],
});
assert.equal(protocolApproved.canEnterExecution, true);
assert.equal(protocolApproved.canEnterReport, false);
assert.equal(protocolApproved.phase, "execution_planning");
assert.equal(taskPhaseAllowed(protocolApproved, "execution"), true);
assert.equal(taskPhaseAllowed(protocolApproved, "report"), false);

const executing = deriveWorkflowSnapshot({
  sourceType: "process",
  projectRows: [project({
    protocol_no: "PV-1",
    protocol_Status: "Approved",
    manufacturing_start_week: "2026-02-23",
  })],
});
assert.equal(executing.phase, "execution");

const executionReady = deriveWorkflowSnapshot({
  sourceType: "process",
  projectRows: [project({
    protocol_no: "PV-1",
    protocol_Status: "Approved",
    manufacturing_start_week: "2026-02-23",
    mo_bmr_po_activation_date: "2026-02-20",
    ar_availability_date: "2026-02-21",
    packaging_schedule: "2026-02-28",
  })],
});
assert.equal(executionReady.canEnterReport, true);
assert.equal(executionReady.phase, "report_prep");

const reportReview = deriveWorkflowSnapshot({
  sourceType: "process",
  projectRows: [project({
    protocol_no: "PV-1",
    protocol_Status: "Approved",
    manufacturing_start_week: "2026-02-23",
    mo_bmr_po_activation_date: "2026-02-20",
    ar_availability_date: "2026-02-21",
    packaging_schedule: "2026-02-28",
    validation_report_status: "Routing",
  })],
});
assert.equal(reportReview.phase, "report_review");

const closed = deriveWorkflowSnapshot({
  sourceType: "process",
  projectRows: [project({
    protocol_no: "PV-1",
    protocol_Status: "Approved",
    manufacturing_start_week: "2026-02-23",
    mo_bmr_po_activation_date: "2026-02-20",
    ar_availability_date: "2026-02-21",
    packaging_schedule: "2026-02-28",
    validation_report_status: "Approved",
    endorsement_report_status: "Approved",
    final_status: "CLOSED",
  })],
});
assert.equal(closed.phase, "closure");

const executionOverride = deriveWorkflowSnapshot({
  sourceType: "process",
  projectRows: [project({})],
  overrides: [{ gate: "execution" }],
});
assert.equal(executionOverride.canEnterExecution, true);
assert.equal(executionOverride.phase, "execution_planning");

const reportOverride = deriveWorkflowSnapshot({
  sourceType: "process",
  projectRows: [project({ protocol_no: "PV-1", protocol_Status: "Approved" })],
  overrides: [{ gate: "report" }],
});
assert.equal(reportOverride.canEnterReport, true);
assert.equal(reportOverride.phase, "report_prep");

const verification = deriveWorkflowSnapshot({
  sourceType: "process",
  projectRows: [project({
    protocol_no: "PV-1",
    protocol_Status: "Approved",
    manufacturing_start_week: "2026-02-23",
    mo_bmr_po_activation_date: "2026-02-20",
    ar_availability_date: "2026-02-21",
    packaging_schedule: "2026-02-28",
  })],
  userTasks: [{ phase: "execution", status: "In-process" }],
});
assert.equal(verification.phase, "execution_verification");
assert.equal(verification.canEnterReport, false);

const supportPrep = deriveWorkflowSnapshot({ sourceType: "support", support: support({}) });
assert.equal(supportPrep.phase, "protocol_prep");
assert.equal(supportPrep.canEnterExecution, false);

const supportExec = deriveWorkflowSnapshot({
  sourceType: "support",
  support: support({ protocol_status: "Approved", status: "In-process" }),
});
assert.equal(supportExec.phase, "execution");
assert.equal(supportExec.canEnterExecution, true);

const derived = buildDerivedWorkflowItems({
  sourceType: "process",
  sourceId: "PROJ-2026-001",
  projectRows: [project({ Val_Activity: "CHAR" })],
});
assert.ok(derived.some((item) => item.title === "Protocol approval" && item.locked));
assert.ok(derived.some((item) => item.category === "Characterization"));
assert.equal(toPmTaskPhase("protocol_prep"), "protocol");
assert.equal(toPmTaskPhase("execution"), "execution");

const linkedTask = {
  id: "task-1",
  sourceType: "process" as const,
  sourceId: "PROJ-2026-001",
  parentTaskId: null,
  title: "Protocol approval",
  instructions: "",
  phase: "protocol" as const,
  status: "Planned" as const,
  priority: "Medium" as const,
  percentComplete: 0,
  startDate: "",
  targetDate: "",
  actualDate: "",
  category: "Characterization" as const,
  dependsOnTaskId: null,
  attachmentUrl: "",
  assigneeIds: ["user-val"],
  createdBy: "user-val",
  updatedBy: "user-val",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};
const protocolRow = derived.find((item) => item.title === "Protocol approval");
assert.ok(protocolRow);
assert.equal(findUserTaskForBoardItem(protocolRow, [linkedTask])?.id, "task-1");
assert.equal(mergeWorkflowBoardItems(derived, [linkedTask])[0]?.origin, "user");
assert.equal(buildTaskDraftFromBoardItem(protocolRow, "process", "PROJ-2026-001").phase, "protocol");

assert.equal(taskPhaseFromWorkflowPhase("protocol_prep"), "protocol");
assert.equal(taskPhaseFromWorkflowPhase("execution_planning"), "execution");
assert.equal(taskPhaseFromWorkflowPhase("report_review"), "report");

const protocolSnapshot = deriveWorkflowSnapshot({
  sourceType: "process",
  projectRows: [project({
    protocol_Status: "Draft",
    protocol_target_date: "2026-09-15",
    Val_Activity: "VER",
  })],
});
const protocolDraft = buildCreateTaskDraftFromWorkspace({
  sourceType: "process",
  sourceId: "PROJ-2026-001",
  snapshot: protocolSnapshot,
  derivedItems: buildDerivedWorkflowItems({
    sourceType: "process",
    sourceId: "PROJ-2026-001",
    projectRows: [project({
      protocol_Status: "Draft",
      protocol_target_date: "2026-09-15",
      Val_Activity: "VER",
    })],
  }),
});
assert.equal(protocolDraft.title, "Protocol Preparation");
assert.equal(protocolDraft.phase, "protocol");
assert.equal(protocolDraft.category, "Verification");
assert.equal(protocolDraft.targetDate, "2026-09-15");
assert.equal(protocolDraft.parentTaskId, null);
assert.equal(protocolDraft.dependsOnTaskId, null);

assert.equal(canAssignPmTasks("view"), false);
assert.equal(canAssignPmTasks("am_bm_pl"), false);
assert.equal(canAssignPmTasks("am_bm_pl", true), true);
assert.equal(canAssignPmTasks("admin", false), true);
assert.equal(canAssignPmTasks("val", false), true);
assert.equal(isPmTaskAssigneeOption({
  status: "active",
  role: "val",
  pm_task_eligible: false,
}), true);
assert.equal(isPmTaskAssigneeOption({
  status: "active",
  role: "am_bm_pl",
  pm_task_eligible: true,
}), true);
assert.equal(isPmTaskAssigneeOption({
  status: "active",
  role: "am_bm_pl",
  pm_task_eligible: false,
}), false);
assert.equal(canOverridePmPhase("qa"), false);
assert.equal(canOverridePmPhase("val"), true);
assert.equal(canReopenPmTask("pp"), false);
assert.equal(canUpdateAssignedPmTask("view", "u1", ["u1"]), false);
assert.equal(canUpdateAssignedPmTask("qc", "u1", ["u1"]), true);
assert.equal(canUpdateAssignedPmTask("qc", "u2", ["u1"]), false);
assert.equal(canUpdateAssignedPmTask("qc", "u2", ["u1"], true), true);

assert.equal(myTaskSection({ status: "Done", targetDate: "2020-01-01" }), "completed");
assert.equal(myTaskSection({ status: "Planned", targetDate: "2020-01-01" }, new Date("2026-09-12")), "overdue");
assert.equal(myTaskSection({ status: "Planned", targetDate: "2026-09-12" }, new Date("2026-09-12")), "today");

console.log("verify-project-management-workflow: PASS");
