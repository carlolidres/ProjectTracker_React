import assert from "node:assert/strict";
import {
  filterAndSortProcessWorklist,
  filterAndSortSupportWorklist,
  focusGroupForRole,
  supportSeverityFromDays,
} from "../src/lib/worklistSort";
import type { SupportWorklistItem, WorklistItem } from "../src/types";

assert.equal(focusGroupForRole("val"), "VAL");
assert.equal(focusGroupForRole("am_bm_pl"), "AM/BM/PL");
assert.equal(supportSeverityFromDays(-2).severity, "overdue");
assert.equal(supportSeverityFromDays(10).severity, "critical");

const processItems: WorklistItem[] = [
  {
    recordId: "1",
    project_id: "P1",
    product_name: "A",
    client_name: "C",
    po_control_no: "PO1",
    fg_month: "2026-08-01",
    cnf_status: "Routing",
    final_status: "OPEN",
    daysRemaining: 20,
    severity: "high",
    priorityRank: 2,
    incompleteCount: 1,
    nextAction: "x",
    focusGroup: "AM/BM/PL",
    fgSort: 2,
  },
  {
    recordId: "2",
    project_id: "P2",
    product_name: "B",
    client_name: "C",
    po_control_no: "PO2",
    fg_month: "2026-07-01",
    cnf_status: "Routing",
    final_status: "OPEN",
    daysRemaining: -1,
    severity: "overdue",
    priorityRank: 0,
    incompleteCount: 2,
    nextAction: "y",
    focusGroup: "VAL",
    fgSort: 1,
  },
];

const valOnly = filterAndSortProcessWorklist(processItems, "val", false);
assert.equal(valOnly.length, 1);
assert.equal(valOnly[0].focusGroup, "VAL");

const allPrioritized = filterAndSortProcessWorklist(processItems, "val", true);
assert.equal(allPrioritized[0].focusGroup, "VAL");
assert.equal(allPrioritized[1].focusGroup, "AM/BM/PL");

const supportItems: SupportWorklistItem[] = [
  {
    activity_id: "s2",
    activity_kind: "RnD",
    Department: "R",
    Principal: "N/A",
    Product: "P",
    Material: "N/A",
    Line: "N/A",
    non_process_description: "N/A",
    Planning_Schedule: "2026-08-01",
    Target_Date: "2026-09-01",
    status: "Planned",
    severity: "high",
    priorityRank: 2,
    planningSort: 200,
    targetSort: 300,
  },
  {
    activity_id: "s1",
    activity_kind: "TSD",
    Department: "T",
    Principal: "N/A",
    Product: "P",
    Material: "N/A",
    Line: "N/A",
    non_process_description: "N/A",
    Planning_Schedule: "2026-07-01",
    Target_Date: "2026-07-15",
    status: "In-process",
    severity: "overdue",
    priorityRank: 0,
    planningSort: 100,
    targetSort: 150,
  },
];

const tsdOnly = filterAndSortSupportWorklist(supportItems, "tsd", false);
assert.equal(tsdOnly.length, 1);
assert.equal(tsdOnly[0].activity_kind, "TSD");

const supportSorted = filterAndSortSupportWorklist(supportItems, "admin", true);
assert.equal(supportSorted[0].activity_id, "s1");

console.log("verify-worklist-sort: PASS");
