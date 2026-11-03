import type { DatasetMetadata, QueryDefinition, QueryScope } from '@supports/shared';

export interface ParsedQuery {
  definition: QueryDefinition;
  warnings: string[];
  /** Name of the parser that actually produced the result. */
  provider: string;
  /** The parser's judgement of whether the data can answer the question. */
  scope: QueryScope;
  /** Why the question is partial or out of scope (Hebrew, one sentence). */
  scopeNote?: string;
}

/**
 * Strategy for turning free text into a QueryDefinition. Implementations:
 * RuleBasedQueryParser (no external dependency), LlmQueryParser (any LlmProvider),
 * FallbackQueryParser (tries one, falls back to another).
 */
export interface NlQueryParser {
  readonly name: string;
  parse(text: string, dataset: DatasetMetadata): Promise<ParsedQuery>;
}
