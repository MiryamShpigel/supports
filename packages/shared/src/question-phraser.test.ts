import { describe, expect, it } from 'vitest';
import { phraseQuestion } from './question-phraser.js';
import { supportRequestsFixture as dataset } from './testing/support-requests.fixture.js';

describe('phraseQuestion', () => {
  it('phrases the example from the requirements document', () => {
    const question = phraseQuestion(
      {
        dataset: 'support-requests',
        filters: [
          { field: 'year', operator: 'between', values: [2023, 2025] },
          { field: 'district', operator: 'in', values: ['north'] },
          { field: 'status', operator: 'in', values: ['approved'] },
          { field: 'domain', operator: 'in', values: ['culture'] },
        ],
        groupBy: ['year'],
        metrics: ['count'],
      },
      dataset,
    );

    expect(question).toBe(
      'הצג את כלל בקשות התמיכה שאושרו בתחום התרבות במחוז צפון בשנים 2023–2025, בחלוקה לפי שנה.',
    );
  });

  it('phrases the free-text example from the requirements document', () => {
    const question = phraseQuestion(
      {
        dataset: 'support-requests',
        filters: [
          { field: 'status', operator: 'in', values: ['approved'] },
          { field: 'org_type', operator: 'in', values: ['association'] },
          { field: 'domain', operator: 'in', values: ['sport'] },
          { field: 'year', operator: 'in', values: [2025] },
        ],
        groupBy: [],
        metrics: ['count'],
      },
      dataset,
    );

    expect(question).toBe('הצג את כלל בקשות התמיכה שאושרו לעמותות בתחום הספורט בשנת 2025.');
  });

  it('joins multiple values, multiple groupings and extra metrics', () => {
    const question = phraseQuestion(
      {
        dataset: 'support-requests',
        filters: [{ field: 'district', operator: 'in', values: ['north', 'south'] }],
        groupBy: ['district', 'year'],
        metrics: ['count', 'total_amount'],
      },
      dataset,
    );

    expect(question).toBe(
      'הצג את כלל בקשות התמיכה במחוז צפון או דרום, בחלוקה לפי מחוז ושנה, כולל סכום מבוקש.',
    );
  });

  it('phrases a query without filters', () => {
    expect(
      phraseQuestion({ dataset: 'support-requests', filters: [], groupBy: [], metrics: ['count'] }, dataset),
    ).toBe('הצג את כלל בקשות התמיכה.');
  });
});
