import type { ResultRow } from '@supports/shared';
import type { Db } from '../../lib/db.js';
import type { SqlQuery } from './query-builder.js';

/** Executes SQL produced by the query builder. Knows nothing about metadata. */
export interface QueryRepository {
  fetchRows(query: SqlQuery): Promise<ResultRow[]>;
  fetchCount(query: SqlQuery): Promise<number>;
}

export class PgQueryRepository implements QueryRepository {
  constructor(private readonly db: Db) {}

  async fetchRows(query: SqlQuery): Promise<ResultRow[]> {
    const { rows } = await this.db.query<ResultRow>(query.text, query.values);
    return rows;
  }

  async fetchCount(query: SqlQuery): Promise<number> {
    const { rows } = await this.db.query<{ total: number }>(query.text, query.values);
    return rows[0]?.total ?? 0;
  }
}
