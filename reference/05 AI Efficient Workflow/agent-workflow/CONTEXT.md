# Project Context

Last Updated: `[YYYY-MM-DD]`

## Identity

- Project: `[PROJECT_NAME]`
- Repository: `[REPOSITORY_NAME_OR_URL]`
- Owner: `[PROJECT_OWNER]`
- Type: `[NEW_APPLICATION | MIGRATION | MODERNIZATION | ENHANCEMENT]`
- Environment: `[LOCAL | DEVELOPMENT | TEST | STAGING | PRODUCTION]`

## Purpose

`[Describe the project in one sentence.]`

## Users and Workflow

- Users: `[USER_GROUPS]`
- Workflow: `[START] → [CORE_STEPS] → [COMPLETION]`

## Technology

- Frontend: `[FRONTEND_STACK]`
- Backend: `[BACKEND_STACK]`
- Database: `SQLite first; Supabase only after validated SQLite schema and relationships are stable`
- Authentication: `[AUTHENTICATION]`
- Hosting: `[HOSTING]`
- UI: `[UI_FRAMEWORK]`

## Current Priorities

1. `[PRIORITY_1]`
2. `[PRIORITY_2]`
3. `[PRIORITY_3]`

## Critical Constraints

- `[CONSTRAINT_1]`
- `[CONSTRAINT_2]`
- `[CONSTRAINT_3]`

## Sources of Truth

| Area | Source |
|---|---|
| Agent routing | `AGENTS.md` |
| Simplicity rule | `agent-workflow/PONYTAIL.md` |
| Current status | `agent-workflow/HANDOFF.md` |
| Active work | `agent-workflow/PLAN.md` |
| Approved requirements | `agent-history/version-0-baseline.md` |
| Editable SQLite schema | `database/sqlite/` |
| Generated schema map | `sqlite-out/` |
| Human data map | `agent-workflow/DATA_MAP.md` |
| Deployment | `[DEPLOYMENT_WORKFLOW_PATH]` |

`database/sqlite/` is authoritative for initial schema design. `sqlite-out/` is generated and read-only. Supabase migrations must be derived only after the SQLite schema, constraints, and relationships have been locally validated and documented.

Keep this file limited to stable identity, stack, priorities, and constraints. Put implementation, schema, task, and history details in their dedicated files.
