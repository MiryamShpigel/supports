import { Injectable } from '@angular/core';
import { MatSelect } from '@angular/material/select';

@Injectable({ providedIn: 'root' })
export class OpenSelectRegistry {
  private readonly openSelects = new Set<MatSelect>();

  track(select: MatSelect, isOpen: boolean): void {
    if (isOpen) {
      this.openSelects.add(select);
    } else {
      this.openSelects.delete(select);
    }
  }

  closeAll(): void {
    for (const select of this.openSelects) {
      select.close();
    }
  }
}
