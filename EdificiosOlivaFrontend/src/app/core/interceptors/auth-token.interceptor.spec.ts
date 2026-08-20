import { environment } from '../../../environments/environment';
import { isApiRequest } from './auth-token.interceptor';

describe('authTokenInterceptor URL scope', () => {
  it('allows the configured API URL', () => {
    expect(isApiRequest(`${environment.apiUrl}/customers`)).toBe(true);
  });

  it('does not send credentials to another origin', () => {
    expect(isApiRequest('https://attacker.example/api/customers')).toBe(false);
  });

  it('does not confuse a path with the API prefix', () => {
    const baseOrigin = globalThis.location?.origin ?? 'http://localhost';
    const apiUrl = new URL(environment.apiUrl, baseOrigin);

    expect(isApiRequest(`${apiUrl.origin}${apiUrl.pathname}-evil/customers`)).toBe(false);
  });
});
