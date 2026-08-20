import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { Customers } from './customers';

describe('Customers', () => {
  let service: Customers;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(Customers);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
