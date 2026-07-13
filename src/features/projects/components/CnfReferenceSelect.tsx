import { AutoComplete, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { filterCnfTrackerRecords } from "@/lib/cnfProjectIntegration";
import { valueOrNA } from "@/lib/utils";
import type { CnfTrackerRecord } from "@/types/cnfTracker";

interface CnfReferenceSelectProps {
  value: string;
  records: CnfTrackerRecord[];
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  onSelectRecord: (record: CnfTrackerRecord) => void;
}

export function CnfReferenceSelect({
  value,
  records,
  disabled,
  readOnly,
  id,
  onSelectRecord,
}: CnfReferenceSelectProps) {
  const display = value === "N/A" ? "" : value;
  const [draft, setDraft] = useState(display);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) setDraft(display);
  }, [display, open]);

  const options = useMemo(() => {
    const filtered = filterCnfTrackerRecords(records, draft);
    return filtered.slice(0, 25).map((record) => ({
      value: `${record.cnf_tracker_id}::${record.cnf_reference}`,
      record,
      label: (
        <div className="cnf-reference-select-option">
          <Typography.Text strong>{valueOrNA(record.cnf_reference)}</Typography.Text>
          <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
            {valueOrNA(record.cnf_initiator)} — {valueOrNA(record.change_description)}
          </Typography.Text>
        </div>
      ),
    }));
  }, [records, draft]);

  if (readOnly || disabled) {
    return <Typography.Text id={id}>{valueOrNA(value)}</Typography.Text>;
  }

  return (
    <AutoComplete
      id={id}
      className="cnf-reference-select"
      value={draft}
      open={open}
      options={options}
      style={{ width: "100%" }}
      placeholder="Search and select CNF Reference"
      filterOption={false}
      onSearch={setDraft}
      onDropdownVisibleChange={setOpen}
      onSelect={(_selected, option) => {
        const record = (option as { record?: CnfTrackerRecord }).record;
        if (record) {
          onSelectRecord(record);
          setDraft(record.cnf_reference);
          setOpen(false);
        }
      }}
      onBlur={() => {
        setDraft(display);
        setOpen(false);
      }}
      allowClear
      onClear={() => setDraft("")}
      getPopupContainer={(node) => node.parentElement ?? document.body}
    />
  );
}
