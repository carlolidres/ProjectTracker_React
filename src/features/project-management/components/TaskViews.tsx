import { Button, Empty, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { LucideIcon } from "@/components/common/lucide-icon";
import { formatAppDate, parseAppDateValue } from "@/lib/date";
import { getProfileDisplayName } from "@/lib/profileName";
import {
  isOverdueTask,
  PM_TASK_STATUS_COLORS,
  PM_TASK_STATUSES,
} from "@/lib/projectManagementWorkflow";
import type { Profile, WorkflowBoardItem } from "@/types";

function assigneeLabel(ids: string[], profiles: Profile[]): string {
  if (ids.length === 0) return "Unassigned";
  return ids
    .map((id) => {
      const profile = profiles.find((row) => row.id === id);
      return profile ? getProfileDisplayName(profile) || profile.email : id;
    })
    .join(", ");
}

interface SharedViewProps {
  items: WorkflowBoardItem[];
  profiles: Profile[];
  currentUserId?: string;
  onOpen: (item: WorkflowBoardItem) => void;
  canCreate?: boolean;
  onCreate?: (date?: string) => void;
}

export function TaskTableView({ items, profiles, onOpen }: SharedViewProps) {
  const columns: ColumnsType<WorkflowBoardItem> = [
    { title: "Title", dataIndex: "title", ellipsis: true },
    {
      title: "Origin",
      dataIndex: "origin",
      width: 100,
      render: (origin: WorkflowBoardItem["origin"]) => (origin === "system" ? "Source" : "Task"),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (status: WorkflowBoardItem["status"], row) => (
        <Tag color={isOverdueTask(row) && status !== "Done" ? "red" : PM_TASK_STATUS_COLORS[status]}>
          {isOverdueTask(row) && status !== "Done" ? "Overdue" : status}
        </Tag>
      ),
    },
    { title: "Phase", dataIndex: "phase", width: 120, render: (phase: string) => phase.replace(/_/g, " ") },
    { title: "Category", dataIndex: "category", width: 140 },
    {
      title: "Assignees",
      dataIndex: "assigneeIds",
      render: (ids: string[]) => assigneeLabel(ids, profiles),
    },
    {
      title: "Target",
      dataIndex: "targetDate",
      width: 130,
      render: (value: string) => (value ? formatAppDate(value) : "—"),
    },
    {
      title: "%",
      dataIndex: "percentComplete",
      width: 70,
    },
  ];

  return (
    <Table
      size="small"
      rowKey="id"
      columns={columns}
      dataSource={items}
      pagination={false}
      onRow={(row) => ({
        onClick: () => onOpen(row),
        style: { cursor: "pointer" },
      })}
      locale={{ emptyText: "No workflow items yet." }}
    />
  );
}

export function TaskBoardView({ items, onOpen }: SharedViewProps) {
  return (
    <div className="pm-board" role="list" aria-label="Task board">
      {PM_TASK_STATUSES.map((status) => {
        const columnItems = items.filter((item) => item.status === status);
        return (
          <section key={status} className="pm-board-column" aria-label={status}>
            <h3 className="pm-board-heading">
              {status}
              <span>{columnItems.length}</span>
            </h3>
            {columnItems.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="None" />
            ) : (
              columnItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="pm-board-card"
                  onClick={() => onOpen(item)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.category}</span>
                  {item.targetDate ? <span>Due {formatAppDate(item.targetDate)}</span> : null}
                </button>
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}

export function TaskCalendarView({ items, onOpen, canCreate, onCreate }: SharedViewProps) {
  const [month, setMonth] = useState(() => dayjs().startOf("month"));
  const today = dayjs();
  const weeks = useMemo(() => {
    const start = month.startOf("month").subtract(month.startOf("month").day(), "day");
    return Array.from({ length: 6 }, (_, week) =>
      Array.from({ length: 7 }, (_, day) => start.add(week * 7 + day, "day")),
    );
  }, [month]);

  const goToday = () => setMonth(today.startOf("month"));

  return (
    <section className="pm-calendar" aria-label={`Task calendar ${month.format("MMMM YYYY")}`}>
      <div className="pm-calendar-toolbar">
        <div className="pm-calendar-toolbar-nav">
          <button
            type="button"
            className="pm-calendar-nav-btn"
            aria-label="Previous month"
            onClick={() => setMonth((value) => value.subtract(1, "month"))}
          >
            <LucideIcon name="chevron-left" size={16} />
          </button>
          <h2 className="pm-calendar-month">{month.format("MMMM YYYY")}</h2>
          <button
            type="button"
            className="pm-calendar-nav-btn"
            aria-label="Next month"
            onClick={() => setMonth((value) => value.add(1, "month"))}
          >
            <LucideIcon name="chevron-right" size={16} />
          </button>
        </div>
        <div className="pm-calendar-toolbar-actions">
          <button type="button" className="pm-calendar-nav-btn" aria-label="Show this month" onClick={goToday}>
            Today
          </button>
          {canCreate && onCreate ? (
            <Button type="primary" icon={<LucideIcon name="plus" size={14} />} onClick={() => onCreate()}>
              New task
            </Button>
          ) : null}
        </div>
      </div>
      <div className="pm-calendar-grid" role="grid" aria-label={month.format("MMMM YYYY")}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div key={label} className="pm-calendar-dow" role="columnheader">
            <span className="pm-calendar-dow-full">{label}</span>
            <span className="pm-calendar-dow-short">{label.slice(0, 1)}</span>
          </div>
        ))}
        {weeks.flatMap((week) =>
          week.map((day) => {
            const key = day.format("YYYY-MM-DD");
            const inMonth = day.month() === month.month();
            const isToday = day.isSame(today, "day");
            const dayItems = items.filter((item) => {
              const start = parseAppDateValue(item.startDate);
              const target = parseAppDateValue(item.targetDate);
              return Boolean(start?.isSame(day, "day") || target?.isSame(day, "day"));
            });
            const noteClass = (item: WorkflowBoardItem) => {
              if (isOverdueTask(item) && item.status !== "Done") return "is-overdue";
              if (item.status === "In-process") return "is-in-process";
              if (item.status === "Done") return "is-done";
              if (item.status === "Delayed") return "is-delayed";
              if (item.status === "Blocked") return "is-blocked";
              return "is-planned";
            };
            return (
              <div
                key={key}
                role="gridcell"
                aria-current={isToday ? "date" : undefined}
                aria-label={`${day.format("D MMMM YYYY")}${dayItems.length ? `, ${dayItems.length} task${dayItems.length === 1 ? "" : "s"}` : ""}${canCreate ? ", click to add a task" : ""}`}
                className={[
                  "pm-calendar-cell",
                  inMonth ? "" : "pm-calendar-cell-muted",
                  isToday ? "is-today" : "",
                  canCreate ? "is-create" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => {
                  if (canCreate && onCreate) onCreate(key);
                }}
              >
                <span className={`pm-calendar-day${isToday ? " is-today" : ""}`}>{day.date()}</span>
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`pm-calendar-note ${noteClass(item)}`}
                    title={item.title}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(item);
                    }}
                  >
                    {item.title}
                  </button>
                ))}
                {dayItems.length > 3 ? (
                  <span className="pm-calendar-more">+{dayItems.length - 3} more</span>
                ) : null}
              </div>
            );
          }),
        )}
      </div>
    </section>
  );
}

export function MyTasksView({ items, profiles, currentUserId, onOpen, canCreate, onCreate }: SharedViewProps) {
  const mine = items.filter((item) => currentUserId && item.assigneeIds.includes(currentUserId));
  return (
    <section className="pm-my-tasks" aria-label="My tasks">
      <div className="pm-my-tasks-toolbar">
        <div>
          <h2 className="pm-panel-title">Assigned to you</h2>
          <p className="pm-panel-copy">Tasks you own stay here. Source work still lives on Projects Database and Support Activities.</p>
        </div>
        {canCreate && onCreate ? (
          <Button type="primary" icon={<LucideIcon name="plus" size={14} />} onClick={() => onCreate()}>
            New task
          </Button>
        ) : null}
      </div>
      {mine.length === 0 ? (
        <Empty description="No tasks assigned to you. Add one and pick a Projects Database or Support Activities record." />
      ) : (
        <TaskTableView items={mine} profiles={profiles} currentUserId={currentUserId} onOpen={onOpen} />
      )}
    </section>
  );
}
