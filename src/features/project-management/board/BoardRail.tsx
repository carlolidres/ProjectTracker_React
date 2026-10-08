import { useRef, useState } from "react";
import { Dropdown, Input, Select } from "antd";
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
  onQuery,
  onSelectWorkspace,
  onSelectProject,
  onRenameProject,
  onToggleFavorite,
  onMyWork,
  onAddWorkspace,
  onAddProject,
  onManage,
  onEdit,
  onArchive,
}: {
  workspaces: PmWorkspace[];
  workspace: PmWorkspace | null;
  projects: PmProject[];
  projectId: string | null;
  query: string;
  canRename: boolean;
  favorites: string[];
  onQuery: (value: string) => void;
  onSelectWorkspace: (id: string) => void;
  onSelectProject: (id: string) => void;
  onRenameProject: (name: string) => void;
  onToggleFavorite: (projectId: string) => void;
  onMyWork: () => void;
  onAddWorkspace: () => void;
  onAddProject: () => void;
  onManage: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const skipSave = useRef(false);
  const visible = projects
    .filter((project) => !project.archivedAt && project.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));
  const activeWorkspaces = workspaces.filter((item) => !item.archivedAt);
  return (
    <aside className="pmb-rail" aria-label="Workspaces and projects">
      <Select
        showSearch
        className="pmb-workspace-select"
        aria-label="Workspace"
        value={workspace?.id}
        placeholder="Workspace"
        optionFilterProp="label"
        options={activeWorkspaces.map((item) => ({
          value: item.id,
          label: `${item.icon} ${item.name}`,
        }))}
        onChange={onSelectWorkspace}
      />
      <button type="button" className="pmb-rail-add" onClick={onAddWorkspace}>
        <LucideIcon name="plus" size={14} /> Add new workspace
      </button>
      {workspace ? (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              { key: "manage", label: "Manage" },
              { key: "edit", label: "Edit" },
              { key: "add", label: "Add New" },
              { key: "project", label: "New project" },
              { key: "archive", label: "Archive", disabled: workspace.role !== "Owner" },
            ],
            onClick: ({ key }) => {
              if (key === "manage") onManage();
              if (key === "edit") onEdit();
              if (key === "add") onAddWorkspace();
              if (key === "project") onAddProject();
              if (key === "archive") onArchive();
            },
          }}
        >
          <button type="button" className="pmb-rail-menu" aria-label="Workspace actions">
            {workspace.icon} {workspace.name}
          </button>
        </Dropdown>
      ) : null}
      <Input
        allowClear
        prefix={<LucideIcon name="search" size={14} />}
        placeholder="Search projects"
        aria-label="Search projects"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
      />
      <button type="button" className="pmb-rail-add" onClick={onMyWork}>My work</button>
      <div className="pmb-project-list" role="list">
        {visible.map((project) => {
          const active = project.id === projectId;
          const editing = active && draft !== null;
          if (editing) {
            return (
              <div key={project.id} className="pmb-project is-active" role="listitem">
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
              className={`pmb-project${active ? " is-active" : ""}`}
              aria-current={active ? "true" : undefined}
              title={active && canRename ? "Double-click to rename" : undefined}
              onClick={() => onSelectProject(project.id)}
              onDoubleClick={() => {
                if (active && canRename) setDraft(project.name);
              }}
            >
              <span className="pmb-project-mark" style={{ background: workspace?.color ?? "#579bfc" }} />
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
      </div>
    </aside>
  );
}
