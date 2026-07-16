export type EndorsementSourceType =
  | "process_validation_project"
  | "non_process_support_activity"
  | "independent";

export type ProcessClassification = "unset" | "process" | "non_process";

export interface EndorsementTrackerRecord {
  record_id: string;
  endorsement_tracker_id: string;
  endorsement_number: string;
  endorsement_status: string;
  process_classification: ProcessClassification | string;
  source_type: EndorsementSourceType | string;
  source_record_id: string | null;
  project_id: string | null;
  project_record_id: string | null;
  cnf_tracker_record_id: string | null;
  support_activity_id: string | null;
  cnf_number_display: string;
  project_name: string;
  product_name: string;
  product_code: string;
  non_process_description: string;
  last_sync_source: string | null;
  last_synced_at: string | null;
  sync_version: number;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  is_active: boolean;
}

export interface EndorsementTrackerItem {
  item_id: string;
  endorsement_tracker_record_id: string;
  item_number: number;
  endorsement_entry: string;
  target_implementation_date: string;
  implemented_by: string;
  implementation_date: string;
  verified_by_validation: string;
  validation_verification_date: string;
  verified_by_qa: string;
  qa_verification_date: string;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  is_active: boolean;
}

export interface EndorsementTrackerFilters {
  search?: string;
  endorsement_status?: string;
  process_classification?: string;
  source_type?: string;
}

export interface ReusableOption {
  option_id: string;
  category: string;
  option_value: string;
  option_value_key: string;
  is_active: boolean;
}
