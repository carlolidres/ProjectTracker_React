# Standalone Supabase Setup — Project Tracker Only

Use this when resetting from the co-hosted **CNF Tracker Ver 2.0** database.

## Why a separate project

The legacy Google Apps Script app is a **standalone Project Tracker**. Co-hosting with CNF Tracker introduced:

- Wrong `notifications` schema (`pt_notifications` workaround)
- CNF role bridge (`Admin`, `AM`, `PP` vs `am_bm_pl`, `admin`)
- Mixed RLS and missing GRANTs

## Steps

### 1. Create a new Supabase project

In [Supabase Dashboard](https://supabase.com/dashboard):

1. **New project** → name e.g. `ProjectTracker`
2. Save the project URL and anon key

### 2. Apply migrations (in order)

Run via SQL editor or `supabase db push` on a linked **empty** project:

| Order | File | Purpose |
|-------|------|---------|
| 1 | `supabase/migrations/001_initial_schema.sql` | Core tables matching Google Sheet headers |
| 2 | `supabase/migrations/002_rls_policies.sql` | Base RLS + `user_role` enum |
| 3 | `supabase/migrations/007_standalone_grants.sql` | Table GRANTs for PostgREST |
| 4 | `supabase/migrations/008_standalone_open_access.sql` | Open authenticated access (matches GAS) |
| 5 | `supabase/migrations/009_auth_admin_approval.sql` | Signup approval, active-user RLS, Admin user management |
| 6 | `supabase/migrations/010_profile_settings.sql` | Profile display settings |
| 7 | `supabase/migrations/011_password_reset_requests.sql` | Password reset requests |
| 8 | `supabase/migrations/012_po_order_fields.sql` | PO order quantity and UoM fields |
| 9 | `supabase/migrations/013_app_feedback.sql` | App feedback table |
| 10 | `supabase/migrations/014_app_feedback_policy_fix.sql` | Feedback RLS fix |
| 11 | `supabase/migrations/015_app_feedback_block_admin_insert.sql` | Feedback insert policy |
| 12 | `supabase/migrations/016_registry_admin_only.sql` | Registry admin-only writes |
| 13 | `supabase/migrations/017_lessons_learned.sql` | Lessons learned (date adjustments) |
| 14 | `supabase/migrations/018_lesson_id.sql` | Human-readable lesson IDs |

**Do not apply** `003`–`006` (co-hosting / CNF Tracker only).

### 3. Configure Auth

1. **Authentication → URL Configuration**
   - Site URL: `https://carlolidres.github.io/ProjectTracker_React/`
   - Redirect URLs: `https://carlolidres.github.io/ProjectTracker_React/**`
   - Local dev: `http://localhost:5173/ProjectTracker_React/**`

2. Create the first user through the app signup page or **Authentication → Users**.

3. Bootstrap the first Admin in SQL. This manual step is required because all new accounts start pending:

```sql
update public.profiles
set role = 'admin',
    requested_role = 'admin',
    status = 'active',
    approved_at = now()
where email = 'your@email.com';
```

4. Sign in as the Admin and open **User Management** to approve subsequent accounts.

Migration `009` preserves the legacy app's shared feature access for active users while blocking pending and inactive accounts at both the UI and RLS layers.

### 4. Update local env

`.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_BASE_PATH=/ProjectTracker_React/
VERIFY_SUPABASE_EMAIL=your@email.com
VERIFY_SUPABASE_PASSWORD=your_password
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DUMMY_USER_PASSWORD=use-a-strong-temporary-password
```

### 5. Verify

```bash
npm run verify:supabase
npm run smoke:supabase
npm run build
```

### 6. Seed role-covering dummy users

The seeding script requires the service role key locally and never sends it to the frontend:

```bash
npm run seed:auth-users
```

It creates or updates:

- The Admin account from `VERIFY_SUPABASE_EMAIL` and `VERIFY_SUPABASE_PASSWORD`
- One active dummy account for each non-Admin role
- Dummy addresses under `example.test`

Remove `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` after seeding if it is no longer needed.

### 7. Sync GitHub Pages secrets

```powershell
.\scripts\setup-github.ps1
```

### 8. Deploy to GitHub Pages

1. Commit and push to `main`:
   ```powershell
   git add -A
   git commit -m "v36: complete migration parity and deployment readiness"
   git push -u origin main
   ```
2. GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys automatically.
3. Live site: `https://carlolidres.github.io/ProjectTracker_React/`
4. Re-run deploy manually: GitHub → Actions → **Deploy to GitHub Pages** → Run workflow.

Full deployment checklist: `agent-history/version-36-handoff.md` § GitHub Deployment Instructions.

## Sheet data import (later)

Only after UI behavior matches `sampleApp` (see `reference/legacy-gap-checklist.md`):

1. Export `PROJECTS` and `SUPPORT_ACTIVITIES` tabs to `exports/`
2. `npm run migrate:validate`
3. `npm run migrate:dry-run`
4. `npm run migrate:import`
