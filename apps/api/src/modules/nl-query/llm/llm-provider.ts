import type { z } from 'zod';

/**
 * The only thing the system needs from an AI vendor: "given instructions and a question,
 * return an object matching this schema". Each vendor (Anthropic, OpenAI, a self-hosted
 * open-source model in the government cloud...) is one small class implementing this.
 */
export interface LlmProvider {
  readonly name: string;
  generateObject<T>(request: { system: string; prompt: string; schema: z.ZodType<T> }): Promise<T>;
}
