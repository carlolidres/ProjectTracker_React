import { DownloadOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRegistry } from "@/app/registry-provider";
import { ProjectIdLink } from "@/components/common/project-id-link";
import { AppShell } from "@/components/layout/app-shell";
import { formatAppDate, formatAppDateTime, formatAppMonth } from "@/lib/date";
import { isMissingValue } from "@/lib/utils";
import { exportLessonsLearnedToExcel } from "@/services/exportService";
import { listLessonsLearned } from "@/services/lessonsLearnedService";
import {
  LESSON_CATEGORY_DATE_ADJUSTMENT,
  type LessonLearned,
  type LessonLearnedFilters,
} from "@/types/lessonsLearned";

export function LessonsLearnedPage() {
  const { registry } = useRegistry();
  const [rows, setRows] = useState<LessonLearned[]>([]);
  const [filters, setFilters] = useState<LessonLearnedFilters>({
    category: LESSON_CATEGORY_DATE_ADJUSTMENT,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listLessonsLearned(filters));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lessons learned");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const reasonOptions = useMemo(
    () => (registry.date_adjustment_reason ?? []).map((value) => ({ label: value, value })),
    [registry.date_adjustment_reason],
  );

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Lessons Learned</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Recorded reasons when users adjust dates on project and support activity forms.
          </Typography.Paragraph>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Refresh
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => {
              exportLessonsLearnedToExcel(rows);
              message.success("Export started");
            }}
            disabled={!rows.length}
          >
            Export Data to Excel
          </Button>
        </Space>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search lessons learned"
              value={filters.search}
              onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
              allowClear
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="Category"
              style={{ width: "100%" }}
              value={filters.category}
              options={[{ label: LESSON_CATEGORY_DATE_ADJUSTMENT, value: LESSON_CATEGORY_DATE_ADJUSTMENT }]}
              onChange={(category) => setFilters((current) => ({ ...current, category }))}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="Reason category"
              style={{ width: "100%" }}
              value={filters.reason_category}
              options={reasonOptions}
              onChange={(reason_category) => setFilters((current) => ({ ...current, reason_category }))}
            />
          </Col>
          <Col xs={24} md={4}>
            <Input
              placeholder="User email"
              value={filters.user}
              onChange={(e) => setFilters((current) => ({ ...current, user: e.target.value }))}
            />
          </Col>
          <Col xs={24} md={4}>
            <Input
              placeholder="Project ID"
              value={filters.project_id}
              onChange={(e) => setFilters((current) => ({ ...current, project_id: e.target.value }))}
            />
          </Col>
          <Col xs={24} md={6}>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              onChange={(dates) =>
                setFilters((current) => ({
                  ...current,
                  startDate: dates?.[0]?.startOf("day").toISOString(),
                  endDate: dates?.[1]?.endOf("day").toISOString(),
                }))
              }
            />
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div className="page-loading"><Spin size="large" /></div>
      ) : (
        <Table
          className="lessons-learned-table"
          rowKey="id"
          dataSource={rows}
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 25, showSizeChanger: true }}
          columns={[
            {
              title: "Lesson ID",
              dataIndex: "lesson_id",
              align: "left",
              width: 140,
              render: (value: string, record: LessonLearned) => value || record.id,
            },
            {
              title: "Date and Time",
              dataIndex: "created_at",
              align: "left",
              width: 180,
              render: (value: string) => formatAppDateTime(value),
            },
            { title: "User", dataIndex: "user_email", align: "left", width: 180, ellipsis: true },
            { title: "User Group", dataIndex: "user_role", align: "left", width: 120 },
            { title: "Category", dataIndex: "category", align: "left", width: 200 },
            { title: "Reason", dataIndex: "reason_category", align: "left", width: 140 },
            {
              title: "Description",
              dataIndex: "description",
              align: "left",
              ellipsis: true,
            },
            { title: "Module", dataIndex: "source_module", align: "left", width: 140 },
            {
              title: "Project ID",
              dataIndex: "project_id",
              align: "left",
              width: 130,
              render: (projectId: string) =>
                isMissingValue(projectId) ? "N/A" : <ProjectIdLink projectId={projectId} />,
            },
            { title: "Location", dataIndex: "record_context", align: "left", width: 180, ellipsis: true },
            { title: "Field", dataIndex: "field_label", align: "left", width: 180 },
            {
              title: "Old Date",
              dataIndex: "old_date",
              align: "left",
              width: 120,
              render: (value: string, record: LessonLearned) =>
                record.field_name === "fg_month" ? formatAppMonth(value) : formatAppDate(value),
            },
            {
              title: "New Date",
              dataIndex: "new_date",
              align: "left",
              width: 120,
              render: (value: string, record: LessonLearned) =>
                record.field_name === "fg_month" ? formatAppMonth(value) : formatAppDate(value),
            },
          ]}
        />
      )}
    </AppShell>
  );
}
