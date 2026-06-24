/**
 * Verifies mapProjectToDb payload can insert into cnf_projects (no phantom columns).
 * Usage: npx tsx scripts/verify-project-save-map.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { mapProjectToDb } from "../src/lib/mappers";

function loadEnvLocal(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const vars: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return vars;
}

const env = loadEnvLocal();
const url = process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;
const email = process.env.VERIFY_SUPABASE_EMAIL ?? env.VERIFY_SUPABASE_EMAIL;
const password = process.env.VERIFY_SUPABASE_PASSWORD ?? env.VERIFY_SUPABASE_PASSWORD;

if (!url || !anonKey || !email || !password) {
  console.error("Missing env for verify-project-save-map");
  process.exit(1);
}

const supabase = createClient(url, anonKey);
const recordId = `REC-MAP-${Date.now()}`;
const projectId = `PROJ-MAP-${Date.now()}`;

const row = mapProjectToDb({
  record_id: recordId,
  project_id: projectId,
  project_owner: "Map Verify",
  activity_type: "N/A",
  client_name: "N/A",
  so_no: "N/A",
  fg_code: "N/A",
  product_name: "N/A",
  batch_instance_id: "N/A",
  unique_batch: "N/A",
  mo_instance_id: "N/A",
  mo_control_no: "N/A",
  po_instance_id: "N/A",
  po_control_no: "N/A",
  fg_month: "N/A",
  business_unit: "N/A",
  updatedDocsVer: "N/A",
  order_quantity: "N/A",
  uom: "N/A",
  prod_ver: "N/A",
  cnf_reference: "N/A",
  qrmr_ref_no: "N/A",
  qrmr_status: "N/A",
  qrmr_target_date: "N/A",
  change_description: "N/A",
  cnf_status: "N/A",
  client_approval_target_date: "N/A",
  remarks: "N/A",
  cnf_entries_json: "[]",
  manufacturing_start_week: "N/A",
  mo_bmr_po_submission_status: "N/A",
  mo_bmr_po_target_date: "N/A",
  mo_bmr_po_activation_status: "N/A",
  mo_bmr_po_activation_date: "N/A",
  protocol_no: "N/A",
  protocol_Status: "N/A",
  protocol_target_date: "N/A",
  Val_Activity: "N/A",
  Val_Stability: "N/A",
  Val_Batch_Seq_No: "N/A",
  Val_Strategy: "N/A",
  Val_Strategy_remarks: "N/A",
  val_interim_report_no: "N/A",
  val_interim_report_status: "N/A",
  val_interim_report_target_date: "N/A",
  validation_report_no: "N/A",
  validation_report_status: "N/A",
  validation_report_target_date: "N/A",
  endorsement_report_no: "N/A",
  endorsement_report_status: "N/A",
  endorsement_acceptance_target_date: "N/A",
  ar_availability_date: "N/A",
  packaging_schedule: "N/A",
  final_status: "N/A",
  final_status_other: "N/A",
  created_by: email,
  created_at: new Date().toISOString(),
  updated_by: email,
  updated_at: new Date().toISOString(),
  is_active: true,
});

async function main() {
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error(`Sign-in failed: ${signInError.message}`);
    process.exit(1);
  }

  const { error } = await supabase.from("cnf_projects").insert(row);
  if (error) {
    console.error(`FAIL mapProjectToDb insert: ${error.message} (${error.code ?? "no-code"})`);
    process.exit(1);
  }

  await supabase.from("cnf_projects").delete().eq("record_id", recordId);
  console.log("PASS mapProjectToDb insert (no phantom columns)");
}

void main();
