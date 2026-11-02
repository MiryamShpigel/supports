import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import type { QueryResult } from '@supports/shared';
import type { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

/** Categorical palette in fixed order (validated for color-vision deficiency). */
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const MAX_SERIES = SERIES_COLORS.length;
const numberFormat = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });

/**
 * Bar chart of a grouped result: first grouping on the axis, second grouping (if any)
 * as side-by-side series. One metric at a time - never two scales on one chart.
 */
@Component({
  selector: 'app-results-chart',
  imports: [BaseChartDirective, MatButtonToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (metricColumns().length > 1) {
      <mat-button-toggle-group hideSingleSelectionIndicator [value]="metricKey()" (change)="metricKey.set($event.value)" aria-label="מדד בגרף">
        @for (metric of metricColumns(); track metric.key) {
          <mat-button-toggle [value]="metric.key">{{ metric.label }}</mat-button-toggle>
        }
      </mat-button-toggle-group>
    }
    @if (tooManySeries()) {
      <p class="muted note">מוצגות {{ maxSeries }} הסדרות הראשונות; הנתונים המלאים בטבלה.</p>
    }
    <div class="chart-box">
      <canvas baseChart type="bar" [data]="chart().data" [options]="chart().options"></canvas>
    </div>
  `,
  styles: `
    :host { display: block; margin-bottom: 16px; }
    .chart-box { position: relative; height: 300px; }
    mat-button-toggle-group { margin-bottom: 8px; font-size: 0.85rem; }
    .note { font-size: 0.82rem; margin: 0 0 6px; }
  `,
})
export class ResultsChartComponent {
  readonly result = input.required<QueryResult>();
  protected readonly maxSeries = MAX_SERIES;

  readonly metricColumns = computed(() => this.result().columns.filter((c) => c.kind === 'metric'));
  readonly metricKey = linkedSignal(() => this.metricColumns()[0]?.key ?? 'count');
  private readonly dimensions = computed(() => this.result().columns.filter((c) => c.kind === 'dimension'));
  readonly tooManySeries = computed(() => this.seriesNames().length > MAX_SERIES);

  private readonly seriesNames = computed(() => {
    const second = this.dimensions()[1];
    return second ? unique(this.result().rows.map((r) => String(r[second.key]))) : [];
  });

  readonly chart = computed<{ data: ChartConfiguration<'bar'>['data']; options: ChartConfiguration<'bar'>['options'] }>(() => {
    const rows = this.result().rows;
    const [first, second] = this.dimensions();
    const metric = this.metricKey();
    const metricLabel = this.metricColumns().find((m) => m.key === metric)?.label ?? metric;
    const labels = unique(rows.map((r) => String(r[first!.key])));

    const series = second
      ? this.seriesNames().slice(0, MAX_SERIES).map((name) => ({
          label: name,
          data: labels.map((label) => Number(rows.find((r) => String(r[first!.key]) === label && String(r[second.key]) === name)?.[metric] ?? 0)),
        }))
      : [{ label: metricLabel, data: labels.map((label) => Number(rows.find((r) => String(r[first!.key]) === label)?.[metric] ?? 0)) }];

    return {
      data: {
        labels,
        datasets: series.map((s, i) => ({
          ...s,
          backgroundColor: SERIES_COLORS[i],
          // 4px rounded data end, 2px surface gap between adjacent bars.
          borderRadius: { topLeft: 4, topRight: 4 },
          borderSkipped: 'bottom',
          borderColor: '#ffffff',
          borderWidth: { left: 1, right: 1 },
          maxBarThickness: 48,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        locale: 'he-IL',
        interaction: { mode: 'nearest', intersect: true },
        plugins: {
          legend: { display: series.length > 1, rtl: true, position: 'top', align: 'start', labels: { boxWidth: 12, color: '#1b2330' } },
          tooltip: {
            rtl: true,
            callbacks: { label: (ctx) => `${ctx.dataset.label}: ${numberFormat.format(Number(ctx.raw))}` },
          },
        },
        scales: {
          x: { reverse: true, grid: { display: false }, ticks: { color: '#5b6575' } },
          y: {
            position: 'right',
            beginAtZero: true,
            grid: { color: '#eceff3' },
            border: { display: false },
            ticks: { color: '#5b6575', callback: (v) => numberFormat.format(Number(v)) },
          },
        },
      },
    };
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
