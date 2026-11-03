import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import type { Logger } from '../../../lib/logger.js';
import type { LlmProvider } from './llm-provider.js';

const OPENAI_REQUEST_TIMEOUT_MS = 15_000;

/** OpenAI provider using strict structured outputs that are validated against the Zod schema. */
export class OpenAiProvider implements LlmProvider {
  readonly name = 'openai';
  private readonly client: OpenAI;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly logger: Pick<Logger, 'info' | 'error'>,
  ) {
    this.client = new OpenAI({ apiKey, timeout: OPENAI_REQUEST_TIMEOUT_MS, maxRetries: 0 });
  }

  async generateObject<T>({ system, prompt, schema }: { system: string; prompt: string; schema: z.ZodType<T> }): Promise<T> {
    const startedAt = Date.now();
    this.logger.info({ provider: this.name, model: this.model }, 'OpenAI request started');

    try {
      const response = await this.client.responses.parse({
        model: this.model,
        input: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        text: { format: zodTextFormat(schema, 'nl_query') },
      });

      if (response.output_parsed == null) throw new Error('The model returned no parsable output');
      const output = schema.parse(response.output_parsed);
      this.logger.info(
        {
          provider: this.name,
          model: this.model,
          responseId: response.id,
          status: response.status,
          durationMs: Date.now() - startedAt,
        },
        'OpenAI request completed',
      );
      return output;
    } catch (error) {
      this.logger.error(
        {
          provider: this.name,
          model: this.model,
          durationMs: Date.now() - startedAt,
          ...getSafeErrorDetails(error, this.apiKey),
        },
        'OpenAI request failed',
      );
      throw error;
    }
  }
}

function getSafeErrorDetails(error: unknown, apiKey: string): Record<string, unknown> {
  const details: Record<string, unknown> = {
    errorName: error instanceof Error ? error.name : 'UnknownError',
  };
  if (error instanceof Error) details.errorMessage = error.message;

  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.status === 'number') details.status = record.status;
    if (typeof record.code === 'string' || typeof record.code === 'number') details.code = record.code;
  }

  if (typeof details.errorMessage === 'string' && apiKey) {
    details.errorMessage = details.errorMessage.replaceAll(apiKey, '[REDACTED]');
  }
  return details;
}
