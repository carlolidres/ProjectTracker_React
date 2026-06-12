export const LESSON_CATEGORY_DATE_ADJUSTMENT = "Reason for Date Adjustment";

export interface LessonLearned {
  id: string;
  lesson_id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  category: string;
  reason_category: string;
  description: string;
  source_module: string;
  project_id: string;
  record_context: string;
  field_name: string;
  field_label: string;
  old_date: string;
  new_date: string;
  created_at: string;
}

export interface LessonLearnedFilters {
  search?: string;
  category?: string;
  reason_category?: string;
  user?: string;
  project_id?: string;
  startDate?: string;
  endDate?: string;
}

export interface DateAdjustmentContext {
  sourceModule: "Projects" | "Support Activities";
  projectId?: string;
  recordContext?: string;
  fieldName: string;
  fieldLabel: string;
  oldDate: string;
  newDate: string;
  userRole: string;
}
