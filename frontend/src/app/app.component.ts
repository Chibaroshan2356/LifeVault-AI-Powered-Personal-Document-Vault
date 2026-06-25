/**
 * AppComponent - Root Component
 *
 * Purpose: The root component of the LifeVault application.
 * This is the entry point that Angular bootstraps into index.html.
 *
 * Responsibilities:
 *  - Serves as the application shell
 *  - Contains the <router-outlet> where feature components are rendered
 *  - Handles top-level layout (navigation, sidebar, footer)
 *
 * Architecture Note:
 *  - Kept minimal during foundation phase
 *  - Navigation and layout components will be added in subsequent modules
 */

import { Component } from '@angular/core';

@Component({
  /**
   * selector: Matches the <app-root> element in index.html.
   * Angular replaces this element with the component template.
   */
  selector: 'app-root',

  /**
   * templateUrl: External HTML template for better separation of concerns.
   * Inline templates are acceptable for very small components.
   */
  templateUrl: './app.component.html',

  /**
   * styleUrls: Component-scoped styles.
   * Angular encapsulates these styles so they don't leak to other components.
   */
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  /**
   * Application title - used in page titles and metadata.
   */
  title = 'LifeVault';
}
