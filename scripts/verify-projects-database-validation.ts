import assert from "node:assert/strict";
import { compareAppMonthYear, compareMonthFilterDate } from "../src/lib/date";
import { validateSpreadsheetCellValue } from "../src/lib/projectsDatabaseValidation";
import type { SpreadsheetColumnDef } from "../src/lib/projectsDatabaseColumns";

function col(
  field: string,
  editor: SpreadsheetColumnDef["editor"],
  extras: Partial<SpreadsheetColumnDef> = {},
): SpreadsheetColumnDef {
  return {
    field,
    headerName: field,
    editor,
    roleGroup: "am",
    roleGroupLabel: "AM/BM/PL",
    fieldGroup: "am",
    level: "po",
    width: 100,
    ...extras,
  };
}

const registry = {
  cnf_status: ["CNF Creation", "Routing", "Approved"],
};

assert.equal(validateSpreadsheetCellValue(col("x", "select", { registry: "cnf_status" }), "Approved", registry).ok, true);
assert.equal(validateSpreadsheetCellValue(col("x", "select", { registry: "cnf_status" }), "Nope", registry).ok, false);
assert.equal(
  validateSpreadsheetCellValue(
    col("client_name", "select", { registry: "client_name", creatable: true }),
    "Haleon Philippines, Inc.",
    { client_name: ["Acme"] },
  ).ok,
  true,
);
assert.equal(
  validateSpreadsheetCellValue(
    col("client_name", "select", { registry: "client_name", creatable: true }),
    "acme",
    { client_name: ["Acme"] },
  ).normalized,
  "Acme",
);
assert.equal(validateSpreadsheetCellValue(col("x", "month"), "Jun 2026", {}).ok, true);
assert.equal(validateSpreadsheetCellValue(col("x", "month"), "not-a-month", {}).ok, false);
assert.equal(validateSpreadsheetCellValue(col("x", "order_quantity"), "1,234", {}).normalized, "1234");
assert.equal(validateSpreadsheetCellValue(col("x", "alphanumeric"), "BAD!", {}).ok, false);
assert.equal(validateSpreadsheetCellValue(col("x", "text"), "", {}).ok, true);

assert.ok(compareAppMonthYear("30 Jun 2026", "15 May 2026") > 0);
assert.equal(compareAppMonthYear("30 Jun 2026", "01 Jun 2026"), 0);
assert.ok(compareAppMonthYear("N/A", "Jun 2026") > 0);
assert.ok(compareAppMonthYear("May 2026", "2026-06") < 0);

const junFilter = new Date(2026, 5, 1);
assert.equal(compareMonthFilterDate(junFilter, "30 Jun 2026"), 0);
assert.equal(compareMonthFilterDate(junFilter, "01 Jun 2026"), 0);
assert.ok(compareMonthFilterDate(junFilter, "15 May 2026") < 0);
assert.ok(compareMonthFilterDate(junFilter, "Jul 2026") > 0);

console.log("verify-projects-database-validation: PASS");
