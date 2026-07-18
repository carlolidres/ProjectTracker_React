# Code Map

Last Updated: `2026-07-18`

## Purpose

Use this map to locate implementation areas without scanning the repository. List only high-value paths that agents regularly need.

Database schema and migration details belong in `DATA_MAP.md` and `supabase/migrations/`.

## Application Entry Points

| Path | Responsibility |
|---|---|
| `src/main.tsx` | React DOM bootstrap and global style import entry. |
| `src/app/App.tsx` | App providers, Ant Design app wrapper, HashRouter, menu-permission/registry/date/meeting providers. |
| `src/app/router.tsx` | Route definitions and protected route wiring. |
| `src/app/menu-permission-provider.tsx` | Loads menu permission overrides; exposes `can` / `canPath`. |
| `vite.config.ts` | Vite config, `@` alias, GitHub Pages base path. |

## Pages and Major Modules

| Module | Path | Responsibility |
|---|---|---|
| Auth | `src/features/auth/LoginPage.tsx` | Login flow and public entry route. |
| Dashboard | `src/features/dashboard/DashboardPage.tsx` | KPI, worklist, meeting view. Workspace flag: action strip, quick drawer, Browse/My labels (Phase B). |
| Dashboard action strip | `src/features/dashboard/components/DashboardActionStrip.tsx` | Role/menu-gated “Do next” create/browse actions. |
| Project quick drawer | `src/features/dashboard/components/ProjectQuickDrawer.tsx` | Summary + Final Status edit from worklist/notifications. |
| Dashboard charts block | `src/features/dashboard/components/DashboardChartsBlock.tsx` | CNF/final/department/FG/support/monthly charts. |
| Dashboard components | `src/features/dashboard/components/` | Charts and meeting overlay pieces. |
| Return-to helper | `src/lib/dashboardReturnTo.ts` | `return_to` append/read for dashboard create + drill loops. |
| Project Entry | `src/features/projects/ProjectEntryPage.tsx` | Main project form page. |
| Project form components | `src/features/projects/components/` | Hierarchy form, role tabs, field controls, CNF copy modal. |
| Projects Database | `src/features/projects/ProjectsDatabasePage.tsx` | Role-colored AG Grid spreadsheet; search/filter/export; inline role-gated edits. |
| Projects Database Grid | `src/features/projects/components/ProjectsDatabaseGrid.tsx` | Frozen Project ID + two-level role headers; cell edit + width persist. |
| Projects Database columns | `src/lib/projectsDatabaseColumns.ts` | Spreadsheet column/group/role/editor config. |
| Role colors | `src/lib/roleColors.ts`, `src/styles/role-colors.css` | Shared form + spreadsheet role palette. |
| Spreadsheet save | `src/services/projectsDatabaseService.ts` | Patch edits → `updateProject` + emit sync. |
| CNF Tracker | `src/features/cnf-tracker/CnfTrackerPage.tsx` | CNF tracker list, New CNF, detail modal, Unique Batch navigation. |
| CNF select modal | `src/features/cnf-tracker/CnfTrackerSelectModal.tsx` | Insert CNF picker for Projects; New CNF opens `CnfTrackerDetailModal` via `/cnf-tracker?new=1`. |
| Endorsement Tracker | `src/features/endorsement-tracker/EndorsementTrackerPage.tsx` | Endorsement list, detail modal, independent create, item rows, QA-only edit. |
| Support Activities | `src/features/support-activities/SupportActivitiesPage.tsx` | Support activity form and database view. Styles: `src/styles/support-activities.css`. Icons: `src/components/common/lucide-icon.tsx`. |
| Audit Trail | `src/features/audit-trail/AuditTrailPage.tsx` | Audit log browsing and filters. |
| Lessons Learned | `src/features/lessons-learned/LessonsLearnedPage.tsx` | Lessons learned workflow. |
| Archived | `src/features/archived/ArchivedPage.tsx` | Admin archive view. |
| Registry | `src/features/registry/RegistryPage.tsx` | Admin registry management. |
| Admin Users | `src/features/admin/AdminUsersPage.tsx` | Admin user/profile management and password-reset approval. |
| Access Matrix | `src/features/admin/AccessMatrixPage.tsx` | Role × menu View/Create/Edit/Export overrides UI. |
| Password reset service | `src/services/passwordResetService.ts` | Forgot-password request + admin approve via Edge Function. |
| Password reset Edge Function | `supabase/functions/admin-approve-password-reset/` | Issues 16-char temp password and emails via Gmail secrets. |
| Data Map | `src/features/admin/DataMapPage.tsx` | SQL Schema canvas (migration-derived table cards + FK edges) and integrity review. |
| Schema map parser | `src/lib/schemaMap/parseMigrations.ts` | Parses `supabase/migrations/*.sql` into tables/columns/PK-FK/indexes for Data Map. |

## Shared Components

| Path | Responsibility |
|---|---|
| `src/components/layout/app-shell.tsx` | Main authenticated shell; collapse chrome + glowing expand FAB. |
| `src/components/layout/sidebar.tsx` | Navigation and role-aware menu structure (hidden scrollbar; collapsed icon nav). |
| `src/components/layout/topbar.tsx` | Header controls; collapses with sidebar on desktop. |
| `src/components/common/dashboard-filter-banner.tsx` | Active dashboard/database filter chip banner. |
| `src/components/common/workflow-status-badge.tsx` | Icon + tooltip workflow status (sort/filter labels stay text). |
| `src/services/menuPermissionService.ts` | Load/save `menu_permission_overrides`. |
| `src/lib/menuPermissions.ts` | Default menu matrix + resolve helpers. |
| `agent-workflow/RELEASE_CHECKLIST.md` | ISO-aligned release pre-flight / approve / deploy checklist. |
| `agent-workflow/releases/` | Per-version GitHub Release note drafts. |
| `src/components/layout/notification-center.tsx` | Notification UI. |
| `src/components/layout/profile-settings-modal.tsx` | Profile settings UI. |
| `src/components/layout/feedback-chat.tsx` | Feedback capture UI. |
| `src/components/common/protected-route.tsx` | Route guard and allowed-role enforcement. |
| `src/components/common/app-date-picker.tsx` | Shared date picker wrapper. |
| `src/components/common/na-clearing-input.tsx` | Shared input behavior for `N/A` handling. |
| `src/components/common/creatable-na-select.tsx` | Searchable/editable dropdown with create + confirmed admin remove. |
| `src/lib/naField.ts` | Optional-field NA normalize/display helpers. |
| `src/lib/endorsementSync.ts` | Endorsement status canon, sync mapping, echo-loop prevention. |
| `src/components/common/project-id-link.tsx` | Project record linking. |

## Services and Data Access

| Path | Responsibility |
|---|---|
| `src/lib/supabaseClient.ts` | Supabase browser client. |
| `src/app/auth-provider.tsx` | Auth provider and user/profile state. |
| `src/services/profileService.ts` | Profile and user-management data access. |
| `src/services/projectService.ts` | Project CRUD, hierarchy persistence, audit integration. |
| `src/services/cnfTrackerService.ts` | CNF tracker records, duplicate checks, audit. |
| `src/services/cnfTrackerLinkService.ts` | `project_cnf_tracker_links` CRUD. |
| `src/lib/cnfProjectIntegration.ts` | CNF↔Project apply/prefill, New Product carry-over, duplicate helpers. |
| `src/services/cnfLinkService.ts` | Project/CNF relationship operations. |
| `src/services/supportActivityService.ts` | Support activity data access + CNF/endorsement linked saves. |
| `src/services/endorsementTrackerService.ts` | Endorsement tracker CRUD, items, ensure/sync RPCs. |
| `src/services/reusableOptionService.ts` | Reusable editable-dropdown options. |
| `src/services/dashboardService.ts` | Dashboard metrics and worklist data. |
| `src/services/auditService.ts` | Audit log inserts and reads. |
| `src/services/notificationService.ts` | Notification operations. |
| `src/services/registryService.ts` | Registry lookup and admin CRUD. |
| `src/services/exportService.ts` | Excel/export utilities. |
| `src/services/menuPermissionService.ts` | Load/save menu permission overrides + audit. |

## State, Utilities, and Types

| Path | Responsibility |
|---|---|
| `src/types/` | Shared TypeScript types and Supabase database type definitions. |
| `src/lib/constants.ts` | Shared constants and option sets. |
| `src/lib/menuPermissions.ts` | Menu View/Create/Edit/Export defaults, resolve, path mapping, feature flag. |
| `src/lib/dashboardDrilldown.ts` | Dashboard → list/DB route builders (appends `return_to` when workspace flag on). |
| `src/lib/dashboardReturnTo.ts` | `return_to` param helpers for Back to Dashboard. |
| `src/lib/featureFlags.ts` | `isDashboardWorkspaceEnabled()` kill-switch. |
| Rollback | `agent-workflow/DASHBOARD_WORKSPACE_ROLLBACK.md` | Set `VITE_FEATURE_DASHBOARD_WORKSPACE=false` and redeploy. |
| `src/lib/urlDerivedFilters.ts` | URL search-param merge for projects/support/audit/CNF list filters. |
| `src/components/common/dashboard-filter-banner.tsx` | Active dashboard drill filter chips + clear. |
| `src/lib/roleAccess.ts` | Route access (matrix-aware) and field-group `can*` helpers. |
| `src/lib/roleMapping.ts` | Role label/key conversion helpers. |
| `src/lib/mappers.ts` | DB-to-UI data mapping utilities. |
| `src/lib/auditFormat.ts` | Readable audit formatting helpers. |
| `src/lib/projectHierarchy.ts` | Project hierarchy helpers. |
| `src/lib/formDraftStorage.ts` | Draft persistence utilities. |
| `src/lib/fgMonthLock.ts` | FG month lock behavior. |
| `src/lib/bmrLock.ts` | BMR-related lock behavior. |
| `src/lib/sessionDiagnostics.ts` | Diagnostic logging for session/navigation visibility. |
| `src/app/registry-provider.tsx` | Registry context/provider. |
| `src/app/date-adjustment-provider.tsx` | Date adjustment provider. |
| `src/app/meeting-view-provider.tsx` | Meeting view state provider. |
| `src/hooks/use-sidebar-state.ts` | Sidebar state hook. |

## Styling

| Path | Responsibility |
|---|---|
| `src/styles/globals.css` | Global app styles. |
| `src/styles/project-form.css` | Project form layout/styling. |
| `src/styles/dashboard.css` | Dashboard styling. |
| `src/styles/cnf-tracker.css` | CNF tracker styling. |
| `src/styles/endorsement-tracker.css` | Endorsement tracker styling. |
| `src/styles/data-map.css` | Data map/integrity page styling. |

## Configuration and Scripts

| Path | Responsibility |
|---|---|
| `package.json` | Scripts and dependencies. |
| `.env.example` | Frontend-safe env placeholders. |
| `.github/workflows/deploy.yml` | GitHub Pages build/deploy workflow. |
| `scripts/verify-supabase.ts` | Supabase connectivity/permission verification. |
| `scripts/smoke-test-supabase.ts` | Supabase smoke test. |
| `scripts/migrate-sheets-to-supabase.ts` | Google Sheets to Supabase migration script. |
| `scripts/migration-map.md` | Migration mapping notes. |
| `scripts/seed-auth-users.ts` | Auth user seeding helper. |
| `workflow-app/server.py` | Local workflow app server and API. |
| `workflow-app/database/schema.sql` | Workflow app SQLite schema, separate from Supabase product schema. |
| `workflow-app/scripts/validate_schema.py` | Workflow app schema validation. |
| `workflow-app/scripts/smoke_test.py` | Workflow app behavior smoke test. |
| `workflow-app/static/` | Workflow app browser UI assets. |

## Editing Guidance

- Add route-level pages under `src/features/<domain>/`.
- Add reusable UI under `src/components/common/` or `src/components/layout/`.
- Add feature-specific UI beside the feature page under `src/features/<domain>/components/`.
- Add data operations in `src/services/`, not directly inside large UI components.
- Add shared pure helpers under `src/lib/`.
- Add shared record types under `src/types/`.
- Add Supabase schema changes under `supabase/migrations/`.
- Keep GitHub Pages routing through HashRouter unless the deployment strategy changes by approval.
- Keep workflow app runtime data under ignored `workflow-app/data/`.

## Important Boundaries

- Presentation components must not bypass service-layer data access for complex Supabase operations.
- Protected routes and sidebar visibility must align with role helpers and RLS expectations.
- Frontend role checks are user experience only; Supabase policies remain the data boundary.
- Service role keys must never appear in browser code, Markdown, or committed env files.
- Audit writes are mandatory for critical mutations.
- Workflow app SQLite state is local workflow metadata; do not treat it as Project Tracker product data.
- Update this map only when important paths are added, moved, renamed, or become regular agent entry points.
