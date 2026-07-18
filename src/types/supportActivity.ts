export type ActivityKind = "TSD" | "RnD" | "Non-Process";

export type SupportCnfLinkState = "unset" | "linked" | "not_applicable";

export interface SupportActivity {
  activity_id: string;
  project_id: string;
  activity_kind: ActivityKind | string;
  Department: string;
  Material: string;
  Line: string;
  Bulk: string;
  Machinability_Protocol: string;
  Machinability_Protocol_Status: string;
  Machinability_Report: string;
  Machinability_Report_Status: string;
  Product_User: string;
  Principal: string;
  Product: string;
  Target_Date: string;
  Planning_Schedule: string;
  status: string;
  status_date: string;
  cnf_tracker_record_id: string | null;
  cnf_link_state: SupportCnfLinkState | string;
  cnf_number_display: string;
  non_process_description: string;
  activity_type: string;
  type_of_validation: string;
  protocol_number: string;
  protocol_status: string;
  report_number: string;
  report_status: string;
  endorsement_number: string;
  endorsement_status: string;
  endorsement_tracker_record_id: string | null;
  sync_version: number;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  is_active: boolean;
}

export interface SupportActivityFilters {
  search?: string;
  activity_kind?: string;
  department?: string;
  due_window?: string;
  status?: string;
  sort?: string;
  order?: string;
}
