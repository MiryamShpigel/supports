import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FreeTextStore } from '../../../state/free-text.store';

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
  templateUrl: './free-text.component.html',
  styleUrl: './free-text.component.css',
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
