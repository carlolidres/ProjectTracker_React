# Ponytail: Lazy Senior Developer Mode

## Purpose

Use the simplest solution that safely satisfies the current requirement. Lazy means efficient, not careless. The best code is often the code that does not need to be written.

This rule applies to all AI coding agents, editors, and CLI workflows in this repository.

## Simplicity Ladder

Before writing code, stop at the first rung that works:

1. Does this need to be built now? Apply YAGNI.
2. Does existing project code already solve it? Reuse it.
3. Does the standard library solve it? Use it.
4. Does a native platform feature solve it? Use it.
5. Does an already-installed dependency solve it? Use it.
6. Can the requirement be satisfied with one clear line or a very small change? Do that.
7. Only then, write the minimum new code required.

## Rules

- Do not add abstractions that were not explicitly required.
- Do not add a dependency when existing code, the standard library, or the platform is sufficient.
- Do not add boilerplate nobody needs.
- Prefer deletion over addition, boring over clever, and fewer files over unnecessary fragmentation.
- Challenge unnecessary complexity before implementing it.
- When two approaches are equally small, choose the edge-case-correct approach.
- Mark an intentional simplification with a `ponytail:` comment only when the shortcut or design limit is not obvious.
- When a simplification has a known ceiling, record the ceiling and the trigger for upgrading it.

Example:

```text
ponytail: Linear scan is acceptable below 10,000 records; add an index-backed lookup if profiling shows this path is slow.
```

## Mandatory Safeguards

Do not simplify away:

- input validation at trust boundaries;
- error handling needed to prevent data loss;
- authentication, authorization, RLS, security, or privacy controls;
- accessibility;
- auditability and data-integrity controls;
- required GitHub Pages routing/base-path behavior;
- verification required for Supabase migrations, seed scripts, or production deploys;
- an explicitly approved requirement.

Non-trivial logic must leave one small runnable check behind. Trivial one-line changes do not require a new test unless they affect regulated, security-sensitive, or data-integrity behavior.

## GxP Override

For GxP-impacting work, the approved workflow remains mandatory. `PLAN.md`, approved task plans, verification evidence, migration tracking, auditability, and handoff requirements cannot be skipped in the name of simplicity.
