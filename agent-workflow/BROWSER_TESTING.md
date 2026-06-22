# Manual Browser Verification Workflow

Last Updated: `2026-06-22`

## Purpose

Use browser verification to confirm user-visible behavior in the React + Vite + Supabase app. Manual Chrome DevTools inspection is the default when the user supplies evidence or when a visual/runtime issue needs confirmation.

Use browser automation only when manual reproduction is impractical, repeated regression coverage is required, automation is approved scope, or the project owner explicitly requests it.

## Workflow

```text
AGENTS.md
  -> CONTEXT.md
  -> HANDOFF.md
  -> BROWSER_TESTING.md
  -> CODEMAP.md or DATA_MAP.md
  -> affected source files only
  -> smallest fix
  -> typecheck/build or targeted checks
  -> manual browser verification
  -> HANDOFF.md update
```

For Supabase-related browser failures, read `DATA_MAP.md`, then only the relevant service and migration files.

## Routes to Know

The app uses `HashRouter`.

| Feature | Local route | Production route pattern |
|---|---|---|
| Login | `/#/login` | `/ProjectTracker_React/#/login` |
| Dashboard | `/#/dashboard` | `/ProjectTracker_React/#/dashboard` |
| Project Entry | `/#/projects` | `/ProjectTracker_React/#/projects` |
| Projects Database | `/#/projects/database` | `/ProjectTracker_React/#/projects/database` |
| Support Activities | `/#/support-activities` | `/ProjectTracker_React/#/support-activities` |
| CNF Tracker | `/#/cnf-tracker` | `/ProjectTracker_React/#/cnf-tracker` |
| Audit Trail | `/#/audit-trail` | `/ProjectTracker_React/#/audit-trail` |
| Registry | `/#/registry` | `/ProjectTracker_React/#/registry` |
| Admin Users | `/#/admin/users` | `/ProjectTracker_React/#/admin/users` |

## Select the Relevant Panel

| Issue | Panel | Inspect |
|---|---|---|
| Layout, spacing, overflow, responsive behavior | Elements / Device Toolbar | DOM, computed CSS, breakpoints |
| Runtime error or inactive control | Console | First relevant error and stack |
| Login, save, load, Supabase, or export failure | Network | Failed request, status, concise response |
| Session, token, cache, refresh state | Application | Relevant local/session storage item only |
| Handler or execution path | Sources | Breakpoint, call stack, variable |
| Slow interaction | Performance | Long task or bottleneck only |

Do not inspect every panel unless evidence shows that multiple layers are involved.

## Minimum Evidence Template

```text
Page or route:
[ROUTE]

Feature:
[FEATURE]

Steps:
1. [STEP_1]
2. [STEP_2]
3. [STEP_3]

Expected:
[EXPECTED]

Actual:
[ACTUAL]

Console error:
[ONE_RELEVANT_ERROR_OR_NONE]

Failed request:
[METHOD URL, STATUS, RELEVANT_RESPONSE_OR_NONE]

Selector or source path:
[VALUE_OR_UNKNOWN]

Screenshot:
[ATTACHED_ONLY_IF_VISUAL]
```

Never provide complete console history, full network exports, full HTML, HAR files, authentication headers, tokens, cookies, passwords, private keys, production secrets, database dumps, or duplicate screenshots.

## Agent Instructions

When browser evidence is provided:

1. Read `AGENTS.md`, `CONTEXT.md`, `HANDOFF.md`, and this file.
2. Read only the task-specific file that is truly necessary: `CODEMAP.md`, `DATA_MAP.md`, `PLAN.md`, an approved task plan, or a relevant baseline section.
3. Identify the root cause before editing.
4. Apply the first valid Ponytail rung: reuse, standard library, native feature, installed dependency, or minimum new code.
5. Do not change unrelated behavior.
6. Add one small runnable check for non-trivial logic when practical.
7. Run applicable type-check, build, Supabase, migration, or smoke checks.
8. Return concise manual retest steps, changed files, verification results, assumptions, risks, and blockers.
9. Update `HANDOFF.md` after meaningful work.

## Manual Verification Template

```text
Date: [YYYY-MM-DD]
Route: [ROUTE]
Tested by: [USER]
Original issue: [ISSUE]

Verification steps:
1. [STEP_1]
2. [STEP_2]
3. [STEP_3]

Result: [PASSED | FAILED | PARTIALLY_PASSED]
Console: [NO_NEW_ERRORS | DETAILS]
Network: [NO_FAILED_REQUESTS | DETAILS | N/A]
Responsive: [PASSED | FAILED | N/A]
Session/storage: [PASSED | FAILED | N/A]
Comments: [COMMENTS]
```

## Where to Record Findings

| Finding | Update |
|---|---|
| New bug, regression, failed check, unresolved limitation | `agent-workflow/HANDOFF.md` -> Known Issues |
| Accepted implementation work | `agent-workflow/PLAN.md` |
| Completed fix or successful manual check | `agent-workflow/HANDOFF.md` |
| Meaningful completed feature, release, migration, deployment, rollback | Relevant new versioned handoff in `agent-history/` |
| New or changed source path | `agent-workflow/CODEMAP.md` |
| Database, Supabase, API, migration, session, or data-flow rule | `agent-workflow/DATA_MAP.md` |
| Stable project fact | `agent-workflow/CONTEXT.md` |
| Permanent approved requirement or GxP control | `agent-history/version-0-baseline.md` only after approval |
| General agent instruction | `AGENTS.md` |
| Browser procedure | This file |

## Security Rules

- Use development or test accounts when possible.
- Redact personal, regulated, and confidential information.
- Never share access tokens, refresh tokens, session cookies, passwords, private keys, service credentials, or authorization headers.
- Do not store secrets in Markdown files.
