import { supabase } from "@/lib/supabaseClient";

export type FeedbackType = "improvement" | "bug";

export type FeedbackStatus = "addressed" | "not_addressed";

export interface AppFeedback {
  id: string;
  user_id: string;
  user_email: string;
  feedback_type: FeedbackType;
  message: string;
  page_path: string | null;
  status: FeedbackStatus;
  addressed_at: string | null;
  not_accepted_at: string | null;
  created_at: string;
}

const FEEDBACK_STATUS_TTL_HOURS = 72;

export async function purgeExpiredAddressedFeedback(): Promise<number> {
  const { data, error } = await supabase.rpc("purge_expired_addressed_feedback");
  if (error) throw error;
  return typeof data === "number" ? data : 0;
}

export function formatFeedbackForCopy(item: AppFeedback): string {
  const typeLabel = item.feedback_type === "bug" ? "Bug report" : "Improvement idea";
  return [
    `Feedback Type: ${typeLabel}`,
    `From: ${item.user_email}`,
    `Submitted: ${item.created_at}`,
    item.page_path ? `Page: ${item.page_path}` : null,
    "",
    "Message:",
    item.message,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export async function listAppFeedback(options?: { purgeExpired?: boolean }): Promise<AppFeedback[]> {
  if (options?.purgeExpired) {
    try {
      await purgeExpiredAddressedFeedback();
    } catch {
      // Migration 024/028 may not be applied yet; listing still works without purge.
    }
  }

  const { data, error } = await supabase
    .from("app_feedback")
    .select("id, user_id, user_email, feedback_type, message, page_path, status, addressed_at, not_accepted_at, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AppFeedback[];
}

export function feedbackStatusExpiryLabel(resolvedAt: string | null | undefined): string | null {
  if (!resolvedAt) return null;
  const expiresAt = new Date(resolvedAt).getTime() + FEEDBACK_STATUS_TTL_HOURS * 60 * 60 * 1000;
  const remainingMs = expiresAt - Date.now();
  if (remainingMs <= 0) return "Scheduled for removal";
  const hoursLeft = Math.ceil(remainingMs / (60 * 60 * 1000));
  return hoursLeft <= 24
    ? `Auto-deletes in ${hoursLeft}h`
    : `Auto-deletes in ${Math.ceil(hoursLeft / 24)}d`;
}

/** @deprecated Use feedbackStatusExpiryLabel */
export function feedbackAddressedExpiryLabel(addressedAt: string | null | undefined): string | null {
  return feedbackStatusExpiryLabel(addressedAt);
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
  const patch: { status: FeedbackStatus; not_accepted_at?: string | null } = { status };
  if (status === "not_addressed") {
    patch.not_accepted_at = new Date().toISOString();
  } else {
    patch.not_accepted_at = null;
  }
  const { error } = await supabase.from("app_feedback").update(patch).eq("id", id);
  if (error) throw error;
}

export async function submitAppFeedback(params: {
  feedbackType: FeedbackType;
  message: string;
  userId: string;
  userEmail: string;
  pagePath?: string;
  isAdmin?: boolean;
}) {
  if (params.isAdmin) {
    throw new Error("Administrators cannot submit feedback to themselves. Use this inbox to review user messages.");
  }

  const trimmed = params.message.trim();
  if (!trimmed) {
    throw new Error("Please enter your feedback before submitting.");
  }

  const { error } = await supabase.from("app_feedback").insert({
    user_id: params.userId,
    user_email: params.userEmail,
    feedback_type: params.feedbackType,
    message: trimmed,
    page_path: params.pagePath ?? null,
  });

  if (error) throw error;
}
