import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  // Angular runs without zone.js: state changed after an `await` needs an explicit repaint.
  private readonly cdr = inject(ChangeDetectorRef);

  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';
  emailError = '';

  async login(): Promise<void> {
    if (this.loading) {
      return;
    }

    this.errorMessage = '';
    this.emailError = '';

    const email = this.email.trim();
    if (!this.isValidEmail(email)) {
      this.emailError = 'Ingresa un correo electrónico válido.';
      return;
    }

    if (!this.password) {
      this.errorMessage = 'Ingresa tu contraseña.';
      return;
    }

    this.loading = true;

    try {
      const credential = await this.authService.login(email, this.password);
      const profile = await this.authService.getUserProfile(credential.user.uid);

      if (profile?.role !== 'admin') {
        await this.authService.logout();
        this.errorMessage = 'Esta cuenta no tiene acceso al panel administrativo.';
        return;
      }

      await this.router.navigate(['/admin']);
    } catch (error) {
      this.errorMessage = this.describeAuthError(error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async loginGoogle(): Promise<void> {
    if (this.loading) {
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    try {
      const credential = await this.authService.loginWithGoogle();
      const profile = await this.authService.getUserProfile(credential.user.uid);

      window.location.href = profile?.role === 'admin' ? '/admin' : '/mi-cuenta';
    } catch {
      this.errorMessage = 'No se pudo iniciar sesión con Google.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /** Generic wording for credential errors so the form never reveals which accounts exist. */
  private describeAuthError(error: unknown): string {
    const code = (error as { code?: string })?.code ?? '';

    switch (code) {
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.';
      case 'auth/network-request-failed':
        return 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.';
      case 'auth/invalid-email':
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/user-disabled':
        return 'Correo o contraseña incorrectos.';
      default:
        return 'No fue posible iniciar sesión. Inténtalo de nuevo.';
    }
  }
}
