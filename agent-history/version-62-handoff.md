# Version 62 Handoff - Critical CNF Tracker RLS and Draft Baseline Fixes

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-17

Previous Version: `agent-history/version-61-handoff.md`

Project Status: **v62 - Critical permission bypass and restored edit draft save blocker fixed**

---

## What Was Requested

Run a deep bug-finding automation against recent commits, focusing only on critical correctness issues with concrete trigger scenarios. If a critical bug was found, implement a minimal high-confidence fix and validate it.

---

## Critical Bugs Found and Impact

### 1. CNF Tracker RLS allowed unauthorized writes

- **Impact:** Any active authenticated user could bypass frontend role restrictions and directly insert or update `cnf_tracker_records` through Supabase, including View, AM/BM/PL, PP, TSD, and QC users.
- **Concrete trigger:** A non-editor user with an active account uses the browser console or their authenticated Supabase session to write directly to `cnf_tracker_records`.
- **Root cause:** Migration 027 allowed CNF Tracker INSERT and UPDATE for any `public.is_active_user()`, while the UI only allowed Admin, QA, and VAL through `canEditCnfTracker`.
- **Fix:** Added migration `029_cnf_tracker_editor_rls.sql` to replace the broad CNF Tracker write policies with Admin/QA/VAL-only policies using `public.pt_current_user_role()`.

### 2. Restored Project Entry edit drafts lost the server baseline

- **Impact:** Existing project edits restored from local draft could fail on save when date fields had changed, because the UI skipped the date-adjustment confirmation and the service rejected the update.
- **Concrete trigger:** Open an existing project, change a tracked saved date, navigate away and back so the draft restores, then save.
- **Root cause:** v61 set `baselineProjectRef` to the restored draft itself. The UI saw no date changes, but `updateProject()` reloaded the persisted server record and still required `dateAdjustmentsConfirmed`.
- **Fix:** Project Entry now fetches the persisted project for edit URLs before restoring a matching draft, uses the server project as the baseline, and uses server FG Month state for saved FG Month checks.

---

## Files Changed

| File | Change |
|------|--------|
| `src/features/projects/ProjectEntryPage.tsx` | Restored edit drafts now keep the persisted project as the save baseline instead of using the draft as its own baseline. |
| `supabase/migrations/029_cnf_tracker_editor_rls.sql` | New migration restricts CNF Tracker INSERT/UPDATE to Admin, QA, and VAL active users. |

---

## What Was Not Implemented

- No broad refactor of CNF Tracker authorization.
- No automated test harness was added because the repository currently has no test framework configured.
- The new Supabase migration was committed but not applied to a live Supabase project from this environment.

---

## Verification

- `npm ci` - passed, restored locked dependencies.
- `npm run build` - passed (TypeScript build and Vite production build).
- `graphify update . --force` - attempted but failed because `graphify` is not installed in this environment.

Notes:

- The Vite build still reports the pre-existing large chunk warning.
- `npm ci` reported one high-severity advisory in the existing dependency tree; this was not changed as part of the critical bug fix.

---

## Assumptions

- CNF Tracker write access should match the frontend editor roles: Admin, QA, and VAL.
- Active authenticated users may continue to SELECT CNF Tracker records.
- Restoring a draft for an existing project should preserve unsaved form edits while comparing save-sensitive fields against the persisted server state.

---

## Risks

- The SQL migration must be applied to Supabase before the CNF Tracker RLS fix protects production data.
- If a restored draft references a project that has been deleted or archived, the page now reports the missing project instead of restoring the stale edit draft.
- No browser smoke test was run for the draft restore modal path.

---

## Git Traceability

- Commit message: `v62: fix CNF Tracker RLS and draft baseline`
- Commit hash: `40d9e54` (`40d9e54c96d7d9a5e8dd10c77c5ca56f988ec15b`)

---

## Next Steps

1. Apply migration `029_cnf_tracker_editor_rls.sql` to the Supabase project.
2. Smoke test CNF Tracker direct write attempts as View and QA users.
3. Smoke test restored Project Entry edit drafts with saved date changes and confirm the date-adjustment prompt appears before save.

---

## Reviewers Feedback

- **Reviewers:** @carlo-mauring
- **Comments:**
