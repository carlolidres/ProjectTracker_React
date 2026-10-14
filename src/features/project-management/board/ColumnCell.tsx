import { useEffect, useState } from "react";
import type { Profile } from "@/types";
import { personName, relativeUpdated } from "@/features/project-management/board/boardUi";
import { listTasks, taskFileUrl, uploadTaskFile } from "@/features/project-management/board/boardService";
import type { PmBoardTask, PmProject } from "@/features/project-management/board/boardRules";
import { optionList, type BoardColumn } from "@/features/project-management/board/columnCatalog";
import { evaluateFormula } from "@/features/project-management/board/columnFormula";

const COUNTRIES = ["PH", "US", "GB", "SG", "JP", "CN", "AU", "IN", "DE", "FR", "KR", "MY", "TH", "VN", "ID", "CA", "NZ", "AE", "NL", "CH"];

export function ColumnCell({
  column,
  columns,
  task,
  tasks,
  profiles,
  projects,
  value,
  cells,
  canEdit,
  userId,
  userEmail,
  groupIndex,
  onSave,
  onOpen,
}: {
  column: BoardColumn;
  columns: BoardColumn[];
  task: PmBoardTask;
  tasks: PmBoardTask[];
  profiles: Profile[];
  projects: PmProject[];
  value: unknown;
  cells: Record<string, Record<string, unknown>>;
  canEdit: boolean;
  userId: string;
  userEmail: string;
  groupIndex: number;
  onSave: (value: unknown) => void;
  onOpen: (task: PmBoardTask) => void;
}) {
  if (column.type === "itemId") return <CopyText text={task.id} />;
  if (column.type === "created") return <span>{personName(profiles, task.createdBy)} · {relativeUpdated(task.createdAt)}</span>;
  if (column.type === "updated") return <span>{personName(profiles, task.updatedBy)} · {relativeUpdated(task.updatedAt)}</span>;
  if (column.type === "autoNumber") return <span>{groupIndex}</span>;
  if (column.type === "clock") return <WorldClock zone={String(column.settings.timeZone || "Asia/Manila")} />;
  if (column.type === "formula") {
    const result = evaluateFormula(String(column.settings.expression || ""), (title) => {
      const match = columns.find((item) => item.title.toLowerCase() === title.toLowerCase());
      if (!match) return null;
      const raw = cells[task.id]?.[match.id];
      if (typeof raw === "number" || typeof raw === "string") return raw;
      if (raw && typeof raw === "object" && "number" in raw) return Number((raw as { number: unknown }).number);
      return null;
    });
    return <span>{String(result)}</span>;
  }
  if (column.type === "mirror") return <Mirror column={column} columns={columns} task={task} cells={cells} />;
  if (!canEdit && column.type !== "vote" && column.type !== "timer" && column.type !== "button") {
    return <span>{displayValue(column, value, profiles)}</span>;
  }
  if (column.type === "status" || column.type === "priority" || column.type === "label" || column.type === "dropdown") {
    const options = optionList(column.settings);
    return (
      <select aria-label={column.title} value={typeof value === "string" ? value : ""} disabled={!canEdit} onChange={(event) => onSave(event.target.value)}>
        <option value="">—</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }
  if (column.type === "text" || column.type === "phone" || column.type === "location" || column.type === "email") {
    return <TextCell label={column.title} value={typeof value === "string" ? value : ""} type={column.type === "email" ? "email" : "text"} disabled={!canEdit} onSave={onSave} />;
  }
  if (column.type === "document") {
    return <TextCell label={column.title} value={typeof value === "string" ? value : ""} type="text" disabled={!canEdit} onSave={onSave} />;
  }
  if (column.type === "date") {
    return <input aria-label={column.title} type="date" value={typeof value === "string" ? value : ""} disabled={!canEdit} onChange={(event) => onSave(event.target.value)} />;
  }
  if (column.type === "hour") {
    return <input aria-label={column.title} type="time" value={typeof value === "string" ? value : ""} disabled={!canEdit} onChange={(event) => onSave(event.target.value)} />;
  }
  if (column.type === "week") {
    return <input aria-label={column.title} type="week" value={typeof value === "string" ? value : ""} disabled={!canEdit} onChange={(event) => onSave(event.target.value)} />;
  }
  if (column.type === "color") {
    return <input aria-label={column.title} type="color" value={typeof value === "string" && value ? value : "#579bfc"} disabled={!canEdit} onChange={(event) => onSave(event.target.value)} />;
  }
  if (column.type === "checkbox") {
    return <input aria-label={column.title} type="checkbox" checked={value === true} disabled={!canEdit} onChange={(event) => onSave(event.target.checked)} />;
  }
  if (column.type === "numbers" || column.type === "progress") {
    const number = typeof value === "number" ? value : "";
    return (
      <span className="pmb-cell-progress">
        <input aria-label={column.title} type="number" min={column.type === "progress" ? 0 : undefined} max={column.type === "progress" ? 100 : undefined} value={number} disabled={!canEdit} onChange={(event) => onSave(event.target.value === "" ? null : Number(event.target.value))} />
        {column.type === "progress" && typeof value === "number" ? <span className="pmb-progress-bar"><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></span> : null}
      </span>
    );
  }
  if (column.type === "timeline") {
    const range = value && typeof value === "object" ? value as { start?: string; end?: string } : {};
    return (
      <span className="pmb-cell-range">
        <input aria-label={`${column.title} start`} type="date" value={range.start ?? ""} disabled={!canEdit} onChange={(event) => onSave({ ...range, start: event.target.value })} />
        <input aria-label={`${column.title} end`} type="date" value={range.end ?? ""} disabled={!canEdit} onChange={(event) => onSave({ ...range, end: event.target.value })} />
      </span>
    );
  }
  if (column.type === "link") {
    const link = value && typeof value === "object" ? value as { url?: string; label?: string } : {};
    return (
      <span className="pmb-cell-range">
        <input aria-label={`${column.title} address`} placeholder="https://" value={link.url ?? ""} disabled={!canEdit} onChange={(event) => onSave({ ...link, url: event.target.value })} />
        {safeHref(link.url) ? <a href={safeHref(link.url)} target="_blank" rel="noreferrer">{link.label || "Open"}</a> : null}
      </span>
    );
  }
  if (column.type === "people" || column.type === "tags" || column.type === "dependencies") {
    return <MultiCell column={column} task={task} tasks={tasks} profiles={profiles} value={value} canEdit={canEdit} onSave={onSave} />;
  }
  if (column.type === "country") {
    const code = typeof value === "string" ? value : "";
    return (
      <select aria-label={column.title} value={COUNTRIES.includes(code) ? code : ""} disabled={!canEdit} onChange={(event) => onSave(event.target.value)}>
        <option value="">—</option>
        {COUNTRIES.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    );
  }
  if (column.type === "rating") {
    const score = typeof value === "number" ? value : 0;
    return (
      <span>
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" aria-label={`${star} star`} disabled={!canEdit} onClick={() => onSave(score === star ? null : star)}>{star <= score ? "★" : "☆"}</button>
        ))}
      </span>
    );
  }
  if (column.type === "vote") {
    const voters = Array.isArray(value) ? value.map(String) : [];
    const mine = voters.includes(userId);
    return (
      <button type="button" onClick={() => onSave(mine ? voters.filter((id) => id !== userId) : [...voters, userId])}>
        {mine ? "Voted" : "Vote"} · {voters.length}
      </button>
    );
  }
  if (column.type === "button") {
    return <button type="button" onClick={() => onOpen(task)}>{String(column.settings.label || "Open")}</button>;
  }
  if (column.type === "timer") return <Timer value={value} canEdit={canEdit} onSave={onSave} />;
  if (column.type === "files") return <FilesCell task={task} value={value} canEdit={canEdit} userEmail={userEmail} onSave={onSave} />;
  if (column.type === "connect") return <ConnectCell task={task} projects={projects} value={value} canEdit={canEdit} onSave={onSave} />;
  return <span>{displayValue(column, value, profiles)}</span>;
}

function TextCell({ label, value, type, disabled, onSave }: { label: string; value: string; type: string; disabled: boolean; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      aria-label={label}
      type={type}
      value={draft}
      placeholder="Empty"
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => { if (draft !== value) onSave(draft); }}
    />
  );
}

function CopyText({ text }: { text: string }) {
  return <button type="button" onClick={() => void navigator.clipboard.writeText(text)}>{text.slice(0, 8)}</button>;
}

function WorldClock({ zone }: { zone: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const paint = () => {
      try {
        setLabel(new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(new Date()));
      } catch {
        setLabel("Unknown timezone");
      }
    };
    paint();
    const timer = window.setInterval(paint, 30000);
    return () => window.clearInterval(timer);
  }, [zone]);
  return <span title={`${zone}. Daylight saving follows that timezone.`}>{label}</span>;
}

function Timer({ value, canEdit, onSave }: { value: unknown; canEdit: boolean; onSave: (value: unknown) => void }) {
  const timer = value && typeof value === "object" ? value as { elapsedMs?: number; startedAt?: string | null } : {};
  const running = Boolean(timer.startedAt);
  const elapsed = Number(timer.elapsedMs || 0) + (running && timer.startedAt ? Date.now() - Date.parse(timer.startedAt) : 0);
  const minutes = Math.floor(elapsed / 60000);
  return (
    <button
      type="button"
      disabled={!canEdit}
      onClick={() => {
        if (running) onSave({ elapsedMs: elapsed, startedAt: null });
        else onSave({ elapsedMs: Number(timer.elapsedMs || 0), startedAt: new Date().toISOString() });
      }}
    >
      {running ? "Stop" : "Start"} · {minutes}m
    </button>
  );
}

function FilesCell({ task, value, canEdit, userEmail, onSave }: { task: PmBoardTask; value: unknown; canEdit: boolean; userEmail: string; onSave: (value: unknown) => void }) {
  const files = Array.isArray(value) ? value as { name: string; path: string }[] : [];
  return (
    <span className="pmb-cell-files">
      {files.map((file) => (
        <button key={file.path} type="button" onClick={() => void taskFileUrl(file.path).then((url) => window.open(url, "_blank", "noopener"))}>{file.name}</button>
      ))}
      {canEdit ? (
        <input
          aria-label="Add file"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void uploadTaskFile(task, file, userEmail).then((path) => {
              onSave([...files, { name: file.name, path }]);
            });
          }}
        />
      ) : null}
    </span>
  );
}

function ConnectCell({ task, projects, value, canEdit, onSave }: { task: PmBoardTask; projects: PmProject[]; value: unknown; canEdit: boolean; onSave: (value: unknown) => void }) {
  const links = Array.isArray(value) ? value as { projectId: string; taskId: string; title: string }[] : [];
  const [projectId, setProjectId] = useState(task.projectId);
  const [choices, setChoices] = useState<PmBoardTask[]>([]);
  useEffect(() => {
    let cancel = false;
    void listTasks(projectId).then((rows) => { if (!cancel) setChoices(rows); }).catch(() => { if (!cancel) setChoices([]); });
    return () => { cancel = true; };
  }, [projectId]);
  return (
    <span className="pmb-cell-range">
      {links.map((link) => <span key={link.taskId}>{link.title}</span>)}
      {canEdit ? (
        <>
          <select aria-label="Board" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {projects.filter((item) => !item.archivedAt).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select
            aria-label="Linked task"
            value=""
            onChange={(event) => {
              const linked = choices.find((item) => item.id === event.target.value);
              if (!linked || linked.id === task.id) return;
              onSave([...links.filter((item) => item.taskId !== linked.id), { projectId, taskId: linked.id, title: linked.title }]);
            }}
          >
            <option value="">Link a task</option>
            {choices.filter((item) => item.id !== task.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </>
      ) : null}
    </span>
  );
}

function MultiCell({ column, task, tasks, profiles, value, canEdit, onSave }: { column: BoardColumn; task: PmBoardTask; tasks: PmBoardTask[]; profiles: Profile[]; value: unknown; canEdit: boolean; onSave: (value: unknown) => void }) {
  const selected = Array.isArray(value) ? value.map(String) : [];
  if (column.type === "people") {
    return (
      <select aria-label={column.title} value="" disabled={!canEdit} onChange={(event) => { if (event.target.value) onSave([...new Set([...selected, event.target.value])]); }}>
        <option value="">{selected.map((id) => personName(profiles, id)).join(", ") || "Add person"}</option>
        {profiles.map((person) => <option key={person.id} value={person.id}>{personName(profiles, person.id)}</option>)}
      </select>
    );
  }
  if (column.type === "dependencies") {
    return (
      <select aria-label={column.title} value="" disabled={!canEdit} onChange={(event) => { if (event.target.value && event.target.value !== task.id) onSave([...new Set([...selected, event.target.value])]); }}>
        <option value="">{selected.length ? `${selected.length} linked` : "Add predecessor"}</option>
        {tasks.filter((item) => item.id !== task.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
    );
  }
  return <TextCell label={column.title} value={selected.join(", ")} type="text" disabled={!canEdit} onSave={(text) => onSave(text.split(",").map((item) => item.trim()).filter(Boolean))} />;
}

function Mirror({ column, columns, task, cells }: { column: BoardColumn; columns: BoardColumn[]; task: PmBoardTask; cells: Record<string, Record<string, unknown>> }) {
  const sourceId = String(column.settings.sourceColumnId || "");
  const source = columns.find((item) => item.id === sourceId);
  const connect = columns.find((item) => item.type === "connect");
  const links = connect && Array.isArray(cells[task.id]?.[connect.id]) ? cells[task.id][connect.id] as { taskId: string; title: string }[] : [];
  const linkedId = links[0]?.taskId;
  if (!source || !linkedId) return <span>Choose a Connect Boards column and a source column.</span>;
  const mirrored = cells[linkedId]?.[source.id];
  if (mirrored === undefined) return <span>{links[0]?.title || "Linked"} · open that board to read the value</span>;
  return <span>{typeof mirrored === "string" || typeof mirrored === "number" ? String(mirrored) : JSON.stringify(mirrored)}</span>;
}

function displayValue(column: BoardColumn, value: unknown, profiles: Profile[]): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (column.type === "people") return value.map((id) => personName(profiles, String(id))).join(", ");
    return value.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join(", ");
  }
  return JSON.stringify(value);
}

function safeHref(url: string | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}
