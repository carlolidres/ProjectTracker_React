/**
 * Authenticated smoke test for Project Tracker Supabase operations.
 * Usage: npx tsx scripts/smoke-test-supabase.ts
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

const env = loadEnvLocal();
const url = process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;
const email = process.env.VERIFY_SUPABASE_EMAIL ?? env.VERIFY_SUPABASE_EMAIL;
const password = process.env.VERIFY_SUPABASE_PASSWORD ?? env.VERIFY_SUPABASE_PASSWORD;

if (!url || !anonKey || !email || !password) {
  console.error("Missing env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VERIFY_SUPABASE_EMAIL, VERIFY_SUPABASE_PASSWORD");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function check(label: string, fn: () => Promise<{ error: { message: string; code?: string } | null }>) {
  const { error } = await fn();
  if (error) {
    console.log(`  FAIL  ${label}: ${error.message}${error.code ? ` (${error.code})` : ""}`);
    return false;
  }
  console.log(`  PASS  ${label}`);
  return true;
}

async function main() {
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error(`Sign-in failed: ${signInError.message}`);
    process.exit(1);
  }

  const { data: userData } = await supabase.auth.getUser();
  console.log(`Signed in as ${userData.user?.email}`);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status, email")
    .eq("id", userData.user!.id)
    .maybeSingle();
  if (profileError) {
    console.error(`Profile read failed: ${profileError.message}`);
  } else {
    console.log(`Profile role=${profile?.role} status=${profile?.status}`);
  }

  await check("read cnf_projects", () => supabase.from("cnf_projects").select("record_id").limit(1));
  await check("read notifications", () => supabase.from("notifications").select("notification_id").limit(1));
  await check("read registry", () => supabase.from("registry").select("id").limit(1));

  const testId = `SMK-${Date.now()}`;
  const inserted = await check("insert cnf_projects", () =>
    supabase.from("cnf_projects").insert({
      record_id: testId,
      project_id: testId,
      project_owner: "Smoke Test",
      is_active: true,
    }),
  );

  if (inserted) {
    await check("insert audit_logs", () =>
      supabase.from("audit_logs").insert({
        user_email: userData.user!.email ?? email,
        module: "Smoke Test",
        action: "CREATE",
        record_id: testId,
        project_id: testId,
        field_name: "smoke",
        old_value: "",
        new_value: "ok",
      }),
    );

    await check("insert notifications", () =>
      supabase.from("notifications").insert({
        notification_id: `NTF-${Date.now()}`,
        project_id: testId,
        record_id: testId,
        fg_month: "N/A",
        severity: "medium",
        title: "Smoke test",
        message: "Automated smoke test notification",
        status: "OPEN",
      }),
    );

    await check("delete cnf_projects smoke row", () =>
      supabase.from("cnf_projects").delete().eq("record_id", testId),
    );
  }

  await check("read audit_logs", () => supabase.from("audit_logs").select("audit_id").limit(1));

  await supabase.auth.signOut();
  console.log("\nSmoke test complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
