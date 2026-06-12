import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { UserRole } from "../src/types/user";

function loadEnvLocal(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    values[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
  }
  return values;
}

const localEnv = loadEnvLocal();
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? localEnv.VITE_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? localEnv.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.VERIFY_SUPABASE_EMAIL ?? localEnv.VERIFY_SUPABASE_EMAIL;
const adminPassword =
  process.env.VERIFY_SUPABASE_PASSWORD ?? localEnv.VERIFY_SUPABASE_PASSWORD;
const dummyPassword =
  process.env.DUMMY_USER_PASSWORD ?? localEnv.DUMMY_USER_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !adminEmail || !adminPassword || !dummyPassword) {
  console.error(
    "Missing VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VERIFY_SUPABASE_EMAIL, " +
      "VERIFY_SUPABASE_PASSWORD, or DUMMY_USER_PASSWORD.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SeedUser {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

const roleUsers: SeedUser[] = [
  {
    email: adminEmail,
    password: adminPassword,
    fullName: "Project Tracker Admin",
    role: "admin",
  },
  ...(["am_bm_pl", "pp", "tsd", "val", "qc", "view"] as UserRole[]).map(
    (role) => ({
      email: `project-tracker.${role}@example.test`,
      password: dummyPassword,
      fullName: `Dummy ${role.toUpperCase()}`,
      role,
    }),
  ),
];

async function findUserId(email: string): Promise<string | null> {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 100) return null;
    page += 1;
  }
}

async function seedUser(user: SeedUser) {
  let userId = await findUserId(user.email);

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.fullName,
        requested_role: user.role,
      },
    });
    if (error) throw error;
    userId = data.user.id;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.fullName,
        requested_role: user.role,
      },
    });
    if (error) throw error;
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    requested_role: user.role,
    status: "active",
    approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;

  console.log(`  READY  ${user.email} (${user.role})`);
}

async function main() {
  console.log("Seeding Project Tracker authentication users:");
  for (const user of roleUsers) {
    await seedUser(user);
  }
  console.log("\nAuthentication seed complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
