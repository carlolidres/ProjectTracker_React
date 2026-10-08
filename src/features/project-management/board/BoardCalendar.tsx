import { useState } from "react";
import { Button, Popover } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { STATUS_COLOR, addDays, daySpan, type PmBoardTask } from "@/features/project-management/board/boardRules";

export function BoardCalendar({
  tasks,
  canEdit,
  onOpen,
  onCreate,
  onReschedule,
}: {
  tasks: PmBoardTask[];
  canEdit: boolean;
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
        <strong>{mode === "week" ? cursor.format("MMM D, YYYY") : cursor.format("MMMM YYYY")}</strong>
        <Button type={mode === "month" ? "primary" : "default"} onClick={() => setMode("month")}>Month</Button>
        <Button type={mode === "week" ? "primary" : "default"} onClick={() => setMode("week")}>Week</Button>
        <Button type={mode === "day" ? "primary" : "default"} onClick={() => setMode("day")}>Day</Button>
      </div>
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
                  {task.title}
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
      <aside className="pmb-unscheduled" aria-label="Unscheduled tasks">
        <h3>Unscheduled</h3>
        {unscheduled.length === 0 ? <p>Tasks with a due date appear on the calendar.</p> : unscheduled.map((task) => (
          <button key={task.id} type="button" onClick={() => onOpen(task)}>{task.title}</button>
        ))}
      </aside>
    </section>
  );
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
