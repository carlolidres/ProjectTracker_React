import assert from "node:assert/strict";
import {
  pendingCnfDatabaseRoute,
  projectsDatabaseRoute,
  supportActivitiesRoute,
} from "../src/lib/dashboardDrilldown";
import {
  auditFiltersFromSearchParams,
  cnfFiltersFromSearchParams,
  projectFilterBannerLabels,
  projectFiltersFromSearchParams,
  supportFilterBannerLabels,
  supportFiltersFromSearchParams,
} from "../src/lib/urlDerivedFilters";

assert.equal(projectsDatabaseRoute(), "/projects/database");
assert.equal(
  projectsDatabaseRoute({ final_status: "OPEN", due_window: "overdue" }),
  "/projects/database?final_status=OPEN&due_window=overdue",
);
assert.equal(
  projectsDatabaseRoute({ delivery_status: "late", sort: "fg_month", order: "asc" }),
  "/projects/database?delivery_status=late&sort=fg_month&order=asc",
);
assert.equal(pendingCnfDatabaseRoute(), "/projects/database?drill=pending_cnf");
assert.equal(
  supportActivitiesRoute({ due_window: "within7", activity_kind: "TSD" }),
  "/support-activities?due_window=within7&activity_kind=TSD",
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

console.log("verify-dashboard-drilldown: PASS");
