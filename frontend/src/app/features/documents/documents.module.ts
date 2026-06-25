/**
 * DocumentsModule - Documents Feature Module
 *
 * Purpose: Document management functionality - upload, view, organize.
 * Lazy-loaded when user navigates to /documents.
 *
 * Planned Components:
 *  - DocumentListComponent    - Paginated list of documents
 *  - DocumentUploadComponent  - Drag-and-drop file upload
 *  - DocumentDetailComponent  - View OCR results and metadata
 *  - DocumentCardComponent    - Individual document card
 *
 * Planned Services:
 *  - DocumentService          - CRUD operations for documents
 *  - UploadService            - File upload with progress tracking
 *
 * Note: This module is a placeholder. Full implementation in documents sprint.
 */

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { DOCUMENTS_ROUTES } from './documents.routes';

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(DOCUMENTS_ROUTES),
  ],
  declarations: [
    // DocumentListComponent,    // TODO: Implement in documents sprint
    // DocumentUploadComponent,  // TODO: Implement in documents sprint
    // DocumentDetailComponent,  // TODO: Implement in documents sprint
  ],
})
export class DocumentsModule {}
