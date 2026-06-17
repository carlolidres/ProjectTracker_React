import { parseFgDeliveryDate } from "@/lib/fgUrgency";
import { isApprovedOrNotApplicableStatus } from "@/lib/utils";
import type { PoControl } from "@/types";

/** Last calendar day of the FG Month as YYYY-MM-DD (QRMR approval deadline). */
export function qrmrTargetDateFromFgMonth(fgMonth: string): string {
  const fgDate = parseFgDeliveryDate(fgMonth);
  if (!fgDate) return "";
  return fgDate.format("YYYY-MM-DD");
}

/** Sync QRMR target dates on all CNF entries to the FG Month deadline for this PO. */
export function applyQrmrTargetDatesFromFgMonth(po: PoControl): void {
  const targetDate = qrmrTargetDateFromFgMonth(String(po.fg_month ?? ""));
  if (!targetDate) return;

  const entries = po.cnf_entries?.length ? [...po.cnf_entries] : [];
  if (!entries.length) return;

  let changed = false;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (isApprovedOrNotApplicableStatus(entry.qrmr_status)) continue;
    if (entry.qrmr_target_date === targetDate) continue;
    entries[index] = { ...entry, qrmr_target_date: targetDate };
    changed = true;
  }

  if (!changed) return;

  po.cnf_entries = entries;
  const first = entries[0];
  if (first && !isApprovedOrNotApplicableStatus(first.qrmr_status)) {
    po.qrmr_target_date = targetDate;
  }
}
