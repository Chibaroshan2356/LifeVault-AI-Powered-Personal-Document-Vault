import { Routes } from '@angular/router';

export const SMART_FOLDERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./list/smart-folders-list.component').then((m) => m.SmartFoldersListComponent),
    title: 'LifeVault – Smart Folders',
  },
  {
    path: ':name',
    loadComponent: () =>
      import('./detail/smart-folder-detail.component').then((m) => m.SmartFolderDetailComponent),
    title: 'LifeVault – Smart Folder',
  },
];
