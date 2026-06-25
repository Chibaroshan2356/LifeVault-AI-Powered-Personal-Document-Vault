/**
 * AppComponent - Root Component
 *
 * Minimal shell. Only imports RouterOutlet.
 * Every feature is lazy-loaded through the router.
 */
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'LifeVault';
}
