# Version 34 Handoff - Legacy Gap Checklist and Standalone Realignment Start

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-12

Previous Version: `agent-history/version-33-handoff.md`

Project Status: **Gap checklist complete; Option 2 realignment started — awaiting new standalone Supabase project**

---

## What Was Requested

Stop sheet import (logic differs from working Google App). Re-read `sampleApp`, learn how the app works, then:
1. **Option 1:** Gap checklist vs legacy
2. **Option 2:** Reset to standalone Project Tracker Supabase + rebuild UI logic

---

## What Was Implemented

### Option 1 — Gap checklist

- **`reference/legacy-gap-checklist.md`** — page-by-page, function-by-function comparison of `sampleApp` vs React
- Documents 13 areas: platform, nav, projects form, database, dashboard, notifications, support, audit, archived, registry, admin messages, ID formats, database reset plan
- **Sheet import stopped** — do not run until UI matches legacy

### Option 2 — Standalone database foundation

- **`supabase/STANDALONE_SETUP.md`** — create new Supabase project; apply `001`, `002`, `007`, `008` only (not `003`–`006` co-hosting)
- **`007_standalone_grants.sql`** — GRANTs for `authenticated` role
- **`008_standalone_open_access.sql`** — open RLS for all authenticated users (matches GAS: no role blocking)

### Option 2 — UI / logic realignment (first wave)

| Change | File(s) |
|--------|---------|
| All nav pages visible (Audit, Archived, Registry) | `sidebar.tsx`, `roleAccess.ts`, `protected-route.tsx` |
| Revert notifications to `notifications` table | `notificationService.ts` |
| Legacy duplicate review (`detectDuplicateValues_`) | `duplicateReview.ts`, `ProjectEntryPage.tsx` |
| Legacy project IDs `PROJ-YYYY-001` | `idGeneration.ts`, `projectService.ts` |
| Legacy support IDs `SPROJ-YYYY-001` | `idGeneration.ts`, `supportActivityService.ts` |
| Clear form + refresh notifications after save | `ProjectEntryPage.tsx` |
| All form fields editable (roles = tabs, not permissions) | `ProjectEntryPage.tsx` |
| Copy from 1st PO includes `cnf_reference` | `ProjectEntryPage.tsx` |

---

## Verification

| Check | Result |
|---|---|
| `npm run build` | **Pass** |

---

## What Was Not Implemented (next phases)

- New standalone Supabase project not created yet (owner action)
- Role tabs on project form (AM/BM/PL, PP, TSD, VAL, QC)
- Multiple CNF entries per PO
- Message to Admin modal
- Auto-refresh every 20s
- View N/A Fields, Expand/Collapse All
- Dashboard drill-down parity
- Google Sheets import (deferred until parity)

See fix order in `reference/legacy-gap-checklist.md` §13.

---

## Owner action — create standalone Supabase

1. Create new Supabase project (Project Tracker only)
2. Apply migrations: `001` → `002` → `007` → `008`
3. Update `.env.local` with new URL + keys
4. Run `npm run verify:supabase` and `npm run smoke:supabase`
5. Run `.\scripts\setup-github.ps1`

Full steps: `supabase/STANDALONE_SETUP.md`

---

## Git Traceability

- Commit: *(pending)*
- Commit message: `v34: legacy gap checklist and standalone realignment start`
- Commit hash: *(pending)*

---

## Reviewers Feedback

- **Reviewers:** @carlo-mauring
- **Comments:**
1. Hi I am done with reseting my supabase project, this is clean and ready for migration.
2. I need also to setup admin account and dummy users covering all user groups.
3. Add a signup page
4. Admin will manage user, new user will review first by admin
5. You can adopt security and admin related schema to this path :
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\reference\migrationsReference\0002_profiles_auth_foundation.sql"
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\reference\migrationsReference\0003_cnf_user_activation_foundation.sql"
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\reference\migrationsReference\0004_admin_user_management_foundation.sql"
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\reference\migrationsReference\0015_authorization_matrix_and_creator_access.sql"

6. And also I want to ensure the google app script UI must be almost the same to the project when migrated. Please refer to the screenhot: 
For Dashboard:
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Dashboard_3.png"
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Dashboard_2.png"
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Dashboard_1.png"

Projects:
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Screenshot 2026-06-12 130531.png"
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Screenshot 2026-06-12 130526.png"
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Screenshot 2026-06-12 130521.png"
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Screenshot 2026-06-12 130515.png"
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Screenshot 2026-06-12 130505.png"
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Screenshot 2026-06-12 130459.png"
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Screenshot 2026-06-12 130449.png"
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Screenshot 2026-06-12 130437.png"

Database:
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Screenshot 2026-06-12 130654.png"

Support Activities:
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Screenshot 2026-06-12 130754.png"

Audit Trail:
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Screenshot 2026-06-12 130858.png"

Archieved:
"C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Screenshot 2026-06-12 130957.png"

