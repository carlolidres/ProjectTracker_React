# Current Handoff

Last Updated: `2026-08-30`
Version: `v0.94.0`
Branch: `main`
Commit: `03597e0`
App version: `0.94.0`

## Current Status

**v0.94.0 deployed.** GitHub Pages Actions success; Release [v0.94.0](https://github.com/carlolidres/ProjectTracker_React/releases/tag/v0.94.0) published.

## Recently Completed

- Hard-deleted Support Activity `Tetst` (`SUP-20260719-175653-136` / `SPROJ-2026-005`)
- Hard-deleted CNF Tracker entries `Test` (CNF-2026-001) and `DPM-CNF-2026-001` (CNF-2026-002); unlinked support CNF references
- Hard-deleted Endorsement Tracker entries `VMP-MM-0001E` (END-2026-001) and `Test001` (END-2026-002), including items; unlinked/cleared source endorsement numbers so they cannot auto-recreate
- Sidebar starts expanded on load, login, and session clear (collapse lasts for the current SPA session only)
- Released `v0.94.0` @ `03597e0`
- Projects Database blank draft rows + bulk create on Save
- Compact workflow status icons; Back/Forward view-state restore
- Worklist / Project Entry polish; sidebar session clear; dropdown editor fix
- DATA_MAP updated for draft-row create path and release baseline

## Deferred

- Phase C R9 Support CNF/Endorsement handoff overlays
- Opt-in view-state restore for remaining routes (audit, registry, admin, etc.)

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run typecheck` | PASSED | clean (re-run 2026-08-30 after sidebar default) |
| `npm run test:projects-db-validation` | PASSED | draft-row reconcile |
| `npm run test:navigation-history` | PASSED | stack hygiene |
| `npm run build` | PASSED | Vite OK |
| GitHub Pages deploy | PASSED | [29741024111](https://github.com/carlolidres/ProjectTracker_React/actions/runs/29741024111) |
| GitHub Release | PASSED | [v0.94.0](https://github.com/carlolidres/ProjectTracker_React/releases/tag/v0.94.0) |

## Next Action

Browser-smoke expanded sidebar on load/login. Phase C R9 when ready.

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
