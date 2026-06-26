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

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const token = tokenStorage.getAccessToken();

  // Attach token if available — skip auth endpoints to avoid circular calls
  const isAuthEndpoint = req.url.includes('/auth/login') ||
                         req.url.includes('/auth/register') ||
                         req.url.includes('/auth/refresh');

  const authReq = token && !isAuthEndpoint
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 on non-auth endpoints: token likely expired — handled by AuthService.refreshToken()
      // Full refresh logic (auto-retry) will be added in Sprint 2 when needed
      return throwError(() => error);
    }),
  );
};
