// Runs a .sql file against the Postgres container: npm run sql -- <file>
// A bare file name is resolved from the current folder, then from apps/api/src/db/examples.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv[2];

if (!arg) {
  console.error('שימוש: npm run sql -- <file.sql>');
  process.exit(1);
}

const name = arg.endsWith('.sql') ? arg : `${arg}.sql`;
const candidates = [
  resolve(process.env.INIT_CWD ?? process.cwd(), name),
  join(root, 'apps/api/src/db/examples', name),
];
const file = candidates.find((path) => existsSync(path));

if (!file) {
  console.error(`הקובץ לא נמצא: ${name}`);
  process.exit(1);
}

const psql = spawn(
  'docker',
  ['compose', 'exec', '-T', 'db', 'psql', '-U', 'supports', '-d', 'supports', '-v', 'ON_ERROR_STOP=1'],
  { cwd: root, stdio: ['pipe', 'inherit', 'inherit'] },
);
psql.stdin.end(readFileSync(file));
psql.on('close', (code) => process.exit(code ?? 1));
