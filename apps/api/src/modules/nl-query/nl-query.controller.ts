import { NlParseRequestSchema } from '@supports/shared';
import { Router } from 'express';
import { validateBody } from '../../middleware/validate.js';
import type { NlQueryService } from './nl-query.service.js';

export function nlQueryController(service: NlQueryService): Router {
  const router = Router();

  router.post('/parse', validateBody(NlParseRequestSchema), async (req, res) => {
    res.json(await service.parse(req.ctx, req.body));
  });

  return router;
}
