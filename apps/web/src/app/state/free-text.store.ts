import { computed, inject, Injectable, signal } from '@angular/core';
import type { NlParseResult } from '@supports/shared';
import { SupportsApi } from '../core/api/supports-api.service';
import { QueryStore } from './query.store';

/** What happened to the builder after a question was interpreted. */
export type InterpretOutcome = 'filled' | 'out-of-scope';

/**
 * The free-text question and its interpretation: interpret, convert to a query, show the
 * interpretation, and let the user run it. The interpretation fills the query builder but never
 * runs it - the user reads what was understood and presses "run" (or fixes a field first).
 * An out-of-scope question leaves the fields untouched.
 */
@Injectable({ providedIn: 'root' })
export class FreeTextStore {
  private static readonly SLOW_PARSE_NOTICE_DELAY_MS = 15_000;

  private readonly api = inject(SupportsApi);
  private readonly query = inject(QueryStore);
  private slowParseNoticeTimer: ReturnType<typeof setTimeout> | undefined;

  readonly text = signal('');
  readonly parsing = signal(false);
  readonly showSlowParseNotice = signal(false);
  readonly interpretation = signal<NlParseResult | null>(null);
  readonly outcome = signal<InterpretOutcome | null>(null);
  /** The text the current interpretation was made from, and when it was applied. */
  private readonly interpretedText = signal('');
  private readonly interpretedAt = signal(0);
  private readonly textEditedAt = signal(0);

  /** A question was typed (or changed) and not interpreted yet. */
  private readonly uninterpreted = computed(() => {
    const text = this.text().trim();
    return text.length >= 3 && text !== this.interpretedText();
  });

  /**
   * The question is the latest thing the user touched, so "run" should answer it.
   * If the fields were set by hand after typing, the fields win and the question is ignored.
   */
  readonly shouldInterpretOnRun = computed(() => this.uninterpreted() && this.textEditedAt() > this.query.lastHandEditAt());

  /** A question sits in the box but the fields were set by hand after it: running ignores it. */
  readonly ignoredQuestion = computed(() => this.uninterpreted() && !this.shouldInterpretOnRun());

  /** The fields were changed by hand after the interpretation filled them. */
  readonly editedSinceInterpretation = computed(
    () => this.interpretation() !== null && this.query.lastHandEditAt() > this.interpretedAt(),
  );

  setText(text: string): void {
    this.text.set(text);
    this.textEditedAt.set(Date.now());
  }

  /**
   * Interprets the question and fills the fields. The previous interpretation stays on screen
   * until the new one arrives, so the page does not jump while the request is in flight.
   */
  async interpret(): Promise<InterpretOutcome | null> {
    const text = this.text().trim();
    if (text.length < 3 || this.parsing()) return null;

    const request = ++this.requestSeq;
    this.parsing.set(true);
    this.showSlowParseNotice.set(false);
    this.clearSlowParseNoticeTimer();
    this.slowParseNoticeTimer = setTimeout(() => {
      if (request === this.requestSeq && this.parsing()) this.showSlowParseNotice.set(true);
    }, FreeTextStore.SLOW_PARSE_NOTICE_DELAY_MS);

    try {
      const result = await this.api.parseFreeText(text, this.query.query().dataset);
      if (request !== this.requestSeq) return null; // cancelled or cleared meanwhile

      this.interpretation.set(result);
      this.interpretedText.set(text);
      this.interpretedAt.set(Date.now());
      if (result.scope !== 'out') this.query.fill(result.definition);
      this.outcome.set(result.scope === 'out' ? 'out-of-scope' : 'filled');
      return this.outcome();
    } finally {
      if (request === this.requestSeq) {
        this.clearSlowParseNoticeTimer();
        this.showSlowParseNotice.set(false);
        this.parsing.set(false);
      }
    }
  }

  /** Stops waiting for the interpretation in flight; its answer will be ignored. */
  cancel(): void {
    this.requestSeq++;
    this.clearSlowParseNoticeTimer();
    this.showSlowParseNotice.set(false);
    this.parsing.set(false);
  }

  /** Empties the question box and its notes. The fields keep whatever they hold. */
  clear(): void {
    this.cancel();
    this.setText('');
    this.interpretation.set(null);
    this.outcome.set(null);
    this.interpretedText.set('');
  }

  /** Identifies the latest interpretation request; an older answer arriving late is ignored. */
  private requestSeq = 0;

  private clearSlowParseNoticeTimer(): void {
    if (this.slowParseNoticeTimer !== undefined) clearTimeout(this.slowParseNoticeTimer);
    this.slowParseNoticeTimer = undefined;
  }
}
