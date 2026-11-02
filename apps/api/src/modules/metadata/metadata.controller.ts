import { Router } from 'express';
import type { MetadataService } from './metadata.service.js';

export function metadataController(service: MetadataService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await service.listDatasets(req.ctx));
  });

  router.get('/:dataset', async (req, res) => {
    res.json(await service.getDataset(req.ctx, req.params.dataset));
  });

  return router;
}
