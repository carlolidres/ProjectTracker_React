import { Avatar, Tag, Tooltip } from "antd";
import { WorkflowStatusBadge } from "@/components/common/workflow-status-badge";
import { getProfileDisplayName, getProfileInitials } from "@/lib/profileName";
import { cn } from "@/lib/utils";
import type { PortfolioItem, Profile } from "@/types";

interface PortfolioCardProps {
  item: PortfolioItem;
  changeSummary?: string;
  assignees?: Profile[];
  onOpen: (item: PortfolioItem) => void;
}

export function PortfolioCard({ item, changeSummary, assignees = [], onOpen }: PortfolioCardProps) {
  const sourceLabel = item.sourceType === "process" ? "Project" : "Support";
  const productName = item.product && item.product !== "N/A" ? item.product : item.title;
  const uniqueBatch = item.uniqueBatch && item.uniqueBatch !== "N/A" ? item.uniqueBatch : "";
  const changeText = (changeSummary || "").trim();

  return (
    <button
      type="button"
      className={cn(
        "pm-card",
        item.statusGroup === "Ongoing" && "pm-card-ongoing",
        item.statusGroup === "Completed" && "pm-card-completed",
        item.statusGroup === "Cancelled" && "pm-card-cancelled",
      )}
      onClick={() => onOpen(item)}
      aria-label={`Open ${sourceLabel} ${productName}${uniqueBatch ? ` ${uniqueBatch}` : ""}`}
    >
      <div className="pm-card-kicker">
        <Tag>{sourceLabel}</Tag>
        <Tag>{item.statusGroup}</Tag>
        <Tag color="blue">{item.phase.replace(/_/g, " ")}</Tag>
        {item.incompleteCount > 0 ? <Tag color="warning">{item.incompleteCount} incomplete</Tag> : null}
      </div>
      <h3 className="pm-card-title">{productName}</h3>
      <p className="pm-card-batch">{uniqueBatch || "No unique batch"}</p>
      {changeText ? <p className="pm-card-change">{changeText}</p> : null}
      <WorkflowStatusBadge status={item.sourceStatus} />
      {assignees.length > 0 ? (
        <div
          className="pm-card-assignees"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Avatar.Group maxCount={3} size={26}>
            {assignees.map((person) => {
              const name = getProfileDisplayName(person) || person.email;
              return (
                <Tooltip key={person.id} title={name} mouseEnterDelay={0.05} getPopupContainer={() => document.body}>
                  <Avatar src={person.avatar_url || undefined} alt={name} aria-label={name}>
                    {getProfileInitials(person)}
                  </Avatar>
                </Tooltip>
              );
            })}
          </Avatar.Group>
        </div>
      ) : null}
    </button>
  );
}
