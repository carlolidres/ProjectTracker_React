# Data Map

Last Updated: `[YYYY-MM-DD]`

## Purpose

Use this file for SQLite, migration, API data flow, reporting, integrity, authorization, and schema-navigation work.

This is a concise human map. It does not replace executable SQL.

## SQLite Sources

| Path | Role | Editing rule |
|---|---|---|
| `database/sqlite/` | Editable, version-controlled schema and migration SQL | Edit here |
| `workflow-app/database/schema.sql` | Editable, version-controlled SQLite schema for the reusable local workflow app | Edit here for workflow app data changes |
| `sqlite-out/` | Generated schema map used for fast navigation | Never edit manually |

The authoritative schema is the SQL under `database/sqlite/`. A runtime `.db` file and generated content under `sqlite-out/` are not schema sources of truth.

For the reusable local workflow application, the authoritative schema is `workflow-app/database/schema.sql`. Runtime workflow databases live under `workflow-app/data/` and are not schema sources of truth.

## SQLite-First Migration Rule

Build, validate, and stabilize the SQLite database before preparing any Supabase migration.

Required order:

1. Model the tables, primary keys, foreign keys, indexes, triggers, and required seed or fixture data in `database/sqlite/`.
2. Generate `sqlite-out/` and review the generated table and relationship map for unexpected drops, nullable fields, weak keys, missing indexes, or ambiguous relationships.
3. Run local SQLite validation against representative data, including foreign-key enforcement, uniqueness rules, required fields, cascade or restrict behavior, and the workflow queries the application depends on.
4. Record accepted entities, relationships, integrity rules, and validation results in this file and `HANDOFF.md`.
5. Create Supabase migration SQL only after the SQLite structure is stable and the SQLite-to-Supabase mapping is explicit.

Supabase is the migration target, not the place to discover the initial schema shape. If SQLite validation fails or relationships are still changing, pause Supabase migration work and fix the SQLite source first.

## Token-Efficient Database Reading Order

1. Read this file.
2. Read only the relevant file or section in `sqlite-out/` to identify tables, columns, indexes, triggers, and relationships.
3. Open only the corresponding SQL files in `database/sqlite/`.
4. Inspect data-access code only when application behavior is involved.
5. Read the approved baseline only when architecture, security, audit, retention, roles, workflow, or GxP requirements are affected.

Do not load the full schema, every migration, and every generated map unless a full-schema review is explicitly requested.

## Schema-Sync Rule

For every SQLite schema change:

1. Modify version-controlled SQL in `database/sqlite/`.
2. Run `[SQLITE_MAP_COMMAND]`.
3. Confirm that `sqlite-out/` was regenerated successfully.
4. Review generated changes for unexpected drops, type changes, relationship changes, missing indexes, or trigger changes.
5. Run applicable migration and integration checks.
6. Update this file when entities, relationships, workflow rules, or integrity controls change.
7. Record the sync result in `HANDOFF.md`.

A schema task is incomplete while editable SQL and generated maps are out of sync.

## Generated Map Inventory

List only high-value generated outputs.

| Generated path | Covers | Source SQL |
|---|---|---|
| `[SQLITE_OUT_FILE_OR_FOLDER]` | `[TABLES_OR_DOMAIN]` | `[DATABASE_SQLITE_SOURCE]` |

## Primary Entities

| Entity | Table | Purpose | Primary Key | Source SQL |
|---|---|---|---|---|
| Workflow record | `workflow_records` | One logical workflow item for baseline, planning, execution, review, deployment, or maintenance | `id` | `workflow-app/database/schema.sql` |
| Workflow version | `workflow_versions` | Immutable JSON payload version for a workflow record | `id` | `workflow-app/database/schema.sql` |
| Approval | `approvals` | User approval, rejection, revision, completion, deployment, or supersede decision | `id` | `workflow-app/database/schema.sql` |
| Audit event | `audit_events` | Append-only trace of workflow app actions | `id` | `workflow-app/database/schema.sql` |
| Baseline snapshot | `baseline_snapshots` | Approved baseline Markdown write/restore checkpoint | `id` | `workflow-app/database/schema.sql` |

## Core Relationships

```text
workflow_records
    ├── workflow_versions
    ├── comments
    ├── approvals
    ├── audit_events
    └── baseline_snapshots
```

## Workflow App Tables

### `workflow_records`

Purpose: Stores the current state of each workflow item.

Relationships:

- Current version points to `workflow_versions.id`.
- Child rows in comments, approvals, audit events, and baseline snapshots reference the record.

### `workflow_versions`

Purpose: Stores immutable version payloads as JSON so approved records are not silently overwritten.

Key rules:

- Updates and deletes are blocked by SQLite triggers.
- Editing an approved record creates a new draft version.

### `approvals`

Purpose: Records user decisions required before execution or deployment proceeds.

Key rules:

- Decisions use the approved workflow statuses.
- Project baseline approval writes `agent-history/version-0-baseline.md` with a backup.

### `audit_events`

Purpose: Stores append-only workflow traceability.

Key rules:

- Updates and deletes are blocked by SQLite triggers.
- Events record actor, timestamp, record, version, event type, and JSON details.

### `baseline_snapshots`

Purpose: Tracks approved baseline Markdown generations and restore points.

Key rules:

- Only one snapshot is active at a time.
- Restore creates a backup of the current baseline before replacing it.

## Key Tables

### `[PRIMARY_TABLE]`

Purpose: `[PURPOSE]`

Source SQL: `[DATABASE_SQLITE_PATH]`

| Field | Type | Rule |
|---|---|---|
| `[FIELD_1]` | `[TYPE]` | `[BUSINESS_OR_VALIDATION_RULE]` |
| `[FIELD_2]` | `[TYPE]` | `[BUSINESS_OR_VALIDATION_RULE]` |
| `[STATUS_FIELD]` | `[TYPE]` | `[ALLOWED_STATUSES]` |
| `[TARGET_DATE_FIELD]` | `[TYPE]` | `[DATE_OR_PRIORITY_RULE]` |

Relationships:

- `[RELATIONSHIP_1]`
- `[RELATIONSHIP_2]`

### `[USER_PROFILE_TABLE]`

Purpose: Stores application profile and authorization metadata linked to the authentication identity.

Key rules:

- Duplicate profiles are prohibited.
- Deactivated users must not retain active access.
- Authentication identities and application profiles must remain synchronized.

### `[ROLE_PERMISSION_TABLE]`

Purpose: Maps roles or users to modules, menus, and permitted actions.

Key rules:

- UI visibility does not replace trusted-layer authorization.
- Direct-route access must enforce the same permissions.
- Permission changes must be auditable.
- New modules must register permission keys centrally.

### `[AUDIT_LOG_TABLE]`

Purpose: Stores protected audit records for critical activities.

Required information:

- record identifier;
- module or table;
- action;
- changed field, when applicable;
- old and new values;
- responsible user;
- timestamp;
- reason or comment, when required.

Audit records must not contain passwords, tokens, private keys, or restricted secrets.

## Status and Workflow Map

| Stage | Allowed statuses | Owner | Exit condition |
|---|---|---|---|
| `[STAGE_1]` | `[STATUS_VALUES]` | `[ROLE_OR_TEAM]` | `[CONDITION]` |
| `[STAGE_2]` | `[STATUS_VALUES]` | `[ROLE_OR_TEAM]` | `[CONDITION]` |
| `[STAGE_3]` | `[STATUS_VALUES]` | `[ROLE_OR_TEAM]` | `[CONDITION]` |

## Date and Priority Rules

- Primary driver date: `[DRIVER_DATE_FIELD]`
- Overdue: `[OVERDUE_RULE]`
- Critical: `[CRITICAL_RULE]`
- High: `[HIGH_RULE]`
- Moderate: `[MODERATE_RULE]`
- Low: `[LOW_RULE]`
- Completed: `[COMPLETED_RULE]`

## Data Ownership

| Data area | Create | Edit | Approve | View |
|---|---|---|---|---|
| `[AREA_1]` | `[ROLE]` | `[ROLE]` | `[ROLE]` | `[ROLES]` |
| `[AREA_2]` | `[ROLE]` | `[ROLE]` | `[ROLE]` | `[ROLES]` |

## Migration Rules

- Migration source: validated SQLite schema in `database/sqlite/`
- Workflow app migration source: validated SQLite schema in `workflow-app/database/schema.sql`
- Supabase migration gate: do not create or apply Supabase migrations until SQLite table structures, constraints, indexes, and relationships pass local validation and are documented above.
- Mapping file: `[DATA_MAPPING_PATH]`
- Duplicate key: `[UNIQUE_OR_NATURAL_KEY]`
- Re-import behavior: `[SKIP | UPDATE | UPSERT | REJECT]`
- Invalid-row behavior: `[RULE]`
- Reconciliation method: `[METHOD]`
- Rollback method: `[METHOD]`

## Data Integrity Rules

- Use SQLite constraints for enforceable invariants.
- Use transactions for multi-step writes that must succeed or fail together.
- Use version-controlled migrations for schema changes.
- Validate required values before persistence and at trust boundaries.
- Preserve foreign-key integrity and enable foreign-key enforcement where required.
- Prefer soft deletion when regulated or historical records must remain traceable.
- Protect audit history from update and deletion.
- Do not expose privileged credentials or unrestricted database operations to an untrusted client.

## Update Rule

Update this file only when important entities, relationships, workflows, migration rules, or integrity controls change. Routine column additions that do not affect navigation or business meaning may be captured by regenerated `sqlite-out/` and the handoff alone.
