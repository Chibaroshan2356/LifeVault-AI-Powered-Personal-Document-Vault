/**
 * token-storage.service.ts — Token and User Persistence Abstraction
 *
 * All token and user cache reads/writes go through this service.
 */
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/models/auth.models';

const ACCESS_KEY  = environment.jwtKey;
const REFRESH_KEY = `${environment.jwtKey}_refresh`;
const USER_KEY    = `${environment.jwtKey}_user`;

@Injectable({ providedIn: 'root' })
export class TokenStorageService {

  saveTokens(accessToken: string, refreshToken: string, user?: User): void {
    localStorage.setItem(ACCESS_KEY,  accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  saveUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  saveAccessToken(token: string): void {
    localStorage.setItem(ACCESS_KEY, token);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }

  hasTokens(): boolean {
    return !!this.getAccessToken();
  }

  isTokenExpired(token: string | null): boolean {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.exp) return false;
      return Date.now() > (payload.exp * 1000);
    } catch {
      return true;
    }
  }

  isAccessTokenExpired(): boolean {
    return this.isTokenExpired(this.getAccessToken());
  }

  isRefreshTokenExpired(): boolean {
    return this.isTokenExpired(this.getRefreshToken());
  }
}
