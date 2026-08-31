import { supabase } from "@/lib/supabaseClient";
import type {
  AiAssistantContext,
  AiConversation,
  AiMessage,
  AiVerifiedSource,
} from "@/types";

function mapConversation(row: Record<string, unknown>): AiConversation {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title ?? "New chat"),
    contextType: (row.context_type as AiConversation["contextType"]) ?? null,
    contextId: row.context_id ? String(row.context_id) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapMessage(row: Record<string, unknown>): AiMessage {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    role: row.role === "assistant" || row.role === "error" ? row.role : "user",
    content: String(row.content ?? ""),
    sources: Array.isArray(row.sources) ? (row.sources as AiVerifiedSource[]) : [],
    followUps: Array.isArray(row.follow_ups) ? row.follow_ups.map((value) => String(value)) : [],
    createdAt: String(row.created_at ?? ""),
  };
}

export async function listAiConversations(): Promise<AiConversation[]> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(80);
  if (error) throw error;
  return (data ?? []).map((row) => mapConversation(row as Record<string, unknown>));
}

export async function listAiMessages(conversationId: string): Promise<AiMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapMessage(row as Record<string, unknown>));
}

export async function createAiConversation(
  userId: string,
  context: AiAssistantContext | null,
): Promise<AiConversation> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: userId,
      title: "New chat",
      context_type: context?.type ?? null,
      context_id: context?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapConversation(data as Record<string, unknown>);
}

export async function renameAiConversation(id: string, title: string): Promise<void> {
  const { error } = await supabase.from("ai_conversations").update({ title: title.trim() || "New chat" }).eq("id", id);
  if (error) throw error;
}

export async function deleteAiConversation(id: string): Promise<void> {
  const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
  if (error) throw error;
}

export async function clearAiConversations(): Promise<void> {
  const { error } = await supabase.from("ai_conversations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;
}

export async function insertAiMessage(input: {
  conversationId: string;
  role: AiMessage["role"];
  content: string;
  sources?: AiVerifiedSource[];
  followUps?: string[];
}): Promise<AiMessage> {
  const { data, error } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      sources: input.sources ?? [],
      follow_ups: input.followUps ?? [],
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapMessage(data as Record<string, unknown>);
}

export async function askAiAssistant(input: {
  conversationId: string;
  question: string;
  context: AiAssistantContext | null;
}): Promise<{ answer: string; sources: AiVerifiedSource[]; followUps: string[] }> {
  const { data, error } = await supabase.functions.invoke("ai-assistant-chat", {
    body: {
      conversationId: input.conversationId,
      question: input.question,
      context: input.context,
    },
  });
  if (error) throw new Error("The assistant could not complete this request. Try again.");
  const payload = (data ?? {}) as {
    answer?: string;
    sources?: AiVerifiedSource[];
    followUps?: string[];
    error?: string;
  };
  if (payload.error) throw new Error(payload.error);
  return {
    answer: String(payload.answer ?? ""),
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    followUps: Array.isArray(payload.followUps) ? payload.followUps : [],
  };
}
