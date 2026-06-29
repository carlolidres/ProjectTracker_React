# Current Handoff

Last Updated: `2026-06-29`
Version: `v70 cnf-tracker list modal toolbar retention`
Branch: `main`

## Current Status

CNF Tracker list-first UI with detail modal, toolbar cleanup, 7-row paging, smoke-entry filter, and notification retention (migration 031) ready for deploy.

## Recently Completed

- CNF Tracker: list table (21 columns), Load opens `CnfTrackerDetailModal`, toolbar search left / Columns+Retry right, 7 rows per page, dynamic table height, SMOKE test refs filtered.
- Notifications: 24h expiration for standard severities; High/Critical/Logic retained until dismissed; migration `031_notification_retention.sql`.
- Projects Form: save success reset, duplicate-submit guard, `project-data-changed` event for database refresh.

## Active Work

- Objective: `Deploy v70 to GitHub Pages and apply migration 031 to Supabase.`
- Progress: `Local verification passed; commit/push/deploy in progress.`

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Low | pg_cron schedule for notification purge optional | Relies on frontend/RPC fallback until scheduled | Enable pg_cron when available |

## Verification

| Check | Status | Result |
|---|---|---|
| Type-check | PASSED | `npm run typecheck` |
| Build | PASSED | `npm run build` |
| Notification retention tests | PASSED | `npm run test:notifications` |
| Supabase migration 031 | PASSED | Applied remotely via MCP (`notification_retention`) |
| GitHub Pages deploy | PENDING | Triggered by push `9be549f` |

## Next Action

`Browser smoke: CNF Tracker list/modal, notification dismiss/expire, project save reset on GitHub Pages.`

## Decisions and Simplifications

- `ponytail:` Column resize uses native mouse events instead of adding `react-resizable`.
- Standard notifications marked `EXPIRED` in DB rather than deleted to preserve history.
- SMOKE CNF references filtered in UI only (not deleted from database).

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
