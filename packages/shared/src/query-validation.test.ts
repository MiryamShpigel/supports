import { describe, expect, it } from 'vitest';
import type { QueryDefinition } from './query.js';
import { validateQuery } from './query-validation.js';
import { supportRequestsFixture as dataset } from './testing/support-requests.fixture.js';

const base: QueryDefinition = { dataset: 'support-requests', filters: [], groupBy: [], metrics: ['count'] };

describe('validateQuery', () => {
  it('accepts a valid query', () => {
    const issues = validateQuery(
      {
        ...base,
        filters: [
          { field: 'status', operator: 'in', values: ['approved'] },
          { field: 'year', operator: 'between', values: [2023, 2025] },
        ],
        groupBy: ['district'],
      },
      dataset,
    );
    expect(issues).toEqual([]);
  });

  it('rejects unknown fields, non-filterable fields and unknown options', () => {
    const issues = validateQuery(
      {
        ...base,
        filters: [
          { field: 'nope', operator: 'in', values: ['x'] },
          { field: 'organization_name', operator: 'in', values: ['x'] },
          { field: 'status', operator: 'in', values: ['approved', 'lost'] },
        ],
      },
      dataset,
    );
    expect(issues.map((i) => i.path)).toEqual(['filters[0]', 'filters[1]', 'filters[2]']);
  });

  it('rejects operators the field does not allow and invalid ranges', () => {
    const issues = validateQuery(
      {
        ...base,
        filters: [
          { field: 'status', operator: 'between', values: ['a', 'b'] },
          { field: 'year', operator: 'between', values: [2025, 2023] },
        ],
      },
      dataset,
    );
    expect(issues).toHaveLength(2);
  });

  it('rejects unknown groupings and metrics', () => {
    const issues = validateQuery({ ...base, groupBy: ['organization_name'], metrics: ['median'] }, dataset);
    expect(issues.map((i) => i.path)).toEqual(['groupBy[0]', 'metrics[0]']);
  });
});
