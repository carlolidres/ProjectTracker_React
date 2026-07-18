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
import { normalizeWorkflowStatusLabel } from "@/lib/workflowStatus";
import { cn, isMissingValue } from "@/lib/utils";

interface WorkflowStatusBadgeProps {
  status: string;
  label?: string;
}

type StatusTone = "success" | "processing" | "error" | "warning" | "neutral" | "info";

function statusTone(normalized: string): StatusTone {
  const lower = normalized.toLowerCase();
  if (lower.includes("approved") || lower.includes("closed")) return "success";
  if (lower.includes("not applicable")) return "neutral";
  if (lower.includes("rejected") || lower.includes("overdue")) return "error";
  if (lower.includes("pending") || lower.includes("in progress") || lower.includes("submitted")) {
    return "processing";
  }
  if (lower.includes("open")) return "info";
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

export function WorkflowStatusBadge({ status, label }: WorkflowStatusBadgeProps) {
  if (isMissingValue(status)) {
    return (
      <Tooltip title="N/A">
        <span className="workflow-status-icon workflow-status-icon--neutral" aria-label="Status not available">
          <MinusCircleOutlined aria-hidden />
        </span>
      </Tooltip>
    );
  }

  const normalized = normalizeWorkflowStatusLabel(status);
  const display = label ?? normalized;
  const tone = statusTone(normalized);

  return (
    <Tooltip title={display}>
      <span
        className={cn("workflow-status-icon", `workflow-status-icon--${tone}`)}
        aria-label={`Status: ${display}`}
      >
        {statusIcon(tone, normalized)}
      </span>
    </Tooltip>
  );
}
