import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { SavedQuery } from '@supports/shared';
import { ConfirmDialogComponent, type ConfirmDialogData } from '../../../shared/confirm-dialog.component/confirm-dialog.component';
import { QueryStore } from '../../../state/query.store';
import { SavedQueriesStore } from '../../../state/saved-queries.store';

@Component({
  selector: 'app-saved-queries',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './saved-queries.component.html',
  styleUrl: './saved-queries.component.css',
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
