# Current Handoff

Last Updated: `2026-07-18`
Version: `v90 Dashboard workspace Phase A + collapsed shell hover rail`
Branch: `main`
Commit: _(pending release commit)_
App version: `0.90.0`

## Current Status

Preparing **v0.90.0** release: dashboard workspace Phase A (flagged), collapsed shell persistence + hover icon rail, project sticky stack. Prior production: `0.89.0` @ `82bc127`.

## Recently Completed

- Dashboard workspace R1–R3 behind `VITE_FEATURE_DASHBOARD_WORKSPACE` (default ON)
- Rollback doc `DASHBOARD_WORKSPACE_ROLLBACK.md`
- Collapsed chrome persists across AppShell remounts
- Hover FAB → compact nav rail; click FAB → full expand
- Project sticky header + role tabs single stack (no overlap)

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run typecheck` | PASSED | clean |
| `npm run build` | PASSED | Vite OK |
| `npm run test:dashboard-drilldown` | PASSED | clean |
| Browser smoke | NOT_RUN | |
| GitHub Pages | PENDING | after push |

## Next Action

Commit + push `0.90.0`; confirm Actions; publish GitHub Release `v0.90.0`.

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
