/**
 * auth.guard.ts — Route Guard
 *
 * Protects routes that require authentication.
 * If the user has no token, redirects to /auth/login.
 *
 * Usage in app.routes.ts:
 *   { path: '', loadChildren: ..., canActivate: [authGuard] }
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorageService } from '../services/token-storage.service';

export const authGuard: CanActivateFn = () => {
  const tokenStorage = inject(TokenStorageService);
  const router       = inject(Router);

  if (tokenStorage.hasTokens()) {
    return true;
  }

  // Redirect to login — preserve attempted URL for post-login redirect
  return router.createUrlTree(['/auth/login']);
};
