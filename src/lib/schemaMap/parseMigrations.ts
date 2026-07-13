export interface SchemaColumn {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isUnique?: boolean;
  isIndexed?: boolean;
  isNullable?: boolean;
  references?: { table: string; column?: string };
}

export interface SchemaTable {
  name: string;
  schema: string;
  columns: SchemaColumn[];
  indexes: string[];
  policies: string[];
}

export interface SchemaEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface SchemaGraph {
  tables: SchemaTable[];
  edges: SchemaEdge[];
}

const migrationSources = import.meta.glob("../../../supabase/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function stripComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "");
}

function cleanType(raw: string): string {
  return raw
    .replace(/\bprimary\s+key\b/gi, "")
    .replace(/\bunique\b/gi, "")
    .replace(/\bnot\s+null\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/\bdefault\s+[\s\S]+$/i, "")
    .replace(/\breferences\s+[\s\S]+$/i, "")
    .replace(/,$/, "")
    .replace(/\s+/g, " ")
    .trim() || "unknown";
}

function parseColumnLine(line: string): SchemaColumn | null {
  const trimmed = line.trim().replace(/,$/, "");
  if (
    !trimmed ||
    /^constraint\s+/i.test(trimmed) ||
    /^primary\s+key\b/i.test(trimmed) ||
    /^unique\b/i.test(trimmed) ||
    /^foreign\s+key\b/i.test(trimmed) ||
    /^check\b/i.test(trimmed)
  ) {
    return null;
  }

  const parts = trimmed.split(/\s+/);
  const name = parts[0]?.replace(/"/g, "");
  if (!name) return null;

  const type = cleanType(parts.slice(1).join(" "));
  const refMatch = trimmed.match(/references\s+(?:public\.)?(\w+)(?:\s*\(([^)]+)\))?/i);
  const column: SchemaColumn = {
    name,
    type,
    isPrimaryKey: /\bprimary\s+key\b/i.test(trimmed),
    isUnique: /\bunique\b/i.test(trimmed),
    isNullable: !/\bnot\s+null\b/i.test(trimmed) && !/\bprimary\s+key\b/i.test(trimmed),
  };
  if (refMatch) {
    column.references = {
      table: refMatch[1],
      column: refMatch[2]?.replace(/"/g, ""),
    };
  }
  return column;
}

function applyTableConstraints(body: string, table: SchemaTable, edges: SchemaEdge[]) {
  const pkMatch = body.match(/primary\s+key\s*\(([^)]+)\)/i);
  if (pkMatch) {
    const cols = pkMatch[1].split(",").map((part) => part.trim().replace(/"/g, ""));
    for (const colName of cols) {
      const column = table.columns.find((item) => item.name === colName);
      if (column) column.isPrimaryKey = true;
    }
  }

  const uniqueMatches = body.matchAll(/unique\s*\(([^)]+)\)/gi);
  for (const match of uniqueMatches) {
    const cols = match[1].split(",").map((part) => part.trim().replace(/"/g, ""));
    if (cols.length === 1) {
      const column = table.columns.find((item) => item.name === cols[0]);
      if (column) column.isUnique = true;
    }
  }

  const fkMatches = body.matchAll(
    /foreign\s+key\s*\(([^)]+)\)\s*references\s+(?:public\.)?(\w+)\s*(?:\(([^)]+)\))?/gi,
  );
  for (const match of fkMatches) {
    const localCols = match[1].split(",").map((part) => part.trim().replace(/"/g, ""));
    const remoteTable = match[2];
    const remoteCols = (match[3] ?? "")
      .split(",")
      .map((part) => part.trim().replace(/"/g, ""))
      .filter(Boolean);
    localCols.forEach((localCol, index) => {
      const column = table.columns.find((item) => item.name === localCol);
      if (column) {
        column.references = {
          table: remoteTable,
          column: remoteCols[index] || remoteCols[0],
        };
      }
      edges.push({
        id: `${table.name}.${localCol}->${remoteTable}`,
        source: table.name,
        target: remoteTable,
        label: localCol,
      });
    });
  }
}

function parseCreateTable(sql: string, tables: Map<string, SchemaTable>, edges: SchemaEdge[]) {
  const pattern =
    /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(\w+)\.)?(\w+)\s*\(([\s\S]*?)\)\s*;/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(sql)) !== null) {
    const schema = match[1] ?? "public";
    const name = match[2];
    const body = match[3];
    const columns: SchemaColumn[] = [];

    for (const line of body.split("\n")) {
      const column = parseColumnLine(line);
      if (column) {
        columns.push(column);
        if (column.references) {
          edges.push({
            id: `${name}.${column.name}->${column.references.table}`,
            source: name,
            target: column.references.table,
            label: column.name,
          });
        }
      }
    }

    const table: SchemaTable = {
      name,
      schema,
      columns,
      indexes: tables.get(name)?.indexes ?? [],
      policies: tables.get(name)?.policies ?? [],
    };
    applyTableConstraints(body, table, edges);
    tables.set(name, table);
  }
}

function parseAlterAddColumns(
  tableName: string,
  schema: string,
  alterBody: string,
  tables: Map<string, SchemaTable>,
  edges: SchemaEdge[],
) {
  if (!/\badd\s+column\b/i.test(alterBody)) return;

  const segments = alterBody.split(/\badd\s+column\s+(?:if\s+not\s+exists\s+)?/i).filter((part) => part.trim());
  for (const segment of segments) {
    const column = parseColumnLine(segment);
    if (!column) continue;

    const table = tables.get(tableName) ?? {
      name: tableName,
      schema,
      columns: [],
      indexes: [],
      policies: [],
    };
    if (!table.columns.some((existing) => existing.name === column.name)) {
      table.columns.push(column);
    }
    if (column.references) {
      edges.push({
        id: `${tableName}.${column.name}->${column.references.table}`,
        source: tableName,
        target: column.references.table,
        label: column.name,
      });
    }
    tables.set(tableName, table);
  }
}

function parseAlterTable(sql: string, tables: Map<string, SchemaTable>, edges: SchemaEdge[]) {
  const alterPattern =
    /alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?(?:(\w+)\.)?(\w+)\s+([\s\S]*?);/gi;
  let match: RegExpExecArray | null;

  while ((match = alterPattern.exec(sql)) !== null) {
    parseAlterAddColumns(match[2], match[1] ?? "public", match[3], tables, edges);
  }
}

function markIndexedColumns(table: SchemaTable, indexColumns: string[]) {
  for (const colName of indexColumns) {
    const column = table.columns.find((item) => item.name === colName);
    if (column) column.isIndexed = true;
  }
}

function parseIndexesAndPolicies(sql: string, tables: Map<string, SchemaTable>) {
  const indexPattern =
    /create\s+(unique\s+)?index\s+(?:if\s+not\s+exists\s+)?(\w+)\s+on\s+(?:public\.)?(\w+)\s*(?:using\s+\w+\s*)?\(([^)]+)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = indexPattern.exec(sql)) !== null) {
    const isUnique = Boolean(match[1]);
    const indexName = match[2];
    const tableName = match[3];
    const indexCols = match[4]
      .split(",")
      .map((part) => part.trim().replace(/"/g, "").split(/\s+/)[0])
      .filter(Boolean);
    const table = tables.get(tableName);
    if (!table) continue;
    if (!table.indexes.includes(indexName)) {
      table.indexes.push(indexName);
    }
    markIndexedColumns(table, indexCols);
    if (isUnique && indexCols.length === 1) {
      const column = table.columns.find((item) => item.name === indexCols[0]);
      if (column) column.isUnique = true;
    }
  }

  const policyPattern =
    /create\s+policy\s+(?:"([^"]+)"|(\w+))\s+on\s+(?:only\s+)?(?:public\.)?(\w+)/gi;
  while ((match = policyPattern.exec(sql)) !== null) {
    const policyName = match[1] ?? match[2];
    const tableName = match[3];
    const table = tables.get(tableName);
    if (table && policyName && !table.policies.includes(policyName)) {
      table.policies.push(policyName);
    }
  }
}

export function parseMigrationGraph(): SchemaGraph {
  const tables = new Map<string, SchemaTable>();
  const edges: SchemaEdge[] = [];

  for (const sql of Object.values(migrationSources)) {
    const cleaned = stripComments(sql);
    parseCreateTable(cleaned, tables, edges);
    parseAlterTable(cleaned, tables, edges);
    parseIndexesAndPolicies(cleaned, tables);
  }

  const uniqueEdges = [...new Map(edges.map((edge) => [edge.id, edge])).values()];
  return {
    tables: [...tables.values()].sort((a, b) => a.name.localeCompare(b.name)),
    edges: uniqueEdges,
  };
}

export function estimateTableCardSize(table: SchemaTable): { width: number; height: number } {
  const rowCount = Math.max(table.columns.length, 1);
  return {
    width: 280,
    height: 44 + rowCount * 24 + 8,
  };
}
