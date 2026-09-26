# Personal Work OS — Cursor Implementation Guide

## Objective

Build a personal, self-hosted **monday.com-style Work OS** focused on flexible boards, project tracking, validation work, teaching tasks, and personal productivity.

The application should feel like a modern combination of:

- monday.com — configurable boards, status columns, groups, views, dashboards
- Plane — polished project-management UX and workspace structure
- NocoBase — dynamic data model and configurable fields
- Excel — fast inline editing and tabular interaction

Do **not** attempt to clone monday.com feature-for-feature in the first release.

The first goal is to create a fast, extensible **board-centric Work OS** with a clean architecture that can later support dashboards, automations, AI, reporting, and collaboration.

---

# 1. Cursor Operating Instructions

You are working inside an existing repository using Cursor.

You have access to MCP tools.

Before making major changes:

1. Inspect the repository structure.
2. Identify the existing framework, package manager, component library, database layer, authentication method, and coding conventions.
3. Reuse the current application architecture whenever reasonable.
4. Do not replace working infrastructure without a clear technical reason.
5. Search the codebase before creating duplicate components, hooks, utilities, schemas, or services.
6. Prefer incremental implementation over large rewrites.
7. Maintain backward compatibility with existing pages unless explicitly changing them.
8. Validate every substantial change with linting, type checking, and tests where available.
9. Use MCP documentation tools when library behavior or API usage is uncertain.
10. Use MCP filesystem/repository tools to inspect relevant files before editing them.

When MCP exposes package or framework documentation, consult the official/current documentation before introducing unfamiliar APIs.

Do not fabricate file paths, database models, environment variables, commands, or application behavior. Inspect the repository first.

---

# 2. High-Level Product

Create a personal productivity platform with the following hierarchy:

```text
Workspace
└── Project
    └── Board
        ├── Groups
        ├── Columns
        ├── Items
        │   ├── Cell Values
        │   ├── Subitems
        │   ├── Comments
        │   └── Attachments
        └── Views
```

Primary interaction:

```text
Workspace → Project → Board → Items
```

The **board table** is the central interface.

---

# 3. Recommended Stack

Use the existing repository stack when possible.

If the project does not already define equivalents, prefer:

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Table
- dnd-kit
- React Hook Form
- Zod

## Backend

Preferred options:

- Next.js Server Actions / Route Handlers

or, if the repository already separates the backend:

- NestJS / Express

## Database

- PostgreSQL
- Prisma ORM

## Authentication

Use whichever is already present.

If none exists:

- Auth.js

or

- Supabase Auth

## File Storage

For V1, abstract storage behind a service interface.

Possible implementation:

- local development storage
- Supabase Storage
- S3-compatible object storage

## Charts

- Recharts

## Rich Text

- Tiptap

---

# 4. Architecture Principles

The system must be designed around **dynamic board columns**.

Do NOT create one SQL column for every user-created board field.

Instead, separate:

- board metadata
- column definitions
- item definitions
- cell values

Recommended conceptual schema:

```text
Workspace
Project
Board
BoardGroup
BoardColumn
BoardItem
CellValue
BoardView
Comment
Attachment
Automation
ActivityLog
```

---

# 5. Database Model

Adapt naming to the existing repository conventions.

Recommended schema:

```prisma
model Workspace {
  id          String    @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  projects    Project[]
}

model Project {
  id          String    @id @default(cuid())
  workspaceId String
  name        String
  description String?
  position    Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  boards      Board[]
}

model Board {
  id          String        @id @default(cuid())
  projectId   String
  name        String
  description String?
  position    Int           @default(0)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  project     Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  groups      BoardGroup[]
  columns     BoardColumn[]
  items       BoardItem[]
  views       BoardView[]
}

model BoardGroup {
  id          String      @id @default(cuid())
  boardId     String
  name        String
  position    Int         @default(0)
  isCollapsed Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  board       Board       @relation(fields: [boardId], references: [id], onDelete: Cascade)
  items       BoardItem[]
}

model BoardColumn {
  id          String      @id @default(cuid())
  boardId     String
  name        String
  type        String
  position    Int         @default(0)
  width       Int?
  settings    Json?
  isRequired  Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  board       Board       @relation(fields: [boardId], references: [id], onDelete: Cascade)
  values      CellValue[]
}

model BoardItem {
  id          String       @id @default(cuid())
  boardId     String
  groupId     String?
  parentId    String?
  name        String
  position    Int          @default(0)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  board       Board        @relation(fields: [boardId], references: [id], onDelete: Cascade)
  group       BoardGroup?  @relation(fields: [groupId], references: [id], onDelete: SetNull)

  parent      BoardItem?   @relation("Subitems", fields: [parentId], references: [id], onDelete: Cascade)
  subitems    BoardItem[]  @relation("Subitems")

  values      CellValue[]
  comments    Comment[]
  attachments Attachment[]
}

model CellValue {
  id          String      @id @default(cuid())
  itemId      String
  columnId    String
  value       Json?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  item        BoardItem   @relation(fields: [itemId], references: [id], onDelete: Cascade)
  column      BoardColumn @relation(fields: [columnId], references: [id], onDelete: Cascade)

  @@unique([itemId, columnId])
}

model BoardView {
  id          String    @id @default(cuid())
  boardId     String
  name        String
  type        String
  settings    Json?
  position    Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  board       Board     @relation(fields: [boardId], references: [id], onDelete: Cascade)
}

model Comment {
  id          String    @id @default(cuid())
  itemId      String
  body        String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  item        BoardItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
}

model Attachment {
  id          String    @id @default(cuid())
  itemId      String
  fileName    String
  fileUrl     String
  mimeType    String?
  fileSize    Int?
  createdAt   DateTime  @default(now())

  item        BoardItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
}
```

Adjust relations if existing models or account ownership requirements already exist.

---

# 6. Supported Column Types

Create an extensible column registry.

Start with:

```text
text
long_text
number
status
dropdown
date
date_range
checkbox
person
progress
link
email
phone
file
formula
created_at
updated_at
```

Do not scatter column-specific logic throughout the table.

Create a column-type abstraction.

Example:

```ts
interface BoardColumnTypeDefinition {
  type: string
  label: string
  icon?: React.ComponentType
  defaultSettings?: Record<string, unknown>

  renderCell: (...)
  renderEditor: (...)
  validateValue?: (...)
  formatValue?: (...)
  parseValue?: (...)
}
```

Recommended location:

```text
src/features/boards/column-types/
```

Example:

```text
column-types/
├── registry.ts
├── text.tsx
├── number.tsx
├── status.tsx
├── date.tsx
├── checkbox.tsx
├── progress.tsx
└── index.ts
```

This is critical for long-term maintainability.

---

# 7. Application Navigation

Build a sidebar similar to a modern Work OS.

Suggested layout:

```text
Personal Work OS

Home
My Work
Favorites

WORKSPACES

Validation
  ├── Projects
  ├── Validation Tracker
  └── CAPA Tracker

Teaching
  ├── Classes
  ├── Assignments
  └── Assessments

Personal
  ├── Tasks
  └── Goals

Development
  ├── Applications
  └── Roadmap

Settings
```

Workspace and project names must come from database data, not hard-coded examples.

---

# 8. Board Page

The main board page should resemble monday.com structurally without copying proprietary branding or assets.

Recommended layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Board Name                                    ⋯  Share      │
│ Description                                                 │
├─────────────────────────────────────────────────────────────┤
│ Main Table | Kanban | Calendar | + Add View                │
├─────────────────────────────────────────────────────────────┤
│ Search | Person | Filter | Sort | Hide | Group | Automate │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Group: Active Projects                                     │
│  ┌──────────────┬──────────┬─────────┬──────────┬─────────┐ │
│  │ Item         │ Status   │ Owner   │ Due Date │ Progress│ │
│  ├──────────────┼──────────┼─────────┼──────────┼─────────┤ │
│  │ Project A    │ Working  │ Carlo   │ Sep 30   │ 75%     │ │
│  │ Project B    │ Done     │ Carlo   │ Sep 21   │ 100%    │ │
│  └──────────────┴──────────┴─────────┴──────────┴─────────┘ │
│  + Add Item                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# 9. Main Table Requirements

Use TanStack Table if compatible with the existing stack.

The table must eventually support:

- inline editing
- keyboard navigation
- selectable rows
- sticky first column
- sticky header
- dynamic columns
- reorderable columns
- resizable columns
- sortable columns
- hidden columns
- row drag-and-drop
- group drag-and-drop
- optimistic updates
- add item
- duplicate item
- delete item
- bulk delete
- bulk status update
- row context menu
- column context menu
- add column
- rename column
- duplicate column
- delete column
- column settings
- subitems
- filtering
- search
- saved views

For V1, implement the highest-value subset first.

---

# 10. Inline Editing

Cell edits should feel spreadsheet-like.

Behavior:

```text
Single click:
select cell

Double click:
edit cell

Enter:
edit or confirm

Escape:
cancel edit

Tab:
save and move right

Shift+Tab:
save and move left

Arrow keys:
move selected cell
```

Avoid opening a modal for simple cell edits.

Use popovers only where appropriate:

- status
- dropdown
- date
- person
- file
- complex settings

---

# 11. Status Column

A status field should contain configurable labels.

Example configuration:

```json
{
  "labels": [
    {
      "id": "working",
      "label": "Working on it",
      "color": "yellow"
    },
    {
      "id": "done",
      "label": "Done",
      "color": "green"
    },
    {
      "id": "stuck",
      "label": "Stuck",
      "color": "red"
    },
    {
      "id": "waiting",
      "label": "Waiting",
      "color": "gray"
    }
  ]
}
```

Do not hardcode status labels globally.

Each status column may define its own labels.

---

# 12. Groups

Boards must support groups.

Examples:

```text
Active
Upcoming
Completed
Archived
```

Capabilities:

- create group
- rename group
- collapse group
- expand group
- reorder group
- move item between groups
- group color indicator
- add item directly inside group

---

# 13. Item Detail Panel

Clicking the item name should open a right-side detail panel.

Suggested layout:

```text
Project Name

Overview
------------------------------------------------
Status        Working on it
Owner         Carlo
Due Date      Sep 30
Progress      75%

Updates
------------------------------------------------
Add an update...

Attachments
------------------------------------------------
+ Add file

Subitems
------------------------------------------------
Task 1
Task 2
+ Add subitem

Activity
------------------------------------------------
Status changed from Pending → Working
Due date changed
```

Do not navigate away from the board unless necessary.

---

# 14. Views

Create a shared view architecture.

Initial view types:

```text
table
kanban
calendar
```

Later:

```text
timeline
gantt
dashboard
form
chart
workload
```

A board view should store configuration in JSON.

Example:

```json
{
  "filters": [],
  "sorts": [],
  "hiddenColumns": [],
  "groupBy": null
}
```

---

# 15. Kanban View

Kanban should derive from a chosen status/dropdown field.

Requirements:

- choose grouping column
- cards grouped by status
- drag card between columns
- update source item immediately
- card title
- selected metadata fields
- due date indicator
- progress indicator
- item detail panel on click

---

# 16. Calendar View

Calendar uses a selected date/date-range field.

Requirements:

- month view
- item title
- status indicator
- click event → item panel
- drag event → update date where technically safe

---

# 17. Filtering

Create structured filters.

Example model:

```ts
type FilterRule = {
  columnId: string
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "is_empty"
    | "is_not_empty"
    | "greater_than"
    | "less_than"
    | "before"
    | "after"
    | "between"
  value?: unknown
}
```

Support multiple filters.

Later support AND/OR filter groups.

---

# 18. Sorting

Support multi-column sorting.

Example:

```json
[
  {
    "columnId": "due-date",
    "direction": "asc"
  },
  {
    "columnId": "priority",
    "direction": "desc"
  }
]
```

---

# 19. Search

Board search should:

- search item names
- search textual cell values
- highlight matching rows where practical
- debounce requests

Later add global workspace search.

---

# 20. Optimistic UI

Board interaction must feel immediate.

Use optimistic updates for:

- text edit
- status change
- checkbox
- drag/drop
- rename item
- reorder item
- add row
- delete row where reasonable

On failure:

- restore previous state
- display a clear error toast
- log technical details only to developer console/server logs

---

# 21. Drag-and-Drop

Use dnd-kit or the repository's current drag-and-drop system.

Eventually support:

```text
reorder board groups
reorder board items
move item between groups
reorder columns
move Kanban cards
```

Preserve explicit integer positions.

Do not use array index as the persistent identifier.

---

# 22. Position Strategy

Use sortable integer positions initially.

Example:

```text
1000
2000
3000
```

When inserting:

```text
1500
```

If positions become too dense, rebalance.

This reduces write operations during drag-and-drop.

---

# 23. API / Service Layer

Do not directly call database code from random UI components.

Create domain services.

Suggested structure:

```text
src/features/boards/
├── api/
├── components/
├── hooks/
├── services/
├── schemas/
├── types/
├── column-types/
└── utils/
```

Example board service:

```ts
getBoard()
createBoard()
updateBoard()
deleteBoard()

createGroup()
updateGroup()
deleteGroup()
reorderGroups()

createColumn()
updateColumn()
deleteColumn()
reorderColumns()

createItem()
updateItem()
deleteItem()
moveItem()
reorderItems()

setCellValue()
```

Validate API inputs with Zod.

---

# 24. Activity Log

Design changes so an activity log can be supported.

Track important operations such as:

```text
item created
item deleted
item renamed
status changed
date changed
item moved
comment added
attachment added
column created
column deleted
group changed
```

Suggested model:

```prisma
model ActivityLog {
  id         String   @id @default(cuid())
  entityType String
  entityId   String
  action     String
  metadata   Json?
  createdAt  DateTime @default(now())
}
```

Add user/account relation if authentication exists.

---

# 25. V1 Scope

The first usable version should contain:

## Workspace

- create workspace
- edit workspace
- delete workspace

## Projects

- create project
- rename project
- delete project

## Boards

- create board
- rename board
- delete board

## Groups

- create
- rename
- delete
- collapse
- reorder

## Columns

Implement:

- text
- number
- status
- date
- checkbox
- progress

Support:

- create column
- rename column
- delete column
- reorder column
- resize column

## Items

- create
- edit
- delete
- reorder
- move between groups

## Table

- inline editing
- basic search
- basic filtering
- sorting
- hide/show column

## Item Details

- right-side drawer
- comments
- subitems

## Views

- table
- kanban
- calendar

---

# 26. Explicitly Defer From V1

Do not let these delay the first working version:

```text
full workflow automation engine
email integration
Slack integration
advanced dashboards
Gantt
dependency graph
workload calculation
public sharing
guest users
enterprise permissions
time tracking
AI assistant
mobile app
offline mode
formula engine
webhooks
marketplace
custom plugins
```

Architect for them where reasonable, but do not implement prematurely.

---

# 27. Phase 2

After V1 is stable, implement:

```text
attachments
saved views
templates
favorites
notifications
dashboard widgets
timeline
Gantt
dependencies
recurring items
activity feed
audit history
advanced filters
bulk operations
```

---

# 28. Phase 3 Automation Engine

Create a rule model:

```text
WHEN trigger
IF optional conditions
THEN one or more actions
```

Example:

```text
WHEN status changes to Done
THEN set completion date to today
```

Example:

```text
WHEN due date arrives
AND status is not Done
THEN create notification
```

Possible triggers:

```text
item_created
item_updated
status_changed
date_arrived
date_passed
column_value_changed
item_moved
recurring_schedule
```

Possible actions:

```text
set_value
change_status
move_item
create_item
create_notification
assign_person
set_date
```

Do not implement the automation engine until the core item/value system is stable.

---

# 29. Phase 4 Dashboard

Dashboard widgets may include:

```text
number
chart
status summary
progress summary
table
calendar
timeline
overdue items
completed items
workload
```

Widget configuration should be persisted as JSON.

---

# 30. Phase 5 AI

Later add an AI layer.

Potential commands:

```text
"Show all validation projects due this month."

"Which projects are overdue?"

"Summarize updates from this week."

"Create a validation board from this protocol."

"Generate a project tracker from this document."

"Which projects are blocked?"

"Generate my weekly validation report."

"Create tasks from these meeting notes."
```

AI must operate through application services rather than writing directly to database tables.

---

# 31. MCP Usage Strategy

Use MCP intelligently during implementation.

## Repository Inspection

Use MCP repository/filesystem tools to inspect:

- package.json
- lockfile
- tsconfig
- app/router structure
- components
- database schema
- environment configuration
- existing reusable tables
- current sidebar/navigation
- auth
- design tokens
- forms
- toast system
- existing drag-and-drop code

Before introducing a library, search whether an equivalent is already installed.

---

# 32. MCP Documentation

If documentation MCP servers are available:

Use them for current documentation involving:

```text
Next.js
React
TanStack Table
dnd-kit
Prisma
Tailwind
shadcn/ui
Zod
React Hook Form
Tiptap
Recharts
```

Prefer primary documentation.

Do not guess undocumented APIs.

---

# 33. MCP Browser / Preview

If Cursor has browser or preview MCP capability:

After each major UI milestone:

1. start the development application
2. open the target page
3. inspect layout
4. inspect browser console
5. verify responsive behavior
6. test editing
7. test add/delete
8. test drag-and-drop
9. fix visual regressions

Do not mark UI work complete solely because TypeScript compiles.

---

# 34. MCP Database

If database MCP access exists:

Use it to inspect schema and development data.

Never run destructive production operations unless explicitly authorized.

For schema changes:

1. inspect current schema
2. create migration
3. inspect generated SQL where practical
4. apply to development database
5. seed representative data
6. verify queries

---

# 35. Seed Data

Create useful demo data.

Example workspace:

```text
Validation
```

Project:

```text
Current Projects
```

Board:

```text
Validation Project Tracker
```

Groups:

```text
Active
Upcoming
Completed
```

Columns:

```text
Project
Status
Owner
Start Date
Due Date
Progress
Priority
Remarks
```

Sample rows:

```text
Benadryl AH 50 mg Capsule
Imodium 2 mg Capsule
Bactidol
Elica
Daktarin
Combantrin
Valbazen
```

These are development/demo records only.

Do not embed domain-specific behavior around these names.

---

# 36. UI Design Direction

The interface should be:

```text
modern
clean
dense but readable
professional
desktop-first
responsive
keyboard-friendly
low-friction
```

Avoid:

```text
oversized cards
excessive whitespace
large marketing-style headings
heavy gradients
decorative visual clutter
excessive rounded corners
modal-heavy editing
```

Use hierarchy through:

```text
spacing
typography
subtle borders
background surfaces
hover states
selection states
sticky headers
compact controls
```

---

# 37. Design System

Reuse the existing application theme.

If none exists, establish tokens for:

```text
background
surface
surface-muted
border
text-primary
text-secondary
primary
success
warning
danger
info
```

Support light and dark mode.

Do not hardcode colors throughout components.

---

# 38. Recommended Components

Create reusable components similar to:

```text
AppSidebar
WorkspaceSwitcher
ProjectTree
BoardHeader
BoardToolbar
BoardTabs

BoardTable
BoardGroup
BoardRow
BoardCell
BoardColumnHeader

AddItemRow
AddColumnButton
ColumnMenu
RowMenu

StatusCell
TextCell
NumberCell
DateCell
CheckboxCell
ProgressCell

FilterBuilder
SortBuilder
ColumnVisibilityMenu

ItemDetailDrawer
CommentThread
SubitemList

KanbanBoard
KanbanColumn
KanbanCard

CalendarView
```

Do not create huge monolithic board components.

---

# 39. State Management

Prefer server state and URL state over unnecessarily large global stores.

Recommended pattern:

```text
Server:
database-backed board state

Client:
editing state
selection
open drawer
drag state
temporary filters
optimistic updates
```

If a state library already exists, use it.

Otherwise, avoid adding Zustand/Redux until needed.

---

# 40. URL Structure

Recommended:

```text
/workspaces
/workspaces/[workspaceId]

/workspaces/[workspaceId]/projects/[projectId]

/workspaces/[workspaceId]/projects/[projectId]/boards/[boardId]
```

Views:

```text
...?view=table
...?view=kanban
...?view=calendar
```

Saved views may later get IDs.

---

# 41. Error Handling

Use standardized errors.

User-facing:

```text
"Could not update the item. Your previous value was restored."
```

Developer-facing:

```text
error code
operation
entity ID
stack trace where appropriate
```

Never expose sensitive server details in UI messages.

---

# 42. Accessibility

Support:

- keyboard navigation
- focus-visible states
- semantic buttons
- aria labels for icon-only controls
- accessible dialogs
- adequate contrast
- non-color status identification where necessary

---

# 43. Performance

Boards may become large.

Design for:

```text
hundreds to thousands of items
dozens of columns
many cell updates
```

Avoid rerendering the entire board on each cell edit.

Memoize at the appropriate component boundary.

Later consider row virtualization.

Do not introduce virtualization before basic interaction is stable unless the board already requires it.

---

# 44. Security

At minimum:

- validate all inputs
- authorize workspace access server-side
- prevent IDOR
- sanitize rich text
- validate uploads
- restrict file types where appropriate
- enforce upload limits
- protect database operations
- avoid trusting client ownership fields

Never rely on hidden UI controls as authorization.

---

# 45. Auditability

For important data changes, preserve enough metadata to support future audit history.

Do not silently overwrite everything without traceability.

At minimum prepare for:

```text
who
what
when
old value
new value
entity
```

This is particularly useful if the application is later used for regulated or GxP-adjacent work.

Do not label the application GxP-compliant unless it has been formally assessed and validated for that intended use.

---

# 46. Development Workflow

Implement feature-by-feature.

Recommended sequence:

```text
1. Repository audit
2. Data model
3. Workspace CRUD
4. Project CRUD
5. Board CRUD
6. Board shell
7. Groups
8. Dynamic columns
9. Items
10. Cell values
11. Inline editing
12. Reordering
13. Search
14. Sorting
15. Filtering
16. Item drawer
17. Subitems
18. Comments
19. Kanban
20. Calendar
21. Saved views
22. Polish
```

Do not build later phases until the board core works reliably.

---

# 47. First Cursor Task

Begin by auditing the repository.

Do NOT immediately rewrite code.

Perform the following:

1. Inspect directory structure.
2. Inspect package.json.
3. Determine package manager.
4. Determine framework/version.
5. Determine routing architecture.
6. Determine database and ORM.
7. Determine authentication.
8. Determine current UI library.
9. Find existing table/grid components.
10. Find existing sidebar/navigation.
11. Find existing schemas/types.
12. Find existing API/server patterns.
13. Find current testing framework.
14. Find lint/typecheck/build commands.
15. Identify components that can be reused.

Then produce a concise implementation plan based on the actual repository.

Include:

```text
Existing stack
Reusable components
Architecture gaps
Files likely to change
New files likely required
Database migration requirements
Implementation sequence
Key risks
```

Only after completing this audit should implementation begin.

---

# 48. Second Cursor Task

After the repository audit:

Implement the foundational data model.

Requirements:

- preserve current data models
- add Workspace / Project / Board hierarchy if missing
- add BoardGroup
- add BoardColumn
- add BoardItem
- add CellValue
- add BoardView
- create migrations
- create seed data
- create validation schemas
- add service layer

Verify:

```bash
lint
typecheck
tests
build
```

Use the actual repository commands.

---

# 49. Third Cursor Task

Build the initial board UI.

Implement:

```text
Board header
View tabs
Toolbar shell
Grouped table
Dynamic columns
Add item
Add group
Add column
Inline text editing
Inline status editing
Inline date editing
Delete item
Rename item
```

Persist all changes.

Use optimistic updates where practical.

---

# 50. Fourth Cursor Task

Add interaction quality.

Implement:

```text
column resizing
column reorder
row reorder
move rows between groups
sticky item column
sticky header
keyboard editing
context menus
column visibility
sorting
search
basic filters
```

---

# 51. Fifth Cursor Task

Implement item details.

Use a right-side drawer.

Include:

```text
item title
editable metadata
comments
subitems
activity placeholder
attachments placeholder
```

---

# 52. Sixth Cursor Task

Implement Kanban.

Requirements:

```text
select status/dropdown grouping column
render cards by status
drag between status lanes
persist value changes
open item drawer
```

---

# 53. Seventh Cursor Task

Implement Calendar.

Requirements:

```text
select date field
month display
show board items
open item drawer
persist date drag changes if supported
```

---

# 54. Definition of Done — V1

V1 is complete when a user can:

1. create a workspace
2. create a project
3. create a board
4. create groups
5. create configurable columns
6. create board items
7. edit values inline
8. move items
9. reorder columns
10. resize columns
11. filter items
12. sort items
13. search the board
14. open item details
15. create subitems
16. add comments
17. switch to Kanban
18. switch to Calendar
19. refresh the browser without losing changes
20. use the interface without console errors

---

# 55. Quality Gate

Before declaring any feature complete:

```text
[ ] TypeScript passes
[ ] lint passes
[ ] build passes
[ ] no obvious console errors
[ ] persistence verified
[ ] error handling implemented
[ ] loading state implemented
[ ] empty state implemented
[ ] keyboard accessibility considered
[ ] dark mode checked if enabled
[ ] responsive behavior checked
```

---

# 56. Coding Rules

Follow these rules consistently:

1. TypeScript strict mode where supported.
2. Avoid `any`.
3. Use Zod at boundaries.
4. Keep components focused.
5. Extract business logic from JSX.
6. Prefer named functions for complex logic.
7. Avoid duplicate API logic.
8. Do not hardcode database IDs.
9. Do not hardcode board columns.
10. Use transactions for multi-record changes where needed.
11. Maintain referential integrity.
12. Do not silently swallow errors.
13. Add comments only where they clarify non-obvious behavior.
14. Keep naming consistent with the existing repository.
15. Do not introduce dependencies without checking existing equivalents.

---

# 57. Important Product Principle

This application is not fundamentally a task list.

It is a configurable data/work management system.

The architecture should therefore support:

```text
Board
+
Dynamic Columns
+
Items
+
Views
+
Rules
```

rather than hardcoding:

```text
Task
Status
Due Date
Priority
```

Tasks are only one possible board configuration.

---

# 58. Future Validation-Oriented Use Cases

The generic architecture should eventually support boards such as:

```text
Validation Project Tracker
Equipment Qualification Tracker
Process Validation Tracker
Cleaning Validation Tracker
APR/PQR Tracker
Change Control Tracker
CAPA Tracker
Deviation Tracker
Stability Tracker
Client Commitments
Audit Findings Tracker
Training Tracker
Teaching Schedule
Student Assignment Tracker
Personal Task Manager
Software Development Roadmap
```

Do not create separate database systems for each use case.

They should be implemented mainly through:

```text
board templates
custom columns
saved views
automations
dashboards
```

---

# 59. Final Instruction to Cursor

Treat this document as the product and architecture specification.

When implementing a task:

1. inspect the relevant existing code first
2. identify reusable code
3. design the smallest maintainable change
4. implement it
5. run validation
6. inspect the UI where applicable
7. fix issues
8. summarize exactly what changed

Do not claim something works unless it has been verified.

If a requirement conflicts with the existing architecture, prefer a compatible implementation and document the deviation.

Maintain modularity so future features such as dashboards, automations, AI, audit history, and integrations can be added without redesigning the board data model.

---

# Suggested Initial Cursor Prompt

Use this prompt after adding this file to the repository:

```text
Read PERSONAL_WORK_OS_IMPLEMENTATION.md and treat it as the product specification.

You have MCP access.

Begin with Section 47: First Cursor Task.

Inspect the existing repository thoroughly using available MCP/repository tools. Do not make code changes yet.

Return:

1. Existing technical stack
2. Repository architecture
3. Relevant reusable components
4. Existing database/auth/API patterns
5. Gaps versus the specification
6. Recommended implementation architecture
7. Exact files likely to be modified
8. Exact new files likely to be created
9. Database migration plan
10. Ordered implementation plan for V1
11. Technical risks or architectural conflicts

Base the plan on the actual codebase rather than assumptions.

After the audit, stop and present the implementation plan before beginning the first implementation task.
```
