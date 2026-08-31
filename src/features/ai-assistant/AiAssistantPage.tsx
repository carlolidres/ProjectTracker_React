import { CommentOutlined } from "@ant-design/icons";
import {
  Button,
  Drawer,
  Input,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LucideIcon } from "@/components/common/lucide-icon";
import {
  AI_STARTER_PROMPTS,
  assistantContextPath,
  groupConversationsByDate,
  isVerifiedInternalPath,
  parseAssistantContext,
  sanitizeAssistantText,
  stripUnverifiedMarkdownLinks,
  titleFromQuestion,
} from "@/lib/aiAssistant";
import {
  askAiAssistant,
  clearAiConversations,
  createAiConversation,
  deleteAiConversation,
  insertAiMessage,
  listAiConversations,
  listAiMessages,
  renameAiConversation,
} from "@/services/aiAssistantService";
import type { AiAssistantContext, AiConversation, AiMessage } from "@/types";

export function AiAssistantPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const context = useMemo(() => parseAssistantContext(params.toString()), [params]);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      setConversations(await listAiConversations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    void listAiMessages(activeId).then(setMessages).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    });
  }, [activeId]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const visibleConversations = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = needle
      ? conversations.filter((row) => row.title.toLowerCase().includes(needle))
      : conversations;
    return groupConversationsByDate(rows);
  }, [conversations, search]);

  const startNewChat = async () => {
    if (!user?.id) return;
    const created = await createAiConversation(user.id, context);
    setConversations((current) => [created, ...current]);
    setActiveId(created.id);
    setMessages([]);
    setMobileOpen(false);
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || sending || !user?.id) return;
    setSending(true);
    setError(null);
    try {
      let conversationId = activeId;
      if (!conversationId) {
        const created = await createAiConversation(user.id, context);
        conversationId = created.id;
        setConversations((current) => [created, ...current]);
        setActiveId(created.id);
      }
      const last = messages[messages.length - 1];
      if (!(last?.role === "user" && last.content === question && last.conversationId === conversationId)) {
        const userMessage = await insertAiMessage({
          conversationId,
          role: "user",
          content: question,
        });
        setMessages((current) => [...current, userMessage]);
      }
      setDraft("");
      const result = await askAiAssistant({ conversationId, question, context });
      const sources = (result.sources ?? []).filter((row) => isVerifiedInternalPath(row.path));
      const assistant = await insertAiMessage({
        conversationId,
        role: "assistant",
        content: stripUnverifiedMarkdownLinks(sanitizeAssistantText(result.answer), sources),
        sources,
        followUps: result.followUps,
      });
      setMessages((current) => [...current, assistant]);
      setConversations((current) =>
        current.map((row) =>
          row.id === conversationId
            ? { ...row, title: row.title === "New chat" ? titleFromQuestion(question) : row.title, updatedAt: new Date().toISOString() }
            : row,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "The assistant could not complete this request. Try again.";
      setError(message);
    } finally {
      setSending(false);
    }
  };

  const retryLast = () => {
    const lastUser = [...messages].reverse().find((row) => row.role === "user");
    if (lastUser) void send(lastUser.content);
  };

  const sidebar = (
    <div className="ai-sidebar">
      <div className="ai-sidebar-head">
        <Button type="primary" icon={<LucideIcon name="plus" size={14} />} block onClick={() => void startNewChat()}>
          New chat
        </Button>
        <Input
          allowClear
          placeholder="Search chats"
          aria-label="Search conversations"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="ai-sidebar-list">
        {loadingList ? <Spin /> : null}
        {Object.entries(visibleConversations).map(([label, rows]) =>
          rows.length === 0 ? null : (
            <section key={label}>
              <h3 className="ai-sidebar-group">{label}</h3>
              {rows.map((row) => (
                <div key={row.id} className={`ai-sidebar-item${row.id === activeId ? " is-active" : ""}`}>
                  <button type="button" onClick={() => { setActiveId(row.id); setMobileOpen(false); }}>
                    {row.title}
                  </button>
                  <Space size={4}>
                    <Button
                      size="small"
                      type="text"
                      aria-label="Rename conversation"
                      onClick={() => {
                        const next = window.prompt("Rename conversation", row.title);
                        if (!next) return;
                        void renameAiConversation(row.id, next).then(() =>
                          setConversations((current) =>
                            current.map((item) => (item.id === row.id ? { ...item, title: next.trim() } : item)),
                          ),
                        );
                      }}
                    >
                      Rename
                    </Button>
                    <Popconfirm title="Delete this conversation?" onConfirm={() => {
                      void deleteAiConversation(row.id).then(() => {
                        setConversations((current) => current.filter((item) => item.id !== row.id));
                        if (activeId === row.id) setActiveId(null);
                      });
                    }}>
                      <Button size="small" type="text" danger aria-label="Delete conversation">Delete</Button>
                    </Popconfirm>
                  </Space>
                </div>
              ))}
            </section>
          ),
        )}
      </div>
      <Popconfirm title="Delete all of your conversations?" onConfirm={() => {
        void clearAiConversations().then(() => {
          setConversations([]);
          setActiveId(null);
          setMessages([]);
        });
      }}>
        <Button block>Clear all</Button>
      </Popconfirm>
    </div>
  );

  return (
    <AppShell>
      <div className="ai-assistant-page">
        <aside className={`ai-sidebar-desktop${collapsed ? " is-collapsed" : ""}`} aria-label="Conversations">
          {collapsed ? null : sidebar}
          <button
            type="button"
            className="ai-sidebar-toggle"
            aria-label={collapsed ? "Expand conversation sidebar" : "Collapse conversation sidebar"}
            onClick={() => setCollapsed((value) => !value)}
          >
            <LucideIcon name={collapsed ? "chevron-right" : "chevron-left"} size={16} />
          </button>
        </aside>
        <Button className="ai-sidebar-mobile-btn" icon={<CommentOutlined />} onClick={() => setMobileOpen(true)}>
          Chats
        </Button>
        <Drawer title="Conversations" open={mobileOpen} onClose={() => setMobileOpen(false)} width={300}>
          {sidebar}
        </Drawer>

        <section className="ai-main">
          <header className="ai-main-head">
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>Ask AI</Typography.Title>
              <Typography.Text type="secondary">Answers use only records you can already open in this app.</Typography.Text>
            </div>
            {context ? (
              <Tag
                closable
                onClose={() => setParams({})}
              >
                Scoped to {context.type} {context.id}
              </Tag>
            ) : null}
          </header>

          <div className="ai-transcript" ref={scrollerRef} aria-live="polite">
            {messages.length === 0 && !sending ? (
              <div className="ai-welcome">
                <h2>How can I help with your projects?</h2>
                <p>Ask questions about your authorized projects, protocols, assigned tasks, schedules, execution activities, reports, and endorsements.</p>
                <div className="ai-starters">
                  {AI_STARTER_PROMPTS.map((prompt) => (
                    <button key={prompt} type="button" className="ai-starter" onClick={() => void send(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((row) => (
                <article key={row.id} className={`ai-bubble ai-bubble-${row.role}`}>
                  <p className="ai-bubble-text">{row.content}</p>
                  {row.role === "assistant" && row.sources.length > 0 ? (
                    <div className="ai-sources">
                      <strong>Related records</strong>
                      {row.sources.map((source) => (
                        <Link key={source.id} className="ai-source-card" to={source.path}>
                          <span>{source.recordType}</span>
                          <strong>{source.title}</strong>
                          <em>{source.status}{source.date ? ` · ${source.date}` : ""}</em>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  {row.role === "assistant" ? (
                    <div className="ai-bubble-actions">
                      <Button size="small" onClick={() => void navigator.clipboard.writeText(row.content)}>Copy</Button>
                    </div>
                  ) : null}
                  {row.followUps.length > 0 ? (
                    <div className="ai-followups">
                      {row.followUps.map((prompt) => (
                        <button key={prompt} type="button" onClick={() => void send(prompt)}>{prompt}</button>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))
            )}
            {sending ? <div className="ai-thinking" role="status">Retrieving authorized records…</div> : null}
            {error ? (
              <div className="ai-error" role="alert">
                {error}
                <Button size="small" onClick={retryLast}>Retry</Button>
              </div>
            ) : null}
          </div>

          <form
            className="ai-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <Input.TextArea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about your projects, tasks, protocols, or reports..."
              autoSize={{ minRows: 2, maxRows: 6 }}
              disabled={sending}
              aria-label="Assistant question"
              onPressEnter={(event) => {
                if (!event.shiftKey) {
                  event.preventDefault();
                  void send(draft);
                }
              }}
            />
            <div className="ai-composer-row">
              <span>Answers are based only on authorized application data.</span>
              <Button type="primary" htmlType="submit" disabled={!draft.trim() || sending}>
                Send
              </Button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

export function askAiHref(context: AiAssistantContext): string {
  return assistantContextPath(context);
}
