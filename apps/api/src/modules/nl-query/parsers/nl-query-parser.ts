import type { DatasetMetadata, QueryDefinition } from '@supports/shared';

export interface ParsedQuery {
  definition: QueryDefinition;
  warnings: string[];
  /** Name of the parser that actually produced the result. */
  provider: string;
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
