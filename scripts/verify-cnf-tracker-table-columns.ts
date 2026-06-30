import assert from "node:assert/strict";
import {
  CNF_TRACKER_LIST_COLUMN_KEYS,
  CNF_TRACKER_LIST_COLUMN_LABELS,
  filterCnfTrackerVisibleColumnKeys,
  validateCnfTrackerTableColumnAlignment,
} from "../src/lib/cnfTrackerTableColumns";

const allColumns = CNF_TRACKER_LIST_COLUMN_KEYS.map((key) => ({
  key,
  title: CNF_TRACKER_LIST_COLUMN_LABELS[key],
  width: 120,
  fixed: key === "cnfNo" ? ("left" as const) : key === "load" ? ("right" as const) : undefined,
}));

const alignment = validateCnfTrackerTableColumnAlignment(allColumns);
assert.equal(alignment.ok, true, alignment.errors.join("; "));

const hidden = new Set<typeof CNF_TRACKER_LIST_COLUMN_KEYS[number]>(["protocolNo", "endorsementStatus"]);
const visibleKeys = filterCnfTrackerVisibleColumnKeys(hidden);
assert.ok(visibleKeys.includes("cnfNo"));
assert.ok(visibleKeys.includes("load"));
assert.ok(!visibleKeys.includes("protocolNo"));
assert.equal(visibleKeys.length, CNF_TRACKER_LIST_COLUMN_KEYS.length - hidden.size);

const visibleColumns = visibleKeys.map((key) => ({
  key,
  title: CNF_TRACKER_LIST_COLUMN_LABELS[key],
  width: 120,
  fixed: key === "cnfNo" ? ("left" as const) : key === "load" ? ("right" as const) : undefined,
}));
assert.equal(visibleColumns.length, visibleKeys.length);
assert.equal(visibleColumns[visibleColumns.length - 1]?.key, "load");
assert.equal(visibleColumns[visibleColumns.length - 1]?.title, "Action");

console.log("verify-cnf-tracker-table-columns: PASS");
