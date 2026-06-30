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
import {
  CNF_TRACKER_LIST_COLUMN_KEYS,
  CNF_TRACKER_LIST_COLUMN_LABELS,
  CNF_TRACKER_LIST_DEFAULT_WIDTHS,
  type CnfTrackerListColumnKey,
} from "@/lib/cnfTrackerTableColumns";

const DEFAULT_PAGE_SIZE = 7;
const DEFAULT_ROW_HEIGHT = 47;

interface ResizableTitleProps extends React.HTMLAttributes<HTMLTableCellElement> {
  width?: number;
  onResizeStart?: (event: React.MouseEvent) => void;
  colSpan?: number;
}

function ResizableTitle({ width, onResizeStart, style, children, colSpan, ...rest }: ResizableTitleProps) {
  if (colSpan === 0) {
    return null;
  }
  if (!onResizeStart) {
    return (
      <th {...rest} colSpan={colSpan} style={style}>
        {children}
      </th>
    );
  }
  return (
    <th {...rest} colSpan={colSpan} style={{ ...style, width, position: "relative" }}>
      {children}
      {width ? (
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
  const [columnWidths, setColumnWidths] = useState(CNF_TRACKER_LIST_DEFAULT_WIDTHS);
  const [hiddenColumns, setHiddenColumns] = useState<Set<CnfTrackerListColumnKey>>(new Set());
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

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

  const handleResize = useCallback((key: CnfTrackerListColumnKey) => {
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

  const columnVisibilityOptions: CheckboxOptionType<CnfTrackerListColumnKey>[] = CNF_TRACKER_LIST_COLUMN_KEYS.filter(
    (key) => key !== "load" && key !== "cnfNo",
  ).map((key) => ({
    label: CNF_TRACKER_LIST_COLUMN_LABELS[key],
    value: key,
  }));

  const allColumns: ColumnsType<CnfTrackerListRow> = useMemo(
    () => [
      {
        title: CNF_TRACKER_LIST_COLUMN_LABELS.cnfNo,
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
        title: CNF_TRACKER_LIST_COLUMN_LABELS.qrmrNo,
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
        title: CNF_TRACKER_LIST_COLUMN_LABELS.productName,
        dataIndex: "productName",
        key: "productName",
        width: columnWidths.productName,
        sorter: (a, b) => a.productName.localeCompare(b.productName),
        onHeaderCell: () => ({ width: columnWidths.productName, onResizeStart: handleResize("productName") }),
        render: (value: string) => <TruncatedCell value={valueOrNA(value)} maxWidth={columnWidths.productName - 16} />,
      },
      {
        title: CNF_TRACKER_LIST_COLUMN_LABELS.productCode,
        dataIndex: "productCode",
        key: "productCode",
        width: columnWidths.productCode,
        sorter: (a, b) => a.productCode.localeCompare(b.productCode),
        onHeaderCell: () => ({ width: columnWidths.productCode, onResizeStart: handleResize("productCode") }),
      },
      {
        title: CNF_TRACKER_LIST_COLUMN_LABELS.uniqueBatchNo,
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
        title: CNF_TRACKER_LIST_COLUMN_LABELS.client,
        dataIndex: "client",
        key: "client",
        width: columnWidths.client,
        sorter: (a, b) => a.client.localeCompare(b.client),
        onHeaderCell: () => ({ width: columnWidths.client, onResizeStart: handleResize("client") }),
        render: (value: string) => <TruncatedCell value={valueOrNA(value)} maxWidth={columnWidths.client - 16} />,
      },
      {
        title: CNF_TRACKER_LIST_COLUMN_LABELS.descriptionOfChange,
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
        title: CNF_TRACKER_LIST_COLUMN_LABELS.department,
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
        title: CNF_TRACKER_LIST_COLUMN_LABELS.valActivity,
        dataIndex: "valActivity",
        key: "valActivity",
        width: columnWidths.valActivity,
        sorter: (a, b) => a.valActivity.localeCompare(b.valActivity),
        onHeaderCell: () => ({ width: columnWidths.valActivity, onResizeStart: handleResize("valActivity") }),
      },
      {
        title: CNF_TRACKER_LIST_COLUMN_LABELS.valBatchSeqNo,
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
        title: CNF_TRACKER_LIST_COLUMN_LABELS.poControlNumber,
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
        title: CNF_TRACKER_LIST_COLUMN_LABELS.fgMonthDate,
        key: "fgMonthDate",
        width: columnWidths.fgMonthDate,
        sorter: (a, b) => fgMonthSortValue(a.fgMonthRaw) - fgMonthSortValue(b.fgMonthRaw),
        onHeaderCell: () => ({ width: columnWidths.fgMonthDate, onResizeStart: handleResize("fgMonthDate") }),
        render: (_value, record) => formatFgMonthDate(record.fgMonthRaw),
      },
      {
        title: CNF_TRACKER_LIST_COLUMN_LABELS.closedDate,
        key: "closedDate",
        width: columnWidths.closedDate,
        sorter: (a, b) => dateSortValue(a.closedDateRaw) - dateSortValue(b.closedDateRaw),
        onHeaderCell: () => ({ width: columnWidths.closedDate, onResizeStart: handleResize("closedDate") }),
        render: (_value, record) => formatAppDate(record.closedDateRaw),
      },
      {
        title: CNF_TRACKER_LIST_COLUMN_LABELS.protocolNo,
        dataIndex: "protocolNo",
        key: "protocolNo",
        width: columnWidths.protocolNo,
        sorter: (a, b) => a.protocolNo.localeCompare(b.protocolNo),
        onHeaderCell: () => ({ width: columnWidths.protocolNo, onResizeStart: handleResize("protocolNo") }),
      },
      {
        title: CNF_TRACKER_LIST_COLUMN_LABELS.protocolStatus,
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
        title: CNF_TRACKER_LIST_COLUMN_LABELS.interimReportNo,
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
        title: CNF_TRACKER_LIST_COLUMN_LABELS.interimReportStatus,
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
        title: CNF_TRACKER_LIST_COLUMN_LABELS.finalReportNo,
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
        title: CNF_TRACKER_LIST_COLUMN_LABELS.finalReportStatus,
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
        title: CNF_TRACKER_LIST_COLUMN_LABELS.endorsementNo,
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
        title: CNF_TRACKER_LIST_COLUMN_LABELS.endorsementStatus,
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
        title: CNF_TRACKER_LIST_COLUMN_LABELS.load,
        key: "load",
        fixed: "right",
        align: "center",
        width: columnWidths.load,
        minWidth: columnWidths.load,
        className: "cnf-tracker-action-column",
        onCell: () => ({
          className: "cnf-tracker-action-column",
        }),
        render: (_value, record) => (
          <div className="cnf-tracker-action-cell">
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
          </div>
        ),
      },
    ],
    [columnWidths, handleResize, onLoad, rows],
  );

  const visibleColumns = useMemo(
    () =>
      allColumns.filter((column) => {
        const key = String(column.key) as CnfTrackerListColumnKey;
        if (key === "cnfNo" || key === "load") return true;
        return !hiddenColumns.has(key);
      }),
    [allColumns, hiddenColumns],
  );

  const tableScrollX = useMemo(
    () =>
      visibleColumns.reduce((total, column) => {
        const width = typeof column.width === "number" ? column.width : 120;
        return total + width;
      }, 0),
    [visibleColumns],
  );

  const tableComponents: TableProps<CnfTrackerListRow>["components"] = {
    header: {
      cell: ResizableTitle,
    },
  };

  useLayoutEffect(() => {
    const syncToolbarHeight = () => {
      const toolbar = toolbarRef.current;
      const panel = panelRef.current;
      if (!toolbar || !panel) return;
      const height = Math.ceil(toolbar.getBoundingClientRect().height);
      if (height > 0) {
        panel.style.setProperty("--cnf-tracker-list-toolbar-height", `${height}px`);
      }
    };

    syncToolbarHeight();
    const observer = new ResizeObserver(syncToolbarHeight);
    if (toolbarRef.current) observer.observe(toolbarRef.current);
    window.addEventListener("resize", syncToolbarHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncToolbarHeight);
    };
  }, []);

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
    <section ref={panelRef} className="cnf-tracker-list-panel" aria-label="CNF Tracker list">
      <div ref={toolbarRef} className="cnf-tracker-list-toolbar">
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
                  value={CNF_TRACKER_LIST_COLUMN_KEYS.filter(
                    (key) => key !== "cnfNo" && key !== "load" && !hiddenColumns.has(key),
                  )}
                  onChange={(checked) => {
                    const visible = new Set(checked as CnfTrackerListColumnKey[]);
                    const nextHidden = new Set<CnfTrackerListColumnKey>();
                    for (const key of CNF_TRACKER_LIST_COLUMN_KEYS) {
                      if (key === "cnfNo" || key === "load") continue;
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
            tableLayout="fixed"
            className="cnf-tracker-list-table"
            size="small"
            rowKey="rowKey"
            components={tableComponents}
            dataSource={filteredRows}
            columns={visibleColumns}
            scroll={{ x: tableScrollX, y: tableBodyHeight }}
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
