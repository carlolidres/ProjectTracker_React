# Current Handoff

Last Updated: `2026-07-18`
Version: `v90 Dashboard workspace Phase A + collapsed shell hover rail`
Branch: `main`
Commit: `de385ef`
App version: `0.90.0`

## Current Status

**Deployed** to GitHub Pages. Actions run [29643088651](https://github.com/carlolidres/ProjectTracker_React/actions/runs/29643088651) success. Release: https://github.com/carlolidres/ProjectTracker_React/releases/tag/v0.90.0. About drawer should show `v0.90.0 (de385ef)`. Owner browser-smoke for workspace strip/drawer and hover rail still outstanding.

## Recently Completed

- Dashboard workspace Phase A behind `VITE_FEATURE_DASHBOARD_WORKSPACE` (default ON)
- Rollback: `agent-workflow/DASHBOARD_WORKSPACE_ROLLBACK.md`
- Collapsed chrome persists across routes; hover FAB → icon rail; click → full expand
- Project sticky header + role tabs single stack
- Released `v0.90.0` @ `de385ef`

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run typecheck` | PASSED | clean |
| `npm run build` | PASSED | Vite OK |
| `npm run test:dashboard-drilldown` | PASSED | clean |
| Browser smoke | NOT_RUN | workspace + hover rail |
| GitHub Pages deploy | PASSED | run 29643088651 |
| GitHub Release | PASSED | [v0.90.0](https://github.com/carlolidres/ProjectTracker_React/releases/tag/v0.90.0) |

## Next Action

Owner browser-smoke dashboard workspace + collapsed hover rail. Optional Phase B later. Menu-matrix migration `20260716140000` still apply if not yet on target.

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
