import { supportRequestsFixture } from '../../../packages/shared/src/testing/support-requests.fixture.js';
import type { DatasetSchema } from '../src/modules/metadata/dataset-schema.js';

/** The shared test metadata plus server-side storage details and one JSONB attribute field. */
export const datasetSchema: DatasetSchema = {
  ...supportRequestsFixture,
  tenantId: 'culture-sport',
  sourceTable: 'data.support_requests',
  fields: [
    ...supportRequestsFixture.fields.map((f) => ({
      ...f,
      storage: 'column' as const,
      sourceName: f.key,
      synonyms: f.key === 'district' ? ['מחוזות'] : f.key === 'year' ? ['שנים'] : [],
    })),
    {
      key: 'social_cluster', label: 'אשכול חברתי', dataType: 'enum', operators: ['in'],
      filterable: true, groupable: true, listable: false, sortOrder: 45,
      phraseTemplate: 'באשכול חברתי {values}', storage: 'attribute', sourceName: 'social_cluster',
      options: [{ value: '1', label: '1' }, { value: '2', label: '2' }],
    },
  ],
  metrics: supportRequestsFixture.metrics.map((m) => ({
    ...m,
    sourceColumn: m.aggregate === 'count' ? null : 'requested_amount',
    synonyms: m.key === 'total_amount' ? ['סכום'] : [],
  })),
};
