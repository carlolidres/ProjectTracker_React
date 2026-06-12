import {
  buildCumulativeDueDateCounts,
  isOpenProjectRow,
  parseFgDeliveryDate,
  projectRowFgDays,
  rowMatchesDueWindow,
  supportTargetDays,
} from "@/lib/fgUrgency";
import { buildFgDeliveryMetrics } from "@/lib/fgDeliveryMetrics";
import { getTodayManila } from "@/lib/date";
import {
  compareProjectPriority,
  getProjectPriority,
  hasMissingFieldsForGroup,
} from "@/lib/projectPriority";
import {
  isApprovedStatus, isOpenFinalStatus, valueOrNA,
} from "@/lib/utils";
import { listActiveProjects } from "@/services/projectService";
import { listActiveSupportActivities } from "@/services/supportActivityService";
import type { DashboardData, ProjectRow, SupportActivity } from "@/types";

function buildWorklistItem(row: ProjectRow) {
  const meta = getProjectPriority(row);
  return {
    recordId: row.record_id,
    project_id: row.project_id,
    product_name: row.product_name,
    client_name: row.client_name,
    po_control_no: row.po_control_no,
    fg_month: row.fg_month,
    cnf_status: row.cnf_status,
    final_status: row.final_status,
    daysRemaining: meta.daysRemaining ?? "N/A",
    severity: meta.severity,
    priorityRank: meta.rank,
    fgSort: meta.fgSort,
    incompleteCount: meta.incompleteCount,
    nextAction: meta.nextAction,
    focusGroup: meta.focusGroup,
  };
}

function buildSupportSummary(rows: SupportActivity[]) {
  const summary = { total: rows.length, TSD: 0, RnD: 0, overdue: 0, dueSoon: 0 };
  const today = getTodayManila();
  for (const row of rows) {
    const kind = valueOrNA(row.activity_kind);
    if (kind === "TSD") summary.TSD += 1;
    if (kind === "RnD") summary.RnD += 1;
    const days = supportTargetDays(row.Target_Date, today);
    if (days === null) continue;
    if (days < 0) summary.overdue += 1;
    else if (days <= 7) summary.dueSoon += 1;
  }
  return summary;
}

function buildMonthlyTrend(rows: ProjectRow[]) {
  const today = getTodayManila();
  const trend = [];

  for (let offset = 11; offset >= 0; offset -= 1) {
    const monthDate = today.subtract(offset, "month").startOf("month");
    const monthKey = monthDate.format("YYYY-MM");
    const label = monthDate.format("MMM");
    let count = 0;

    for (const row of rows) {
      if (valueOrNA(row.final_status) !== "CLOSED") continue;
      const fgDate = parseFgDeliveryDate(row.fg_month);
      if (!fgDate || fgDate.format("YYYY-MM") !== monthKey) continue;
      count += 1;
    }

    trend.push({ monthKey, label, count });
  }

  return trend;
}

const PENDING_GROUPS = ["AM/BM/PL", "PP", "TSD", "VAL", "QC"] as const;
type PendingRoleKey = (typeof PENDING_GROUPS)[number];

export async function getDashboardData(): Promise<DashboardData> {
  const [rows, supportRows] = await Promise.all([
    listActiveProjects(),
    listActiveSupportActivities(),
  ]);

  const projects: Record<string, boolean> = {};
  const cnfStatusCounts = { "CNF Creation": 0, Routing: 0, "Client Approval": 0, Approved: 0 };
  const finalStatusCounts = { OPEN: 0, CLOSED: 0, CANCELLED: 0, Others: 0 };
  const pendingRoleCounts: Record<PendingRoleKey, number> = { "AM/BM/PL": 0, PP: 0, TSD: 0, VAL: 0, QC: 0 };

  let openCount = 0;
  let closedCount = 0;
  let pendingCnf = 0;
  let pendingReport = 0;
  let pendingProtocol = 0;
  const today = getTodayManila();
  const worklist = [];
  const recentRecords = [];
  const dueDateInputs: Array<{ days: number | null; isOpen: boolean }> = [];

  for (const row of rows) {
    projects[row.project_id] = true;
    const finalStatus = valueOrNA(row.final_status);
    const isOpen = isOpenFinalStatus(finalStatus);
    if (isOpen) openCount += 1;
    else if (finalStatus === "CLOSED") closedCount += 1;

    const cnfStatus = valueOrNA(row.cnf_status);
    if (cnfStatus in cnfStatusCounts) cnfStatusCounts[cnfStatus as keyof typeof cnfStatusCounts] += 1;
    if (finalStatus in finalStatusCounts) finalStatusCounts[finalStatus as keyof typeof finalStatusCounts] += 1;
    else if (finalStatus !== "N/A") finalStatusCounts.Others += 1;

    const days = projectRowFgDays(row, today);
    dueDateInputs.push({ days, isOpen });

    worklist.push(buildWorklistItem(row));

    if (isOpen && cnfStatus !== "Approved") pendingCnf += 1;
    if (isOpen && !isApprovedStatus(row.protocol_Status)) pendingProtocol += 1;
    if (isOpen && !isApprovedStatus(row.Report_Sub_Status)) pendingReport += 1;

    if (isOpen) {
      for (const group of PENDING_GROUPS) {
        if (hasMissingFieldsForGroup(row, group)) {
          pendingRoleCounts[group] += 1;
        }
      }
    }

    recentRecords.push({
      recordId: row.record_id,
      project_id: row.project_id,
      client_name: row.client_name,
      product_name: row.product_name,
      cnf_reference: row.cnf_reference,
      cnf_status: row.cnf_status,
      final_status: row.final_status,
      fg_month: row.fg_month,
      updatedAt: row.updated_at,
    });
  }

  const dueDateCounts = buildCumulativeDueDateCounts(dueDateInputs);

  worklist.sort((a, b) =>
    a.priorityRank - b.priorityRank
    || a.fgSort - b.fgSort
    || b.incompleteCount - a.incompleteCount
    || String(a.project_id).localeCompare(String(b.project_id)),
  );

  recentRecords.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return {
    cards: {
      totalProjects: Object.keys(projects).length,
      totalRecords: rows.length,
      totalOpen: openCount,
      totalClosed: closedCount,
      overdue: dueDateCounts.overdue,
      dueWithin7: dueDateCounts.within7,
      pendingCnf,
      pendingProtocol,
      pendingReport,
      pendingPP: pendingRoleCounts.PP,
      pendingTSD: pendingRoleCounts.TSD,
      pendingVAL: pendingRoleCounts.VAL,
      pendingQC: pendingRoleCounts.QC,
      pendingAM: pendingRoleCounts["AM/BM/PL"],
    },
    cnfStatusCounts,
    finalStatusCounts,
    dueDateCounts,
    pendingRoleCounts,
    worklist: worklist.slice(0, 100),
    recentRecords: recentRecords.slice(0, 10),
    monthlyTrend: buildMonthlyTrend(rows),
    fgDeliveryMetrics: buildFgDeliveryMetrics(rows),
    supportSummary: buildSupportSummary(supportRows),
    recentSupportActivities: supportRows
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 8)
      .map((row) => ({
        activity_id: row.activity_id,
        activity_kind: row.activity_kind,
        Department: row.Department,
        Target_Date: row.Target_Date,
        updated_at: row.updated_at,
      })),
    generatedAt: new Date().toISOString(),
  };
}

export { rowMatchesDueWindow, compareProjectPriority, isOpenProjectRow, projectRowFgDays };
