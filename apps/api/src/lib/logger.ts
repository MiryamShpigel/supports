import { pino, type Logger } from 'pino';
import type { Env } from '../config/env.js';

/** Structured JSON logs in TEST/PROD (shipped to the log platform), pretty output locally. */
export function createLogger(env: Pick<Env, 'LOG_LEVEL' | 'NODE_ENV'>): Logger {
  return pino({
    level: env.LOG_LEVEL,
    base: { service: 'supports-api' },
    redact: ['req.headers.authorization', 'req.headers.cookie'],
    transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  });
}

export type { Logger };
