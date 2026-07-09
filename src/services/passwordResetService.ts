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

export interface AdminPasswordResetResult {
  emailed: boolean;
  email: string | null;
  temporaryPassword: string | null;
  warning?: string;
}

export async function adminCompletePasswordReset(userId: string): Promise<AdminPasswordResetResult> {
  const { data, error } = await supabase.functions.invoke("admin-approve-password-reset", {
    body: { userId },
  });

  const payload = (data ?? {}) as {
    ok?: boolean;
    emailed?: boolean;
    email?: string;
    temporaryPassword?: string;
    error?: string;
  };

  if (error) {
    let detail = error.message || "Failed to approve password reset.";
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === "function") {
      try {
        const body = (await context.json()) as { error?: string; temporaryPassword?: string; emailed?: boolean; email?: string };
        if (body.temporaryPassword) {
          return {
            emailed: false,
            email: body.email ?? null,
            temporaryPassword: body.temporaryPassword,
            warning: body.error || "Temporary password was issued, but email delivery failed.",
          };
        }
        if (body.error) detail = body.error;
      } catch {
        // Keep the original Functions error message.
      }
    }
    throw new Error(detail);
  }

  if (payload.error && !payload.temporaryPassword) {
    throw new Error(payload.error);
  }

  if (payload.emailed) {
    return {
      emailed: true,
      email: payload.email ?? null,
      temporaryPassword: null,
    };
  }

  if (payload.temporaryPassword) {
    return {
      emailed: false,
      email: payload.email ?? null,
      temporaryPassword: payload.temporaryPassword,
      warning: payload.error || "Temporary password was issued, but email delivery failed.",
    };
  }

  throw new Error(payload.error || "Password reset did not complete.");
}

export async function clearMustChangePassword(): Promise<void> {
  const { error } = await supabase.rpc("clear_must_change_password");
  if (error) throw error;
}
