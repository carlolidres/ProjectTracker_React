export interface SchemaColumn {
  name: string;
  type: string;
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

function parseColumnLine(line: string): SchemaColumn | null {
  const trimmed = line.trim().replace(/,$/, "");
  if (!trimmed || trimmed.startsWith("constraint ") || trimmed.startsWith("primary key") || trimmed.startsWith("unique ")) {
    return null;
  }

  const parts = trimmed.split(/\s+/);
  const name = parts[0]?.replace(/"/g, "");
  if (!name) return null;

  const type = parts.slice(1).join(" ").split(/\s+references\s+/i)[0]?.replace(/,$/, "") ?? "unknown";
  const refMatch = trimmed.match(/references\s+(?:public\.)?(\w+)(?:\s*\(([^)]+)\))?/i);
  const column: SchemaColumn = { name, type };
  if (refMatch) {
    column.references = {
      table: refMatch[1],
      column: refMatch[2]?.replace(/"/g, ""),
    };
  }
  return column;
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

    tables.set(name, {
      name,
      schema,
      columns,
      indexes: tables.get(name)?.indexes ?? [],
      policies: tables.get(name)?.policies ?? [],
    });
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

function parseIndexesAndPolicies(sql: string, tables: Map<string, SchemaTable>) {
  const indexPattern = /create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?(\w+)\s+on\s+(?:public\.)?(\w+)/gi;
  let match: RegExpExecArray | null;
  while ((match = indexPattern.exec(sql)) !== null) {
    const [, indexName, tableName] = match;
    const table = tables.get(tableName);
    if (table && !table.indexes.includes(indexName)) {
      table.indexes.push(indexName);
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
