import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadEnv } from '../config/env.js';
import { createDb } from '../lib/db.js';
import { createLogger } from '../lib/logger.js';

/** Applies new SQL files from ./migrations in name order, each in its own transaction. */
const env = loadEnv();
const log = createLogger(env);
const db = createDb(env);
const migrationsDir = join(import.meta.dirname, 'migrations');

try {
  await db.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);

  const { rows } = await db.query<{ name: string }>('SELECT name FROM public.schema_migrations');
  const applied = new Set(rows.map((r) => r.name));
  const pending = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql') && !applied.has(f)).sort();

  for (const file of pending) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(await readFile(join(migrationsDir, file), 'utf8'));
      await client.query('INSERT INTO public.schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      log.info({ file }, 'Migration applied');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  log.info({ applied: pending.length }, 'Migrations up to date');
} catch (err) {
  log.error({ err }, 'Migration failed');
  process.exitCode = 1;
} finally {
  await db.end();
}
