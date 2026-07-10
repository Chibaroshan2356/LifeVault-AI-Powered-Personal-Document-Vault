/**
 * app.routes.ts — Top-Level Route Definitions
 *
 * Route hierarchy:
 *  /auth/login       → LoginComponent      (public)
 *  /auth/register    → RegisterComponent   (public)
 *  /dashboard        → DashboardComponent  (protected)
 *  /documents        → Document feature    (protected)
 *  /documents/search → DocumentSearchComponent (protected, aliased at /search)
 *  /search           → redirect → /documents/search (convenience alias)
 *  **                → NotFoundComponent
 *
 * Protected routes are guarded by authGuard.
 */
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Default redirect
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Public: auth pages
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Protected Shell
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
        title: 'LifeVault – Dashboard',
      },
      {
        path: 'documents',
        loadChildren: () =>
          import('./features/documents/documents.routes').then((m) => m.DOCUMENTS_ROUTES),
        title: 'LifeVault – Documents',
      },
    ]
  },

  // Convenience alias: /search → /documents/search
  {
    path: 'search',
    redirectTo: 'documents/search',
    pathMatch: 'full',
  },

  // 404
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
    title: 'LifeVault – Not Found',
  },
];

