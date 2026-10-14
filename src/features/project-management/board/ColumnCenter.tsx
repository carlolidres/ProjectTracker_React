import { useEffect, useMemo, useState } from "react";
import { Input, Modal } from "antd";
import { LucideIcon, type LucideIconName } from "@/components/common/lucide-icon";
import {
  COLUMN_CATEGORIES,
  COLUMN_TYPES,
  builtinColumnKey,
  defaultColumnSettings,
  optionList,
  type BoardColumn,
  type ColumnCategory,
} from "@/features/project-management/board/columnCatalog";

const COLUMN_ICONS: Record<string, LucideIconName> = {
  status: "columns",
  priority: "alert-triangle",
  label: "layers",
  people: "user",
  date: "calendar",
  timeline: "calendar",
  numbers: "columns",
  text: "file-text",
  document: "file-text",
  connect: "link",
  mirror: "link",
  checkbox: "check-circle",
  link: "link",
  clock: "clock",
  itemId: "clipboard-list",
  phone: "user",
  location: "layers",
  files: "file-text",
  tags: "layers",
  vote: "check-circle",
  rating: "check-circle",
  created: "clock",
  updated: "clock",
  autoNumber: "columns",
  progress: "columns",
  dependencies: "link",
  formula: "columns",
  timer: "clock",
  dropdown: "filter",
  button: "plus",
  week: "calendar",
  hour: "clock",
  email: "file-text",
  country: "layers",
  color: "layers",
};

export function ColumnCenter({
  open,
  columns,
  onClose,
  configureId,
  onAdd,
  onFocusBuiltin,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  columns: BoardColumn[];
  configureId?: string | null;
  onClose: () => void;
  onAdd: (type: string, title: string, settings: Record<string, unknown>) => Promise<void>;
  onFocusBuiltin: (type: string) => void;
  onUpdate: (column: BoardColumn, patch: { title?: string; settings?: Record<string, unknown> }) => Promise<void>;
  onDelete: (column: BoardColumn) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ColumnCategory>("featured");
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => {
    if (open && configureId) setEditing(configureId);
  }, [configureId, open]);
  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => COLUMN_TYPES.filter((item) => {
    const matchesCategory = category === "featured" ? item.featured || item.category === "essentials" : item.category === category;
    if (!matchesCategory && category !== "featured") return false;
    if (category === "featured" && !item.featured && item.category !== "essentials") return false;
    if (!needle) return category === "featured" ? Boolean(item.featured) || item.category === "essentials" : item.category === category;
    return `${item.title} ${item.description} ${item.type}`.toLowerCase().includes(needle);
  }), [category, needle]);

  return (
    <Modal
      className="pmb-column-center"
      title="Column Center"
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(1100px, 94vw)"
      destroyOnHidden
    >
      <div className="pmb-column-layout">
        <aside>
          <p>Categories</p>
          {COLUMN_CATEGORIES.map((item) => (
            <button key={item.id} type="button" className={category === item.id ? "is-active" : ""} onClick={() => setCategory(item.id)}>
              {item.label}
            </button>
          ))}
        </aside>
        <div className="pmb-column-pane">
          <div className="pmb-column-search">
            <Input allowClear prefix={<LucideIcon name="search" size={14} />} aria-label="Search columns" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="pmb-column-catalog">
          {visible.length === 0 ? <p className="pmb-column-empty">No columns match that search.</p> : null}
          {category === "featured" && !needle ? <h3>Featured</h3> : <h3>{COLUMN_CATEGORIES.find((item) => item.id === category)?.label}</h3>}
          <div className="pmb-column-grid">
            {(category === "featured" && !needle ? visible.filter((item) => item.featured) : visible).map((item) => (
              <ColumnCard key={item.type} item={item} columns={columns} featured={category === "featured" && !needle} onAdd={onAdd} onFocusBuiltin={onFocusBuiltin} onConfigure={setEditing} />
            ))}
          </div>
          {category === "featured" && !needle ? (
            <>
              <h3>Essentials</h3>
              <div className="pmb-column-grid">
                {COLUMN_TYPES.filter((item) => item.category === "essentials" && !item.featured).map((item) => (
                  <ColumnCard key={item.type} item={item} columns={columns} onAdd={onAdd} onFocusBuiltin={onFocusBuiltin} onConfigure={setEditing} />
                ))}
              </div>
            </>
          ) : null}
          {editing ? (
            <ColumnSettings
              column={columns.find((item) => item.id === editing) ?? null}
              columns={columns}
              onClose={() => setEditing(null)}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ColumnCard({
  item,
  columns,
  featured,
  onAdd,
  onFocusBuiltin,
  onConfigure,
}: {
  item: (typeof COLUMN_TYPES)[number];
  columns: BoardColumn[];
  featured?: boolean;
  onAdd: (type: string, title: string, settings: Record<string, unknown>) => Promise<void>;
  onFocusBuiltin: (type: string) => void;
  onConfigure: (id: string) => void;
}) {
  const builtin = builtinColumnKey(item.type);
  const added = columns.filter((column) => column.type === item.type);
  return (
    <article className={featured ? "is-featured" : ""}>
      <div className="pmb-column-card-main">
        <span className="pmb-column-icon" style={{ background: item.color }}>
          <LucideIcon name={COLUMN_ICONS[item.type] ?? "columns"} size={18} />
        </span>
        <div>
          <strong>{item.title}</strong>
          <p>{item.description}</p>
        </div>
      </div>
      <div className="pmb-column-card-actions">
        {builtin ? (
          <button type="button" onClick={() => onFocusBuiltin(item.type)}>On this board</button>
        ) : (
          <>
            {added.length > 0 ? <span className="pmb-column-added">Added</span> : null}
            <button type="button" onClick={() => void onAdd(item.type, added.length ? `${item.title} ${added.length + 1}` : item.title, defaultColumnSettings(item.type))}>
              {added.length ? "Add another" : "Add to board"}
            </button>
          </>
        )}
        {added.map((column) => (
          <button key={column.id} type="button" onClick={() => onConfigure(column.id)}>Configure</button>
        ))}
      </div>
    </article>
  );
}

function ColumnSettings({
  column,
  columns,
  onClose,
  onUpdate,
  onDelete,
}: {
  column: BoardColumn | null;
  columns: BoardColumn[];
  onClose: () => void;
  onUpdate: (column: BoardColumn, patch: { title?: string; settings?: Record<string, unknown> }) => Promise<void>;
  onDelete: (column: BoardColumn) => Promise<void>;
}) {
  const [title, setTitle] = useState(column?.title ?? "");
  const [options, setOptions] = useState(column ? optionList(column.settings).join("\n") : "");
  const [expression, setExpression] = useState(column ? String(column.settings.expression || "") : "");
  const [timeZone, setTimeZone] = useState(column ? String(column.settings.timeZone || "Asia/Manila") : "Asia/Manila");
  const [sourceColumnId, setSourceColumnId] = useState(column ? String(column.settings.sourceColumnId || "") : "");
  if (!column) return null;
  const hasOptions = ["status", "priority", "label", "dropdown"].includes(column.type);
  return (
    <form
      className="pmb-column-settings"
      onSubmit={(event) => {
        event.preventDefault();
        const settings = { ...column.settings };
        if (hasOptions) settings.options = options.split("\n").map((item) => item.trim()).filter(Boolean);
        if (column.type === "formula") settings.expression = expression;
        if (column.type === "clock") settings.timeZone = timeZone;
        if (column.type === "mirror") settings.sourceColumnId = sourceColumnId;
        void onUpdate(column, { title: title.trim() || column.title, settings }).then(onClose);
      }}
    >
      <h3>Configure {column.title}</h3>
      <Input aria-label="Column name" value={title} onChange={(event) => setTitle(event.target.value)} />
      {hasOptions ? <textarea aria-label="Choices" value={options} onChange={(event) => setOptions(event.target.value)} /> : null}
      {column.type === "formula" ? <Input aria-label="Formula" placeholder="{Numbers} + 1" value={expression} onChange={(event) => setExpression(event.target.value)} /> : null}
      {column.type === "clock" ? <Input aria-label="Timezone" value={timeZone} onChange={(event) => setTimeZone(event.target.value)} /> : null}
      {column.type === "mirror" ? (
        <select aria-label="Source column" value={sourceColumnId} onChange={(event) => setSourceColumnId(event.target.value)}>
          <option value="">Source column</option>
          {columns.filter((item) => item.id !== column.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      ) : null}
      <div>
        <button type="submit">Save</button>
        {column.settings.hidden === true ? (
          <button type="button" onClick={() => void onUpdate(column, { settings: { ...column.settings, hidden: false } }).then(onClose)}>Show on board</button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Remove ${column.title}? Cell values for this column will be hidden.`)) {
              void onDelete(column).then(onClose);
            }
          }}
        >
          Delete column
        </button>
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </form>
  );
}
