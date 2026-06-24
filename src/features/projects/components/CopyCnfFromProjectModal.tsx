import { SearchOutlined } from "@ant-design/icons";
import { Input, Modal, Table, Typography } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import { useMemo, useState } from "react";
import type { ProjectSummaryForCnfCopy } from "@/types";

interface CopyCnfFromProjectModalProps {
  open: boolean;
  loading?: boolean;
  projects: ProjectSummaryForCnfCopy[];
  onCancel: () => void;
  onConfirm: (motherProjectId: string) => void;
}

export function CopyCnfFromProjectModal({
  open,
  loading = false,
  projects,
  onCancel,
  onConfirm,
}: CopyCnfFromProjectModalProps) {
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => {
      const blob = [
        project.project_id,
        project.project_owner,
        project.client_name,
        project.product_name,
        project.fg_code,
        project.activity_type,
        project.final_status,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(query);
    });
  }, [projects, search]);

  const columns: ColumnsType<ProjectSummaryForCnfCopy> = [
    { title: "Project ID", dataIndex: "project_id", sorter: (a, b) => a.project_id.localeCompare(b.project_id) },
    { title: "Client", dataIndex: "client_name", sorter: (a, b) => a.client_name.localeCompare(b.client_name) },
    { title: "Product", dataIndex: "product_name", sorter: (a, b) => a.product_name.localeCompare(b.product_name) },
    { title: "FG Code", dataIndex: "fg_code", sorter: (a, b) => a.fg_code.localeCompare(b.fg_code) },
    { title: "Owner", dataIndex: "project_owner", sorter: (a, b) => a.project_owner.localeCompare(b.project_owner) },
    { title: "Activity", dataIndex: "activity_type", sorter: (a, b) => a.activity_type.localeCompare(b.activity_type) },
  ];

  const rowSelection: TableProps<ProjectSummaryForCnfCopy>["rowSelection"] = {
    type: "radio",
    selectedRowKeys: selectedProjectId ? [selectedProjectId] : [],
    onChange: (keys) => setSelectedProjectId(String(keys[0] ?? "") || null),
  };

  return (
    <Modal
      title="Copy CNF Entries from Another Project"
      open={open}
      width={920}
      okText="Copy and Link"
      okButtonProps={{ disabled: !selectedProjectId, loading }}
      onCancel={() => {
        setSearch("");
        setSelectedProjectId(null);
        onCancel();
      }}
      onOk={() => {
        if (!selectedProjectId) return;
        onConfirm(selectedProjectId);
      }}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary">
        Select one active project to use as the Mother Project. All CNF entries will be copied into this child project
        and kept read-only while linked.
      </Typography.Paragraph>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search by Project ID, client, product, FG code, owner, or activity"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{ marginBottom: 12 }}
      />
      <Table
        size="small"
        rowKey="project_id"
        loading={loading}
        dataSource={filtered}
        columns={columns}
        rowSelection={rowSelection}
        pagination={{ pageSize: 8 }}
        onRow={(record) => ({
          onClick: () => setSelectedProjectId(record.project_id),
        })}
      />
    </Modal>
  );
}
