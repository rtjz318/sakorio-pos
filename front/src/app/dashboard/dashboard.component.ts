import { Component, inject, OnDestroy, OnInit, computed, signal, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SidebarComponent } from '../shared/sidebar.component';
import { TranslateModule } from '@ngx-translate/core';
import { PermissionService } from '../services/permission.service';
import {
  ApiService,
  CanvasTable,
  GuestQueueSummary,
  SalesReport,
  TenantUiModuleKey,
  WorkSession,
  workSessionOpenExceedsContract,
} from '../services/api.service';

type DashboardReservationArrival = {
  tableId: number;
  tableName: string;
  guestName: string;
  minutesUntil: number;
  timeLabel: string;
  urgencyLabel: string;
  urgencyTone: 'due' | 'soon' | 'upcoming';
};

type DashboardQueueHealth = NonNullable<SalesReport['queue']>;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, RouterLink, TranslateModule],
  template: `
    <app-sidebar>
        <div class="page-header">
          <h1>{{ 'DASHBOARD.TITLE' | translate }}</h1>
        </div>

        <div class="welcome-section">
          <h2>{{ 'DASHBOARD.WELCOME_BACK' | translate }}</h2>
          <p class="welcome-text">{{ 'DASHBOARD.WELCOME_TEXT' | translate }}</p>
        </div>

        <div class="quick-actions">
          <button type="button" class="action-card action-card-whats-new" (click)="openChangelog()" data-testid="dashboard-whats-new">
            <div class="action-icon action-icon-whats-new">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.WHATS_NEW_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.WHATS_NEW_DESC' | translate }}</span>
          </button>
          @if (canViewMyShift()) {
            <a routerLink="/my-shift" class="action-card" data-testid="dashboard-my-shift">
              <div class="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <span class="action-label">{{ 'DASHBOARD.MY_SHIFT_TITLE' | translate }}</span>
              @if (shiftStatusLoading()) {
                <span class="action-desc">{{ 'DASHBOARD.MY_SHIFT_LOADING' | translate }}</span>
              } @else if (shiftOpen(); as sh) {
                <span class="action-desc action-desc-shift-on">{{ 'DASHBOARD.MY_SHIFT_DESC_ON' | translate }}</span>
                @if (shiftExceedsContract()) {
                  <span class="action-desc action-desc-shift-overtime" data-testid="dashboard-my-shift-overtime">{{
                    'DASHBOARD.MY_SHIFT_OVERTIME' | translate
                  }}</span>
                }
              } @else {
                <span class="action-desc">{{ 'DASHBOARD.MY_SHIFT_DESC_OFF' | translate }}</span>
              }
            </a>
          }
          @if (canViewPos()) {
            <a routerLink="/pos" class="action-card" data-testid="dashboard-pos">
              <div class="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="16" rx="2"/>
                  <path d="M7 8h10M7 12h4M16 16h1"/>
                </svg>
              </div>
              <span class="action-label">Cashier POS</span>
              <span class="action-desc">Launch the live cashier shell for tables, menu access, and checkouts.</span>
            </a>
          }
          <a routerLink="/staff/orders" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.ORDERS_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.ORDERS_DESC' | translate }}</span>
          </a>
          @if (canViewReservations() && moduleEnabled('reservations')) {
          <a routerLink="/reservations" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.RESERVATIONS_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.RESERVATIONS_DESC' | translate }}</span>
          </a>
          }
          @if (canViewQueue() && moduleEnabled('reservations')) {
          <a routerLink="/queue" class="action-card" data-testid="dashboard-queue">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M3 16v5h5"/><path d="M21 16v5h-5"/>
                <path d="M8 8h8v8H8z"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.QUEUE_TITLE' | translate }}</span>
            @if (queueSummary(); as queue) {
              <span class="action-desc">{{ queue.waiting_guests }} waiting • {{ queue.notified_guests }} notified</span>
            } @else {
              <span class="action-desc">{{ 'DASHBOARD.QUEUE_DESC' | translate }}</span>
            }
          </a>
          }
          @if (canViewTables() && moduleEnabled('tables')) {
          <a routerLink="/tables" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.TABLES_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.TABLES_DESC' | translate }}</span>
          </a>
          }
          @if (moduleEnabled('kitchen_bar')) {
          <a routerLink="/kitchen" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M6 8h.01M10 8h.01M14 8h.01M6 12h12M6 16h8"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.KITCHEN_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.KITCHEN_DESC' | translate }}</span>
          </a>
          <a routerLink="/bar" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
                <path d="M9 14h6M9 18h6"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.BEVERAGES_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.BEVERAGES_DESC' | translate }}</span>
          </a>
          }
          <a routerLink="/products" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.PRODUCTS_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.PRODUCTS_DESC' | translate }}</span>
          </a>
          @if (moduleEnabled('providers')) {
          <a routerLink="/catalog" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.CATALOG_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.CATALOG_DESC' | translate }}</span>
          </a>
          }
          @if (canViewCustomers()) {
          <a routerLink="/customers" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.CUSTOMERS_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.CUSTOMERS_DESC' | translate }}</span>
          </a>
          }
          @if (canShowAdminSections()) {
            @if (moduleEnabled('working_plan')) {
            <a routerLink="/working-plan" class="action-card">
              <div class="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <span class="action-label">{{ 'DASHBOARD.WORKING_PLAN_TITLE' | translate }}</span>
              <span class="action-desc">{{ 'DASHBOARD.WORKING_PLAN_DESC' | translate }}</span>
            </a>
            }
            @if (moduleEnabled('inventory')) {
            <a routerLink="/inventory" class="action-card">
              <div class="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                  <polyline points="7.5 4.21 12 6.81 16.5 4.21"/>
                </svg>
              </div>
              <span class="action-label">{{ 'DASHBOARD.INVENTORY_TITLE' | translate }}</span>
              <span class="action-desc">{{ 'DASHBOARD.INVENTORY_DESC' | translate }}</span>
            </a>
            }
            <a routerLink="/reports" class="action-card">
              <div class="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <span class="action-label">{{ 'DASHBOARD.REPORTS_TITLE' | translate }}</span>
              <span class="action-desc">{{ 'DASHBOARD.REPORTS_DESC' | translate }}</span>
            </a>
            <a routerLink="/users" class="action-card">
              <div class="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <span class="action-label">{{ 'DASHBOARD.USERS_TITLE' | translate }}</span>
              <span class="action-desc">{{ 'DASHBOARD.USERS_DESC' | translate }}</span>
            </a>
            <a routerLink="/settings" class="action-card">
              <div class="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
              </div>
              <span class="action-label">{{ 'DASHBOARD.SETTINGS_TITLE' | translate }}</span>
              <span class="action-desc">{{ 'DASHBOARD.SETTINGS_DESC' | translate }}</span>
            </a>
          }
        </div>

        @if (canViewQueue() && moduleEnabled('reservations') && queueSummary(); as queue) {
          <section class="queue-pulse" data-testid="dashboard-queue-pulse">
            <div class="queue-pulse-header">
              <div>
                <h2>Host stand pulse</h2>
                <p>Keep the queue, tables, and reservation arrivals aligned from one service view.</p>
              </div>
              <a routerLink="/queue" class="queue-pulse-link">Open queue</a>
            </div>

            <div class="queue-pulse-grid">
              <a routerLink="/queue" class="queue-pulse-card queue-pulse-card--waiting">
                <span class="queue-pulse-label">Waiting now</span>
                <strong>{{ queue.waiting_guests }}</strong>
                <small>Guests still waiting to be seated</small>
              </a>

              <a routerLink="/queue" class="queue-pulse-card queue-pulse-card--notified">
                <span class="queue-pulse-label">Called forward</span>
                <strong>{{ queue.notified_guests }}</strong>
                <small>Guests notified and expected back</small>
              </a>

              <a routerLink="/queue" class="queue-pulse-card">
                <span class="queue-pulse-label">Open queue</span>
                <strong>{{ queueCount(queue, 'waiting') + queueCount(queue, 'notified') }}</strong>
                <small>Active entries currently in play</small>
              </a>

              <a routerLink="/queue" class="queue-pulse-card">
                <span class="queue-pulse-label">Seated today</span>
                <strong>{{ queueCount(queue, 'seated') }}</strong>
                <small>Guests already handed into the floor</small>
              </a>
            </div>

            @if (queueReadyTableCount() || dashboardReservationArrivals().length) {
              <div class="queue-pulse-ops">
                <div class="queue-pulse-readiness">
                  <div class="queue-pulse-readiness-card">
                    <span class="queue-pulse-label">Ready tables now</span>
                    <strong>{{ queueReadyTableCount() }}</strong>
                    <small>{{ queueReadyTableMessage() }}</small>
                  </div>

                  <div class="queue-pulse-readiness-card">
                    <span class="queue-pulse-label">Reservation arrivals</span>
                    <strong>{{ dashboardReservationArrivals().length }}</strong>
                    <small>{{ reservationArrivalMessage() }}</small>
                  </div>
                </div>

                @if (dashboardReservationArrivals().length) {
                  <div class="queue-pulse-arrivals">
                    <div class="queue-pulse-arrivals-header">
                      <span class="queue-pulse-label">Landing soon</span>
                      <span class="queue-pulse-arrivals-caption">Protect these tables before seating the next walk-in.</span>
                    </div>
                    <div class="queue-pulse-arrivals-list">
                      @for (arrival of dashboardReservationArrivals(); track arrival.tableId) {
                        <div class="queue-pulse-arrival-row">
                          <div class="queue-pulse-arrival-copy">
                            <strong>{{ arrival.guestName }}</strong>
                            <span>{{ arrival.tableName }} • {{ arrival.timeLabel }}</span>
                          </div>
                          <span
                            class="queue-pulse-arrival-chip"
                            [class.queue-pulse-arrival-chip--due]="arrival.urgencyTone === 'due'"
                            [class.queue-pulse-arrival-chip--soon]="arrival.urgencyTone === 'soon'"
                          >
                            {{ arrival.urgencyLabel }}
                          </span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            <div class="queue-pulse-footer">
              <p>{{ queueStatusMessage(queue) }}</p>
              <div class="queue-pulse-actions">
                @if (canViewTables()) {
                  <a routerLink="/tables" class="queue-pulse-inline-link">Open floor board</a>
                }
                @if (canViewReservations()) {
                  <a routerLink="/reservations" class="queue-pulse-inline-link">Check reservations</a>
                }
              </div>
            </div>
          </section>
        }

        @if (canViewReports() && canViewQueue() && moduleEnabled('reservations') && queueHealth(); as summary) {
          <section class="queue-health" data-testid="dashboard-queue-health">
            <div class="queue-health-header">
              <div>
                <h2>Queue health</h2>
                <p>Owner rollup for the last 7 days so service leaders can spot queue pressure before it hits the floor.</p>
              </div>
              <a routerLink="/reports" class="queue-pulse-link">Open reports</a>
            </div>

            <div class="queue-health-grid">
              <div class="queue-health-card">
                <span class="queue-pulse-label">Queue entries</span>
                <strong>{{ summary.total }}</strong>
                <small>{{ queueHealthTotalMessage(summary) }}</small>
              </div>

              <div class="queue-health-card">
                <span class="queue-pulse-label">Avg quoted wait</span>
                <strong>{{ summary.average_quoted_wait_minutes }} min</strong>
                <small>What staff promised at the host stand.</small>
              </div>

              <div class="queue-health-card">
                <span class="queue-pulse-label">Avg actual wait</span>
                <strong>{{ summary.average_actual_wait_minutes }} min</strong>
                <small>What guests actually experienced before seating.</small>
              </div>

              <div class="queue-health-card">
                <span class="queue-pulse-label">Seated conversion</span>
                <strong>{{ formatPct(summary.seat_conversion_pct, summary.total) }}</strong>
                <small>{{ summary.seated_count }} guests moved from queue into live tables.</small>
              </div>
            </div>

            <div class="queue-health-insights">
              <div class="queue-health-insight">
                <span class="queue-pulse-label">Top source</span>
                <strong>{{ queueHealthPrimarySource(summary) }}</strong>
                <small>Highest-volume queue channel in the current report window.</small>
              </div>

              <div class="queue-health-insight">
                <span class="queue-pulse-label">Peak day</span>
                <strong>{{ queueHealthPeakDayLabel(summary) }}</strong>
                <small>{{ queueHealthPeakDayMessage(summary) }}</small>
              </div>

              <div class="queue-health-insight">
                <span class="queue-pulse-label">Reservation saves</span>
                <strong>{{ summary.converted_to_reservation_count }}</strong>
                <small>{{ formatPct(summary.converted_to_reservation_pct, summary.total) }} converted into planned bookings.</small>
              </div>

              <div class="queue-health-insight">
                <span class="queue-pulse-label">Losses</span>
                <strong>{{ summary.cancelled_count + summary.no_show_count + summary.expired_count }}</strong>
                <small>{{ queueHealthLossMessage(summary) }}</small>
              </div>
            </div>
          </section>
        }

        <div class="help-section">
          <h2 class="help-title">{{ 'DASHBOARD.HELP_TITLE' | translate }}</h2>
          <p class="help-desc">{{ 'DASHBOARD.HELP_DESC' | translate }}</p>
          <p class="help-invite">{{ 'DASHBOARD.HELP_INVITE' | translate }}</p>
          <div class="help-links">
            <a href="https://github.com/tanjunnan0101/pos/issues" target="_blank" rel="noopener noreferrer" class="help-link">
              {{ 'DASHBOARD.HELP_ISSUES' | translate }}
            </a>
            <a href="https://github.com/tanjunnan0101/pos/discussions" target="_blank" rel="noopener noreferrer" class="help-link">
              {{ 'DASHBOARD.HELP_DISCUSSIONS' | translate }}
            </a>
          </div>
        </div>

        @if (showChangelogModal()) {
          <div class="changelog-overlay" (click)="closeChangelog()" role="button" tabindex="0" data-testid="changelog-overlay">
            <div class="changelog-modal" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="changelog-title">
              <div class="changelog-header">
                <h2 id="changelog-title" class="changelog-title">{{ 'DASHBOARD.CHANGELOG_TITLE' | translate }}</h2>
                <button type="button" class="changelog-close" (click)="closeChangelog()" [attr.aria-label]="'COMMON.CLOSE' | translate">{{ 'COMMON.CLOSE' | translate }}</button>
              </div>
              <div class="changelog-body">
                @if (changelogLoading()) {
                  <p class="changelog-loading">{{ 'DASHBOARD.CHANGELOG_LOADING' | translate }}</p>
                } @else if (changelogError()) {
                  <p class="changelog-error">{{ changelogError() }}</p>
                } @else if (changelogHtml()) {
                  <div class="changelog-content" [innerHTML]="changelogHtml()"></div>
                }
              </div>
            </div>
          </div>
        }
    </app-sidebar>
  `,
  styles: [`
    .page-header {
      margin-bottom: var(--space-6);

      h1 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-text);
      }
    }

    .welcome-section {
      margin-bottom: var(--space-6);

      h2 {
        font-size: 1.75rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: var(--space-2);
      }

      .welcome-user {
        color: var(--color-text-muted);
        margin-bottom: var(--space-1);

        strong {
          color: var(--color-text);
        }
      }

      .welcome-text {
        color: var(--color-text-muted);
      }
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); /* Increased from 200px */
      gap: var(--space-4);
    }

    .action-card {
      display: flex;
      flex-direction: column;
      padding: var(--space-5);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      text-decoration: none;
      transition: all 0.15s ease;

      &:hover {
        border-color: var(--color-primary);
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
      }
    }

    .action-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary-light);
      border-radius: var(--radius-md);
      color: var(--color-primary);
      margin-bottom: var(--space-4);
    }

    .action-label {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-1);
    }

    .action-desc {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .action-desc-shift-on {
      color: var(--color-success, #15803d);
      font-weight: 500;
    }

    .action-desc-shift-overtime {
      display: block;
      margin-top: var(--space-1);
      color: var(--color-warning-strong, #b45309);
      font-weight: 500;
    }

    .queue-pulse {
      margin-top: var(--space-8);
      padding: var(--space-6);
      border-radius: var(--radius-lg);
      background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary-light) 55%, white) 0%, var(--color-surface) 100%);
      border: 1px solid color-mix(in srgb, var(--color-primary) 18%, var(--color-border));
      box-shadow: var(--shadow-sm);
    }

    .queue-pulse-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-5);

      h2 {
        margin: 0 0 var(--space-1);
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--color-text);
      }

      p {
        margin: 0;
        color: var(--color-text-muted);
        max-width: 40rem;
      }
    }

    .queue-pulse-link,
    .queue-pulse-inline-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      color: var(--color-primary);
      border: 1px solid color-mix(in srgb, var(--color-primary) 22%, var(--color-border));
      background: var(--color-surface);
      border-radius: var(--radius-md);
      font-weight: 600;
      transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    }

    .queue-pulse-link {
      min-height: 2.75rem;
      padding: 0 var(--space-4);
      white-space: nowrap;
    }

    .queue-pulse-inline-link {
      min-height: 2.25rem;
      padding: 0 var(--space-3);
      font-size: 0.875rem;
    }

    .queue-pulse-link:hover,
    .queue-pulse-inline-link:hover {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-sm);
      transform: translateY(-1px);
    }

    .queue-pulse-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--space-4);
    }

    .queue-pulse-ops {
      display: grid;
      grid-template-columns: minmax(0, 280px) minmax(0, 1fr);
      gap: var(--space-4);
      margin-top: var(--space-4);
    }

    .queue-pulse-readiness {
      display: grid;
      gap: var(--space-3);
    }

    .queue-pulse-readiness-card,
    .queue-pulse-arrivals {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-4);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      background: rgba(255, 255, 255, 0.88);
      box-shadow: var(--shadow-xs);
    }

    .queue-pulse-readiness-card strong {
      font-size: 1.65rem;
      line-height: 1;
      color: var(--color-text);
    }

    .queue-pulse-readiness-card small,
    .queue-pulse-arrivals-caption {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    .queue-pulse-arrivals {
      align-content: start;
    }

    .queue-pulse-arrivals-header {
      display: grid;
      gap: var(--space-1);
    }

    .queue-pulse-arrivals-list {
      display: grid;
      gap: var(--space-2);
    }

    .queue-pulse-arrival-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--color-primary-light) 32%, white);
      border: 1px solid color-mix(in srgb, var(--color-primary) 16%, var(--color-border));
    }

    .queue-pulse-arrival-copy {
      display: grid;
      gap: 0.125rem;

      strong {
        color: var(--color-text);
        font-size: 0.95rem;
      }

      span {
        color: var(--color-text-muted);
        font-size: 0.875rem;
      }
    }

    .queue-pulse-arrival-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2rem;
      padding: 0 var(--space-3);
      border-radius: 999px;
      background: rgba(15, 118, 110, 0.12);
      color: #0f766e;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .queue-pulse-arrival-chip--soon {
      background: rgba(180, 83, 9, 0.12);
      color: #b45309;
    }

    .queue-pulse-arrival-chip--due {
      background: rgba(190, 24, 93, 0.12);
      color: #be185d;
    }

    .queue-pulse-card {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-4);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      background: rgba(255, 255, 255, 0.82);
      text-decoration: none;
      color: inherit;
      box-shadow: var(--shadow-xs);
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;

      strong {
        font-size: 1.9rem;
        line-height: 1;
        color: var(--color-text);
      }

      small {
        color: var(--color-text-muted);
        font-size: 0.875rem;
      }
    }

    .queue-pulse-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
    }

    .queue-pulse-card--waiting strong {
      color: #b45309;
    }

    .queue-pulse-card--notified strong {
      color: #0f766e;
    }

    .queue-pulse-label {
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }

    .queue-pulse-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      margin-top: var(--space-5);

      p {
        margin: 0;
        color: var(--color-text);
        font-weight: 500;
      }
    }

    .queue-pulse-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      justify-content: flex-end;
    }

    .queue-health {
      margin-top: var(--space-6);
      padding: var(--space-6);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }

    .queue-health-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-5);

      h2 {
        margin: 0 0 var(--space-1);
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--color-text);
      }

      p {
        margin: 0;
        color: var(--color-text-muted);
        max-width: 44rem;
      }
    }

    .queue-health-grid,
    .queue-health-insights {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--space-4);
    }

    .queue-health-insights {
      margin-top: var(--space-4);
    }

    .queue-health-card,
    .queue-health-insight {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-4);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      background: color-mix(in srgb, var(--color-primary-light) 18%, white);
    }

    .queue-health-card strong,
    .queue-health-insight strong {
      font-size: 1.65rem;
      line-height: 1.05;
      color: var(--color-text);
    }

    .queue-health-card small,
    .queue-health-insight small {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .quick-actions {
        grid-template-columns: 1fr;
      }

      .queue-pulse-header,
      .queue-pulse-footer,
      .queue-health-header {
        flex-direction: column;
        align-items: stretch;
      }

      .queue-pulse-ops {
        grid-template-columns: 1fr;
      }

      .queue-pulse-actions {
        justify-content: stretch;
      }
    }
    .help-section {
      margin-top: var(--space-8);
      padding: var(--space-6);
      border-radius: var(--radius-lg);
      background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-surface) 100%);
      border: 1px solid var(--color-border);
    }

    .help-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 var(--space-2);
    }

    .help-desc {
      font-size: 0.9375rem;
      color: var(--color-text-muted);
      margin: 0 0 var(--space-2);
    }

    .help-invite {
      font-size: 0.9375rem;
      color: var(--color-text);
      margin: 0 0 var(--space-4);
      font-weight: 500;
    }

    .help-links {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .help-link {
      display: inline-flex;
      align-items: center;
      padding: var(--space-2) var(--space-4);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-primary);
      text-decoration: none;
      font-size: 0.9375rem;
      font-weight: 500;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .help-link:hover {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-sm);
    }

    .action-card-whats-new {
      cursor: pointer;
      border: 1px dashed var(--color-primary);
      background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-primary-light) 100%);
    }

    .action-icon-whats-new {
      background: var(--color-primary);
      color: var(--color-surface);
    }

    .changelog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--space-4);
    }

    .changelog-modal {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-lg);
      max-width: 42rem;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
    }

    .changelog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
    }

    .changelog-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
      color: var(--color-text);
    }

    .changelog-close {
      padding: var(--space-2) var(--space-3);
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .changelog-close:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .changelog-body {
      padding: var(--space-5);
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }

    .changelog-loading,
    .changelog-error {
      color: var(--color-text-muted);
      margin: 0;
    }

    .changelog-error {
      color: var(--color-error, #b91c1c);
    }

    .changelog-content {
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--color-text);
    }

    .changelog-content ::ng-deep h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: var(--space-6) 0 var(--space-2);
      color: var(--color-primary);
    }

    .changelog-content ::ng-deep h2:first-child {
      margin-top: 0;
    }

    .changelog-content ::ng-deep h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: var(--space-4) 0 var(--space-2);
      color: var(--color-text);
    }

    .changelog-content ::ng-deep ul {
      margin: 0 0 var(--space-3);
      padding-left: 1.5rem;
    }

    .changelog-content ::ng-deep li {
      margin-bottom: var(--space-1);
    }

    .changelog-content ::ng-deep strong {
      font-weight: 600;
    }

    .changelog-content ::ng-deep a {
      color: var(--color-primary);
      text-decoration: none;
    }

    .changelog-content ::ng-deep a:hover {
      text-decoration: underline;
    }

    .changelog-content ::ng-deep p {
      margin: 0 0 var(--space-2);
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private permissions = inject(PermissionService);
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  user = signal(this.api.getCurrentUser());
  canShowAdminSections = computed(() => this.permissions.isAdmin(this.user()));
  canViewCustomers = computed(() => this.permissions.canAccessRoute(this.user(), '/customers'));
  canViewMyShift = computed(() => this.permissions.canAccessRoute(this.user(), '/my-shift'));
  canViewPos = computed(() => this.permissions.canAccessRoute(this.user(), '/pos'));
  canViewReports = computed(() => this.permissions.canAccessRoute(this.user(), '/reports'));
  canViewReservations = computed(() => this.permissions.hasPermission(this.user(), 'reservation:read'));
  canViewQueue = computed(() => this.permissions.canAccessRoute(this.user(), '/queue'));
  canViewTables = computed(() => this.permissions.canAccessRoute(this.user(), '/tables'));

  /** Open work session when clocked in; null when not; only loaded when `canViewMyShift`. */
  shiftOpen = signal<WorkSession | null>(null);
  shiftStatusLoading = signal(false);
  queueSummary = signal<GuestQueueSummary | null>(null);
  queueHealth = signal<DashboardQueueHealth | null>(null);
  dashboardTables = signal<CanvasTable[]>([]);
  private shiftUiTick = signal(0);
  private shiftTicker: ReturnType<typeof setInterval> | null = null;

  shiftExceedsContract = computed(() => {
    this.shiftUiTick();
    return workSessionOpenExceedsContract(this.shiftOpen());
  });

  queueReadyTableCount = computed(() =>
    this.dashboardTables().filter((table) => this.isTableReadyForQueue(table)).length,
  );

  dashboardReservationArrivals = computed<DashboardReservationArrival[]>(() => {
    return this.dashboardTables()
      .filter((table) => !!table.id && !!table.upcoming_reservation?.reservation_time)
      .map((table) => {
        const reservation = table.upcoming_reservation!;
        const minutesUntil = this.minutesUntilReservation(reservation.reservation_time) ?? 9_999;
        const urgency = this.reservationUrgencyMeta(reservation.reservation_time);
        return {
          tableId: table.id!,
          tableName: table.name,
          guestName: reservation.customer_name?.trim() || 'Reserved guest',
          minutesUntil,
          timeLabel: this.formatReservationTime(reservation.reservation_time),
          urgencyLabel: urgency.urgencyLabel,
          urgencyTone: urgency.urgencyTone,
        };
      })
      .filter((arrival) => arrival.minutesUntil <= 90)
      .sort((a, b) => a.minutesUntil - b.minutesUntil)
      .slice(0, 3);
  });

  showChangelogModal = signal(false);
  changelogHtml = signal<SafeHtml | null>(null);
  changelogLoading = signal(false);
  changelogError = signal<string | null>(null);

  ngOnInit() {
    this.api.ensureTenantUiModulesLoaded().subscribe();
    const u = this.api.getCurrentUser();
    this.user.set(u);
    if (this.permissions.canAccessRoute(u, '/my-shift')) {
      this.shiftStatusLoading.set(true);
      this.api.getMyOpenWorkSession().subscribe({
        next: (s) => {
          this.shiftOpen.set(s);
          this.shiftStatusLoading.set(false);
          if (this.shiftTicker != null) {
            clearInterval(this.shiftTicker);
            this.shiftTicker = null;
          }
          if (s) {
            this.shiftTicker = setInterval(() => this.shiftUiTick.update((x) => x + 1), 60_000);
          }
        },
        error: () => {
          this.shiftOpen.set(null);
          this.shiftStatusLoading.set(false);
          if (this.shiftTicker != null) {
            clearInterval(this.shiftTicker);
            this.shiftTicker = null;
          }
        },
      });
    }
    if (this.canViewQueue() && this.api.isUiModuleEnabled('reservations')) {
      this.api.getGuestQueueSummary().subscribe({
        next: (summary) => this.queueSummary.set(summary),
        error: () => this.queueSummary.set(null),
      });
      this.api.getTablesWithStatus().subscribe({
        next: (tables) => this.dashboardTables.set(tables),
        error: () => this.dashboardTables.set([]),
      });
    }
    if (this.canViewReports() && this.api.isUiModuleEnabled('reservations')) {
      const to = new Date();
      const from = new Date(to);
      from.setDate(to.getDate() - 6);
      this.api.getSalesReports(this.fmtDate(from), this.fmtDate(to)).subscribe({
        next: (report) => this.queueHealth.set(report.queue ?? null),
        error: () => this.queueHealth.set(null),
      });
    }
  }

  ngOnDestroy(): void {
    if (this.shiftTicker != null) {
      clearInterval(this.shiftTicker);
      this.shiftTicker = null;
    }
  }

  moduleEnabled(key: TenantUiModuleKey): boolean {
    return this.api.isUiModuleEnabled(key);
  }

  queueCount(summary: GuestQueueSummary, status: string): number {
    return summary.counts?.[status] ?? 0;
  }

  queueStatusMessage(summary: GuestQueueSummary): string {
    const active = this.queueCount(summary, 'waiting') + this.queueCount(summary, 'notified');
    const seated = this.queueCount(summary, 'seated');

    if (active === 0) {
      return seated > 0
        ? `${seated} guest${seated === 1 ? '' : 's'} already seated from the queue today.`
        : 'Queue is clear right now.';
    }

    if (summary.notified_guests > 0) {
      return `${active} active queue entr${active === 1 ? 'y is' : 'ies are'} in play, including ${summary.notified_guests} guest${summary.notified_guests === 1 ? '' : 's'} already called forward.`;
    }

    return `${active} guest${active === 1 ? '' : 's'} still waiting for the next available table.`;
  }

  queueReadyTableMessage(): string {
    const ready = this.queueReadyTableCount();
    if (ready === 0) {
      return 'No clear tables are safe to hand into the queue right now.';
    }
    if (ready === 1) {
      return 'One table is currently safe to seat from the host stand.';
    }
    return `${ready} tables are currently safe to seat from the host stand.`;
  }

  reservationArrivalMessage(): string {
    const arrivals = this.dashboardReservationArrivals();
    if (!arrivals.length) {
      return 'No near-term reservation arrivals are putting pressure on the floor.';
    }
    const dueNow = arrivals.filter((arrival) => arrival.urgencyTone === 'due').length;
    if (dueNow > 0) {
      return `${dueNow} arrival${dueNow === 1 ? ' is' : 's are'} due now and need table protection.`;
    }
    return `${arrivals.length} reservation arrival${arrivals.length === 1 ? '' : 's'} should be watched before seating the next walk-in.`;
  }

  queueHealthPrimarySource(summary: DashboardQueueHealth): string {
    const top = [...(summary.by_source ?? [])].sort((a, b) => b.count - a.count)[0];
    if (!top || top.count <= 0) {
      return 'No source data yet';
    }
    return this.humanizeKey(top.source);
  }

  queueHealthPeakDayLabel(summary: DashboardQueueHealth): string {
    const top = [...(summary.daily ?? [])].sort((a, b) => b.count - a.count)[0];
    if (!top || top.count <= 0) {
      return 'No activity yet';
    }
    return this.fmtDateValue(top.date);
  }

  queueHealthPeakDayMessage(summary: DashboardQueueHealth): string {
    const top = [...(summary.daily ?? [])].sort((a, b) => b.count - a.count)[0];
    if (!top || top.count <= 0) {
      return 'Queue traffic has not started in this report window.';
    }
    return `${top.count} queue entries, ${top.seated_count} seated on the busiest day.`;
  }

  queueHealthTotalMessage(summary: DashboardQueueHealth): string {
    if (!summary.total) {
      return 'No queue activity recorded in the selected report window.';
    }
    return `${summary.waiting_count + summary.notified_count} still open, ${summary.seated_count} already seated.`;
  }

  queueHealthLossMessage(summary: DashboardQueueHealth): string {
    const losses = summary.cancelled_count + summary.no_show_count + summary.expired_count;
    if (!losses) {
      return 'No cancellations, no-shows, or expired queue turns recorded.';
    }
    return `${summary.cancelled_count} cancelled, ${summary.no_show_count} no-show, ${summary.expired_count} expired.`;
  }

  fmtDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  formatPct(value: number, total: number): string {
    if (!total && !value) {
      return '0%';
    }
    if (Number.isFinite(value)) {
      return `${Math.round(value)}%`;
    }
    return '0%';
  }

  humanizeKey(raw: string | null | undefined): string {
    const value = String(raw ?? '').trim();
    if (!value) return 'Unknown';
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private isTableReadyForQueue(table: CanvasTable): boolean {
    const status = table.operational_status ?? table.status ?? 'available';
    if (status !== 'available') return false;
    const minutes = table.upcoming_reservation?.reservation_time
      ? this.minutesUntilReservation(table.upcoming_reservation.reservation_time)
      : null;
    return minutes == null || minutes > 20;
  }

  private minutesUntilReservation(raw: string | null | undefined): number | null {
    if (!raw) return null;
    let date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      const match = raw.match(/(\d{1,2}):(\d{2})/);
      if (!match) return null;
      date = new Date();
      date.setHours(Number(match[1]), Number(match[2]), 0, 0);
    }
    const diff = Math.round((date.getTime() - Date.now()) / 60_000);
    return diff >= 0 ? diff : 0;
  }

  private formatReservationTime(raw: string | null | undefined): string {
    if (!raw) return 'Time pending';
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    const match = raw.match(/(\d{1,2}):(\d{2})/);
    if (!match) return raw;
    const hours = Number(match[1]);
    const minutes = match[2];
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const normalized = hours % 12 || 12;
    return `${normalized}:${minutes} ${suffix}`;
  }

  private fmtDateValue(raw: string): string {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return raw;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  private reservationUrgencyMeta(raw: string | null | undefined): Pick<DashboardReservationArrival, 'urgencyLabel' | 'urgencyTone'> {
    const minutes = this.minutesUntilReservation(raw);
    if (minutes == null) {
      return { urgencyLabel: 'Upcoming', urgencyTone: 'upcoming' };
    }
    if (minutes <= 10) {
      return { urgencyLabel: 'Due now', urgencyTone: 'due' };
    }
    if (minutes <= 30) {
      return { urgencyLabel: 'Soon', urgencyTone: 'soon' };
    }
    return { urgencyLabel: 'Upcoming', urgencyTone: 'upcoming' };
  }

  openChangelog() {
    this.showChangelogModal.set(true);
    this.changelogError.set(null);
    if (this.changelogHtml()) {
      return;
    }
    this.changelogLoading.set(true);
    this.api.getChangelog().subscribe({
      next: (text) => {
        this.changelogLoading.set(false);
        this.changelogHtml.set(this.sanitizer.bypassSecurityTrustHtml(this.markdownToHtml(text)));
      },
      error: (err) => {
        this.changelogLoading.set(false);
        this.changelogError.set(err?.message || 'Failed to load changelog.');
      },
    });
  }

  closeChangelog() {
    this.showChangelogModal.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.showChangelogModal()) this.closeChangelog();
  }

  /** Convert changelog markdown to safe HTML (h2, h3, ul, li, strong, a). */
  private markdownToHtml(md: string): string {
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const lines = md.split(/\r?\n/);
    let out = '';
    let inList = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimEnd();
      if (/^##\s/.test(trimmed)) {
        if (inList) {
          out += '</ul>';
          inList = false;
        }
        const title = trimmed.replace(/^##\s+/, '').replace(/\*\*/g, '');
        out += '<h2>' + escape(title) + '</h2>';
      } else if (/^###\s/.test(trimmed)) {
        if (inList) {
          out += '</ul>';
          inList = false;
        }
        const title = trimmed.replace(/^###\s+/, '').replace(/\*\*/g, '');
        out += '<h3>' + escape(title) + '</h3>';
      } else if (/^-\s+/.test(trimmed)) {
        if (!inList) {
          out += '<ul>';
          inList = true;
        }
        let content = trimmed.replace(/^-\s+/, '');
        const bold: string[] = [];
        content = content.replace(/\*\*([^*]+)\*\*/g, (_, t) => {
          bold.push(t);
          return '\x01B' + (bold.length - 1) + '\x02';
        });
        const links: { t: string; u: string }[] = [];
        content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => {
          links.push({ t, u });
          return '\x01L' + (links.length - 1) + '\x02';
        });
        content = escape(content);
        content = content.replace(/\x01B(\d+)\x02/g, (_, i) => '<strong>' + escape(bold[Number(i)]) + '</strong>');
        content = content.replace(/\x01L(\d+)\x02/g, (_, i) => {
          const { t, u } = links[Number(i)];
          return '<a href="' + escape(u) + '" target="_blank" rel="noopener noreferrer">' + escape(t) + '</a>';
        });
        out += '<li>' + content + '</li>';
      } else if (trimmed === '') {
        if (inList) {
          out += '</ul>';
          inList = false;
        }
      }
    }
    if (inList) out += '</ul>';
    return out || '<p>No content.</p>';
  }
}
