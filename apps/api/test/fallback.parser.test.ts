import type { QueryDefinition } from '@supports/shared';
import { describe, expect, it, vi } from 'vitest';
import type { Logger } from '../src/lib/logger.js';
import { FallbackQueryParser } from '../src/modules/nl-query/parsers/fallback.parser.js';
import type { NlQueryParser, ParsedQuery } from '../src/modules/nl-query/parsers/nl-query-parser.js';
import { datasetSchema } from './fixtures.js';
import { toPublicMetadata } from '../src/modules/metadata/dataset-schema.js';

const dataset = toPublicMetadata(datasetSchema);
const definition: QueryDefinition = { dataset: dataset.key, filters: [], groupBy: [], metrics: ['count'] };
const fallbackResult: ParsedQuery = {
  definition,
  warnings: [],
  provider: 'rule-based',
  scope: 'in',
};
const primary: NlQueryParser = {
  name: 'gemini',
  parse: vi.fn(),
};
const fallback: NlQueryParser = {
  name: 'rule-based',
  parse: vi.fn().mockResolvedValue(fallbackResult),
};
const logger = { warn: vi.fn() } as unknown as Logger;

describe('FallbackQueryParser', () => {
  it('explains rate limits in the fallback warning', async () => {
    vi.mocked(primary.parse).mockRejectedValue(Object.assign(new Error('rate limited'), { status: 429 }));
    const parser = new FallbackQueryParser(primary, fallback, logger);

    const result = await parser.parse('בקשות תמיכה', dataset);

    expect(result.warnings[0]).toContain('Rate limit');
    expect(result.warnings[0]).toContain('מנגנון חלופי');
  });

  it('uses the general fallback warning for other provider failures', async () => {
    vi.mocked(primary.parse).mockRejectedValue(Object.assign(new Error('unavailable'), { status: 503 }));
    const parser = new FallbackQueryParser(primary, fallback, logger);

    const result = await parser.parse('בקשות תמיכה', dataset);

    expect(result.warnings[0]).toContain('אינו זמין כרגע');
  });
});
