# Project Tracker Workflow App

This folder contains the local AI-efficient workflow application copied from `reference/05 AI Efficient Workflow/workflow-app`.

Use it as a local approval, comment, planning, review, deployment, maintenance, and audit interface for agent workflow records.

## Commands

Run from the project root:

```text
python workflow-app/server.py
```

Then open:

```text
http://127.0.0.1:8765
```

Validate the bundled SQLite schema and app behavior:

```text
python workflow-app/scripts/validate_schema.py
python workflow-app/scripts/smoke_test.py
```

## Local State

Runtime data is stored under `workflow-app/data/` and is ignored by Git except for `.gitkeep`.

Local overrides belong in:

```text
workflow-app/config.json
```

That file is ignored by Git.

## Baseline Safety

The default config points baseline approvals at:

```text
agent-history/version-0-baseline.md
```

Do not approve or restore a baseline record in this app unless the project owner explicitly intends to revise the approved Project Tracker baseline. Routine comments, plans, reviews, deployment records, maintenance notes, and audit records can be created without touching the baseline file.
