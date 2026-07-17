import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, KitchenStation, Order, OrderItem, OrderLineModifiers } from '../services/api.service';
import { AudioService } from '../services/audio.service';
import { PermissionService } from '../services/permission.service';
import { Subscription } from 'rxjs';
import { FocusFirstInputDirective } from '../shared/focus-first-input.directive';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

const REFRESH_INTERVAL_MS = 15000;
const SOUND_STORAGE_KEY = 'kitchen-display-sound';
const KITCHEN_CURRENT_WINDOW_MS = 24 * 60 * 60 * 1000;

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

type KitchenLaneKey = 'pending' | 'preparing' | 'ready';
type ProductionRouteKey = 'all' | 'kitchen' | 'bar';
type ProductionRouteFilterKey = 'kitchen' | 'bar';

function getFullscreenElement(): Element | null {
  const d = document as FullscreenDocument;
  return (
    document.fullscreenElement ??
    d.webkitFullscreenElement ??
    d.mozFullScreenElement ??
    d.msFullscreenElement ??
    null
  );
}

function requestFullscreenOnElement(el: HTMLElement): Promise<void> | void {
  const e = el as FullscreenCapableElement;
  if (typeof e.requestFullscreen === 'function') {
    return e.requestFullscreen();
  }
  if (typeof e.webkitRequestFullscreen === 'function') {
    return Promise.resolve(e.webkitRequestFullscreen());
  }
  if (typeof e.mozRequestFullScreen === 'function') {
    return Promise.resolve(e.mozRequestFullScreen());
  }
  if (typeof e.msRequestFullscreen === 'function') {
    return Promise.resolve(e.msRequestFullscreen());
  }
}

function exitDocumentFullscreen(): Promise<void> | void {
  const d = document as FullscreenDocument;
  if (typeof document.exitFullscreen === 'function') {
    return document.exitFullscreen();
  }
  if (typeof d.webkitExitFullscreen === 'function') {
    return Promise.resolve(d.webkitExitFullscreen());
  }
  if (typeof d.mozCancelFullScreen === 'function') {
    return Promise.resolve(d.mozCancelFullScreen());
  }
  if (typeof d.msExitFullscreen === 'function') {
    return Promise.resolve(d.msExitFullscreen());
  }
}

function normalizeKitchenCategory(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function inferKitchenRouteFromItem(
  item: Pick<OrderItem, 'category' | 'kitchen_station_route' | 'kitchen_station_name'>
): 'kitchen' | 'bar' {
  const explicitRoute = item.kitchen_station_route?.trim().toLowerCase();
  if (explicitRoute) {
    const explicitLooksLikeBar =
      explicitRoute === 'bar' ||
      explicitRoute.includes('bar') ||
      explicitRoute.includes('drink') ||
      explicitRoute.includes('beverage') ||
      explicitRoute.includes('coffee') ||
      explicitRoute.includes('tea');
    return explicitLooksLikeBar ? 'bar' : 'kitchen';
  }

  const stationName = (item.kitchen_station_name ?? '').trim().toLowerCase();
  if (stationName) {
    const stationLooksLikeBar =
      stationName.includes('bar') ||
      stationName.includes('drink') ||
      stationName.includes('beverage') ||
      stationName.includes('coffee') ||
      stationName.includes('tea');
    if (stationLooksLikeBar) {
      return 'bar';
    }
  }

  const category = normalizeKitchenCategory(item.category);
  if (!category) {
    return 'kitchen';
  }

  const isBarCategory =
    category.includes('beverage') ||
    category.includes('drink') ||
    category.includes('coffee') ||
    category.includes('tea') ||
    category.includes('juice') ||
    category.includes('bar') ||
    category.includes('wine') ||
    category.includes('beer') ||
    category.includes('cocktail');

  return isBarCategory ? 'bar' : 'kitchen';
}

function normalizeItemWorkflowStatus(
  value: OrderItem['status'] | string | null | undefined
): 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled' {
  const status = (value ?? '').toString().trim().toLowerCase();
  if (status === 'preparing' || status === 'ready' || status === 'delivered' || status === 'cancelled') {
    return status;
  }
  return 'pending';
}

function normalizeOrderWorkflowStatus(
  value: Order['status'] | string | null | undefined
): 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled' {
  const status = (value ?? '').toString().trim().toLowerCase();
  if (!status) return 'pending';
  if (status.includes('cancel')) return 'cancelled';
  if (status.includes('ready')) return 'ready';
  if (status.includes('prepar') || status.includes('cook') || status === 'open') return 'preparing';
  if (status.includes('complete') || status.includes('deliver') || status.includes('closed')) return 'delivered';
  if (status.includes('paid') || status.includes('pending')) return 'pending';
  return 'pending';
}

function getWorkflowSortWeight(
  value: OrderItem['status'] | string | null | undefined
): number {
  const normalized = normalizeItemWorkflowStatus(value);
  if (normalized === 'ready') return 0;
  if (normalized === 'preparing') return 1;
  if (normalized === 'pending') return 2;
  if (normalized === 'delivered') return 3;
  return 4;
}

@Component({
  selector: 'app-kitchen-display',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule, FormsModule, FocusFirstInputDirective],
  template: `
    <div class="kitchen-view" #kitchenRoot>
      <header class="kitchen-header">
        <a routerLink="/staff/orders" class="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          {{ 'KITCHEN_DISPLAY.BACK_TO_ORDERS' | translate }}
        </a>
        <h1 class="kitchen-title">
          {{ 'KITCHEN_DISPLAY.TITLE' | translate }}
        </h1>
        <div class="header-actions">
          <div class="route-switcher" aria-label="Production route">
            <button
              type="button"
              class="route-switcher-btn"
              [class.active]="productionRoute() === 'all'"
              (click)="setProductionRoute('all')">
              All
              <span>{{ routeTicketCount('all') }}</span>
            </button>
            <button
              type="button"
              class="route-switcher-btn"
              [class.active]="productionRoute() === 'kitchen'"
              (click)="setProductionRoute('kitchen')">
              Kitchen
              <span>{{ routeTicketCount('kitchen') }}</span>
            </button>
            <button
              type="button"
              class="route-switcher-btn"
              [class.active]="productionRoute() === 'bar'"
              (click)="setProductionRoute('bar')">
              Beverages
              <span>{{ routeTicketCount('bar') }}</span>
            </button>
          </div>
          @if (stationsForCurrentView().length > 0) {
            <label class="station-filter">
              <span class="station-filter-label">{{ 'KITCHEN_DISPLAY.STATION' | translate }}</span>
              <select
                class="station-filter-select"
                [ngModel]="stationSelection()"
                (ngModelChange)="onStationSelectChange($event)"
              >
                <option [ngValue]="'all'">{{ 'KITCHEN_DISPLAY.ALL_STATIONS' | translate }}</option>
                @for (s of stationsForCurrentView(); track s.id) {
                  <option [ngValue]="s.id">{{ s.name }}</option>
                }
              </select>
            </label>
          }
          @if (staleTicketCount() > 0) {
            <button
              type="button"
              class="backlog-filter-btn"
              [class.active]="showBacklog()"
              (click)="toggleBacklog()"
            >
              {{ showBacklog() ? 'Current shift' : 'Backlog' }}
              <span>{{ staleTicketCount() }}</span>
            </button>
          }
          <button
            type="button"
            class="fullscreen-btn"
            data-testid="kitchen-fullscreen-toggle"
            (click)="toggleFullscreen()"
            [title]="(isFullscreen() ? 'COMMON.EXIT_FULLSCREEN' : 'COMMON.ENTER_FULLSCREEN') | translate"
          >
            @if (isFullscreen()) {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
              </svg>
              {{ 'COMMON.EXIT_FULLSCREEN' | translate }}
            } @else {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
              {{ 'COMMON.ENTER_FULLSCREEN' | translate }}
            }
          </button>
          <button type="button" class="timer-settings-btn" (click)="openTimerSettingsModal()" [title]="'KITCHEN_DISPLAY.TIMER_SETTINGS' | translate">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            {{ 'KITCHEN_DISPLAY.TIMER_SETTINGS' | translate }}
          </button>
          <label class="sound-toggle">
            <input type="checkbox" [checked]="soundEnabled()" (change)="toggleSound($event)" />
            <span class="sound-label">{{ soundEnabled() ? ('KITCHEN_DISPLAY.SOUND_ON' | translate) : ('KITCHEN_DISPLAY.SOUND_OFF' | translate) }}</span>
          </label>
          <span class="last-refresh" [title]="lastRefreshExact()">{{ 'KITCHEN_DISPLAY.LAST_REFRESH' | translate }}: {{ lastRefreshRelative() }}</span>
        </div>
      </header>

      <main class="kitchen-main">
        @if (!showBacklog() && staleTicketCount() > 0) {
          <div class="backlog-notice" role="status">
            <span><strong>{{ staleTicketCount() }}</strong> older unresolved ticket{{ staleTicketCount() === 1 ? '' : 's' }} hidden from the live shift.</span>
            <button type="button" (click)="showBacklog.set(true)">Review backlog</button>
          </div>
        }
        @if (loading()) {
          <div class="empty-state">
            <p>{{ 'ORDERS.LOADING' | translate }}</p>
          </div>
        } @else if (visibleOrders().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <h2>{{ 'KITCHEN_DISPLAY.NO_ACTIVE_ORDERS' | translate }}</h2>
            <p>{{ 'KITCHEN_DISPLAY.NO_ACTIVE_ORDERS_DESC' | translate }}</p>
          </div>
        } @else {
          @if (routeFallbackActive()) {
            <div class="routing-fallback-banner">
              <strong>{{ 'KITCHEN_DISPLAY.STATION' | translate }}</strong>
              <span>Showing all active tickets because some kitchen or bar routing is still missing.</span>
            </div>
          }
          <div class="lane-board">
            @for (lane of kitchenLanes(); track lane.key) {
              <section class="service-lane service-lane--{{ lane.key }}">
                <header class="service-lane-header">
                  <div>
                    <span class="service-lane-eyebrow">{{ lane.eyebrow }}</span>
                    <h2>{{ lane.title }}</h2>
                  </div>
                  <span class="service-lane-count">{{ lane.orders.length }}</span>
                </header>

                @if (lane.orders.length === 0) {
                  <div class="service-lane-empty">
                    <p>No tickets in this lane.</p>
                  </div>
                } @else {
                  <div class="service-lane-list">
                    @for (order of lane.orders; track order.id) {
                      <article class="order-card status-{{ getOrderDisplayStatus(order) }} {{ getTimerColorClass(order) }}" [class.order-card-urgent]="order.staff_urgent">
                        <div class="order-header">
                          <div class="order-meta">
                            <div class="order-meta-top">
                              <span class="order-id">#{{ order.id }}</span>
                              <span class="status-badge status-{{ getOrderDisplayStatus(order) }}">{{ getStatusLabel(getOrderDisplayStatus(order)) }}</span>
                            </div>
                            <div class="order-meta-row">
                              <span class="order-table">{{ order.table_name }}</span>
                              @if (order.customer_name) {
                                <span class="order-customer">{{ order.customer_name }}</span>
                              }
                            </div>
                            <div class="order-meta-row order-meta-row--muted">
                              <span class="order-time" [title]="formatExactTime(order.created_at)">{{ formatOrderTime(order.created_at) }}</span>
                              <span class="order-waiting" [title]="formatExactTime(order.created_at)">{{ 'KITCHEN_DISPLAY.WAITING' | translate }}: {{ formatWaitingTime(order.created_at) }}</span>
                              @if (order.staff_urgent) {
                                <span class="urgent-badge">{{ 'KITCHEN_DISPLAY.URGENT' | translate }}</span>
                              }
                            </div>
                          </div>
                        </div>
                        <div class="order-timer-bar-wrap" [attr.aria-label]="'KITCHEN_DISPLAY.TIMER_BAR_HINT' | translate">
                          <div class="order-timer-bar-track">
                            <div class="order-timer-bar-fill" [class]="getTimerBarFillClass(order)" [style.width.%]="getTimerBarPercent(order)"></div>
                          </div>
                        </div>
                        <ul class="order-items">
                          @for (item of getSortedItems(order.items); track item.id) {
                            @if (!item.removed_by_customer) {
                              <li class="order-item">
                                <span class="item-qty">{{ item.quantity }}x</span>
                                <div class="item-body">
                                  <div class="item-title-row">
                                    <span class="item-name">{{ item.product_name }}</span>
                                    @if (canUpdateItemStatus() && item.id != null && item.status !== 'delivered' && item.status !== 'cancelled') {
                                      <div class="item-status-control">
                                        <button
                                          type="button"
                                          class="item-status-badge clickable status-{{ normalizeItemStatus(item.status) }}"
                                          (click)="toggleItemStatusDropdown(order.id, item.id!)"
                                          [title]="'ORDERS.CLICK_TO_CHANGE_STATUS' | translate">
                                          {{ getItemStatusLabel(item.status || 'pending') }}
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="6,9 12,15 18,9"/>
                                          </svg>
                                        </button>
                                        @if (itemStatusDropdownOpen() === order.id + '-' + item.id) {
                                          <div class="status-dropdown item-status-dropdown" data-testid="kitchen-item-status-dropdown" (click)="$event.stopPropagation()">
                                            @if (getItemStatusTransitions(item.status || 'pending').backward.length > 0) {
                                              <div class="dropdown-section">
                                                <div class="dropdown-label">{{ 'ORDERS.GO_BACK' | translate }}</div>
                                                @for (status of getItemStatusTransitions(item.status || 'pending').backward; track status) {
                                                  <button type="button" class="dropdown-item backward" (click)="updateItemStatus(order.id, item.id!, status); itemStatusDropdownOpen.set(null)">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"/></svg>
                                                    {{ getItemStatusLabel(status) }}
                                                  </button>
                                                }
                                              </div>
                                            }
                                            @if (getItemStatusTransitions(item.status || 'pending').forward.length > 0) {
                                              <div class="dropdown-section">
                                                <div class="dropdown-label">{{ 'ORDERS.MOVE_FORWARD' | translate }}</div>
                                                @for (status of getItemStatusTransitions(item.status || 'pending').forward; track status) {
                                                  <button type="button" class="dropdown-item forward" (click)="updateItemStatus(order.id, item.id!, status); itemStatusDropdownOpen.set(null)">
                                                    {{ getItemStatusLabel(status) }}
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
                                                  </button>
                                                }
                                              </div>
                                            }
                                          </div>
                                        }
                                      </div>
                                    } @else {
                                      <span class="item-status status-{{ normalizeItemStatus(item.status) }}">{{ getItemStatusLabel(item.status || 'pending') }}</span>
                                    }
                                  </div>
                                  @if (hasCustomization(item)) {
                                    <span class="item-customization">{{ formatCustomizationItem(item) }}</span>
                                  }
                                  @if (item.notes) {
                                    <span class="item-notes">{{ item.notes }}</span>
                                  }
                                </div>
                              </li>
                            }
                          }
                        </ul>
                        @if (order.notes) {
                          <div class="order-notes">{{ 'KITCHEN_DISPLAY.NOTES' | translate }}: {{ order.notes }}</div>
                        }
                      </article>
                    }
                  </div>
                }
              </section>
            }
          </div>
        }
      </main>
      @if (timerSettingsModalOpen()) {
        <div class="modal-backdrop" (click)="closeTimerSettingsModal()"></div>
        <div class="modal timer-settings-modal" role="dialog" aria-labelledby="timer-settings-title" appFocusFirstInput>
          <h2 id="timer-settings-title" class="modal-title">{{ 'KITCHEN_DISPLAY.TIMER_SETTINGS_TITLE' | translate }}</h2>
          <p class="modal-desc">{{ 'KITCHEN_DISPLAY.TIMER_SETTINGS_DESC' | translate }}</p>
          <div class="timer-settings-form">
            <label>
              <span>{{ 'KITCHEN_DISPLAY.TIMER_YELLOW_MINUTES' | translate }}</span>
              <input type="number" min="0" step="1" [ngModel]="timerSettingsForm().yellow_minutes" (ngModelChange)="updateTimerFormYellow($event)" />
            </label>
            <label>
              <span>{{ 'KITCHEN_DISPLAY.TIMER_ORANGE_MINUTES' | translate }}</span>
              <input type="number" min="0" step="1" [ngModel]="timerSettingsForm().orange_minutes" (ngModelChange)="updateTimerFormOrange($event)" />
            </label>
            <label>
              <span>{{ 'KITCHEN_DISPLAY.TIMER_RED_MINUTES' | translate }}</span>
              <input type="number" min="0" step="1" [ngModel]="timerSettingsForm().red_minutes" (ngModelChange)="updateTimerFormRed($event)" />
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" (click)="closeTimerSettingsModal()">{{ 'COMMON.CANCEL' | translate }}</button>
            <button type="button" class="btn-primary" (click)="saveTimerSettings()">{{ 'COMMON.SAVE' | translate }}</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .kitchen-view {
      min-height: 100vh;
      background: var(--color-bg);
      display: flex;
      flex-direction: column;
    }
    .kitchen-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-6);
      background: var(--color-surface);
      border-bottom: 2px solid var(--color-border);
      box-shadow: var(--shadow-sm);
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-primary);
      font-weight: 500;
      text-decoration: none;
      font-size: 1rem;
    }
    .back-link:hover { text-decoration: underline; }
    .kitchen-title {
      font-size: clamp(1.5rem, 4vw, 2.25rem);
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
    }
    .header-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-3);
      flex-wrap: wrap;
    }
    .route-switcher {
      display: inline-flex;
      align-items: center;
      gap: 0.22rem;
      padding: 0.2rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-bg) 82%, white);
      border: 1px solid var(--color-border);
    }
    .route-switcher-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.38rem;
      min-height: 2.1rem;
      padding: 0.32rem 0.74rem;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: var(--color-text-muted);
      font-weight: 800;
      font-size: 0.82rem;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
    }
    .route-switcher-btn span {
      min-width: 1.42rem;
      padding: 0.08rem 0.38rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-surface) 92%, white);
      color: var(--color-text);
      font-size: 0.72rem;
      font-weight: 900;
      line-height: 1.25;
      border: 1px solid color-mix(in srgb, var(--color-border) 72%, transparent);
    }
    .route-switcher-btn:hover {
      color: var(--color-text);
      background: color-mix(in srgb, var(--color-primary) 7%, white);
    }
    .route-switcher-btn.active {
      color: white;
      background: var(--color-primary);
      box-shadow: 0 8px 18px rgba(211, 82, 51, 0.22);
    }
    .route-switcher-btn.active span {
      color: var(--color-primary);
      background: white;
      border-color: transparent;
    }
    .backlog-filter-btn,
    .timer-settings-btn,
    .fullscreen-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--color-primary);
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
    }
    .backlog-filter-btn:hover,
    .timer-settings-btn:hover,
    .fullscreen-btn:hover { background: var(--color-bg); }
    .backlog-filter-btn.active {
      color: var(--color-warning);
      border-color: color-mix(in srgb, var(--color-warning) 45%, var(--color-border));
      background: color-mix(in srgb, var(--color-warning) 10%, var(--color-surface));
    }
    .backlog-filter-btn span {
      min-width: 1.5rem;
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
      background: var(--color-bg);
      text-align: center;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .sound-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      cursor: pointer;
      font-size: 1rem;
      font-weight: 500;
      color: var(--color-text);
    }
    .sound-toggle input { cursor: pointer; width: 18px; height: 18px; }
    .last-refresh {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .station-filter {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--color-text);
    }
    .station-filter-label { white-space: nowrap; }
    .station-filter-select {
      min-width: 160px;
      padding: var(--space-2) var(--space-3);
      font-size: 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
    }
    .kitchen-main {
      flex: 1;
      padding: var(--space-5) var(--space-6);
      overflow: auto;
      max-width: 1680px;
      width: 100%;
      margin: 0 auto;
    }
    .kitchen-main::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    .kitchen-main::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--color-primary) 20%, var(--color-border));
    }
    .backlog-notice {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
      padding: var(--space-3) var(--space-4);
      border: 1px solid color-mix(in srgb, var(--color-warning) 38%, var(--color-border));
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--color-warning) 8%, var(--color-surface));
      color: var(--color-text);
    }
    .backlog-notice button {
      flex: 0 0 auto;
      border: 0;
      background: transparent;
      color: var(--color-primary);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      border-radius: 999px;
    }
    .empty-state {
      text-align: center;
      padding: var(--space-8);
      background: var(--color-surface);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
    }
    .empty-state .empty-icon { color: var(--color-text-muted); margin-bottom: var(--space-4); }
    .empty-state h2 { margin: 0 0 var(--space-2); font-size: 1.5rem; color: var(--color-text); }
    .empty-state p { margin: 0; color: var(--color-text-muted); }
    .order-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: var(--space-4);
      align-items: start;
    }
    .routing-fallback-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      margin-bottom: var(--space-4);
      padding: 0.9rem 1rem;
      border-radius: var(--radius-lg);
      border: 1px solid color-mix(in srgb, var(--color-warning) 32%, var(--color-border));
      background: color-mix(in srgb, var(--color-warning) 8%, white);
      color: var(--color-text);
      line-height: 1.45;
      font-size: 0.92rem;
    }
    .routing-fallback-banner strong {
      color: var(--color-warning);
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      flex-shrink: 0;
      padding-top: 0.15rem;
    }
    .lane-board {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.8rem;
      align-items: start;
      grid-auto-rows: minmax(0, auto);
    }
    .service-lane {
      box-sizing: border-box;
      min-width: 0;
      min-height: 0;
      padding: 0.78rem 0.78rem 0.72rem;
      border-radius: calc(var(--radius-lg) + 2px);
      border: 1px solid var(--color-border);
      background: color-mix(in srgb, var(--color-surface) 96%, white);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      align-self: start;
      max-height: calc(100vh - 8.6rem);
      overflow: hidden;
    }
    .service-lane--pending { border-top: 5px solid var(--color-warning); }
    .service-lane--preparing { border-top: 5px solid #3B82F6; }
    .service-lane--ready { border-top: 5px solid var(--color-success); }
    .service-lane-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: flex-start;
      gap: 0.58rem;
      position: sticky;
      top: 0;
      z-index: 3;
      padding-bottom: 0.18rem;
      background: inherit;
    }
    .service-lane-header > div {
      min-width: 0;
      display: grid;
      gap: 0.2rem;
    }
    .service-lane-header h2 {
      margin: 0.12rem 0 0;
      font-size: 0.98rem;
      line-height: 1.12;
      color: var(--color-text);
      overflow-wrap: anywhere;
    }
    .service-lane-eyebrow {
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .service-lane-count {
      min-width: 2rem;
      min-height: 2rem;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.16rem 0.56rem;
      font-size: 0.8rem;
      font-weight: 800;
      color: var(--color-text);
      background: color-mix(in srgb, var(--color-primary) 10%, white);
      border: 1px solid color-mix(in srgb, var(--color-primary) 16%, var(--color-border));
      flex-shrink: 0;
    }
    .service-lane-list {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      align-items: stretch;
      max-height: calc(100vh - 12.2rem);
      overflow: auto;
      padding-right: 0.18rem;
      padding-bottom: 0.42rem;
      min-height: 0;
      scrollbar-gutter: stable;
    }
    .service-lane-list::-webkit-scrollbar {
      width: 8px;
    }
    .service-lane-list::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--color-primary) 18%, var(--color-border));
      border-radius: 999px;
    }
    .service-lane-empty {
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-5);
      background: var(--color-bg);
      text-align: center;
    }
    .service-lane-empty p {
      margin: 0;
      color: var(--color-text-muted);
      font-size: 0.95rem;
    }
    .order-card {
      box-sizing: border-box;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-left: 6px solid var(--color-warning);
      border-radius: var(--radius-lg);
      overflow: visible;
      box-shadow: var(--shadow-sm);
      min-width: 0;
      display: flex;
      flex-direction: column;
      isolation: isolate;
      min-height: max-content;
      height: auto;
    }
    .order-card.status-preparing { border-left-color: #3B82F6; }
    .order-card.status-ready { border-left-color: var(--color-success); }
    .order-card-urgent {
      box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.45), var(--shadow-sm);
    }
    .urgent-badge {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      background: rgba(220, 38, 38, 0.15);
      color: #b91c1c;
    }
    .order-timer-bar-wrap {
      padding: 0 var(--space-5) var(--space-3);
    }
    .order-timer-bar-track {
      height: 8px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
    .order-timer-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.35s ease-out, background 0.25s;
      min-width: 0;
    }
    .timer-fill-green { background: linear-gradient(90deg, #16a34a, #22c55e); }
    .timer-fill-yellow { background: linear-gradient(90deg, #ca8a04, #eab308); }
    .timer-fill-orange { background: linear-gradient(90deg, #ea580c, #f97316); }
    .timer-fill-red { background: linear-gradient(90deg, #b91c1c, #ef4444); }
    .order-card.timer-green { border-left-color: #22c55e; }
    .order-card.timer-yellow { border-left-color: #eab308; }
    .order-card.timer-orange { border-left-color: #f97316; }
    .order-card.timer-red { border-left-color: #ef4444; }
    .order-header {
      display: grid;
      gap: 0.36rem;
      padding: 0.62rem 0.72rem 0.58rem;
      border-bottom: 1px solid var(--color-border);
      background: color-mix(in srgb, var(--color-bg) 82%, white);
      min-width: 0;
    }
    .order-meta {
      display: grid;
      gap: 0.35rem;
      min-width: 0;
    }
    .order-meta-top,
    .order-meta-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.45rem 0.8rem;
      flex-wrap: wrap;
      min-width: 0;
    }
    .order-meta-row--muted {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem 0.65rem;
    }
    .order-id {
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--color-text);
      overflow-wrap: anywhere;
      line-height: 1.06;
    }
    .order-table {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--color-primary);
      overflow-wrap: anywhere;
    }
    .order-customer {
      font-size: 0.72rem;
      color: var(--color-text-muted);
      padding: 0.16rem 0.5rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-primary) 8%, white);
      border: 1px solid color-mix(in srgb, var(--color-primary) 14%, var(--color-border));
      max-width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .order-time,
    .order-waiting {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .order-waiting {
      font-weight: 700;
      color: var(--color-text);
    }
    .order-customer,
    .order-time,
    .order-waiting {
      overflow-wrap: anywhere;
    }
    .status-badge {
      padding: 0.24rem 0.54rem;
      border-radius: 20px;
      font-size: 0.66rem;
      font-weight: 700;
      flex-shrink: 0;
      text-align: center;
      white-space: normal;
      line-height: 1.06;
      max-width: 8.2rem;
      overflow-wrap: anywhere;
    }
    .status-badge.status-pending { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .status-badge.status-preparing { background: rgba(59, 130, 246, 0.2); color: #3B82F6; }
    .status-badge.status-ready { background: var(--color-success-light); color: var(--color-success); }
    .status-badge.status-partially_delivered { background: var(--color-success-light); color: var(--color-success); }
    .order-items {
      list-style: none;
      margin: 0;
      padding: 0.04rem 0.72rem 0.56rem;
      display: grid;
      gap: 0.04rem;
      min-width: 0;
    }
    .order-item {
      display: grid;
      grid-template-columns: 1.9rem minmax(0, 1fr);
      align-items: start;
      gap: 0.28rem 0.5rem;
      padding: 0.44rem 0;
      font-size: 0.8rem;
      line-height: 1.14;
      border-bottom: 1px solid var(--color-border);
    }
    .order-item:last-child { border-bottom: none; }
    .item-qty {
      font-weight: 700;
      color: var(--color-primary);
      font-size: 0.76rem;
      padding-top: 0.08rem;
      min-width: 1.8rem;
    }
    .item-name {
      font-weight: 600;
      color: var(--color-text);
      min-width: 0;
      overflow-wrap: anywhere;
      line-height: 1.2;
    }
    .item-body {
      min-width: 0;
      display: grid;
      gap: 0.22rem;
      align-content: start;
    }
    .item-title-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.45rem;
      flex-wrap: wrap;
      min-width: 0;
    }
    .item-notes {
      font-size: 0.7rem;
      color: var(--color-text-muted);
      font-style: italic;
      overflow-wrap: anywhere;
    }
    .item-customization {
      font-size: 0.69rem;
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }
    .item-status {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 0.3rem 0.48rem;
      border-radius: 12px;
      justify-self: start;
      align-self: start;
      white-space: normal;
      max-width: 100%;
      text-align: center;
      line-height: 1.1;
      overflow-wrap: anywhere;
    }
    .item-status.status-pending { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
    .item-status.status-preparing { background: rgba(59, 130, 246, 0.15); color: #3B82F6; }
    .item-status.status-ready { background: var(--color-success-light); color: var(--color-success); }
    .item-status.status-delivered { background: var(--color-bg); color: var(--color-text-muted); }
    .item-status-control {
      position: relative;
      display: inline-flex;
      z-index: 10;
      justify-self: start;
      align-self: start;
      width: auto;
      max-width: 100%;
    }
    .order-item:hover .item-status-control {
      z-index: 50;
    }
    .item-status-badge.clickable {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      min-height: 30px;
      padding: 0.28rem 0.5rem;
      font-size: 0.68rem;
      font-weight: 600;
      border-radius: 14px;
      border: 1px solid var(--color-border);
      cursor: pointer;
      background: inherit;
      transition: all 0.15s;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      text-align: center;
      line-height: 1.1;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    .item-status-badge.clickable svg {
      flex-shrink: 0;
    }
    .item-status-badge.clickable:hover {
      filter: brightness(0.97);
    }
    .item-status-badge.status-pending.clickable { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
    .item-status-badge.status-preparing.clickable { background: rgba(59, 130, 246, 0.15); color: #3B82F6; }
    .item-status-badge.status-ready.clickable { background: var(--color-success-light); color: var(--color-success); }
    .status-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      left: auto;
      margin-top: 6px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 100;
      min-width: 190px;
      max-width: min(230px, 82vw);
      overflow: hidden;
    }
    .dropdown-section {
      padding: 8px 0;
    }
    .dropdown-section:not(:last-child) {
      border-bottom: 1px solid var(--color-border);
    }
    .dropdown-label {
      padding: 6px 12px;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      width: 100%;
      min-height: 48px;
      padding: var(--space-3) var(--space-4);
      background: none;
      border: none;
      text-align: left;
      font-size: 1rem;
      font-weight: 500;
      color: var(--color-text);
      cursor: pointer;
      transition: background 0.15s;
    }
    .dropdown-item:hover {
      background: var(--color-bg);
    }
    .dropdown-item.forward {
      color: var(--color-primary);
    }
    .dropdown-item.backward {
      color: var(--color-text-muted);
    }
    .dropdown-item svg {
      flex-shrink: 0;
    }
    .order-notes {
      padding: 0.65rem 0.95rem 0.8rem;
      background: rgba(245, 158, 11, 0.08);
      font-size: 0.82rem;
      color: var(--color-text);
      border-top: 1px solid var(--color-border);
      overflow-wrap: anywhere;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 1000;
    }
    .modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      padding: var(--space-6);
      z-index: 1001;
      min-width: 320px;
      max-width: 90vw;
    }
    .modal-title { margin: 0 0 var(--space-2); font-size: 1.25rem; }
    .modal-desc { margin: 0 0 var(--space-4); color: var(--color-text-muted); font-size: 0.9375rem; }
    .timer-settings-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      margin-bottom: var(--space-5);
    }
    .timer-settings-form label {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .timer-settings-form label span { min-width: 140px; font-weight: 500; }
    .timer-settings-form input {
      width: 80px;
      padding: var(--space-2) var(--space-3);
      font-size: 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
    }
    .modal-actions .btn-primary, .modal-actions .btn-secondary {
      padding: var(--space-2) var(--space-4);
      font-size: 1rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      cursor: pointer;
    }
    .modal-actions .btn-primary {
      background: var(--color-primary);
      color: white;
      border: none;
    }
    .modal-actions .btn-secondary {
      background: var(--color-bg);
      color: var(--color-text);
      border: 1px solid var(--color-border);
    }
    @media (max-width: 980px) {
      .lane-board {
        grid-template-columns: repeat(2, minmax(280px, 1fr));
      }
    }
    @media (max-width: 720px) {
      .lane-board {
        grid-template-columns: minmax(0, 1fr);
      }
      .service-lane {
        max-height: none;
      }
      .service-lane-list {
        max-height: none;
      }
    }
    @media (max-width: 900px) {
      .lane-board,
      .order-grid {
        grid-template-columns: 1fr;
      }
      .order-meta-top,
      .order-meta-row {
        justify-content: flex-start;
      }
      .status-badge {
        align-self: flex-start;
      }
    }
    @media (max-width: 640px) {
      .kitchen-header,
      .kitchen-main {
        padding-left: var(--space-4);
        padding-right: var(--space-4);
      }
      .header-actions {
        justify-content: flex-start;
      }
      .order-item {
        grid-template-columns: auto minmax(0, 1fr);
      }
      .order-header {
        padding: 0.9rem 0.9rem 0.85rem;
      }
      .order-meta-top {
        align-items: flex-start;
      }
      .order-meta-row--muted {
        flex-direction: column;
        align-items: flex-start;
      }
      .station-filter {
        width: 100%;
        align-items: stretch;
        flex-direction: column;
      }
      .station-filter-select {
        width: 100%;
      }
      .service-lane,
      .lane-summary-card {
        padding: var(--space-3);
      }
      .service-lane-list {
        padding-right: 0;
      }
    }
  `],
})
export class KitchenDisplayComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('kitchenRoot', { read: ElementRef }) kitchenRootRef?: ElementRef<HTMLElement>;

  private api = inject(ApiService);
  private audio = inject(AudioService);
  private translate = inject(TranslateService);
  private permissions = inject(PermissionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private wsSub: Subscription | null = null;
  private queryParamSub: Subscription | null = null;
  private initialLoadDone = false;
  private pendingBackgroundRefresh = false;

  orders = signal<Order[]>([]);
  loading = signal(true);
  lastRefreshAt = signal<Date | null>(null);
  soundEnabled = signal(true);
  itemStatusDropdownOpen = signal<string | null>(null);
  /** Loaded prep stations for the combined kitchen and beverage production board. */
  kitchenStations = signal<KitchenStation[]>([]);
  /** KDS station filter across every production station. */
  stationSelection = signal<number | 'all'>('all');
  /** Visible route for the production board. */
  productionRoute = signal<ProductionRouteKey>('all');
  /** Current time for live timer (updates every second). */
  now = signal(Date.now());
  /** Historical unresolved tickets stay available without overwhelming the live shift. */
  showBacklog = signal(false);
  /** Timer thresholds (minutes) for card color. Defaults 5, 10, 15. */
  timerSettings = signal<{ yellow_minutes: number; orange_minutes: number; red_minutes: number }>({
    yellow_minutes: 5,
    orange_minutes: 10,
    red_minutes: 15,
  });
  timerSettingsModalOpen = signal(false);
  timerSettingsForm = signal<{ yellow_minutes: number; orange_minutes: number; red_minutes: number }>({
    yellow_minutes: 5,
    orange_minutes: 10,
    red_minutes: 15,
  });
  private tickIntervalId: ReturnType<typeof setInterval> | null = null;

  /** True when this view’s root element is the browser fullscreen element. */
  isFullscreen = signal(false);

  canUpdateItemStatus = computed(() =>
    this.permissions.hasPermission(this.permissions.getCurrentUser(), 'order:item_status')
  );

  stationsForCurrentView = computed(() => {
    const route = this.productionRoute();
    return [...this.kitchenStations()]
      .filter((station) => route === 'all' || station.display_route === route)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  });

  private getRouteMatchedItems(
    order: Order,
    options?: { routeKey?: 'kitchen' | 'bar'; selectedStation?: number | 'all'; enforceStationSelection?: boolean }
  ): OrderItem[] {
    const routeKey = options?.routeKey;
    const selectedStation = options?.selectedStation ?? 'all';
    const enforceStationSelection = options?.enforceStationSelection ?? false;

    return (order.items ?? []).filter((item) => {
      if (item.removed_by_customer) return false;
      if (normalizeItemWorkflowStatus(item.status) === 'cancelled') return false;

      if (routeKey) {
        const inferredRoute = inferKitchenRouteFromItem(item);
        if (inferredRoute !== routeKey) {
          return false;
        }
      }

      if (enforceStationSelection && selectedStation !== 'all') {
        return item.kitchen_station_id === selectedStation;
      }

      return true;
    });
  }

  private getKitchenVisibleItems(
    order: Order,
    options?: { routeKey?: 'kitchen' | 'bar'; selectedStation?: number | 'all'; enforceStationSelection?: boolean }
  ): OrderItem[] {
    return this.getRouteMatchedItems(order, options).filter((item) => {
      const itemStatus = normalizeItemWorkflowStatus(item.status);
      return itemStatus === 'pending' || itemStatus === 'preparing' || itemStatus === 'ready';
    });
  }

  private getKitchenRenderableItems(
    order: Order,
    options?: { routeKey?: 'kitchen' | 'bar'; selectedStation?: number | 'all'; enforceStationSelection?: boolean }
  ): OrderItem[] {
    const activeItems = this.getKitchenVisibleItems(order, options);
    if (activeItems.length > 0) {
      return activeItems;
    }

    const routeMatchedItems = this.getRouteMatchedItems(order, options);
    if (routeMatchedItems.length === 0) {
      return [];
    }

    const orderWorkflow = normalizeOrderWorkflowStatus(order.status);
    if (!(orderWorkflow === 'pending' || orderWorkflow === 'preparing' || orderWorkflow === 'ready')) {
      return [];
    }

    // Production-safe fallback: if the order itself is still active but line-item states
    // are missing or inconsistent, keep the ticket visible by projecting the order-level
    // workflow onto the route-matched lines instead of rendering an empty board.
    return routeMatchedItems.map((item) => ({
      ...item,
      status: orderWorkflow,
    }));
  }

  private hasStationSelectionForCurrentView(selection: number | 'all'): boolean {
    if (selection === 'all') {
      return false;
    }
    return this.stationsForCurrentView().some((station) => station.id === selection);
  }

  private selectedProductionRouteFilter(): ProductionRouteFilterKey | undefined {
    const route = this.productionRoute();
    return route === 'all' ? undefined : route;
  }

  private isCurrentKitchenOrder(order: Order): boolean {
    const createdAt = new Date(order.created_at).getTime();
    return Number.isFinite(createdAt) && this.now() - createdAt <= KITCHEN_CURRENT_WINDOW_MS;
  }

  staleTicketCount = computed(() =>
    this.orders().reduce((count, order) => {
      if (this.isCurrentKitchenOrder(order)) {
        return count;
      }
      const routeKey = this.selectedProductionRouteFilter();
      return this.getKitchenRenderableItems(order, { routeKey }).length > 0 ? count + 1 : count;
    }, 0)
  );

  private kitchenSourceOrders = computed(() =>
    this.showBacklog()
      ? this.orders()
      : this.orders().filter((order) => this.isCurrentKitchenOrder(order))
  );

  /** Orders that are active (including paid but not yet delivered), optionally filtered by station. */
  activeOrders = computed(() => {
    const useStations = this.stationsForCurrentView().length > 0;
    const sel = this.stationSelection();
    const enforceStationSelection = useStations && this.hasStationSelectionForCurrentView(sel);
    const routeKey = this.selectedProductionRouteFilter();

    const list = this.kitchenSourceOrders().filter((o) => {
      const items = this.getKitchenRenderableItems(o, {
        routeKey,
        selectedStation: sel,
        enforceStationSelection,
      });
      return items.length > 0;
    });
    const mapped = list.map((o) => ({
      ...o,
      staff_urgent: !!o.staff_urgent,
      items: this.getKitchenRenderableItems(o, {
        routeKey,
        selectedStation: sel,
        enforceStationSelection,
      }),
    }));
    return mapped.sort((a, b) => {
      if (!!a.staff_urgent !== !!b.staff_urgent) {
        return a.staff_urgent ? -1 : 1;
      }
      const aRank = getWorkflowSortWeight(this.getOrderDisplayStatus(a));
      const bRank = getWorkflowSortWeight(this.getOrderDisplayStatus(b));
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return ta - tb;
    });
  });

  private fallbackKitchenOrders = computed(() => {
    const list = this.kitchenSourceOrders().filter((order) => {
      const items = this.getKitchenRenderableItems(order);
      return items.length > 0;
    });

    return list
      .map((order) => ({
        ...order,
        staff_urgent: !!order.staff_urgent,
        items: this.getKitchenRenderableItems(order),
      }))
      .sort((a, b) => {
        if (!!a.staff_urgent !== !!b.staff_urgent) {
          return a.staff_urgent ? -1 : 1;
        }
        const aRank = getWorkflowSortWeight(this.getOrderDisplayStatus(a));
        const bRank = getWorkflowSortWeight(this.getOrderDisplayStatus(b));
        if (aRank !== bRank) {
          return aRank - bRank;
        }
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return ta - tb;
      });
  });

  routeFallbackActive = computed(() => false);

  visibleOrders = computed(() => (this.routeFallbackActive() ? this.fallbackKitchenOrders() : this.activeOrders()));

  kitchenLanes = computed(() => {
    const buckets: Record<KitchenLaneKey, Order[]> = {
      pending: [],
      preparing: [],
      ready: [],
    };

    for (const order of this.visibleOrders()) {
      buckets[this.getOrderLane(order)].push(order);
    }

    return [
      { key: 'pending' as const, title: 'New tickets', eyebrow: 'Send to prep', orders: buckets.pending },
      { key: 'preparing' as const, title: 'In prep', eyebrow: 'Working now', orders: buckets.preparing },
      { key: 'ready' as const, title: 'Ready pass', eyebrow: 'Hand off', orders: buckets.ready },
    ];
  });

  lastRefreshRelative = computed(() => {
    const at = this.lastRefreshAt();
    if (!at) return '—';
    const sec = Math.floor((Date.now() - at.getTime()) / 1000);
    if (sec < 10) return '< 10s';
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    return `${min}m`;
  });

  lastRefreshExact = computed(() => {
    const at = this.lastRefreshAt();
    return at ? at.toLocaleTimeString() : '';
  });

  ngOnInit(): void {
    const stored = localStorage.getItem(SOUND_STORAGE_KEY);
    this.soundEnabled.set(stored !== 'false');
    this.audio.setEnabled(this.soundEnabled());

    this.queryParamSub = this.route.queryParamMap.subscribe((qm) => {
      const s = qm.get('station');
      if (s == null || s === '' || s === 'all') {
        this.stationSelection.set('all');
      } else {
        const n = Number.parseInt(s, 10);
        if (Number.isFinite(n)) {
          this.stationSelection.set(n);
        }
      }
    });

    this.api.getKitchenStations().subscribe({
      next: (list) => this.kitchenStations.set(list),
      error: () => this.kitchenStations.set([]),
    });

    this.loadTimerSettings();
    this.loadOrders({ initial: true });
    this.refreshIntervalId = setInterval(
      () => this.loadOrders({ background: true }),
      REFRESH_INTERVAL_MS
    );
    this.tickIntervalId = setInterval(() => this.now.set(Date.now()), 1000);

    try {
      this.api.connectWebSocket();
      this.wsSub = this.api.orderUpdates$.subscribe((update: unknown) => {
        if (update && typeof update === 'object' && 'type' in update) {
          const type = (update as { type: string }).type;
          if (this.soundEnabled() && ['new_order', 'items_added'].includes(type)) {
            this.audio.playRestaurantOrderChange();
          }
          this.loadOrders({ background: true });
        }
      });
    } catch {
      // continue without WebSocket
    }

    document.addEventListener('click', this.closeItemStatusDropdown);

    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
    document.addEventListener('mozfullscreenchange', this.onFullscreenChange);
    document.addEventListener('MSFullscreenChange', this.onFullscreenChange);
  }

  ngAfterViewInit(): void {
    this.syncFullscreenState();
  }

  ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
    this.wsSub?.unsubscribe();
    this.queryParamSub?.unsubscribe();
    document.removeEventListener('click', this.closeItemStatusDropdown);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.onFullscreenChange);
    document.removeEventListener('mozfullscreenchange', this.onFullscreenChange);
    document.removeEventListener('MSFullscreenChange', this.onFullscreenChange);
    void this.exitFullscreenIfActive();
  }

  setProductionRoute(route: ProductionRouteKey): void {
    this.productionRoute.set(route);
    if (this.stationSelection() !== 'all' && !this.hasStationSelectionForCurrentView(this.stationSelection())) {
      this.stationSelection.set('all');
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { station: undefined },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  routeTicketCount(route: ProductionRouteKey): number {
    const routeKey: ProductionRouteFilterKey | undefined = route === 'all' ? undefined : route;
    return this.kitchenSourceOrders().reduce((count, order) => {
      return count + (this.getKitchenRenderableItems(order, { routeKey }).length > 0 ? 1 : 0);
    }, 0);
  }

  onStationSelectChange(value: number | 'all'): void {
    this.stationSelection.set(value);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { station: value === 'all' ? undefined : value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  loadTimerSettings(): void {
    this.api.getKitchenDisplaySettings().subscribe({
      next: (s) => this.timerSettings.set(s),
      error: () => {},
    });
  }

  /** Elapsed minutes since order created_at (uses live now() for updates). */
  getElapsedMinutes(createdAt: string): number {
    const created = this.parseOrderDate(createdAt);
    if (!created) return 0;
    return (this.now() - created) / 60000;
  }

  toggleBacklog(): void {
    this.showBacklog.update((visible) => !visible);
  }

  /** CSS class for timer-based card color: timer-green, timer-yellow, timer-orange, timer-red. */
  getTimerColorClass(order: Order): string {
    const min = this.getElapsedMinutes(order.created_at);
    const s = this.timerSettings();
    if (min >= (s.red_minutes ?? 15)) return 'timer-red';
    if (min >= (s.orange_minutes ?? 10)) return 'timer-orange';
    if (min >= (s.yellow_minutes ?? 5)) return 'timer-yellow';
    return 'timer-green';
  }

  /** Fill width 0–100% toward red threshold (visual progress of wait time). */
  getTimerBarPercent(order: Order): number {
    const min = this.getElapsedMinutes(order.created_at);
    const cap = this.timerSettings().red_minutes ?? 15;
    if (cap <= 0) return 0;
    return Math.min(100, (min / cap) * 100);
  }

  getTimerBarFillClass(order: Order): string {
    return this.getTimerColorClass(order).replace('timer-', 'timer-fill-');
  }

  /** Format waiting time for live service readability instead of raw giant hour counters. */
  formatWaitingTime(createdAt: string): string {
    const created = this.parseOrderDate(createdAt);
    if (!created) return '—';
    const elapsedMs = Math.max(0, this.now() - created);
    const totalMinutes = Math.floor(elapsedMs / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    if (totalDays > 0) return 'Stale ticket';
    if (totalHours > 0) {
      const remainingMinutes = totalMinutes % 60;
      return remainingMinutes > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalHours}h`;
    }
    if (totalMinutes > 0) return `${totalMinutes}m`;
    return '<1m';
  }

  private parseOrderDate(dateString: string): number | null {
    if (!dateString) return null;
    const str =
      dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-', 10)
        ? dateString
        : dateString + 'Z';
    const date = new Date(str).getTime();
    return isNaN(date) ? null : date;
  }

  openTimerSettingsModal(): void {
    this.timerSettingsForm.set({ ...this.timerSettings() });
    this.timerSettingsModalOpen.set(true);
  }

  closeTimerSettingsModal(): void {
    this.timerSettingsModalOpen.set(false);
  }

  updateTimerFormYellow(v: number): void {
    this.timerSettingsForm.update((f) => ({ ...f, yellow_minutes: Math.max(0, Number(v) || 0) }));
  }
  updateTimerFormOrange(v: number): void {
    this.timerSettingsForm.update((f) => ({ ...f, orange_minutes: Math.max(0, Number(v) || 0) }));
  }
  updateTimerFormRed(v: number): void {
    this.timerSettingsForm.update((f) => ({ ...f, red_minutes: Math.max(0, Number(v) || 0) }));
  }

  saveTimerSettings(): void {
    const form = this.timerSettingsForm();
    this.api.updateKitchenDisplaySettings(form).subscribe({
      next: (s) => {
        this.timerSettings.set(s);
        this.closeTimerSettingsModal();
      },
      error: () => {},
    });
  }

  private closeItemStatusDropdown = (e: Event): void => {
    const target = e.target as HTMLElement;
    if (!target.closest('.item-status-control')) {
      if (this.itemStatusDropdownOpen()) {
        this.itemStatusDropdownOpen.set(null);
        this.flushPendingBackgroundRefresh();
      }
    }
  };

  private onFullscreenChange = (): void => {
    this.syncFullscreenState();
  };

  private syncFullscreenState(): void {
    const root = this.kitchenRootRef?.nativeElement;
    const fs = getFullscreenElement();
    this.isFullscreen.set(!!root && fs === root);
  }

  toggleFullscreen(): void {
    if (this.isFullscreen()) {
      void this.exitFullscreenIfActive();
      return;
    }
    const root = this.kitchenRootRef?.nativeElement;
    const target = root ?? document.documentElement;
    const p = requestFullscreenOnElement(target);
    if (p && typeof (p as Promise<void>).catch === 'function') {
      (p as Promise<void>).catch(() => {});
    }
  }

  private exitFullscreenIfActive(): Promise<void> | void {
    if (!getFullscreenElement()) return;
    const p = exitDocumentFullscreen();
    if (p && typeof (p as Promise<void>).catch === 'function') {
      return (p as Promise<void>).catch(() => {});
    }
    return p;
  }

  loadOrders(options?: { initial?: boolean; background?: boolean }): void {
    const isInitial = options?.initial ?? (!options?.background && !this.initialLoadDone);
    const isBackground = options?.background ?? !isInitial;

    if (isBackground && this.itemStatusDropdownOpen()) {
      this.pendingBackgroundRefresh = true;
      return;
    }
    this.pendingBackgroundRefresh = false;

    if (isInitial) {
      this.loading.set(true);
    }

    this.api.getOrders(false).subscribe({
      next: (list) => {
        this.orders.set(list);
        this.lastRefreshAt.set(new Date());
        if (isInitial) {
          this.loading.set(false);
          this.initialLoadDone = true;
        }
      },
      error: () => {
        if (isInitial) {
          this.loading.set(false);
          this.initialLoadDone = true;
        }
      },
    });
  }

  private flushPendingBackgroundRefresh(): void {
    if (!this.pendingBackgroundRefresh) return;
    this.pendingBackgroundRefresh = false;
    this.loadOrders({ background: true });
  }

  toggleSound(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.soundEnabled.set(checked);
    this.audio.setEnabled(checked);
    localStorage.setItem(SOUND_STORAGE_KEY, String(checked));
  }

  getStatusLabel(status: string): string {
    return this.translate.instant('ORDER_STATUS.' + status) || status;
  }

  getOrderDisplayStatus(order: Order): 'pending' | 'preparing' | 'ready' {
    const firstVisibleItem = this.getSortedItems(order.items ?? [])[0];
    const workflowStatus = normalizeItemWorkflowStatus(firstVisibleItem?.status ?? order.status);
    if (workflowStatus === 'ready') return 'ready';
    if (workflowStatus === 'preparing') return 'preparing';
    return 'pending';
  }

  normalizeItemStatus(status: string | null | undefined): 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled' {
    return normalizeItemWorkflowStatus(status);
  }

  getItemStatusLabel(status: string): string {
    const normalized = normalizeItemWorkflowStatus(status);
    return this.translate.instant('ITEM_STATUS.' + normalized) || normalized;
  }

  hasCustomization(item: OrderItem): boolean {
    if (item?.customization_summary?.trim()) return true;
    const a = item?.customization_answers;
    if (!!a && typeof a === 'object' && Object.keys(a).length > 0) return true;
    if (item?.line_modifiers_summary?.trim()) return true;
    const m = item?.line_modifiers;
    if (!m || typeof m !== 'object') return false;
    return (
      (!!m.remove && m.remove.length > 0) ||
      (!!m.add && m.add.length > 0) ||
      (!!m.substitute && m.substitute.length > 0)
    );
  }

  private formatLineModifiersFromJson(m: OrderLineModifiers | null | undefined): string {
    if (!m) return '';
    const parts: string[] = [];
    if (m.remove?.length) parts.push(`Remove: ${m.remove.join(', ')}`);
    if (m.add?.length) parts.push(`Add: ${m.add.join(', ')}`);
    if (m.substitute?.length) {
      parts.push(`Sub: ${m.substitute.map((s) => `${s.from} -> ${s.to}`).join(', ')}`);
    }
    return parts.join(' | ');
  }

  formatCustomizationItem(item: OrderItem): string {
    const snapQ = item.customization_summary?.trim();
    let c = '';
    if (snapQ) {
      c = snapQ;
    } else {
      const answers = item.customization_answers;
      if (answers && Object.keys(answers).length > 0) {
        const parts: string[] = [];
        for (const v of Object.values(answers)) {
          if (Array.isArray(v)) parts.push(v.join(', '));
          else parts.push(String(v));
        }
        c = parts.join(' | ');
      }
    }
    const snapM = item.line_modifiers_summary?.trim();
    const m = snapM || this.formatLineModifiersFromJson(item.line_modifiers ?? undefined);
    if (c && m) return `${c} | ${m}`;
    return c || m || '';
  }

  /** Items sorted by status; show pending, preparing, and ready (hide delivered/cancelled so paid orders stay until delivered). */
  getSortedItems(items: OrderItem[]): OrderItem[] {
    const order: Record<string, number> = {
      pending: 0,
      preparing: 1,
      ready: 2,
      delivered: 3,
      cancelled: 4,
    };
    const notYetDelivered = [...items].filter(
      (i) => {
        if (i.removed_by_customer) return false;
        const itemStatus = normalizeItemWorkflowStatus(i.status);
        return itemStatus === 'pending' || itemStatus === 'preparing' || itemStatus === 'ready';
      }
    );
    return notYetDelivered.sort((a, b) => {
      const aOrder = order[normalizeItemWorkflowStatus(a.status)] ?? 5;
      const bOrder = order[normalizeItemWorkflowStatus(b.status)] ?? 5;
      return aOrder - bOrder;
    });
  }

  private getOrderLane(order: Order): KitchenLaneKey {
    const workflowStatus = this.getOrderDisplayStatus(order);
    if (workflowStatus === 'ready') return 'ready';
    if (workflowStatus === 'preparing') return 'preparing';
    return 'pending';
  }

  formatOrderTime(dateString: string): string {
    if (!dateString) return '-';
    const dateStr =
      dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-', 10)
        ? dateString
        : dateString + 'Z';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 60_000) return '< 1m ago';
    if (diffMs < 3600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
    if (diffMs < 86400_000) return `${Math.floor(diffMs / 3600_000)}h ago`;
    if (diffMs < 604800_000) return `${Math.floor(diffMs / 86400_000)}d ago`;
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  formatExactTime(dateString: string): string {
    if (!dateString) return '';
    const dateStr =
      dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-', 10)
        ? dateString
        : dateString + 'Z';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateString : date.toLocaleString();
  }

  getItemStatusTransitions(currentStatus: string): { forward: string[]; backward: string[] } {
    const transitions: Record<string, { forward: string[]; backward: string[] }> = {
      pending: { forward: ['preparing'], backward: [] },
      preparing: { forward: ['ready'], backward: ['pending'] },
      ready: { forward: ['delivered'], backward: ['preparing'] },
      delivered: { forward: [], backward: ['ready'] },
      cancelled: { forward: [], backward: [] },
    };
    const key = normalizeItemWorkflowStatus(currentStatus);
    return transitions[key] ?? { forward: [], backward: [] };
  }

  toggleItemStatusDropdown(orderId: number, itemId: number): void {
    const key = `${orderId}-${itemId}`;
    const wasOpen = this.itemStatusDropdownOpen() === key;
    this.itemStatusDropdownOpen.update((current) => (current === key ? null : key));
    if (wasOpen) {
      this.flushPendingBackgroundRefresh();
    }
  }

  updateItemStatus(orderId: number, itemId: number, status: string): void {
    this.itemStatusDropdownOpen.set(null);
    this.api.updateOrderItemStatus(orderId, itemId, status).subscribe({
      next: () => this.loadOrders({ background: true }),
      error: () => this.loadOrders({ background: true }),
    });
  }
}
