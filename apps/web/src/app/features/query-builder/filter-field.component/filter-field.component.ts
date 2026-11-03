import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { FieldDefinition, Filter, Operator } from '@supports/shared';
import { ClickOutsideDirective } from '../../../shared/click-outside.directive';

/**
 * Renders the right control for any field described by metadata:
 * enum -> multi-select, year/number -> single value or range.
 * It knows nothing about specific fields, so new fields need no client change.
 */
@Component({
  selector: 'app-filter-field',
  imports: [MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonToggleModule, ClickOutsideDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-field.component.html',
  styleUrl: './filter-field.component.css',
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
