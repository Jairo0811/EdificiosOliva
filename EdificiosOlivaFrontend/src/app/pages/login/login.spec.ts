import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../../core/services/auth';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  const auth = {
    login: vi.fn(),
    logout: vi.fn(),
    getUserProfile: vi.fn(),
    loginWithGoogle: vi.fn(),
  };

  beforeEach(async () => {
    Object.values(auth).forEach((fn) => fn.mockReset());
    auth.logout.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const fill = () => {
    component.email = 'admin@edificiosoliva.com';
    component.password = 'secret-pass';
  };

  it('rejects an invalid email without calling Firebase', async () => {
    component.email = 'nope';
    component.password = 'x';

    await component.login();

    expect(component.emailError).toBeTruthy();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('navigates to the admin panel for admin accounts', async () => {
    fill();
    auth.login.mockResolvedValue({ user: { uid: 'u1' } });
    auth.getUserProfile.mockResolvedValue({ role: 'admin' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    await component.login();

    expect(navigate).toHaveBeenCalledWith(['/admin']);
    expect(component.loading).toBe(false);
  });

  it('signs out and explains when the account is not an admin', async () => {
    fill();
    auth.login.mockResolvedValue({ user: { uid: 'u1' } });
    auth.getUserProfile.mockResolvedValue({ role: 'customer' });

    await component.login();

    expect(auth.logout).toHaveBeenCalled();
    expect(component.errorMessage).toContain('no tiene acceso');
    expect(component.loading).toBe(false);
  });

  it('shows a generic message for bad credentials and repaints the error', async () => {
    fill();
    auth.login.mockRejectedValue({ code: 'auth/invalid-credential' });

    await component.login();
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Correo o contraseña incorrectos.');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'incorrectos',
    );
    expect(component.loading).toBe(false);
  });

  it('never logs credentials or profiles to the console', async () => {
    const log = vi.spyOn(console, 'log');
    fill();
    auth.login.mockResolvedValue({ user: { uid: 'u1' } });
    auth.getUserProfile.mockResolvedValue({ role: 'customer' });

    await component.login();

    expect(log).not.toHaveBeenCalled();
  });

  it('ignores a second submit while signing in', async () => {
    fill();
    auth.login.mockReturnValue(new Promise(() => undefined));

    void component.login();
    await component.login();

    expect(auth.login).toHaveBeenCalledTimes(1);
  });
});
