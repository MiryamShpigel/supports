import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { SavedQueriesStore } from '../../state/saved-queries.store';
import { QueryStore } from '../../state/query.store';
import { SaveQueryDialogComponent, type SaveQueryDialogData, type SaveQueryDialogResult } from '../saved-queries/save-query-dialog.component';
import { FilterFieldComponent } from './filter-field.component';

@Component({
  selector: 'app-query-builder',
  imports: [FilterFieldComponent, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel">
      <h2 class="panel-title">
        <mat-icon>tune</mat-icon> בניית שאילתה
        @if (store.editing(); as editing) {
          <span class="editing">עריכת "{{ editing.name }}"</span>
        }
      </h2>

      <div class="grid">
        @for (field of store.filterableFields(); track field.key) {
          <app-filter-field
            [field]="field"
            [filter]="store.filterFor(field.key)"
            (filterChange)="store.setFilter(field.key, $event)"
          />
        }
      </div>

      <div class="grid">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>פילוח לפי (עד 2)</mat-label>
          <mat-select multiple [value]="store.query().groupBy" (selectionChange)="store.setGroupBy($event.value)" placeholder="ללא – רשימת בקשות">
            @for (field of store.groupableFields(); track field.key) {
              <mat-option [value]="field.key" [disabled]="isGroupLimitReached(field.key)">{{ field.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>מדדים</mat-label>
          <mat-select multiple [value]="store.query().metrics" (selectionChange)="store.setMetrics($event.value)">
            @for (metric of store.metrics(); track metric.key) {
              <mat-option [value]="metric.key" [disabled]="metric.key === 'count'">{{ metric.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="question" aria-live="polite">
        <mat-icon>record_voice_over</mat-icon>
        <p>{{ store.question() }}</p>
      </div>

      @for (issue of store.issues(); track issue.path) {
        <p class="issue"><mat-icon inline>error</mat-icon> {{ issue.message }}</p>
      }

      <div class="actions">
        <button mat-flat-button (click)="store.run()" [disabled]="store.issues().length > 0 || store.running()">
          <mat-icon>play_arrow</mat-icon> הרצה
        </button>
        <button mat-stroked-button (click)="save()" [disabled]="store.issues().length > 0">
          <mat-icon>bookmark_add</mat-icon> שמירת שאילתה
        </button>
        <button mat-button (click)="store.reset()"><mat-icon>restart_alt</mat-icon> ניקוי</button>
      </div>
    </section>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px 16px; margin-bottom: 16px; }
    .editing { font-size: 0.85rem; font-weight: 600; color: var(--app-accent); background: #e8f0fc; padding: 2px 10px; border-radius: 999px; }
    .question { display: flex; gap: 10px; align-items: flex-start; background: #f0f5fd; border-inline-start: 4px solid var(--app-accent); border-radius: 8px; padding: 12px 14px; }
    .question p { margin: 0; font-size: 1.05rem; font-weight: 600; line-height: 1.5; }
    .question mat-icon { color: var(--app-accent); flex-shrink: 0; }
    .issue { color: #b3261e; margin: 8px 0 0; font-size: 0.9rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  `,
})
export class QueryBuilderComponent {
  protected readonly store = inject(QueryStore);
  private readonly savedQueries = inject(SavedQueriesStore);
  private readonly dialog = inject(MatDialog);

  isGroupLimitReached(key: string): boolean {
    const groupBy = this.store.query().groupBy;
    return groupBy.length >= 2 && !groupBy.includes(key);
  }

  save(): void {
    const editing = this.store.editing();
    const data: SaveQueryDialogData = {
      question: this.store.question(),
      name: editing?.name ?? '',
      description: editing?.description ?? '',
      canUpdate: editing !== null,
    };
    this.dialog
      .open<SaveQueryDialogComponent, SaveQueryDialogData, SaveQueryDialogResult>(SaveQueryDialogComponent, { data, direction: 'rtl', width: '480px' })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        const input = { name: result.name, description: result.description || undefined, definition: this.store.query() };
        void this.savedQueries.save(input, result.mode === 'update' ? editing?.id : undefined);
      });
  }
}
