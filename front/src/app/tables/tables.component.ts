import { afterNextRender, Component, effect, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { ApiService, Table, CanvasTable, TenantSettings, Floor, User, GuestQueueSummary, GuestQueueEntry, Product, ProductQuestion, Order, OrderItemCreate } from '../services/api.service';
import { PermissionService } from '../services/permission.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { StaffPosToolbarComponent } from '../shared/staff-pos-toolbar.component';
import { TablesAreaPreferenceService } from '../services/tables-area-preference.service';
import { ConfirmationModalComponent } from '../shared/confirmation-modal.component';
import { FocusFirstInputDirective } from '../shared/focus-first-input.directive';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { ApiErrorMessageService } from '../services/api-error-message.service';
import { findNonOverlappingDefaultPosition } from './table-floor-layout.util';
import { getCustomerPublicOrigin } from '../shared/host-portal.util';

const TABLES_VIEW_STORAGE_KEY = 'pos.tables.viewMode';

/** One combined list row per joined group, or one row per ungrouped table. */
type TablesListRow =
  | { kind: 'group'; groupId: number; floorId: number; members: CanvasTable[]; label: string; seatTotal: number }
  | { kind: 'single'; table: CanvasTable };

/** One combined tile block per floor: joined group or single table. */
type TablesTileBlock =
  | { kind: 'group'; groupId: number; members: CanvasTable[]; label: string; seatTotal: number }
  | { kind: 'single'; table: CanvasTable };

type FloorReservationArrival = {
  tableId: number;
  tableName: string;
  floorName: string;
  guestName: string;
  timeLabel: string;
  urgencyLabel: string;
  urgencyTone: 'due' | 'soon' | 'upcoming';
};

type QueueSeatingSuggestion = {
  entryId: number;
  guestName: string;
  partySize: number;
  floorName: string;
  tableId: number;
  tableName: string;
  matchLabel: string;
  cautionLabel?: string;
};

type QuickOrderLine = {
  product: Product;
  quantity: number;
  customizationAnswers?: Record<string, string | number | string[]>;
  customizationSummary?: string;
};

function getInitialTablesViewMode(): 'tiles' | 'table' {
  if (typeof localStorage === 'undefined') return 'tiles';
  const v = localStorage.getItem(TABLES_VIEW_STORAGE_KEY);
  return (v === 'tiles' || v === 'table') ? v : 'tiles';
}

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent, SidebarComponent, StaffPosToolbarComponent, RouterLink, TranslateModule, ConfirmationModalComponent, FocusFirstInputDirective],
  template: `
    <app-sidebar>
        <div class="page-header page-header--staff-flow">
          <app-staff-pos-toolbar />
          <div class="page-header-row">
          <div class="header-left">
            <h1>{{ 'TABLES.TITLE' | translate }}</h1>
            <a routerLink="/tables/canvas" class="btn btn-ghost btn-sm" data-testid="tables-floor-plan-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
                <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
              </svg>
              {{ 'TABLES.FLOOR_PLAN' | translate }}
            </a>
            @if (!showForm() && tables().length > 0) {
              <div class="view-toggle" data-testid="tables-view-toggle">
                <button type="button" class="btn btn-ghost btn-sm" [class.active]="viewMode() === 'tiles'" (click)="setViewMode('tiles')" [title]="'TABLES.VIEW_TILES' | translate" data-testid="view-mode-tiles">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                  </svg>
                  {{ 'TABLES.VIEW_TILES' | translate }}
                </button>
                <button type="button" class="btn btn-ghost btn-sm" [class.active]="viewMode() === 'table'" (click)="setViewMode('table')" [title]="'TABLES.VIEW_TABLE' | translate" data-testid="view-mode-table">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="1"/>
                    <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
                    <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
                  </svg>
                  {{ 'TABLES.VIEW_TABLE' | translate }}
                </button>
              </div>
            }
          </div>
          @if (!showForm() && floors().length > 0) {
            <button class="btn btn-primary" (click)="showForm.set(true)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {{ 'TABLES.ADD_TABLE' | translate }}
            </button>
          }
          </div>
        </div>

        <div class="content">
          @if (showForm()) {
            <div class="form-card">
              <form (submit)="createTable($event)">
                <div class="form-inline">
                  <div class="form-group-inline">
                    <label>{{ 'TABLES.NAME' | translate }}</label>
                    <input type="text" [(ngModel)]="newTableName" name="name" [placeholder]="'TABLES.TABLE_NAME' | translate" required>
                  </div>
                  <div class="form-group-inline">
                    <label>{{ 'TABLES.FLOOR' | translate }}</label>
                    <select [(ngModel)]="selectedFloorId" name="floor_id" required>
                      @for (floor of floors(); track floor.id) {
                        <option [value]="floor.id">{{ floor.name }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-actions-inline">
                    <button type="submit" class="btn btn-primary">{{ 'COMMON.ADD' | translate }}</button>
                    <button type="button" class="btn btn-secondary" (click)="showForm.set(false)">{{ 'COMMON.CANCEL' | translate }}</button>
                  </div>
                </div>
              </form>
            </div>
          }

          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }

          @if (canOpenQueue() && queueSummary(); as queue) {
            <section class="queue-pulse-card" data-testid="tables-queue-pulse">
              <div class="queue-pulse-copy">
                <span class="queue-pulse-eyebrow">Host stand</span>
                <h3>Walk-ins in queue</h3>
                <p>Track waiting guests from the floor and jump straight into seating when a table opens.</p>
              </div>
              <div class="queue-pulse-metrics">
                <div class="queue-pulse-metric">
                  <span class="queue-pulse-metric-value">{{ queue.waiting_guests }}</span>
                  <span class="queue-pulse-metric-label">Waiting</span>
                </div>
                <div class="queue-pulse-metric">
                  <span class="queue-pulse-metric-value">{{ queue.notified_guests }}</span>
                  <span class="queue-pulse-metric-label">Notified</span>
                </div>
                <div class="queue-pulse-metric">
                  <span class="queue-pulse-metric-value">{{ queue.total_entries }}</span>
                  <span class="queue-pulse-metric-label">Total in view</span>
                </div>
              </div>
              <div class="queue-pulse-actions">
                <a routerLink="/queue" class="btn btn-primary">Open host stand</a>
              </div>
            </section>
          }

          @if (reservationArrivals().length || queueSeatSuggestions().length) {
            <section class="service-bridge-grid" data-testid="tables-service-bridge">
              @if (reservationArrivals().length) {
                <article class="service-bridge-card">
                  <div class="service-bridge-head">
                    <div>
                      <span class="queue-pulse-eyebrow queue-pulse-eyebrow--amber">Arrivals due</span>
                      <h3>Reserved guests landing soon</h3>
                      <p>Protect near-term bookings before handing the next table to the queue.</p>
                    </div>
                    <a routerLink="/reservations" class="btn btn-secondary btn-sm">Open reservations</a>
                  </div>
                  <div class="service-bridge-list">
                    @for (arrival of reservationArrivals(); track arrival.tableId) {
                      <div class="service-bridge-row">
                        <div class="service-bridge-primary">
                          <strong>{{ arrival.guestName }}</strong>
                          <span>{{ arrival.tableName }} • {{ arrival.floorName }}</span>
                        </div>
                        <div class="service-bridge-secondary">
                          <span class="service-chip" [class.service-chip--amber]="arrival.urgencyTone !== 'upcoming'" [class.service-chip--rose]="arrival.urgencyTone === 'due'">
                            {{ arrival.urgencyLabel }}
                          </span>
                          <span class="service-time">{{ arrival.timeLabel }}</span>
                        </div>
                      </div>
                    }
                  </div>
                </article>
              }

              @if (queueSeatSuggestions().length) {
                <article class="service-bridge-card">
                  <div class="service-bridge-head">
                    <div>
                      <span class="queue-pulse-eyebrow queue-pulse-eyebrow--green">Best next seats</span>
                      <h3>Queue guests you can seat now</h3>
                      <p>Best-fit matches based on clear tables, party size, and reservation protection.</p>
                    </div>
                    <a routerLink="/queue" class="btn btn-secondary btn-sm">Open host stand</a>
                  </div>
                  <div class="service-bridge-list">
                    @for (suggestion of queueSeatSuggestions(); track suggestion.entryId) {
                      <div class="service-bridge-row">
                        <div class="service-bridge-primary">
                          <strong>{{ suggestion.guestName }}</strong>
                          <span>{{ suggestion.partySize }} guests • {{ suggestion.matchLabel }}</span>
                        </div>
                        <div class="service-bridge-secondary service-bridge-secondary--stack">
                          <span class="service-chip service-chip--green">{{ suggestion.tableName }}</span>
                          <span class="service-time">{{ suggestion.floorName }}</span>
                          @if (suggestion.cautionLabel) {
                            <span class="service-warning">{{ suggestion.cautionLabel }}</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </article>
              }
            </section>
          }

          @if (loading()) {
            <div class="empty-state"><p>{{ 'COMMON.LOADING' | translate }}</p></div>
          } @else if (floors().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <h3>{{ 'TABLES.CREATE_FIRST_FLOOR' | translate }}</h3>
              <p>{{ 'TABLES.CREATE_FIRST_FLOOR_DESC' | translate }}</p>
              <a routerLink="/tables/canvas" class="btn btn-primary">
                {{ 'TABLES.ADD_FLOOR' | translate }}
              </a>
            </div>
          } @else if (tables().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <h3>{{ 'TABLES.NO_TABLES' | translate }}</h3>
              <p>{{ 'TABLES.CREATE_FIRST_FLOOR_DESC' | translate }}</p>
              <button class="btn btn-primary" (click)="showForm.set(true)">{{ 'TABLES.ADD_TABLE' | translate }}</button>
            </div>
          } @else if (viewMode() === 'table') {
            <!-- Table view: all tables in a data table -->
            <div class="table-responsive">
              <table class="tables-data-table">
                <thead>
                  <tr>
                    <th>{{ 'TABLES.NAME' | translate }}</th>
                    <th>{{ 'TABLES.FLOOR' | translate }}</th>
                    <th>{{ 'TABLES.SEATS' | translate }}</th>
                    <th>{{ 'TABLES.COL_STATUS' | translate }}</th>
                    <th>{{ 'TABLES.ASSIGNED_WAITER' | translate }}</th>
                    <th class="th-actions">{{ 'COMMON.ACTIONS' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of listViewRows(); track trackListRow($index, row)) {
                    @if (row.kind === 'single') {
                      <tr class="tr-table-row" (dblclick)="onTableCardDoubleClick(row.table)">
                        <ng-container *ngTemplateOutlet="listTableDataRow; context: {$implicit: row.table}" />
                      </tr>
                    } @else {
                      <tr class="tr-group-summary" (dblclick)="onListGroupDoubleClick(row)">
                        <td>
                          <button type="button" class="btn-ghost btn-expand-group" (click)="toggleListGroupExpand(row.groupId); $event.stopPropagation()"
                            [attr.aria-expanded]="isListGroupExpanded(row.groupId)"
                            [title]="(isListGroupExpanded(row.groupId) ? 'TABLES.GROUP_COLLAPSE_MEMBERS' : 'TABLES.GROUP_EXPAND_MEMBERS') | translate">
                            {{ isListGroupExpanded(row.groupId) ? '▾' : '▸' }}
                          </button>
                          <span class="group-label">{{ row.label }}</span>
                          @if (groupMembersHaveActivity(row.members)) {
                            <span class="badge-group-activity">{{ 'TABLES.GROUP_ACTIVITY_BADGE' | translate }}</span>
                          }
                        </td>
                        <td>{{ getFloorName(row.floorId) }}</td>
                        <td>{{ row.seatTotal }}</td>
                        <td>
                          @if (groupMembersHaveActiveSession(row.members)) {
                            <span class="status-badge status-active status-inline"><span class="status-dot"></span>{{ 'TABLES.ACTIVE' | translate }}</span>
                          } @else {
                            <span class="status-badge status-inactive status-inline"><span class="status-dot"></span>{{ 'TABLES.INACTIVE' | translate }}</span>
                          }
                        </td>
                        <td>—</td>
                        <td class="td-actions">
                          <button type="button" class="btn btn-ghost btn-sm" (click)="toggleListGroupExpand(row.groupId); $event.stopPropagation()">
                            {{ (isListGroupExpanded(row.groupId) ? 'TABLES.GROUP_COLLAPSE_MEMBERS' : 'TABLES.GROUP_EXPAND_MEMBERS') | translate }}
                          </button>
                        </td>
                      </tr>
                      @if (isListGroupExpanded(row.groupId)) {
                        @for (table of row.members; track table.id) {
                          <tr class="tr-group-member" (dblclick)="onTableCardDoubleClick(table)">
                            <ng-container *ngTemplateOutlet="listTableDataRow; context: {$implicit: table}" />
                          </tr>
                        }
                      }
                    }
                  }
                </tbody>
                <ng-template #listTableDataRow let-table>
                  <td>
                    @if (editingTableId() === table.id) {
                      <input type="text" [(ngModel)]="editingName" class="edit-input-inline" (keydown.enter)="saveTable(table)" (keydown.escape)="cancelEdit()">
                    } @else {
                      <div class="table-name-stack">
                        <span class="table-name" (click)="startEdit(table)">{{ table.name }}</span>
                        @if (tableReservationHint(table)) {
                          <span class="table-reservation-inline">{{ tableReservationHint(table) }}</span>
                        }
                      </div>
                    }
                  </td>
                  <td>
                    @if (editingTableId() === table.id) {
                      <select [(ngModel)]="editingFloorId" class="edit-select-inline" (keydown.escape)="cancelEdit()">
                        @for (floor of floors(); track floor.id) {
                          <option [ngValue]="floor.id">{{ floor.name }}</option>
                        }
                      </select>
                    } @else {
                      {{ getFloorName(table.floor_id) }}
                    }
                  </td>
                  @if (editingTableId() !== table.id) {
                    <td>{{ table.seat_count ?? '—' }}</td>
                  } @else {
                    <td>
                      <input type="number" [(ngModel)]="editingSeatCount" class="edit-input-inline edit-seats" min="1" max="20" (keydown.enter)="saveTable(table)" (keydown.escape)="cancelEdit()">
                    </td>
                  }
                  <td>
                    @if (table.active_order_id) {
                      <span class="status-badge status-active status-inline"><span class="status-dot"></span>{{ 'TABLES.ACTIVE' | translate }}</span>
                    } @else if (table.upcoming_reservation) {
                      <div class="status-stack">
                        <span class="status-badge status-warning status-inline"><span class="status-dot"></span>Reserved</span>
                        <span class="table-reservation-inline table-reservation-inline--status">{{ tableReservationBadge(table) }}</span>
                      </div>
                    } @else if (table.is_active) {
                      <span class="status-badge status-active status-inline"><span class="status-dot"></span>{{ 'TABLES.ACTIVE' | translate }}</span>
                    } @else {
                      <span class="status-badge status-inactive status-inline"><span class="status-dot"></span>{{ 'TABLES.INACTIVE' | translate }}</span>
                    }
                  </td>
                  <td>
                    @if (canManageTableAssignments()) {
                      <select class="waiter-select-inline" (change)="onWaiterAssign(table, $event)">
                        <option value="" [selected]="!table.assigned_waiter_id">{{ 'TABLES.UNASSIGNED' | translate }}</option>
                        @for (w of waiters(); track w.id) {
                          <option [value]="w.id" [selected]="table.assigned_waiter_id === w.id">{{ w.full_name || w.email }}</option>
                        }
                      </select>
                      @if (!table.assigned_waiter_id && table.effective_waiter_name) {
                        <div class="waiter-inherited-inline">{{ table.effective_waiter_name }}</div>
                      }
                    } @else {
                      <div class="waiter-readonly-inline">
                        @if (table.assigned_waiter_id) {
                          {{ table.assigned_waiter_name || table.effective_waiter_name || '—' }}
                        } @else if (table.effective_waiter_name) {
                          {{ 'TABLES.SECTION_DEFAULT' | translate }}: {{ table.effective_waiter_name }}
                        } @else {
                          {{ 'TABLES.UNASSIGNED' | translate }}
                        }
                      </div>
                    }
                  </td>
                  <td class="td-actions td-actions--row">
                    @if (editingTableId() === table.id) {
                      <button type="button" class="icon-btn icon-btn-success" (click)="saveTable(table)" [title]="'COMMON.SAVE' | translate">✓</button>
                      <button type="button" class="icon-btn" (click)="cancelEdit()" [title]="'COMMON.CANCEL' | translate">✕</button>
                    } @else {
                      <button type="button" class="icon-btn icon-btn-edit" (click)="startEdit(table)" [title]="'COMMON.EDIT' | translate">✎</button>
                      @if (table.is_active) {
                        @if (tableNeedsSettlement(table)) {
                          <button type="button" class="btn btn-sm btn-secondary" (click)="openPosForTable(table)" title="Settle this table before closing">Settle</button>
                        } @else {
                          <button type="button" class="btn btn-sm btn-warning" (click)="confirmCloseTable(table)" [disabled]="activatingTableId() === table.id" [title]="'TABLES.CLOSE_TABLE' | translate">Close</button>
                        }
                      } @else {
                        <button type="button" class="btn btn-sm btn-success btn-square" (click)="activateTableSession(table)" [disabled]="activatingTableId() === table.id" [title]="'TABLES.ACTIVATE' | translate">▶</button>
                      }
                      <button type="button" class="btn btn-secondary btn-sm btn-square" (click)="openStaffMenu(table)"
                        [disabled]="staffMenuOpeningTableId() === table.id"
                        [title]="'TABLES.OPEN_MENU' | translate">↗</button>
                      <button type="button" class="icon-btn" (click)="copyLink(table)" [title]="'COMMON.COPY' | translate">⎘</button>
                      <button type="button" class="icon-btn icon-btn-danger" (click)="deleteTable(table)" [title]="'COMMON.DELETE' | translate">🗑</button>
                    }
                  </td>
                </ng-template>
              </table>
            </div>
          } @else {
            <!-- Tiles view: grouped by Floor -->
            @for (floor of floorsSorted(); track floor.id) {
              @if (tileBlocksForFloor(floor.id!).length > 0) {
                <div class="floor-section">
                  <div class="section-header">
                    <div class="section-header-left">
                      <h2>{{ floor.name }}</h2>
                      <span class="badge">{{ tileBlocksForFloor(floor.id!).length }}</span>
                    </div>
                    @if (canManageFloors()) {
                      <div class="floor-admin-actions">
                        <label class="floor-active-toggle">
                          <input
                            type="checkbox"
                            [checked]="floor.is_active !== false"
                            (change)="toggleFloorActive(floor, $event)"
                          />
                          {{ 'TABLES.FLOOR_PUBLIC_BOOKING' | translate }}
                        </label>
                        <label class="floor-seating-zone-label">
                          <span class="floor-waiter-label">{{ 'TABLES.FLOOR_SEATING_ZONE' | translate }}</span>
                          <select
                            class="waiter-select waiter-select-sm"
                            [value]="floor.seating_zone || 'any'"
                            (change)="onFloorSeatingZoneChange(floor, $event)"
                          >
                            <option value="any">{{ 'TABLES.SEATING_ZONE_ANY' | translate }}</option>
                            <option value="indoor">{{ 'TABLES.SEATING_ZONE_INDOOR' | translate }}</option>
                            <option value="outdoor">{{ 'TABLES.SEATING_ZONE_OUTDOOR' | translate }}</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm"
                          (click)="moveFloorSort(floor, -1)"
                          [disabled]="isFirstFloorSort(floor)"
                          [title]="'TABLES.FLOOR_MOVE_UP' | translate"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm"
                          (click)="moveFloorSort(floor, 1)"
                          [disabled]="isLastFloorSort(floor)"
                          [title]="'TABLES.FLOOR_MOVE_DOWN' | translate"
                        >
                          ↓
                        </button>
                      </div>
                    }
                    <div class="floor-waiter-assign">
                      <label class="floor-waiter-label">{{ 'TABLES.DEFAULT_WAITER' | translate }}:</label>
                      @if (canManageTableAssignments()) {
                        <select class="waiter-select waiter-select-sm" (change)="onFloorWaiterAssign(floor, $event)">
                          <option value="" [selected]="!floor.default_waiter_id">{{ 'TABLES.UNASSIGNED' | translate }}</option>
                          @for (w of waiters(); track w.id) {
                            <option [value]="w.id" [selected]="floor.default_waiter_id === w.id">{{ w.full_name || w.email }}</option>
                          }
                        </select>
                      } @else {
                        <span class="waiter-readonly-floor">{{ floor.default_waiter_name || ('TABLES.UNASSIGNED' | translate) }}</span>
                      }
                    </div>
                  </div>
                  
                  <div class="table-grid">
                    @for (block of tileBlocksForFloor(floor.id!); track trackTileBlock($index, block)) {
                      @if (block.kind === 'single') {
                        <div class="table-card" (dblclick)="onTableCardDoubleClick(block.table)">
                          <ng-container *ngTemplateOutlet="tableTileInner; context: {$implicit: block.table}" />
                        </div>
                      } @else {
                        <div class="table-card table-card--group">
                          <div class="group-tile-banner">
                            <h3 class="group-tile-title">{{ block.label }}</h3>
                            <div class="group-tile-meta">
                              <span>{{ block.seatTotal }} {{ 'TABLES.SEATS' | translate }}</span>
                              @if (groupMembersHaveActivity(block.members)) {
                                <span class="badge-group-activity">{{ 'TABLES.GROUP_ACTIVITY_BADGE' | translate }}</span>
                              }
                            </div>
                            <p class="group-tile-hint">{{ 'TABLES.GROUP_TILE_MEMBER_HINT' | translate }}</p>
                          </div>
                          <div class="group-tile-members">
                            @for (table of block.members; track table.id) {
                              <div class="group-tile-member">
                                <button
                                  type="button"
                                  class="group-tile-member-summary"
                                  (click)="toggleTileGroupMember(block.groupId, table.id!)"
                                  [attr.aria-expanded]="isTileGroupMemberExpanded(block.groupId, table.id!)"
                                  [title]="(isTileGroupMemberExpanded(block.groupId, table.id!) ? 'TABLES.GROUP_TILE_HIDE_TABLE' : 'TABLES.GROUP_TILE_SHOW_TABLE') | translate"
                                >
                                  <span class="group-tile-member-chevron" aria-hidden="true">
                                    {{ isTileGroupMemberExpanded(block.groupId, table.id!) ? '▾' : '▸' }}
                                  </span>
                                  <span class="group-tile-member-name">{{ table.name }}</span>
                                  @if (table.is_active) {
                                    <span class="status-badge status-active status-inline group-tile-member-status">
                                      <span class="status-dot"></span>{{ 'TABLES.ACTIVE' | translate }}
                                    </span>
                                  } @else {
                                    <span class="status-badge status-inactive status-inline group-tile-member-status">
                                      <span class="status-dot"></span>{{ 'TABLES.INACTIVE' | translate }}
                                    </span>
                                  }
                                </button>
                                @if (isTileGroupMemberExpanded(block.groupId, table.id!)) {
                                  <div class="group-tile-member-detail" (dblclick)="onTableCardDoubleClick(table)">
                                    <ng-container *ngTemplateOutlet="tableTileInner; context: { $implicit: table, compact: true, hideTitle: true }" />
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        </div>
                      }
                    }
                  </div>
                </div>
              }
            }
            <ng-template #tableTileInner let-table let-compact="compact" let-hideTitle="hideTitle">
              <div class="table-tile-inner" [class.table-tile-inner--compact]="compact">
              <div class="table-header">
                @if (editingTableId() === table.id) {
                  <div class="edit-fields">
                    <input 
                      type="text" 
                      [(ngModel)]="editingName" 
                      class="edit-input"
                      (keydown.enter)="saveTable(table)"
                      (keydown.escape)="cancelEdit()"
                      autofocus
                    >
                    <input 
                      type="number" 
                      [(ngModel)]="editingSeatCount" 
                      class="edit-input edit-input-seats"
                      min="1"
                      max="20"
                      placeholder="Seats"
                      (keydown.enter)="saveTable(table)"
                      (keydown.escape)="cancelEdit()"
                    >
                    <div class="edit-actions">
                      <button class="icon-btn icon-btn-success" (click)="saveTable(table)" [title]="'COMMON.SAVE' | translate">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                      </button>
                      <button class="icon-btn" (click)="cancelEdit()" [title]="'COMMON.CANCEL' | translate">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                } @else {
                  @if (!hideTitle) {
                    <div class="table-info">
                      <h3 (click)="startEdit(table)" class="editable-name">{{ table.name }}</h3>
                      <div class="seat-count" (click)="startEdit(table)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                        </svg>
                        {{ table.seat_count || '0' }} {{ 'TABLES.SEATS' | translate }}
                      </div>
                    </div>
                  }
                  <div class="header-actions" [class.header-actions--solo]="hideTitle">
                    <button class="icon-btn icon-btn-edit" (click)="startEdit(table)" [title]="'COMMON.EDIT' | translate">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="icon-btn icon-btn-danger" (click)="deleteTable(table)" [title]="'COMMON.DELETE' | translate">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                }
              </div>

              <div class="status-section status-section--operator">
                <div class="status-section-top">
                  <div
                    class="status-badge"
                    [class.status-warning]="tableIsPaid(table)"
                    [class.status-active]="!tableIsPaid(table) && tableHasActiveSessionOrOpenOrder(table)"
                    [class.status-inactive]="!tableIsPaid(table) && !tableHasActiveSessionOrOpenOrder(table)"
                  >
                    <span class="status-dot"></span>
                    {{ tableOperatorStateLabel(table) }}
                  </div>
                  @if (table.active_order_id) {
                    <span class="table-operator-chip">Bill #{{ table.active_order_id }}</span>
                  } @else if (tableReservationBadge(table)) {
                    <span class="table-operator-chip table-operator-chip--reservation">{{ tableReservationBadge(table) }}</span>
                  }
                </div>
                <div class="table-operator-summary">
                  <span>{{ table.seat_count || 0 }} {{ 'TABLES.SEATS' | translate | lowercase }}</span>
                  @if (table.assigned_waiter_name || table.effective_waiter_name) {
                    <span>{{ table.assigned_waiter_name || table.effective_waiter_name }}</span>
                  }
                  @if (tableReservationHint(table)) {
                    <span>{{ tableReservationHint(table) }}</span>
                  }
                </div>
              </div>

              <div class="table-actions table-actions--primary">
                @if (tableIsPaid(table)) {
                  @if (canOpenStaffOrders()) {
                    <button type="button" class="btn btn-secondary btn-sm" (click)="openOrdersForTable(table)">
                      View receipt
                    </button>
                  }
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    [disabled]="activatingTableId() === table.id"
                    (click)="closeTableSession(table)"
                  >
                    {{ activatingTableId() === table.id ? 'Clearing...' : 'Clear table' }}
                  </button>
                } @else {
                  @if (canOpenStaffOrders()) {
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="openQuickTable(table, 'orders')"
                      [attr.title]="'TABLES.VIEW_TABLE_ORDERS_FULL' | translate"
                      [attr.aria-label]="'TABLES.VIEW_TABLE_ORDERS_FULL' | translate"
                    >
                      {{ table.active_order_id ? ('TABLES.OPEN_STAFF_ORDER' | translate) : ('TABLES.VIEW_TABLE_ORDERS' | translate) }}
                    </button>
                  }
                  <button type="button" class="btn btn-primary btn-sm" (click)="openQuickTable(table, 'menu')">
                    {{ table.active_order_id ? 'Add items' : 'Start order' }}
                  </button>
                  @if (table.is_active) {
                    @if (tableNeedsSettlement(table)) {
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        (click)="openPosForTable(table)"
                        title="Settle this table before closing"
                      >
                        Settle first
                      </button>
                    } @else {
                      <button
                        type="button"
                        class="btn btn-warning btn-sm"
                        [disabled]="activatingTableId() === table.id"
                        (click)="confirmCloseTable(table)"
                      >
                        {{ activatingTableId() === table.id ? 'Closing...' : 'Close table' }}
                      </button>
                    }
                  }
                }
              </div>

              @if (canManageTableAssignments() || canManageFloors()) {
                <details class="table-admin-panel">
                  <summary [attr.aria-label]="'More table controls for ' + table.name">
                    <span>More</span>
                    @if (table.assigned_waiter_name || table.effective_waiter_name) {
                      <small>{{ table.assigned_waiter_name || table.effective_waiter_name }}</small>
                    } @else {
                      <small>waiter / QR</small>
                    }
                  </summary>

                  <div class="waiter-assign-section">
                    <div class="waiter-assign-row">
                      <svg class="waiter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      @if (canManageTableAssignments()) {
                        <select class="waiter-select" (change)="onWaiterAssign(table, $event)">
                          <option value="" [selected]="!table.assigned_waiter_id">{{ 'TABLES.UNASSIGNED' | translate }}</option>
                          @for (w of waiters(); track w.id) {
                            <option [value]="w.id" [selected]="table.assigned_waiter_id === w.id">{{ w.full_name || w.email }}</option>
                          }
                        </select>
                      } @else {
                        <span class="waiter-readonly">
                          @if (table.assigned_waiter_id) {
                            {{ table.assigned_waiter_name || table.effective_waiter_name || '—' }}
                          } @else if (table.effective_waiter_name) {
                            {{ 'TABLES.SECTION_DEFAULT' | translate }}: {{ table.effective_waiter_name }}
                          } @else {
                            {{ 'TABLES.UNASSIGNED' | translate }}
                          }
                        </span>
                      }
                    </div>
                    @if (canManageTableAssignments() && !table.assigned_waiter_id && table.effective_waiter_name) {
                      <div class="waiter-inherited">{{ 'TABLES.SECTION_DEFAULT' | translate }}: {{ table.effective_waiter_name }}</div>
                    }
                  </div>

                  <div class="session-actions"
                    [class.session-actions--inactive]="!table.is_active">
                    @if (table.is_active) {
                      @if (tableNeedsSettlement(table)) {
                        <button
                          type="button"
                          class="btn btn-sm btn-secondary"
                          (click)="openPosForTable(table)"
                          title="Settle this table before closing">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 7h16M4 12h16M4 17h10"/>
                          </svg>
                          Settle first
                        </button>
                      } @else {
                        <button
                          type="button"
                          class="btn btn-sm btn-warning"
                          (click)="confirmCloseTable(table)"
                          [disabled]="activatingTableId() === table.id">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0110 0v4"/>
                          </svg>
                          {{ 'TABLES.CLOSE_TABLE' | translate }}
                        </button>
                      }
                    } @else {
                      <button
                        type="button"
                        class="btn btn-sm btn-success"
                        (click)="activateTableSession(table)"
                        [disabled]="activatingTableId() === table.id">
                        @if (activatingTableId() === table.id) {
                          <span class="spinner"></span>
                        } @else {
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0110 0v4"/>
                          </svg>
                        }
                        {{ 'TABLES.ACTIVATE' | translate }}
                      </button>
                    }
                  </div>

                  <div class="table-actions">
                    <button type="button" class="btn btn-secondary btn-sm" (click)="openStaffMenu(table)"
                      [disabled]="staffMenuOpeningTableId() === table.id">{{ 'TABLES.OPEN_MENU' | translate }}</button>
                    <button
                      class="btn btn-sm"
                      [class.btn-ghost]="copiedTableId() !== table.id"
                      [class.btn-copied]="copiedTableId() === table.id"
                      (click)="copyLink(table)">
                      @if (copiedTableId() === table.id) {
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                        Copied!
                      } @else {
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                        Copy
                      }
                    </button>
                  </div>

                  <div class="qr-section qr-section--compact">
                    <div class="qr-card">
                      <div class="qr-code-wrapper">
                        <qrcode [qrdata]="getMenuUrl(table)" [width]="compact ? 96 : 180" [errorCorrectionLevel]="'M'" cssClass="qr-code"></qrcode>
                      </div>
                      <div class="qr-footer">
                        <div class="table-number">{{ table.name }}</div>
                      </div>
                    </div>
                  </div>
                </details>
              }
              </div>
            </ng-template>
          }
        </div>

        @if (quickOrderTable(); as serviceTable) {
          <div class="table-service-overlay" (click)="closeQuickTable()">
            <section class="table-service-drawer" (click)="$event.stopPropagation()" aria-modal="true" role="dialog" aria-label="Table service">
              <header class="table-service-header">
                <div>
                  <span class="table-service-eyebrow">Table service</span>
                  <h2>{{ serviceTable.name }}</h2>
                  <p>{{ serviceTable.seat_count || 0 }} seats · {{ getFloorName(serviceTable.floor_id) }}</p>
                </div>
                <div class="table-service-header-actions">
                  <span class="service-status" [class.service-status--live]="!!serviceTable.active_order_id">
                    {{ serviceTable.active_order_id ? 'Live order #' + serviceTable.active_order_id : (serviceTable.is_active ? 'Ready' : 'Closed') }}
                  </span>
                  <button type="button" class="table-service-close" (click)="closeQuickTable()" aria-label="Close table service">×</button>
                </div>
              </header>

              <nav class="table-service-tabs" aria-label="Table service views">
                <button type="button" [class.active]="quickOrderView() === 'menu'" (click)="quickOrderView.set('menu')">Add items</button>
                <button type="button" [class.active]="quickOrderView() === 'orders'" (click)="quickOrderView.set('orders')">
                  Orders <span>{{ quickCurrentSessionOrders().length }}</span>
                </button>
                <button type="button" [class.active]="quickOrderView() === 'history'" (click)="quickOrderView.set('history')">
                  History <span>{{ quickHistoryOrders().length }}</span>
                </button>
                <button type="button" [class.active]="quickOrderView() === 'move'" (click)="quickOrderView.set('move')">
                  Move bill
                </button>
                <button type="button" [class.active]="quickOrderView() === 'qr'" (click)="quickOrderView.set('qr')">Table QR</button>
              </nav>

              @if (quickOrderError()) {
                <div class="table-service-alert">{{ quickOrderError() }}</div>
              }
              @if (quickOrderSuccess()) {
                <div class="table-service-success">{{ quickOrderSuccess() }}</div>
              }

              @if (quickOrderView() === 'menu') {
                <div class="quick-order-workspace">
                  <div class="quick-menu-pane">
                    <div class="quick-menu-toolbar">
                      <label class="quick-search">
                        <span>Search menu</span>
                        <input type="search" [ngModel]="quickOrderSearch()" (ngModelChange)="quickOrderSearch.set($event)" placeholder="Dish, category or description">
                      </label>
                      <div class="quick-categories" aria-label="Menu categories">
                        @for (category of quickOrderCategories(); track category) {
                          <button type="button" [class.active]="quickOrderCategory() === category" (click)="quickOrderCategory.set(category)">
                            {{ category }}
                          </button>
                        }
                      </div>
                    </div>

                    @if (quickOrderLoading()) {
                      <div class="quick-empty">Loading the menu…</div>
                    } @else if (quickOrderProductsFiltered().length === 0) {
                      <div class="quick-empty">No menu items match this view.</div>
                    } @else {
                      <div class="quick-product-grid">
                        @for (product of quickOrderProductsFiltered(); track product.id) {
                          <button type="button" class="quick-product-card" (click)="selectQuickProduct(product)">
                            <div class="quick-product-image" [class.quick-product-image--placeholder]="!getQuickProductImageUrl(product)">
                              @if (getQuickProductImageUrl(product); as imageUrl) {
                                <img [src]="imageUrl" [alt]="product.name">
                              } @else {
                                <span>{{ product.name.charAt(0) }}</span>
                              }
                            </div>
                            <div class="quick-product-copy">
                              <span class="quick-product-category">{{ product.category || 'Menu' }}</span>
                              <strong>{{ product.name }}</strong>
                              <small>{{ product.description || 'Tap to add' }}</small>
                              <span class="quick-product-price">{{ formatQuickMoney(product.price_cents) }}</span>
                            </div>
                            <span class="quick-add-badge">{{ quickProductQuantity(product) ? quickProductQuantity(product) : '+' }}</span>
                          </button>
                        }
                      </div>
                    }
                  </div>

                  <aside class="quick-cart-pane">
                    <div class="quick-cart-title">
                      <div>
                        <span>Current add-on</span>
                        <h3>{{ quickCartItemCount() }} items</h3>
                      </div>
                      @if (quickOrderCart().length) {
                        <button type="button" class="quick-text-button" (click)="clearQuickCart()">Clear</button>
                      }
                    </div>

                    @if (quickOrderCart().length === 0) {
                      <div class="quick-cart-empty">
                        <span>+</span>
                        <strong>Tap a dish to add it</strong>
                        <small>Items will join this table’s live bill and go straight to the kitchen.</small>
                      </div>
                    } @else {
                      <div class="quick-cart-lines">
                        @for (line of quickOrderCart(); track $index; let index = $index) {
                          <article class="quick-cart-line">
                            <div>
                              <strong>{{ line.product.name }}</strong>
                              @if (line.customizationSummary) { <small>{{ line.customizationSummary }}</small> }
                              <span>{{ formatQuickMoney(line.product.price_cents * line.quantity) }}</span>
                            </div>
                            <div class="quick-quantity">
                              <button type="button" (click)="changeQuickLineQuantity(index, -1)" aria-label="Remove one">−</button>
                              <b>{{ line.quantity }}</b>
                              <button type="button" (click)="changeQuickLineQuantity(index, 1)" aria-label="Add one">+</button>
                            </div>
                          </article>
                        }
                      </div>
                    }

                    <div class="quick-cart-footer">
                      <div><span>Items</span><strong>{{ quickCartItemCount() }}</strong></div>
                      <div><span>Add-on total</span><strong>{{ formatQuickMoney(quickCartTotalCents()) }}</strong></div>
                      @if (!serviceTable.is_active && quickOrderCart().length === 0) {
                        <button
                          type="button"
                          class="quick-submit"
                          (click)="openQuickTableForQrOrdering(serviceTable)"
                          [disabled]="quickOrderSubmitting() || activatingTableId() === serviceTable.id"
                        >
                          {{ activatingTableId() === serviceTable.id ? 'Opening table…' : 'Open table for QR ordering' }}
                        </button>
                      } @else {
                        <button type="button" class="quick-submit" (click)="submitQuickOrder()" [disabled]="!quickOrderCart().length || quickOrderSubmitting()">
                          {{ quickOrderSubmitting() ? 'Sending…' : (serviceTable.active_order_id ? 'Add to order & kitchen' : 'Open table & send') }}
                        </button>
                      }
                    </div>
                  </aside>
                </div>
              } @else if (quickOrderView() === 'orders') {
                <div class="quick-orders-view">
                  <div class="quick-orders-heading">
                    <div><span>Current session</span><h3>{{ serviceTable.name }} live orders</h3></div>
                    <button type="button" class="btn btn-secondary btn-sm" (click)="openOrdersForTable(serviceTable)">Open full orders page</button>
                  </div>
                  @if (quickOrderLoading()) {
                    <div class="quick-empty">Loading orders…</div>
                  } @else if (quickCurrentSessionOrders().length === 0) {
                    <div class="quick-empty">No orders in the current table session yet. Add items or check History for older bills.</div>
                  } @else {
                    <div class="quick-order-list">
                      @for (order of quickCurrentSessionOrders(); track order.id) {
                        <article class="quick-order-card" [class.quick-order-card--active]="order.id === serviceTable.active_order_id">
                          <div class="quick-order-card-head">
                            <div><small>{{ formatQuickOrderTime(order.created_at) }}</small><strong>Order #{{ order.id }}</strong></div>
                            <span [class]="'quick-order-state quick-order-state--' + order.status">{{ quickOrderStatusLabel(order.status) }}</span>
                          </div>
                          <div class="quick-order-items">
                            @for (item of order.items; track item.id) {
                              <span><b>{{ item.quantity }}×</b> {{ item.product_name }}</span>
                            }
                          </div>
                          <div class="quick-order-total"><span>{{ order.payment_method || 'Payment pending' }}</span><strong>{{ formatQuickMoney(order.total_cents) }}</strong></div>
                        </article>
                      }
                    </div>
                  }
                </div>
              } @else if (quickOrderView() === 'history') {
                <div class="quick-orders-view">
                  <div class="quick-orders-heading">
                    <div><span>Previous sessions</span><h3>{{ serviceTable.name }} history</h3></div>
                    <button type="button" class="btn btn-secondary btn-sm" (click)="openOrdersForTable(serviceTable)">Open full history page</button>
                  </div>
                  @if (quickOrderLoading()) {
                    <div class="quick-empty">Loading history…</div>
                  } @else if (quickHistoryOrders().length === 0) {
                    <div class="quick-empty">No previous sessions for this table yet.</div>
                  } @else {
                    <div class="quick-order-list">
                      @for (order of quickHistoryOrders(); track order.id) {
                        <article class="quick-order-card">
                          <div class="quick-order-card-head">
                            <div><small>{{ formatQuickOrderTime(order.created_at) }}</small><strong>Order #{{ order.id }}</strong></div>
                            <span [class]="'quick-order-state quick-order-state--' + order.status">{{ quickOrderStatusLabel(order.status) }}</span>
                          </div>
                          <div class="quick-order-items">
                            @for (item of order.items; track item.id) {
                              <span><b>{{ item.quantity }}×</b> {{ item.product_name }}</span>
                            }
                          </div>
                          <div class="quick-order-total"><span>{{ order.payment_method || 'Payment pending' }}</span><strong>{{ formatQuickMoney(order.total_cents) }}</strong></div>
                        </article>
                      }
                    </div>
                  }
                </div>
              } @else if (quickOrderView() === 'move') {
                <div class="quick-move-view">
                  <div class="quick-orders-heading">
                    <div>
                      <span>Move active bill</span>
                      <h3>Transfer {{ serviceTable.name }} to another table</h3>
                    </div>
                  </div>

                  @if (!serviceTable.is_active || !serviceTable.active_order_id) {
                    <div class="quick-empty">There is no live bill on this table yet. Add items first, or open the table for QR ordering.</div>
                  } @else if (quickMoveTargetTables().length === 0) {
                    <div class="quick-empty">No ready destination tables are available. Close or settle another table before moving this bill.</div>
                  } @else {
                    <section class="quick-move-panel">
                      <div class="quick-move-summary">
                        <span>Moving from</span>
                        <strong>{{ serviceTable.name }}</strong>
                        <small>Current orders: {{ quickCurrentSessionOrders().length }} · Live bill #{{ serviceTable.active_order_id }}</small>
                      </div>

                      <label class="quick-move-field">
                        <span>Move to ready table</span>
                        <select [ngModel]="quickMoveTargetTableId()" (ngModelChange)="quickMoveTargetTableId.set($event)">
                          @for (target of quickMoveTargetTables(); track target.id) {
                            <option [ngValue]="target.id">{{ target.name }} · {{ target.seat_count || 0 }} seats · {{ getFloorName(target.floor_id) }}</option>
                          }
                        </select>
                      </label>

                      <label class="quick-move-field">
                        <span>Reason / note</span>
                        <textarea rows="3" [ngModel]="quickMoveReason()" (ngModelChange)="quickMoveReason.set($event)" placeholder="Example: guest requested window table"></textarea>
                      </label>

                      <button type="button" class="quick-submit" (click)="moveQuickBill()" [disabled]="quickMovingBill() || !quickMoveTargetTableId()">
                        {{ quickMovingBill() ? 'Moving bill…' : 'Move bill now' }}
                      </button>
                      <p class="quick-move-help">This keeps the same customer session and current orders, clears {{ serviceTable.name }}, and opens the destination table.</p>
                    </section>
                  }
                </div>
              } @else {
                <div class="quick-qr-view table-qr-print">
                  <span class="table-service-eyebrow">Self-order QR</span>
                  <h3>{{ serviceTable.name }}</h3>
                  <p>Guests scan this code to open the table menu, order, and check out online.</p>
                  <div class="quick-qr-card">
                    <qrcode [qrdata]="getMenuUrl(serviceTable)" [width]="260" [errorCorrectionLevel]="'M'" cssClass="qr-code"></qrcode>
                    <strong>{{ serviceTable.name }}</strong>
                    <small>{{ getMenuUrl(serviceTable) }}</small>
                  </div>
                  <div class="quick-qr-actions">
                    <button type="button" class="btn btn-primary" (click)="printTableQr()">Print table QR</button>
                    <button type="button" class="btn btn-secondary" (click)="copyLink(serviceTable)">Copy link</button>
                  </div>
                </div>
              }
            </section>
          </div>
        }

        @if (quickCustomizeProduct(); as customProduct) {
          <div class="quick-customize-overlay" (click)="cancelQuickCustomization()">
            <section class="quick-customize-dialog" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
              <header><div><span>Customize item</span><h3>{{ customProduct.name }}</h3></div><button type="button" (click)="cancelQuickCustomization()">×</button></header>
              <div class="quick-customize-body">
                @for (question of customProduct.questions || []; track question.id) {
                  <div class="quick-question">
                    <label>{{ question.label }} @if (question.required) { <b>*</b> }</label>
                    @if (question.type === 'choice') {
                      <div class="quick-choice-grid">
                        @for (option of quickQuestionChoices(question); track option) {
                          <button type="button" [class.active]="quickAnswerHasChoice(question, option)" (click)="toggleQuickChoice(question, option)">{{ option }}</button>
                        }
                      </div>
                    } @else if (question.type === 'scale') {
                      <div class="quick-choice-grid quick-choice-grid--scale">
                        @for (option of quickQuestionScale(question); track option) {
                          <button type="button" [class.active]="quickCustomizationAnswers()[question.id + ''] === option" (click)="setQuickAnswer(question, option)">{{ option }}</button>
                        }
                      </div>
                    } @else {
                      <textarea rows="3" [ngModel]="quickCustomizationAnswers()[question.id + ''] || ''" (ngModelChange)="setQuickAnswer(question, $event)" placeholder="Enter request"></textarea>
                    }
                  </div>
                }
                @if (quickCustomizationError()) { <div class="table-service-alert">{{ quickCustomizationError() }}</div> }
              </div>
              <footer><button type="button" class="btn btn-secondary" (click)="cancelQuickCustomization()">Cancel</button><button type="button" class="btn btn-primary" (click)="confirmQuickCustomization()">Add to order</button></footer>
            </section>
          </div>
        }

        <!-- Confirmation Modal -->
        @if (confirmationModal().show) {
          <app-confirmation-modal
            [title]="confirmationModal().title"
            [message]="confirmationModal().message"
            [messageParams]="confirmationModal().messageParams"
            [confirmText]="confirmationModal().confirmText"
            [cancelText]="confirmationModal().cancelText"
            [confirmBtnClass]="confirmationModal().confirmBtnClass"
            (confirm)="onConfirmationConfirm()"
            (cancel)="onConfirmationCancel()"
          ></app-confirmation-modal>
        }

        @if (groupSafetyModal(); as g) {
          <app-confirmation-modal
            [title]="'TABLES.GROUP_SIBLING_ACTIVITY_TITLE'"
            [message]="'TABLES.GROUP_SIBLING_ACTIVITY_MESSAGE'"
            [messageParams]="{ names: g.siblingNames }"
            [confirmText]="'TABLES.GROUP_SIBLING_ACTIVITY_CONFIRM'"
            [cancelText]="'COMMON.CANCEL'"
            [confirmBtnClass]="'btn-warning'"
            (confirm)="onGroupSafetyConfirm()"
            (cancel)="onGroupSafetyCancel()"
          ></app-confirmation-modal>
        }

        <!-- Reassign orders/reservations to another table before delete -->
        @if (reassignTableModal()) {
          <div class="modal-overlay">
            <div class="modal-content reassign-modal" (click)="$event.stopPropagation()" appFocusFirstInput>
              <div class="modal-header">
                <h3>{{ 'TABLES.REASSIGN_AND_DELETE_TITLE' | translate }}</h3>
                <button type="button" class="close-btn" (click)="cancelReassign()" aria-label="Close">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div class="modal-body">
                <p class="reassign-message">{{ 'TABLES.REASSIGN_AND_DELETE_MESSAGE' | translate }}</p>
                <label class="reassign-label">{{ 'TABLES.REASSIGN_TO_TABLE' | translate }}</label>
                <select class="reassign-select" [ngModel]="reassignTargetTableId()" (ngModelChange)="reassignTargetTableId.set($event)">
                  @for (t of otherTablesForReassign(); track t.id) {
                    <option [ngValue]="t.id">{{ t.name }}</option>
                  }
                </select>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-ghost" (click)="cancelReassign()">{{ 'COMMON.CANCEL' | translate }}</button>
                <button type="button" class="btn btn-primary" (click)="doReassignAndDelete()" [disabled]="!reassignTargetTableId()">
                  {{ 'TABLES.REASSIGN_AND_DELETE' | translate }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Toast (e.g. after close table) -->
        @if (toast()) {
          <div class="toast" [class]="toast()!.type">
            <span>{{ toast()!.message | translate }}</span>
            <button type="button" class="toast-close" (click)="dismissToast()" aria-label="Dismiss">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        }
    </app-sidebar>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5); }
    .page-header.page-header--staff-flow {
      flex-direction: column;
      align-items: stretch;
      gap: 0;
    }
    .page-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-4);
      flex-wrap: wrap;
    }
    .header-left { display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap; }
    .page-header h1 { font-size: 1.5rem; font-weight: 600; color: var(--color-text); margin: 0; }
    .view-toggle { display: flex; gap: 2px; }
    .view-toggle .btn { display: inline-flex; align-items: center; gap: 6px; }
    .view-toggle .btn.active { background: var(--color-bg); color: var(--color-text); font-weight: 500; }

    .btn { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); border: none; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.15s ease; text-decoration: none; }
    .btn-primary { background: var(--color-primary); color: white; &:hover { background: var(--color-primary-hover); } }
    .btn-secondary { background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); &:hover { background: var(--color-border); } }
    .btn-ghost { background: transparent; color: var(--color-text-muted); &:hover { background: var(--color-bg); color: var(--color-text); } }
    .btn-sm { padding: var(--space-2) var(--space-3); font-size: 0.8125rem; }
    .btn-copied { 
      background: rgba(34, 197, 94, 0.1); 
      color: #22c55e; 
      border: 1px solid rgba(34, 197, 94, 0.2);
      animation: copiedPulse 0.3s ease;
    }
    @keyframes copiedPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .form-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); margin-bottom: var(--space-5); }
    .form-inline { display: flex; gap: var(--space-4); align-items: flex-end; flex-wrap: wrap; }
    .form-group-inline { display: flex; flex-direction: column; gap: var(--space-1); flex: 1; min-width: 200px; }
    .form-group-inline label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; }
    .form-group-inline input, .form-group-inline select { padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.9375rem; background: var(--color-surface); color: var(--color-text); }
    .form-actions-inline { display: flex; gap: var(--space-2); }

    .error-banner { background: rgba(220, 38, 38, 0.1); color: var(--color-error); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); margin-bottom: var(--space-4); }
    .queue-pulse-card {
      display: grid;
      grid-template-columns: minmax(0, 1.3fr) minmax(280px, 1fr) auto;
      gap: var(--space-3);
      align-items: center;
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(34, 197, 94, 0.06));
      border: 1px solid rgba(14, 165, 233, 0.18);
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4);
      margin-bottom: var(--space-3);
    }
    .queue-pulse-copy h3 {
      margin: 0 0 var(--space-1);
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .queue-pulse-copy p {
      margin: 0;
      color: var(--color-text-muted);
      max-width: 48ch;
      font-size: 0.875rem;
    }
    .queue-pulse-eyebrow {
      display: inline-flex;
      margin-bottom: var(--space-2);
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(14, 165, 233, 0.12);
      color: #0f766e;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .queue-pulse-metrics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-3);
    }
    .queue-pulse-metric {
      padding: 0.65rem 0.75rem;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(148, 163, 184, 0.16);
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .queue-pulse-metric-value {
      font-size: 1.375rem;
      font-weight: 700;
      color: var(--color-text);
      line-height: 1.1;
    }
    .queue-pulse-metric-label {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }
    .queue-pulse-actions {
      display: flex;
      justify-content: flex-end;
    }
    .service-bridge-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr));
      gap: var(--space-3);
      margin-bottom: var(--space-3);
    }
    .service-bridge-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      box-shadow: var(--shadow-sm);
    }
    .service-bridge-head {
      display: flex;
      justify-content: space-between;
      gap: var(--space-3);
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .service-bridge-head h3 {
      margin: 0 0 var(--space-1);
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .service-bridge-head p {
      margin: 0;
      color: var(--color-text-muted);
      max-width: 44ch;
    }
    .service-bridge-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .service-bridge-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      background: var(--color-bg);
      border: 1px solid rgba(148, 163, 184, 0.14);
    }
    .service-bridge-primary,
    .service-bridge-secondary {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .service-bridge-primary strong {
      font-size: 0.95rem;
      color: var(--color-text);
    }
    .service-bridge-primary span,
    .service-time {
      color: var(--color-text-muted);
      font-size: 0.8125rem;
    }
    .service-bridge-secondary {
      align-items: flex-end;
      text-align: right;
    }
    .service-bridge-secondary--stack {
      gap: 2px;
    }
    .service-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: rgba(148, 163, 184, 0.14);
      color: var(--color-text);
    }
    .service-chip--amber {
      background: rgba(245, 158, 11, 0.12);
      color: #b45309;
    }
    .service-chip--rose {
      background: rgba(239, 68, 68, 0.12);
      color: #be123c;
    }
    .service-chip--green {
      background: rgba(34, 197, 94, 0.12);
      color: #15803d;
    }
    .service-warning {
      color: #b45309;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .queue-pulse-eyebrow--amber {
      background: rgba(245, 158, 11, 0.12);
      color: #b45309;
    }
    .queue-pulse-eyebrow--green {
      background: rgba(34, 197, 94, 0.12);
      color: #15803d;
    }

    .toast {
      position: fixed; bottom: var(--space-4); right: var(--space-4);
      background: var(--color-surface); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);
      box-shadow: var(--shadow-lg); display: flex; align-items: center; gap: var(--space-3); z-index: 3000; max-width: calc(100vw - var(--space-8));
    }
    .toast.success { border-left: 4px solid var(--color-success, #16a34a); }
    .toast.error { border-left: 4px solid var(--color-error, #dc2626); }
    .toast-close { background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: var(--space-1); }
    .toast-close:hover { color: var(--color-text); }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content.reassign-modal { background: var(--color-surface); border-radius: var(--radius-lg); max-width: 400px; width: 90%; box-shadow: var(--shadow-xl); overflow: hidden; }
    .reassign-modal .modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-4); border-bottom: 1px solid var(--color-border); }
    .reassign-modal .modal-header h3 { margin: 0; font-size: 1.125rem; font-weight: 600; }
    .reassign-modal .close-btn { background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: var(--space-1); border-radius: var(--radius-sm); }
    .reassign-modal .close-btn:hover { color: var(--color-text); background: var(--color-bg); }
    .reassign-modal .modal-body { padding: var(--space-4); }
    .reassign-modal .reassign-message { margin: 0 0 var(--space-4); color: var(--color-text-muted); font-size: 0.9375rem; }
    .reassign-modal .reassign-label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: var(--space-2); }
    .reassign-modal .reassign-select { width: 100%; padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.9375rem; background: var(--color-surface); color: var(--color-text); }
    .reassign-modal .modal-footer { display: flex; justify-content: flex-end; gap: var(--space-2); padding: var(--space-4); border-top: 1px solid var(--color-border); }

    .empty-state {
      text-align: center; padding: var(--space-8); background: var(--color-surface);
      border: 1px dashed var(--color-border); border-radius: var(--radius-lg);
      .empty-icon { color: var(--color-text-muted); margin-bottom: var(--space-4); }
      h3 { margin: 0 0 var(--space-2); font-size: 1.125rem; color: var(--color-text); }
      p { margin: 0 0 var(--space-4); color: var(--color-text-muted); }
    }

    .floor-section { margin-bottom: var(--space-8); }
    .floor-admin-actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }
    .floor-active-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: 0.75rem;
      color: var(--color-text-muted);
      cursor: pointer;
    }
    .floor-active-toggle input { cursor: pointer; }
    .floor-seating-zone-label {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .floor-section .section-header { 
      display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4);
      padding-bottom: var(--space-2); border-bottom: 2px solid var(--color-bg); flex-wrap: wrap;
    }
    .section-header-left { display: flex; align-items: center; gap: var(--space-3); }
    .floor-waiter-assign { display: flex; align-items: center; gap: var(--space-2); }
    .floor-waiter-label { font-size: 0.75rem; color: var(--color-text-muted); white-space: nowrap; }
    .floor-section h2 { margin: 0; font-size: 1.25rem; font-weight: 600; }
    .badge { background: var(--color-bg); color: var(--color-text-muted); padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }

    .table-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: var(--space-4);
      align-items: stretch;
    }

    @media (max-width: 1080px) {
      .table-grid {
        grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
        gap: var(--space-3);
      }
      .table-card {
        border-radius: var(--radius-md);
      }
      .queue-pulse-card {
        grid-template-columns: 1fr;
      }
      .queue-pulse-actions {
        justify-content: flex-start;
      }
      .service-bridge-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .queue-pulse-metrics {
        grid-template-columns: 1fr;
      }
      .service-bridge-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .service-bridge-secondary {
        align-items: flex-start;
        text-align: left;
      }
    }

    .btn-expand-group {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 28px; min-height: 28px; padding: 0 6px; margin-right: var(--space-2);
      border-radius: var(--radius-sm); border: 1px solid var(--color-border); background: var(--color-surface);
      cursor: pointer; font-size: 0.75rem; color: var(--color-text-muted);
    }
    .btn-expand-group:hover { background: var(--color-bg); color: var(--color-text); }
    .group-label { font-weight: 600; }
    .badge-group-activity {
      margin-left: var(--space-2); font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
      padding: 2px 6px; border-radius: 6px; background: rgba(245, 158, 11, 0.15); color: #b45309;
    }
    .tables-data-table .tr-group-summary td { background: var(--color-bg); vertical-align: middle; }
    .tables-data-table .tr-group-member td { background: var(--color-surface); }
    .tables-data-table .tr-group-member td:first-child { padding-left: 2.25rem; border-left: 3px solid rgba(168, 85, 247, 0.35); }

    .table-card--group {
      align-self: start;
      text-align: left;
      border-color: rgba(168, 85, 247, 0.35);
    }
    .group-tile-banner { margin-bottom: var(--space-2); padding-bottom: var(--space-3); border-bottom: 1px solid var(--color-border); }
    .group-tile-title { margin: 0 0 var(--space-2); font-size: 1.125rem; font-weight: 600; text-align: center; }
    .group-tile-meta { display: flex; align-items: center; justify-content: center; gap: var(--space-2); flex-wrap: wrap; font-size: 0.875rem; color: var(--color-text-muted); }
    .group-tile-hint { margin: var(--space-2) 0 0; font-size: 0.75rem; color: var(--color-text-muted); text-align: center; }
    .group-tile-members { display: flex; flex-direction: column; gap: var(--space-2); }
    .group-tile-member-summary {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-2);
      width: 100%;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg);
      cursor: pointer;
      text-align: left;
      font: inherit;
      color: inherit;
    }
    .group-tile-member-summary:hover { border-color: rgba(168, 85, 247, 0.45); background: var(--color-surface); }
    .group-tile-member-chevron {
      flex-shrink: 0;
      width: 1rem;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-align: center;
    }
    .group-tile-member-name { font-size: 0.875rem; font-weight: 600; color: var(--color-primary); }
    .group-tile-member-status {
      margin-left: auto;
      font-size: 0.625rem;
      padding: 2px 6px;
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
    }
    .group-tile-member-detail {
      padding-top: var(--space-2);
      border-top: 1px dashed var(--color-border);
    }
    .header-actions--solo { margin-left: auto; }
    .table-tile-inner--compact .qr-section { margin-bottom: var(--space-2); }
    .table-tile-inner--compact .qr-card { padding: var(--space-2); box-shadow: none; }
    .table-tile-inner--compact .qr-code-wrapper { margin: var(--space-1) 0; }
    .table-tile-inner--compact .qr-footer { margin-top: var(--space-1); padding-top: var(--space-1); }
    .table-tile-inner--compact .status-section { padding: var(--space-2); margin-bottom: var(--space-2); }
    .table-tile-inner--compact .waiter-assign-section { margin-bottom: var(--space-2); }
    .table-tile-inner--compact .session-actions { min-height: 2.25rem; margin-bottom: var(--space-2); }

    .table-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      text-align: center;
    }
    .table-tile-inner {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); gap: var(--space-2); }
    
    .table-info { flex: 1; min-width: 0; text-align: left; }
    .editable-name { cursor: pointer; margin: 0; font-size: 1rem; font-weight: 600; color: var(--color-text); }
    .editable-name:hover { color: var(--color-primary); }
    .seat-count {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      margin-top: var(--space-1);
      cursor: pointer;
    }
    
    .edit-fields { display: flex; gap: var(--space-2); align-items: center; flex: 1; flex-wrap: wrap; }
    .edit-input { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.9375rem; flex: 1; min-width: 120px; }
    .edit-input-seats { width: 80px; flex: 0 0 80px; }
    .edit-actions { display: flex; gap: var(--space-1); }
    
    .header-actions { display: flex; gap: var(--space-1); }
    
    .qr-section { margin-bottom: var(--space-4); }
    .qr-card {
      background: white; border: 2px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .qr-header { text-align: center; margin-bottom: var(--space-3); padding-bottom: var(--space-3); border-bottom: 1px solid var(--color-border); }
    .company-name { font-size: 1.125rem; font-weight: 700; color: var(--color-text); margin-bottom: var(--space-2); }
    .company-phone { display: flex; align-items: center; justify-content: center; gap: var(--space-1); font-size: 0.875rem; color: var(--color-text-muted); }
    .qr-code-wrapper { display: flex; justify-content: center; margin: var(--space-3) 0; }
    .qr-footer { text-align: center; margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--color-border); }
    .table-number { font-size: 1rem; font-weight: 600; color: var(--color-primary); text-transform: uppercase; }
    .table-actions { display: flex; gap: var(--space-2); justify-content: center; }
    .table-actions--primary {
      justify-content: stretch;
      margin-bottom: var(--space-3);
    }
    .table-actions--primary .btn {
      flex: 1 1 0;
      justify-content: center;
      min-width: 0;
    }

    .icon-btn { background: none; border: none; padding: var(--space-2); border-radius: var(--radius-sm); color: var(--color-text-muted); cursor: pointer; transition: all 0.15s ease; }
    .icon-btn:hover { background: var(--color-bg); color: var(--color-text); }
    .icon-btn-danger:hover { background: rgba(220, 38, 38, 0.1); color: var(--color-error); }

    /* Status Section */
    .status-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
      padding: var(--space-3);
      background: var(--color-bg);
      border-radius: var(--radius-md);
    }
    .status-section--operator {
      align-items: stretch;
      gap: var(--space-3);
      background: linear-gradient(180deg, rgba(249, 250, 251, 0.95) 0%, rgba(243, 244, 246, 0.9) 100%);
      border: 1px solid rgba(226, 232, 240, 0.95);
    }
    .status-section-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      flex-wrap: wrap;
    }
    .table-operator-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.35rem 0.7rem;
      border-radius: 999px;
      background: rgba(37, 99, 235, 0.08);
      color: #1d4ed8;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      white-space: nowrap;
    }
    .table-operator-chip--reservation {
      background: rgba(245, 158, 11, 0.12);
      color: #b45309;
    }
    .table-operator-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }
    .table-operator-summary span {
      display: inline-flex;
      align-items: center;
      min-height: 1.85rem;
      padding: 0.3rem 0.65rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      color: var(--color-text-muted);
      font-size: 0.78rem;
      font-weight: 600;
      border: 1px solid rgba(226, 232, 240, 0.9);
    }
    .status-badge {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: var(--space-1) var(--space-3);
      border-radius: 12px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-active {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }
    .status-active .status-dot {
      background: #22c55e;
      animation: pulse 2s infinite;
    }
    .status-inactive {
      background: rgba(156, 163, 175, 0.1);
      color: #9ca3af;
    }
    .status-inactive .status-dot {
      background: #9ca3af;
    }
    .status-warning {
      background: rgba(245, 158, 11, 0.12);
      color: #b45309;
    }
    .status-warning .status-dot {
      background: #f59e0b;
    }
    .status-stack {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
    .table-name-stack {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .table-reservation-inline {
      font-size: 0.75rem;
      font-weight: 600;
      color: #b45309;
      line-height: 1.2;
    }
    .table-reservation-inline--status {
      font-size: 0.7rem;
      letter-spacing: 0.01em;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    /* Waiter Assignment */
    .waiter-assign-section {
      padding: var(--space-2) var(--space-3);
      margin-bottom: var(--space-3);
      border-top: 1px solid var(--color-border);
    }
    .waiter-assign-row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .waiter-icon { color: var(--color-text-muted); flex-shrink: 0; }
    .waiter-select {
      flex: 1;
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
    }
    .waiter-select-sm {
      padding: var(--space-1) var(--space-2);
      font-size: 0.75rem;
      max-width: 180px;
    }
    .waiter-inherited {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      margin-top: 2px;
      padding-left: 22px;
      font-style: italic;
    }
    .waiter-readonly {
      flex: 1;
      font-size: 0.8125rem;
      color: var(--color-text);
    }
    .waiter-readonly-floor {
      font-size: 0.75rem;
      color: var(--color-text);
    }
    .table-admin-panel {
      margin-top: auto;
      border-top: 1px dashed color-mix(in srgb, var(--color-border) 70%, transparent);
      padding-top: var(--space-2);
    }
    .table-admin-panel summary {
      cursor: pointer;
      list-style: none;
      font-size: 0.78rem;
      font-weight: 700;
      color: color-mix(in srgb, var(--color-text-muted) 88%, var(--color-surface));
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      user-select: none;
    }
    .table-admin-panel summary span {
      display: inline-flex;
      align-items: center;
      min-height: 1.55rem;
      padding: 0.16rem 0.52rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-bg) 70%, var(--color-surface));
      border: 1px solid color-mix(in srgb, var(--color-border) 75%, transparent);
    }
    .table-admin-panel summary small {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--color-text-muted);
      font-weight: 650;
      letter-spacing: 0;
      text-transform: none;
    }
    .table-admin-panel summary::-webkit-details-marker {
      display: none;
    }
    .table-admin-panel summary::after {
      content: '+';
      font-size: 1rem;
      line-height: 1;
    }
    .table-admin-panel[open] summary::after {
      content: '−';
    }
    .table-admin-panel[open] summary {
      margin-bottom: var(--space-3);
    }
    .table-admin-panel > :not(summary) {
      max-width: 100%;
    }
    .qr-section--compact {
      margin-top: var(--space-3);
      margin-bottom: 0;
    }
    .qr-section--compact .qr-card {
      padding: var(--space-3);
      box-shadow: none;
      background: var(--color-bg);
      border-style: dashed;
    }
    .qr-section--compact .qr-code-wrapper {
      margin: var(--space-2) 0;
    }
    .qr-section--compact .qr-footer {
      margin-top: var(--space-2);
      padding-top: var(--space-2);
    }

    /* Session Actions */
    .session-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-2);
      align-items: center;
      min-height: 2.75rem;
      margin-top: auto;
      margin-bottom: var(--space-3);
    }
    .session-actions .btn {
      width: 100%;
      justify-content: center;
    }
    .session-actions--inactive {
      display: flex;
      justify-content: center;
    }
    .session-actions--inactive .btn {
      width: auto;
      min-width: 8rem;
    }
    .btn-success {
      background: #22c55e;
      color: white;
      &:hover { background: #16a34a; }
    }
    .btn-warning {
      background: #f59e0b;
      color: white;
      &:hover { background: #d97706; }
    }
    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Table view (data table) */
    .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: var(--space-6); }
    .tables-data-table { width: 100%; border-collapse: collapse; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .tables-data-table th, .tables-data-table td { padding: var(--space-3) var(--space-4); text-align: left; border-bottom: 1px solid var(--color-border); }
    .tables-data-table th { background: var(--color-bg); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
    .tables-data-table th.th-actions {
      text-align: right;
      width: 11rem;
      min-width: 11rem;
    }
    .tables-data-table td.td-actions {
      text-align: right;
      width: 11rem;
      min-width: 11rem;
      vertical-align: middle;
    }
    .tables-data-table tbody tr:hover td { background: var(--color-bg); }
    .tables-data-table .table-name { font-weight: 600; cursor: pointer; }
    .tables-data-table .table-name:hover { color: var(--color-primary); }
    .tables-data-table .status-stack { min-width: 8rem; }
    .tables-data-table .waiter-select-inline { padding: var(--space-1) var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 0.8125rem; background: var(--color-surface); color: var(--color-text); min-width: 120px; }
    .tables-data-table .waiter-inherited-inline { font-size: 0.6875rem; color: var(--color-text-muted); font-style: italic; margin-top: 2px; }
    .tables-data-table .waiter-readonly-inline { font-size: 0.8125rem; color: var(--color-text); }
    .tables-data-table .status-inline { display: inline-flex; align-items: center; gap: var(--space-1); }
    .tables-data-table .table-cell-edit { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
    .tables-data-table .edit-input-inline,
    .tables-data-table .edit-select-inline { padding: var(--space-1) var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 0.875rem; }
    .tables-data-table .edit-input-inline.edit-seats { width: 56px; }
    .tables-data-table .edit-select-inline { min-width: 100px; background: var(--color-bg); }
    .tables-data-table .td-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      justify-content: flex-end;
      align-items: center;
      align-content: center;
    }
    .tables-data-table .td-actions--row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 2.35rem));
      grid-auto-rows: 2.35rem;
      justify-content: end;
      justify-items: end;
      gap: 0.45rem;
    }
    .tables-data-table .td-actions--row .btn-square,
    .tables-data-table .td-actions--row .icon-btn {
      width: 2.35rem;
      min-width: 2.35rem;
      max-width: 2.35rem;
      height: 2.35rem;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      margin: 0;
    }
    .tables-data-table .td-actions--row .btn-square.btn-secondary,
    .tables-data-table .td-actions--row .btn-square.btn-ghost,
    .tables-data-table .td-actions--row .btn-square.btn-warning,
    .tables-data-table .td-actions--row .btn-square.btn-success {
      font-size: 0.95rem;
      line-height: 1;
    }
    .tables-data-table .td-actions--row .icon-btn {
      border: 1px solid var(--color-border);
      background: var(--color-surface);
    }
    .tables-data-table .td-actions--row .icon-btn:hover {
      background: var(--color-bg);
    }
    .tables-data-table .td-actions--row .btn svg,
    .tables-data-table .td-actions--row .icon-btn svg {
      flex-shrink: 0;
    }

    .table-service-overlay,
    .quick-customize-overlay {
      position: fixed;
      inset: 0;
      z-index: 1100;
      display: grid;
      place-items: center;
      padding: 2rem;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(8px);
    }
    .table-service-drawer {
      width: min(1280px, 96vw);
      height: min(880px, 94vh);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border-radius: 28px;
      border: 1px solid rgba(226, 232, 240, 0.95);
      background: #f7f8f6;
      box-shadow: 0 32px 90px rgba(15, 23, 42, 0.28);
    }
    .table-service-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem 1.5rem 1rem;
      background: #fff;
      border-bottom: 1px solid #e6e8e5;
    }
    .table-service-header h2,
    .table-service-header p,
    .quick-cart-title h3,
    .quick-orders-heading h3,
    .quick-qr-view h3,
    .quick-customize-dialog h3 { margin: 0; }
    .table-service-header h2 { font-size: 1.7rem; letter-spacing: -0.03em; }
    .table-service-header p { margin-top: 0.2rem; color: #64716b; }
    .table-service-eyebrow,
    .quick-cart-title span,
    .quick-orders-heading span,
    .quick-customize-dialog header span {
      color: #c84f2f;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .table-service-header-actions { display: flex; align-items: center; gap: 0.7rem; }
    .service-status {
      display: inline-flex;
      align-items: center;
      min-height: 2.25rem;
      padding: 0.45rem 0.9rem;
      border-radius: 999px;
      background: #eef0ed;
      color: #59635d;
      font-size: 0.78rem;
      font-weight: 800;
    }
    .service-status--live { background: #e2f2eb; color: #167354; }
    .table-service-close,
    .quick-customize-dialog header button {
      width: 2.5rem;
      height: 2.5rem;
      border: 0;
      border-radius: 50%;
      background: #f1f2ef;
      color: #26312b;
      font-size: 1.55rem;
      cursor: pointer;
    }
    .table-service-tabs {
      display: flex;
      gap: 0.5rem;
      padding: 0.8rem 1.5rem;
      background: #fff;
      border-bottom: 1px solid #e6e8e5;
    }
    .table-service-tabs button {
      border: 0;
      border-radius: 999px;
      padding: 0.7rem 1.1rem;
      background: transparent;
      color: #67716c;
      font-weight: 750;
      cursor: pointer;
    }
    .table-service-tabs button.active { background: #193c32; color: #fff; }
    .table-service-tabs span { margin-left: 0.35rem; opacity: 0.7; }
    .table-service-alert,
    .table-service-success {
      margin: 0.8rem 1.5rem 0;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      font-weight: 650;
    }
    .table-service-alert { background: #fff0ec; color: #a83820; border: 1px solid #f7c7ba; }
    .table-service-success { background: #e8f6ef; color: #166b4f; border: 1px solid #bfe4d1; }
    .quick-order-workspace {
      min-height: 0;
      flex: 1;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 370px;
      overflow: hidden;
    }
    .quick-menu-pane { min-width: 0; overflow: auto; padding: 1.25rem; }
    .quick-menu-toolbar { position: sticky; top: -1.25rem; z-index: 4; padding: 0.1rem 0 1rem; background: #f7f8f6; }
    .quick-search { display: block; }
    .quick-search span { display: block; margin-bottom: 0.4rem; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #68736d; }
    .quick-search input {
      width: 100%;
      min-height: 3.1rem;
      padding: 0 1rem;
      border: 1px solid #dce1dc;
      border-radius: 14px;
      background: #fff;
      font-size: 1rem;
    }
    .quick-categories { display: flex; gap: 0.5rem; overflow-x: auto; padding-top: 0.75rem; scrollbar-width: none; }
    .quick-categories button {
      flex: 0 0 auto;
      padding: 0.65rem 0.95rem;
      border: 1px solid #d9ded9;
      border-radius: 999px;
      background: #fff;
      color: #536059;
      font-weight: 700;
      cursor: pointer;
    }
    .quick-categories button.active { border-color: #d95c38; background: #fff0eb; color: #a83c22; }
    .quick-product-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.85rem; }
    .quick-product-card {
      position: relative;
      min-width: 0;
      min-height: 235px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 0;
      border: 1px solid #e0e4df;
      border-radius: 18px;
      background: #fff;
      color: #16231d;
      text-align: left;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(30, 45, 38, 0.05);
      transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
    }
    .quick-product-card:hover { transform: translateY(-2px); border-color: #e18a70; box-shadow: 0 14px 30px rgba(30, 45, 38, 0.1); }
    .quick-product-image { height: 112px; background: #edf0ec; }
    .quick-product-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .quick-product-image--placeholder { display: grid; place-items: center; background: linear-gradient(135deg, #e7eee9, #f4e9df); }
    .quick-product-image--placeholder span { font-size: 2rem; font-weight: 850; color: #35594c; }
    .quick-product-copy { min-height: 0; display: flex; flex: 1; flex-direction: column; padding: 0.75rem; }
    .quick-product-category { color: #c34c2e; font-size: 0.67rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
    .quick-product-copy strong { margin-top: 0.18rem; font-size: 1rem; line-height: 1.18; }
    .quick-product-copy small { margin-top: 0.3rem; color: #6e7973; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .quick-product-price { margin-top: auto; padding-top: 0.55rem; font-weight: 850; }
    .quick-add-badge { position: absolute; top: 0.55rem; right: 0.55rem; min-width: 2rem; height: 2rem; display: grid; place-items: center; padding: 0 0.45rem; border-radius: 999px; background: #d95733; color: #fff; font-weight: 850; box-shadow: 0 4px 14px rgba(141, 48, 23, 0.3); }
    .quick-cart-pane { min-width: 0; display: flex; flex-direction: column; padding: 1.25rem; background: #fff; border-left: 1px solid #e0e4df; }
    .quick-cart-title { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .quick-cart-title h3 { margin-top: 0.2rem; font-size: 1.35rem; }
    .quick-text-button { border: 0; background: none; color: #a8462b; font-weight: 750; cursor: pointer; }
    .quick-cart-empty { flex: 1; display: grid; place-content: center; justify-items: center; gap: 0.45rem; padding: 2rem; color: #68736d; text-align: center; }
    .quick-cart-empty > span { width: 3.2rem; height: 3.2rem; display: grid; place-items: center; border-radius: 50%; background: #edf3ef; color: #2c6551; font-size: 1.7rem; }
    .quick-cart-empty strong { color: #27342e; font-size: 1.05rem; }
    .quick-cart-lines { flex: 1; min-height: 0; overflow: auto; margin: 0.9rem -0.2rem 0; padding-right: 0.2rem; }
    .quick-cart-line { display: flex; justify-content: space-between; gap: 0.8rem; padding: 0.85rem 0; border-bottom: 1px solid #edf0ed; }
    .quick-cart-line > div:first-child { min-width: 0; display: flex; flex-direction: column; gap: 0.18rem; }
    .quick-cart-line strong { line-height: 1.2; }
    .quick-cart-line small { color: #7b6d67; line-height: 1.25; }
    .quick-cart-line span { color: #516059; font-weight: 750; }
    .quick-quantity { flex: 0 0 auto; display: flex; align-items: center; gap: 0.55rem; }
    .quick-quantity button { width: 2rem; height: 2rem; border: 1px solid #dfe3df; border-radius: 50%; background: #fff; font-size: 1.15rem; cursor: pointer; }
    .quick-cart-footer { padding-top: 0.85rem; border-top: 1px solid #dfe3df; }
    .quick-cart-footer > div { display: flex; justify-content: space-between; padding: 0.25rem 0; color: #66726b; }
    .quick-cart-footer > div strong { color: #1f2b25; }
    .quick-submit { width: 100%; min-height: 3.25rem; margin-top: 0.75rem; border: 0; border-radius: 14px; background: #d75632; color: #fff; font-size: 0.98rem; font-weight: 850; cursor: pointer; }
    .quick-submit:disabled { opacity: 0.45; cursor: not-allowed; }
    .quick-empty { padding: 3rem 1rem; color: #68736d; text-align: center; }
    .quick-orders-view { flex: 1; overflow: auto; padding: 1.25rem 1.5rem 1.5rem; }
    .quick-orders-heading { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .quick-orders-heading h3 { margin-top: 0.2rem; font-size: 1.45rem; }
    .quick-order-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.85rem; }
    .quick-order-card { padding: 1rem; border: 1px solid #dfe4df; border-radius: 16px; background: #fff; }
    .quick-order-card--active { border-color: #63a98e; box-shadow: 0 0 0 2px rgba(57, 137, 108, 0.13); }
    .quick-order-card-head,
    .quick-order-total { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; }
    .quick-order-card-head > div { display: flex; flex-direction: column; }
    .quick-order-card-head small { color: #748079; }
    .quick-order-card-head strong { margin-top: 0.12rem; font-size: 1.05rem; }
    .quick-order-state { padding: 0.35rem 0.55rem; border-radius: 999px; background: #edf0ed; font-size: 0.68rem; font-weight: 850; }
    .quick-order-state--paid { background: #e0f3e9; color: #176d51; }
    .quick-order-state--cancelled { background: #f8e5e1; color: #9e3825; }
    .quick-order-items { min-height: 76px; display: flex; flex-direction: column; gap: 0.3rem; margin: 0.8rem 0; color: #56635c; }
    .quick-order-items b { color: #25312b; }
    .quick-order-total { padding-top: 0.75rem; border-top: 1px solid #edf0ed; }
    .quick-order-total span { color: #6b766f; text-transform: capitalize; }
    .quick-move-view { flex: 1; overflow: auto; padding: 1.25rem 1.5rem 1.5rem; }
    .quick-move-panel {
      width: min(620px, 100%);
      display: grid;
      gap: 1rem;
      padding: 1.1rem;
      border: 1px solid #dfe4df;
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 12px 32px rgba(30, 45, 38, 0.06);
    }
    .quick-move-summary {
      display: grid;
      gap: 0.25rem;
      padding: 0.95rem;
      border-radius: 14px;
      background: #f3f6f2;
      color: #55635b;
    }
    .quick-move-summary span,
    .quick-move-field span {
      font-size: 0.72rem;
      font-weight: 850;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #c84f2f;
    }
    .quick-move-summary strong { color: #203027; font-size: 1.35rem; }
    .quick-move-summary small,
    .quick-move-help { color: #65716a; line-height: 1.45; }
    .quick-move-field { display: grid; gap: 0.45rem; }
    .quick-move-field select,
    .quick-move-field textarea {
      width: 100%;
      padding: 0.8rem 0.9rem;
      border: 1px solid #dce1dc;
      border-radius: 12px;
      background: #fff;
      color: #223029;
      font: inherit;
    }
    .quick-move-field textarea { resize: vertical; }
    .quick-move-help { margin: 0; font-size: 0.86rem; }
    .quick-qr-view { flex: 1; overflow: auto; display: grid; place-content: center; justify-items: center; padding: 1.5rem; text-align: center; }
    .quick-qr-view h3 { margin-top: 0.25rem; font-size: 2rem; }
    .quick-qr-view > p { max-width: 540px; color: #65716a; }
    .quick-qr-card { width: min(360px, 80vw); display: grid; justify-items: center; gap: 0.5rem; margin-top: 0.8rem; padding: 1.4rem; border: 1px solid #dce1dc; border-radius: 20px; background: #fff; }
    .quick-qr-card strong { font-size: 1.4rem; }
    .quick-qr-card small { max-width: 100%; overflow-wrap: anywhere; color: #7a847e; }
    .quick-qr-actions { display: flex; gap: 0.65rem; margin-top: 1rem; }
    .quick-customize-dialog { width: min(620px, 94vw); max-height: 88vh; overflow: hidden; display: flex; flex-direction: column; border-radius: 24px; background: #fff; box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3); }
    .quick-customize-dialog header { display: flex; justify-content: space-between; align-items: center; padding: 1.15rem 1.25rem; border-bottom: 1px solid #e5e8e4; }
    .quick-customize-dialog h3 { margin-top: 0.2rem; font-size: 1.45rem; }
    .quick-customize-body { overflow: auto; padding: 1.25rem; }
    .quick-question + .quick-question { margin-top: 1.25rem; }
    .quick-question > label { display: block; margin-bottom: 0.6rem; font-weight: 800; }
    .quick-question > label b { color: #d75632; }
    .quick-choice-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.55rem; }
    .quick-choice-grid--scale { grid-template-columns: repeat(auto-fit, minmax(3rem, 1fr)); }
    .quick-choice-grid button { min-height: 2.8rem; padding: 0.5rem; border: 1px solid #dce1dc; border-radius: 12px; background: #fafbfa; color: #334039; font-weight: 700; cursor: pointer; }
    .quick-choice-grid button.active { border-color: #d75a37; background: #fff0eb; color: #a33b22; box-shadow: inset 0 0 0 1px #d75a37; }
    .quick-question textarea { width: 100%; padding: 0.75rem; border: 1px solid #dce1dc; border-radius: 12px; resize: vertical; font: inherit; }
    .quick-customize-dialog footer { display: flex; justify-content: flex-end; gap: 0.65rem; padding: 1rem 1.25rem; border-top: 1px solid #e5e8e4; }

    @media (max-width: 768px) {
      .table-grid { grid-template-columns: 1fr; }
      .status-section-top {
        align-items: stretch;
      }
      .table-actions--primary {
        flex-direction: column;
      }
      .table-actions--primary .btn {
        width: 100%;
      }
      .tables-data-table th.th-actions,
      .tables-data-table td.td-actions {
        min-width: 7rem;
        width: 7rem;
      }
      .tables-data-table .td-actions--row {
        gap: 0.35rem;
        grid-template-columns: repeat(2, minmax(0, 2.25rem));
      }
      .tables-data-table .td-actions--row .btn-square,
      .tables-data-table .td-actions--row .icon-btn {
        width: 2.25rem;
        min-width: 2.25rem;
        max-width: 2.25rem;
        height: 2.25rem;
      }
      .table-service-overlay { padding: 0; }
      .table-service-drawer { width: 100vw; height: 100dvh; border-radius: 0; }
      .table-service-header { padding: 0.9rem 1rem; }
      .table-service-tabs { padding: 0.65rem 1rem; overflow-x: auto; }
      .quick-order-workspace { display: flex; flex-direction: column; overflow: auto; }
      .quick-menu-pane { overflow: visible; padding: 0.9rem; }
      .quick-menu-toolbar { top: 0; padding-top: 0.1rem; }
      .quick-product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .quick-product-card { min-height: 210px; }
      .quick-cart-pane { min-height: 420px; border-left: 0; border-top: 1px solid #e0e4df; }
      .quick-order-list { grid-template-columns: 1fr; }
      .quick-orders-heading { align-items: flex-start; flex-direction: column; }
    }
    @media print {
      body * { visibility: hidden !important; }
      .table-qr-print,
      .table-qr-print * { visibility: visible !important; }
      .table-qr-print { position: fixed !important; inset: 0 !important; display: grid !important; place-content: center !important; background: #fff !important; }
      .quick-qr-actions { display: none !important; }
      .quick-qr-card { border: 2px solid #111 !important; box-shadow: none !important; }
    }
  `]
})
export class TablesComponent implements OnInit {
  private api = inject(ApiService);
  private permissions = inject(PermissionService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private tablesArea = inject(TablesAreaPreferenceService);
  private apiErr = inject(ApiErrorMessageService);

  /** When true, skip restoring view mode from localStorage (URL ?view= had priority). */
  private viewResolvedFromQuery = false;

  tables = signal<CanvasTable[]>([]);
  floors = signal<Floor[]>([]);
  loading = signal(true);
  error = signal('');
  showForm = signal(false);
  viewMode = signal<'tiles' | 'table'>(getInitialTablesViewMode());
  newTableName = '';
  selectedFloorId: number | null = null;
  tenantSettings = signal<TenantSettings | null>(null);

  editingTableId = signal<number | null>(null);
  editingName = '';
  editingFloorId: number | null = null;
  editingSeatCount: number | null = null;
  copiedTableId = signal<number | null>(null);
  activatingTableId = signal<number | null>(null);
  /** While fetching staff menu token for open-in-new-tab. */
  staffMenuOpeningTableId = signal<number | null>(null);
  waiters = signal<User[]>([]);
  queueSummary = signal<GuestQueueSummary | null>(null);
  queueEntries = signal<GuestQueueEntry[]>([]);
  quickOrderTable = signal<CanvasTable | null>(null);
  quickOrderView = signal<'menu' | 'orders' | 'history' | 'move' | 'qr'>('menu');
  quickOrderProducts = signal<Product[]>([]);
  quickTableOrders = signal<Order[]>([]);
  quickOrderLoading = signal(false);
  quickOrderSubmitting = signal(false);
  quickMovingBill = signal(false);
  quickMoveTargetTableId = signal<number | null>(null);
  quickMoveReason = signal('');
  quickOrderSearch = signal('');
  quickOrderCategory = signal('All items');
  quickOrderCart = signal<QuickOrderLine[]>([]);
  quickOrderError = signal('');
  quickOrderSuccess = signal('');
  quickCustomizeProduct = signal<Product | null>(null);
  quickCustomizationAnswers = signal<Record<string, string | number | string[]>>({});
  quickCustomizationError = signal('');

  quickOrderCategories = computed(() => {
    const categories = Array.from(new Set(
      this.quickOrderProducts().map((product) => product.category?.trim()).filter((category): category is string => !!category),
    )).sort((a, b) => a.localeCompare(b));
    return ['All items', ...categories];
  });

  quickOrderProductsFiltered = computed(() => {
    const search = this.quickOrderSearch().trim().toLocaleLowerCase();
    const category = this.quickOrderCategory();
    return this.quickOrderProducts().filter((product) => {
      if (category !== 'All items' && product.category !== category) return false;
      if (!search) return true;
      return [product.name, product.category, product.subcategory, product.description]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(search));
    });
  });

  quickCartItemCount = computed(() => this.quickOrderCart().reduce((total, line) => total + line.quantity, 0));
  quickCartTotalCents = computed(() => this.quickOrderCart().reduce(
    (total, line) => total + (line.product.price_cents * line.quantity),
    0,
  ));
  quickCurrentSessionOrders = computed(() => {
    const table = this.quickOrderTable();
    const activeOrderId = table?.active_order_id ?? null;
    if (!table?.is_active) return [];
    return this.quickTableOrders().filter((order) =>
      order.is_current_table_session === true ||
      (activeOrderId != null && order.id === activeOrderId) ||
      (!!order.table_is_active && order.table_active_order_id === order.id)
    );
  });
  quickHistoryOrders = computed(() => {
    const currentIds = new Set(this.quickCurrentSessionOrders().map((order) => order.id));
    return this.quickTableOrders().filter((order) => !currentIds.has(order.id));
  });
  quickMoveTargetTables = computed(() => {
    const current = this.quickOrderTable();
    if (!current?.id) return [];
    return this.tables()
      .filter((table) => table.id != null && table.id !== current.id)
      .filter((table) => !table.is_active && table.active_order_id == null)
      .sort((a, b) => {
        const floorCompare = this.getFloorName(a.floor_id).localeCompare(this.getFloorName(b.floor_id));
        if (floorCompare !== 0) return floorCompare;
        return (a.name || '').localeCompare(b.name || '');
      });
  });

  // Confirmation Modal State
  confirmationModal = signal<{
    show: boolean;
    title: string;
    message: string;
    messageParams?: Record<string, string>;
    confirmText: string;
    cancelText: string;
    confirmBtnClass: string;
    tableToDelete: Table | null;
    tableToClose: Table | null;
  }>({
    show: false,
    title: '',
    message: '',
    confirmText: 'COMMON.YES',
    cancelText: 'COMMON.NO',
    confirmBtnClass: 'btn-primary',
    tableToDelete: null,
    tableToClose: null
  });

  private toastTimeout?: ReturnType<typeof setTimeout>;
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  /** When set, show modal to reassign this table's orders to another table before delete. */
  reassignTableModal = signal<Table | null>(null);
  reassignTargetTableId = signal<number | null>(null);

  otherTablesForReassign = computed(() => {
    const table = this.reassignTableModal();
    if (!table?.id) return [];
    return this.tables().filter(t => t.id !== table.id);
  });

  /** List view: which joined groups show member rows (by group id). */
  expandedListGroupIds = signal<number[]>([]);
  /** Tiles view: expanded group member rows as "groupId-tableId". */
  expandedTileGroupMemberKeys = signal<string[]>([]);
  /** Warn before activate / open menu when another group member already has a session or order. */
  groupSafetyModal = signal<{ table: Table; action: 'activate' | 'menu'; siblingNames: string } | null>(null);

  reservationArrivals = computed<FloorReservationArrival[]>(() => {
    return this.tables()
      .filter((table) => !!table.upcoming_reservation && !!table.id)
      .map((table) => {
        const reservation = table.upcoming_reservation!;
        const minutesUntil = this.minutesUntilReservation(
          reservation.reservation_time,
          reservation.reservation_date,
        ) ?? 9999;
        return {
          tableId: table.id!,
          tableName: table.name,
          floorName: this.getFloorName(table.floor_id),
          guestName: reservation.customer_name?.trim() || 'Reserved guest',
          timeLabel: this.formatReservationTime(reservation.reservation_time),
          minutesUntil,
          ...this.reservationUrgencyMeta(
            reservation.reservation_time,
            reservation.reservation_date,
          ),
        };
      })
      .sort((a, b) => a.minutesUntil - b.minutesUntil)
      .slice(0, 4)
      .map(({ minutesUntil, ...row }) => row);
  });

  queueSeatSuggestions = computed<QueueSeatingSuggestion[]>(() => {
    const tables = this.tables()
      .filter((table) => table.id != null)
      .filter((table) => this.isTableReadyForQueue(table))
      .sort((a, b) => (a.seat_count ?? 0) - (b.seat_count ?? 0));

    const entries = this.queueEntries()
      .filter((entry) => entry.status === 'waiting' || entry.status === 'notified')
      .slice(0, 4);

    const usedTableIds = new Set<number>();
    const suggestions: QueueSeatingSuggestion[] = [];

    for (const entry of entries) {
      const bestTable = this.bestQueueTableForEntry(entry, tables, usedTableIds);
      if (!bestTable?.id) continue;
      usedTableIds.add(bestTable.id);
      suggestions.push({
        entryId: entry.id,
        guestName: entry.customer_name,
        partySize: entry.party_size,
        floorName: this.getFloorName(bestTable.floor_id),
        tableId: bestTable.id,
        tableName: bestTable.name,
        matchLabel: this.queueMatchLabel(entry, bestTable),
        cautionLabel: bestTable.upcoming_reservation
          ? `Reserved ${this.formatReservationTime(bestTable.upcoming_reservation.reservation_time)}`
          : undefined,
      });
    }

    return suggestions;
  });

  constructor() {
    effect(() => {
      const mode = this.viewMode();
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(TABLES_VIEW_STORAGE_KEY, mode);
        }
      } catch (_) {}
    });
    // Restore view mode from localStorage after first browser paint (ensures we run in client context)
    afterNextRender(() => {
      if (this.viewResolvedFromQuery) {
        return;
      }
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const saved = window.localStorage.getItem(TABLES_VIEW_STORAGE_KEY);
          if (saved === 'tiles' || saved === 'table') {
            this.viewMode.set(saved);
          }
        }
      } catch (_) {}
    });
  }

  /** Set view mode and persist to localStorage immediately (so it survives navigation). */
  setViewMode(mode: 'tiles' | 'table') {
    this.viewMode.set(mode);
    try {
      const storage = typeof window !== 'undefined' && window.localStorage;
      if (storage) {
        storage.setItem(TABLES_VIEW_STORAGE_KEY, mode);
      }
    } catch (e) {
      console.warn('Tables: could not persist view mode to localStorage', e);
    }
  }

  ngOnInit() {
    this.tablesArea.setArea('list');
    const v = this.route.snapshot.queryParamMap.get('view');
    if (v === 'tiles' || v === 'table') {
      this.viewResolvedFromQuery = true;
      this.setViewMode(v);
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { view: null },
        replaceUrl: true,
      });
    }
    this.loadData();
    this.loadTenantSettings();
    this.api.waitForInitialAuthCheck().subscribe(() => {
      if (this.canManageTableAssignments()) {
        this.api.getWaiters().subscribe({
          next: waiters => this.waiters.set(waiters),
          error: () => {}
        });
      }
    });
  }

  /** Owner/admin: can change table/floor waiter assignment (requires user list API). */
  canManageTableAssignments(): boolean {
    return this.permissions.hasPermission(this.api.getCurrentUser(), 'table:write');
  }

  canOpenQueue(): boolean {
    return this.permissions.canAccessRoute(this.api.getCurrentUser(), '/queue');
  }

  /** Rename/reorder/deactivate floors for public booking zones. */
  canManageFloors(): boolean {
    return this.permissions.hasPermission(this.api.getCurrentUser(), 'floor:write');
  }

  floorsSorted(): Floor[] {
    return [...this.floors()].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  floorSortIndex(floor: Floor): number {
    return this.floorsSorted().findIndex(f => f.id === floor.id);
  }

  isFirstFloorSort(floor: Floor): boolean {
    return this.floorSortIndex(floor) <= 0;
  }

  isLastFloorSort(floor: Floor): boolean {
    const s = this.floorsSorted();
    return this.floorSortIndex(floor) >= s.length - 1;
  }

  toggleFloorActive(floor: Floor, event: Event) {
    const el = event.target as HTMLInputElement;
    if (!floor.id) return;
    const next = el.checked;
    this.api.updateFloor(floor.id, { is_active: next }).subscribe({
      next: u => this.floors.update(fs => fs.map(f => (f.id === u.id ? u : f))),
      error: err => {
        el.checked = !next;
        this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
      },
    });
  }

  onFloorSeatingZoneChange(floor: Floor, event: Event) {
    const sel = event.target as HTMLSelectElement;
    const v = sel.value;
    if (!floor.id) return;
    this.api.updateFloor(floor.id, { seating_zone: v }).subscribe({
      next: (u) => this.floors.update((fs) => fs.map((f) => (f.id === u.id ? u : f))),
      error: (err: any) => this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED')),
    });
  }

  moveFloorSort(floor: Floor, delta: number) {
    const sorted = this.floorsSorted();
    const i = sorted.findIndex(f => f.id === floor.id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    const a = sorted[i];
    const b = sorted[j];
    const aid = a.id;
    const bid = b.id;
    if (aid == null || bid == null) return;
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    this.api.updateFloor(aid, { sort_order: bo }).subscribe({
      next: () => {
        this.api.updateFloor(bid, { sort_order: ao }).subscribe({
          next: () => this.loadData(),
          error: err => this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED')),
        });
      },
      error: err => this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED')),
    });
  }

  /** Double-click a tile: open staff orders filtered to this table. */
  onTableCardDoubleClick(table: CanvasTable) {
    if (!this.permissions.canAccessRoute(this.api.getCurrentUser(), '/staff/orders') || !table.id) return;
    void this.router.navigate(['/staff/orders'], {
      queryParams: { focusTableId: table.id, table: table.id },
    });
  }

  canOpenStaffOrders(): boolean {
    return this.permissions.canAccessRoute(this.api.getCurrentUser(), '/staff/orders');
  }

  openQuickTable(table: CanvasTable, view: 'menu' | 'orders' | 'history' | 'move' | 'qr' = 'menu'): void {
    if (!table.id) return;
    this.quickOrderTable.set(table);
    this.quickOrderView.set(view);
    this.quickOrderSearch.set('');
    this.quickOrderCategory.set('All items');
    this.quickOrderCart.set([]);
    this.quickMoveReason.set('');
    this.quickMoveTargetTableId.set(this.quickMoveTargetTables()[0]?.id ?? null);
    this.quickOrderError.set('');
    this.quickOrderSuccess.set('');
    this.loadQuickTableData(table.id);
  }

  closeQuickTable(): void {
    if (this.quickOrderSubmitting()) return;
    this.quickOrderTable.set(null);
    this.quickOrderCart.set([]);
    this.quickMoveTargetTableId.set(null);
    this.quickMoveReason.set('');
    this.quickOrderError.set('');
    this.quickOrderSuccess.set('');
    this.cancelQuickCustomization();
  }

  private loadQuickTableData(tableId: number): void {
    this.quickOrderLoading.set(true);
    let productsDone = false;
    let ordersDone = false;
    const finish = () => {
      if (productsDone && ordersDone) this.quickOrderLoading.set(false);
    };

    this.api.getProducts().subscribe({
      next: (products) => {
        this.quickOrderProducts.set(products.filter((product) => product.id != null));
        productsDone = true;
        finish();
      },
      error: (err) => {
        this.quickOrderError.set(this.apiErr.fromHttpError(err, 'Could not load the menu.'));
        productsDone = true;
        finish();
      },
    });
    this.api.getOrders(true).subscribe({
      next: (orders) => {
        this.quickTableOrders.set(
          orders
            .filter((order) => order.table_id === tableId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        );
        ordersDone = true;
        finish();
      },
      error: (err) => {
        this.quickOrderError.set(this.apiErr.fromHttpError(err, 'Could not load table orders.'));
        ordersDone = true;
        finish();
      },
    });
  }

  getQuickProductImageUrl(product: Product): string | null {
    return this.api.getProductImageUrl(product);
  }

  selectQuickProduct(product: Product): void {
    if ((product.questions || []).length > 0) {
      this.quickCustomizeProduct.set(product);
      this.quickCustomizationAnswers.set({});
      this.quickCustomizationError.set('');
      return;
    }
    this.addQuickOrderLine(product);
  }

  private addQuickOrderLine(
    product: Product,
    customizationAnswers?: Record<string, string | number | string[]>,
    customizationSummary?: string,
  ): void {
    const signature = customizationAnswers ? JSON.stringify(customizationAnswers) : '';
    this.quickOrderCart.update((lines) => {
      const index = lines.findIndex((line) => (
        line.product.id === product.id
        && JSON.stringify(line.customizationAnswers || {}) === (signature || '{}')
      ));
      if (index < 0) return [...lines, { product, quantity: 1, customizationAnswers, customizationSummary }];
      return lines.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: line.quantity + 1 } : line);
    });
    this.quickOrderSuccess.set('');
  }

  quickProductQuantity(product: Product): number {
    return this.quickOrderCart()
      .filter((line) => line.product.id === product.id)
      .reduce((total, line) => total + line.quantity, 0);
  }

  changeQuickLineQuantity(index: number, delta: number): void {
    this.quickOrderCart.update((lines) => lines
      .map((line, lineIndex) => lineIndex === index ? { ...line, quantity: line.quantity + delta } : line)
      .filter((line) => line.quantity > 0));
  }

  clearQuickCart(): void {
    this.quickOrderCart.set([]);
    this.quickOrderError.set('');
  }

  openQuickTableForQrOrdering(table: CanvasTable): void {
    if (!table.id || table.is_active || this.activatingTableId() === table.id || this.quickOrderSubmitting()) return;
    this.activatingTableId.set(table.id);
    this.quickOrderError.set('');
    this.quickOrderSuccess.set('');
    this.api.activateTable(table.id).subscribe({
      next: (response) => {
        const activated = {
          ...table,
          is_active: true,
          order_pin: null,
          active_order_id: response.active_order_id,
          activated_at: response.activated_at,
        };
        this.quickOrderTable.set(activated);
        this.tables.update((tables) => tables.map((candidate) => candidate.id === table.id ? activated : candidate));
        this.activatingTableId.set(null);
        this.quickOrderSuccess.set(`${table.name} is open for QR ordering.`);
        this.quickOrderView.set('qr');
      },
      error: (err) => {
        this.activatingTableId.set(null);
        this.quickOrderError.set(this.apiErr.fromHttpError(err, 'Could not open this table for QR ordering.'));
      },
    });
  }

  quickQuestionChoices(question: ProductQuestion): string[] {
    if (Array.isArray(question.options)) return question.options.map(String);
    if (question.options && 'choices' in question.options && Array.isArray(question.options.choices)) {
      return question.options.choices.map(String);
    }
    return [];
  }

  quickQuestionScale(question: ProductQuestion): number[] {
    if (!question.options || Array.isArray(question.options) || !('min' in question.options) || !('max' in question.options)) return [];
    const min = Number(question.options.min);
    const max = Number(question.options.max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min || max - min > 20) return [];
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  }

  private quickQuestionIsMulti(question: ProductQuestion): boolean {
    return !!question.multi || !!(
      question.options
      && !Array.isArray(question.options)
      && 'multi' in question.options
      && question.options.multi
    );
  }

  quickAnswerHasChoice(question: ProductQuestion, option: string): boolean {
    const value = this.quickCustomizationAnswers()[String(question.id)];
    return Array.isArray(value) ? value.includes(option) : value === option;
  }

  toggleQuickChoice(question: ProductQuestion, option: string): void {
    if (!this.quickQuestionIsMulti(question)) {
      this.setQuickAnswer(question, option);
      return;
    }
    const key = String(question.id);
    const current = this.quickCustomizationAnswers()[key];
    const choices = Array.isArray(current) ? current : [];
    const next = choices.includes(option) ? choices.filter((choice) => choice !== option) : [...choices, option];
    this.quickCustomizationAnswers.update((answers) => ({ ...answers, [key]: next }));
  }

  setQuickAnswer(question: ProductQuestion, value: string | number | string[]): void {
    this.quickCustomizationAnswers.update((answers) => ({ ...answers, [String(question.id)]: value }));
    this.quickCustomizationError.set('');
  }

  cancelQuickCustomization(): void {
    this.quickCustomizeProduct.set(null);
    this.quickCustomizationAnswers.set({});
    this.quickCustomizationError.set('');
  }

  confirmQuickCustomization(): void {
    const product = this.quickCustomizeProduct();
    if (!product) return;
    const answers = this.quickCustomizationAnswers();
    const missing = (product.questions || []).find((question) => {
      if (!question.required) return false;
      const value = answers[String(question.id)];
      return value == null || value === '' || (Array.isArray(value) && value.length === 0);
    });
    if (missing) {
      this.quickCustomizationError.set(`Choose ${missing.label} before adding this item.`);
      return;
    }
    const summary = (product.questions || [])
      .map((question) => {
        const value = answers[String(question.id)];
        if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
        return `${question.label}: ${Array.isArray(value) ? value.join(', ') : value}`;
      })
      .filter(Boolean)
      .join(' · ');
    this.addQuickOrderLine(product, answers, summary);
    this.cancelQuickCustomization();
  }

  submitQuickOrder(): void {
    const table = this.quickOrderTable();
    if (!table?.id || !this.quickOrderCart().length || this.quickOrderSubmitting()) return;
    const items: OrderItemCreate[] = this.quickOrderCart().map((line) => ({
      product_id: line.product.id!,
      quantity: line.quantity,
      source: line.product._source,
      customization_answers: line.customizationAnswers,
    }));
    this.quickOrderSubmitting.set(true);
    this.quickOrderError.set('');
    this.quickOrderSuccess.set('');

    const send = () => this.api.createStaffOrder({ table_id: table.id!, items }).subscribe({
      next: (response) => {
        const orderId = Number(response?.order_id || table.active_order_id || 0) || null;
        const updatedTable = { ...table, is_active: true, active_order_id: orderId };
        this.quickOrderTable.set(updatedTable);
        this.tables.update((tables) => tables.map((candidate) => candidate.id === table.id ? updatedTable : candidate));
        this.quickOrderCart.set([]);
        this.quickOrderSubmitting.set(false);
        this.quickOrderSuccess.set(`${items.reduce((sum, item) => sum + item.quantity, 0)} item${items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? '' : 's'} sent to the kitchen.`);
        this.loadQuickTableData(table.id!);
      },
      error: (err) => {
        this.quickOrderSubmitting.set(false);
        this.quickOrderError.set(this.apiErr.fromHttpError(err, 'Could not add items to this table.'));
      },
    });

    if (table.is_active) {
      send();
      return;
    }
    this.api.activateTable(table.id).subscribe({
      next: (response) => {
        const activated = { ...table, is_active: true, order_pin: null, active_order_id: response.active_order_id };
        this.quickOrderTable.set(activated);
        this.tables.update((tables) => tables.map((candidate) => candidate.id === table.id ? activated : candidate));
        send();
      },
      error: (err) => {
        this.quickOrderSubmitting.set(false);
        this.quickOrderError.set(this.apiErr.fromHttpError(err, 'Could not open this table for ordering.'));
      },
    });
  }

  moveQuickBill(): void {
    const source = this.quickOrderTable();
    if (!source?.id) return;
    const sourceId = source.id;
    const targetId = this.quickMoveTargetTableId();
    if (!targetId || this.quickMovingBill()) return;

    const target = this.tables().find((table) => table.id === targetId);
    if (!target) {
      this.quickOrderError.set('Choose a valid destination table.');
      return;
    }

    this.quickMovingBill.set(true);
    this.quickOrderError.set('');
    this.quickOrderSuccess.set('');
    this.api.moveTableBill(sourceId, targetId, this.quickMoveReason()).subscribe({
      next: (response) => {
        const movedTarget: CanvasTable = {
          ...target,
          is_active: true,
          active_order_id: response.active_order_id,
          activated_at: source.activated_at || new Date().toISOString(),
          operational_status: 'open_order',
          payment_status: 'pending',
          status: 'occupied',
        };
        const clearedSource: CanvasTable = {
          ...source,
          is_active: false,
          active_order_id: null,
          activated_at: null,
          order_pin: null,
          operational_status: source.upcoming_reservation ? 'reserved' : 'available',
          payment_status: 'none',
          status: source.upcoming_reservation ? 'reserved' : 'available',
          seated_reservation: null,
        };
        this.tables.update((tables) => tables.map((table) => {
          if (table.id === sourceId) return clearedSource;
          if (table.id === targetId) return movedTarget;
          return table;
        }));
        this.quickOrderTable.set(movedTarget);
        this.quickMoveReason.set('');
        this.quickMoveTargetTableId.set(this.quickMoveTargetTables()[0]?.id ?? null);
        this.quickMovingBill.set(false);
        this.quickOrderSuccess.set(`Bill moved from ${response.from_table_name} to ${response.to_table_name}.`);
        this.quickOrderView.set('orders');
        this.loadQuickTableData(targetId);
      },
      error: (err) => {
        this.quickMovingBill.set(false);
        this.quickOrderError.set(this.apiErr.fromHttpError(err, 'Could not move this bill. Choose a ready table and try again.'));
      },
    });
  }

  formatQuickMoney(cents: number): string {
    const currency = this.tenantSettings()?.currency_code || this.tenantSettings()?.currency || 'SGD';
    try {
      return new Intl.NumberFormat('en-SG', { style: 'currency', currency }).format((cents || 0) / 100);
    } catch {
      return `${currency} ${((cents || 0) / 100).toFixed(2)}`;
    }
  }

  formatQuickOrderTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  quickOrderStatusLabel(status: string): string {
    return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  printTableQr(): void {
    window.print();
  }

  openOrdersForTable(table: CanvasTable): void {
    if (!table.id || !this.canOpenStaffOrders()) return;
    void this.router.navigate(['/staff/orders'], {
      queryParams: {
        table: table.id,
        focusTableId: table.id,
      },
    });
  }

  openPosForTable(table: CanvasTable): void {
    if (!table.id) return;
    void this.router.navigate(['/pos'], {
      queryParams: {
        tableId: table.id,
        orderId: table.active_order_id ?? null,
      },
    });
  }

  tableOperatorStateLabel(table: CanvasTable): string {
    if (this.tableIsPaid(table)) {
      return 'Ready to clear';
    }
    if (table.active_order_id) {
      return 'Live order';
    }
    if (table.upcoming_reservation) {
      return 'Reserved soon';
    }
    if (table.seated_reservation) {
      const partySize = table.seated_reservation.party_size;
      return `Seated · ${partySize} ${partySize === 1 ? 'guest' : 'guests'}`;
    }
    if (table.is_active) {
      return 'Seated · start order';
    }
    return 'Idle table';
  }

  tableIsPaid(table: CanvasTable): boolean {
    return table.payment_status === 'paid';
  }

  tableNeedsSettlement(table: CanvasTable): boolean {
    return !!table.is_active && !!table.active_order_id && !this.tableIsPaid(table);
  }

  tablePrimaryActionLabel(table: CanvasTable): string {
    if (table.active_order_id) {
      return 'Resume order';
    }
    if (table.is_active || table.upcoming_reservation) {
      return 'Start order';
    }
    return 'Open POS';
  }

  tableReservationBadge(table: CanvasTable): string | null {
    if (!table.upcoming_reservation?.reservation_time) return null;
    return `Reserved ${this.formatReservationTime(table.upcoming_reservation.reservation_time)}`;
  }

  tableReservationHint(table: CanvasTable): string | null {
    if (table.seated_reservation) {
      const guest = table.seated_reservation.customer_name?.trim() || 'Guest';
      const partySize = table.seated_reservation.party_size;
      return `${guest} · ${partySize} ${partySize === 1 ? 'guest' : 'guests'}`;
    }
    if (!table.upcoming_reservation) return null;
    const time = table.upcoming_reservation.reservation_time
      ? this.formatReservationTime(table.upcoming_reservation.reservation_time)
      : null;
    const guest = table.upcoming_reservation.customer_name?.trim();
    if (guest && time) return `${guest} • ${time}`;
    if (guest) return guest;
    if (time) return `Reserved ${time}`;
    return 'Upcoming reservation';
  }

  private formatReservationTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  private reservationUrgencyMeta(
    value: string,
    reservationDate?: string | null,
  ): Pick<FloorReservationArrival, 'urgencyLabel' | 'urgencyTone'> {
    const minutes = this.minutesUntilReservation(value, reservationDate);
    if (minutes != null && minutes <= 15) {
      return { urgencyLabel: 'Due now', urgencyTone: 'due' };
    }
    if (minutes != null && minutes <= 45) {
      return { urgencyLabel: `In ${minutes} min`, urgencyTone: 'soon' };
    }
    return { urgencyLabel: 'Upcoming', urgencyTone: 'upcoming' };
  }

  private minutesUntilReservation(value: string, reservationDate?: string | null): number | null {
    if (!value) return null;
    let date = reservationDate
      ? new Date(`${reservationDate}T${value}`)
      : new Date(value);
    if (Number.isNaN(date.getTime())) {
      const timeMatch = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (!timeMatch) return null;
      date = new Date();
      date.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    }
    return Math.round((date.getTime() - Date.now()) / 60000);
  }

  private isTableReadyForQueue(table: CanvasTable): boolean {
    const status = table.operational_status ?? table.status ?? 'available';
    if (status !== 'available') return false;
    const minutes = table.upcoming_reservation?.reservation_time
      ? this.minutesUntilReservation(
          table.upcoming_reservation.reservation_time,
          table.upcoming_reservation.reservation_date,
        )
      : null;
    return minutes == null || minutes > 20;
  }

  private bestQueueTableForEntry(
    entry: GuestQueueEntry,
    tables: CanvasTable[],
    usedTableIds: Set<number>,
  ): CanvasTable | null {
    const candidates = tables
      .filter((table) => table.id != null && !usedTableIds.has(table.id))
      .filter((table) => (table.seat_count ?? 0) >= entry.party_size);

    if (!candidates.length) return null;

    const preferredFloorId = entry.preferred_floor_id ?? null;
    const preferredTableSize = entry.preferred_table_size ?? null;

    return [...candidates].sort((a, b) => {
      const scoreA = this.queueTableScore(a, entry.party_size, preferredFloorId, preferredTableSize);
      const scoreB = this.queueTableScore(b, entry.party_size, preferredFloorId, preferredTableSize);
      return scoreA - scoreB;
    })[0] ?? null;
  }

  private queueTableScore(
    table: CanvasTable,
    partySize: number,
    preferredFloorId: number | null,
    preferredTableSize: number | null,
  ): number {
    let score = Math.abs((table.seat_count ?? partySize) - partySize) * 10;
    if (preferredFloorId != null && table.floor_id === preferredFloorId) score -= 14;
    if (preferredTableSize != null && table.seat_count === preferredTableSize) score -= 8;
    if (table.upcoming_reservation) score += 30;
    return score;
  }

  private queueMatchLabel(entry: GuestQueueEntry, table: CanvasTable): string {
    const parts = [`${table.name}`, `${table.seat_count ?? entry.party_size} seats`];
    if (entry.preferred_floor_name && table.floor_id === entry.preferred_floor_id) {
      parts.push('preferred floor');
    }
    return parts.join(' • ');
  }

  loadData() {
    this.loading.set(true);
    // Use forkJoin if needed, but sequential is fine for now
    if (this.canOpenQueue()) {
      this.api.getGuestQueueSummary().subscribe({
        next: summary => this.queueSummary.set(summary),
        error: () => this.queueSummary.set(null),
      });
      this.api.getGuestQueue(false).subscribe({
        next: entries => this.queueEntries.set(entries),
        error: () => this.queueEntries.set([]),
      });
    } else {
      this.queueSummary.set(null);
      this.queueEntries.set([]);
    }
    this.api.getFloors().subscribe({
      next: floors => {
        this.floors.set(floors);
        if (floors.length > 0) {
          this.selectedFloorId = floors[0].id!;
        }
        this.api.getTablesWithStatus().subscribe({
          next: tables => { this.tables.set(tables); this.loading.set(false); },
          error: err => { this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED')); this.loading.set(false); }
        });
      },
      error: err => { this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED')); this.loading.set(false); }
    });
  }

  getTablesByFloor(floorId: number): CanvasTable[] {
    return this.tables().filter(t => t.floor_id === floorId);
  }

  getFloorName(floorId?: number | null): string {
    if (floorId == null) return '—';
    const floor = this.floors().find(f => f.id === floorId);
    return floor?.name ?? '—';
  }

  /** Sorted member names for a joined group (matches backend display). */
  private groupLabelFromMembers(members: CanvasTable[]): string {
    const names = members.map(m => m.name ?? '').filter(Boolean).sort((a, b) => a.localeCompare(b));
    return names.join(' + ');
  }

  tableHasActiveSessionOrOpenOrder(t: CanvasTable): boolean {
    if (t.is_active) return true;
    const oid = t.active_order_id;
    return oid != null && oid > 0;
  }

  /** Other members of the same group that already have an active session or open order. */
  getGroupSiblingActivityOthers(table: CanvasTable): CanvasTable[] {
    if (!table.table_group_id || table.id == null) return [];
    const gid = table.table_group_id;
    return this.tables().filter(
      t =>
        t.id != null &&
        t.id !== table.id &&
        t.table_group_id === gid &&
        this.tableHasActiveSessionOrOpenOrder(t),
    );
  }

  groupMembersHaveActivity(members: CanvasTable[]): boolean {
    return members.some(m => this.tableHasActiveSessionOrOpenOrder(m));
  }

  groupMembersHaveActiveSession(members: CanvasTable[]): boolean {
    return members.some(m => m.is_active);
  }

  listViewRows(): TablesListRow[] {
    const tables = this.tables();
    const byGroup = new Map<number, CanvasTable[]>();
    for (const t of tables) {
      if (t.table_group_id != null && t.id != null) {
        const arr = byGroup.get(t.table_group_id) ?? [];
        arr.push(t);
        byGroup.set(t.table_group_id, arr);
      }
    }
    for (const [, arr] of byGroup) {
      arr.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    }

    const seenGroup = new Set<number>();
    const rows: TablesListRow[] = [];
    for (const t of tables) {
      const gid = t.table_group_id;
      if (gid == null) {
        rows.push({ kind: 'single', table: t });
        continue;
      }
      if (seenGroup.has(gid)) continue;
      seenGroup.add(gid);
      const members = byGroup.get(gid) ?? [];
      if (members.length === 0) continue;
      const label = this.groupLabelFromMembers(members);
      const seatTotal =
        members[0].group_seat_total ?? members.reduce((s, m) => s + (m.seat_count ?? 0), 0);
      rows.push({
        kind: 'group',
        groupId: gid,
        floorId: members[0].floor_id ?? 0,
        members,
        label,
        seatTotal,
      });
    }
    return rows.sort((a, b) => {
      const floorA = this.getFloorName(a.kind === 'group' ? a.floorId : a.table.floor_id);
      const floorB = this.getFloorName(b.kind === 'group' ? b.floorId : b.table.floor_id);
      if (floorA !== floorB) return floorA.localeCompare(floorB);
      const nameA = a.kind === 'group' ? a.label : (a.table.name ?? '');
      const nameB = b.kind === 'group' ? b.label : (b.table.name ?? '');
      return nameA.localeCompare(nameB);
    });
  }

  trackListRow(_index: number, row: TablesListRow): string {
    if (row.kind === 'group') return `g-${row.groupId}`;
    return `t-${row.table.id ?? 0}`;
  }

  tileBlocksForFloor(floorId: number): TablesTileBlock[] {
    const onFloor = this.getTablesByFloor(floorId);
    const byGroup = new Map<number, CanvasTable[]>();
    for (const t of onFloor) {
      if (t.table_group_id != null && t.id != null) {
        const arr = byGroup.get(t.table_group_id) ?? [];
        arr.push(t);
        byGroup.set(t.table_group_id, arr);
      }
    }
    for (const [, arr] of byGroup) {
      arr.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    }
    const seen = new Set<number>();
    const blocks: TablesTileBlock[] = [];
    for (const t of onFloor) {
      const gid = t.table_group_id;
      if (gid == null) {
        blocks.push({ kind: 'single', table: t });
        continue;
      }
      if (seen.has(gid)) continue;
      seen.add(gid);
      const members = byGroup.get(gid) ?? [];
      if (members.length === 0) continue;
      const label = this.groupLabelFromMembers(members);
      const seatTotal =
        members[0].group_seat_total ?? members.reduce((s, m) => s + (m.seat_count ?? 0), 0);
      blocks.push({ kind: 'group', groupId: gid, members, label, seatTotal });
    }
    return blocks.sort((a, b) => {
      const nameA = a.kind === 'group' ? a.label : (a.table.name ?? '');
      const nameB = b.kind === 'group' ? b.label : (b.table.name ?? '');
      return nameA.localeCompare(nameB);
    });
  }

  trackTileBlock(_index: number, block: TablesTileBlock): string {
    if (block.kind === 'group') return `g-${block.groupId}-${_index}`;
    return `t-${block.table.id ?? _index}`;
  }

  isListGroupExpanded(groupId: number): boolean {
    return this.expandedListGroupIds().includes(groupId);
  }

  toggleListGroupExpand(groupId: number): void {
    this.expandedListGroupIds.update(ids => {
      const i = ids.indexOf(groupId);
      if (i >= 0) {
        return ids.filter(x => x !== groupId);
      }
      return [...ids, groupId];
    });
  }

  private tileGroupMemberKey(groupId: number, tableId: number): string {
    return `${groupId}-${tableId}`;
  }

  isTileGroupMemberExpanded(groupId: number, tableId: number | undefined): boolean {
    if (tableId == null) return false;
    return this.expandedTileGroupMemberKeys().includes(this.tileGroupMemberKey(groupId, tableId));
  }

  toggleTileGroupMember(groupId: number, tableId: number): void {
    const key = this.tileGroupMemberKey(groupId, tableId);
    this.expandedTileGroupMemberKeys.update(keys => {
      const i = keys.indexOf(key);
      if (i >= 0) {
        return keys.filter(x => x !== key);
      }
      return [...keys, key];
    });
  }

  onListGroupDoubleClick(row: Extract<TablesListRow, { kind: 'group' }>): void {
    const withOrder = row.members.find(m => m.active_order_id != null && m.active_order_id > 0);
    const t = withOrder ?? row.members[0];
    if (t) this.onTableCardDoubleClick(t);
  }

  onGroupSafetyConfirm(): void {
    const g = this.groupSafetyModal();
    this.groupSafetyModal.set(null);
    if (!g?.table.id) return;
    if (g.action === 'activate') {
      this.doActivateTableSession(g.table);
    } else {
      this.doOpenStaffMenu(g.table);
    }
  }

  onGroupSafetyCancel(): void {
    this.groupSafetyModal.set(null);
  }

  createTable(e: Event) {
    e.preventDefault();
    if (!this.newTableName || !this.selectedFloorId) return;
    const floorId = this.selectedFloorId;
    const onFloor = this.tables().filter(t => t.floor_id === floorId || (!t.floor_id && !floorId));
    const defaultW = 100;
    const defaultH = 60;
    const { x, y } = findNonOverlappingDefaultPosition(onFloor, defaultW, defaultH, 'rectangle');
    this.api.createTable(this.newTableName, floorId).subscribe({
      next: table => {
        if (table.id == null) {
          this.tables.update(t => [...t, table]);
          this.newTableName = '';
          this.showForm.set(false);
          return;
        }
        this.api
          .updateTable(table.id, {
            x_position: x,
            y_position: y,
            shape: 'rectangle',
            width: defaultW,
            height: defaultH,
          })
          .subscribe({
            next: updated => {
              this.tables.update(t => [...t, updated]);
              this.newTableName = '';
              this.showForm.set(false);
            },
            error: err => {
              this.tables.update(t => [...t, table]);
              this.newTableName = '';
              this.showForm.set(false);
              this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
            },
          });
      },
      error: err => this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'))
    });
  }

  deleteTable(table: Table) {
    if (!table.id) return;
    this.confirmationModal.set({
      show: true,
      title: 'TABLES.DELETE_TABLE',
      message: 'TABLES.DELETE_TABLE_CONFIRM',
      confirmText: 'COMMON.DELETE',
      cancelText: 'COMMON.CANCEL',
      confirmBtnClass: 'btn-danger',
      tableToDelete: table,
      tableToClose: null
    });
  }

  confirmCloseTable(table: Table) {
    if (!table.id) return;
    this.confirmationModal.set({
      show: true,
      title: 'TABLES.CLOSE_TABLE',
      message: 'TABLES.CLOSE_TABLE_CONFIRM',
      messageParams: { name: table.name || '' },
      confirmText: 'COMMON.CONFIRM',
      cancelText: 'COMMON.CANCEL',
      confirmBtnClass: 'btn-warning',
      tableToDelete: null,
      tableToClose: table
    });
  }

  onConfirmationConfirm() {
    const modal = this.confirmationModal();
    if (modal.tableToClose?.id != null) {
      const table = modal.tableToClose;
      const tableId = table.id as number;
      this.activatingTableId.set(tableId);
      this.api.closeTable(tableId).subscribe({
        next: () => {
          this.tables.update(tables => tables.map(t =>
            t.id === tableId
              ? {
                  ...t,
                  is_active: false,
                  order_pin: null,
                  active_order_id: null,
                  payment_status: 'none',
                  operational_status: 'available',
                  status: 'available',
                  seated_reservation: null,
                }
              : t
          ));
          this.activatingTableId.set(null);
          this.showToast('TABLES.TABLE_CLOSED', 'success');
          this.onConfirmationCancel();
        },
        error: err => {
          this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
          this.activatingTableId.set(null);
          this.onConfirmationCancel();
        }
      });
      return;
    }
    const table = modal.tableToDelete;
    if (table?.id) {
      this.api.deleteTable(table.id).subscribe({
        next: () => {
          this.tables.update(t => t.filter(x => x.id !== table.id));
          this.onConfirmationCancel();
        },
        error: err => {
          const d = err.error?.detail;
          const code =
            d && typeof d === 'object' && !Array.isArray(d) && 'code' in d
              ? (d as { code?: string }).code
              : undefined;
          if (err.status === 400 && code === 'table_has_orders') {
            this.confirmationModal.update(m => ({ ...m, show: false }));
            this.reassignTableModal.set(table);
            const other = this.tables().filter(t => t.id !== table.id);
            this.reassignTargetTableId.set(other.length > 0 ? other[0].id ?? null : null);
          } else {
            this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
          }
        }
      });
    } else {
      this.onConfirmationCancel();
    }
  }

  cancelReassign() {
    this.reassignTableModal.set(null);
    this.reassignTargetTableId.set(null);
  }

  doReassignAndDelete() {
    const table = this.reassignTableModal();
    const targetId = this.reassignTargetTableId();
    if (!table?.id || targetId == null) return;
    this.api.deleteTable(table.id, targetId).subscribe({
      next: () => {
        this.tables.update(t => t.filter(x => x.id !== table.id));
        this.cancelReassign();
        this.showToast('TABLES.TABLE_DELETED', 'success');
      },
      error: err => this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'))
    });
  }

  onConfirmationCancel() {
    this.confirmationModal.update(m => ({ ...m, show: false, tableToDelete: null, tableToClose: null }));
  }

  showToast(messageKey: string, type: 'success' | 'error') {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = undefined;
    this.toast.set({ message: messageKey, type });
  }

  dismissToast() {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = undefined;
    this.toast.set(null);
  }

  /** Public customer URL (QR code, copy link). Staff should use {@link openStaffMenu}. */
  getMenuUrl(table: Table): string {
    const baseUrl = `${getCustomerPublicOrigin()}/menu/${table.token}`;
    return table.qr_access
      ? `${baseUrl}?qr_access=${encodeURIComponent(table.qr_access)}`
      : baseUrl;
  }

  openStaffMenu(table: Table) {
    if (!table.id) return;
    const others = this.getGroupSiblingActivityOthers(table);
    if (others.length) {
      this.groupSafetyModal.set({
        table,
        action: 'menu',
        siblingNames: others.map(t => t.name || '?').join(', '),
      });
      return;
    }
    this.doOpenStaffMenu(table);
  }

  private doOpenStaffMenu(table: Table) {
    if (!table.id) return;
    this.staffMenuOpeningTableId.set(table.id);
    this.api.getStaffMenuToken(table.id).subscribe({
      next: (res) => {
        this.staffMenuOpeningTableId.set(null);
        const url = `${getCustomerPublicOrigin()}/menu/${res.table_token}?staff_access=${encodeURIComponent(res.token)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      error: () => {
        this.staffMenuOpeningTableId.set(null);
        this.showToast('ORDERS.OPEN_MENU_ERROR', 'error');
      },
    });
  }

  copyLink(table: Table) {
    if (!table.id) return;
    const url = this.getMenuUrl(table);
    const tableId = table.id;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.showCopiedFeedback(tableId);
      }).catch(err => {
        this.fallbackCopy(url, tableId);
      });
    } else {
      this.fallbackCopy(url, tableId);
    }
  }

  private showCopiedFeedback(tableId: number) {
    this.copiedTableId.set(tableId);
    setTimeout(() => {
      this.copiedTableId.set(null);
    }, 2000);
  }

  private fallbackCopy(text: string, tableId: number) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      if (document.execCommand('copy')) {
        this.showCopiedFeedback(tableId);
      }
    } catch (err) {
      this.error.set('Failed to copy link');
    } finally {
      document.body.removeChild(textarea);
    }
  }

  loadTenantSettings() {
    this.api.getTenantSettings().subscribe({
      next: settings => this.tenantSettings.set(settings),
      error: () => this.tenantSettings.set(null)
    });
  }

  startEdit(table: Table) {
    if (!table.id) return;
    this.editingTableId.set(table.id);
    this.editingName = table.name;
    this.editingFloorId = table.floor_id ?? null;
    this.editingSeatCount = table.seat_count || null;
  }

  cancelEdit() {
    this.editingTableId.set(null);
    this.editingName = '';
    this.editingFloorId = null;
    this.editingSeatCount = null;
  }

  saveTable(table: Table) {
    if (!table.id || !this.editingName.trim()) return;

    const updates: Partial<Table> = {
      name: this.editingName.trim()
    };

    if (this.editingFloorId != null) {
      updates.floor_id = Number(this.editingFloorId);
    }
    if (this.editingSeatCount !== null && this.editingSeatCount > 0) {
      updates.seat_count = this.editingSeatCount;
    }

    this.api.updateTable(table.id, updates).subscribe({
      next: updated => {
        this.tables.update(t => t.map(x => x.id === table.id ? updated : x));
        this.cancelEdit();
      },
      error: err => this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'))
    });
  }

  // Table Session Management
  activateTableSession(table: Table) {
    if (!table.id) return;
    if (!table.is_active) {
      const others = this.getGroupSiblingActivityOthers(table);
      if (others.length) {
        this.groupSafetyModal.set({
          table,
          action: 'activate',
          siblingNames: others.map(t => t.name || '?').join(', '),
        });
        return;
      }
    }
    this.doActivateTableSession(table);
  }

  private doActivateTableSession(table: Table) {
    if (!table.id) return;
    this.activatingTableId.set(table.id);
    this.api.activateTable(table.id).subscribe({
      next: response => {
        this.tables.update(tables => tables.map(t =>
          t.id === table.id
            ? { ...t, is_active: true, order_pin: null, active_order_id: response.active_order_id, activated_at: response.activated_at }
            : t
        ));
        this.activatingTableId.set(null);
      },
      error: err => {
        this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
        this.activatingTableId.set(null);
      }
    });
  }

  closeTableSession(table: Table) {
    if (!table.id) return;
    this.activatingTableId.set(table.id);
    this.api.closeTable(table.id).subscribe({
      next: () => {
        this.tables.update(tables => tables.map(t =>
          t.id === table.id
            ? {
                ...t,
                is_active: false,
                order_pin: null,
                active_order_id: null,
                payment_status: 'none',
                operational_status: 'available',
                status: 'available',
                seated_reservation: null,
              }
            : t
        ));
        this.activatingTableId.set(null);
      },
      error: err => {
        this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
        this.activatingTableId.set(null);
      }
    });
  }

  onWaiterAssign(table: Table, event: Event) {
    const select = event.target as HTMLSelectElement;
    const waiterId = select.value ? Number(select.value) : null;
    if (!table.id) return;
    this.api.assignWaiterToTable(table.id, waiterId).subscribe({
      next: (res: any) => {
        this.tables.update(tables => tables.map(t =>
          t.id === table.id
            ? { ...t, assigned_waiter_id: res.assigned_waiter_id, assigned_waiter_name: res.assigned_waiter_name }
            : t
        ));
      },
      error: (err: any) => this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'))
    });
  }

  onFloorWaiterAssign(floor: Floor, event: Event) {
    const select = event.target as HTMLSelectElement;
    const waiterId = select.value ? Number(select.value) : null;
    if (!floor.id) return;
    this.api.assignWaiterToFloor(floor.id, waiterId).subscribe({
      next: (res: any) => {
        this.floors.update(floors => floors.map(f =>
          f.id === floor.id
            ? { ...f, default_waiter_id: res.default_waiter_id, default_waiter_name: res.default_waiter_name }
            : f
        ));
      },
      error: (err: any) => this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'))
    });
  }
}
