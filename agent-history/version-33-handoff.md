# Version 33 Handoff - Google Sheets Migration Tooling

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-12

Previous Version: `agent-history/version-32-handoff.md`

Project Status: **Migration pipeline ready; awaiting sheet exports + local service role key**

---

## What Was Requested

Help with Google Sheets import via `scripts/migrate-sheets-to-supabase.ts` for more accurate migration.

---

## What Was Implemented

### Migration pipeline

- **`scripts/migration-utils.ts`** — column mapping, cleaning, validation for projects and support activities
- **`scripts/read-sheet-export.ts`** — reads CSV, XLSX, or JSON exports; auto-detects table type
- **`scripts/migrate-sheets-to-supabase.ts`** — rewritten with:
  - `--validate` / `--dry-run` / import modes
  - Support for both `cnf_projects` and `support_activities`
  - Reads credentials from `.env.local` or shell env
  - Chunked upsert (100 rows) with conflict keys `record_id` / `activity_id`

### Documentation and export helpers

- **`exports/README.md`** — step-by-step export and import instructions
- **`reference/export-for-migration.gs`** — Apps Script helper to dump JSON from live sheet
- **`scripts/migration-map.md`** — updated with run commands
- **`.env.example`** — documents `SUPABASE_SERVICE_ROLE_KEY` (local only)
- **`.gitignore`** — ignores `exports/*` data files (keeps README)

### npm scripts

| Command | Purpose |
|---------|---------|
| `npm run migrate:validate` | Validate export files only |
| `npm run migrate:dry-run` | Map and validate without writing |
| `npm run migrate:import` | Upsert into Supabase |

---

## What Was Not Implemented

- Actual data import not run — no export files in `exports/` yet
- `SUPABASE_SERVICE_ROLE_KEY` not present in `.env.local`
- Legacy Google Sheet is private; requires manual CSV download or Apps Script export

---

## Verification

| Check | Result |
|---|---|
| `npm run build` | **Pass** |
| `npm run migrate:validate` (no exports) | Expected fail with clear instructions |

---

## Assumptions

- Legacy sheet ID: `1bBTkZXaPjx7kWY2ZELw0wy6B2MfSslgpN1vrlypYrLg` (from `sampleApp/Code.gs`)
- Target Supabase project: `byhxwretspcxrrkvovgq` (CNF Tracker Ver 2.0)
- Service role key will be added locally by owner and never committed

---

## Risks

- Service role key bypasses RLS — use only locally for one-time import
- Duplicate upserts overwrite existing rows with same `record_id` / `activity_id`
- Large exports should be validated with `--dry-run` before import

---

## Next Steps (owner action)

1. Export Google Sheets:
   - `PROJECTS` tab → save as `exports/projects.csv`
   - `SUPPORT_ACTIVITIES` tab → save as `exports/support_activities.csv`
2. Add to `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=<from Supabase Dashboard → API → service_role>
   ```
3. Run:
   ```bash
   npm run migrate:validate
   npm run migrate:dry-run
   npm run migrate:import
   npm run smoke:supabase
   ```
4. Spot-check in React app: Projects Database, Support Activities, Dashboard counts

---

## Git Traceability

- Commit: *(pending)*
- Commit message: `v33: add Google Sheets migration pipeline and export tooling`
- Commit hash: *(pending)*

---

## Reviewers Feedback

- **Instructions:** always add this section at the end of Markdown files to allow reviewers to provide feedback. If none is provided, this section will be skipped.
- **Reviewers:** @carlo-mauring
- **Comments:**
