import dayjs from "dayjs";

export function formatAppDate(value?: string | null): string {
  if (!value || value === "N/A") return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("MMM D, YYYY") : value;
}

export function formatAppMonth(value?: string | null): string {
  if (!value || value === "N/A") return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("MMM YYYY") : value;
}

export function formatAppDateTime(value?: string | null): string {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("MMM D, YYYY h:mm A") : value;
}

export function getTodayManila(): dayjs.Dayjs {
  return dayjs();
}

export function parseDateValue(value: unknown): dayjs.Dayjs | null {
  if (!value || value === "N/A") return null;
  const parsed = dayjs(String(value));
  return parsed.isValid() ? parsed : null;
}

export function daysBetween(from: dayjs.Dayjs, to: dayjs.Dayjs): number {
  return to.startOf("day").diff(from.startOf("day"), "day");
}

export function monthYearMatches(
  fgMonth: string,
  filterMonth?: string,
  filterYear?: string,
): boolean {
  const parsed = parseDateValue(fgMonth);
  if (!parsed) return false;
  if (filterMonth && parsed.format("MM") !== filterMonth.padStart(2, "0")) return false;
  if (filterYear && parsed.format("YYYY") !== filterYear) return false;
  return true;
}

export function nowStamp(): string {
  return new Date().toISOString();
}
