import { AM_FIELDS, PP_FIELDS, QC_FIELDS, TSD_FIELDS, VAL_FIELDS } from "@/lib/constants";

import { PO_FIELDS, type ProjectTab } from "@/lib/projectFormFields";

import { isMissingValue } from "@/lib/utils";

import type { ProjectHierarchy } from "@/types";



export interface DuplicateOccurrence {

  id: string;

  location: string;

  tab: ProjectTab;

  fieldKey: string;

  fieldDomId: string;

  batchIndex: number;

  moIndex?: number;

  poIndex?: number;

  cnfIndex?: number;

}



export interface DuplicateGroup {

  fieldLabel: string;

  fieldKey: string;

  value: string;

  occurrences: DuplicateOccurrence[];

}



const CNF_FIELD_KEYS = [

  "cnf_reference",

  "qrmr_ref_no",

  "change_description",

  "cnf_status",

  "client_approval_target_date",

  "remarks",

] as const;



type PoFieldMeta = { key: string; label: string; role: ProjectTab; isCnf?: boolean };



const PO_FIELD_META: PoFieldMeta[] = [

  { key: "po_control_no", label: "PO Control No.", role: "AM/BM/PL" },

  { key: "fg_month", label: "FG Month", role: "AM/BM/PL" },

  { key: "business_unit", label: "Business Unit", role: "AM/BM/PL" },

  { key: "updatedDocsVer", label: "Updated Docs/Ver", role: "AM/BM/PL" },

  { key: "order_quantity", label: "Order Quantity", role: "AM/BM/PL" },

  { key: "uom", label: "Uom", role: "AM/BM/PL" },

  { key: "prod_ver", label: "Prod. Ver.", role: "AM/BM/PL" },

  { key: "manufacturing_start_week", label: "Manufacturing Start Week", role: "PP" },

  { key: "mo_bmr_po_submission_status", label: "MO/BMR/PO Submission", role: "TSD" },

  { key: "mo_bmr_po_target_date", label: "MO/BMR/PO Target Date", role: "TSD" },

  { key: "mo_bmr_po_activation_status", label: "MO/BMR/PO Activation", role: "TSD" },

  { key: "mo_bmr_po_activation_date", label: "MO/BMR/PO Activation Date", role: "TSD" },

  { key: "protocol_no", label: "Protocol No.", role: "VAL" },

  { key: "protocol_Status", label: "Protocol Status", role: "VAL" },

  { key: "protocol_target_date", label: "Protocol Target Date", role: "VAL" },

  { key: "Val_Activity", label: "Val Activity", role: "VAL" },

  { key: "Val_Stability", label: "Val Stability", role: "VAL" },

  { key: "Val_Batch_Seq_No", label: "Val Batch Seq No.", role: "VAL" },

  { key: "Val_Strategy", label: "Val Strategy", role: "VAL" },

  { key: "Val_Strategy_remarks", label: "Val Strategy Remarks", role: "VAL" },

  { key: "val_report_no", label: "Val Report No.", role: "VAL" },

  { key: "Report_Sub_Status", label: "Report Sub Status", role: "VAL" },

  { key: "Report_target_Date", label: "Report Target Date", role: "VAL" },

  { key: "ar_availability_date", label: "AR Availability Date", role: "QC" },

  { key: "packaging_schedule", label: "Packaging Schedule", role: "PP" },

  { key: "final_status", label: "Final Status", role: "PP" },

  { key: "final_status_other", label: "Final Status (Others)", role: "PP" },

  ...CNF_FIELD_KEYS.map((key) => ({

    key,

    label: key.replace(/_/g, " "),

    role: "AM/BM/PL" as ProjectTab,

    isCnf: true,

  })),

];



export function buildFieldDomId(params: {

  level: "batch" | "mo" | "po" | "cnf";

  batchIndex: number;

  moIndex?: number;

  poIndex?: number;

  cnfIndex?: number;

  fieldKey: string;

}): string {

  const { level, batchIndex, moIndex, poIndex, cnfIndex, fieldKey } = params;

  if (level === "batch") return `project-field-batch-${batchIndex}-${fieldKey}`;

  if (level === "mo") return `project-field-mo-${batchIndex}-${moIndex}-${fieldKey}`;

  if (level === "cnf") {

    return `project-field-cnf-${batchIndex}-${moIndex}-${poIndex}-${cnfIndex}-${fieldKey}`;

  }

  return `project-field-po-${batchIndex}-${moIndex}-${poIndex}-${fieldKey}`;

}



function fieldRole(key: string): ProjectTab {

  if (AM_FIELDS.includes(key)) return "AM/BM/PL";

  if (PP_FIELDS.includes(key)) return "PP";

  if (TSD_FIELDS.includes(key)) return "TSD";

  if (VAL_FIELDS.includes(key)) return "VAL";

  if (QC_FIELDS.includes(key)) return "QC";

  return "AM/BM/PL";

}



export function getFieldTab(fieldKey: string): ProjectTab {

  if (fieldKey === "unique_batch" || fieldKey === "mo_control_no") return "AM/BM/PL";

  const poField = PO_FIELDS.find((field) => field.key === fieldKey);

  if (poField && poField.role !== "System") return poField.role;

  return fieldRole(fieldKey);

}



export function filterDuplicatesByTab(groups: DuplicateGroup[], tab: ProjectTab): DuplicateGroup[] {

  return groups.filter((group) => getFieldTab(group.fieldKey) === tab);

}



export function getLastOccurrence(group: DuplicateGroup): DuplicateOccurrence {

  return group.occurrences[group.occurrences.length - 1];

}



export function focusDuplicateField(fieldDomId: string) {

  const node = document.getElementById(fieldDomId);

  if (!node) return;



  node.scrollIntoView({ behavior: "smooth", block: "center" });

  node.classList.add("duplicate-field-highlight");



  const focusable = node.querySelector<HTMLElement>(

    "input:not([disabled]), textarea:not([disabled]), .ant-select:not(.ant-select-disabled) .ant-select-selector",

  );

  focusable?.focus({ preventScroll: true });



  window.setTimeout(() => node.classList.remove("duplicate-field-highlight"), 3200);

}



/** Matches legacy detectDuplicateValues_ in sampleApp/Script.html */

export function detectDuplicateValues(draft: ProjectHierarchy): DuplicateGroup[] {

  const values: Record<string, DuplicateGroup> = {};



  function collect(

    field: PoFieldMeta,

    value: unknown,

    occurrence: Omit<DuplicateOccurrence, "location"> & { location: string },

  ) {

    if (isMissingValue(value)) return;

    const normalized = String(value).trim().toLowerCase();

    const key = `${field.key}::${normalized}`;

    if (!values[key]) {

      values[key] = {

        fieldLabel: field.label,

        fieldKey: field.key,

        value: String(value).trim(),

        occurrences: [],

      };

    }

    values[key].occurrences.push({

      id: occurrence.id,

      location: occurrence.location,

      tab: occurrence.tab,

      fieldKey: occurrence.fieldKey,

      fieldDomId: occurrence.fieldDomId,

      batchIndex: occurrence.batchIndex,

      moIndex: occurrence.moIndex,

      poIndex: occurrence.poIndex,

      cnfIndex: occurrence.cnfIndex,

    });

  }



  (draft.batches ?? []).forEach((batch, bi) => {

    collect(

      { key: "unique_batch", label: "Unique Batch", role: "AM/BM/PL" },

      batch.unique_batch,

      {

        id: `batch_${bi}`,

        location: `Batch ${bi + 1}`,

        tab: "AM/BM/PL",

        fieldKey: "unique_batch",

        fieldDomId: buildFieldDomId({ level: "batch", batchIndex: bi, fieldKey: "unique_batch" }),

        batchIndex: bi,

      },

    );

    (batch.mo_controls ?? []).forEach((mo, mi) => {

      const moLocation = `Batch ${bi + 1} / MO ${mi + 1}`;

      collect(

        { key: "mo_control_no", label: "MO Control No.", role: "AM/BM/PL" },

        mo.mo_control_no,

        {

          id: `mo_${bi}_${mi}`,

          location: moLocation,

          tab: "AM/BM/PL",

          fieldKey: "mo_control_no",

          fieldDomId: buildFieldDomId({ level: "mo", batchIndex: bi, moIndex: mi, fieldKey: "mo_control_no" }),

          batchIndex: bi,

          moIndex: mi,

        },

      );

      (mo.po_controls ?? []).forEach((po, pi) => {

        const poLocation = `${moLocation} / PO ${pi + 1}`;

        PO_FIELD_META.filter((field) => !field.isCnf).forEach((field) => {

          collect(field, (po as unknown as Record<string, unknown>)[field.key], {

            id: `po_${bi}_${mi}_${pi}_${field.key}`,

            location: poLocation,

            tab: field.role,

            fieldKey: field.key,

            fieldDomId: buildFieldDomId({

              level: "po",

              batchIndex: bi,

              moIndex: mi,

              poIndex: pi,

              fieldKey: field.key,

            }),

            batchIndex: bi,

            moIndex: mi,

            poIndex: pi,

          });

        });

        const cnfEntries = po.cnf_entries?.length

          ? po.cnf_entries

          : [Object.fromEntries(CNF_FIELD_KEYS.map((k) => [k, (po as unknown as Record<string, unknown>)[k]]))];

        cnfEntries.forEach((entry, ci) => {

          CNF_FIELD_KEYS.forEach((key) => {

            collect(

              { key, label: key.replace(/_/g, " "), role: "AM/BM/PL", isCnf: true },

              entry[key],

              {

                id: `cnf_${bi}_${mi}_${pi}_${ci}_${key}`,

                location: `${poLocation} / CNF Entry ${ci + 1}`,

                tab: fieldRole(key),

                fieldKey: key,

                fieldDomId: buildFieldDomId({

                  level: "cnf",

                  batchIndex: bi,

                  moIndex: mi,

                  poIndex: pi,

                  cnfIndex: ci,

                  fieldKey: key,

                }),

                batchIndex: bi,

                moIndex: mi,

                poIndex: pi,

                cnfIndex: ci,

              },

            );

          });

        });

      });

    });

  });



  return Object.values(values)

    .filter((group) => group.occurrences.length > 1)

    .sort((a, b) => a.fieldLabel.localeCompare(b.fieldLabel) || a.value.localeCompare(b.value));

}


