/**
 * DashboardModule - Dashboard Feature Module
 *
 * Purpose: The main overview page shown after user login.
 * Lazy-loaded when user navigates to /dashboard.
 *
 * Planned Components:
 *  - DashboardComponent       - Main dashboard container
 *  - StatsCardComponent       - Document count, expiry stats
 *  - RecentDocumentsComponent - Latest uploaded documents
 *  - ExpiryAlertsComponent    - Documents expiring soon
 *
 * Note: This module is a placeholder. Full implementation in dashboard sprint.
 */

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { DASHBOARD_ROUTES } from './dashboard.routes';

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(DASHBOARD_ROUTES),
  ],
  declarations: [
    // DashboardComponent,  // TODO: Implement in dashboard sprint
  ],
})
export class DashboardModule {}
