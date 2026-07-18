# Version 90 Handoff — Application Version Description (AVD)

Project: Project Tracker (`carlolidres/ProjectTracker_React`)  
Document type: Configuration / release record  
Structure aligned with ISO/IEC/IEEE 12207 release/configuration practice, ISO/IEC 27001 change evidence, and ISO 9001 documented-information control.  
**Not a certification claim.**

| Field | Value |
|---|---|
| Version number | `0.90.0` (git tag `v0.90.0`) |
| Release date | `2026-07-18` |
| Prior production | `0.89.0` @ `82bc127` |
| Change class | **Minor** |
| Deployment environment | GitHub Pages (`github-pages`) via `.github/workflows/deploy.yml` |
| Deployment status | **Deployed** — Actions success |
| Deploy SHA | `de385ef` |
| Actions run | https://github.com/carlolidres/ProjectTracker_React/actions/runs/29643088651 |
| GitHub Release | https://github.com/carlolidres/ProjectTracker_React/releases/tag/v0.90.0 |
| Rollback reference | Redeploy `82bc127` / `0.89.0`; or `VITE_FEATURE_DASHBOARD_WORKSPACE=false` — see `agent-workflow/DASHBOARD_WORKSPACE_ROLLBACK.md` |

---

## Change summary

Dashboard workspace Phase A (action strip, project quick drawer, return-to-dashboard) behind feature flag; collapsed shell state persistence; hover-only compact nav icon rail; project entry sticky header + role tabs single stack.

## Affected components

| Area | Paths / artifacts |
|---|---|
| Feature flag | `src/lib/featureFlags.ts`, `.env.example`, `src/vite-env.d.ts` |
| Dashboard workspace | `DashboardPage.tsx`, `DashboardActionStrip.tsx`, `ProjectQuickDrawer.tsx`, `dashboardReturnTo.ts`, `dashboardDrilldown.ts`, `dashboard-filter-banner.tsx` |
| Shell | `app-shell.tsx`, `use-sidebar-state.ts`, `collapsed-nav-rail.tsx`, `sidebar-nav.ts`, `sidebar.tsx`, `globals.css` |
| Project form | `ProjectEntryPage.tsx`, `project-form.css` |
| Docs / release | `DASHBOARD_WORKSPACE_ROLLBACK.md`, `CODEMAP.md`, `releases/v0.90.0-RELEASE_NOTES.md`, this handoff |
| Verification | `scripts/verify-dashboard-drilldown.ts` |

## Features added

- Role/menu-gated dashboard action strip and project quick drawer
- `return_to` / Back to Dashboard on Projects Database and Support Activities drills
- Collapsed chrome persists across routes until expand FAB click
- Hover FAB → compact icon rail with tooltips; click → full expand
- Sticky project title + role tabs as one stack

## Defects fixed

- Role tabs overlapping sticky project header
- Sidebar/topbar auto-expanding on navigation after collapse

## Security / configuration changes

- `VITE_FEATURE_DASHBOARD_WORKSPACE` kill-switch (default on). No schema migration.

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run typecheck` | PASSED | clean |
| `npm run build` | PASSED | Vite OK |
| `npm run test:dashboard-drilldown` | PASSED | clean |
| Browser smoke | NOT_RUN | workspace + hover rail |
| Migrations | none | |

## Rollback

1. `VITE_FEATURE_DASHBOARD_WORKSPACE=false` + redeploy  
2. Redeploy `0.89.0` @ `82bc127`
