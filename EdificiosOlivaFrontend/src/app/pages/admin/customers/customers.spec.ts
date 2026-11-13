import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Customers as CustomersService } from '../../../core/services/customers';
import { Customers } from './customers';

const customer = {
  id: 'abc12345-0000-0000-0000-000000000000', name: 'Ana Pérez',
  email: 'ana@example.test', phone: '8095551234', bookings: 2, status: 'Activo' as const,
};

describe('Customers v1.3', () => {
  let component: Customers;
  let fixture: ComponentFixture<Customers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Customers],
      providers: [
        { provide: CustomersService, useValue: { getAll: () => of([customer]) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Customers);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders mobile cards with contact details and full actions', () => {
    const card = fixture.nativeElement.querySelector('.customer-card');
    expect(card?.textContent).toContain('Ana Pérez');
    expect(card?.textContent).toContain('ana@example.test');
    expect(card?.querySelectorAll('.customer-card-actions button')).toHaveLength(2);
  });

  it('closes the keyboard-trapped dialog with Escape', async () => {
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('.new-btn');
    trigger.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[cdktrapfocus]')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(component.showForm).toBe(false);
  });

  it('does not close a dialog while saving', () => {
    component.openCreateForm();
    component.saving = true;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.showForm).toBe(true);
  });
});
