import {
  HEADER_FIELDS,
  PO_FIELDS,
  PROJECT_LEVEL_VAL_FIELDS,
  QA_CNF_FIELDS,
  type ProjectFieldType,
} from "@/lib/projectFormFields";
import type { RoleColorKey } from "@/lib/roleColors";
import { AM_CNF_ENTRY_KEYS, QA_CNF_ENTRY_KEYS } from "@/lib/constants";
import type { UserRole } from "@/types";

export type SpreadsheetFieldGroup = "am" | "qa" | "pp" | "tsd" | "val" | "qc";

export type SpreadsheetValueLevel = "project" | "batch" | "po" | "cnf" | "projectVal";

export interface SpreadsheetColumnDef {
  field: string;
  headerName: string;
  roleGroup: RoleColorKey;
  roleGroupLabel: string;
  fieldGroup: SpreadsheetFieldGroup;
  editor: ProjectFieldType;
  registry?: string;
  creatable?: boolean;
  level: SpreadsheetValueLevel;
  width: number;
  pinned?: "left";
  readOnlyAlways?: boolean;
}

const FIELD_LOOKUP = new Map(
  [
    ...HEADER_FIELDS,
    ...PO_FIELDS,
    ...QA_CNF_FIELDS,
    { key: "unique_batch", label: "Unique Batch", type: "alphanumeric" as const, role: "AM/BM/PL" as const },
  ].map((f) => [f.key, f]),
);

function col(
  field: string,
  overrides: Partial<SpreadsheetColumnDef> & {
    roleGroup: RoleColorKey;
    roleGroupLabel: string;
    fieldGroup: SpreadsheetFieldGroup;
    level: SpreadsheetValueLevel;
  },
): SpreadsheetColumnDef {
  const base = FIELD_LOOKUP.get(field);
  return {
    field,
    headerName: overrides.headerName ?? base?.label ?? field,
    editor: overrides.editor ?? base?.type ?? "text",
    registry: overrides.registry ?? base?.registry,
    creatable: overrides.creatable ?? base?.creatable,
    width: overrides.width ?? 140,
    pinned: overrides.pinned,
    readOnlyAlways: overrides.readOnlyAlways,
    roleGroup: overrides.roleGroup,
    roleGroupLabel: overrides.roleGroupLabel,
    fieldGroup: overrides.fieldGroup,
    level: overrides.level,
  };
}

/**
 * Spreadsheet columns in display order (excluding frozen Project ID).
 * Long-text (`textarea`) fields are omitted — edit those on Project Entry.
 */
export const PROJECTS_DB_DATA_COLUMNS: SpreadsheetColumnDef[] = [
  col("activity_type", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "project", width: 120 }),
  col("project_owner", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "project", headerName: "AM", width: 110 }),
  col("client_name", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "project", width: 160 }),
  col("so_no", {
    roleGroup: "am",
    roleGroupLabel: "AM/BM/PL",
    fieldGroup: "am",
    level: "po",
    width: 120,
  }),
  col("fg_code", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "project", width: 100 }),
  col("product_name", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "project", headerName: "Product", width: 200 }),
  col("po_control_no", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "po", headerName: "Control #", width: 120 }),
  col("unique_batch", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "batch", width: 130 }),
  col("order_quantity", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "po", width: 110 }),
  col("uom", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "po", width: 90 }),
  col("prod_ver", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "po", headerName: "Prod Ver", width: 100 }),
  col("fg_month", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "po", width: 110 }),
  col("business_unit", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "po", headerName: "BU", width: 80 }),
  col("cnf_reference", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "cnf", width: 120 }),
  col("updatedDocsVer", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "po", headerName: "Updated Docs/Ver (Y/N)", width: 140 }),
  col("cnf_status", { roleGroup: "am", roleGroupLabel: "AM/BM/PL", fieldGroup: "am", level: "cnf", width: 130 }),
  col("client_approval_target_date", {
    roleGroup: "am",
    roleGroupLabel: "AM/BM/PL",
    fieldGroup: "am",
    level: "cnf",
    headerName: "Client Approval",
    width: 130,
  }),

  col("qrmr_ref_no", { roleGroup: "qa", roleGroupLabel: "QA", fieldGroup: "qa", level: "cnf", headerName: "QRMR No.", width: 120 }),
  col("qrmr_status", { roleGroup: "qa", roleGroupLabel: "QA", fieldGroup: "qa", level: "cnf", headerName: "QRMR Status", width: 130 }),
  col("qrmr_target_date", {
    roleGroup: "qa",
    roleGroupLabel: "QA",
    fieldGroup: "qa",
    level: "cnf",
    headerName: "QRMR Target",
    width: 120,
  }),

  col("manufacturing_start_week", { roleGroup: "pp", roleGroupLabel: "PP", fieldGroup: "pp", level: "po", headerName: "Mfg Start Week", width: 130 }),
  col("final_status", { roleGroup: "pp", roleGroupLabel: "PP", fieldGroup: "pp", level: "po", headerName: "FINAL STATUS", width: 120 }),

  col("mo_bmr_po_submission_status", {
    roleGroup: "tsd",
    roleGroupLabel: "TSD",
    fieldGroup: "tsd",
    level: "po",
    headerName: "MO/BMR/PO Submission",
    width: 140,
  }),
  col("mo_bmr_po_target_date", {
    roleGroup: "tsd",
    roleGroupLabel: "TSD",
    fieldGroup: "tsd",
    level: "po",
    headerName: "MO/BMR/PO Sub. Date",
    width: 130,
  }),
  col("mo_bmr_po_activation_status", {
    roleGroup: "tsd",
    roleGroupLabel: "TSD",
    fieldGroup: "tsd",
    level: "po",
    headerName: "MO/BMR/PO Activation",
    width: 140,
  }),
  col("mo_bmr_po_activation_date", {
    roleGroup: "tsd",
    roleGroupLabel: "TSD",
    fieldGroup: "tsd",
    level: "po",
    headerName: "Activation Date",
    width: 130,
  }),

  col("Val_Activity", { roleGroup: "val", roleGroupLabel: "VALDN", fieldGroup: "val", level: "po", headerName: "Activity", width: 100 }),
  col("Val_Batch_Seq_No", {
    roleGroup: "val",
    roleGroupLabel: "VALDN",
    fieldGroup: "val",
    level: "po",
    headerName: "VAL Batch No.",
    width: 110,
  }),
  col("protocol_Status", {
    roleGroup: "val",
    roleGroupLabel: "VALDN",
    fieldGroup: "val",
    level: "projectVal",
    headerName: "Protocol Submission",
    width: 140,
  }),
  col("protocol_target_date", {
    roleGroup: "val",
    roleGroupLabel: "VALDN",
    fieldGroup: "val",
    level: "projectVal",
    headerName: "Protocol Date",
    width: 120,
  }),
  col("Val_Strategy", {
    roleGroup: "val",
    roleGroupLabel: "VALDN",
    fieldGroup: "val",
    level: "po",
    headerName: "Validation Strategy",
    width: 140,
  }),
  col("validation_report_status", {
    roleGroup: "val",
    roleGroupLabel: "VALDN",
    fieldGroup: "val",
    level: "projectVal",
    headerName: "Val/Ver Report",
    width: 130,
  }),
  col("validation_report_target_date", {
    roleGroup: "val",
    roleGroupLabel: "VALDN",
    fieldGroup: "val",
    level: "projectVal",
    headerName: "Val/Ver Report Date",
    width: 140,
  }),

  col("ar_availability_date", {
    roleGroup: "qc",
    roleGroupLabel: "QC",
    fieldGroup: "qc",
    level: "po",
    headerName: "AR AVAILABILITY",
    width: 130,
  }),

  col("packaging_schedule", {
    roleGroup: "pp",
    roleGroupLabel: "PP",
    fieldGroup: "pp",
    level: "po",
    headerName: "PKG SCHEDULE",
    width: 130,
  }),
];

export const PROJECTS_DB_PROJECT_ID_COLUMN: SpreadsheetColumnDef = {
  field: "project_id",
  headerName: "Project ID",
  roleGroup: "id",
  roleGroupLabel: "ID",
  fieldGroup: "am",
  editor: "readonly",
  level: "project",
  width: 140,
  pinned: "left",
  readOnlyAlways: true,
};

export const PROJECT_HEADER_FIELDS = new Set([
  "activity_type",
  "project_owner",
  "client_name",
  "fg_code",
  "product_name",
]);

export const CNF_SPREADSHEET_FIELDS = new Set<string>([...AM_CNF_ENTRY_KEYS, ...QA_CNF_ENTRY_KEYS]);

const PENDING_ROLE_TO_FIELD_GROUP: Record<string, SpreadsheetFieldGroup> = {
  "AM/BM/PL": "am",
  QA: "qa",
  PP: "pp",
  TSD: "tsd",
  VAL: "val",
  QC: "qc",
};

/** Columns for a dashboard/Pending Role drill; null means show all role groups. */
export function spreadsheetColumnsForPendingRole(
  pendingRole: string | undefined,
): SpreadsheetColumnDef[] | null {
  const group = pendingRole ? PENDING_ROLE_TO_FIELD_GROUP[pendingRole] : undefined;
  if (!group) return null;
  return PROJECTS_DB_DATA_COLUMNS.filter((column) => column.fieldGroup === group);
}

export function spreadsheetFieldGroupForPendingRole(
  pendingRole: string | undefined,
): SpreadsheetFieldGroup | null {
  if (!pendingRole) return null;
  return PENDING_ROLE_TO_FIELD_GROUP[pendingRole] ?? null;
}

/** Always keep these identity columns visible when a role column focus is active. */
export const ROLE_FOCUS_CONTEXT_FIELDS = [
  "so_no",
  "product_name",
  "po_control_no",
  "unique_batch",
] as const;

function withRoleFocusContextColumns(focused: SpreadsheetColumnDef[]): SpreadsheetColumnDef[] {
  const keep = new Set<string>([
    ...ROLE_FOCUS_CONTEXT_FIELDS,
    ...focused.map((column) => column.field),
  ]);
  return PROJECTS_DB_DATA_COLUMNS.filter((column) => keep.has(column.field));
}

/** Columns matching one or more spreadsheet role-group header labels; null/empty = all. */
export function spreadsheetColumnsForRoleGroupLabels(
  labels: string[] | null | undefined,
): SpreadsheetColumnDef[] | null {
  if (!labels?.length) return null;
  const wanted = new Set(labels);
  return PROJECTS_DB_DATA_COLUMNS.filter((column) => wanted.has(column.roleGroupLabel));
}

export type SpreadsheetColumnFocus =
  | { mode: "all" }
  | { mode: "roleLabels"; labels: string[] }
  | { mode: "fieldGroup"; group: SpreadsheetFieldGroup };

export function resolveSpreadsheetColumnFocus(
  focus: SpreadsheetColumnFocus | undefined,
): SpreadsheetColumnDef[] {
  if (!focus || focus.mode === "all") return PROJECTS_DB_DATA_COLUMNS;
  if (focus.mode === "fieldGroup") {
    return withRoleFocusContextColumns(
      PROJECTS_DB_DATA_COLUMNS.filter((column) => column.fieldGroup === focus.group),
    );
  }
  const byLabel = spreadsheetColumnsForRoleGroupLabels(focus.labels);
  return byLabel ? withRoleFocusContextColumns(byLabel) : PROJECTS_DB_DATA_COLUMNS;
}

export function isProjectLevelValField(field: string): boolean {
  return PROJECT_LEVEL_VAL_FIELDS.has(field);
}

export function canEditSpreadsheetColumn(
  role: UserRole | undefined,
  column: SpreadsheetColumnDef,
  canEditProjectFields: (role: UserRole, group: SpreadsheetFieldGroup) => boolean,
): boolean {
  if (!role || column.readOnlyAlways) return false;
  if (role === "view") return false;
  return canEditProjectFields(role, column.fieldGroup);
}

export const PROJECTS_DB_WIDTHS_STORAGE_KEY = "project-tracker:projects-db:column-widths";
export const PROJECTS_DB_ROW_HEIGHT_STORAGE_KEY = "project-tracker:projects-db:row-height";
export const PROJECTS_DB_DEFAULT_ROW_HEIGHT = 36;
export const PROJECTS_DB_ROW_HEIGHT_OPTIONS = [
  { label: "Compact", value: 28 },
  { label: "Default", value: 36 },
  { label: "Comfortable", value: 48 },
] as const;

export function filterTypeForEditor(editor: ProjectFieldType): string {
  // Date + month columns use AG date filter with a MMM YYYY month picker input.
  if (editor === "date" || editor === "month") return "agDateColumnFilter";
  if (editor === "order_quantity" || editor === "numeric") return "agNumberColumnFilter";
  return "agTextColumnFilter";
}

export function isMonthYearFilterColumn(column: Pick<SpreadsheetColumnDef, "editor" | "field">): boolean {
  return column.editor === "date" || column.editor === "month" || column.field === "fg_month";
}
