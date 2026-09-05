import { HttpInterceptorFn } from '@angular/common/http';
import { getAuth } from 'firebase/auth';
import { from, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { firebaseApp } from '../config/firebase.config';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) {
    return next(request);
  }

  const user = getAuth(firebaseApp).currentUser;
  if (!user) {
    return next(request);
  }

  return from(user.getIdToken()).pipe(
    switchMap((token) =>
      next(
        request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ),
    ),
  );
};

export function isApiRequest(requestUrl: string): boolean {
  const baseOrigin = globalThis.location?.origin ?? 'http://localhost';
  const apiUrl = new URL(environment.apiUrl, baseOrigin);
  const url = new URL(requestUrl, baseOrigin);
  const apiPath = apiUrl.pathname.replace(/\/$/, '');

  return (
    url.origin === apiUrl.origin &&
    (url.pathname === apiPath || url.pathname.startsWith(`${apiPath}/`))
  );
}
