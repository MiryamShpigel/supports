import type { QueryResult, SavedQuery, SaveQueryInput } from '@supports/shared';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import type { RequestContext } from '../../lib/request-context.js';
import type { AuditService } from '../audit/audit.service.js';
import type { QueryService } from '../queries/query.service.js';
import type { Owner, SavedQueryRecord, SavedQueryRepository } from './saved-query.repository.js';

const ENTITY = 'saved_query';

export class SavedQueryService {
  constructor(
    private readonly repository: SavedQueryRepository,
    private readonly queries: QueryService,
    private readonly audit: AuditService,
  ) {}

  async list(ctx: RequestContext): Promise<SavedQuery[]> {
    const records = await this.repository.list(owner(ctx));
    return Promise.all(records.map((r) => this.toDto(ctx, r)));
  }

  async get(ctx: RequestContext, id: string): Promise<SavedQuery> {
    return this.toDto(ctx, await this.require(ctx, id));
  }

  async create(ctx: RequestContext, input: SaveQueryInput): Promise<SavedQuery> {
    const { question } = await this.queries.describe(ctx, input.definition);
    await this.ensureUniqueName(ctx, input.name);
    const record = await this.repository.create(owner(ctx), input);
    await this.audit.record(ctx, 'saved_query.create', { type: ENTITY, id: record.id }, { name: input.name });
    return { ...toBase(record), question };
  }

  async update(ctx: RequestContext, id: string, input: SaveQueryInput): Promise<SavedQuery> {
    const { question } = await this.queries.describe(ctx, input.definition);
    await this.ensureUniqueName(ctx, input.name, id);
    const record = await this.repository.update(owner(ctx), id, input);
    if (!record) throw new NotFoundError('שאילתה שמורה', id);
    await this.audit.record(ctx, 'saved_query.update', { type: ENTITY, id }, { name: input.name });
    return { ...toBase(record), question };
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    const deleted = await this.repository.delete(owner(ctx), id);
    if (!deleted) throw new NotFoundError('שאילתה שמורה', id);
    await this.audit.record(ctx, 'saved_query.delete', { type: ENTITY, id });
  }

  async run(ctx: RequestContext, id: string): Promise<QueryResult> {
    const record = await this.require(ctx, id);
    const result = await this.queries.execute(ctx, record.definition);
    await this.repository.markRun(owner(ctx), id);
    await this.audit.record(ctx, 'saved_query.run', { type: ENTITY, id });
    return result;
  }

  private async require(ctx: RequestContext, id: string): Promise<SavedQueryRecord> {
    const record = await this.repository.findById(owner(ctx), id);
    if (!record) throw new NotFoundError('שאילתה שמורה', id);
    return record;
  }

  private async ensureUniqueName(ctx: RequestContext, name: string, excludeId?: string): Promise<void> {
    if (await this.repository.existsByName(owner(ctx), name, excludeId)) {
      throw new ConflictError(`כבר קיימת שאילתה בשם "${name}"`);
    }
  }

  /** A saved query may outlive a metadata change; it is still listed, with a note instead of a question. */
  private async toDto(ctx: RequestContext, record: SavedQueryRecord): Promise<SavedQuery> {
    try {
      const { question } = await this.queries.describe(ctx, record.definition);
      return { ...toBase(record), question };
    } catch {
      return { ...toBase(record), question: 'השאילתה אינה תואמת עוד את הגדרות השדות ויש לעדכן אותה.' };
    }
  }
}

const owner = (ctx: RequestContext): Owner => ({ tenantId: ctx.tenantId, userId: ctx.userId });

function toBase(record: SavedQueryRecord): Omit<SavedQuery, 'question'> {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    definition: record.definition,
    createdBy: record.createdBy,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
    lastRunAt: record.lastRunAt ? new Date(record.lastRunAt).toISOString() : null,
  };
}
