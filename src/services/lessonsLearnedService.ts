import { getNextLessonIds } from "@/lib/idGeneration";
import { supabase } from "@/lib/supabaseClient";
import type { DateFieldChange } from "@/lib/dateAdjustmentReview";
import {
  LESSON_CATEGORY_DATE_ADJUSTMENT,
  type LessonLearned,
  type LessonLearnedFilters,
} from "@/types/lessonsLearned";

export async function saveDateAdjustmentLessons(
  changes: DateFieldChange[],
  reasonCategory: string,
  description: string,
  userRole: string,
  userId: string,
  userEmail: string,
): Promise<void> {
  if (!changes.length) return;

  const lessonIds = await getNextLessonIds(changes.length);

  const rows = changes.map((change, index) => ({
    lesson_id: lessonIds[index],
    user_id: userId,
    user_email: userEmail,
    user_role: userRole,
    category: LESSON_CATEGORY_DATE_ADJUSTMENT,
    reason_category: reasonCategory,
    description: description.trim(),
    source_module: change.sourceModule,
    project_id: change.projectId ?? "",
    record_context: change.recordContext,
    field_name: change.fieldName,
    field_label: change.fieldLabel,
    old_date: change.oldDate,
    new_date: change.newDate,
  }));

  const { error } = await supabase.from("lessons_learned").insert(rows);
  if (error) throw error;
}

export async function listLessonsLearned(filters: LessonLearnedFilters = {}): Promise<LessonLearned[]> {
  let query = supabase.from("lessons_learned").select("*").order("created_at", { ascending: false });

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.reason_category) query = query.eq("reason_category", filters.reason_category);
  if (filters.user) query = query.ilike("user_email", `%${filters.user}%`);
  if (filters.project_id) query = query.ilike("project_id", `%${filters.project_id}%`);
  if (filters.startDate) query = query.gte("created_at", filters.startDate);
  if (filters.endDate) query = query.lte("created_at", filters.endDate);

  const { data, error } = await query.limit(1000);
  if (error) throw error;

  let rows = (data ?? []) as LessonLearned[];
  if (filters.search) {
    const search = filters.search.toLowerCase();
    rows = rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(search)),
    );
  }
  return rows;
}
