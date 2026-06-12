import * as XLSX from "xlsx";
import type { ProjectRow, SupportActivity } from "@/types";

export function exportProjectsToExcel(rows: ProjectRow[], filename = "projects-export.xlsx") {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");
  XLSX.writeFile(workbook, filename);
}

export function exportSupportToExcel(rows: SupportActivity[], filename = "support-activities-export.xlsx") {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Support Activities");
  XLSX.writeFile(workbook, filename);
}
