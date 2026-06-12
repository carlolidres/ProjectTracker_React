import {
  AM_FIELDS, PP_FIELDS, QC_FIELDS, TSD_FIELDS, VAL_FIELDS,
} from "@/lib/constants";
import { daysBetween, getTodayManila, parseDateValue } from "@/lib/date";
import {
  isApprovedStatus, isMissingValue, isOpenFinalStatus, valueOrNA,
} from "@/lib/utils";
import { listActiveProjects } from "@/services/projectService";
import { listActiveSupportActivities } from "@/services/supportActivityService";
import type { DashboardData, ProjectRow, SupportActivity } from "@/types";

function hasMissingFields(row: ProjectRow, fields: string[]): boolean {
  return fields.some((field) => isMissingValue(row[field as keyof ProjectRow]));
}

function buildWorklistItem(row: ProjectRow) {
  const fgDate = parseDateValue(row.fg_month);
  const today = getTodayManila();
  const days = fgDate ? daysBetween(today, fgDate) : null;

  let rank = 4;
  let severity = "low";
  if (days !== null && days < 0) { rank = 0; severity = "overdue"; }
  else if (days !== null && days <= 15) { rank = 1; severity = "critical"; }
  else if (days !== null && days <= 30) { rank = 2; severity = "high"; }
  else if (days !== null && days <= 60) { rank = 3; severity = "moderate"; }

  return {
    recordId: row.record_id,
    project_id: row.project_id,
    product_name: row.product_name,
    client_name: row.client_name,
    po_control_no: row.po_control_no,
    fg_month: row.fg_month,
    cnf_status: row.cnf_status,
    final_status: row.final_status,
    daysRemaining: days ?? "N/A",
    severity,
    priorityRank: rank,
    fgSort: fgDate ? fgDate.valueOf() : Number.MAX_SAFE_INTEGER,
    incompleteCount: 0,
    nextAction: "Monitor project readiness",
  };
}

function buildSupportSummary(rows: SupportActivity[]) {
  const summary = { total: rows.length, TSD: 0, RnD: 0, overdue: 0, dueSoon: 0 };
  const today = getTodayManila();
  for (const row of rows) {
    const kind = valueOrNA(row.activity_kind);
    if (kind === "TSD") summary.TSD += 1;
    if (kind === "RnD") summary.RnD += 1;
    const target = parseDateValue(row.Target_Date);
    if (!target) continue;
    const days = daysBetween(today, target);
    if (days < 0) summary.overdue += 1;
    else if (days <= 14) summary.dueSoon += 1;
  }
  return summary;
}

function buildMonthlyTrend(rows: ProjectRow[]) {
  const trend: Record<string, { open: number; closed: number }> = {};
  for (const row of rows) {
    const fgDate = parseDateValue(row.fg_month);
    if (!fgDate) continue;
    const month = fgDate.format("YYYY-MM");
    if (!trend[month]) trend[month] = { open: 0, closed: 0 };
    if (isOpenFinalStatus(row.final_status)) trend[month].open += 1;
    else if (valueOrNA(row.final_status) === "CLOSED") trend[month].closed += 1;
  }
  return Object.entries(trend)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({ month, ...counts }));
}

export async function getDashboardData(): Promise<DashboardData> {
  const [rows, supportRows] = await Promise.all([
    listActiveProjects(),
    listActiveSupportActivities(),
  ]);

  const projects: Record<string, boolean> = {};
  const cnfStatusCounts = { "CNF Creation": 0, Routing: 0, "Client Approval": 0, Approved: 0 };
  const finalStatusCounts = { OPEN: 0, CLOSED: 0, CANCELLED: 0, Others: 0 };
  const dueDateCounts = { overdue: 0, today: 0, within3: 0, within7: 0, within15: 0, within30: 0 };
  const pendingRoleCounts = { "AM/BM/PL": 0, PP: 0, TSD: 0, VAL: 0, QC: 0 };

  let openCount = 0;
  let closedCount = 0;
  let pendingCnf = 0;
  let pendingReport = 0;
  let pendingProtocol = 0;
  const today = getTodayManila();
  const worklist = [];
  const recentRecords = [];

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

    const fgDate = parseDateValue(row.fg_month);
    const days = fgDate ? daysBetween(today, fgDate) : null;
    if (isOpen && days !== null) {
      if (days < 0) dueDateCounts.overdue += 1;
      else if (days === 0) dueDateCounts.today += 1;
      else if (days <= 3) dueDateCounts.within3 += 1;
      else if (days <= 7) dueDateCounts.within7 += 1;
      else if (days <= 15) dueDateCounts.within15 += 1;
      else if (days <= 30) dueDateCounts.within30 += 1;
    }

    worklist.push(buildWorklistItem(row));

    if (isOpen && cnfStatus !== "Approved") pendingCnf += 1;
    if (isOpen && !isApprovedStatus(row.protocol_Status)) pendingProtocol += 1;
    if (isOpen && !isApprovedStatus(row.Report_Sub_Status)) pendingReport += 1;

    if (isOpen) {
      if (hasMissingFields(row, AM_FIELDS)) pendingRoleCounts["AM/BM/PL"] += 1;
      if (hasMissingFields(row, PP_FIELDS)) pendingRoleCounts.PP += 1;
      if (hasMissingFields(row, TSD_FIELDS)) pendingRoleCounts.TSD += 1;
      if (hasMissingFields(row, VAL_FIELDS)) pendingRoleCounts.VAL += 1;
      if (hasMissingFields(row, QC_FIELDS)) pendingRoleCounts.QC += 1;
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

  worklist.sort((a, b) =>
    a.priorityRank - b.priorityRank ||
    a.fgSort - b.fgSort ||
    String(a.project_id).localeCompare(String(b.project_id)),
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
