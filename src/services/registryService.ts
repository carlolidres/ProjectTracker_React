import { DEFAULT_REGISTRY } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";
import { logAuditEntries } from "@/services/auditService";
import type { RegistryEntry } from "@/types";

export async function getRegistryBundle(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase.from("registry").select("*").eq("status", "Active");
  if (error) throw error;

  const bundle: Record<string, string[]> = {};
  for (const key of Object.keys(DEFAULT_REGISTRY)) {
    bundle[key] = [];
  }

  for (const row of (data ?? []) as RegistryEntry[]) {
    if (!bundle[row.registry_type]) bundle[row.registry_type] = [];
    bundle[row.registry_type].push(row.registry_value);
  }

  for (const key of Object.keys(DEFAULT_REGISTRY)) {
    if (!bundle[key].length) bundle[key] = [...DEFAULT_REGISTRY[key]];
  }

  return bundle;
}

export async function listRegistryEntries(): Promise<RegistryEntry[]> {
  const { data, error } = await supabase.from("registry").select("*").order("registry_type");
  if (error) throw error;
  return (data ?? []) as RegistryEntry[];
}

export async function saveRegistryValue(
  type: string,
  value: string,
  description: string,
  userEmail: string,
) {
  const { data: existing } = await supabase
    .from("registry")
    .select("*")
    .eq("registry_type", type)
    .eq("registry_value", value)
    .maybeSingle();

  if (existing) throw new Error("Registry value already exists.");

  const now = new Date().toISOString();
  const row = {
    registry_type: type,
    registry_value: value,
    description: description || value,
    status: "Active",
    created_by: userEmail,
    created_at: now,
    updated_by: userEmail,
    updated_at: now,
  };

  const { error } = await supabase.from("registry").insert(row);
  if (error) throw error;

  await logAuditEntries("Registry", "CREATE", `${type}:${value}`, "N/A", {}, row, "Registry value added", userEmail);
}
