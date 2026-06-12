import { supabase } from "@/lib/supabaseClient";
import type { Profile, UserRole } from "@/types";

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
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
  return data as Profile | null;
}

export async function updateProfileRole(userId: string, role: UserRole) {
  return supabase.from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", userId);
}

export async function listProfiles() {
  return supabase.from("profiles").select("*").order("email");
}
