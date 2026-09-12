# Project Tracker — Monday.com / My-Day “My Work” Implementation Specification

## 1. Objective

Implement a **Monday.com-style “My Work” project-management experience** inside the existing Project Tracker application by adapting concepts and UI behavior from:

**Reference repository:**  
https://github.com/idandavid1/My-Day.git

Do **not** replace the existing application shell, sidebar, authentication, routing, or global design system.

The implementation must be scoped primarily to the existing **My work** navigation item and the content rendered inside the existing `AppShell`.

---

## 2. Exact Existing Integration Target

### Sidebar navigation target

**DOM Path**

```text
div#root
> div.ant-app
> div.app-root
> aside.sidebar-shell.sidebar-desktop
> div.sidebar-inner
> nav.sidebar-nav
> a.sidebar-nav-item.sidebar-nav-item-active
```

**Current element**

```html
<a
  aria-label="My work"
  title="My work"
  aria-current="page"
  class="sidebar-nav-item sidebar-nav-item-active"
  href="#/project-management"
  data-discover="true"
>
  My work
</a>
```

### Required route

```text
#/project-management
```

The sidebar item must continue to navigate to this route.

Do not change the route unless absolutely required by the existing router.

---

## 3. Main Content Integration Target

**DOM Path**

```text
div#root
> div.ant-app
> div.app-root
> div.app-main
> main.app-content
```

**React owner**

```text
AppShell
```

**Existing element**

```html
<main class="app-content">
  ...
</main>
```

The new Monday/My-Day-inspired project-management experience must render **inside this `<main class="app-content">` region**.

Do not replace:

- `#root`
- `.ant-app`
- `.app-root`
- `.app-main`
- `AppShell`
- desktop sidebar
- application header
- global theme
- authentication/session handling

---

# 4. Integration Strategy

Use the My-Day repository as a **reference implementation**, not as a drop-in replacement for the whole Project Tracker.

Recommended approach:

1. Clone My-Day into a temporary/reference directory.
2. Inspect the relevant frontend board components, styling, state logic, and drag-and-drop behavior.
3. Reimplement or adapt only the project-board functionality required by Project Tracker.
4. Preserve the Project Tracker's existing:
   - React version
   - router
   - Ant Design configuration
   - application shell
   - sidebar
   - API conventions
   - database/storage layer
   - authentication
5. Avoid introducing a second full app architecture inside the existing app.
6. Do not mount My-Day's root application inside Project Tracker.
7. Do not duplicate global CSS resets.
8. Do not replace existing Redux/context/state libraries unless necessary.

---

# 5. Reference Repository Setup

For code inspection only:

```bash
git clone https://github.com/idandavid1/My-Day.git
```

Prefer placing it outside the active Project Tracker source tree, for example:

```text
workspace/
├── project-tracker/
└── references/
    └── My-Day/
```

Do not commit the full reference repository into Project Tracker unless explicitly required.

---

# 6. Desired “My Work” Page

The current Project Tracker page already contains concepts such as:

```text
My work
Browse live projects and support work.
Click a calendar day or use My Tasks to add your own task.

Refresh
Portfolio
My Tasks
Calendar

All sources
All statuses
All phases

Ongoing
25

Project
...
```

Retain these concepts but upgrade the page into a Monday-style workspace.

The final page should feel like a **professional portfolio/project tracker**, not a generic clone.

---

# 7. Page Header

Inside `main.app-content`, create a page header similar to:

```text
My work

Manage validation projects, support work, milestones,
responsibilities, due dates, and project status.

[ Refresh ]                          [ + New Project ]
```

Recommended structure:

```tsx
<ProjectManagementPage>
  <ProjectManagementHeader />
  <ProjectSummaryCards />
  <ProjectViewTabs />
  <ProjectToolbar />
  <ProjectBoard />
</ProjectManagementPage>
```

---

# 8. Primary Views

Provide these tabs/views:

```text
Portfolio
My Tasks
Board
Calendar
```

Optional later enhancement:

```text
Dashboard
Timeline
Gantt
```

Default view:

```text
Portfolio
```

or preserve the current application's existing default if already established.

Use the existing router state or local URL search/hash parameters if supported.

Example:

```text
#/project-management?view=portfolio
#/project-management?view=tasks
#/project-management?view=board
#/project-management?view=calendar
```

If the current hash router does not safely support query parameters, store selected view in component state.

---

# 9. Summary Cards

Display compact summary cards near the top of the page.

Recommended cards:

```text
Ongoing
25

For Review
6

At Risk
3

Completed
18

My Tasks
12
```

Counts must be computed from actual project/task data.

Do not hard-code the values except for temporary development fixtures.

---

# 10. Monday-Style Portfolio Board

Create a table/board inspired by Monday.com/My-Day.

Recommended columns:

| Column | Purpose |
|---|---|
| Project | Project/product/title |
| Source | Validation, QA, Support, Client, Internal |
| Phase | Protocol, Execution, Testing, Stability, Report, Closed |
| Status | Ongoing, For Review, Waiting, At Risk, Completed |
| Owner | Responsible person |
| Priority | Critical, High, Medium, Low |
| Progress | Percentage |
| Due Date | Target completion date |
| Client | Client/customer |
| Last Update | Most recent activity |
| Actions | Edit/open/more |

Example:

```text
┌──────────────────────┬────────────┬──────────────┬─────────────┬──────────────┬──────────┬──────────┬────────────┐
│ Project              │ Phase      │ Status       │ Owner       │ Priority     │ Progress │ Due Date │ Client     │
├──────────────────────┼────────────┼──────────────┼─────────────┼──────────────┼──────────┼──────────┼────────────┤
│ Tempra Boost         │ Execution  │ Ongoing      │ Carlo       │ High         │ 62%      │ Sep 25   │ Kenvue     │
│ Propan Immune + Zinc │ Protocol   │ For Review   │ Leanne      │ High         │ 40%      │ Sep 30   │ Internal   │
│ Bactidol 0.1%        │ Stability  │ Ongoing      │ Carlo       │ Medium       │ 75%      │ Oct 15   │ Kenvue     │
│ Seahorse             │ Assessment │ For Review   │ Anissa      │ High         │ 35%      │ Sep 20   │ Haleon     │
└──────────────────────┴────────────┴──────────────┴─────────────┴──────────────┴──────────┴──────────┴────────────┘
```

---

# 11. Grouping

Support Monday-style grouping.

Default grouping:

```text
Ongoing
For Review
Waiting / Blocked
At Risk
Completed
```

Alternative group-by options:

```text
Status
Phase
Owner
Client
Priority
Source
```

Each group should:

- display group name
- display count
- support collapse/expand
- show colored group indicator
- display project rows
- optionally support drag between groups

Example:

```text
▼ Ongoing · 12
  Project A
  Project B
  Project C

▼ For Review · 5
  Project D
  Project E

▶ Completed · 18
```

---

# 12. Drag and Drop

Adapt My-Day's drag-and-drop behavior where useful.

Required:

- reorder projects within the same group
- preserve manual sort order
- optionally move items between compatible status groups

When a project is dropped into another status group:

```text
Ongoing -> For Review
```

update its status automatically.

Do not enable drag behavior if it can accidentally alter regulated/project records without confirmation.

For important state changes, consider confirmation:

```text
Move "Tempra Boost" from Ongoing to Completed?
```

For simple visual ordering, no confirmation is required.

---

# 13. Status Column

Use clear status chips.

Recommended statuses:

```ts
type ProjectStatus =
  | "Not Started"
  | "Ongoing"
  | "For Review"
  | "Waiting"
  | "Blocked"
  | "At Risk"
  | "Completed"
  | "Cancelled";
```

Visual behavior:

```text
Not Started   gray
Ongoing       blue
For Review    purple
Waiting       amber
Blocked       red
At Risk       orange/red
Completed     green
Cancelled     neutral/dark gray
```

Use existing Ant Design theme tokens instead of hard-coded colors whenever possible.

---

# 14. Phase Column

Recommended project phases:

```ts
type ProjectPhase =
  | "Initiation"
  | "Risk Assessment"
  | "Protocol"
  | "Preparation"
  | "Execution"
  | "QC Testing"
  | "Stability"
  | "Data Review"
  | "Report"
  | "Approval"
  | "Closed";
```

Make the list configurable.

---

# 15. Priority

Recommended values:

```ts
type ProjectPriority =
  | "Critical"
  | "High"
  | "Medium"
  | "Low";
```

Allow inline editing.

---

# 16. Inline Editing

Following the My-Day/Monday interaction model, allow selected fields to be edited directly from the table.

Recommended inline-editable fields:

- project name
- owner
- status
- phase
- priority
- due date
- progress
- client

Use Ant Design components where appropriate:

```tsx
<Select />
<DatePicker />
<Progress />
<Avatar />
<Dropdown />
<Input />
```

Avoid full page reloads.

Persist changes through the Project Tracker's existing data layer.

---

# 17. Project Row Interaction

Clicking the **Project** name should open a project detail experience.

Preferred:

```text
right-side drawer
```

Alternative:

```text
dedicated project details route
```

Recommended drawer:

```tsx
<Drawer
  placement="right"
  width={720}
>
  <ProjectDetails />
</Drawer>
```

---

# 18. Project Detail Sections

Recommended project detail navigation:

```text
Overview
Tasks
Timeline
Protocol
Risk Assessment
Manufacturing
Packaging
Sampling
Laboratory Testing
Stability
Deviations
Documents
Activity
Approvals
```

Not every project must use every module.

Modules should be conditionally visible according to project type.

---

# 19. My Tasks View

Create a personalized task table for the current logged-in user.

Columns:

```text
Task
Project
Status
Priority
Due Date
Phase
Assigned By
```

Sections:

```text
Overdue
Today
This Week
Later
Completed
```

Allow:

```text
+ Add Task
```

A new task should optionally be linked to a project.

---

# 20. Task Model

Suggested TypeScript model:

```ts
export interface ProjectTask {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  ownerId?: string;
  ownerName?: string;
  status:
    | "Not Started"
    | "Working on it"
    | "For Review"
    | "Blocked"
    | "Done";
  priority: "Critical" | "High" | "Medium" | "Low";
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

# 21. Project Model

Suggested model:

```ts
export interface Project {
  id: string;

  name: string;
  description?: string;

  source?: string;
  client?: string;
  product?: string;

  phase: ProjectPhase;
  status: ProjectStatus;
  priority: ProjectPriority;

  ownerId?: string;
  ownerName?: string;

  startDate?: string;
  dueDate?: string;

  progress: number;

  tags?: string[];

  sortOrder?: number;
  groupId?: string;

  createdAt: string;
  updatedAt: string;
}
```

Adapt this to the existing Project Tracker schema instead of duplicating fields already present.

---

# 22. Filters

Maintain the current filters:

```text
All sources
All statuses
All phases
```

Expand to:

```text
Search
Source
Status
Phase
Owner
Priority
Client
Due Date
```

Toolbar example:

```text
[ Search projects... ] [ Source ▼ ] [ Status ▼ ] [ Phase ▼ ]
[ Owner ▼ ] [ Priority ▼ ] [ Clear filters ]
```

Filtering must happen without page reload.

---

# 23. Search

Search across:

- project name
- product
- client
- project code
- owner
- tags

Use debounced input.

Example:

```tsx
<Input.Search
  placeholder="Search projects..."
  allowClear
/>
```

---

# 24. Sorting

Support sorting by:

```text
Project
Priority
Status
Phase
Owner
Progress
Due Date
Last Update
```

Remember the current sorting during the session.

---

# 25. Calendar View

Preserve the current Calendar concept.

Display:

- project due dates
- task due dates
- major milestones
- validation execution dates
- stability pull dates if present

Clicking a day should support:

```text
+ Add Task
```

Clicking an existing calendar item should open its project/task details.

---

# 26. New Project Flow

Add:

```text
+ New Project
```

Recommended creation drawer/modal fields:

```text
Project Name *
Project Type
Product
Client
Source
Owner
Priority
Phase
Status
Start Date
Due Date
Description
```

Default:

```text
Status = Not Started
Phase = Initiation
Priority = Medium
```

After creation:

1. save
2. close modal/drawer
3. add row immediately
4. show success toast
5. optionally open project detail drawer

---

# 27. Add Project Row

Optional Monday-style quick-add row:

```text
+ Add project
```

Place it below the last row of a group.

Typing a project name and pressing Enter should create a minimal project.

---

# 28. Row Actions

Add a compact actions menu:

```text
Open
Edit
Duplicate
Archive
Delete
```

Optional:

```text
Move to group
Copy link
```

Delete must require confirmation.

Prefer soft delete/archive if supported by the existing application.

---

# 29. Activity Log

Adopt the useful My-Day activity concept.

Track meaningful changes:

```text
Project created
Status changed
Phase changed
Owner changed
Due date changed
Task created
Task completed
Comment added
Document linked
Project completed
```

Suggested activity model:

```ts
interface ProjectActivity {
  id: string;
  projectId: string;
  actorId: string;
  actorName: string;
  action: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt: string;
}
```

Example:

```text
Carlo changed Status from "Ongoing" to "For Review"
12 Sep 2026 · 3:35 PM
```

---

# 30. Comments / Updates

Optional but recommended.

Inside Project Details provide:

```text
Updates
```

Users can add:

- comment/update
- mention teammate
- attachment
- timestamp

Do not implement chat/websockets unless required by the Project Tracker.

The My-Day repository supports live updates through WebSockets, but this should be an optional later phase if the current Project Tracker is not already real-time.

---

# 31. Ant Design Compatibility

The existing DOM shows an Ant Design application wrapper:

```text
ant-app
```

Therefore reuse Ant Design before importing My-Day-specific visual libraries.

Preferred components:

```tsx
App
Button
Card
Table
Tag
Select
Dropdown
Input
DatePicker
Drawer
Modal
Avatar
Tooltip
Progress
Tabs
Badge
Popconfirm
Empty
Spin
Skeleton
```

Avoid conflicting design systems.

---

# 32. Styling Requirements

The board should visually fit the current Project Tracker.

Use existing CSS variables/theme tokens whenever possible.

Recommended layout:

```css
.project-management-page {
  width: 100%;
  min-width: 0;
}

.project-management-toolbar {
  position: sticky;
  top: var(--app-header-height, 0px);
  z-index: 10;
}

.project-board {
  overflow-x: auto;
}
```

Do not hard-code the observed browser dimensions:

```text
left = 280px
width = 941px
top = 72px
```

Those are runtime layout measurements, not CSS requirements.

The page must remain responsive.

---

# 33. Sidebar Requirements

The sidebar must remain visually and functionally unchanged.

Preserve:

```html
<a
  aria-label="My work"
  title="My work"
  href="#/project-management"
>
  My work
</a>
```

The existing router should continue applying:

```text
sidebar-nav-item-active
```

when the route is active.

Do not manually hard-code the active CSS class if the current navigation component already manages it.

---

# 34. Suggested Component Structure

Adapt names to existing conventions.

```text
src/
└── features/
    └── project-management/
        ├── pages/
        │   └── ProjectManagementPage.tsx
        │
        ├── components/
        │   ├── ProjectManagementHeader.tsx
        │   ├── ProjectSummaryCards.tsx
        │   ├── ProjectViewTabs.tsx
        │   ├── ProjectToolbar.tsx
        │   ├── ProjectBoard.tsx
        │   ├── ProjectGroup.tsx
        │   ├── ProjectRow.tsx
        │   ├── ProjectStatusCell.tsx
        │   ├── ProjectPhaseCell.tsx
        │   ├── ProjectOwnerCell.tsx
        │   ├── ProjectPriorityCell.tsx
        │   ├── ProjectProgressCell.tsx
        │   ├── ProjectDetailsDrawer.tsx
        │   ├── NewProjectDrawer.tsx
        │   ├── MyTasksView.tsx
        │   └── ProjectCalendarView.tsx
        │
        ├── hooks/
        │   ├── useProjects.ts
        │   ├── useProjectFilters.ts
        │   └── useProjectMutations.ts
        │
        ├── services/
        │   └── projectManagementApi.ts
        │
        ├── types/
        │   └── projectManagement.ts
        │
        └── styles/
            └── project-management.css
```

If equivalent folders/components already exist, modify them rather than creating duplicates.

---

# 35. Route Integration

Locate the existing route responsible for:

```text
#/project-management
```

It may look conceptually similar to:

```tsx
<Route
  path="/project-management"
  element={<ProjectManagementPage />}
/>
```

or use a route configuration object.

Do not introduce another router.

Ensure the page continues rendering inside:

```tsx
<AppShell>
  <main className="app-content">
    <Outlet />
  </main>
</AppShell>
```

or the equivalent existing pattern.

---

# 36. State Management

Before importing Redux logic from My-Day, inspect the current Project Tracker.

Use this priority:

1. existing application state/data hooks
2. existing query/cache library
3. React context
4. component state
5. Redux only if Redux is already part of Project Tracker

Do not introduce Redux solely because My-Day uses Redux.

---

# 37. Backend/API Strategy

My-Day uses a Node/Express/MongoDB backend.

Do **not** automatically replace Project Tracker's backend.

First inspect the current application.

Create or extend endpoints conceptually equivalent to:

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id

GET    /api/projects/:id/tasks
POST   /api/projects/:id/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id

GET    /api/projects/:id/activity
```

If existing endpoints already handle projects/tasks, reuse them.

---

# 38. Optimistic UI

For safe inline changes:

1. update UI immediately
2. submit API change
3. show small loading state
4. rollback if request fails
5. display failure notification

Use optimistic updates for:

- status
- phase
- priority
- owner
- due date
- progress

Do not use optimistic updates for destructive operations unless the application already supports undo.

---

# 39. Loading States

Use:

```text
Skeleton
Spin
```

Do not leave a blank page during data loading.

---

# 40. Empty States

Examples:

```text
No projects found.

Create your first project or change the current filters.

[ + New Project ]
```

Filtered empty state:

```text
No projects match the selected filters.

[ Clear filters ]
```

---

# 41. Error Handling

Show clear messages for:

- project load failure
- update failure
- delete failure
- invalid dates
- unavailable user
- stale record/conflict

Example:

```text
Could not update project status.
Your previous value has been restored.
```

---

# 42. Accessibility

Maintain:

- keyboard navigation
- visible focus state
- labels
- ARIA labels
- semantic buttons
- accessible menus
- adequate contrast

Example:

```tsx
<Button aria-label={`Open ${project.name}`}>
```

Do not make clickable behavior depend only on `<div onClick>`.

---

# 43. Responsive Behavior

Desktop:

```text
Sidebar | Project management board
```

Tablet:

- preserve sidebar behavior already provided by AppShell
- allow horizontal table scrolling
- keep filters compact

Mobile:

- use cards or reduced columns
- allow detail drawer to occupy full width
- hide noncritical board columns

Suggested mobile visible fields:

```text
Project
Status
Owner
Due Date
```

---

# 44. Project Tracker-Specific Domain Enhancements

Since this is a project tracker, include optional domain fields such as:

```text
Project Code
Product
Client
Project Type
Validation Type
Protocol No.
Report No.
Batch / Lot
Target Execution
Target Completion
Document Status
Stability Status
```

Do not display all fields in the primary table.

Keep detailed metadata inside the Project Details drawer.

---

# 45. Recommended Project Types

Example:

```text
Process Validation
Cleaning Validation
Packaging Validation
Hold-Time Study
Process Characterization
Equipment Qualification
Computer System Validation
Stability
Investigation
Change Control
QA Support
Technical Transfer
Other
```

Make configurable.

---

# 46. Validation-Focused Project Phases

Optional alternative for validation projects:

```text
Planning
QRM
Protocol Drafting
Protocol Approval
Readiness
Execution
QC Testing
Data Review
Report Drafting
Report Approval
Stability Monitoring
Closed
```

If `project.type` is a validation-related type, these phases can be used instead of generic project phases.

---

# 47. Recommended Status Automation

Examples:

```text
If progress = 100%
  suggest Status = Completed
```

```text
If dueDate < today AND status != Completed
  mark project as overdue
```

```text
If blocked task exists
  show Blocked indicator on project
```

Do not automatically change regulated project status without an explicit user action unless that behavior already exists.

---

# 48. Visual Progress

Use progress bar:

```text
████████░░ 80%
```

Progress may be:

### Manual

User enters:

```text
0–100%
```

### Calculated

```ts
progress =
  completedTasks / totalTasks * 100
```

If both approaches exist, define one canonical source to avoid inconsistent values.

---

# 49. Due-Date Indicators

Recommended behavior:

```text
Overdue       red
Due today     orange
Due ≤ 7 days  amber
Future        neutral
Completed     green/neutral
```

Use theme tokens.

---

# 50. Portfolio View Recommended Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│ My work                                         Refresh  + New Project│
│ Manage validation projects, support work, milestones and tasks.      │
├─────────────────────────────────────────────────────────────────────┤
│ Ongoing 25 │ For Review 6 │ At Risk 3 │ Completed 18 │ My Tasks 12 │
├─────────────────────────────────────────────────────────────────────┤
│ Portfolio │ My Tasks │ Board │ Calendar                             │
├─────────────────────────────────────────────────────────────────────┤
│ Search... │ Source │ Status │ Phase │ Owner │ Priority │ Clear       │
├─────────────────────────────────────────────────────────────────────┤
│ ▼ Ongoing · 12                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Project │ Phase │ Status │ Owner │ Priority │ Progress │ Due   │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │ ...                                                             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ + Add project                                                       │
│                                                                     │
│ ▼ For Review · 5                                                    │
│ ...                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

# 51. Board View

Provide a kanban-style optional board grouped by status:

```text
NOT STARTED     ONGOING        FOR REVIEW      BLOCKED        COMPLETED

Project A       Project D      Project F       Project H      Project J
Project B       Project E      Project G                      Project K
Project C
```

Cards should show:

```text
Project
Owner
Priority
Due date
Progress
```

Support drag-and-drop between columns if persistence is safe.

---

# 52. Preserve Existing Functionality

Before replacing any current `My work` implementation:

- inventory current features
- preserve existing API calls
- preserve task creation
- preserve Calendar behavior
- preserve Portfolio behavior
- preserve current filters
- preserve Refresh behavior
- preserve user permissions
- preserve deep links
- preserve browser back/forward behavior

Upgrade rather than regress.

---

# 53. Do Not Copy Blindly From My-Day

Do not blindly copy:

- authentication
- MongoDB configuration
- backend bootstrap
- root React app
- global routing
- global navigation
- CSS reset
- Google login
- environment files
- deployment configuration

Only adapt the functionality useful to the Project Tracker.

---

# 54. Dependency Review

Before adding any package from My-Day:

1. check whether Project Tracker already has an equivalent
2. check package compatibility with current React
3. check maintenance status
4. avoid redundant libraries
5. avoid old/unmaintained drag-and-drop packages if a modern equivalent is already in use

Prefer the current app's dependencies.

---

# 55. Implementation Phases

## Phase 1 — Audit

Inspect:

```text
AppShell
sidebar navigation
#/project-management route
existing My Work page
project data types
task data types
API layer
authentication
Ant Design theme
current state-management approach
```

Deliver no major UI changes until the existing architecture is understood.

---

## Phase 2 — Structural Upgrade

Implement:

- page header
- view tabs
- summary cards
- filter toolbar
- grouped project table
- responsive shell

No drag-and-drop yet.

---

## Phase 3 — Editing

Implement:

- inline status editing
- phase editing
- priority editing
- owner editing
- date editing
- progress editing
- create project
- edit project
- project details drawer

---

## Phase 4 — Tasks

Implement:

- My Tasks
- task creation
- task status
- due dates
- project relationship
- overdue/today/week groupings

---

## Phase 5 — Board and Drag-and-Drop

Implement:

- Kanban board
- row/group ordering
- drag between status groups
- persistence
- optimistic updates
- rollback handling

---

## Phase 6 — Calendar

Implement/upgrade:

- project dates
- task dates
- milestones
- click-to-create task
- click-to-open project/task

---

## Phase 7 — Activity / Collaboration

Implement if required:

- activity log
- comments/updates
- mentions
- realtime updates

Real-time communication is optional and must not block the core implementation.

---

# 56. Acceptance Criteria

The implementation is complete when all of the following are true.

### Navigation

- [ ] Existing **My work** sidebar item remains present.
- [ ] It still uses `#/project-management`.
- [ ] Active route styling continues to work.
- [ ] No duplicate sidebar entry is introduced.

### App Shell

- [ ] Existing `AppShell` remains intact.
- [ ] New UI renders inside `main.app-content`.
- [ ] Header/sidebar layouts are not replaced.
- [ ] No nested full-screen My-Day application is mounted.

### Portfolio

- [ ] Projects render in a Monday-style grouped table.
- [ ] Project groups can be collapsed.
- [ ] Search works.
- [ ] Source filter works.
- [ ] Status filter works.
- [ ] Phase filter works.
- [ ] Owner filter works if owner data is available.
- [ ] Priority filter works.
- [ ] Sorting works.
- [ ] Empty/filter states are handled.

### Editing

- [ ] Project can be created.
- [ ] Project can be opened.
- [ ] Project can be edited.
- [ ] Status can be changed.
- [ ] Phase can be changed.
- [ ] Owner can be changed.
- [ ] Priority can be changed.
- [ ] Due date can be changed.
- [ ] Progress can be changed.
- [ ] Changes persist after page refresh.

### Tasks

- [ ] My Tasks displays current user's tasks.
- [ ] New task can be created.
- [ ] Task can be linked to project.
- [ ] Task status can be updated.
- [ ] Due-date grouping works.

### Board

- [ ] Board view is available.
- [ ] Projects are grouped by status.
- [ ] Drag-and-drop works if enabled.
- [ ] Dropped state persists.

### Calendar

- [ ] Calendar remains available.
- [ ] Project/task due dates display.
- [ ] Clicking an item opens details.
- [ ] Clicking a date supports task creation if existing behavior supports it.

### Quality

- [ ] No console errors.
- [ ] No duplicate React keys.
- [ ] No TypeScript errors.
- [ ] No obvious accessibility regressions.
- [ ] Existing routes continue to work.
- [ ] Existing user permissions continue to work.
- [ ] Desktop and tablet layouts work.
- [ ] Mobile remains usable.

---

# 57. Testing

Add/update tests according to the current project test stack.

Minimum scenarios:

```text
renders project-management page
loads project list
filters by status
filters by phase
searches project
creates project
updates status
updates priority
opens project drawer
creates task
changes task status
handles failed API mutation
renders empty state
preserves project-management route
```

If drag-and-drop is implemented:

```text
reorders project
moves project to another status
persists updated order
rolls back failed move
```

---

# 58. Performance

For large project lists:

- memoize derived grouping/filter data
- debounce search
- avoid rerendering every row after one cell edit
- consider virtualized rows only if necessary
- paginate or lazy-load activities
- avoid requesting full project detail data for every portfolio row

Initial list API should preferably return lightweight project summaries.

---

# 59. Security / Permissions

Respect existing role-based access.

Example permissions:

```text
project:view
project:create
project:update
project:delete
project:assign
task:create
task:update
project:admin
```

Users without edit access should receive a read-only board.

Do not rely only on frontend permission checks.

Backend/API authorization must remain authoritative.

---

# 60. Data Migration

If the current Project Tracker already contains project data:

**Do not create a parallel project database/table automatically.**

Map existing data to the enhanced UI.

Only add fields when needed, for example:

```text
priority
phase
progress
sortOrder
archivedAt
```

Use backwards-compatible migrations.

---

# 61. Suggested Implementation Prompt for Coding Agent

Use the following instruction when implementing this specification:

```text
Implement the requirements in MY_WORK_MONDAY_IMPLEMENTATION.md.

Use https://github.com/idandavid1/My-Day.git only as a reference for
Monday-style board interactions and component behavior.

Do not replace the existing application architecture.

First inspect the current Project Tracker codebase and locate:
1. AppShell
2. the sidebar component
3. the route for /project-management
4. the existing My Work page
5. current project/task API services
6. current state-management approach
7. Ant Design theme/configuration

Then upgrade the existing /project-management page incrementally.

The implementation must render inside the existing:
<main className="app-content">

The existing sidebar link:
<a href="#/project-management">My work</a>
must remain functional.

Reuse existing components, hooks, API conventions, models, routing,
permissions, and styling wherever possible.

Do not copy My-Day's authentication, application root, backend, router,
or global styles into this project.

Prioritize:
1. Portfolio grouped table
2. filters/search
3. inline status/phase/priority/owner/date editing
4. project detail drawer
5. My Tasks
6. Board/Kanban
7. Calendar
8. drag-and-drop
9. activity log

After each implementation phase:
- run type checking
- run lint
- run tests
- build the app
- fix all introduced errors before continuing.

Do not remove or regress existing Project Tracker functionality.
```

---

# 62. Definition of Done

The finished `#/project-management` experience should feel like a purpose-built **Monday.com-style Project Tracker** integrated naturally into the current application.

It should not look or behave like another application embedded inside the Project Tracker.

The user should experience:

```text
My work
  ↓
Portfolio of projects
  ↓
Grouped project board
  ↓
Fast filtering
  ↓
Inline status/phase/owner updates
  ↓
Project details
  ↓
Tasks
  ↓
Calendar
  ↓
Board/Kanban
  ↓
Activity history
```

while the existing:

```text
AppShell
Sidebar
Header
Theme
Authentication
Routing
Project Tracker backend
```

remain intact.

---

## Reference

My-Day GitHub repository:

```text
https://github.com/idandavid1/My-Day.git
```

The reference project is a React/Redux + Node.js/Express/MongoDB Monday-style task-management application with board management, drag-and-drop, editable task attributes, groups, filtering, activity tracking, and real-time updates.

Use those concepts selectively and adapt them to the existing Project Tracker architecture.
