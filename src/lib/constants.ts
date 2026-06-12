export const NA_VALUE = "N/A";

export const DEFAULT_REGISTRY: Record<string, string[]> = {
  activity_type: ["PILOT/TRIAL", "TRC", "VAL/VER"],
  business_unit: ["CM", "BM", "PL"],
  cnf_status: ["CNF Creation", "Routing", "Client Approval", "Approved"],
  updatedDocsVer: ["Yes", "No"],
  yn_status: ["Y", "N"],
  Val_Activity: ["VAL", "VER", "CHAR", "COMML"],
  Val_Stability: ["Yes", "No"],
  Val_Batch_Seq_No: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  Val_Strategy: ["Concurrent", "Prospective"],
  Report_Sub_Status: ["In-process", "Routing", "Client Approval", "Approved"],
  final_status: ["OPEN", "CLOSED", "CANCELLED", "Others"],
  department: ["DPM", "LPM", "DPP", "LPP", "CO", "COS", "TOP", "STEROIDS", "CEPHA"],
  doc_status: ["In-process", "Routing", "Client Approval", "Approved"],
  uom: ["BXs", "BTs", "Sachets", "Unit", "Tubes", "Blisters", "Strips", "Packs", "Units", "Pcs"],
  date_adjustment_reason: ["Materials", "Client", "Operations", "Failed Testing", "Others"],
};

export const AM_FIELDS = [
  "project_owner", "activity_type", "client_name", "so_no", "fg_code", "product_name",
  "unique_batch", "mo_control_no", "po_control_no", "fg_month", "business_unit", "updatedDocsVer",
  "order_quantity", "uom", "prod_ver",
];

export const PP_FIELDS = ["manufacturing_start_week", "packaging_schedule", "final_status"];

export const TSD_FIELDS = [
  "mo_bmr_po_submission_status", "mo_bmr_po_target_date",
  "mo_bmr_po_activation_status", "mo_bmr_po_activation_date",
];

export const VAL_FIELDS = [
  "protocol_no", "protocol_Status", "protocol_target_date", "Val_Activity", "Val_Stability",
  "Val_Batch_Seq_No", "Val_Strategy", "Val_Strategy_remarks", "val_report_no",
  "Report_Sub_Status", "Report_target_Date",
];

export const QC_FIELDS = ["ar_availability_date"];

export const CNF_ENTRY_KEYS = [
  "cnf_reference", "qrmr_ref_no", "change_description",
  "cnf_status", "client_approval_target_date", "remarks",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  am_bm_pl: "AM/BM/PL",
  pp: "PP",
  tsd: "TSD",
  val: "VAL",
  qc: "QC",
  admin: "Admin",
  view: "View",
};
