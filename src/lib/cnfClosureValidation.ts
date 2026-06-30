import { matchProjectLinesByCnfReference } from "@/lib/cnfTrackerAggregation";
import { isApprovedStatus, isClosureAcceptable } from "@/lib/utils";
import type { ProjectRow } from "@/types";

export interface CnfClosureBlocker {
  field: string;
  label: string;
  currentStatus: string;
}

export interface CnfClosureValidationResult {
  canClose: boolean;
  viaApprovedCnfStatus: boolean;
  blockers: CnfClosureBlocker[];
}

const GATE_FIELDS: { key: string; label: string; fromEntry?: boolean }[] = [
  { key: "qrmr_status", label: "QRMR Status", fromEntry: true },
  { key: "protocol_Status", label: "Protocol Status" },
  { key: "val_interim_report_status", label: "Interim Report Status" },
  { key: "validation_report_status", label: "Validation Report Status" },
  { key: "endorsement_report_status", label: "Endorsement Report Status" },
];

export function validateCnfTrackerClosure(
  projects: ProjectRow[],
  cnfReference: string,
): CnfClosureValidationResult {
  const matches = matchProjectLinesByCnfReference(projects, cnfReference);

  const viaApprovedCnfStatus = matches.some((match) => isApprovedStatus(match.entry.cnf_status));
  if (viaApprovedCnfStatus) {
    return { canClose: true, viaApprovedCnfStatus: true, blockers: [] };
  }

  const first = matches[0];
  if (!first) {
    return {
      canClose: false,
      viaApprovedCnfStatus: false,
      blockers: [{ field: "cnf_reference", label: "CNF Reference", currentStatus: "No matching project PO lines" }],
    };
  }

  const blockers: CnfClosureBlocker[] = [];
  for (const gate of GATE_FIELDS) {
    const status = gate.fromEntry
      ? String(first.entry[gate.key as keyof typeof first.entry] ?? "")
      : String(first.row[gate.key as keyof typeof first.row] ?? "");
    if (!isClosureAcceptable(status)) {
      blockers.push({
        field: gate.key,
        label: gate.label,
        currentStatus: status || "N/A",
      });
    }
  }

  return {
    canClose: blockers.length === 0,
    viaApprovedCnfStatus: false,
    blockers,
  };
}

export function formatCnfClosureBlockerMessage(result: CnfClosureValidationResult): string {
  if (result.canClose) return "";
  if (result.viaApprovedCnfStatus) return "";
  const lines = result.blockers.map(
    (blocker) => `${blocker.label}: ${blocker.currentStatus} (requires Approved or Not Applicable)`,
  );
  return [
    "CNF Tracker cannot be closed until one of the following is met:",
    "• Any matching project CNF entry has CNF Status = Approved, or",
    "• All validation gate fields on the first matching PO are Approved or Not Applicable.",
    "",
    "Fields that still need Approved or Not Applicable:",
    ...lines.map((line) => `• ${line}`),
  ].join("\n");
}
