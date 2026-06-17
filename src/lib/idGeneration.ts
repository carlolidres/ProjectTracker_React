import { getTodayManila } from "@/lib/date";
import { supabase } from "@/lib/supabaseClient";
import { valueOrNA } from "@/lib/utils";

async function getNextSequentialId(
  table: "cnf_projects" | "support_activities" | "lessons_learned" | "cnf_tracker_records",
  column: "project_id" | "lesson_id" | "cnf_tracker_id",
  prefix: string,
  padLength: number,
  count = 1,
): Promise<string[]> {
  const year = getTodayManila().year();
  const fullPrefix = `${prefix}${year}-`;
  const { data, error } = await supabase.from(table).select(column);
  if (error) throw error;

  let max = 0;
  for (const row of data ?? []) {
    const id = valueOrNA((row as Record<string, string>)[column]);
    if (!id.startsWith(fullPrefix)) continue;
    const num = parseInt(id.slice(fullPrefix.length), 10);
    if (!Number.isNaN(num) && num > max) max = num;
  }

  return Array.from({ length: count }, (_, index) =>
    `${fullPrefix}${String(max + index + 1).padStart(padLength, "0")}`,
  );
}

/** Legacy format: PROJ-YYYY-001 (sampleApp/Code.gs generateProjectId_) */
export async function getNextProjectId(): Promise<string> {
  const [id] = await getNextSequentialId("cnf_projects", "project_id", "PROJ-", 3);
  return id;
}

/** Format: CNF-YYYY-001 */
export async function getNextCnfTrackerId(): Promise<string> {
  const [id] = await getNextSequentialId("cnf_tracker_records", "cnf_tracker_id", "CNF-", 3);
  return id;
}

/** Legacy format: SPROJ-YYYY-001 (sampleApp/Code.gs generateSupportProjectId_) */
export async function getNextSupportProjectId(): Promise<string> {
  const [id] = await getNextSequentialId("support_activities", "project_id", "SPROJ-", 3);
  return id;
}

/** Format: LESSON-YYYY-0001 */
export async function getNextLessonId(): Promise<string> {
  const [id] = await getNextSequentialId("lessons_learned", "lesson_id", "LESSON-", 4);
  return id;
}

export async function getNextLessonIds(count: number): Promise<string[]> {
  if (count <= 0) return [];
  return getNextSequentialId("lessons_learned", "lesson_id", "LESSON-", 4, count);
}

/** Legacy format: SUP-yyyyMMdd-HHmmss-SSS (sampleApp/Code.gs generateSupportId_) */
export function getNextSupportActivityId(): string {
  const stamp = getTodayManila().format("YYYYMMDD-HHmmss-SSS");
  return `SUP-${stamp}`;
}
