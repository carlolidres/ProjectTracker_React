# Version 92 Handoff — Application Version Description (AVD)

Project: Project Tracker (`carlolidres/ProjectTracker_React`)  
Document type: Configuration / release record  
**Not a certification claim.**

| Field | Value |
|---|---|
| Version number | `0.92.0` (git tag `v0.92.0`) |
| Release date | `2026-07-19` |
| Prior production | `0.91.0` @ `c264715` |
| Change class | **Minor** |
| Deployment environment | GitHub Pages (`github-pages`) via `.github/workflows/deploy.yml` |
| Deployment status | **Deployed** — Actions success |
| Deploy SHA | `9d95501` |
| Actions run | https://github.com/carlolidres/ProjectTracker_React/actions/runs/29684111124 |
| GitHub Release | https://github.com/carlolidres/ProjectTracker_React/releases/tag/v0.92.0 |
| Rollback reference | Redeploy `c264715` / `0.91.0` |

---

## Change summary

Creatable autocomplete for project/support/CNF suggestion fields; RnD (`rnd`) role + Supabase enum; CNF detail status icons on document numbers; Dashboard My Worklist moved into a wide searchable modal with Process/Support tabs and role-scoped defaults (All Worklist off by default).

## Migrations

| Migration | Purpose |
|---|---|
| `20260719120000_rnd_role_enum` | `ALTER TYPE user_role ADD VALUE 'rnd'` |
| `20260719120100_rnd_role_helpers` | `safe_project_tracker_role` / `pt_current_user_role` recognize `rnd` |

Applied on Project Tracker Supabase project during development.

## Deferred

- Phase C R9 Support CNF/Endorsement handoff overlays

## Verification

Fill from release commit: typecheck, build, menu-permissions, projects-db-validation, worklist-sort, Actions deploy URL.
