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
  val_interim_report_status: ["In-process", "Routing", "Client Approval", "Approved", "Not Applicable"],
  validation_report_status: ["In-process", "Routing", "Client Approval", "Approved"],
  endorsement_report_status: ["In-process", "Routing", "Approved", "Not Applicable"],
  qrmr_status: ["In-Process", "Routing", "Client Approval", "Approved", "Not Applicable"],
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
  "Val_Batch_Seq_No", "Val_Strategy", "Val_Strategy_remarks",
  "val_interim_report_no", "val_interim_report_status", "val_interim_report_target_date",
  "validation_report_no", "validation_report_status", "validation_report_target_date",
  "endorsement_report_no", "endorsement_report_status", "endorsement_acceptance_target_date",
];

export const QC_FIELDS = ["ar_availability_date"];

export const QA_FIELDS = ["qrmr_ref_no", "qrmr_status", "qrmr_target_date"];

/** CNF entry fields owned by AM/BM/PL (QRMR fields live on the QA tab). */
export const AM_CNF_ENTRY_KEYS = [
  "cnf_reference", "change_description",
  "cnf_status", "client_approval_target_date", "remarks",
] as const;

export const QA_CNF_ENTRY_KEYS = [
  "qrmr_ref_no", "qrmr_status", "qrmr_target_date", "risk_control",
] as const;

export const CNF_ENTRY_KEYS = [
  ...AM_CNF_ENTRY_KEYS,
  ...QA_CNF_ENTRY_KEYS,
] as const;

export const ROLE_LABELS: Record<string, string> = {
  am_bm_pl: "AM/BM/PL",
  qa: "QA",
  pp: "PP",
  tsd: "TSD",
  val: "VAL",
  qc: "QC",
  admin: "Admin",
  view: "View",
};
