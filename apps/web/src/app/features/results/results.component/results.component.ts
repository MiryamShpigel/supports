import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import type { ResultColumn, ResultRow } from '@supports/shared';
import { QueryStore } from '../../../state/query.store';
import { ResultsChartComponent } from '../results-chart.component/results-chart.component';

const numberFormat = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 });

@Component({
  selector: 'app-results',
  imports: [MatTableModule, MatIconModule, MatProgressBarModule, ResultsChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './results.component.html',
  styleUrl: './results.component.css',
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
