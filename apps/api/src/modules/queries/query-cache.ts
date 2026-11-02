import type { QueryResult } from '@supports/shared';

/**
 * Prevents re-running identical queries. Keyed by tenant + normalized QueryDefinition,
 * so the same question built in a different order hits the same entry.
 * POC: in-process memory. With several API instances, swap for a Redis implementation
 * of the same interface.
 */
export interface QueryCache {
  get(key: string): QueryResult | undefined;
  set(key: string, value: QueryResult): void;
  clear(): void;
}

export class InMemoryQueryCache implements QueryCache {
  private readonly entries = new Map<string, { value: QueryResult; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
  ) {}

  get(key: string): QueryResult | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Re-insert to keep the Map in least-recently-used order.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: QueryResult): void {
    if (this.ttlMs === 0) return;
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.entries.clear();
  }
}
