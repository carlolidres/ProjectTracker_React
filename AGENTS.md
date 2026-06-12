# AGENTS.md

# AI Project Continuity and Handoff System

## Purpose

This repository uses a versioned AI handoff system to ensure continuity between coding sessions, coding agents, and project iterations.

Every coding session must leave behind a complete record of:

* What was requested
* What was implemented
* What was not implemented
* What problems were encountered
* What lessons were learned
* What should happen next

---

## Required Folder Structure

The project must contain this structure:

```text
PROJECT_ROOT/
│
├── AGENTS.md
├── agent-history/
│   ├── version-0-baseline.md
│   ├── version-1-handoff.md
│   ├── version-2-handoff.md
│   └── version-X-handoff.md
│
└── src/
```

All handoff files must be stored inside:

```text
agent-history/
```

The baseline file must be located at:

```text
agent-history/version-0-baseline.md
```

The latest handoff file must also be located inside:

```text
agent-history/
```

Example:

```text
agent-history/version-3-handoff.md
```

---

## Required Startup Procedure

Before making any change, the coding agent must:

1. Read `AGENTS.md`.
2. Open the folder `agent-history/`.
3. Read `agent-history/version-0-baseline.md`.
4. Find the highest numbered handoff file inside `agent-history/`.
5. Read the latest handoff file completely.
6. Summarize the current project status.
7. Identify unfinished items.
8. Confirm the planned work before coding.
9. Do not start coding until the applicable baseline, latest handoff, and relevant .cursor/rules/ files have been reviewed.
10. Always track the project progress based on the plan "C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\.cursor\plan\project_tracker_migration_36f9948d.plan.md"

Example:

If these files exist:

```text
agent-history/version-0-baseline.md
agent-history/version-1-handoff.md
agent-history/version-2-handoff.md
```

The coding agent must read:

```text
agent-history/version-2-handoff.md
```

before starting new work.

---

## Version Chain

Example:

```text
agent-history/version-0-baseline.md
        ↓
agent-history/version-1-handoff.md
        ↓
agent-history/version-2-handoff.md
        ↓
agent-history/version-3-handoff.md
```

The latest version represents the current project state.

Previous versions must never be edited.

Previous versions are historical records.

---

## Hard Rules

Always:

* Read latest version from `agent-history/` before coding
* Create a new handoff inside `agent-history/` after coding
* Document assumptions
* Document risks
* Document lessons learned

Never:

* Delete previous handoffs
* Rewrite project history
* Claim testing without testing
* Modify baseline requirements without approval

## Git Traceability Requirement

Every handoff file must have exactly one corresponding Git commit.

A task is NOT complete unless:

* Handoff file exists inside `agent-history/`
* Git commit exists
* Commit hash is recorded in the handoff file
* Commit message is recorded in the handoff file

---

## Commit Format

```text
v[VERSION]: [summary]
```

Examples:

```text
v1: initialize project
v2: implement authentication
v3: add dashboard KPI cards
v4: implement notification engine
v5: fix validation workflow
```

---

## Completion Definition

Work is COMPLETE only if:

* Implementation completed
* Verification completed
* New handoff created inside `agent-history/`
* Next steps documented
