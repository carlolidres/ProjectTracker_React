import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Button } from "antd";
import { LucideIcon } from "@/components/common/lucide-icon";
import {
  addDays,
  daySpan,
  subtasksOf,
  topLevelTasks,
  type PmBoardTask,
  type PmDependency,
  type PmGroup,
} from "@/features/project-management/board/boardRules";

type Zoom = "day" | "week" | "month";

const PX: Record<Zoom, number> = { day: 56, week: 28, month: 10 };
const SIDE = 300;

function dayParts(date: string): { weekday: string; day: string; weekend: boolean } {
  const parsed = new Date(`${date}T12:00:00`);
  return {
    weekday: parsed.toLocaleDateString("en-US", { weekday: "short" }),
    day: parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weekend: parsed.getDay() === 0 || parsed.getDay() === 6,
  };
}

function shortRange(start: string, due: string): string {
  const left = new Date(`${start}T12:00:00`);
  const right = new Date(`${due}T12:00:00`);
  const month = (date: Date) => date.toLocaleDateString("en-US", { month: "short" });
  if (left.getMonth() === right.getMonth() && left.getFullYear() === right.getFullYear()) {
    return `${month(left)} ${left.getDate()}–${right.getDate()}`;
  }
  return `${month(left)} ${left.getDate()} – ${month(right)} ${right.getDate()}`;
}

function monthBands(start: string, count: number, px: number): { key: string; label: string; width: number }[] {
  const items: { key: string; label: string; width: number }[] = [];
  let index = 0;
  while (index < count) {
    const date = addDays(start, index);
    const month = date.slice(0, 7);
    let span = 1;
    while (index + span < count && addDays(start, index + span).slice(0, 7) === month) span += 1;
    const parsed = new Date(`${date}T12:00:00`);
    items.push({
      key: `${month}-${index}`,
      label: parsed.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      width: span * px,
    });
    index += span;
  }
  return items;
}

function datedSpan(tasks: PmBoardTask[]): { start: string; due: string; days: number } | null {
  const dated = tasks.filter((task) => task.startDate && task.dueDate);
  if (dated.length === 0) return null;
  const start = dated.map((task) => task.startDate).sort()[0];
  const due = dated.map((task) => task.dueDate).sort().at(-1) ?? start;
  return { start, due, days: daySpan(start, due) };
}

export function BoardGantt({
  groups,
  tasks,
  dependencies,
  canEdit,
  onOpen,
  onShift,
}: {
  groups: PmGroup[];
  tasks: PmBoardTask[];
  dependencies: PmDependency[];
  canEdit: boolean;
  onOpen: (task: PmBoardTask) => void;
  onShift: (task: PmBoardTask, startDate: string, dueDate: string) => void;
}) {
  const [zoom, setZoom] = useState<Zoom>("week");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const today = new Date().toISOString().slice(0, 10);
  const px = Math.max(8, Math.round(PX[zoom] * scale));
  const scheduled = tasks.filter((task) => task.startDate && task.dueDate);
  const unscheduled = topLevelTasks(tasks).filter((task) => !task.startDate || !task.dueDate);
  const starts = scheduled.map((task) => task.startDate).sort();
  const dues = scheduled.map((task) => task.dueDate).sort();
  const rangeStart = addDays(starts[0] ?? today, -3 + offset);
  const rangeEnd = addDays(dues.at(-1) ?? today, 14 + offset);
  const range = {
    start: rangeStart,
    end: rangeEnd < addDays(rangeStart, 21) ? addDays(rangeStart, 28) : rangeEnd,
  };
  const days = Math.max(daySpan(range.start, range.end), 1);
  const width = days * px;
  const todayLeft = daySpan(range.start, today) - 1;
  const gridRef = useRef<HTMLDivElement>(null);
  const months = monthBands(range.start, days, px);

  return (
    <section className={`pmb-gantt is-${zoom}`} aria-label="Gantt" style={{ ["--pmb-col" as string]: `${px}px` }}>
      <div className="pmb-view-tools">
        <Button onClick={() => setOffset((value) => value - (zoom === "month" ? 30 : 7))}>Previous</Button>
        <Button onClick={() => setOffset(0)}>Today</Button>
        <Button onClick={() => setOffset((value) => value + (zoom === "month" ? 30 : 7))}>Next</Button>
        {(["day", "week", "month"] as const).map((value) => (
          <Button key={value} type={zoom === value ? "primary" : "default"} onClick={() => setZoom(value)}>
            {value[0].toUpperCase()}{value.slice(1)}
          </Button>
        ))}
        <Button onClick={() => { setOffset(0); setScale(1); }}>Auto fit</Button>
        <Button aria-label="Zoom out" onClick={() => setScale((value) => Math.max(0.6, Number((value - 0.2).toFixed(1))))}>−</Button>
        <Button aria-label="Zoom in" onClick={() => setScale((value) => Math.min(2, Number((value + 0.2).toFixed(1))))}>+</Button>
      </div>
      <div className="pmb-gantt-scroll">
        <div ref={gridRef} className="pmb-gantt-grid" style={{ minWidth: SIDE + width }}>
          <DependencyArrows gridRef={gridRef} dependencies={dependencies} tasks={tasks} layoutKey={`${zoom}:${width}:${scale}:${Object.values(collapsed).join()}`} />
          {todayLeft >= 0 && todayLeft < days ? <span className="pmb-today" style={{ left: SIDE + todayLeft * px + px / 2 }} /> : null}
          <div className="pmb-gantt-row pmb-gantt-head-row">
            <div className="pmb-gantt-side pmb-gantt-head">Task</div>
            <div className="pmb-gantt-time pmb-gantt-head" style={{ width }}>
              <div className="pmb-gantt-months">
                {months.map((month) => <span key={month.key} style={{ width: month.width }}>{month.label}</span>)}
              </div>
              <div className="pmb-gantt-days">
                {zoom === "day" ? Array.from({ length: days }, (_, index) => {
                  const date = addDays(range.start, index);
                  const parts = dayParts(date);
                  return (
                    <span key={date} className={parts.weekend ? "is-weekend" : undefined} style={{ width: px }} title={date}>
                      <strong>{parts.weekday}</strong>
                      {parts.day}
                    </span>
                  );
                }) : Array.from({ length: Math.ceil(days / (zoom === "week" ? 7 : 30)) }, (_, index) => {
                  const step = zoom === "week" ? 7 : 30;
                  const date = addDays(range.start, index * step);
                  const count = Math.min(step, days - index * step);
                  const end = addDays(date, count - 1);
                  return <span key={date} style={{ width: count * px }}>{shortRange(date, end)}</span>;
                })}
              </div>
            </div>
          </div>
          {groups.map((group) => {
            const rows = topLevelTasks(tasks).filter((task) => task.groupId === group.id);
            const visible = rows.flatMap((task) => [task, ...subtasksOf(tasks, task.id)]);
            const summary = datedSpan(visible);
            const closed = collapsed[group.id];
            return (
              <div key={group.id} className="pmb-gantt-block">
                <div className="pmb-gantt-row pmb-gantt-phase">
                  <button type="button" className="pmb-gantt-side" aria-expanded={!closed} onClick={() => setCollapsed((current) => ({ ...current, [group.id]: !current[group.id] }))}>
                    <span style={{ display: "inline-flex", transform: closed ? undefined : "rotate(90deg)" }}>
                      <LucideIcon name="chevron-right" size={14} />
                    </span>
                    <span className="pmb-project-mark" style={{ background: group.color }} />
                    <span className="pmb-gantt-task" style={{ color: group.color }}>{group.name}</span>
                  </button>
                  <div className="pmb-gantt-time" style={{ width }}>
                    {summary ? (
                      <span
                        className="pmb-phase-wrap"
                        style={{ left: (daySpan(range.start, summary.start) - 1) * px, width: Math.max(summary.days * px, 12) }}
                      >
                        <span className="pmb-phase-caption" style={{ color: group.color }}>
                          {group.name} · {shortRange(summary.start, summary.due)} · {summary.days}d
                        </span>
                        <span className="pmb-phase-bar" style={{ background: group.color }} />
                      </span>
                    ) : null}
                  </div>
                </div>
                {closed ? null : visible.map((task) => (
                  <div key={task.id} className={`pmb-gantt-row${selectedId === task.id ? " is-selected" : ""}`}>
                    <button
                      type="button"
                      className="pmb-gantt-side"
                      data-task-id={task.id}
                      style={{ paddingLeft: task.parentTaskId ? 28 : 10 }}
                      onClick={() => {
                        setSelectedId(task.id);
                        onOpen(task);
                      }}
                    >
                      <span className="pmb-gantt-task">{task.title}</span>
                      {task.startDate && task.dueDate ? <span className="pmb-gantt-dates">{shortRange(task.startDate, task.dueDate)}</span> : null}
                    </button>
                    <div className="pmb-gantt-time" style={{ width }}>
                      {task.startDate && task.dueDate ? (
                        <Bar
                          task={task}
                          rangeStart={range.start}
                          px={px}
                          color={group.color}
                          canEdit={canEdit}
                          onOpen={() => {
                            setSelectedId(task.id);
                            onOpen(task);
                          }}
                          onShift={onShift}
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <aside className="pmb-unscheduled" aria-label="Unscheduled tasks">
        <h3>Unscheduled</h3>
        {unscheduled.length === 0 ? <p>Every task has a start and due date.</p> : unscheduled.map((task) => (
          <button key={task.id} type="button" onClick={() => onOpen(task)}>{task.title}</button>
        ))}
      </aside>
    </section>
  );
}

function Bar({
  task,
  rangeStart,
  px,
  color,
  canEdit,
  onOpen,
  onShift,
}: {
  task: PmBoardTask;
  rangeStart: string;
  px: number;
  color: string;
  canEdit: boolean;
  onOpen: () => void;
  onShift: (task: PmBoardTask, startDate: string, dueDate: string) => void;
}) {
  const [shown, setShown] = useState({ start: task.startDate, due: task.dueDate });
  useEffect(() => {
    setShown({ start: task.startDate, due: task.dueDate });
  }, [task.dueDate, task.startDate]);
  const left = (daySpan(rangeStart, shown.start) - 1) * px;
  const width = Math.max(daySpan(shown.start, shown.due) * px, 12);
  const startDrag = (mode: "move" | "start" | "end") => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!canEdit) return;
    event.preventDefault();
    event.stopPropagation();
    const originX = event.clientX;
    const start = task.startDate;
    const due = task.dueDate;
    const latest = { start, due };
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - originX) > 3) moved = true;
      const days = Math.round((ev.clientX - originX) / px);
      if (mode === "move") {
        latest.start = addDays(start, days);
        latest.due = addDays(due, days);
      }
      if (mode === "start") {
        const next = addDays(start, days);
        latest.start = next <= due ? next : due;
        latest.due = due;
      }
      if (mode === "end") {
        const next = addDays(due, days);
        latest.start = start;
        latest.due = next >= start ? next : start;
      }
      setShown({ ...latest });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!moved) onOpen();
      else onShift(task, latest.start, latest.due);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <span className="pmb-bar-wrap" data-task-id={task.id} style={{ left, width }} title={`${task.title}: ${task.startDate} – ${task.dueDate}`}>
      {canEdit ? <button type="button" className="pmb-bar-handle" aria-label={`Change start of ${task.title}`} onPointerDown={startDrag("start")} /> : null}
      <button
        type="button"
        className="pmb-bar"
        style={{ background: color }}
        aria-label={`${task.title}, ${task.status}`}
        onPointerDown={canEdit ? startDrag("move") : undefined}
        onClick={canEdit ? undefined : onOpen}
      />
      {canEdit ? <button type="button" className="pmb-bar-handle" aria-label={`Change end of ${task.title}`} onPointerDown={startDrag("end")} /> : null}
    </span>
  );
}

function ganttAnchor(grid: HTMLElement, taskId: string): HTMLElement | null {
  const escaped = CSS.escape(taskId);
  return grid.querySelector<HTMLElement>(`.pmb-bar-wrap[data-task-id="${escaped}"]`)
    ?? grid.querySelector<HTMLElement>(`.pmb-gantt-side[data-task-id="${escaped}"]`);
}

function elbowPath(x1: number, y1: number, x2: number, y2: number, fromRight: boolean, toRight: boolean): string {
  const out = fromRight ? 16 : -16;
  const into = toRight ? 16 : -16;
  const turnX = x1 + out;
  const approachX = x2 + into;
  if ((fromRight && x2 >= turnX) || (!fromRight && x2 <= turnX)) {
    return `M ${x1} ${y1} H ${turnX} V ${y2} H ${x2}`;
  }
  const midY = y1 + (y2 >= y1 ? 18 : -18);
  return `M ${x1} ${y1} H ${turnX} V ${midY} H ${approachX} V ${y2} H ${x2}`;
}

function DependencyArrows({
  gridRef,
  dependencies,
  tasks,
  layoutKey,
}: {
  gridRef: RefObject<HTMLDivElement | null>;
  dependencies: PmDependency[];
  tasks: PmBoardTask[];
  layoutKey: string;
}) {
  const [lines, setLines] = useState<{ id: string; d: string }[]>([]);
  const signature = `${layoutKey}|${dependencies.map((link) => `${link.id}:${link.relation}`).join()}|${tasks.map((task) => `${task.id}:${task.startDate}:${task.dueDate}`).join()}`;
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      const bounds = grid.getBoundingClientRect();
      const next = dependencies.flatMap((link) => {
        const from = ganttAnchor(grid, link.predecessorId);
        const to = ganttAnchor(grid, link.successorId);
        if (!from || !to) return [];
        const start = from.getBoundingClientRect();
        const end = to.getBoundingClientRect();
        const fromBar = from.classList.contains("pmb-bar-wrap");
        const toBar = to.classList.contains("pmb-bar-wrap");
        const fromRight = link.relation === "FS" || link.relation === "FF";
        const toRight = link.relation === "FF" || link.relation === "SF";
        const x1 = (fromBar ? (fromRight ? start.right : start.left) : start.right + 12) - bounds.left;
        const y1 = start.top + start.height / 2 - bounds.top;
        const x2 = (toBar ? (toRight ? end.right : end.left) : end.right + 12) - bounds.left;
        const y2 = end.top + end.height / 2 - bounds.top;
        return [{ id: link.id, d: elbowPath(x1, y1, x2, y2, fromBar ? fromRight : true, toBar ? toRight : false) }];
      });
      setLines(next);
    };
    measure();
    const frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [dependencies, gridRef, signature, tasks]);
  return (
    <svg className="pmb-dep-arrows" aria-hidden="true">
      <defs>
        <marker id="pmb-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" />
        </marker>
      </defs>
      {lines.map((line) => <path key={line.id} d={line.d} markerEnd="url(#pmb-arrow)" />)}
    </svg>
  );
}
