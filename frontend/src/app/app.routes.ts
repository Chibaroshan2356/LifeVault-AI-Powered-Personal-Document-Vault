/**
 * app.routes.ts — Top-Level Route Definitions
 *
 * Route hierarchy:
 *  /auth/login     → LoginComponent      (public)
 *  /auth/register  → RegisterComponent   (public)
 *  /dashboard      → DashboardPlaceholder (protected — Sprint 8)
 *  /documents      → DocumentsPlaceholder (protected — Sprint 2+)
 *  **              → NotFoundComponent
 *
 * Protected routes are guarded by authGuard.
 * Feature components are placeholders until their sprint is implemented.
 */
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Default: redirect to login
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  // Public: auth pages
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Protected: dashboard placeholder (implemented in Sprint 8)
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.placeholder').then(
        (m) => m.DashboardPlaceholderComponent,
      ),
    title: 'LifeVault – Dashboard',
  },

  // Protected: documents (implemented in Sprint 2)
  {
    path: 'documents',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/documents/documents.routes').then((m) => m.DOCUMENTS_ROUTES),
    title: 'LifeVault – Documents',
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
