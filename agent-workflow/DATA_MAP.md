# Data Map

Last Updated: `2026-06-22`

## Purpose

Use this file for Supabase, migration, API data flow, reporting, authorization, RLS, audit, and data-integrity work.

This is a concise human map. It does not replace executable migrations or generated TypeScript types.

## Supabase Sources

| Path | Role | Editing rule |
|---|---|---|
| `supabase/migrations/` | Version-controlled schema, RLS, grants, and data model migrations | Edit via new migrations |
| `src/types/database.ts` | Supabase database TypeScript types | Keep aligned with schema |
| `scripts/migration-map.md` | Google Sheets to Supabase migration mapping | Update when migration rules change |
| `scripts/migrate-sheets-to-supabase.ts` | Local import/validate pipeline | Use service role locally only; never in frontend |
| `src/services/` | Application data access layer | Use for Supabase queries and mutations |
| `workflow-app/database/schema.sql` | Local workflow-app SQLite schema | Validate with workflow-app scripts; not part of product Supabase schema |

There is no authoritative SQLite schema for Project Tracker product data. The only SQLite schema now present is the local `workflow-app/` metadata store for workflow records, approvals, comments, snapshots, and audit events.

## Token-Efficient Data Reading Order

1. Read this file.
2. Read only the relevant migration file(s) in `supabase/migrations/`.
3. Read the relevant service file in `src/services/`.
4. Read the relevant types in `src/types/`.
5. Read baseline only when architecture, workflow, security, audit, retention, roles, RLS, or GxP requirements are affected.

Do not load every migration and every service file for a one-table or one-query issue.

For workflow-app-only tasks, read `workflow-app/README.md`, `workflow-app/server.py`, and the specific workflow-app script or static file being changed.

## Schema Change Rule

For every Supabase schema or policy change:

1. Add a new migration in `supabase/migrations/`.
2. Update `src/types/database.ts` or related domain types if required.
3. Update affected service queries and mappers.
4. Run applicable Supabase verification or smoke checks.
5. Record migration status, applied environment, rollback strategy, and verification in `HANDOFF.md`.
6. Create a versioned handoff for meaningful schema, RLS, migration, deployment, or rollback checkpoints.

A schema task is incomplete while code, types, migration records, and verification notes disagree.

## Primary Entities

| Entity | Main table | Purpose | Key notes |
|---|---|---|---|
| User profile | `profiles` | Application identity, display name, role, approval/access state | Linked to Supabase Auth user ID. |
| Project record | `cnf_projects` | Core Project Tracker PO-line records and project lifecycle fields | Preserves migration-friendly field structure and hierarchy IDs. |
| CNF tracker record | `cnf_tracker_records` | CNF tracker workflow records | Added after original migration phases; verify v61 behavior before changing. |
| Project/CNF link | `project_cnf_links` | Relationship between project and CNF tracker records | v64 noted delete permissions issue during seed cleanup. |
| Support activity | `support_activities` | Separate smaller operational activity tracking | TSD/RnD and department support workflows. |
| Registry item | `registry` | Dropdown and lookup values | Admin-managed; used across forms. |
| Notification | `notifications` / `pt_notifications` | System reminders and alerts | FG Month and project status driven. |
| Audit log | `audit_logs` | Immutable critical activity history | Must remain readable and protected. |
| Feedback | `app_feedback` | In-app feedback capture and admin handling | Subject to TTL/status migrations. |
| Lesson learned | `lessons_learned` | Lessons learned workflow | Added after early migration phases. |
| Password reset | `password_reset_requests` + `admin_messages` + Edge Function `admin-approve-password-reset` | User requests reset; admin approves; 16-char temp password emailed via Gmail secrets; `profiles.must_change_password` gates app access | Never put Gmail/app passwords or service role keys in frontend. |

## Core Relationship Shape

```text
Supabase Auth user
  -> profiles.role / approval state
     -> role-based route and sidebar access
     -> cnf_projects
        -> batch_instance_id
        -> mo_instance_id
        -> po_instance_id
        -> project_cnf_links -> cnf_tracker_records
        -> audit_logs
        -> notifications
     -> support_activities
        -> audit_logs
```

## Key Tables

### `profiles`

Purpose: Stores application profile and authorization metadata linked to Supabase Auth.

Key rules:

- Roles must align with UI route guards and RLS.
- Deactivated or unapproved users must not retain active access.
- Admin user-management changes must be auditable where applicable.

### `cnf_projects`

Purpose: Stores the migrated Project Tracker lifecycle data at the PO-line level, including project, batch, MO, PO, CNF, planning, TSD, validation, QC, QA, and final status fields.

Key rules:

- Preserve stable IDs for project, batch, MO, and PO hierarchy.
- Maintain duplicate review behavior where required by legacy workflow.
- Preserve draft persistence behavior restored in v61/v64.
- Archive rather than destructive-delete where historical traceability matters.
- Write audit entries for meaningful create/update/archive/status changes.

### `cnf_tracker_records`

Purpose: Stores CNF tracker records and associated workflow state.

Key rules:

- Preserve v61 draft persistence and navigation behavior.
- Link to project records through controlled relationship logic.
- Do not reintroduce v62/v63 seed-import instability without a new approved plan.

### `support_activities`

Purpose: Tracks smaller operational activities outside the full CNF lifecycle.

Key rules:

- Support TSD/RnD-specific field sets.
- Support search/filter/export workflows.
- Write audit entries for create/update/archive/status changes.

### `registry`

Purpose: Central lookup values for dropdowns and workflow options.

Key rules:

- Admin-only mutation.
- Read access must support forms and dashboards.
- Registry changes can affect user input choices and should be verified in forms.

### `audit_logs`

Purpose: Protected audit record for critical actions.

Required information:

- table/module;
- affected record ID;
- action;
- old and new values when applicable;
- responsible user ID/email;
- timestamp;
- readable field labels where practical.

Audit records must not contain passwords, tokens, private keys, service-role keys, or unrestricted credentials.

## Status and Workflow Map

| Area | Typical statuses / controls | Owner |
|---|---|---|
| CNF status | `CNF Creation`, `Routing`, `Client Approval`, `Approved` | AM/BM/PL and workflow owners |
| Validation report | `In-process`, `Routing`, `Client Approval`, `Approved` | VAL |
| Final status | `OPEN`, `CLOSED`, `CANCELLED`, `Others` | PP / Admin |
| BMR and document readiness | submission, target, activation statuses and dates | TSD / QA |
| QC readiness | AR availability and related fields | QC |
| Support activity | activity-specific target/planning/status values | TSD / RnD / assigned department |

Use `src/lib/constants.ts`, registry values, and domain services for current option sets before hard-coding statuses.

## Date and Priority Rules

- Primary notification driver: `fg_month` and related target dates.
- Overdue and urgency logic: check `src/lib/fgUrgency.ts`, `src/lib/fgDeliveryMetrics.ts`, dashboard service logic, and notification service logic.
- Date adjustment and lock behavior: check `src/lib/dateAdjustment.ts`, `src/lib/fgMonthLock.ts`, and `src/app/date-adjustment-provider.tsx`.

## Data Ownership

| Data area | Create/Edit | View | Admin |
|---|---|---|---|
| AM/BM/PL fields | AM/BM/PL role and admin | Authenticated permitted roles | Full access |
| PP fields | PP role and admin | Authenticated permitted roles | Full access |
| TSD fields | TSD role and admin | Authenticated permitted roles | Full access |
| VAL fields | VAL role and admin | Authenticated permitted roles | Full access |
| QC fields | QC role and admin | Authenticated permitted roles | Full access |
| QA fields | QA role and admin | Authenticated permitted roles | Full access |
| Registry | Admin | Authenticated permitted roles | Full access |
| Audit logs | System/service writes; admin reads | Role-dependent | Protected from casual mutation |

Confirm current RLS migrations before changing trusted access behavior.

## Migration Rules

- Migration source: legacy Google Apps Script and Sheets exports.
- Mapping file: `scripts/migration-map.md`.
- Import script: `scripts/migrate-sheets-to-supabase.ts`.
- Frontend-safe env only: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BASE_PATH`.
- Service role use: local scripts or trusted backend only, never frontend or committed Markdown.
- Re-import behavior: do not assume; check current migration script and v64 rollback context before running.
- Seed-import work from v62/v63 was rolled back from `main`; re-plan separately before reintroducing.

## Data Integrity Rules

- Use Supabase constraints and RLS for enforceable invariants.
- Use service-layer validation and type mapping before persistence.
- Preserve foreign-key integrity and stable relationship IDs.
- Prefer soft deletion/archive for traceable records.
- Protect audit history from update/deletion except approved administrative cleanup.
- Avoid exposing privileged credentials or unrestricted database operations to the browser.
- Every critical mutation should have an audit strategy.
- Keep workflow-app runtime SQLite files ignored; do not commit `workflow-app/data/workflow.sqlite3`.
- Do not use workflow-app baseline approval or restore features to rewrite `agent-history/version-0-baseline.md` without explicit owner approval.

## Verification Commands

Use the smallest relevant set:

```text
npm run typecheck
npm run build
npm run verify:supabase
npm run smoke:supabase
npm run migrate:validate
npm run migrate:dry-run
python workflow-app/scripts/validate_schema.py
python workflow-app/scripts/smoke_test.py
```

Network/Supabase commands may require explicit approval in sandboxed environments.

## Update Rule

Update this file only when important entities, relationships, workflows, migration rules, authorization rules, or data-integrity controls change. Routine UI or copy edits usually do not belong here.
