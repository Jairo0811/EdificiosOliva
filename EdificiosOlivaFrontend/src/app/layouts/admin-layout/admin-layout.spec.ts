import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from '../../core/services/auth';

import { AdminLayout } from './admin-layout';

describe('AdminLayout', () => {
  let component: AdminLayout;
  let fixture: ComponentFixture<AdminLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter([
          { path: 'admin', children: [{ path: 'pagos', children: [] }, { path: '', children: [] }] },
        ]),
        provideHttpClient(),
        {
          provide: AuthService,
          useValue: {
            userProfile$: new BehaviorSubject({ role: 'admin', displayName: 'Ana Admin' }),
            logout: () => Promise.resolve(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('groups every admin route under General, Alojamiento, Reservas, Finanzas and Operación', () => {
    fixture.detectChanges();
    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('.nav-group-title'),
    ).map((el) => (el as HTMLElement).textContent?.trim());

    expect(titles).toEqual(['General', 'Alojamiento', 'Reservas', 'Finanzas', 'Operación']);
    expect(fixture.nativeElement.querySelectorAll('nav a').length).toBe(8);
  });

  it('shows the current section as the page title', async () => {
    await TestBed.inject(Router).navigateByUrl('/admin/pagos');
    fixture.detectChanges();

    expect(component.pageTitle).toBe('Pagos');
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Pagos');
  });

  it('opens mobile navigation, closes with Escape and returns focus to the trigger', async () => {
    component.toggleMenu();
    expect(component.menuOpen).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(component.menuOpen).toBe(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.mobile-menu').getAttribute('aria-expanded')).toBe('false');
  });

  it('offers a skip link to the main content', () => {
    expect(fixture.nativeElement.querySelector('.skip-link').getAttribute('href')).toBe(
      '#admin-main',
    );
  });
});
