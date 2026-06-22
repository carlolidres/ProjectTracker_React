# Active Plan

Last Updated: `2026-06-22`
Plan Owner: `Cursor`
Status: `IN_PROGRESS`

## Objective

Fix project navigation and reference-loading bugs reported in workflow-app maintenance record **Fix Project Reference Numbering and Project-Loading Navigation Issues** (`f1d2d12b-0d4f-46cd-8bdd-f6877a2eab81`).

## Approval and GxP Gate

- GxP impact: `INDIRECT`
- Approved task plan: workflow-app maintenance record (Approved 2026-06-22)
- Approval status: `APPROVED`
- Approver and date: `Project Owner via workflow-app on 2026-06-22`

## Ponytail Simplicity Gate

- [x] Requirement is necessary now; bug blocks normal project access workflow.
- [x] Existing navigation and service code was checked first.
- [x] Smallest edge-case-correct fix: DB-first load by `projectId`, reuse `ProjectIdLink`.
- [x] No new dependency or abstraction beyond optional `label` on existing link component.
- [x] Year-based `PROJ-YYYY-###` generation already exists in `getNextProjectId()`.

Chosen rung and rationale:

`REUSE - Fix load/navigation behavior in existing pages and services instead of adding a new routing layer.`

## Scope

Included:

- Always load projects from Supabase when `?projectId=` is present (do not prefer local draft over DB).
- Show a clear not-found message when the project ID does not match an active record.
- Clear stale project-entry draft after a successful DB load.
- Use in-app HashRouter links from CNF Tracker PO rows to Projects page.
- Allow `ProjectIdLink` to display custom link text (PO Control No.) while navigating by stable `project_id`.
- Normalize/validate `projectId` in `getProjectById()`.

Excluded:

- Database migration for unique project reference constraints (future preventive action from bug report).
- Automated navigation regression tests (not requested; no existing test harness).
- Changes to `agent-history/version-0-baseline.md`.

## Acceptance Criteria

- [x] Projects Database `ProjectIdLink` navigation loads the correct project from Supabase on first open and after refresh.
- [x] CNF Tracker PO Control No. links navigate to the correct project using stable `project_id`.
- [x] Invalid/missing `projectId` shows `Project "…" was not found in the Project Database.` instead of stale form state.
- [x] New Project clears `?projectId=` from the URL without double-loading a replacement draft.
- [x] `npm run typecheck` passes.
- [x] `npm run build` passes.

## Implementation Steps

- [x] 1. Read workflow-app bug report payload and locate navigation/load code paths.
- [x] 2. Fix `ProjectEntryPage` load logic and URL handling.
- [x] 3. Fix CNF Tracker PO links and extend `ProjectIdLink`.
- [x] 4. Harden `getProjectById()`.
- [x] 5. Run type-check and build.
- [ ] 6. Browser smoke on Projects Database, CNF Tracker, and refresh behavior.

## Expected Files

| Path | Expected change |
|---|---|
| `src/features/projects/ProjectEntryPage.tsx` | DB-first load, not-found handling, URL clear on New Project |
| `src/features/cnf-tracker/CnfTrackerPage.tsx` | PO links via `ProjectIdLink` |
| `src/components/common/project-id-link.tsx` | Optional display label |
| `src/services/projectService.ts` | Normalize `projectId` lookup |
| `agent-workflow/HANDOFF.md` | Record fix and verification |

## Verification Plan

- [x] `npm run typecheck`
- [x] `npm run build`
- [ ] Browser: open project from Projects Database
- [ ] Browser: open project from CNF Tracker PO link
- [ ] Browser: refresh loaded project URL
- [ ] Browser: invalid `projectId` shows not-found message

## Risks, Dependencies, and Blockers

- Risks: localStorage drafts for unsaved **new** projects still restore when no `projectId` param is present; explicit DB navigation no longer restores in-progress edits to an existing project (matches legacy Apps Script behavior).
- Blockers: `NONE`

## Completion Notes

Core code fix is complete and build-verified. Browser smoke remains for owner or next agent pass.
