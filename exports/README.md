# Google Sheets export folder

Place your legacy **Project Tracker** sheet exports here before running the migration.

## Required files

| File | Google Sheet tab | Supabase table |
|------|------------------|----------------|
| `projects.csv` (or `.xlsx`, `.json`) | `PROJECTS` | `cnf_projects` |
| `support_activities.csv` (or `.xlsx`, `.json`) | `SUPPORT_ACTIVITIES` | `support_activities` |

Supported formats: **CSV**, **XLSX**, **JSON array**

Legacy spreadsheet ID (from `sampleApp/Code.gs`):

```text
1bBTkZXaPjx7kWY2ZELw0wy6B2MfSslgpN1vrlypYrLg
```

## Option A — Download from Google Sheets (recommended)

1. Open the Project Tracker Google Sheet.
2. Select the **PROJECTS** tab → **File → Download → Comma Separated Values (.csv)**.
3. Save as `exports/projects.csv`.
4. Select the **SUPPORT_ACTIVITIES** tab → download CSV.
5. Save as `exports/support_activities.csv`.

## Option B — Apps Script JSON export

1. Open the bound Apps Script project for the sheet.
2. Paste the helper from `reference/export-for-migration.gs`.
3. Run `exportProjectTrackerMigrationJson()`.
4. Save the logged JSON arrays to:
   - `exports/projects.json`
   - `exports/support_activities.json`

## Before import

1. Add your Supabase **service role key** to `.env.local` (local only, never commit):

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get it from **Supabase Dashboard → Project Settings → API → service_role** (CNF Tracker Ver 2.0 / `byhxwretspcxrrkvovgq`).

2. Validate exports:

```bash
npm run migrate:validate
```

3. Dry run (no writes):

```bash
npm run migrate:dry-run
```

4. Import:

```bash
npm run migrate:import
```

5. Verify:

```bash
npm run smoke:supabase
npm run verify:supabase
```

Then open the React app and spot-check project hierarchy, support activities, and dashboard counts.

## Cleaning rules

See `scripts/migration-map.md` for column mapping. The script automatically:

- Normalizes empty values to `N/A`
- Converts `Is Active` TRUE/FALSE to boolean
- Parses dates to ISO timestamps
- Preserves `project_id`, instance IDs, and `cnf_entries_json`
- Rejects duplicate primary keys before import
