import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import type { ResultColumn, ResultRow } from '@supports/shared';
import { QueryStore } from '../../state/query.store';
import { ResultsChartComponent } from './results-chart.component';

const numberFormat = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 });

@Component({
  selector: 'app-results',
  imports: [MatTableModule, MatIconModule, MatProgressBarModule, ResultsChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel">
      <h2 class="panel-title"><mat-icon>table_chart</mat-icon> תוצאות</h2>

      @if (store.running()) {
        <mat-progress-bar mode="indeterminate" />
      }

      @if (store.result(); as result) {
        <p class="question">{{ result.question }}</p>
        <p class="meta muted">
          {{ format(result.totalRecords) }} בקשות תואמות · {{ result.durationMs }} מ"ש
          @if (result.fromCache) {
            · <span class="cache"><mat-icon inline>bolt</mat-icon> מהמטמון</span>
          }
        </p>

        @if (result.mode === 'grouped' && result.rows.length > 1) {
          <app-results-chart [result]="result" />
        }

        @if (result.rows.length) {
          <div class="table-wrap">
            <table mat-table [dataSource]="result.rows">
              @for (column of result.columns; track column.key) {
                <ng-container [matColumnDef]="column.key">
                  <th mat-header-cell *matHeaderCellDef [class.num]="column.kind === 'metric'">{{ column.label }}</th>
                  <td mat-cell *matCellDef="let row" [class.num]="column.kind === 'metric'">{{ cell(row, column) }}</td>
                </ng-container>
              }
              <tr mat-header-row *matHeaderRowDef="columnKeys(); sticky: true"></tr>
              <tr mat-row *matRowDef="let row; columns: columnKeys()"></tr>
            </table>
          </div>
          @if (result.truncated) {
            <p class="muted note">מוצגות {{ result.rows.length }} הבקשות האחרונות מתוך {{ format(result.totalRecords) }}. לסיכום מלא בחרו פילוח.</p>
          }
        } @else {
          <p class="muted">לא נמצאו בקשות התואמות לשאילתה.</p>
        }
      } @else if (!store.running()) {
        <p class="muted">בנו שאילתה או נסחו שאלה חופשית ולחצו "הרצה".</p>
      }
    </section>
  `,
  styles: `
    .question { font-weight: 600; margin: 0 0 2px; }
    .meta { margin: 0 0 14px; font-size: 0.85rem; }
    .cache { color: #8a5a00; }
    .table-wrap { max-height: 460px; overflow: auto; border: 1px solid var(--app-border); border-radius: 8px; }
    table { width: 100%; }
    .num { text-align: left; font-variant-numeric: tabular-nums; }
    .note { font-size: 0.85rem; }
  `,
})
export class ResultsComponent {
  protected readonly store = inject(QueryStore);

  readonly columnKeys = computed(() => this.store.result()?.columns.map((c) => c.key) ?? []);

  format(value: number): string {
    return numberFormat.format(value);
  }

  cell(row: ResultRow, column: ResultColumn): string {
    const value = row[column.key];
    if (value === null || value === undefined) return '—';
    return typeof value === 'number' && column.kind === 'metric' ? numberFormat.format(value) : String(value);
  }
}
