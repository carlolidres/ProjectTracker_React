export interface AuditLog {
  audit_id: string;
  timestamp: string;
  user_email: string;
  module: string;
  action: string;
  record_id: string;
  project_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  remarks: string;
}

export interface Notification {
  notification_id: string;
  project_id: string;
  record_id: string;
  fg_month: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  created_at: string;
}

export interface RegistryEntry {
  id: string;
  registry_type: string;
  registry_value: string;
  description: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

export interface DashboardData {
  cards: {
    totalProjects: number;
    totalRecords: number;
    totalOpen: number;
    totalClosed: number;
    overdue: number;
    dueWithin7: number;
    pendingCnf: number;
    pendingProtocol: number;
    pendingReport: number;
    pendingPP: number;
    pendingTSD: number;
    pendingVAL: number;
    pendingQC: number;
    pendingAM: number;
  };
  cnfStatusCounts: Record<string, number>;
  finalStatusCounts: Record<string, number>;
  dueDateCounts: {
    overdue: number;
    today: number;
    within3: number;
    within7: number;
    within15: number;
    within30: number;
    beyond30: number;
  };
  pendingRoleCounts: Record<string, number>;
  worklist: WorklistItem[];
  recentRecords: RecentRecord[];
  monthlyTrend: MonthlyTrendItem[];
  fgDeliveryMetrics: FgDeliveryMetrics;
  supportSummary: SupportSummary;
  recentSupportActivities: SupportActivitySummary[];
  generatedAt: string;
}

export interface WorklistItem {
  recordId: string;
  project_id: string;
  product_name: string;
  client_name: string;
  po_control_no: string;
  fg_month: string;
  cnf_status: string;
  final_status: string;
  daysRemaining: number | string;
  severity: string;
  priorityRank: number;
  incompleteCount: number;
  nextAction: string;
  focusGroup: string;
  fgSort?: number;
}

export interface RecentRecord {
  recordId: string;
  project_id: string;
  client_name: string;
  product_name: string;
  cnf_reference: string;
  cnf_status: string;
  final_status: string;
  fg_month: string;
  updatedAt: string;
}

export interface MonthlyTrendItem {
  monthKey: string;
  label: string;
  count: number;
}

export interface FgDeliveryMetrics {
  onTime: number;
  late: number;
  total: number;
}

export interface SupportSummary {
  total: number;
  TSD: number;
  RnD: number;
  overdue: number;
  dueSoon: number;
}

export interface SupportActivitySummary {
  activity_id: string;
  activity_kind: string;
  Department: string;
  Target_Date: string;
  updated_at: string;
}

export interface AuditFilters {
  search?: string;
  module?: string;
  action?: string;
  user?: string;
  project_id?: string;
  startDate?: string;
  endDate?: string;
}
