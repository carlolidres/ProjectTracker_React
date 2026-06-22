# Current Handoff

Last Updated: `2026-06-22 Asia/Taipei`
Version: `v64 historical checkpoint; project navigation bug fix in progress`
Branch: `main`
Commit: `0ba4ced`
Deployment: `GitHub Pages workflow is the deployment path; not redeployed for this fix yet`

## Current Status

Workflow-app maintenance record **Fix Project Reference Numbering and Project-Loading Navigation Issues** was triaged and implemented in source. Project loading now always fetches from Supabase when `?projectId=` is present, shows a not-found message for invalid IDs, and CNF Tracker PO links use in-app navigation by stable `project_id`. Year-based `PROJ-YYYY-###` generation was already present in `getNextProjectId()`.

## Recently Completed

- Initialized the root `agent-workflow/` continuity files from the reference workflow, adapted for React, Vite, Supabase, Ant Design, HashRouter, and GitHub Pages.
- Reworked root `AGENTS.md` into a project-specific instruction router that preserves historical handoffs and uses this current handoff for routine continuity.
- Applied the reference workflow's reliability guardrails to `AGENTS.md`, adapted away from the reference SQLite/workflow-app assumptions and toward this project's Supabase and GitHub Pages constraints.
- Added the reference `workflow-app/` as a local workflow approval/comment/planning/review/deployment/maintenance/audit tool, excluding runtime SQLite state.
- Added `project-templates/version-0-baseline-builder.md`, `project-files/.gitkeep`, workflow-app commands, maps, and baseline-safety guardrails.
- Fixed project navigation/load bugs from workflow-app maintenance record `f1d2d12b-0d4f-46cd-8bdd-f6877a2eab81`.

## Active Work

- Objective: `Resolve workflow-app bug report for project navigation and reference loading.`
- Progress: `Code fix complete; typecheck and build passed.`
- Remaining: `Browser smoke on Projects Database, CNF Tracker PO links, refresh, and invalid projectId. Optionally commit if owner requests.`

## Reliability Snapshot

- Acceptance criteria: `PARTIAL` - `Build/typecheck passed; browser smoke not run in this pass.`
- Instruction conflicts: `NONE`
- Repository status: `DIRTY` - `Navigation fix plus prior workflow docs/app files remain uncommitted.`
- Build/database/runtime status: `BUILD_VERIFIED` - `npm run typecheck` and `npm run build` passed after navigation fix.`
- Last known working state: `v64 stable rollback state recorded in agent-history/version-64-handoff.md; navigation fix not browser-smoked yet.`

## Minimal Read Set for the Next Agent

List no more than five task-specific files; omit standard startup files.

| Path | Reason |
|---|---|
| `src/features/projects/ProjectEntryPage.tsx` | Project load/navigation fix. |
| `src/features/cnf-tracker/CnfTrackerPage.tsx` | CNF Tracker PO-to-project links. |
| `src/components/common/project-id-link.tsx` | Shared project navigation link. |
| `agent-workflow/PLAN.md` | Active bug-fix acceptance criteria. |
| `workflow-app/data/workflow.sqlite3` | Local bug report / maintenance record source (ignored by git). |

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Medium | Browser smoke for navigation fix not performed. | Runtime behavior unverified in browser. | Run checks in `agent-workflow/BROWSER_TESTING.md` for Projects Database and CNF Tracker links. |
| Medium | v64 notes possible orphaned seed-related `audit_logs` rows because deletion was denied. | Historical audit noise may remain after rollback. | Decide whether cleanup matters, then apply a targeted grant/cleanup plan if approved. |
| Low | There is no lint script in `package.json`. | Agents cannot run a dedicated lint check. | Use `npm run typecheck` and `npm run build`; add lint only if accepted as a future task. |

## Decisions and Simplifications

- Decision: `When ?projectId= is present, always load from Supabase; do not restore local draft over explicit navigation.`
- Decision: `Keep year-based PROJ-YYYY-### generation in existing getNextProjectId(); no schema change in this pass.`
- Decision: `Use agent-workflow/HANDOFF.md for routine current status and preserve agent-history for durable checkpoints only.`
- Decision: Workflow-app baseline approval/restore must not be used unless the owner explicitly intends to revise `agent-history/version-0-baseline.md`.
- `ponytail:` `Extended ProjectIdLink with optional label instead of adding a separate PO-link component.`

## Context Refresh

| Checkpoint | Files changed | Verification status | Open assumptions | Remaining work |
|---|---|---|---|---|
| `Project navigation bug fix` | `ProjectEntryPage.tsx`, `CnfTrackerPage.tsx`, `project-id-link.tsx`, `projectService.ts`, `PLAN.md`, `HANDOFF.md` | `typecheck/build passed; browser smoke NOT_RUN` | `Owner bug report matches draft-over-DB and external-link navigation failures` | `Browser smoke; optional commit` |

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
- Trigger: `NONE`
- Repair attempts: `0`
- Original objective: `Fix workflow-app bug report for project loading/navigation`
- Changes already made: `DB-first project load, not-found message, CNF Tracker in-app links`
- Errors encountered: `NONE`
- Confirmed findings: `ProjectEntryPage restored local draft when projectIdParam matched; CNF Tracker used external hash URL links`
- Unverified assumptions: `Browser behavior matches build-time fix`
- Files affected: `src/features/projects/ProjectEntryPage.tsx`, `src/features/cnf-tracker/CnfTrackerPage.tsx`, `src/components/common/project-id-link.tsx`, `src/services/projectService.ts`
- Recommended next action: `Browser smoke, then commit if accepted`
- Approval needed: `NO`

## Verification

| Check | Status | Result |
|---|---|---|
| Lint | N/A | No lint script is currently defined. |
| Type-check | PASSED | `npm run typecheck` |
| Tests/self-check | NOT_RUN | No automated navigation tests exist. |
| Build | PASSED | `npm run build` |
| Smoke/manual | NOT_RUN | Browser verification pending. |
| Deployment | NOT_RUN | No deployment requested. |

## Supabase Sync

- Migration changed: `NONE`
- Applied to Supabase: `NONE`
- Verification command/result: `N/A`
- Rollback: `Revert navigation fix commits if needed`

## Next Action

`Browser-smoke Projects Database and CNF Tracker project links, then commit if the owner wants a checkpoint.`

Historical evidence: `agent-history/version-64-handoff.md`
