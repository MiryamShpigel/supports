import type { Logger } from '../../lib/logger.js';
import type { RequestContext } from '../../lib/request-context.js';
import type { AuditRecord, AuditRepository } from './audit.repository.js';

export type AuditAction =
  | 'query.execute'
  | 'query.parse_free_text'
  | 'saved_query.create'
  | 'saved_query.update'
  | 'saved_query.delete'
  | 'saved_query.run';

/**
 * Records who did what and when. A failure to write the audit entry is logged but does
 * not fail the user's action (a deliberate POC choice; a stricter policy could make it fail,
 * or write to an outbox table in the same transaction).
 */
export class AuditService {
  constructor(
    private readonly repository: AuditRepository,
    private readonly logger: Logger,
  ) {}

  async record(
    ctx: RequestContext,
    action: AuditAction,
    entity?: { type: string; id: string },
    details?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.repository.insert({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        correlationId: ctx.correlationId,
        action,
        entityType: entity?.type,
        entityId: entity?.id,
        details,
      });
    } catch (err) {
      this.logger.error({ err, action, correlationId: ctx.correlationId }, 'Failed to write audit entry');
    }
  }

  recent(ctx: RequestContext, limit = 50): Promise<AuditRecord[]> {
    return this.repository.findRecent(ctx.tenantId, Math.min(limit, 200));
  }
}
