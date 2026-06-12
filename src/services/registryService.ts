import { DEFAULT_REGISTRY } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";
import { logAuditTrail } from "@/services/auditService";
import type { RegistryEntry } from "@/types";

function normalizeRegistryValue(value: string): string {
  return value.trim();
}

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
  const { data, error } = await supabase
    .from("registry")
    .select("*")
    .order("registry_type")
    .order("registry_value");
  if (error) throw error;
  return (data ?? []) as RegistryEntry[];
}

async function findRegistryDuplicate(type: string, value: string): Promise<RegistryEntry | null> {
  const { data, error } = await supabase
    .from("registry")
    .select("*")
    .eq("registry_type", type);
  if (error) throw error;

  const normalized = normalizeRegistryValue(value).toLowerCase();
  const match = ((data ?? []) as RegistryEntry[]).find(
    (row) => normalizeRegistryValue(row.registry_value).toLowerCase() === normalized,
  );
  return match ?? null;
}

export async function saveRegistryValue(
  type: string,
  value: string,
  description: string,
  userEmail: string,
) {
  const registryType = type.trim();
  const registryValue = normalizeRegistryValue(value);
  if (!registryType || !registryValue) {
    throw new Error("Registry type and value are required.");
  }

  const duplicate = await findRegistryDuplicate(registryType, registryValue);
  if (duplicate) {
    throw new Error(`"${registryValue}" already exists in ${registryType}.`);
  }

  const now = new Date().toISOString();
  const row = {
    registry_type: registryType,
    registry_value: registryValue,
    description: description.trim() || registryValue,
    status: "Active",
    created_by: userEmail,
    created_at: now,
    updated_by: userEmail,
    updated_at: now,
  };

  const { error } = await supabase.from("registry").insert(row);
  if (error) throw error;

  await logAuditTrail({
    module: "Registry",
    action: "CREATE",
    recordId: `${registryType}:${registryValue}`,
    projectId: "N/A",
    fieldName: "ALL",
    oldValue: "",
    newValue: `Type: ${registryType}. Value: ${registryValue}.`,
    remarks: "Registry value added",
    userEmail,
  });
}

export async function setRegistryStatus(
  entry: RegistryEntry,
  status: "Active" | "Inactive",
  userEmail: string,
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("registry")
    .update({
      status,
      updated_by: userEmail,
      updated_at: now,
    })
    .eq("id", entry.id);
  if (error) throw error;

  const remarks = status === "Active" ? "Registry value reactivated" : "Registry value deactivated";
  await logAuditTrail({
    module: "Registry",
    action: "UPDATE",
    recordId: `${entry.registry_type}:${entry.registry_value}`,
    projectId: "N/A",
    fieldName: "status",
    oldValue: entry.status,
    newValue: status,
    remarks,
    userEmail,
  });
}
