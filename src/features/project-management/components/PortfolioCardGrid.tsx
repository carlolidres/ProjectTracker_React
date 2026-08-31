import { Empty } from "antd";
import { PortfolioCard } from "@/features/project-management/components/PortfolioCard";
import { PORTFOLIO_STATUS_ORDER } from "@/lib/projectManagementPortfolio";
import type { PortfolioItem, PortfolioStatusGroup, Profile } from "@/types";

interface PortfolioCardGridProps {
  grouped: Record<PortfolioStatusGroup, PortfolioItem[]>;
  changeSummaries?: Record<string, string>;
  assigneesBySource?: Record<string, Profile[]>;
  onOpen: (item: PortfolioItem) => void;
}

export function PortfolioCardGrid({ grouped, changeSummaries, assigneesBySource, onOpen }: PortfolioCardGridProps) {
  const hasAny = PORTFOLIO_STATUS_ORDER.some((status) => grouped[status].length > 0);
  if (!hasAny) {
    return <Empty description="No matching projects or support activities." />;
  }

  return (
    <>
      {PORTFOLIO_STATUS_ORDER.map((status) => {
        const items = grouped[status];
        if (items.length === 0) return null;
        return (
          <section key={status} className="pm-status-section" aria-labelledby={`pm-status-${status}`}>
            <h2 id={`pm-status-${status}`} className="pm-status-heading">
              {status}
              <span className="pm-status-count">{items.length}</span>
            </h2>
            <div className="pm-card-grid">
              {items.map((item) => (
                <PortfolioCard
                  key={item.id}
                  item={item}
                  changeSummary={changeSummaries?.[item.id]}
                  assignees={assigneesBySource?.[`${item.sourceType}:${item.sourceId}`]}
                  onOpen={onOpen}
                />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
