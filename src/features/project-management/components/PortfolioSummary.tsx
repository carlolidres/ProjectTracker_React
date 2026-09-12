import { LucideIcon } from "@/components/common/lucide-icon";
import type { PortfolioSummary } from "@/types";

const ITEMS: Array<{
  key: keyof PortfolioSummary;
  label: string;
  icon: "clock" | "file-text" | "alert-triangle" | "check-circle" | "clipboard-list" | "x-circle" | "layers";
}> = [
  { key: "ongoing", label: "Ongoing", icon: "clock" },
  { key: "forReview", label: "For Review", icon: "file-text" },
  { key: "atRisk", label: "At Risk", icon: "alert-triangle" },
  { key: "completed", label: "Completed", icon: "check-circle" },
  { key: "myTasks", label: "My Tasks", icon: "clipboard-list" },
  { key: "cancelled", label: "Cancelled", icon: "x-circle" },
];

interface PortfolioSummaryProps {
  summary: PortfolioSummary;
  variant?: "cards" | "tooltip";
  onSelect?: (key: keyof PortfolioSummary) => void;
}

export function PortfolioSummary({ summary, variant = "cards", onSelect }: PortfolioSummaryProps) {
  if (variant === "tooltip") {
    return (
      <div className="pm-summary-tooltip" role="group" aria-label="Portfolio summary">
        {ITEMS.map((item) => (
          <div key={item.key} className="pm-summary-tooltip-row">
            <span>{item.label}</span>
            <strong>{summary[item.key]}</strong>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pm-summary" role="group" aria-label="Portfolio summary">
      {ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`pm-summary-card pm-summary-card-${item.key}`}
          onClick={onSelect ? () => onSelect(item.key) : undefined}
        >
          <span className="pm-summary-card-icon" aria-hidden="true">
            <LucideIcon name={item.icon} size={14} />
          </span>
          <span className="pm-summary-card-label">{item.label}</span>
          <span className="pm-summary-card-value">{summary[item.key]}</span>
        </button>
      ))}
    </div>
  );
}
