# Project Context

Last Updated: `2026-07-19`

## Identity

- Project: `Project Tracker`
- Repository: `ProjectTracker_React`
- Owner: `carlolidres`
- Type: `MIGRATION`
- Environment: `LOCAL / GitHub Pages production`

## Purpose

Project Tracker is a React + Supabase replacement for a working Google Apps Script and Google Sheets tracker for CNF projects, support activities, dashboards, notifications, audit trail, registry, and role-based workflows.

## Users and Workflow

- Users: `AM/BM/PL`, `PP`, `TSD`, `VAL`, `QC`, `QA`, `Admin`, `View`
- Workflow: `Login -> role-based navigation -> project/support/CNF work entry -> database views/dashboard -> audit/export/archive`

## Technology

- Frontend: `React 19`, `TypeScript`, `Vite`
- Routing: `React Router HashRouter`
- Backend/data: `Supabase PostgreSQL`, `Supabase Auth`, `RLS`
- Hosting: `GitHub Pages`
- UI: `Ant Design`, project CSS modules/global styles
- Exports/scripts: `xlsx`, `tsx`, local migration scripts
- Agent workflow app: local Python + SQLite app under `workflow-app/`

## Current Priorities

1. Preserve the v61 stable application behavior restored by v64.
2. Keep workflow continuity concise without rewriting historical handoffs.
3. Verify future fixes with `npm run typecheck`, `npm run build`, and targeted Supabase/browser checks when relevant.

## Critical Constraints

- Do not modify `agent-history/version-0-baseline.md` or historical version files without explicit approval.
- Do not approve or restore workflow-app baseline records unless the owner explicitly intends to revise the approved baseline.
- Do not expose Supabase service role keys or private credentials.
- Preserve HashRouter and `VITE_BASE_PATH=/ProjectTracker_React/` for GitHub Pages.
- Treat the Google Apps Script app as the functional reference, not as the target architecture.
- All critical mutations must preserve readable audit logging.
- Supabase RLS and trusted data rules must back up UI role restrictions.

## Sources of Truth

| Area | Source |
|---|---|
| Agent routing | `AGENTS.md` |
| Current status | `agent-workflow/HANDOFF.md` |
| Active work | `agent-workflow/PLAN.md` |
| Simplicity rule | `agent-workflow/PONYTAIL.md` |
| Code navigation | `agent-workflow/CODEMAP.md` |
| Data and migration navigation | `agent-workflow/DATA_MAP.md` |
| Workflow app | `workflow-app/README.md` |
| Approved requirements | `agent-history/version-0-baseline.md` |
| Migration plan | `.cursor/plan/project_tracker_migration_36f9948d.plan.md` |
| Supabase schema | `supabase/migrations/` |
| Deployment | `.github/workflows/deploy.yml` |
| Latest historical state | `agent-history/version-93-handoff.md` |

Keep this file limited to stable identity, stack, priorities, constraints, and source-of-truth paths.
