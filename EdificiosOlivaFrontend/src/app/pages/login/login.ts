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
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  async login(): Promise<void> {
    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Introduce un correo electrónico válido.';
      return;
    }

    await this.runLogin(async () =>
      this.authService.login(this.email.trim(), this.password),
    );
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  loginGoogle(): Promise<void> {
    return this.runLogin(() => this.authService.loginWithGoogle(), 'Google');
  }

  loginApple(): Promise<void> {
    return this.runLogin(() => this.authService.loginWithApple(), 'Apple');
  }

  private async runLogin(
    authenticate: () => ReturnType<AuthService['login']>,
    provider?: 'Google' | 'Apple',
  ): Promise<void> {
    this.errorMessage = '';
    this.loading = true;

    try {
      const credential = await authenticate();
      const profile = await this.authService.getUserProfile(credential.user.uid);

      if (!profile) {
        this.errorMessage = 'No se pudo cargar el perfil de usuario.';
        await this.authService.logout();
        return;
      }

      await this.router.navigate([profile.role === 'admin' ? '/admin' : '/']);
    } catch {
      this.errorMessage = provider
        ? `No se pudo iniciar sesión con ${provider}. Inténtalo nuevamente.`
        : 'Correo o contraseña incorrectos.';
    } finally {
      this.loading = false;
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }
}
