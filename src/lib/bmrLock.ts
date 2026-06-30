import { isApprovedOrNotApplicableStatus } from "@/lib/utils";
import type { ProjectHierarchy } from "@/types";

const STUDY_ACTIVITIES = new Set(["VAL", "VER", "CHAR"]);

export type BmrLockStatusLabel = "Locked" | "Unlocked" | "Not Applicable";

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

function canonicalEndorsementStatus(project: ProjectHierarchy): string {
  const canonicalPo = project.batches[0]?.mo_controls[0]?.po_controls[0];
  return String(canonicalPo?.endorsement_report_status ?? "").trim();
}

function endorsementUnlocksBmr(status: string): boolean {
  return isApprovedOrNotApplicableStatus(status);
}

/** Informational status from validation study presence and canonical endorsement report status. */
export function projectBmrLockStatusLabel(project: ProjectHierarchy): BmrLockStatusLabel {
  if (!projectHasValidationStudy(project)) return "Not Applicable";
  if (endorsementUnlocksBmr(canonicalEndorsementStatus(project))) return "Unlocked";
  return "Locked";
}

/** True when a validation study exists and endorsement is not yet Approved or Not Applicable. */
export function isProjectBmrLocked(project: ProjectHierarchy): boolean {
  return projectBmrLockStatusLabel(project) === "Locked";
}

export const BMR_LOCK_PRODUCT_MESSAGE =
  "The BMR for this product remains locked until the Endorsement Report Status is Approved or Not Applicable.";

export function bmrLockReason(_project: ProjectHierarchy): string {
  return BMR_LOCK_PRODUCT_MESSAGE;
}
