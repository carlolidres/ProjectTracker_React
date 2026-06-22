# Manual Chrome DevTools Workflow

Last Updated: `[YYYY-MM-DD]`

## Purpose

This document defines the default manual browser-inspection and verification workflow for this repository.

The objective is to reduce AI token usage by allowing the user to inspect the application manually in Chrome DevTools and provide only the evidence required for an AI coding agent to investigate and fix an issue.

This workflow is applicable to any AI coding agent that can read the repository and modify code. It does not depend on a specific editor, model, or AI vendor.

---

# How This Fits the Existing AI Workflow

```text
AGENTS.md
    ↓
agent-workflow/CONTEXT.md
    ↓
agent-workflow/HANDOFF.md
    ↓
agent-workflow/BROWSER_TESTING.md
    ↓
Relevant CODEMAP.md, DATA_MAP.md, or PLAN.md
    ↓
Targeted source-code inspection and implementation
    ↓
Manual Chrome DevTools verification
    ↓
HANDOFF.md and versioned handoff update
```

This file describes the browser workflow only. It does not replace the existing baseline, planning, handoff, code-map, or data-map workflow.

---

# Default Principle

Manual Chrome DevTools inspection is the default browser-verification method.

Use AI-controlled browser automation only when:

- the issue cannot be reproduced manually;
- repeated regression testing is required;
- the workflow is too long or complex for practical manual testing;
- browser automation is part of the approved project scope; or
- the project owner explicitly requests it.

Chrome DevTools itself does not consume AI tokens. AI tokens are used only when evidence, prompts, logs, screenshots, or files are sent to an AI agent.

---

# Responsibilities

## User or Project Owner

The user shall:

1. Run the application.
2. Reproduce the issue in Chrome.
3. Inspect only the relevant DevTools panel.
4. Collect minimal and relevant evidence.
5. Provide the evidence to the AI agent.
6. Manually verify the completed fix.
7. Report the final verification result.

## AI Coding Agent

The AI agent shall:

1. Read `AGENTS.md`.
2. Read `agent-workflow/CONTEXT.md`.
3. Read `agent-workflow/HANDOFF.md`.
4. Read this file when browser evidence is provided or browser verification is required.
5. Read only the supporting project files relevant to the issue.
6. Inspect only the affected source files, components, services, routes, or configuration.
7. Apply the smallest necessary change.
8. Run applicable automated verification.
9. Provide concise manual verification steps.
10. Update the appropriate Markdown workflow files after meaningful work.

---

# Step 1 — Run the Application

Use the project-approved development command:

```text
[DEVELOPMENT_COMMAND]
```

Example:

```powershell
npm run dev
```

Open the local application URL:

```text
[LOCAL_APPLICATION_URL]
```

Example:

```text
http://localhost:5173
```

---

# Step 2 — Open Chrome DevTools

Use one of the following:

```text
F12
Ctrl + Shift + I
Right-click the affected element → Inspect
```

Useful shortcuts:

```text
Ctrl + Shift + C    Inspect an element
Ctrl + Shift + J    Open Console
Ctrl + Shift + M    Toggle device toolbar
```

---

# Step 3 — Select the Correct DevTools Panel

Use only the panel relevant to the reported issue.

| Issue Type | Primary DevTools Panel | What to Inspect |
|---|---|---|
| Layout, height, width, spacing, scrolling | Elements | DOM, CSS rules, computed styles, overflow |
| Button does nothing, blank page, runtime error | Console | JavaScript errors, warnings, rejected promises |
| Login, sign-up, save, load, API, or database failure | Network | Status code, request payload, response, headers |
| Session, token, cached state, or refresh issue | Application | Local storage, session storage, cookies, IndexedDB |
| Function or event-handler execution issue | Sources | Breakpoints, call stack, variables, exceptions |
| Mobile or responsive layout issue | Device Toolbar | Widths, breakpoints, overflow, touch behavior |
| Slow page or delayed interaction | Performance | Long tasks, network timing, rendering bottlenecks |

Do not inspect every panel unless the evidence indicates that multiple layers are involved.

---

# Step 4 — Reproduce the Issue

Record the exact reproduction steps.

Example:

```text
Page: /signup

Steps:
1. Open the sign-up page.
2. Enter the required information.
3. Click Continue with Google.
4. Observe that no redirect occurs.
```

A reproducible issue is easier to investigate and usually requires less AI context.

---

# Step 5 — Collect Minimal Evidence

Provide only the information needed to investigate the issue.

## Required Evidence

```text
Page or route:
[ROUTE]

Affected feature:
[FEATURE_OR_COMPONENT]

Steps to reproduce:
1. [STEP_1]
2. [STEP_2]
3. [STEP_3]

Expected result:
[EXPECTED_BEHAVIOR]

Actual result:
[ACTUAL_BEHAVIOR]
```

## Add Only When Applicable

```text
Console error:
[ONE_RELEVANT_ERROR]

Failed network request:
[METHOD] [URL_OR_ENDPOINT]
Status: [STATUS_CODE]
Response: [RELEVANT_RESPONSE_ONLY]

Affected selector:
[CSS_SELECTOR_OR_DOM_DESCRIPTION]

Affected source path:
[KNOWN_COMPONENT_OR_FILE_PATH]

Storage or session observation:
[RELEVANT_OBSERVATION]

Screenshot:
[ATTACH_ONLY_WHEN_VISUAL_EVIDENCE_IS_NEEDED]
```

## Do Not Provide Unless Requested

Avoid sending:

- the complete HTML document;
- the complete browser console history;
- all network requests;
- full HAR files;
- authentication tokens;
- cookies;
- passwords;
- private keys;
- production secrets;
- complete database dumps;
- complete source files when only a small section is relevant;
- repeated screenshots of the same issue.

---

# Step 6 — Prompt the AI Agent

Use the following generic prompt:

```text
Investigate and fix the issue using the manual Chrome DevTools evidence below.

Page or route:
[ROUTE]

Affected feature:
[FEATURE_OR_COMPONENT]

Steps to reproduce:
1. [STEP_1]
2. [STEP_2]
3. [STEP_3]

Expected result:
[EXPECTED_BEHAVIOR]

Actual result:
[ACTUAL_BEHAVIOR]

Relevant Console error:
[ERROR_OR_NONE]

Relevant failed Network request:
[REQUEST_OR_NONE]

Affected selector or source path:
[SELECTOR_OR_PATH_OR_UNKNOWN]

Instructions:

1. Read AGENTS.md, CONTEXT.md, HANDOFF.md, and BROWSER_TESTING.md.
2. Read only the CODEMAP.md, DATA_MAP.md, PLAN.md, or baseline sections required for this issue.
3. Inspect only the affected components, services, routes, configuration, and tests.
4. Identify the root cause before modifying code.
5. Apply the smallest necessary change.
6. Do not modify unrelated files or approved business behavior.
7. Run the applicable lint, type-check, tests, and production build.
8. Provide concise manual verification steps.
9. Report files changed, verification results, assumptions, remaining risks, and blockers.
10. Do not expose authentication tokens, cookies, credentials, or personal data.
```

---

# Step 7 — Selective Reading by the AI Agent

## UI or Layout Issue

Read:

```text
AGENTS.md
agent-workflow/CONTEXT.md
agent-workflow/HANDOFF.md
agent-workflow/BROWSER_TESTING.md
agent-workflow/CODEMAP.md
```

Inspect only the affected page, component, stylesheet, responsive layout code, and directly related tests.

## API, Authentication, Session, or Data Issue

Read:

```text
AGENTS.md
agent-workflow/CONTEXT.md
agent-workflow/HANDOFF.md
agent-workflow/BROWSER_TESTING.md
agent-workflow/CODEMAP.md
agent-workflow/DATA_MAP.md
```

Read the baseline only when the issue affects approved authentication, authorization, security, audit, data-access, workflow, or architecture requirements.

## Planned Feature or Approved Change

Also read:

```text
agent-workflow/PLAN.md
```

## Historical Regression

Read only the relevant historical file:

```text
agent-history/version-[RELEVANT_VERSION]-handoff.md
```

Do not read all previous handoffs.

---

# Step 8 — Manual Verification After the Fix

After the AI agent completes the change:

1. Restart or refresh the application as required.
2. Open Chrome DevTools.
3. Repeat the original reproduction steps.
4. Confirm that the expected behavior now occurs.
5. Check the Console for new errors.
6. Check Network requests when applicable.
7. Confirm that related behavior still works.
8. Test relevant screen sizes when the issue is visual.
9. Confirm session persistence when the issue involves authentication or form state.
10. Record the result.

## Verification Result Template

```text
Manual Chrome DevTools Verification

Date:
[YYYY-MM-DD]

Route:
[ROUTE]

Tested by:
[USER_OR_REVIEWER]

Original issue:
[ISSUE]

Verification steps:
1. [STEP_1]
2. [STEP_2]
3. [STEP_3]

Result:
[PASSED | FAILED | PARTIALLY_PASSED]

Console:
[NO_NEW_ERRORS | ERROR_DETAILS]

Network:
[NO_FAILED_REQUESTS | FAILURE_DETAILS | NOT_APPLICABLE]

Responsive check:
[PASSED | FAILED | NOT_APPLICABLE]

Session or storage check:
[PASSED | FAILED | NOT_APPLICABLE]

Comments:
[COMMENTS]
```

---

# Where to Record Chrome DevTools Comments

Use this table to determine which Markdown file must be updated.

| Comment or Finding | File to Update | Action |
|---|---|---|
| Newly reported bug, regression, failed verification, or unresolved issue | `agent-workflow/HANDOFF.md` | Add under **Known Issues** with severity, impact, and next action |
| Comment accepted as the current implementation task | `agent-workflow/PLAN.md` | Add objective, scope, acceptance criteria, implementation steps, and verification plan |
| Completed fix or successful manual verification | `agent-workflow/HANDOFF.md` | Update **Recently Completed** and **Verification Status** |
| Meaningful completed feature, grouped bug fix, migration, release, or deployment | `agent-history/version-X-handoff.md` | Record scope, files changed, verification, commit, deployment, risks, and next steps |
| Newly identified component, route, service, selector, or source path | `agent-workflow/CODEMAP.md` | Add or correct the relevant path and responsibility |
| Database, API, migration, RLS, session, or data-flow finding | `agent-workflow/DATA_MAP.md` | Update the relevant entity, relationship, rule, or data-flow note |
| Stable project fact or operating context changes | `agent-workflow/CONTEXT.md` | Update only the concise stable context |
| Approved requirement, workflow, role, permission, security rule, architecture, or compliance control changes | `agent-history/version-0-baseline.md` | Update only after explicit project-owner approval |
| Standard instruction for all AI agents changes | `AGENTS.md` | Update the canonical rule only when broadly applicable |
| Manual browser-inspection procedure changes | `agent-workflow/BROWSER_TESTING.md` | Update this document |
| Reusable project setup or baseline questionnaire changes | `project-templates/version-0-baseline-builder.md` | Update the template, not the active runtime files |

---

# Decision Rules

## Update `HANDOFF.md` When

The user reports:

- a bug;
- a regression;
- a failed verification;
- a Console error;
- a failed Network request;
- a session or storage issue;
- a known limitation;
- a completed manual verification result.

`HANDOFF.md` is the default destination for current operational comments.

## Update `PLAN.md` When

The comment is accepted as implementation work.

The plan should include:

- objective;
- scope;
- acceptance criteria;
- affected files;
- database or security impact;
- verification steps;
- risks and dependencies.

## Update a Versioned Handoff When

The work is meaningful and complete, such as:

- a feature;
- a grouped bug fix;
- a migration step;
- an authentication correction;
- a security fix;
- a release;
- a deployment.

Do not create a new historical handoff for every minor visual adjustment unless required by the project owner.

## Update the Baseline Only When

The project owner explicitly approves a permanent change to:

- project scope;
- business goals;
- approved workflows or statuses;
- database architecture;
- role or permission design;
- authentication or security requirements;
- compliance requirements;
- deployment architecture;
- Definition of Done;
- other permanent requirements.

A Chrome DevTools observation alone does not automatically change the baseline.

---

# User Comment Template

```text
Chrome DevTools Comment

Date:
[YYYY-MM-DD]

Page or route:
[ROUTE]

Feature:
[FEATURE]

Comment type:
[BUG | IMPROVEMENT | REGRESSION | VERIFICATION_RESULT | QUESTION]

Steps to reproduce:
1. [STEP_1]
2. [STEP_2]
3. [STEP_3]

Expected:
[EXPECTED_RESULT]

Actual:
[ACTUAL_RESULT]

Console:
[RELEVANT_ERROR_OR_NONE]

Network:
[RELEVANT_REQUEST_OR_NONE]

Affected selector:
[SELECTOR_OR_UNKNOWN]

Screenshot:
[ATTACHED | NOT_REQUIRED]

Priority:
[LOW | MODERATE | HIGH | CRITICAL]

Additional comments:
[COMMENTS]
```

---

# Token-Saving Rules

- Use manual DevTools inspection before requesting broad AI browser analysis.
- Provide one clear issue per prompt where practical.
- Include only the relevant error or failed request.
- Reference the affected source path when known.
- Do not attach full logs unless the relevant line cannot be isolated.
- Do not require the AI agent to read the entire repository.
- Do not require the baseline for routine UI or isolated bug fixes.
- Keep `HANDOFF.md` concise and current.
- Move durable historical evidence to versioned handoffs.
- Use automated tests for repeatable checks, but return concise pass/fail summaries.
- Use screenshots only when the problem is visual and cannot be described precisely.

---

# Security Rules

- Use development or test accounts.
- Avoid inspecting authenticated production sessions with AI assistance.
- Never share access tokens, refresh tokens, session cookies, passwords, private keys, or service-role credentials.
- Redact personal, regulated, or confidential data from screenshots and copied responses.
- Do not paste full request headers when they contain authorization information.
- Do not store secrets in Markdown files.
- Report security-sensitive findings without exposing the secret value.

---

# AGENTS.md Integration

Add this entry to the selective-reading section of `AGENTS.md`:

```markdown
- Browser evidence or manual runtime verification:
  `agent-workflow/BROWSER_TESTING.md`
```

Add these rules under working rules:

```markdown
- Manual Chrome DevTools verification is the default browser workflow.
- Use user-provided reproduction steps and minimal browser evidence before requesting broader browser inspection.
- Record current browser findings in `agent-workflow/HANDOFF.md`.
- Add accepted implementation work to `agent-workflow/PLAN.md`.
```

---

# HANDOFF.md Integration

When a user provides a Chrome DevTools comment, update `agent-workflow/HANDOFF.md` using this pattern:

```markdown
## Known Issues

| Severity | Issue | Impact | Next Action |
|---|---|---|---|
| [SEVERITY] | [DEVTOOLS_FINDING] | [IMPACT] | [RECOMMENDED_ACTION] |
```

After successful manual verification:

```markdown
## Verification Status

| Check | Status | Result |
|---|---|---|
| Manual Chrome DevTools verification | PASSED | [CONCISE_RESULT] |
```

---

# Completion Checklist

## User

- [ ] Application was started.
- [ ] Issue was reproduced.
- [ ] Correct DevTools panel was used.
- [ ] Minimal evidence was collected.
- [ ] Sensitive information was removed.
- [ ] AI agent received a targeted prompt.
- [ ] Original workflow was manually retested.
- [ ] Final result was reported.

## AI Agent

- [ ] Required workflow files were read selectively.
- [ ] Root cause was identified.
- [ ] Smallest necessary change was applied.
- [ ] Unrelated files were not modified.
- [ ] Applicable tests and build were run.
- [ ] Manual verification steps were provided.
- [ ] `HANDOFF.md` was updated.
- [ ] `PLAN.md`, `CODEMAP.md`, or `DATA_MAP.md` was updated when applicable.
- [ ] A versioned handoff was created when required.
- [ ] The baseline was changed only with explicit approval.

---

# Reviewers Feedback

- **Reviewers:** `[REVIEWER_LIST]`
- **Comments:** `[COMMENTS]`
