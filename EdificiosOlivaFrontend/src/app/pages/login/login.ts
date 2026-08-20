import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  async login(): Promise<void> {
    this.errorMessage = '';

    if (!this.isValidEmail(this.email.trim()) || this.password.length < 8) {
      this.errorMessage = 'Ingresa un correo válido y tu contraseña.';
      return;
    }

    this.loading = true;

    try {
      await this.authService.login(this.email.trim(), this.password);

      if (!(await this.authService.isCurrentUserAdmin(true))) {
        await this.authService.logout();
        this.errorMessage = 'Esta cuenta no tiene acceso administrativo.';
        return;
      }

      await this.router.navigate(['/admin']);
    } catch {
      this.errorMessage = 'No fue posible iniciar sesión con esas credenciales.';
    } finally {
      this.loading = false;
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async loginGoogle(): Promise<void> {
    this.errorMessage = '';

    try {
      this.loading = true;
      await this.authService.loginWithGoogle();

      if (!(await this.authService.isCurrentUserAdmin(true))) {
        await this.authService.logout();
        this.errorMessage = 'Esta cuenta no tiene acceso administrativo.';
        return;
      }

      await this.router.navigate(['/admin']);
    } catch {
      this.errorMessage = 'No se pudo iniciar sesión con Google.';
    } finally {
      this.loading = false;
    }
  }
}
