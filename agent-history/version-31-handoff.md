# Version 31 Handoff - Co-Hosted DB Alignment and Smoke Test

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-12

Previous Version: `agent-history/version-30-handoff.md`

Project Status: **Project Tracker tables operational on CNF Tracker Ver 2.0; authenticated reads/writes verified**

---

## What Was Requested

Execute v30 next steps per reviewer feedback: continue migration plan, align notifications schema, run Phase 2 authenticated verification, and smoke test core Supabase operations.

---

## What Was Implemented

### Database migrations (Supabase CLI → `byhxwretspcxrrkvovgq`)

- **`005_pt_notifications_and_rls_bridge.sql`**
  - Created `pt_notifications` table (Project Tracker FG Month alerts; separate from legacy CNF `notifications`)
  - Added `pt_current_user_role()` and helper functions mapping legacy CNF roles (`Admin`, `AM`, `PP`, etc.) to Project Tracker roles (`admin`, `am_bm_pl`, `pp`, etc.)
  - Updated Project Tracker RLS policies on `cnf_projects`, `support_activities`, `audit_logs`, `registry`, `admin_messages` to use role bridge

- **`006_pt_table_grants.sql`**
  - Granted `authenticated` role table privileges on Project Tracker tables
  - Fixed root cause of `42501 permission denied` (RLS policies existed but table grants were missing)

### Application code

- **`src/lib/roleMapping.ts`** — normalizes legacy CNF profile roles to Project Tracker `UserRole` in the frontend
- **`src/lib/auth.ts`** — applies role normalization in `fetchProfile()`
- **`src/services/notificationService.ts`** — switched from legacy `notifications` to `pt_notifications`

### Tooling

- **`scripts/smoke-test-supabase.ts`** — authenticated CRUD smoke test (read projects, insert/delete test row)
- **`scripts/verify-supabase.ts`** — added `pt_notifications` to table list; clearer authenticated RLS labels
- **`package.json`** — added `npm run smoke:supabase`
- **`.cursor/plan/project_tracker_migration_36f9948d.plan.md`** — updated current status and v31 phase

---

## Verification Result

| Check | Result |
|---|---|
| `npm run verify:supabase` Phase 1 | **Pass** — 8 tables |
| `npm run verify:supabase` Phase 2 | **Pass** — all 8 tables authenticated read |
| `npm run smoke:supabase` | **Pass** — read + insert + delete on `cnf_projects` |
| `npm run build` | **Pass** |
| `scripts/setup-github.ps1` | **Pass** — secrets synced to GitHub |
| Service role in frontend | **None** |

Smoke test user: `carlolidres@gmail.com` (role `Admin` → normalized to `admin`)

---

## Assumptions

- CNF Tracker Ver 2.0 (`byhxwretspcxrrkvovgq`) remains the shared Supabase host
- Legacy CNF `notifications` table is untouched; Project Tracker uses `pt_notifications`
- Profile roles in the host DB use CNF values (`Admin`, `AM`, `PP`, etc.); frontend maps them at read time

---

## Risks

- **Dual notification systems**: CNF Tracker bell vs Project Tracker bell may show different data if both apps are used on the same project
- **Role mapping edge cases**: Users with `pending` role or unmapped values default to `view` in the frontend but may still fail RLS write checks
- **GitHub secrets**: May still reference old project ref until `scripts/setup-github.ps1` is run

---

## Lessons Learned

- Supabase RLS policies alone are insufficient if `GRANT` privileges are missing on new tables (`42501` vs RLS block)
- Co-hosted databases require separate tables or schema adapters when legacy and migrated apps share one project
- Verify scripts should distinguish missing tables, missing grants, and RLS blocks

---

## Next Steps

1. Confirm Supabase Auth redirect URL in dashboard: `https://carlolidres.github.io/ProjectTracker_React/`
2. Browser smoke test: login → dashboard → create project → notification refresh → audit trail → export
3. Optional: run Google Sheets import via `scripts/migrate-sheets-to-supabase.ts` (service role key local only)

---

## Git Traceability

- Commit: v31: align co-hosted Supabase schema and verify authenticated access
- Commit message: v31: align co-hosted Supabase schema and verify authenticated access
- Commit hash: e87c506

---

## Reviewers Feedback

- **Instructions:** always add this section at the end of Markdown files to allow reviewers to provide feedback. If none is provided, this section will be skipped.
- **Reviewers:** @carlo-mauring
- **Comments:**
