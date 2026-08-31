export type AiAssistantContextType = "project" | "support" | "task";

export type AiAssistantIntent =
  | "overdue_tasks"
  | "pending_protocol"
  | "ready_report"
  | "blocking"
  | "execution"
  | "project_status"
  | "assigned_tasks"
  | "comments_updates"
  | "document_summary"
  | "general";

export interface AiAssistantContext {
  type: AiAssistantContextType;
  id: string;
}

export interface AiVerifiedSource {
  id: string;
  recordType: "project" | "support" | "task";
  title: string;
  status: string;
  date: string;
  path: string;
}

export interface AiConversation {
  id: string;
  userId: string;
  title: string;
  contextType: AiAssistantContextType | null;
  contextId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "error";
  content: string;
  sources: AiVerifiedSource[];
  followUps: string[];
  createdAt: string;
}
