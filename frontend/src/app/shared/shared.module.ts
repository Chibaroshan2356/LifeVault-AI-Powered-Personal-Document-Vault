/**
 * SharedModule - Shared Module
 *
 * Purpose: Contains shared components, directives, pipes, and Angular Material
 * module exports that are used across multiple feature modules.
 *
 * Unlike CoreModule (singleton services), SharedModule can be imported
 * in multiple feature modules without causing duplicate instances.
 *
 * Contains:
 *  - Reusable UI components (loading spinner, error messages, confirmation dialogs)
 *  - Custom directives (drag-and-drop, auto-resize, etc.)
 *  - Custom pipes (file size, date format, truncate, etc.)
 *  - Angular Material module re-exports
 *
 * Usage in feature modules:
 *   imports: [SharedModule]
 *
 * Design Decision:
 *  Centralizing Material module imports here avoids repeating them in every
 *  feature module. Feature modules only need to import SharedModule.
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Angular Material Modules
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';

/**
 * All Angular Material modules centralized here for easy management.
 * Add new material modules to this array as needed.
 */
const MATERIAL_MODULES = [
  MatButtonModule,
  MatCardModule,
  MatInputModule,
  MatFormFieldModule,
  MatIconModule,
  MatToolbarModule,
  MatSidenavModule,
  MatListModule,
  MatMenuModule,
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  MatDialogModule,
  MatSnackBarModule,
  MatProgressSpinnerModule,
  MatProgressBarModule,
  MatChipsModule,
  MatBadgeModule,
  MatTooltipModule,
  MatSelectModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatExpansionModule,
  MatTabsModule,
  MatDividerModule,
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    ...MATERIAL_MODULES,
  ],

  /**
   * declarations: Shared components, directives, and pipes go here.
   * Future additions:
   *  - LoadingSpinnerComponent
   *  - ErrorMessageComponent
   *  - ConfirmDialogComponent
   *  - FileSizePipe
   *  - DateFormatPipe
   *  - DragDropDirective
   */
  declarations: [],

  /**
   * exports: Everything that feature modules need access to.
   * Export all imports so feature modules only need to import SharedModule.
   */
  exports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    ...MATERIAL_MODULES,
  ],
})
export class SharedModule {}
