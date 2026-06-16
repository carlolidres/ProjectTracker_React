import type { ProjectHierarchy } from "@/types";

const STUDY_ACTIVITIES = new Set(["VAL", "VER", "CHAR"]);
const BMR_UNLOCK_STATUSES = new Set(["Approved", "Not Applicable"]);

export function projectHasValidationStudy(project: ProjectHierarchy): boolean {
  for (const batch of project.batches) {
    for (const mo of batch.mo_controls) {
      for (const po of mo.po_controls) {
        const activity = String(po.Val_Activity ?? "").trim().toUpperCase();
        if (STUDY_ACTIVITIES.has(activity)) return true;
      }
    }
  }
  return false;
}

export function batchEndorsementUnlocksBmr(project: ProjectHierarchy, batchIndex: number): boolean {
  const batch = project.batches[batchIndex];
  if (!batch) return false;
  for (const mo of batch.mo_controls) {
    for (const po of mo.po_controls) {
      const status = String(po.endorsement_report_status ?? "").trim();
      if (BMR_UNLOCK_STATUSES.has(status)) return true;
    }
  }
  return false;
}

export function isBmrLockedForBatch(project: ProjectHierarchy, batchIndex: number): boolean {
  if (!projectHasValidationStudy(project)) return false;
  return !batchEndorsementUnlocksBmr(project, batchIndex);
}

/** True when any batch still has BMR locked under validation-study rules. */
export function isProjectBmrLocked(project: ProjectHierarchy): boolean {
  if (!projectHasValidationStudy(project)) return false;
  return project.batches.some((_, batchIndex) => isBmrLockedForBatch(project, batchIndex));
}

export function projectBmrLockStatusLabel(project: ProjectHierarchy): "Yes" | "No" {
  return isProjectBmrLocked(project) ? "Yes" : "No";
}

export function isBmrFieldKey(fieldKey: string): boolean {
  return [
    "mo_bmr_po_submission_status",
    "mo_bmr_po_target_date",
    "mo_bmr_po_activation_status",
    "mo_bmr_po_activation_date",
  ].includes(fieldKey);
}

export const BMR_LOCK_PRODUCT_MESSAGE =
  "The BMR for this product remains locked until the Endorsement Report Status is Approved or Not Applicable.";

export function bmrLockReason(_project: ProjectHierarchy): string {
  return BMR_LOCK_PRODUCT_MESSAGE;
}
