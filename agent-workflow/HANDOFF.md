# Current Handoff

Last Updated: `2026-07-18`
Version: `v89 Menu permission matrix + dashboard hub + shell/CNF UX`
Branch: `main`
Commit: `82bc127`
App version: `0.89.0`

## Current Status

**Deployed** to GitHub Pages. Actions run [29638972620](https://github.com/carlolidres/ProjectTracker_React/actions/runs/29638972620) success. Release: https://github.com/carlolidres/ProjectTracker_React/releases/tag/v0.89.0. About drawer should show `v0.89.0 (82bc127)`. Apply Supabase migration before relying on overrides persistence. Owner browser-smoke still outstanding.

## Recently Completed

- Menu matrix + Access Matrix + migration `20260716140000_menu_permission_overrides`
- Dashboard filter banners + FG delivery/monthly trend drills
- CNF create from Projects with `returnProjectId`; modal/shell UX polish
- Release checklist, AVD (`agent-history/version-89-handoff.md`), GitHub Release `v0.89.0`

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run typecheck` | PASSED | clean |
| `npm run build` | PASSED | Vite OK |
| `npm run test:menu-permissions` | PASSED | clean |
| `npm run test:dashboard-drilldown` | PASSED | clean |
| Browser smoke | NOT_RUN | BROWSER_TESTING access matrix |
| GitHub Pages deploy | PASSED | run 29638972620 |
| Migration on target Supabase | NOT_VERIFIED | owner apply |

## Next Action

Apply `20260716140000_menu_permission_overrides` on target Supabase; owner browser-smoke Access Matrix / role nav. Rollback: `0.88.0` @ `9e87130`.

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
