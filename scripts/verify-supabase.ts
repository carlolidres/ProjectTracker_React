/**
 * Verifies Supabase connectivity and that core tables exist.
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.local (or env).
 *
 * Usage: npx tsx scripts/verify-supabase.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const vars: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return vars;
}

const envLocal = loadEnvLocal();
const url = process.env.VITE_SUPABASE_URL ?? envLocal.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? envLocal.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

const TABLES = [
  "profiles",
  "cnf_projects",
  "support_activities",
  "notifications",
  "audit_logs",
  "registry",
  "admin_messages",
] as const;

async function main() {
  console.log(`Supabase URL: ${url}`);
  let ok = true;

  for (const table of TABLES) {
    const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.error(`  FAIL  ${table}: ${error.message}`);
      ok = false;
    } else {
      console.log(`  OK    ${table}`);
    }
  }

  if (!ok) {
    console.error("\nSome tables are missing or unreachable. Run migrations in Supabase SQL editor:");
    console.error("  supabase/migrations/001_initial_schema.sql");
    console.error("  supabase/migrations/002_rls_policies.sql");
    process.exit(1);
  }

  console.log("\nAll core tables reachable.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
