import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { FieldDefinition, Filter, Operator } from '@supports/shared';

/**
 * Renders the right control for any field described by metadata:
 * enum -> multi-select, year/number -> single value or range.
 * It knows nothing about specific fields, so new fields need no client change.
 */
@Component({
  selector: 'app-filter-field',
  imports: [MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (field().dataType === 'enum') {
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>{{ field().label }}</mat-label>
        <mat-select multiple [value]="selectedValues()" (selectionChange)="emitValues($event.value)" placeholder="הכל">
          @for (option of field().options; track option.value) {
            <mat-option [value]="option.value">{{ option.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    } @else {
      <div class="numeric">
        <div class="numeric-header">
          <span class="numeric-label">{{ field().label }}</span>
          @if (supportsBoth()) {
            <mat-button-toggle-group hideSingleSelectionIndicator [value]="mode()" (change)="setMode($event.value)">
              <mat-button-toggle value="in">בודד</mat-button-toggle>
              <mat-button-toggle value="between">טווח</mat-button-toggle>
            </mat-button-toggle-group>
          }
        </div>
        <div class="numeric-inputs">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ mode() === 'between' ? 'מ-' : 'ערך' }}</mat-label>
            <input matInput type="number" [value]="from()" (input)="from.set(read($event)); emitNumbers()" />
          </mat-form-field>
          @if (mode() === 'between') {
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>עד</mat-label>
              <input matInput type="number" [value]="to()" (input)="to.set(read($event)); emitNumbers()" />
            </mat-form-field>
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    mat-form-field { width: 100%; }
    .numeric-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .numeric-label { font-size: 0.85rem; color: var(--app-text-muted); }
    .numeric-inputs { display: flex; gap: 8px; }
    mat-button-toggle-group { height: 28px; align-items: center; font-size: 0.8rem; }
  `,
})
export class FilterFieldComponent {
  readonly field = input.required<FieldDefinition>();
  readonly filter = input<Filter | undefined>();
  readonly filterChange = output<Filter | null>();

  readonly supportsBoth = computed(() => this.field().operators.includes('in') && this.field().operators.includes('between'));
  readonly selectedValues = computed(() => this.filter()?.values.map(String) ?? []);

  // Local editing state that resets whenever the filter is replaced from outside (e.g. loading a saved query).
  readonly mode = linkedSignal<Operator>(() => this.filter()?.operator ?? this.field().operators[0] ?? 'in');
  readonly from = linkedSignal(() => String(this.filter()?.values[0] ?? ''));
  readonly to = linkedSignal(() => String(this.filter()?.values[1] ?? ''));

  read(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  emitValues(values: string[]): void {
    this.filterChange.emit(values.length ? { field: this.field().key, operator: 'in', values } : null);
  }

  setMode(mode: Operator): void {
    this.mode.set(mode);
    this.emitNumbers();
  }

  emitNumbers(): void {
    const field = this.field().key;
    const from = this.from().trim();
    const to = this.to().trim();

    if (this.mode() === 'in') {
      this.filterChange.emit(from ? { field, operator: 'in', values: [Number(from)] } : null);
    } else {
      this.filterChange.emit(from && to ? { field, operator: 'between', values: [Number(from), Number(to)] } : null);
    }
  }
}
