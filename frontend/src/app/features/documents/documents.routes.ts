/**
 * documents.routes.ts — Document Feature Routes
 */
import { Routes } from '@angular/router';

export const DOCUMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./list/document-list.component').then((m) => m.DocumentListComponent),
    title: 'LifeVault – My Documents',
  },
  {
    path: 'upload',
    loadComponent: () =>
      import('./upload/document-upload.component').then((m) => m.DocumentUploadComponent),
    title: 'LifeVault – Upload Document',
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./search/document-search.component').then((m) => m.DocumentSearchComponent),
    title: 'LifeVault – Search Documents',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./detail/document-detail.component').then((m) => m.DocumentDetailComponent),
    title: 'LifeVault – Document Detail',
  },
];
