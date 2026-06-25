/**
 * layout.routes.ts - Protected App Shell Routes
 *
 * All authenticated pages nest under a LayoutComponent that provides
 * the top navigation bar and sidebar. This avoids repeating nav markup
 * in every feature component.
 *
 * Routes:
 *  /dashboard  → DashboardComponent
 *  /documents  → DocumentsComponent
 *  /search     → SearchComponent
 *
 * The LayoutComponent itself is implemented in the layout sprint.
 */
import { Routes } from '@angular/router';

export const LAYOUT_ROUTES: Routes = [
  // {
  //   path: '',
  //   loadComponent: () =>
  //     import('./layout.component').then((m) => m.LayoutComponent),
  //   children: [
  //     { path: 'dashboard', loadChildren: () => import('../dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES) },
  //     { path: 'documents', loadChildren: () => import('../documents/documents.routes').then(m => m.DOCUMENTS_ROUTES) },
  //     { path: 'search',    loadChildren: () => import('../search/search.routes').then(m => m.SEARCH_ROUTES) },
  //   ],
  // },
];
