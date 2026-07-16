export type CnfTrackerStatus = "Open" | "Closed";

export type CnfClassification = "process" | "non_process";

export interface CnfTrackerRecord {
  record_id?: string;
  cnf_tracker_id: string;
  cnf_reference: string;
  cnf_initiator: string;
  cnf_details?: string;
  product_name?: string;
  client_name?: string;
  qrmr_no?: string;
  unique_batch_no?: string;
  change_description?: string;
  /** Process vs Non-Process list/detail mode. Existing records default to process. */
  cnf_classification?: CnfClassification | string;
  tracker_status: CnfTrackerStatus | string;
  closed_date?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
}

export interface ProjectCnfTrackerLink {
  link_id?: string;
  cnf_tracker_record_id: string;
  project_id: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export class CnfDuplicateError extends Error {
  readonly existing: CnfTrackerRecord;
  readonly reason: "reference" | "probable";

  constructor(existing: CnfTrackerRecord, reason: "reference" | "probable", message: string) {
    super(message);
    this.name = "CnfDuplicateError";
    this.existing = existing;
    this.reason = reason;
  }
}
