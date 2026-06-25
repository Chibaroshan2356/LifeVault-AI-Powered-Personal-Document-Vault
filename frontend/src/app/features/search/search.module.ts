/**
 * SearchModule - Search Feature Module
 *
 * Purpose: AI-powered intelligent document search functionality.
 * Lazy-loaded when user navigates to /search.
 *
 * Planned Components:
 *  - SearchComponent          - Main search interface
 *  - SearchResultsComponent   - Display search results
 *  - SearchFiltersComponent   - Advanced filter panel
 *
 * Planned Services:
 *  - SearchService            - Query the backend search API
 *
 * Note: This module is a placeholder. Full implementation in search sprint.
 */

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { SEARCH_ROUTES } from './search.routes';

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(SEARCH_ROUTES),
  ],
  declarations: [
    // SearchComponent,  // TODO: Implement in search sprint
  ],
})
export class SearchModule {}
