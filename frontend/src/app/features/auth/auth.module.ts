/**
 * AuthModule - Authentication Feature Module
 *
 * Purpose: Handles all authentication-related functionality.
 * Lazy-loaded when user navigates to /auth routes.
 *
 * Planned Components:
 *  - LoginComponent      - User login form
 *  - RegisterComponent   - New user registration
 *  - ForgotPasswordComponent  - Password reset flow
 *
 * Planned Services:
 *  - AuthService         - Login/register/logout logic
 *  - TokenService        - JWT token management
 *
 * Routes (defined in auth.routes.ts):
 *  /auth/login          → LoginComponent
 *  /auth/register       → RegisterComponent
 *  /auth/forgot-password → ForgotPasswordComponent
 *
 * Note: This module is a placeholder. Full implementation in next sprint.
 */

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AUTH_ROUTES } from './auth.routes';

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(AUTH_ROUTES),
  ],
  declarations: [
    // LoginComponent,       // TODO: Implement in auth module sprint
    // RegisterComponent,    // TODO: Implement in auth module sprint
  ],
})
export class AuthModule {}
