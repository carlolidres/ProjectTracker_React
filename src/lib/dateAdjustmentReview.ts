import { CNF_ENTRY_KEYS } from "@/lib/constants";
import { PO_FIELDS } from "@/lib/projectFormFields";
import { isMissingValue } from "@/lib/utils";
import type { CnfEntry, PoControl, ProjectHierarchy } from "@/types";

export const TRACKED_DATE_FIELD_KEYS = new Set([
  "fg_month",
  "client_approval_target_date",
  "manufacturing_start_week",
  "mo_bmr_po_target_date",
  "mo_bmr_po_activation_date",
  "protocol_target_date",
  "Report_target_Date",
  "ar_availability_date",
  "packaging_schedule",
  "Target_Date",
  "Planning_Schedule",
]);

const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  PO_FIELDS.map((field) => [field.key, field.label]),
);

FIELD_LABELS.Target_Date = "Target Date to Execute";
FIELD_LABELS.Planning_Schedule = "Planning Schedule";

export interface DateFieldChange {
  fieldName: string;
  fieldLabel: string;
  oldDate: string;
  newDate: string;
  recordContext: string;
  sourceModule: "Projects" | "Support Activities";
  projectId?: string;
}

export function shouldRequireDateAdjustmentReason(oldValue: string, newValue: string): boolean {
  const oldNormalized = String(oldValue ?? "").trim();
  if (isMissingValue(oldNormalized)) return false;
  const newNormalized = String(newValue ?? "").trim();
  if (oldNormalized === newNormalized) return false;
  return true;
}

function labelForField(fieldName: string): string {
  return FIELD_LABELS[fieldName] ?? fieldName.replace(/_/g, " ");
}

function collectPoDateChanges(
  baseline: PoControl,
  draft: PoControl,
  context: string,
  projectId: string,
  changes: DateFieldChange[],
) {
  for (const field of PO_FIELDS) {
    if (field.type !== "date" && field.type !== "month") continue;
    const oldValue = String((baseline as unknown as Record<string, string>)[field.key] ?? "");
    const newValue = String((draft as unknown as Record<string, string>)[field.key] ?? "");
    if (!shouldRequireDateAdjustmentReason(oldValue, newValue)) continue;
    changes.push({
      fieldName: field.key,
      fieldLabel: field.label,
      oldDate: oldValue,
      newDate: newValue,
      recordContext: context,
      sourceModule: "Projects",
      projectId,
    });
  }

  const baselineEntries = baseline.cnf_entries?.length ? baseline.cnf_entries : [];
  const draftEntries = draft.cnf_entries?.length ? draft.cnf_entries : [];
  const entryCount = Math.max(baselineEntries.length, draftEntries.length, 1);

  for (let index = 0; index < entryCount; index += 1) {
    const baseEntry = baselineEntries[index] ?? ({} as CnfEntry);
    const draftEntry = draftEntries[index] ?? ({} as CnfEntry);
    for (const key of CNF_ENTRY_KEYS) {
      if (key !== "client_approval_target_date") continue;
      const oldValue = String(baseEntry[key] ?? "");
      const newValue = String(draftEntry[key] ?? "");
      if (!shouldRequireDateAdjustmentReason(oldValue, newValue)) continue;
      changes.push({
        fieldName: key,
        fieldLabel: `CNF Entry ${index + 1} Client Approval Target`,
        oldDate: oldValue,
        newDate: newValue,
        recordContext: `${context} / CNF Entry ${index + 1}`,
        sourceModule: "Projects",
        projectId,
      });
    }
  }
}

export function collectProjectDateChanges(
  baseline: ProjectHierarchy,
  draft: ProjectHierarchy,
): DateFieldChange[] {
  const changes: DateFieldChange[] = [];
  const projectId = draft.project_id;

  baseline.batches.forEach((batch, batchIndex) => {
    batch.mo_controls.forEach((mo, moIndex) => {
      mo.po_controls.forEach((po, poIndex) => {
        const draftPo = draft.batches[batchIndex]?.mo_controls[moIndex]?.po_controls[poIndex];
        if (!draftPo) return;
        collectPoDateChanges(
          po,
          draftPo,
          `Batch ${batchIndex + 1} / MO ${moIndex + 1} / PO ${poIndex + 1}`,
          projectId,
          changes,
        );
      });
    });
  });

  return changes;
}

export function collectSupportDateChanges(
  baseline: Record<string, string | undefined>,
  draft: Record<string, string | undefined>,
  context: { projectId?: string; activityId?: string },
): DateFieldChange[] {
  const changes: DateFieldChange[] = [];
  const fields = ["Target_Date", "Planning_Schedule"] as const;
  const recordContext = context.activityId && context.activityId !== "N/A"
    ? `Activity ${context.activityId}`
    : "Support activity";

  for (const fieldName of fields) {
    const oldValue = String(baseline[fieldName] ?? "");
    const newValue = String(draft[fieldName] ?? "");
    if (!shouldRequireDateAdjustmentReason(oldValue, newValue)) continue;
    changes.push({
      fieldName,
      fieldLabel: labelForField(fieldName),
      oldDate: oldValue,
      newDate: newValue,
      recordContext,
      sourceModule: "Support Activities",
      projectId: context.projectId,
    });
  }

  return changes;
}
