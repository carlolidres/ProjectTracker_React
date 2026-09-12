import { Empty, Progress, Tag } from "antd";
import { useMemo, useState } from "react";
import {
  BOARD_STATUS_COLORS,
  BOARD_STATUS_ORDER,
  dueDateTone,
  groupPortfolioByBoardStatus,
} from "@/lib/projectManagementPortfolio";
import { WORKFLOW_PHASE_LABELS } from "@/lib/projectManagementWorkflow";
import type { PortfolioBoardStatus, PortfolioItem } from "@/types";

interface PortfolioKanbanProps {
  items: PortfolioItem[];
  onOpen: (item: PortfolioItem) => void;
  onMove?: (item: PortfolioItem, nextStatus: PortfolioBoardStatus) => void;
}

export function PortfolioKanban({ items, onOpen, onMove }: PortfolioKanbanProps) {
  const grouped = useMemo(() => groupPortfolioByBoardStatus(items), [items]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  if (items.length === 0) {
    return <Empty description="No projects match the selected filters." />;
  }

  return (
    <div className="pm-kanban" role="list" aria-label="Portfolio board">
      {BOARD_STATUS_ORDER.map((status) => {
        const columnItems = grouped[status];
        return (
          <section
            key={status}
            className="pm-kanban-column"
            aria-label={status}
            onDragOver={(event) => {
              if (!onMove || !draggingId) return;
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain") || draggingId;
              const item = items.find((row) => row.id === id);
              setDraggingId(null);
              if (item && item.boardStatus !== status) onMove?.(item, status);
            }}
          >
            <h3 className="pm-board-heading">
              {status}
              <span>{columnItems.length}</span>
            </h3>
            {columnItems.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="None" />
            ) : (
              columnItems.map((item) => (
                <article
                  key={item.id}
                  className="pm-kanban-card"
                  draggable={Boolean(onMove)}
                  onDragStart={(event) => {
                    setDraggingId(item.id);
                    event.dataTransfer.setData("text/plain", item.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDraggingId(null)}
                >
                  <button type="button" className="pm-kanban-card-open" onClick={() => onOpen(item)}>
                    <strong>{item.product !== "N/A" ? item.product : item.title}</strong>
                    <span>{WORKFLOW_PHASE_LABELS[item.phase]}</span>
                    <span className={`pm-due pm-due-${dueDateTone(item)}`}>
                      {item.owner}
                      {item.targetDate && item.targetDate !== "N/A" ? ` · ${item.targetDate}` : ""}
                    </span>
                    <Progress percent={item.progress} size="small" />
                  </button>
                  <Tag color={BOARD_STATUS_COLORS[item.boardStatus]}>{item.boardStatus}</Tag>
                </article>
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
