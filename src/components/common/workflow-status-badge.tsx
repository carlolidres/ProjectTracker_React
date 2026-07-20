import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  MinusCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import type { ReactNode } from "react";
import {
  normalizeWorkflowStatusLabel,
  workflowStatusDescription,
} from "@/lib/workflowStatus";
import { cn, isMissingValue } from "@/lib/utils";

interface WorkflowStatusBadgeProps {
  status: string;
  label?: string;
}

type StatusTone = "success" | "processing" | "error" | "warning" | "neutral" | "info";

function statusTone(normalized: string): StatusTone {
  const lower = normalized.toLowerCase();
  if (lower.includes("approved") || lower.includes("closed") || lower === "done") return "success";
  if (lower.includes("not applicable")) return "neutral";
  if (lower.includes("rejected") || lower.includes("overdue") || lower.includes("cancelled")) {
    return "error";
  }
  if (
    lower.includes("pending")
    || lower.includes("in progress")
    || lower.includes("in-process")
    || lower.includes("in process")
    || lower.includes("routing")
    || lower.includes("submitted")
    || lower.includes("planned")
  ) {
    return "processing";
  }
  if (lower.includes("client approval")) return "warning";
  if (lower.includes("cnf creation") || lower.includes("open")) return "info";
  return "neutral";
}

function statusIcon(tone: StatusTone, normalized: string): ReactNode {
  const lower = normalized.toLowerCase();
  if (lower.includes("not applicable")) return <MinusCircleOutlined />;
  if (tone === "success") return <CheckCircleOutlined />;
  if (tone === "error") return <CloseCircleOutlined />;
  if (tone === "warning") return <ExclamationCircleOutlined />;
  if (tone === "processing") return <SyncOutlined spin={lower.includes("progress")} />;
  if (tone === "info") return <ClockCircleOutlined />;
  return <MinusCircleOutlined />;
}

function tooltipContent(display: string, status: string): ReactNode {
  const description = workflowStatusDescription(status);
  if (!description) return display;
  return (
    <span className="workflow-status-tooltip">
      <span className="workflow-status-tooltip__title">{display}</span>
      <span className="workflow-status-tooltip__desc">{description}</span>
    </span>
  );
}

export function WorkflowStatusBadge({ status, label }: WorkflowStatusBadgeProps) {
  if (isMissingValue(status)) {
    return (
      <Tooltip title={tooltipContent("N/A", "N/A")} getPopupContainer={() => document.body}>
        <span
          className="workflow-status-icon workflow-status-icon--neutral"
          tabIndex={0}
          aria-label="Status: N/A. No status recorded for this document."
        >
          <MinusCircleOutlined aria-hidden />
        </span>
      </Tooltip>
    );
  }

  const normalized = normalizeWorkflowStatusLabel(status);
  const display = label ?? normalized;
  const tone = statusTone(normalized);
  const description = workflowStatusDescription(status);
  const ariaLabel = description ? `Status: ${display}. ${description}` : `Status: ${display}`;

  return (
    <Tooltip title={tooltipContent(display, status)} getPopupContainer={() => document.body}>
      <span
        className={cn("workflow-status-icon", `workflow-status-icon--${tone}`)}
        tabIndex={0}
        aria-label={ariaLabel}
      >
        {statusIcon(tone, normalized)}
      </span>
    </Tooltip>
  );
}
