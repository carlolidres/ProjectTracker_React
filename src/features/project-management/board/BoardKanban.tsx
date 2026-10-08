import { Dropdown, Empty } from "antd";
import type { Profile } from "@/types";
import { LucideIcon } from "@/components/common/lucide-icon";
import {
  BOARD_PRIORITIES,
  BOARD_STATUSES,
  PRIORITY_COLOR,
  STATUS_COLOR,
  subtasksOf,
  type BoardGroupBy,
  type BoardPriority,
  type BoardStatus,
  type PmBoardTask,
  type PmGroup,
} from "@/features/project-management/board/boardRules";
import { OwnerAvatar, personName, timelineLabel } from "@/features/project-management/board/boardUi";
import { useState } from "react";

export function BoardKanban({
  groupBy,
  groups,
  tasks,
  profiles,
  canEdit,
  onOpen,
  onMove,
  onAdd,
}: {
  groupBy: BoardGroupBy;
  groups: PmGroup[];
  tasks: PmBoardTask[];
  profiles: Profile[];
  canEdit: boolean;
  onOpen: (task: PmBoardTask) => void;
  onMove: (task: PmBoardTask, columnId: string) => void;
  onAdd: (columnId: string, title: string) => void;
}) {
  const columns = groupBy === "status"
    ? BOARD_STATUSES.map((status) => ({ id: status, label: status, color: STATUS_COLOR[status] }))
    : groupBy === "priority"
      ? BOARD_PRIORITIES.map((priority) => ({ id: priority, label: priority, color: PRIORITY_COLOR[priority] }))
      : groups.map((group) => ({ id: group.id, label: group.name, color: group.color }));
  const tops = tasks.filter((task) => !task.parentTaskId);
  return (
    <div className="pmb-kanban" role="list" aria-label="Kanban">
      {columns.map((column) => {
        const cards = tops.filter((task) => (
          groupBy === "status" ? task.status === column.id
            : groupBy === "priority" ? task.priority === column.id
              : task.groupId === column.id
        ));
        return (
          <section
            key={column.id}
            className="pmb-column"
            aria-label={column.label}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const id = event.dataTransfer.getData("text/plain");
              const task = tops.find((item) => item.id === id);
              if (task && canEdit) onMove(task, column.id);
            }}
          >
            <h3 style={{ color: column.color }}>
              {column.label}
              <span>{cards.length}</span>
            </h3>
            {cards.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks" /> : null}
            {cards.map((task) => {
              const subs = subtasksOf(tasks, task.id);
              const done = subs.filter((item) => item.status === "Done").length;
              return (
                <article
                  key={task.id}
                  className="pmb-card"
                  draggable={canEdit}
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", task.id)}
                >
                  <button type="button" className="pmb-card-title" onClick={() => onOpen(task)}>{task.title}</button>
                  <div className="pmb-card-meta">
                    <span>{groups.find((group) => group.id === task.groupId)?.name ?? "Group"}</span>
                    <OwnerAvatar name={personName(profiles, task.ownerId)} />
                  </div>
                  <div className="pmb-card-meta">
                    <span className="pmb-chip" style={{ background: PRIORITY_COLOR[task.priority] }}>{task.priority}</span>
                    <span>{timelineLabel(task)}</span>
                    {subs.length > 0 ? <span>{done}/{subs.length}</span> : null}
                  </div>
                  {canEdit ? (
                    <Dropdown
                      trigger={["click"]}
                      menu={{
                        items: columns.filter((item) => item.id !== column.id).map((item) => ({ key: item.id, label: item.label })),
                        onClick: ({ key }) => onMove(task, String(key)),
                      }}
                    >
                      <button type="button" className="pmb-icon-btn" aria-label={`Move ${task.title}`}>Move</button>
                    </Dropdown>
                  ) : null}
                </article>
              );
            })}
            {canEdit ? <ColumnAdd onAdd={(title) => onAdd(column.id, title)} /> : null}
          </section>
        );
      })}
    </div>
  );
}

function ColumnAdd({ onAdd }: { onAdd: (title: string) => void }) {
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
      <input aria-label="Add task" placeholder="Add task" value={title} onChange={(event) => setTitle(event.target.value)} />
    </form>
  );
}

export function columnPatch(groupBy: BoardGroupBy, columnId: string): Partial<PmBoardTask> {
  if (groupBy === "status") return { status: columnId as BoardStatus };
  if (groupBy === "priority") return { priority: columnId as BoardPriority };
  return { groupId: columnId };
}
