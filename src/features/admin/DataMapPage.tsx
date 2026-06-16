import { ApartmentOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
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
import { buildIntegrityReport, type IntegrityFinding } from "@/lib/schemaMap/buildIntegrityReport";
import { parseMigrationGraph, type SchemaEdge, type SchemaTable } from "@/lib/schemaMap/parseMigrations";
import "@/styles/data-map.css";

const severityColors: Record<IntegrityFinding["severity"], string> = {
  vulnerability: "red",
  integrity: "orange",
  logic: "blue",
};

const NODE_PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function nodeColor(name: string): string {
  return NODE_PALETTE[hashString(name) % NODE_PALETTE.length];
}

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  connections: number;
  columnCount: number;
}

function countConnections(tableName: string, edges: SchemaEdge[]): number {
  return edges.filter((edge) => edge.source === tableName || edge.target === tableName).length;
}

function forceLayoutTables(
  tables: SchemaTable[],
  edges: SchemaEdge[],
  width = 1200,
  height = 800,
): LayoutNode[] {
  const nodes: LayoutNode[] = tables.map((table, index) => {
    const angle = (index / Math.max(tables.length, 1)) * Math.PI * 2;
    const radius = Math.min(width, height) * 0.28;
    return {
      id: table.name,
      x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
      y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
      connections: countConnections(table.name, edges),
      columnCount: table.columns.length,
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const linkedPairs = edges
    .map((edge) => ({ source: nodeById.get(edge.source), target: nodeById.get(edge.target) }))
    .filter((pair): pair is { source: LayoutNode; target: LayoutNode } => Boolean(pair.source && pair.target));

  for (let tick = 0; tick < 140; tick += 1) {
    const cooling = 1 - tick / 140;

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const repulsion = ((a.connections + b.connections + 8) * 900 * cooling) / (dist * dist);
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
      const attraction = dist * 0.018 * cooling;
      const fx = (dx / dist) * attraction;
      const fy = (dy / dist) * attraction;
      source.x += fx;
      source.y += fy;
      target.x -= fx;
      target.y -= fy;
    }

    for (const node of nodes) {
      node.x += (width / 2 - node.x) * 0.004;
      node.y += (height / 2 - node.y) * 0.004;
    }
  }

  return nodes;
}

function nodeSize(connections: number, columnCount: number): number {
  return Math.min(96, Math.max(44, 36 + connections * 5 + Math.min(columnCount, 12) * 1.5));
}

type SchemaNodeData = {
  label: string;
  color: string;
  connections: number;
  columnCount: number;
  size: number;
};

const SchemaGraphNode = memo(function SchemaGraphNode({ data, selected }: NodeProps<Node<SchemaNodeData>>) {
  const size = data.size;
  const showLabel = size >= 52 || data.connections >= 2;

  return (
    <div
      className={`schema-graph-node${selected ? " schema-graph-node-selected" : ""}`}
      style={{ width: size, height: size }}
    >
      <Handle type="target" position={Position.Top} className="schema-graph-handle" />
      <div
        className="schema-graph-node-core"
        style={{
          width: size,
          height: size,
          background: data.color,
          boxShadow: `0 0 ${Math.round(size * 0.35)}px ${data.color}66`,
        }}
      >
        {showLabel ? <span className="schema-graph-node-label">{data.label}</span> : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="schema-graph-handle" />
    </div>
  );
});

const nodeTypes = { schemaTable: SchemaGraphNode };

function buildGraphNodes(tables: SchemaTable[], edges: SchemaEdge[]): Node<SchemaNodeData>[] {
  const layout = forceLayoutTables(tables, edges);
  return layout.map((node) => {
    const size = nodeSize(node.connections, node.columnCount);
    return {
      id: node.id,
      type: "schemaTable",
      position: { x: node.x - size / 2, y: node.y - size / 2 },
      data: {
        label: node.id,
        color: nodeColor(node.id),
        connections: node.connections,
        columnCount: node.columnCount,
        size,
      },
      draggable: true,
    };
  });
}

function buildFlowEdges(
  graph: ReturnType<typeof parseMigrationGraph>,
  visibleTableNames: Set<string>,
): Edge[] {
  return graph.edges
    .filter((edge) => visibleTableNames.has(edge.source) && visibleTableNames.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: "default",
      animated: false,
      className: "schema-graph-edge",
      style: { strokeWidth: 1 },
    }));
}

export function DataMapPage() {
  const graph = useMemo(() => parseMigrationGraph(), []);
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

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

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<SchemaNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setNodes(buildGraphNodes(filteredTables, graph.edges));
    setEdges(buildFlowEdges(graph, visibleNames));
  }, [filteredTables, graph, visibleNames, setNodes, setEdges]);

  const findings = useMemo(
    () => buildIntegrityReport(graph, selectedTable ?? undefined),
    [graph, selectedTable],
  );

  const selected = selectedTable ? graph.tables.find((table) => table.name === selectedTable) : null;

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedTable(node.id);
  }, []);

  return (
    <AppShell>
      <div className="page-header data-map-page-header">
        <Typography.Title level={3}>Data Map</Typography.Title>
        <Typography.Text type="secondary">Schema graph and integrity review (admin)</Typography.Text>
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
          <Card className="data-map-canvas-card" title={<Space><ApartmentOutlined /> Schema Canvas</Space>}>
            <div className="data-map-canvas">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.15}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="schema-graph-background" />
                <Controls className="schema-graph-controls" showInteractive={false} />
                <MiniMap
                  className="schema-graph-minimap"
                  pannable
                  zoomable
                  nodeColor={(node) => (node.data as SchemaNodeData | undefined)?.color ?? "var(--primary)"}
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
                    <List.Item>
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
                        <Typography.Text code>{column.name}</Typography.Text>
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
                  Click a table node to inspect columns, indexes, and linked findings.
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
