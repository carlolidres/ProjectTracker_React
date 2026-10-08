import { Button, DatePicker, Drawer, Input, Select } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import {
  BOARD_PRIORITIES,
  BOARD_STATUSES,
  subtasksOf,
  type PmBoardTask,
  type PmGroup,
} from "@/features/project-management/board/boardRules";
import { personName } from "@/features/project-management/board/boardUi";
import type { Profile } from "@/types";

export function TaskDetailsDrawer({
  task,
  tasks,
  groups,
  profiles,
  canEdit,
  onClose,
  onOpen,
  onPatch,
  onAddSubtask,
  onDelete,
}: {
  task: PmBoardTask | null;
  tasks: PmBoardTask[];
  groups: PmGroup[];
  profiles: Profile[];
  canEdit: boolean;
  onClose: () => void;
  onOpen: (task: PmBoardTask) => void;
  onPatch: (task: PmBoardTask, patch: Partial<PmBoardTask>) => void;
  onAddSubtask: (task: PmBoardTask, title: string) => void;
  onDelete: (task: PmBoardTask) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subtask, setSubtask] = useState("");
  useEffect(() => {
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setSubtask("");
  }, [task?.id, task?.title, task?.description]);
  const children = task && !task.parentTaskId ? subtasksOf(tasks, task.id) : task ? [] : [];
  return (
    <Drawer
      title={task ? "Task details" : "Task"}
      open={Boolean(task)}
      onClose={onClose}
      width={420}
      extra={task && canEdit ? <Button danger onClick={() => onDelete(task)}>Delete</Button> : null}
    >
      {task ? (
        <div className="pmb-drawer">
          <label>
            Title
            <Input
              aria-label="Task title"
              value={title}
              disabled={!canEdit}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => {
                if (task && title.trim() && title !== task.title) onPatch(task, { title: title.trim() });
              }}
            />
          </label>
          <label>
            Description
            <Input.TextArea
              aria-label="Task description"
              value={description}
              disabled={!canEdit}
              onChange={(event) => setDescription(event.target.value)}
              onBlur={() => {
                if (task && description !== task.description) onPatch(task, { description });
              }}
            />
          </label>
          <label>
            Group
            <Select
              aria-label="Group"
              disabled={!canEdit}
              value={task.groupId}
              options={groups.map((group) => ({ value: group.id, label: group.name }))}
              onChange={(groupId) => onPatch(task, { groupId })}
            />
          </label>
          <label>
            Owner
            <Select
              aria-label="Owner"
              showSearch
              optionFilterProp="label"
              disabled={!canEdit}
              value={task.ownerId || undefined}
              options={[{ value: "", label: "Unassigned" }, ...profiles.map((profile) => ({ value: profile.id, label: personName(profiles, profile.id) }))]}
              onChange={(ownerId) => onPatch(task, { ownerId })}
            />
          </label>
          <label>
            Status
            <Select
              aria-label="Status"
              disabled={!canEdit}
              value={task.status}
              options={BOARD_STATUSES.map((status) => ({ value: status, label: status }))}
              onChange={(status) => onPatch(task, { status })}
            />
          </label>
          <label>
            Priority
            <Select
              aria-label="Priority"
              disabled={!canEdit}
              value={task.priority}
              options={BOARD_PRIORITIES.map((priority) => ({ value: priority, label: priority }))}
              onChange={(priority) => onPatch(task, { priority })}
            />
          </label>
          <label>
            Start
            <DatePicker
              aria-label="Start date"
              disabled={!canEdit}
              value={task.startDate ? dayjs(task.startDate) : null}
              onChange={(value) => onPatch(task, { startDate: value ? value.format("YYYY-MM-DD") : "" })}
            />
          </label>
          <label>
            Due
            <DatePicker
              aria-label="Due date"
              disabled={!canEdit}
              value={task.dueDate ? dayjs(task.dueDate) : null}
              onChange={(value) => onPatch(task, { dueDate: value ? value.format("YYYY-MM-DD") : "" })}
            />
          </label>
          {!task.parentTaskId ? (
            <div>
              <strong>Subtasks</strong>
              <ul>
                {children.map((child) => (
                  <li key={child.id}>
                    <button type="button" onClick={() => onOpen(child)}>{child.title}</button>
                    <span>{child.status}</span>
                  </li>
                ))}
              </ul>
              {canEdit ? (
                <form
                  className="pmb-add-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!subtask.trim()) return;
                    onAddSubtask(task, subtask.trim());
                    setSubtask("");
                  }}
                >
                  <input aria-label="New subtask" placeholder="Add subtask" value={subtask} onChange={(event) => setSubtask(event.target.value)} />
                </form>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}
