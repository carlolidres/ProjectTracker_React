import { toTitleCase, valueOrNA } from "@/lib/utils";

export function normalizeWorkflowStatusLabel(status: string): string {
  const raw = valueOrNA(status);
  if (raw === "N/A") return "N/A";
  return toTitleCase(raw.replace(/_/g, " ").replace(/\s+/g, " ").trim());
}
