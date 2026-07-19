import { toTitleCase, valueOrNA } from "@/lib/utils";

export function normalizeWorkflowStatusLabel(status: string): string {
  const raw = valueOrNA(status);
  if (raw === "N/A") return "N/A";
  return toTitleCase(raw.replace(/_/g, " ").replace(/\s+/g, " ").trim());
}

/** Short accessible descriptions for common workflow statuses (tooltip secondary line). */
const WORKFLOW_STATUS_DESCRIPTIONS: Record<string, string> = {
  "n/a": "No status recorded for this document.",
  "in-process": "Document work is underway.",
  "in process": "Document work is underway.",
  routing: "Document is circulating for review or approval.",
  "client approval": "Awaiting client approval.",
  approved: "Document has been approved.",
  "not applicable": "This document does not apply to the record.",
  open: "Record remains open.",
  closed: "Record is closed.",
  planned: "Activity is planned.",
  done: "Activity is complete.",
};

export function workflowStatusDescription(status: string): string | undefined {
  const normalized = normalizeWorkflowStatusLabel(status).toLowerCase();
  return WORKFLOW_STATUS_DESCRIPTIONS[normalized];
}
