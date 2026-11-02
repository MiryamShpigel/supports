import type { Db } from '../../lib/db.js';

export interface AuditEntry {
  tenantId: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  correlationId?: string;
}

export interface AuditRecord extends AuditEntry {
  id: number;
  createdAt: string;
}

export interface AuditRepository {
  insert(entry: AuditEntry): Promise<void>;
  findRecent(tenantId: string, limit: number): Promise<AuditRecord[]>;
}

export class PgAuditRepository implements AuditRepository {
  constructor(private readonly db: Db) {}

  async insert(entry: AuditEntry): Promise<void> {
    await this.db.query(
      `INSERT INTO app.audit_log (tenant_id, user_id, action, entity_type, entity_id, details, correlation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [entry.tenantId, entry.userId, entry.action, entry.entityType ?? null, entry.entityId ?? null, entry.details ?? {}, entry.correlationId ?? null],
    );
  }

  async findRecent(tenantId: string, limit: number): Promise<AuditRecord[]> {
    const { rows } = await this.db.query<AuditRecord>(
      `SELECT id, tenant_id AS "tenantId", user_id AS "userId", action, entity_type AS "entityType",
              entity_id AS "entityId", details, correlation_id AS "correlationId", created_at AS "createdAt"
       FROM app.audit_log WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [tenantId, limit],
    );
    return rows;
  }
}
