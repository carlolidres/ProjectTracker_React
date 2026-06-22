# Version 0 Baseline Builder

## Purpose

Use this file only when creating or revising a project's Version 0 baseline.

Do not require coding agents to read this file during routine implementation work.

The completed output must be saved as:

```text
agent-history/version-0-baseline.md
```

---

# Section 1 — Project Creator Questionnaire

## Project Identity

1. Project name:
   - `[ANSWER]`
2. Project folder:
   - `[ANSWER]`
3. Repository:
   - `[ANSWER]`
4. Project owner:
   - `[ANSWER]`
5. Reviewers or approvers:
   - `[ANSWER]`
6. Project type:
   - `[NEW_APPLICATION | MIGRATION | MODERNIZATION | ENHANCEMENT]`
7. Baseline date:
   - `[YYYY-MM-DD]`

## Objective and Scope

8. What business problem will the system solve?
   - `[ANSWER]`
9. What is the approved project objective?
   - `[ANSWER]`
10. What is in scope?
    - `[ANSWER]`
11. What is out of scope?
    - `[ANSWER]`
12. What are the main business goals?
    - `[ANSWER]`
13. What measurable success criteria apply?
    - `[ANSWER]`

## Users and Permissions

14. Who will use the system?
    - `[ANSWER]`
15. What roles are required?
    - `[ANSWER]`
16. What modules may each role access?
    - `[ANSWER]`
17. What actions may each role perform?
    - `[ANSWER]`
18. What data-scope rules apply?
    - `[ANSWER]`
19. Who can administer users and permissions?
    - `[ANSWER]`

## Current and Target Technology

20. Current frontend:
    - `[ANSWER]`
21. Current backend:
    - `[ANSWER]`
22. Current database:
    - `[ANSWER]`
23. Current authentication:
    - `[ANSWER]`
24. Current hosting:
    - `[ANSWER]`
25. Target frontend:
    - `[ANSWER]`
26. Target backend:
    - `[ANSWER]`
27. Target database:
    - `[ANSWER]`
28. SQLite-first database validation plan before any Supabase migration:
    - `[ANSWER]`
29. Target authentication:
    - `[ANSWER]`
30. Target hosting:
    - `[ANSWER]`
31. UI framework or design reference:
    - `[ANSWER]`

## Architecture and Workflow

32. What architectural decisions are already approved?
    - `[ANSWER]`
33. What is the end-to-end workflow?
    - `[ANSWER]`
34. What statuses are allowed?
    - `[ANSWER]`
35. What rules control stage transitions?
    - `[ANSWER]`
36. What approval, rejection, cancellation, reopening, and closure rules apply?
    - `[ANSWER]`
37. What dates drive priority or escalation?
    - `[ANSWER]`

## Data Model

38. What are the primary entities?
    - `[ANSWER]`
39. What are their identifiers?
    - `[ANSWER]`
40. What relationships exist?
    - `[ANSWER]`
41. What fields and validation rules are critical?
    - `[ANSWER]`
42. What reference or registry data is required?
    - `[ANSWER]`
43. What duplicate-prevention rules apply?
    - `[ANSWER]`
44. What archive, retention, and deletion rules apply?
    - `[ANSWER]`

## Notifications, Dashboard, and Reporting

45. What events generate notifications?
    - `[ANSWER]`
46. Who receives them?
    - `[ANSWER]`
47. What escalation rules apply?
    - `[ANSWER]`
48. What dashboards and KPIs are required?
    - `[ANSWER]`
49. What reports and export formats are required?
    - `[ANSWER]`

## Audit, Compliance, and Security

50. What actions must be audited?
    - `[ANSWER]`
51. What must each audit record contain?
    - `[ANSWER]`
52. What compliance, quality, privacy, or retention requirements apply?
    - `[ANSWER]`
53. What authentication and session controls apply?
    - `[ANSWER]`
54. What row-level, record-level, or department-level controls apply?
    - `[ANSWER]`
55. Where will frontend-safe configuration be stored?
    - `[ANSWER]`
56. Where will privileged secrets be stored?
    - `[ANSWER]`
57. Does any credential require rotation?
    - `[YES | NO | TBD]`

## Migration and Deployment

58. What data or application is being migrated?
    - `[ANSWER]`
59. What approved behavior must be preserved?
    - `[ANSWER]`
60. What source-to-target mapping applies?
    - `[ANSWER]`
61. What SQLite validation evidence is required before Supabase migration starts?
    - `[ANSWER]`
62. What reconciliation and rollback methods apply?
    - `[ANSWER]`
63. What repository and deployment configuration applies?
    - `[ANSWER]`
64. What install, lint, test, build, verify, and deploy commands apply?
    - `[ANSWER]`

## Non-Functional and Verification Requirements

65. Performance targets:
    - `[ANSWER]`
66. User-capacity target:
    - `[ANSWER]`
67. Availability target:
    - `[ANSWER]`
68. Browser, device, accessibility, and localization requirements:
    - `[ANSWER]`
69. Backup and recovery requirements:
    - `[ANSWER]`
70. Required automated and manual verification:
    - `[ANSWER]`
71. Definition-of-done additions:
    - `[ANSWER]`

---

# Section 2 — Prompt to Generate the Baseline

Copy the prompt below and provide it together with:

- The completed questionnaire
- `agent-history/version-0-baseline.md`
- Approved reference materials

```text
Prepare the Version 0 baseline for this software project.

Use the completed project-creator questionnaire to populate
`agent-history/version-0-baseline.md`.

Mandatory rules:

1. Preserve the baseline and handoff workflow.
2. Keep Version 0 as the permanent source of truth after approval.
3. Do not invent requirements, fields, statuses, roles, dates, URLs, commands, or technologies.
4. Use `[TBD — PROJECT OWNER TO CONFIRM]` for missing decisions.
5. Use `[TBD — CONFLICT REQUIRES PROJECT OWNER DECISION]` for unresolved contradictions.
6. Never insert passwords, private keys, tokens, service-role keys, or production secrets.
7. Preserve the file's Markdown hierarchy and required sections.
8. Make every approved requirement concise, testable, and internally consistent.
9. Ensure roles align with permissions.
10. Ensure workflows align with statuses, dates, notifications, and data relationships.
11. Ensure security requirements align with the selected architecture.
12. Ensure deployment requirements align with the selected hosting platform.
13. When Supabase is the target database, require SQLite schema and relationship
    validation before Supabase migration SQL is created or applied.
14. Keep the Definition of Done, Version Handover Workflow, Reviewers Feedback,
    and Baseline Approval sections.
15. Output the completed Markdown only.
```

---

# Section 3 — Baseline Completion Check

Before approving Version 0, confirm:

- [ ] Project objective is approved.
- [ ] Scope is explicit.
- [ ] Business goals are measurable where possible.
- [ ] Success criteria are testable.
- [ ] Roles and permissions are aligned.
- [ ] Workflow stages and statuses are consistent.
- [ ] Data entities and relationships support the workflow.
- [ ] SQLite schema and relationship validation is required before Supabase migration, when applicable.
- [ ] Notification and escalation rules are defined.
- [ ] Audit and retention requirements are defined.
- [ ] Security and secret-handling rules are defined.
- [ ] Migration and rollback controls are defined, when applicable.
- [ ] Verification and release criteria are defined.
- [ ] No real secrets are present.
- [ ] Baseline approval is recorded.
