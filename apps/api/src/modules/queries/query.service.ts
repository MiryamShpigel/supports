import {
  normalizeQuery,
  phraseQuestion,
  validateQuery,
  type QueryDefinition,
  type QueryResult,
  type ResultColumn,
  type ResultRow,
} from '@supports/shared';
import { ValidationError } from '../../lib/errors.js';
import type { RequestContext } from '../../lib/request-context.js';
import type { AuditService } from '../audit/audit.service.js';
import { toPublicMetadata, type DatasetSchema } from '../metadata/dataset-schema.js';
import type { MetadataService } from '../metadata/metadata.service.js';
import { buildCountQuery, buildGroupedQuery, buildRecordsQuery } from './query-builder.js';
import type { QueryCache } from './query-cache.js';
import type { QueryRepository } from './query.repository.js';

export class QueryService {
  constructor(
    private readonly metadata: MetadataService,
    private readonly repository: QueryRepository,
    private readonly cache: QueryCache,
    private readonly audit: AuditService,
    private readonly recordsLimit: number,
  ) {}

  /** Validates a query against metadata and returns the readable question. */
  async describe(ctx: RequestContext, query: QueryDefinition): Promise<{ schema: DatasetSchema; question: string }> {
    const schema = await this.metadata.getDatasetSchema(ctx, query.dataset);
    const metadata = toPublicMetadata(schema);
    const issues = validateQuery(query, metadata);
    if (issues.length) throw new ValidationError('השאילתה אינה תקינה', issues);
    return { schema, question: phraseQuestion(query, metadata) };
  }

  async execute(ctx: RequestContext, query: QueryDefinition): Promise<QueryResult> {
    const { schema, question } = await this.describe(ctx, query);
    const normalized = normalizeQuery(query);
    const cacheKey = `${ctx.tenantId}:${JSON.stringify(normalized)}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      await this.audit.record(ctx, 'query.execute', undefined, { question, fromCache: true });
      return { ...cached, fromCache: true };
    }

    const started = performance.now();
    // Grouping or an explicit metric ("סכום", "ממוצע") means aggregates; with no grouping
    // that is a single totals row. Otherwise the matching records are listed.
    const grouped = normalized.groupBy.length > 0 || normalized.metrics.some((m) => m !== 'count');
    const [rows, totalRecords] = await Promise.all([
      this.repository.fetchRows(
        grouped
          ? buildGroupedQuery(normalized, schema, ctx.tenantId)
          : buildRecordsQuery(normalized, schema, ctx.tenantId, this.recordsLimit),
      ),
      this.repository.fetchCount(buildCountQuery(normalized, schema, ctx.tenantId)),
    ]);

    const columns = grouped ? groupedColumns(normalized, schema) : recordColumns(schema);
    const result: QueryResult = {
      question,
      mode: grouped ? 'grouped' : 'records',
      columns,
      rows: rows.map((row) => withOptionLabels(row, schema)),
      totalRecords,
      truncated: !grouped && totalRecords > rows.length,
      fromCache: false,
      durationMs: Math.round(performance.now() - started),
    };

    this.cache.set(cacheKey, result);
    await this.audit.record(ctx, 'query.execute', undefined, { question, durationMs: result.durationMs, totalRecords });
    return result;
  }
}

function groupedColumns(query: QueryDefinition, schema: DatasetSchema): ResultColumn[] {
  const field = (key: string) => schema.fields.find((f) => f.key === key)!;
  const metric = (key: string) => schema.metrics.find((m) => m.key === key)!;
  return [
    ...query.groupBy.map((key) => ({ key, label: field(key).label, kind: 'dimension' as const })),
    ...query.metrics.map((key) => ({ key, label: metric(key).label, kind: 'metric' as const })),
  ];
}

function recordColumns(schema: DatasetSchema): ResultColumn[] {
  return schema.fields
    .filter((f) => f.listable)
    .map((f) => ({ key: f.key, label: f.label, kind: f.dataType === 'number' ? 'metric' : 'dimension' }));
}

/** Replaces stored codes ("north") with their display labels ("צפון"). */
function withOptionLabels(row: ResultRow, schema: DatasetSchema): ResultRow {
  const labelled: ResultRow = { ...row };
  for (const field of schema.fields) {
    if (!field.options || !(field.key in row)) continue;
    const value = row[field.key];
    labelled[field.key] = field.options.find((o) => o.value === String(value))?.label ?? value ?? null;
  }
  return labelled;
}
