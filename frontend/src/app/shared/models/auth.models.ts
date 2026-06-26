/**
 * auth.models.ts — Shared Auth TypeScript Interfaces
 *
 * These interfaces mirror the backend API contract exactly.
 * If the API changes, update here first — TypeScript will surface
 * every broken reference in the codebase.
 */

export interface User {
  _id:             string;
  fullName:        string;
  email:           string;
  role:            'user' | 'admin';
  isActive:        boolean;
  isEmailVerified: boolean;
  lastLoginAt:     string | null;
  avatar:          string | null;
  createdAt:       string;
  updatedAt:       string;
}

export interface LoginResponse {
  user:         User;
  accessToken:  string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

/** Shape of the AuthState held in AuthService */
export interface AuthState {
  isAuthenticated: boolean;
  user:            User | null;
  accessToken:     string | null;
}

/** Register request payload */
export interface RegisterRequest {
  fullName: string;
  email:    string;
  password: string;
}

/** Login request payload */
export interface LoginRequest {
  email:    string;
  password: string;
}
