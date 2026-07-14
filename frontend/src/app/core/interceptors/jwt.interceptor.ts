/**
 * jwt.interceptor.ts — HTTP JWT Interceptor
 *
 * Automatically attaches the Bearer token to every outgoing HTTP request.
 * Components and services never add Authorization headers manually.
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
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = tokenStorage.getAccessToken();

  // Attach token if available — skip auth endpoints to avoid circular calls
  const isAuthEndpoint = req.url.includes('/auth/login') ||
                         req.url.includes('/auth/register') ||
                         req.url.includes('/auth/refresh');

  // If the tokens are expired and we have no valid refresh token, redirect immediately
  if (!isAuthEndpoint && tokenStorage.isRefreshTokenExpired()) {
    tokenStorage.clear();
    authService.logout().subscribe();
    router.navigate(['/auth/login']);
    return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
  }

  const authReq = token && !isAuthEndpoint
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 on non-auth endpoints: token likely expired — refresh and retry
      if (error.status === 401 && !isAuthEndpoint) {
        return authService.refreshToken().pipe(
          switchMap((res) => {
            const newToken = res.data?.accessToken;
            if (newToken) {
              const retriedReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
              });
              return next(retriedReq);
            }
            return throwError(() => error);
          }),
          catchError((refreshErr) => {
            authService.logout().subscribe();
            router.navigate(['/auth/login']);
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    }),
  );
};
