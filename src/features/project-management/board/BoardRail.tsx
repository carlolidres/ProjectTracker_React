import { useRef, useState } from "react";
import { Dropdown, Input } from "antd";
import { LucideIcon } from "@/components/common/lucide-icon";
import type { PmProject, PmWorkspace } from "@/features/project-management/board/boardRules";

export function BoardRail({
  workspaces,
  workspace,
  projects,
  projectId,
  query,
  canRename,
  favorites,
  unseenCounts,
  completedIds,
  onQuery,
  onSelectWorkspace,
  onSelectProject,
  onRenameProject,
  onToggleFavorite,
  onAddWorkspace,
  onAddProject,
  onManage,
  onEdit,
  onLeave,
  onArchive,
}: {
  workspaces: PmWorkspace[];
  workspace: PmWorkspace | null;
  projects: PmProject[];
  projectId: string | null;
  query: string;
  canRename: boolean;
  favorites: string[];
  unseenCounts: Map<string, number>;
  completedIds: Set<string>;
  onQuery: (value: string) => void;
  onSelectWorkspace: (id: string) => void;
  onSelectProject: (id: string) => void;
  onRenameProject: (name: string) => void;
  onToggleFavorite: (projectId: string) => void;
  onAddWorkspace: () => void;
  onAddProject: () => void;
  onManage: () => void;
  onEdit: () => void;
  onLeave: () => void;
  onArchive: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(() => localStorage.getItem("project-tracker:pm-board-workspace-open") !== "closed");
  const skipSave = useRef(false);
  const visible = projects
    .filter((project) => !project.archivedAt && project.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));
  const activeWorkspaces = [...new Map(
    workspaces.filter((item) => !item.archivedAt).map((item) => [item.id, item]),
  ).values()];
  return (
    <aside className="pmb-rail" aria-label="Workspaces and projects">
      <Input
        allowClear
        prefix={<LucideIcon name="search" size={14} />}
        placeholder="Search projects"
        aria-label="Search projects"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
      />
      <button type="button" className="pmb-rail-add" onClick={onAddWorkspace}>
        <LucideIcon name="plus" size={14} /> Add new workspace
      </button>
      {workspace ? (
        <div className="pmb-workspace-row">
          <button
            type="button"
            className="pmb-workspace-toggle"
            aria-expanded={workspaceOpen}
            aria-label={workspaceOpen ? `Collapse ${workspace.name}` : `Expand ${workspace.name}`}
            onClick={() => setWorkspaceOpen((open) => {
              localStorage.setItem("project-tracker:pm-board-workspace-open", open ? "closed" : "open");
              return !open;
            })}
          >
            <span className={workspaceOpen ? "is-open" : undefined}>
              <LucideIcon name="chevron-right" size={14} />
            </span>
          </button>
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                ...activeWorkspaces.filter((item) => item.id !== workspace.id).map((item) => ({
                  key: `open:${item.id}`,
                  label: `${item.icon} ${item.name}`,
                })),
                ...(activeWorkspaces.some((item) => item.id !== workspace.id) ? [{ type: "divider" as const }] : []),
                { key: "manage", label: "Manage" },
                { key: "edit", label: "Edit" },
                { key: "project", label: "New project" },
                { key: "leave", label: "Leave workspace" },
                { key: "archive", label: "Archive", disabled: workspace.role !== "Owner" },
              ],
              onClick: ({ key }) => {
                if (key.startsWith("open:")) onSelectWorkspace(key.slice(5));
                if (key === "manage") onManage();
                if (key === "edit") onEdit();
                if (key === "project") onAddProject();
                if (key === "leave") onLeave();
                if (key === "archive") onArchive();
              },
            }}
          >
            <button type="button" className="pmb-rail-menu" aria-label="Workspace actions">
              {workspace.icon} {workspace.name}
            </button>
          </Dropdown>
        </div>
      ) : null}
      {workspaceOpen ? <div className="pmb-project-list" role="list">
        {visible.map((project) => {
          const active = project.id === projectId;
          const complete = completedIds.has(project.id);
          const editing = active && draft !== null;
          if (editing) {
            return (
              <div key={project.id} className={`pmb-project is-active${complete ? " is-complete" : ""}`} role="listitem">
                <span className="pmb-project-mark" style={{ background: workspace?.color ?? "#579bfc" }} />
                <input
                  className="pmb-project-rename"
                  aria-label="Project name"
                  value={draft}
                  autoFocus
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => {
                    if (skipSave.current) {
                      skipSave.current = false;
                      return;
                    }
                    const name = draft.trim();
                    setDraft(null);
                    if (name) onRenameProject(name);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                    if (event.key === "Escape") {
                      event.preventDefault();
                      skipSave.current = true;
                      setDraft(null);
                    }
                  }}
                />
              </div>
            );
          }
          return (
            <button
              key={project.id}
              type="button"
              role="listitem"
              className={`pmb-project${active ? " is-active" : ""}${complete ? " is-complete" : ""}`}
              aria-current={active ? "true" : undefined}
              title={[active && canRename ? "Double-click to rename" : "", complete ? "All tasks completed" : ""].filter(Boolean).join(". ") || undefined}
              onClick={() => onSelectProject(project.id)}
              onDoubleClick={() => {
                if (active && canRename) setDraft(project.name);
              }}
            >
              <span className="pmb-project-mark" style={{ background: workspace?.color ?? "#579bfc" }} />
            {(unseenCounts.get(project.id) ?? 0) > 0 ? <span className="pmb-unseen-dot" aria-label={`${unseenCounts.get(project.id)} new updates`} /> : null}
            <span>{project.name}</span>
            <span
              role="button"
              tabIndex={0}
              className="pmb-fav"
              aria-label={favorites.includes(project.id) ? `Unfavorite ${project.name}` : `Favorite ${project.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite(project.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.stopPropagation();
                  onToggleFavorite(project.id);
                }
              }}
            >
              {favorites.includes(project.id) ? "★" : "☆"}
            </span>
          </button>
          );
        })}
      </div> : null}
    </aside>
  );
}
