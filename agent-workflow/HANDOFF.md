# Current Handoff

Last Updated: `2026-06-22 UTC`
Version: `critical bug fix pending PR`
Branch: `cursor/critical-bug-investigation-1b68`
Commit: `7da7f9c`
Deployment: `GitHub Pages deploy succeeded (run 27951964986) at https://carlolidres.github.io/ProjectTracker_React/`

## Current Status

Critical bug automation found and fixed a CNF Tracker data-loss regression from draft persistence: explicit `#/cnf-tracker?id=...` loads now fetch Supabase first instead of restoring a matching local draft that could overwrite newer tracker state on save.

## Recently Completed

- Initialized the root `agent-workflow/` continuity files from the reference workflow, adapted for React, Vite, Supabase, Ant Design, HashRouter, and GitHub Pages.
- Reworked root `AGENTS.md` into a project-specific instruction router that preserves historical handoffs and uses this current handoff for routine continuity.
- Applied the reference workflow's reliability guardrails to `AGENTS.md`, adapted away from the reference SQLite/workflow-app assumptions and toward this project's Supabase and GitHub Pages constraints.
- Added the reference `workflow-app/` as a local workflow approval/comment/planning/review/deployment/maintenance/audit tool, excluding runtime SQLite state.
- Added `project-templates/version-0-baseline-builder.md`, `project-files/.gitkeep`, workflow-app commands, maps, and baseline-safety guardrails.
- Fixed project navigation/load bugs from workflow-app maintenance record `f1d2d12b-0d4f-46cd-8bdd-f6877a2eab81`.
- Fixed CNF Tracker explicit ID loading so stale local drafts cannot replace the active database record, and invalid tracker IDs reset the form instead of leaving stale state visible.

## Active Work

- Objective: `Investigate recent commits for critical correctness bugs and fix only high-confidence issues.`
- Progress: `CNF Tracker stale-draft overwrite bug fixed, committed, pushed, typechecked, and build-verified.`
- Remaining: `Open PR for the critical bug fix.`

## Reliability Snapshot

- Acceptance criteria: `PASSED` - `Critical bug fixed; typecheck and build passed.`
- Instruction conflicts: `NONE`
- Repository status: `CLEAN before handoff update` - `fix commit pushed to origin/cursor/critical-bug-investigation-1b68.`
- Build/database/runtime status: `VERIFIED_LOCAL` - `npm run typecheck` and `npm run build` passed after `npm ci`.
- Last known working state: `7da7f9c on feature branch; production deployment not run.`

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
- Decision: `When CNF Tracker ?id= is present, always load from Supabase and clear any local CNF draft; draft restore is only for the blank CNF Tracker route.`
- Decision: `Keep year-based PROJ-YYYY-### generation in existing getNextProjectId(); no schema change in this pass.`
- Decision: `Use agent-workflow/HANDOFF.md for routine current status and preserve agent-history for durable checkpoints only.`
- Decision: Workflow-app baseline approval/restore must not be used unless the owner explicitly intends to revise `agent-history/version-0-baseline.md`.
- `ponytail:` `Extended ProjectIdLink with optional label instead of adding a separate PO-link component.`

## Context Refresh

| Checkpoint | Files changed | Verification status | Open assumptions | Remaining work |
|---|---|---|---|---|
| `Project navigation bug fix` | `ProjectEntryPage.tsx`, `CnfTrackerPage.tsx`, `project-id-link.tsx`, `projectService.ts`, `PLAN.md`, `HANDOFF.md` | `typecheck/build passed; browser smoke NOT_RUN` | `Owner bug report matches draft-over-DB and external-link navigation failures` | `Browser smoke; optional commit` |
| `Critical CNF Tracker draft overwrite fix` | `src/features/cnf-tracker/CnfTrackerPage.tsx`, `agent-workflow/HANDOFF.md` | `typecheck/build passed after npm ci` | `No automated browser test harness exists` | `Open PR` |

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
| Smoke/manual | NOT_RUN | Browser verification on live site pending. |
| Deployment | NOT_RUN | Feature branch PR pending; production deployment not run. |

## Supabase Sync

- Migration changed: `NONE`
- Applied to Supabase: `NONE`
- Verification command/result: `N/A`
- Rollback: `Revert navigation fix commits if needed`

## Next Action

`Browser-smoke project navigation on https://carlolidres.github.io/ProjectTracker_React/ (Projects Database and CNF Tracker PO links).`

Historical evidence: `agent-history/version-64-handoff.md`
