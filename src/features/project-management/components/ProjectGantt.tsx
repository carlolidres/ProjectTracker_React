import { Button, Checkbox, DatePicker, Dropdown, Empty, Popover, Select, Switch } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { LucideIcon } from "@/components/common/lucide-icon";
import { formatAppDate, parseAppDateValue } from "@/lib/date";
import { parseFgDeliveryDate } from "@/lib/fgUrgency";
import {
  GANTT_DAY_PX,
  ganttBandLabel,
  ganttBarPx,
  ganttBounds,
  ganttColumns,
  ganttDurationDays,
  ganttLinkPath,
  ganttShiftSpan,
  ganttWorkflowLinks,
  type GanttSpan,
  type GanttZoom,
} from "@/lib/projectGantt";
import {
  PM_TASK_STATUSES,
  WORK_STEP_LABELS,
  WORK_STEPS,
  executionSubtaskTitles,
  workStepFromPhase,
  type WorkStep,
} from "@/lib/projectManagementWorkflow";
import type { PmTaskStatus, PortfolioItem, ProjectManagementTask } from "@/types";

const STEP_COLOR: Record<WorkStep, string> = {
  protocol: "#579bfc",
  execution: "#fdab3d",
  report: "#a25ddc",
  endorsement: "#00c875",
};

const ROW_H = 44;
const BAR_H = 22;

function taskStep(task: Pick<ProjectManagementTask, "phase">): WorkStep {
  if (task.phase === "protocol" || task.phase === "execution" || task.phase === "report") return task.phase;
  return "endorsement";
}

function taskSpan(task: Pick<ProjectManagementTask, "startDate" | "targetDate">): GanttSpan | null {
  const start = parseAppDateValue(task.startDate);
  const end = parseAppDateValue(task.targetDate);
  if (!start && !end) return null;
  const from = (start ?? end)!.format("YYYY-MM-DD");
  const to = (end ?? start)!.format("YYYY-MM-DD");
  return { start: from, end: to >= from ? to : from };
}

function projectSpan(item: PortfolioItem): GanttSpan | null {
  const day = parseAppDateValue(item.targetDate);
  if (day) {
    const iso = day.format("YYYY-MM-DD");
    return { start: iso, end: iso };
  }
  const month = parseFgDeliveryDate(item.targetDate);
  if (!month) return null;
  return {
    start: month.startOf("month").format("YYYY-MM-DD"),
    end: month.endOf("month").format("YYYY-MM-DD"),
  };
}

function unionSpans(spans: GanttSpan[]): GanttSpan | null {
  if (spans.length === 0) return null;
  const start = spans.map((span) => span.start).sort()[0] ?? "";
  const end = spans.map((span) => span.end).sort().at(-1) ?? "";
  if (!start || !end) return null;
  return { start, end: end >= start ? end : start };
}

function durationText(span: GanttSpan | null): string {
  const days = ganttDurationDays(span);
  if (!days) return "—";
  return `${days} day${days === 1 ? "" : "s"}`;
}

function dateText(span: GanttSpan | null): string {
  if (!span) return "—";
  const label = formatAppDate(span.start);
  return label === "-" ? "—" : label;
}

function bands(columns: ReturnType<typeof ganttColumns>, key: "month" | "week") {
  const groups: Array<{ label: string; days: number }> = [];
  for (const column of columns) {
    const label = column[key];
    const last = groups.at(-1);
    if (last?.label === label) last.days += column.days;
    else groups.push({ label, days: column.days });
  }
  return groups;
}

type GanttRow =
  | { id: string; kind: "phase"; step: WorkStep; span: GanttSpan | null; label: string }
  | { id: string; kind: "task"; step: WorkStep; task: ProjectManagementTask; span: GanttSpan | null }
  | { id: string; kind: "add"; step: WorkStep; title: string };

export function ProjectGantt({
  items,
  tasks,
  onOpen,
  canAddSubtask = false,
  onAddExecutionSubtask,
  canDeleteSubtask = false,
  onDeleteSubtask,
  canSchedule = false,
  onScheduleChange,
}: {
  items: PortfolioItem[];
  tasks: ProjectManagementTask[];
  onOpen: (item: PortfolioItem) => void;
  canAddSubtask?: boolean;
  onAddExecutionSubtask?: (item: PortfolioItem, title: string) => void;
  canDeleteSubtask?: boolean;
  onDeleteSubtask?: (task: ProjectManagementTask) => void;
  canSchedule?: boolean;
  onScheduleChange?: (task: ProjectManagementTask, start: string, end: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const [zoom, setZoom] = useState<GanttZoom>("week");
  const [showDependencies, setShowDependencies] = useState(true);
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [expanded, setExpanded] = useState<Partial<Record<WorkStep, boolean>>>({});
  const [hiddenPhases, setHiddenPhases] = useState<WorkStep[]>([]);
  const [hiddenStatuses, setHiddenStatuses] = useState<PmTaskStatus[]>([]);
  const [preview, setPreview] = useState<{ id: string; span: GanttSpan } | null>(null);
  const dragCleanup = useRef<(() => void) | null>(null);
  const project = items.find((item) => item.id === selectedId) ?? items[0];
  const projectTasks = useMemo(
    () => (project ? tasks.filter((task) => task.sourceType === project.sourceType && task.sourceId === project.sourceId) : []),
    [project, tasks],
  );
  const tasksRef = useRef(projectTasks);
  tasksRef.current = projectTasks;

  useEffect(() => () => dragCleanup.current?.(), []);

  useEffect(() => {
    if (!project) return;
    const next: Partial<Record<WorkStep, boolean>> = {};
    for (const step of WORK_STEPS) next[step] = tasksRef.current.some((task) => taskStep(task) === step);
    setExpanded(next);
    setCustomRange(null);
    setHiddenPhases([]);
    setHiddenStatuses([]);
    setPreview(null);
  }, [project?.id]);

  const chart = useMemo(() => {
    if (!project) return null;
    const current = workStepFromPhase(project.phase);
    const visibleTasks = projectTasks.filter((task) => !hiddenStatuses.includes(task.status));
    const byStep = new Map<WorkStep, ProjectManagementTask[]>();
    for (const step of WORK_STEPS) byStep.set(step, []);
    for (const task of visibleTasks) byStep.get(taskStep(task))?.push(task);
    const phaseSpans = WORK_STEPS.map((step) => unionSpans(
      (byStep.get(step) ?? []).map((task) => (preview?.id === task.id ? preview.span : taskSpan(task))).filter((span): span is GanttSpan => Boolean(span)),
    ));
    const fallback = phaseSpans.every((span) => !span) ? projectSpan(project) : null;
    const rows: GanttRow[] = [];
    const phases: Array<{ step: WorkStep; taskIds: string[] }> = [];
    const missingExecution = canAddSubtask
      ? executionSubtaskTitles(project.sourceType).filter((title) => !projectTasks.some((task) => {
        return taskStep(task) === "execution" && task.title.trim().toLowerCase() === title.toLowerCase();
      }))
      : [];
    WORK_STEPS.forEach((step, index) => {
      if (hiddenPhases.includes(step)) return;
      const stepTasks = byStep.get(step) ?? [];
      const span = phaseSpans[index] ?? (fallback && step === current ? fallback : null);
      rows.push({ id: `phase:${step}`, kind: "phase", step, span, label: WORK_STEP_LABELS[step] });
      const taskIds: string[] = [];
      if (expanded[step]) {
        for (const task of stepTasks) {
          taskIds.push(task.id);
          rows.push({
            id: `task:${task.id}`,
            kind: "task",
            step,
            task,
            span: preview?.id === task.id ? preview.span : taskSpan(task),
          });
        }
        if (step === "execution") {
          for (const title of missingExecution) rows.push({ id: `add:${title}`, kind: "add", step, title });
        }
      }
      phases.push({ step, taskIds });
    });
    const spans = rows.flatMap((row) => (row.kind === "add" || !row.span ? [] : [row.span]));
    const bounds = customRange ?? ganttBounds(spans);
    const columns = ganttColumns(bounds.start, bounds.end, zoom);
    const depends = visibleTasks
      .filter((task) => phases.some((phase) => phase.taskIds.includes(task.id)))
      .map((task) => ({ id: task.id, dependsOnTaskId: task.dependsOnTaskId }));
    return { rows, bounds, columns, links: ganttWorkflowLinks(phases, depends), current };
  }, [canAddSubtask, customRange, expanded, hiddenPhases, hiddenStatuses, preview, project, projectTasks, zoom]);

  if (!project || !chart) {
    return <Empty description="No projects to chart. Create one from New Project." />;
  }

  const pxPerDay = GANTT_DAY_PX[zoom];
  const monthBands = bands(chart.columns, "month");
  const weekBands = bands(chart.columns, "week");
  const todayOffset = dayjs().startOf("day").diff(dayjs(chart.bounds.start), "day");
  const totalDays = chart.columns.reduce((sum, column) => sum + column.days, 0);
  const timelinePx = totalDays * pxPerDay;
  const todayX = todayOffset >= 0 && todayOffset < totalDays ? todayOffset * pxPerDay + pxPerDay / 2 : null;
  const boxes = new Map<string, { x: number; y: number; w: number; h: number }>();
  chart.rows.forEach((row, index) => {
    if (row.kind === "add" || !row.span) return;
    const box = ganttBarPx(row.span.start, row.span.end, chart.bounds.start, chart.bounds.end, pxPerDay);
    if (!box) return;
    boxes.set(row.id, { x: box.left, y: index * ROW_H + (ROW_H - BAR_H) / 2, w: box.width, h: BAR_H });
  });
  const visibleLinks = showDependencies
    ? chart.links.flatMap((link) => {
      const from = boxes.get(link.from);
      const to = boxes.get(link.to);
      return from && to ? [{ ...link, fromBox: from, toBox: to }] : [];
    })
    : [];
  const linkCounts = new Map<string, number>();
  for (const link of visibleLinks) linkCounts.set(link.from, (linkCounts.get(link.from) ?? 0) + 1);
  const linkSeen = new Map<string, number>();

  const beginDrag = (event: ReactPointerEvent, task: ProjectManagementTask, span: GanttSpan, edge: "move" | "start" | "end") => {
    if (!canSchedule) return;
    event.preventDefault();
    event.stopPropagation();
    const origin = event.clientX;
    const move = (ev: PointerEvent) => {
      const delta = Math.round((ev.clientX - origin) / pxPerDay);
      setPreview({ id: task.id, span: ganttShiftSpan(span, delta, edge) });
    };
    const up = (ev: PointerEvent) => {
      const delta = Math.round((ev.clientX - origin) / pxPerDay);
      const next = ganttShiftSpan(span, delta, edge);
      setPreview(null);
      if (delta !== 0 && (next.start !== span.start || next.end !== span.end)) onScheduleChange?.(task, next.start, next.end);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      dragCleanup.current = null;
    };
    dragCleanup.current?.();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    dragCleanup.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  };

  const projectName = project.product !== "N/A" ? project.product : project.title;
  const rangeValue: [dayjs.Dayjs, dayjs.Dayjs] = [dayjs(chart.bounds.start), dayjs(chart.bounds.end)];

  return (
    <section className="pm-gantt" aria-label="Project timeline">
      <div className="pm-gantt-top">
        <div className="pm-gantt-heading">
          <h2>{projectName}</h2>
          <p>Plan and track the four steps and their subtasks.</p>
        </div>
        <div className="pm-gantt-controls">
          {items.length > 1 ? (
            <Select
              aria-label="Gantt project"
              value={project.id}
              popupMatchSelectWidth={false}
              options={items.map((item) => ({
                value: item.id,
                label: item.product !== "N/A" ? item.product : item.title,
              }))}
              onChange={setSelectedId}
            />
          ) : null}
          <DatePicker.RangePicker
            allowClear
            format="DD MMM YYYY"
            value={rangeValue}
            onChange={(values) => {
              const start = values?.[0];
              const end = values?.[1];
              if (!start || !end) {
                setCustomRange(null);
                return;
              }
              const from = start.startOf("day");
              const to = end.startOf("day");
              setCustomRange(from.isAfter(to)
                ? { start: to.format("YYYY-MM-DD"), end: from.format("YYYY-MM-DD") }
                : { start: from.format("YYYY-MM-DD"), end: to.format("YYYY-MM-DD") });
            }}
          />
          <label className="pm-gantt-zoom">
            Zoom
            <Select
              aria-label="Zoom"
              value={zoom}
              popupMatchSelectWidth={false}
              options={[{ value: "week", label: "Week" }, { value: "month", label: "Month" }]}
              onChange={(value) => setZoom(value)}
            />
          </label>
          <label className="pm-gantt-switch">
            <Switch size="small" checked={showDependencies} onChange={setShowDependencies} />
            Show dependencies
          </label>
          <Popover
            trigger="click"
            placement="bottomRight"
            content={(
              <div className="pm-gantt-filters">
                <p>Steps</p>
                <Checkbox.Group
                  value={WORK_STEPS.filter((step) => !hiddenPhases.includes(step))}
                  options={WORK_STEPS.map((step) => ({ label: WORK_STEP_LABELS[step], value: step }))}
                  onChange={(values) => {
                    const selected = values.map(String);
                    setHiddenPhases(WORK_STEPS.filter((step) => !selected.includes(step)));
                  }}
                />
                <p>Task status</p>
                <Checkbox.Group
                  value={PM_TASK_STATUSES.filter((status) => !hiddenStatuses.includes(status))}
                  options={PM_TASK_STATUSES.map((status) => ({ label: status, value: status }))}
                  onChange={(values) => {
                    const selected = values.map(String);
                    setHiddenStatuses(PM_TASK_STATUSES.filter((status) => !selected.includes(status)));
                  }}
                />
              </div>
            )}
          >
            <Button>Filters</Button>
          </Popover>
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "expand", label: "Expand all" },
                { key: "collapse", label: "Collapse all" },
              ],
              onClick: ({ key }) => {
                const open = key === "expand";
                setExpanded(Object.fromEntries(WORK_STEPS.map((step) => [step, open])));
              },
            }}
          >
            <Button aria-label="More timeline actions">···</Button>
          </Dropdown>
        </div>
      </div>
      <div className="pm-gantt-scroll">
        <div className="pm-gantt-head">
          <div className="pm-gantt-side pm-gantt-side-head">
            <div>Task</div>
            <div>Start date</div>
            <div>Duration</div>
          </div>
          <div className="pm-gantt-time-head" style={{ width: timelinePx, ["--gantt-day" as string]: `${pxPerDay}px` }}>
            <div className="pm-gantt-band">
              {monthBands.map((band) => {
                const width = band.days * pxPerDay;
                const text = ganttBandLabel(band.label, width);
                return <div key={band.label} style={{ width }} title={band.label}>{text}</div>;
              })}
            </div>
            <div className="pm-gantt-band is-minor">
              {weekBands.map((band, index) => {
                const width = band.days * pxPerDay;
                return <div key={`${band.label}-${index}`} style={{ width }} title={band.label}>{ganttBandLabel(band.label, width)}</div>;
              })}
            </div>
            {zoom === "week" ? (
              <div className="pm-gantt-band is-days">
                {chart.columns.map((column) => (
                  <div key={column.start} style={{ width: pxPerDay }}>
                    <span>{column.weekday}</span>
                    <span>{column.label}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="pm-gantt-body">
          <div className="pm-gantt-side">
            {chart.rows.map((row) => {
              if (row.kind === "phase") {
                const open = Boolean(expanded[row.step]);
                return (
                  <div key={row.id} className="pm-gantt-side-row">
                    <div className="pm-gantt-task-cell">
                      <button
                        type="button"
                        className="pm-gantt-twist"
                        aria-expanded={open}
                        aria-label={`${open ? "Collapse" : "Expand"} ${row.label}`}
                        onClick={() => setExpanded((current) => ({ ...current, [row.step]: !current[row.step] }))}
                      >
                        <LucideIcon name="chevron-right" size={16} className={open ? "is-open" : ""} aria-hidden />
                      </button>
                      <span className="pm-gantt-dot" style={{ background: STEP_COLOR[row.step] }} />
                      <button type="button" className="pm-gantt-name" onClick={() => onOpen(project)}>{row.label}</button>
                    </div>
                    <div>{dateText(row.span)}</div>
                    <div>{durationText(row.span)}</div>
                  </div>
                );
              }
              if (row.kind === "add") {
                return (
                  <div key={row.id} className="pm-gantt-side-row">
                    <div className="pm-gantt-task-cell is-child">
                      <button type="button" className="pm-gantt-add" onClick={() => onAddExecutionSubtask?.(project, row.title)}>
                        + {row.title}
                      </button>
                    </div>
                    <div />
                    <div />
                  </div>
                );
              }
              return (
                <div key={row.id} className="pm-gantt-side-row">
                  <div className="pm-gantt-task-cell is-child">
                    <span className="pm-gantt-branch" aria-hidden />
                    <span className="pm-gantt-name">{row.task.title}</span>
                    {canDeleteSubtask ? (
                      <button type="button" className="pm-gantt-delete" aria-label={`Delete ${row.task.title}`} onClick={() => onDeleteSubtask?.(row.task)}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                  <div>{dateText(row.span)}</div>
                  <div>{durationText(row.span)}</div>
                </div>
              );
            })}
          </div>
          <div className="pm-gantt-time" style={{ width: timelinePx, ["--gantt-day" as string]: `${pxPerDay}px` }}>
            {todayX !== null ? <span className="pm-gantt-today" style={{ left: todayX }} /> : null}
            {showDependencies ? (
              <svg className="pm-gantt-links" width={timelinePx} height={chart.rows.length * ROW_H} aria-hidden>
                <defs>
                  <marker id="pm-gantt-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="#9aa0b4" />
                  </marker>
                </defs>
                {visibleLinks.map((link) => {
                  const index = linkSeen.get(link.from) ?? 0;
                  linkSeen.set(link.from, index + 1);
                  const count = linkCounts.get(link.from) ?? 1;
                  const lane = index - (count - 1) / 2;
                  return (
                    <path
                      key={`${link.from}-${link.to}`}
                      d={ganttLinkPath(link.fromBox, link.toBox, lane)}
                      markerEnd="url(#pm-gantt-arrow)"
                    />
                  );
                })}
              </svg>
            ) : null}
            {chart.rows.map((row) => {
              const box = boxes.get(row.id);
              const label = row.kind === "phase" ? row.label : row.kind === "task" ? row.task.title : "";
              const span = row.kind === "add" ? null : row.span;
              const draggable = row.kind === "task" && canSchedule && Boolean(span);
              const roomy = Boolean(box && box.w >= 96);
              return (
                <div key={row.id} className="pm-gantt-track">
                  {box && span ? (
                    <div
                      className={`pm-gantt-bar${row.kind === "task" ? " is-child" : ""}${draggable ? " is-draggable" : ""}${roomy ? "" : " is-compact"}`}
                      style={{ left: box.x, width: box.w, background: row.kind === "task" ? `color-mix(in srgb, ${STEP_COLOR[row.step]} 78%, white)` : STEP_COLOR[row.step] }}
                      title={`${label} · ${dateText(span)} · ${durationText(span)}`}
                      onPointerDown={draggable && row.kind === "task" ? (event) => beginDrag(event, row.task, span, "move") : undefined}
                    >
                      {draggable && row.kind === "task" ? (
                        <span className="pm-gantt-handle is-start" onPointerDown={(event) => beginDrag(event, row.task, span, "start")} />
                      ) : null}
                      {roomy ? (
                        <>
                          <span className="pm-gantt-bar-name">{label}</span>
                          <span className="pm-gantt-bar-days">{durationText(span)}</span>
                        </>
                      ) : null}
                      {draggable && row.kind === "task" ? (
                        <span className="pm-gantt-handle is-end" onPointerDown={(event) => beginDrag(event, row.task, span, "end")} />
                      ) : null}
                    </div>
                  ) : null}
                  {box && span && !roomy ? (
                    <span className="pm-gantt-bar-outside" style={{ left: box.x + box.w + 8 }}>{label}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="pm-gantt-legend">
        {WORK_STEPS.map((step) => (
          <span key={step}>
            <span className="pm-gantt-dot" style={{ background: STEP_COLOR[step] }} />
            {WORK_STEP_LABELS[step]}
          </span>
        ))}
      </div>
    </section>
  );
}
