import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../core/services/auth';

import { Navbar } from './navbar';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: AuthService,
          useValue: {
            user$: of({ uid: 'u1', email: 'admin@edificiosoliva.com', displayName: null }),
            getUserProfile: () => Promise.resolve({ role: 'admin', displayName: 'Ana Admin' }),
            logout: () => Promise.resolve(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('repaints the user menu after the profile loads asynchronously', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.user-menu-trigger')?.textContent).toContain(
      'Ana Admin',
    );
  });

  it('closes open menus with Escape', () => {
    component.menuOpen = true;
    component.userMenuOpen = true;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(component.menuOpen).toBe(false);
    expect(component.userMenuOpen).toBe(false);
  });
});
