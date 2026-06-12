# Version 28 Handoff - Full React + Supabase Migration

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-12

Previous Version: `agent-history/version-18-handoff.md`

Project Status: **React + Supabase migration implemented (v19–v28 scope)**

---

## What Was Requested

Implement the full Project Tracker migration execution plan: bootstrap React/Vite app, Supabase schema, auth, feature pages, data migration tooling, and GitHub Pages deployment workflow.

---

## What Was Implemented

### Phase 1 (v19) — Repository Bootstrap
- Created Vite + React 19 + TypeScript project (`package.json`, `vite.config.ts`, `tsconfig.*`, `index.html`)
- Added `.gitignore`, `.env.example`, initialized git
- Wired Supabase client, HashRouter, auth/theme providers
- Ported and adapted layout shell from `sampleUI/` with Project Tracker navigation
- Added login page and protected routes

### Phase 2 (v20) — Database Schema + Types
- Added `supabase/migrations/001_initial_schema.sql` (profiles, cnf_projects, support_activities, notifications, audit_logs, registry, admin_messages)
- Added `supabase/migrations/002_rls_policies.sql` with role-based policies
- Created TypeScript types in `src/types/`
- Added `src/services/auditService.ts` with diff logging pattern from legacy `Code.gs`
- Added `src/lib/mappers.ts` for DB snake_case ↔ legacy field name mapping

### Phase 3 (v21) — Authentication + Role Navigation
- `AuthProvider` uses `getUser()` for session checks
- Role-based sidebar filtering via `src/lib/roleAccess.ts`
- `ProtectedRoute` enforces route access by role

### Phase 4 (v22) — Project Service + Hierarchical Form
- `src/services/projectService.ts` — save/update/archive, hierarchy builder, flatten payload, duplicate detection
- `src/features/projects/ProjectEntryPage.tsx` — batch/MO/PO form with role-section field disabling

### Phase 5 (v23) — Projects Database + Export
- `src/features/projects/ProjectsDatabasePage.tsx` — search, filters, table view
- `src/services/exportService.ts` — Excel export via `xlsx`

### Phase 6 (v24) — Support Activities
- `src/services/supportActivityService.ts`
- `src/features/support-activities/SupportActivitiesPage.tsx` — TSD/RnD form and database view

### Phase 7 (v25) — Dashboard + Notifications
- `src/services/dashboardService.ts` — KPI cards, worklist, status distributions (ported from `getDashboardData`)
- `src/services/notificationService.ts` — FG Month notification refresh
- `src/features/dashboard/DashboardPage.tsx`
- Adapted `notification-center.tsx` for Project Tracker

### Phase 8 (v26) — Audit Trail, Archived, Registry
- `src/features/audit-trail/AuditTrailPage.tsx`
- `src/features/archived/ArchivedPage.tsx`
- `src/features/registry/RegistryPage.tsx`
- `src/services/registryService.ts`

### Phase 9 (v27) — Data Migration Tooling
- `scripts/migrate-sheets-to-supabase.ts` (local service-role script, not committed with secrets)
- `scripts/migration-map.md` — column mapping documentation

### Phase 10 (v28) — GitHub Pages Deploy
- `.github/workflows/deploy.yml` — build and deploy to GitHub Pages
- Vite `base` configured for `/ProjectTracker_React/`

---

## What Was Not Implemented

- Supabase migrations not applied remotely in this session (SQL files ready; owner must run in Supabase SQL editor or CLI)
- Production GitHub Pages deploy not executed (workflow file ready; requires repo secrets and Pages enablement)
- Google Sheets data not imported (migration script ready; requires sheet export + service role key locally)
- Column-level RLS per department field group (table-level + UI field disabling implemented instead)
- Admin user management UI page (profile role updates available via Supabase dashboard for now)

---

## Verification

- `npm install` — succeeded
- `npm run build` — succeeded (TypeScript + Vite production build)
- Git repository initialized

---

## Assumptions

- `.env.local` contains valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Owner will run `supabase/migrations/*.sql` against project `asukusfiiqxjjihohnzi`
- Supabase Auth users will be created manually; profiles auto-created with `view` role via trigger
- Admin promotes roles in `profiles` table until user management UI is added

---

## Risks

- Migrations must be applied before app data features work against live Supabase
- GitHub Actions requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` repository secrets
- Service role key must be rotated before running migration script (per baseline)
- Large JS bundle (~1.8MB) — consider code-splitting in future optimization pass

---

## Lessons Learned

- Legacy mixed-case field names require explicit DB mappers when using PostgreSQL snake_case columns
- `project-context.mdc` structure (services + features) scales better than copying CNF Tracker routes wholesale
- HashRouter avoids GitHub Pages SPA routing issues without server rewrites

---

## Next Steps

1. Run `001_initial_schema.sql` and `002_rls_policies.sql` in Supabase SQL editor
2. Create Supabase Auth test users and set roles in `profiles` (e.g. `admin`, `am_bm_pl`)
3. Add GitHub repository secrets and enable GitHub Pages (source: GitHub Actions)
4. Add Supabase Auth redirect URL: `https://carlolidres.github.io/ProjectTracker_React/`
5. Export Google Sheets data and run `scripts/migrate-sheets-to-supabase.ts` locally with service role key
6. Smoke test: login → dashboard → create project → audit trail entry → export

---

## Git Traceability

- Commit: _pending — user has not requested commit yet_
- Commit message: _pending_
- Commit hash: _pending_

---

## Reviewers Feedback

- **Instructions:** always add this section at the end of Markdown files to allow reviewers to provide feedback. If none is provided, this section will be skipped.
- **Reviewers:** @carlo-mauring
- **Comments:**
