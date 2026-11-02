import type { DatasetMetadata, FieldDefinition, MetricDefinition } from '@supports/shared';

/**
 * Server-side view of a dataset: the public metadata plus WHERE the data lives.
 * Storage details never leave the server.
 */
export interface FieldSchema extends FieldDefinition {
  storage: 'column' | 'attribute';
  sourceName: string;
}

export interface MetricSchema extends MetricDefinition {
  sourceColumn: string | null;
}

export interface DatasetSchema extends Omit<DatasetMetadata, 'fields' | 'metrics'> {
  tenantId: string;
  sourceTable: string;
  fields: FieldSchema[];
  metrics: MetricSchema[];
}

export function toPublicMetadata(schema: DatasetSchema): DatasetMetadata {
  return {
    key: schema.key,
    label: schema.label,
    questionPrefix: schema.questionPrefix,
    fields: schema.fields.map(({ storage: _s, sourceName: _n, ...field }) => field),
    metrics: schema.metrics.map(({ sourceColumn: _c, ...metric }) => metric),
  };
}
