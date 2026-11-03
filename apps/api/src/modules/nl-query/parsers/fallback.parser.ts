import type { DatasetMetadata } from '@supports/shared';
import type { Logger } from '../../../lib/logger.js';
import type { NlQueryParser, ParsedQuery } from './nl-query-parser.js';

/** Tries the primary parser (usually an LLM); on any failure uses the fallback and says so. */
export class FallbackQueryParser implements NlQueryParser {
  constructor(
    private readonly primary: NlQueryParser,
    private readonly fallback: NlQueryParser,
    private readonly logger: Logger,
  ) {}

  get name(): string {
    return `${this.primary.name}+${this.fallback.name}`;
  }

  async parse(text: string, dataset: DatasetMetadata): Promise<ParsedQuery> {
    try {
      return await this.primary.parse(text, dataset);
    } catch (err) {
      this.logger.warn({ err, primary: this.primary.name }, 'Primary query parser failed, using fallback');
      const result = await this.fallback.parse(text, dataset);
      const warning =
        getHttpStatus(err) === 429
          ? 'שירות ה-AI הגיע למגבלת הבקשות (Rate limit). השאלה פוענחה באמצעות מנגנון חלופי; אפשר לנסות שוב מאוחר יותר.'
          : 'שירות ה-AI אינו זמין כרגע; השאלה פוענחה באמצעות מנגנון חלופי.';
      return { ...result, warnings: [warning, ...result.warnings] };
    }
  }
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const record = error as Record<string, unknown>;
  if (typeof record.status === 'number') return record.status;
  if (typeof record.statusCode === 'number') return record.statusCode;
  return undefined;
}
