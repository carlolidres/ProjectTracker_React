# Code Map

Last Updated: `[YYYY-MM-DD]`

## Purpose

Use this map to locate implementation areas without scanning the repository. List only high-value paths that agents regularly need.

Do not duplicate database schema details here. Database work belongs in `DATA_MAP.md`, `database/sqlite/`, and `sqlite-out/`.

## Application Entry Points

| Path | Responsibility |
|---|---|
| `workflow-app/server.py` | Local workflow app HTTP server, JSON API, SQLite access, baseline Markdown generation, and startup initialization |
| `workflow-app/static/index.html` | Workflow app browser entry point |
| `[ROOT_COMPONENT_PATH]` | `[ROOT_LAYOUT_ROUTING_OR_PROVIDER_ROLE]` |
| `[ROUTE_CONFIG_PATH]` | `[ROUTE_DEFINITIONS]` |

## Pages and Major Modules

| Module | Path | Responsibility |
|---|---|---|
| Workflow app UI | `workflow-app/static/app.js` | Dashboard, workflow stage forms, approvals, comments, version history, audit trail, and baseline restore UI |
| Workflow app styles | `workflow-app/static/styles.css` | Local-only responsive layout and form styling |
| `[MODULE_2]` | `[PATH]` | `[RESPONSIBILITY]` |
| `[MODULE_3]` | `[PATH]` | `[RESPONSIBILITY]` |

## Shared Components

| Path | Responsibility |
|---|---|
| `[LAYOUT_COMPONENTS_PATH]` | `[SIDEBAR_HEADER_SHELL_OR_NAVIGATION]` |
| `[FORM_COMPONENTS_PATH]` | `[REUSABLE_FORM_CONTROLS]` |
| `[TABLE_COMPONENTS_PATH]` | `[REUSABLE_TABLES_FILTERS_AND_PAGINATION]` |
| `[CHART_COMPONENTS_PATH]` | `[REUSABLE_DASHBOARD_CHARTS]` |
| `[FEEDBACK_COMPONENTS_PATH]` | `[MODALS_ALERTS_TOASTS_LOADING_AND_EMPTY_STATES]` |

## Services and Data Access

| Path | Responsibility |
|---|---|
| `[AUTH_SERVICE_PATH]` | `[AUTHENTICATION_AND_SESSION_OPERATIONS]` |
| `workflow-app/server.py` | SQLite connection, workflow record/version operations, comments, approvals, audit events, baseline snapshots, and restore operations |
| `workflow-app/database/schema.sql` | Workflow app SQLite tables, indexes, constraints, and append-only triggers |
| `workflow-app/server.py` | Audit event handling for workflow app actions |
| `[NOTIFICATION_SERVICE_PATH]` | `[NOTIFICATION_OPERATIONS]` |

## State, Hooks, Utilities, and Types

| Path | Responsibility |
|---|---|
| `[STATE_PATH]` | `[GLOBAL_OR_FEATURE_STATE]` |
| `[HOOKS_PATH]` | `[SHARED_HOOKS]` |
| `[UTILITIES_PATH]` | `[PURE_HELPER_FUNCTIONS]` |
| `[VALIDATION_PATH]` | `[VALIDATION_SCHEMAS_OR_RULES]` |
| `[TYPES_PATH]` | `[SHARED_TYPES_AND_INTERFACES]` |

## Configuration

| Path | Responsibility |
|---|---|
| `workflow-app/config.example.json` | Reusable relative-path workflow app configuration template |
| `[PERMISSIONS_CONFIG_PATH]` | `[ROLES_MENUS_AND_ACTION_PERMISSIONS]` |
| `[STATUS_CONFIG_PATH]` | `[STATUS_PRIORITY_OR_WORKFLOW_CONSTANTS]` |
| `[ENV_CONFIG_PATH]` | `[ENVIRONMENT_CONFIGURATION]` |
| `[BUILD_CONFIG_PATH]` | `[BUILD_AND_HOSTING_CONFIGURATION]` |
| `[SQLITE_MAP_CONFIG_PATH]` | `Generates schema navigation output in sqlite-out/` |

## Tests

| Path | Responsibility |
|---|---|
| `workflow-app/scripts/validate_schema.py` | Validates workflow app SQLite schema, relationships, immutability triggers, and representative rows |
| `workflow-app/scripts/smoke_test.py` | Exercises workflow app create, approve, comment, revise, baseline snapshot, restore, dashboard, and audit flows |
| `[UNIT_TEST_PATH]` | `[UNIT_TESTS]` |
| `[INTEGRATION_TEST_PATH]` | `[INTEGRATION_TESTS]` |
| `[E2E_TEST_PATH]` | `[END_TO_END_TESTS]` |
| `[SMOKE_TEST_PATH]` | `[SMOKE_OR_DEPLOYMENT_VERIFICATION]` |

## Editing Guidance

- Add new pages under: `[PAGES_PATH]`
- Add reusable UI under: `[SHARED_COMPONENTS_PATH]`
- Add feature-specific UI under: `[FEATURE_COMPONENTS_PATH]`
- Add database access under: `[SQLITE_DATA_ACCESS_PATH]`
- Keep workflow app changes inside `workflow-app/` unless updating workflow documentation or generated baseline Markdown.
- Add editable schema or migration SQL under: `database/sqlite/`
- Add workflow app schema changes under: `workflow-app/database/schema.sql`
- Do not manually edit generated maps under: `sqlite-out/`
- Add shared types under: `[TYPES_PATH]`
- Add tests beside the feature or under: `[TEST_PATH]`

## Important Boundaries

- Presentation components must not bypass `[DATA_ACCESS_LAYER]`.
- Protected routes must use `[ROUTE_GUARD_OR_PERMISSION_LAYER]`.
- Permission checks must be enforced in both the UI and trusted data layer.
- Reuse existing code before adding helpers or abstractions.
- Generated files are skipped unless the task explicitly needs them.
- Update this map only when important implementation paths are added, moved, or renamed.
