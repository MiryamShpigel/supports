import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { Logger } from '../../../lib/logger.js';
import type { LlmProvider } from './llm-provider.js';

const GEMINI_REQUEST_TIMEOUT_MS = 15_000;

/** Gemini provider using JSON-schema constrained output. */
export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  private readonly client: GoogleGenAI;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly logger: Pick<Logger, 'info' | 'error'>,
  ) {
    this.client = new GoogleGenAI({ apiKey: this.apiKey });
  }

  async generateObject<T>({ system, prompt, schema }: { system: string; prompt: string; schema: z.ZodType<T> }): Promise<T> {
    const startedAt = Date.now();
    this.logger.info({ provider: this.name, model: this.model }, 'Gemini request started');

    try {
      const response = await this.client.interactions.create({
        model: this.model,
        input: prompt,
        system_instruction: system,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: toGeminiJsonSchema(schema),
        },
      }, {
        timeout_ms: GEMINI_REQUEST_TIMEOUT_MS,
        retries: { strategy: 'none' },
      });

      if (!response.output_text) throw new Error('The model returned no parsable output');
      const output = schema.parse(JSON.parse(response.output_text));
      
      this.logger.info(
        {
          provider: this.name,
          model: this.model,
          interactionId: response.id,
          status: response.status,
          durationMs: Date.now() - startedAt,
        },
        'Gemini request completed',
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
        'Gemini request failed',
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

  if (isRecord(error)) {
    if (typeof error.status === 'number') details.status = error.status;
    if (typeof error.code === 'string' || typeof error.code === 'number') details.code = error.code;
  }

  if (typeof details.errorMessage === 'string' && apiKey) {
    details.errorMessage = details.errorMessage.replaceAll(apiKey, '[REDACTED]');
  }
  return details;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toGeminiJsonSchema(schema: z.ZodType): unknown {
  return removeUnsupportedKeywords(z.toJSONSchema(schema));
}

function removeUnsupportedKeywords(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeUnsupportedKeywords);
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== '$schema' && key !== 'additionalProperties')
      .map(([key, child]) => [key, removeUnsupportedKeywords(child)]),
  );
}