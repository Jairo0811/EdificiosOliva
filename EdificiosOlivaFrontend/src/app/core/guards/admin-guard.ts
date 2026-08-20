import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const user = auth.currentUser;
  if (user && (await user.getIdTokenResult(true)).claims['role'] === 'admin') {
    return true;
  }
  return router.createUrlTree(['/']);
};
