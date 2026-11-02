import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface SaveQueryDialogData {
  question: string;
  name: string;
  description: string;
  /** True when a saved query is loaded, so the user may update it instead of creating a new one. */
  canUpdate: boolean;
}

export interface SaveQueryDialogResult {
  name: string;
  description: string;
  mode: 'create' | 'update';
}

@Component({
  selector: 'app-save-query-dialog',
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>שמירת שאילתה</h2>
    <mat-dialog-content>
      <p class="question">{{ data.question }}</p>
      <mat-form-field appearance="outline">
        <mat-label>שם השאילתה</mat-label>
        <input matInput [value]="name()" (input)="name.set(read($event))" maxlength="100" cdkFocusInitial />
        @if (name().trim().length < 2) {
          <mat-hint>לפחות 2 תווים</mat-hint>
        }
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>תיאור (רשות)</mat-label>
        <textarea matInput rows="2" [value]="description()" (input)="description.set(read($event))" maxlength="500"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>ביטול</button>
      @if (data.canUpdate) {
        <button mat-stroked-button [disabled]="!valid()" (click)="close('create')">שמירה כחדשה</button>
        <button mat-flat-button [disabled]="!valid()" (click)="close('update')">עדכון השאילתה</button>
      } @else {
        <button mat-flat-button [disabled]="!valid()" (click)="close('create')">שמירה</button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    mat-form-field { width: 100%; }
    .question { background: #f0f5fd; border-radius: 8px; padding: 10px 12px; margin-top: 0; font-weight: 600; }
  `,
})
export class SaveQueryDialogComponent {
  protected readonly data = inject<SaveQueryDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<SaveQueryDialogComponent, SaveQueryDialogResult>);

  readonly name = signal(this.data.name);
  readonly description = signal(this.data.description);

  read(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  valid(): boolean {
    return this.name().trim().length >= 2;
  }

  close(mode: SaveQueryDialogResult['mode']): void {
    this.dialogRef.close({ name: this.name().trim(), description: this.description().trim(), mode });
  }
}
