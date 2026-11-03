import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FreeTextStore } from '../../state/free-text.store';

const EXAMPLES = [
  'הצג את כלל בקשות התמיכה שאושרו לעמותות בתחום הספורט בשנת 2025',
  'כמה בקשות הגישו רשויות מקומיות בדרום בין 2022 ל-2024, לפי שנה',
  'סכום הבקשות שאושרו בתחום התרבות לפי מחוז',
];

/**
 * The question bar at the top of the query card: the question is interpreted, the
 * interpretation is shown and fills the fields below, and the user runs it with the card's
 * single "run" button. The AI only fills in the query; results always come from the database.
 */
@Component({
  selector: 'app-free-text',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (submit)="$event.preventDefault(); interpret()">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-icon matPrefix class="spark">auto_awesome</mat-icon>
        <mat-label>שאלו בשפה חופשית</mat-label>
        <textarea
          matInput
          rows="1"
          maxlength="500"
          placeholder="למשל: כמה בקשות אושרו ב-2024 לפי מחוז"
          [value]="store.text()"
          (input)="store.setText(read($event))"
          (keydown.enter)="onEnter($any($event))"
          (keydown.escape)="store.parsing() ? store.cancel() : store.clear()"
        ></textarea>
        @if (store.text() && !store.parsing()) {
          <button mat-icon-button matSuffix type="button" matTooltip="מחיקת השאלה" aria-label="מחיקת השאלה" (click)="store.clear()">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>
      @if (store.parsing()) {
        <button mat-stroked-button type="button" class="action" (click)="store.cancel()">
          <mat-icon>close</mat-icon> ביטול
        </button>
      } @else {
        <button mat-flat-button type="submit" class="action" matTooltip="אפשר גם Enter" [disabled]="store.text().trim().length < 3">
          <mat-icon>psychology</mat-icon> פיענוח ומילוי שדות
        </button>
      }
      <!-- Overlays the bottom edge of the box, so showing it does not move anything. -->
      @if (store.parsing()) {
        <mat-progress-bar mode="indeterminate" class="progress" />
      }
    </form>

    @if (!store.text().trim()) {
      <div class="examples">
        @for (example of examples; track example) {
          <button type="button" class="example" (click)="store.setText(example)">{{ example }}</button>
        }
      </div>
    }

    <div class="notes" role="status">
      @if (store.parsing() && store.showSlowParseNotice()) {
        <p class="note muted"><mat-icon inline>schedule</mat-icon> הפענוח עדיין מתבצע. אם ה-AI לא יענה בתוך 15 שניות, השאלה תעבור לפענוח חלופי.</p>
      } @else if (store.ignoredQuestion()) {
        <p class="note muted"><mat-icon inline>info</mat-icon> השאלה לא פוענחה, וההרצה תשתמש בשדות כפי שהם. "פיענוח ומילוי שדות" ימלא אותם לפי השאלה.</p>
      } @else if (store.shouldInterpretOnRun() && !store.parsing()) {
        <p class="note todo"><mat-icon inline>psychology</mat-icon> לחצו "פיענוח ומילוי שדות" (או Enter). ההרצה תתאפשר אחרי הפיענוח.</p>
      } @else if (store.interpretation(); as result) {
        @for (warning of result.warnings; track warning) {
          <p class="note warning"><mat-icon inline>info</mat-icon> {{ warning }}</p>
        }
        @if (result.scope === 'out') {
          <p class="note out"><mat-icon inline>block</mat-icon> <span><strong>אין לשאלה הזו תשובה במערכת.</strong> {{ result.scopeNote }} השדות לא שונו.</span></p>
          <div class="examples">
            @for (example of examples; track example) {
              <button type="button" class="example" (click)="store.setText(example)">{{ example }}</button>
            }
          </div>
        } @else {
          <div class="interpretation">
            <div class="interpretation-head">
              <span class="muted">כך הבנתי את השאלה</span>
              <span class="provider">{{ providerLabel(result.provider) }}</span>
            </div>
            <p class="interpreted">{{ result.question }}</p>
            @if (result.scope === 'partial') {
              <p class="note partial"><mat-icon inline>warning</mat-icon> <span><strong>תשובה חלקית בלבד:</strong> {{ result.scopeNote }}</span></p>
            }
            @if (store.editedSinceInterpretation()) {
              <p class="note muted"><mat-icon inline>edit</mat-icon> השדות שונו ידנית מאז הפירוש. הסיכום ליד "הרצה" מראה מה ירוץ עכשיו.</p>
            } @else {
              <p class="note todo"><mat-icon inline>play_circle</mat-icon> השדות מולאו לפי הפירוש. לחצו "הרצה" להצגת התוצאות, או פתחו את השדות כדי לתקן.</p>
            }
          </div>
        }
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    form { position: relative; display: flex; gap: 12px; align-items: center; }
    mat-form-field { flex: 1; min-width: 0; }
    /* Same height as the outlined field next to it; fixed width so swapping to "cancel" does not shift the box. */
    .action { flex-shrink: 0; height: 56px; min-width: 190px; }
    .progress { position: absolute; inset-inline: 0; bottom: -6px; height: 3px; }
    @media (max-width: 640px) { form { flex-direction: column; align-items: stretch; } }
    .spark { color: var(--app-accent); margin-inline: 8px 4px; }
    textarea { resize: none; }
    .examples { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; font-size: 0.82rem; }
    .example { border: 1px solid var(--app-border); background: #fafbfc; border-radius: 999px; padding: 3px 12px; cursor: pointer; font: inherit; color: var(--app-text-muted); }
    .example:hover { border-color: var(--app-accent); color: var(--app-accent); }
    .notes:empty { display: none; }
    .note { display: flex; gap: 6px; align-items: flex-start; margin: 6px 0 0; font-size: 0.88rem; }
    .note mat-icon { flex-shrink: 0; margin-top: 2px; }
    .interpretation { margin-top: 10px; border: 1px dashed var(--app-accent); border-radius: 10px; padding: 10px 14px; background: #f8fbff; }
    .interpretation-head { display: flex; justify-content: space-between; font-size: 0.82rem; }
    .provider { background: #e8f0fc; color: var(--app-accent); border-radius: 999px; padding: 1px 10px; font-weight: 600; }
    .interpreted { margin: 4px 0 2px; font-weight: 600; font-size: 1.02rem; }
    .out { color: #9b2c2c; }
    .partial { padding: 6px 10px; border-radius: 8px; background: #fff4dc; color: #6b4500; }
    .warning { color: #8a5a00; }
    .todo { color: var(--app-accent); font-weight: 600; }
  `,
})
export class FreeTextComponent {
  protected readonly store = inject(FreeTextStore);
  protected readonly examples = EXAMPLES;

  read(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }

  /** Enter interprets; Shift+Enter still adds a line. */
  onEnter(event: KeyboardEvent): void {
    if (event.shiftKey) return;
    event.preventDefault();
    void this.interpret();
  }

  async interpret(): Promise<void> {
    await this.store.interpret();
  }

  providerLabel(provider: string): string {
    if (provider === 'anthropic') return 'Claude';
    if (provider === 'gemini') return 'Gemini';
    if (provider === 'openai') return 'OpenAI';
    return 'פענוח מבוסס חוקים';
  }
}
