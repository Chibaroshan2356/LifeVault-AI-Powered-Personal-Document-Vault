/**
 * Angular Application Entry Point
 *
 * Purpose: Bootstrap the Angular application.
 * This file initializes the platform and loads the root AppModule.
 *
 * Flow:
 *  1. Platform Browser Dynamic creates the browser platform
 *  2. AppModule is bootstrapped with all its dependencies
 *  3. Angular takes over the root element defined in index.html
 */

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Enable production mode to disable development-specific checks
// and optimizations for better performance in production.
if (environment.production) {
  enableProdMode();
}

// Bootstrap the root module, which starts the Angular application.
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error('Error bootstrapping application:', err));
