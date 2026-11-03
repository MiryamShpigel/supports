import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, ViewChildren, QueryList } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { ClickOutsideDirective } from '../../../shared/click-outside.directive';
import { OpenSelectRegistry } from '../../../shared/open-select-registry.service';
import { FreeTextStore } from '../../../state/free-text.store';
import { SavedQueriesStore } from '../../../state/saved-queries.store';
import { QueryStore } from '../../../state/query.store';
import { FreeTextComponent } from '../../free-text/free-text.component/free-text.component';
import {
  SaveQueryDialogComponent,
  type SaveQueryDialogData,
  type SaveQueryDialogResult,
} from '../../saved-queries/save-query-dialog.component/save-query-dialog.component';
import { FilterFieldComponent } from '../filter-field.component/filter-field.component';

@Component({
  selector: 'app-query-builder',
  imports: [
    FreeTextComponent,
    FilterFieldComponent,
    ClickOutsideDirective,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './query-builder.component.html',
  styleUrl: './query-builder.component.css',
})
export class QueryBuilderComponent {
  protected readonly store = inject(QueryStore);
  protected readonly freeText = inject(FreeTextStore);
  private readonly openSelects = inject(OpenSelectRegistry);
  private readonly savedQueries = inject(SavedQueriesStore);
  private readonly dialog = inject(MatDialog);

  @ViewChildren(MatSelect) selects!: QueryList<MatSelect>;

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

  isGroupLimitReached(key: string): boolean {
    const groupBy = this.store.query().groupBy;
    return groupBy.length >= 2 && !groupBy.includes(key);
  }

  toggleFields(): void {
    // סוגר את כל ה-selects הפתוחים (גם דרך ה-registry וגם ישירות)
    this.openSelects.closeAll();
    this.selects?.forEach((select) => {
      if (select.panelOpen) {
        select.close();
      }
    });

    this.fieldsOpen.set(!this.fieldsOpen());
  }

  run(): void {
    this.openSelects.closeAll();
    void this.store.run();
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
      .open<SaveQueryDialogComponent, SaveQueryDialogData, SaveQueryDialogResult>(SaveQueryDialogComponent, {
        data,
        direction: 'rtl',
        width: '480px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        const input = {
          name: result.name,
          description: result.description || undefined,
          definition: this.store.query(),
        };
        void this.savedQueries.save(input, result.mode === 'update' ? editing?.id : undefined);
      });
  }
}