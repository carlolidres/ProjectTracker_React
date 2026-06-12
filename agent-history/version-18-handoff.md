# Version 18 Handoff - Cursor Rules Generation

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProejctTracker_React`

Date: 2026-06-12

Previous Version: `agent-history/version-17-handoff.md`

Project Status: **Completed application; maintenance and agent-guidance tooling added**

---

## What Was Requested

Generate Cursor rules for persistent AI guidance in this repository.

---

## What Was Implemented

Created `.cursor/rules/` with three focused rule files:

| File | Scope | Purpose |
|---|---|---|
| `project-context.mdc` | Always apply | Architecture, domain constraints, agent startup/completion workflow |
| `gas-backend-data.mdc` | `Code.gs` | Sheet binding, headers, transport sanitization, normalization, IDs, audit |
| `gas-frontend-ui.mdc` | `Script.html`, `Index.html`, `Style.html` | DOM structure, post-write sync, forms, filters, responsive CSS |

Rules were derived from:

- `AGENTS.md` and `version-0-baseline.md`
- Engineering lessons in `version-17-handoff.md`
- Existing patterns in `Code.gs` and `Script.html` (`sanitizeRecordForTransport_`, `syncDataAfterWrite_`, instance IDs, alias resolution)

No application code was modified.

---

## What Was Not Implemented

- Git initialization or commit (not requested; workspace still has no Git repo)
- User-specific Cursor settings or global rules outside this project
- React/TypeScript rules (not applicable to current runtime)

---

## Verification

- Confirmed rule files exist under `.cursor/rules/` with valid YAML frontmatter.
- Confirmed globs and `alwaysApply` flags match intended file targeting.
- No syntax checks required for application files (unchanged).

---

## Assumptions

- Future work on this repo will continue with the four-file Google Apps Script architecture unless the owner revises the baseline.
- Cursor will load `.mdc` rules from `.cursor/rules/` automatically.

---

## Risks

- Rules may drift if application patterns change without updating the `.mdc` files.
- Baseline still mentions React/TypeScript/Vite; `project-context.mdc` explicitly defers to the GAS architecture to reduce agent confusion.

---

## Lessons Learned

- Splitting rules by concern (context vs backend vs frontend) keeps each file under the recommended size and avoids overloading always-applied context.

---

## Next Steps

- Update Cursor rules when major architectural or data-contract changes occur.
- Initialize Git if version control becomes a project requirement.
- If migrating to React, replace or supplement rules with TypeScript/Vite conventions.

---

## Reviewers Feedback

- **Instructions:** always add this section at the end of Markdown files to allow reviewers to provide feedback. If none is provided, this section will be skipped.
- **Reviewers:** @carlo-mauring
- **Comments:**
