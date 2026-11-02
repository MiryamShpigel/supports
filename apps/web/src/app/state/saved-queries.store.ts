import { inject, Injectable, signal } from '@angular/core';
import type { SavedQuery, SaveQueryInput } from '@supports/shared';
import { SupportsApi } from '../core/api/supports-api.service';
import { QueryStore } from './query.store';

@Injectable({ providedIn: 'root' })
export class SavedQueriesStore {
  private readonly api = inject(SupportsApi);
  private readonly queryStore = inject(QueryStore);

  readonly items = signal<SavedQuery[]>([]);
  readonly loading = signal(false);

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      this.items.set(await this.api.listSavedQueries());
    } finally {
      this.loading.set(false);
    }
  }

  /** Creates a new saved query, or updates `id` when given. */
  async save(input: SaveQueryInput, id?: string): Promise<SavedQuery> {
    const saved = id ? await this.api.updateSavedQuery(id, input) : await this.api.createSavedQuery(input);
    this.queryStore.editing.set(saved);
    await this.refresh();
    return saved;
  }

  async remove(item: SavedQuery): Promise<void> {
    await this.api.deleteSavedQuery(item.id);
    if (this.queryStore.editing()?.id === item.id) this.queryStore.editing.set(null);
    await this.refresh();
  }

  edit(item: SavedQuery): void {
    this.queryStore.load(item.definition, item);
  }

  async run(item: SavedQuery): Promise<void> {
    this.queryStore.load(item.definition, item);
    await this.queryStore.track(this.api.runSavedQuery(item.id));
    await this.refresh();
  }
}
