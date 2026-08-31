import {
  pendingCnfDatabaseRoute,
  pendingProtocolDatabaseRoute,
  pendingReportDatabaseRoute,
  projectsDatabaseRoute,
  supportActivitiesRoute,
} from "@/lib/dashboardDrilldown";
import { rowMatchesDueWindow } from "@/lib/fgUrgency";
import { isMissingValue, isOpenFinalStatus } from "@/lib/utils";
import type {
  DashboardData,
  PortfolioItem,
  PortfolioSourceType,
  ProjectManagementTaskInput,
  SupportWorklistItem,
  UserRole,
  WorklistItem,
} from "@/types";

export type MyWorkTab = "process" | "support" | "tasks";

export type DashboardWorkFilterKind =
  | "due_window"
  | "pending_protocol"
  | "pending_report"
  | "pending_cnf"
  | "open"
  | "closed"
  | "cnf_status"
  | "final_status"
  | "pending_role"
  | "fg_month"
  | "delivery_status"
  | "support";

export interface DashboardWorkFilter {
  kind: DashboardWorkFilterKind;
  label: string;
  dueWindow?: string;
  cnfStatus?: string;
  finalStatus?: string;
  pendingRole?: string;
  fgMonth?: string;
  deliveryStatus?: string;
  activityKind?: string;
  spreadsheetPath: string;
  defaultTab: MyWorkTab;
}

export interface TaskSourceOption {
  sourceType: PortfolioSourceType;
  sourceId: string;
  label: string;
  uniqueBatch?: string;
}

export function sourceKey(sourceType: PortfolioSourceType, sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

export function parseSourceKey(value: string): { sourceType: PortfolioSourceType; sourceId: string } | null {
  const trimmed = value.trim();
  const split = trimmed.indexOf(":");
  if (split <= 0) return null;
  const sourceType = trimmed.slice(0, split);
  const sourceId = trimmed.slice(split + 1).trim();
  if ((sourceType !== "process" && sourceType !== "support") || !sourceId) return null;
  return { sourceType, sourceId };
}

export function dashboardDoNextHint(role: UserRole | undefined): string {
  switch (role) {
    case "val":
      return "Start with pending protocol or your assigned tasks.";
    case "am_bm_pl":
      return "Start with overdue open work or assign a task.";
    case "pp":
      return "Start with FG month tasks and pending CNF.";
    case "tsd":
      return "Start with TSD support work or your assigned tasks.";
    case "qc":
      return "Start with process worklist items for QC.";
    case "qa":
      return "Review assigned tasks and pending protocol or report.";
    case "rnd":
      return "Start with RnD support work.";
    case "view":
      return "Browse records. This role is view-only.";
    case "admin":
      return "Create records, assign tasks, or open My work.";
    default:
      return "Create records or open your work. Use Browse records above for filtered lists.";
  }
}

export function defaultMyWorkTab(input: {
  role: UserRole | undefined;
  assignedTaskCount: number;
  filter: DashboardWorkFilter | null;
}): MyWorkTab {
  if (input.filter) return input.filter.defaultTab;
  if (input.role === "rnd" || input.role === "tsd") return "support";
  if (input.role === "pp" || input.role === "qc") return "process";
  if (input.assignedTaskCount > 0) return "tasks";
  return "process";
}

export function worklistProtocolPending(row: Pick<WorklistItem, "final_status" | "protocolPending">): boolean {
  return Boolean(row.protocolPending) && isOpenFinalStatus(row.final_status);
}

export function worklistReportPending(row: Pick<WorklistItem, "final_status" | "reportPending">): boolean {
  return Boolean(row.reportPending) && isOpenFinalStatus(row.final_status);
}

export function worklistCnfPending(row: Pick<WorklistItem, "final_status" | "cnf_status" | "cnfPending">): boolean {
  if (row.cnfPending != null) return Boolean(row.cnfPending) && isOpenFinalStatus(row.final_status);
  return isOpenFinalStatus(row.final_status) && String(row.cnf_status ?? "") !== "Approved";
}

export function processRowMatchesWorkFilter(
  row: WorklistItem,
  filter: DashboardWorkFilter | null,
): boolean {
  if (!filter || filter.kind === "support") return true;
  const days = typeof row.daysRemaining === "number" ? row.daysRemaining : null;
  const isOpen = isOpenFinalStatus(row.final_status);

  switch (filter.kind) {
    case "due_window":
      return rowMatchesDueWindow(days, isOpen, filter.dueWindow);
    case "pending_protocol":
      return worklistProtocolPending(row);
    case "pending_report":
      return worklistReportPending(row);
    case "pending_cnf":
      return worklistCnfPending(row);
    case "open":
      return isOpen;
    case "closed":
      return String(row.final_status).toUpperCase() === "CLOSED";
    case "cnf_status":
      return Boolean(filter.cnfStatus) && row.cnf_status === filter.cnfStatus;
    case "final_status":
      return Boolean(filter.finalStatus) && String(row.final_status).toUpperCase() === String(filter.finalStatus).toUpperCase();
    case "pending_role":
      return Boolean(filter.pendingRole) && row.focusGroup === filter.pendingRole;
    case "fg_month":
      return Boolean(filter.fgMonth) && String(row.fg_month ?? "").startsWith(filter.fgMonth ?? "");
    case "delivery_status":
      return String(row.final_status).toUpperCase() === "CLOSED";
    default:
      return true;
  }
}

export function supportRowMatchesWorkFilter(
  row: SupportWorklistItem,
  filter: DashboardWorkFilter | null,
): boolean {
  if (!filter) return true;
  if (filter.kind !== "support" && filter.kind !== "due_window") return true;
  if (filter.activityKind && row.activity_kind !== filter.activityKind) return false;
  if (filter.dueWindow) {
    if (filter.dueWindow === "overdue") return row.severity === "overdue";
    if (filter.dueWindow === "within7") return row.severity === "overdue" || row.severity === "critical";
  }
  return true;
}

export function dueWindowWorkFilter(window: string, label: string): DashboardWorkFilter {
  return {
    kind: "due_window",
    dueWindow: window,
    finalStatus: "OPEN",
    label,
    spreadsheetPath: projectsDatabaseRoute({ final_status: "OPEN", due_window: window }),
    defaultTab: "process",
  };
}

export function pendingProtocolWorkFilter(): DashboardWorkFilter {
  return {
    kind: "pending_protocol",
    label: "Pending protocol",
    spreadsheetPath: pendingProtocolDatabaseRoute(),
    defaultTab: "process",
  };
}

export function pendingReportWorkFilter(): DashboardWorkFilter {
  return {
    kind: "pending_report",
    label: "Pending report",
    spreadsheetPath: pendingReportDatabaseRoute(),
    defaultTab: "process",
  };
}

export function pendingCnfWorkFilter(): DashboardWorkFilter {
  return {
    kind: "pending_cnf",
    label: "Pending CNF",
    spreadsheetPath: pendingCnfDatabaseRoute(),
    defaultTab: "process",
  };
}

export function openProjectsWorkFilter(): DashboardWorkFilter {
  return {
    kind: "open",
    label: "Open projects",
    spreadsheetPath: projectsDatabaseRoute({ final_status: "OPEN" }),
    defaultTab: "process",
  };
}

export function closedProjectsWorkFilter(): DashboardWorkFilter {
  return {
    kind: "closed",
    label: "Closed projects",
    spreadsheetPath: projectsDatabaseRoute({ final_status: "CLOSED" }),
    defaultTab: "process",
  };
}

export function allProjectsWorkFilter(): DashboardWorkFilter {
  return {
    kind: "final_status",
    label: "All projects",
    spreadsheetPath: projectsDatabaseRoute(),
    defaultTab: "process",
  };
}

export function cnfStatusWorkFilter(status: string): DashboardWorkFilter {
  return {
    kind: "cnf_status",
    cnfStatus: status,
    label: `CNF ${status}`,
    spreadsheetPath: projectsDatabaseRoute({ cnf_status: status }),
    defaultTab: "process",
  };
}

export function finalStatusWorkFilter(status: string): DashboardWorkFilter {
  return {
    kind: "final_status",
    finalStatus: status,
    label: `Final status ${status}`,
    spreadsheetPath: projectsDatabaseRoute({ final_status: status }),
    defaultTab: "process",
  };
}

export function pendingRoleWorkFilter(pendingRole: string): DashboardWorkFilter {
  return {
    kind: "pending_role",
    pendingRole,
    label: `Pending ${pendingRole}`,
    spreadsheetPath: projectsDatabaseRoute({ final_status: "OPEN", pending_role: pendingRole }),
    defaultTab: "process",
  };
}

export function fgMonthWorkFilter(monthKey: string): DashboardWorkFilter {
  return {
    kind: "fg_month",
    fgMonth: monthKey,
    finalStatus: "CLOSED",
    label: `FG month ${monthKey}`,
    spreadsheetPath: projectsDatabaseRoute({
      fg_month: monthKey,
      final_status: "CLOSED",
      sort: "fg_month",
      order: "asc",
    }),
    defaultTab: "process",
  };
}

export function deliveryStatusWorkFilter(deliveryStatus: string): DashboardWorkFilter {
  return {
    kind: "delivery_status",
    deliveryStatus,
    finalStatus: "CLOSED",
    label: `Delivery ${deliveryStatus}`,
    spreadsheetPath: projectsDatabaseRoute({
      final_status: "CLOSED",
      delivery_status: deliveryStatus,
      sort: "fg_month",
      order: "asc",
    }),
    defaultTab: "process",
  };
}

export function supportWorkFilter(params?: Record<string, string | undefined>): DashboardWorkFilter {
  const activityKind = params?.activity_kind;
  const dueWindow = params?.due_window;
  const parts = ["Support"];
  if (activityKind) parts.push(activityKind);
  if (dueWindow) parts.push(dueWindow);
  return {
    kind: "support",
    activityKind,
    dueWindow,
    label: parts.join(" · "),
    spreadsheetPath: supportActivitiesRoute(params),
    defaultTab: "support",
  };
}

function presentSourcePart(value: string | undefined): string {
  const text = String(value ?? "").trim();
  return isMissingValue(text) ? "" : text;
}

export function taskSourceSelectParts(input: {
  uniqueBatch?: string;
  product?: string;
  projectName?: string;
  fallback?: string;
}): { batch: string; name: string; label: string } {
  const batch = presentSourcePart(input.uniqueBatch);
  const name = presentSourcePart(input.product) || presentSourcePart(input.projectName);
  if (batch && name) return { batch, name, label: `${batch} · ${name}` };
  if (name) return { batch: "", name, label: name };
  if (batch) return { batch, name: "", label: batch };
  const fallback = presentSourcePart(input.fallback) || "Untitled";
  return { batch: "", name: fallback, label: fallback };
}

/** Unique batch + product/project name. Project ID is the stored value, not the label. */
export function taskSourceSelectLabel(input: {
  uniqueBatch?: string;
  product?: string;
  projectName?: string;
  fallback?: string;
}): string {
  return taskSourceSelectParts(input).label;
}

export function sourceOptionsFromDashboard(data: Pick<DashboardData, "worklist" | "supportWorklist">): TaskSourceOption[] {
  const seen = new Set<string>();
  const options: TaskSourceOption[] = [];
  for (const row of data.worklist) {
    if (!isOpenFinalStatus(row.final_status)) continue;
    const key = sourceKey("process", row.project_id);
    if (seen.has(key) || !row.project_id) continue;
    seen.add(key);
    const parts = taskSourceSelectParts({
      uniqueBatch: row.unique_batch,
      product: row.product_name,
      projectName: row.client_name,
      fallback: row.project_id,
    });
    options.push({
      sourceType: "process",
      sourceId: row.project_id,
      label: parts.label,
      uniqueBatch: parts.batch,
    });
  }
  for (const row of data.supportWorklist ?? []) {
    const key = sourceKey("support", row.activity_id);
    if (seen.has(key) || !row.activity_id) continue;
    seen.add(key);
    const parts = taskSourceSelectParts({
      product: row.Product,
      projectName: row.non_process_description,
      fallback: row.activity_id,
    });
    options.push({
      sourceType: "support",
      sourceId: row.activity_id,
      label: parts.label,
      uniqueBatch: parts.batch,
    });
  }
  return options;
}

export function sourceOptionsFromPortfolio(items: PortfolioItem[]): TaskSourceOption[] {
  return items
    .filter((item) => item.statusGroup === "Ongoing")
    .map((item) => {
      const parts = item.sourceType === "process"
        ? taskSourceSelectParts({
          uniqueBatch: item.uniqueBatch,
          product: item.product,
          projectName: item.title,
          fallback: item.identifier,
        })
        : taskSourceSelectParts({
          product: item.title,
          projectName: item.client,
          fallback: item.identifier,
        });
      return {
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        label: parts.label,
        uniqueBatch: parts.batch,
      };
    });
}

export function groupedSourceSelectOptions(options: TaskSourceOption[]) {
  return [
    {
      label: "Projects Database",
      options: options
        .filter((row) => row.sourceType === "process")
        .map((row) => ({
          value: sourceKey(row.sourceType, row.sourceId),
          label: row.label,
          uniqueBatch: row.uniqueBatch ?? "",
        })),
    },
    {
      label: "Support Activities",
      options: options
        .filter((row) => row.sourceType === "support")
        .map((row) => ({
          value: sourceKey(row.sourceType, row.sourceId),
          label: row.label,
          uniqueBatch: row.uniqueBatch ?? "",
        })),
    },
  ].filter((group) => group.options.length > 0);
}

export function shouldExpandTaskFormDetails(
  row: Partial<ProjectManagementTaskInput> | null | undefined,
): boolean {
  if (!row) return false;
  return Boolean(
    String(row.startDate ?? "").trim()
    || String(row.actualDate ?? "").trim()
    || row.parentTaskId
    || row.dependsOnTaskId
    || String(row.attachmentUrl ?? "").trim()
    || (Number(row.percentComplete ?? 0) > 0 && row.status !== "Done"),
  );
}

export function defaultTaskPhaseForSource(canEnterExecution: boolean, canEnterReport: boolean): "protocol" | "execution" | "report" {
  if (!canEnterExecution) return "protocol";
  if (!canEnterReport) return "execution";
  return "report";
}

export function stubPortfolioItem(sourceType: PortfolioSourceType, sourceId: string) {
  return {
    id: `${sourceType}:${sourceId}`,
    sourceType,
    sourceId,
    title: sourceId,
    identifier: sourceId,
    owner: "",
    targetDate: "",
    sourceStatus: "",
    statusGroup: "Ongoing" as const,
    recordCount: 1,
    updatedAt: "",
    phase: "protocol_prep" as const,
    category: "Other" as const,
    changeLabel: "",
    uniqueBatch: "",
    client: "",
    product: "",
    protocolStatus: "",
    incompleteCount: 0,
    protocolComplete: false,
    executionComplete: false,
    reportComplete: false,
  };
}
