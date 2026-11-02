import { OPERATORS, type DatasetMetadata, type FieldDefinition, type QueryDefinition } from '@supports/shared';
import { z } from 'zod';
import type { LlmProvider } from '../llm/llm-provider.js';
import type { NlQueryParser, ParsedQuery } from './nl-query-parser.js';

/**
 * Asks an LLM to translate the question. Both the prompt and the output schema are built
 * from metadata at request time, so a new field is understood by the AI automatically.
 * The model only proposes a query; the service validates it and the user confirms it.
 */
export class LlmQueryParser implements NlQueryParser {
  constructor(private readonly llm: LlmProvider) {}

  get name(): string {
    return this.llm.name;
  }

  async parse(text: string, dataset: DatasetMetadata): Promise<ParsedQuery> {
    const filterable = dataset.fields.filter((f) => f.filterable);
    const groupable = dataset.fields.filter((f) => f.groupable);

    const output = await this.llm.generateObject({
      system: buildSystemPrompt(dataset, filterable, groupable),
      prompt: text,
      schema: buildOutputSchema(filterable, groupable, dataset),
    });

    const numeric = new Set(filterable.filter((f) => f.dataType !== 'enum' && f.dataType !== 'text').map((f) => f.key));
    const definition: QueryDefinition = {
      dataset: dataset.key,
      filters: output.filters.map((f) => ({
        field: f.field,
        operator: f.operator,
        values: numeric.has(f.field) ? f.values.map(Number) : f.values,
      })),
      groupBy: output.groupBy.slice(0, 2),
      metrics: output.metrics.includes('count') ? output.metrics : ['count', ...output.metrics],
    };
    const warnings = output.unrecognized.map((part) => `לא זוהה: "${part}"`);
    return { definition, warnings, provider: this.name };
  }
}

function describeField(field: FieldDefinition): string {
  const synonyms = field.synonyms?.length ? ` (also called: ${field.synonyms.join(', ')})` : '';
  const header = `- ${field.key} — "${field.label}"${synonyms}; operators: ${field.operators.join(', ')}`;
  if (field.dataType === 'enum') {
    const options = (field.options ?? []).map((o) => {
      const extra = [o.phrase, ...(o.synonyms ?? [])].filter(Boolean).join(', ');
      return `    ${o.value} = ${o.label}${extra ? ` (${extra})` : ''}`;
    });
    return [header, '  values (use the code on the left):', ...options].join('\n');
  }
  return `${header}; numeric values${field.dataType === 'year' ? ' (4-digit years)' : ''}`;
}

function buildSystemPrompt(dataset: DatasetMetadata, filterable: FieldDefinition[], groupable: FieldDefinition[]): string {
  return [
    `You translate a question written in Hebrew about "${dataset.label}" into a structured query.`,
    'The query is executed by a reporting system, so map only what the question actually asks for.',
    '',
    'Fields available for filtering:',
    ...filterable.map(describeField),
    '',
    `Fields available for grouping ("בחלוקה לפי", "לפי", "פילוח"): ${groupable.map((f) => `${f.key} ("${f.label}")`).join(', ')}`,
    `Metrics: ${dataset.metrics.map((m) => `${m.key} ("${m.label}")`).join(', ')}`,
    '',
    'Rules:',
    '- Add a filter only for a condition stated in the question. Use the value codes exactly as listed.',
    '- "in" takes one or more values. "between" takes exactly two values [from, to] — use it for ranges such as "2023–2025".',
    '- Group only when the question asks for a breakdown; at most two fields.',
    '- Always include the "count" metric; add others only when asked (for example "סכום").',
    '- Put any condition you cannot express with the fields above into "unrecognized", in the original Hebrew wording.',
  ].join('\n');
}

function nonEmptyEnum(keys: string[]) {
  return z.enum(keys.length ? (keys as [string, ...string[]]) : ['__none__']);
}

function buildOutputSchema(filterable: FieldDefinition[], groupable: FieldDefinition[], dataset: DatasetMetadata) {
  return z.object({
    filters: z.array(
      z.object({
        field: nonEmptyEnum(filterable.map((f) => f.key)),
        operator: z.enum(OPERATORS),
        values: z.array(z.string()),
      }),
    ),
    groupBy: z.array(nonEmptyEnum(groupable.map((f) => f.key))),
    metrics: z.array(nonEmptyEnum(dataset.metrics.map((m) => m.key))),
    unrecognized: z.array(z.string()),
  });
}
