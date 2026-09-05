import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ApartmentApiService } from './apartment-api.service';

describe('ApartmentApiService', () => {
  let service: ApartmentApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(ApartmentApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
