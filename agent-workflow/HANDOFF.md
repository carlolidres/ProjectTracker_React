# Current Handoff

Last Updated: `2026-07-18`
Version: `v0.91.0`
Branch: `main`
Commit: _(fill after push)_
App version: `0.91.0`

## Current Status

**v0.91.0 release in progress.** Includes Projects Database UX, TSD/QC remarks, Project Entry role defaults, dashboard Phase B create-return, sticky Dashboard context on DB drills, About version history, and retired dead `CnfCreateModal`.

## Recently Completed

- v0.91.0 packaging: DATA_MAP, `appVersionHistory`, release notes, version-91 handoff
- R8: Removed unused Project Entry `CnfCreateModal` / `CnfCreateFormFields`; New CNF → `/cnf-tracker?new=1` + detail modal
- R7: Sticky Dashboard context banner on Projects Database when `return_to` present
- Projects Database: Full View default, FG Month, hide long-text columns, Esc clear selection, PP header
- Project Entry: `defaultProjectTabForRole`; expand hierarchy from `from=database`
- Migrations: `tsd_remarks`, `qc_remarks`

## Deferred

- Phase C R9 Support CNF/Endorsement handoff overlays

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run typecheck` | PENDING | |
| `npm run build` | PENDING | |
| GitHub Pages deploy | PENDING | |
| GitHub Release | PENDING | `v0.91.0` |

## Next Action

Confirm Actions green; fill deploy SHA in DATA_MAP / version-91 handoff / appVersionHistory; apply remarks migrations on target if needed.

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
