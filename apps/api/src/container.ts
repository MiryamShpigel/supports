import type { Env } from './config/env.js';
import type { Db } from './lib/db.js';
import type { Logger } from './lib/logger.js';
import { PgAuditRepository } from './modules/audit/audit.repository.js';
import { AuditService } from './modules/audit/audit.service.js';
import { PgMetadataRepository } from './modules/metadata/metadata.repository.js';
import { MetadataService } from './modules/metadata/metadata.service.js';
import { AnthropicProvider } from './modules/nl-query/llm/anthropic.provider.js';
import { NlQueryService } from './modules/nl-query/nl-query.service.js';
import { FallbackQueryParser } from './modules/nl-query/parsers/fallback.parser.js';
import { LlmQueryParser } from './modules/nl-query/parsers/llm.parser.js';
import type { NlQueryParser } from './modules/nl-query/parsers/nl-query-parser.js';
import { RuleBasedQueryParser } from './modules/nl-query/parsers/rule-based.parser.js';
import { InMemoryQueryCache } from './modules/queries/query-cache.js';
import { PgQueryRepository } from './modules/queries/query.repository.js';
import { QueryService } from './modules/queries/query.service.js';
import { PgSavedQueryRepository } from './modules/saved-queries/saved-query.repository.js';
import { SavedQueryService } from './modules/saved-queries/saved-query.service.js';

/**
 * Composition root: the one place where concrete classes are chosen and wired together.
 * Everything else depends on interfaces, so swapping an implementation (Redis cache,
 * another AI vendor, another database) is a change here only.
 */
export function createContainer(env: Env, db: Db, logger: Logger) {
  const audit = new AuditService(new PgAuditRepository(db), logger);
  const metadata = new MetadataService(new PgMetadataRepository(db));
  const queries = new QueryService(
    metadata,
    new PgQueryRepository(db),
    new InMemoryQueryCache(env.QUERY_CACHE_TTL_SECONDS * 1000),
    audit,
    env.RECORDS_PAGE_LIMIT,
  );
  const savedQueries = new SavedQueryService(new PgSavedQueryRepository(db), queries, audit);
  const parser = createQueryParser(env, logger);
  logger.info({ parser: parser.name }, 'Free-text parser selected');
  const nlQuery = new NlQueryService(parser, metadata, audit);

  return { db, audit, metadata, queries, savedQueries, nlQuery };
}

export type Container = ReturnType<typeof createContainer>;

/** Picks the AI provider from configuration. Adding a vendor = one LlmProvider class + one case here. */
function createQueryParser(env: Env, logger: Logger): NlQueryParser {
  const ruleBased = new RuleBasedQueryParser();

  switch (env.AI_PROVIDER) {
    case 'anthropic':
      if (!env.ANTHROPIC_API_KEY) {
        logger.warn('AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set; using the rule-based parser');
        return ruleBased;
      }
      return new FallbackQueryParser(
        new LlmQueryParser(new AnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL)),
        ruleBased,
        logger,
      );
    case 'rule-based':
      return ruleBased;
  }
}
