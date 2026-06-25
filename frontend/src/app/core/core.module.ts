/**
 * CoreModule - Application Core Module
 *
 * Purpose: Contains singleton services, interceptors, and guards that should
 * be instantiated only once for the entire application.
 *
 * IMPORTANT: Import this module ONLY in AppModule.
 * Importing it in feature modules will create duplicate service instances.
 *
 * Contains:
 *  - HTTP Interceptors (JWT, error handling, loading)
 *  - Route Guards (auth, role-based)
 *  - Application-wide services
 *
 * The constructor guard pattern prevents accidental re-import.
 * If this module is imported in a lazy-loaded module, Angular will
 * throw an error in development mode.
 */

import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  /**
   * CommonModule: Provides NgIf, NgFor, etc.
   * Imported here so core components can use common Angular directives.
   */
  imports: [CommonModule],

  /**
   * providers: Services provided here are application-wide singletons.
   *
   * Future services to add:
   *   - { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
   *   - { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
   *   - { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true }
   */
  providers: [],

  /**
   * exports: Empty intentionally.
   * The CoreModule provides services (singletons), not components.
   * If core components are needed, export them here.
   */
  exports: [],
})
export class CoreModule {
  /**
   * Guard against reimporting the CoreModule.
   *
   * @param parentModule - The parent module (if any) that already imported CoreModule.
   * @throws Error if CoreModule is imported more than once.
   */
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error(
        'CoreModule is already loaded. Import it in the AppModule only.'
      );
    }
  }
}
