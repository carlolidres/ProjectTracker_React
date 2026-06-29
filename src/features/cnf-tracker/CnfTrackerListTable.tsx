import { ReloadOutlined, SearchOutlined, SettingOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Checkbox,
  Dropdown,
  Empty,
  Input,
  Skeleton,
  Table,
  Typography,
} from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import type { CheckboxOptionType } from "antd/es/checkbox";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TruncatedCell } from "@/components/common/truncated-cell";
import { WorkflowStatusBadge } from "@/components/common/workflow-status-badge";
import { formatAppDate, formatFgMonthDate } from "@/lib/date";
import {
  type CnfTrackerListRow,
  dateSortValue,
  fgMonthSortValue,
  filterCnfTrackerListRows,
} from "@/lib/cnfTrackerList";
import { valueOrNA } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 7;
const DEFAULT_ROW_HEIGHT = 47;

const COLUMN_KEYS = [
  "cnfNo",
  "qrmrNo",
  "productName",
  "productCode",
  "uniqueBatchNo",
  "client",
  "descriptionOfChange",
  "department",
  "valActivity",
  "valBatchSeqNo",
  "poControlNumber",
  "fgMonthDate",
  "closedDate",
  "protocolNo",
  "protocolStatus",
  "interimReportNo",
  "interimReportStatus",
  "finalReportNo",
  "finalReportStatus",
  "endorsementNo",
  "endorsementStatus",
  "actions",
] as const;

type ColumnKey = (typeof COLUMN_KEYS)[number];

const COLUMN_LABELS: Record<ColumnKey, string> = {
  cnfNo: "CNF No.",
  qrmrNo: "QRMR No.",
  productName: "Product Name",
  productCode: "Product Code",
  uniqueBatchNo: "Unique Batch No.",
  client: "Client",
  descriptionOfChange: "Description of Change",
  department: "Department",
  valActivity: "Val Activity",
  valBatchSeqNo: "Val Batch Seq. No.",
  poControlNumber: "PO Control Number",
  fgMonthDate: "FG Month Date",
  closedDate: "Closed Date",
  protocolNo: "Protocol No.",
  protocolStatus: "Protocol Status",
  interimReportNo: "Interim Report No.",
  interimReportStatus: "Interim Report Status",
  finalReportNo: "Final Report No.",
  finalReportStatus: "Final Report Status",
  endorsementNo: "Endorsement No.",
  endorsementStatus: "Endorsement Status",
  actions: "Actions",
};

const DEFAULT_WIDTHS: Record<ColumnKey, number> = {
  cnfNo: 200,
  qrmrNo: 120,
  productName: 180,
  productCode: 120,
  uniqueBatchNo: 140,
  client: 160,
  descriptionOfChange: 220,
  department: 120,
  valActivity: 120,
  valBatchSeqNo: 140,
  poControlNumber: 150,
  fgMonthDate: 130,
  closedDate: 130,
  protocolNo: 130,
  protocolStatus: 150,
  interimReportNo: 150,
  interimReportStatus: 170,
  finalReportNo: 140,
  finalReportStatus: 160,
  endorsementNo: 140,
  endorsementStatus: 170,
  actions: 90,
};

interface ResizableTitleProps extends React.HTMLAttributes<HTMLTableCellElement> {
  width?: number;
  onResizeStart?: (event: React.MouseEvent) => void;
}

function ResizableTitle({ width, onResizeStart, style, children, ...rest }: ResizableTitleProps) {
  return (
    <th {...rest} style={{ ...style, width, position: "relative" }}>
      {children}
      {width && onResizeStart ? (
        <span
          className="cnf-tracker-resize-handle"
          onMouseDown={onResizeStart}
          onClick={(event) => event.stopPropagation()}
          aria-hidden
        />
      ) : null}
    </th>
  );
}

interface CnfTrackerListTableProps {
  rows: CnfTrackerListRow[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onLoad: (row: CnfTrackerListRow) => void;
}

export function CnfTrackerListTable({
  rows,
  loading,
  error,
  onRetry,
  onLoad,
}: CnfTrackerListTableProps) {
  const [search, setSearch] = useState("");
  const [columnWidths, setColumnWidths] = useState(DEFAULT_WIDTHS);
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnKey>>(new Set());
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT);
  const tableWrapRef = useRef<HTMLDivElement>(null);

  const filteredRows = useMemo(() => filterCnfTrackerListRows(rows, search), [rows, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredRows.length / pageSize) || 1);
    if (currentPage > maxPage) setCurrentPage(maxPage);
  }, [filteredRows.length, pageSize, currentPage]);

  const rowsOnPage = useMemo(() => {
    if (!filteredRows.length) return 1;
    const start = (currentPage - 1) * pageSize;
    return Math.min(pageSize, Math.max(0, filteredRows.length - start));
  }, [filteredRows.length, currentPage, pageSize]);

  const tableBodyHeight = Math.ceil(rowHeight * rowsOnPage);

  const handleResize = useCallback((key: ColumnKey) => {
    return (event: React.MouseEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = columnWidths[key];

      function onMouseMove(moveEvent: MouseEvent) {
        const nextWidth = Math.max(80, startWidth + moveEvent.clientX - startX);
        setColumnWidths((current) => ({ ...current, [key]: nextWidth }));
      }

      function onMouseUp() {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      }

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };
  }, [columnWidths]);

  const columnVisibilityOptions: CheckboxOptionType<ColumnKey>[] = COLUMN_KEYS.filter(
    (key) => key !== "actions" && key !== "cnfNo",
  ).map((key) => ({
    label: COLUMN_LABELS[key],
    value: key,
  }));

  const allColumns: ColumnsType<CnfTrackerListRow> = useMemo(
    () => [
      {
        title: COLUMN_LABELS.cnfNo,
        dataIndex: "cnfNo",
        key: "cnfNo",
        fixed: "left",
        width: columnWidths.cnfNo,
        sorter: (a, b) => a.cnfNo.localeCompare(b.cnfNo),
        onHeaderCell: () => ({
          width: columnWidths.cnfNo,
          onResizeStart: handleResize("cnfNo"),
        }),
        render: (value: string) => <Typography.Text strong>{valueOrNA(value)}</Typography.Text>,
      },
      {
        title: COLUMN_LABELS.qrmrNo,
        dataIndex: "qrmrNo",
        key: "qrmrNo",
        width: columnWidths.qrmrNo,
        sorter: (a, b) => a.qrmrNo.localeCompare(b.qrmrNo),
        onHeaderCell: () => ({ width: columnWidths.qrmrNo, onResizeStart: handleResize("qrmrNo") }),
        filters: [...new Set(rows.map((row) => row.qrmrNo))].slice(0, 20).map((value) => ({
          text: value,
          value,
        })),
        onFilter: (value, record) => record.qrmrNo === value,
      },
      {
        title: COLUMN_LABELS.productName,
        dataIndex: "productName",
        key: "productName",
        width: columnWidths.productName,
        sorter: (a, b) => a.productName.localeCompare(b.productName),
        onHeaderCell: () => ({ width: columnWidths.productName, onResizeStart: handleResize("productName") }),
        render: (value: string) => <TruncatedCell value={valueOrNA(value)} maxWidth={columnWidths.productName - 16} />,
      },
      {
        title: COLUMN_LABELS.productCode,
        dataIndex: "productCode",
        key: "productCode",
        width: columnWidths.productCode,
        sorter: (a, b) => a.productCode.localeCompare(b.productCode),
        onHeaderCell: () => ({ width: columnWidths.productCode, onResizeStart: handleResize("productCode") }),
      },
      {
        title: COLUMN_LABELS.uniqueBatchNo,
        dataIndex: "uniqueBatchNo",
        key: "uniqueBatchNo",
        width: columnWidths.uniqueBatchNo,
        sorter: (a, b) => a.uniqueBatchNo.localeCompare(b.uniqueBatchNo),
        onHeaderCell: () => ({
          width: columnWidths.uniqueBatchNo,
          onResizeStart: handleResize("uniqueBatchNo"),
        }),
      },
      {
        title: COLUMN_LABELS.client,
        dataIndex: "client",
        key: "client",
        width: columnWidths.client,
        sorter: (a, b) => a.client.localeCompare(b.client),
        onHeaderCell: () => ({ width: columnWidths.client, onResizeStart: handleResize("client") }),
        render: (value: string) => <TruncatedCell value={valueOrNA(value)} maxWidth={columnWidths.client - 16} />,
      },
      {
        title: COLUMN_LABELS.descriptionOfChange,
        dataIndex: "descriptionOfChange",
        key: "descriptionOfChange",
        width: columnWidths.descriptionOfChange,
        sorter: (a, b) => a.descriptionOfChange.localeCompare(b.descriptionOfChange),
        onHeaderCell: () => ({
          width: columnWidths.descriptionOfChange,
          onResizeStart: handleResize("descriptionOfChange"),
        }),
        render: (value: string) => (
          <TruncatedCell value={valueOrNA(value)} maxWidth={columnWidths.descriptionOfChange - 16} />
        ),
      },
      {
        title: COLUMN_LABELS.department,
        dataIndex: "department",
        key: "department",
        width: columnWidths.department,
        sorter: (a, b) => a.department.localeCompare(b.department),
        onHeaderCell: () => ({ width: columnWidths.department, onResizeStart: handleResize("department") }),
        filters: [...new Set(rows.map((row) => row.department))].slice(0, 20).map((value) => ({
          text: value,
          value,
        })),
        onFilter: (value, record) => record.department === value,
      },
      {
        title: COLUMN_LABELS.valActivity,
        dataIndex: "valActivity",
        key: "valActivity",
        width: columnWidths.valActivity,
        sorter: (a, b) => a.valActivity.localeCompare(b.valActivity),
        onHeaderCell: () => ({ width: columnWidths.valActivity, onResizeStart: handleResize("valActivity") }),
      },
      {
        title: COLUMN_LABELS.valBatchSeqNo,
        dataIndex: "valBatchSeqNo",
        key: "valBatchSeqNo",
        width: columnWidths.valBatchSeqNo,
        sorter: (a, b) => a.valBatchSeqNo.localeCompare(b.valBatchSeqNo),
        onHeaderCell: () => ({
          width: columnWidths.valBatchSeqNo,
          onResizeStart: handleResize("valBatchSeqNo"),
        }),
      },
      {
        title: COLUMN_LABELS.poControlNumber,
        dataIndex: "poControlNumber",
        key: "poControlNumber",
        width: columnWidths.poControlNumber,
        sorter: (a, b) => a.poControlNumber.localeCompare(b.poControlNumber),
        onHeaderCell: () => ({
          width: columnWidths.poControlNumber,
          onResizeStart: handleResize("poControlNumber"),
        }),
      },
      {
        title: COLUMN_LABELS.fgMonthDate,
        key: "fgMonthDate",
        width: columnWidths.fgMonthDate,
        sorter: (a, b) => fgMonthSortValue(a.fgMonthRaw) - fgMonthSortValue(b.fgMonthRaw),
        onHeaderCell: () => ({ width: columnWidths.fgMonthDate, onResizeStart: handleResize("fgMonthDate") }),
        render: (_value, record) => formatFgMonthDate(record.fgMonthRaw),
      },
      {
        title: COLUMN_LABELS.closedDate,
        key: "closedDate",
        width: columnWidths.closedDate,
        sorter: (a, b) => dateSortValue(a.closedDateRaw) - dateSortValue(b.closedDateRaw),
        onHeaderCell: () => ({ width: columnWidths.closedDate, onResizeStart: handleResize("closedDate") }),
        render: (_value, record) => formatAppDate(record.closedDateRaw),
      },
      {
        title: COLUMN_LABELS.protocolNo,
        dataIndex: "protocolNo",
        key: "protocolNo",
        width: columnWidths.protocolNo,
        sorter: (a, b) => a.protocolNo.localeCompare(b.protocolNo),
        onHeaderCell: () => ({ width: columnWidths.protocolNo, onResizeStart: handleResize("protocolNo") }),
      },
      {
        title: COLUMN_LABELS.protocolStatus,
        dataIndex: "protocolStatus",
        key: "protocolStatus",
        width: columnWidths.protocolStatus,
        sorter: (a, b) => a.protocolStatus.localeCompare(b.protocolStatus),
        onHeaderCell: () => ({
          width: columnWidths.protocolStatus,
          onResizeStart: handleResize("protocolStatus"),
        }),
        render: (value: string) => <WorkflowStatusBadge status={value} />,
      },
      {
        title: COLUMN_LABELS.interimReportNo,
        dataIndex: "interimReportNo",
        key: "interimReportNo",
        width: columnWidths.interimReportNo,
        sorter: (a, b) => a.interimReportNo.localeCompare(b.interimReportNo),
        onHeaderCell: () => ({
          width: columnWidths.interimReportNo,
          onResizeStart: handleResize("interimReportNo"),
        }),
      },
      {
        title: COLUMN_LABELS.interimReportStatus,
        dataIndex: "interimReportStatus",
        key: "interimReportStatus",
        width: columnWidths.interimReportStatus,
        sorter: (a, b) => a.interimReportStatus.localeCompare(b.interimReportStatus),
        onHeaderCell: () => ({
          width: columnWidths.interimReportStatus,
          onResizeStart: handleResize("interimReportStatus"),
        }),
        render: (value: string) => <WorkflowStatusBadge status={value} />,
      },
      {
        title: COLUMN_LABELS.finalReportNo,
        dataIndex: "finalReportNo",
        key: "finalReportNo",
        width: columnWidths.finalReportNo,
        sorter: (a, b) => a.finalReportNo.localeCompare(b.finalReportNo),
        onHeaderCell: () => ({
          width: columnWidths.finalReportNo,
          onResizeStart: handleResize("finalReportNo"),
        }),
      },
      {
        title: COLUMN_LABELS.finalReportStatus,
        dataIndex: "finalReportStatus",
        key: "finalReportStatus",
        width: columnWidths.finalReportStatus,
        sorter: (a, b) => a.finalReportStatus.localeCompare(b.finalReportStatus),
        onHeaderCell: () => ({
          width: columnWidths.finalReportStatus,
          onResizeStart: handleResize("finalReportStatus"),
        }),
        render: (value: string) => <WorkflowStatusBadge status={value} />,
      },
      {
        title: COLUMN_LABELS.endorsementNo,
        dataIndex: "endorsementNo",
        key: "endorsementNo",
        width: columnWidths.endorsementNo,
        sorter: (a, b) => a.endorsementNo.localeCompare(b.endorsementNo),
        onHeaderCell: () => ({
          width: columnWidths.endorsementNo,
          onResizeStart: handleResize("endorsementNo"),
        }),
      },
      {
        title: COLUMN_LABELS.endorsementStatus,
        dataIndex: "endorsementStatus",
        key: "endorsementStatus",
        width: columnWidths.endorsementStatus,
        sorter: (a, b) => a.endorsementStatus.localeCompare(b.endorsementStatus),
        onHeaderCell: () => ({
          width: columnWidths.endorsementStatus,
          onResizeStart: handleResize("endorsementStatus"),
        }),
        render: (value: string) => <WorkflowStatusBadge status={value} />,
      },
      {
        title: COLUMN_LABELS.actions,
        key: "actions",
        fixed: "right",
        width: columnWidths.actions,
        onHeaderCell: () => ({ width: columnWidths.actions }),
        render: (_value, record) => (
          <Button
            type="link"
            size="small"
            aria-label={`Load CNF ${record.cnfNo}`}
            onClick={(event) => {
              event.stopPropagation();
              onLoad(record);
            }}
          >
            Load
          </Button>
        ),
      },
    ],
    [columnWidths, handleResize, onLoad, rows],
  );

  const visibleColumns = useMemo(
    () =>
      allColumns.filter((column) => {
        const key = String(column.key) as ColumnKey;
        if (key === "cnfNo" || key === "actions") return true;
        return !hiddenColumns.has(key);
      }),
    [allColumns, hiddenColumns],
  );

  const tableComponents: TableProps<CnfTrackerListRow>["components"] = {
    header: {
      cell: ResizableTitle,
    },
  };

  useLayoutEffect(() => {
    const measureRowHeight = () => {
      const table = tableWrapRef.current?.querySelector(".cnf-tracker-list-table");
      const sampleRow = table?.querySelector(".ant-table-tbody > tr.ant-table-row");
      if (sampleRow instanceof HTMLElement) {
        const measured = sampleRow.getBoundingClientRect().height;
        if (measured > 0) setRowHeight(measured);
      }
    };

    measureRowHeight();
    const observer = new ResizeObserver(measureRowHeight);
    if (tableWrapRef.current) observer.observe(tableWrapRef.current);
    window.addEventListener("resize", measureRowHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureRowHeight);
    };
  }, [filteredRows, loading, pageSize, currentPage, visibleColumns]);

  return (
    <section className="cnf-tracker-list-panel" aria-label="CNF Tracker list">
      <div className="cnf-tracker-list-toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined aria-hidden />}
          placeholder="Search CNF, QRMR, product, client, protocol, reports…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="cnf-tracker-list-search"
          aria-label="Search CNF tracker records"
        />
        <div className="cnf-tracker-list-toolbar-actions">
          <Dropdown
            trigger={["click"]}
            dropdownRender={() => (
              <div className="cnf-tracker-column-settings">
                <Typography.Text strong>Show columns</Typography.Text>
                <Checkbox.Group
                  options={columnVisibilityOptions}
                  value={COLUMN_KEYS.filter(
                    (key) => key !== "cnfNo" && key !== "actions" && !hiddenColumns.has(key),
                  )}
                  onChange={(checked) => {
                    const visible = new Set(checked as ColumnKey[]);
                    const nextHidden = new Set<ColumnKey>();
                    for (const key of COLUMN_KEYS) {
                      if (key === "cnfNo" || key === "actions") continue;
                      if (!visible.has(key)) nextHidden.add(key);
                    }
                    setHiddenColumns(nextHidden);
                  }}
                />
              </div>
            )}
          >
            <Button icon={<SettingOutlined />} aria-label="Column visibility settings">
              Columns
            </Button>
          </Dropdown>
          <Button icon={<ReloadOutlined />} onClick={onRetry} loading={loading} aria-label="Retry loading CNF list">
            Retry
          </Button>
        </div>
      </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Failed to load CNF Tracker list"
          description={error}
          action={
            <Button size="small" onClick={onRetry}>
              Retry
            </Button>
          }
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <div ref={tableWrapRef} className="cnf-tracker-list-table-wrap">
        {loading && !rows.length ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <Table<CnfTrackerListRow>
            className="cnf-tracker-list-table"
            size="small"
            rowKey="rowKey"
            components={tableComponents}
            dataSource={filteredRows}
            columns={visibleColumns}
            scroll={{ x: "max-content", y: tableBodyHeight }}
            pagination={{
              current: currentPage,
              pageSize,
              showSizeChanger: true,
              pageSizeOptions: ["7", "10", "20", "50", "100"],
              showTotal: (total) => `${total} CNF record${total === 1 ? "" : "s"}`,
              onChange: (page, size) => {
                setCurrentPage(page);
                if (size && size !== pageSize) setPageSize(size);
              },
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={search ? "No CNF records match your search" : "No CNF records found"}
                />
              ),
            }}
            onRow={(record) => ({
              onDoubleClick: () => onLoad(record),
            })}
          />
        )}
      </div>
    </section>
  );
}
