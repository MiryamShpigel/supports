import type { DatasetMetadata } from '@supports/shared';
import { NotFoundError } from '../../lib/errors.js';
import type { RequestContext } from '../../lib/request-context.js';
import { toPublicMetadata, type DatasetSchema } from './dataset-schema.js';
import type { MetadataRepository } from './metadata.repository.js';

/**
 * Metadata is read on every request (it is small and indexed), so a change in the
 * meta tables is visible immediately without a restart. A short in-memory cache
 * can be added here if load requires it.
 */
export class MetadataService {
  constructor(private readonly repository: MetadataRepository) {}

  async listDatasets(ctx: RequestContext): Promise<DatasetMetadata[]> {
    const datasets = await this.repository.findDatasets(ctx.tenantId);
    return datasets.map(toPublicMetadata);
  }

  async getDataset(ctx: RequestContext, key: string): Promise<DatasetMetadata> {
    return toPublicMetadata(await this.getDatasetSchema(ctx, key));
  }

  /** Internal - includes storage details needed to build SQL. */
  async getDatasetSchema(ctx: RequestContext, key: string): Promise<DatasetSchema> {
    const datasets = await this.repository.findDatasets(ctx.tenantId);
    const dataset = datasets.find((d) => d.key === key);
    if (!dataset) throw new NotFoundError('מקור נתונים', key);
    return dataset;
  }
}
