# Current Handoff

Last Updated: `2026-06-30`
Version: `v71 notification refresh + 24h purge`
Branch: `main`

## Current Status

Notification drawer refresh hardened; low/medium/info notifications purged from UI and DB after 24 hours. Local verification passed.

## Recently Completed

- CNF Tracker list freeze pane: toolbar + table header stick below topbar on page scroll (`cnf-tracker.css`, `CnfTrackerListTable.tsx`); toolbar height measured via ResizeObserver; meeting-view top offset included.
- Notification refresh: batched deletes/upserts, optional-column upsert fallback, purge RPC best-effort, `removeExpiredStandardNotifications` deletes EXPIRED and stale OPEN standard rows.
- Drawer Refresh uses `refreshAllNotificationsWithRetry`; user-safe errors via `formatServiceError` + `console.error` diagnostics.
- Retention helpers: `isExpirableNotificationSeverity`, `removeExpiredStandardNotifications`, `shouldPersistNotificationOnRefresh`.
- Tests: `npm run test:notification-db` added to `test:fixes`.

## Active Work

- Objective: `Browser smoke: notification Refresh button and 24h purge on deployed app.`
- Progress: `Local typecheck, test:fixes, and build passed.`

## Verification

| Check | Status | Result |
|---|---|---|
| Type-check | PASSED | `npm run typecheck` |
| Build | PASSED | `npm run build` |
| Fix regression tests | PASSED | `npm run test:fixes` |
| GitHub Pages deploy | PENDING | Not run in this session |

## Next Action

`Deploy and verify notification Refresh in drawer; confirm medium/low/info age out after 24h while critical/high persist.`

## Decisions and Simplifications

- `ponytail:` Column resize uses native mouse events instead of adding `react-resizable`.
- Standard notifications marked `EXPIRED` in DB rather than deleted to preserve history.
- SMOKE CNF references filtered in UI only (not deleted from database).

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
