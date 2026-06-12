import { supabase } from "@/lib/supabaseClient";

export interface PasswordResetRequest {
  id: string;
  user_id: string;
  email: string;
  request_status: "pending" | "completed" | "rejected";
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.rpc("request_password_reset", {
    request_email: email.trim(),
  });
  if (error) throw error;
}

export async function listPendingPasswordResetRequests(): Promise<PasswordResetRequest[]> {
  const { data, error } = await supabase
    .from("password_reset_requests")
    .select("*")
    .eq("request_status", "pending")
    .order("requested_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PasswordResetRequest[];
}

export async function adminCompletePasswordReset(userId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_complete_password_reset", {
    target_user_id: userId,
  });
  if (error) throw error;
}
