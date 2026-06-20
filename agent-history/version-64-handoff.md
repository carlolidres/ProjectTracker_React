# Version 64 Handoff - Rollback to Pre-Seed Stable State (v61)

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-20

Previous Version: `agent-history/version-63-handoff.md`

Project Status: **v64 - Rolled back codebase and Supabase seed data to pre-seed stable baseline**

---

## What Was Requested

1. Roll back Supabase seed-import rows only (keep non-seed production data).
2. Discard uncommitted local fixes and reset git to v61 (`04f517b`).
3. Force push `main` and trigger GitHub Pages deploy.
4. Document rollback evidence in v64 handoff.

---

## Rollback Reason

Post-v62/v63 seed CSV import and subsequent uncommitted fixes introduced instability. User chose to restore the last known stable application state (v61 — form draft persistence) while removing only seed-import database rows, not the full schema or legacy migrated data.

---

## Supabase Seed Rollback (service role)

Script: `scripts/rollback-seed-import.ts` (run before git reset; not retained in repo after reset).

| Table | Before | Deleted | After | Notes |
|-------|--------|---------|-------|-------|
| `cnf_projects` (seed) | 87 | 87 | 0 | `created_by='seed-import'` or `record_id LIKE 'REC-SEED-%'` |
| `cnf_tracker_records` (seed) | 47 | 47 | 0 | `created_by='seed-import'` |
| `project_cnf_links` | unknown | 0 | — | SELECT/DELETE denied for `service_role` (42501) |
| `audit_logs` (seed-related) | 220 | 0 | — | DELETE denied for `service_role` (42501); rows may remain orphaned |

**Verification:** After execute, re-count confirmed **0** seed `cnf_projects` and **0** seed `cnf_tracker_records`.

### What Was Kept in Supabase

- All non-seed `cnf_projects`, `support_activities`, `registry`, `profiles`, `notifications`, and other tables
- Schema and migrations (including v62/v63 migration files in repo history on remote until force push; local repo reset removes v62/v63 commits from `main`)
- Auth users and app-created records

---

## Git Rollback

| Step | Result |
|------|--------|
| `git fetch origin` | Pass |
| `git reset --hard 04f517b` | Pass — HEAD at v61 |
| `git clean -fd` | Pass — removed uncommitted files |
| `npm install` | Pass |
| `npm run build` | Pass |
| `git push origin main --force` | Pass — `49c64c9` → `04f517b` |

**Target commit:** `04f517b` (`04f517be5c5e117be1f44744d06f35dae9a1a53b`) — v61: persist CNF Tracker and Projects drafts across navigation

**Reverted on main:** v62 (seed CSV pipeline), v63 (seed re-import guard, cnf_tracker smoke/verify), and uncommitted local fixes.

---

## Deploy

- No `deploy` script in `package.json`; GitHub Pages deploy via `.github/workflows/deploy.yml` on push to `main`.
- Force push triggered workflow run `27865901801` for commit `04f517b` — **success**.
- Production URL: `https://carlolidres.github.io/ProjectTracker_React/`

---

## What Was Not Implemented

- Supabase grant migration for `service_role` DELETE on `project_cnf_links` / `audit_logs` (optional cleanup skipped).
- Re-creation of seed rollback script in repo (intentionally ephemeral; run before git reset).

---

## Verification

| Check | Result |
|-------|--------|
| Seed rollback dry-run | Pass — 87 projects, 47 trackers counted |
| Seed rollback execute | Pass — 0 seed rows after delete |
| `npm run build` at v61 | Pass |
| Force push `main` | Pass |

---

## Git Traceability

- Commit message: `v64: rollback to pre-seed stable state (v61)`
- Commit hash: `2422e5d` (`2422e5ded52e74d1d6f713a372238fe1f8ffc2a3`)

---

## Next Steps

1. Confirm GitHub Pages deploy workflow completes successfully for `04f517b`.
2. Smoke-test Project Entry and CNF Tracker draft persistence (v61 behavior).
3. If orphaned seed audit rows matter, apply `GRANT DELETE ON audit_logs TO service_role` and re-run targeted cleanup.
4. Re-plan seed import separately when ready (v62/v63 work available in git history if needed).

---

## Summary Since v63

v63 added seed re-import guards and cnf_tracker smoke tests. v64 rolls back `main` to v61 and removes 87 seed projects and 47 seed CNF tracker rows from Supabase, discarding v62/v63 application changes and uncommitted fixes per user request.
