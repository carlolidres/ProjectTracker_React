# Version 93 Handoff — Application Version Description (AVD)

Project: Project Tracker (`carlolidres/ProjectTracker_React`)  
Document type: Configuration / release record  
**Not a certification claim.**

| Field | Value |
|---|---|
| Version number | `0.93.0` (git tag `v0.93.0`) |
| Release date | `2026-07-19` |
| Prior production | `0.92.0` @ `9d95501` |
| Change class | **Minor** |
| Deployment environment | GitHub Pages (`github-pages`) via `.github/workflows/deploy.yml` |
| Deployment status | **Deployed** — Actions success |
| Deploy SHA | `e102a0d` |
| Actions run | https://github.com/carlolidres/ProjectTracker_React/actions/runs/29684541973 |
| GitHub Release | https://github.com/carlolidres/ProjectTracker_React/releases/tag/v0.93.0 |
| Rollback reference | Redeploy `9d95501` / `0.92.0` |

---

## Change summary

Default shell to collapsed sidebar/topbar when no session preference; Support Activities Add/Edit card header sticks to the top of the content scroll area with sticky top padding when the topbar is hidden.

## Migrations

none

## Deferred

- Phase C R9 Support CNF/Endorsement handoff overlays

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run typecheck` | PASSED | clean |
| `npm run build` | PASSED | Vite OK |
| GitHub Pages deploy | PASSED | [29684541973](https://github.com/carlolidres/ProjectTracker_React/actions/runs/29684541973) |
| GitHub Release | PASSED | [v0.93.0](https://github.com/carlolidres/ProjectTracker_React/releases/tag/v0.93.0) |
