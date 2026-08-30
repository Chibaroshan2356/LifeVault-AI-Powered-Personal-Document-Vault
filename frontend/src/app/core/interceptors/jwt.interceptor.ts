/**
 * jwt.interceptor.ts — HTTP JWT Interceptor
 *
 * Strategy: PROACTIVE refresh, not reactive retry.
 *
 * Before every non-auth request:
 *  1. If refresh token is gone/expired → redirect to /auth/login immediately.
 *  2. If access token is expired (or missing) → refresh FIRST, then fire request.
 *  3. Otherwise → attach token and fire request normally.
 *
 * This avoids the "401 → retry" pattern which races with Angular's polling
 * (interval + switchMap can cancel the retry before it completes).
 *
 * Registered in app.config.ts:
 *   provideHttpClient(withInterceptors([jwtInterceptor]))
 */
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenStorageService } from '../services/token-storage.service';
import { AuthService } from '../../features/auth/services/auth.service';
import { Router } from '@angular/router';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const authService  = inject(AuthService);
  const router       = inject(Router);

  // ── Never add auth headers to these endpoints ──────────────────────────
  const isAuthEndpoint =
    req.url.includes('/auth/login')    ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh')  ||
    req.url.includes('/auth/logout');

  if (isAuthEndpoint) {
    return next(req);
  }

  // ── No valid refresh token → session is dead, redirect immediately ─────
  if (tokenStorage.isRefreshTokenExpired()) {
    tokenStorage.clear();
    router.navigate(['/auth/login']);
    return throwError(
      () => new HttpErrorResponse({ status: 401, statusText: 'Session expired' }),
    );
  }

  const accessToken = tokenStorage.getAccessToken();

  // ── Access token is expired (or missing) → refresh FIRST, then fire ────
  if (tokenStorage.isAccessTokenExpired()) {
    return authService.refreshToken().pipe(
      switchMap((res) => {
        // refreshToken() already saves the new token via tap()
        const newToken = res.data?.accessToken ?? tokenStorage.getAccessToken();
        return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
      }),
      catchError(() => {
        tokenStorage.clear();
        router.navigate(['/auth/login']);
        return throwError(
          () => new HttpErrorResponse({ status: 401, statusText: 'Refresh failed' }),
        );
      }),
    );
  }

  // ── Token is valid → attach and fire ──────────────────────────────────
  const authReq = accessToken
    ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : req;

  return next(authReq).pipe(
    // Fallback: handle unexpected 401 (e.g. token rejected by server clock skew)
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        tokenStorage.clear();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    }),
  );
};
