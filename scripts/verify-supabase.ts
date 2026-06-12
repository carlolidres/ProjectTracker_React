/**
 * Verifies Supabase connectivity and that core tables exist.
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.local (or env).
 *
 * Uses the anon key without a session. RLS blocks unauthenticated SELECT on most
 * tables, so we distinguish:
 *   - PGRST205 / "schema cache" → table missing (migration not applied)
 *   - 401 on table routes → invalid URL or anon key
 *   - permission / 42501 / empty rows with no error → table exists; RLS blocks anon (expected)
 *
 * Note: GET /rest/v1/ (OpenAPI root) requires service_role and must not be used
 * to validate the anon key.
 *
 * Optional: set VERIFY_SUPABASE_EMAIL + VERIFY_SUPABASE_PASSWORD in .env.local
 * to run authenticated read checks (matches production app behavior).
 *
 * Usage: npx tsx scripts/verify-supabase.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type PostgrestError } from "@supabase/supabase-js";

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

function formatError(error: PostgrestError | null): string {
  if (!error) return "(no error object)";
  const parts = [
    error.message,
    error.code ? `code=${error.code}` : "",
    error.details ? `details=${error.details}` : "",
    error.hint ? `hint=${error.hint}` : "",
  ].filter(Boolean);
  return parts.join(" | ") || JSON.stringify(error);
}

const envLocal = loadEnvLocal();
const url = process.env.VITE_SUPABASE_URL ?? envLocal.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? envLocal.VITE_SUPABASE_ANON_KEY;
const verifyEmail = process.env.VERIFY_SUPABASE_EMAIL ?? envLocal.VERIFY_SUPABASE_EMAIL;
const verifyPassword = process.env.VERIFY_SUPABASE_PASSWORD ?? envLocal.VERIFY_SUPABASE_PASSWORD;

if (!url || !anonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

// Validate project ref matches anon JWT payload when using legacy JWT keys
if (anonKey.startsWith("eyJ")) {
  try {
    const payload = JSON.parse(Buffer.from(anonKey.split(".")[1]!, "base64url").toString("utf8")) as {
      ref?: string;
    };
    const urlRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (payload.ref && urlRef && payload.ref !== urlRef) {
      console.error(
        `VITE_SUPABASE_URL project ref (${urlRef}) does not match anon key ref (${payload.ref}).`,
      );
      console.error("Copy matching URL and anon key from Supabase Dashboard → Project Settings → API.");
      process.exit(1);
    }
  } catch {
    // Non-fatal if JWT parse fails (e.g. publishable key format)
  }
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

function isMissingTable(error: PostgrestError | null): boolean {
  if (!error) return false;
  const text = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (
    error.code === "PGRST205" ||
    text.includes("schema cache") ||
    text.includes("could not find the table") ||
    (text.includes("relation") && text.includes("does not exist"))
  );
}

function isAuthError(error: PostgrestError | null): boolean {
  if (!error) return false;
  const text = `${error.message ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    text.includes("invalid api key") ||
    text.includes("jwt") ||
    text.includes("invalid authentication") ||
    (text.includes("unauthorized") && !text.includes("row-level security"))
  );
}

function isRlsBlock(error: PostgrestError | null): boolean {
  if (!error) return false;
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return (
    text.includes("permission denied") ||
    error.code === "42501" ||
    text.includes("row-level security")
  );
}

async function checkTables(label: string): Promise<{ ok: boolean; missing: string[]; blocked: string[]; failed: string[] }> {
  const missing: string[] = [];
  const blocked: string[] = [];
  const failed: string[] = [];

  for (const table of TABLES) {
    const { error, status } = await supabase.from(table).select("*").limit(1);

    if (!error && (status === 200 || status === 206 || status == null)) {
      console.log(`  PASS  ${table} (${label})`);
      continue;
    }

    const detail = formatError(error) + (status != null ? ` | http=${status}` : "");
    if (isMissingTable(error)) {
      console.error(`  FAIL  ${table}: missing — ${detail}`);
      missing.push(table);
    } else if (isAuthError(error)) {
      console.error(`  FAIL  ${table}: auth — ${detail}`);
      failed.push(table);
    } else if (isRlsBlock(error)) {
      console.log(`  PASS  ${table} (exists; RLS blocks unauthenticated read)`);
      blocked.push(table);
    } else if (!error.message && !error.code) {
      console.error(`  FAIL  ${table}: unreachable — ${detail}`);
      failed.push(table);
    } else {
      console.error(`  FAIL  ${table}: ${detail}`);
      failed.push(table);
    }
  }

  const ok = missing.length === 0 && failed.length === 0;
  return { ok, missing, blocked, failed };
}

async function main() {
  console.log(`Supabase URL: ${url}`);

  // Auth health check (accepts anon key; does not require service_role)
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
    });
    console.log(`Auth health: ${res.status} ${res.statusText}`);
    if (res.status === 401) {
      const body = await res.text();
      console.error(`Invalid Supabase anon key or project URL. ${body.slice(0, 120)}`);
      process.exit(1);
    }
  } catch (err) {
    console.error("Network error reaching Supabase:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log("\nPhase 1 — anon key (table existence / RLS probe):");
  const anonResult = await checkTables("anon");

  if (anonResult.missing.length > 0) {
    console.error("\nMissing tables detected. Apply migrations in Supabase SQL editor (in order):");
    console.error("  supabase/migrations/001_initial_schema.sql");
    console.error("  supabase/migrations/002_rls_policies.sql");
    process.exit(1);
  }

  if (anonResult.failed.length > 0) {
    console.error("\nConnectivity or credential errors. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    process.exit(1);
  }

  if (verifyEmail && verifyPassword) {
    console.log("\nPhase 2 — authenticated read check:");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: verifyEmail,
      password: verifyPassword,
    });
    if (signInError) {
      console.error(`  FAIL  sign-in: ${signInError.message}`);
      process.exit(1);
    }
    const authResult = await checkTables("authenticated");
    await supabase.auth.signOut();
    if (!authResult.ok) {
      console.error("\nAuthenticated reads failed. Review RLS policies in 002_rls_policies.sql.");
      process.exit(1);
    }
  } else {
    console.log(
      "\nPhase 2 — skipped (set VERIFY_SUPABASE_EMAIL / VERIFY_SUPABASE_PASSWORD in .env.local for authenticated checks)",
    );
  }

  console.log("\nAll core tables verified.");
  if (anonResult.blocked.length > 0) {
    console.log(`  ${anonResult.blocked.length} table(s) confirmed via successful anon probe (RLS may restrict reads in app).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
