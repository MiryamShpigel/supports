import { describe, expect, it } from 'vitest';
import { toPublicMetadata } from '../src/modules/metadata/dataset-schema.js';
import { RuleBasedQueryParser } from '../src/modules/nl-query/parsers/rule-based.parser.js';
import { datasetSchema } from './fixtures.js';

const parser = new RuleBasedQueryParser();
const dataset = toPublicMetadata(datasetSchema);

describe('RuleBasedQueryParser', () => {
  it('parses the free-text example from the requirements document', async () => {
    const { definition, warnings } = await parser.parse(
      'הצג את כלל בקשות התמיכה שאושרו לעמותות בתחום הספורט בשנת 2025',
      dataset,
    );

    expect(definition.filters).toEqual(
      expect.arrayContaining([
        { field: 'status', operator: 'in', values: ['approved'] },
        { field: 'org_type', operator: 'in', values: ['association'] },
        { field: 'domain', operator: 'in', values: ['sport'] },
        { field: 'year', operator: 'in', values: [2025] },
      ]),
    );
    expect(definition.filters).toHaveLength(4);
    expect(warnings).toEqual([]);
  });

  it('warns when a field is mentioned but its value is not recognised', async () => {
    const { definition, warnings } = await parser.parse('בקשות במחוז צפון בסטטוס לא ידוע', dataset);

    expect(definition.filters).toEqual([{ field: 'district', operator: 'in', values: ['north'] }]);
    expect(warnings).toEqual(['הוזכר "סטטוס" אך לא זוהה ערך – יש לבחור אותו ידנית בעריכה.']);
  });

  it('recognises a year range, a grouping and an extra metric', async () => {
    const { definition } = await parser.parse('בקשות בתחום התרבות במחוז צפון 2023-2025 לפי שנה, כולל סכום', dataset);

    expect(definition.filters).toEqual(
      expect.arrayContaining([
        { field: 'domain', operator: 'in', values: ['culture'] },
        { field: 'district', operator: 'in', values: ['north'] },
        { field: 'year', operator: 'between', values: [2023, 2025] },
      ]),
    );
    expect(definition.groupBy).toEqual(['year']);
    expect(definition.metrics).toEqual(['count', 'total_amount']);
  });

  it('collects several values of the same field', async () => {
    const { definition } = await parser.parse('בקשות במחוז צפון ובמחוז דרום', dataset);
    expect(definition.filters).toEqual([{ field: 'district', operator: 'in', values: ['north', 'south'] }]);
  });

  it('marks a question about something else as out of scope', async () => {
    const { definition, scope, scopeNote, warnings } = await parser.parse('מה מזג האוויר מחר?', dataset);
    expect(scope).toBe('out');
    expect(scopeNote).toContain('בקשות תמיכה');
    expect(definition.filters).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('keeps a request for all records in scope and warns that nothing narrows it', async () => {
    const { definition, scope, warnings } = await parser.parse('הצג לי את כל הבקשה', dataset);
    expect(scope).toBe('in');
    expect(definition.filters).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('marks a recognised question as in scope', async () => {
    const { scope, scopeNote } = await parser.parse('בקשות במחוז צפון', dataset);
    expect(scope).toBe('in');
    expect(scopeNote).toBeUndefined();
  });
});
