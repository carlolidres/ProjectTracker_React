import { Button, Input, Modal, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import { filterCnfTrackerRecords } from "@/lib/cnfProjectIntegration";
import { valueOrNA } from "@/lib/utils";
import type { CnfTrackerRecord } from "@/types/cnfTracker";

interface CnfTrackerSelectModalProps {
  open: boolean;
  records: CnfTrackerRecord[];
  loading?: boolean;
  canCreate?: boolean;
  onCancel: () => void;
  onSelect: (record: CnfTrackerRecord) => void;
  onPreview?: (record: CnfTrackerRecord) => void;
  onNewCnf?: () => void;
}

export function CnfTrackerSelectModal({
  open,
  records,
  loading,
  canCreate,
  onCancel,
  onSelect,
  onPreview,
  onNewCnf,
}: CnfTrackerSelectModalProps) {
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<CnfTrackerRecord | null>(null);

  const filtered = useMemo(() => filterCnfTrackerRecords(records, search), [records, search]);

  const columns: ColumnsType<CnfTrackerRecord> = [
    {
      title: "CNF Reference",
      dataIndex: "cnf_reference",
      key: "cnf_reference",
      width: 160,
      render: (value: string) => valueOrNA(value),
    },
    {
      title: "CNF Initiator",
      dataIndex: "cnf_initiator",
      key: "cnf_initiator",
      width: 140,
      render: (value: string) => valueOrNA(value),
    },
    {
      title: "Description of Change",
      dataIndex: "change_description",
      key: "change_description",
      ellipsis: true,
      render: (value: string) => valueOrNA(value),
    },
    {
      title: "QRMR No.",
      dataIndex: "qrmr_no",
      key: "qrmr_no",
      width: 120,
      render: (value: string) => valueOrNA(value),
    },
    {
      title: "Tracker Status",
      dataIndex: "tracker_status",
      key: "tracker_status",
      width: 120,
      render: (value: string) => <Tag>{valueOrNA(value)}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            onClick={() => {
              setPreview(record);
              onPreview?.(record);
            }}
          >
            Preview
          </Button>
          <Button type="primary" size="small" onClick={() => onSelect(record)}>
            Select
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title="Insert CNF"
      onCancel={onCancel}
      footer={null}
      width="min(96vw, 960px)"
      centered
      destroyOnHidden
      className="cnf-tracker-select-modal"
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Input.Search
          allowClear
          placeholder="Search CNF, initiator, description, QRMR, batch, status…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        {canCreate && onNewCnf ? (
          <Button type="primary" onClick={onNewCnf}>
            New CNF
          </Button>
        ) : null}
      </div>

      {preview ? (
        <div className="cnf-tracker-select-preview" style={{ marginBottom: 12 }}>
          <Typography.Text strong>Preview: </Typography.Text>
          <Typography.Text>
            {valueOrNA(preview.cnf_reference)} — {valueOrNA(preview.cnf_initiator)} —{" "}
            {valueOrNA(preview.change_description)}
          </Typography.Text>
        </div>
      ) : null}

      <Table
        size="small"
        rowKey={(row) => row.record_id || row.cnf_tracker_id}
        loading={loading}
        dataSource={filtered}
        columns={columns}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        scroll={{ x: 900, y: 360 }}
        locale={{ emptyText: "No matching CNF records" }}
      />
    </Modal>
  );
}
