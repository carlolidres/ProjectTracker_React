import { Typography } from "antd";
import { LucideIcon } from "@/components/common/lucide-icon";
import type { PortfolioSummary } from "@/types";

const ITEMS: Array<{ key: keyof PortfolioSummary; label: string; icon: "layers" | "file-text" | "clipboard-list" | "clock" | "check-circle" | "x-circle" }> = [
  { key: "total", label: "Total", icon: "layers" },
  { key: "process", label: "Projects", icon: "file-text" },
  { key: "support", label: "Support", icon: "clipboard-list" },
  { key: "ongoing", label: "Ongoing", icon: "clock" },
  { key: "completed", label: "Completed", icon: "check-circle" },
  { key: "cancelled", label: "Cancelled", icon: "x-circle" },
];

interface PortfolioSummaryProps {
  summary: PortfolioSummary;
  variant?: "cards" | "tooltip";
}

export function PortfolioSummary({ summary, variant = "cards" }: PortfolioSummaryProps) {
  if (variant === "tooltip") {
    return (
      <div className="pm-summary-tooltip" role="group" aria-label="Portfolio summary">
        {ITEMS.map((item) => (
          <div key={item.key} className="pm-summary-tooltip-row">
            <span>{item.label}</span>
            <strong>{summary[item.key]}</strong>
          </div>
        ))}
        <p className="pm-summary-tooltip-hint">Click to pin or hide these counts.</p>
      </div>
    );
  }

  return (
    <div className="pm-summary" role="group" aria-label="Portfolio summary">
      {ITEMS.map((item) => (
        <div key={item.key} className={`pm-summary-card pm-summary-card-${item.key}`}>
          <span className="pm-summary-card-icon" aria-hidden="true">
            <LucideIcon name={item.icon} size={14} />
          </span>
          <Typography.Text className="pm-summary-card-label">{item.label}</Typography.Text>
          <span className="pm-summary-card-value">{summary[item.key]}</span>
        </div>
      ))}
    </div>
  );
}
