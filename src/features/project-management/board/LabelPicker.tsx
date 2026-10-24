import { App, Dropdown } from "antd";
import { useState, type ReactNode } from "react";
import {
  LABEL_PALETTE,
  labelSaveError,
  nextLabelColor,
  selectableLabels,
  type BoardLabel,
} from "@/features/project-management/board/boardLabels";
import type { PmBoardTask } from "@/features/project-management/board/boardRules";

export function LabelPicker({
  kind,
  value,
  labels,
  tasks,
  canEdit,
  onAssign,
  onSave,
  children,
}: {
  kind: BoardLabel["kind"];
  value: string;
  labels: BoardLabel[];
  tasks: PmBoardTask[];
  canEdit: boolean;
  onAssign: (id: string) => void;
  onSave: (labels: BoardLabel[]) => Promise<void>;
  children: ReactNode;
}) {
  const { message, modal } = App.useApp();
  const saved = labels.filter((item) => item.kind === kind);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BoardLabel[]>(saved);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [describeId, setDescribeId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!canEdit) return children;
  const choices = selectableLabels(editing ? draft : saved, kind);
  const shown = draft.filter((item) => !item.retired).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const emptyCount = Math.max(2, 8 - shown.length);
  const emptyColors = Array.from({ length: emptyCount }, (_, index) => nextLabelColor([...shown.map((item) => item.color), ...emptyColorsBefore(shown.map((item) => item.color), index)]));

  const reset = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEditing(false);
      setDraft(saved);
      setMenuId(null);
      setPaletteId(null);
      setDescribeId(null);
      setError("");
    }
  };

  const addLabel = (color: string) => {
    const id = crypto.randomUUID();
    setDraft((current) => [
      ...current,
      {
        id,
        kind,
        name: "New label",
        color,
        order: current.filter((item) => !item.retired).length,
        active: true,
        retired: false,
        description: "",
        semantic: "",
      },
    ]);
    setDescribeId(null);
    setPaletteId(null);
    setMenuId(null);
  };

  const update = (id: string, patch: Partial<BoardLabel>) => {
    setDraft((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const remove = (label: BoardLabel) => {
    const count = tasks.filter((task) => (kind === "status" ? task.status : task.priority) === label.id).length;
    modal.confirm({
      title: `Delete ${label.name || "this label"}?`,
      content: count
        ? `${count} task${count === 1 ? "" : "s"} will keep “${label.name}” until you choose another label. It leaves the menu and is not reassigned.`
        : "No task uses this label. Apply will remove it.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => {
        setDraft((current) => (count
          ? current.map((item) => (item.id === label.id ? { ...item, active: false, retired: true } : item))
          : current.filter((item) => item.id !== label.id)));
        setMenuId(null);
      },
    });
  };

  const apply = async () => {
    const problem = labelSaveError(draft);
    if (problem) {
      setError(problem);
      return;
    }
    const visible = draft.filter((item) => !item.retired);
    const ordered = [
      ...visible.map((item, order) => ({ ...item, name: item.name.trim(), order })),
      ...draft.filter((item) => item.retired),
    ];
    setSaving(true);
    setError("");
    try {
      await onSave(ordered);
      message.success("Labels saved");
      setEditing(false);
      setMenuId(null);
      setPaletteId(null);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not save labels.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dropdown
      open={open}
      trigger={["click"]}
      placement="bottomLeft"
      onOpenChange={reset}
      dropdownRender={() => (
        <div
          className={`pmb-label-menu${editing ? " pmb-label-board" : kind === "priority" ? " pmb-priority-menu" : ""}`}
          role="menu"
          aria-label={kind === "status" ? "Status" : "Priority"}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            if (menuId || paletteId) {
              setMenuId(null);
              setPaletteId(null);
              return;
            }
            setDraft(saved);
            setEditing(false);
            setError("");
          }}
        >
          {editing ? (
            <>
              <div className="pmb-label-grid">
                {shown.map((label) => (
                  <div
                    key={label.id}
                    className={`pmb-label-card${label.active ? "" : " is-inactive"}${dragId === label.id ? " is-dragging" : ""}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (!dragId || dragId === label.id) return;
                      setDraft((current) => reorder(current, dragId, label.id));
                      setDragId(null);
                    }}
                  >
                    <button
                      type="button"
                      className="pmb-label-swatch"
                      draggable
                      title={label.description || "Change color. Drag to reorder."}
                      style={{ background: label.color }}
                      aria-label={`${label.name || "Label"} color`}
                      onDragStart={() => setDragId(label.id)}
                      onClick={() => {
                        setPaletteId(paletteId === label.id ? null : label.id);
                        setMenuId(null);
                      }}
                    />
                    <input
                      aria-label={`${kind} label name`}
                      value={label.name}
                      placeholder="Label"
                      onChange={(event) => update(label.id, { name: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                    />
                    <button type="button" className="pmb-label-more" aria-label={`${label.name || "Label"} actions`} onClick={() => { setMenuId(menuId === label.id ? null : label.id); setPaletteId(null); }}>···</button>
                    {paletteId === label.id ? (
                      <div className="pmb-label-colors" role="listbox" aria-label="Label colors">
                        {LABEL_PALETTE.map((color) => (
                          <button key={color} type="button" style={{ background: color }} aria-label={color} onClick={() => { update(label.id, { color }); setPaletteId(null); }} />
                        ))}
                      </div>
                    ) : null}
                    {menuId === label.id ? (
                      <div className="pmb-label-actions" role="menu">
                        <button type="button" onClick={() => { setDescribeId(label.id); setMenuId(null); }}>Add label description</button>
                        <button type="button" onClick={() => { update(label.id, { active: !label.active }); setMenuId(null); }}>{label.active ? "Deactivate label" : "Activate label"}</button>
                        <button type="button" onClick={() => remove(label)}>Delete label</button>
                      </div>
                    ) : null}
                    {describeId === label.id || label.description ? (
                      <input
                        className="pmb-label-note"
                        aria-label={`${label.name || "Label"} description`}
                        placeholder="Description"
                        value={label.description}
                        onChange={(event) => update(label.id, { description: event.target.value })}
                      />
                    ) : null}
                  </div>
                ))}
                {emptyColors.map((color, index) => (
                  <button key={`${color}-${index}`} type="button" className="pmb-label-card is-empty" onClick={() => addLabel(color)}>
                    <span className="pmb-label-swatch" style={{ background: color }} />
                    Add Label
                  </button>
                ))}
              </div>
              <button type="button" className="pmb-label-new" onClick={() => addLabel(nextLabelColor(shown.map((item) => item.color)))}>+ New label</button>
              {error ? <p className="pmb-range-error">{error}</p> : null}
              <button type="button" className="pmb-label-apply" disabled={saving} onClick={() => void apply()}>{saving ? "Saving" : "Apply"}</button>
            </>
          ) : kind === "status" ? (
            <>
              {choices.map((label) => (
                <button key={label.id} type="button" className={`pmb-label-option${label.id === value ? " is-current" : ""}`} style={{ background: label.color }} onClick={() => { onAssign(label.id); reset(false); }}>
                  {label.name}
                </button>
              ))}
              <button type="button" className="pmb-label-edit" onClick={() => { setDraft(saved); setEditing(true); }}>Edit Labels</button>
            </>
          ) : (
            <>
              {choices.map((label) => (
                <button key={label.id} type="button" className={`pmb-priority-card${label.id === value ? " is-picked" : ""}`} onClick={() => { onAssign(label.id); reset(false); }}>
                  <span className="pmb-priority-mark" style={{ background: label.color }} />
                  {label.name}
                </button>
              ))}
              <button type="button" className="pmb-label-edit" onClick={() => { setDraft(saved); setEditing(true); }}>Edit Labels</button>
            </>
          )}
        </div>
      )}
    >
      <button type="button" className="pmb-fill-btn" aria-label={`${kind} ${value}`}>{children}</button>
    </Dropdown>
  );
}

function emptyColorsBefore(used: string[], index: number): string[] {
  const colors: string[] = [];
  for (let cursor = 0; cursor < index; cursor += 1) colors.push(nextLabelColor([...used, ...colors]));
  return colors;
}

function reorder(labels: BoardLabel[], fromId: string, toId: string): BoardLabel[] {
  const visible = labels.filter((item) => !item.retired);
  const retired = labels.filter((item) => item.retired);
  const from = visible.findIndex((item) => item.id === fromId);
  const to = visible.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0) return labels;
  const next = [...visible];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return [...next.map((item, order) => ({ ...item, order })), ...retired];
}
