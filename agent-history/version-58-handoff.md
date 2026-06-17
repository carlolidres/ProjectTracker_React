# Version 58 Handoff - Fix pt_current_user_role Enum Coalesce

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-17

Previous Version: `agent-history/version-57-handoff.md`

Project Status: **v58 — migration 026 enum coalesce fix committed**

---

## What Was Requested

Fix Supabase error when running `026_qa_cnf_fields.sql`:

`invalid input value for enum user_role: ""` from `coalesce(p.role, '')` on `profiles.role` (`user_role` enum).

---

## What Was Implemented

| Area | Change |
|------|--------|
| `026_qa_cnf_fields.sql` | `pt_current_user_role()` — cast `p.role::text` and handle NULL explicitly instead of `coalesce(p.role, '')` |
| `026_qa_cnf_fields.sql` | `safe_project_tracker_role()` — `nullif(trim(value), '')` instead of `coalesce(value, '')` |

---

## Verification

- User confirmed migration 026 applies successfully after fix
- No application source changes

---

## Assumptions

- Operators who already applied a partial 026 can re-run the full updated script (`CREATE OR REPLACE`, `ADD COLUMN IF NOT EXISTS` are idempotent).

---

## Git Traceability

- Commit message: `v58: fix pt_current_user_role enum coalesce in migration 026`
- Commit hash: `fcc3a69`

---

## Next Steps

1. Re-run updated `026_qa_cnf_fields.sql` on any environment that hit the enum coalesce error
2. Assign `qa` role to users as needed after migrations 025 + 026 complete
