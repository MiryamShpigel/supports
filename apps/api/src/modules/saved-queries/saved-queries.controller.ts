import { SaveQueryInputSchema } from '@supports/shared';
import { Router } from 'express';
import { validateBody } from '../../middleware/validate.js';
import type { SavedQueryService } from './saved-query.service.js';

export function savedQueriesController(service: SavedQueryService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await service.list(req.ctx));
  });

  router.get('/:id', async (req, res) => {
    res.json(await service.get(req.ctx, req.params.id));
  });

  router.post('/', validateBody(SaveQueryInputSchema), async (req, res) => {
    res.status(201).json(await service.create(req.ctx, req.body));
  });

  router.put('/:id', validateBody(SaveQueryInputSchema), async (req, res) => {
    res.json(await service.update(req.ctx, String(req.params.id), req.body));
  });

  router.delete('/:id', async (req, res) => {
    await service.delete(req.ctx, req.params.id);
    res.status(204).end();
  });

  router.post('/:id/run', async (req, res) => {
    res.json(await service.run(req.ctx, req.params.id));
  });

  return router;
}
