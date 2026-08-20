import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { Apartments } from './apartments';

describe('Apartments', () => {
  let service: Apartments;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(Apartments);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
