import { DatePicker, Input } from "antd";
import type { Dayjs } from "dayjs";
import {
  APP_DATE_DISPLAY_FORMAT,
  APP_MONTH_DISPLAY_FORMAT,
  formatAppDate,
  formatAppMonth,
  parseAppDateValue,
  parseFgMonthValue,
  serializeAppDate,
  serializeFgMonth,
} from "@/lib/date";

interface AppDatePickerProps {
  id?: string;
  value: string;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (value: string) => void;
  className?: string;
}

export function AppDatePicker({
  id,
  value,
  disabled = false,
  readOnly = false,
  onChange,
  className,
}: AppDatePickerProps) {
  if (readOnly) {
    return (
      <Input
        id={id}
        readOnly
        disabled
        value={formatAppDate(value)}
        className={className}
      />
    );
  }

  const parsed = parseAppDateValue(value);

  return (
    <DatePicker
      id={id}
      className={className}
      style={{ width: "100%" }}
      format={APP_DATE_DISPLAY_FORMAT}
      value={parsed}
      disabled={disabled}
      allowClear
      inputReadOnly={false}
      onChange={(next: Dayjs | null) => onChange(serializeAppDate(next))}
    />
  );
}

export function AppMonthPicker({
  id,
  value,
  disabled = false,
  readOnly = false,
  onChange,
  className,
}: AppDatePickerProps) {
  if (readOnly) {
    return (
      <Input
        id={id}
        readOnly
        disabled
        value={formatAppMonth(value)}
        className={className}
      />
    );
  }

  const parsed = parseFgMonthValue(value);

  return (
    <DatePicker
      id={id}
      className={className}
      style={{ width: "100%" }}
      picker="month"
      format={APP_MONTH_DISPLAY_FORMAT}
      value={parsed}
      disabled={disabled}
      allowClear
      inputReadOnly={false}
      onChange={(next: Dayjs | null) => onChange(serializeFgMonth(next))}
    />
  );
}
