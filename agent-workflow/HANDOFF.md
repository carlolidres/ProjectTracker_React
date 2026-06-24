# Current Handoff

Last Updated: `2026-06-24 Asia/Taipei`
Version: `v65 deployed + session/save fixes pending commit`
Branch: `main`
Commit: `a4d4663`
Deployment: `GitHub Pages deploy succeeded (run 27951964986) at https://carlolidres.github.io/ProjectTracker_React/`

## Current Status

Session-security fixes from workflow feedback are implemented locally. Project creation save failure traced to `mapProjectToDb` sending a non-existent `risk_control` column; fixed and verified with `scripts/verify-project-save-map.ts`.

## Recently Completed

- Session security: sessionStorage auth, 15-minute inactivity logout, full cleanup on logout/expiry, login field reset after logout.
- Fixed project save: removed phantom `risk_control` flat column from `mapProjectToDb` (QA field lives in `cnf_entries_json` only).
- Clear save errors: `formatServiceError()` for Supabase failures; session-missing guard no longer fails silently; toast + Alert on save failure.
- Notification refresh remains best-effort after confirmed save (prior fix retained).
- Ran `npm run typecheck`, `npm run build`, `npm run smoke:supabase`, and `npx tsx scripts/verify-project-save-map.ts` successfully.

## Active Work

- Objective: `Address owner feedback on session security and project save.`
- Progress: `Implemented and verified locally.`
- Remaining: `Browser smoke for login/logout/inactivity; commit/deploy if accepted; apply migration 029 remotely.`

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Medium | Migration `029_feedback_purge_rpc_repair.sql` not applied remotely | Admin feedback inbox purge RPC may still 400 until applied | Apply via Supabase CLI or dashboard |
| Medium | Spreadsheet views for Projects and Support Activities are pending. | Owner-requested bulk import/edit/save workflow not implemented. | Create a scoped implementation plan |
| Low | Browser smoke for session lifecycle and project save not performed in browser | Runtime UX unverified in browser | Run checks in `BROWSER_TESTING.md` |
| Low | Vite build warns that the main JS chunk is larger than 500 kB. | Performance warning only; build passes. | Consider code-splitting as a future task |

## Verification

| Check | Status | Result |
|---|---|---|
| Type-check | PASSED | `npm run typecheck` |
| Build | PASSED | `npm run build` |
| Supabase smoke | PASSED | `npm run smoke:supabase` |
| Project save map | PASSED | `npx tsx scripts/verify-project-save-map.ts` |
| Browser smoke | NOT_RUN | Login/logout/save not browser-tested in this pass |
| Supabase migration | NOT_RUN | No new migration in this pass |

## Next Action

`Browser smoke login/logout/save, apply migration 029 to Supabase, then commit/deploy if accepted.`

## Minimal Read Set for the Next Agent

| Path | Reason |
|---|---|
| `src/lib/mappers.ts` | Project row mapping; no flat `risk_control` column |
| `src/lib/supabaseClient.ts` | Session-only Supabase auth storage |
| `src/app/auth-provider.tsx` | 15-minute inactivity logout |
| `src/features/projects/ProjectEntryPage.tsx` | Save error handling |
| `agent-workflow/PLAN.md` | Accepted scope and pending spreadsheet work |

## Decisions and Simplifications

- Decision: `Use Supabase sessionStorage auth persistence to meet browser-closure session termination without replacing Supabase Auth.`
- Decision: `Keep QA risk_control in cnf_entries_json only; do not map a flat DB column that does not exist.`
- Decision: `Treat notification rebuild as best-effort after successful project save.`
- `ponytail:` `Fixed save at the mapper boundary instead of adding a migration for a field already stored in JSON.`

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`

## Supabase Sync

- Migration changed: `NONE`
- Applied to Supabase: `NONE`
- Verification command/result: `verify-project-save-map.ts PASS`
- Rollback: `Revert mapper/session/error-handling changes if needed`
