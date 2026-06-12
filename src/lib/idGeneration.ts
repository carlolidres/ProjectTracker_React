import { getTodayManila } from "@/lib/date";
import { supabase } from "@/lib/supabaseClient";
import { valueOrNA } from "@/lib/utils";

/** Legacy format: PROJ-YYYY-001 (sampleApp/Code.gs generateProjectId_) */
export async function getNextProjectId(): Promise<string> {
  const year = getTodayManila().year();
  const prefix = `PROJ-${year}-`;
  const { data, error } = await supabase.from("cnf_projects").select("project_id");
  if (error) throw error;

  let max = 0;
  for (const row of data ?? []) {
    const id = valueOrNA(row.project_id);
    if (!id.startsWith(prefix)) continue;
    const num = parseInt(id.slice(prefix.length), 10);
    if (!Number.isNaN(num) && num > max) max = num;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

/** Legacy format: SPROJ-YYYY-001 (sampleApp/Code.gs generateSupportProjectId_) */
export async function getNextSupportProjectId(): Promise<string> {
  const year = getTodayManila().year();
  const prefix = `SPROJ-${year}-`;
  const { data, error } = await supabase.from("support_activities").select("project_id");
  if (error) throw error;

  let max = 0;
  for (const row of data ?? []) {
    const id = valueOrNA(row.project_id);
    if (!id.startsWith(prefix)) continue;
    const num = parseInt(id.slice(prefix.length), 10);
    if (!Number.isNaN(num) && num > max) max = num;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
