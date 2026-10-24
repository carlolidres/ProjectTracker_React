import assert from "node:assert/strict";
import {
  addWorkingDays,
  applyDependencyConstraints,
  canDeleteGroup,
  compareBoardTasks,
  datesAreOrdered,
  daySpan,
  formatMonthDayYear,
  groupIdForStatus,
  parseMonthDayYear,
  rescheduleFrom,
  resolveProjectAccess,
  shiftTaskDates,
  wouldCycle,
} from "../src/features/project-management/board/boardRules";
import { documentStatusFromBoard, planSpreadsheetTasks, planSupportTasks, spreadsheetPatchesForTask, spreadsheetRowLabel, supportActivityLabel, supportActivityStatusFromBoard, supportPatchesForTask } from "../src/features/project-management/board/boardSourcePlan";
import { labelSaveError, nextLabelColor, type BoardLabel } from "../src/features/project-management/board/boardLabels";
import {
  assessLaunch,
  baselineChangeAllowed,
  priorityFromLaunch,
  finishesIgnoringSprint,
  scheduleVersionsMatch,
  simulateForward,
  workdayDifference,
  type ScheduleEdge,
  type ScheduleNode,
} from "../src/features/project-management/board/launchSchedule";
import type { ProjectRow, SupportActivity } from "../src/types";

assert.equal(datesAreOrdered("2026-10-01", "2026-10-07"), true);
assert.equal(datesAreOrdered("2026-10-08", "2026-10-07"), false);
assert.equal(datesAreOrdered("", "2026-10-07"), true);
assert.equal(datesAreOrdered("2026-10-01", ""), true);
assert.equal(daySpan("2023-07-01", "2023-07-10"), 10);
assert.equal(daySpan("2023-07-01", "2023-07-01"), 1);
assert.equal(daySpan("2023-01-30", "2023-02-03"), 5);
assert.equal(daySpan("2028-02-28", "2028-03-01"), 3);
assert.equal(parseMonthDayYear("07/01/2023"), "2023-07-01");
assert.equal(parseMonthDayYear("02/30/2027"), null);
assert.equal(formatMonthDayYear("2023-07-10"), "07/10/2023");

assert.equal(nextLabelColor(["#00C875", "#FDAB3D"]), "#E2445C");
assert.equal(nextLabelColor(["#00C875"]).toLowerCase() === "#00c875", false);
const sample: BoardLabel = { id: "a", kind: "status", name: "Done", color: "#00C875", order: 0, active: true, retired: false, description: "", semantic: "Done" };
assert.equal(labelSaveError([sample, { ...sample, id: "b", name: "done" }]), "Label names must be different.");
assert.equal(labelSaveError([{ ...sample, name: "  " }]), "Enter a name for each label.");
assert.equal(labelSaveError([sample]), "");

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
  "Commenter",
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
    baselineFinish: "",
    actualFinish: "",
    qualityBlocker: false,
    isLaunch: false,
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

const doneHeld = rescheduleFrom(
  [
    { ...blankTask("a"), startDate: "2026-10-01", dueDate: "2026-10-02" },
    { ...blankTask("b"), status: "Done", startDate: "2026-10-01", dueDate: "2026-10-01" },
  ],
  [{ id: "d", projectId: "p", successorId: "b", predecessorId: "a", relation: "FS", lagDays: 0 }],
  "a",
  { mode: "strict", workingDays: weekdays },
);
assert.equal(doneHeld.updates.some((update) => update.id === "b"), false);

const chain = [
  { id: "report", title: "Analytical Report", durationWorkdays: 1, anchorStart: "2026-11-17" },
  { id: "eval", title: "Results Evaluation", durationWorkdays: 1, anchorStart: null },
  { id: "pv", title: "PV Report", durationWorkdays: 1, anchorStart: null },
  { id: "qa", title: "QA Approval", durationWorkdays: 1, anchorStart: null },
  { id: "launch", title: "Launch", durationWorkdays: 1, anchorStart: null, isLaunch: true },
];
const chainLinks = [
  ["report", "eval"],
  ["eval", "pv"],
  ["pv", "qa"],
  ["qa", "launch"],
].map(([predecessorId, successorId]) => ({ predecessorId, successorId }));
const calm = simulateForward(chain, chainLinks, { workingDays: weekdays });
assert.equal(calm.ok, true);
assert.equal(calm.finishes.launch, "2026-11-23");

function reportFrom(finishes: Record<string, string>, extras: ScheduleNode[] = [], edges: ScheduleEdge[] = []): ReturnType<typeof assessLaunch> {
  const nodes: ScheduleNode[] = [
    ...chain.map((node) => ({
      id: node.id,
      title: node.title,
      start: finishes[node.id] ?? "",
      finish: finishes[node.id] ?? "",
      baselineFinish: calm.finishes[node.id] ?? "",
      qualityBlocker: false,
      isLaunch: Boolean(node.isLaunch),
    })),
    ...extras,
  ];
  const fs: ScheduleEdge[] = chainLinks.map((link) => ({ ...link, relation: "FS" as const, lagDays: 0 }));
  return assessLaunch({
    nodes,
    edges: [...fs, ...edges],
    baselineLaunchDate: "2026-11-30",
    bufferWorkdays: 2,
    workingDays: weekdays,
    qualityRelease: "CLEAR",
  });
}

const onTime = reportFrom(calm.finishes);
assert.equal(onTime.impact, "NO_IMPACT");
assert.equal(onTime.varianceWorkdays, -5);

const slippedQa = simulateForward(
  chain.map((node) => (node.id === "qa" ? { ...node, durationWorkdays: 4 } : node)),
  chainLinks,
  { workingDays: weekdays },
);
const atRisk = reportFrom(slippedQa.finishes);
assert.equal(atRisk.forecastLaunchDate, "2026-11-26");
assert.equal(atRisk.impact, "AT_RISK");
assert.equal(atRisk.tasks.launch.floatWorkdays, 2);

const lateQa = simulateForward(
  chain.map((node) => (node.id === "qa" ? { ...node, durationWorkdays: 9 } : node)),
  chainLinks,
  { workingDays: weekdays },
);
const delayed = reportFrom(lateQa.finishes);
assert.equal(delayed.impact, "DELAYED");
assert.equal(delayed.varianceWorkdays, 3);
assert.equal(delayed.tasks.launch.impact, "DELAYED");

const sideFinish = "2026-11-20";
const offPath = reportFrom(calm.finishes, [{
  id: "side",
  title: "Label artwork",
  start: "2026-11-16",
  finish: sideFinish,
  baselineFinish: "2026-11-13",
  qualityBlocker: false,
  isLaunch: false,
}]);
assert.equal(offPath.impact, "NO_IMPACT");
assert.equal(offPath.tasks.side.late, true);
assert.equal(offPath.tasks.side.impact, "NO_IMPACT");

const parallel = simulateForward(
  [
    { id: "a", title: "Branch A", durationWorkdays: 5, anchorStart: "2026-11-04" },
    { id: "b", title: "Branch B", durationWorkdays: 5, anchorStart: "2026-11-04" },
    { id: "c", title: "Join", durationWorkdays: 1, anchorStart: null },
  ],
  [
    { predecessorId: "a", successorId: "c" },
    { predecessorId: "b", successorId: "c" },
  ],
  { workingDays: weekdays },
);
assert.equal(parallel.finishes.a, "2026-11-10");
assert.equal(parallel.finishes.c, "2026-11-11");

const recovered = reportFrom(calm.finishes);
assert.equal(recovered.impact, "NO_IMPACT");

const missing = assessLaunch({
  nodes: [{ id: "launch", title: "Launch", start: "", finish: "", baselineFinish: "", qualityBlocker: false, isLaunch: true }],
  edges: [],
  baselineLaunchDate: "2026-11-30",
  bufferWorkdays: 2,
  workingDays: weekdays,
  qualityRelease: "PENDING_ASSESSMENT",
});
assert.equal(missing.impact, "NOT_ASSESSED");
assert.equal(missing.qualityRelease, "PENDING_ASSESSMENT");

const cycle = simulateForward(
  [
    { id: "a", title: "A", durationWorkdays: 1, anchorStart: "2026-11-02" },
    { id: "b", title: "B", durationWorkdays: 1, anchorStart: null },
  ],
  [
    { predecessorId: "a", successorId: "b" },
    { predecessorId: "b", successorId: "a" },
  ],
  { workingDays: weekdays },
);
assert.equal(cycle.ok, false);
assert.equal(cycle.finishes.a, undefined);

assert.deepEqual(finishesIgnoringSprint({ launch: "2026-11-23" }), { launch: "2026-11-23" });
const held = assessLaunch({
  nodes: [{
    id: "launch",
    title: "Launch",
    start: "2026-11-23",
    finish: "2026-11-23",
    baselineFinish: "2026-11-23",
    qualityBlocker: true,
    isLaunch: true,
  }],
  edges: [],
  baselineLaunchDate: "2026-11-30",
  bufferWorkdays: 2,
  workingDays: weekdays,
  qualityRelease: "BLOCKED",
});
assert.equal(held.impact, "AT_RISK");
assert.equal(held.qualityRelease, "BLOCKED");
assert.equal(baselineChangeAllowed("2026-12-01", "2026-11-30", false), false);
assert.equal(baselineChangeAllowed("2026-12-01", "2026-11-30", true), true);
assert.equal(scheduleVersionsMatch(3, 3), true);
assert.equal(scheduleVersionsMatch(3, 4), false);
assert.equal(priorityFromLaunch("NO_IMPACT", false), "Low");
assert.equal(priorityFromLaunch("AT_RISK", false), "Medium");
assert.equal(priorityFromLaunch("NOT_ASSESSED", false), "Medium");
assert.equal(priorityFromLaunch(null, false), "Medium");
assert.equal(priorityFromLaunch("DELAYED", false), "High");
assert.equal(priorityFromLaunch("NO_IMPACT", true), "High");
assert.equal(workdayDifference("2026-11-27", "2026-12-01", weekdays, ["2026-11-30"]), 1);
assert.equal(workdayDifference("2026-11-30", "2026-12-03", weekdays), 3);

console.log("pm board rules ok");
