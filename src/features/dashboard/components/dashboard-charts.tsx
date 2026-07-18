import { QuestionCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { useMemo, useState } from "react";

const FG_DELIVERED_TREND_HELP = "Counts PO lines marked Closed by PP, grouped by FG Month";

const CHART_COLORS = ["#2563eb", "#f59e0b", "#22c55e", "#8b5cf6", "#ef4444", "#06b6d4"];

const DONUT_SIZE = 200;
const DONUT_CX = DONUT_SIZE / 2;
const DONUT_CY = DONUT_SIZE / 2;
const OUTER_RADIUS = 78;
const INNER_RADIUS = 48;
const SEGMENT_GAP_DEG = 3;

interface DonutSegment {
  label: string;
  value: number;
  color: string;
  startAngle: number;
  endAngle: number;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeDonutSegment(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, outerRadius, endAngle);
  const end = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? "1" : "0";

  return [
    `M ${start.x} ${start.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function buildDonutSegments(entries: Array<[string, number]>): DonutSegment[] {
  const activeEntries = entries.filter(([, value]) => value > 0);
  const total = activeEntries.reduce((sum, [, value]) => sum + value, 0);
  if (!total) return [];

  const gapTotal = activeEntries.length * SEGMENT_GAP_DEG;
  const availableAngle = 360 - gapTotal;
  let cursor = -90 + SEGMENT_GAP_DEG / 2;

  return activeEntries.map(([label, value], index) => {
    const sweep = (value / total) * availableAngle;
    const startAngle = cursor;
    const endAngle = cursor + sweep;
    cursor = endAngle + SEGMENT_GAP_DEG;

    return {
      label,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
      startAngle,
      endAngle,
    };
  });
}

export function SegmentedChart({
  entries,
  centerLabel,
  onEntryClick,
}: Readonly<{
  entries: Array<[string, number]>;
  centerLabel: string;
  onEntryClick?: (label: string) => void;
}>) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const segments = useMemo(() => buildDonutSegments(entries), [entries]);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const hoveredSegment = segments.find((segment) => segment.label === hoveredLabel) ?? null;
  const isInteractive = Boolean(onEntryClick);

  return (
    <div className={`interactive-donut-chart${hoveredLabel ? " interactive-donut-chart--hovering" : ""}`}>
      <div className="interactive-donut-wrap">
        <svg
          viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
          className="interactive-donut-svg"
          role="img"
          aria-label={`${centerLabel} distribution chart`}
        >
          {total === 0 ? (
            <circle
              cx={DONUT_CX}
              cy={DONUT_CY}
              r={OUTER_RADIUS}
              className="donut-empty-ring"
              fill="none"
              strokeWidth={OUTER_RADIUS - INNER_RADIUS}
            />
          ) : (
            segments.map((segment) => {
              const isHovered = hoveredLabel === segment.label;
              return (
                <path
                  key={segment.label}
                  d={describeDonutSegment(
                    DONUT_CX,
                    DONUT_CY,
                    INNER_RADIUS,
                    OUTER_RADIUS,
                    segment.startAngle,
                    segment.endAngle,
                  )}
                  fill={segment.color}
                  stroke="none"
                  className={`donut-segment${isHovered ? " is-hovered" : ""}${isInteractive ? " is-clickable" : ""}`}
                  tabIndex={isInteractive ? 0 : undefined}
                  role={isInteractive ? "button" : "graphics-symbol"}
                  aria-label={`${segment.label}: ${segment.value}`}
                  onMouseEnter={() => setHoveredLabel(segment.label)}
                  onMouseLeave={() => setHoveredLabel(null)}
                  onFocus={() => setHoveredLabel(segment.label)}
                  onBlur={() => setHoveredLabel(null)}
                  onClick={() => onEntryClick?.(segment.label)}
                  onKeyDown={(event) => {
                    if (!onEntryClick) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onEntryClick(segment.label);
                    }
                  }}
                />
              );
            })
          )}
          <circle cx={DONUT_CX} cy={DONUT_CY} r={INNER_RADIUS - 1} className="donut-center-hole" />
          <text x={DONUT_CX} y={DONUT_CY - 6} textAnchor="middle" className="donut-center-value">
            {total}
          </text>
          <text x={DONUT_CX} y={DONUT_CY + 12} textAnchor="middle" className="donut-center-label">
            {centerLabel}
          </text>
        </svg>
      </div>

      <div
        className={`donut-hover-legend${hoveredSegment ? " is-visible" : ""}`}
        aria-live="polite"
      >
        {hoveredSegment ? (
          <>
            <span
              className="donut-hover-legend-dot"
              style={{ background: hoveredSegment.color }}
            />
            <span className="donut-hover-legend-label">{hoveredSegment.label}</span>
            <strong className="donut-hover-legend-value">{hoveredSegment.value}</strong>
          </>
        ) : (
          <span className="donut-hover-legend-placeholder">Hover a segment</span>
        )}
      </div>
    </div>
  );
}

function buildSmoothTrendPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;
    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

function buildTrendAreaPath(points: Array<{ x: number; y: number }>, baseline: number) {
  const linePath = buildSmoothTrendPath(points);
  if (!linePath || !points.length) return "";
  const last = points[points.length - 1];
  const first = points[0];
  return `${linePath} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

export function MonthlyTrendChart({
  values,
  onMonthClick,
}: Readonly<{
  values: Array<{ monthKey: string; label: string; count: number }>;
  onMonthClick?: (monthKey: string) => void;
}>) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 720;
  const height = 220;
  const chartLeft = 36;
  const chartRight = 684;
  const chartTop = 28;
  const chartBottom = 168;
  const display = values.length ? values : [];
  const max = Math.max(1, ...display.map((item) => item.count));
  const step = display.length > 1 ? (chartRight - chartLeft) / (display.length - 1) : 0;
  const totalDelivered = display.reduce((sum, item) => sum + item.count, 0);

  const points = display.map((item, index) => ({
    ...item,
    index,
    x: chartLeft + index * step,
    y: chartBottom - (item.count / max) * (chartBottom - chartTop),
  }));

  const linePath = buildSmoothTrendPath(points);
  const areaPath = buildTrendAreaPath(points, chartBottom);
  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;
  const currentMonthIndex = points.length > 0 ? points.length - 1 : -1;
  const gradientId = "fg-delivered-trend-gradient";
  const glowId = "fg-delivered-trend-glow";
  const areaGradientId = "fg-delivered-area-gradient";

  return (
    <div className="monthly-trend-chart">
      <div className="monthly-trend-kpi">
        <div className="monthly-trend-kpi-title">
          <span className="monthly-trend-kpi-label">FG Delivered per Month</span>
          <Tooltip title={FG_DELIVERED_TREND_HELP}>
            <button type="button" className="monthly-trend-kpi-help" aria-label="About FG Delivered per Month">
              <QuestionCircleOutlined />
            </button>
          </Tooltip>
        </div>
        <div className="monthly-trend-kpi-value-wrap">
          <strong className="monthly-trend-kpi-value">
            {activePoint ? activePoint.count : totalDelivered}
          </strong>
          <span className="monthly-trend-kpi-caption">
            {activePoint ? `${activePoint.label} deliveries` : "Last 12 months total"}
          </span>
        </div>
      </div>

      <div className="monthly-trend-chart-surface">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="FG delivered per month trend">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className="trend-gradient-stop-start" />
              <stop offset="100%" className="trend-gradient-stop-end" />
            </linearGradient>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="trend-area-stop-start" />
              <stop offset="100%" className="trend-area-stop-end" />
            </linearGradient>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {points.map((point) => (
            <line
              key={`grid-${point.monthKey}`}
              x1={point.x}
              x2={point.x}
              y1={chartTop}
              y2={chartBottom}
              className="trend-grid-line trend-grid-line-vertical"
            />
          ))}

          {areaPath ? <path d={areaPath} className="trend-area-path" fill={`url(#${areaGradientId})`} /> : null}
          {linePath ? (
            <path
              d={linePath}
              className="trend-line-path"
              stroke={`url(#${gradientId})`}
              filter={`url(#${glowId})`}
            />
          ) : null}

          {points.map((point) => {
            const isActive = hoveredIndex === point.index;
            const isCurrentMonth = point.index === currentMonthIndex;
            return (
              <g
                key={point.monthKey}
                className={`trend-point-group${isActive ? " is-active" : ""}${isCurrentMonth ? " is-current-month" : ""}`}
                onMouseEnter={() => setHoveredIndex(point.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(point.index)}
                onBlur={() => setHoveredIndex(null)}
              >
                <circle
                  cx={point.x}
                  cy={chartBottom}
                  r="3"
                  className="trend-axis-dot"
                />
                {isCurrentMonth ? (
                  <g
                    transform={`translate(${point.x} ${point.y})`}
                    className="trend-point-pulse-wrap"
                    aria-hidden="true"
                  >
                    <circle cx={0} cy={0} r="8" className="trend-point-pulse-ring trend-point-pulse-ring-1" />
                    <circle cx={0} cy={0} r="8" className="trend-point-pulse-ring trend-point-pulse-ring-2" />
                  </g>
                ) : null}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="12"
                  className="trend-point-hit"
                  tabIndex={0}
                  role={onMonthClick ? "button" : "presentation"}
                  aria-label={onMonthClick ? `Open ${point.label} deliveries` : undefined}
                  style={onMonthClick ? { cursor: "pointer" } : undefined}
                  onClick={() => onMonthClick?.(point.monthKey)}
                  onKeyDown={(event) => {
                    if (!onMonthClick) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onMonthClick(point.monthKey);
                    }
                  }}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isActive || isCurrentMonth ? 6 : 4}
                  className={`trend-point${isActive ? " trend-point-active" : ""}${isCurrentMonth ? " trend-point-current" : ""}`}
                />
                <text
                  x={point.x}
                  y={196}
                  textAnchor="middle"
                  className={`trend-month-label${isCurrentMonth ? " trend-month-label-current" : ""}`}
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>

        {activePoint ? (
          <div
            className="trend-hover-tooltip"
            style={{ left: `${(activePoint.x / width) * 100}%` }}
          >
            <strong>{activePoint.count}</strong>
            <span>{activePoint.label}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FgDeliveryMetricsPanel({
  onTime,
  late,
  total,
  onSelectDelivery,
}: Readonly<{
  onTime: number;
  late: number;
  total: number;
  onSelectDelivery?: (status: "on_time" | "late") => void;
}>) {
  const onTimePercent = total > 0 ? (onTime / total) * 100 : 0;
  const latePercent = total > 0 ? (late / total) * 100 : 0;

  return (
    <div className="completion-metrics-card">
      <div className="completion-metrics-legend">
        <button
          type="button"
          className="completion-metrics-legend-button"
          style={onSelectDelivery ? { cursor: "pointer", background: "none", border: 0, padding: 0, textAlign: "left" } : undefined}
          onClick={() => onSelectDelivery?.("on_time")}
          disabled={!onSelectDelivery}
        >
          <span>FG Delivered On Time</span>
          <strong className="completion-metrics-value">
            {onTime} ({onTimePercent.toFixed(0)}%)
          </strong>
        </button>
        <button
          type="button"
          className="completion-metrics-legend-button"
          style={onSelectDelivery ? { cursor: "pointer", background: "none", border: 0, padding: 0, textAlign: "left" } : undefined}
          onClick={() => onSelectDelivery?.("late")}
          disabled={!onSelectDelivery}
        >
          <span>FG Delivered Late</span>
          <strong className="completion-metrics-value danger-text">
            {late} ({latePercent.toFixed(0)}%)
          </strong>
        </button>
      </div>
      <div
        className={`completion-metrics-bar${total === 0 ? " completion-metrics-bar--empty" : ""}`}
        role="img"
        aria-label={`${onTimePercent.toFixed(0)} percent FG delivered on time and ${latePercent.toFixed(0)} percent FG delivered late`}
        title={`${onTime} FG delivered on time; ${late} FG delivered late`}
      >
        <span
          className="completion-metrics-segment completion-metrics-segment--on-time"
          style={{ width: `${onTimePercent}%` }}
        />
        <span
          className="completion-metrics-segment completion-metrics-segment--late"
          style={{ width: `${latePercent}%` }}
        />
      </div>
    </div>
  );
}
