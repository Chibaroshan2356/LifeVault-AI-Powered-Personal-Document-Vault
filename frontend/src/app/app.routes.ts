/**
 * app.routes.ts - Top-Level Route Definitions
 *
 * Structure:
 *  /auth        → AuthModule  (login, register)  — public
 *  /            → LayoutModule (shell + child routes) — protected
 *    /dashboard   → DashboardModule
 *    /documents   → DocumentsModule
 *    /search      → SearchModule
 *  **           → 404 NotFoundComponent
 *
 * Notes:
 *  - All protected routes will nest inside a LayoutModule that provides
 *    the nav sidebar. This avoids repeating the nav in every feature.
 *  - canActivate: [authGuard] added to protected routes in the auth sprint.
 *  - Feature modules are lazy-loaded to keep the initial bundle small.
 */
import { Routes } from '@angular/router';

export const routes: Routes = [
  // Default redirect
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  // Public routes
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
    title: 'LifeVault – Sign In',
  },

  // Protected app shell (layout with sidebar + nav)
  // Will be protected by authGuard in the auth sprint
  {
    path: '',
    loadChildren: () =>
      import('./features/layout/layout.routes').then((m) => m.LAYOUT_ROUTES),
    // canActivate: [authGuard],
  },

  // 404
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
    title: 'LifeVault – Page Not Found',
  },
];
