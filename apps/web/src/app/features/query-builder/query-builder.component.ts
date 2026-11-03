import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { FreeTextStore } from '../../state/free-text.store';
import { SavedQueriesStore } from '../../state/saved-queries.store';
import { QueryStore } from '../../state/query.store';
import { FreeTextComponent } from '../free-text/free-text.component';
import { SaveQueryDialogComponent, type SaveQueryDialogData, type SaveQueryDialogResult } from '../saved-queries/save-query-dialog.component';
import { FilterFieldComponent } from './filter-field.component';

@Component({
  selector: 'app-query-builder',
  imports: [FreeTextComponent, FilterFieldComponent, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel">
      <h2 class="panel-title">
        <mat-icon>search</mat-icon> שאילתה
        @if (store.editing(); as editing) {
          <span class="editing">עריכת "{{ editing.name }}"</span>
        }
      </h2>

      <app-free-text />

      <button
        type="button"
        class="fields-toggle"
        [attr.aria-expanded]="fieldsOpen()"
        aria-controls="query-fields"
        (click)="fieldsOpen.set(!fieldsOpen())"
      >
        <mat-icon>{{ fieldsOpen() ? 'remove' : 'add' }}</mat-icon>
        <span>{{ fieldsOpen() ? 'הסתרת השדות' : 'בחירת שדות ידנית' }}</span>
        @if (activeParts() > 0) {
          <span class="count">{{ activeParts() }} בשימוש{{ store.filledParts().size > 0 ? ' · מולאו מהשאלה' : '' }}</span>
        }
      </button>

      @if (fieldsOpen()) {
        <div id="query-fields" class="fields">
          <div class="grid">
            @for (field of store.filterableFields(); track field.key) {
              <app-filter-field
                [field]="field"
                [filter]="store.filterFor(field.key)"
                [class.filled]="store.filledParts().has(field.key)"
                (filterChange)="store.setFilter(field.key, $event)"
              />
            }
          </div>

          <div class="grid">
            <mat-form-field appearance="outline" subscriptSizing="dynamic" [class.filled]="store.filledParts().has('groupBy')">
              <mat-label>פילוח לפי (עד 2)</mat-label>
              <mat-select multiple [value]="store.query().groupBy" (selectionChange)="store.setGroupBy($event.value)" placeholder="ללא – רשימת בקשות">
                @for (field of store.groupableFields(); track field.key) {
                  <mat-option [value]="field.key" [disabled]="isGroupLimitReached(field.key)">{{ field.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic" [class.filled]="store.filledParts().has('metrics')">
              <mat-label>מדדים</mat-label>
              <mat-select multiple [value]="store.query().metrics" (selectionChange)="store.setMetrics($event.value)">
                @for (metric of store.metrics(); track metric.key) {
                  <mat-option [value]="metric.key" [disabled]="metric.key === 'count'">{{ metric.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      }

      @for (issue of store.issues(); track issue.path) {
        <p class="issue"><mat-icon inline>error</mat-icon> {{ issue.message }}</p>
      }

      <!-- The one place that says what will run, and the one button that runs it. -->
      <div class="action-bar">
        <div class="question" aria-live="polite">
          <span class="question-label">המערכת תציג לכם:</span>
          <p>{{ store.question() }}</p>
        </div>
        <div class="actions">
          <!-- Disabled while a typed question awaits interpretation: running now would ignore it. -->
          <button
            mat-flat-button
            (click)="store.run()"
            [disabled]="store.issues().length > 0 || store.running() || freeText.parsing() || freeText.shouldInterpretOnRun()"
          >
            <mat-icon>play_arrow</mat-icon> הרצה
          </button>
          <button mat-stroked-button (click)="save()" [disabled]="store.issues().length > 0">
            <mat-icon>bookmark_add</mat-icon> שמירה
          </button>
          <button mat-button (click)="store.reset()"><mat-icon>restart_alt</mat-icon> ניקוי</button>
        </div>
      </div>
    </section>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px 16px; margin-bottom: 16px; }
    .editing { font-size: 0.85rem; font-weight: 600; color: var(--app-accent); background: #e8f0fc; padding: 2px 10px; border-radius: 999px; }
    .fields-toggle {
      display: flex; align-items: center; gap: 6px; width: 100%; margin-top: 14px; padding: 8px 4px;
      background: none; border: 0; border-top: 1px solid var(--app-border); cursor: pointer;
      font: inherit; font-size: 0.9rem; font-weight: 600; color: var(--app-accent); text-align: start;
    }
    .fields-toggle:hover { background: #f6f9fe; }
    .fields-toggle .count { margin-inline-start: auto; font-weight: 400; font-size: 0.8rem; color: var(--app-text-muted); }
    .fields { padding-top: 12px; }
    .issue { color: #b3261e; margin: 8px 0 0; font-size: 0.9rem; }
    /* Sticks to the bottom of the screen while the card is in view, so "run" is never off-screen. */
    .action-bar {
      position: sticky; bottom: 0; z-index: 2;
      display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: center; justify-content: space-between;
      margin: 16px -20px -16px; padding: 12px 20px;
      background: #f0f5fd; border-top: 1px solid #c9d9f2; border-radius: 0 0 12px 12px;
    }
    .question { flex: 1 1 320px; min-width: 0; }
    .question-label { font-size: 0.78rem; color: var(--app-text-muted); }
    .question p { margin: 2px 0 0; font-size: 1.02rem; font-weight: 600; line-height: 1.5; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    /*
     * Fields filled from the question: recolour the field's own outline (the label sits in its notch,
     * so a frame drawn around the field would cover the label) and tint the inside of the box.
     * Both token generations are set, so this holds across Angular Material versions.
     */
    .filled {
      --mat-form-field-outlined-outline-color: #5b8fd9;
      --mat-form-field-outlined-hover-outline-color: #2a78d6;
      --mat-form-field-outlined-outline-width: 2px;
      --mdc-outlined-text-field-outline-color: #5b8fd9;
      --mdc-outlined-text-field-hover-outline-color: #2a78d6;
      --mdc-outlined-text-field-outline-width: 2px;
    }
    :host ::ng-deep .filled .mat-mdc-text-field-wrapper { background: #eef4ff; border-radius: 4px; transition: background 0.3s; }
  `,
})
export class QueryBuilderComponent {
  protected readonly store = inject(QueryStore);
  protected readonly freeText = inject(FreeTextStore);

  /** The fields are tucked away by default: most questions are asked in free text. */
  readonly fieldsOpen = signal(false);

  /** How many parts of the query are set: one per filter, plus grouping and extra metrics. */
  readonly activeParts = computed(() => {
    const { filters, groupBy, metrics } = this.store.query();
    return filters.length + (groupBy.length ? 1 : 0) + (metrics.some((m) => m !== 'count') ? 1 : 0);
  });

  constructor() {
    // Editing a saved query means working on its fields, so show them.
    effect(() => {
      if (this.store.editing()) untracked(() => this.fieldsOpen.set(true));
    });
  }
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
