import { CommentOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useMemo } from "react";
import { useMatch, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { canViewAskAi } from "@/components/layout/sidebar-nav-tree";
import { cn } from "@/lib/utils";

interface AskAiButtonProps {
  className?: string;
  compact?: boolean;
}

export function AskAiButton({ className, compact = false }: AskAiButtonProps) {
  const { profile } = useAuth();
  const { overrides } = useMenuPermissions();
  const navigate = useNavigate();
  const active = Boolean(useMatch("/ai-assistant"));
  const visible = useMemo(
    () => canViewAskAi(profile?.role, overrides),
    [profile?.role, overrides],
  );
  if (!visible) return null;

  return (
    <Tooltip title={compact ? "Ask AI" : undefined}>
      <Button
        type="text"
        className={cn("ask-ai-button", active && "ask-ai-button-active", compact && "ask-ai-button-compact", className)}
        icon={<CommentOutlined />}
        aria-label="Ask AI"
        aria-current={active ? "page" : undefined}
        onClick={() => navigate("/ai-assistant")}
      >
        {compact ? null : "Ask AI"}
      </Button>
    </Tooltip>
  );
}
