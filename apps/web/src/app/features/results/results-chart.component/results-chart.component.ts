import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { canShowPie, type ChartKind, type QueryResult } from '@supports/shared';
import type { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { QueryStore } from '../../../state/query.store';

/** Categorical palette in fixed order (validated for color-vision deficiency). */
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const MAX_SERIES = SERIES_COLORS.length;
const numberFormat = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const percentFormat = new Intl.NumberFormat('he-IL', { style: 'percent', maximumFractionDigits: 0 });

/**
 * Chart of a grouped result, one metric at a time - never two scales on one chart.
 * Bars by default: first grouping on the axis, second grouping (if any) as side-by-side series.
 * A doughnut is offered, and shown first, only when a part-of-whole reading is honest
 * (see canShowPie); the user can switch back to bars.
 */
@Component({
  selector: 'app-results-chart',
  imports: [BaseChartDirective, MatButtonToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './results-chart.component.html',
  styleUrl: './results-chart.component.css',
})
export class ResultsChartComponent {
  private readonly store = inject(QueryStore);

  readonly result = input.required<QueryResult>();
  protected readonly maxSeries = MAX_SERIES;

  readonly metricColumns = computed(() => this.result().columns.filter((c) => c.kind === 'metric'));
  readonly metricKey = linkedSignal(() => this.metricColumns()[0]?.key ?? 'count');
  private readonly dimensions = computed(() => this.result().columns.filter((c) => c.kind === 'dimension'));
  readonly tooManySeries = computed(() => this.seriesNames().length > MAX_SERIES);

  readonly pieAllowed = computed(() => {
    const dataset = this.store.dataset();
    return dataset !== null && canShowPie(this.result(), this.metricKey(), dataset);
  });
  /** Doughnut whenever it is allowed (also after switching metric); the user may pick bars. */
  readonly kind = linkedSignal<ChartKind>(() => (this.pieAllowed() ? 'doughnut' : 'bar'));

  private readonly seriesNames = computed(() => {
    const second = this.dimensions()[1];
    return second ? unique(this.result().rows.map((r) => String(r[second.key]))) : [];
  });

  private readonly metricLabel = computed(
    () => this.metricColumns().find((m) => m.key === this.metricKey())?.label ?? this.metricKey(),
  );

  readonly doughnut = computed<{ data: ChartConfiguration<'doughnut'>['data']; options: ChartConfiguration<'doughnut'>['options'] }>(() => {
    const rows = this.result().rows;
    const dimension = this.dimensions()[0]!;
    const metric = this.metricKey();
    const values = rows.map((r) => Number(r[metric] ?? 0));
    const total = values.reduce((sum, v) => sum + v, 0);
    const share = (value: number) => percentFormat.format(total ? value / total : 0);

    return {
      data: {
        // The share is part of each legend entry, so the parts read without hovering.
        labels: rows.map((r, i) => `${String(r[dimension.key])} · ${share(values[i]!)}`),
        datasets: [
          {
            label: this.metricLabel(),
            data: values,
            backgroundColor: SERIES_COLORS.slice(0, values.length),
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        locale: 'he-IL',
        cutout: '58%',
        plugins: {
          legend: { rtl: true, position: 'right', labels: { boxWidth: 12, color: '#1b2330', padding: 14 } },
          tooltip: {
            rtl: true,
            callbacks: { label: (ctx) => `${this.metricLabel()}: ${numberFormat.format(Number(ctx.raw))} (${share(Number(ctx.raw))})` },
          },
        },
      },
    };
  });

  readonly bars = computed<{ data: ChartConfiguration<'bar'>['data']; options: ChartConfiguration<'bar'>['options'] }>(() => {
    const rows = this.result().rows;
    const [first, second] = this.dimensions();
    const metric = this.metricKey();
    const labels = unique(rows.map((r) => String(r[first!.key])));

    const series = second
      ? this.seriesNames().slice(0, MAX_SERIES).map((name) => ({
          label: name,
          data: labels.map((label) => Number(rows.find((r) => String(r[first!.key]) === label && String(r[second.key]) === name)?.[metric] ?? 0)),
        }))
      : [{ label: this.metricLabel(), data: labels.map((label) => Number(rows.find((r) => String(r[first!.key]) === label)?.[metric] ?? 0)) }];

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
