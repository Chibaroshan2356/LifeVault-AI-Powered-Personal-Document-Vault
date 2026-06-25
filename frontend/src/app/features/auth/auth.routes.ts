/**
 * auth.routes.ts - Auth Routes
 *
 * Public routes, no guard needed.
 * Components are placeholders — implemented in the auth sprint.
 *
 * Routes:
 *  /auth/login    → LoginComponent
 *  /auth/register → RegisterComponent
 */
import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  // {
  //   path: 'login',
  //   loadComponent: () =>
  //     import('./login/login.component').then((m) => m.LoginComponent),
  //   title: 'LifeVault – Sign In',
  // },
  // {
  //   path: 'register',
  //   loadComponent: () =>
  //     import('./register/register.component').then((m) => m.RegisterComponent),
  //   title: 'LifeVault – Create Account',
  // },
];
