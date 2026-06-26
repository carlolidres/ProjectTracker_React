# Codebase Bug Audit

## Remediation Progress (2026-06-26)

| Bug ID | Status | Notes |
| ------ | ------ | ----- |
| BUG-001 | FIXED (pending migration apply + runtime verify) | Migration `030_audit_password_feedback_rls.sql`; one-time random reset; `must_change_password` enforced in login/protected routes |
| BUG-002 | PARTIAL | Audit read limited to admin/view; view role blocked from project/support writes; department-scoped RLS still deferred |
| BUG-003 | DEFERRED | Transactional audited mutations need RPC design |
| BUG-004 | FIXED (pending migration apply + runtime verify) | Migration `030` allows active users (including admin) to insert own feedback |
| BUG-005 | FIXED (pending runtime verify) | URL-derived filters reconciled in Projects Database and Support Activities |
| BUG-006 | FIXED (pending runtime verify) | Login page shows pending/inactive status after sign-in |
| BUG-007 | FIXED | Date adjustment modal surfaces persistence errors |
| BUG-008 | FIXED | Removed duplicate type barrel export |
| RISK-003 | FIXED | Login uses `loginPasswordRules()`; signup/profile change keep strength rules |

Verification this pass: `npm run typecheck` PASS, `npm run build` PASS (prior pass), `npx tsx scripts/verify-url-derived-filters.ts` PASS. Supabase migration `030` NOT applied remotely (requires owner approval for high-impact RLS/password RPC change).

## 1. Executive Summary

Overall condition: the React/Vite application currently type-checks and builds successfully, and the remote Supabase table-existence/authenticated-read verification passed. Static review found several serious security, compliance, and workflow risks that are not caught by TypeScript.

Finding count:

- Critical: 2
- High: 2
- Medium: 3
- Low: 1
- Suspected risks: 4

Most urgent risks:

- The admin password reset RPC uses a committed shared default password and the app does not enforce the `must_change_password` flag.
- Later RLS migrations and route access allow all active users broader read/write access than the approved role model allows, including audit log visibility and project/support writes.
- Critical project/support/CNF/registry mutations are not transactional with audit writes, so data can be changed without complete audit evidence.

Build/run status:

- `npm run typecheck`: passed.
- `npm run build`: passed with the existing Vite large chunk warning.
- Remote Supabase table verification: passed.
- Full mutating Supabase smoke was not run because it writes to the remote database and the review constraints prohibit changing production data.

## 2. Validation Results

| Check | Command | Result | Important Output |
| ----- | ------- | ------ | ---------------- |
| Type check | `npm run typecheck` | Pass | `tsc -b --noEmit` completed successfully. |
| Lint | N/A | Not available | `package.json` has no lint script. |
| Tests | N/A for app unit tests | Not available | `package.json` has no unit/integration test script. Workflow app smoke is listed separately. |
| Production build | `npm run build` | Pass | Vite built `dist/`; warning remains: JS chunk is larger than 500 kB after minification. |
| Database verification | `npm run verify:supabase` | Pass | Auth health `200 OK`; core tables verified for anon existence/RLS probe and authenticated reads. |
| Supabase smoke | `npm run smoke:supabase` | Not run | Rejected because it performs authenticated writes to remote Supabase; review constraints say not to change production data. |
| Migration validate | `npm run migrate:validate` | Fail | Command ran after sandbox retry; failed because `exports/projects.csv` and `exports/support_activities.csv` are missing. No data was written. |
| Workflow schema | `python workflow-app\scripts\validate_schema.py` | Pass | `PASS: workflow SQLite schema validates.` |
| Workflow smoke | `python workflow-app\scripts\smoke_test.py` | Pass | `PASS: workflow app smoke test completed.` |

## 3. Confirmed Bugs

### BUG-001: Admin password reset uses a committed shared default password and never enforces password change

* **Severity:** Critical
* **Status:** Confirmed
* **Affected area:** Authentication, admin user management, password reset, security
* **Files involved:** `supabase/migrations/011_password_reset_requests.sql`, `src/services/passwordResetService.ts`, `src/features/admin/AdminUsersPage.tsx`, `src/features/auth/LoginPage.tsx`, `src/components/layout/profile-settings-modal.tsx`, `src/types/user.ts`
* **Relevant functions/components:** `admin_complete_password_reset`, `adminCompletePasswordReset`, `AdminUsersPage.handlePasswordReset`, `LoginPage`, `ProfileSettingsModal`
* **Observed behavior:** Admin reset sets every reset account to the same hard-coded password in a committed migration. The migration sets `profiles.must_change_password = true`, but the frontend profile type does not include that field and no route guard or login flow requires the user to change it.
* **Expected behavior:** Password reset must not rely on a committed shared password. Users should receive a secure reset flow or be forced to set a new password before app access continues.
* **Root cause:** `admin_complete_password_reset` declares `default_password text := '1L0veJ3sus';` and updates `auth.users.encrypted_password` directly. The application never reads or enforces `must_change_password`.
* **Reproduction steps:**
  1. As a user, submit a password reset request.
  2. As admin, click **Reset Password** in User Management.
  3. The account password is reset to the committed shared default, and subsequent login is not blocked by a forced-change screen.
* **Recommended fix:** Replace the shared default reset with a Supabase-supported recovery/invite/update flow that does not expose a reusable secret. If retaining an admin-completed reset, generate a one-time random temporary credential server-side, store no plaintext, and enforce `must_change_password` in `AuthProvider`/`ProtectedRoute` before any app route renders. Add `must_change_password` to profile types only if it remains part of the design.
* **Acceptance criteria:**
  * [ ] No committed SQL, source, Markdown, or UI text contains a reusable reset password.
  * [ ] Reset users cannot access protected routes until they change their password.
  * [ ] Admin reset action produces an auditable event without exposing credentials.
  * [ ] Type-check/build pass and a manual reset flow test is documented.
* **Regression risks:** Login, signup, admin user management, profile password change, pending/inactive account handling.
* **Suggested tests:** Unit test password-reset service branching; manual admin reset on a test user; manual login with `must_change_password=true`; verify protected routes redirect to forced-change flow.
* **Dependencies:** Decide whether to use Supabase email recovery, Edge Function, or an RPC-based one-time reset model before implementing.

### BUG-002: RLS and route access allow broader access than the approved role model

* **Severity:** Critical
* **Status:** Confirmed
* **Affected area:** Authorization, RLS, role permissions, audit trail, project/support data integrity
* **Files involved:** `supabase/migrations/008_standalone_open_access.sql`, `supabase/migrations/009_auth_admin_approval.sql`, `src/lib/roleAccess.ts`, `src/app/router.tsx`, `src/features/audit-trail/AuditTrailPage.tsx`, `src/features/projects/ProjectEntryPage.tsx`, `src/features/support-activities/SupportActivitiesPage.tsx`
* **Relevant functions/components:** `ROUTE_ACCESS`, `ProtectedRoute`, `AuditTrailPage`, `ProjectEntryPage`, `SupportActivitiesPage`, RLS policies for `cnf_projects`, `support_activities`, `notifications`, `audit_logs`
* **Observed behavior:** Later migrations create policies such as `Active users can insert projects`, `Active users can update projects`, `Active users can insert support`, `Active users can update support`, and `Active users can read audit logs`. The UI also marks `/audit-trail` as `roles: "all"`. This conflicts with the baseline/Data Map role model where audit logs are Admin/View and department roles should not have unrestricted edit authority.
* **Expected behavior:** RLS must enforce the same trusted authorization boundary as the approved role model. UI restrictions cannot be the only control for regulated data.
* **Root cause:** Migrations 008/009 intentionally broadened policies to all active users, and the route map exposes audit trail to every role. Later migrations repair registry admin-only access but do not restore project/support/audit role restrictions.
* **Reproduction steps:**
  1. Inspect `supabase/migrations/009_auth_admin_approval.sql`.
  2. Observe all active users can insert/update projects and support, and read audit logs.
  3. Inspect `src/lib/roleAccess.ts`; `/audit-trail` is open to all roles.
* **Recommended fix:** Add a new migration that restores role-based RLS for project/support writes and audit reads. Align `ROUTE_ACCESS`, sidebar visibility, and `ProtectedRoute` with the same role model. Do not rely on form read-only controls as the data boundary.
* **Acceptance criteria:**
  * [ ] Non-admin/view roles cannot read audit logs through route navigation or direct Supabase calls unless explicitly approved.
  * [ ] View role cannot insert/update project, support, notification, CNF tracker, registry, or feedback triage data.
  * [ ] Department roles can only perform approved mutations for their workflow scope, or an approved broader-role policy is documented.
  * [ ] Supabase verification includes role-negative tests using test users.
* **Regression risks:** Projects save, support save, dashboard notification refresh, audit trail visibility, admin registry/user pages.
* **Suggested tests:** RLS smoke tests for admin, view, AM/BM/PL, PP, TSD, VAL, QC, QA; UI route guard tests for `/audit-trail`; manual direct Supabase calls with non-admin test users.
* **Dependencies:** Requires owner decision if the project intentionally changed from role-based RLS to open active-user access.

### BUG-003: Critical mutations are not atomic with audit logging

* **Severity:** High
* **Status:** Confirmed
* **Affected area:** Data integrity, auditability, GxP compliance
* **Files involved:** `src/services/projectService.ts`, `src/services/supportActivityService.ts`, `src/services/cnfTrackerService.ts`, `src/services/registryService.ts`, `src/services/auditService.ts`
* **Relevant functions/components:** `saveProject`, `updateProject`, `archiveProject`, `restoreProject`, `saveSupportActivity`, `archiveSupportActivity`, `restoreSupportActivity`, `saveCnfTrackerRecord`, `saveRegistryValue`, `setRegistryStatus`, `logAuditTrail`, `logAuditDiff`, `logAuditEntries`
* **Observed behavior:** Services write business rows first and then write audit logs in separate client-side calls. If an audit insert fails after the data write succeeds, the UI may report failure even though data changed, and audit history can be incomplete.
* **Expected behavior:** Critical create/update/archive/restore operations should commit business data and audit records atomically, or fail without changing either.
* **Root cause:** Browser service-layer code performs multi-step Supabase operations without database transactions or RPC wrappers.
* **Reproduction steps:**
  1. Inspect `saveProject`: inserts `cnf_projects`, then loops through `logAuditEntries`.
  2. Inspect `updateProject`: updates/inserts/deactivates rows before audit calls complete.
  3. Inspect support/CNF/registry services: the same pattern repeats.
* **Recommended fix:** Move critical mutations into database RPC functions or Edge Functions that perform data changes and audit inserts in one transaction. For short-term mitigation, prevent UI from reporting a full save failure when only downstream notification/audit calls fail, but do not treat that as a compliance-complete fix.
* **Acceptance criteria:**
  * [ ] Project create/update/archive and support create/update/archive cannot persist without required audit entries.
  * [ ] Audit insert failures roll back business mutations or are impossible due to database trigger/RPC design.
  * [ ] UI messages distinguish business-save failures from post-save refresh failures.
  * [ ] Tests cover an injected audit failure path.
* **Regression risks:** All save/archive/restore workflows, duplicate checks, date adjustment Lessons Learned, notification refresh after save.
* **Suggested tests:** RPC transaction tests; forced audit insert failure in a test database; manual project/support/CNF save and audit trail verification.
* **Dependencies:** Best fixed after BUG-002 so the same RPCs can enforce trusted role checks.

### BUG-004: Admin "Send test feedback" flow is blocked by app_feedback RLS

* **Severity:** High
* **Status:** Confirmed
* **Affected area:** Admin feedback inbox, user feedback testing
* **Files involved:** `src/components/layout/feedback-chat.tsx`, `src/services/feedbackService.ts`, `supabase/migrations/013_app_feedback.sql`, `supabase/migrations/014_app_feedback_policy_fix.sql`, `supabase/migrations/015_app_feedback_block_admin_insert.sql`
* **Relevant functions/components:** `FeedbackChat`, `FeedbackInboxModal`, `FeedbackSubmitModal`, `submitAppFeedback`, `app_feedback_insert_authenticated`
* **Observed behavior:** The admin inbox now shows **Send test feedback**, but the active insert policy requires `NOT public.is_active_admin()`. Admin submissions through `submitAppFeedback` will be rejected by RLS.
* **Expected behavior:** If admins are expected to create test feedback, the RLS policy and audit/documentation should explicitly allow admin self-test inserts. If admins should not insert feedback, the button should not exist.
* **Root cause:** UI behavior was changed without adding a matching policy migration. Migrations 013/014/015 all preserve the admin insert block; later feedback migrations only add status/TTL/update behavior.
* **Reproduction steps:**
  1. Sign in as an active admin.
  2. Open User Feedback.
  3. Click **Send test feedback**, submit the form.
  4. Supabase rejects the insert due to the admin-blocking RLS check.
* **Recommended fix:** Add a migration that either allows active admins to insert rows with `auth.uid() = user_id` and a clear marker/test policy, or remove the admin test button and restore non-admin-only UX. Keep select/update admin-only.
* **Acceptance criteria:**
  * [ ] Admin test feedback submission succeeds only if approved by policy.
  * [ ] Non-admin feedback submission still works.
  * [ ] Non-admin users cannot read/triage feedback.
  * [ ] Feedback TTL/status behavior still works.
* **Regression risks:** Feedback inbox unread badge, feedback status updates, purge RPC, non-admin feedback form.
* **Suggested tests:** RLS insert tests for admin and non-admin; manual admin test feedback submission; feedback inbox refresh.
* **Dependencies:** Requires a schema/RLS migration.

### BUG-005: Database page URL filters are not cleared when query parameters disappear

* **Severity:** Medium
* **Status:** Confirmed
* **Affected area:** Dashboard drill-downs, Projects Database filters, Support Activities filters, browser back/forward navigation
* **Files involved:** `src/features/projects/ProjectsDatabasePage.tsx`, `src/features/support-activities/SupportActivitiesPage.tsx`, `src/lib/dashboardDrilldown.ts`
* **Relevant functions/components:** `ProjectsDatabasePage` URL-param `useEffect`, `SupportActivitiesPage` URL-param `useEffect`, `filterProjectRows`, `filterSupportRows`
* **Observed behavior:** The URL-param effects only merge params when they exist. If a user navigates from `/projects/database?drill=pending_cnf` to `/projects/database` in the same mounted component, the previous `drill` filter remains in React state. The same stale-state pattern exists for support `due_window`.
* **Expected behavior:** Filter state should reflect the current URL. Removing query params should clear URL-derived filters.
* **Root cause:** Effects use conditional `if (cnfStatus || finalStatus || dueWindow || pendingRole || drill)` before setting filters and never remove absent URL-derived keys.
* **Reproduction steps:**
  1. From Dashboard, click **Pending CNF**.
  2. Navigate to plain Projects Database or use browser back/forward so query params are removed.
  3. Observe the table can remain filtered by the prior drill state.
* **Recommended fix:** Separate URL-derived filters from user-entered filters or fully reconcile the URL-derived keys on every `searchParams` change. Clear `cnf_status`, `final_status`, `due_window`, `pending_role`, and `drill` when absent from the URL if they came from the URL.
* **Acceptance criteria:**
  * [ ] Navigating to `/projects/database` clears prior dashboard drill filters.
  * [ ] Navigating to `/support-activities` clears prior dashboard support due-window filters.
  * [ ] Manual in-page filter selections still behave normally.
  * [ ] Browser back/forward produces table contents matching the visible URL.
* **Regression risks:** Dashboard KPI cards, project database manual filters, support activity manual filters, export of filtered rows.
* **Suggested tests:** Component or browser tests for URL param add/remove; manual back/forward checks from dashboard KPI cards.
* **Dependencies:** None.

### BUG-006: Pending or inactive users can sign in but receive no clear login-page status

* **Severity:** Medium
* **Status:** Confirmed
* **Affected area:** Authentication, account approval UX
* **Files involved:** `src/features/auth/LoginPage.tsx`, `src/components/common/protected-route.tsx`, `src/app/auth-provider.tsx`
* **Relevant functions/components:** `LoginPage`, `ProtectedRoute`, `AuthProvider`
* **Observed behavior:** `LoginPage` redirects only when `user && profile?.status === "active"`. For pending/inactive users, sign-in succeeds, the form resets due to `user` changing, and the user remains on the login card without the approval/inactive `Result` shown by `ProtectedRoute`.
* **Expected behavior:** After a successful sign-in with pending/inactive profile, the user should see a clear awaiting-approval/inactive message or be navigated to a protected route where `ProtectedRoute` displays it.
* **Root cause:** Pending/inactive status messaging exists only in `ProtectedRoute`; `LoginPage` does not render it and does not navigate after sign-in unless active.
* **Reproduction steps:**
  1. Sign in with a pending or inactive account.
  2. Observe the login screen remains with no success/error status explaining account state.
  3. Navigate manually to `/dashboard`; only then does `ProtectedRoute` show the proper message.
* **Recommended fix:** In `LoginPage`, render the same pending/inactive account status when `user && profile && profile.status !== "active"`, or navigate to `/dashboard` after successful sign-in and let `ProtectedRoute` handle messaging.
* **Acceptance criteria:**
  * [ ] Pending account sign-in shows "Account awaiting approval".
  * [ ] Inactive account sign-in shows "Account inactive".
  * [ ] Active sign-in still routes to Dashboard.
  * [ ] Sign-out from the status state returns to a clean login form.
* **Regression risks:** Signup success messaging, login form reset, protected-route redirects.
* **Suggested tests:** Manual pending/inactive/active login checks; component test for `LoginPage` profile status states.
* **Dependencies:** None.

### BUG-007: Date-adjustment lesson save failures are swallowed silently

* **Severity:** Medium
* **Status:** Confirmed
* **Affected area:** Date adjustment workflow, Lessons Learned, form save blocking
* **Files involved:** `src/app/date-adjustment-provider.tsx`, `src/services/lessonsLearnedService.ts`
* **Relevant functions/components:** `DateAdjustmentProvider.handleSubmit`, `saveDateAdjustmentLessons`
* **Observed behavior:** If `saveDateAdjustmentLessons` fails, `handleSubmit` catches the error with an empty catch block. The modal remains open, but the user gets no error message explaining why save cannot continue.
* **Expected behavior:** Users should see the Lessons Learned save error and know whether the project/support save was blocked.
* **Root cause:** `DateAdjustmentProvider.handleSubmit` catches both validation and persistence errors but does not expose persistence errors in component state or Ant Design messages.
* **Reproduction steps:**
  1. Trigger a date adjustment reason prompt.
  2. Cause `lessons_learned` insert to fail, for example with missing RLS permission in a test database.
  3. Click **Save reasons and continue**.
  4. Modal stays open with no visible error.
* **Recommended fix:** Track a modal error state or use `message.error` for persistence failures while preserving form validation behavior. Do not close or approve the modal unless `saveDateAdjustmentLessons` succeeds.
* **Acceptance criteria:**
  * [ ] Validation errors still show on form fields.
  * [ ] Persistence/RLS/network errors show a visible modal-level error.
  * [ ] The project/support save does not continue when lesson save fails.
* **Regression risks:** Project date adjustment saves, support date adjustment saves, Lessons Learned table.
* **Suggested tests:** Mock `saveDateAdjustmentLessons` rejection; manual date adjustment with test DB permission failure.
* **Dependencies:** None.

### BUG-008: Duplicate export from central type barrel

* **Severity:** Low
* **Status:** Confirmed
* **Affected area:** Type exports, maintainability
* **Files involved:** `src/types/index.ts`
* **Relevant functions/components:** Type barrel exports
* **Observed behavior:** `src/types/index.ts` exports `./cnfTracker` twice.
* **Expected behavior:** Each type module should be exported once.
* **Root cause:** Duplicate export line.
* **Reproduction steps:**
  1. Open `src/types/index.ts`.
  2. Observe duplicate `export * from "./cnfTracker";` lines.
* **Recommended fix:** Remove the duplicate export.
* **Acceptance criteria:**
  * [ ] Type barrel exports each module once.
  * [ ] Type-check still passes.
* **Regression risks:** None expected.
* **Suggested tests:** `npm run typecheck`.
* **Dependencies:** None.

## 4. Suspected Risks

### RISK-001: Client-side sequential ID allocation can collide under concurrent users

* **Severity:** Medium
* **Status:** Suspected
* **Affected area:** Project IDs, CNF tracker IDs, lesson IDs, support project IDs
* **Files involved:** `src/lib/idGeneration.ts`, `supabase/migrations/001_initial_schema.sql`, `supabase/migrations/018_lesson_id.sql`, `supabase/migrations/027_cnf_tracker_records.sql`
* **Relevant functions/components:** `getNextSequentialId`, `getNextProjectId`, `getNextCnfTrackerId`, `getNextLessonIds`, `getNextSupportProjectId`
* **Evidence:** IDs are generated by selecting existing IDs client-side, finding max, then incrementing. `cnf_tracker_id` has a unique constraint, but `project_id` is shared by multiple PO rows and has no logical server-side allocator. Concurrent clients can receive the same next ID before either saves.
* **Verification required:** Use two authenticated browser sessions or a test script to request `getNextProjectId()` simultaneously, then save both projects. Confirm whether duplicate logical project IDs occur or whether another constraint blocks it.
* **Observed behavior:** Not reproduced during this static review.
* **Expected behavior:** IDs should be allocated atomically by the database.
* **Root cause:** Client-side max+1 ID generation is not concurrency-safe.
* **Reproduction steps:**
  1. Open two sessions with create permission.
  2. Start a new project in both before either saves.
  3. Save both and inspect `project_id` values.
* **Recommended fix:** Add database sequences/RPC allocators for logical IDs. For multi-row project saves, reserve the project ID transactionally before inserts.
* **Acceptance criteria:**
  * [ ] Concurrent new-project saves cannot receive the same logical project ID.
  * [ ] CNF tracker and Lessons Learned IDs are also allocated atomically or uniqueness failures are handled cleanly.
* **Regression risks:** Project creation, support activity creation, CNF tracker creation, Lessons Learned generation.
* **Suggested tests:** Concurrency test against a test Supabase project.
* **Dependencies:** Prefer after BUG-003 transactional mutation design.

### RISK-002: Unpaginated `select("*")` calls can truncate or slow dashboards and exports on large datasets

* **Severity:** Medium
* **Status:** Suspected
* **Affected area:** Dashboard, Projects Database, Support Activities, notifications, exports
* **Files involved:** `src/services/projectService.ts`, `src/services/supportActivityService.ts`, `src/services/dashboardService.ts`, `src/services/notificationService.ts`, `src/features/projects/ProjectsDatabasePage.tsx`, `src/features/support-activities/SupportActivitiesPage.tsx`
* **Relevant functions/components:** `listActiveProjects`, `listActiveSupportActivities`, `getDashboardData`, `refreshAllNotifications`, `listNotifications`
* **Evidence:** Core pages fetch all active rows with `select("*")` and then filter/aggregate client-side. Supabase deployments often cap returned rows, and large datasets will cause repeated heavy reads and client CPU work.
* **Verification required:** Seed or import more rows than the Supabase API max row setting, then compare database counts with UI totals and exported rows. Profile Dashboard load time with production-like volume.
* **Observed behavior:** Not reproduced because mutating/importing data was out of scope.
* **Expected behavior:** Counts, exports, and dashboard metrics should be complete and performant for production volume.
* **Root cause:** Client-side all-row data flow without pagination/range loops or aggregate RPCs.
* **Reproduction steps:**
  1. In a test database, load more than the API max row count.
  2. Open Dashboard and Projects Database.
  3. Compare UI counts/export row counts to SQL counts.
* **Recommended fix:** Implement paginated range fetch helpers for exports/tables and database aggregate RPCs for dashboard cards where practical.
* **Acceptance criteria:**
  * [ ] Dashboard counts match database counts beyond 1,000 rows.
  * [ ] Exports include all filtered rows or clearly page the export.
  * [ ] Dashboard refresh remains under the target threshold with production-sized data.
* **Regression risks:** All dashboard cards, notification refresh, Excel exports, table filters.
* **Suggested tests:** Data-volume integration test and browser performance smoke.
* **Dependencies:** Test database or sanitized large dataset.

### RISK-003: Login form validation may block valid legacy/current passwords shorter than 8 characters

* **Severity:** Medium
* **Status:** Suspected
* **Affected area:** Login, migrated users, account access
* **Files involved:** `src/features/auth/LoginPage.tsx`, `src/lib/passwordValidation.ts`
* **Relevant functions/components:** `LoginPage.onFinish`, `passwordRules`
* **Evidence:** The sign-in form uses `passwordRules()`, which enforces an 8-character minimum before calling Supabase. If any existing Supabase user has a shorter password, the browser form blocks sign-in even though Supabase would decide credential validity.
* **Verification required:** Check test/seeded user password policy and attempt login with a valid shorter password in a non-production account.
* **Observed behavior:** Not reproduced during this review.
* **Expected behavior:** Sign-in should only require non-empty credentials; password-strength rules should apply to signup/new password, not existing-password login.
* **Root cause:** Shared password validation is used for both sign-in and password creation.
* **Reproduction steps:**
  1. Create a test Supabase user with a password shorter than 8 characters if policy allows.
  2. Try signing in through the app.
  3. Observe form validation blocks submit before Supabase auth.
* **Recommended fix:** Use a sign-in-specific rule requiring only a non-empty password. Keep `newPasswordRules()` for signup/change/reset flows.
* **Acceptance criteria:**
  * [ ] Login submit calls Supabase for any non-empty password.
  * [ ] Signup and password change still enforce new password policy.
* **Regression risks:** Login, signup, profile password change.
* **Suggested tests:** Form validation tests for login versus signup/change-password.
* **Dependencies:** Confirm desired password policy with owner.

### RISK-004: Browser smoke coverage is still missing for active v67 UI changes

* **Severity:** Low
* **Status:** Suspected
* **Affected area:** Runtime UX, responsive behavior, dashboard drill-downs, feedback inbox
* **Files involved:** `agent-workflow/HANDOFF.md`, `src/features/projects/ProjectEntryPage.tsx`, `src/features/dashboard/DashboardPage.tsx`, `src/components/layout/feedback-chat.tsx`, `src/components/layout/notification-center.tsx`
* **Relevant functions/components:** Current v67 changed components listed in `HANDOFF.md`
* **Evidence:** `HANDOFF.md` states browser smoke is not run for Projects form controls, dashboard KPI cards, admin feedback submit, and notification bell. Static review cannot confirm rendered breakpoints, clickable controls, or network console behavior.
* **Verification required:** Run the manual browser workflow in `agent-workflow/BROWSER_TESTING.md` on local dev or preview using test accounts.
* **Observed behavior:** Not browser-tested in this audit.
* **Expected behavior:** Recent UI fixes should be verified in desktop, laptop/tablet widths, and mobile where practical.
* **Root cause:** No browser smoke was performed for the current uncommitted v67 batch.
* **Reproduction steps:**
  1. Start local dev/preview.
  2. Test `/projects`, `/dashboard`, `/projects/database`, feedback inbox, and notification bell.
  3. Inspect console and failed network requests.
* **Recommended fix:** Add a scoped browser smoke pass before deployment. Record route, steps, console/network status, and responsive result.
* **Acceptance criteria:**
  * [ ] Projects form controls are clickable/read-only as expected by role.
  * [ ] Dashboard KPI/drill-down cards navigate and filter correctly.
  * [ ] Admin feedback test flow passes after BUG-004 fix.
  * [ ] Notification bell displays and refreshes without console/network errors.
* **Regression risks:** Layout, routing, role UI, feedback, notifications.
* **Suggested tests:** Manual browser verification plus Playwright smoke if this becomes recurring.
* **Dependencies:** BUG-004 should be fixed before claiming admin feedback test pass.

## 5. Cursor Execution Plan

### Phase 1 - Critical and security defects

Bug IDs: `BUG-001`, `BUG-002`

Files likely to be modified:

- `supabase/migrations/`
- `src/app/auth-provider.tsx`
- `src/components/common/protected-route.tsx`
- `src/features/auth/LoginPage.tsx`
- `src/features/admin/AdminUsersPage.tsx`
- `src/lib/auth.ts`
- `src/lib/roleAccess.ts`
- `src/app/router.tsx`
- `src/types/user.ts`

Required database migrations:

- New migration replacing shared default password reset behavior.
- New migration restoring role-aligned RLS for project/support/audit/notification tables.

Required environment changes:

- Possibly Supabase email templates/redirect URLs or an Edge Function secret if owner approves a secure server-side reset path.

Tests/checks before next phase:

- `npm run typecheck`
- `npm run build`
- `npm run verify:supabase`
- Role-negative RLS checks with test users
- Manual login/reset smoke with test users

### Phase 2 - Broken core workflows

Bug IDs: `BUG-003`, `BUG-004`, `BUG-006`

Files likely to be modified:

- `src/services/projectService.ts`
- `src/services/supportActivityService.ts`
- `src/services/cnfTrackerService.ts`
- `src/services/registryService.ts`
- `src/services/auditService.ts`
- `src/components/layout/feedback-chat.tsx`
- `src/services/feedbackService.ts`
- `src/features/auth/LoginPage.tsx`
- `supabase/migrations/`

Required database migrations:

- Transactional RPCs or triggers for audited mutations.
- Feedback insert policy migration if admin test feedback remains approved.

Required environment changes:

- None expected unless transactional work moves to Edge Functions.

Tests/checks before next phase:

- `npm run typecheck`
- `npm run build`
- Test DB mutation/audit transaction tests
- Manual feedback inbox/test submission with admin and non-admin test users

### Phase 3 - Data, filtering, and state-management defects

Bug IDs: `BUG-005`, `BUG-007`, `RISK-001`, `RISK-002`

Files likely to be modified:

- `src/features/projects/ProjectsDatabasePage.tsx`
- `src/features/support-activities/SupportActivitiesPage.tsx`
- `src/app/date-adjustment-provider.tsx`
- `src/services/lessonsLearnedService.ts`
- `src/lib/idGeneration.ts`
- `src/services/projectService.ts`
- `src/services/dashboardService.ts`
- `src/services/notificationService.ts`

Required database migrations:

- Optional ID allocator RPC/sequence migration.
- Optional dashboard aggregate RPCs.

Required environment changes:

- None expected.

Tests/checks before next phase:

- `npm run typecheck`
- `npm run build`
- Browser back/forward filter test
- Date-adjustment failure handling test
- Concurrency/volume tests in a test database if implementing risk items

### Phase 4 - UI, responsiveness, and edge cases

Bug IDs: `RISK-003`, `RISK-004`

Files likely to be modified:

- `src/features/auth/LoginPage.tsx`
- `src/lib/passwordValidation.ts`
- Possibly Playwright/manual test docs if added

Required database migrations:

- None expected.

Required environment changes:

- None expected.

Tests/checks before next phase:

- `npm run typecheck`
- `npm run build`
- Manual browser smoke from `agent-workflow/BROWSER_TESTING.md`
- Login form validation checks

### Phase 5 - Cleanup and maintainability

Bug IDs: `BUG-008`

Files likely to be modified:

- `src/types/index.ts`

Required database migrations:

- None.

Required environment changes:

- None.

Tests/checks before completion:

- `npm run typecheck`
- `npm run build`

## 6. Cursor Handoff Prompt

```text
Follow AGENTS.md exactly for ProjectTracker_React.

Read CODEX_BUG_AUDIT_HANDOFF.md first, then fix findings by severity and dependency order:

1. Phase 1: BUG-001 and BUG-002.
2. Phase 2: BUG-003, BUG-004, and BUG-006.
3. Phase 3: BUG-005, BUG-007, then RISK-001/RISK-002 only after verifying they are in scope.
4. Phase 4: RISK-003/RISK-004 only after verification.
5. Phase 5: BUG-008.

Make minimal, targeted changes. Preserve existing working behavior and avoid unrelated refactoring. Do not disable authentication, authorization, RLS, validation, audit logging, or security controls to make checks pass. Do not change production data. Do not expose secrets, tokens, credentials, or reset passwords.

For every database/security finding, inspect the current migrations and actual service/page code before editing. Add new migrations for schema/RLS changes; do not rewrite historical migrations unless the owner explicitly approves. Stop and document the issue instead of guessing when a database schema, credential, migration, or business requirement is missing.

Add or update focused tests/checks where practical. At minimum run:

- npm run typecheck
- npm run build
- npm run verify:supabase when schema/RLS/auth changes are made
- any relevant non-mutating or test-database smoke checks

Do not run mutating remote Supabase smoke tests against production unless the owner explicitly approves.

Update CODEX_BUG_AUDIT_HANDOFF.md as work progresses with:

- fixed items
- deferred items
- verification results
- remaining risks

Also update agent-workflow/HANDOFF.md after meaningful completed work, following AGENTS.md.
```

---

## Reviewers Feedback

- **Reviewers:** @carlo-mauring
- **Comments:**
