import { z } from 'zod';
import { OPERATORS } from './metadata.js';

/**
 * QueryDefinition is the one structure every part of the system speaks:
 * the query builder UI produces it, the AI parser produces it, saved queries store it
 * and the API executes it. Field and metric keys refer to metadata, never to columns.
 */

export const FilterValueSchema = z.union([z.string().min(1), z.number()]);

export const FilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(OPERATORS),
  values: z.array(FilterValueSchema).min(1),
});

export const QueryDefinitionSchema = z.object({
  dataset: z.string().min(1),
  filters: z.array(FilterSchema).default([]),
  groupBy: z.array(z.string().min(1)).max(2).default([]),
  metrics: z.array(z.string().min(1)).min(1).default(['count']),
});

export type FilterValue = z.infer<typeof FilterValueSchema>;
export type Filter = z.infer<typeof FilterSchema>;
export type QueryDefinition = z.infer<typeof QueryDefinitionSchema>;

/** Stable representation used for cache keys and duplicate detection. */
export function normalizeQuery(query: QueryDefinition): QueryDefinition {
  const sortValues = (values: FilterValue[]) =>
    [...values].sort((a, b) => String(a).localeCompare(String(b)));

  return {
    dataset: query.dataset,
    filters: [...query.filters]
      .map((f) => ({ ...f, values: f.operator === 'between' ? f.values : sortValues(f.values) }))
      .sort((a, b) => a.field.localeCompare(b.field)),
    groupBy: [...query.groupBy],
    metrics: [...query.metrics].sort(),
  };
}
