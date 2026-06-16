import { NA_VALUE } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";
import { isMissingValue, valueOrNA } from "@/lib/utils";
import type { ProjectHierarchy } from "@/types";

function collectSoNumbers(payload: ProjectHierarchy): string[] {
  const values = new Set<string>();
  for (const batch of payload.batches) {
    for (const mo of batch.mo_controls) {
      for (const po of mo.po_controls) {
        const normalized = valueOrNA(po.so_no);
        if (!isMissingValue(normalized)) {
          values.add(normalized.trim().toLowerCase());
        }
      }
    }
  }
  return [...values];
}

export async function findDuplicateSoNumbers(
  payload: ProjectHierarchy,
  excludeProjectId?: string,
): Promise<string[]> {
  const soNumbers = collectSoNumbers(payload);
  if (!soNumbers.length) return [];

  const duplicates: string[] = [];
  for (const soNo of soNumbers) {
    let query = supabase
      .from("cnf_projects")
      .select("project_id")
      .eq("is_active", true)
      .ilike("so_no", soNo)
      .limit(5);

    if (excludeProjectId && excludeProjectId !== NA_VALUE) {
      query = query.neq("project_id", excludeProjectId);
    }

    const { data, error } = await query;
    if (error) throw error;
    if ((data ?? []).length > 0) {
      duplicates.push(soNo.toUpperCase());
    }
  }

  return [...new Set(duplicates)];
}
