import type { FilterValue, QueryDefinition } from '@supports/shared';
import type { DatasetSchema, FieldSchema, MetricSchema } from '../metadata/dataset-schema.js';

/**
 * Translates a (validated) QueryDefinition into parameterized SQL using metadata only.
 *
 * Safety: user input never becomes SQL text. Values are always bind parameters ($1, $2...),
 * and identifiers come from metadata and are checked against a strict pattern.
 *
 * Convention for dataset tables: columns `id`, `tenant_id` and `attributes jsonb`.
 */

export interface SqlQuery {
  text: string;
  values: unknown[];
}

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

function ident(name: string): string {
  if (!IDENTIFIER.test(name)) throw new Error(`Unsafe SQL identifier: ${name}`);
  return `"${name}"`;
}

function tableName(qualified: string): string {
  const [schema, table] = qualified.split('.');
  if (!schema || !table) throw new Error(`Invalid table name: ${qualified}`);
  return `${ident(schema)}.${ident(table)}`;
}

const isNumeric = (field: FieldSchema) => field.dataType === 'number' || field.dataType === 'year';

/** Column fields read the column; attribute fields read a key from the JSONB `attributes`. */
export function fieldExpression(field: FieldSchema): string {
  if (field.storage === 'column') return `t.${ident(field.sourceName)}`;
  ident(field.sourceName);
  const expression = `(t.attributes ->> '${field.sourceName}')`;
  return isNumeric(field) ? `${expression}::numeric` : expression;
}

function metricExpression(metric: MetricSchema): string {
  switch (metric.aggregate) {
    case 'count':
      return 'COUNT(*)::int';
    case 'sum':
      return `COALESCE(SUM(t.${ident(metric.sourceColumn!)}), 0)::float8`;
    case 'avg':
      return `ROUND(AVG(t.${ident(metric.sourceColumn!)}), 2)::float8`;
  }
}

class Params {
  readonly values: unknown[] = [];
  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

function buildWhere(query: QueryDefinition, schema: DatasetSchema, tenantId: string, params: Params): string {
  const fields = new Map(schema.fields.map((f) => [f.key, f]));
  const conditions = [`t.tenant_id = ${params.add(tenantId)}`];

  for (const filter of query.filters) {
    const field = fields.get(filter.field);
    if (!field) throw new Error(`Unknown field: ${filter.field}`);
    const expression = fieldExpression(field);
    const cast = (v: FilterValue) => (isNumeric(field) ? Number(v) : String(v));

    if (filter.operator === 'between') {
      const [from, to] = filter.values.map(cast);
      conditions.push(`${expression} BETWEEN ${params.add(from)} AND ${params.add(to)}`);
    } else {
      conditions.push(`${expression} = ANY(${params.add(filter.values.map(cast))})`);
    }
  }
  return conditions.join('\n  AND ');
}

/** Aggregated rows: one row per combination of groupBy values. */
export function buildGroupedQuery(query: QueryDefinition, schema: DatasetSchema, tenantId: string): SqlQuery {
  const params = new Params();
  const fields = new Map(schema.fields.map((f) => [f.key, f]));
  const metrics = new Map(schema.metrics.map((m) => [m.key, m]));

  const dimensions = query.groupBy.map((key) => `${fieldExpression(fields.get(key)!)} AS ${ident(key)}`);
  const measures = query.metrics.map((key) => `${metricExpression(metrics.get(key)!)} AS ${ident(key)}`);
  const positions = query.groupBy.map((_, i) => i + 1).join(', ');
  const where = buildWhere(query, schema, tenantId, params);

  const text = [
    `SELECT ${[...dimensions, ...measures].join(', ')}`,
    `FROM ${tableName(schema.sourceTable)} t`,
    `WHERE ${where}`,
    positions ? `GROUP BY ${positions}\nORDER BY ${positions}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { text, values: params.values };
}

/** Individual records (no grouping), newest first, limited to one page. */
export function buildRecordsQuery(query: QueryDefinition, schema: DatasetSchema, tenantId: string, limit: number): SqlQuery {
  const params = new Params();
  const columns = schema.fields.filter((f) => f.listable).map((f) => `${fieldExpression(f)} AS ${ident(f.key)}`);
  const where = buildWhere(query, schema, tenantId, params);

  const text = [
    `SELECT ${columns.join(', ')}`,
    `FROM ${tableName(schema.sourceTable)} t`,
    `WHERE ${where}`,
    'ORDER BY t.id DESC',
    `LIMIT ${params.add(limit)}`,
  ].join('\n');

  return { text, values: params.values };
}

export function buildCountQuery(query: QueryDefinition, schema: DatasetSchema, tenantId: string): SqlQuery {
  const params = new Params();
  const where = buildWhere(query, schema, tenantId, params);
  return { text: `SELECT COUNT(*)::int AS total\nFROM ${tableName(schema.sourceTable)} t\nWHERE ${where}`, values: params.values };
}
