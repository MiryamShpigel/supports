import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  DatasetMetadata,
  NlParseResult,
  QueryDefinition,
  QueryResult,
  SavedQuery,
  SaveQueryInput,
} from '@supports/shared';
import { firstValueFrom } from 'rxjs';

/**
 * Thin typed wrapper over the REST API. Request/response types come from @supports/shared,
 * so a contract change breaks the build on both sides instead of failing at runtime.
 */
@Injectable({ providedIn: 'root' })
export class SupportsApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  getDatasets(): Promise<DatasetMetadata[]> {
    return firstValueFrom(this.http.get<DatasetMetadata[]>(`${this.base}/metadata`));
  }

  execute(query: QueryDefinition): Promise<QueryResult> {
    return firstValueFrom(this.http.post<QueryResult>(`${this.base}/queries/execute`, query));
  }

  parseFreeText(text: string, dataset: string): Promise<NlParseResult> {
    return firstValueFrom(this.http.post<NlParseResult>(`${this.base}/queries/free-text/parse`, { text, dataset }));
  }

  listSavedQueries(): Promise<SavedQuery[]> {
    return firstValueFrom(this.http.get<SavedQuery[]>(`${this.base}/saved-queries`));
  }

  createSavedQuery(input: SaveQueryInput): Promise<SavedQuery> {
    return firstValueFrom(this.http.post<SavedQuery>(`${this.base}/saved-queries`, input));
  }

  updateSavedQuery(id: string, input: SaveQueryInput): Promise<SavedQuery> {
    return firstValueFrom(this.http.put<SavedQuery>(`${this.base}/saved-queries/${id}`, input));
  }

  deleteSavedQuery(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/saved-queries/${id}`));
  }

  runSavedQuery(id: string): Promise<QueryResult> {
    return firstValueFrom(this.http.post<QueryResult>(`${this.base}/saved-queries/${id}/run`, {}));
  }
}
