import { useState } from "react";
import { Button, Popover } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { formatColumnValue, type BoardColumn } from "@/features/project-management/board/columnCatalog";
import { STATUS_COLOR, addDays, daySpan, type PmBoardTask } from "@/features/project-management/board/boardRules";

export function BoardCalendar({
  tasks,
  canEdit,
  columns,
  cells,
  onOpen,
  onCreate,
  onReschedule,
}: {
  tasks: PmBoardTask[];
  canEdit: boolean;
  columns: BoardColumn[];
  cells: Record<string, Record<string, unknown>>;
  onOpen: (task: PmBoardTask) => void;
  onCreate: (date: string) => void;
  onReschedule: (task: PmBoardTask, startDate: string, dueDate: string) => void;
}) {
  const [cursor, setCursor] = useState(() => dayjs());
  const [mode, setMode] = useState<"month" | "week" | "day">("month");
  const days = mode === "day"
    ? [cursor.startOf("day")]
    : mode === "week"
    ? Array.from({ length: 7 }, (_, index) => cursor.startOf("week").add(index, "day"))
    : monthDays(cursor);
  const unscheduled = tasks.filter((task) => !task.dueDate);
  const step = () => setCursor((value) => value.add(1, mode === "day" ? "day" : mode === "week" ? "week" : "month"));
  const back = () => setCursor((value) => value.subtract(1, mode === "day" ? "day" : mode === "week" ? "week" : "month"));

  return (
    <section className="pmb-calendar" aria-label="Calendar">
      <div className="pmb-view-tools">
        <Button onClick={back}>Previous</Button>
        <Button onClick={() => setCursor(dayjs())}>Today</Button>
        <Button onClick={step}>Next</Button>
        <strong>{mode === "day" ? cursor.format("dddd, MMMM D, YYYY") : mode === "week" ? cursor.format("MMM D, YYYY") : cursor.format("MMMM YYYY")}</strong>
        <Button type={mode === "month" ? "primary" : "default"} onClick={() => setMode("month")}>Month</Button>
        <Button type={mode === "week" ? "primary" : "default"} onClick={() => setMode("week")}>Week</Button>
        <Button type={mode === "day" ? "primary" : "default"} onClick={() => { setMode("day"); setCursor(dayjs()); }}>Day</Button>
      </div>
      {mode === "day" ? (
        <DayAgenda
          day={cursor}
          tasks={tasks}
          columns={columns}
          cells={cells}
          canEdit={canEdit}
          onOpen={onOpen}
          onCreate={() => onCreate(cursor.format("YYYY-MM-DD"))}
          onReschedule={onReschedule}
        />
      ) : (
      <div className={`pmb-cal-grid${mode === "week" ? " is-week" : ""}`}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => <div key={label} className="pmb-cal-dow">{label}</div>)}
        {days.map((day) => {
          const iso = day.format("YYYY-MM-DD");
          const items = tasks.filter((task) => covers(task, iso));
          const visible = items.slice(0, 3);
          const extra = items.slice(3);
          return (
            <div
              key={iso}
              className={`pmb-cal-day${day.isSame(dayjs(), "day") ? " is-today" : ""}${day.month() === cursor.month() || mode === "week" ? "" : " is-muted"}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const id = event.dataTransfer.getData("text/plain");
                const task = tasks.find((item) => item.id === id);
                if (!task || !canEdit) return;
                const next = moveTask(task, iso);
                onReschedule(task, next.startDate, next.dueDate);
              }}
            >
              <button type="button" className="pmb-cal-date" aria-label={`Add task on ${iso}`} onClick={() => canEdit && onCreate(iso)}>
                {day.date()}
              </button>
              {visible.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  draggable={canEdit}
                  className="pmb-cal-event"
                  style={{ background: STATUS_COLOR[task.status] }}
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", task.id)}
                  onClick={() => onOpen(task)}
                >
                  {eventLabel(task, columns, cells)}
                </button>
              ))}
              {extra.length > 0 ? (
                <Popover
                  content={extra.map((task) => (
                    <button key={task.id} type="button" className="pmb-more-item" onClick={() => onOpen(task)}>{task.title}</button>
                  ))}
                >
                  <button type="button" className="pmb-more">+ {extra.length} more</button>
                </Popover>
              ) : null}
            </div>
          );
        })}
      </div>
      )}
      <aside className="pmb-unscheduled" aria-label="Unscheduled tasks">
        <h3>Unscheduled</h3>
        {unscheduled.length === 0 ? <p>Tasks with a due date appear on the calendar.</p> : unscheduled.map((task) => (
          <button key={task.id} type="button" onClick={() => onOpen(task)}>{task.title}</button>
        ))}
      </aside>
    </section>
  );
}

function DayAgenda({
  day,
  tasks,
  columns,
  cells,
  canEdit,
  onOpen,
  onCreate,
  onReschedule,
}: {
  day: Dayjs;
  tasks: PmBoardTask[];
  columns: BoardColumn[];
  cells: Record<string, Record<string, unknown>>;
  canEdit: boolean;
  onOpen: (task: PmBoardTask) => void;
  onCreate: () => void;
  onReschedule: (task: PmBoardTask, startDate: string, dueDate: string) => void;
}) {
  const iso = day.format("YYYY-MM-DD");
  const today = day.isSame(dayjs(), "day");
  const scheduled = tasks.filter((task) => covers(task, iso));
  return (
    <div
      className={`pmb-day-agenda${today ? " is-today" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        const id = event.dataTransfer.getData("text/plain");
        const task = tasks.find((item) => item.id === id);
        if (!task || !canEdit) return;
        const next = moveTask(task, iso);
        onReschedule(task, next.startDate, next.dueDate);
      }}
    >
      <header>
        <p>{today ? "Today" : day.format("dddd")}</p>
        <h2>{day.format("MMMM D, YYYY")}</h2>
        <span>{scheduled.length === 1 ? "1 task" : `${scheduled.length} tasks`}</span>
      </header>
      {scheduled.length === 0 ? <p className="pmb-day-empty">Nothing is scheduled for this day.</p> : (
        <ul>
          {scheduled.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                draggable={canEdit}
                onDragStart={(event) => event.dataTransfer.setData("text/plain", task.id)}
                onClick={() => onOpen(task)}
              >
                <span className="pmb-day-mark" style={{ background: STATUS_COLOR[task.status] }} />
                <span>
                  <strong>{eventLabel(task, columns, cells)}</strong>
                  <small>{task.status}{task.startDate && task.dueDate ? ` · ${task.startDate} – ${task.dueDate}` : ""}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {canEdit ? <button type="button" className="pmb-day-add" onClick={onCreate}>Add a task for this day</button> : null}
    </div>
  );
}

function eventLabel(task: PmBoardTask, columns: BoardColumn[], cells: Record<string, Record<string, unknown>>): string {
  const label = columns.find((column) => column.type === "label" || column.type === "dropdown");
  const extra = label ? formatColumnValue(label.type, cells[task.id]?.[label.id]) : task.status;
  return extra ? `${task.title} · ${extra}` : task.title;
}

function monthDays(cursor: Dayjs): Dayjs[] {
  const start = cursor.startOf("month").startOf("week");
  return Array.from({ length: 42 }, (_, index) => start.add(index, "day"));
}

function covers(task: PmBoardTask, iso: string): boolean {
  if (task.startDate && task.dueDate) return task.startDate <= iso && iso <= task.dueDate;
  return task.dueDate === iso;
}

function moveTask(task: PmBoardTask, iso: string): { startDate: string; dueDate: string } {
  if (task.startDate && task.dueDate) {
    const span = daySpan(task.startDate, task.dueDate);
    return { startDate: iso, dueDate: addDays(iso, span - 1) };
  }
  return { startDate: task.startDate, dueDate: iso };
}
