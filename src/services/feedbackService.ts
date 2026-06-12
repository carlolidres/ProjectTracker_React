import { supabase } from "@/lib/supabaseClient";

export type FeedbackType = "improvement" | "bug";

export interface AppFeedback {
  id: string;
  user_id: string;
  user_email: string;
  feedback_type: FeedbackType;
  message: string;
  page_path: string | null;
  created_at: string;
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

export async function listAppFeedback(): Promise<AppFeedback[]> {
  const { data, error } = await supabase
    .from("app_feedback")
    .select("id, user_id, user_email, feedback_type, message, page_path, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AppFeedback[];
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
