import { parseDateValue } from "@/lib/date";
import { parseFgDeliveryDate } from "@/lib/fgUrgency";
import { valueOrNA } from "@/lib/utils";
import type { FgDeliveryMetrics, ProjectRow } from "@/types";

/** Returns on_time | late for CLOSED rows with parseable FG month + closed date; else null. */
export function projectRowFgDeliveryStatus(row: ProjectRow): "on_time" | "late" | null {
  if (valueOrNA(row.final_status) !== "CLOSED") return null;
  const fgDate = parseFgDeliveryDate(row.fg_month);
  const closedAt = parseDateValue(row.updated_at);
  if (!fgDate || !closedAt) return null;
  const fgMonthEnd = fgDate.date(fgDate.daysInMonth()).startOf("day");
  const closedDay = closedAt.startOf("day");
  return closedDay.isAfter(fgMonthEnd) ? "late" : "on_time";
}

export function buildFgDeliveryMetrics(rows: ProjectRow[]): FgDeliveryMetrics {
  let onTime = 0;
  let late = 0;

  for (const row of rows) {
    const status = projectRowFgDeliveryStatus(row);
    if (status === "late") late += 1;
    else if (status === "on_time") onTime += 1;
  }

  return { onTime, late, total: onTime + late };
}
