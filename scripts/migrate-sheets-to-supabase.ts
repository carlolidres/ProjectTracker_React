/**
 * Local-only migration script. Requires service role key in environment.
 * NEVER commit the service role key.
 *
 * Usage:
 *   npm run migrate:validate
 *   npm run migrate:dry-run
 *   npm run migrate:import
 *
 * Or directly:
 *   npx tsx scripts/migrate-sheets-to-supabase.ts --dry-run exports/projects.csv exports/support.csv
 *   npx tsx scripts/migrate-sheets-to-supabase.ts exports/projects.csv exports/support.csv
 *
 * Environment (from shell or .env.local):
 *   VITE_SUPABASE_URL or SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { prepareMigrationRows, readExportFile, summarizePrepared } from "./read-sheet-export";

function loadEnvLocal(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const vars: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

const envLocal = loadEnvLocal();
const url =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  envLocal.SUPABASE_URL ??
  envLocal.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? envLocal.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const validateOnly = args.includes("--validate");
const fileArgs = args.filter((arg) => !arg.startsWith("--"));

const defaultProjects = resolve(process.cwd(), "exports/projects.csv");
const defaultSupport = resolve(process.cwd(), "exports/support_activities.csv");
const inputFiles =
  fileArgs.length > 0
    ? fileArgs.map((file) => resolve(file))
    : [defaultProjects, defaultSupport].filter((file) => existsSync(file));

if (!validateOnly && (!url || !serviceKey)) {
  console.error("Missing Supabase credentials.");
  console.error("Add to .env.local (never commit):");
  console.error("  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key");
  console.error("  VITE_SUPABASE_URL=https://byhxwretspcxrrkvovgq.supabase.co");
  process.exit(1);
}

if (inputFiles.length === 0) {
  console.error("No export files found.");
  console.error("Place Google Sheets exports in exports/:");
  console.error("  exports/projects.csv");
  console.error("  exports/support_activities.csv");
  console.error("See exports/README.md for export instructions.");
  process.exit(1);
}

async function upsertChunked(
  table: "cnf_projects" | "support_activities",
  rows: Record<string, unknown>[],
  conflictKey: "record_id" | "activity_id",
  supabase: ReturnType<typeof createClient>,
) {
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflictKey });
    if (error) throw error;
    console.log(`  Upserted ${Math.min(i + chunkSize, rows.length)} / ${rows.length} → ${table}`);
  }
}

async function main() {
  console.log(`Migration mode: ${validateOnly ? "validate" : dryRun ? "dry-run" : "import"}`);
  console.log(`Supabase URL: ${url ?? "(not required for validate)"}`);
  console.log(`Files: ${inputFiles.join(", ")}`);

  const preparedItems = inputFiles.map((file) => {
    const parsed = readExportFile(file);
    const prepared = prepareMigrationRows(parsed);
    summarizePrepared(file, prepared);
    return prepared;
  });

  const hasErrors = preparedItems.some((item) => item.errors.length > 0);
  if (hasErrors) {
    console.error("\nValidation failed. Fix export files before importing.");
    process.exit(1);
  }

  if (validateOnly || dryRun) {
    console.log("\nValidation complete. No data was written.");
    if (dryRun) console.log("Re-run without --dry-run to import.");
    return;
  }

  const supabase = createClient(url!, serviceKey!);

  for (const item of preparedItems) {
    if (item.table === "projects") {
      console.log(`\nImporting ${item.mapped.length} project rows...`);
      await upsertChunked("cnf_projects", item.mapped, "record_id", supabase);
    } else {
      console.log(`\nImporting ${item.mapped.length} support activity rows...`);
      await upsertChunked("support_activities", item.mapped, "activity_id", supabase);
    }
  }

  const projectCount = preparedItems
    .filter((item) => item.table === "projects")
    .reduce((sum, item) => sum + item.mapped.length, 0);
  const supportCount = preparedItems
    .filter((item) => item.table === "support")
    .reduce((sum, item) => sum + item.mapped.length, 0);

  console.log("\nMigration complete.");
  console.log(`  cnf_projects: ${projectCount}`);
  console.log(`  support_activities: ${supportCount}`);
  console.log("Next: npm run smoke:supabase && verify counts in the React app.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
