# Current Handoff

Last Updated: `2026-07-20`
Version: `v0.94.0`
Branch: `main`
Commit: `d3c4133`
App version: `0.94.0`

## Current Status

**v0.94.0 release in progress** @ `d3c4133`. Push to `main` triggers GitHub Pages deploy; then publish GitHub Release `v0.94.0`.

## Recently Completed

- Projects Database: blank fill-viewport draft rows (replaced Add project); Save bulk-creates projects
- Compact workflow status icons in Projects Database
- App Back/Forward + view-state restore on priority pages
- Worklist / Project Entry UX polish; sidebar session clear; dropdown editor mousedown fix
- DATA_MAP: draft-row create path + session UI preferences; release baseline → 0.94.0

## Deferred

- Phase C R9 Support CNF/Endorsement handoff overlays
- Opt-in view-state restore for remaining routes (audit, registry, admin, etc.)

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run typecheck` | PASSED | clean |
| `npm run test:projects-db-validation` | PASSED | draft-row reconcile |
| `npm run test:navigation-history` | PASSED | stack hygiene |
| `npm run build` | PENDING | before push |
| GitHub Pages deploy | PENDING | after push |
| GitHub Release | PENDING | `v0.94.0` |

## Next Action

Confirm Actions deploy green; update deploy SHA in DATA_MAP / version-94-handoff / About history.

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
