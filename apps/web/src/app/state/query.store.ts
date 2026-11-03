import { computed, inject, Injectable, signal } from '@angular/core';
import {
  phraseQuestion,
  validateQuery,
  type DatasetMetadata,
  type Filter,
  type QueryDefinition,
  type QueryResult,
  type SavedQuery,
} from '@supports/shared';
import { SupportsApi } from '../core/api/supports-api.service';

const emptyQuery = (dataset: string): QueryDefinition => ({ dataset, filters: [], groupBy: [], metrics: ['count'] });

/**
 * State of the query being built and its result. Components read signals and call methods;
 * they never talk to the API directly. The question text and validation are derived
 * (computed) from the query using the same shared functions the server uses.
 */
@Injectable({ providedIn: 'root' })
export class QueryStore {
  private readonly api = inject(SupportsApi);

  readonly datasets = signal<DatasetMetadata[]>([]);
  readonly query = signal<QueryDefinition>(emptyQuery(''));
  readonly result = signal<QueryResult | null>(null);
  readonly running = signal(false);
  /** The saved query currently loaded into the builder, if any (enables "update"). */
  readonly editing = signal<SavedQuery | null>(null);
  /**
   * Parts of the builder last filled from a free-text question: field keys, plus 'groupBy'
   * and 'metrics'. Highlighted until the user changes that part by hand.
   */
  readonly filledParts = signal<ReadonlySet<string>>(new Set());
  /** When the user last set the fields by hand (editing, clearing or loading a saved query). */
  readonly lastHandEditAt = signal(0);

  readonly dataset = computed(() => this.datasets().find((d) => d.key === this.query().dataset) ?? null);
  readonly filterableFields = computed(() => this.dataset()?.fields.filter((f) => f.filterable) ?? []);
  readonly groupableFields = computed(() => this.dataset()?.fields.filter((f) => f.groupable) ?? []);
  readonly metrics = computed(() => this.dataset()?.metrics ?? []);

  readonly question = computed(() => {
    const dataset = this.dataset();
    return dataset ? phraseQuestion(this.query(), dataset) : '';
  });
  readonly issues = computed(() => {
    const dataset = this.dataset();
    return dataset ? validateQuery(this.query(), dataset) : [];
  });

  async init(): Promise<void> {
    const datasets = await this.api.getDatasets();
    this.datasets.set(datasets);
    if (datasets[0]) this.query.set(emptyQuery(datasets[0].key));
  }

  filterFor(fieldKey: string): Filter | undefined {
    return this.query().filters.find((f) => f.field === fieldKey);
  }

  setFilter(fieldKey: string, filter: Filter | null): void {
    this.query.update((q) => ({
      ...q,
      filters: [...q.filters.filter((f) => f.field !== fieldKey), ...(filter ? [filter] : [])],
    }));
    this.editedByHand(fieldKey);
  }

  setGroupBy(keys: string[]): void {
    this.query.update((q) => ({ ...q, groupBy: keys.slice(0, 2) }));
    this.editedByHand('groupBy');
  }

  setMetrics(keys: string[]): void {
    this.query.update((q) => ({ ...q, metrics: keys.includes('count') ? keys : ['count', ...keys] }));
    this.editedByHand('metrics');
  }

  reset(): void {
    this.query.set(emptyQuery(this.query().dataset));
    this.editing.set(null);
    this.result.set(null);
    this.filledParts.set(new Set());
    this.lastHandEditAt.set(Date.now());
  }

  /** Loads a saved query into the builder; counts as choosing the fields by hand. */
  load(definition: QueryDefinition, savedQuery: SavedQuery | null = null): void {
    this.replace(definition, savedQuery);
    this.lastHandEditAt.set(Date.now());
  }

  /** Fills the builder from a free-text interpretation and marks what was filled. */
  fill(definition: QueryDefinition): void {
    this.replace(definition, null);
    this.filledParts.set(
      new Set([
        ...definition.filters.map((f) => f.field),
        ...(definition.groupBy.length ? ['groupBy'] : []),
        ...(definition.metrics.some((m) => m !== 'count') ? ['metrics'] : []),
      ]),
    );
  }

  private replace(definition: QueryDefinition, savedQuery: SavedQuery | null): void {
    this.query.set(structuredClone(definition));
    this.editing.set(savedQuery);
    this.filledParts.set(new Set());
  }

  private editedByHand(part: string): void {
    this.lastHandEditAt.set(Date.now());
    if (!this.filledParts().has(part)) return;
    this.filledParts.update((parts) => new Set([...parts].filter((p) => p !== part)));
  }

  async run(): Promise<void> {
    if (this.issues().length) return;
    await this.track(this.api.execute(this.query()));
  }

  /** Shows a result produced elsewhere (e.g. running a saved query). */
  async track(pending: Promise<QueryResult>): Promise<void> {
    this.running.set(true);
    try {
      this.result.set(await pending);
    } finally {
      this.running.set(false);
    }
  }
}
