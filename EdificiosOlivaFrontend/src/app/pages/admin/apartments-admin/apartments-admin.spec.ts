import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Apartments } from '../../../core/services/apartments';
import { ApartmentsAdmin } from './apartments-admin';

const apartment = {
  id: 'a1', name: 'Vista Mar', description: 'Apartamento familiar',
  price: 90, guests: 4, bedrooms: 2, bathrooms: 1,
  location: 'Punta Cana', status: 'Disponible' as const, amenities: [], images: [],
};

describe('ApartmentsAdmin v1.3', () => {
  let component: ApartmentsAdmin;
  let fixture: ComponentFixture<ApartmentsAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApartmentsAdmin],
      providers: [{ provide: Apartments, useValue: { getApartments: () => of([apartment]) } }],
    }).compileComponents();
    fixture = TestBed.createComponent(ApartmentsAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders mobile apartment cards with edit and delete actions', () => {
    const card = fixture.nativeElement.querySelector('.apartment-admin-card');
    expect(card?.textContent).toContain('Vista Mar');
    expect(card?.textContent).toContain('4 huéspedes');
    expect(card?.querySelectorAll('.apartment-admin-card-actions button')).toHaveLength(2);
  });

  it('keeps the desktop table as a separate view', () => {
    expect(fixture.nativeElement.querySelector('.table-card table')).not.toBeNull();
  });
});
