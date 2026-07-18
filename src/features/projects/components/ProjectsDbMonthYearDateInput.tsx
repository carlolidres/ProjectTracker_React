import { DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { APP_MONTH_DISPLAY_FORMAT } from "@/lib/date";

/** AG Grid `agDateInput` — month calendar only (MMM YYYY). */
export function ProjectsDbMonthYearDateInput(props: {
  date: Date | null;
  onDateChange: (date: Date | null) => void;
}) {
  const value = props.date ? dayjs(props.date).startOf("month") : null;

  return (
    <DatePicker
      picker="month"
      format={APP_MONTH_DISPLAY_FORMAT}
      placeholder={APP_MONTH_DISPLAY_FORMAT}
      value={value?.isValid() ? value : null}
      allowClear
      style={{ width: "100%" }}
      inputReadOnly={false}
      popupClassName="ag-custom-component-popup projects-db-month-filter-popup"
      getPopupContainer={() => document.body}
      onChange={(next: Dayjs | null) => {
        props.onDateChange(next?.isValid() ? next.startOf("month").toDate() : null);
      }}
    />
  );
}
