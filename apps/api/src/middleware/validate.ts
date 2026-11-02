import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';
import { ValidationError } from '../lib/errors.js';

/** Validates and replaces req.body with the parsed value (defaults applied, unknown keys dropped). */
export function validateBody(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      throw new ValidationError('הבקשה אינה תקינה', details);
    }
    req.body = result.data;
    next();
  };
}
