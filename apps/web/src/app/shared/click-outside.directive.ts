import { Directive, inject, OnDestroy } from '@angular/core';
import { MatSelect } from '@angular/material/select';
import { Subscription } from 'rxjs';
import { OpenSelectRegistry } from './open-select-registry.service'; // תתאים את הנתיב

@Directive({
  selector: '[appClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective implements OnDestroy {
  private readonly select = inject(MatSelect);
  private readonly registry = inject(OpenSelectRegistry);
  private sub?: Subscription;

  constructor() {
    this.sub = this.select.openedChange.subscribe((isOpen) => {
      this.registry.track(this.select, isOpen);
    });
  }

  ngOnDestroy(): void {
    this.registry.track(this.select, false); // לנקות אם הקומפוננטה נהרסת
    this.sub?.unsubscribe();
  }
}