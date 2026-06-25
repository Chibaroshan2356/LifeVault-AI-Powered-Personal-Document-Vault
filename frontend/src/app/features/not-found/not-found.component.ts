/**
 * NotFoundComponent - 404 Page
 *
 * Standalone component. Shown for any unmatched route.
 * Kept intentionally minimal — no dependencies.
 */
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="not-found">
      <h1>404</h1>
      <p>Page not found.</p>
      <a routerLink="/auth/login">← Back to Login</a>
    </div>
  `,
  styles: [`
    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: Roboto, sans-serif;
      gap: 1rem;
    }
    h1 { font-size: 6rem; margin: 0; color: #3f51b5; }
    p  { color: #666; font-size: 1.25rem; margin: 0; }
    a  { color: #3f51b5; text-decoration: none; }
    a:hover { text-decoration: underline; }
  `],
})
export class NotFoundComponent {}
