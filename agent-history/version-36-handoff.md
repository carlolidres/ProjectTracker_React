# Version 36 Handoff - Migration Complete and GitHub Deployment Ready

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-12

Previous Version: `agent-history/version-35-handoff.md`

Project Status: **Migration complete — React + Supabase feature parity achieved; ready for GitHub Pages deployment after commit, push, and Supabase migration apply**

---

## What Was Requested

1. Complete remaining urgency, classification, notification, dashboard, database filter, and date-adjustment alignment (FG Delivery as sole urgency date).
2. Update handoff to record all activities and lessons learned.
3. Prepare GitHub deployment instructions for the project owner.

---

## Current Project Status at Start

- Version 35 delivered signup, admin user approval, and auth security foundation (`009_auth_admin_approval.sql`).
- Versions 33–34 and a large working tree of UI/logic realignment remained uncommitted.
- Urgency and date-adjustment rules were partially implemented and needed cross-surface alignment.

---

## What Was Implemented (Cumulative — Versions 33–36)

### Platform and authentication

| Area | Implementation |
|------|----------------|
| Signup | `LoginPage.tsx` — full name, email, password, requested role (non-Admin) |
| Account states | Pending / inactive blocked screens; active-only route access |
| Admin user management | `/admin/users` — approve, assign role, activate/deactivate |
| Auth security | `009_auth_admin_approval.sql` — active-user RLS, `admin_update_user_access` RPC, `auth_activity_log` |
| Profile settings | `010_profile_settings.sql`, profile modal, display name helpers |
| Password reset | `011_password_reset_requests.sql`, password reset service |
| Dummy users | `scripts/seed-auth-users.ts`, `npm run seed:auth-users` |
| Session cleanup | `sessionCleanup.ts` on logout |

### Project entry and hierarchy

| Area | Implementation |
|------|----------------|
| Legacy ID formats | `PROJ-YYYY-NNN`, `SPROJ-YYYY-NNN` via `idGeneration.ts` |
| Role tabs | AM/BM/PL, PP, TSD, VAL, QC — tabs for field ownership, not page lockout |
| Multiple CNF entries | `cnf_entries_json` per PO; copy-from-first-PO; collapse/expand |
| Duplicate review | `duplicateReview.ts` — legacy-style modal before save |
| FG month lock | `fgMonthLock.ts` — confirmation when assigning FG month |
| Form fields | `projectFormFields.ts`, `ProjectHierarchyForm`, `ProjectFieldControl` |
| UoM dropdown | Registry-driven select on order quantity |
| Order quantity | `orderQuantity.ts` validation helpers |
| Clear after save | Form resets and notifications refresh after successful save |
| Archive | Admin-only archive; audit logged |

### FG Delivery urgency and priority (unified rules)

| Area | Implementation |
|------|----------------|
| FG date parsing | `fgUrgency.ts` — month values → last day of month |
| Classification buckets | Overdue, Due Today, Within 3/7/15/30 Days, More Than 30 Days |
| Cumulative dashboard counts | `buildCumulativeDueDateCounts()` aligned with drill-down filters |
| Worklist sort | `compareProjectPriority()` — active first; CLOSED (5), CANCELLED (6) after open |
| Focus group | `projectPriority.ts` — AM/BM/PL, PP, TSD, VAL, QC; CNF `cnf_entries_json` → AM/BM/PL |
| Next required action | First missing field in priority order, including CNF entries |
| Dashboard | KPI cards, due-date overview, FG Month Tasks, department pending, priority worklist with Focus Group |
| Meeting View | Full-screen overlay with matching drill-downs and sandbox preview |
| Projects Database | `due_window`, `pending_role` URL params and filter UI |
| Support Activities | `due_window` filter on `Target_Date`; dashboard drill-down to support page |
| Notifications | All urgency windows; focus-group missing-field alerts; sort by severity → FG date → Project ID |
| FG delivery metrics | `fgDeliveryMetrics.ts` using `parseFgDeliveryDate` |

### Date adjustment and Lessons Learned

| Area | Implementation |
|------|----------------|
| Tracked date fields | FG Month, Client Approval Target, Manufacturing Start Week, MO/BMR/PO Target/Activation, Protocol Target, Validation Report Target, AR Availability, Packaging Schedule, Support Target/Planning |
| Reason required only | When existing date is changed or cleared — not first-time blank/N/A (`shouldRequireDateAdjustmentReason`) |
| Batch modal before save | `date-adjustment-provider.tsx` — one modal listing all changed fields |
| Lessons Learned page | `/lessons-learned` — sidebar item, table, filters, export |
| Database | `017_lessons_learned.sql`, `018_lesson_id.sql` — `lesson_id` column (`LL-…`) |
| Service | `lessonsLearnedService.ts` — batch insert per changed field |
| Server-side guard | `updateProject` / `saveSupportActivity` reject save if date changes lack `dateAdjustmentsConfirmed` |
| Registry category | `date_adjustment_reason` for reason dropdown |

### Dashboard, exports, and supporting features

| Area | Implementation |
|------|----------------|
| Dashboard service | Rewritten for FG urgency + project priority |
| Sandbox mode | `dashboardSandbox.ts` for layout preview without live data |
| Export to Excel | Projects, Support, Audit, Lessons Learned, Registry |
| Audit trail | Plain-English formatting, clickable Project ID links |
| Registry | Admin-only; live `RegistryProvider`; deactivate/reactivate (`016_registry_admin_only.sql`) |
| App feedback | `013`–`015` migrations, feedback chat widget |
| PO order fields | `012_po_order_fields.sql` |
| Sidebar footer | “Created by: Carlo M. Lidres” |
| Meeting view read-only | Support/project forms read-only in meeting mode |

### Data migration tooling (deferred import)

| Area | Implementation |
|------|----------------|
| Export pipeline | `exports/README.md`, `reference/export-for-migration.gs` |
| Import scripts | `migrate-sheets-to-supabase.ts`, `migration-utils.ts`, `read-sheet-export.ts` |
| Commands | `migrate:validate`, `migrate:dry-run`, `migrate:import` |
| Gap checklist | `reference/legacy-gap-checklist.md` — parity reference |

### New / updated core libraries

```text
src/lib/fgUrgency.ts
src/lib/projectPriority.ts
src/lib/dateAdjustmentReview.ts
src/lib/duplicateReview.ts
src/lib/idGeneration.ts
src/lib/fgDeliveryMetrics.ts
src/lib/dashboardSandbox.ts
src/lib/auditFormat.ts
src/lib/projectFormFields.ts
src/lib/projectHierarchy.ts
```

### New / updated services

```text
src/services/dashboardService.ts
src/services/notificationService.ts
src/services/projectService.ts
src/services/supportActivityService.ts
src/services/lessonsLearnedService.ts
src/services/exportService.ts
src/services/auditService.ts
src/services/registryService.ts
```

### Supabase migrations (standalone project — apply in order)

| Order | File | Purpose |
|-------|------|---------|
| 1 | `001_initial_schema.sql` | Core tables |
| 2 | `002_rls_policies.sql` | Base RLS |
| 3 | `007_standalone_grants.sql` | PostgREST grants |
| 4 | `008_standalone_open_access.sql` | Authenticated access |
| 5 | `009_auth_admin_approval.sql` | Signup approval, Admin RPC |
| 6 | `010_profile_settings.sql` | Profile display settings |
| 7 | `011_password_reset_requests.sql` | Password reset requests |
| 8 | `012_po_order_fields.sql` | PO order quantity / UoM fields |
| 9 | `013_app_feedback.sql` | App feedback table |
| 10 | `014_app_feedback_policy_fix.sql` | Feedback RLS fix |
| 11 | `015_app_feedback_block_admin_insert.sql` | Feedback insert policy |
| 12 | `016_registry_admin_only.sql` | Registry admin-only writes |
| 13 | `017_lessons_learned.sql` | Lessons learned table |
| 14 | `018_lesson_id.sql` | Human-readable `lesson_id` column |

**Do not apply** `003`–`006` (co-hosted CNF Tracker only).

---

## Application Routes

| Route | Page | Access |
|-------|------|--------|
| `/login` | Login / Signup | Public |
| `/dashboard` | Dashboard + Meeting View | Active users |
| `/projects` | Project Entry | Active users |
| `/projects/database` | Projects Database | Active users |
| `/support-activities` | Support Activities | Active users |
| `/lessons-learned` | Lessons Learned | Active users |
| `/audit-trail` | Audit Trail | Active users |
| `/archived` | Archived records | Admin |
| `/registry` | Registry | Admin |
| `/admin/users` | User Management | Admin |

---

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | **Pass** (via `tsc -b` in build) |
| `npm run build` | **Pass** |
| FG urgency shared across dashboard, database, notifications | **Implemented** |
| Date adjustment batch modal + Lessons Learned logging | **Implemented** |
| Server-side date adjustment guard | **Implemented** |
| Live Supabase with all migrations 001–018 | **Owner action — apply in dashboard** |
| GitHub Pages deploy | **Owner action — commit, push, secrets** |
| Google Sheets data import | **Deferred — run after export files placed in `exports/`** |

Build note: Vite reports existing large JavaScript chunk warning (>500 kB). Non-blocking for deployment.

---

## What Was Not Implemented

- Automated Google Sheets import (tooling ready; owner must export and run `migrate:import`).
- Backend server beyond Supabase (by design — static frontend only).
- Bundle size optimization / code splitting (future enhancement).

---

## Problems Encountered

- Large uncommitted working tree spanning versions 33–36 — must be committed before deploy.
- Supabase migrations 010–018 must be applied manually if not already on the reset project.
- `AGENTS.md` commit-in-handoff rule is self-referential; repository uses a follow-up hash-recording commit pattern (see v35).
- Service role key required only locally for seeding and sheet import — never in GitHub secrets or frontend.

---

## Assumptions

- Standalone Supabase project is the production database (not co-hosted CNF Tracker).
- GitHub repo: `carlolidres/ProjectTracker_React`.
- GitHub Pages URL: `https://carlolidres.github.io/ProjectTracker_React/`.
- `VITE_BASE_PATH=/ProjectTracker_React/` matches repository name.
- Active users share legacy GAS page access; Admin manages registry, archive, and users.
- Sheet import remains optional post-go-live.

---

## Risks

- Deploying before all SQL migrations are applied will cause runtime errors on Lessons Learned, registry admin rules, and profile features.
- Missing GitHub secrets will produce a build with empty Supabase connection.
- Supabase Auth redirect URLs must include the GitHub Pages URL or login redirects will fail.
- First Admin must be bootstrapped manually after signup (see `STANDALONE_SETUP.md`).
- Uncommitted changes will not reach GitHub Pages until pushed to `main`.

---

## Lessons Learned

### Migration and architecture

- Translate legacy **behavior**, not file structure — `google.script.run` became service-layer Supabase queries, not 1:1 file copies.
- Co-hosted CNF Tracker schema (`003`–`006`) must be skipped for standalone Project Tracker; mixing schemas caused notification and RLS conflicts.
- Pending-account protection belongs in **RLS and UI** — frontend hiding alone is insufficient.
- Admin access updates are safer through a verified database RPC than direct client profile writes.

### FG Delivery and urgency

- **One urgency date** (`fg_month` / FG Delivery) must drive dashboard counts, worklist sort, notifications, and database filters — using milestone dates caused mismatched drill-downs.
- Month-only FG values must resolve to the **last day of the month** to match legacy business meaning.
- Dashboard within-day counts must be **cumulative** (Within 7 includes Due Today) and use the same `rowMatchesDueWindow()` as database filters.
- Closed and cancelled records must sort **after** all active open work regardless of FG date.

### Priority and ownership

- Focus groups (AM/BM/PL, PP, TSD, VAL, QC) must scan **`cnf_entries_json`** with CNF fields owned by AM/BM/PL.
- “Next required action” should follow a fixed priority field order, not arbitrary form layout order.

### Date adjustments

- Per-field blur prompts are poor UX — a **single batch modal before save** is clearer and matches audit expectations.
- Reasons are required only when an **existing** date changes or is cleared; first-time N/A entries should not block saves.
- Server-side re-validation prevents bypassing the modal via devtools or future API clients.
- Each adjustment should log a discrete Lessons Learned row with **Lesson ID**, field, old/new values, reason category, and description.

### Deployment and operations

- GitHub Actions needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets — anon key only, never service role.
- Verify Supabase Auth redirect URLs **before** announcing go-live.
- Run `npm run verify:supabase` and `npm run smoke:supabase` after every migration batch.

### Data import

- Validate exports with `--validate` and `--dry-run` before `--import`.
- Service role key is for one-time local import only; remove from `.env.local` when done.

---

## GitHub Deployment Instructions (Owner)

### Prerequisites

- [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated as `carlolidres`
- Node.js 22+ and npm
- Supabase project created and migrations applied (001 → 018)
- `.env.local` filled from `.env.example`

### Step 1 — Commit and push all changes

```powershell
cd "C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React"

git add -A
git commit -m "v36: complete migration parity and deployment readiness"
git push -u origin main
```

If `main` does not exist locally, create it from current branch or rename as needed.

### Step 2 — Apply Supabase migrations

In [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor, run each file in `supabase/migrations/` in numeric order (001, 002, 007, 008, 009, 010 … 018). Skip 003–006.

Or link Supabase CLI and run `supabase db push` on an empty linked project.

### Step 3 — Configure Supabase Auth URLs

**Authentication → URL Configuration:**

| Setting | Value |
|---------|-------|
| Site URL | `https://carlolidres.github.io/ProjectTracker_React/` |
| Redirect URLs | `https://carlolidres.github.io/ProjectTracker_React/**` |
| Local dev | `http://localhost:5173/ProjectTracker_React/**` |

### Step 4 — Bootstrap Admin and seed users

1. Sign up through the app or create user in Supabase Auth.
2. Run Admin bootstrap SQL from `supabase/STANDALONE_SETUP.md`.
3. Add `SUPABASE_SERVICE_ROLE_KEY` and `DUMMY_USER_PASSWORD` to `.env.local` (local only).
4. Run `npm run seed:auth-users`.
5. Remove service role key from `.env.local` when finished.

### Step 5 — Sync GitHub secrets and enable Pages

```powershell
.\scripts\setup-github.ps1
```

This sets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` repository secrets and enables GitHub Pages (Actions source).

### Step 6 — Deploy

Push to `main` triggers `.github/workflows/deploy.yml` automatically.

Monitor: GitHub → **Actions** → “Deploy to GitHub Pages”.

Live URL: **https://carlolidres.github.io/ProjectTracker_React/**

Manual re-deploy: Actions → workflow → **Run workflow**.

### Step 7 — Post-deploy verification

```bash
npm run verify:supabase
npm run smoke:supabase
```

In the browser:

1. Login and signup (pending user blocked).
2. Admin approves a test user.
3. Create/edit project — date adjustment modal on changed dates.
4. Dashboard counts match database drill-down filters.
5. Lessons Learned shows entries with Lesson ID.
6. Export on each major page.

### Step 8 — Optional data import

1. Export Google Sheet tabs to `exports/` (see `exports/README.md`).
2. `npm run migrate:validate`
3. `npm run migrate:dry-run`
4. `npm run migrate:import`

---

## Next Steps (Post-Go-Live)

1. Commit and push version 36 changes.
2. Apply migrations 010–018 if not yet applied.
3. Run deployment steps above.
4. Import legacy sheet data when ready.
5. Monitor audit trail and Lessons Learned in production.
6. Consider code-splitting to reduce bundle size warning.

---

## Git Traceability

- Commit: *(pending — owner should commit working tree)*
- Commit message: `v36: complete migration parity and deployment readiness`
- Commit hash: *(pending)*

After committing, record hash with:

```powershell
git log -1 --format="%H"
```

Then add a follow-up commit if using the v35 hash-recording pattern:

```powershell
git commit -m "v36: record commit hash in handoff" -- agent-history/version-36-handoff.md
```

---

## Reviewers Feedback

- **Instructions:** always add this section at the end of Markdown files to allow reviewers to provide feedback. If none is provided, this section will be skipped.
- **Reviewers:** @carlo-mauring
- **Comments:**
