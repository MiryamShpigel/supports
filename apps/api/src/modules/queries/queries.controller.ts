import { QueryDefinitionSchema } from '@supports/shared';
import { Router } from 'express';
import { validateBody } from '../../middleware/validate.js';
import type { QueryService } from './query.service.js';

export function queriesController(service: QueryService): Router {
  const router = Router();

  router.post('/execute', validateBody(QueryDefinitionSchema), async (req, res) => {
    res.json(await service.execute(req.ctx, req.body));
  });

  return router;
}
