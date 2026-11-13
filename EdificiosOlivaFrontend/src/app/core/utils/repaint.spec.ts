import { ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';

import { repaint } from './repaint';

describe('repaint', () => {
  it('marks the view for check after next, error and complete', () => {
    const cdr = { markForCheck: vi.fn() } as unknown as ChangeDetectorRef;
    const subject = new Subject<number>();
    const received: number[] = [];

    subject.pipe(repaint(cdr)).subscribe({ next: (v) => received.push(v), error: () => undefined });
    subject.next(1);
    expect(received).toEqual([1]);
    expect(cdr.markForCheck).toHaveBeenCalledTimes(1);

    subject.error(new Error('x'));
    expect(cdr.markForCheck).toHaveBeenCalledTimes(2);
  });

  it('runs the subscriber before marking for check', () => {
    const order: string[] = [];
    const cdr = { markForCheck: () => order.push('mark') } as unknown as ChangeDetectorRef;
    const subject = new Subject<number>();

    subject.pipe(repaint(cdr)).subscribe(() => order.push('next'));
    subject.next(1);

    expect(order).toEqual(['next', 'mark']);
  });
});
