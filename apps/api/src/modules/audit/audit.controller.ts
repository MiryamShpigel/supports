import { Router } from 'express';
import type { AuditService } from './audit.service.js';

export function auditController(service: AuditService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const limit = Number(req.query['limit'] ?? 50) || 50;
    res.json(await service.recent(req.ctx, limit));
  });

  return router;
}
