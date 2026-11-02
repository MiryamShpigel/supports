import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { NlParseResult } from '@supports/shared';
import { SupportsApi } from '../../core/api/supports-api.service';
import { QueryStore } from '../../state/query.store';

const EXAMPLES = [
  'הצג את כלל בקשות התמיכה שאושרו לעמותות בתחום הספורט בשנת 2025',
  'כמה בקשות הגישו רשויות מקומיות בדרום בין 2022 ל-2024, לפי שנה',
  'סכום הבקשות שאושרו בתחום התרבות לפי מחוז',
];

/**
 * Free-text question -> interpretation -> user confirms -> run.
 * The AI only fills in the query; results always come from the database.
 */
@Component({
  selector: 'app-free-text',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel">
      <h2 class="panel-title"><mat-icon>auto_awesome</mat-icon> שאלה בשפה חופשית</h2>

      <form (submit)="$event.preventDefault(); interpret()">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>מה תרצו לדעת?</mat-label>
          <textarea matInput rows="2" [value]="text()" (input)="text.set(read($event))" maxlength="500"></textarea>
        </mat-form-field>
        <button mat-flat-button type="submit" [disabled]="text().trim().length < 3 || parsing()">
          <mat-icon>psychology</mat-icon> פירוש השאלה
        </button>
      </form>

      <div class="examples">
        <span class="muted">דוגמאות:</span>
        @for (example of examples; track example) {
          <button type="button" class="example" (click)="text.set(example)">{{ example }}</button>
        }
      </div>

      @if (parsing()) {
        <mat-progress-bar mode="indeterminate" />
      }

      @if (interpretation(); as result) {
        <div class="interpretation">
          <div class="interpretation-head">
            <span class="muted">כך הבנתי את השאלה</span>
            <span class="provider">{{ providerLabel(result.provider) }}</span>
          </div>
          <p class="question">{{ result.question }}</p>
          @for (warning of result.warnings; track warning) {
            <p class="warning"><mat-icon inline>info</mat-icon> {{ warning }}</p>
          }
          <div class="actions">
            <button mat-flat-button (click)="apply(result, true)"><mat-icon>play_arrow</mat-icon> הרצה</button>
            <button mat-stroked-button (click)="apply(result, false)"><mat-icon>edit</mat-icon> העברה לעריכה</button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    form { display: flex; gap: 12px; align-items: center; }
    mat-form-field { flex: 1; }
    .examples { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 10px 0 4px; font-size: 0.85rem; }
    .example { border: 1px solid var(--app-border); background: #fafbfc; border-radius: 999px; padding: 3px 12px; cursor: pointer; font: inherit; color: inherit; }
    .example:hover { border-color: var(--app-accent); color: var(--app-accent); }
    .interpretation { margin-top: 12px; border: 1px dashed var(--app-accent); border-radius: 10px; padding: 12px 14px; background: #f8fbff; }
    .interpretation-head { display: flex; justify-content: space-between; font-size: 0.85rem; }
    .provider { background: #e8f0fc; color: var(--app-accent); border-radius: 999px; padding: 1px 10px; font-weight: 600; }
    .question { font-weight: 600; font-size: 1.05rem; margin: 6px 0; }
    .warning { color: #8a5a00; margin: 4px 0; font-size: 0.88rem; }
    .actions { display: flex; gap: 8px; margin-top: 10px; }
    @media (max-width: 640px) { form { flex-direction: column; align-items: stretch; } }
  `,
})
export class FreeTextComponent {
  private readonly api = inject(SupportsApi);
  private readonly store = inject(QueryStore);

  protected readonly examples = EXAMPLES;
  readonly text = signal('');
  readonly parsing = signal(false);
  readonly interpretation = signal<NlParseResult | null>(null);

  read(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }

  async interpret(): Promise<void> {
    this.parsing.set(true);
    this.interpretation.set(null);
    try {
      this.interpretation.set(await this.api.parseFreeText(this.text().trim(), this.store.query().dataset));
    } finally {
      this.parsing.set(false);
    }
  }

  apply(result: NlParseResult, run: boolean): void {
    this.store.load(result.definition);
    this.interpretation.set(null);
    if (run) void this.store.run();
  }

  providerLabel(provider: string): string {
    return provider === 'anthropic' ? 'פוענח ע"י Claude' : 'פענוח מבוסס חוקים';
  }
}
