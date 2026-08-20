import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';

export const firebaseAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(Auth);
  const isApiRequest = request.url.startsWith(environment.apiUrl);

  if (!isApiRequest || !auth.currentUser) {
    return next(request);
  }

  return from(auth.currentUser.getIdToken()).pipe(
    switchMap((token) => next(request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }))),
  );
};
