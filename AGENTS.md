# AGENTS.md

## Purpose

This is the canonical instruction router for AI coding agents working in Project Tracker.

Use it to load a small, useful context set before making changes. Do not scan the whole repository or load every historical handoff by default.

---

## Required Startup

Before modifying code or project workflow files:

1. Read this file.
2. Read `agent-workflow/CONTEXT.md`.
3. Read `agent-workflow/HANDOFF.md`.
4. Read only the task-specific workflow file below.
5. Read `agent-workflow/PONYTAIL.md` once per coding session if its rules are not already in context.
6. Inspect only the directly affected source, migration, script, or documentation files.

| Task | Additional file |
|---|---|
| Source code, UI, routing, components | `agent-workflow/CODEMAP.md` |
| Supabase, migration, reporting, API data flow, RLS | `agent-workflow/DATA_MAP.md` |
| Accepted implementation work | `agent-workflow/PLAN.md` |
| Browser evidence or runtime verification | `agent-workflow/BROWSER_TESTING.md` |
| Approved requirements, architecture, security, GxP, roles, audit, retention | `agent-history/version-0-baseline.md` |
| Historical regression investigation | Only the relevant `agent-history/version-*-handoff.md` |

Also track project progress against:

```text
.cursor/plan/project_tracker_migration_36f9948d.plan.md
```

The baseline remains immutable unless the project owner explicitly approves a revision. Historical files in `agent-history/` are records, not working notes.

---

## Agent Reliability Guardrails

The agent must prevent context loss, uncontrolled changes, repeated failures, and unsupported assumptions while preserving the token-efficient startup model.

### Preflight Before Implementation

Before making changes, the agent must:

1. Restate the task objective and acceptance criteria in `agent-workflow/PLAN.md` or the working response when the task is small.
2. Identify the files expected to be modified and inspect their current implementation before editing.
3. Check current repository, build, Supabase, and runtime status using the smallest applicable commands or recorded evidence.
4. Read the latest relevant task history, open issues, comments, and handoff notes from `agent-workflow/HANDOFF.md`, `agent-workflow/PLAN.md`, and only the applicable versioned handoff or issue reference.
5. Check whether the approved baseline applies. Read the relevant baseline section for accepted implementation work, and read the full `agent-history/version-0-baseline.md` when a baseline trigger applies, the active plan requires it, or the task may conflict with approved requirements.
6. Confirm that no instruction conflicts or missing essentials block safe implementation.

Do not begin implementation when essential information is missing, contradictory, or unverifiable. Ask for clarification or record the blocker instead.

### Execution Guardrails

During execution, the agent must:

- Make the smallest change necessary to complete the approved task.
- Avoid modifying unrelated files or generated outputs.
- Validate each significant change before continuing to a larger change.
- Use existing project conventions, reusable components, standard libraries, native features, and installed dependencies before adding new code.
- Never guess table names, routes, schemas, environment variables, configuration keys, dependencies, or business rules.
- Inspect the actual implementation before making assumptions.
- Record important decisions, errors, failed attempts, and meaningful changes in `agent-workflow/HANDOFF.md` or the relevant versioned handoff.
- Preserve the last known working state before risky changes by reviewing repository status and avoiding destructive commands unless explicitly approved.

### Dumb-Zone Detection

Stop execution and switch to recovery when any of the following occurs:

- The same error happens repeatedly.
- A previous fix creates additional unrelated errors.
- The agent can no longer clearly explain the current project state.
- The requested task conflicts with the approved baseline or active plan.
- A required file, table, route, dependency, environment variable, or configuration cannot be verified.
- Tests or checks that previously passed begin failing unexpectedly.
- The agent is about to perform a large rewrite for a small issue.
- More than three unsuccessful repair attempts have been made.
- The agent cannot clearly explain why the proposed change should work.

### Recovery Procedure

When a dumb-zone condition is detected, the agent must:

1. Stop making further changes.
2. Return to the last known working state only when safe and non-destructive, or request approval for destructive recovery.
3. Review the latest applicable baseline, active plan, handoff, task history, and modified files.
4. Run the relevant build, type-check, Supabase, migration, smoke, and test commands when available.
5. Separate confirmed root cause from assumptions.
6. Prepare a recovery summary with original objective, changes made, errors encountered, confirmed findings, unverified assumptions, files affected, and recommended next action.
7. Request user approval when recovery requires a scope change, architectural decision, destructive action, database migration, deployment, or baseline change.

### Context Refresh Checkpoint

After a major stage, several file edits, failed verification, or a long debugging branch, refresh understanding by reviewing:

- current task objective;
- approved requirements and active plan;
- files changed;
- test and build results;
- open issues and assumptions;
- remaining work.

Do not rely only on earlier conversation context when the project state may have changed.

---

## Context-Efficiency Rules

- Use targeted search instead of repository-wide inspection.
- Do not reopen files whose relevant content is already known.
- Do not load dependencies, generated builds, logs, archives, or data exports unless required.
- Use `CODEMAP.md` to locate source code and `DATA_MAP.md` to locate data structures.
- Read the baseline only when a baseline trigger applies.
- Read comments, open issues, and task history from the smallest available source: usually `HANDOFF.md`, `PLAN.md`, a referenced issue, or one relevant versioned handoff.
- Keep outputs focused on decisions, changes, verification, risks, and blockers.
- Prefer deletion, reuse, native features, standard libraries, and already-installed dependencies before adding code.
- Do not create a new abstraction, helper, dependency, document, or file unless it has a clear present use.

---

## Baseline and History Rules

Always:

- Preserve `agent-history/version-0-baseline.md` as the approved baseline.
- Preserve all existing `agent-history/version-*-handoff.md` files as historical records.
- Read the latest relevant versioned handoff only when the task needs historical context, rollback evidence, release status, migration state, or compliance traceability.
- Create a new versioned handoff only for meaningful completed implementation work, releases, migrations, deployment checkpoints, rollback events, or when explicitly requested.
- Keep routine current-state updates in `agent-workflow/HANDOFF.md`.

Never:

- Delete, rewrite, renumber, or backfill previous versioned handoffs.
- Modify baseline requirements without explicit approval.
- Claim testing, deployment, migration, or smoke verification without actually performing it.
- Store secrets in Markdown, source files, logs, screenshots, or browser bundles.

---

## Project Paths

| Area | Path |
|---|---|
| Application source | `src/` |
| Current context | `agent-workflow/CONTEXT.md` |
| Current handoff | `agent-workflow/HANDOFF.md` |
| Active plan | `agent-workflow/PLAN.md` |
| Simplicity rule | `agent-workflow/PONYTAIL.md` |
| Code map | `agent-workflow/CODEMAP.md` |
| Data map | `agent-workflow/DATA_MAP.md` |
| Browser workflow | `agent-workflow/BROWSER_TESTING.md` |
| Approved baseline | `agent-history/version-0-baseline.md` |
| Historical handoffs | `agent-history/` |
| Workflow app | `workflow-app/` |
| Workflow app attachments | `project-files/` |
| Workflow templates | `project-templates/` |
| Supabase migrations | `supabase/migrations/` |
| Migration scripts | `scripts/` |
| Deployment workflow | `.github/workflows/deploy.yml` |
| Legacy/reference material | `sampleApp/`, `sampleUI/`, `reference/` |

---

## Standard Commands

Use npm for this project.

```text
Install:           npm install
Develop:           npm run dev
Type-check:        npm run typecheck
Build:             npm run build
Preview:           npm run preview
Supabase verify:   npm run verify:supabase
Supabase smoke:    npm run smoke:supabase
Migration validate:npm run migrate:validate
Migration dry-run: npm run migrate:dry-run
Migration import:  npm run migrate:import
Deploy:            GitHub Pages workflow in .github/workflows/deploy.yml
Workflow app:      python workflow-app/server.py
Workflow validate: python workflow-app/scripts/validate_schema.py
Workflow smoke:    python workflow-app/scripts/smoke_test.py
```

There is no dedicated lint script in `package.json` at the time this workflow was initialized.

---

## Working Rules

Always:

- Inspect existing implementation before editing.
- Apply the smallest change that satisfies the approved requirement.
- Preserve approved business rules and migrated Google Apps Script behavior.
- Reuse existing components, services, types, utilities, constants, and patterns.
- Put Supabase schema changes in version-controlled migrations.
- Keep Supabase service role keys out of frontend code and committed files.
- Validate trust boundaries and protect against data loss.
- Preserve auditability for create, update, delete, archive, approval, role, and status changes.
- Add one small runnable check for non-trivial logic when practical.
- Run applicable verification before declaring completion.
- Review the diff for unrelated changes before finalizing.
- Report failed checks, assumptions, blockers, and unresolved risks honestly.
- Update `agent-workflow/HANDOFF.md` after meaningful completed work.
- Use `workflow-app/` for owner approvals, comments, planning, review, deployment, maintenance, and local audit records when the task requires formal workflow tracking.

Never:

- Bypass authentication, authorization, validation, RLS, audit, approval, or compliance controls.
- Approve or restore a baseline record in `workflow-app/` unless the project owner explicitly intends to revise `agent-history/version-0-baseline.md`.
- Use `getSession()` as the trust source for authorization; use `getUser()` patterns.
- Introduce unrelated frameworks, backend servers, or routing systems without approval.
- Replace HashRouter with browser history routing while GitHub Pages is the target.
- Rewrite broad areas when a targeted fix is sufficient.
- Manually edit generated or build output.
- Commit, push, merge, deploy, migrate, or run destructive operations unless explicitly requested or required by the accepted workflow.

---

## Rule Precedence

Project-specific requirements win over generic framework guidance.

1. `agent-history/version-0-baseline.md`
2. `.cursor/plan/project_tracker_migration_36f9948d.plan.md`
3. `.cursor/rules/project-context.mdc`
4. This `AGENTS.md` and `agent-workflow/`
5. Other `.cursor/rules/`

If `reactVite2026.mdc` conflicts with this project, follow Project Tracker conventions: React Router `HashRouter`, Ant Design, Supabase service files, Vite, and GitHub Pages.

---

## Baseline Triggers

Read `agent-history/version-0-baseline.md` when the task affects:

- scope, business goals, or approved workflow;
- database architecture or record relationships;
- authentication, roles, permissions, authorization, or RLS;
- audit trail, data integrity, retention, privacy, or GxP controls;
- hosting, deployment, environment, or security architecture;
- migration rules or approved source-to-target behavior;
- any conflict with an approved requirement.

Routine styling, copy, and isolated implementation fixes do not require rereading the full baseline unless they trigger one of these conditions.

---

## Completion Requirements

Before declaring completion:

1. Confirm the requested behavior or documentation change.
2. Run applicable type-check, build, tests, smoke, migration, Supabase, browser, and security checks.
3. Review the diff for unrelated or user-owned changes.
4. Update `CODEMAP.md` or `DATA_MAP.md` only when meaningful navigation, schema, or workflow meaning changed.
5. Update `agent-workflow/HANDOFF.md` after meaningful completed work.
6. Create a versioned handoff only when required by the scope or requested by the owner.
7. Record workflow-app, commit, and deployment status only when those actions occurred.

Recommended commit format for versioned checkpoints:

```text
v[VERSION]: [concise summary]
```
