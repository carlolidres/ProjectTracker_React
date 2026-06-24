# Version 62 Handoff - Prevent Project Edit Draft Duplicate Inserts

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-18

Previous Version: `agent-history/version-61-handoff.md`

Project Status: **v62 - Critical project draft restore bug fixed**

---

## What Was Requested

Run the deep bug-finding automation against recent commits, surface only high-severity correctness issues, and implement a minimal fix only when the bug is concrete and high-confidence.

---

## Critical Bug Found

An edit draft introduced in v61 could be restored on the bare `/projects` route with no `projectId` query parameter. The save handler uses the route query to decide whether to create or update, so saving that restored edit draft on `/projects` called `saveProject` as a new-project insert while retaining the existing `project_id`.

### Impact

If the existing project did not trip the SO-number duplicate guard (for example blank/N/A SO values or a changed SO value), the app could insert new active PO rows under an already-used project ID. Because `cnf_projects.project_id` is intentionally non-unique across PO lines, the database did not prevent this duplicate active project identity.

---

## Root Cause

v61 intentionally persisted drafts for both new and edit Project Entry forms, but the no-query route restored any project draft:

```text
/projects + draft(projectIdParam = PROJ-YYYY-NNN) -> restore draft
handleSave sees no projectIdParam -> saveProject(...)
saveProject trusts payload.project_id -> insert active rows with existing project_id
```

---

## What Was Implemented

| Area | Change |
|------|--------|
| `ProjectEntryPage.tsx` | When a draft belongs to an existing project and the user lands on `/projects`, restore the draft and replace the URL with `?projectId=<draft project>` so subsequent saves use the update path. |
| `projectService.ts` | Added a service-layer `assertProjectIdAvailable` guard so `saveProject` rejects creation when active rows already exist for the requested `project_id`. |

---

## What Was Not Implemented

- No broad draft-storage refactor.
- No automated tests were added because the repository currently has no test runner or existing unit test setup.
- No dependency replacement for the existing `xlsx` audit advisory.

---

## Problems Encountered

- `npm run build` initially failed because `node_modules` was not installed (`tsc: not found`); fixed by running `npm ci`.
- `npm audit --omit=dev` reports one high-severity advisory in `xlsx` with no npm fix available; this was not introduced by v62.
- `graphify update . --force` could not run because `graphify` is not installed in the environment.

---

## Lessons Learned

- Draft origin must be treated as part of the route state. Restoring an edit draft on a create route can change a safe update into a destructive create.
- Service-layer project creation should defend against reused project IDs even when the UI is expected to generate fresh IDs.

---

## Assumptions

- Redirecting `/projects` to the draft's existing `projectId` is preferable to silently discarding the edit draft.
- Active duplicate `project_id` values are never valid across separate project create operations; repeated `project_id` values remain valid only for PO lines belonging to the same saved project.

---

## Risks

- A user who intended to start a fresh project after leaving an edit draft will first be returned to the edit draft. They can still use the clear/reset flow, but this avoids silent data corruption.
- Concurrent users can still generate the same next project ID client-side; the new service guard converts that race into a safe save error instead of duplicate active records.

---

## Verification

- `npm ci` - passed.
- `npm run build` - passed (TypeScript + Vite).
- `npm audit --omit=dev` - reports existing `xlsx` high-severity advisory with no fix available.
- `graphify update . --force` - not run; `graphify` command unavailable in environment.

---

## Git Traceability

- Commit message: `v62: prevent project edit drafts from duplicating records`
- Commit hash: `08c4d8d` (`08c4d8dd54d72590b724d54e6c23f703dddfd732`)

---

## Next Steps

1. Manual smoke: edit a project, navigate away, use sidebar Projects link, confirm URL becomes `/projects?projectId=<id>` and save updates existing rows.
2. Manual smoke: create a new project draft on bare `/projects`, navigate away/back, confirm it still restores as a create draft.
3. Consider replacing `xlsx` or isolating export input handling to address the advisory when dependency work is scheduled.

---

## Reviewers Feedback

- **Reviewers:** @carlo-mauring
- **Comments:**
