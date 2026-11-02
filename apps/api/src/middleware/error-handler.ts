import type { ApiErrorBody } from '@supports/shared';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors.js';

export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiErrorBody = {
    error: { code: 'ROUTE_NOT_FOUND', message: `הנתיב ${req.method} ${req.path} לא קיים`, correlationId: req.ctx?.correlationId },
  };
  res.status(404).json(body);
}

/**
 * Single place that turns errors into responses. Expected errors (AppError) are returned
 * as-is; unexpected ones are logged with the stack and hidden behind a generic message.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const correlationId = req.ctx?.correlationId;

  if (err instanceof AppError) {
    req.log.warn({ err, code: err.code }, err.message);
    const body: ApiErrorBody = { error: { code: err.code, message: err.message, details: err.details, correlationId } };
    res.status(err.status).json(body);
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    const body: ApiErrorBody = { error: { code: 'INVALID_JSON', message: 'גוף הבקשה אינו JSON תקין', correlationId } };
    res.status(400).json(body);
    return;
  }

  req.log.error({ err }, 'Unhandled error');
  const body: ApiErrorBody = {
    error: { code: 'INTERNAL_ERROR', message: 'אירעה שגיאה בלתי צפויה. ניתן לפנות לתמיכה עם מזהה הבקשה.', correlationId },
  };
  res.status(500).json(body);
}
