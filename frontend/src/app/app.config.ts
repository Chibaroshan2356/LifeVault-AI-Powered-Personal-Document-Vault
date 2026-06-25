/**
 * app.config.ts - Application Bootstrap Configuration
 *
 * Standalone app providers replace the old AppModule.
 * Add global providers here: router, http, animations.
 */
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withScrollRestoration } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Router with scroll position restored on back/forward navigation
    provideRouter(routes, withScrollRestoration()),

    // Global HTTP client — interceptors (JWT, error) will be wired here later
    provideHttpClient(
      // withInterceptors([jwtInterceptor, errorInterceptor])  // added in auth sprint
    ),

    // Angular Material animations
    provideAnimations(),
  ],
};
