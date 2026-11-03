import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const { parseMock, constructorOptions } = vi.hoisted(() => ({
  parseMock: vi.fn(),
  constructorOptions: vi.fn(),
}));
const logger = { info: vi.fn(), error: vi.fn() };

vi.mock('openai', () => ({
  default: class OpenAI {
    responses = { parse: parseMock };

    constructor(options: unknown) {
      constructorOptions(options);
    }
  },
}));

import { OpenAiProvider } from '../src/modules/nl-query/llm/openai.provider.js';

describe('OpenAiProvider', () => {
  beforeEach(() => {
    parseMock.mockReset();
    parseMock.mockResolvedValue({
      id: 'response-1',
      status: 'completed',
      output_parsed: { result: 'ok' },
    });
    constructorOptions.mockReset();
    logger.info.mockReset();
    logger.error.mockReset();
  });

  it('uses the Responses API with strict structured output and separate instructions', async () => {
    const provider = new OpenAiProvider('test-key', 'gpt-test', logger);
    const schema = z.object({ result: z.string() });

    await expect(
      provider.generateObject({
        system: 'Dataset-specific query instructions.',
        prompt: 'What is the number of requests?',
        schema,
      }),
    ).resolves.toEqual({ result: 'ok' });

    const request = parseMock.mock.calls[0][0];
    expect(request.model).toBe('gpt-test');
    expect(request.input).toEqual([
      { role: 'system', content: 'Dataset-specific query instructions.' },
      { role: 'user', content: 'What is the number of requests?' },
    ]);
    expect(request.text.format.type).toBe('json_schema');
    expect(request.text.format.strict).toBe(true);
    expect(constructorOptions).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'test-key', timeout: 15_000, maxRetries: 0 }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'openai', model: 'gpt-test', responseId: 'response-1' }),
      'OpenAI request completed',
    );
  });

  it('rejects output that does not match the requested schema', async () => {
    parseMock.mockResolvedValue({
      id: 'response-2',
      status: 'completed',
      output_parsed: { unexpected: true },
    });
    const provider = new OpenAiProvider('test-key', 'gpt-test', logger);

    await expect(
      provider.generateObject({ system: 's', prompt: 'p', schema: z.object({ result: z.string() }) }),
    ).rejects.toThrow();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'openai', model: 'gpt-test' }),
      'OpenAI request failed',
    );
  });

  it('logs provider errors without logging the API key or user prompt', async () => {
    const error = Object.assign(new Error('Invalid API key test-key'), { status: 401, code: 'invalid_api_key' });
    parseMock.mockRejectedValue(error);
    const provider = new OpenAiProvider('test-key', 'gpt-test', logger);

    await expect(
      provider.generateObject({
        system: 's',
        prompt: 'private user question',
        schema: z.object({ result: z.string() }),
      }),
    ).rejects.toThrow('Invalid API key');

    const loggedFields = JSON.stringify(logger.error.mock.calls[0][0]);
    expect(loggedFields).toContain('"status":401');
    expect(loggedFields).toContain('[REDACTED]');
    expect(loggedFields).not.toContain('test-key');
    expect(loggedFields).not.toContain('private user question');
  });
});
