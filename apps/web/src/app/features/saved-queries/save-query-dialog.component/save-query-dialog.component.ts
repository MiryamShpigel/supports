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
  templateUrl: './save-query-dialog.component.html',
  styleUrl: './save-query-dialog.component.css',
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
