# Version 91 Handoff — Application Version Description (AVD)

Project: Project Tracker (`carlolidres/ProjectTracker_React`)  
Document type: Configuration / release record  
**Not a certification claim.**

| Field | Value |
|---|---|
| Version number | `0.91.0` (git tag `v0.91.0`) |
| Release date | `2026-07-18` |
| Prior production | `0.90.0` @ `de385ef` |
| Change class | **Minor** |
| Deployment environment | GitHub Pages (`github-pages`) via `.github/workflows/deploy.yml` |
| Deployment status | **Pending** — fill after Actions |
| Deploy SHA | _(fill after Actions)_ |
| Rollback reference | Redeploy `de385ef` / `0.90.0` |

---

## Change summary

Projects Database UX (Full View, FG Month, selection Esc, hide long-text columns), Project Entry role tabs + expand-from-DB, TSD/QC remarks migrations, dashboard Phase B create-return + sticky drill context, About version history, retire dead `CnfCreateModal`.

## Migrations

| Migration | Purpose |
|---|---|
| `20260718140000_cnf_projects_tsd_remarks` | `cnf_projects.tsd_remarks` |
| `20260718141000_cnf_projects_qc_remarks` | `cnf_projects.qc_remarks` |

## Deferred

- Phase C R9 Support handoff overlays (navigate + drafts remain)

## Verification

Fill from release commit: typecheck, build, dashboard-drilldown, projects-db-validation, Actions deploy URL.
