import type { QueryDefinition } from '@supports/shared';
import type { Db } from '../../lib/db.js';

export interface SavedQueryRecord {
  id: string;
  name: string;
  description: string | null;
  definition: QueryDefinition;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
}

export interface SavedQueryData {
  name: string;
  description?: string;
  definition: QueryDefinition;
}

/** Saved queries are private to their owner within a tenant. */
export interface Owner {
  tenantId: string;
  userId: string;
}

export interface SavedQueryRepository {
  list(owner: Owner): Promise<SavedQueryRecord[]>;
  findById(owner: Owner, id: string): Promise<SavedQueryRecord | null>;
  existsByName(owner: Owner, name: string, excludeId?: string): Promise<boolean>;
  create(owner: Owner, data: SavedQueryData): Promise<SavedQueryRecord>;
  update(owner: Owner, id: string, data: SavedQueryData): Promise<SavedQueryRecord | null>;
  delete(owner: Owner, id: string): Promise<boolean>;
  markRun(owner: Owner, id: string): Promise<void>;
}

const COLUMNS = `id, name, description, definition, created_by AS "createdBy", created_at AS "createdAt",
  updated_at AS "updatedAt", last_run_at AS "lastRunAt"`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PgSavedQueryRepository implements SavedQueryRepository {
  constructor(private readonly db: Db) {}

  async list(owner: Owner): Promise<SavedQueryRecord[]> {
    const { rows } = await this.db.query<SavedQueryRecord>(
      `SELECT ${COLUMNS} FROM app.saved_queries WHERE tenant_id = $1 AND created_by = $2 ORDER BY updated_at DESC`,
      [owner.tenantId, owner.userId],
    );
    return rows;
  }

  async findById(owner: Owner, id: string): Promise<SavedQueryRecord | null> {
    if (!UUID.test(id)) return null;
    const { rows } = await this.db.query<SavedQueryRecord>(
      `SELECT ${COLUMNS} FROM app.saved_queries WHERE tenant_id = $1 AND created_by = $2 AND id = $3`,
      [owner.tenantId, owner.userId, id],
    );
    return rows[0] ?? null;
  }

  async existsByName(owner: Owner, name: string, excludeId?: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `SELECT 1 FROM app.saved_queries
       WHERE tenant_id = $1 AND created_by = $2 AND name = $3 AND ($4::uuid IS NULL OR id <> $4::uuid)`,
      [owner.tenantId, owner.userId, name, excludeId ?? null],
    );
    return (rowCount ?? 0) > 0;
  }

  async create(owner: Owner, data: SavedQueryData): Promise<SavedQueryRecord> {
    const { rows } = await this.db.query<SavedQueryRecord>(
      `INSERT INTO app.saved_queries (tenant_id, created_by, name, description, definition)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${COLUMNS}`,
      [owner.tenantId, owner.userId, data.name, data.description ?? null, data.definition],
    );
    return rows[0]!;
  }

  async update(owner: Owner, id: string, data: SavedQueryData): Promise<SavedQueryRecord | null> {
    if (!UUID.test(id)) return null;
    const { rows } = await this.db.query<SavedQueryRecord>(
      `UPDATE app.saved_queries SET name = $4, description = $5, definition = $6, updated_at = now()
       WHERE tenant_id = $1 AND created_by = $2 AND id = $3 RETURNING ${COLUMNS}`,
      [owner.tenantId, owner.userId, id, data.name, data.description ?? null, data.definition],
    );
    return rows[0] ?? null;
  }

  async delete(owner: Owner, id: string): Promise<boolean> {
    if (!UUID.test(id)) return false;
    const { rowCount } = await this.db.query(
      'DELETE FROM app.saved_queries WHERE tenant_id = $1 AND created_by = $2 AND id = $3',
      [owner.tenantId, owner.userId, id],
    );
    return (rowCount ?? 0) > 0;
  }

  async markRun(owner: Owner, id: string): Promise<void> {
    await this.db.query(
      'UPDATE app.saved_queries SET last_run_at = now() WHERE tenant_id = $1 AND created_by = $2 AND id = $3',
      [owner.tenantId, owner.userId, id],
    );
  }
}
