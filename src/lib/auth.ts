import { normalizeProfile } from "@/lib/roleMapping";
import { clearAppSessionState } from "@/lib/sessionCleanup";
import { supabase } from "@/lib/supabaseClient";
import type { Profile, UserRole } from "@/types";

export async function signIn(email: string, password: string) {
  await supabase.auth.signOut({ scope: "global" }).catch(() => undefined);
  clearAppSessionState();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(input: {
  email: string;
  password: string;
  fullName: string;
  requestedRole: UserRole;
}) {
  return supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        requested_role: input.requestedRole,
      },
    },
  });
}

export async function signOut() {
  const result = await supabase.auth.signOut({ scope: "global" });
  clearAppSessionState();
  return result;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeProfile(data as Profile);
}

export async function updateProfileAccess(
  userId: string,
  role: UserRole,
  status: Profile["status"],
) {
  const { data, error } = await supabase.rpc("admin_update_user_access", {
    target_user_id: userId,
    next_role: role,
    next_status: status,
  });
  if (error) throw error;
  return normalizeProfile(data as Profile);
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []).map((profile) => normalizeProfile(profile as Profile));
}
