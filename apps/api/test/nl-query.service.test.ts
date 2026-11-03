import type { QueryDefinition } from '@supports/shared';
import { describe, expect, it } from 'vitest';
import type { RequestContext } from '../src/lib/request-context.js';
import type { AuditService } from '../src/modules/audit/audit.service.js';
import { toPublicMetadata } from '../src/modules/metadata/dataset-schema.js';
import type { MetadataService } from '../src/modules/metadata/metadata.service.js';
import { NlQueryService } from '../src/modules/nl-query/nl-query.service.js';
import type { NlQueryParser, ParsedQuery } from '../src/modules/nl-query/parsers/nl-query-parser.js';
import { datasetSchema } from './fixtures.js';

const ctx: RequestContext = { userId: 'tester', tenantId: 'culture-sport', correlationId: 'test' };
const dataset = toPublicMetadata(datasetSchema);
const metadata = { getDataset: async () => dataset } as unknown as MetadataService;
const audit = { record: async () => {} } as unknown as AuditService;

const query = (overrides: Partial<QueryDefinition> = {}): QueryDefinition => ({
  dataset: dataset.key,
  filters: [],
  groupBy: [],
  metrics: ['count'],
  ...overrides,
});

/** A parser that returns a fixed answer, standing in for the LLM. */
function serviceReturning(parsed: Omit<ParsedQuery, 'provider'>): NlQueryService {
  const parser: NlQueryParser = { name: 'fake', parse: async () => ({ ...parsed, provider: 'fake' }) };
  return new NlQueryService(parser, metadata, audit);
}

const parse = (service: NlQueryService) => service.parse(ctx, { text: 'שאלה כלשהי', dataset: dataset.key });

describe('NlQueryService scope handling', () => {
  it('offers no query for an out-of-scope question', async () => {
    const result = await parse(
      serviceReturning({ definition: query(), warnings: [], scope: 'out', scopeNote: 'השאלה אינה עוסקת בבקשות תמיכה.' }),
    );

    expect(result.scope).toBe('out');
    expect(result.question).toBe('');
    expect(result.scopeNote).toBe('השאלה אינה עוסקת בבקשות תמיכה.');
    expect(result.definition).toEqual(query());
  });

  it('treats an in-scope answer whose every part fails validation as out of scope', async () => {
    const result = await parse(
      serviceReturning({
        definition: query({ filters: [{ field: 'weather', operator: 'in', values: ['rain'] }] }),
        warnings: [],
        scope: 'in',
      }),
    );

    expect(result.scope).toBe('out');
    expect(result.question).toBe('');
    expect(result.scopeNote).toBeTruthy();
  });

  it('offers the closest query with its note for a partial question', async () => {
    const result = await parse(
      serviceReturning({
        definition: query({ filters: [{ field: 'org_type', operator: 'in', values: ['association'] }] }),
        warnings: [],
        scope: 'partial',
        scopeNote: 'המערכת מכירה רק עמותות שהגישו בקשה.',
      }),
    );

    expect(result.scope).toBe('partial');
    expect(result.scopeNote).toBe('המערכת מכירה רק עמותות שהגישו בקשה.');
    expect(result.question).not.toBe('');
    expect(result.definition.filters).toEqual([{ field: 'org_type', operator: 'in', values: ['association'] }]);
  });

  it('drops a note the parser sent with an in-scope answer', async () => {
    const result = await parse(
      serviceReturning({
        definition: query({ filters: [{ field: 'district', operator: 'in', values: ['north'] }] }),
        warnings: [],
        scope: 'in',
        scopeNote: 'הערה מיותרת',
      }),
    );

    expect(result.scope).toBe('in');
    expect(result.scopeNote).toBeUndefined();
  });
});
