/**
 * Application Routes - Top-Level Routing Configuration
 *
 * Purpose: Defines the main application routes with lazy loading.
 * Each feature module is lazy-loaded to improve initial bundle size
 * and application performance.
 *
 * Route Structure:
 *  /auth          → Authentication (login, register)
 *  /dashboard     → Main dashboard (protected)
 *  /documents     → Document management (protected)
 *  /search        → Search interface (protected)
 *  /              → Redirects to dashboard
 *  **             → 404 Not Found
 *
 * Design Decisions:
 *  - Lazy loading via loadChildren reduces initial bundle size
 *  - Auth guard (to be implemented) protects private routes
 *  - Redirect from empty path handles default navigation
 */

import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  /**
   * Default redirect: navigates to dashboard when accessing root URL.
   * pathMatch: 'full' ensures only the exact empty path triggers this redirect.
   */
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },

  /**
   * Authentication routes (login, register, forgot password).
   * Not protected by auth guard - accessible to unauthenticated users.
   * Lazy loaded for smaller initial bundle.
   */
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.module').then((m) => m.AuthModule),
    title: 'LifeVault - Sign In',
  },

  /**
   * Dashboard route - main overview page.
   * Will be protected by AuthGuard when implemented.
   */
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.module').then(
        (m) => m.DashboardModule
      ),
    title: 'LifeVault - Dashboard',
    // canActivate: [AuthGuard],  // Uncomment when AuthGuard is implemented
  },

  /**
   * Documents route - upload, view, and manage documents.
   * Will be protected by AuthGuard when implemented.
   */
  {
    path: 'documents',
    loadChildren: () =>
      import('./features/documents/documents.module').then(
        (m) => m.DocumentsModule
      ),
    title: 'LifeVault - Documents',
    // canActivate: [AuthGuard],  // Uncomment when AuthGuard is implemented
  },

  /**
   * Search route - intelligent document search.
   * Will be protected by AuthGuard when implemented.
   */
  {
    path: 'search',
    loadChildren: () =>
      import('./features/search/search.module').then((m) => m.SearchModule),
    title: 'LifeVault - Search',
    // canActivate: [AuthGuard],  // Uncomment when AuthGuard is implemented
  },

  /**
   * Wildcard route: catches all unmatched paths.
   * Redirects to a 404 page (or dashboard as fallback during development).
   *
   * TODO: Create a dedicated NotFoundComponent for better UX.
   */
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
