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

  const isAuthEndpoint = req.url.includes('/auth/login') ||
                         req.url.includes('/auth/register') ||
                         req.url.includes('/auth/refresh');

  const isLogoutRequest = req.url.includes('/auth/logout');

  // Skip token attachment for login, register, and refresh endpoints
  if (isAuthEndpoint) {
    return next(req);
  }

  // Attach access token to outgoing request if available
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  // If it is a logout request, process directly without any refresh or recursive logout fallback checks
  if (isLogoutRequest) {
    return next(authReq);
  }

  // If the refresh token is expired, clear local storage and redirect immediately
  if (tokenStorage.isRefreshTokenExpired()) {
    tokenStorage.clear();
    authService.logout().subscribe({
      next: () => {},
      error: () => {}
    });
    router.navigate(['/auth/login']);
    return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 on non-auth endpoints: access token expired — refresh and retry
      if (error.status === 401) {
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
            // Refresh failed: session invalid — perform local clear and redirect
            authService.logout().subscribe({
              next: () => {},
              error: () => {}
            });
            router.navigate(['/auth/login']);
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    }),
  );
};
