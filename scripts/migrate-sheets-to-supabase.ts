/**
 * Local-only migration script. Requires service role key in environment.
 * NEVER commit the service role key.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/migrate-sheets-to-supabase.ts ./exports/projects.json
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

function cleanValue(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  const text = String(value).trim();
  return text === "" ? "N/A" : text;
}

function toBool(value: unknown): boolean {
  const text = String(value ?? "").trim().toUpperCase();
  return text === "TRUE" || text === "1" || text === "YES";
}

function mapProjectRow(row: Record<string, unknown>) {
  return {
    record_id: cleanValue(row["Record ID"] ?? row.record_id),
    project_id: cleanValue(row.project_id),
    project_owner: cleanValue(row.project_owner),
    activity_type: cleanValue(row.activity_type),
    client_name: cleanValue(row.client_name),
    so_no: cleanValue(row.so_no),
    fg_code: cleanValue(row.fg_code),
    product_name: cleanValue(row.product_name),
    batch_instance_id: cleanValue(row.batch_instance_id),
    unique_batch: cleanValue(row.unique_batch),
    mo_instance_id: cleanValue(row.mo_instance_id),
    mo_control_no: cleanValue(row.mo_control_no),
    po_instance_id: cleanValue(row.po_instance_id),
    po_control_no: cleanValue(row.po_control_no),
    fg_month: cleanValue(row.fg_month),
    business_unit: cleanValue(row.business_unit),
    updateddocsver: cleanValue(row.updatedDocsVer),
    cnf_reference: cleanValue(row.cnf_reference),
    qrmr_ref_no: cleanValue(row.qrmr_ref_no),
    change_description: cleanValue(row.change_description),
    cnf_status: cleanValue(row.cnf_status),
    client_approval_target_date: cleanValue(row.client_approval_target_date),
    remarks: cleanValue(row.remarks),
    cnf_entries_json: cleanValue(row.cnf_entries_json) === "N/A" ? "[]" : cleanValue(row.cnf_entries_json),
    manufacturing_start_week: cleanValue(row.manufacturing_start_week),
    mo_bmr_po_submission_status: cleanValue(row.mo_bmr_po_submission_status),
    mo_bmr_po_target_date: cleanValue(row.mo_bmr_po_target_date),
    mo_bmr_po_activation_status: cleanValue(row.mo_bmr_po_activation_status),
    mo_bmr_po_activation_date: cleanValue(row.mo_bmr_po_activation_date),
    protocol_no: cleanValue(row.protocol_no),
    protocol_status: cleanValue(row.protocol_Status),
    protocol_target_date: cleanValue(row.protocol_target_date),
    val_activity: cleanValue(row.Val_Activity),
    val_stability: cleanValue(row.Val_Stability),
    val_batch_seq_no: cleanValue(row.Val_Batch_Seq_No),
    val_strategy: cleanValue(row.Val_Strategy),
    val_strategy_remarks: cleanValue(row.Val_Strategy_remarks),
    val_report_no: cleanValue(row.val_report_no),
    report_sub_status: cleanValue(row.Report_Sub_Status),
    report_target_date: cleanValue(row.Report_target_Date),
    ar_availability_date: cleanValue(row.ar_availability_date),
    packaging_schedule: cleanValue(row.packaging_schedule),
    final_status: cleanValue(row.final_status),
    final_status_other: cleanValue(row.final_status_other),
    created_by: cleanValue(row["Created By"] ?? row.created_by),
    created_at: row["Created At"] ?? row.created_at ?? new Date().toISOString(),
    updated_by: cleanValue(row["Updated By"] ?? row.updated_by),
    updated_at: row["Updated At"] ?? row.updated_at ?? new Date().toISOString(),
    is_active: toBool(row["Is Active"] ?? row.is_active ?? true),
  };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx scripts/migrate-sheets-to-supabase.ts <json-export-path>");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>[];
  const mapped = raw.map(mapProjectRow);

  const chunkSize = 100;
  for (let i = 0; i < mapped.length; i += chunkSize) {
    const chunk = mapped.slice(i, i + chunkSize);
    const { error } = await supabase.from("cnf_projects").upsert(chunk, { onConflict: "record_id" });
    if (error) throw error;
    console.log(`Migrated ${Math.min(i + chunkSize, mapped.length)} / ${mapped.length}`);
  }

  console.log("Migration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
