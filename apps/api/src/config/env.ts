import { existsSync } from 'node:fs';
import { z } from 'zod';

// Local development reads .env; in TEST/PROD the variables are injected by the platform.
if (existsSync('.env')) process.loadEnvFile('.env');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:4200'),

  DATABASE_URL: z.string().url(),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

  QUERY_CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(300),
  RECORDS_PAGE_LIMIT: z.coerce.number().int().positive().max(5_000).default(500),

  AI_PROVIDER: z.enum(['anthropic', 'rule-based']).default('rule-based'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-5-5'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${problems}`);
  }
  return parsed.data;
}
