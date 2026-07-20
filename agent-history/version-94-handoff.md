# Version 94 Handoff — Application Version Description (AVD)

Project: Project Tracker (`carlolidres/ProjectTracker_React`)  
Document type: Configuration / release record  
**Not a certification claim.**

| Field | Value |
|---|---|
| Version number | `0.94.0` (git tag `v0.94.0`) |
| Release date | `2026-07-20` |
| Prior production | `0.93.0` @ `e102a0d` |
| Change class | **Minor** |
| Deployment environment | GitHub Pages (`github-pages`) via `.github/workflows/deploy.yml` |
| Deployment status | **Pending** — update after Actions success |
| Deploy SHA | `d3c4133` (release commit; confirm Actions) |
| Actions run | _(set after deploy)_ |
| GitHub Release | https://github.com/carlolidres/ProjectTracker_React/releases/tag/v0.94.0 |
| Rollback reference | Redeploy `e102a0d` / `0.93.0` |

---

## Change summary

Projects Database spreadsheet-style blank draft rows with bulk project create on Save; app Back/Forward with view-state restore; compact status icons; worklist and Project Entry UX polish; sidebar session clear and dropdown editor fix.

## Migrations

none

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
| GitHub Release | PENDING | after tag |
