import { isApprovedStatus } from "@/lib/utils";
import type { PoControl } from "@/types";

export interface ProjectCloseBlocker {
  field: string;
  label: string;
  currentStatus: string;
}

export interface ProjectCloseValidationResult {
  canClose: boolean;
  blockers: ProjectCloseBlocker[];
}

export function validateProjectClose(canonicalPo: PoControl | undefined): ProjectCloseValidationResult {
  if (!canonicalPo) {
    return {
      canClose: false,
      blockers: [{ field: "canonical_po", label: "Canonical PO", currentStatus: "Missing" }],
    };
  }

  const interimApproved = isApprovedStatus(canonicalPo.val_interim_report_status);
  const reportApproved = isApprovedStatus(canonicalPo.validation_report_status);

  if (interimApproved || reportApproved) {
    return { canClose: true, blockers: [] };
  }

  return {
    canClose: false,
    blockers: [
      {
        field: "val_interim_report_status",
        label: "Interim Report Status",
        currentStatus: canonicalPo.val_interim_report_status || "N/A",
      },
      {
        field: "validation_report_status",
        label: "Validation Report Status",
        currentStatus: canonicalPo.validation_report_status || "N/A",
      },
    ],
  };
}

export function formatProjectCloseBlockerMessage(result: ProjectCloseValidationResult): string {
  if (result.canClose) return "";
  return [
    "Final Status cannot be set to CLOSED until at least one validation report is Approved.",
    "Not Applicable does not qualify for Interim Report Status.",
    "",
    "Current values:",
    ...result.blockers.map(
      (blocker) => `• ${blocker.label}: ${blocker.currentStatus} (must be Approved)`,
    ),
  ].join("\n");
}
