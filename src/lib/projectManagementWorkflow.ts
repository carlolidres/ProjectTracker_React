import { parseAppDateValue } from "@/lib/date";
import { isProjectFieldComplete } from "@/lib/projectPriority";
import { isApprovedOrNotApplicableStatus, isMissingValue, isOpenFinalStatus, valueOrNA } from "@/lib/utils";
import type {
  IncompleteRequirement,
  PhaseOverrideRecord,
  PmTaskCategory,
  PmTaskPhase,
  PmTaskStatus,
  PortfolioSourceType,
  ProjectManagementTask,
  ProjectManagementTaskInput,
  ProjectRow,
  SupportActivity,
  WorkflowBoardItem,
  WorkflowGate,
  WorkflowPhase,
  WorkflowSnapshot,
} from "@/types";

export const WORKFLOW_PHASES: readonly WorkflowPhase[] = [
  "protocol_prep",
  "protocol_review",
  "protocol_approval",
  "execution_planning",
  "execution",
  "execution_verification",
  "report_prep",
  "report_review",
  "closure",
];

export const WORKFLOW_PHASE_LABELS: Record<WorkflowPhase, string> = {
  protocol_prep: "Protocol Preparation",
  protocol_review: "Protocol Review and Revision",
  protocol_approval: "Protocol Approval",
  execution_planning: "Execution Planning and Scheduling",
  execution: "Execution and Task Monitoring",
  execution_verification: "Execution Completion Verification",
  report_prep: "Report/Endorsement Preparation",
  report_review: "Report Review and Approval",
  closure: "Project Closure",
};

export const PM_TASK_STATUSES: readonly PmTaskStatus[] = [
  "Planned",
  "In-process",
  "Done",
  "Delayed",
  "Blocked",
];

export const PM_TASK_STATUS_COLORS: Record<PmTaskStatus, string> = {
  Planned: "gold",
  "In-process": "orange",
  Done: "green",
  Delayed: "red",
  Blocked: "default",
};

export const PM_CATEGORY_FROM_VAL: Record<string, PmTaskCategory> = {
  VAL: "Validation",
  VER: "Verification",
  CHAR: "Characterization",
};

const PROCESS_EXECUTION_FIELDS: Array<{ key: string; label: string }> = [
  { key: "manufacturing_start_week", label: "Manufacturing start week" },
  { key: "mo_bmr_po_activation_date", label: "MO/BMR/PO activation date" },
  { key: "ar_availability_date", label: "AR availability date" },
  { key: "packaging_schedule", label: "Packaging schedule" },
];

const PROCESS_REPORT_FIELDS: Array<{ key: string; label: string }> = [
  { key: "validation_report_status", label: "Validation report status" },
  { key: "endorsement_report_status", label: "Endorsement report status" },
];

function displayText(value: unknown, fallback = "N/A"): string {
  const text = valueOrNA(value);
  return text === "N/A" ? fallback : text;
}

function normalizeDocStatus(status: string): string {
  return valueOrNA(status);
}

function isReviewStatus(status: string): boolean {
  const normalized = normalizeDocStatus(status).toLowerCase();
  return normalized === "routing" || normalized === "client approval";
}

function isInProcessStatus(status: string): boolean {
  return normalizeDocStatus(status).toLowerCase() === "in-process";
}

function hasOverride(overrides: Array<Pick<PhaseOverrideRecord, "gate">>, gate: WorkflowGate): boolean {
  return overrides.some((row) => row.gate === gate);
}

export function mapValActivityToCategory(value: string): PmTaskCategory {
  return PM_CATEGORY_FROM_VAL[valueOrNA(value).toUpperCase()] ?? "Other";
}

export function mapTaskStatusFromField(complete: boolean, rawStatus: string, hasValue: boolean): PmTaskStatus {
  if (complete) return "Done";
  const normalized = valueOrNA(rawStatus).toLowerCase();
  if (normalized === "delayed") return "Delayed";
  if (normalized === "blocked") return "Blocked";
  if (hasValue || isInProcessStatus(rawStatus) || isReviewStatus(rawStatus)) return "In-process";
  return "Planned";
}

function pickRepresentative(rows: ProjectRow[]): ProjectRow | undefined {
  return [...rows].sort((a, b) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0))[0];
}

function processPool(rows: ProjectRow[]): ProjectRow[] {
  const open = rows.filter((row) => isOpenFinalStatus(row.final_status));
  return open.length > 0 ? open : rows;
}

function collectProcessIncomplete(
  rows: ProjectRow[],
  fields: Array<{ key: string; label: string }>,
  gate: IncompleteRequirement["gate"],
): IncompleteRequirement[] {
  const pool = processPool(rows);
  const missing: IncompleteRequirement[] = [];
  for (const field of fields) {
    if (pool.some((row) => !isProjectFieldComplete(row, field.key))) {
      missing.push({ gate, label: field.label, fieldKey: field.key });
    }
  }
  return missing;
}

function protocolIncompleteForProcess(rows: ProjectRow[]): IncompleteRequirement[] {
  const pool = processPool(rows);
  const missing: IncompleteRequirement[] = [];
  if (pool.some((row) => !isProjectFieldComplete(row, "protocol_Status"))) {
    missing.push({ gate: "protocol", label: "Protocol status (Approved or Not Applicable)", fieldKey: "protocol_Status" });
  }
  if (pool.some((row) => !isProjectFieldComplete(row, "protocol_no") && !isApprovedOrNotApplicableStatus(row.protocol_Status))) {
    missing.push({ gate: "protocol", label: "Protocol number", fieldKey: "protocol_no" });
  }
  return missing;
}

function supportProtocolComplete(row: SupportActivity): boolean {
  if (isApprovedOrNotApplicableStatus(row.protocol_status)) return true;
  if (row.activity_kind === "TSD" || row.activity_kind === "RnD") {
    return isApprovedOrNotApplicableStatus(row.Machinability_Protocol_Status);
  }
  return false;
}

function supportExecutionComplete(row: SupportActivity): boolean {
  const status = valueOrNA(row.status).toLowerCase();
  return status === "done" || status === "closed" || status === "completed";
}

function supportReportComplete(row: SupportActivity): boolean {
  return (
    isApprovedOrNotApplicableStatus(row.report_status)
    && isApprovedOrNotApplicableStatus(row.endorsement_status)
  );
}

function supportProtocolIncomplete(row: SupportActivity): IncompleteRequirement[] {
  const missing: IncompleteRequirement[] = [];
  if (!supportProtocolComplete(row)) {
    missing.push({
      gate: "protocol",
      label: row.activity_kind === "TSD" || row.activity_kind === "RnD"
        ? "Machinability / protocol status (Approved or Not Applicable)"
        : "Protocol status (Approved or Not Applicable)",
      fieldKey: "protocol_status",
    });
  }
  return missing;
}

function supportExecutionIncomplete(row: SupportActivity): IncompleteRequirement[] {
  if (supportExecutionComplete(row)) return [];
  return [{ gate: "execution", label: "Support activity status is not Done", fieldKey: "status" }];
}

function supportReportIncomplete(row: SupportActivity): IncompleteRequirement[] {
  const missing: IncompleteRequirement[] = [];
  if (!isApprovedOrNotApplicableStatus(row.report_status)) {
    missing.push({ gate: "report", label: "Report status (Approved or Not Applicable)", fieldKey: "report_status" });
  }
  if (!isApprovedOrNotApplicableStatus(row.endorsement_status)) {
    missing.push({ gate: "report", label: "Endorsement status (Approved or Not Applicable)", fieldKey: "endorsement_status" });
  }
  return missing;
}

function protocolPhaseFromStatus(status: string): WorkflowPhase {
  const normalized = normalizeDocStatus(status).toLowerCase();
  if (normalized === "client approval") return "protocol_approval";
  if (normalized === "routing") return "protocol_review";
  return "protocol_prep";
}

function reportPhaseFromStatus(status: string): WorkflowPhase {
  if (isReviewStatus(status) || isInProcessStatus(status)) return "report_review";
  return "report_prep";
}

function openUserTasks(tasks: Array<Pick<ProjectManagementTask, "phase" | "status">>, phase: PmTaskPhase): boolean {
  return tasks.some((task) => task.phase === phase && task.status !== "Done");
}

function deriveProcessSnapshot(
  rows: ProjectRow[],
  overrides: Array<Pick<PhaseOverrideRecord, "gate">>,
  userTasks: Array<Pick<ProjectManagementTask, "phase" | "status">>,
): WorkflowSnapshot {
  const representative = pickRepresentative(rows);
  const cancelled = rows.every((row) => {
    const status = valueOrNA(row.final_status).toLowerCase();
    return status === "cancelled" || status === "canceled";
  });
  const closed = rows.every((row) => valueOrNA(row.final_status).toUpperCase() === "CLOSED");
  const protocolStatus = representative?.protocol_Status ?? "";
  const reportStatus = representative?.validation_report_status ?? "";
  const protocolComplete = rows.length > 0 && processPool(rows).every((row) => isApprovedOrNotApplicableStatus(row.protocol_Status));
  const executionMissing = collectProcessIncomplete(rows, PROCESS_EXECUTION_FIELDS, "execution");
  const reportMissing = collectProcessIncomplete(rows, PROCESS_REPORT_FIELDS, "report");
  const executionFieldsComplete = executionMissing.length === 0;
  const executionComplete = executionFieldsComplete && !openUserTasks(userTasks, "execution");
  const reportComplete = reportMissing.length === 0 && !openUserTasks(userTasks, "report") && !openUserTasks(userTasks, "endorsement");
  const canEnterExecution = protocolComplete || hasOverride(overrides, "execution");
  const canEnterReport = hasOverride(overrides, "report") || (canEnterExecution && executionComplete);
  const category = mapValActivityToCategory(representative?.Val_Activity ?? "");

  let phase: WorkflowPhase = "protocol_prep";
  if (cancelled || closed) {
    phase = "closure";
  } else if (!canEnterExecution) {
    phase = protocolPhaseFromStatus(protocolStatus);
  } else if (!canEnterReport) {
    const planning = executionMissing.length === PROCESS_EXECUTION_FIELDS.length;
    if (planning && !userTasks.some((task) => task.phase === "execution")) {
      phase = "execution_planning";
    } else if (executionFieldsComplete && openUserTasks(userTasks, "execution")) {
      phase = "execution_verification";
    } else {
      phase = "execution";
    }
  } else if (!reportComplete) {
    phase = reportPhaseFromStatus(reportStatus);
  } else {
    phase = "closure";
  }

  const incompleteRequirements: IncompleteRequirement[] = [];
  if (!canEnterExecution) incompleteRequirements.push(...protocolIncompleteForProcess(rows));
  else if (!canEnterReport) incompleteRequirements.push(...executionMissing);
  else if (!reportComplete) incompleteRequirements.push(...reportMissing);

  return {
    phase,
    protocolComplete,
    executionComplete: executionFieldsComplete,
    reportComplete: reportMissing.length === 0,
    canEnterExecution,
    canEnterReport,
    incompleteRequirements,
    protocolStatus: displayText(protocolStatus),
    executionStatus: executionMissing.length === 0 ? "Complete" : "Incomplete",
    reportStatus: displayText(reportStatus),
    category,
    changeLabel: displayText(representative?.change_description),
    client: displayText(representative?.client_name),
    product: displayText(representative?.product_name),
  };
}

function deriveSupportSnapshot(
  row: SupportActivity,
  overrides: Array<Pick<PhaseOverrideRecord, "gate">>,
  userTasks: Array<Pick<ProjectManagementTask, "phase" | "status">>,
): WorkflowSnapshot {
  const status = valueOrNA(row.status).toLowerCase();
  const cancelled = status === "cancelled" || status === "canceled";
  const protocolComplete = supportProtocolComplete(row);
  const executionFieldComplete = supportExecutionComplete(row);
  const reportFieldComplete = supportReportComplete(row);
  const executionComplete = executionFieldComplete && !openUserTasks(userTasks, "execution");
  const reportComplete = reportFieldComplete && !openUserTasks(userTasks, "report") && !openUserTasks(userTasks, "endorsement");
  const canEnterExecution = protocolComplete || hasOverride(overrides, "execution");
  const canEnterReport = hasOverride(overrides, "report") || (canEnterExecution && executionComplete);
  const category = mapValActivityToCategory(row.type_of_validation);

  let phase: WorkflowPhase = "protocol_prep";
  if (cancelled || status === "closed") {
    phase = "closure";
  } else if (!canEnterExecution) {
    phase = protocolPhaseFromStatus(row.protocol_status || row.Machinability_Protocol_Status);
  } else if (!canEnterReport) {
    if (!executionFieldComplete && status === "planned") phase = "execution_planning";
    else if (executionFieldComplete && openUserTasks(userTasks, "execution")) phase = "execution_verification";
    else phase = "execution";
  } else if (!reportComplete) {
    phase = reportPhaseFromStatus(row.report_status);
  } else {
    phase = "closure";
  }

  const incompleteRequirements: IncompleteRequirement[] = [];
  if (!canEnterExecution) incompleteRequirements.push(...supportProtocolIncomplete(row));
  else if (!canEnterReport) incompleteRequirements.push(...supportExecutionIncomplete(row));
  else if (!reportComplete) incompleteRequirements.push(...supportReportIncomplete(row));

  return {
    phase,
    protocolComplete,
    executionComplete: executionFieldComplete,
    reportComplete: reportFieldComplete,
    canEnterExecution,
    canEnterReport,
    incompleteRequirements,
    protocolStatus: displayText(row.protocol_status || row.Machinability_Protocol_Status),
    executionStatus: displayText(row.status),
    reportStatus: displayText(row.report_status),
    category,
    changeLabel: displayText(row.non_process_description, displayText(row.activity_kind)),
    client: displayText(row.Principal),
    product: displayText(row.Product, displayText(row.Material)),
  };
}

export function deriveWorkflowSnapshot(input: {
  sourceType: PortfolioSourceType;
  projectRows?: ProjectRow[];
  support?: SupportActivity;
  overrides?: Array<Pick<PhaseOverrideRecord, "gate">>;
  userTasks?: Array<Pick<ProjectManagementTask, "phase" | "status">>;
}): WorkflowSnapshot {
  const overrides = input.overrides ?? [];
  const userTasks = input.userTasks ?? [];
  if (input.sourceType === "process") {
    return deriveProcessSnapshot(input.projectRows ?? [], overrides, userTasks);
  }
  if (!input.support) {
    return {
      phase: "protocol_prep",
      protocolComplete: false,
      executionComplete: false,
      reportComplete: false,
      canEnterExecution: false,
      canEnterReport: false,
      incompleteRequirements: [{ gate: "protocol", label: "Support activity not found", fieldKey: "activity_id" }],
      protocolStatus: "N/A",
      executionStatus: "N/A",
      reportStatus: "N/A",
      category: "Other",
      changeLabel: "N/A",
      client: "N/A",
      product: "N/A",
    };
  }
  return deriveSupportSnapshot(input.support, overrides, userTasks);
}

function systemItem(input: {
  id: string;
  sourceType: PortfolioSourceType;
  sourceId: string;
  title: string;
  phase: PmTaskPhase;
  status: PmTaskStatus;
  category: PmTaskCategory;
  startDate: string;
  targetDate: string;
  actualDate: string;
  fieldKey: string;
  instructions?: string;
}): WorkflowBoardItem {
  return {
    id: input.id,
    origin: "system",
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    parentTaskId: null,
    title: input.title,
    instructions: input.instructions ?? "Complete this requirement on the source record.",
    phase: input.phase,
    status: input.status,
    priority: "Medium",
    percentComplete: input.status === "Done" ? 100 : input.status === "In-process" ? 50 : 0,
    startDate: input.startDate,
    targetDate: input.targetDate,
    actualDate: input.actualDate,
    category: input.category,
    assigneeIds: [],
    dependsOnTaskId: null,
    attachmentUrl: "",
    locked: true,
    fieldKey: input.fieldKey,
  };
}

export function buildDerivedWorkflowItems(input: {
  sourceType: PortfolioSourceType;
  sourceId: string;
  projectRows?: ProjectRow[];
  support?: SupportActivity;
}): WorkflowBoardItem[] {
  if (input.sourceType === "process") {
    const row = pickRepresentative(input.projectRows ?? []);
    if (!row) return [];
    const category = mapValActivityToCategory(row.Val_Activity);
    const items: WorkflowBoardItem[] = [
      systemItem({
        id: `system:${input.sourceId}:protocol`,
        sourceType: "process",
        sourceId: input.sourceId,
        title: "Protocol approval",
        phase: "protocol",
        status: mapTaskStatusFromField(
          isApprovedOrNotApplicableStatus(row.protocol_Status),
          row.protocol_Status,
          !isMissingValue(row.protocol_no),
        ),
        category,
        startDate: "",
        targetDate: displayText(row.protocol_target_date, ""),
        actualDate: "",
        fieldKey: "protocol_Status",
      }),
    ];
    for (const field of PROCESS_EXECUTION_FIELDS) {
      const value = String(row[field.key as keyof ProjectRow] ?? "");
      items.push(systemItem({
        id: `system:${input.sourceId}:${field.key}`,
        sourceType: "process",
        sourceId: input.sourceId,
        title: field.label,
        phase: "execution",
        status: mapTaskStatusFromField(isProjectFieldComplete(row, field.key), value, !isMissingValue(value)),
        category,
        startDate: "",
        targetDate: displayText(value, ""),
        actualDate: "",
        fieldKey: field.key,
      }));
    }
    items.push(systemItem({
      id: `system:${input.sourceId}:validation_report`,
      sourceType: "process",
      sourceId: input.sourceId,
      title: "Validation report",
      phase: "report",
      status: mapTaskStatusFromField(
        isApprovedOrNotApplicableStatus(row.validation_report_status),
        row.validation_report_status,
        !isMissingValue(row.validation_report_no),
      ),
      category,
      startDate: "",
      targetDate: displayText(row.validation_report_target_date, ""),
      actualDate: "",
      fieldKey: "validation_report_status",
    }));
    items.push(systemItem({
      id: `system:${input.sourceId}:endorsement`,
      sourceType: "process",
      sourceId: input.sourceId,
      title: "Endorsement report",
      phase: "endorsement",
      status: mapTaskStatusFromField(
        isApprovedOrNotApplicableStatus(row.endorsement_report_status),
        row.endorsement_report_status,
        !isMissingValue(row.endorsement_report_no),
      ),
      category,
      startDate: "",
      targetDate: displayText(row.endorsement_acceptance_target_date, ""),
      actualDate: "",
      fieldKey: "endorsement_report_status",
    }));
    return items;
  }

  const row = input.support;
  if (!row) return [];
  const category = mapValActivityToCategory(row.type_of_validation);
  return [
    systemItem({
      id: `system:${input.sourceId}:protocol`,
      sourceType: "support",
      sourceId: input.sourceId,
      title: "Protocol approval",
      phase: "protocol",
      status: mapTaskStatusFromField(supportProtocolComplete(row), row.protocol_status, !isMissingValue(row.protocol_number)),
      category,
      startDate: "",
      targetDate: displayText(row.Target_Date, ""),
      actualDate: "",
      fieldKey: "protocol_status",
    }),
    systemItem({
      id: `system:${input.sourceId}:execution`,
      sourceType: "support",
      sourceId: input.sourceId,
      title: "Support execution",
      phase: "execution",
      status: mapTaskStatusFromField(supportExecutionComplete(row), row.status, !isMissingValue(row.status)),
      category,
      startDate: "",
      targetDate: displayText(row.Target_Date, ""),
      actualDate: displayText(row.status_date, ""),
      fieldKey: "status",
    }),
    systemItem({
      id: `system:${input.sourceId}:report`,
      sourceType: "support",
      sourceId: input.sourceId,
      title: "Report approval",
      phase: "report",
      status: mapTaskStatusFromField(isApprovedOrNotApplicableStatus(row.report_status), row.report_status, !isMissingValue(row.report_number)),
      category,
      startDate: "",
      targetDate: "",
      actualDate: "",
      fieldKey: "report_status",
    }),
    systemItem({
      id: `system:${input.sourceId}:endorsement`,
      sourceType: "support",
      sourceId: input.sourceId,
      title: "Endorsement approval",
      phase: "endorsement",
      status: mapTaskStatusFromField(isApprovedOrNotApplicableStatus(row.endorsement_status), row.endorsement_status, !isMissingValue(row.endorsement_number)),
      category,
      startDate: "",
      targetDate: "",
      actualDate: "",
      fieldKey: "endorsement_status",
    }),
  ];
}

export function toProjectManagementTaskInput(task: ProjectManagementTask): ProjectManagementTaskInput {
  return {
    sourceType: task.sourceType,
    sourceId: task.sourceId,
    parentTaskId: task.parentTaskId,
    title: task.title,
    instructions: task.instructions,
    phase: task.phase,
    status: task.status,
    priority: task.priority,
    percentComplete: task.percentComplete,
    startDate: task.startDate,
    targetDate: task.targetDate,
    actualDate: task.actualDate,
    category: task.category,
    dependsOnTaskId: task.dependsOnTaskId,
    attachmentUrl: task.attachmentUrl,
    assigneeIds: task.assigneeIds,
  };
}

export type MyTaskSection = "overdue" | "today" | "week" | "later" | "completed";

export const MY_TASK_SECTION_ORDER: readonly MyTaskSection[] = [
  "overdue",
  "today",
  "week",
  "later",
  "completed",
];

export const MY_TASK_SECTION_LABELS: Record<MyTaskSection, string> = {
  overdue: "Overdue",
  today: "Today",
  week: "This Week",
  later: "Later",
  completed: "Completed",
};

export function myTaskSection(
  item: Pick<WorkflowBoardItem, "status" | "targetDate">,
  today = new Date(),
): MyTaskSection {
  if (item.status === "Done") return "completed";
  if (isOverdueTask(item, today)) return "overdue";
  const parsed = parseAppDateValue(item.targetDate);
  if (!parsed) return "later";
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  if (parsed.isSame(start, "day")) return "today";
  const weekEnd = new Date(start);
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
  weekEnd.setHours(23, 59, 59, 999);
  if (parsed.valueOf() <= weekEnd.valueOf()) return "week";
  return "later";
}

export function mapUserTaskToBoardItem(task: ProjectManagementTask): WorkflowBoardItem {
  return {
    id: task.id,
    origin: "user",
    sourceType: task.sourceType,
    sourceId: task.sourceId,
    parentTaskId: task.parentTaskId,
    title: task.title,
    instructions: task.instructions,
    phase: task.phase,
    status: task.status,
    priority: task.priority,
    percentComplete: task.percentComplete,
    startDate: task.startDate,
    targetDate: task.targetDate,
    actualDate: task.actualDate,
    category: task.category,
    assigneeIds: task.assigneeIds,
    createdBy: task.createdBy,
    dependsOnTaskId: task.dependsOnTaskId,
    attachmentUrl: task.attachmentUrl,
    locked: false,
  };
}

export function mergeWorkflowBoardItems(
  derived: WorkflowBoardItem[],
  tasks: ProjectManagementTask[],
): WorkflowBoardItem[] {
  return [...tasks.map(mapUserTaskToBoardItem), ...derived];
}

export function toPmTaskPhase(phase: PmTaskPhase | WorkflowPhase): PmTaskPhase {
  if (phase === "protocol" || phase === "execution" || phase === "report" || phase === "endorsement" || phase === "other") {
    return phase;
  }
  return taskPhaseFromWorkflowPhase(phase);
}

export function findUserTaskForBoardItem(
  boardItem: WorkflowBoardItem,
  tasks: ProjectManagementTask[],
): ProjectManagementTask | null {
  if (boardItem.origin === "user") {
    return tasks.find((task) => task.id === boardItem.id) ?? null;
  }
  const title = boardItem.title.trim().toLowerCase();
  const phase = toPmTaskPhase(boardItem.phase);
  const matches = tasks.filter((task) => task.title.trim().toLowerCase() === title);
  if (matches.length === 1) return matches[0];
  return matches.find((task) => task.phase === phase) ?? matches[0] ?? null;
}

export function buildTaskDraftFromBoardItem(
  boardItem: Pick<WorkflowBoardItem, "title" | "instructions" | "phase" | "status" | "category" | "startDate" | "targetDate">,
  sourceType: PortfolioSourceType,
  sourceId: string,
): Partial<ProjectManagementTaskInput> {
  return {
    sourceType,
    sourceId,
    title: boardItem.title,
    instructions: boardItem.instructions,
    phase: toPmTaskPhase(boardItem.phase),
    status: boardItem.status === "Done" ? "Planned" : boardItem.status,
    category: boardItem.category,
    startDate: parseableTaskDate(boardItem.startDate),
    targetDate: parseableTaskDate(boardItem.targetDate),
    assigneeIds: [],
  };
}

export function taskPhaseAllowed(snapshot: WorkflowSnapshot, phase: PmTaskPhase): boolean {
  if (phase === "protocol" || phase === "other") return true;
  if (phase === "execution") return snapshot.canEnterExecution;
  return snapshot.canEnterReport;
}

export function taskPhaseFromWorkflowPhase(phase: WorkflowPhase): PmTaskPhase {
  if (phase === "protocol_prep" || phase === "protocol_review" || phase === "protocol_approval") return "protocol";
  if (phase === "execution_planning" || phase === "execution" || phase === "execution_verification") return "execution";
  if (phase === "report_prep" || phase === "report_review") return "report";
  return "other";
}

function parseableTaskDate(value: string | undefined): string {
  const text = String(value ?? "").trim();
  if (!text || isMissingValue(text)) return "";
  return parseAppDateValue(text) ? text : "";
}

/** Prefill a new user task from the current workspace stepper and source fields. */
export function buildCreateTaskDraftFromWorkspace(input: {
  sourceType: PortfolioSourceType;
  sourceId: string;
  snapshot: WorkflowSnapshot;
  derivedItems: WorkflowBoardItem[];
}): ProjectManagementTaskInput {
  const mapped = taskPhaseFromWorkflowPhase(input.snapshot.phase);
  const phase = taskPhaseAllowed(input.snapshot, mapped) ? mapped : "protocol";
  const derived = input.derivedItems.filter((item) => item.origin === "system" && item.phase === phase);
  const focus = derived.find((item) => item.status !== "Done") ?? derived[0];
  const incomplete = input.snapshot.incompleteRequirements[0];
  return {
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    parentTaskId: null,
    title: WORKFLOW_PHASE_LABELS[input.snapshot.phase],
    instructions: incomplete?.label ?? "",
    phase,
    status: "Planned",
    priority: "Medium",
    percentComplete: 0,
    startDate: parseableTaskDate(focus?.startDate),
    targetDate: parseableTaskDate(focus?.targetDate),
    actualDate: "",
    category: input.snapshot.category,
    dependsOnTaskId: null,
    attachmentUrl: "",
    assigneeIds: [],
  };
}

export function isOverdueTask(item: Pick<WorkflowBoardItem, "status" | "targetDate">, today = new Date()): boolean {
  if (item.status === "Done" || !item.targetDate) return false;
  const ms = Date.parse(item.targetDate);
  if (Number.isNaN(ms)) return false;
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  return ms < end.valueOf();
}
