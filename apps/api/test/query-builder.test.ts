import { describe, expect, it } from 'vitest';
import { buildCountQuery, buildGroupedQuery, buildRecordsQuery } from '../src/modules/queries/query-builder.js';
import { datasetSchema } from './fixtures.js';

describe('query builder', () => {
  it('builds a grouped query with bind parameters only', () => {
    const sql = buildGroupedQuery(
      {
        dataset: 'support-requests',
        filters: [
          { field: 'status', operator: 'in', values: ['approved'] },
          { field: 'year', operator: 'between', values: [2023, 2025] },
        ],
        groupBy: ['year'],
        metrics: ['count', 'total_amount'],
      },
      datasetSchema,
      'culture-sport',
    );

    expect(sql.text).toBe(
      [
        'SELECT t."year" AS "year", COUNT(*)::int AS "count", COALESCE(SUM(t."requested_amount"), 0)::float8 AS "total_amount"',
        'FROM "data"."support_requests" t',
        'WHERE t.tenant_id = $1',
        '  AND t."status" = ANY($2)',
        '  AND t."year" BETWEEN $3 AND $4',
        'GROUP BY 1',
        'ORDER BY 1',
      ].join('\n'),
    );
    expect(sql.values).toEqual(['culture-sport', ['approved'], 2023, 2025]);
  });

  it('reads attribute fields from the JSONB column', () => {
    const sql = buildGroupedQuery(
      {
        dataset: 'support-requests',
        filters: [{ field: 'social_cluster', operator: 'in', values: ['1', '2'] }],
        groupBy: ['social_cluster'],
        metrics: ['count'],
      },
      datasetSchema,
      'culture-sport',
    );

    expect(sql.text).toContain(`(t.attributes ->> 'social_cluster') AS "social_cluster"`);
    expect(sql.text).toContain(`(t.attributes ->> 'social_cluster') = ANY($2)`);
  });

  it('never puts filter values into the SQL text', () => {
    const malicious = "approved'; DROP TABLE data.support_requests; --";
    const query = {
      dataset: 'support-requests',
      filters: [{ field: 'status', operator: 'in' as const, values: [malicious] }],
      groupBy: [],
      metrics: ['count'],
    };

    const records = buildRecordsQuery(query, datasetSchema, 'culture-sport', 100);
    const count = buildCountQuery(query, datasetSchema, 'culture-sport');

    expect(records.text).not.toContain('DROP');
    expect(records.values).toContainEqual([malicious]);
    expect(count.text).not.toContain('DROP');
  });

  it('rejects unsafe identifiers coming from metadata', () => {
    const broken = {
      ...datasetSchema,
      fields: datasetSchema.fields.map((f) => (f.key === 'status' ? { ...f, sourceName: 'status"; --' } : f)),
    };
    expect(() =>
      buildGroupedQuery({ dataset: 'support-requests', filters: [], groupBy: ['status'], metrics: ['count'] }, broken, 't'),
    ).toThrow(/Unsafe SQL identifier/);
  });
});
