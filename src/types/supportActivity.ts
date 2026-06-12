export type ActivityKind = "TSD" | "RnD";

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
}
