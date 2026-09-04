/**
 * auth.service.ts — Authentication Business Logic
 *
 * Handles:
 *  - Login, register, logout
 *  - Token refresh (invoked by JwtInterceptor)
 *  - User profile loading
 *  - Exposing reactive auth state via BehaviorSubject
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RefreshResponse,
  User,
  ApiResponse,
} from '../../../shared/models/auth.models';

export interface AuthState {
  isAuthenticated: boolean;
  user:            User | null;
  accessToken:     string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user:            null,
  accessToken:     null,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly usersUrl = `${environment.apiUrl}/users`;

  /** Reactive state — subscribe to know if user is logged in */
  private readonly _authState$ = new BehaviorSubject<AuthState>(initialState);
  readonly authState$ = this._authState$.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly tokenStorage: TokenStorageService,
    private readonly router: Router,
  ) {
    // Restore state from storage on app initialisation
    this.restoreSession();
  }

  // ------------------------------------------------------------------
  // Register — POST /auth/register
  // ------------------------------------------------------------------

  register(payload: RegisterRequest): Observable<ApiResponse<null>> {
    return this.http
      .post<ApiResponse<null>>(`${this.apiUrl}/register`, payload)
      .pipe(catchError(this.handleError));
  }

  // ------------------------------------------------------------------
  // Login — POST /auth/login
  // ------------------------------------------------------------------

  login(credentials: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap((res) => {
          if (res.success && res.data) {
            this.tokenStorage.saveTokens(
              res.data.accessToken,
              res.data.refreshToken,
              res.data.user,
            );
            this._authState$.next({
              isAuthenticated: true,
              user:            res.data.user,
              accessToken:     res.data.accessToken,
            });
          }
        }),
        catchError(this.handleError),
      );
  }

  // ------------------------------------------------------------------
  // Logout — POST /auth/logout
  // ------------------------------------------------------------------

  logout(): Observable<ApiResponse<null>> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    return this.http
      .post<ApiResponse<null>>(`${this.apiUrl}/logout`, { refreshToken })
      .pipe(
        tap(() => this.clearSession()),
        catchError(() => {
          // Even if the request fails, clear local state
          this.clearSession();
          return of({ success: true, message: 'Logged out', data: null });
        }),
      );
  }

  // ------------------------------------------------------------------
  // Refresh — POST /auth/refresh (called by JwtInterceptor)
  // ------------------------------------------------------------------

  refreshToken(): Observable<ApiResponse<RefreshResponse>> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    return this.http
      .post<ApiResponse<RefreshResponse>>(`${this.apiUrl}/refresh`, { refreshToken })
      .pipe(
        tap((res) => {
          if (res.success && res.data) {
            this.tokenStorage.saveAccessToken(res.data.accessToken);
            this._authState$.next({
              ...this._authState$.value,
              accessToken: res.data.accessToken,
            });
          }
        }),
        catchError(() => {
          this.clearSession();
          this.router.navigate(['/auth/login']);
          return throwError(() => new Error('Session expired'));
        }),
      );
  }

  // ------------------------------------------------------------------
  // Get profile — GET /users/profile
  // ------------------------------------------------------------------

  getProfile(): Observable<ApiResponse<User>> {
    return this.http
      .get<ApiResponse<User>>(`${this.usersUrl}/profile`)
      .pipe(
        tap((res) => {
          if (res.success && res.data) {
            this.tokenStorage.saveUser(res.data);
            this._authState$.next({
              ...this._authState$.value,
              user: res.data,
            });
          }
        }),
        catchError(this.handleError),
      );
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  get currentUser(): User | null {
    return this._authState$.value.user;
  }

  get isAuthenticated(): boolean {
    return this._authState$.value.isAuthenticated;
  }

  private clearSession(): void {
    this.tokenStorage.clear();
    this._authState$.next(initialState);
  }

  private restoreSession(): void {
    const token = this.tokenStorage.getAccessToken();
    const user  = this.tokenStorage.getUser();
    if (token) {
      this._authState$.next({
        isAuthenticated: true,
        user:            user || null,
        accessToken:     token,
      });
    }
  }

  private handleError(err: unknown): Observable<never> {
    return throwError(() => err);
  }
}
