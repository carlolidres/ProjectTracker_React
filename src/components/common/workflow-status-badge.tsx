import { Tag } from "antd";
import { normalizeWorkflowStatusLabel } from "@/lib/workflowStatus";
import { isMissingValue } from "@/lib/utils";

interface WorkflowStatusBadgeProps {
  status: string;
  label?: string;
}

const STATUS_COLORS: Record<string, string> = {
  approved: "success",
  "not applicable": "default",
  pending: "processing",
  "in progress": "processing",
  submitted: "blue",
  rejected: "error",
  overdue: "error",
  open: "blue",
  closed: "success",
};

function statusColor(normalized: string): string {
  const lower = normalized.toLowerCase();
  for (const [key, color] of Object.entries(STATUS_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "default";
}

export function WorkflowStatusBadge({ status, label }: WorkflowStatusBadgeProps) {
  if (isMissingValue(status)) {
    return <Tag aria-label="Status not available">N/A</Tag>;
  }

  const normalized = normalizeWorkflowStatusLabel(status);
  const color = statusColor(normalized);

  return (
    <Tag color={color} aria-label={`Status: ${normalized}`}>
      {label ?? normalized}
    </Tag>
  );
}
