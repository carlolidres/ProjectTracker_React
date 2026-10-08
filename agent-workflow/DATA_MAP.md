# Data Map

Last Updated: `2026-08-31`

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
| User profile | `profiles` | Application identity, display name, role, approval/access state | Linked to Supabase Auth user ID. Role enum includes `rnd` (RnD). |
| Project record | `cnf_projects` | Core Project Tracker PO-line records and project lifecycle fields | Preserves migration-friendly field structure and hierarchy IDs. |
| CNF tracker record | `cnf_tracker_records` | CNF tracker workflow records | Added after original migration phases; verify v61 behavior before changing. |
| Project/CNF link | `project_cnf_links` | Relationship between project and CNF tracker records | v64 noted delete permissions issue during seed cleanup. |
| Support activity | `support_activities` | Separate smaller operational activity tracking | TSD/RnD/Non-Process; optional CNF + endorsement links by record ID. |
| Endorsement tracker | `endorsement_tracker_records` / `endorsement_tracker_items` | Endorsement workflow header + implementation item rows | Source-linked by unique `(source_type, source_record_id)`; sync_version concurrency. |
| Reusable options | `reusable_options` | Editable dropdown suggestions (`type_of_validation`, status fields, `support_line` / `support_material` / `support_principal` / `support_product`, `cnf_initiator`, …) | Non-view create; admin soft-remove; does not rewrite historical values. |
| Menu permission overrides | `menu_permission_overrides` | Admin overrides for menu View/Create/Edit/Export | Defaults in `src/lib/menuPermissions.ts`; PK `(role, menu_key)`. |
| Project Management tasks | `project_management_tasks` / assignees / comments | Monday.com-style tasks on live portfolio items | Does not duplicate `cnf_projects` or `support_activities`. |
| Project Management overrides | `project_management_phase_overrides` | Documented execution/report gate exceptions | Unique `(source_type, source_id, gate)`; insert limited to admin/AM/VAL. |
| AI Assistant conversations | `ai_conversations` / `ai_messages` | Per-user chat history for the AI Assistant page | RLS owner-only (`user_id = auth.uid()` + `is_active_user()`). |
| CNF change card summary | Edge Function `summarize-change` | Shortens CNF `change_description` text for Project Management cards | Display-only; source of truth stays `cnf_entries_json` / CNF Tracker. Secret `OPENAI_API_KEY` (never `VITE_`). Local first-sentence fallback if the secret is missing. |
| AI Assistant chat | Edge Function `ai-assistant-chat` | Grounded answers from authorized `cnf_projects` / `support_activities` / PM tasks / comments | JWT required. Planner runs controlled tools before OpenAI. Same `OPENAI_API_KEY` secret. Citations are verified internal paths only. No document/RAG index yet. |
| Registry item | `registry` | Dropdown and lookup values | Admin-managed; also used by creatable selects (`activity_type`, `project_owner`, `client_name`, `uom`, `business_unit`, `department`, …). Soft-remove via Inactive status; historical project values unchanged. |
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
        -> endorsement_tracker_records (source process_validation_project)
        -> project_management_tasks / phase_overrides
        -> audit_logs
        -> notifications
     -> support_activities
        -> optional cnf_tracker_records (cnf_tracker_record_id)
        -> endorsement_tracker_records (source non_process_support_activity)
        -> project_management_tasks / phase_overrides
        -> audit_logs
     -> endorsement_tracker_records
        -> endorsement_tracker_items
        -> mapped sync to project/support
```

## Endorsement sync ownership

Mapped bidirectional fields only:

- endorsement number/status
- CNF relation + display
- project relation
- product name / product code
- non-process description

Loop prevention uses `last_sync_source` echo suppression plus `sync_version` stale rejection.
No automatic backfill of historical In-process project endorsements; create/link on next qualifying save.

Blank or N/A endorsement number does **not** stub-create a tracker row; reopen an existing source-linked tracker when present, otherwise open New.

## Optional text N/A convention

Optional free-text and select fields use:

| Layer | Behavior |
|---|---|
| Form state | Empty / missing stored as `""` |
| UI guide | Gray italic `N/A` via `NaClearingInput` / `NaClearingSelect` / `CreatableNaSelect` (`.na-guide`) |
| Focus | Clears the guide so the user types a real value |
| Persist | `normalizeOptionalNaForSubmit` writes `N/A` when still empty (`src/lib/naField.ts`) |
| Load | `toEditableNaField` maps DB `N/A` / `NA` back to `""` for editing |

Do not treat filter/search boxes, Kind, or date pickers as N/A sentinels.

Helpers: `src/lib/naField.ts`, `src/lib/utils.ts` (`isMissingValue`), `src/components/common/na-clearing-input.tsx`.

## Menu permission matrix

Layers (AND): Auth/profile → menu matrix (View/Create/Edit/Export) → field-group `can*` helpers → RLS.

Default menus for new / non-admin users (View on):

1. Dashboard  
2. My work (`project_management`)  
3. Ask AI (header control, `ai_assistant`)  
4. Projects · Entry  
5. Projects · Spreadsheet  
6. Support  
7. Trackers · CNF  
8. Trackers · Endorsement  
9. Lessons learned  

Sidebar groups those into Dashboard, My work, Projects, Support, Trackers, Lessons learned. Ask AI is a header button, not a sidebar row. Audit trail, Archives, Registry, Users, Access, and Schema sit under an Admin group (admin or override).

Menu keys are unchanged. Hiding a child in Access Matrix hides that link; an empty group is omitted.

- Code defaults: `src/lib/menuPermissions.ts`
- Overrides table: `menu_permission_overrides` (migrations `20260716140000_menu_permission_overrides`, `20260830120000_project_management_menu_key`)
- Kill-switch: `VITE_FEATURE_MENU_MATRIX` (default on; `false` → legacy `ROUTE_ACCESS`)
- Rollback: `agent-workflow/MENU_MATRIX_ROLLBACK.md`

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
- `tsd_remarks` is TSD long-text remarks (separate from AM CNF `remarks`); migration `20260718140000_cnf_projects_tsd_remarks`.
- `qc_remarks` is QC long-text remarks (separate from AM/TSD remarks); migration `20260718141000_cnf_projects_qc_remarks`.
- Projects Database spreadsheet omits `textarea` long-text columns (`change_description`, `remarks`, `risk_control`, `tsd_remarks`, `qc_remarks`); edit those on Project Entry.
- Projects Database blank draft rows are client-only (`__draft__*` record/project ids via `src/lib/projectsDatabaseDraftRows.ts`). They are not written to Supabase until Save.
- On Save: non-blank valid draft rows call `createProjectsFromSpreadsheetDrafts` → `saveProject` (assigns unique `PROJ-YYYY-NNN` via `getNextProjectId`); existing-row edits use `patchProjectFromSpreadsheetEdits` → `updateProject`. Completely blank drafts are ignored; cell validation errors block the whole Save.
- Draft create requires menu Create on Projects Entry and Edit on Projects Database; role/registry rules still apply in the service layer. Audit CREATE entries are written per inserted PO line as with other project creates.

Projects Database spreadsheet path:

| Step | Module | Notes |
|---|---|---|
| Edit existing cell | `ProjectsDatabaseGrid` → dirty `SpreadsheetCellEdit` | Validated by `validateSpreadsheetCellValue` |
| Fill blank row | Local draft `ProjectRow` | Viewport-fill + trailing blank reconcile |
| Save existing | `patchProjectFromSpreadsheetEdits` | Date-adjustment confirm when needed |
| Save new rows | `createProjectsFromSpreadsheetDrafts` | One hierarchy / project per filled draft |

### `cnf_tracker_records`

Purpose: Stores CNF tracker records and associated workflow state.

Key rules:

- Preserve v61 draft persistence and navigation behavior.
- Header fields include `cnf_details`, `product_name`, `client_name`, `qrmr_no`, `unique_batch_no`, `change_description` (migrations `033`/`034`).
- `cnf_classification` distinguishes process vs non-process CNF work (migration `20260714194000_cnf_tracker_classification`).
- Active `cnf_reference` uniqueness is enforced with normalized whitespace (DB unique index + service checks).
- Link to projects through `project_cnf_tracker_links` by `record_id` (stable IDs); project CNF text remains a historical snapshot.
- When linked, Project form is source of truth for Product/Client/QRMR/Description; save syncs tracker (Project → Tracker only).
- Do not reintroduce v62/v63 seed-import instability without a new approved plan.

### `project_cnf_tracker_links`

Purpose: Junction between `cnf_tracker_records.record_id` and `cnf_projects.project_id`.

Key rules:

- Unique (`cnf_tracker_record_id`, `project_id`).
- Backfilled from matching `cnf_reference` without rewriting project CNF text.
- Distinct from mother/child `project_cnf_links` copy relationships.

### `support_activities`

Purpose: Tracks smaller operational activities outside the full CNF lifecycle, including TSD, RnD, and Non-Process validation support work.

Key rules:

- Support TSD/RnD/Non-Process field sets; preserve hidden values when Activity Type changes.
- Optional CNF linkage uses `cnf_tracker_record_id` (stable ID) or explicit `not_applicable` state — never a fake CNF row.
- Non-Process document fields (protocol/report/endorsement number+status, type of validation) and shared title use the optional N/A convention above.
- Qualifying endorsement status opens/links Endorsement Tracker; blank/N/A number does not stub-create.
- Support search/filter/export workflows.
- Write audit entries for create/update/archive/status changes.
- Schema additions: migrations `20260714110110_*`, `20260714123000_support_activity_type`, `20260714216000_*`, `20260714220000_*`, `20260714221000_*`.

### Project Management portfolio (live view)

Purpose: Card-first browse of active `cnf_projects` and `support_activities` without duplicating source rows, plus optional user tasks for execution tracking. `/project-management` is this portfolio. The independent board is `#/project-boards`.

Key rules:

- Route `/project-management`; menu key `project_management` (create/edit for operational roles and admin; export N/A).
- Process cards aggregate PO lines by `project_id`; support cards use `activity_id`.
- Display groups Ongoing / Completed / Cancelled are derived from `final_status` or support `status`. They do not replace source fields.
- Computed phases (protocol → execution → report/endorsement → closure) come from live source fields. Yellow gate banners stay informational. User tasks can be created and VAL assigned in any phase. Source execution/report completeness and documented overrides still drive the official workflow stepper.
- User tasks live in `project_management_tasks` (+ assignees, comments, phase overrides). Source protocol/report fields remain on the project/support row.
- Detail workspace links open Project Entry or Support Activities with `return_to=/project-management`.
- Menu CHECK expansion: migration `20260830120000_project_management_menu_key` (local only; remote has no `menu_permission_overrides` table). Workflow tables applied remotely as `project_management_workflow`. Per-user assignee privilege `profiles.pm_task_eligible` applied remotely as `pm_task_eligible`.
- Admin and VAL can always assign. VAL users are always assignee options at every project phase. Other roles need the User Management **PM tasks** privilege plus menu create.
- Active users may read other active profiles for assignee pickers (`Active users can read active directory profiles`).
- Audit module name: `Project Management`. Assignee inbox is My Tasks (the existing FG `notifications` table is not per-user).

### Independent Project Management board

Purpose: Monday-style boards opened from the Project board sidebar item as a wide popup over the current page. The heading follows the selected project name. `/project-management` stays the CNF and support portfolio. `project_management_tasks` is unchanged and still belongs to those source records.

Key rules:

- Hierarchy: `pm_workspaces` → `pm_projects` → `pm_groups` → `pm_board_tasks`.
- `pm_projects.source_kind` is `spreadsheet` or `support`. `source_id` is the spreadsheet `project_id` or support `activity_id`. `source_record_id` is the spreadsheet line when one was chosen. Board status and date edits write the matching source fields.
- Workspace roles are Owner, Admin, and Member. Project roles are Owner, Editor, and Viewer.
- Visibility `workspace` opens the project to every workspace member. Visibility `invited` opens it only to `pm_project_members`. Workspace membership does not grant access to a private project.
- App role does not bypass a private project.
- Task status (`Not Started`, `Working on it`, `Done`, `Stuck`) is separate from the group name. A due date cannot be earlier than the start date. A group can be deleted only when it has no tasks.
- `pm_task_dependencies` stores predecessor task id, relationship (`FS`, `SS`, `FF`, `SF`), and lead/lag days. `pm_projects.schedule_mode` is `flexible`, `strict`, or `none`. `working_days` is Monday=1 through Sunday=7. `holidays` are dates skipped by scheduling. Blank task dates are not filled in.
- Project role `Commenter` can post updates and files. Owners and Editors change tasks and dates. Viewers can read.
- `pm_task_updates` stores the task conversation. `pm_task_files` plus the private `pm-task-files` bucket stores attachments. Activity for a task is the existing `audit_logs` rows for that task id.
- Migration `20261007213000_pm_workspaces` must be applied before the board can save. Creation uses `create_pm_workspace` and `create_pm_project`. Dependencies, updates, and files need `20261008193000_pm_board_dependencies`.
- Last opened workspace and project stay in `localStorage` key `project-tracker:pm-board:last` and are rechecked against access on restore.

### `ai_conversations` / `ai_messages`

Purpose: Per-user AI Assistant history. The Edge Function plans controlled tools (projects, tasks, comments, protocol/report readiness), retrieves with the caller's JWT/RLS, then asks OpenAI to answer only from those facts. Secret `OPENAI_API_KEY` (never `VITE_`). Citations must be verified internal paths. Uploaded protocol/report files are not indexed.

### `endorsement_tracker_records` / `endorsement_tracker_items`

Purpose: Dedicated endorsement workflow with implementation item rows.

Key rules:

- Source types: `process_validation_project`, `non_process_support_activity`, `independent`.
- Unique active source link prevents duplicate trackers on repeated saves.
- Ensure-by-number and ensure-by-source RPCs skip stub creation when the endorsement number is blank/N/A.
- Item soft-delete never archives the header.
- Bidirectional sync limited to approved mapped fields; `sync_version` rejects stale writes.
- Schema: migration `20260714110110_endorsement_tracker_and_support_enhancements` (+ follow-ups `20260714220000_*`, `20260714221000_*`).

### `reusable_options`

Purpose: User-managed dropdown suggestions for Support/Endorsement/CNF creatable fields.

Key rules:

- Categories include `type_of_validation`, `protocol_status`, `report_status`, `endorsement_status`, `support_line`, `support_material`, `support_principal`, `support_product`, `cnf_initiator`, `implemented_by` (and related endorsement categories).
- Soft-remove hides the option; historical record values are not rewritten.
- Non-view roles may create; admin soft-remove via `canRemoveReusableOptions`.

### `user_role` enum

Purpose: Trusted application roles on `profiles.role` / `requested_role`.

Current values: `am_bm_pl`, `qa`, `pp`, `tsd`, `val`, `qc`, `rnd`, `admin`, `view`.

- `rnd` (label **RnD**): Support-focused menu defaults; process project field ownership unchanged.
- Additions require a committed `ALTER TYPE ... ADD VALUE` migration before helpers may reference the new label (`20260719120000_rnd_role_enum`, `20260719120100_rnd_role_helpers`).

### `menu_permission_overrides`

Purpose: Admin overrides for role × menu View/Create/Edit/Export.

Key rules:

- Defaults live in application code; empty table means all roles use defaults.
- RLS: authenticated SELECT; admin-only write.
- Changes must be audit-logged (module Access Matrix).
- N/A actions (e.g. Dashboard Create) are forced off in code even if an override sets them.

### `registry`

Purpose: Central lookup values for dropdowns and workflow options.

Key rules:

- Admin Registry page mutations; creatable form/grid editors may insert Active values for configured types (AM editors for project creatable fields).
- Soft-remove sets `status = Inactive`; does not rewrite project/support rows.
- Case-insensitive duplicate prevention on create.
- Defaults from `DEFAULT_REGISTRY` apply only when a type has no Active rows.
- Creatable project types: `activity_type`, `project_owner`, `client_name`, `uom`, `business_unit` (plus existing fixed selects).

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
- Dashboard worklist: process items from `getProjectPriority` / Focus Group; support items sorted by Planning Schedule → Target Date → severity (`src/lib/worklistSort.ts`). Modal UI: `WorklistModal` (role scope default, All Worklist toggle, global search).

## Computed dashboard worklists

| Payload | Source | Notes |
|---|---|---|
| `DashboardData.worklist` | Open/priority project rows | Focus Group + severity; used by Due Soon and Process tab |
| `DashboardData.supportWorklist` | Open support activities | Severity from target/planning dates; Support tab |

## Data Ownership

| Data area | Create/Edit | View | Admin |
|---|---|---|---|
| AM/BM/PL fields | AM/BM/PL role and admin | Authenticated permitted roles | Full access |
| PP fields | PP role and admin | Authenticated permitted roles | Full access |
| TSD fields | TSD role and admin | Authenticated permitted roles | Full access |
| VAL fields | VAL role and admin | Authenticated permitted roles | Full access |
| QC fields | QC role and admin | Authenticated permitted roles | Full access |
| QA fields | QA role and admin | Authenticated permitted roles | Full access |
| RnD role | Support Activities (menu defaults); no process field ownership | Authenticated permitted roles | Full access |
| Registry | Admin page; creatable editors for configured types | Authenticated permitted roles | Full access |
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

## Application version and release control

Package identity: `package.json` → Vite define → About drawer (`src/components/layout/app-version-button.tsx`, `src/lib/appVersion.ts`).

Deploy identity: GitHub Actions `.github/workflows/deploy.yml` sets `VITE_APP_GIT_SHA` from `github.sha` and publishes to GitHub Pages (`github-pages` environment).

| Artifact | Path |
|---|---|
| Release checklist | `agent-workflow/RELEASE_CHECKLIST.md` |
| Release notes (current) | `agent-workflow/releases/v0.94.0-RELEASE_NOTES.md` |
| Versioned AVD / handoff | `agent-history/version-94-handoff.md` |
| About version history | `src/lib/appVersionHistory.ts` |
| Menu matrix rollback | `agent-workflow/MENU_MATRIX_ROLLBACK.md` |
| Dashboard workspace rollback | `agent-workflow/DASHBOARD_WORKSPACE_ROLLBACK.md` |

### Shell UI persistence (non-database)

| Preference | Storage | Default | Notes |
|---|---|---|---|
| Sidebar / topbar collapse | In-memory only (`sidebarStateMemory`) | `expanded` | Starts expanded on load, login, and session clear. Collapse survives AppShell remounts during the SPA session only; a refresh returns to expanded. Cleared via `resetSidebarStateForSessionClear()` from `clearAppSessionState()`. Topbar hides with sidebar on desktop; sticky headers use `--app-sticky-top` / `--app-sticky-top-pad`. |
| App Back/Forward history | In-memory (`NavigationHistoryProvider`) + view-state slots | empty on load | Cleared with session cleanup. Restores scroll + priority UI (Worklist, Project Entry chrome, Projects DB focus/full view, Support filters, CNF list tab/modal). Not persisted to Supabase. |
| Projects DB Full View | `localStorage` `project-tracker:projects-db:full-view` | on | Column widths / row height also local-only. |

### Current release baseline

| Field | Value |
|---|---|
| Version | `0.94.0` (tag `v0.94.0`) |
| Deploy SHA | `03597e0` |
| Deployed | 2026-07-20 — Actions [29741024111](https://github.com/carlolidres/ProjectTracker_React/actions/runs/29741024111) success |
| Prior production | `0.93.0` @ `e102a0d` |
| Change class | Minor (Projects DB draft-row create, nav history, status icons, worklist UX) |
| Environment | GitHub Pages |
| Migrations | none |
| Rollback | Redeploy `e102a0d` / `0.93.0` |

Do not treat a local About label as released until Actions succeeds and package+SHA match the GitHub Release.

## Verification Commands

Use the smallest relevant set:

```text
npm run typecheck
npm run build
npm run test:menu-permissions
npm run test:dashboard-drilldown
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
