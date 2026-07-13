import {
  ApartmentOutlined,
  KeyOutlined,
  LinkOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Alert, Card, Input, List, Space, Tag, Typography } from "antd";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAppTheme } from "@/app/theme-provider";
import { buildIntegrityReport, type IntegrityFinding } from "@/lib/schemaMap/buildIntegrityReport";
import {
  estimateTableCardSize,
  parseMigrationGraph,
  type SchemaColumn,
  type SchemaEdge,
  type SchemaTable,
} from "@/lib/schemaMap/parseMigrations";
import "@/styles/data-map.css";

const severityColors: Record<IntegrityFinding["severity"], string> = {
  vulnerability: "red",
  integrity: "orange",
  logic: "blue",
};

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  connections: number;
}

function countConnections(tableName: string, edges: SchemaEdge[]): number {
  return edges.filter((edge) => edge.source === tableName || edge.target === tableName).length;
}

function forceLayoutTables(
  tables: SchemaTable[],
  edges: SchemaEdge[],
  width = 2200,
  height = 1400,
): LayoutNode[] {
  const nodes: LayoutNode[] = tables.map((table, index) => {
    const size = estimateTableCardSize(table);
    const angle = (index / Math.max(tables.length, 1)) * Math.PI * 2;
    const radius = Math.min(width, height) * 0.32;
    return {
      id: table.name,
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius,
      width: size.width,
      height: size.height,
      connections: countConnections(table.name, edges),
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const linkedPairs = edges
    .map((edge) => ({ source: nodeById.get(edge.source), target: nodeById.get(edge.target) }))
    .filter((pair): pair is { source: LayoutNode; target: LayoutNode } => Boolean(pair.source && pair.target));

  for (let tick = 0; tick < 180; tick += 1) {
    const cooling = 1 - tick / 180;

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const minDist = (a.width + b.width) * 0.55 + (a.height + b.height) * 0.18;
        const overlap = Math.max(0, minDist - dist);
        const repulsion =
          ((a.connections + b.connections + 6) * 1400 * cooling) / (dist * dist) + overlap * 0.35;
        const fx = (dx / dist) * repulsion;
        const fy = (dy / dist) * repulsion;
        a.x -= fx;
        a.y -= fy;
        b.x += fx;
        b.y += fy;
      }
    }

    for (const { source, target } of linkedPairs) {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const attraction = dist * 0.012 * cooling;
      const fx = (dx / dist) * attraction;
      const fy = (dy / dist) * attraction;
      source.x += fx;
      source.y += fy;
      target.x -= fx;
      target.y -= fy;
    }

    for (const node of nodes) {
      node.x += (width / 2 - node.x) * 0.003;
      node.y += (height / 2 - node.y) * 0.003;
    }
  }

  return nodes;
}

function shortType(type: string): string {
  const cleaned = type.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 28) return cleaned.toUpperCase();
  return `${cleaned.slice(0, 26).toUpperCase()}…`;
}

function ColumnBadges({ column }: { column: SchemaColumn }) {
  return (
    <span className="schema-sql-badges">
      {column.isPrimaryKey ? (
        <span className="schema-sql-badge schema-sql-badge-pk" title="Primary key">
          <KeyOutlined />
        </span>
      ) : null}
      {column.references ? (
        <span className="schema-sql-badge schema-sql-badge-fk" title={`FK → ${column.references.table}`}>
          <LinkOutlined />
        </span>
      ) : null}
      {column.isUnique && !column.isPrimaryKey ? (
        <span className="schema-sql-badge schema-sql-badge-uq" title="Unique">UQ</span>
      ) : null}
      {column.isIndexed && !column.isPrimaryKey && !column.isUnique ? (
        <span className="schema-sql-badge schema-sql-badge-idx" title="Indexed">IDX</span>
      ) : null}
    </span>
  );
}

type SchemaNodeData = {
  table: SchemaTable;
  highlighted: boolean;
  dimmed: boolean;
};

const SchemaTableNode = memo(function SchemaTableNode({ data, selected }: NodeProps<Node<SchemaNodeData>>) {
  const { table, highlighted, dimmed } = data;
  const className = [
    "schema-sql-card",
    selected || highlighted ? "schema-sql-card-active" : "",
    dimmed ? "schema-sql-card-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <Handle type="target" position={Position.Left} className="schema-graph-handle" id="left" />
      <Handle type="target" position={Position.Top} className="schema-graph-handle" id="top" />
      <div className="schema-sql-card-header">
        <span className="schema-sql-card-title">{table.name}</span>
        <span className="schema-sql-card-meta">{table.columns.length} cols</span>
      </div>
      <div className="schema-sql-card-body">
        {table.columns.length ? (
          table.columns.map((column) => (
            <div key={column.name} className={`schema-sql-row${column.isPrimaryKey ? " is-pk" : ""}${column.references ? " is-fk" : ""}`}>
              <ColumnBadges column={column} />
              <span className="schema-sql-col-name">{column.name}</span>
              <span className="schema-sql-col-type">{shortType(column.type)}</span>
            </div>
          ))
        ) : (
          <div className="schema-sql-row schema-sql-row-empty">No columns parsed</div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="schema-graph-handle" id="right" />
      <Handle type="source" position={Position.Bottom} className="schema-graph-handle" id="bottom" />
    </div>
  );
});

const nodeTypes = { schemaTable: SchemaTableNode };

function buildGraphNodes(
  tables: SchemaTable[],
  edges: SchemaEdge[],
  selectedTable: string | null,
  highlightTables: Set<string>,
): Node<SchemaNodeData>[] {
  const layout = forceLayoutTables(tables, edges);
  const focusActive = Boolean(selectedTable) || highlightTables.size > 0;

  return layout.map((node) => {
    const table = tables.find((item) => item.name === node.id)!;
    const highlighted = highlightTables.has(node.id) || node.id === selectedTable;
    const dimmed = focusActive && !highlighted;
    return {
      id: node.id,
      type: "schemaTable",
      position: { x: node.x - node.width / 2, y: node.y - node.height / 2 },
      data: { table, highlighted, dimmed },
      selected: highlighted,
      draggable: true,
      style: { width: node.width },
    };
  });
}

function buildFlowEdges(
  graph: ReturnType<typeof parseMigrationGraph>,
  visibleTableNames: Set<string>,
  selectedTable: string | null,
  highlightTables: Set<string>,
): Edge[] {
  const focusActive = Boolean(selectedTable) || highlightTables.size > 0;

  return graph.edges
    .filter((edge) => visibleTableNames.has(edge.source) && visibleTableNames.has(edge.target))
    .map((edge) => {
      const related =
        edge.source === selectedTable ||
        edge.target === selectedTable ||
        highlightTables.has(edge.source) ||
        highlightTables.has(edge.target);
      const dimmed = focusActive && !related;
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: "smoothstep",
        animated: related,
        className: related ? "schema-sql-edge schema-sql-edge-active" : dimmed ? "schema-sql-edge schema-sql-edge-dimmed" : "schema-sql-edge",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: related ? "var(--schema-edge-active)" : "var(--schema-edge)",
        },
        style: {
          strokeWidth: related ? 2.2 : 1.2,
          stroke: related ? "var(--schema-edge-active)" : "var(--schema-edge)",
          opacity: dimmed ? 0.18 : related ? 1 : 0.55,
        },
        labelStyle: {
          fill: "var(--text)",
          fontSize: 10,
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: "var(--schema-edge-label-bg)",
          fillOpacity: 0.92,
        },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
      };
    });
}

function SchemaLegend() {
  return (
    <div className="schema-sql-legend" aria-label="Schema legend">
      <div className="schema-sql-legend-title">Legend</div>
      <div className="schema-sql-legend-item">
        <span className="schema-sql-badge schema-sql-badge-pk"><KeyOutlined /></span>
        Primary key
      </div>
      <div className="schema-sql-legend-item">
        <span className="schema-sql-badge schema-sql-badge-fk"><LinkOutlined /></span>
        Foreign key
      </div>
      <div className="schema-sql-legend-item">
        <span className="schema-sql-badge schema-sql-badge-uq">UQ</span>
        Unique
      </div>
      <div className="schema-sql-legend-item">
        <span className="schema-sql-badge schema-sql-badge-idx">IDX</span>
        Indexed
      </div>
    </div>
  );
}

export function DataMapPage() {
  const graph = useMemo(() => parseMigrationGraph(), []);
  const { appTheme } = useAppTheme();
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [highlightTables, setHighlightTables] = useState<Set<string>>(new Set());

  const filteredTables = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return graph.tables;
    return graph.tables.filter(
      (table) =>
        table.name.toLowerCase().includes(query) ||
        table.columns.some((column) => column.name.toLowerCase().includes(query)),
    );
  }, [graph.tables, search]);

  const visibleNames = useMemo(() => new Set(filteredTables.map((table) => table.name)), [filteredTables]);

  const subgraphTables = useMemo(() => {
    if (!highlightTables.size) return filteredTables;
    return filteredTables.filter((table) => highlightTables.has(table.name));
  }, [filteredTables, highlightTables]);

  const subgraphNames = useMemo(
    () => new Set(subgraphTables.map((table) => table.name)),
    [subgraphTables],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<SchemaNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const canvasTables = highlightTables.size ? subgraphTables : filteredTables;
    const canvasNames = highlightTables.size ? subgraphNames : visibleNames;
    setNodes(buildGraphNodes(canvasTables, graph.edges, selectedTable, highlightTables));
    setEdges(buildFlowEdges(graph, canvasNames, selectedTable, highlightTables));
  }, [
    filteredTables,
    graph,
    visibleNames,
    subgraphTables,
    subgraphNames,
    highlightTables,
    selectedTable,
    setNodes,
    setEdges,
  ]);

  const findings = useMemo(
    () => buildIntegrityReport(graph, selectedTable ?? undefined),
    [graph, selectedTable],
  );

  const selected = selectedTable ? graph.tables.find((table) => table.name === selectedTable) : null;

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedTable(node.id);
    setHighlightTables(new Set());
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedTable(null);
    setHighlightTables(new Set());
  }, []);

  const onFindingClick = useCallback((finding: IntegrityFinding) => {
    if (finding.table) setSelectedTable(finding.table);
    const related = new Set(
      [finding.table, ...(finding.relatedTables ?? [])].filter((name): name is string => Boolean(name)),
    );
    setHighlightTables(related);
  }, []);

  return (
    <AppShell>
      <div className="page-header data-map-page-header">
        <Typography.Title level={3}>Data Map</Typography.Title>
        <Typography.Text type="secondary">
          Project Tracker — SQL Schema (adapts from current migrations)
        </Typography.Text>
      </div>
      <div className="data-map-page">
        <div className="data-map-toolbar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search tables or columns"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="data-map-search"
          />
          <Typography.Text type="secondary" className="data-map-stats">
            {filteredTables.length} table{filteredTables.length === 1 ? "" : "s"} · {graph.edges.length} relationships
          </Typography.Text>
        </div>

        <div className="data-map-layout">
          <Card
            className="data-map-canvas-card"
            title={
              <Space>
                <ApartmentOutlined />
                SQL Schema
              </Space>
            }
          >
            <div className={`data-map-canvas data-map-canvas-${appTheme}`}>
              <SchemaLegend />
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                fitView
                fitViewOptions={{ padding: 0.12 }}
                minZoom={0.08}
                maxZoom={1.6}
                proOptions={{ hideAttribution: true }}
                colorMode={appTheme}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={22}
                  size={1.2}
                  className="schema-graph-background"
                />
                <Controls className="schema-graph-controls" showInteractive={false} />
                <MiniMap
                  className="schema-graph-minimap"
                  pannable
                  zoomable
                  nodeColor={() => "var(--schema-card-header)"}
                />
              </ReactFlow>
            </div>
          </Card>

          <div className="data-map-side">
            <Card title="Integrity & Logic Review" className="data-map-review-card">
              {findings.length ? (
                <List
                  size="small"
                  dataSource={findings}
                  renderItem={(item) => (
                    <List.Item
                      className="data-map-finding-item"
                      onClick={() => onFindingClick(item)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="data-map-finding">
                        <Space wrap size={4}>
                          <Tag color={severityColors[item.severity]}>{item.severity}</Tag>
                          <Typography.Text strong>{item.title}</Typography.Text>
                        </Space>
                        <Typography.Paragraph type="secondary" className="data-map-finding-detail">
                          {item.detail}
                        </Typography.Paragraph>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Alert type="success" message="No findings for the current selection." showIcon />
              )}
            </Card>

            <Card
              title={selected ? `${selected.name} columns` : "Table details"}
              className="data-map-detail-card"
            >
              {selected ? (
                <List
                  size="small"
                  dataSource={selected.columns}
                  renderItem={(column) => (
                    <List.Item>
                      <Space direction="vertical" size={0}>
                        <Space size={6} wrap>
                          <Typography.Text code>{column.name}</Typography.Text>
                          {column.isPrimaryKey ? <Tag color="gold">PK</Tag> : null}
                          {column.references ? <Tag color="blue">FK</Tag> : null}
                          {column.isUnique ? <Tag>UQ</Tag> : null}
                          {column.isIndexed ? <Tag>IDX</Tag> : null}
                        </Space>
                        <Typography.Text type="secondary">{column.type}</Typography.Text>
                        {column.references ? (
                          <Typography.Text type="secondary">
                            → {column.references.table}
                            {column.references.column ? `.${column.references.column}` : ""}
                          </Typography.Text>
                        ) : null}
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <Typography.Text type="secondary">
                  Click a table card to inspect columns, indexes, and linked findings. Related edges animate.
                </Typography.Text>
              )}
              {selected && selected.indexes.length ? (
                <div className="data-map-indexes">
                  <Typography.Text strong>Indexes</Typography.Text>
                  <div>{selected.indexes.map((index) => <Tag key={index}>{index}</Tag>)}</div>
                </div>
              ) : null}
              {selected && selected.policies.length ? (
                <div className="data-map-indexes">
                  <Typography.Text strong>RLS policies</Typography.Text>
                  <div>{selected.policies.map((policy) => <Tag key={policy}>{policy}</Tag>)}</div>
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
