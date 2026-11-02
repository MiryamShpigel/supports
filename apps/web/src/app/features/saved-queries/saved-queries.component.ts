import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { SavedQuery } from '@supports/shared';
import { ConfirmDialogComponent, type ConfirmDialogData } from '../../shared/confirm-dialog.component';
import { QueryStore } from '../../state/query.store';
import { SavedQueriesStore } from '../../state/saved-queries.store';

@Component({
  selector: 'app-saved-queries',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel">
      <h2 class="panel-title"><mat-icon>bookmarks</mat-icon> שאילתות שמורות</h2>

      @for (item of store.items(); track item.id) {
        <article class="item" [class.active]="queryStore.editing()?.id === item.id">
          <div class="item-head">
            <h3>{{ item.name }}</h3>
            <div class="item-actions">
              <button mat-icon-button matTooltip="הרצה" (click)="store.run(item)"><mat-icon>play_arrow</mat-icon></button>
              <button mat-icon-button matTooltip="עריכה" (click)="store.edit(item)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button matTooltip="מחיקה" (click)="remove(item)"><mat-icon>delete</mat-icon></button>
            </div>
          </div>
          <p class="question">{{ item.question }}</p>
          <p class="meta muted">
            @if (item.lastRunAt) {
              הורצה לאחרונה {{ item.lastRunAt | date: 'dd/MM/yyyy HH:mm' }}
            } @else {
              טרם הורצה
            }
          </p>
        </article>
      } @empty {
        <p class="muted">אין עדיין שאילתות שמורות. בנו שאילתה ולחצו "שמירת שאילתה".</p>
      }
    </section>
  `,
  styles: `
    .item { border: 1px solid var(--app-border); border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; transition: border-color 0.15s; }
    .item.active { border-color: var(--app-accent); background: #f5f9ff; }
    .item-head { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
    .item-head h3 { margin: 0; font-size: 0.98rem; }
    .item-actions { display: flex; flex-shrink: 0; }
    .question { margin: 4px 0; font-size: 0.88rem; line-height: 1.45; }
    .meta { margin: 0; font-size: 0.78rem; }
  `,
})
export class SavedQueriesComponent implements OnInit {
  protected readonly store = inject(SavedQueriesStore);
  protected readonly queryStore = inject(QueryStore);
  private readonly dialog = inject(MatDialog);

  ngOnInit(): void {
    void this.store.refresh();
  }

  remove(item: SavedQuery): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data: { title: 'מחיקת שאילתה', message: `למחוק את השאילתה "${item.name}"?`, confirmText: 'מחיקה' },
        direction: 'rtl',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) void this.store.remove(item);
      });
  }
}
