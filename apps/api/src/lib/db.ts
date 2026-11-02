import pg from 'pg';
import type { Env } from '../config/env.js';

// Return NUMERIC and BIGINT as JS numbers (amounts and counts here fit safely).
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);
pg.types.setTypeParser(pg.types.builtins.INT8, Number);

export type Db = pg.Pool;

export function createDb(env: Pick<Env, 'DATABASE_URL' | 'DB_STATEMENT_TIMEOUT_MS'>): Db {
  return new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    // Protects the database from runaway queries built by users.
    statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
  });
}
