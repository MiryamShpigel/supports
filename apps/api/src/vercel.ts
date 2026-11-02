import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createContainer } from './container.js';
import { createDb } from './lib/db.js';
import { createLogger } from './lib/logger.js';

// Serverless entry point (Vercel Functions): same app as server.ts, without listen().
// The platform calls the exported Express app once per request.
const env = loadEnv();
const logger = createLogger(env);
const app = createApp(createContainer(env, createDb(env), logger), logger, env);

export default app;
