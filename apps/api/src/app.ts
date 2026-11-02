import cors from 'cors';
import express from 'express';
import { pinoHttp } from 'pino-http';
import type { Env } from './config/env.js';
import type { Container } from './container.js';
import type { Logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestContext } from './middleware/request-context.middleware.js';
import { auditController } from './modules/audit/audit.controller.js';
import { metadataController } from './modules/metadata/metadata.controller.js';
import { nlQueryController } from './modules/nl-query/nl-query.controller.js';
import { queriesController } from './modules/queries/queries.controller.js';
import { savedQueriesController } from './modules/saved-queries/saved-queries.controller.js';

export function createApp(container: Container, logger: Logger, env: Pick<Env, 'CORS_ORIGIN'>) {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: env.CORS_ORIGIN, exposedHeaders: ['x-correlation-id'] }));
  app.use(express.json({ limit: '100kb' }));
  app.use(requestContext);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).ctx.correlationId,
      customProps: (req) => ({ userId: (req as express.Request).ctx?.userId, tenantId: (req as express.Request).ctx?.tenantId }),
      autoLogging: { ignore: (req) => req.url === '/health' },
    }),
  );

  app.get('/health', async (_req, res) => {
    await container.db.query('SELECT 1');
    res.json({ status: 'ok' });
  });

  app.use('/api/metadata', metadataController(container.metadata));
  app.use('/api/queries', queriesController(container.queries));
  app.use('/api/queries/free-text', nlQueryController(container.nlQuery));
  app.use('/api/saved-queries', savedQueriesController(container.savedQueries));
  app.use('/api/audit', auditController(container.audit));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
