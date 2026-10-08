import type { Profile } from "@/types";
import { getProfileDisplayName } from "@/lib/profileName";
import { formatAppDate } from "@/lib/date";
import {
  PRIORITY_COLOR,
  STATUS_COLOR,
  type BoardPriority,
  type BoardStatus,
  type PmBoardTask,
} from "@/features/project-management/board/boardRules";

export function personName(profiles: Profile[], userId: string): string {
  if (!userId) return "Unassigned";
  const profile = profiles.find((entry) => entry.id === userId);
  if (!profile) return "Unassigned";
  return getProfileDisplayName(profile) || profile.email || "Unassigned";
}

export function personInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0 || name === "Unassigned") return "?";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

const AVATAR_COLORS = ["#579bfc", "#00c875", "#fdab3d", "#a25ddc", "#e2445c", "#5559df"];

export function avatarColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash] ?? "#579bfc";
}

export function OwnerAvatar({ name }: { name: string }) {
  const assigned = name !== "Unassigned";
  return (
    <span
      className="pm-avatar"
      title={name}
      style={assigned ? { background: avatarColor(name), color: "#fff" } : undefined}
    >
      {personInitials(name)}
    </span>
  );
}

export function statusLabel(status: BoardStatus): string {
  return status;
}

export function StatusFill({ status }: { status: BoardStatus }) {
  return (
    <span className="pmb-fill" style={{ background: STATUS_COLOR[status], color: status === "Working on it" ? "#1f2937" : "#fff" }}>
      {status}
    </span>
  );
}

export function PriorityFill({ priority }: { priority: BoardPriority }) {
  return (
    <span className="pmb-fill" style={{ background: PRIORITY_COLOR[priority], color: "#fff" }}>
      {priority}
    </span>
  );
}

export function timelineLabel(task: Pick<PmBoardTask, "startDate" | "dueDate">): string {
  const start = task.startDate ? formatAppDate(task.startDate) : "";
  const due = task.dueDate ? formatAppDate(task.dueDate) : "";
  if (start && start !== "-" && due && due !== "-" && start !== due) return `${start} – ${due}`;
  if (due && due !== "-") return due;
  if (start && start !== "-") return start;
  return "—";
}

export function relativeUpdated(value: string): string {
  const ms = Date.parse(value);
  if (!ms) return "—";
  const minutes = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatAppDate(value);
}
