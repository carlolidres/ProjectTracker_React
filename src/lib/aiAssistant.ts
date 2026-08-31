import type {
  AiAssistantContext,
  AiConversation,
  AiVerifiedSource,
} from "@/types";
export {
  APPLICATION_GUIDE,
  detectAssistantIntent,
  extractRecordIds,
  formatAssistantReply,
  planAssistantQuery,
} from "../../supabase/functions/ai-assistant-chat/plan";
export type { AiRetrievalPlan } from "../../supabase/functions/ai-assistant-chat/plan";

export const AI_INSUFFICIENT =
  "I could not find sufficient information in the application to answer this question.";

export const AI_OUT_OF_SCOPE =
  "I can answer only from project information available to you in this application.";

export const AI_PERMISSION =
  "You do not have permission to access that information.";

export const AI_STARTER_PROMPTS = [
  "What projects are currently under execution?",
  "Which of my tasks are overdue?",
  "Which projects do not have an approved protocol?",
  "What activities are blocking project completion?",
  "Which projects are ready for Report/Endorsement?",
  "Summarize the latest updates to my projects.",
] as const;

const INJECTION_PATTERN =
  /ignore (all |any )?(previous|prior|above) instructions|you are now|system prompt|reveal (your )?(system|hidden) prompt/gi;


export function parseAssistantContext(search: string): AiAssistantContext | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const projectId = params.get("projectId")?.trim();
  if (projectId) return { type: "project", id: projectId };
  const activityId = params.get("activityId")?.trim();
  if (activityId) return { type: "support", id: activityId };
  const taskId = params.get("taskId")?.trim();
  if (taskId) return { type: "task", id: taskId };
  return null;
}

export function assistantContextPath(context: AiAssistantContext): string {
  if (context.type === "project") return `/ai-assistant?projectId=${encodeURIComponent(context.id)}`;
  if (context.type === "support") return `/ai-assistant?activityId=${encodeURIComponent(context.id)}`;
  return `/ai-assistant?taskId=${encodeURIComponent(context.id)}`;
}

export function verifiedProjectPath(projectId: string): string {
  return `/projects?projectId=${encodeURIComponent(projectId)}`;
}

export function verifiedSupportPath(activityId: string): string {
  return `/support-activities?activityId=${encodeURIComponent(activityId)}`;
}

export function verifiedTaskPath(sourceId: string): string {
  return `/project-management?sourceId=${encodeURIComponent(sourceId)}`;
}

export function titleFromQuestion(question: string): string {
  const cleaned = question.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New chat";
  return cleaned.length > 56 ? `${cleaned.slice(0, 56).trim()}…` : cleaned;
}

export function stripPromptInjection(text: string): string {
  return text.replace(INJECTION_PATTERN, "[ignored instruction]");
}

export function sanitizeAssistantText(text: string): string {
  return stripPromptInjection(String(text ?? ""))
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/data:/gi, "")
    .trim();
}

export function filterCitedSources(
  retrieved: AiVerifiedSource[],
  citedIds: string[],
): AiVerifiedSource[] {
  const allowed = new Map(retrieved.map((row) => [row.id, row]));
  const seen = new Set<string>();
  const next: AiVerifiedSource[] = [];
  for (const raw of citedIds) {
    const id = String(raw ?? "").trim();
    if (!id || seen.has(id)) continue;
    const match = allowed.get(id);
    if (!match) continue;
    seen.add(id);
    next.push(match);
  }
  return next;
}

export function isVerifiedInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}

export function stripUnverifiedMarkdownLinks(answer: string, sources: AiVerifiedSource[]): string {
  const allowed = new Set(sources.map((row) => row.path));
  return answer.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_full, label: string, href: string) => {
    const path = href.replace(/^#/, "").trim();
    if (allowed.has(path) || allowed.has(href.trim())) return `[${label}](${path.startsWith("/") ? path : href})`;
    return label;
  });
}

export function groupConversationsByDate(rows: AiConversation[], now = new Date()): Record<string, AiConversation[]> {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(startOfToday);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const groups: Record<string, AiConversation[]> = { Today: [], "Previous 7 Days": [], Older: [] };
  for (const row of rows) {
    const stamp = new Date(row.updatedAt);
    if (stamp >= startOfToday) groups.Today.push(row);
    else if (stamp >= weekAgo) groups["Previous 7 Days"].push(row);
    else groups.Older.push(row);
  }
  return groups;
}

export function isOutsideApplicationScope(question: string): boolean {
  const text = question.toLowerCase();
  return (
    /\b(weather|stock market|recipe|who won the|capital of|write a poem)\b/.test(text)
    || /\bchatgpt\b/.test(text)
  );
}
