import assert from "node:assert/strict";
import {
  projectFiltersFromSearchParams,
  newSupportActivityPath,
  parseActivityKind,
  returnPathWithRecord,
  supportFiltersFromSearchParams,
} from "../src/lib/urlDerivedFilters";

const withDrill = new URLSearchParams("drill=pending_cnf&final_status=OPEN");
const cleared = new URLSearchParams("");

const manual = { search: "alpha", owner: "Carlo" };
const drilled = projectFiltersFromSearchParams(withDrill, manual);

assert.equal(drilled.drill, "pending_cnf");
assert.equal(drilled.final_status, "OPEN");
assert.equal(drilled.search, "alpha");
assert.equal(drilled.owner, "Carlo");

const afterClear = projectFiltersFromSearchParams(cleared, drilled);
assert.equal(afterClear.drill, undefined);
assert.equal(afterClear.final_status, undefined);
assert.equal(afterClear.search, "alpha");
assert.equal(afterClear.owner, "Carlo");

const supportManual = { search: "batch", due_window: "overdue" as const };
const supportDrilled = supportFiltersFromSearchParams(
  new URLSearchParams("due_window=within7"),
  supportManual,
);
assert.equal(supportDrilled.due_window, "within7");
assert.equal(supportDrilled.search, "batch");

const supportCleared = supportFiltersFromSearchParams(new URLSearchParams(""), supportDrilled);
assert.equal(supportCleared.due_window, undefined);
assert.equal(supportCleared.search, "batch");
assert.equal(parseActivityKind("RnD"), "RnD");
assert.equal(parseActivityKind("Non-Process"), "Non-Process");
assert.equal(parseActivityKind("QA"), null);
assert.equal(
  newSupportActivityPath("TSD"),
  "/support-activities?new=1&activity_kind=TSD&return_to=%2Fproject-management",
);
assert.equal(
  returnPathWithRecord("/project-management", "activityId", "ACT-1"),
  "/project-management?activityId=ACT-1",
);
assert.equal(returnPathWithRecord("/project-management", "projectId", "N/A"), "/project-management");

console.log("verify-url-derived-filters: PASS");
