/**
 * token-storage.service.ts — Token Persistence Abstraction
 *
 * All token reads/writes go through this service.
 * If we move from localStorage to httpOnly cookies, only this file changes.
 *
 * Usage:
 *   tokenStorage.saveTokens(accessToken, refreshToken);
 *   tokenStorage.getAccessToken();
 *   tokenStorage.clear();
 */
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

const ACCESS_KEY  = environment.jwtKey;
const REFRESH_KEY = `${environment.jwtKey}_refresh`;

@Injectable({ providedIn: 'root' })
export class TokenStorageService {

  saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_KEY,  accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
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
  }

  hasTokens(): boolean {
    return !!this.getAccessToken();
  }
}
