import assert from "node:assert/strict";
import {
  pendingCnfDatabaseRoute,
  projectsDatabaseRoute,
  supportActivitiesRoute,
} from "../src/lib/dashboardDrilldown";
import {
  ROLE_FOCUS_CONTEXT_FIELDS,
  resolveSpreadsheetColumnFocus,
  spreadsheetColumnsForPendingRole,
  spreadsheetColumnsForRoleGroupLabels,
  spreadsheetFieldGroupForPendingRole,
} from "../src/lib/projectsDatabaseColumns";
import {
  auditFiltersFromSearchParams,
  cnfFiltersFromSearchParams,
  projectFilterBannerLabels,
  projectFiltersFromSearchParams,
  supportFilterBannerLabels,
  supportFiltersFromSearchParams,
} from "../src/lib/urlDerivedFilters";

assert.equal(projectsDatabaseRoute(), "/projects/database?return_to=%2Fdashboard");
assert.equal(
  projectsDatabaseRoute({ final_status: "OPEN", due_window: "overdue" }),
  "/projects/database?final_status=OPEN&due_window=overdue&return_to=%2Fdashboard",
);
assert.equal(
  projectsDatabaseRoute({ delivery_status: "late", sort: "fg_month", order: "asc" }),
  "/projects/database?delivery_status=late&sort=fg_month&order=asc&return_to=%2Fdashboard",
);
assert.equal(pendingCnfDatabaseRoute(), "/projects/database?drill=pending_cnf&return_to=%2Fdashboard");
assert.equal(
  supportActivitiesRoute({ due_window: "within7", activity_kind: "TSD" }),
  "/support-activities?due_window=within7&activity_kind=TSD&return_to=%2Fdashboard",
);

const projectFilters = projectFiltersFromSearchParams(
  new URLSearchParams("final_status=CLOSED&delivery_status=on_time&fg_month=2026-07&sort=fg_month"),
  { search: "keep" },
);
assert.equal(projectFilters.final_status, "CLOSED");
assert.equal(projectFilters.delivery_status, "on_time");
assert.equal(projectFilters.fg_month, "2026-07");
assert.equal(projectFilters.sort, "fg_month");
assert.equal(projectFilters.search, "keep");
assert.ok(projectFilterBannerLabels(projectFilters).length >= 3);

const supportFilters = supportFiltersFromSearchParams(
  new URLSearchParams("due_window=overdue&status=Planned&activity_kind=RnD"),
  { search: "x" },
);
assert.equal(supportFilters.due_window, "overdue");
assert.equal(supportFilters.status, "Planned");
assert.equal(supportFilters.activity_kind, "RnD");
assert.ok(supportFilterBannerLabels(supportFilters).length >= 2);

const audit = auditFiltersFromSearchParams(new URLSearchParams("module=Access%20Matrix&search=carlo"), {});
assert.equal(audit.module, "Access Matrix");
assert.equal(audit.search, "carlo");

const cnf = cnfFiltersFromSearchParams(new URLSearchParams("classification=non_process&status=Approved"), {});
assert.equal(cnf.classification, "non_process");
assert.equal(cnf.status, "Approved");

assert.equal(spreadsheetFieldGroupForPendingRole("QA"), "qa");
assert.equal(spreadsheetFieldGroupForPendingRole("TSD"), "tsd");
assert.equal(spreadsheetFieldGroupForPendingRole(undefined), null);
const qaColumns = spreadsheetColumnsForPendingRole("QA");
assert.ok(qaColumns && qaColumns.every((column) => column.fieldGroup === "qa"));
assert.ok(qaColumns && qaColumns.some((column) => column.field === "qrmr_status"));
const amColumns = spreadsheetColumnsForPendingRole("AM/BM/PL");
assert.ok(amColumns && amColumns.every((column) => column.fieldGroup === "am"));
const ppColumns = spreadsheetColumnsForRoleGroupLabels(["PP"]);
assert.ok(ppColumns && ppColumns.every((column) => column.roleGroupLabel === "PP"));
assert.ok(ppColumns && ppColumns.some((column) => column.field === "packaging_schedule"));
const allColumns = resolveSpreadsheetColumnFocus({ mode: "all" });
assert.ok(allColumns.length > (ppColumns?.length ?? 0));
const ppFocus = resolveSpreadsheetColumnFocus({ mode: "roleLabels", labels: ["PP"] });
assert.ok(ppFocus.length > (ppColumns?.length ?? 0));
for (const field of ROLE_FOCUS_CONTEXT_FIELDS) {
  assert.ok(ppFocus.some((column) => column.field === field), `context column missing: ${field}`);
}
assert.ok(ROLE_FOCUS_CONTEXT_FIELDS.includes("so_no"));
const qcFocus = resolveSpreadsheetColumnFocus({ mode: "fieldGroup", group: "qc" });
for (const field of ROLE_FOCUS_CONTEXT_FIELDS) {
  assert.ok(qcFocus.some((column) => column.field === field), `QC focus missing context: ${field}`);
}

console.log("verify-dashboard-drilldown: PASS");
