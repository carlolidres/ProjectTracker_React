import { Dropdown } from "antd";
import { useState } from "react";
import { LucideIcon } from "@/components/common/lucide-icon";
import { defaultBoardLabels, labelColor, labelName, selectableLabels, type BoardLabel } from "@/features/project-management/board/boardLabels";
import {
  subtasksOf,
  type BoardGroupBy,
  type PmBoardTask,
  type PmGroup,
} from "@/features/project-management/board/boardRules";

const BLANK_ID = "blank";

export function BoardKanban({
  groupBy,
  groups,
  tasks,
  labels,
  canEdit,
  updateCounts,
  onOpen,
  onUpdates,
  onMove,
  onReorder,
  onAdd,
  onRename,
  onDelete,
}: {
  groupBy: BoardGroupBy;
  groups: PmGroup[];
  tasks: PmBoardTask[];
  labels: BoardLabel[];
  canEdit: boolean;
  updateCounts: Record<string, number>;
  onOpen: (task: PmBoardTask) => void;
  onUpdates: (task: PmBoardTask) => void;
  onMove: (task: PmBoardTask, columnId: string, orderedIds: string[]) => void;
  onReorder: (task: PmBoardTask, orderedIds: string[]) => void;
  onAdd: (columnId: string, title: string) => void;
  onRename: (task: PmBoardTask, title: string) => void;
  onDelete: (task: PmBoardTask) => void;
}) {
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ lane: string; before: string | null } | null>(null);
  const catalog = labels.length ? labels : defaultBoardLabels();
  const lanes = groupBy === "group"
    ? groups.map((group) => ({ id: group.id, label: group.name, color: group.color, droppable: true }))
    : labelLanes(catalog, groupBy, tasks);
  const tops = tasks.filter((task) => !task.parentTaskId);
  const cardsFor = (laneId: string) => tops
    .filter((task) => {
      const value = groupBy === "priority" ? task.priority : groupBy === "status" ? task.status : task.groupId;
      if (laneId === BLANK_ID) return !lanes.some((lane) => lane.id !== BLANK_ID && lane.id === value);
      return value === laneId;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  const total = lanes.reduce((sum, lane) => sum + cardsFor(lane.id).length, 0);

  const place = (laneId: string, beforeId: string | null) => {
    if (!canEdit || !dragId) return;
    const lane = lanes.find((item) => item.id === laneId);
    if (!lane?.droppable) return;
    const moving = tops.find((task) => task.id === dragId);
    if (!moving) return;
    const rest = cardsFor(laneId).filter((task) => task.id !== dragId);
    const index = beforeId ? rest.findIndex((task) => task.id === beforeId) : rest.length;
    const next = [...rest];
    next.splice(index < 0 ? rest.length : index, 0, moving);
    const orderedIds = next.map((task) => task.id);
    const sameLane = cardsFor(laneId).some((task) => task.id === dragId);
    if (sameLane) onReorder(moving, orderedIds);
    else onMove(moving, laneId, orderedIds);
    setDragId(null);
    setOver(null);
  };

  return (
    <div className="pmb-kanban-wrap">
      <div className="pmb-kanban-overview" aria-label="Status distribution">
        {lanes.map((lane) => {
          const count = cardsFor(lane.id).length;
          return (
            <button
              key={lane.id}
              type="button"
              style={{ flexGrow: Math.max(count, total === 0 ? 1 : 0.2), background: lane.color }}
              title={`${lane.label}: ${count}`}
              aria-label={`${lane.label}, ${count} tasks`}
              onClick={() => document.getElementById(`kanban-lane-${lane.id}`)?.scrollIntoView({ inline: "start", block: "nearest", behavior: "smooth" })}
            />
          );
        })}
      </div>
      <div className="pmb-kanban" role="list" aria-label="Kanban">
        {lanes.map((column) => {
          const cards = cardsFor(column.id);
          return (
            <section
              key={column.id}
              id={`kanban-lane-${column.id}`}
              className={`pmb-column${over?.lane === column.id ? " is-over" : ""}`}
              aria-label={`${column.label}, ${cards.length} tasks`}
              onDragOver={(event) => {
                if (!canEdit || !column.droppable) return;
                event.preventDefault();
                if (over?.lane !== column.id) setOver({ lane: column.id, before: null });
              }}
              onDrop={(event) => {
                event.preventDefault();
                place(column.id, over?.lane === column.id ? over.before : null);
              }}
            >
              <h3 style={{ background: column.color, color: headerInk(column.color) }}>
                <span>{column.label} / {cards.length}</span>
              </h3>
              <div className="pmb-kanban-cards">
                {cards.map((task) => {
                  const subs = subtasksOf(tasks, task.id);
                  const done = subs.filter((item) => item.status === "Done").length;
                  const updates = updateCounts[task.id] ?? 0;
                  return (
                    <article
                      key={task.id}
                      className={`pmb-card${dragId === task.id ? " is-dragging" : ""}${over?.lane === column.id && over.before === task.id ? " is-before" : ""}`}
                      draggable={canEdit && column.droppable}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", task.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDragId(task.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOver(null);
                      }}
                      onDragOver={(event) => {
                        if (!canEdit || !column.droppable || task.id === dragId) return;
                        event.preventDefault();
                        event.stopPropagation();
                        setOver({ lane: column.id, before: task.id });
                      }}
                    >
                      <div className="pmb-card-top">
                        <button type="button" className="pmb-card-title" onClick={() => onOpen(task)}>{task.title}</button>
                        <button type="button" className="pmb-card-updates" aria-label={`Updates for ${task.title}`} onClick={() => onUpdates(task)}>
                          <LucideIcon name="message-circle" size={14} />
                          {updates > 0 ? <span>{updates}</span> : null}
                        </button>
                        <Dropdown
                          trigger={["click"]}
                          menu={{
                            items: [
                              { key: "open", label: "Open" },
                              { key: "updates", label: "Updates" },
                              ...(canEdit ? [
                                { type: "divider" as const },
                                ...lanes.filter((item) => item.droppable && item.id !== column.id).map((item) => ({ key: `move:${item.id}`, label: `Move to ${item.label}` })),
                                { key: "rename", label: "Rename" },
                                { key: "delete", label: "Delete", danger: true },
                              ] : []),
                            ],
                            onClick: ({ key }) => {
                              if (key === "open") onOpen(task);
                              if (key === "updates") onUpdates(task);
                              if (key === "rename") {
                                const title = window.prompt("Task name", task.title);
                                if (title?.trim() && title.trim() !== task.title) onRename(task, title.trim());
                              }
                              if (key === "delete") onDelete(task);
                              if (String(key).startsWith("move:")) {
                                const laneId = String(key).slice(5);
                                const ordered = [...cardsFor(laneId).map((item) => item.id), task.id];
                                onMove(task, laneId, ordered);
                              }
                            },
                          }}
                        >
                          <button type="button" className="pmb-card-more" aria-label={`Actions for ${task.title}`}>···</button>
                        </Dropdown>
                      </div>
                      <button
                        type="button"
                        className="pmb-card-subs"
                        aria-expanded={Boolean(openSubs[task.id])}
                        onClick={() => setOpenSubs((current) => ({ ...current, [task.id]: !current[task.id] }))}
                      >
                        <span>Subtasks</span>
                        <span>{subs.length === 0 ? "" : `${done}/${subs.length}`}</span>
                      </button>
                      {openSubs[task.id] ? (
                        subs.length === 0 ? <p className="pmb-card-sub-empty">No subtasks</p> : (
                          <ul className="pmb-card-sub-list">
                            {subs.map((item) => (
                              <li key={item.id}>
                                <button type="button" onClick={() => onOpen(item)}>{item.title}</button>
                                <small>{item.status}</small>
                              </li>
                            ))}
                          </ul>
                        )
                      ) : null}
                    </article>
                  );
                })}
              </div>
              {canEdit && column.droppable ? <ColumnAdd label={column.label} onAdd={(title) => onAdd(column.id, title)} /> : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function headerInk(color: string): string {
  const value = color.toLowerCase();
  if (value === "#c4c4c4" || value === "#bdbdbd") return "#323338";
  return "#fff";
}

function ColumnAdd({ label, onAdd }: { label: string; onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="pmb-add-row"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        onAdd(title.trim());
        setTitle("");
      }}
    >
      <LucideIcon name="plus" size={14} />
      <input aria-label={`Add task to ${label}`} placeholder="Add task" value={title} onChange={(event) => setTitle(event.target.value)} />
    </form>
  );
}

export function columnPatch(groupBy: BoardGroupBy, columnId: string): Partial<PmBoardTask> {
  if (groupBy === "status") return { status: columnId };
  if (groupBy === "priority") return { priority: columnId };
  return { groupId: columnId };
}

function labelLanes(labels: BoardLabel[], kind: "status" | "priority", tasks: PmBoardTask[]) {
  const active = selectableLabels(labels, kind);
  const used = tasks.filter((task) => !task.parentTaskId).map((task) => kind === "status" ? task.status : task.priority);
  const extras = [...new Set(used.filter((id) => id && !active.some((label) => label.id === id)))];
  return [
    ...active.map((label) => ({ id: label.id, label: label.name, color: label.color, droppable: true })),
    ...extras.map((id) => ({ id, label: labelName(labels, kind, id), color: labelColor(labels, kind, id, "#c4c4c4"), droppable: false })),
    ...(kind === "status" ? [{ id: BLANK_ID, label: "Blank", color: "#0086c9", droppable: false }] : []),
  ];
}
