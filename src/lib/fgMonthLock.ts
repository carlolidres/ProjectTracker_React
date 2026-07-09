import { formatAppMonth } from "@/lib/date";
import { canAdjustSavedFgMonth } from "@/lib/roleAccess";
import { valueOrNA } from "@/lib/utils";
import type { ProjectHierarchy, UserRole } from "@/types";

export function fgMonthPath(batchIndex: number, moIndex: number, poIndex: number) {
  return `${batchIndex}-${moIndex}-${poIndex}`;
}

export function collectSavedFgMonths(project: ProjectHierarchy): Record<string, string> {
  const saved: Record<string, string> = {};
  project.batches.forEach((batch, batchIndex) => {
    batch.mo_controls.forEach((mo, moIndex) => {
      mo.po_controls.forEach((po, poIndex) => {
        const fgMonth = valueOrNA(po.fg_month);
        if (fgMonth !== "N/A" && fgMonth.trim()) {
          saved[fgMonthPath(batchIndex, moIndex, poIndex)] = po.fg_month;
        }
      });
    });
  });
  return saved;
}

export function isFgMonthLocked(
  savedFgMonths: Record<string, string>,
  batchIndex: number,
  moIndex: number,
  poIndex: number,
  role?: UserRole,
) {
  if (canAdjustSavedFgMonth(role)) return false;
  return Boolean(savedFgMonths[fgMonthPath(batchIndex, moIndex, poIndex)]);
}

export interface NewFgMonthAssignment {
  path: string;
  label: string;
  value: string;
  displayValue: string;
}

export function findNewFgMonthAssignments(
  project: ProjectHierarchy,
  savedFgMonths: Record<string, string>,
): NewFgMonthAssignment[] {
  const assignments: NewFgMonthAssignment[] = [];

  project.batches.forEach((batch, batchIndex) => {
    batch.mo_controls.forEach((mo, moIndex) => {
      mo.po_controls.forEach((po, poIndex) => {
        const path = fgMonthPath(batchIndex, moIndex, poIndex);
        const current = valueOrNA(po.fg_month);
        const saved = savedFgMonths[path];
        if (current === "N/A" || !current.trim()) return;
        if (saved && saved.trim()) return;

        assignments.push({
          path,
          label: `Batch ${batchIndex + 1} / MO ${moIndex + 1} / PO ${poIndex + 1}`,
          value: po.fg_month,
          displayValue: formatAppMonth(po.fg_month),
        });
      });
    });
  });

  return assignments;
}
