# Active Plan

Last Updated: `2026-06-24`
Plan Owner: `Codex`
Status: `IN_PROGRESS`

## Objective

Triage Project Owner feedback added in workflow-app comment `a5634494-89c4-4f95-987d-4976003e0520` on `2026-06-24`, then implement the safe, targeted fixes that can be completed without a broader bulk-edit design.

## Approval and GxP Gate

- GxP impact: `INDIRECT`
- Feedback source: workflow-app maintenance record `f1d2d12b-0d4f-46cd-8bdd-f6877a2eab81`
- Approval status: `OWNER COMMENT / PENDING ITEMS`
- Baseline read: `YES` - security, session behavior, auditability, and database save behavior are affected.

## Ponytail Simplicity Gate

- [x] Session-security fix reuses the existing Supabase auth client and session cleanup helpers.
- [x] Save-flow fix preserves the existing project service and audit path; notification refresh becomes best-effort after a confirmed save.
- [x] Spreadsheet view is not implemented in this small pass because import/bulk edit/direct database save requires a separate data-integrity and audit plan.

Chosen rung and rationale:

`REUSE - tighten existing auth/session and project-save flows instead of adding a new auth system or bypassing project services.`

## Scope

Included:

- Move Supabase auth token persistence from durable local storage to browser session storage.
- Add 15-minute inactivity logout with app-state cleanup, Supabase sign-out, auth-token cleanup, and redirect to `/login`.
- Reset sign-in form fields on login/signup view entry and disable app-level autocomplete hints for the login form.
- Preserve successful project saves when notification refresh fails, while showing a clear warning.
- Record spreadsheet view as pending scoped work.

Excluded:

- Full spreadsheet import/adapt/edit/save UI for Projects and Support Activities.
- Supabase schema or RLS migrations.
- Historical handoff rewrite or baseline change.
- Deployment, commit, or production smoke unless separately requested.

## Acceptance Criteria

- [x] Inactive authenticated sessions expire after 15 minutes and redirect to sign-in.
- [x] Browser session tokens are not persisted in `localStorage`.
- [x] Logout/session-expiry cleanup clears app draft/session state and Supabase auth storage.
- [x] Login form fields are reset when the sign-in/signup view is shown.
- [x] A project insert/update that succeeds is not reported as a failed save solely because notification refresh fails.
- [x] `npm run typecheck` passes.
- [x] `npm run build` passes.

## Pending Spreadsheet View Work

The owner requested:

- `Projects -> Spreadsheet View`
- `Support Activities -> Spreadsheet View`
- Excel import/adapt, multi-record edit, add new rows, and direct save to the application database.

This should be planned as a separate approved task because bulk database edits must preserve validation, role permissions, RLS expectations, audit logging, duplicate checks, date-adjustment controls, and import error handling.

## Expected Files

| Path | Expected change |
|---|---|
| `src/lib/supabaseClient.ts` | Use session storage for Supabase auth persistence. |
| `src/app/auth-provider.tsx` | Add inactivity logout timer and cleanup redirect. |
| `src/features/auth/LoginPage.tsx` | Reset login form fields and avoid app-level credential persistence hints. |
| `src/features/projects/ProjectEntryPage.tsx` | Treat notification refresh as best-effort after successful save. |
| `agent-workflow/HANDOFF.md` | Record feedback triage, changes, verification, and pending spreadsheet work. |

## Verification Plan

- [x] `npm run typecheck`
- [x] `npm run build`
- [ ] Optional browser check: login/session-expiry behavior
- [ ] Optional browser check: save a new project and confirm a downstream notification warning does not erase successful save feedback

## Risks, Dependencies, and Blockers

- Browser password managers may still offer saved credentials outside app control; app state and Supabase auth storage are not retained by the app after logout/session expiry.
- Exact root cause of the owner-observed new-project save failure is not fully reproduced locally yet; the code now avoids a confirmed false-failure path after database save.
- Spreadsheet view needs a separate implementation plan before coding.

## Completion Notes

Session-security fixes are complete and build-verified. Project save failure root cause confirmed: `mapProjectToDb` included flat `risk_control`, which is not a `cnf_projects` column (stored in `cnf_entries_json` only). Removed phantom column; insert verified via `scripts/verify-project-save-map.ts`. Spreadsheet view remains pending separate scoped approval/design.
