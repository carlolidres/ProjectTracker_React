# Active Plan

Last Updated: `[YYYY-MM-DD]`
Plan Owner: `[OWNER_OR_AGENT]`
Status: `[NOT_STARTED | IN_PROGRESS | BLOCKED | READY_FOR_REVIEW | COMPLETE]`

## Objective

`[State the current implementation objective in one concise paragraph.]`

## Task Restatement and Acceptance

- Objective restated: `[ONE_SENTENCE_OBJECTIVE]`
- Acceptance criteria source: `[USER_REQUEST | PLAN | ISSUE | BASELINE | OTHER]`
- Essential context status: `[READY | MISSING_INFO | CONFLICT_DETECTED | BLOCKED]`
- Instruction conflicts: `[NONE_OR_DESCRIPTION]`

Do not begin implementation while essential context is missing, contradictory, or unverifiable.

## Approval and GxP Gate

- GxP impact: `[NONE | INDIRECT | DIRECT]`
- Approved task plan: `[NOT_REQUIRED | plans/.../plan.md]`
- Approval status: `[NOT_REQUIRED | PENDING | APPROVED | REJECTED]`
- Approver and date: `[NAME_AND_DATE_OR_NOT_APPLICABLE]`

Do not start direct GxP-impacting implementation until the required task plan is approved.

## Ponytail Simplicity Gate

Record only the first solution rung that holds.

- [ ] Requirement is necessary now; not YAGNI.
- [ ] Existing code, standard library, native platform, or installed dependency was checked first.
- [ ] The chosen solution is the smallest edge-case-correct option.
- [ ] No unnecessary abstraction, dependency, boilerplate, or file is introduced.
- [ ] Non-trivial logic has one small runnable check.

Chosen rung and rationale:

`[REUSE | STANDARD_LIBRARY | NATIVE_FEATURE | INSTALLED_DEPENDENCY | MINIMUM_NEW_CODE] — [ONE_SENTENCE_REASON]`

## Scope

Included:

- `[IN_SCOPE_ITEM_1]`
- `[IN_SCOPE_ITEM_2]`
- `[IN_SCOPE_ITEM_3]`

Excluded:

- `[OUT_OF_SCOPE_ITEM_1]`
- `[OUT_OF_SCOPE_ITEM_2]`

## Preflight Checklist

- [ ] Latest `CONTEXT.md` and `HANDOFF.md` reviewed.
- [ ] Relevant `PLAN.md`, task comments, open issues, and task history reviewed.
- [ ] Approved baseline reviewed when a baseline trigger applies.
- [ ] Expected modified files identified before editing.
- [ ] Existing implementation inspected before assumptions were made.
- [ ] Repository status checked or recorded as not applicable.
- [ ] Build, database, and runtime status checked or recorded as not applicable.
- [ ] No instruction conflicts or missing essentials remain.

## Acceptance Criteria

- [ ] `[ACCEPTANCE_CRITERION_1]`
- [ ] `[ACCEPTANCE_CRITERION_2]`
- [ ] `[ACCEPTANCE_CRITERION_3]`
- [ ] `[ACCEPTANCE_CRITERION_4]`

## Implementation Steps

- [ ] 1. Inspect only the mapped files required for the task.
- [ ] 2. `[IMPLEMENTATION_STEP_1]`
- [ ] 3. `[IMPLEMENTATION_STEP_2]`
- [ ] 4. Add or update the smallest applicable check.
- [ ] 5. Run applicable verification.
- [ ] 6. Update maps and handoff only when required.

## Expected Files

| Path | Expected change |
|---|---|
| `[FILE_PATH_1]` | `[CHANGE]` |
| `[FILE_PATH_2]` | `[CHANGE]` |
| `[FILE_PATH_3]` | `[CHANGE]` |

Avoid modifying files outside this list unless the task reveals a directly required dependency; record the reason in `HANDOFF.md`.

## SQLite Impact

- Impact: `[NONE | QUERY_CHANGE | SCHEMA_CHANGE | MIGRATION | DATA_MIGRATION]`
- Editable SQL: `[NONE_OR_DATABASE_SQLITE_PATHS]`
- Generated map target: `[NONE_OR_SQLITE_OUT_PATHS]`
- Map command: `[NOT_APPLICABLE_OR_SQLITE_MAP_COMMAND]`
- SQLite-first gate: `[NOT_APPLICABLE | PENDING_LOCAL_SCHEMA | LOCAL_SCHEMA_VALIDATED | READY_FOR_SUPABASE_MAPPING]`
- Supabase migration: `[NOT_APPLICABLE | BLOCKED_UNTIL_SQLITE_VALIDATED | MAPPING_ONLY | MIGRATION_READY | APPLIED]`
- Rollback: `[NOT_APPLICABLE_OR_ROLLBACK_METHOD]`

For schema changes, editing `database/sqlite/`, regenerating `sqlite-out/`, validating local SQLite constraints and relationships, and recording the result in `HANDOFF.md` are mandatory. Do not start Supabase migration SQL until the SQLite-first gate is `LOCAL_SCHEMA_VALIDATED` or `READY_FOR_SUPABASE_MAPPING`.

## Security and Compliance Impact

```text
[NONE | AUTHENTICATION | AUTHORIZATION | AUDIT | DATA_INTEGRITY | PRIVACY | GXP | OTHER]
```

Details:

`[SECURITY_OR_COMPLIANCE_DETAILS]`

## Verification Plan

- [ ] Lint: `[COMMAND_OR_NOT_APPLICABLE]`
- [ ] Type-check: `[COMMAND_OR_NOT_APPLICABLE]`
- [ ] Unit or self-check: `[COMMAND_OR_DESCRIPTION]`
- [ ] Integration tests: `[COMMAND_OR_NOT_APPLICABLE]`
- [ ] Production build: `[COMMAND_OR_NOT_APPLICABLE]`
- [ ] SQLite schema-map sync: `[COMMAND_OR_NOT_APPLICABLE]`
- [ ] SQLite relationship validation: `[COMMAND_OR_DESCRIPTION_OR_NOT_APPLICABLE]`
- [ ] Supabase migration dry run or mapping review: `[COMMAND_OR_DESCRIPTION_OR_NOT_APPLICABLE]`
- [ ] Smoke test: `[COMMAND_OR_NOT_APPLICABLE]`
- [ ] Manual acceptance: `[DESCRIPTION]`

## Context Refresh Checkpoints

Record after major stages, several file edits, failed verification, or long debugging:

| Checkpoint | Objective still accurate? | Files changed reviewed? | Test status reviewed? | Open issues | Remaining work |
|---|---|---|---|---|---|
| `[CHECKPOINT_NAME]` | `[YES | NO]` | `[YES | NO]` | `[YES | NO]` | `[NONE_OR_ITEMS]` | `[ITEMS]` |

## Dumb-Zone and Recovery

- Dumb-zone status: `[CLEAR | TRIGGERED | RECOVERING | BLOCKED]`
- Trigger, if any: `[NONE_OR_TRIGGER]`
- Repair attempts: `[COUNT]`
- Last known working state: `[DESCRIPTION_OR_UNKNOWN]`
- Recovery approval needed: `[NO | YES_REASON]`

If the same error repeats, unrelated failures appear, verification regresses, required context cannot be verified, or more than three repair attempts fail, stop implementation and prepare a recovery summary in `HANDOFF.md`.

## Risks, Dependencies, and Blockers

- Risks or dependencies: `[NONE_OR_ITEMS]`
- Blockers: `[NONE_OR_BLOCKERS]`

## Completion Notes

`[When complete, summarize the implemented result and move durable evidence to the appropriate handoff. Replace this file when the next active plan starts.]`
