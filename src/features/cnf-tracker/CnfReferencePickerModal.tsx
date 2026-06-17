import { SearchOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import type { CnfReferenceListItem } from "@/lib/cnfTrackerAggregation";
import { valueOrNA } from "@/lib/utils";

interface CnfReferencePickerModalProps {
  open: boolean;
  references: CnfReferenceListItem[];
  onCancel: () => void;
  onLoad: (cnfReference: string) => void;
}

export function CnfReferencePickerModal({
  open,
  references,
  onCancel,
  onLoad,
}: CnfReferencePickerModalProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return references;
    return references.filter((item) => {
      const blob = [
        item.cnfReference,
        item.projectOwner,
        item.uniqueBatch,
        item.poControlNo,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(query);
    });
  }, [references, search]);

  const columns: ColumnsType<CnfReferenceListItem> = [
    {
      title: "CNF Reference",
      dataIndex: "cnfReference",
      sorter: (a, b) => a.cnfReference.localeCompare(b.cnfReference),
    },
    {
      title: "Project Owner",
      dataIndex: "projectOwner",
      render: (value: string) => valueOrNA(value),
      sorter: (a, b) => a.projectOwner.localeCompare(b.projectOwner),
    },
    {
      title: "Unique Batch No.",
      dataIndex: "uniqueBatch",
      render: (value: string) => valueOrNA(value),
      sorter: (a, b) => a.uniqueBatch.localeCompare(b.uniqueBatch),
    },
    {
      title: "PO Control No.",
      dataIndex: "poControlNo",
      render: (value: string) => valueOrNA(value),
      sorter: (a, b) => a.poControlNo.localeCompare(b.poControlNo),
    },
    {
      title: "",
      key: "action",
      width: 88,
      render: (_value, row) => (
        <Button
          type="link"
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onLoad(row.cnfReference);
          }}
        >
          Load
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title="Select CNF Reference"
      open={open}
      width={920}
      centered
      footer={null}
      destroyOnClose
      className="cnf-reference-picker-modal"
      onCancel={() => {
        setSearch("");
        onCancel();
      }}
    >
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search CNF reference, owner, batch, or PO control no."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="cnf-reference-picker-search"
      />
      <Table
        size="small"
        rowKey="cnfReference"
        dataSource={filtered}
        columns={columns}
        pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
        scroll={{ y: 360 }}
        onRow={(record) => ({
          onDoubleClick: () => onLoad(record.cnfReference),
        })}
      />
    </Modal>
  );
}
