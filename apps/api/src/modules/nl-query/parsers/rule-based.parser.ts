import type { DatasetMetadata, Filter, QueryDefinition } from '@supports/shared';
import type { NlQueryParser, ParsedQuery } from './nl-query-parser.js';

/**
 * Deterministic parser driven entirely by metadata: option labels and synonyms, field
 * names after "לפי", metric synonyms and year patterns. Works offline and serves as the
 * fallback when the AI provider is unavailable.
 */
export class RuleBasedQueryParser implements NlQueryParser {
  readonly name = 'rule-based';

  async parse(text: string, dataset: DatasetMetadata): Promise<ParsedQuery> {
    const input = new MatchableText(normalize(text));
    const filters = new Map<string, Filter>();
    const groupBy: string[] = [];
    const metrics = new Set<string>(['count']);

    // 1. Years: ranges first ("2023-2025", "בין 2023 ל-2025"), then single years.
    const yearField = dataset.fields.find((f) => f.dataType === 'year' && f.filterable);
    if (yearField) {
      const range = input.consumeRegex(/(?:בין|מ-?|משנת)?\s*(20\d{2})\s*(?:[-–]|עד|ל-?)\s*(?:שנת\s*)?(20\d{2})/);
      if (range && yearField.operators.includes('between')) {
        const [from, to] = [Number(range[1]), Number(range[2])].sort((a, b) => a - b);
        filters.set(yearField.key, { field: yearField.key, operator: 'between', values: [from!, to!] });
      } else {
        const years = input.consumeAllRegex(/20\d{2}/g).map(Number);
        if (years.length) filters.set(yearField.key, { field: yearField.key, operator: 'in', values: years });
      }
    }

    // 2. Grouping: field names that appear after "לפי".
    const byIndex = input.text.indexOf('לפי');
    if (byIndex >= 0) {
      const terms = dataset.fields
        .filter((f) => f.groupable)
        .flatMap((f) => [f.label, ...(f.synonyms ?? [])].map((term) => ({ term, key: f.key })));
      for (const { key } of input.consumeTerms(terms, byIndex)) {
        if (!groupBy.includes(key) && groupBy.length < 2) groupBy.push(key);
      }
    }

    // 3. Metrics: "סכום", "ממוצע"...
    const metricTerms = dataset.metrics.flatMap((m) => [m.label, ...(m.synonyms ?? [])].map((term) => ({ term, key: m.key })));
    for (const { key } of input.consumeTerms(metricTerms)) metrics.add(key);

    // 4. Option values of enum fields: "אושרו" -> status=approved, "עמותות" -> org_type=association.
    const optionTerms = dataset.fields
      .filter((f) => f.filterable && f.dataType === 'enum')
      .flatMap((f) =>
        (f.options ?? []).flatMap((o) =>
          [o.label, ...(o.synonyms ?? [])].map((term) => ({ term, key: `${f.key}\u0000${o.value}` })),
        ),
      );
    for (const { key } of input.consumeTerms(optionTerms)) {
      const [field, value] = key.split('\u0000') as [string, string];
      const existing = filters.get(field);
      if (!existing) filters.set(field, { field, operator: 'in', values: [value] });
      else if (!existing.values.includes(value)) existing.values.push(value);
    }

    const definition: QueryDefinition = {
      dataset: dataset.key,
      filters: [...filters.values()],
      groupBy,
      metrics: [...metrics],
    };
    const warnings: string[] = [];
    if (definition.filters.length === 0 && groupBy.length === 0) {
      warnings.push('לא זוהו בשאלה פרמטרים מוכרים – תוצג כלל הבקשות. ניתן לדייק את השאלה או לבחור פרמטרים ידנית.');
    }

    // 5. A field named in the text ("בסטטוס ...") whose value was not recognised.
    const mentionTerms = dataset.fields
      .filter((f) => f.filterable && !filters.has(f.key) && !groupBy.includes(f.key))
      .flatMap((f) => [f.label, ...(f.synonyms ?? [])].map((term) => ({ term, label: f.label })));
    const mentioned = new Set(input.consumeTerms(mentionTerms).map((m) => m.label));
    for (const label of mentioned) {
      warnings.push(`הוזכר "${label}" אך לא זוהה ערך – יש לבחור אותו ידנית בעריכה.`);
    }

    return { definition, warnings, provider: this.name };
  }
}

function normalize(text: string): string {
  return text
    .replace(/[״“”]/g, '"')
    .replace(/[׳‘’]/g, "'")
    .replace(/[־—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

const HEBREW_PREFIXES = /^[והבלשמכ]{0,3}$/;

/** Text in which matched spans are "consumed" so a word is never used twice. */
class MatchableText {
  private readonly consumed: boolean[];

  constructor(readonly text: string) {
    this.consumed = new Array(text.length).fill(false);
  }

  consumeRegex(pattern: RegExp): RegExpExecArray | null {
    const match = pattern.exec(this.text);
    if (match) this.mark(match.index, match[0].length);
    return match;
  }

  consumeAllRegex(pattern: RegExp): string[] {
    const found: string[] = [];
    for (const match of this.text.matchAll(pattern)) {
      if (this.isFree(match.index, match[0].length)) {
        this.mark(match.index, match[0].length);
        found.push(match[0]);
      }
    }
    return found;
  }

  /**
   * Finds terms, longest first (so "אירועי תרבות" wins over "תרבות"). A term may be
   * preceded only by Hebrew prefix letters ("לעמותות", "במחוז").
   */
  consumeTerms<T extends { term: string }>(terms: T[], from = 0): T[] {
    const found: T[] = [];
    const sorted = [...terms].filter((t) => t.term).sort((a, b) => b.term.length - a.term.length);
    for (const candidate of sorted) {
      let index = this.text.indexOf(candidate.term, from);
      while (index >= 0) {
        if (this.isFree(index, candidate.term.length) && this.hasOnlyPrefixBefore(index)) {
          this.mark(index, candidate.term.length);
          found.push(candidate);
          break;
        }
        index = this.text.indexOf(candidate.term, index + 1);
      }
    }
    return found;
  }

  private hasOnlyPrefixBefore(index: number): boolean {
    let start = index;
    while (start > 0 && /[֐-׿]/.test(this.text[start - 1]!)) start--;
    return HEBREW_PREFIXES.test(this.text.slice(start, index));
  }

  private isFree(index: number, length: number): boolean {
    return this.consumed.slice(index, index + length).every((c) => !c);
  }

  private mark(index: number, length: number): void {
    for (let i = index; i < index + length; i++) this.consumed[i] = true;
  }
}
