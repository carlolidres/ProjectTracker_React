import { MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined, MessageOutlined } from "@ant-design/icons";
import { Alert, Button, Drawer, Empty, Input, Space, Tag, Tooltip, Typography } from "antd";
import { useState } from "react";
import { NotificationCenter } from "@/components/layout/notification-center";
import type { SidebarState } from "@/hooks/use-sidebar-state";
import { askCNFAssistant } from "@/lib/cnf-ai-assistant";

interface TopbarProps {
  sidebarState: SidebarState;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
  notificationSampleMode?: boolean;
}

export function Topbar({
  sidebarState,
  onToggleSidebar,
  onOpenMobileSidebar,
  notificationSampleMode = false,
}: TopbarProps) {
  const isCollapsed = sidebarState === "collapsed";
  const [activePanel, setActivePanel] = useState<"chat" | "notifications" | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  async function submitQuestion(prompt = question) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;
    setQuestion(trimmedPrompt);
    setIsAsking(true);
    setChatError(null);
    const result = await askCNFAssistant(trimmedPrompt);
    setIsAsking(false);
    if (result.error) {
      setChatError(result.error.message);
      setAnswer(null);
      return;
    }
    setAnswer(result.data);
  }

  return (
    <header className="topbar">
      <Button
        type="text"
        icon={<MenuOutlined />}
        className="mobile-only"
        aria-label="Open navigation"
        onClick={onOpenMobileSidebar}
      />
      <Tooltip title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
        <Button
          type="text"
          className="desktop-only topbar-sidebar-toggle"
          icon={isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleSidebar}
        />
      </Tooltip>
      <div className="topbar-title">
        <p className="topbar-title-main">CNF Tracker</p>
        <p className="topbar-title-sub">Secure role-based validation workflow</p>
      </div>
      <div className="topbar-actions">
        <Tooltip title="Ask CNF Tracker Bot">
          <Button
            type="text"
            icon={<MessageOutlined />}
            aria-label="Ask CNF Tracker Bot"
            onClick={() => setActivePanel("chat")}
          />
        </Tooltip>
        <NotificationCenter
          open={activePanel === "notifications"}
          onOpenChange={(open) => setActivePanel(open ? "notifications" : null)}
          sampleMode={notificationSampleMode}
        />
      </div>

      <Drawer
        title="Ask CNF Tracker Bot"
        placement="right"
        width={460}
        open={activePanel === "chat"}
        onClose={() => setActivePanel(null)}
      >
        <Space direction="vertical" size={18} style={{ width: "100%" }}>
          <Typography.Paragraph>
            Ask concise questions about CNF records and lessons visible to your signed-in account.
          </Typography.Paragraph>
          <Space wrap>
            {[
              "Summarize overdue CNFs",
              "What records are due soon?",
              "Show common delay reasons",
              "Suggest CAPA actions",
            ].map((prompt) => (
              <Tag
                key={prompt}
                className="chatbot-prompt-chip"
                role="button"
                tabIndex={0}
                onClick={() => void submitQuestion(prompt)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") void submitQuestion(prompt);
                }}
              >
                {prompt}
              </Tag>
            ))}
          </Space>
          <Input.TextArea
            autoSize={{ minRows: 4, maxRows: 6 }}
            placeholder="Ask about CNF records, overdue items, lessons learned, or due-date risks..."
            aria-label="CNF Tracker Bot prompt"
            value={question}
            maxLength={1500}
            onChange={(event) => setQuestion(event.target.value)}
            onPressEnter={(event) => {
              if (!event.shiftKey) {
                event.preventDefault();
                void submitQuestion();
              }
            }}
          />
          <Button type="primary" loading={isAsking} disabled={!question.trim()} onClick={() => void submitQuestion()}>
            Ask CNF Tracker Bot
          </Button>
          {chatError ? <Alert type="error" showIcon message="Assistant request failed" description={chatError} /> : null}
          {answer ? (
            <Alert type="info" showIcon message="CNF Tracker Bot" description={<Typography.Paragraph>{answer}</Typography.Paragraph>} />
          ) : !isAsking && !chatError ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No answer yet" />
          ) : null}
          <Typography.Text type="secondary">
            Answers use a minimized RLS-filtered snapshot and require qualified human review.
          </Typography.Text>
        </Space>
      </Drawer>
    </header>
  );
}
