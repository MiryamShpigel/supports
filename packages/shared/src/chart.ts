import type { QueryResult } from './api.js';
import type { DatasetMetadata } from './metadata.js';

export type ChartKind = 'bar' | 'doughnut';

/** Above this, slices get too thin to read and to compare. */
export const MAX_PIE_SLICES = 5;

/**
 * Whether a part-of-whole chart is honest for this result and metric. Decided from metadata
 * (field data type, metric aggregate), never from field names, so new fields follow the rules:
 * - one grouping (a second grouping does not fit one circle);
 * - an additive metric: counts and sums add up to a whole, averages do not;
 * - an unordered field: years and numbers have an order a circle hides;
 * - 2 to MAX_PIE_SLICES slices, no negative values and something to divide.
 */
export function canShowPie(result: QueryResult, metricKey: string, dataset: DatasetMetadata): boolean {
  const dimensions = result.columns.filter((c) => c.kind === 'dimension');
  if (result.mode !== 'grouped' || dimensions.length !== 1) return false;

  const field = dataset.fields.find((f) => f.key === dimensions[0]!.key);
  const metric = dataset.metrics.find((m) => m.key === metricKey);
  if (!field || !metric) return false;
  if (metric.aggregate === 'avg') return false;
  if (field.dataType === 'year' || field.dataType === 'number') return false;

  const values = result.rows.map((row) => Number(row[metricKey] ?? 0));
  return (
    values.length >= 2 &&
    values.length <= MAX_PIE_SLICES &&
    values.every((v) => Number.isFinite(v) && v >= 0) &&
    values.some((v) => v > 0)
  );
}
