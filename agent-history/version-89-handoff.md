# Version 89 Handoff — Application Version Description (AVD)

Project: Project Tracker (`carlolidres/ProjectTracker_React`)  
Document type: Configuration / release record  
Structure aligned with ISO/IEC/IEEE 12207 release/configuration practice, ISO/IEC 27001 change evidence, and ISO 9001 documented-information control.  
**Not a certification claim.**

| Field | Value |
|---|---|
| Version number | `0.89.0` (git tag `v0.89.0`) |
| Release date | `2026-07-18` (Actions completed `2026-07-18T09:20:36Z`) |
| Prior production | `0.88.0` @ `9e87130` (Actions run #63, 2026-07-16) |
| Change class | **Minor** (security/config-relevant) |
| Deployment environment | GitHub Pages (`github-pages`) via `.github/workflows/deploy.yml` |
| Deployment status | **Deployed** — Actions success |
| Deploy SHA | `82bc127` |
| Actions run | https://github.com/carlolidres/ProjectTracker_React/actions/runs/29638972620 |
| GitHub Release | https://github.com/carlolidres/ProjectTracker_React/releases/tag/v0.89.0 |
| Rollback reference | Redeploy `9e87130` / package `0.88.0`; or `VITE_FEATURE_MENU_MATRIX=false`; or migration down per `agent-workflow/MENU_MATRIX_ROLLBACK.md` |

---

## Change summary

Menu-level View/Create/Edit/Export permission matrix with Access Matrix admin UI; dashboard filter banners and FG delivery/monthly trend drills; CNF Tracker create/return-to-project flow and modal UX polish; shell collapse with glowing expand control; workflow status icons; release checklist and version documentation.

## Affected components

| Area | Paths / artifacts |
|---|---|
| AuthZ / menus | `src/lib/menuPermissions.ts`, `src/services/menuPermissionService.ts`, `src/app/menu-permission-provider.tsx`, `src/components/common/protected-route.tsx`, `src/lib/roleAccess.ts`, `src/components/layout/sidebar.tsx`, feature pages Create/Edit/Export gates |
| Admin | `src/features/admin/AccessMatrixPage.tsx`, route `/admin/access` |
| Schema / RLS | `supabase/migrations/20260716140000_menu_permission_overrides.sql` (+ `.down.sql`) |
| Dashboard | `DashboardPage.tsx`, `dashboard-charts.tsx`, `MeetingViewOverlay.tsx`, `dashboard-filter-banner.tsx`, `urlDerivedFilters.ts`, `fgDeliveryMetrics.ts` |
| CNF / Projects | `CnfTrackerPage.tsx`, `CnfTrackerDetailModal.tsx`, `ProjectEntryPage.tsx`, `cnf-tracker.css` |
| Shell / UX | `app-shell.tsx`, `globals.css`, `sidebar-nav-item.tsx`, `workflow-status-badge.tsx`, `creatable-na-select.tsx` |
| Docs / release | `DATA_MAP.md`, `CODEMAP.md`, `RELEASE_CHECKLIST.md`, `releases/v0.89.0-RELEASE_NOTES.md`, this handoff |
| Verification | `scripts/verify-menu-permissions.ts`, `scripts/verify-dashboard-drilldown.ts` |

## Features added

- Default seven-menu access for new/non-admin users; Audit/Admin via override
- `menu_permission_overrides` + Access Matrix + audit on change
- Create/Edit/Export gating on Support, Projects, DB, CNF, Endorsement, Lessons, Audit
- Dashboard filter banners; URL sort/delivery/`fg_month`; FG On Time/Late + Monthly Trend drills
- Projects → New CNF opens CNF Tracker create and returns to originating project after save
- Desktop chrome collapse: hide sidebar+topbar; glowing expand FAB; synchronized motion
- Workflow status icon+tooltip display; release checklist / release notes templates

## Defects fixed

- CNF detail modal widen-on-close (create mode width jump during leave animation)
- Creatable select instructional helper clutter
- Expand FAB lingering after chrome restore (unmount after exit fade)

## Security / configuration changes

- New `menu_permission_overrides` table + RLS (authenticated SELECT; admin write)
- Feature kill-switch `VITE_FEATURE_MENU_MATRIX` (documented in `.env.example`)
- Frontend menu gating remains UX-only; RLS remains authoritative

## Risk / impact assessment

| Dimension | Assessment |
|---|---|
| Overall risk | **Medium–High** until target Supabase migration applied and role browser smoke passes |
| Access impact | Incorrect overrides can deny default menus or widen admin-only menus |
| Data impact | No destructive data migration; overrides table additive |
| Rollback difficulty | Low–Medium (app SHA redeploy / feature flag); DB down script after export |

## Testing and validation

| Check | Status | Result |
|---|---|---|
| `npm run typecheck` | PASSED (2026-07-18 pre-commit) | clean |
| `npm run build` | PASSED (2026-07-18 pre-commit) | Vite OK |
| `npm run test:menu-permissions` | PASSED (2026-07-18 pre-commit) | clean |
| `npm run test:dashboard-drilldown` | PASSED (2026-07-18 pre-commit) | clean |
| GitHub Actions Deploy to GitHub Pages | PASSED | [run 29638972620](https://github.com/carlolidres/ProjectTracker_React/actions/runs/29638972620) success |
| Browser smoke (Access Matrix / role nav) | NOT_RUN | `BROWSER_TESTING.md` |
| Supabase migration apply on target | NOT_VERIFIED from GitHub | Owner must apply `20260716140000_menu_permission_overrides` |

## Approvals

| Role | Name | Date | Method |
|---|---|---|---|
| Author | Cursor agent + repo working tree | 2026-07-18 | Implementation |
| Reviewer | MISSING (no merged PR review recorded) | — | Owner-requested direct release |
| Approver / deployment owner | Repository owner (`carlolidres`) via explicit deploy request in chat | 2026-07-18 | Chat instruction to commit/push/deploy |
| CAB / formal CR | MISSING | — | Not present in GitHub |

## Related commits / PRs / issues

| Type | Reference | Notes |
|---|---|---|
| Prior prod commit | `9e87130` | v88 deploy handoff |
| This release commit | `82bc127` | Tag `v0.89.0` |
| PRs | Open `#1`–`#3` not included unless merged | Not part of this baseline |
| Issues / CR | MISSING | |

## Deployment status

1. Commit `82bc127` (`v89` / `0.89.0`) pushed to `main` — done
2. Actions `Deploy to GitHub Pages` run 29638972620 — **success**
3. Tag/Release `v0.89.0` published at `82bc127` — done
4. About drawer expected identity: `v0.89.0 (82bc127)`

## Rollback procedure

1. Revert or restore `main` to `9e87130` and push (or `git revert` release commit).
2. Confirm Actions green and About shows `v0.88.0 (9e87130)`.
3. Optionally set `VITE_FEATURE_MENU_MATRIX=false` and redeploy.
4. DB: export overrides; apply down migration only if schema must reverse (`MENU_MATRIX_ROLLBACK.md`).

## Evidence gaps (explicit)

- No prior GitHub Releases/tags before this release process
- Browser smoke NOT_RUN at handoff draft time
- Target Supabase migration apply not verified via GitHub
- No separate formal QMS document ID / retention schedule
