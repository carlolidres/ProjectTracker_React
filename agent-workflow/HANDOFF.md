# Current Handoff

Last Updated: `2026-06-26 Asia/Taipei`
Version: `v67 bug-audit remediation`
Branch: `main`

## Current Status

Executed `CODEX_BUG_AUDIT_HANDOFF.md` remediation for Phases 1–5 except deferred transactional RLS scope (BUG-003) and full department-scoped RLS (BUG-002 remainder). Debug instrumentation remains in `ProjectsDatabasePage.tsx` and `feedback-chat.tsx` for runtime verification.

## Recently Completed

- BUG-001: Random one-time admin password reset RPC + `must_change_password` enforcement (`ForcePasswordChangeScreen`, login/protected routes).
- BUG-002 (partial): Audit trail route/RLS limited to admin/view; view role blocked from project/support writes.
- BUG-004: `app_feedback` insert policy allows admin self-test feedback (migration 030).
- BUG-005: URL-derived database filters reconcile when query params are removed.
- BUG-006: Pending/inactive accounts see status on login page after sign-in.
- BUG-007: Date adjustment modal shows persistence errors.
- BUG-008: Removed duplicate `cnfTracker` export.
- RISK-003: Login no longer enforces 8-character minimum before Supabase auth.

## Active Work

- Objective: `Complete CODEX bug audit remediation and runtime verification.`
- Progress: `Committed and pushed v67; GitHub Pages deploy triggered; migration 030 apply in progress.`
- Remaining: `Browser smoke after migration 030 apply.`

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| High | BUG-003 transactional audit writes not implemented | Data/audit atomicity gap remains | Design audited mutation RPCs |
| Medium | BUG-002 department-scoped RLS not restored | Non-view roles still have broad write access at DB layer | Owner decision + follow-up migration |
| Medium | Migration `030` not applied remotely | Password/feedback/RLS fixes inactive in Supabase | Apply via approved workflow |
| Low | BUG-003 transactional audit writes | Data/audit atomicity gap | Deferred RPC design |

## Verification

| Check | Status | Result |
|---|---|---|
| Type-check | PASSED | `npm run typecheck` |
| Build | PASSED | `npm run build` |
| Supabase migration 030 | NOT_RUN | Local SQL only |
| URL filter verification | PASSED | `npx tsx scripts/verify-url-derived-filters.ts` |
| Debug instrumentation | REMOVED | After verification script pass |

## Next Action

`Confirm GitHub Pages deploy and migration 030; run browser smoke for drill-down filter clear, admin feedback, and forced password change.`

## Decisions and Simplifications

- Decision: `Defer BUG-003 RPC transaction work until after role-aligned RLS design is settled.`
- Decision: `Implement partial BUG-002 (audit + view read-only) without rewriting all department write policies.`
- `ponytail:` `URL filter reconciliation strips only URL-owned keys so manual in-page filters keep working.`

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`

## Supabase Sync

- Migration changed: `030_audit_password_feedback_rls.sql`
- Applied to Supabase: `NO`
- Verification command/result: `NOT_RUN`
- Rollback: `Revert migration 030 if policy/password changes cause regressions`
