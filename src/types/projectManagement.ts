export type PortfolioSourceType = "process" | "support";

export type PortfolioStatusGroup = "Ongoing" | "Completed" | "Cancelled";

export type PortfolioBoardStatus =
  | "Ongoing"
  | "For Review"
  | "At Risk"
  | "Blocked"
  | "Completed"
  | "Cancelled";

export type PortfolioSortKey =
  | "project"
  | "priority"
  | "status"
  | "phase"
  | "owner"
  | "progress"
  | "due"
  | "updated";

export type WorkflowPhase =
  | "protocol_prep"
  | "protocol_review"
  | "protocol_approval"
  | "execution_planning"
  | "execution"
  | "execution_verification"
  | "report_prep"
  | "report_review"
  | "closure";

export type WorkflowGate = "execution" | "report";

export type PmTaskStatus = "Planned" | "In-process" | "Done" | "Delayed" | "Blocked";

export type PmTaskPriority = "Low" | "Medium" | "High";

export type PmTaskCategory = "Validation" | "Characterization" | "Verification" | "Other";

export type PmTaskPhase = "protocol" | "execution" | "report" | "endorsement" | "other";

export type WorkflowItemOrigin = "system" | "user";

export interface IncompleteRequirement {
  gate: WorkflowGate | "protocol";
  label: string;
  fieldKey: string;
}

export interface WorkflowSnapshot {
  phase: WorkflowPhase;
  protocolComplete: boolean;
  executionComplete: boolean;
  reportComplete: boolean;
  canEnterExecution: boolean;
  canEnterReport: boolean;
  incompleteRequirements: IncompleteRequirement[];
  protocolStatus: string;
  executionStatus: string;
  reportStatus: string;
  category: PmTaskCategory;
  changeLabel: string;
  client: string;
  product: string;
}

export interface PortfolioItem {
  id: string;
  sourceType: PortfolioSourceType;
  sourceId: string;
  title: string;
  identifier: string;
  owner: string;
  targetDate: string;
  sourceStatus: string;
  statusGroup: PortfolioStatusGroup;
  recordCount: number;
  updatedAt: string;
  phase: WorkflowPhase;
  category: PmTaskCategory;
  changeLabel: string;
  uniqueBatch: string;
  client: string;
  product: string;
  protocolStatus: string;
  incompleteCount: number;
  protocolComplete: boolean;
  executionComplete: boolean;
  reportComplete: boolean;
  boardStatus: PortfolioBoardStatus;
  priority: PmTaskPriority | "";
  progress: number;
}

export interface PortfolioFilters {
  search: string;
  sourceType: "all" | PortfolioSourceType;
  statusGroup: "all" | PortfolioStatusGroup;
  boardStatus: "all" | PortfolioBoardStatus;
  phase: "all" | WorkflowPhase;
  owner: string;
  priority: "all" | PmTaskPriority;
}

export interface PortfolioSummary {
  total: number;
  process: number;
  support: number;
  ongoing: number;
  forReview: number;
  atRisk: number;
  blocked: number;
  completed: number;
  cancelled: number;
  myTasks: number;
}

export interface PhaseOverrideRecord {
  id: string;
  sourceType: PortfolioSourceType;
  sourceId: string;
  gate: WorkflowGate;
  justification: string;
  createdBy: string;
  createdAt: string;
}

export interface ProjectManagementTask {
  id: string;
  sourceType: PortfolioSourceType;
  sourceId: string;
  parentTaskId: string | null;
  title: string;
  instructions: string;
  phase: PmTaskPhase;
  status: PmTaskStatus;
  priority: PmTaskPriority;
  percentComplete: number;
  startDate: string;
  targetDate: string;
  actualDate: string;
  category: PmTaskCategory;
  dependsOnTaskId: string | null;
  attachmentUrl: string;
  assigneeIds: string[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectManagementComment {
  id: string;
  taskId: string;
  body: string;
  createdBy: string;
  createdAt: string;
}

export interface WorkflowBoardItem {
  id: string;
  origin: WorkflowItemOrigin;
  sourceType: PortfolioSourceType;
  sourceId: string;
  parentTaskId: string | null;
  title: string;
  instructions: string;
  phase: PmTaskPhase | WorkflowPhase;
  status: PmTaskStatus;
  priority: PmTaskPriority;
  percentComplete: number;
  startDate: string;
  targetDate: string;
  actualDate: string;
  category: PmTaskCategory;
  assigneeIds: string[];
  createdBy?: string;
  dependsOnTaskId: string | null;
  attachmentUrl: string;
  locked: boolean;
  fieldKey?: string;
}

export interface ProjectManagementTaskInput {
  sourceType: PortfolioSourceType;
  sourceId: string;
  parentTaskId: string | null;
  title: string;
  instructions: string;
  phase: PmTaskPhase;
  status: PmTaskStatus;
  priority: PmTaskPriority;
  percentComplete: number;
  startDate: string;
  targetDate: string;
  actualDate: string;
  category: PmTaskCategory;
  dependsOnTaskId: string | null;
  attachmentUrl: string;
  assigneeIds: string[];
}

export type ProjectManagementPageView = "portfolio" | "my_tasks" | "board" | "calendar";
