# Code Map

Last Updated: `2026-08-31`

## Purpose

Use this map to locate implementation areas without scanning the repository. List only high-value paths that agents regularly need.

Database schema and migration details belong in `DATA_MAP.md` and `supabase/migrations/`.

## Application Entry Points

| Path | Responsibility |
|---|---|
| `src/main.tsx` | React DOM bootstrap and global style import entry. |
| `src/app/App.tsx` | App providers, Ant Design app wrapper, HashRouter, navigation-history + menu-permission/registry/date/meeting providers. |
| `src/app/router.tsx` | Route definitions and protected route wiring. |
| `src/app/navigation-history-provider.tsx` | SPA Back/Forward enablement, scroll restore, view-state store by `location.key`. |
| `src/app/menu-permission-provider.tsx` | Loads menu permission overrides; exposes `can` / `canPath`. |
| `vite.config.ts` | Vite config, `@` alias, GitHub Pages base path. |

## Pages and Major Modules

| Module | Path | Responsibility |
|---|---|---|
| Auth | `src/features/auth/LoginPage.tsx` | Login flow and public entry route. |
| Dashboard | `src/features/dashboard/DashboardPage.tsx` | Primary workspace: KPIs, My work, New task, meeting view. Hub flag keeps KPI filters on Dashboard. |
| Project Management | `src/features/project-management/ProjectManagementPage.tsx` | My work: main table by default, More views including a per-project Gantt timeline, This step drawer. Project status stays derived. |
| Project Management model | `src/lib/projectManagementPortfolio.ts` | Portfolio rows plus derived board status (For Review / At Risk / Blocked), progress, filters, and grouping. |
| Project Management workflow | `src/lib/projectManagementWorkflow.ts` | Phase gates, incomplete requirements, derived source workflow items. |
| Project Management permissions | `src/lib/projectManagementPermissions.ts` | Assign/override/reopen. VAL is always an assignee. User-task create is not phase-gated. |
| Project Management service | `src/services/projectManagementService.ts` | Portfolio load plus tasks, comments, phase overrides (missing-table fallback until migration is applied). |
| Project Management workspace | `src/features/project-management/components/ProjectWorkspaceDrawer.tsx` | Card click opens Tasks; click a row to edit or create the matching task. Source record stays a header button. |
| AI Assistant | `src/features/ai-assistant/AiAssistantPage.tsx` | Grounded chat page (`#/ai-assistant`, header Ask AI); own conversations; verified internal source cards. |
| AI Assistant helpers | `src/lib/aiAssistant.ts` | Sanitization, citations, date groups; re-exports planner from the Edge Function plan module. |
| AI Assistant planner | `supabase/functions/ai-assistant-chat/plan.ts` | Intent, record-id extraction, controlled tool selection, Answer/Basis/Limitations format. |
| AI Assistant Edge Function | `supabase/functions/ai-assistant-chat/` | JWT + multi-tool RLS retrieval, conversation context, OpenAI JSON, verified citations, audit. |
| AI Assistant service | `src/services/aiAssistantService.ts` | Conversation CRUD plus `ai-assistant-chat` Edge Function invoke. |
| Dashboard action strip | `src/features/dashboard/components/DashboardActionStrip.tsx` | Role/menu-gated Do next (New task, My work, creates). |
| Worklist modal | `src/features/dashboard/components/WorklistModal.tsx` | My work popup (Process / Support / My tasks tabs, KPI filter, Open as spreadsheet). |
| Dashboard PM hub | `src/lib/dashboardPmHub.ts` | KPI-to-My-work filters, default tab, slim-form helpers, source picker options. |
| Dashboard task composer | `src/features/dashboard/components/DashboardTaskComposer.tsx` | New task from Dashboard with gate check. |
| Worklist sort | `src/lib/worklistSort.ts` | Role-scoped process/support worklist filter and priority sort. |
| Project quick drawer | `src/features/dashboard/components/ProjectQuickDrawer.tsx` | Project hub: summary, phase, tasks, Final Status, Ask AI. |
| Dashboard charts block | `src/features/dashboard/components/DashboardChartsBlock.tsx` | CNF/final/department/FG/support/monthly charts. |
| Dashboard components | `src/features/dashboard/components/` | Charts and meeting overlay pieces. |
| Return-to helper | `src/lib/dashboardReturnTo.ts` | `return_to` append/read for dashboard create + drill loops. |
| Project Entry | `src/features/projects/ProjectEntryPage.tsx` | Main project form page. |
| Project form components | `src/features/projects/components/` | Hierarchy form, role tabs, field controls, CNF copy modal. |
| Projects Database | `src/features/projects/ProjectsDatabasePage.tsx` | Role-colored AG Grid spreadsheet; search/filter/export; inline role-gated edits. |
| Projects Database Grid | `src/features/projects/components/ProjectsDatabaseGrid.tsx` | Role headers; cell edit + width persist; status icons; viewport capacity for draft rows. |
| Projects Database columns | `src/lib/projectsDatabaseColumns.ts` | Spreadsheet column/group/role/editor config; `isWorkflowStatusSpreadsheetColumn`. |
| Projects Database draft rows | `src/lib/projectsDatabaseDraftRows.ts` | Blank fill-viewport rows; blank detection; reconcile trailing blanks. |
| Projects Database save service | `src/services/projectsDatabaseService.ts` | Patch existing edits; `createProjectsFromSpreadsheetDrafts` for new rows. |
| Projects Database grid interaction | `src/lib/projectsDatabaseGridInteraction.ts` | Ignore drag-select mousedown over dropdown/editors. |
| Role colors | `src/lib/roleColors.ts`, `src/styles/role-colors.css` | Shared form + spreadsheet role palette. |
| Spreadsheet save | `src/services/projectsDatabaseService.ts` | Patch edits → `updateProject` + emit sync. |
| CNF Tracker | `src/features/cnf-tracker/CnfTrackerPage.tsx` | CNF tracker list, New CNF, detail modal; Process Title / Activity Name is a textarea persisted on `cnf_details`. |
| CNF select modal | `src/features/cnf-tracker/CnfTrackerSelectModal.tsx` | Insert CNF picker for Projects; New CNF opens `CnfTrackerDetailModal` via `/cnf-tracker?new=1`. |
| Endorsement Tracker | `src/features/endorsement-tracker/EndorsementTrackerPage.tsx` | Endorsement list, detail modal, independent create, item rows, QA-only edit. |
| Support Activities | `src/features/support-activities/SupportActivitiesPage.tsx` | Support activity form and database view. Styles: `src/styles/support-activities.css` (sticky Add/Edit card head). Icons: `src/components/common/lucide-icon.tsx`. |
| Audit Trail | `src/features/audit-trail/AuditTrailPage.tsx` | Audit log browsing and filters. |
| Lessons Learned | `src/features/lessons-learned/LessonsLearnedPage.tsx` | Lessons learned workflow. |
| Archived | `src/features/archived/ArchivedPage.tsx` | Admin archive view. |
| Registry | `src/features/registry/RegistryPage.tsx` | Admin registry management. |
| Admin Users | `src/features/admin/AdminUsersPage.tsx` | Admin user/profile management, PM task assignment privilege, and password-reset approval. |
| Access Matrix | `src/features/admin/AccessMatrixPage.tsx` | Role × menu View/Create/Edit/Export overrides UI. |
| Password reset service | `src/services/passwordResetService.ts` | Forgot-password request + admin approve via Edge Function. |
| Password reset Edge Function | `supabase/functions/admin-approve-password-reset/` | Issues 16-char temp password and emails via Gmail secrets. |
| CNF change summary Edge Function | `supabase/functions/summarize-change/` | Authenticated OpenAI shorten of CNF change text for portfolio cards. |
| Data Map | `src/features/admin/DataMapPage.tsx` | SQL Schema canvas (nav label Schema): migration-derived table cards + FK edges and integrity review. |
| Schema map parser | `src/lib/schemaMap/parseMigrations.ts` | Parses `supabase/migrations/*.sql` into tables/columns/PK-FK/indexes for Data Map. |

## Shared Components

| Path | Responsibility |
|---|---|
| `src/components/layout/app-shell.tsx` | Main authenticated shell; collapse chrome + glowing expand FAB; floating Back/Forward when collapsed. |
| `src/components/layout/nav-history-buttons.tsx` | Accessible Back/Forward controls for SPA history. |
| `src/lib/navigationHistory.ts` | Pure PUSH/REPLACE/POP stack helpers + session-clear reset. |
| `src/hooks/use-restorable-view-state.ts` | Persist/restore page UI snapshots per history entry. |
| `src/hooks/use-change-summaries.ts` | Local CNF change shorten plus optional OpenAI Edge Function upgrade. |
| `src/lib/changeDescriptionSummary.ts` | Deterministic card-length CNF change shortener and session cache key. |
| `src/services/changeSummaryService.ts` | Invokes `summarize-change` Edge Function for authenticated users. |
| `src/components/layout/sidebar.tsx` | Grouped navigation (Projects, Trackers, Admin) with role-aware children. Accordion groups. Saved menu order still applies. |
| `src/components/layout/sidebar-nav.ts` | Sidebar icons mapped onto the nav tree. |
| `src/components/layout/sidebar-nav-tree.ts` | Sidebar groups, visibility, flatten for collapsed rail; order helpers `moveSidebarKey` and `applySidebarOrder`. Ask AI is header-only. |
| `src/components/layout/ask-ai-button.tsx` | Header / collapsed-chrome Ask AI control (`ai_assistant` View). |
| `src/components/layout/topbar.tsx` | Header controls (Ask AI, Back/Forward beside About); collapses with sidebar on desktop. |
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
| `src/components/common/creatable-na-select.tsx` | Searchable/editable dropdown with create + confirmed remove. |
| `src/components/common/workflow-status-badge.tsx` | Compact borderless status icon + accessible tooltip. |
| `src/components/common/document-number-status-cell.tsx` | Document number with status icon on the right (one line). |
| `src/features/projects/components/ProjectFieldControl.tsx` | Project form controls; `creatable` registry fields use CreatableNaSelect. |
| `src/features/projects/components/RegistryCreatableCellEditor.tsx` | AG Grid popup editor wrapping CreatableNaSelect. |
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
| `src/services/projectManagementService.ts` | Live portfolio load from projects + support activities. |

## State, Utilities, and Types

| Path | Responsibility |
|---|---|
| `src/types/` | Shared TypeScript types and Supabase database type definitions. |
| `src/lib/constants.ts` | Shared constants and option sets. |
| `src/lib/menuPermissions.ts` | Menu View/Create/Edit/Export defaults, resolve, path mapping, feature flag. |
| `src/lib/dashboardDrilldown.ts` | Dashboard → list/DB route builders (appends `return_to` when workspace flag on). |
| `src/lib/dashboardReturnTo.ts` | `return_to` param helpers for Back to Dashboard. |
| `src/lib/featureFlags.ts` | `isDashboardWorkspaceEnabled()` and `isDashboardPmHubEnabled()` kill-switches. |
| Rollback | `agent-workflow/DASHBOARD_WORKSPACE_ROLLBACK.md` | Workspace and PM hub env flags. |
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
| `src/hooks/use-sidebar-state.ts` | Sidebar state hook; default `expanded` on load, login, and session clear. |
| `src/lib/sidebarSessionState.ts` | Sidebar in-memory preference for AppShell remounts; reset on `clearAppSessionState()`. |

## Styling

| Path | Responsibility |
|---|---|
| `src/styles/globals.css` | Global app styles. |
| `src/styles/project-form.css` | Project form layout/styling. |
| `src/styles/dashboard.css` | Dashboard styling. |
| `src/styles/project-management.css` | Project Management portfolio, workspace board/calendar, and filters. |
| `src/styles/ai-assistant.css` | AI Assistant conversation layout (sidebar, transcript, composer). |
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
