import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Apartments as ApartmentsService } from '../../core/services/apartments';
import { Apartments } from './apartments';

describe('Apartments', () => {
  let component: Apartments;
  let fixture: ComponentFixture<Apartments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Apartments],
      providers: [
        provideRouter([]),
        {
          provide: ApartmentsService,
          useValue: {
            getAvailableApartments: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Apartments);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
