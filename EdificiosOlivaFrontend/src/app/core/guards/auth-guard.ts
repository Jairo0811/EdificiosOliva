import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = await firstValueFrom(authService.user$);

  if (!user) {
    await router.navigate(['/login']);
    return false;
  }

  const token = await user.getIdTokenResult(true);
  if (token.claims['role'] === 'admin') {
    return true;
  }

  await router.navigate(['/']);
  return false;
};
