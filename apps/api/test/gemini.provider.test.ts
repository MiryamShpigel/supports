import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const { createInteractionMock } = vi.hoisted(() => ({ createInteractionMock: vi.fn() }));
const logger = { info: vi.fn(), error: vi.fn() };

vi.mock('@google/genai', () => ({
  GoogleGenAI: class GoogleGenAI {
    interactions = { create: createInteractionMock };
  },
}));

import { GeminiProvider } from '../src/modules/nl-query/llm/gemini.provider.js';

describe('GeminiProvider', () => {
  beforeEach(() => {
    createInteractionMock.mockReset();
    createInteractionMock.mockResolvedValue({ id: 'interaction-1', output_text: '{"result":"ok"}' });
    logger.info.mockReset();
    logger.error.mockReset();
  });

  it('uses the Interactions API with system instructions and a structured JSON schema', async () => {
    const provider = new GeminiProvider('test-key', 'gemini-test', logger);
    const schema = z.object({ result: z.string() });

    await expect(
      provider.generateObject({
        system: 'Dataset-specific query instructions.',
        prompt: 'What is the number of requests?',
        schema,
      }),
    ).resolves.toEqual({ result: 'ok' });

    const request = createInteractionMock.mock.calls[0][0];
    expect(request.model).toBe('gemini-test');
    expect(request.input).toBe('What is the number of requests?');
    expect(request.system_instruction).toBe('Dataset-specific query instructions.');
    expect(request.response_format.mime_type).toBe('application/json');
    expect(request.response_format.schema.properties.result.type).toBe('string');
    expect(JSON.stringify(request.response_format.schema)).not.toContain('$schema');
    expect(JSON.stringify(request.response_format.schema)).not.toContain('additionalProperties');
    expect(createInteractionMock.mock.calls[0][1]).toEqual({
      timeout_ms: 30_000,
      retries: { strategy: 'none' },
    });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'gemini', model: 'gemini-test', interactionId: expect.any(String) }),
      'Gemini request completed',
    );
  });

  it('rejects output that does not match the requested schema', async () => {
    createInteractionMock.mockResolvedValue({ output_text: '{"unexpected":true}' });
    const provider = new GeminiProvider('test-key', 'gemini-test', logger);

    await expect(
      provider.generateObject({
        system: 's',
        prompt: 'p',
        schema: z.object({ result: z.string() }),
      }),
    ).rejects.toThrow();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'gemini', model: 'gemini-test', errorName: expect.any(String) }),
      'Gemini request failed',
    );
  });

  it('logs provider errors without logging the API key or user prompt', async () => {
    const error = Object.assign(new Error('Invalid API key test-key'), { status: 404, code: 'NOT_FOUND' });
    createInteractionMock.mockRejectedValue(error);
    const provider = new GeminiProvider('test-key', 'gemini-test', logger);

    await expect(
      provider.generateObject({
        system: 's',
        prompt: 'private user question',
        schema: z.object({ result: z.string() }),
      }),
    ).rejects.toThrow('Invalid API key');

    const loggedFields = JSON.stringify(logger.error.mock.calls[0][0]);
    expect(loggedFields).toContain('"status":404');
    expect(loggedFields).toContain('"code":"NOT_FOUND"');
    expect(loggedFields).toContain('[REDACTED]');
    expect(loggedFields).not.toContain('test-key');
    expect(loggedFields).not.toContain('private user question');
  });
});
