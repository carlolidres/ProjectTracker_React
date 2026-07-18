import {
  CNF_SPREADSHEET_FIELDS,
  PROJECT_HEADER_FIELDS,
  PROJECTS_DB_DATA_COLUMNS,
  PROJECTS_DB_PROJECT_ID_COLUMN,
  canEditSpreadsheetColumn,
  isProjectLevelValField,
} from "@/lib/projectsDatabaseColumns";
import { emptyCnfEntry } from "@/lib/projectHierarchy";
import { emitProjectDataChanged } from "@/lib/projectDataEvents";
import { collectProjectDateChanges } from "@/lib/dateAdjustmentReview";
import type { DateFieldChange } from "@/lib/dateAdjustmentReview";
import { canAdjustSavedFgMonth, canEditProjectFields } from "@/lib/roleAccess";
import { validateSpreadsheetCellValue } from "@/lib/projectsDatabaseValidation";
import { valueOrNA } from "@/lib/utils";
import type { PoControl, ProjectHierarchy, ProjectRow, UserRole } from "@/types";
import {
  getProjectById,
  updateProject,
  type ProjectSaveOptions,
} from "@/services/projectService";

const COLUMN_BY_FIELD = new Map(
  [PROJECTS_DB_PROJECT_ID_COLUMN, ...PROJECTS_DB_DATA_COLUMNS].map((column) => [column.field, column]),
);

export interface SpreadsheetCellEdit {
  recordId: string;
  projectId: string;
  field: string;
  oldValue: string;
  newValue: string;
}

function findPoByRecordId(
  hierarchy: ProjectHierarchy,
  recordId: string,
): { po: PoControl; batchIndex: number; moIndex: number; poIndex: number } | null {
  for (let batchIndex = 0; batchIndex < hierarchy.batches.length; batchIndex += 1) {
    const batch = hierarchy.batches[batchIndex];
    for (let moIndex = 0; moIndex < batch.mo_controls.length; moIndex += 1) {
      const mo = batch.mo_controls[moIndex];
      for (let poIndex = 0; poIndex < mo.po_controls.length; poIndex += 1) {
        const po = mo.po_controls[poIndex];
        if (po.record_id === recordId) {
          return { po, batchIndex, moIndex, poIndex };
        }
      }
    }
  }
  return null;
}

function applyFieldToPo(po: PoControl, field: string, value: string) {
  if (CNF_SPREADSHEET_FIELDS.has(field)) {
    if (!po.cnf_entries?.length) {
      po.cnf_entries = [emptyCnfEntry()];
    }
    const entry = po.cnf_entries[0];
    (entry as unknown as Record<string, string>)[field] = value;
    (po as unknown as Record<string, string>)[field] = value;
    return;
  }
  (po as unknown as Record<string, string>)[field] = value;
}

function applyEditsToHierarchy(
  hierarchy: ProjectHierarchy,
  edits: SpreadsheetCellEdit[],
): ProjectHierarchy {
  const next = structuredClone(hierarchy);

  for (const edit of edits) {
    if (PROJECT_HEADER_FIELDS.has(edit.field)) {
      (next as unknown as Record<string, string>)[edit.field] = edit.newValue;
      continue;
    }

    if (edit.field === "unique_batch") {
      const located = findPoByRecordId(next, edit.recordId);
      if (!located) continue;
      next.batches[located.batchIndex].unique_batch = edit.newValue;
      continue;
    }

    const located = findPoByRecordId(next, edit.recordId);
    if (!located) {
      throw new Error(`PO line ${edit.recordId} not found on project ${edit.projectId}.`);
    }

    applyFieldToPo(located.po, edit.field, edit.newValue);

    if (isProjectLevelValField(edit.field)) {
      const canonical = next.batches[0]?.mo_controls[0]?.po_controls[0];
      if (canonical && canonical.record_id !== located.po.record_id) {
        applyFieldToPo(canonical, edit.field, edit.newValue);
      }
      if (
        edit.field === "validation_report_no" ||
        edit.field === "validation_report_status" ||
        edit.field === "validation_report_target_date"
      ) {
        (next as unknown as Record<string, string>)[edit.field] = edit.newValue;
      }
    }

    if (edit.field === "so_no" && located.batchIndex === 0 && located.moIndex === 0 && located.poIndex === 0) {
      next.so_no = edit.newValue;
    }
  }

  return next;
}

export function previewSpreadsheetDateChanges(
  baseline: ProjectHierarchy,
  edits: SpreadsheetCellEdit[],
): DateFieldChange[] {
  const draft = applyEditsToHierarchy(baseline, edits);
  return collectProjectDateChanges(baseline, draft);
}

export interface SpreadsheetPatchOptions extends ProjectSaveOptions {
  /** Caller role — re-checked so UI gates cannot be bypassed. */
  role?: UserRole;
  /** Registry lists for select validation. */
  registry?: Record<string, string[]>;
}

function assertSpreadsheetEditAllowed(
  edit: SpreadsheetCellEdit,
  role: UserRole | undefined,
  registry: Record<string, string[]>,
  hierarchy: ProjectHierarchy,
): SpreadsheetCellEdit {
  const column = COLUMN_BY_FIELD.get(edit.field);
  if (!column) {
    throw new Error(`Unknown spreadsheet field: ${edit.field}`);
  }
  if (!canEditSpreadsheetColumn(role, column, canEditProjectFields)) {
    throw new Error(`You do not have permission to edit ${column.headerName}.`);
  }
  if (column.field === "project_owner" && role !== "admin") {
    throw new Error("Only admins can change Project Owner.");
  }
  if (column.field === "fg_month") {
    const located = findPoByRecordId(hierarchy, edit.recordId);
    const current = String(located?.po.fg_month ?? hierarchy.batches[0]?.mo_controls[0]?.po_controls[0]?.fg_month ?? "").trim();
    if (current && valueOrNA(current) !== "N/A" && !canAdjustSavedFgMonth(role)) {
      throw new Error("Saved FG Month can only be changed by Admin or AM/BM/PL.");
    }
  }

  const validated = validateSpreadsheetCellValue(column, edit.newValue, registry);
  if (!validated.ok) {
    throw new Error(validated.message ?? `Invalid value for ${column.headerName}.`);
  }
  return { ...edit, newValue: validated.normalized };
}

export async function patchProjectFromSpreadsheetEdits(
  edits: SpreadsheetCellEdit[],
  userEmail: string,
  options?: SpreadsheetPatchOptions,
): Promise<{ projectIds: string[]; dateChanges: DateFieldChange[] }> {
  if (!edits.length) return { projectIds: [], dateChanges: [] };

  const role = options?.role;
  const registry = options?.registry ?? {};

  const byProject = new Map<string, SpreadsheetCellEdit[]>();
  for (const edit of edits) {
    const list = byProject.get(edit.projectId) ?? [];
    list.push(edit);
    byProject.set(edit.projectId, list);
  }

  const projectIds: string[] = [];
  const allDateChanges: DateFieldChange[] = [];

  for (const [projectId, projectEdits] of byProject) {
    const hierarchy = await getProjectById(projectId);
    if (!hierarchy) {
      throw new Error(`Project ${projectId} not found.`);
    }

    const authorizedEdits = projectEdits.map((edit) =>
      assertSpreadsheetEditAllowed(edit, role, registry, hierarchy),
    );

    const dateChanges = previewSpreadsheetDateChanges(hierarchy, authorizedEdits);
    allDateChanges.push(...dateChanges);

    if (dateChanges.length && !options?.dateAdjustmentsConfirmed) {
      throw new Error("Date adjustments require a documented reason before saving.");
    }

    const patched = applyEditsToHierarchy(hierarchy, authorizedEdits);
    await updateProject(projectId, patched, userEmail, {
      dateAdjustmentsConfirmed: options?.dateAdjustmentsConfirmed || !dateChanges.length,
    });
    emitProjectDataChanged({ projectId, action: "update" });
    projectIds.push(projectId);
  }

  return { projectIds, dateChanges: allDateChanges };
}

export function applyLocalRowEdits(
  rows: ProjectRow[],
  edits: SpreadsheetCellEdit[],
): ProjectRow[] {
  if (!edits.length) return rows;

  const rowById = new Map(rows.map((row) => [row.record_id, row]));

  return rows.map((row) => {
    let next: ProjectRow | null = null;

    for (const edit of edits) {
      const source = rowById.get(edit.recordId);
      if (!source) continue;

      const appliesToRow =
        edit.recordId === row.record_id ||
        (edit.projectId === row.project_id &&
          (PROJECT_HEADER_FIELDS.has(edit.field) || isProjectLevelValField(edit.field))) ||
        (edit.field === "unique_batch" &&
          source.project_id === row.project_id &&
          source.batch_instance_id === row.batch_instance_id);

      if (!appliesToRow) continue;
      if (!next) next = { ...row };
      (next as unknown as Record<string, string>)[edit.field] = edit.newValue;
    }

    return next ?? row;
  });
}
