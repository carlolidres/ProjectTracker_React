export type CnfTrackerStatus = "Open" | "Closed";

export interface CnfTrackerRecord {
  record_id?: string;
  cnf_tracker_id: string;
  cnf_reference: string;
  cnf_initiator: string;
  tracker_status: CnfTrackerStatus | string;
  closed_date?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
}
