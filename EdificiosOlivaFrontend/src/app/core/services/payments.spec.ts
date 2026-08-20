import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { Payments } from './payments';

describe('Payments', () => {
  let service: Payments;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(Payments);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
