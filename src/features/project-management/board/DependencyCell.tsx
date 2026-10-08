import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Popover, Select, Tooltip } from "antd";
import { LucideIcon } from "@/components/common/lucide-icon";
import {
  RELATION_LABEL,
  RELATION_TYPES,
  type PmBoardTask,
  type PmDependency,
  type PmGroup,
  type RelationType,
} from "@/features/project-management/board/boardRules";

interface DraftLink {
  predecessorId: string;
  relation: RelationType;
  lagDays: number;
}

export function DependencyCell({
  task,
  tasks,
  groups,
  links,
  canEdit,
  strictLag,
  onOpen,
  onSave,
}: {
  task: PmBoardTask;
  tasks: PmBoardTask[];
  groups: PmGroup[];
  links: PmDependency[];
  canEdit: boolean;
  strictLag: boolean;
  onOpen: (task: PmBoardTask) => void;
  onSave: (task: PmBoardTask, links: DraftLink[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const mine = links.filter((link) => link.successorId === task.id);
  const needsDates = mine.length > 0 && (!task.startDate || !task.dueDate);
  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      content={(
        <DependencyEditor
          task={task}
          tasks={tasks}
          groups={groups}
          links={links}
          canEdit={canEdit}
          strictLag={strictLag}
          onOpen={onOpen}
          onClose={() => setOpen(false)}
          onSave={async (next) => {
            await onSave(task, next);
            setOpen(false);
          }}
        />
      )}
    >
      <button type="button" className="pmb-dep-cell" aria-label={`Depends on for ${task.title}`}>
        {mine.length === 0 ? (
          <span className="pmb-dep-empty">{needsDates ? "Dates required" : "—"}</span>
        ) : (
          <ChipRow
            items={mine.map((link) => tasks.find((item) => item.id === link.predecessorId)).filter((item): item is PmBoardTask => Boolean(item))}
            groups={groups}
            onOpen={onOpen}
          />
        )}
        {needsDates && mine.length > 0 ? <span className="pmb-dep-note">Dates required</span> : null}
      </button>
    </Popover>
  );
}

function ChipRow({
  items,
  groups,
  onOpen,
}: {
  items: PmBoardTask[];
  groups: PmGroup[];
  onOpen: (task: PmBoardTask) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(items.length);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const chips = [...node.querySelectorAll<HTMLElement>(".pmb-dep-chip")];
    let used = 0;
    let count = chips.length;
    const limit = node.clientWidth - 28;
    for (let index = 0; index < chips.length; index += 1) {
      used += chips[index].offsetWidth + 4;
      if (used > limit) {
        count = Math.max(index, 1);
        break;
      }
    }
    setVisible(count);
  }, [items]);
  return (
    <span ref={ref} className="pmb-dep-chips">
      {items.map((item, index) => (
        <Tooltip key={item.id} title={detail(item, groups)}>
          <span
            className="pmb-dep-chip"
            style={{ display: index < visible ? undefined : "none" }}
            onClick={(event) => {
              event.stopPropagation();
              onOpen(item);
            }}
          >
            <LucideIcon name="link" size={12} />
            {item.title}
          </span>
        </Tooltip>
      ))}
      {items.length > visible ? <span className="pmb-dep-more">+{items.length - visible}</span> : null}
    </span>
  );
}

function DependencyEditor({
  task,
  tasks,
  groups,
  links,
  canEdit,
  strictLag,
  onOpen,
  onClose,
  onSave,
}: {
  task: PmBoardTask;
  tasks: PmBoardTask[];
  groups: PmGroup[];
  links: PmDependency[];
  canEdit: boolean;
  strictLag: boolean;
  onOpen: (task: PmBoardTask) => void;
  onClose: () => void;
  onSave: (links: DraftLink[]) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<DraftLink[]>(() => links
    .filter((link) => link.successorId === task.id)
    .map((link) => ({ predecessorId: link.predecessorId, relation: link.relation, lagDays: link.lagDays })));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const choices = useMemo(() => tasks.filter((item) => {
    if (item.id === task.id) return false;
    const group = groups.find((entry) => entry.id === item.groupId)?.name ?? "";
    const haystack = `${item.title} ${group} ${item.status} ${item.startDate} ${item.dueDate}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [groups, query, task.id, tasks]);

  const toggle = (predecessorId: string) => {
    setDraft((current) => (
      current.some((link) => link.predecessorId === predecessorId)
        ? current.filter((link) => link.predecessorId !== predecessorId)
        : [...current, { predecessorId, relation: "FS", lagDays: 0 }]
    ));
  };

  return (
    <div className="pmb-dep-editor">
      <Input allowClear placeholder="Search tasks" aria-label="Search predecessor tasks" value={query} onChange={(event) => setQuery(event.target.value)} />
      <ul>
        {choices.map((item) => {
          const selected = draft.some((link) => link.predecessorId === item.id);
          const group = groups.find((entry) => entry.id === item.groupId);
          return (
            <li key={item.id}>
              <label>
                <input type="checkbox" checked={selected} disabled={!canEdit} onChange={() => toggle(item.id)} />
                <span>
                  <button type="button" onClick={() => onOpen(item)}>{item.title}</button>
                  <small>{group?.name ?? "Group"} · {item.status} · {item.startDate || "No start"} – {item.dueDate || "No due"}</small>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {draft.map((link) => {
        const predecessor = tasks.find((item) => item.id === link.predecessorId);
        return (
          <div key={link.predecessorId} className="pmb-dep-setting">
            <strong>{predecessor?.title ?? "Task"}</strong>
            <Select
              aria-label="Relationship"
              size="small"
              disabled={!canEdit}
              value={link.relation}
              options={RELATION_TYPES.map((relation) => ({ value: relation, label: RELATION_LABEL[relation] }))}
              onChange={(relation) => setDraft((current) => current.map((item) => (
                item.predecessorId === link.predecessorId ? { ...item, relation } : item
              )))}
            />
            <details>
              <summary>Advanced</summary>
              <label>
                Lead / lag days
                <input
                  type="number"
                  aria-label="Lead or lag days"
                  disabled={!canEdit || !strictLag}
                  value={link.lagDays}
                  onChange={(event) => setDraft((current) => current.map((item) => (
                    item.predecessorId === link.predecessorId ? { ...item, lagDays: Number(event.target.value) } : item
                  )))}
                />
              </label>
              <p>{strictLag ? "Positive days delay this task. Negative days allow overlap." : "Switch scheduling to Strict to apply lead or lag."}</p>
            </details>
            {canEdit ? <button type="button" onClick={() => toggle(link.predecessorId)}>Remove</button> : null}
          </div>
        );
      })}
      {error ? <p className="pmb-dep-error">{error}</p> : null}
      <div className="pmb-dep-actions">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="primary"
          disabled={!canEdit}
          loading={saving}
          onClick={() => {
            setSaving(true);
            setError("");
            void onSave(draft).catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Could not save the dependency.");
              setSaving(false);
            });
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function detail(task: PmBoardTask, groups: PmGroup[]) {
  const group = groups.find((item) => item.id === task.groupId)?.name ?? "Group";
  return `${task.title} · ${group} · ${task.status} · ${task.startDate || "No start"} – ${task.dueDate || "No due"}`;
}
