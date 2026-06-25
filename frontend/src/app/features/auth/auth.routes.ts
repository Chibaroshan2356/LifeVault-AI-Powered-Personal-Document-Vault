/**
 * Auth Routes
 *
 * Purpose: Defines the child routes for the authentication feature.
 * These routes are loaded lazily when the user visits /auth paths.
 *
 * Route Structure:
 *  /auth            → Redirects to /auth/login
 *  /auth/login      → LoginComponent (TODO)
 *  /auth/register   → RegisterComponent (TODO)
 *
 * Note: Placeholder routes until auth components are implemented.
 */

import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  /**
   * Login route - TODO: Add LoginComponent when implemented
   */
  // {
  //   path: 'login',
  //   component: LoginComponent,
  //   title: 'LifeVault - Sign In',
  // },
  /**
   * Register route - TODO: Add RegisterComponent when implemented
   */
  // {
  //   path: 'register',
  //   component: RegisterComponent,
  //   title: 'LifeVault - Create Account',
  // },
];
