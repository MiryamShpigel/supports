import type { Aggregate, FieldDataType, FieldOption, Operator } from '@supports/shared';
import type { Db } from '../../lib/db.js';
import type { DatasetSchema, FieldSchema, MetricSchema } from './dataset-schema.js';

export interface MetadataRepository {
  findDatasets(tenantId: string): Promise<DatasetSchema[]>;
}

interface DatasetRow { key: string; tenant_id: string; label: string; question_prefix: string; source_table: string }
interface FieldRow {
  dataset_key: string; key: string; label: string; data_type: FieldDataType; storage: 'column' | 'attribute';
  source_name: string; operators: Operator[]; is_filterable: boolean; is_groupable: boolean; is_listable: boolean;
  phrase_template: string | null; range_template: string | null; synonyms: string[]; sort_order: number;
}
interface OptionRow { dataset_key: string; field_key: string; value: string; label: string; phrase: string | null; synonyms: string[] }
interface MetricRow {
  dataset_key: string; key: string; label: string; aggregate: Aggregate; source_column: string | null; synonyms: string[];
}

export class PgMetadataRepository implements MetadataRepository {
  constructor(private readonly db: Db) {}

  async findDatasets(tenantId: string): Promise<DatasetSchema[]> {
    const [datasets, fields, options, metrics] = await Promise.all([
      this.db.query<DatasetRow>(
        `SELECT key, tenant_id, label, question_prefix, source_table
         FROM meta.datasets WHERE tenant_id = $1 AND is_active ORDER BY key`,
        [tenantId],
      ),
      this.db.query<FieldRow>(
        `SELECT f.* FROM meta.fields f JOIN meta.datasets d ON d.key = f.dataset_key
         WHERE d.tenant_id = $1 AND f.is_active ORDER BY f.sort_order, f.key`,
        [tenantId],
      ),
      this.db.query<OptionRow>(
        `SELECT o.* FROM meta.field_options o JOIN meta.datasets d ON d.key = o.dataset_key
         WHERE d.tenant_id = $1 ORDER BY o.sort_order, o.value`,
        [tenantId],
      ),
      this.db.query<MetricRow>(
        `SELECT m.* FROM meta.metrics m JOIN meta.datasets d ON d.key = m.dataset_key
         WHERE d.tenant_id = $1 ORDER BY m.sort_order, m.key`,
        [tenantId],
      ),
    ]);

    return datasets.rows.map((d) => ({
      key: d.key,
      tenantId: d.tenant_id,
      label: d.label,
      questionPrefix: d.question_prefix,
      sourceTable: d.source_table,
      fields: fields.rows
        .filter((f) => f.dataset_key === d.key)
        .map((f) => toField(f, options.rows.filter((o) => o.dataset_key === d.key && o.field_key === f.key))),
      metrics: metrics.rows.filter((m) => m.dataset_key === d.key).map(toMetric),
    }));
  }
}

function toField(row: FieldRow, options: OptionRow[]): FieldSchema {
  return {
    key: row.key,
    label: row.label,
    dataType: row.data_type,
    storage: row.storage,
    sourceName: row.source_name,
    operators: row.operators,
    filterable: row.is_filterable,
    groupable: row.is_groupable,
    listable: row.is_listable,
    phraseTemplate: row.phrase_template ?? undefined,
    rangeTemplate: row.range_template ?? undefined,
    synonyms: row.synonyms,
    sortOrder: row.sort_order,
    options: row.data_type === 'enum' ? options.map(toOption) : undefined,
  };
}

function toOption(row: OptionRow): FieldOption {
  return { value: row.value, label: row.label, phrase: row.phrase ?? undefined, synonyms: row.synonyms };
}

function toMetric(row: MetricRow): MetricSchema {
  return { key: row.key, label: row.label, aggregate: row.aggregate, sourceColumn: row.source_column, synonyms: row.synonyms };
}
