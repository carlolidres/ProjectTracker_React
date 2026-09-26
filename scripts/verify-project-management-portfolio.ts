import assert from "node:assert/strict";
import {
  assigneesByPortfolioSource,
  buildPortfolioItems,
  deriveBoardStatus,
  emptyPortfolioFilters,
  filterPortfolioItems,
  groupPortfolioByBoardStatus,
  groupPortfolioItems,
  mapSourceStatusToGroup,
  parseProjectManagementView,
  portfolioGroupId,
  portfolioSourcePath,
  portfolioTimeline,
  summarizePortfolio,
  summarizePortfolioGroup,
} from "../src/lib/projectManagementPortfolio";
import { ganttBandLabel, ganttBarPercent, ganttBarPx, ganttBounds, ganttColumns, ganttShiftSpan, ganttWeeks, ganttWorkflowLinks } from "../src/lib/projectGantt";
import { shortenChangeDescription } from "../src/lib/changeDescriptionSummary";
import type { Profile, ProjectRow, SupportActivity } from "../src/types";

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
    change_description: "N/A",
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
    Val_Activity: "N/A",
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
    Principal: "N/A",
    Product: "N/A",
    Target_Date: "30 Aug 2026",
    Planning_Schedule: "N/A",
    status: "Planned",
    status_date: "N/A",
    cnf_tracker_record_id: null,
    cnf_link_state: "unset",
    cnf_number_display: "N/A",
    non_process_description: "Calibration support",
    activity_type: "N/A",
    type_of_validation: "N/A",
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

assert.equal(mapSourceStatusToGroup("OPEN"), "Ongoing");
assert.equal(mapSourceStatusToGroup("CLOSED"), "Completed");
assert.equal(mapSourceStatusToGroup("Done"), "Completed");
assert.equal(mapSourceStatusToGroup("Completed"), "Completed");
assert.equal(mapSourceStatusToGroup("CANCELLED"), "Cancelled");

const items = buildPortfolioItems(
  [
    project({ record_id: "REC-A1", po_instance_id: "PO-A1", final_status: "OPEN", fg_month: "2026-09" }),
    project({
      record_id: "REC-A2",
      po_instance_id: "PO-A2",
      final_status: "CLOSED",
      fg_month: "2026-07",
      updated_at: "2026-08-02T00:00:00.000Z",
    }),
    project({
      record_id: "REC-B1",
      project_id: "PROJ-2026-002",
      product_name: "Product B",
      final_status: "CANCELLED",
    }),
  ],
  [
    support(),
    support({
      activity_id: "SUP-2",
      non_process_description: "Finished support",
      status: "Done",
    }),
  ],
);

const processCards = items.filter((item) => item.sourceType === "process");
assert.equal(processCards.length, 2);
const openProject = processCards.find((item) => item.sourceId === "PROJ-2026-001");
assert.ok(openProject);
assert.equal(openProject.recordCount, 2);
assert.equal(openProject.statusGroup, "Ongoing");
assert.equal(openProject.sourceStatus.includes("OPEN"), true);
assert.equal(openProject.uniqueBatch, "UB-1");
assert.equal(openProject.changeLabel, "N/A");

const cancelledProject = processCards.find((item) => item.sourceId === "PROJ-2026-002");
assert.ok(cancelledProject);
assert.equal(cancelledProject.statusGroup, "Cancelled");

const supportCards = items.filter((item) => item.sourceType === "support");
assert.equal(supportCards.length, 2);
assert.equal(supportCards.find((item) => item.sourceId === "SUP-1")?.statusGroup, "Ongoing");
assert.equal(supportCards.find((item) => item.sourceId === "SUP-2")?.statusGroup, "Completed");

const summary = summarizePortfolio(items);
assert.equal(summary.total, 4);
assert.equal(summary.process, 2);
assert.equal(summary.support, 2);
assert.equal(summary.ongoing, 2);
assert.equal(summary.completed, 1);
assert.equal(summary.cancelled, 1);
assert.ok(summary.forReview >= 0);
assert.equal(summary.myTasks, 0);
assert.equal(parseProjectManagementView("tasks"), "my_tasks");
assert.equal(parseProjectManagementView("board"), "board");
assert.equal(parseProjectManagementView("gantt"), "gantt");
assert.ok(["Ongoing", "For Review", "At Risk"].includes(openProject.boardStatus));
assert.equal(deriveBoardStatus({ ...cancelledProject, incompleteCount: 0 }, []), "Cancelled");
assert.equal(
  deriveBoardStatus({ statusGroup: "Ongoing", incompleteCount: 2, phase: "protocol_review", targetDate: "2099-12-31" }, []),
  "For Review",
);
assert.equal(
  deriveBoardStatus({ statusGroup: "Ongoing", incompleteCount: 0, phase: "execution", targetDate: "2099-12-31" }, [{ status: "Blocked" }]),
  "Blocked",
);
assert.equal(groupPortfolioByBoardStatus(items).Cancelled.length, 1);

const grouped = groupPortfolioItems(items);
assert.equal(grouped.Ongoing.length, 2);
assert.equal(grouped.Completed.length, 1);
assert.equal(grouped.Cancelled.length, 1);

const filtered = filterPortfolioItems(items, {
  ...emptyPortfolioFilters(),
  search: "calibration",
  sourceType: "support",
  statusGroup: "Ongoing",
});
assert.equal(filtered.length, 1);
assert.equal(filtered[0]?.sourceId, "SUP-1");

assert.equal(
  portfolioSourcePath(openProject),
  "/projects?projectId=PROJ-2026-001&return_to=%2Fproject-management",
);
assert.equal(
  portfolioSourcePath(supportCards[0]!),
  "/support-activities?activityId=SUP-1&return_to=%2Fproject-management",
);

const cnfCards = buildPortfolioItems(
  [
    project({
      project_id: "PROJ-CNF",
      product_name: "Advil Infant",
      unique_batch: "2026BAKS-1",
      change_description: "N/A",
      cnf_entries_json: JSON.stringify([
        {
          change_description:
            "Introduction of a new 40ml infant pack with revised labeling artwork and pack insert for market launch.",
        },
      ]),
    }),
  ],
  [],
);
assert.equal(cnfCards[0]?.product, "Advil Infant");
assert.equal(cnfCards[0]?.uniqueBatch, "2026BAKS-1");
assert.match(cnfCards[0]?.changeLabel ?? "", /40ml infant pack/);

assert.equal(shortenChangeDescription("Short change"), "Short change");
assert.equal(shortenChangeDescription("N/A"), "");
assert.equal(
  shortenChangeDescription(
    "Introduction of a new 40ml infant pack with revised labeling artwork. Additional manufacturing notes and pack-insert updates for the commercial launch across all sites.",
  ),
  "Introduction of a new 40ml infant pack with revised labeling artwork.",
);
const longChange = `${"Word ".repeat(40)}end`;
assert.ok(shortenChangeDescription(longChange).endsWith("…"));
assert.ok(shortenChangeDescription(longChange).length <= 89);

const people = assigneesByPortfolioSource(
  [
    { sourceType: "process", sourceId: "PROJ-1", assigneeIds: ["a", "b"] },
    { sourceType: "process", sourceId: "PROJ-1", assigneeIds: ["b", "c"] },
    { sourceType: "support", sourceId: "SUP-1", assigneeIds: ["a"] },
  ],
  [
    { id: "a", email: "a@example.com", full_name: "Ann Lee", first_name: "Ann", last_name: "Lee" } as Profile,
    { id: "b", email: "b@example.com", full_name: "Ben Ng", first_name: "Ben", last_name: "Ng" } as Profile,
    { id: "c", email: "c@example.com", full_name: "Cam Yu", first_name: "Cam", last_name: "Yu" } as Profile,
  ],
);
assert.equal(people["process:PROJ-1"]?.map((row) => row.id).join(","), "a,b,c");
assert.equal(people["support:SUP-1"]?.[0]?.full_name, "Ann Lee");

const groupedSample = {
  id: "1",
  sourceType: "process" as const,
  sourceId: "PROJ-1",
  title: "Alpha",
  identifier: "PROJ-1",
  owner: "N/A",
  targetDate: "2026-09-30",
  sourceStatus: "OPEN",
  statusGroup: "Ongoing" as const,
  recordCount: 1,
  updatedAt: "2026-09-01",
  phase: "execution" as const,
  category: "Validation" as const,
  changeLabel: "",
  uniqueBatch: "UB",
  client: "Client",
  product: "Alpha",
  protocolStatus: "Approved",
  incompleteCount: 0,
  protocolComplete: true,
  executionComplete: false,
  reportComplete: false,
  boardStatus: "Ongoing" as const,
  priority: "High" as const,
  progress: 10,
};
assert.equal(portfolioGroupId(groupedSample, "status"), "Ongoing");
assert.equal(portfolioGroupId(groupedSample, "owner"), "Unassigned");
assert.equal(portfolioGroupId({ ...groupedSample, priority: "Low", targetDate: "2026-10-02" }, "phase"), "execution");
const groupSummary = summarizePortfolioGroup([
  groupedSample,
  { ...groupedSample, id: "2", priority: "Low", targetDate: "2026-10-02" },
]);
assert.equal(groupSummary.high, 1);
assert.equal(groupSummary.low, 1);
assert.equal(groupSummary.medium, 0);
assert.equal(groupSummary.statusCounts.Ongoing, 2);
assert.ok(groupSummary.dueLabel.includes("–"));
const timeline = portfolioTimeline([
  { startDate: "2026-07-19", targetDate: "2026-07-28" },
  { startDate: "", targetDate: "2026-08-02" },
]);
assert.equal(timeline.start, "2026-07-19");
assert.equal(timeline.end, "2026-08-02");
assert.ok(timeline.label.includes("–"));
assert.equal(portfolioTimeline([]).label, "");
const bounds = ganttBounds([{ start: "2026-04-15", end: "2026-04-22" }], new Date("2026-04-18T00:00:00"));
assert.ok(bounds.start <= "2026-04-15");
assert.ok(bounds.end >= "2026-04-22");
const weeks = ganttWeeks(bounds.start, bounds.end);
assert.ok(weeks.length >= 4);
const placed = ganttBarPercent("2026-04-15", "2026-04-17", "2026-04-12", "2026-04-25");
assert.ok(placed);
assert.ok(placed.left > 0 && placed.width > 0);
const columns = ganttColumns("2026-09-20", "2026-09-26", "week");
assert.equal(columns.length, 7);
assert.equal(columns[0]?.weekday.length > 0, true);
assert.equal(ganttBarPx("2026-08-01", "2026-08-02", "2026-09-01", "2026-09-30", 36), null);
const shifted = ganttShiftSpan({ start: "2026-09-22", end: "2026-09-26" }, 2, "move");
assert.equal(shifted.start, "2026-09-24");
assert.equal(shifted.end, "2026-09-28");
const links = ganttWorkflowLinks(
  [
    { step: "protocol", taskIds: [] },
    { step: "execution", taskIds: ["report", "block"] },
    { step: "report", taskIds: [] },
  ],
  [
    { id: "report", dependsOnTaskId: null },
    { id: "block", dependsOnTaskId: null },
  ],
);
assert.ok(links.some((link) => link.from === "phase:protocol" && link.to === "phase:execution"));
assert.ok(links.some((link) => link.from === "phase:execution" && link.to === "task:report"));
assert.ok(links.some((link) => link.from === "phase:execution" && link.to === "task:block"));
assert.ok(links.some((link) => link.from === "task:report" && link.to === "phase:report"));
assert.ok(links.some((link) => link.from === "task:block" && link.to === "phase:report"));
const fanOut = ganttWorkflowLinks(
  [{ step: "execution", taskIds: ["a", "b"] }],
  [
    { id: "a", dependsOnTaskId: "prep" },
    { id: "b", dependsOnTaskId: "prep" },
    { id: "prep", dependsOnTaskId: null },
  ],
);
assert.equal(ganttBandLabel("August 2026", 72), "Aug");
assert.equal(ganttBandLabel("September 2026", 360), "September 2026");
assert.equal(ganttBandLabel("30 Aug – 5 Sep", 72), "30 Aug");

console.log("verify-project-management-portfolio: PASS");
