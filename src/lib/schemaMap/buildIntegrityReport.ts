import type { SchemaGraph, SchemaTable } from "@/lib/schemaMap/parseMigrations";

export type FindingSeverity = "vulnerability" | "integrity" | "logic";

export interface IntegrityFinding {
  id: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
  table?: string;
}

function tableByName(graph: SchemaGraph, name: string): SchemaTable | undefined {
  return graph.tables.find((table) => table.name === name);
}

function columnNames(table: SchemaTable | undefined): Set<string> {
  return new Set((table?.columns ?? []).map((column) => column.name));
}

export function buildIntegrityReport(graph: SchemaGraph, selectedTable?: string): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  const cnf = tableByName(graph, "cnf_projects");
  const cnfColumns = columnNames(cnf);

  findings.push({
    id: "flat-hierarchy",
    severity: "integrity",
    title: "Flat project hierarchy in cnf_projects",
    detail:
      "Batch, MO, and PO identifiers are stored on one wide table instead of normalized child tables. Orphan and duplication risks are managed in application logic.",
    table: "cnf_projects",
  });

  if (cnf && !cnf.columns.some((column) => column.references?.table && column.name === "project_id")) {
    findings.push({
      id: "project-id-fk",
      severity: "vulnerability",
      title: "No foreign key on cnf_projects.project_id",
      detail: "project_id is not enforced against a parent projects table. Invalid or dangling project references are possible at the database level.",
      table: "cnf_projects",
    });
  }

  const rlsSensitive = ["cnf_projects", "support_activities", "audit_logs", "app_feedback", "profiles"];
  for (const tableName of rlsSensitive) {
    const table = tableByName(graph, tableName);
    if (table && table.policies.length === 0) {
      findings.push({
        id: `rls-${tableName}`,
        severity: "vulnerability",
        title: `No RLS policies detected for ${tableName}`,
        detail: "Frontend role checks alone would not protect this table. Confirm Row Level Security policies are applied in Supabase.",
        table: tableName,
      });
    }
  }

  const soIndex = cnf?.indexes.some((index) => index.includes("so_no")) ?? false;
  if (!soIndex) {
    findings.push({
      id: "so-unique-index",
      severity: "integrity",
      title: "Active SO No. uniqueness index not found in migrations",
      detail: "Apply migration 022 (cnf_projects_active_so_no_unique_idx) so duplicate active SO numbers are blocked at the database layer.",
      table: "cnf_projects",
    });
  } else {
    findings.push({
      id: "so-unique-index-ok",
      severity: "integrity",
      title: "Active SO No. uniqueness index present",
      detail: "Partial unique index on lower(trim(so_no)) for active rows helps prevent duplicate SO numbers.",
      table: "cnf_projects",
    });
  }

  const valFields = [
    "validation_report_no",
    "validation_report_status",
    "validation_report_target_date",
    "endorsement_report_status",
    "endorsement_acceptance_target_date",
  ];
  const missingVal = valFields.filter((field) => !cnfColumns.has(field));
  if (missingVal.length) {
    findings.push({
      id: "val-columns-missing",
      severity: "integrity",
      title: "Validation / endorsement columns missing from schema graph",
      detail: `Expected columns not parsed from migrations: ${missingVal.join(", ")}. Apply migration 021 before live use.`,
      table: "cnf_projects",
    });
  }

  findings.push({
    id: "project-level-val",
    severity: "logic",
    title: "Project-level validation report fields",
    detail:
      "validation_report_no/status/target_date are stored on the canonical PO (Batch 1) and synced to the project head in the UI. Batch 2+ hides these fields.",
    table: "cnf_projects",
  });

  findings.push({
    id: "bmr-lock-logic",
    severity: "logic",
    title: "BMR lock depends on endorsement status (frontend)",
    detail:
      "When any PO has Val_Activity VAL/VER/CHAR, TSD BMR fields stay read-only until Endorsement Report Status is Approved or Not Applicable. This rule is enforced in the React form, not in the database.",
    table: "cnf_projects",
  });

  const feedback = tableByName(graph, "app_feedback");
  if (feedback && !feedback.columns.some((column) => column.name === "status")) {
    findings.push({
      id: "feedback-status-column",
      severity: "integrity",
      title: "app_feedback.status column not found",
      detail: "Apply migration 023 so administrators can mark feedback as Addressed or Not Addressed.",
      table: "app_feedback",
    });
  }

  if (selectedTable) {
    return findings.filter((finding) => !finding.table || finding.table === selectedTable);
  }

  return findings;
}
