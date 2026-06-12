# Version 35 Handoff - Signup and Admin User Approval Foundation

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-12

Previous Version: `agent-history/version-34-handoff.md`

Project Status: **Auth/admin implementation complete locally; live Supabase migration blocked by missing dashboard or DDL credentials**

---

## What Was Requested

Read `AGENTS.md`, continue from the latest handoff, and execute the next work. Version 34 reviewer feedback requested:

- A signup page
- Admin review and activation of new users
- Admin account setup
- Dummy users covering every Project Tracker role
- Adoption of the referenced CNF security/admin schema where compatible

---

## Current Project Status at Start

- The React migration and legacy realignment changes were present in the working tree.
- `agent-history/version-34-handoff.md` was the latest handoff.
- Google Sheets import remained intentionally paused until legacy UI parity improves.
- `.env.local` pointed to the new standalone Supabase project.
- The new Supabase project was reachable but had no Project Tracker tables.
- Versions 33 and 34 were present but had not been committed.

---

## What Was Implemented

### Signup and account-state UI

- Added account signup to `LoginPage.tsx`.
- Signup captures full name, email, password, and requested role.
- Admin cannot be self-requested in the UI.
- Pending and inactive accounts receive dedicated access-blocked screens.
- Only active profiles can enter protected application routes.

### Admin user management

- Added `/admin/users`.
- Added an Admin-only sidebar item.
- Added profile listing, role assignment, and pending/active/inactive controls.
- Added server-side RPC usage for access updates instead of direct profile writes.
- Prevented an Admin from removing their own active Admin access.

### Supabase security foundation

- Added `supabase/migrations/009_auth_admin_approval.sql`.
- New signups receive:
  - `role = view`
  - requested non-Admin role
  - `status = pending`
- Added active-user and active-Admin helper functions.
- Replaced open authenticated policies with active-account policies.
- Added `auth_activity_log`.
- Added `admin_update_user_access(...)` with Admin verification and audit logging.
- Added first-Admin bootstrap instructions.

### Dummy user seeding

- Added `scripts/seed-auth-users.ts`.
- Added `npm run seed:auth-users`.
- The script uses a local-only service role key.
- It creates or updates:
  - The configured Admin account
  - AM/BM/PL, PP, TSD, VAL, QC, and View dummy users
- Updated `.env.example` and standalone setup documentation.

### Standalone verification correction

- Updated `scripts/smoke-test-supabase.ts` to use `notifications` instead of the obsolete co-hosted `pt_notifications` table.

---

## Verification

| Check | Result |
|---|---|
| `npm run typecheck` | **Pass** |
| `npm run build` | **Pass** |
| Local login page browser smoke test | **Pass** |
| Signup form and non-Admin role choices | **Pass** |
| New Supabase project connectivity | **Pass** |
| Core table existence check | **Fail as expected: project is empty** |
| `npm run seed:auth-users` | **Blocked as expected: service role key and dummy password are missing** |
| Live migration application | **Not run: Supabase dashboard is signed out and no DDL-capable credential is configured** |

Build note: Vite reports the existing large JavaScript chunk warning.

---

## What Was Not Implemented

- Migrations `001`, `002`, `007`, `008`, and `009` were not applied to the live standalone project.
- The first Admin profile was not bootstrapped.
- Dummy role users were not created.
- Live authenticated smoke testing was not possible because the schema does not exist yet.
- Remaining legacy UI parity items from version 34 are still pending.
- Google Sheets import remains deferred.

---

## Problems Encountered

- The Supabase dashboard opened at the sign-in page, so SQL could not be submitted.
- `.env.local` does not contain `SUPABASE_SERVICE_ROLE_KEY`.
- No database password or Supabase personal access token is configured.
- Versions 33 and 34 remain uncommitted and overlap parts of the current working tree.
- `AGENTS.md` requires a commit hash inside the same handoff commit, which is self-referential. Existing repository history uses a separate hash-recording commit.

---

## Assumptions

- The new standalone project reference in `.env.local` is the intended production target.
- Active users should retain the legacy app's shared page access.
- Roles remain meaningful for form ownership and Admin management.
- New users must not access project data before approval.
- Dummy users may use `example.test` email addresses because Supabase Admin can mark them confirmed.

---

## Risks

- The SQL migration has not been executed against a live PostgreSQL instance yet.
- The first Admin requires a controlled manual bootstrap after migrations are applied.
- A service role key bypasses RLS and must remain local-only.
- The current working tree contains older uncommitted changes that should be reconciled before pushing.
- Bundle size remains above Vite's warning threshold.

---

## Lessons Learned

- The reference CNF migrations must be adapted rather than copied because their role names and domain tables differ.
- Pending-account protection must exist in RLS as well as the React route layer.
- Admin access updates are safer through a verified database RPC than direct client table updates.
- Live migration readiness should be checked before assuming a reset Supabase project contains the core schema.

---

## Next Steps

1. Sign in to the Supabase dashboard or configure a DDL-capable local Supabase CLI connection.
2. Apply migrations in order: `001`, `002`, `007`, `008`, `009`.
3. Create the first auth user and run the Admin bootstrap SQL from `supabase/STANDALONE_SETUP.md`.
4. Add local `SUPABASE_SERVICE_ROLE_KEY` and `DUMMY_USER_PASSWORD`.
5. Run `npm run seed:auth-users`.
6. Run `npm run verify:supabase`, `npm run smoke:supabase`, and `npm run build`.
7. Test Admin approval, pending-user denial, inactive-user denial, and all role logins.
8. Continue legacy UI parity work from `reference/legacy-gap-checklist.md`.

---

## Git Traceability

- Commit: *(pending)*
- Commit message: `v35: add signup and admin user approval`
- Commit hash: *(pending)*

---

## Reviewers Feedback

- **Instructions:** always add this section at the end of Markdown files to allow reviewers to provide feedback. If none is provided, this section will be skipped.
- **Reviewers:** @carlo-mauring
- **Comments:**
