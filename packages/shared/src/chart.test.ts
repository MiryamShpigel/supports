import { describe, expect, it } from 'vitest';
import type { QueryResult, ResultRow } from './api.js';
import { canShowPie, MAX_PIE_SLICES } from './chart.js';
import type { DatasetMetadata } from './metadata.js';
import { supportRequestsFixture } from './testing/support-requests.fixture.js';

const dataset: DatasetMetadata = {
  ...supportRequestsFixture,
  metrics: [...supportRequestsFixture.metrics, { key: 'avg_amount', label: 'סכום ממוצע', aggregate: 'avg' }],
};

/** A grouped result: one row per value of each dimension, with the given metric values. */
function grouped(dimensions: string[], metrics: string[], rows: ResultRow[]): QueryResult {
  return {
    question: '',
    mode: 'grouped',
    columns: [
      ...dimensions.map((key) => ({ key, label: key, kind: 'dimension' as const })),
      ...metrics.map((key) => ({ key, label: key, kind: 'metric' as const })),
    ],
    rows,
    totalRecords: 0,
    truncated: false,
    fromCache: false,
    durationMs: 0,
  };
}

const byStatus = grouped(['status'], ['count', 'total_amount', 'avg_amount'], [
  { status: 'הוגשה', count: 10, total_amount: 1000, avg_amount: 100 },
  { status: 'אושרה', count: 30, total_amount: 6000, avg_amount: 200 },
  { status: 'נדחתה', count: 5, total_amount: 250, avg_amount: 50 },
]);

describe('canShowPie', () => {
  it('allows a count or a sum over a few unordered categories', () => {
    expect(canShowPie(byStatus, 'count', dataset)).toBe(true);
    expect(canShowPie(byStatus, 'total_amount', dataset)).toBe(true);
  });

  it('rejects an average, which does not add up to a whole', () => {
    expect(canShowPie(byStatus, 'avg_amount', dataset)).toBe(false);
  });

  it('rejects a year grouping, whose order a circle would hide', () => {
    const byYear = grouped(['year'], ['count'], [{ year: 2023, count: 4 }, { year: 2024, count: 6 }]);
    expect(canShowPie(byYear, 'count', dataset)).toBe(false);
  });

  it('rejects two groupings', () => {
    const twoWay = grouped(['status', 'district'], ['count'], [
      { status: 'אושרה', district: 'צפון', count: 4 },
      { status: 'נדחתה', district: 'דרום', count: 6 },
    ]);
    expect(canShowPie(twoWay, 'count', dataset)).toBe(false);
  });

  it(`rejects a single slice and more than ${MAX_PIE_SLICES} slices`, () => {
    const one = grouped(['district'], ['count'], [{ district: 'צפון', count: 4 }]);
    const many = grouped(
      ['district'],
      ['count'],
      ['צפון', 'חיפה', 'מרכז', 'תל אביב', 'ירושלים', 'דרום'].map((district) => ({ district, count: 3 })),
    );
    expect(canShowPie(one, 'count', dataset)).toBe(false);
    expect(canShowPie(many, 'count', dataset)).toBe(false);
  });

  it('rejects negative values and an empty whole', () => {
    const negative = grouped(['status'], ['total_amount'], [{ status: 'א', total_amount: 5 }, { status: 'ב', total_amount: -1 }]);
    const zeros = grouped(['status'], ['count'], [{ status: 'א', count: 0 }, { status: 'ב', count: 0 }]);
    expect(canShowPie(negative, 'total_amount', dataset)).toBe(false);
    expect(canShowPie(zeros, 'count', dataset)).toBe(false);
  });

  it('rejects a list of records', () => {
    expect(canShowPie({ ...byStatus, mode: 'records' }, 'count', dataset)).toBe(false);
  });
});
