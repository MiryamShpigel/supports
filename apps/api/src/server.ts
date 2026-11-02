import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createContainer } from './container.js';
import { createDb } from './lib/db.js';
import { createLogger } from './lib/logger.js';

const env = loadEnv();
const logger = createLogger(env);
const db = createDb(env);
const app = createApp(createContainer(env, db, logger), logger, env);

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV, aiProvider: env.AI_PROVIDER }, 'API listening');
});

// Graceful shutdown: finish in-flight requests, then close the DB pool.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info({ signal }, 'Shutting down');
    server.close(() => void db.end().then(() => process.exit(0)));
  });
}
