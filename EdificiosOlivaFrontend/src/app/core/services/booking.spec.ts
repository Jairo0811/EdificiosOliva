import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PublicBookingService } from './booking';

describe('PublicBookingService', () => {
  let service: PublicBookingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PublicBookingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
