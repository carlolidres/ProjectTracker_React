import { supabase } from "@/lib/supabaseClient";
import { mapDbToReusableOption } from "@/lib/endorsementMappers";
import { formatServiceError } from "@/lib/utils";
import type { ReusableOption } from "@/types/endorsementTracker";

function optionKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function listReusableOptions(category: string): Promise<ReusableOption[]> {
  const { data, error } = await supabase
    .from("reusable_options")
    .select("*")
    .eq("category", category)
    .eq("is_active", true)
    .order("option_value");
  if (error) throw error;
  return (data ?? []).map((row) => mapDbToReusableOption(row as Record<string, unknown>));
}

export async function createReusableOption(
  category: string,
  value: string,
  userEmail: string,
): Promise<ReusableOption> {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.toUpperCase() === "N/A" || trimmed.toUpperCase() === "NA") {
    throw new Error("Option value is required.");
  }
  const key = optionKey(trimmed);

  const { data: existing } = await supabase
    .from("reusable_options")
    .select("*")
    .eq("category", category)
    .eq("option_value_key", key)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) {
    return mapDbToReusableOption(existing as Record<string, unknown>);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("reusable_options")
    .insert({
      category,
      option_value: trimmed,
      option_value_key: key,
      is_active: true,
      created_by: userEmail,
      updated_by: userEmail,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      const { data: raced } = await supabase
        .from("reusable_options")
        .select("*")
        .eq("category", category)
        .eq("option_value_key", key)
        .eq("is_active", true)
        .maybeSingle();
      if (raced) return mapDbToReusableOption(raced as Record<string, unknown>);
    }
    throw new Error(formatServiceError(error, "Failed to save option."));
  }

  return mapDbToReusableOption(data as Record<string, unknown>);
}

/** Soft-remove option. Does not rewrite historical records that still use the value. */
export async function softRemoveReusableOption(
  optionId: string,
  userEmail: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("reusable_options")
    .update({ is_active: false, updated_by: userEmail, updated_at: now })
    .eq("option_id", optionId);
  if (error) throw new Error(formatServiceError(error, "Failed to remove option."));
}
