import type { DatasetMetadata, FieldDefinition } from './metadata.js';
import type { Filter, QueryDefinition } from './query.js';

/**
 * Turns a QueryDefinition into a readable Hebrew question, using only templates
 * from metadata. Example:
 * "הצג את כלל בקשות התמיכה שאושרו בתחום התרבות במחוז צפון בשנים 2023–2025, בחלוקה לפי שנה."
 * Shared so the client can preview instantly and the server can phrase saved/AI queries.
 */
export function phraseQuestion(query: QueryDefinition, dataset: DatasetMetadata): string {
  const fields = new Map(dataset.fields.map((f) => [f.key, f]));

  const filterParts = query.filters
    .map((filter) => ({ filter, field: fields.get(filter.field) }))
    .filter((x): x is { filter: Filter; field: FieldDefinition } => x.field !== undefined)
    .sort((a, b) => a.field.sortOrder - b.field.sortOrder)
    .map(({ filter, field }) => phraseFilter(filter, field));

  let question = [dataset.questionPrefix, ...filterParts].join(' ');

  const groupLabels = query.groupBy.map((key) => fields.get(key)?.label ?? key);
  if (groupLabels.length) question += `, בחלוקה לפי ${joinHebrew(groupLabels, 'ו')}`;

  const extraMetrics = query.metrics
    .filter((key) => key !== 'count')
    .map((key) => dataset.metrics.find((m) => m.key === key)?.label ?? key);
  if (extraMetrics.length) question += `, כולל ${joinHebrew(extraMetrics, 'ו')}`;

  return `${question}.`;
}

function phraseFilter(filter: Filter, field: FieldDefinition): string {
  if (filter.operator === 'between') {
    const [from, to] = filter.values;
    const template = field.rangeTemplate ?? `${field.label} בין {from} ל-{to}`;
    return template.replace('{from}', String(from)).replace('{to}', String(to));
  }

  const words = filter.values.map((value) => {
    const option = field.options?.find((o) => o.value === String(value));
    return option?.phrase ?? option?.label ?? String(value);
  });
  const template = field.phraseTemplate ?? `${field.label}: {values}`;
  return template.replace('{values}', joinHebrew(words, 'או '));
}

/** ["א","ב","ג"] -> "א, ב או ג" (connector "או ") / "א, ב וג" (connector "ו"). */
function joinHebrew(items: string[], connector: string): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${connector}${items.at(-1)}`;
}
