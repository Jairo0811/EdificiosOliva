import { ChangeDetectorRef } from '@angular/core';
import { MonoTypeOperatorFunction, Observable } from 'rxjs';

/**
 * The app runs zoneless (no zone.js), so plain component fields assigned inside
 * a `subscribe` callback do not trigger change detection on their own. This
 * operator marks the view for check right after each emission, error or
 * completion has been delivered to the subscriber.
 */
export function repaint<T>(cdr: ChangeDetectorRef): MonoTypeOperatorFunction<T> {
  return (source) =>
    new Observable<T>((subscriber) =>
      source.subscribe({
        next: (value) => {
          subscriber.next(value);
          cdr.markForCheck();
        },
        error: (error) => {
          subscriber.error(error);
          cdr.markForCheck();
        },
        complete: () => {
          subscriber.complete();
          cdr.markForCheck();
        },
      }),
    );
}
