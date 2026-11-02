import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { RequestContext } from '../lib/request-context.js';

declare module 'express-serve-static-core' {
  interface Request {
    ctx: RequestContext;
  }
}

const DEFAULT_TENANT = 'culture-sport';
const DEFAULT_USER = 'demo.user';

/**
 * Builds the request context.
 * POC: identity comes from headers with demo defaults. In production this is replaced by
 * an OIDC middleware that validates the government identity token and reads the claims.
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const correlationId = req.header('x-correlation-id') ?? randomUUID();
  res.setHeader('x-correlation-id', correlationId);

  req.ctx = {
    correlationId,
    userId: req.header('x-user-id') ?? DEFAULT_USER,
    tenantId: req.header('x-tenant-id') ?? DEFAULT_TENANT,
  };
  next();
}
