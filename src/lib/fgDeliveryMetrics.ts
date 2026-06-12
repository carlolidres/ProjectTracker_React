import { parseDateValue } from "@/lib/date";
import { parseFgDeliveryDate } from "@/lib/fgUrgency";
import { valueOrNA } from "@/lib/utils";
import type { FgDeliveryMetrics, ProjectRow } from "@/types";

export function buildFgDeliveryMetrics(rows: ProjectRow[]): FgDeliveryMetrics {
  let onTime = 0;
  let late = 0;

  for (const row of rows) {
    if (valueOrNA(row.final_status) !== "CLOSED") continue;

    const fgDate = parseFgDeliveryDate(row.fg_month);
    const closedAt = parseDateValue(row.updated_at);
    if (!fgDate || !closedAt) continue;

    const fgMonthEnd = fgDate.date(fgDate.daysInMonth()).startOf("day");
    const closedDay = closedAt.startOf("day");

    if (closedDay.isAfter(fgMonthEnd)) late += 1;
    else onTime += 1;
  }

  return { onTime, late, total: onTime + late };
}
