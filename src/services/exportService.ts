import * as XLSX from "xlsx";
import {
  formatAuditActivity,
  formatAuditDetails,
  formatAuditProjectId,
  formatAuditTimestamp,
} from "@/lib/auditFormat";
import { formatAppDateTime } from "@/lib/date";
import type { AuditLog, LessonLearned, ProjectRow, SupportActivity } from "@/types";

export function exportRowsToExcel(
  rows: Record<string, unknown>[],
  sheetName: string,
  filename: string,
) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export function exportProjectsToExcel(rows: ProjectRow[], filename = "projects-export.xlsx") {
  exportRowsToExcel(rows as unknown as Record<string, unknown>[], "Projects", filename);
}

export function exportSupportToExcel(rows: SupportActivity[], filename = "support-activities-export.xlsx") {
  exportRowsToExcel(rows as unknown as Record<string, unknown>[], "Support Activities", filename);
}

export function exportAuditToExcel(rows: AuditLog[], filename = "audit-trail-export.xlsx") {
  const mapped = rows.map((row) => ({
    "Date and Time": formatAuditTimestamp(row.timestamp),
    User: row.user_email,
    Activity: formatAuditActivity(row),
    "Project ID": formatAuditProjectId(row.project_id),
    Details: formatAuditDetails(row),
    Module: row.module,
    Action: row.action,
    "Record ID": row.record_id,
  }));
  exportRowsToExcel(mapped, "Audit Trail", filename);
}

export function exportLessonsLearnedToExcel(rows: LessonLearned[], filename = "lessons-learned-export.xlsx") {
  const mapped = rows.map((row) => ({
    "Lesson ID": row.lesson_id ?? row.id,
    "Date and Time": formatAppDateTime(row.created_at),
    User: row.user_email,
    "User Group": row.user_role,
    Category: row.category,
    "Reason Category": row.reason_category,
    Description: row.description,
    Module: row.source_module,
    "Project ID": row.project_id,
    Location: row.record_context,
    Field: row.field_label,
    "Old Date": row.old_date,
    "New Date": row.new_date,
  }));
  exportRowsToExcel(mapped, "Lessons Learned", filename);
}
