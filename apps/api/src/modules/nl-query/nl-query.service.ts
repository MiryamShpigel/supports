import { phraseQuestion, validateQuery, type NlParseRequest, type NlParseResult, type QueryDefinition } from '@supports/shared';
import type { RequestContext } from '../../lib/request-context.js';
import type { AuditService } from '../audit/audit.service.js';
import type { MetadataService } from '../metadata/metadata.service.js';
import type { NlQueryParser } from './parsers/nl-query-parser.js';

export class NlQueryService {
  constructor(
    private readonly parser: NlQueryParser,
    private readonly metadata: MetadataService,
    private readonly audit: AuditService,
  ) {}

  /** Returns the interpretation only. Running it is a separate, user-confirmed step. */
  async parse(ctx: RequestContext, request: NlParseRequest): Promise<NlParseResult> {
    const dataset = await this.metadata.getDataset(ctx, request.dataset);
    const parsed = await this.parser.parse(request.text, dataset);

    // Never trust the parser blindly: drop anything that does not match the metadata.
    const { definition, dropped } = keepValidParts(parsed.definition, (q) => validateQuery(q, dataset).length === 0);
    const warnings = [...parsed.warnings, ...dropped.map((d) => `חלק מהפרשנות הושמט כי אינו תקין: ${d}`)];

    // A parser that proposed something, all of which failed validation, did not understand
    // the question: offering "all requests" instead would answer a different question.
    const nothingLeft = dropped.length > 0 && isEmptyQuery(definition);
    const scope = parsed.scope === 'out' || nothingLeft ? 'out' : parsed.scope;

    const result: NlParseResult =
      scope === 'out'
        ? {
            definition: emptyQuery(dataset.key),
            question: '',
            scope,
            scopeNote: parsed.scopeNote ?? 'לא ניתן היה להבין את השאלה במונחים של המערכת.',
            provider: parsed.provider,
            warnings: [],
          }
        : {
            definition,
            question: phraseQuestion(definition, dataset),
            scope,
            scopeNote: scope === 'partial' ? parsed.scopeNote : undefined,
            provider: parsed.provider,
            warnings,
          };
    await this.audit.record(ctx, 'query.parse_free_text', undefined, {
      text: request.text,
      provider: parsed.provider,
      scope,
      question: result.question,
    });
    return result;
  }
}

const emptyQuery = (dataset: string): QueryDefinition => ({ dataset, filters: [], groupBy: [], metrics: ['count'] });

function isEmptyQuery(query: QueryDefinition): boolean {
  return query.filters.length === 0 && query.groupBy.length === 0 && query.metrics.length === 1;
}

/** Keeps each filter / grouping / metric only if the query stays valid with it. */
function keepValidParts(
  query: QueryDefinition,
  isValid: (q: QueryDefinition) => boolean,
): { definition: QueryDefinition; dropped: string[] } {
  const dropped: string[] = [];
  const result: QueryDefinition = { dataset: query.dataset, filters: [], groupBy: [], metrics: ['count'] };

  for (const filter of query.filters) {
    const candidate = { ...result, filters: [...result.filters, filter] };
    if (isValid(candidate)) result.filters = candidate.filters;
    else dropped.push(`${filter.field}=${filter.values.join(',')}`);
  }
  for (const key of query.groupBy) {
    const candidate = { ...result, groupBy: [...result.groupBy, key] };
    if (isValid(candidate)) result.groupBy = candidate.groupBy;
    else dropped.push(`פילוח לפי ${key}`);
  }
  for (const key of query.metrics.filter((m) => m !== 'count')) {
    const candidate = { ...result, metrics: [...result.metrics, key] };
    if (isValid(candidate)) result.metrics = candidate.metrics;
    else dropped.push(`מדד ${key}`);
  }
  return { definition: result, dropped };
}
