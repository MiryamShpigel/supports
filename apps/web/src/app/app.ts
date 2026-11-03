import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { QueryBuilderComponent } from './features/query-builder/query-builder.component';
import { ResultsComponent } from './features/results/results.component';
import { SavedQueriesComponent } from './features/saved-queries/saved-queries.component';
import { QueryStore } from './state/query.store';

@Component({
  selector: 'app-root',
  imports: [MatIconModule, QueryBuilderComponent, ResultsComponent, SavedQueriesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <div class="brand">
        <mat-icon>account_balance</mat-icon>
        <div>
          <div class="title">תמיכות רוחבית</div>
          <div class="subtitle">מינהל התרבות והספורט · חיפוש בקשות תמיכה</div>
        </div>
      </div>
      <div class="user"><mat-icon>person</mat-icon> demo.user</div>
    </header>

    <main class="layout">
      <aside class="side">
        <app-saved-queries />
      </aside>
      <section class="workspace">
        <app-query-builder />
        <app-results />
      </section>
    </main>
  `,
  styles: `
    .header { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; background: #0f3c78; color: #fff; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .title { font-size: 1.25rem; font-weight: 700; }
    .subtitle { font-size: 0.85rem; opacity: 0.85; }
    .user { display: flex; align-items: center; gap: 6px; font-size: 0.9rem; opacity: 0.9; }
    .layout { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 16px; padding: 16px 24px; max-width: 1500px; margin: 0 auto; }
    .workspace { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    .side { position: sticky; top: 16px; align-self: start; max-height: calc(100vh - 32px); overflow: auto; }
    @media (max-width: 960px) {
      .layout { grid-template-columns: 1fr; padding: 16px; }
      .side { position: static; max-height: none; order: 2; }
    }
  `,
})
export class App implements OnInit {
  private readonly store = inject(QueryStore);

  ngOnInit(): void {
    void this.store.init();
  }
}
