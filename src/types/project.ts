export interface CnfEntry {
  cnf_reference: string;
  qrmr_ref_no: string;
  change_description: string;
  cnf_status: string;
  client_approval_target_date: string;
  remarks: string;
}

export interface PoControl {
  record_id?: string;
  po_instance_id?: string;
  so_no: string;
  po_control_no: string;
  fg_month: string;
  business_unit: string;
  updatedDocsVer: string;
  order_quantity: string;
  uom: string;
  prod_ver: string;
  cnf_reference: string;
  qrmr_ref_no: string;
  change_description: string;
  cnf_status: string;
  client_approval_target_date: string;
  remarks: string;
  cnf_entries?: CnfEntry[];
  cnf_entries_json?: string;
  manufacturing_start_week: string;
  mo_bmr_po_submission_status: string;
  mo_bmr_po_target_date: string;
  mo_bmr_po_activation_status: string;
  mo_bmr_po_activation_date: string;
  protocol_no: string;
  protocol_Status: string;
  protocol_target_date: string;
  Val_Activity: string;
  Val_Stability: string;
  Val_Batch_Seq_No: string;
  Val_Strategy: string;
  Val_Strategy_remarks: string;
  val_interim_report_no: string;
  val_interim_report_status: string;
  val_interim_report_target_date: string;
  validation_report_no: string;
  validation_report_status: string;
  validation_report_target_date: string;
  endorsement_report_no: string;
  endorsement_report_status: string;
  endorsement_acceptance_target_date: string;
  ar_availability_date: string;
  packaging_schedule: string;
  final_status: string;
  final_status_other: string;
}

export interface MoControl {
  mo_instance_id?: string;
  mo_control_no: string;
  po_controls: PoControl[];
}

export interface BatchControl {
  batch_instance_id?: string;
  unique_batch: string;
  mo_controls: MoControl[];
}

export interface ProjectHierarchy {
  project_id: string;
  project_owner: string;
  activity_type: string;
  client_name: string;
  so_no: string;
  fg_code: string;
  product_name: string;
  validation_report_no: string;
  validation_report_status: string;
  validation_report_target_date: string;
  batches: BatchControl[];
  cnf_mother_link?: ProjectCnfMotherLink;
}

export type ProjectCnfLinkStatus = "linked" | "unlinked";

export interface ProjectCnfMotherLink {
  child_project_id: string;
  mother_project_id: string;
  link_status: ProjectCnfLinkStatus;
  mother_cnf_references: string[];
  copied_entry_count: number;
  linked_at?: string;
  linked_by?: string;
  unlinked_at?: string;
  unlinked_by?: string;
}

export interface ProjectSummaryForCnfCopy {
  project_id: string;
  project_owner: string;
  client_name: string;
  product_name: string;
  fg_code: string;
  activity_type: string;
  final_status: string;
}

export interface ProjectRow {
  record_id: string;
  project_id: string;
  project_owner: string;
  activity_type: string;
  client_name: string;
  so_no: string;
  fg_code: string;
  product_name: string;
  batch_instance_id: string;
  unique_batch: string;
  mo_instance_id: string;
  mo_control_no: string;
  po_instance_id: string;
  po_control_no: string;
  fg_month: string;
  business_unit: string;
  updatedDocsVer: string;
  order_quantity: string;
  uom: string;
  prod_ver: string;
  cnf_reference: string;
  qrmr_ref_no: string;
  change_description: string;
  cnf_status: string;
  client_approval_target_date: string;
  remarks: string;
  cnf_entries_json: string;
  manufacturing_start_week: string;
  mo_bmr_po_submission_status: string;
  mo_bmr_po_target_date: string;
  mo_bmr_po_activation_status: string;
  mo_bmr_po_activation_date: string;
  protocol_no: string;
  protocol_Status: string;
  protocol_target_date: string;
  Val_Activity: string;
  Val_Stability: string;
  Val_Batch_Seq_No: string;
  Val_Strategy: string;
  Val_Strategy_remarks: string;
  val_interim_report_no: string;
  val_interim_report_status: string;
  val_interim_report_target_date: string;
  validation_report_no: string;
  validation_report_status: string;
  validation_report_target_date: string;
  endorsement_report_no: string;
  endorsement_report_status: string;
  endorsement_acceptance_target_date: string;
  ar_availability_date: string;
  packaging_schedule: string;
  final_status: string;
  final_status_other: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  is_active: boolean;
}

export interface ProjectFilters {
  search?: string;
  owner?: string;
  activity_type?: string;
  cnf_status?: string;
  final_status?: string;
  fg_month?: string;
  fg_year?: string;
  due_window?: string;
  pending_role?: string;
}
