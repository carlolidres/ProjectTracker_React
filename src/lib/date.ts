import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/** Display/storage format for standard date fields (e.g. 31 Aug 2026). */
export const APP_DATE_DISPLAY_FORMAT = "DD MMM YYYY";

/** Display format for FG month in the UI (e.g. Aug 2026). */
export const APP_MONTH_DISPLAY_FORMAT = "MMM YYYY";

const APP_DATE_PARSE_FORMATS = [
  APP_DATE_DISPLAY_FORMAT,
  "D MMM YYYY",
  "DD MMM YYYY",
  "MMM D, YYYY",
  "MMM DD, YYYY",
  "YYYY-MM-DD",
  "YYYY/MM/DD",
  "MM/DD/YYYY",
];

const APP_MONTH_PARSE_FORMATS = [
  APP_MONTH_DISPLAY_FORMAT,
  "MMM YYYY",
  "MMMM YYYY",
  "YYYY-MM",
  "YYYY/MM",
];

export function formatAppDate(value?: string | null): string {
  const parsed = parseAppDateValue(value);
  return parsed ? parsed.format(APP_DATE_DISPLAY_FORMAT) : "-";
}

export function formatAppMonth(value?: string | null): string {
  const parsed = parseFgMonthValue(value);
  return parsed ? parsed.format(APP_MONTH_DISPLAY_FORMAT) : "-";
}

export function formatAppDateTime(value?: string | null): string {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(`${APP_DATE_DISPLAY_FORMAT} h:mm A`) : value;
}

export function getTodayManila(): dayjs.Dayjs {
  return dayjs();
}

export function parseDateValue(value: unknown): dayjs.Dayjs | null {
  return parseAppDateValue(value == null ? null : String(value));
}

export function parseAppDateValue(value?: string | null): dayjs.Dayjs | null {
  const text = String(value ?? "").trim();
  if (!text || text === "N/A") return null;

  for (const format of APP_DATE_PARSE_FORMATS) {
    const parsed = dayjs(text, format, true);
    if (parsed.isValid()) return parsed.startOf("day");
  }

  const loose = dayjs(text);
  return loose.isValid() ? loose.startOf("day") : null;
}

export function parseFgMonthValue(value?: string | null): dayjs.Dayjs | null {
  const text = String(value ?? "").trim();
  if (!text || text === "N/A") return null;

  if (/^\d{4}-\d{2}$/.test(text)) {
    return dayjs(`${text}-01`).startOf("month");
  }

  for (const format of APP_MONTH_PARSE_FORMATS) {
    const parsed = dayjs(text, format, true);
    if (parsed.isValid()) return parsed.startOf("month");
  }

  const asDate = parseAppDateValue(text);
  if (asDate) return asDate.startOf("month");

  const loose = dayjs(text);
  return loose.isValid() ? loose.startOf("month") : null;
}

/** Persist standard dates as ISO date (YYYY-MM-DD). */
export function serializeAppDate(value: dayjs.Dayjs | null | undefined): string {
  if (!value || !value.isValid()) return "";
  return value.startOf("day").format("YYYY-MM-DD");
}

/** Persist FG month as the last day of the selected month (YYYY-MM-DD). */
export function serializeFgMonth(value: dayjs.Dayjs | null | undefined): string {
  if (!value || !value.isValid()) return "";
  return value.endOf("month").startOf("day").format("YYYY-MM-DD");
}

export function daysBetween(from: dayjs.Dayjs, to: dayjs.Dayjs): number {
  return to.startOf("day").diff(from.startOf("day"), "day");
}

export function monthYearMatches(
  fgMonth: string,
  filterMonth?: string,
  filterYear?: string,
): boolean {
  const parsed = parseFgMonthValue(fgMonth);
  if (!parsed) return false;
  if (filterMonth && parsed.format("MM") !== filterMonth.padStart(2, "0")) return false;
  if (filterYear && parsed.format("YYYY") !== filterYear) return false;
  return true;
}

export function normalizeStoredAppDate(value: string): string {
  const text = String(value ?? "").trim();
  if (!text || text === "N/A") return "";
  return serializeAppDate(parseAppDateValue(text)) || text;
}

export function normalizeStoredFgMonth(value: string): string {
  const text = String(value ?? "").trim();
  if (!text || text === "N/A") return "";
  return serializeFgMonth(parseFgMonthValue(text)) || text;
}

export function nowStamp(): string {
  return new Date().toISOString();
}
