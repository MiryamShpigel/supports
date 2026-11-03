import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    messages = { parse: parseMock };
  },
}));

import { AnthropicProvider } from '../src/modules/nl-query/llm/anthropic.provider.js';

describe('AnthropicProvider', () => {
  beforeEach(() => {
    parseMock.mockReset();
    parseMock.mockResolvedValue({
      stop_reason: 'end_turn',
      parsed_output: { result: 'ok' },
    });
  });

  it('sends the instructions as the system prompt and the question as the user message, unchanged', async () => {
    const provider = new AnthropicProvider('test-key', 'test-model');

    const result = await provider.generateObject({
      system: 'Dataset-specific query instructions.',
      prompt: 'What is the number of requests?',
      schema: z.object({ result: z.string() }),
    });

    const request = parseMock.mock.calls[0][0];
    expect(request.system).toBe('Dataset-specific query instructions.');
    expect(request.messages).toEqual([{ role: 'user', content: 'What is the number of requests?' }]);
    expect(result).toEqual({ result: 'ok' });
  });

  it('fails when the model refuses, so the fallback parser takes over', async () => {
    parseMock.mockResolvedValue({ stop_reason: 'refusal', parsed_output: null });
    const provider = new AnthropicProvider('test-key', 'test-model');

    await expect(
      provider.generateObject({ system: 's', prompt: 'p', schema: z.object({ result: z.string() }) }),
    ).rejects.toThrow('declined');
  });
});
