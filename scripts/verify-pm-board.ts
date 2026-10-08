import assert from "node:assert/strict";
import {
  addWorkingDays,
  applyDependencyConstraints,
  canDeleteGroup,
  compareBoardTasks,
  datesAreOrdered,
  groupIdForStatus,
  rescheduleFrom,
  resolveProjectAccess,
  shiftTaskDates,
  wouldCycle,
} from "../src/features/project-management/board/boardRules";
import { documentStatusFromBoard, planSpreadsheetTasks, planSupportTasks, spreadsheetPatchesForTask, spreadsheetRowLabel, supportActivityLabel, supportActivityStatusFromBoard, supportPatchesForTask } from "../src/features/project-management/board/boardSourcePlan";
import type { ProjectRow, SupportActivity } from "../src/types";

assert.equal(datesAreOrdered("2026-10-01", "2026-10-07"), true);
assert.equal(datesAreOrdered("2026-10-08", "2026-10-07"), false);
assert.equal(datesAreOrdered("", "2026-10-07"), true);
assert.equal(datesAreOrdered("2026-10-01", ""), true);

assert.equal(canDeleteGroup(0), true);
assert.equal(canDeleteGroup(1), false);

assert.equal(
  resolveProjectAccess({ workspaceRole: "Member", visibility: "invited", projectRole: null }),
  null,
);
assert.equal(
  resolveProjectAccess({ workspaceRole: "Owner", visibility: "invited", projectRole: null }),
  null,
);
assert.equal(
  resolveProjectAccess({ workspaceRole: null, visibility: "invited", projectRole: "Viewer" }),
  "Viewer",
);
assert.equal(
  resolveProjectAccess({ workspaceRole: "Member", visibility: "workspace", projectRole: null }),
  "Editor",
);
assert.equal(
  resolveProjectAccess({ workspaceRole: "Admin", visibility: "workspace", projectRole: null }),
  "Owner",
);
assert.equal(
  resolveProjectAccess({ workspaceRole: "Member", visibility: "workspace", projectRole: "Viewer" }),
  "Viewer",
);
assert.equal(
  resolveProjectAccess({ workspaceRole: null, visibility: "workspace", projectRole: null }),
  null,
);

assert.deepEqual(shiftTaskDates("2026-10-01", "2026-10-03", 2), {
  startDate: "2026-10-03",
  dueDate: "2026-10-05",
});

const weekdays = [1, 2, 3, 4, 5];
assert.equal(addWorkingDays("2026-10-02", 1, weekdays), "2026-10-05");
assert.equal(addWorkingDays("2026-10-02", 0, weekdays), "2026-10-02");

const predecessor = { startDate: "2026-10-01", dueDate: "2026-10-02" };
const successor = { id: "s", startDate: "2026-10-01", dueDate: "2026-10-03" };
const moved = applyDependencyConstraints(
  successor,
  [{ predecessor, relation: "FS", lagDays: 0 }],
  { mode: "flexible", workingDays: weekdays },
);
assert.equal(moved.status, "ok");
assert.equal(moved.startDate, "2026-10-05");
assert.equal(moved.dueDate, "2026-10-06");

const blank = applyDependencyConstraints(
  { id: "s", startDate: "", dueDate: "" },
  [{ predecessor, relation: "FS", lagDays: 0 }],
  { mode: "strict", workingDays: weekdays },
);
assert.equal(blank.status, "dates-required");

const already = applyDependencyConstraints(
  { id: "s", startDate: "2026-10-06", dueDate: "2026-10-08" },
  [{ predecessor, relation: "FS", lagDays: 0 }],
  { mode: "flexible", workingDays: weekdays },
);
assert.equal(already.status, "ok");
assert.equal(already.startDate, undefined);

assert.equal(wouldCycle([], "a", "a"), true);
assert.equal(wouldCycle([{ successorId: "b", predecessorId: "a" }], "a", "b"), true);
assert.equal(wouldCycle([{ successorId: "b", predecessorId: "a" }], "c", "b"), false);

const tasks = [
  { ...blankTask("a"), startDate: "2026-10-01", dueDate: "2026-10-02" },
  { ...blankTask("b"), startDate: "2026-10-01", dueDate: "2026-10-01" },
];
const scheduled = rescheduleFrom(
  tasks,
  [{ id: "d", projectId: "p", successorId: "b", predecessorId: "a", relation: "FS", lagDays: 0 }],
  "a",
  { mode: "strict", workingDays: weekdays },
);
assert.equal(scheduled.updates.find((item) => item.id === "b")?.startDate, "2026-10-05");
assert.equal(scheduled.conflicts.length, 0);

const flexibleKeep = applyDependencyConstraints(
  { id: "b", startDate: "2026-10-02", dueDate: "2026-10-02" },
  [{ predecessor: { startDate: "2026-09-30", dueDate: "2026-10-01" }, relation: "FS", lagDays: 0 }],
  { mode: "flexible", workingDays: weekdays },
);
assert.equal(flexibleKeep.startDate, undefined);

const flexibleMove = applyDependencyConstraints(
  { id: "b", startDate: "2026-10-02", dueDate: "2026-10-02" },
  [{ predecessor: { startDate: "2026-10-01", dueDate: "2026-10-02" }, relation: "FS", lagDays: 0 }],
  { mode: "flexible", workingDays: weekdays },
);
assert.equal(flexibleMove.startDate, "2026-10-05");

const strictShift = applyDependencyConstraints(
  { id: "b", startDate: "2026-09-30", dueDate: "2026-10-01" },
  [{ predecessor: { startDate: "2026-09-29", dueDate: "2026-09-30" }, relation: "FS", lagDays: 0 }],
  { mode: "strict", workingDays: weekdays },
);
assert.equal(strictShift.startDate, "2026-10-01");
assert.equal(strictShift.dueDate, "2026-10-02");

const twoPreds = applyDependencyConstraints(
  { id: "c", startDate: "2026-10-01", dueDate: "2026-10-01" },
  [
    { predecessor: { startDate: "2026-10-01", dueDate: "2026-10-01" }, relation: "FS", lagDays: 0 },
    { predecessor: { startDate: "2026-10-01", dueDate: "2026-10-02" }, relation: "FS", lagDays: 0 },
  ],
  { mode: "strict", workingDays: weekdays },
);
assert.equal(twoPreds.startDate, "2026-10-05");

const noAction = applyDependencyConstraints(
  { id: "b", startDate: "2026-10-01", dueDate: "2026-10-01" },
  [{ predecessor: { startDate: "2026-10-01", dueDate: "2026-10-02" }, relation: "FS", lagDays: 0 }],
  { mode: "none", workingDays: weekdays },
);
assert.equal(noAction.status, "conflict");
assert.equal(noAction.startDate, undefined);

const afterHoliday = applyDependencyConstraints(
  { id: "b", startDate: "2026-10-02", dueDate: "2026-10-02" },
  [{ predecessor: { startDate: "2026-10-01", dueDate: "2026-10-02" }, relation: "FS", lagDays: 0 }],
  { mode: "flexible", workingDays: weekdays, holidays: ["2026-10-05"] },
);
assert.equal(afterHoliday.startDate, "2026-10-06");

function blankTask(id: string) {
  return {
    id,
    projectId: "p",
    groupId: "g",
    parentTaskId: null,
    title: id,
    description: "",
    status: "Not Started" as const,
    priority: "Low" as const,
    startDate: "",
    dueDate: "",
    ownerId: "",
    sortOrder: 0,
    createdBy: "",
    updatedBy: "",
    createdAt: "",
    updatedAt: "",
  };
}

const groups = [
  { id: "planned", name: "Planned" },
  { id: "ongoing", name: "On-going" },
  { id: "done", name: "Done" },
];
assert.equal(groupIdForStatus("Working on it", groups), "ongoing");
assert.equal(groupIdForStatus("Done", groups), "done");
assert.equal(groupIdForStatus("Not Started", groups), "planned");
assert.equal(groupIdForStatus("Stuck", groups), "planned");

const high = { ...blankTask("high"), priority: "High" as const, status: "Not Started" as const };
const medium = { ...blankTask("medium"), priority: "Medium" as const, status: "Not Started" as const };
const stuck = { ...blankTask("stuck"), priority: "Low" as const, status: "Stuck" as const };
assert.ok(compareBoardTasks(high, medium, "priority") < 0);
assert.ok(compareBoardTasks(stuck, high, "priority") < 0);

const sheet = planSpreadsheetTasks([{
  project_id: "PROJ-1",
  product_name: "Calcium",
  updated_at: "2026-10-08",
  protocol_Status: "Approved",
  protocol_no: "P-1",
  protocol_target_date: "2026-10-20",
  manufacturing_start_week: "",
  mo_bmr_po_activation_date: "2026-10-08",
  ar_availability_date: "",
  packaging_schedule: "",
  validation_report_status: "In-process",
  validation_report_target_date: "",
  endorsement_report_status: "",
  endorsement_acceptance_target_date: "",
} as ProjectRow]);
assert.equal(sheet.find((task) => task.title === "Protocol")?.status, "Done");
assert.equal(sheet.find((task) => task.title === "Execution")?.status, "Working on it");
assert.equal(sheet.find((task) => task.title === "Report")?.status, "Working on it");
assert.equal(sheet.find((task) => task.title === "Endorsement")?.status, "Not Started");
assert.equal(sheet.find((task) => task.title === "Execution")?.subtasks.length, 4);

const supportPlan = planSupportTasks({
  activity_id: "SUP-1",
  activity_kind: "Non-Process",
  Product: "Calcium",
  protocol_status: "Approved",
  protocol_number: "P-9",
  status: "Planned",
  status_date: "",
  report_status: "",
  endorsement_status: "Approved",
  Target_Date: "",
  Machinability_Protocol: "",
  Machinability_Protocol_Status: "",
} as SupportActivity);
assert.equal(supportPlan.find((task) => task.title === "Protocol")?.status, "Done");
assert.equal(supportPlan.find((task) => task.title === "Execution")?.status, "Not Started");
assert.equal(supportPlan.find((task) => task.title === "Endorsement")?.status, "Done");
assert.equal(
  spreadsheetRowLabel({ unique_batch: "2026BAKS-1", po_control_no: "PO-1", activity_type: "Pilot", product_name: "Calcium" }),
  "2026BAKS-1 | PO-1 | PILOT | CALCIUM",
);
assert.equal(
  spreadsheetRowLabel({ unique_batch: "2026BAKS-1", po_control_no: "PO-1", activity_type: "", product_name: "Calcium" }),
  "2026BAKS-1 | PO-1 | CALCIUM",
);
assert.equal(supportActivityLabel({ activity_kind: "TSD", non_process_description: "N/A" }), "TSD | N/A");
assert.equal(documentStatusFromBoard("Done", ""), "Approved");
assert.equal(documentStatusFromBoard("Done", "Not Applicable"), null);
assert.equal(documentStatusFromBoard("Working on it", ""), "In-process");
assert.equal(supportActivityStatusFromBoard("Not Started"), "Planned");
assert.equal(spreadsheetPatchesForTask("Endorsement report status", "Done", "2026-10-16", "")[0]?.column, "endorsement_report_status");
assert.equal(supportPatchesForTask("Activity status", "Working on it", "2026-10-08", "", "Planned").find((patch) => patch.column === "status")?.value, "In-process");
assert.equal(supportPatchesForTask("Execution", "Done", "2026-10-20", "2026-10-01", "").find((patch) => patch.column === "planning_schedule")?.value, "2026-10-01");

console.log("pm board rules ok");
