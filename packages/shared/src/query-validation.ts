import type { DatasetMetadata, FieldDefinition } from './metadata.js';
import type { Filter, QueryDefinition } from './query.js';

export interface ValidationIssue {
  path: string;
  message: string;
}

/**
 * Semantic validation of a query against metadata. The zod schema checks the shape;
 * this checks the meaning (field exists, operator allowed, value is a known option...).
 * Runs on the server before execution and can run on the client for instant feedback.
 */
export function validateQuery(query: QueryDefinition, dataset: DatasetMetadata): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fields = new Map(dataset.fields.map((f) => [f.key, f]));

  if (query.dataset !== dataset.key) {
    issues.push({ path: 'dataset', message: `מקור נתונים לא מוכר: ${query.dataset}` });
    return issues;
  }

  const seen = new Set<string>();
  query.filters.forEach((filter, i) => {
    const path = `filters[${i}]`;
    const field = fields.get(filter.field);
    if (!field || !field.filterable) {
      issues.push({ path, message: `לא ניתן לסנן לפי השדה "${filter.field}"` });
      return;
    }
    if (seen.has(filter.field)) {
      issues.push({ path, message: `השדה "${field.label}" מופיע יותר מפעם אחת` });
    }
    seen.add(filter.field);
    issues.push(...validateFilter(filter, field, path));
  });

  const grouped = new Set<string>();
  query.groupBy.forEach((key, i) => {
    const field = fields.get(key);
    if (!field || !field.groupable) {
      issues.push({ path: `groupBy[${i}]`, message: `לא ניתן לפלח לפי "${key}"` });
    } else if (grouped.has(key)) {
      issues.push({ path: `groupBy[${i}]`, message: `הפילוח "${field.label}" כפול` });
    }
    grouped.add(key);
  });

  const metrics = new Set(dataset.metrics.map((m) => m.key));
  query.metrics.forEach((key, i) => {
    if (!metrics.has(key)) issues.push({ path: `metrics[${i}]`, message: `מדד לא מוכר: ${key}` });
  });

  return issues;
}

function validateFilter(filter: Filter, field: FieldDefinition, path: string): ValidationIssue[] {
  if (!field.operators.includes(filter.operator)) {
    return [{ path, message: `האופרטור "${filter.operator}" אינו נתמך עבור "${field.label}"` }];
  }

  if (filter.operator === 'between') {
    const [from, to] = filter.values.map(Number);
    if (filter.values.length !== 2 || Number.isNaN(from) || Number.isNaN(to)) {
      return [{ path, message: `טווח עבור "${field.label}" חייב לכלול שני ערכים מספריים` }];
    }
    return from! > to! ? [{ path, message: `בטווח "${field.label}" ערך ההתחלה גדול מערך הסיום` }] : [];
  }

  if (field.dataType === 'enum') {
    const allowed = new Set(field.options?.map((o) => o.value));
    const unknown = filter.values.filter((v) => !allowed.has(String(v)));
    return unknown.length
      ? [{ path, message: `ערכים לא מוכרים עבור "${field.label}": ${unknown.join(', ')}` }]
      : [];
  }

  if (field.dataType === 'number' || field.dataType === 'year') {
    return filter.values.some((v) => Number.isNaN(Number(v)))
      ? [{ path, message: `"${field.label}" מקבל ערכים מספריים בלבד` }]
      : [];
  }

  return [];
}
