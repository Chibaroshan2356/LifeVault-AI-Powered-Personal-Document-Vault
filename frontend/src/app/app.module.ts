/**
 * AppModule - Root Application Module
 *
 * Purpose: The root module that bootstraps the Angular application.
 * This is the top-level module that ties all other modules together.
 *
 * Responsibilities:
 *  - Importing and declaring the root component
 *  - Importing global modules (BrowserModule, RouterModule)
 *  - Importing the CoreModule (singleton services)
 *  - Configuring the router with top-level routes
 *
 * Design Decision:
 *  - CoreModule is imported here (only once) to ensure singleton services
 *  - Feature modules are lazy-loaded via routing for better performance
 *  - SharedModule is NOT imported here; only feature modules import it as needed
 */

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { APP_ROUTES } from './app.routes';

@NgModule({
  /**
   * declarations: Components, directives, and pipes that belong to this module.
   * Only the root component lives here; feature components go in their own modules.
   */
  declarations: [AppComponent],

  /**
   * imports: Other modules whose exported classes are needed by component templates.
   *
   * BrowserModule: Provides browser-specific services (DOM rendering, etc.)
   *                Must be imported only in the root module (use CommonModule in feature modules).
   *
   * BrowserAnimationsModule: Required for Angular Material animations.
   *
   * HttpClientModule: Provides HttpClient for making HTTP requests.
   *                   Imported here so all feature modules can inject HttpClient.
   *
   * RouterModule.forRoot(): Sets up the application-level router with top-level routes.
   *                          Feature modules use RouterModule.forChild() instead.
   */
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule.forRoot(APP_ROUTES, {
      // Enable scroll position restoration when navigating back
      scrollPositionRestoration: 'enabled',
      // Use hash-based routing for better compatibility with static hosts (optional)
      // useHash: true
    }),
  ],

  /**
   * providers: Services that are available application-wide.
   * Prefer providedIn: 'root' in @Injectable for tree-shaking benefits.
   */
  providers: [],

  /**
   * bootstrap: The root component that Angular creates and inserts
   * into the index.html host web page.
   */
  bootstrap: [AppComponent],
})
export class AppModule {}
