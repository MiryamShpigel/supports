import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import type { LlmProvider } from './llm-provider.js';

/** Claude via the official SDK, using structured outputs so the reply always matches the schema. */
export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 1 });
  }

  async generateObject<T>({ system, prompt, schema }: { system: string; prompt: string; schema: z.ZodType<T> }): Promise<T> {
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: prompt }],
      // A short extraction task: low effort keeps latency down.
      output_config: { effort: 'low', format: zodOutputFormat(schema) },
    });

    if (response.stop_reason === 'refusal') throw new Error('The model declined the request');
    if (response.stop_reason === 'max_tokens') throw new Error('The model response was truncated');
    if (response.parsed_output == null) throw new Error('The model returned no parsable output');
    return response.parsed_output as T;
  }
}
