import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, firstValueFrom, of } from 'rxjs';
import {
  ApiService,
  CanvasTable,
  GuestQueueEntry,
  Order,
  Product,
  ProductQuestion,
  TablePaymentStatus,
  TenantProduct,
  TenantSettings,
} from '../services/api.service';
import { getCustomerPublicOrigin } from '../shared/host-portal.util';
import { SidebarComponent } from '../shared/sidebar.component';
import { StaffPosToolbarComponent } from '../shared/staff-pos-toolbar.component';

type PosCheckoutMode = 'cash' | 'card_terminal' | 'hitpay';
type PosSettlementMode = 'cash' | 'card_terminal' | 'hitpay';
type PosProductSource = 'tenant_product' | 'product';

interface PosSellableProduct {
  id: number;
  name: string;
  priceCents: number;
  source: PosProductSource;
  category: string | null;
  description: string | null;
  ingredients: string | null;
  imageFilename: string | null;
  imageUrl: string | null;
  isActive: boolean;
  tenantProductId?: number | null;
  legacyProductId?: number | null;
  catalogName?: string | null;
  questions?: ProductQuestion[];
}

interface PosCartLine {
  lineKey: string;
  productId: number;
  name: string;
  priceCents: number;
  quantity: number;
  source: PosProductSource;
  notes?: string;
  customizationAnswers?: Record<string, string | number | string[]>;
  customizationSummary?: string | null;
}

interface StaffMenuAccessToken {
  token: string;
  table_token: string;
  expires_in: number;
}

interface QuickProductDraft {
  name: string;
  price: string;
  category: string;
  description: string;
}

interface PosQueueOrderGroup {
  key: string;
  label: string;
  tableId: number | null;
  orders: Order[];
  totalCents: number;
  newestAt: string | null;
}

interface PosCheckoutOutcome {
  mode: PosCheckoutMode;
  tableName: string;
  orderId: number;
  amountCents: number;
}

type PosHitPayFlowState = 'idle' | 'redirecting' | 'confirming' | 'cancelled' | 'failed';
type PosDrawerView = 'menu' | 'checkout' | 'orders' | 'history';
type QueueResolutionAction = 'cancelled' | 'no_show';

@Component({
  selector: 'app-cashier-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent, StaffPosToolbarComponent],
  template: `
    <app-sidebar>
      <div class="page-shell">
        <header class="page-header page-header--staff-flow">
          <app-staff-pos-toolbar />
          <div class="header-copy">
            <div>
              <p class="eyebrow">Cashier POS</p>
              <h1>Service counter</h1>
              <p class="subcopy">Pick a table, build the order, take payment.</p>
            </div>
            <button type="button" class="btn btn-secondary" (click)="loadData()" [disabled]="loading()">
              {{ loading() ? 'Refreshing...' : 'Refresh board' }}
            </button>
          </div>
        </header>

        @if (error()) {
          <div class="error-banner">{{ error() }}</div>
        }

        @if (notice()) {
          <div class="notice-banner">{{ notice() }}</div>
        }

        <section class="cashier-status-strip">
          <article class="status-chip" [class.status-chip--loading]="loading()">
            <span class="summary-label">Tables loaded</span>
            <strong>{{ loading() && tables().length === 0 ? 'Syncing' : tables().length }}</strong>
          </article>
          <article class="status-chip" [class.status-chip--loading]="loading()">
            <span class="summary-label">Open bills</span>
            <strong>{{ loading() && orders().length === 0 ? 'Syncing' : liveBills().length }}</strong>
          </article>
          <article class="status-chip" [class.status-chip--loading]="loading()">
            <span class="summary-label">Paid today</span>
            <strong>{{ loading() && orders().length === 0 ? 'Syncing' : formatPrice(totalPaidCents()) }}</strong>
          </article>
          <article class="status-chip" [class.status-chip--loading]="loading()">
            <span class="summary-label">Catalog</span>
            <strong>{{ loading() && activeProducts().length === 0 ? 'Syncing' : activeProducts().length }}</strong>
          </article>
        </section>

        <div class="cashier-grid" [class.cashier-grid--workspace-open]="tableWorkspaceOpen()">
          <section class="lane lane--tables" id="cashier-floor">
            <div class="lane-header">
              <div>
                <p class="eyebrow">Tables</p>
                <h2>Floor</h2>
              </div>
              <div class="lane-inline-pills">
                <span class="muted-pill">{{ tables().length }} loaded</span>
                <span class="muted-pill">{{ liveBills().length }} open</span>
                <span class="muted-pill">{{ paidOrders().length }} paid today</span>
              </div>
            </div>

            <section class="guest-queue-rail" aria-label="Live guest queue">
              <button
                type="button"
                class="guest-queue-toggle"
                (click)="toggleQueueRail()"
                [attr.aria-expanded]="queueRailOpen()">
                <span>
                  <span class="eyebrow">Live queue</span>
                  <strong>{{ sortedGuestQueueEntries().length }} parties</strong>
                </span>
                <span class="guest-queue-toggle-summary">
                  <span class="muted-pill">{{ queueWaitingCount() }} waiting</span>
                  <span class="muted-pill muted-pill--accent">{{ queueNotifiedCount() }} pinged</span>
                  <span class="guest-queue-chevron" aria-hidden="true">{{ queueRailOpen() ? '−' : '+' }}</span>
                </span>
              </button>

              <div class="guest-queue-summary" aria-label="Queue summary">
                <span><small>Next</small><strong>{{ nextQueueLabel() }}</strong></span>
                <span><small>Longest wait</small><strong>{{ queueLongestWaitLabel() }}</strong></span>
                <span><small>Guests</small><strong>{{ queueGuestCount() }}</strong></span>
              </div>

              @if (queueRailOpen()) {
                <div class="guest-queue-list">
                  @if (sortedGuestQueueEntries().length === 0) {
                    <div class="guest-queue-empty">No waiting or pinged parties right now.</div>
                  }
                  @for (entry of sortedGuestQueueEntries(); track entry.id) {
                    <article class="guest-queue-card" [class.guest-queue-card--notified]="entry.status === 'notified'">
                      <div class="guest-queue-card-main">
                        <strong class="guest-queue-number">{{ entry.queue_label }}</strong>
                        <div class="guest-queue-party">
                          <strong>{{ entry.customer_name }}</strong>
                          <span>{{ entry.party_size }} pax · {{ queueWaitLabel(entry) }}</span>
                          @if (entry.customer_phone) {
                            <small>{{ entry.customer_phone }}</small>
                          }
                        </div>
                        <span class="state-pill" [class.state-pill--ready]="entry.status === 'notified'">
                          {{ entry.status === 'notified' ? 'Pinged' : 'Waiting' }}
                        </span>
                      </div>

                      <div class="guest-queue-actions">
                        @if (entry.status === 'waiting') {
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm"
                            (click)="notifyQueueEntry(entry)"
                            [disabled]="queueActionId() === entry.id">
                            Ping
                          </button>
                        }
                        <button
                          type="button"
                          class="btn btn-primary btn-sm"
                          (click)="startQueueSeating(entry)"
                          [disabled]="queueActionId() === entry.id">
                          Assign table
                        </button>
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm"
                          (click)="resolveQueueEntry(entry, 'no_show')"
                          [disabled]="queueActionId() === entry.id">
                          No show
                        </button>
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm"
                          (click)="resolveQueueEntry(entry, 'cancelled')"
                          [disabled]="queueActionId() === entry.id">
                          Cancel
                        </button>
                      </div>

                      @if (queueSeatEntry()?.id === entry.id) {
                        <div class="guest-queue-seat-picker">
                          <label [for]="'queue-seat-table-' + entry.id">Seat {{ entry.queue_label }} at</label>
                          <select
                            [id]="'queue-seat-table-' + entry.id"
                            class="text-input"
                            [ngModel]="queueSeatTargetId()"
                            (ngModelChange)="queueSeatTargetId.set(+$event || null)">
                            <option [ngValue]="null">Choose an available table</option>
                            @for (table of queueEligibleTables(entry); track table.id) {
                              <option [ngValue]="table.id">{{ table.name }} · {{ table.seat_count || 0 }} seats</option>
                            }
                          </select>
                          <div class="guest-queue-seat-actions">
                            <button type="button" class="btn btn-ghost btn-sm" (click)="cancelQueueSeating()">Back</button>
                            <button
                              type="button"
                              class="btn btn-primary btn-sm"
                              (click)="seatQueueEntry(entry)"
                              [disabled]="!queueSeatTargetId() || queueActionId() === entry.id">
                              {{ queueActionId() === entry.id ? 'Seating…' : 'Seat and open POS' }}
                            </button>
                          </div>
                        </div>
                      }
                    </article>
                  }
                </div>
              }
            </section>

            @if (loading() && tables().length === 0) {
              <div class="empty-card loading-card">
                <div class="loading-card-icon"></div>
                <h3>Loading floor tables…</h3>
                <p>Syncing table sessions, open bills, paid tickets, and seating status.</p>
                <div class="loading-bars" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            } @else if (tables().length === 0 && !loading()) {
              <div class="empty-card">
                <h3>No tables configured yet</h3>
                <p>Create the floor first so the cashier can bind bills to a live table.</p>
                <a routerLink="/tables/canvas" class="btn btn-primary">Open tables</a>
              </div>
            } @else {
              <div class="table-stack">
                @for (table of sortedTables(); track table.id) {
                  <article
                    class="table-card"
                    [attr.data-table-state]="getTableState(table)"
                    [class.table-card--selected]="selectedTableId() === table.id">
                    <button type="button" class="table-card-main" (click)="openTableWorkspace(table)">
                      <div class="table-card-top">
                        <div class="table-card-copy">
                          <span class="table-name">{{ table.name }}</span>
                          <span class="table-meta">{{ table.seat_count || 0 }} seats</span>
                          @if (tableReservationHint(table)) {
                            <span class="table-reservation-inline">{{ tableReservationHint(table) }}</span>
                          }
                          @if (table.seated_queue_entry; as seatedQueue) {
                            <span class="table-queue-inline">
                              {{ seatedQueue.queue_label }} · {{ seatedQueue.customer_name }} · {{ seatedQueue.party_size }} pax
                            </span>
                          }
                        </div>
                        <span class="state-pill" [class]="stateClass(getTableState(table))">
                          {{ getTableStateLabel(table) }}
                        </span>
                      </div>
                      <div class="table-card-bottom">
                        <span class="table-card-summary">{{ getTableSaleSummary(table) }}</span>
                        @if (getPaymentStateLabel(table); as paymentLabel) {
                          <span
                            class="table-card-payment-pill"
                            [class]="paymentStateClass(getTablePaymentState(table))"
                          >
                            <span aria-hidden="true">{{ paymentStateIcon(getTablePaymentState(table)) }}</span>
                            {{ paymentLabel }}
                          </span>
                        }
                      </div>
                    </button>

                    <div class="table-card-actions" [class.table-card-actions--triple]="canClearTable(table)">
                      @if (canClearTable(table)) {
                        <button
                          type="button"
                          class="btn btn-secondary btn-sm btn-table-clear"
                          (click)="clearTable(table)"
                          [disabled]="pendingTableId() === table.id">
                          {{ pendingTableId() === table.id ? 'Closing...' : 'Close table' }}
                        </button>
                      }
                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        (click)="openTableWorkspace(table)">
                        {{ tablePrimaryActionLabel(table) }}
                      </button>
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        (click)="selectTable(table); openOrdersForTable(table)">
                        {{ tableOrdersActionLabel(table) }}
                      </button>
                    </div>
                  </article>
                }
              </div>
            }

          </section>

          @if (showLegacyInlineLanes()) {
          <section class="lane lane--catalog" id="cashier-catalog">
            <div class="lane-header">
              <div>
                <p class="eyebrow">Menu</p>
                <h2>{{ effectiveCheckoutTable()?.name || 'Item picker' }}</h2>
              </div>
              <div class="workspace-header-actions">
                <span class="muted-pill">{{ filteredProducts().length }} visible</span>
                <button type="button" class="btn btn-ghost btn-sm" (click)="closeTableWorkspace()">Back to tables</button>
              </div>
            </div>

            <div class="catalog-toolbar">
              <input
                id="cashier-catalog-search"
                type="search"
                class="search-input"
                placeholder="Search item or SKU"
                [ngModel]="productSearch()"
                (ngModelChange)="productSearch.set($event || '')" />
              <select
                class="text-input category-select"
                [ngModel]="selectedCategory()"
                (ngModelChange)="selectedCategory.set($event || '')">
                <option value="">All categories</option>
                @for (category of productCategories(); track category) {
                  <option [value]="category">{{ category }}</option>
                }
              </select>
              <div class="catalog-toolbar-actions">
                <button type="button" class="btn btn-secondary btn-sm" (click)="toggleQuickCreate()">
                  {{ showQuickCreate() ? 'Hide quick item' : 'Quick item' }}
                </button>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  (click)="openCategoryManager()">
                  Categories
                </button>
                <a routerLink="/products" class="btn btn-ghost btn-sm">Full catalog</a>
              </div>
            </div>

            <div class="catalog-hints">
              <span class="muted-pill" [class.state--paid]="!!(cartBoundTable() || selectedTable())">
                {{ cartBoundTable()?.name || selectedTable()?.name || 'Pick a table' }}
              </span>
              @if (selectedCategory()) {
                <button type="button" class="btn btn-ghost btn-xs" (click)="selectedCategory.set('')">
                  Clear category
                </button>
              }
            </div>

            @if (payableLiveBillOrder(); as liveBill) {
              <div class="inline-hint inline-hint--compact inline-hint--live-bill">
                <div class="inline-hint-copy">
                  <strong>Live bill linked - {{ effectiveCheckoutTable()?.name }} - #{{ liveBill.id }}</strong>
                  <small>Continue this table from the bill dock below.</small>
                </div>
              </div>
            }

            @if (!selectedTable() && !cartBoundTable() && !hasReadyTableForNewCart()) {
              <div class="inline-hint inline-hint--warn inline-hint--compact">
                <div class="inline-hint-copy">
                  <strong>No clear table is ready.</strong>
                  <p>Free one table or close an open bill first.</p>
                </div>
                <div class="action-row action-row--secondary">
                  <a routerLink="/tables/canvas" class="btn btn-ghost btn-sm">Floor map</a>
                  <a routerLink="/staff/orders" class="btn btn-secondary btn-sm">Review open bills</a>
                </div>
              </div>
            }

            @if (productCategories().length > 0) {
              <div class="category-chip-row">
                <button
                  type="button"
                  class="category-chip"
                  [class.category-chip--active]="!selectedCategory()"
                  (click)="selectedCategory.set('')">
                  All items
                  <span>{{ activeProducts().length }}</span>
                </button>
                @for (category of productCategories(); track category) {
                  <button
                    type="button"
                    class="category-chip"
                    [class.category-chip--active]="selectedCategory() === category"
                    (click)="selectedCategory.set(category)">
                    {{ category }}
                    <span>{{ productCountForCategory(category) }}</span>
                  </button>
                }
              </div>
            }

            @if (showQuickCreate()) {
              <div class="quick-create-card">
                <div class="lane-header lane-header--tight">
                  <div>
                    <p class="eyebrow">Quick product</p>
                    <h3>Add a sellable item</h3>
                  </div>
                  <span class="muted-pill">Creates a legacy product</span>
                </div>

                <div class="quick-create-grid">
                  <label class="field-stack">
                    <span class="micro-label">Name</span>
                    <input
                      type="text"
                      class="text-input"
                      [(ngModel)]="quickProductDraft.name"
                      placeholder="Signature ramen" />
                  </label>

                  <label class="field-stack">
                    <span class="micro-label">Price</span>
                    <input
                      type="text"
                      inputmode="decimal"
                      class="text-input"
                      [(ngModel)]="quickProductDraft.price"
                      placeholder="12.90" />
                  </label>
                </div>

                <div class="quick-create-grid">
                  <label class="field-stack">
                    <span class="micro-label">Category</span>
                    <input
                      type="text"
                      class="text-input"
                      [(ngModel)]="quickProductDraft.category"
                      placeholder="Mains" />
                  </label>

                  <label class="field-stack">
                    <span class="micro-label">Description</span>
                    <input
                      type="text"
                      class="text-input"
                      [(ngModel)]="quickProductDraft.description"
                      placeholder="Visible to staff only if you need a quick note" />
                  </label>
                </div>

                <div class="action-row">
                  <button
                    type="button"
                    class="btn btn-primary"
                    (click)="createQuickProduct()"
                    [disabled]="creatingProduct()">
                    {{ creatingProduct() ? 'Creating...' : 'Create product' }}
                  </button>
                  <span class="inline-hint">Quick till item.</span>
                </div>
              </div>
            }

            @if (loading() && sellableProducts().length === 0) {
              <div class="empty-card loading-card">
                <div class="loading-card-icon"></div>
                <h3>Loading menu catalog…</h3>
                <p>Fetching active products, modifiers, and categories for fast ordering.</p>
                <div class="loading-bars" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            } @else if (sellableProducts().length === 0 && !loading()) {
              <div class="empty-card">
                <h3>No sellable products yet</h3>
                <p>Add tenant products or legacy products first so the cashier can build tickets locally.</p>
                <a routerLink="/products" class="btn btn-primary">Open products</a>
              </div>
            } @else if (filteredProducts().length === 0) {
              <div class="empty-card empty-card--compact">
                <p>No items match the current search.</p>
              </div>
            } @else {
              <div class="product-grid">
                @for (product of filteredProducts(); track product.id) {
                  <article class="product-card">
                    <div class="product-card-body">
                      @if (productImageUrl(product); as imageUrl) {
                        <div class="product-card-media">
                          <img
                            class="product-card-image"
                            [src]="imageUrl"
                            [alt]="product.name"
                            (error)="markProductImageBroken(product)" />
                        </div>
                      } @else {
                        <div class="product-card-media product-card-media--placeholder" aria-hidden="true">
                          <span>{{ productInitials(product.name) }}</span>
                        </div>
                      }

                      <div class="product-card-content">
                        <div class="product-card-copy">
                          <div class="product-card-top">
                            <div class="product-title-stack">
                              <strong>{{ product.name }}</strong>
                              <span>{{ product.category || product.catalogName || productSourceLabel(product) }}</span>
                            </div>
                          </div>

                          <div class="product-card-badges" [class.product-card-badges--empty]="cartQuantityFor(product.id!) === 0 && !hasProductQuestions(product)">
                            @if (cartQuantityFor(product.id!) > 0) {
                              <span class="muted-pill">{{ cartQuantityFor(product.id!) }} in cart</span>
                            }
                            @if (hasProductQuestions(product)) {
                              <span class="muted-pill">{{ requiredQuestionCount(product) > 0 ? requiredQuestionCount(product) + ' required' : 'Customizable' }}</span>
                            }
                          </div>

                          <p
                            class="product-notes"
                            [class.product-notes--empty]="!(product.description || product.ingredients)">
                            {{ product.description || product.ingredients || 'Ready for staff ordering.' }}
                          </p>
                        </div>

                        <div class="product-card-bottom">
                          <div class="product-price-stack">
                            <strong class="product-price">{{ formatPrice(product.priceCents) }}</strong>
                            <span class="product-price-caption">{{ productSourceCaption(product) }}</span>
                          </div>
                          <button
                            type="button"
                            class="btn btn-primary btn-sm"
                            (click)="addProduct(product)"
                            [disabled]="!canAddSelectedProduct()">
                            {{ productActionLabel(product) }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                }
              </div>
            }
          </section>
          }

          @if (showLegacyInlineLanes()) {
          <section class="lane lane--checkout">
            <div class="lane-header lane-header--checkout">
              <div>
                <p class="eyebrow">Bill dock</p>
                <h2 class="ticket-heading">{{ effectiveCheckoutTable()?.name || 'Select a table to begin' }}</h2>
              </div>
              <button type="button" class="btn btn-ghost btn-sm checkout-close-btn" (click)="closeTableWorkspace()">Back to tables</button>
            </div>

            @if (effectiveCheckoutTable(); as checkoutTable) {
              <div class="checkout-hero">
                <div class="checkout-hero-main">
                  <div class="checkout-hero-copy">
                    <strong>{{ checkoutTable.name }}</strong>
                    <small>{{ selectedTableSummary(checkoutTable) }}</small>
                    @if (tableReservationHint(checkoutTable)) {
                      <small class="checkout-hero-reservation">{{ tableReservationHint(checkoutTable) }}</small>
                    }
                  </div>
                  <div class="checkout-hero-pills">
                    <span class="muted-pill">{{ getTableStateLabel(checkoutTable) }}</span>
                    @if (tableReservationBadge(checkoutTable)) {
                      <span class="muted-pill muted-pill--soft">{{ tableReservationBadge(checkoutTable) }}</span>
                    }
                    @if (payableLiveBillOrder(); as liveBill) {
                      <span class="muted-pill muted-pill--accent">Bill #{{ liveBill.id }}</span>
                    }
                  </div>
                </div>

                  <div class="action-row action-row--secondary action-row--checkout-table">
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      (click)="focusTableForSale(checkoutTable)">
                      {{ tablePrimaryActionLabel(checkoutTable) }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      (click)="openOrdersForTable(checkoutTable)">
                      {{ tableOrdersActionLabel(checkoutTable) }}
                    </button>
                  @if (canClearTable(checkoutTable)) {
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      (click)="clearTable(checkoutTable)"
                      [disabled]="pendingTableId() === checkoutTable.id">
                      {{ pendingTableId() === checkoutTable.id ? 'Closing...' : 'Close table' }}
                    </button>
                  }
                </div>
              </div>
            }

            <div class="cart-card">
              <div class="lane-header lane-header--tight">
                <div>
                  <p class="eyebrow">{{ cartLines().length > 0 ? 'Cart' : payableLiveBillOrder() ? 'Live bill' : 'Cart' }}</p>
                  <h3>{{ cartLines().length > 0 ? 'Review items' : cartTitle() }}</h3>
                </div>
                @if (cartLines().length > 0) {
                  <div class="cart-header-actions">
                    <span class="muted-pill">{{ formatPrice(cartSubtotalCents()) }}</span>
                    <button type="button" class="btn btn-ghost btn-sm" (click)="clearCart()" [disabled]="processingCheckout()">
                      Clear cart
                    </button>
                  </div>
                } @else if (payableLiveBillOrder()) {
                  <div class="cart-header-actions">
                    <span class="muted-pill muted-pill--accent">{{ formatPrice(payableLiveBillOrder()?.total_cents || 0) }}</span>
                  </div>
                }
              </div>
              @if (cartLines().length === 0) {
                <div class="empty-card empty-card--compact">
                  @if (payableLiveBillOrder(); as liveBill) {
                    <div class="live-bill-summary live-bill-summary--compact live-bill-summary--dock">
                      <div class="live-bill-summary-copy live-bill-summary-copy--dock">
                        <strong>Bill #{{ liveBill.id }}</strong>
                        <small>{{ effectiveCheckoutTable()?.name || 'Selected table' }} · {{ liveBill.items.length }} items</small>
                      </div>
                      <div class="live-bill-summary-meta live-bill-summary-meta--dock">
                        <span class="muted-pill muted-pill--accent">{{ formatPrice(liveBill.total_cents || 0) }}</span>
                      </div>
                    </div>
                    <div class="action-row action-row--secondary action-row--live-bill">
                      <button type="button" class="btn btn-secondary btn-sm" (click)="focusLiveBillForItems()">Add items</button>
                      <button type="button" class="btn btn-primary btn-sm" (click)="focusLiveBillForSettlement()">Pay now</button>
                    </div>
                    <div class="line-list line-list--readonly line-list--live-bill">
                      @for (item of liveBill.items; track $index) {
                        <div class="line-row line-row--readonly">
                          <div class="line-copy">
                            <strong>{{ item.quantity }} x {{ item.product_name }}</strong>
                            <span>{{ formatPrice(item.price_cents) }} each</span>
                            @if (item.customization_summary) {
                              <small class="line-customization">{{ item.customization_summary }}</small>
                            } @else if (item.notes) {
                              <small class="line-customization">{{ item.notes }}</small>
                            }
                          </div>
                          <strong class="line-total">{{ formatPrice((item.price_cents || 0) * (item.quantity || 0)) }}</strong>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="cart-idle-strip">
                      <strong>Empty ticket</strong>
                      <span>{{ emptyCartHint() }}</span>
                    </div>
                  }
                </div>
              } @else {
                <div class="line-list" id="cart-lines">
                  @for (line of cartLines(); track line.lineKey) {
                    <div class="line-row">
                      <div class="line-copy">
                        <div class="line-copy-top">
                          <strong>{{ line.name }}</strong>
                          <span class="muted-pill">Qty {{ line.quantity }}</span>
                        </div>
                        <span>{{ formatPrice(line.priceCents) }} each</span>
                        @if (line.customizationSummary) {
                          <small class="line-customization">{{ line.customizationSummary }}</small>
                        }
                        <label class="line-note-field">
                          <span>Kitchen note</span>
                          <input
                            type="text"
                            [ngModel]="line.notes || ''"
                            (ngModelChange)="updateLineNotes(line.lineKey, $event)"
                            placeholder="e.g. no chilli, allergy"
                            maxlength="160"
                            [disabled]="processingCheckout()"
                          />
                        </label>
                      </div>
                      <div class="line-controls">
                        <div class="qty-control">
                          <button type="button" class="qty-btn" (click)="decrementLine(line.lineKey)" [disabled]="processingCheckout()">-</button>
                          <span class="qty-value">{{ line.quantity }}</span>
                          <button type="button" class="qty-btn" (click)="incrementLine(line.lineKey)" [disabled]="processingCheckout()">+</button>
                        </div>
                        <div class="line-total-stack">
                          <span class="micro-label">Line total</span>
                          <strong class="line-total">{{ formatPrice(line.priceCents * line.quantity) }}</strong>
                        </div>
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm line-remove-btn"
                          (click)="removeLine(line.lineKey)"
                          [disabled]="processingCheckout()">
                          Remove
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="totals-card" id="payment-dock">
              <div class="lane-header lane-header--tight">
                <div>
                  <p class="eyebrow">Payment</p>
                  <h3>{{ hasCheckoutWork() ? 'Collect payment' : 'Payment' }}</h3>
                </div>
              </div>
              @if (lastCheckoutOutcome() && !hasCheckoutWork()) {
                <div class="checkout-outcome-card">
                  <div class="checkout-outcome-copy">
                    <p class="eyebrow">Last checkout</p>
                    <strong>{{ checkoutOutcomeHeadline() }}</strong>
                    <small>{{ checkoutOutcomeSupport() }}</small>
                  </div>
                  @if (lastCheckoutTable(); as checkoutOutcomeTable) {
                    @if (isPendingClearTable(checkoutOutcomeTable)) {
                      <div class="inline-hint inline-hint--warning inline-hint--compact" role="alert">
                        <div class="inline-hint-copy">
                          <strong>Final confirmation</strong>
                          <small>Close {{ checkoutOutcomeTable.name }} and reset it for the next guest?</small>
                        </div>
                        <div class="action-row action-row--secondary">
                          <button type="button" class="btn btn-secondary btn-sm" (click)="cancelClearTable()" [disabled]="pendingTableId() === checkoutOutcomeTable.id">
                            Keep open
                          </button>
                          <button type="button" class="btn btn-primary btn-sm" (click)="confirmClearTable()" [disabled]="pendingTableId() === checkoutOutcomeTable.id">
                            {{ pendingTableId() === checkoutOutcomeTable.id ? 'Closing...' : 'Yes, close table' }}
                          </button>
                        </div>
                      </div>
                    }
                  }
                  <div class="checkout-outcome-actions">
                    @if (canClearLastCheckoutTable()) {
                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        style="min-height:2.45rem;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap"
                        (click)="clearLastCheckoutTable()"
                        [disabled]="pendingTableId() === lastCheckoutTableId()">
                        {{ pendingTableId() === lastCheckoutTableId() ? 'Closing...' : 'Close table' }}
                      </button>
                    }
                    <button type="button" class="btn btn-secondary btn-sm" (click)="reviewLastCheckoutOutcome()">
                      View receipt
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm" (click)="advanceToNextReadyTable()">
                      Next table
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm" (click)="closeTableWorkspace()">
                      Choose from floor
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm" (click)="dismissCheckoutOutcome()">
                      Close
                    </button>
                  </div>
                </div>
              } @else if (!hasCheckoutWork()) {
                @if (effectiveCheckoutTable(); as settledTable) {
                  @if (canClearTable(settledTable)) {
                    <div class="empty-card empty-card--compact empty-card--checkout">
                      <strong>Ready to clear {{ settledTable.name }}</strong>
                      <p class="checkout-empty-copy">This bill is finished.</p>
                      @if (isPendingClearTable(settledTable)) {
                        <p class="checkout-empty-copy">Final confirmation: close this table and reset it for the next guest?</p>
                        <div class="action-row action-row--checkout-compact">
                          <button type="button" class="btn btn-secondary btn-sm" (click)="cancelClearTable()" [disabled]="pendingTableId() === settledTable.id">
                            Keep open
                          </button>
                          <button type="button" class="btn btn-primary btn-sm" (click)="confirmClearTable()" [disabled]="pendingTableId() === settledTable.id">
                            {{ pendingTableId() === settledTable.id ? 'Closing...' : 'Yes, close table' }}
                          </button>
                        </div>
                      } @else {
                        <div class="action-row action-row--checkout-compact">
                          <button
                            type="button"
                            class="btn btn-primary btn-sm"
                            (click)="clearTable(settledTable)"
                            [disabled]="pendingTableId() === settledTable.id">
                            {{ pendingTableId() === settledTable.id ? 'Closing...' : 'Close table' }}
                          </button>
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm"
                            (click)="openOrdersForTable(settledTable)">
                            {{ tableOrdersActionLabel(settledTable) }}
                          </button>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="empty-card empty-card--compact empty-card--checkout">
                      <strong>{{ checkoutIntroTitle() }}</strong>
                      <p class="checkout-empty-copy">{{ checkoutIntroCopy() }}</p>
                      <div class="action-row action-row--checkout-compact">
                        <button
                          type="button"
                          class="btn btn-primary btn-sm"
                          (click)="focusTableForSale(settledTable)">
                          {{ tablePrimaryActionLabel(settledTable) }}
                        </button>
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm"
                          (click)="openOrdersForTable(settledTable)">
                          {{ tableOrdersActionLabel(settledTable) }}
                        </button>
                      </div>
                    </div>
                  }
                } @else {
                  <div class="empty-card empty-card--compact empty-card--checkout">
                    <strong>{{ checkoutIntroTitle() }}</strong>
                    <p class="checkout-empty-copy">{{ checkoutIntroCopy() }}</p>
                    <div class="action-row action-row--checkout-compact">
                      <button type="button" class="btn btn-primary btn-sm" (click)="advanceToNextReadyTable()">
                        Choose table
                      </button>
                      <a routerLink="/tables/canvas" class="btn btn-ghost btn-sm">Open floor</a>
                    </div>
                  </div>
                }
              } @else {
                <div class="payment-dock-topline">
                  <div class="payment-dock-total">
                    <span class="micro-label">Amount due</span>
                    <strong>{{ checkoutSummaryTotalCopy() }}</strong>
                    <small>{{ settlementSummaryCaption() }}</small>
                  </div>
                  <div class="payment-dock-meta">
                    <span class="muted-pill muted-pill--accent">{{ checkoutSummaryTableCopy() }}</span>
                    <span class="muted-pill">{{ checkoutSummaryItemsCopy() }}</span>
                  </div>
                </div>
                @if (hitPayFlowState() !== 'idle') {
                  <div class="payment-state-strip" [class.payment-state-strip--error]="hitPayFlowState() === 'failed'">
                    <span class="muted-pill muted-pill--accent">{{ hitPayStateLabel() }}</span>
                    <small>{{ hitPayStateCopy() }}</small>
                    @if (paymentRecoveryVisible()) {
                      <div class="action-row action-row--secondary">
                        <button
                          type="button"
                          class="btn btn-primary btn-sm"
                          (click)="retryHitPayPayment()"
                          [disabled]="!canRetryHitPayPayment()">
                          Retry HitPay
                        </button>
                        <button
                          type="button"
                          class="btn btn-secondary btn-sm"
                          (click)="switchPaymentRecoveryToTerminal()"
                          [disabled]="processingCheckout()">
                          Use terminal instead
                        </button>
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm"
                          (click)="backToCartFromPaymentRecovery()"
                          [disabled]="processingCheckout()">
                          Back to cart
                        </button>
                      </div>
                    }
                  </div>
                }
                <div class="settlement-mode-grid settlement-mode-grid--compact">
                  <button
                    type="button"
                    class="mode-card"
                    [class.mode-card--selected]="primaryCheckoutMode() === 'cash'"
                    (click)="selectSettlementMode('cash')"
                    [disabled]="processingCheckout()">
                      <span class="micro-label">Counter cash</span>
                      <strong>Counter cash — staff only</strong>
                      <small>Internal counter settlement</small>
                  </button>
                  <button
                    type="button"
                    class="mode-card"
                    [class.mode-card--selected]="primaryCheckoutMode() === 'card_terminal'"
                    (click)="selectSettlementMode('card_terminal')"
                    [disabled]="processingCheckout()">
                      <span class="micro-label">Terminal</span>
                      <strong>Use terminal</strong>
                      <small>Machine confirmed</small>
                  </button>
                  @if (hitPayConfigured()) {
                    <button
                      type="button"
                      class="mode-card"
                      [class.mode-card--selected]="primaryCheckoutMode() === 'hitpay'"
                      (click)="selectSettlementMode('hitpay')"
                        [disabled]="processingCheckout()">
                        <span class="micro-label">HitPay</span>
                        <strong>Send link</strong>
                        <small>Hosted checkout</small>
                      </button>
                  }
                </div>
                <p class="settlement-policy-note">
                  Customer QR checkout shows HitPay or card-at-table only. Cash is staff-only for counter settlement and manager reconciliation.
                </p>
                <p class="settlement-policy-note settlement-policy-note--warning">
                  Launch guardrail: one table session settles as one bill. Split bills, partial payments, refunds and reopened paid bills must be handled by a manager outside this screen until the accounting module is enabled.
                </p>
                <div class="settlement-summary-row settlement-summary-row--active settlement-summary-row--cta">
                  <div class="settlement-summary-copy settlement-summary-copy--primary">
                    <p class="eyebrow">Selected method</p>
                    <strong>{{ primarySettlementModeLabel() }}</strong>
                    <small>{{ settlementActionSupportCopy() }}</small>
                  </div>
                  <div class="settlement-summary-actions">
                    @if (cartItemCount() > 0) {
                      <button
                        type="button"
                        class="btn btn-secondary btn-lg settlement-submit-btn"
                        (click)="sendOrderToKitchen()"
                        [disabled]="!canSendOrderToKitchen()">
                        {{ processingCheckout() ? 'Sending...' : 'Send order to kitchen' }}
                      </button>
                    }
                    <button
                      type="button"
                      id="cashier-settlement-submit"
                      class="btn btn-primary btn-lg settlement-submit-btn"
                      (click)="submitCart(primaryCheckoutMode())"
                      [disabled]="!canSubmitCart()">
                      {{ processingCheckout() ? 'Working...' : checkoutPrimaryActionText() }}
                    </button>
                  </div>
                </div>
              }
            </div>
          </section>
          }
        </div>

        @if (showQueuePanel()) {
          <section
            class="queue-panel"
            id="cashier-orders-rail"
            [class.queue-panel--table-history]="!!effectiveCheckoutTable()">
            <div class="lane-header">
              <div>
                <p class="eyebrow">{{ queuePanelEyebrow() }}</p>
                <h2>{{ queuePanelTitle() }}</h2>
                @if (queuePanelSubtitle()) {
                  <small>{{ queuePanelSubtitle() }}</small>
                }
              </div>
              <div class="lane-header-actions">
                @if (effectiveCheckoutTable()) {
                  <span class="muted-pill">{{ queueHistoryOrders().length }} tickets</span>
                  @if (queueHistoryHasOverflow()) {
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      (click)="toggleTableHistory()">
                      {{ queueHistoryToggleLabel() }}
                    </button>
                  }
                }
                <a routerLink="/staff/orders" class="btn btn-ghost btn-sm">Orders</a>
              </div>
            </div>

            @if (queueOrders().length === 0 && !loading()) {
              <div class="empty-card empty-card--compact">
                <p>{{ queuePanelEmptyCopy() }}</p>
              </div>
            } @else {
              @if (effectiveCheckoutTable()) {
                @if (queueHistoryOrders().length > 0) {
                  <div class="queue-history-summary">
                    <span class="muted-pill muted-pill--accent">{{ queueHistoryOpenCount() }} needs review</span>
                    <span class="muted-pill">{{ queueHistoryPaidCount() }} settled</span>
                    <span class="muted-pill">{{ queueHistoryLatestLabel() }}</span>
                  </div>
                  <div class="queue-history-grid">
                    @for (order of queueVisibleHistoryOrders(); track order.id) {
                      <button
                        type="button"
                        class="queue-order-row queue-order-row--history"
                        [class.order-card--selected]="selectedOrderId() === order.id"
                        (click)="continueOrderInPos(order)">
                        <div class="queue-order-row-top">
                          <div class="queue-order-row-copy">
                            <span class="order-id">#{{ order.id }}</span>
                            <small>{{ queueOrderPreview(order) }}</small>
                          </div>
                          <strong>{{ formatPrice(order.total_cents || 0) }}</strong>
                        </div>
                        <div class="queue-order-row-meta">
                          <span class="state-pill" [class]="orderStatusClass(order)">
                            {{ queueGroupStatusLabel(order) }}
                          </span>
                          <span class="muted-pill">{{ paymentLabel(order) }}</span>
                          <span class="muted-pill">{{ queueOrderAgeLabel(order) }}</span>
                        </div>
                        <div class="queue-order-row-actions">
                          <button
                            type="button"
                            class="btn btn-ghost btn-sm"
                            (click)="continueOrderInPos(order); $event.stopPropagation()">
                            {{ queueHistoryPrimaryActionLabel(order) }}
                          </button>
                        </div>
                      </button>
                    }
                  </div>
                }
                @else {
                  <div class="empty-card empty-card--compact">
                    <p>No past bills are linked to {{ effectiveCheckoutTable()?.name }} yet.</p>
                  </div>
                }
              }
              @else {
                <div class="queue-history-summary">
                  <span class="muted-pill muted-pill--accent">{{ queueSettlementCount() }} to settle</span>
                  <span class="muted-pill">{{ queueLiveBillCount() }} live</span>
                  <span class="muted-pill">{{ queuePaidReviewCount() }} paid</span>
                </div>
                <div class="queue-group-stack">
                  @for (group of queueOrderGroups(); track group.key) {
                    <article class="queue-group-card">
                        <div class="queue-group-header">
                          <div class="queue-group-copy">
                            <p class="eyebrow">{{ group.tableId ? 'Table' : 'Counter' }}</p>
                            <h3>{{ group.label }}</h3>
                            <small>{{ queueGroupSummaryCopy(group) }}</small>
                            <strong class="queue-group-hint">{{ queueGroupActionHint(group) }}</strong>
                          </div>
                          <div class="queue-group-pills">
                            <span class="muted-pill muted-pill--accent">{{ queueGroupPrimaryStateLabel(group) }}</span>
                            <span class="muted-pill">{{ queueGroupStateBreakdownLabel(group) }}</span>
                            <span class="muted-pill">{{ formatPrice(group.totalCents) }}</span>
                            @if (queueGroupLeadOrder(group); as leadOrder) {
                              <span class="muted-pill muted-pill--accent">#{{ leadOrder.id }}</span>
                            }
                          </div>
                        </div>
                        <div class="queue-group-actions">
                          <button
                            type="button"
                            class="btn btn-primary btn-sm"
                            (click)="focusQueueGroup(group)">
                            {{ queueGroupPrimaryActionLabel(group) }}
                          </button>
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm"
                            (click)="openOrdersForQueueGroup(group)">
                            {{ queueGroupOrdersActionLabel(group) }}
                          </button>
                        </div>
                        <div class="queue-group-list">
                        @for (order of queueGroupPreviewOrders(group); track order.id) {
                          <button
                            type="button"
                            class="queue-order-row"
                            [class.order-card--selected]="selectedOrderId() === order.id"
                            (click)="continueOrderInPos(order)">
                            <div class="queue-order-row-top">
                              <div class="queue-order-row-copy">
                                <span class="order-id">#{{ order.id }}</span>
                                <small>{{ queueOrderPreview(order) }}</small>
                              </div>
                              <strong>{{ formatPrice(order.total_cents || 0) }}</strong>
                            </div>
                            <div class="queue-order-row-meta">
                              <span class="state-pill" [class]="orderStatusClass(order)">
                                {{ queueGroupStatusLabel(order) }}
                              </span>
                              <span class="muted-pill">{{ queueOrderAgeLabel(order) }}</span>
                            </div>
                            <div class="queue-order-row-footer">
                              <button
                                type="button"
                                class="btn btn-ghost btn-sm"
                                (click)="continueOrderInPos(order); $event.stopPropagation()">
                                {{ queueOrderActionCopy(order) }}
                              </button>
                            </div>
                          </button>
                        }
                      </div>

                      @if (group.orders.length > queuePreviewLimit) {
                        <div class="queue-group-footer">
                          <span class="muted-pill">{{ group.orders.length - queuePreviewLimit }} more at this table</span>
                        </div>
                      }
                    </article>
                  }
                </div>
              }
            }
          </section>
        }

        @if (tableWorkspaceOpen()) {
          @if (effectiveCheckoutTable(); as serviceTable) {
            <div class="pos-service-overlay" (click)="closeTableWorkspace()">
              <section
                class="pos-service-drawer"
                (click)="$event.stopPropagation()"
                aria-modal="true"
                role="dialog"
                aria-label="POS table service">
                <header class="pos-service-header">
                  <div>
                    <span class="pos-service-eyebrow">POS table service</span>
                    <h2>{{ serviceTable.name }}</h2>
                    <p>{{ selectedTableSummary(serviceTable) }}</p>
                    @if (serviceTable.seated_queue_entry; as seatedQueue) {
                      <p class="pos-service-queue-context">
                        <strong>{{ seatedQueue.queue_label }}</strong> · {{ seatedQueue.customer_name }} · {{ seatedQueue.party_size }} pax
                      </p>
                    }
                  </div>
                  <div class="pos-service-header-actions">
                    <span class="service-status" [class.service-status--live]="!!serviceTable.active_order_id">
                      {{ serviceTable.active_order_id ? 'Live order #' + serviceTable.active_order_id : getTableStateLabel(serviceTable) }}
                    </span>
                    <button type="button" class="pos-service-close" (click)="closeTableWorkspace()" aria-label="Close POS table service">x</button>
                  </div>
                </header>

                @if (error()) {
                  <div class="error-banner" role="alert">
                    {{ error() }}
                  </div>
                }

                <section class="pos-service-loop" aria-label="Selected table service loop">
                  <div class="pos-service-loop-copy">
                    <p class="eyebrow">Service loop</p>
                    <p><strong>{{ posNextStepCopy(serviceTable) }}</strong></p>
                    <p><small>{{ posLoopSupportCopy(serviceTable) }}</small></p>
                  </div>
                  <div class="pos-service-loop-metrics lane-inline-pills">
                    <span class="muted-pill">{{ posCurrentTicketsCopy() }}</span>
                    <span class="muted-pill">{{ posCartStateCopy() }}</span>
                    <span class="muted-pill muted-pill--accent">{{ checkoutSummaryTotalCopy() }}</span>
                  </div>
                  <div class="pos-service-loop-actions action-row action-row--checkout-compact">
                    <button type="button" class="btn btn-ghost btn-sm" (click)="closeTableWorkspace()">Back / switch table</button>
                    <button type="button" class="btn btn-secondary btn-sm" (click)="setPosDrawerView('orders')">
                      Current orders
                    </button>
                    @if (canClearTable(serviceTable)) {
                      <button type="button" class="btn btn-primary btn-sm" (click)="clearTable(serviceTable)" [disabled]="pendingTableId() === serviceTable.id">
                        {{ pendingTableId() === serviceTable.id ? 'Closing...' : 'Close table' }}
                      </button>
                    } @else if (canReleaseEmptyTable(serviceTable)) {
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        (click)="releaseEmptyTable(serviceTable)"
                        [disabled]="pendingTableId() === serviceTable.id">
                        {{ pendingTableId() === serviceTable.id ? 'Releasing...' : 'Release table' }}
                      </button>
                    } @else if (hasCheckoutWork()) {
                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        [attr.aria-label]="'Open payment panel for ' + serviceTable.name"
                        (click)="setPosDrawerView('checkout')">
                        Pay bill
                      </button>
                    } @else {
                      <button type="button" class="btn btn-primary btn-sm" (click)="setPosDrawerView('menu')">Add items</button>
                    }
                  </div>
                </section>

                <nav class="pos-service-tabs" aria-label="POS table views">
                  <button
                    type="button"
                    [class.active]="posDrawerView() === 'menu'"
                    (click)="setPosDrawerView('menu')"
                    [disabled]="paidTableNeedsClose(serviceTable)">
                    Add items
                  </button>
                  <button type="button" [class.active]="posDrawerView() === 'checkout'" (click)="setPosDrawerView('checkout')">
                    Bill / Pay <span>{{ checkoutSummaryTotalCopy() }}</span>
                  </button>
                  <button type="button" [class.active]="posDrawerView() === 'orders'" (click)="setPosDrawerView('orders')">
                    Orders <span>{{ posCurrentSessionOrders().length }}</span>
                  </button>
                  <button type="button" [class.active]="posDrawerView() === 'history'" (click)="setPosDrawerView('history')">
                    History <span>{{ posHistoryOrders().length }}</span>
                  </button>
                </nav>
                <p class="settlement-policy-note settlement-policy-note--drawer">
                  Launch guardrail: keep one active bill per table session. Split payments, table merges, refunds and paid-bill corrections need manager/accounting handling before the table is closed.
                </p>

                @if (posDrawerView() === 'menu' && paidTableNeedsClose(serviceTable)) {
                  <div class="pos-service-close-focus">
                    <p class="eyebrow">Paid bill</p>
                    <h3>{{ serviceTable.name }} is settled</h3>
                    <p>Close and reset this table before starting another round or handing the QR to new guests.</p>
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      (click)="clearTable(serviceTable)"
                      [disabled]="pendingTableId() === serviceTable.id">
                      {{ pendingTableId() === serviceTable.id ? 'Closing...' : 'Close table' }}
                    </button>
                  </div>
                } @else if (posDrawerView() === 'menu') {
                  <div class="pos-service-workspace">
                    <div class="pos-service-menu-pane">
                      <div class="pos-service-toolbar">
                        <label class="pos-service-search">
                          <span>Search menu</span>
                          <span style="display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.45rem; align-items: center;">
                            <input
                              id="pos-drawer-catalog-search"
                              type="search"
                              [ngModel]="productSearch()"
                              (ngModelChange)="productSearch.set($event || '')"
                              placeholder="Dish, drink, category" />
                            @if (productSearch()) {
                              <button
                                type="button"
                                aria-label="Clear menu search"
                                style="min-height: 2.85rem; padding: 0 0.75rem; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-surface); color: var(--color-muted); font: inherit; font-size: 0.78rem; font-weight: 900; cursor: pointer; white-space: nowrap;"
                                (click)="clearProductSearch()">
                                Clear
                              </button>
                            }
                          </span>
                        </label>
                        <div class="pos-service-categories" aria-label="Menu categories">
                          <button type="button" [class.active]="!selectedCategory()" (click)="selectedCategory.set('')">
                            All <span>{{ activeProducts().length }}</span>
                          </button>
                          @for (category of productCategories(); track category) {
                            <button type="button" [class.active]="selectedCategory() === category" (click)="selectedCategory.set(category)">
                              {{ category }} <span>{{ productCountForCategory(category) }}</span>
                            </button>
                          }
                        </div>
                      </div>

                      @if (loading() && sellableProducts().length === 0) {
                        <div class="pos-service-empty">Loading menu...</div>
                      } @else if (filteredProducts().length === 0) {
                        <div class="pos-service-empty">No menu items match this search.</div>
                      } @else {
                        <div class="pos-service-product-grid">
                          @for (product of filteredProducts(); track product.id) {
                            <button
                              type="button"
                              class="pos-service-product-card"
                              (click)="addProduct(product)"
                              [disabled]="!canAddSelectedProduct()">
                              <div class="pos-service-product-media" [class.pos-service-product-media--placeholder]="!productImageUrl(product)">
                                @if (productImageUrl(product); as imageUrl) {
                                  <img [src]="imageUrl" [alt]="product.name" (error)="markProductImageBroken(product)" />
                                } @else {
                                  <span>{{ productInitials(product.name) }}</span>
                                }
                              </div>
                              <div class="pos-service-product-copy">
                                <span>{{ product.category || product.catalogName || productSourceLabel(product) }}</span>
                                <strong>{{ product.name }}</strong>
                                <small>{{ product.description || product.ingredients || 'Tap to add' }}</small>
                                <b>{{ formatPrice(product.priceCents) }}</b>
                              </div>
                              <span class="pos-service-add-badge">{{ cartQuantityFor(product.id!) || '+' }}</span>
                            </button>
                          }
                        </div>
                      }
                    </div>

                    <aside class="pos-service-cart-pane">
                      <div class="pos-service-cart-title">
                        <div>
                          <span>{{ cartLines().length > 0 ? 'Current cart' : payableLiveBillOrder() ? 'Live bill' : 'Current cart' }}</span>
                          <h3>{{ cartLines().length > 0 ? cartItemCount() + ' items' : cartTitle() }}</h3>
                        </div>
                        @if (cartLines().length > 0) {
                          <button type="button" class="pos-service-text-button" (click)="clearCart()" [disabled]="processingCheckout()">Clear</button>
                        }
                      </div>

                      @if (cartLines().length === 0) {
                        @if (payableLiveBillOrder(); as liveBill) {
                          <div class="pos-service-live-bill">
                            <strong>Bill #{{ liveBill.id }}</strong>
                            <span>{{ liveBill.items.length }} items · {{ formatPrice(liveBill.total_cents || 0) }}</span>
                            <div class="pos-service-live-bill-actions">
                              <button
                                type="button"
                                class="btn btn-secondary btn-sm"
                                [attr.aria-label]="'Add another round to bill #' + liveBill.id + ' for ' + serviceTable.name"
                                (click)="setPosDrawerView('menu')">
                                Add another round
                              </button>
                              <button
                                type="button"
                                class="btn btn-primary btn-sm"
                                [attr.aria-label]="'Pay live bill #' + liveBill.id + ' for ' + serviceTable.name"
                                (click)="setPosDrawerView('checkout')">
                                Pay bill
                              </button>
                            </div>
                            <small class="pos-service-live-bill-hint">Tap menu items on the left, then send the add-on round to the same bill.</small>
                          </div>
                          <div class="pos-service-cart-lines pos-service-cart-lines--readonly">
                            @for (item of liveBill.items; track $index) {
                              <article class="pos-service-cart-line">
                                <div>
                                  <strong>{{ item.quantity }} x {{ item.product_name }}</strong>
                                  @if (item.customization_summary) {
                                    <small>{{ item.customization_summary }}</small>
                                  } @else if (item.notes) {
                                    <small>{{ item.notes }}</small>
                                  }
                                </div>
                                <span>{{ formatPrice((item.price_cents || 0) * (item.quantity || 0)) }}</span>
                              </article>
                            }
                          </div>
                        } @else {
                          <div class="pos-service-cart-empty">
                            <span>+</span>
                            <strong>Tap a dish to add it</strong>
                            <small>The cart stays inside this table drawer until checkout.</small>
                          </div>
                        }
                      } @else {
                        <div class="pos-service-cart-lines">
                          @for (line of cartLines(); track line.lineKey) {
                            <article class="pos-service-cart-line">
                              <div>
                                <strong>{{ line.name }}</strong>
                                @if (line.customizationSummary) {
                                  <small>{{ line.customizationSummary }}</small>
                                }
                                <label class="line-note-field">
                                  <span>Kitchen note</span>
                                  <input
                                    type="text"
                                    [ngModel]="line.notes || ''"
                                    (ngModelChange)="updateLineNotes(line.lineKey, $event)"
                                    placeholder="e.g. no chilli, allergy"
                                    maxlength="160"
                                    [disabled]="processingCheckout()"
                                  />
                                </label>
                                <span>{{ formatPrice(line.priceCents * line.quantity) }}</span>
                              </div>
                              <div class="pos-service-quantity">
                                <button type="button" (click)="decrementLine(line.lineKey)" [disabled]="processingCheckout()" aria-label="Remove one">-</button>
                                <b>{{ line.quantity }}</b>
                                <button type="button" (click)="incrementLine(line.lineKey)" [disabled]="processingCheckout()" aria-label="Add one">+</button>
                              </div>
                            </article>
                          }
                        </div>
                      }

                      <div class="pos-service-cart-footer">
                        <div><span>Items</span><strong>{{ checkoutSummaryItemsCopy() }}</strong></div>
                        <div><span>Total</span><strong>{{ checkoutSummaryTotalCopy() }}</strong></div>
                        <div class="pos-service-cart-actions">
                          @if (cartLines().length > 0) {
                            <button
                              type="button"
                              class="pos-service-submit pos-service-submit--secondary"
                              (click)="sendOrderToKitchen()"
                              [disabled]="!canSendOrderToKitchen()">
                              {{ processingCheckout() ? 'Sending...' : sendOrderButtonLabel() }}
                            </button>
                          }
                          <button
                            type="button"
                            class="pos-service-submit"
                            [attr.aria-label]="'Review bill and pay ' + checkoutSummaryTableCopy()"
                            (click)="setPosDrawerView('checkout')"
                            [disabled]="!hasCheckoutWork()">
                            Pay bill
                          </button>
                        </div>
                      </div>
                    </aside>
                  </div>
                } @else if (posDrawerView() === 'checkout') {
                  <div class="pos-service-checkout">
                    <div class="pos-service-checkout-main">
                      <div>
                        <span class="pos-service-eyebrow">Bill / Pay</span>
                        <h3>{{ hasCheckoutWork() ? 'Collect payment' : checkoutIntroTitle() }}</h3>
                        <p>{{ hasCheckoutWork() ? settlementSummaryCaption() : checkoutIntroCopy() }}</p>
                      </div>
                      <div class="pos-service-total-card">
                        <span>Amount due</span>
                        <strong>{{ checkoutSummaryTotalCopy() }}</strong>
                        <small>{{ checkoutSummaryItemsCopy() }} · {{ checkoutSummaryTableCopy() }}</small>
                      </div>
                    </div>

                    @if (lastCheckoutOutcome() && !hasCheckoutWork()) {
                      <div class="pos-service-outcome">
                        <strong>{{ checkoutOutcomeHeadline() }}</strong>
                        <small>{{ checkoutOutcomeSupport() }}</small>
                        @if (lastCheckoutTable(); as checkoutOutcomeTable) {
                          @if (isPendingClearTable(checkoutOutcomeTable)) {
                            <div class="inline-hint inline-hint--warning inline-hint--compact" role="alert">
                              <div class="inline-hint-copy">
                                <strong>Final confirmation</strong>
                                <small>Close {{ checkoutOutcomeTable.name }} and reset it for the next guest?</small>
                              </div>
                              <div class="action-row action-row--secondary">
                                <button type="button" class="btn btn-secondary btn-sm" (click)="cancelClearTable()" [disabled]="pendingTableId() === checkoutOutcomeTable.id">
                                  Keep open
                                </button>
                                <button type="button" class="btn btn-primary btn-sm" (click)="confirmClearTable()" [disabled]="pendingTableId() === checkoutOutcomeTable.id">
                                  {{ pendingTableId() === checkoutOutcomeTable.id ? 'Closing...' : 'Yes, close table' }}
                                </button>
                              </div>
                            </div>
                          }
                        }
                        <div class="pos-service-action-row">
                          @if (canClearLastCheckoutTable()) {
                            <button type="button" class="btn btn-primary btn-sm" style="min-height:2.45rem;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap" (click)="clearLastCheckoutTable()" [disabled]="pendingTableId() === lastCheckoutTableId()">
                              {{ pendingTableId() === lastCheckoutTableId() ? 'Closing...' : 'Close table' }}
                            </button>
                          }
                          <button type="button" class="btn btn-secondary btn-sm" (click)="dismissCheckoutOutcome()">Close</button>
                        </div>
                      </div>
                    } @else if (!hasCheckoutWork()) {
                      <div class="pos-service-empty pos-service-empty--checkout">
                        @if (canClearTable(serviceTable)) {
                          <strong>{{ serviceTable.name }} is ready to clear.</strong>
                          @if (isPendingClearTable(serviceTable)) {
                            <span>Final confirmation: close this table and reset it for the next guest?</span>
                            <div class="action-row action-row--checkout-compact">
                              <button type="button" class="btn btn-secondary btn-sm" (click)="cancelClearTable()" [disabled]="pendingTableId() === serviceTable.id">
                                Keep open
                              </button>
                              <button type="button" class="btn btn-primary btn-sm" (click)="confirmClearTable()" [disabled]="pendingTableId() === serviceTable.id">
                                {{ pendingTableId() === serviceTable.id ? 'Closing...' : 'Yes, close table' }}
                              </button>
                            </div>
                          } @else {
                            <button type="button" class="btn btn-primary btn-sm" (click)="clearTable(serviceTable)" [disabled]="pendingTableId() === serviceTable.id">
                              {{ pendingTableId() === serviceTable.id ? 'Closing...' : 'Close table' }}
                            </button>
                          }
                        } @else {
                          <strong>No payable bill yet.</strong>
                          <button type="button" class="btn btn-primary btn-sm" (click)="setPosDrawerView('menu')">Add items</button>
                        }
                      </div>
                    } @else {
                      @if (cartItemCount() > 0) {
                        <section class="inline-hint inline-hint--info inline-hint--compact" aria-label="Unsent cart guidance">
                          <div class="inline-hint-copy">
                            <strong>Send this round before payment</strong>
                            <small>Kitchen receives the ticket, the bill stays open, and you can add more items or collect payment later.</small>
                          </div>
                          <div class="action-row action-row--secondary">
                            <button
                              type="button"
                              class="btn btn-primary btn-sm"
                              (click)="sendOrderToKitchen()"
                              [disabled]="!canSendOrderToKitchen()">
                              {{ processingCheckout() ? 'Sending...' : 'Send order to kitchen' }}
                            </button>
                          </div>
                        </section>
                      }
                      @if (hitPayFlowState() !== 'idle') {
                        <div class="payment-state-strip" [class.payment-state-strip--error]="hitPayFlowState() === 'failed'">
                          <span class="muted-pill muted-pill--accent">{{ hitPayStateLabel() }}</span>
                          <small>{{ hitPayStateCopy() }}</small>
                          @if (paymentRecoveryVisible()) {
                            <div class="action-row action-row--secondary">
                              <button
                                type="button"
                                class="btn btn-primary btn-sm"
                                (click)="retryHitPayPayment()"
                                [disabled]="!canRetryHitPayPayment()">
                                Retry HitPay
                              </button>
                              <button
                                type="button"
                                class="btn btn-secondary btn-sm"
                                (click)="switchPaymentRecoveryToTerminal()"
                                [disabled]="processingCheckout()">
                                Use terminal instead
                              </button>
                              <button
                                type="button"
                                class="btn btn-ghost btn-sm"
                                (click)="backToCartFromPaymentRecovery()"
                                [disabled]="processingCheckout()">
                                Back to cart
                              </button>
                            </div>
                          }
                        </div>
                      }
                      <div class="pos-service-payment-grid">
                        <button
                          type="button"
                          class="mode-card"
                          [class.mode-card--selected]="primaryCheckoutMode() === 'cash'"
                          (click)="selectSettlementMode('cash')"
                          [disabled]="processingCheckout()">
                          <span class="micro-label">Counter cash</span>
                          <strong>Counter cash — staff only</strong>
                          <small>Internal counter settlement</small>
                        </button>
                        <button
                          type="button"
                          class="mode-card"
                          [class.mode-card--selected]="primaryCheckoutMode() === 'card_terminal'"
                          (click)="selectSettlementMode('card_terminal')"
                          [disabled]="processingCheckout()">
                          <span class="micro-label">Terminal</span>
                          <strong>Use terminal</strong>
                          <small>Machine confirmed</small>
                        </button>
                        @if (hitPayConfigured()) {
                          <button
                            type="button"
                            class="mode-card"
                            [class.mode-card--selected]="primaryCheckoutMode() === 'hitpay'"
                            (click)="selectSettlementMode('hitpay')"
                            [disabled]="processingCheckout()">
                            <span class="micro-label">HitPay</span>
                            <strong>Send link</strong>
                            <small>Hosted checkout</small>
                          </button>
                        }
                      </div>
                      <p class="settlement-policy-note settlement-policy-note--drawer">
                        Customer QR checkout shows HitPay or card-at-table only. Cash is staff-only for counter settlement and manager reconciliation.
                      </p>
                      <p class="settlement-policy-note settlement-policy-note--drawer settlement-policy-note--warning">
                        Launch guardrail: keep one active bill per table. For split payments, table merges or paid-bill corrections, collect the manager decision before closing the table.
                      </p>
                      <div class="pos-service-paybar">
                        <div>
                          <span>Selected method</span>
                          <strong>{{ primarySettlementModeLabel() }}</strong>
                          <small>{{ settlementActionSupportCopy() }}</small>
                        </div>
                        <button
                          type="button"
                          id="pos-drawer-settlement-submit"
                          class="btn btn-primary btn-lg"
                          (click)="submitCart(primaryCheckoutMode())"
                          [disabled]="!canSubmitCart()">
                          {{ processingCheckout() ? 'Working...' : checkoutPrimaryActionText() }}
                        </button>
                      </div>
                    }
                  </div>
                } @else if (posDrawerView() === 'orders') {
                  <div class="pos-service-orders">
                    <div class="pos-service-orders-heading">
                      <div>
                        <span class="pos-service-eyebrow">Current session</span>
                        <h3>{{ serviceTable.name }} orders</h3>
                      </div>
                      <button type="button" class="btn btn-secondary btn-sm" (click)="openOrdersForTable(serviceTable)">Full orders page</button>
                    </div>
                    @if (posCurrentSessionOrders().length === 0) {
                      <div class="pos-service-empty">No current-session orders yet. Add items from the menu.</div>
                    } @else {
                      <div class="pos-service-order-list">
                        @for (order of posCurrentSessionOrders(); track order.id) {
                          <button type="button" class="pos-service-order-card" (click)="continueOrderInPos(order)">
                            <div class="pos-service-order-head">
                              <div><small>{{ queueOrderAgeLabel(order) }}</small><strong>Order #{{ order.id }}</strong></div>
                              <span class="state-pill" [class]="orderStatusClass(order)">{{ queueGroupStatusLabel(order) }}</span>
                            </div>
                            <div class="pos-service-order-items">
                              @for (item of order.items; track item.id) {
                                <span><b>{{ item.quantity }}x</b> {{ item.product_name }}</span>
                              }
                            </div>
                            <div class="pos-service-order-total"><span>{{ paymentLabel(order) }}</span><strong>{{ formatPrice(order.total_cents || 0) }}</strong></div>
                          </button>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <div class="pos-service-orders">
                    <div class="pos-service-orders-heading">
                      <div>
                        <span class="pos-service-eyebrow">Previous sessions</span>
                        <h3>{{ serviceTable.name }} history</h3>
                      </div>
                      <button type="button" class="btn btn-secondary btn-sm" (click)="openOrdersForTable(serviceTable)">Full history page</button>
                    </div>
                    @if (posHistoryOrders().length === 0) {
                      <div class="pos-service-empty">No previous sessions for this table yet.</div>
                    } @else {
                      @if (posHistoryNeedsLaunchReview()) {
                        <div class="pos-service-empty pos-service-empty--checkout" role="note">
                          <strong>Launch data review</strong>
                          <span>Older staging/demo bills are separated from current orders. Review or archive them before go-live if this table should start clean.</span>
                        </div>
                      }
                      <div class="pos-service-order-list">
                        @for (order of posHistoryOrders(); track order.id) {
                          <button type="button" class="pos-service-order-card" (click)="continueOrderInPos(order)">
                            <div class="pos-service-order-head">
                              <div><small>{{ queueOrderAgeLabel(order) }}</small><strong>Order #{{ order.id }}</strong></div>
                              <span class="state-pill" [class]="orderStatusClass(order)">{{ queueGroupStatusLabel(order) }}</span>
                            </div>
                            <div class="pos-service-order-items">
                              @for (item of order.items; track item.id) {
                                <span><b>{{ item.quantity }}x</b> {{ item.product_name }}</span>
                              }
                            </div>
                            <div class="pos-service-order-total"><span>{{ paymentLabel(order) }}</span><strong>{{ formatPrice(order.total_cents || 0) }}</strong></div>
                          </button>
                        }
                      </div>
                    }
                  </div>
                }
              </section>
            </div>
          }
        }

        @if (pendingClearTable(); as tableToClear) {
          <div class="modal-backdrop" (click)="cancelClearTable()"></div>
          <section
            class="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-clear-table-title"
          >
            <p class="pos-service-eyebrow">Final confirmation</p>
            <h2 id="pos-clear-table-title">{{ canClearTable(tableToClear) ? 'Close' : 'Release' }} {{ tableToClear.name }}?</h2>
            @if (canClearTable(tableToClear)) {
              <p>
                This resets the table for the next guest, ends the current QR ordering session,
                and moves this table's current bill into History.
              </p>
            } @else {
              <p>
                This releases the empty table, ends the current QR ordering session, and returns it to Available.
                Use this when a queue or reservation guest was seated by mistake before any bill was sent.
              </p>
            }
            @if (tableToClear.seated_reservation) {
              <div class="inline-hint inline-hint--warning">
                Linked reservation #{{ tableToClear.seated_reservation.reservation_id }}
                ({{ tableToClear.seated_reservation.customer_name }}) will be finished automatically.
              </div>
            }
            <div class="inline-hint inline-hint--info">
              <span>
                {{ canClearTable(tableToClear) ? 'After close' : 'After release' }},
                <strong>{{ tableToClear.name }}</strong> becomes available.
              </span>
            </div>
            <div class="action-row action-row--checkout-compact">
              <button type="button" class="btn btn-secondary" (click)="cancelClearTable()" [disabled]="pendingTableId() === tableToClear.id">
                Keep table open
              </button>
              <button type="button" class="btn btn-primary" (click)="confirmClearTable()" [disabled]="pendingTableId() === tableToClear.id">
                {{ pendingTableId() === tableToClear.id ? 'Working...' : (canClearTable(tableToClear) ? 'Yes, close table' : 'Yes, release table') }}
              </button>
            </div>
          </section>
        }
      </div>

      @if (productQuestionDialogProduct(); as product) {
        <div class="modal-backdrop" (click)="closeProductQuestionDialog()"></div>
        <section class="modal-card modal-card--product-question" role="dialog" aria-modal="true" aria-label="Product options">
          <div class="product-dialog-hero">
            <div class="product-dialog-copy">
              <p class="eyebrow">Customize item</p>
              <div class="product-dialog-heading-row">
                <div class="product-dialog-title-block">
                  <h3>{{ product.name }}</h3>
                  <p class="product-dialog-subcopy">
                    {{ product.description || product.ingredients || 'Choose the options, then send it straight into the bill.' }}
                  </p>
                </div>
                <div class="product-dialog-price-chip">
                  <span class="micro-label">Base price</span>
                  <strong>{{ formatPrice(product.priceCents) }}</strong>
                </div>
              </div>
              <div class="product-dialog-meta">
                <span class="muted-pill">{{ product.category || productSourceLabel(product) }}</span>
                @if (requiredQuestionCount(product) > 0) {
                  <span class="muted-pill">{{ unansweredRequiredQuestionCount(product) === 0 ? 'All required set' : unansweredRequiredQuestionCount(product) + ' required left' }}</span>
                } @else {
                  <span class="muted-pill">Quick add</span>
                }
              </div>
            </div>
            <div class="product-dialog-aside">
              @if (productImageUrl(product); as imageUrl) {
                <div class="product-dialog-media">
                  <img [src]="imageUrl" [alt]="product.name" />
                </div>
              }
              <button type="button" class="btn btn-ghost btn-sm product-dialog-close" (click)="closeProductQuestionDialog()">Close</button>
            </div>
          </div>

          <div class="product-question-list">
            @for (question of product.questions || []; track question.id) {
              <div class="product-question-card">
                <div class="product-question-head">
                  <label class="product-question-label">
                    {{ question.label }}
                    @if (question.required) {
                      <span>*</span>
                    }
                  </label>
                  <div class="product-question-state">
                    <span class="muted-pill muted-pill--soft">{{ question.required ? 'Required' : 'Optional' }}</span>
                    @if (isQuestionAnswered(question)) {
                      <span class="muted-pill muted-pill--accent">Set</span>
                    }
                  </div>
                </div>

                @if (question.type === 'choice') {
                  @if (isQuestionMultiChoice(question)) {
                    <div class="product-question-multi">
                      @for (option of questionChoiceOptions(question); track option) {
                        <label class="product-question-check">
                          <input
                            type="checkbox"
                            [checked]="isQuestionOptionChecked(question, option)"
                            (change)="toggleProductQuestionOption(question, option, $any($event.target).checked)" />
                          <span>{{ option }}</span>
                        </label>
                      }
                    </div>
                  } @else {
                    <div class="product-question-choice-grid">
                      @if (!question.required) {
                        <button
                          type="button"
                          class="product-question-choice product-question-choice--quiet"
                          [class.product-question-choice--selected]="questionAnswerValue(question) === ''"
                          (click)="setProductQuestionAnswer(question, '')">
                          <span class="product-question-choice-title">No preference</span>
                          <span class="product-question-choice-copy">Leave this choice blank</span>
                        </button>
                      }
                      @for (option of questionChoiceOptions(question); track option) {
                        <button
                          type="button"
                          class="product-question-choice"
                          [class.product-question-choice--selected]="questionAnswerValue(question) === option"
                          (click)="setProductQuestionAnswer(question, option)">
                          <span class="product-question-choice-title">{{ option }}</span>
                          <span class="product-question-choice-copy">
                            {{ question.required ? 'Required for checkout' : 'Tap to use' }}
                          </span>
                        </button>
                      }
                    </div>
                  }
                } @else if (question.type === 'scale') {
                  <div class="product-question-scale">
                    <input
                      class="question-range"
                      type="range"
                      [min]="questionScaleMin(question)"
                      [max]="questionScaleMax(question)"
                      [value]="questionAnswerValue(question) || questionScaleMin(question)"
                      (input)="setProductQuestionAnswer(question, parseNumericQuestionValue($any($event.target).value, questionScaleMin(question)))" />
                    <span>{{ questionAnswerValue(question) || questionScaleMin(question) }}</span>
                  </div>
                } @else {
                  <textarea
                    class="form-input"
                    rows="3"
                    [value]="questionAnswerValue(question)"
                    [placeholder]="question.label"
                    (input)="setProductQuestionAnswer(question, $any($event.target).value)"></textarea>
                }
              </div>
            }
          </div>

          <div class="modal-actions">
            <div class="modal-actions-copy">
              <span class="micro-label">{{ canSubmitProductQuestionDialog() ? 'Ready to add' : 'Finish required options' }}</span>
              <strong>{{ productDialogFooterHeadline(product) }}</strong>
              <small>{{ productDialogFooterSummary(product) }}</small>
            </div>
            <div class="modal-actions-buttons">
              <button type="button" class="btn btn-secondary" (click)="closeProductQuestionDialog()">Cancel</button>
              <button type="button" class="btn btn-primary" (click)="confirmProductQuestionDialog()" [disabled]="!canSubmitProductQuestionDialog()">
                {{ confirmProductButtonLabel() }}
              </button>
            </div>
          </div>
        </section>
      }
    </app-sidebar>
  `,
  styles: [`
    :host {
      display: block;
    }

    .page-shell {
      display: flex;
      flex-direction: column;
      gap: 0.72rem;
    }

    .page-header--staff-flow {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }

    .header-copy {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-4);
      flex-wrap: wrap;
    }

    .header-copy h1,
    .lane-header h2,
    .lane-header h3 {
      margin: 0;
    }

    .header-copy h1 {
      font-size: clamp(1.45rem, 2vw, 1.9rem);
    }

    .subcopy {
      margin: var(--space-2) 0 0;
      color: var(--color-text-muted);
      max-width: 54rem;
    }

    .eyebrow {
      margin: 0 0 var(--space-1);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-primary);
    }

    .error-banner,
    .notice-banner {
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4);
      border: 1px solid transparent;
    }

    .notice-banner {
      background: rgba(59, 130, 246, 0.08);
      border-color: rgba(59, 130, 246, 0.18);
      color: #1d4ed8;
    }

    .cashier-status-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.55rem;
    }

    .status-chip,
    .lane,
    .context-card,
    .cart-card,
    .totals-card,
    .order-detail-card,
    .queue-panel,
    .empty-card {
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-sm);
    }

    .status-chip {
      min-height: 2.8rem;
      padding: 0.55rem 0.75rem;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.6rem;
    }

    .status-chip--loading {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-surface) 92%, white),
        color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))
      );
    }

    .status-chip strong {
      font-size: 1rem;
      line-height: 1;
    }

    .status-chip small,
    .summary-label,
    .micro-label,
    .table-meta,
    .order-meta,
    .muted-pill,
    .inline-hint,
    .product-notes,
    .table-card-bottom,
    .line-copy span,
    .empty-card p,
    .subcopy {
      color: var(--color-text-muted);
    }

    .summary-label,
    .micro-label {
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    .cashier-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 0.7rem;
      align-items: start;
      min-height: calc(100vh - 11.5rem);
    }

    .lane,
    .queue-panel {
      padding: 0.82rem;
      display: flex;
      flex-direction: column;
      gap: 0.74rem;
    }

    .lane--tables {
      gap: 0.56rem;
      min-width: 0;
      overflow: visible;
      padding-inline: 0.84rem;
    }

    .lane--catalog {
      min-width: 0;
      display: none;
    }

    .lane--checkout {
      display: none;
      overflow: auto;
      padding-bottom: 1.1rem;
      gap: 0.72rem;
    }

    .pos-service-overlay {
      position: fixed;
      inset: 0;
      z-index: 120;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      background: rgba(15, 23, 42, 0.38);
      backdrop-filter: blur(4px);
    }

    .pos-service-drawer {
      width: min(76rem, calc(100vw - 1rem));
      height: min(54rem, calc(100dvh - 1rem));
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--color-border) 78%, white);
      border-radius: 28px;
      background: var(--color-surface);
      box-shadow: 0 28px 70px rgba(15, 23, 42, 0.24);
    }

    .pos-service-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.1rem 0.85rem;
      border-bottom: 1px solid color-mix(in srgb, var(--color-border) 72%, white);
      background:
        radial-gradient(circle at top left, color-mix(in srgb, var(--color-primary-light) 36%, transparent), transparent 32%),
        linear-gradient(135deg, color-mix(in srgb, var(--color-surface) 96%, white), color-mix(in srgb, var(--color-bg) 86%, white));
    }

    .pos-service-eyebrow {
      display: inline-flex;
      margin-bottom: 0.2rem;
      color: var(--color-primary-strong);
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .pos-service-header h2,
    .pos-service-checkout h3,
    .pos-service-orders h3 {
      margin: 0;
      color: var(--color-text);
    }

    .pos-service-header p,
    .pos-service-checkout p {
      margin: 0.18rem 0 0;
      color: var(--color-muted);
      font-size: 0.9rem;
    }

    .pos-service-header-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.55rem;
      flex-wrap: wrap;
    }

    .service-status {
      display: inline-flex;
      align-items: center;
      min-height: 2rem;
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-bg) 82%, white);
      color: var(--color-muted);
      font-size: 0.78rem;
      font-weight: 850;
      white-space: nowrap;
    }

    .service-status--live {
      background: color-mix(in srgb, var(--color-primary-light) 34%, white);
      color: var(--color-primary-strong);
    }

    .pos-service-loop {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(14rem, 0.75fr) auto;
      gap: 0.75rem;
      align-items: center;
      padding: 0.6rem 0.8rem;
      border-bottom: 1px solid color-mix(in srgb, var(--color-border) 76%, white);
    }

    .pos-service-close {
      width: 2.25rem;
      height: 2.25rem;
      border: 1px solid color-mix(in srgb, var(--color-border) 76%, white);
      border-radius: 999px;
      background: white;
      color: var(--color-muted);
      font-size: 1rem;
      font-weight: 900;
      cursor: pointer;
    }

    .pos-service-tabs {
      display: flex;
      gap: 0.45rem;
      padding: 0.58rem 0.8rem;
      overflow-x: auto;
      border-bottom: 1px solid color-mix(in srgb, var(--color-border) 76%, white);
      background: color-mix(in srgb, var(--color-bg) 72%, white);
    }

    .pos-service-tabs button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      min-height: 2.55rem;
      padding: 0.55rem 0.85rem;
      border: 1px solid color-mix(in srgb, var(--color-border) 76%, white);
      border-radius: 999px;
      background: white;
      color: var(--color-muted);
      font-weight: 850;
      white-space: nowrap;
      cursor: pointer;
    }

    .pos-service-tabs button.active {
      border-color: color-mix(in srgb, var(--color-primary) 36%, var(--color-border));
      background: var(--color-primary);
      color: white;
      box-shadow: 0 12px 24px color-mix(in srgb, var(--color-primary) 24%, transparent);
    }

    .pos-service-tabs button:not(.active):has(span) {
      background: color-mix(in srgb, var(--color-surface) 94%, white);
    }

    .pos-service-tabs button:not(.active):last-child {
      color: color-mix(in srgb, var(--color-muted) 82%, white);
      border-style: dashed;
      background: color-mix(in srgb, var(--color-bg) 86%, white);
    }

    .pos-service-tabs span {
      padding: 0.12rem 0.42rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.22);
      font-size: 0.75rem;
    }

    .pos-service-workspace {
      min-height: 0;
      flex: 1;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(17rem, 21rem);
      overflow: hidden;
    }

    .pos-service-menu-pane,
    .pos-service-checkout,
    .pos-service-orders {
      min-width: 0;
      min-height: 0;
      overflow: auto;
      background: color-mix(in srgb, var(--color-bg) 76%, white);
    }

    .pos-service-menu-pane {
      padding: 0.72rem;
    }

    .pos-service-toolbar {
      display: grid;
      gap: 0.65rem;
      padding-bottom: 0.75rem;
      background: color-mix(in srgb, var(--color-bg) 76%, white);
    }

    .pos-service-search {
      display: grid;
      gap: 0.28rem;
      color: var(--color-muted);
      font-size: 0.78rem;
      font-weight: 850;
    }

    .pos-service-search input {
      width: 100%;
      min-height: 2.85rem;
      padding: 0 0.9rem;
      border: 1px solid color-mix(in srgb, var(--color-border) 82%, white);
      border-radius: 16px;
      background: white;
      color: var(--color-text);
      font: inherit;
      font-weight: 750;
      outline: none;
    }

    .pos-service-categories {
      display: flex;
      gap: 0.45rem;
      overflow-x: auto;
      padding-bottom: 0.1rem;
    }

    .pos-service-categories button {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      min-height: 2.3rem;
      padding: 0.45rem 0.68rem;
      border: 1px solid color-mix(in srgb, var(--color-border) 78%, white);
      border-radius: 999px;
      background: white;
      color: var(--color-muted);
      font-size: 0.82rem;
      font-weight: 850;
      white-space: nowrap;
      cursor: pointer;
    }

    .pos-service-categories button.active {
      border-color: color-mix(in srgb, var(--color-primary) 34%, var(--color-border));
      background: color-mix(in srgb, var(--color-primary-light) 32%, white);
      color: var(--color-primary-strong);
    }

    .pos-service-categories span {
      color: inherit;
      opacity: 0.72;
    }

    .pos-service-product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(11.25rem, 1fr));
      gap: 0.68rem;
    }

    .pos-service-product-card {
      position: relative;
      min-width: 0;
      min-height: 7.05rem;
      display: grid;
      grid-template-columns: 4.1rem minmax(0, 1fr);
      gap: 0.68rem;
      align-items: stretch;
      padding: 0.62rem;
      border: 1px solid color-mix(in srgb, var(--color-border) 78%, white);
      border-radius: 18px;
      background: white;
      color: inherit;
      text-align: left;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
    }

    .pos-service-product-card:hover:not(:disabled) {
      border-color: color-mix(in srgb, var(--color-primary) 34%, var(--color-border));
      box-shadow: 0 12px 26px rgba(15, 23, 42, 0.1);
      transform: translateY(-1px);
    }

    .pos-service-product-card:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pos-service-product-media {
      width: 4.1rem;
      min-height: 100%;
      overflow: hidden;
      border-radius: 14px;
      background: color-mix(in srgb, var(--color-primary-light) 32%, white);
      display: grid;
      place-items: center;
      color: var(--color-primary-strong);
      font-weight: 900;
    }

    .pos-service-product-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .pos-service-product-copy {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.16rem;
      padding-right: 1.75rem;
    }

    .pos-service-product-copy span,
    .pos-service-product-copy small {
      overflow: hidden;
      color: var(--color-muted);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pos-service-product-copy span {
      width: fit-content;
      max-width: 100%;
      padding: 0.14rem 0.42rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-primary-light) 18%, white);
      color: var(--color-primary-strong);
      font-size: 0.62rem;
      font-weight: 900;
      letter-spacing: 0.025em;
      text-transform: uppercase;
    }

    .pos-service-product-copy small {
      font-size: 0.68rem;
      font-weight: 720;
    }

    .pos-service-product-copy strong {
      overflow: hidden;
      color: var(--color-text);
      font-size: 0.94rem;
      font-weight: 900;
      line-height: 1.14;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .pos-service-product-copy b {
      margin-top: auto;
      color: var(--color-primary-strong);
      font-size: 1rem;
      font-weight: 950;
      line-height: 1.1;
    }

    .pos-service-add-badge {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      min-width: 1.55rem;
      height: 1.55rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: var(--color-primary);
      color: white;
      font-size: 0.82rem;
      font-weight: 900;
    }

    .pos-service-cart-pane {
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      border-left: 1px solid color-mix(in srgb, var(--color-border) 76%, white);
      background: white;
    }

    .pos-service-cart-title,
    .pos-service-cart-footer {
      padding: 0.9rem 1rem;
    }

    .pos-service-cart-title {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      border-bottom: 1px solid color-mix(in srgb, var(--color-border) 78%, white);
    }

    .pos-service-cart-title span,
    .pos-service-cart-footer span,
    .pos-service-paybar span {
      color: var(--color-muted);
      font-size: 0.78rem;
      font-weight: 850;
    }

    .pos-service-cart-title h3 {
      margin: 0.1rem 0 0;
      color: var(--color-text);
    }

    .pos-service-text-button {
      border: 0;
      background: transparent;
      color: var(--color-primary-strong);
      font-weight: 850;
      cursor: pointer;
    }

    .pos-service-cart-empty,
    .pos-service-empty,
    .pos-service-live-bill,
    .pos-service-outcome {
      margin: 1rem;
      padding: 1rem;
      border: 1px dashed color-mix(in srgb, var(--color-border) 82%, white);
      border-radius: 20px;
      background: color-mix(in srgb, var(--color-bg) 78%, white);
      color: var(--color-muted);
      display: grid;
      gap: 0.42rem;
    }

    .pos-service-cart-empty {
      flex: 1;
      place-items: center;
      align-content: center;
      text-align: center;
    }

    .pos-service-cart-empty span {
      width: 3rem;
      height: 3rem;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-primary-light) 34%, white);
      color: var(--color-primary-strong);
      font-size: 1.45rem;
      font-weight: 900;
    }

    .pos-service-cart-lines {
      min-height: 0;
      flex: 1;
      overflow: auto;
      padding: 0.75rem 1rem;
      display: grid;
      align-content: start;
      gap: 0.55rem;
    }

    .pos-service-cart-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding: 0.72rem;
      border: 1px solid color-mix(in srgb, var(--color-border) 80%, white);
      border-radius: 16px;
      background: color-mix(in srgb, var(--color-bg) 58%, white);
    }

    .pos-service-cart-line div {
      min-width: 0;
      display: grid;
      gap: 0.12rem;
    }

    .pos-service-cart-line strong {
      color: var(--color-text);
      font-size: 0.9rem;
    }

    .pos-service-cart-line small,
    .pos-service-cart-line span {
      color: var(--color-muted);
      font-size: 0.78rem;
      font-weight: 760;
    }

    .pos-service-quantity {
      display: inline-flex;
      align-items: center;
      gap: 0.42rem;
      flex-shrink: 0;
    }

    .pos-service-quantity button {
      width: 2rem;
      height: 2rem;
      border: 1px solid color-mix(in srgb, var(--color-border) 72%, white);
      border-radius: 999px;
      background: white;
      color: var(--color-primary-strong);
      font-weight: 900;
      cursor: pointer;
    }

    .pos-service-cart-footer {
      display: grid;
      gap: 0.55rem;
      border-top: 1px solid color-mix(in srgb, var(--color-border) 78%, white);
      background: white;
    }

    .pos-service-cart-footer > div {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .pos-service-cart-footer .pos-service-cart-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.55rem;
    }

    .pos-service-cart-footer .pos-service-cart-actions .pos-service-submit:only-child {
      grid-column: 1 / -1;
    }

    .pos-service-submit {
      width: 100%;
      min-height: 3.1rem;
      border: 0;
      border-radius: 16px;
      background: var(--color-primary);
      color: white;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 22%, transparent);
    }

    .pos-service-submit--secondary {
      background: #0f766e;
      box-shadow: 0 12px 28px rgba(15, 118, 110, 0.18);
    }

    .pos-service-submit:disabled {
      opacity: 0.48;
      cursor: not-allowed;
    }

    .pos-service-checkout,
    .pos-service-orders {
      flex: 1;
      padding: 1rem;
      display: grid;
      align-content: start;
      gap: 0.82rem;
    }

    .pos-service-checkout-main,
    .pos-service-paybar,
    .pos-service-orders-heading,
    .pos-service-order-card {
      border: 1px solid color-mix(in srgb, var(--color-border) 78%, white);
      border-radius: 20px;
      background: white;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
    }

    .pos-service-checkout-main,
    .pos-service-paybar,
    .pos-service-orders-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
    }

    .pos-service-total-card {
      min-width: 14rem;
      padding: 0.85rem;
      border-radius: 18px;
      background: color-mix(in srgb, var(--color-primary-light) 26%, white);
      color: var(--color-primary-strong);
      text-align: right;
    }

    .pos-service-total-card span,
    .pos-service-total-card small {
      display: block;
      color: inherit;
      opacity: 0.78;
      font-weight: 850;
    }

    .pos-service-total-card strong {
      display: block;
      margin: 0.12rem 0;
      font-size: 1.9rem;
      line-height: 1;
    }

    .pos-service-payment-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.72rem;
    }

    .pos-service-paybar {
      position: sticky;
      bottom: 0;
      z-index: 1;
      box-shadow: 0 -10px 24px rgba(15, 23, 42, 0.08);
    }

    .pos-service-paybar strong {
      display: block;
      color: var(--color-text);
      font-size: 1.05rem;
    }

    .pos-service-paybar small {
      color: var(--color-muted);
      font-weight: 760;
    }

    .pos-service-action-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
    }

    .pos-service-empty--checkout {
      margin: 0;
      border-style: solid;
    }

    .pos-service-order-list {
      display: grid;
      gap: 0.65rem;
    }

    .pos-service-order-card {
      display: grid;
      gap: 0.7rem;
      width: 100%;
      padding: 0.9rem;
      color: inherit;
      text-align: left;
      cursor: pointer;
    }

    .pos-service-order-head,
    .pos-service-order-total {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .pos-service-order-head div,
    .pos-service-order-total {
      min-width: 0;
    }

    .pos-service-order-head small,
    .pos-service-order-total span {
      display: block;
      color: var(--color-muted);
      font-size: 0.78rem;
      font-weight: 780;
    }

    .pos-service-order-items {
      display: flex;
      flex-wrap: wrap;
      gap: 0.38rem;
    }

    .pos-service-order-items span {
      padding: 0.32rem 0.52rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-bg) 72%, white);
      color: var(--color-muted);
      font-size: 0.78rem;
      font-weight: 800;
    }

    .lane-header,
    .lane-header--tight {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-3);
    }

    .lane-header--checkout {
      align-items: center;
    }

    .lane-inline-pills {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-2);
    }

    .lane-header-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .checkout-header-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    .workspace-header-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .checkout-close-btn {
      flex-shrink: 0;
    }

    .checkout-hero {
      border: 1px solid color-mix(in srgb, var(--color-border) 76%, white);
      border-radius: var(--radius-xl);
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-surface) 96%, white),
        color-mix(in srgb, var(--color-bg) 88%, white)
      );
      padding: 0.68rem 0.78rem;
      display: grid;
      gap: 0.42rem;
      box-shadow: var(--shadow-sm);
    }

    .lane--checkout .context-card,
    .lane--checkout .queue-panel,
    .lane--checkout .empty-card {
      overflow: hidden;
    }

    .lane--checkout .line-list {
      gap: 0.3rem;
    }

    .lane--checkout .line-row {
      padding: 0.72rem 0;
    }

    .checkout-hero-main {
      display: grid;
      gap: 0.45rem;
      min-width: 0;
    }

    .checkout-hero-copy {
      display: grid;
      gap: 0.16rem;
      min-width: 0;
    }

    .checkout-hero-copy strong {
      font-size: 0.95rem;
      line-height: 1.15;
    }

    .checkout-hero-copy small {
      color: var(--color-text-muted);
      line-height: 1.22;
      font-size: 0.82rem;
    }

    .checkout-hero-reservation {
      color: var(--color-primary);
      font-weight: 600;
    }

    .checkout-hero-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      align-items: center;
    }

    .ticket-heading {
      line-height: 1.1;
      overflow-wrap: anywhere;
    }

    .checkout-entry-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-3);
      border: 1px solid color-mix(in srgb, var(--color-primary) 18%, var(--color-border));
      border-radius: var(--radius-lg);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-primary-light) 16%, white),
        color-mix(in srgb, var(--color-bg) 72%, white)
      );
      box-shadow: var(--shadow-sm);
    }

    .checkout-entry-bar > div {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.18rem;
    }

    .checkout-entry-bar strong {
      font-size: 1rem;
      line-height: 1.2;
    }

    .checkout-entry-bar small {
      color: var(--color-text-muted);
    }

    .quick-table-pick-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }

    .quick-table-pill-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
    }

    .quick-table-pill {
      min-height: 2.3rem;
      padding: 0 0.9rem;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: color-mix(in srgb, var(--color-surface) 92%, white);
      color: var(--color-text);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
    }

    .quick-table-pill:hover {
      border-color: color-mix(in srgb, var(--color-primary) 28%, var(--color-border));
      box-shadow: var(--shadow-sm);
      transform: translateY(-1px);
    }

    .muted-pill,
    .state-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2rem;
      padding: 0 var(--space-3);
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 700;
      background: var(--color-bg);
      white-space: nowrap;
    }

    .muted-pill--soft {
      background: color-mix(in srgb, var(--color-bg) 74%, white);
      color: var(--color-text-muted);
    }

    .muted-pill--accent {
      background: color-mix(in srgb, var(--color-primary-light) 22%, white);
      color: var(--color-primary-strong);
    }

    .state-pill {
      color: var(--color-text);
    }

    .state--available {
      background: rgba(16, 185, 129, 0.12);
      color: #047857;
    }

    .state--occupied,
    .state--open {
      background: rgba(245, 158, 11, 0.16);
      color: #b45309;
    }

    .state--ready,
    .state--paid {
      background: rgba(59, 130, 246, 0.14);
      color: #1d4ed8;
    }

    .state--reserved {
      background: rgba(139, 92, 246, 0.14);
      color: #6d28d9;
    }

    .state--closed,
    .state--draft {
      background: rgba(107, 114, 128, 0.15);
      color: #4b5563;
    }

    .table-stack,
    .line-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .table-stack {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(13.6rem, 1fr));
      overflow: visible;
      padding-right: 0.16rem;
      align-content: start;
      gap: 0.54rem;
    }

    .table-card,
    .order-card,
    .product-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }

    .table-card {
      overflow: hidden;
      border-radius: calc(var(--radius-lg) + 0.15rem);
      min-width: 0;
      display: flex;
      flex-direction: column;
      min-height: 0;
      border-left-width: 5px;
    }

    .table-card[data-table-state='available'] {
      border-left-color: var(--color-success);
      background: linear-gradient(180deg, white, color-mix(in srgb, var(--color-success-light) 18%, white));
    }

    .table-card[data-table-state='occupied'],
    .table-card[data-table-state='reserved'] {
      border-left-color: var(--color-warning);
      background: linear-gradient(180deg, white, color-mix(in srgb, var(--color-warning) 8%, white));
    }

    .table-card[data-table-state='open_order'] {
      border-left-color: var(--color-primary);
      background: linear-gradient(180deg, white, color-mix(in srgb, var(--color-primary-light) 18%, white));
    }

    .table-card[data-table-state='awaiting_clear'],
    .table-card[data-table-state='ready_to_serve'] {
      border-left-color: var(--color-success);
      background: linear-gradient(180deg, white, color-mix(in srgb, var(--color-success-light) 24%, white));
    }

    .table-card[data-table-state='closed'] {
      border-left-color: var(--color-text-muted);
      opacity: 0.86;
    }

    .table-card-main,
    .order-card {
      width: 100%;
      text-align: left;
      border: 0;
      background: transparent;
      padding: 0.72rem 0.78rem 0.52rem;
      display: grid;
      align-content: start;
      gap: 0.3rem;
      min-width: 0;
      min-height: 0;
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
    }

    .product-card {
      padding: 0.82rem 0.84rem;
      display: flex;
      flex-direction: column;
      min-height: 8.65rem;
      height: 100%;
      overflow: hidden;
    }

    .product-card-body {
      display: grid;
      grid-template-columns: 4.4rem minmax(0, 1fr);
      gap: 0.72rem;
      align-items: stretch;
      height: 100%;
      min-height: 100%;
    }

    .product-card-content {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: 0.44rem;
      min-width: 0;
      min-height: 100%;
      height: 100%;
      align-items: stretch;
    }

    .product-card-copy {
      display: flex;
      flex-direction: column;
      gap: 0.32rem;
      min-width: 0;
      min-height: 0;
      flex: 1;
    }

    .product-card-media {
      overflow: hidden;
      border-radius: var(--radius-lg);
      border: 1px solid color-mix(in srgb, var(--color-primary) 12%, var(--color-border));
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-primary-light) 22%, white),
        color-mix(in srgb, var(--color-bg) 84%, white)
      );
      width: 4.4rem;
      height: 4.4rem;
      min-height: 4.4rem;
      aspect-ratio: 1 / 1;
      display: flex;
      align-items: center;
      justify-content: center;
      align-self: flex-start;
      flex-shrink: 0;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
    }

    .product-card-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .product-card-media--placeholder span {
      font-size: 0.96rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--color-primary);
    }

    .table-card:hover,
    .order-card:hover,
    .product-card:hover {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }

    .table-card--selected,
    .order-card--selected {
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary-light) 18%, white);
      box-shadow: var(--shadow-md);
    }

    .table-card-top,
    .order-card-top,
    .product-card-top,
    .product-card-bottom,
    .total-row,
    .line-row,
    .line-controls,
    .catalog-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-3);
    }

    .catalog-toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1.18fr) minmax(214px, 0.82fr) auto;
      align-items: stretch;
      gap: 0.54rem;
    }

    .table-card-top,
    .order-card-top,
    .product-card-top,
    .line-row {
      align-items: flex-start;
    }

    .table-card-top {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
      gap: 0.52rem;
    }

    .table-card-copy {
      display: grid;
      gap: 0.28rem;
      min-width: 0;
      align-content: start;
    }

    .table-name {
      line-height: 1.08;
      overflow-wrap: anywhere;
      text-wrap: balance;
      font-size: 1.16rem;
      font-weight: 800;
    }

    .table-meta {
      display: block;
      font-size: 0.88rem;
      line-height: 1.24;
      color: var(--color-text-muted);
      white-space: normal;
    }

    .line-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.68rem;
      padding: 0.78rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--color-border) 72%, white);
    }

    .line-list .line-row:first-child {
      padding-top: 0.25rem;
    }

    .line-list .line-row:last-child {
      border-bottom: 0;
      padding-bottom: 0.15rem;
    }

    .line-list--readonly {
      border-top: 1px solid color-mix(in srgb, var(--color-border) 76%, white);
      padding-top: 0.4rem;
      margin-top: 0.35rem;
    }

    .line-list--live-bill {
      width: 100%;
    }

    .line-row--readonly {
      align-items: center;
    }

    .product-card-top > div,
    .product-title-stack {
      display: grid;
      gap: 0.24rem;
      min-width: 0;
      flex: 1;
      min-height: 0;
    }

    .product-card-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.36rem;
      min-height: 1.2rem;
      align-items: flex-start;
      align-content: flex-start;
      min-width: 0;
    }

    .product-card-badges .muted-pill {
      flex-shrink: 0;
    }

    .product-card-badges--empty {
      visibility: hidden;
    }

    .table-card-actions {
      margin-top: auto;
      padding: 0.58rem 0.78rem 0.72rem;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: stretch;
      gap: 0.38rem;
      border-top: 1px solid color-mix(in srgb, var(--color-border) 74%, white);
    }

    .table-card-actions--triple {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .table-card-actions .btn {
      width: 100%;
      min-height: 2.05rem;
      justify-content: center;
      padding-inline: 0.58rem;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.72rem;
      line-height: 1.1;
    }

    .btn-table-clear {
      border-style: dashed;
      color: var(--color-text-muted);
      min-width: 0;
      grid-column: 1 / -1;
    }

    .order-id,
    .product-price {
      display: block;
      font-size: 1rem;
      font-weight: 700;
    }

    .table-card-bottom {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: start;
      gap: 0.26rem;
      font-size: 0.76rem;
      line-height: 1.18;
      padding-top: 0.18rem;
    }

    .table-card-summary,
    .table-card-payment,
    .table-card-payment-pill {
      min-width: 0;
      display: block;
    }

    .table-card-summary {
      display: block;
      overflow: visible;
      text-overflow: unset;
      white-space: normal;
      color: var(--color-text-muted);
      font-weight: 600;
      line-height: 1.22;
      min-width: 0;
    }

    .table-reservation-inline {
      display: block;
      margin-top: 0.1rem;
      font-size: 0.66rem;
      line-height: 1.14;
      color: var(--color-primary);
      font-weight: 600;
    }

    .table-card-payment {
      text-align: left;
      white-space: normal;
      font-weight: 700;
      color: var(--color-text);
    }

    .table-card-payment-pill {
      justify-self: start;
      align-self: start;
      width: fit-content;
      display: inline-flex;
      align-items: center;
      gap: 0.28rem;
      border-radius: 999px;
      padding: 0.22rem 0.5rem;
      background: color-mix(in srgb, var(--color-bg) 72%, white);
      color: var(--color-text-muted);
      font-size: 0.61rem;
      font-weight: 700;
      line-height: 1.04;
      letter-spacing: 0;
      text-transform: none;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .table-card-payment-pill.payment-state--unpaid {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .table-card-payment-pill.payment-state--requested {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .table-card-payment-pill.payment-state--paid {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .table-card .state-pill {
      justify-self: end;
      max-width: 100%;
      min-height: 1.62rem;
      padding-inline: 0.58rem;
      font-size: 0.66rem;
    }

    .table-card-actions .btn-secondary {
      background: color-mix(in srgb, var(--color-surface) 92%, white);
    }

    .product-card-top strong {
      font-size: 0.94rem;
      line-height: 1.12;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 2.18em;
      text-wrap: balance;
    }

    .product-card-top span {
      font-size: 0.71rem;
      line-height: 1.12;
      color: var(--color-text-muted);
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .product-notes {
      margin: 0;
      font-size: 0.72rem;
      line-height: 1.22;
      min-height: 2.42em;
      max-height: 2.42em;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      color: var(--color-text-muted);
      text-wrap: pretty;
    }

    .product-notes--empty {
      color: color-mix(in srgb, var(--color-text-muted) 70%, white);
    }

    .product-card-bottom {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: end;
      padding-top: 0.48rem;
      gap: 0.48rem;
      border-top: 1px solid color-mix(in srgb, var(--color-border) 70%, white);
      margin-top: auto;
    }

    .product-price-stack {
      display: grid;
      gap: 0.24rem;
      min-width: 0;
      align-content: end;
      align-self: stretch;
    }

    .product-price-caption {
      display: none;
    }

    .product-card-bottom .btn {
      width: auto;
      min-width: 5.3rem;
      min-height: 1.96rem;
      justify-content: center;
      align-self: end;
      flex-shrink: 0;
      padding-inline: 0.68rem;
      font-weight: 700;
      white-space: nowrap;
      font-size: 0.74rem;
    }

    .product-price {
      font-size: 0.94rem;
      line-height: 1.06;
    }

    .product-source {
      display: none;
    }

    @media (max-width: 640px) {
      .page-shell {
        gap: 0.72rem;
      }

      .page-header--staff-flow {
        gap: 0.42rem;
      }

      .header-copy {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
        gap: 0.5rem;
      }

      .header-copy h1 {
        font-size: 1.42rem;
        line-height: 1.02;
      }

      .subcopy {
        display: none;
      }

      .header-copy .btn {
        min-height: 2.05rem;
        padding-inline: 0.72rem;
        font-size: 0.74rem;
      }

      .cashier-grid {
        grid-template-columns: 1fr;
        gap: 0.72rem;
      }

      .lane,
      .queue-panel {
        padding: 0.74rem;
        gap: 0.72rem;
      }

      .lane--tables,
      .lane--checkout {
        position: static;
        top: auto;
        max-height: none;
      }

      .table-stack {
        max-height: none;
        padding-right: 0;
      }

      .lane-header,
      .lane-header--tight,
      .lane-header--checkout {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.42rem;
      }

      .lane-header-actions,
      .checkout-header-actions {
        width: 100%;
        justify-content: flex-start;
      }

      .table-stack,
      .product-grid {
        grid-template-columns: 1fr;
      }

      .product-grid {
        gap: 0.72rem;
      }

      .cashier-status-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.48rem;
      }

      .status-chip {
        padding: 0.56rem 0.62rem;
        gap: 0.12rem;
      }

      .status-chip strong {
        font-size: 0.92rem;
      }

      .status-chip small {
        display: none;
      }

      .checkout-hero {
        padding: 0.85rem 0.9rem;
      }

      .table-card {
        border-radius: calc(var(--radius-lg) - 0.02rem);
        min-height: 0;
      }

      .table-card-main {
        padding: 0.58rem 0.66rem 0.46rem;
      }

      .table-card-top {
        grid-template-columns: 1fr !important;
        gap: 0.28rem;
      }

      .table-card-bottom {
        grid-template-columns: minmax(0, 1fr) !important;
        align-items: start;
        gap: 0.24rem;
      }

      .table-card-payment-pill {
        justify-self: start;
        padding: 0.18rem 0.46rem;
        font-size: 0.58rem;
      }

      .table-card-summary {
        font-size: 0.69rem;
        line-height: 1.16;
      }

      .table-card-actions,
      .table-card-actions--triple {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 0.36rem !important;
      }

      .table-card-actions--triple .btn-table-clear {
        grid-column: 1 / -1;
      }

      .table-card-actions .btn {
        min-height: 1.78rem;
        padding-inline: 0.44rem;
        font-size: 0.68rem;
        white-space: nowrap;
      }

      .table-name {
        font-size: 1rem;
      }

      .table-meta {
        font-size: 0.76rem;
        line-height: 1.12;
      }

      .table-card .state-pill {
        min-height: 1.52rem;
        padding-inline: 0.56rem;
        font-size: 0.66rem;
      }

      .lane-inline-pills {
        gap: 0.24rem;
      }

      .lane-inline-pills .muted-pill {
        min-height: 1.5rem;
        padding-inline: 0.5rem;
        font-size: 0.62rem;
      }

      .product-card {
        min-height: 0 !important;
        padding: 0.64rem 0.68rem !important;
      }

      .product-card-body {
        display: grid;
        grid-template-columns: 3.5rem minmax(0, 1fr) !important;
        gap: 0.58rem !important;
        align-items: start;
        min-height: 0;
      }

      .product-card-media {
        width: 3.5rem !important;
        height: 3.5rem !important;
        min-height: 3.5rem !important;
        aspect-ratio: 1 / 1 !important;
      }

      .product-card-content {
        gap: 0.36rem;
        min-height: 0;
      }

      .product-card-copy {
        gap: 0.24rem;
      }

      .product-card-top strong {
        font-size: 0.86rem;
        min-height: 0;
        line-height: 1.14;
      }

      .product-card-top span {
        font-size: 0.64rem;
      }

      .product-card-badges {
        min-height: 0;
        gap: 0.22rem;
      }

      .product-card-badges .muted-pill {
        min-height: 1.38rem;
        padding-inline: 0.46rem;
        font-size: 0.58rem;
      }

      .product-notes {
        min-height: 1.9em;
        max-height: 1.9em;
        font-size: 0.67rem;
        line-height: 1.18;
      }

      .product-card-bottom {
        grid-template-columns: minmax(0, 1fr) auto !important;
        align-items: end;
        gap: 0.4rem;
        padding-top: 0.34rem;
      }

      .product-card-bottom .btn {
        width: auto;
        min-width: 4.4rem;
        min-height: 1.74rem;
        padding-inline: 0.56rem;
        font-size: 0.66rem;
      }

      .product-price-caption {
        display: none;
      }

      .product-price-stack {
        gap: 0.08rem;
      }

      .product-price {
        font-size: 0.88rem;
        line-height: 1.06;
      }

      .product-dialog-hero,
      .product-dialog-heading-row {
        grid-template-columns: 1fr;
      }

      .product-dialog-aside {
        width: 100%;
        align-items: stretch;
      }

      .product-dialog-price-chip {
        width: 100%;
        text-align: left;
      }

      .product-dialog-media {
        width: 4.8rem;
        height: 4.8rem;
      }

      .product-question-state {
        justify-content: flex-start;
      }

      .settlement-summary-row,
      .settlement-summary-row--active,
      .settlement-summary-row--compact,
      .checkout-outcome-card,
      .continue-bill-card {
        grid-template-columns: 1fr;
        gap: 0.52rem;
        padding: 0.58rem 0.64rem;
      }

      .settlement-summary-row--active {
        position: static;
        top: auto;
        backdrop-filter: none;
      }

      .settlement-summary-copy {
        gap: 0.06rem;
      }

      .settlement-summary-copy strong,
      .checkout-outcome-copy strong,
      .continue-bill-copy h3 {
        font-size: 0.88rem;
        line-height: 1.14;
      }

      .settlement-summary-copy small,
      .checkout-outcome-copy small,
      .continue-bill-copy small {
        font-size: 0.69rem;
        line-height: 1.18;
      }

      .settlement-summary-pills,
      .continue-bill-summary,
      .continue-bill-copy-top {
        gap: 0.22rem;
      }

      .checkout-outcome-actions,
      .settlement-summary-actions,
      .continue-bill-actions,
      .queue-group-actions {
        grid-template-columns: 1fr;
        gap: 0.34rem;
        min-width: 0;
      }

      .checkout-outcome-actions .btn,
      .settlement-summary-actions .btn,
      .settlement-summary-actions .btn-primary,
      .settlement-submit-btn,
      .continue-bill-actions .btn,
      .queue-group-actions .btn,
      .queue-order-row-actions .btn {
        width: 100%;
        min-width: 0;
        min-height: 1.82rem;
        font-size: 0.68rem;
      }

      .payment-state-strip {
        padding: 0.42rem 0.52rem;
        gap: 0.28rem;
      }

      .payment-state-strip small {
        font-size: 0.69rem;
        line-height: 1.18;
        flex-basis: 100%;
      }

      .queue-panel--table-history {
        gap: 0.58rem;
        padding: 0.72rem;
      }

      .queue-history-summary,
      .queue-history-grid,
      .queue-group-stack,
      .queue-group-list {
        gap: 0.36rem;
      }

      .queue-history-summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-bottom: 0.32rem;
      }

      .queue-group-card {
        gap: 0.38rem;
        padding: 0.54rem;
      }

      .queue-group-header,
      .queue-order-row-top,
      .queue-order-row-meta,
      .queue-order-row-footer,
      .queue-order-row-actions {
        gap: 0.3rem;
      }

      .queue-group-header,
      .queue-order-row-top,
      .queue-order-row-footer,
      .queue-order-row-actions {
        flex-direction: column;
        align-items: flex-start;
      }

      .queue-group-copy {
        gap: 0.18rem;
      }

      .queue-group-copy h3 {
        font-size: 0.88rem;
        line-height: 1.14;
      }

      .queue-group-copy small,
      .queue-group-hint,
      .queue-order-row-copy small,
      .queue-order-row-age {
        font-size: 0.68rem;
        line-height: 1.16;
      }

      .queue-group-pills {
        gap: 0.22rem;
      }

      .queue-order-row,
      .queue-order-row--history,
      .order-card--history {
        gap: 0.24rem;
        padding: 0.5rem 0.54rem;
      }

      .queue-order-row-top strong {
        font-size: 0.82rem;
      }

      .queue-group-footer {
        justify-content: flex-start;
      }

      .queue-history-collapsed {
        padding: 0.64rem 0.72rem;
        gap: 0.42rem;
        font-size: 0.74rem;
        line-height: 1.2;
      }

      .settlement-mode-grid,
      .settlement-mode-grid--compact {
        grid-template-columns: 1fr;
        gap: 0.34rem;
      }

      .mode-card,
      .settlement-mode-grid--compact .mode-card {
        min-height: 0;
        padding: 0.5rem 0.58rem;
        gap: 0.06rem;
      }

      .mode-card strong,
      .settlement-mode-grid--compact .mode-card strong {
        font-size: 0.78rem;
        line-height: 1.14;
      }

      .mode-card small,
      .settlement-mode-grid--compact .mode-card small {
        font-size: 0.58rem;
        line-height: 1.12;
      }

      .line-copy {
        gap: 0.16rem;
      }

      .line-copy-top {
        gap: 0.28rem;
      }

      .line-copy strong,
      .line-total {
        font-size: 0.86rem;
        line-height: 1.12;
      }

      .line-customization {
        font-size: 0.68rem;
        line-height: 1.16;
      }

      .line-controls {
        justify-content: flex-start;
        gap: 0.28rem;
      }

      .qty-control {
        gap: 0.18rem;
        padding: 0.1rem;
      }

      .qty-btn {
        width: 1.72rem;
        height: 1.72rem;
        font-size: 0.9rem;
      }

      .qty-value {
        min-width: 1rem;
        font-size: 0.82rem;
      }

      .line-total-stack {
        min-width: 0;
        justify-items: start;
        text-align: left;
      }

      .line-remove-btn {
        min-height: 1.66rem;
        padding-inline: 0.46rem;
        font-size: 0.68rem;
      }

      .totals-card,
      .cart-card,
      .context-card {
        padding: 0.74rem;
        gap: 0.68rem;
      }
    }

    .token-line {
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .context-card,
    .cart-card,
    .totals-card,
    .order-history-summary,
    .order-detail-card {
      padding: 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .context-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-2);
    }

    .context-grid--checkout {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .context-grid strong,
    .line-copy strong,
    .line-total {
      font-size: 1rem;
    }

    .context-grid > div {
      padding: 0.8rem 0.9rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--color-surface) 92%, white);
      display: flex;
      flex-direction: column;
      gap: 0.22rem;
      min-width: 0;
    }

    .action-row,
    .checkout-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .history-summary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-3);
    }

    .settlement-mode-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(136px, 1fr));
      gap: 0.55rem;
    }

    .settlement-mode-grid--compact {
      grid-template-columns: repeat(auto-fit, minmax(116px, 1fr));
      gap: 0.42rem;
    }

    .mode-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      color: var(--color-text);
      text-align: left;
      padding: 0.6rem 0.68rem;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-height: 3.55rem;
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
    }

    .mode-card:hover:not(:disabled) {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-sm);
      transform: translateY(-1px);
    }

    .mode-card strong {
      font-size: 0.88rem;
      line-height: 1.18;
    }

    .mode-card small {
      color: var(--color-text-muted);
      line-height: 1.2;
      font-size: 0.62rem;
    }

    .settlement-mode-grid--compact .mode-card {
      min-height: 3.18rem;
      padding: 0.5rem 0.62rem;
      gap: 0.08rem;
    }

    .settlement-mode-grid--compact .mode-card strong {
      font-size: 0.84rem;
    }

    .settlement-mode-grid--compact .mode-card small {
      font-size: 0.6rem;
      line-height: 1.14;
    }

    .mode-card--selected {
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary-light) 18%, white);
      box-shadow: var(--shadow-sm);
    }

    .mode-card--disabled {
      opacity: 0.58;
      cursor: not-allowed;
    }

    .inline-hint--muted {
      border-color: color-mix(in srgb, var(--color-border) 82%, white);
      background: color-mix(in srgb, var(--color-bg) 92%, white);
    }

    .action-row--secondary {
      padding-top: var(--space-1);
      justify-content: flex-end;
    }

    .action-row--checkout-table {
      padding-top: 0;
      justify-content: flex-start;
      flex-wrap: wrap;
      gap: 0.42rem;
    }

    .action-row--checkout {
      justify-content: flex-end;
      gap: var(--space-2);
    }

    .action-row--checkout-compact {
      padding-top: 0;
    }

    .action-row--live-bill {
      padding-top: 0;
      justify-content: flex-start;
      gap: var(--space-2);
    }

    .action-row--live-bill .btn {
      flex: 1 1 0;
      min-width: 0;
    }

    .catalog-toolbar {
      row-gap: 0.7rem;
      column-gap: 0.75rem;
    }

    .catalog-toolbar--locked {
      justify-content: flex-end;
    }

    .catalog-toolbar > .search-input {
      flex: 1 1 15rem;
    }

    .catalog-toolbar > .category-select {
      flex: 0 0 12rem;
    }

    .catalog-toolbar-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      align-items: stretch;
      justify-content: flex-end;
      min-width: max-content;
    }

    .catalog-toolbar-actions > .btn,
    .catalog-toolbar-actions > a.btn {
      min-height: 2.6rem;
      padding-inline: 0.9rem;
      justify-content: center;
    }

    .catalog-hints {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: center;
    }

    .catalog-blocked-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid color-mix(in srgb, #f59e0b 22%, var(--color-border));
      border-radius: var(--radius-xl);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, #fff7e8 88%, white),
        color-mix(in srgb, var(--color-primary-light) 8%, white)
      );
    }

    .catalog-blocked-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .live-bill-lock-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid color-mix(in srgb, #f59e0b 20%, var(--color-border));
      border-radius: var(--radius-xl);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, #fff7e8 86%, white),
        color-mix(in srgb, var(--color-primary-light) 10%, white)
      );
    }

    .live-bill-lock-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .category-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .category-chip {
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: var(--color-surface);
      color: var(--color-text);
      padding: 0.55rem 0.9rem;
      font: inherit;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
    }

    .category-chip span {
      border-radius: 999px;
      background: var(--color-bg);
      padding: 0.12rem 0.5rem;
      font-size: 0.76rem;
      font-weight: 700;
      color: var(--color-text-muted);
    }

    .category-chip:hover {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-sm);
    }

    .category-chip--active {
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary-light) 16%, white);
      color: var(--color-primary-strong);
    }

    .category-chip--active span {
      background: rgba(255, 255, 255, 0.8);
      color: var(--color-primary-strong);
    }

    .checkout-readiness {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: center;
    }

    .search-input,
    .text-input,
    .text-area {
      width: 100%;
      min-width: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      color: var(--color-text);
      font: inherit;
      padding: 0.85rem 1rem;
    }

    .search-input {
      flex: 1 1 14rem;
    }

    .category-select {
      flex: 0 0 12rem;
    }

    .category-select--full {
      flex: 1 1 auto;
    }

    .text-area {
      resize: vertical;
      min-height: 6rem;
    }

    .field-stack,
    .form-stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .form-grid {
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
      gap: var(--space-3);
      align-items: start;
    }

    .field-stack--compact {
      gap: var(--space-2);
    }

    .checkout-cta-strip {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-2);
      align-items: center;
    }

    .checkout-empty-action {
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--color-bg) 72%, white);
      padding: 0.8rem 0.95rem;
      display: flex;
      flex-direction: column;
      gap: 0.18rem;
      min-height: 3rem;
      justify-content: center;
    }

    .checkout-empty-action strong {
      font-size: 1rem;
      line-height: 1.25;
    }

    .checkout-empty-action small {
      color: var(--color-text-muted);
      line-height: 1.45;
    }

    .checkout-summary-inline {
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--color-bg) 72%, white);
      padding: 0.8rem 0.95rem;
      display: flex;
      flex-direction: column;
      gap: 0.18rem;
      min-height: 3rem;
      justify-content: center;
    }

    .checkout-summary-inline strong {
      font-size: 1rem;
      line-height: 1.25;
    }

    .checkout-summary-inline small {
      display: none;
    }

    .checkout-cta-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: stretch;
      justify-content: stretch;
      gap: var(--space-2);
      width: 100%;
    }

    .checkout-cta-actions > .btn:only-child {
      grid-column: 1 / -1;
    }

    .checkout-cta-strip--hero .btn-primary {
      min-height: 3rem;
      font-size: 0.98rem;
      box-shadow: var(--shadow-sm);
    }

    .cart-header-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.45rem;
      flex-wrap: wrap;
    }

    .inline-hint--live-bill {
      border-color: color-mix(in srgb, var(--color-primary) 22%, var(--color-border));
      background: color-mix(in srgb, var(--color-primary-light) 14%, white);
    }

    .cart-card {
      padding-top: 0.8rem;
    }

    .empty-bill-copy {
      display: grid;
      gap: 0.35rem;
    }

    .cart-idle-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.74rem 0.84rem;
      border: 1px dashed color-mix(in srgb, var(--color-border) 88%, white);
      border-radius: 18px;
      background: color-mix(in srgb, var(--color-surface-alt) 55%, white);
      color: var(--color-text-muted);
    }

    .cart-idle-strip strong {
      color: var(--color-text);
      font-size: 0.92rem;
      line-height: 1.2;
    }

    .cart-idle-strip span {
      text-align: right;
      font-size: 0.84rem;
      line-height: 1.28;
    }

    .empty-bill-copy strong {
      font-size: 0.98rem;
      line-height: 1.2;
    }

    .empty-bill-copy p {
      margin: 0;
      color: var(--color-text-muted);
      line-height: 1.45;
    }

    .live-bill-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .live-bill-summary--compact {
      padding-bottom: 0.2rem;
      border-bottom: 1px solid color-mix(in srgb, var(--color-border) 76%, white);
    }

    .live-bill-summary--dock {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.68rem;
    }

    .ticket-context-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      align-items: center;
      margin-top: 0.15rem;
    }

    .live-bill-summary-copy,
    .live-bill-summary-meta {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      min-width: 0;
    }

    .live-bill-summary-copy p {
      margin: 0;
      color: var(--color-text-muted);
      line-height: 1.4;
    }

    .live-bill-summary-copy--dock strong {
      font-size: 0.96rem;
      line-height: 1.14;
    }

    .live-bill-summary-copy--dock small {
      color: var(--color-text-muted);
      line-height: 1.22;
    }

    .live-bill-summary-meta {
      align-items: flex-end;
    }

    .live-bill-summary-meta--dock {
      justify-content: center;
      align-self: center;
    }

    .live-bill-summary-caption {
      color: var(--color-text-muted);
      font-size: 0.82rem;
      line-height: 1.3;
    }

    .settlement-summary-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.44rem;
      align-items: center;
      padding: 0.62rem 0.72rem;
      border: 1px solid color-mix(in srgb, var(--color-primary) 14%, var(--color-border));
      border-radius: var(--radius-xl);
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-surface) 97%, white),
        color-mix(in srgb, var(--color-bg) 90%, white)
      );
      box-shadow: var(--shadow-sm);
    }

    .settlement-summary-row--active {
      grid-template-columns: minmax(0, 1fr) auto;
      position: sticky;
      top: 0;
      z-index: 3;
      backdrop-filter: blur(6px);
    }

    .settlement-summary-row--cta {
      margin-top: 0.2rem;
    }

    .settlement-summary-row--compact {
      grid-template-columns: 1fr;
      gap: 0.7rem;
      align-items: stretch;
    }

    .settlement-summary-row--compact .settlement-summary-actions {
      justify-content: stretch;
    }

    .settlement-summary-row--compact .settlement-submit-btn {
      width: 100%;
      min-width: 0;
    }

    .settlement-summary-copy {
      display: grid;
      gap: 0.08rem;
      min-width: 0;
    }

    .settlement-summary-copy strong {
      font-size: 0.96rem;
      line-height: 1.14;
    }

    .settlement-summary-copy small {
      color: var(--color-text-muted);
      line-height: 1.22;
      font-size: 0.78rem;
    }

    .settlement-summary-copy--primary strong {
      font-size: 1rem;
    }

    .payment-dock-topline {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.78rem;
      align-items: center;
      padding: 0.78rem 0.84rem;
      border: 1px solid color-mix(in srgb, var(--color-border) 74%, white);
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--color-bg) 72%, white);
    }

    .payment-dock-total,
    .payment-dock-meta {
      display: grid;
      gap: 0.18rem;
      min-width: 0;
    }

    .payment-dock-total strong {
      font-size: 1.18rem;
      line-height: 1.06;
    }

    .payment-dock-total small {
      color: var(--color-text-muted);
      line-height: 1.22;
    }

    .payment-dock-meta {
      justify-items: end;
      align-content: center;
      gap: 0.35rem;
    }

    .settlement-summary-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.28rem;
      align-items: center;
      justify-content: flex-start;
    }

    .checkout-outcome-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.5rem;
      align-items: center;
      padding: 0.64rem 0.72rem;
      border: 1px solid color-mix(in srgb, var(--color-success, #10b981) 22%, var(--color-border));
      border-radius: var(--radius-xl);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, #dff7ee 82%, white),
        color-mix(in srgb, var(--color-surface) 96%, white)
      );
      box-shadow: var(--shadow-sm);
    }

    .payment-state-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.42rem;
      flex-wrap: wrap;
      padding: 0.48rem 0.62rem;
      border: 1px solid color-mix(in srgb, var(--color-primary) 12%, var(--color-border));
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--color-bg) 82%, white);
    }

    .payment-state-strip small {
      color: var(--color-text-muted);
      line-height: 1.28;
      font-size: 0.78rem;
      flex: 1 1 18rem;
    }

    .payment-state-strip--error {
      border-color: color-mix(in srgb, #ef4444 22%, var(--color-border));
      background: color-mix(in srgb, #fef2f2 88%, white);
    }

    .checkout-outcome-copy {
      display: grid;
      gap: 0.14rem;
      min-width: 0;
    }

    .checkout-outcome-copy strong {
      font-size: 0.98rem;
      line-height: 1.2;
    }

    .checkout-outcome-copy small {
      color: var(--color-text-muted);
      line-height: 1.26;
      font-size: 0.82rem;
    }

    .checkout-outcome-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
      gap: 0.32rem;
      align-items: stretch;
      min-width: min(100%, 17.5rem);
    }

    .settlement-summary-actions {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.32rem;
      align-items: stretch;
      min-width: min(100%, 12.4rem);
    }

    .settlement-submit-btn,
    .settlement-summary-actions .btn-primary {
      width: 100%;
      min-width: 0;
      min-height: 2.35rem;
      font-weight: 700;
      white-space: normal;
      justify-content: center;
      box-shadow: var(--shadow-sm);
    }

    .settlement-footnote {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.55rem;
    }

    .settlement-footnote small {
      color: var(--color-text-muted);
      line-height: 1.35;
    }

    .settlement-mode-chip {
      align-self: flex-start;
    }

    .settlement-policy-note {
      margin: 0.55rem 0 0;
      padding: 0.55rem 0.7rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
      color: var(--color-text-muted);
      font-size: 0.78rem;
      line-height: 1.4;
    }

    .settlement-policy-note--drawer {
      margin: 0.65rem 0;
    }

    .inline-hint-copy {
      display: flex;
      flex-direction: column;
      gap: 0.18rem;
      min-width: 0;
    }

    .inline-hint-copy strong {
      font-size: 0.95rem;
      line-height: 1.2;
    }

    .inline-hint-copy small {
      color: var(--color-text-muted);
      line-height: 1.35;
    }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(19.25rem, 1fr));
      gap: 0.82rem;
      align-items: stretch;
    }

    .product-dialog-heading-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.85rem;
      align-items: start;
    }

    .product-dialog-title-block {
      display: grid;
      gap: 0.4rem;
      min-width: 0;
    }

    .product-dialog-price-chip {
      display: grid;
      gap: 0.16rem;
      min-width: 7.5rem;
      padding: 0.7rem 0.85rem;
      border-radius: var(--radius-lg);
      border: 1px solid color-mix(in srgb, var(--color-primary) 16%, var(--color-border));
      background: color-mix(in srgb, var(--color-surface) 92%, white);
      text-align: right;
      box-shadow: var(--shadow-sm);
    }

    .product-dialog-price-chip strong {
      font-size: 1.05rem;
      line-height: 1.1;
    }

    .product-dialog-close {
      min-width: 5.25rem;
    }

    .product-question-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .product-question-state {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.35rem;
    }

    .product-question-choice--quiet {
      background: color-mix(in srgb, var(--color-bg) 64%, white);
      border-style: dashed;
    }

    .checkout-empty-copy {
      margin: 0;
      color: var(--color-text-muted);
      line-height: 1.35;
    }

    .queue-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-2);
    }

    .queue-group-stack {
      display: grid;
      gap: var(--space-3);
    }

    .queue-group-card {
      display: grid;
      gap: 0.5rem;
      padding: 0.62rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      background: color-mix(in srgb, var(--color-surface) 94%, white);
      box-shadow: var(--shadow-sm);
    }

    .queue-group-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.85rem;
      flex-wrap: wrap;
    }

    .queue-group-copy {
      display: grid;
      gap: 0.3rem;
      min-width: 0;
    }

    .queue-group-copy h3 {
      margin: 0;
      font-size: 1rem;
      line-height: 1.2;
    }

    .queue-group-copy small {
      color: var(--color-text-muted);
      line-height: 1.28;
      font-size: 0.8rem;
    }

    .queue-group-hint {
      font-size: 0.82rem;
      line-height: 1.28;
      color: var(--color-text);
      font-weight: 700;
    }

    .queue-group-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      align-items: center;
      justify-content: flex-start;
    }

    .queue-group-actions {
      display: grid;
      grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr);
      gap: 0.45rem;
      align-items: stretch;
    }

    .queue-group-actions .btn {
      width: 100%;
      min-height: 2.35rem;
    }

    .queue-group-list {
      display: grid;
      gap: 0.42rem;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .queue-order-row {
      display: grid;
      gap: 0.3rem;
      padding: 0.52rem 0.56rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--color-surface) 98%, white);
      text-align: left;
      transition:
        border-color 160ms ease,
        box-shadow 160ms ease,
        transform 160ms ease;
    }

    .queue-order-row:hover {
      border-color: color-mix(in srgb, var(--color-primary) 18%, var(--color-border));
      box-shadow: var(--shadow-sm);
      transform: translateY(-1px);
    }

    .queue-order-row-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.8rem;
    }

    .queue-order-row-top strong {
      font-size: 0.88rem;
      line-height: 1.15;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .queue-order-row-copy {
      display: grid;
      gap: 0.14rem;
      min-width: 0;
    }

    .queue-order-row-copy small {
      color: var(--color-text-muted);
      line-height: 1.22;
      font-size: 0.74rem;
    }

    .queue-order-row-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.38rem;
      align-items: center;
    }

    .queue-order-row-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.48rem;
      flex-wrap: wrap;
    }

    .queue-order-row--history .queue-order-row-actions,
    .queue-order-row-footer {
      padding-top: 0.1rem;
    }

    .queue-group-footer {
      display: flex;
      justify-content: flex-end;
    }

    .queue-order-row-age {
      color: var(--color-text-muted);
      font-size: 0.75rem;
      line-height: 1.2;
    }

    .continue-bill-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.9rem;
      padding: 1rem;
      border: 1px solid color-mix(in srgb, var(--color-primary) 18%, var(--color-border));
      border-radius: var(--radius-xl);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-primary-light) 16%, white),
        color-mix(in srgb, var(--color-surface) 96%, white)
      );
      box-shadow: var(--shadow-sm);
      align-items: center;
    }

    .continue-bill-copy {
      display: grid;
      gap: 0.28rem;
      min-width: 0;
    }

    .continue-bill-copy-top {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      align-items: center;
      justify-content: flex-start;
    }

    .continue-bill-copy h3 {
      margin: 0;
      font-size: 1.02rem;
      line-height: 1.22;
    }

    .continue-bill-copy small {
      color: var(--color-text-muted);
      line-height: 1.35;
    }

    .continue-bill-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      align-items: center;
    }

    .continue-bill-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.55rem;
    }

    .queue-history-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(196px, 1fr));
      gap: 0.5rem;
    }

    .queue-history-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(116px, max-content));
      gap: 0.36rem;
      align-items: center;
      margin-bottom: 0.48rem;
    }

    .queue-history-collapsed {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      padding: 0.85rem 1rem;
      border: 1px dashed color-mix(in srgb, var(--color-border) 78%, white);
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--color-bg) 72%, white);
      color: var(--color-text-muted);
      font-size: 0.92rem;
      line-height: 1.4;
    }

    .queue-order-row--history {
      min-height: 0;
      padding: 0.66rem 0.72rem;
      gap: 0.34rem;
      border-radius: var(--radius-lg);
    }

    .queue-order-row-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.42rem;
      flex-wrap: wrap;
    }

    .queue-order-row-actions .btn {
      width: auto;
      min-width: 5.2rem;
      min-height: 1.95rem;
    }

    .order-card--history {
      padding: 0.72rem 0.76rem;
      gap: 0.48rem;
      min-height: 0;
    }

    .queue-panel--table-history .order-card-compact-footer {
      padding-top: 0.22rem;
    }

    .qty-btn {
      width: 1.95rem;
      height: 1.95rem;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
    }

    .qty-value {
      min-width: 1.15rem;
      text-align: center;
      font-weight: 700;
      font-size: 0.92rem;
    }

    .line-copy {
      display: flex;
      flex-direction: column;
      gap: 0.22rem;
      min-width: 0;
    }

    .line-copy-top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45rem;
      justify-content: space-between;
    }

    .line-customization {
      color: var(--color-text-muted);
      font-size: 0.8rem;
      line-height: 1.3;
    }

    .line-controls {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.38rem;
      row-gap: 0.35rem;
      flex-wrap: wrap;
    }

    .qty-control {
      display: inline-flex;
      align-items: center;
      gap: 0.24rem;
      padding: 0.14rem;
      border: 1px solid color-mix(in srgb, var(--color-border) 82%, white);
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-surface) 94%, white);
    }

    .line-total-stack {
      display: grid;
      gap: 0.06rem;
      min-width: 4.8rem;
      justify-items: end;
      text-align: right;
    }

    .line-total-stack .micro-label {
      display: none;
    }

    .line-remove-btn {
      min-width: auto;
      padding-inline: 0.56rem;
      min-height: 1.8rem;
      font-size: 0.82rem;
    }

    .totals-card {
      gap: 0.66rem;
      border-color: color-mix(in srgb, var(--color-primary) 12%, var(--color-border));
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-surface) 94%, white),
        color-mix(in srgb, var(--color-bg) 84%, white)
      );
    }

    .order-card {
      padding: 0.85rem 0.9rem;
      gap: 0.55rem;
    }

    .order-card .micro-label {
      margin-bottom: 0.1rem;
    }

    .order-card-top > div {
      display: grid;
      gap: 0.12rem;
      min-width: 0;
    }

    .order-card-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .order-card-compact-footer {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
      gap: 0.5rem;
      align-items: stretch;
      padding-top: 0.3rem;
      border-top: 1px solid var(--color-border);
    }

    .order-card-compact-stat {
      display: grid;
      gap: 0.12rem;
      padding: 0.55rem 0.65rem;
      border: 1px solid color-mix(in srgb, var(--color-border) 82%, white);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--color-surface) 94%, white);
      min-width: 0;
    }

    .order-card-compact-stat strong {
      font-size: 0.9rem;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }

    .order-meta {
      color: var(--color-text-muted);
      font-size: 0.82rem;
    }

    .total-row {
      font-size: 0.94rem;
      padding: 0.05rem 0;
    }

    .total-row--grand {
      padding-top: 0.7rem;
      border-top: 1px solid var(--color-border);
      font-size: 1.02rem;
    }

    .total-row--muted {
      color: var(--color-text-muted);
    }

    .inline-hint {
      border-radius: var(--radius-lg);
      background: var(--color-bg);
      padding: var(--space-3);
      font-size: 0.92rem;
    }

    .inline-hint--stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .inline-hint--compact {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: 0.85rem 1rem;
    }

    .inline-hint-copy {
      min-width: 0;
    }

    .inline-hint-copy strong {
      display: block;
      line-height: 1.25;
    }

    .inline-hint--stack p {
      margin: var(--space-1) 0 0;
    }

    .inline-hint-copy p {
      margin: 0.12rem 0 0;
      line-height: 1.3;
      font-size: 0.88rem;
    }

    .inline-hint--warn {
      background: rgba(245, 158, 11, 0.12);
      color: #b45309;
    }

    .inline-hint--info {
      background: color-mix(in srgb, var(--color-primary-light) 18%, white);
      color: var(--color-primary-strong);
      border: 1px solid color-mix(in srgb, var(--color-primary) 12%, var(--color-border));
    }

    @media (max-width: 980px) {
      .pos-service-overlay {
        padding: 0;
      }

      .pos-service-drawer {
        width: 100vw;
        height: 100dvh;
        border-radius: 0;
        border-inline: 0;
      }

      .pos-service-header {
        padding: 0.86rem 0.9rem 0.72rem;
      }

      .pos-service-loop {
        grid-template-columns: 1fr;
        align-items: stretch;
        padding: 0.72rem 0.75rem;
      }

      .pos-service-tabs {
        padding: 0.62rem 0.75rem;
      }

      .pos-service-workspace {
        grid-template-columns: minmax(0, 1fr) minmax(17rem, 20rem);
      }

      .pos-service-product-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.55rem;
      }

      .pos-service-product-card {
        grid-template-columns: 3.2rem minmax(0, 1fr);
        min-height: 5.9rem;
        padding: 0.55rem;
      }

      .pos-service-product-media {
        width: 3.2rem;
        border-radius: 13px;
      }

      .pos-service-payment-grid {
        grid-template-columns: 1fr;
      }

      .pos-service-checkout-main,
      .pos-service-paybar,
      .pos-service-orders-heading {
        align-items: stretch;
        flex-direction: column;
      }

      .pos-service-total-card {
        width: 100%;
        min-width: 0;
        text-align: left;
      }
    }

    @media (max-width: 680px) {
      .pos-service-header {
        flex-direction: column;
      }

      .pos-service-header-actions {
        width: 100%;
        justify-content: space-between;
      }

      .pos-service-product-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .pos-service-workspace {
        display: flex;
        flex-direction: column;
        overflow: auto;
      }

      .pos-service-menu-pane {
        overflow: visible;
      }

      .pos-service-cart-pane {
        flex: 0 0 auto;
        min-height: 18rem;
        border-left: 0;
        border-top: 1px solid color-mix(in srgb, var(--color-border) 76%, white);
      }

      .pos-service-product-card {
        grid-template-columns: 1fr;
      }

      .pos-service-product-media {
        width: 100%;
        min-height: 4.2rem;
      }
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.35);
      backdrop-filter: blur(4px);
      z-index: 300;
    }

    .modal-card {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(42rem, calc(100vw - 2rem));
      max-height: min(80vh, 46rem);
      overflow: auto;
      padding: 1.25rem;
      border-radius: var(--radius-xl);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-lg);
      z-index: 301;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .modal-card--product-question {
      width: min(40rem, calc(100vw - 2rem));
      padding: 0;
      overflow: hidden;
    }

    .product-dialog-hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.9rem;
      align-items: start;
      padding: 1.1rem 1.15rem 1rem;
      border-bottom: 1px solid var(--color-border);
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-primary-light) 12%, white),
        color-mix(in srgb, var(--color-surface) 98%, white)
      );
    }

    .product-dialog-copy {
      display: flex;
      flex-direction: column;
      gap: 0.48rem;
      min-width: 0;
    }

    .product-dialog-copy h3 {
      margin: 0;
      font-size: 1.26rem;
      line-height: 1.08;
    }

    .product-dialog-subcopy {
      margin: 0;
      color: var(--color-text-muted);
      line-height: 1.3;
      font-size: 0.88rem;
      max-width: 34rem;
    }

    .product-dialog-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .product-dialog-media {
      width: 5.25rem;
      height: 5.25rem;
      border-radius: var(--radius-xl);
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--color-primary) 12%, var(--color-border));
      background: color-mix(in srgb, var(--color-bg) 78%, white);
      box-shadow: var(--shadow-sm);
      flex-shrink: 0;
    }

    .product-dialog-aside {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.6rem;
      justify-content: flex-start;
    }

    .product-dialog-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .product-question-list {
      display: flex;
      flex-direction: column;
      gap: 0.82rem;
      padding: 0 1.15rem;
    }

    .product-question-card {
      display: flex;
      flex-direction: column;
      gap: 0.56rem;
      padding: 0.82rem 0.9rem;
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-surface) 96%, white),
        color-mix(in srgb, var(--color-bg) 72%, white)
      );
      box-shadow: var(--shadow-sm);
    }

    .product-question-label {
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .product-question-label span {
      color: var(--color-danger, #dc2626);
    }

    .product-question-multi {
      display: grid;
      gap: 0.55rem;
    }

    .product-question-choice-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: 0.55rem;
    }

    .product-question-choice {
      display: grid;
      gap: 0.28rem;
      text-align: left;
      padding: 0.78rem 0.88rem;
      min-height: 3.8rem;
      border-radius: var(--radius-lg);
      border: 1px solid color-mix(in srgb, var(--color-border) 82%, white);
      background: color-mix(in srgb, var(--color-surface) 96%, white);
      cursor: pointer;
      transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
    }

    .product-question-choice:hover {
      border-color: color-mix(in srgb, var(--color-primary) 28%, var(--color-border));
      box-shadow: var(--shadow-sm);
      transform: translateY(-1px);
    }

    .product-question-choice--selected {
      border-color: color-mix(in srgb, var(--color-primary) 62%, var(--color-border));
      background: color-mix(in srgb, var(--color-primary-light) 18%, white);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 18%, transparent), var(--shadow-sm);
    }

    .product-question-choice-title {
      font-weight: 700;
      color: var(--color-text);
      line-height: 1.2;
    }

    .product-question-choice-copy {
      color: var(--color-text-muted);
      font-size: 0.76rem;
      line-height: 1.22;
    }

    .product-question-check {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      font-size: 0.95rem;
      min-height: 2.5rem;
      padding: 0.2rem 0;
    }

    .product-question-scale {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .question-range {
      flex: 1;
    }

    .modal-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.9rem;
      flex-wrap: wrap;
      padding: 0.9rem 1.15rem 1.1rem;
      border-top: 1px solid var(--color-border);
      background: color-mix(in srgb, var(--color-surface) 94%, white);
      backdrop-filter: blur(6px);
      position: sticky;
      bottom: 0;
    }

    .modal-actions-copy {
      display: grid;
      gap: 0.15rem;
    }

    .modal-actions-copy strong {
      font-size: 1rem;
      line-height: 1.08;
    }

    .modal-actions-copy small {
      color: var(--color-text-muted);
      line-height: 1.28;
      font-size: 0.84rem;
    }

    .modal-actions-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .live-bill-review-card {
      padding: var(--space-4);
      border: 1px solid color-mix(in srgb, #f59e0b 28%, var(--color-border));
      border-radius: var(--radius-xl);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, #fef3c7 42%, white),
        color-mix(in srgb, var(--color-surface) 94%, white)
      );
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .cart-card .line-row {
      grid-template-columns: 1fr;
      gap: 0.65rem;
    }

    .cart-card .line-controls {
      width: 100%;
      justify-content: space-between;
    }

    .empty-card {
      padding: var(--space-5);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      align-items: flex-start;
      justify-content: center;
      min-height: 14rem;
    }

    .empty-card--compact {
      min-height: auto;
      padding: var(--space-4);
    }

    .empty-card--checkout {
      gap: 0.2rem;
      min-height: auto;
      padding: 0.9rem 1rem;
      background: color-mix(in srgb, var(--color-primary-light) 10%, white);
    }

    .checkout-empty-copy {
      margin: 0;
      color: var(--color-text-muted);
      line-height: 1.32;
      font-size: 0.9rem;
    }

    .empty-card-copy {
      margin: 0;
      max-width: 26rem;
    }

    .empty-card h3 {
      margin: 0;
    }

    .loading-card {
      align-items: center;
      text-align: center;
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-surface) 94%, white),
        color-mix(in srgb, var(--color-primary) 7%, var(--color-surface))
      );
    }

    .loading-card p {
      margin: 0;
      max-width: 28rem;
    }

    .loading-card-icon {
      width: 2.4rem;
      height: 2.4rem;
      border-radius: 999px;
      border: 3px solid color-mix(in srgb, var(--color-primary) 18%, transparent);
      border-top-color: var(--color-primary);
      animation: pos-spin 0.9s linear infinite;
    }

    .loading-bars {
      width: min(20rem, 100%);
      display: grid;
      gap: 0.42rem;
      margin-top: 0.15rem;
    }

    .loading-bars span {
      height: 0.55rem;
      border-radius: 999px;
      background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--color-border) 70%, white),
        color-mix(in srgb, var(--color-primary) 15%, white),
        color-mix(in srgb, var(--color-border) 70%, white)
      );
      background-size: 200% 100%;
      animation: pos-shimmer 1.15s ease-in-out infinite;
    }

    .loading-bars span:nth-child(2) {
      width: 82%;
      justify-self: center;
      animation-delay: 0.08s;
    }

    .loading-bars span:nth-child(3) {
      width: 64%;
      justify-self: center;
      animation-delay: 0.16s;
    }

    @keyframes pos-spin {
      to { transform: rotate(360deg); }
    }

    @keyframes pos-shimmer {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    .queue-panel {
      min-height: unset;
    }

    .queue-panel--table-history {
      gap: var(--space-2);
      padding: var(--space-3);
    }

    .queue-panel--table-history .lane-header {
      align-items: center;
    }

    .queue-panel--table-history .lane-header h2 {
      margin-bottom: 0.12rem;
    }

    .btn-xs {
      min-height: 2rem;
      padding: 0 0.75rem;
      font-size: 0.78rem;
    }

    .guest-queue-rail {
      margin: 0 0 1rem;
      border: 1px solid rgba(15, 118, 110, 0.22);
      border-radius: 1rem;
      background: linear-gradient(145deg, rgba(240, 253, 250, 0.96), rgba(255, 255, 255, 0.98));
      overflow: hidden;
    }

    .guest-queue-toggle {
      width: 100%;
      min-height: 4.25rem;
      padding: 0.85rem 1rem;
      border: 0;
      background: transparent;
      color: inherit;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      text-align: left;
      cursor: pointer;
    }

    .guest-queue-toggle > span:first-child,
    .guest-queue-toggle-summary {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex-wrap: wrap;
    }

    .guest-queue-toggle > span:first-child {
      display: grid;
      gap: 0.15rem;
    }

    .guest-queue-chevron {
      width: 2rem;
      height: 2rem;
      border-radius: 999px;
      background: #0f766e;
      color: white;
      display: inline-grid;
      place-items: center;
      font-size: 1.25rem;
      line-height: 1;
    }

    .guest-queue-summary {
      padding: 0 1rem 0.85rem;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.55rem;
    }

    .guest-queue-summary > span {
      min-width: 0;
      padding: 0.65rem 0.7rem;
      border: 1px solid rgba(15, 118, 110, 0.12);
      border-radius: 0.75rem;
      background: rgba(255, 255, 255, 0.86);
      display: grid;
      gap: 0.1rem;
    }

    .guest-queue-summary small {
      color: #64748b;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .guest-queue-list {
      max-height: min(48vh, 31rem);
      overflow: auto;
      padding: 0.15rem 0.8rem 0.85rem;
      display: grid;
      gap: 0.65rem;
      border-top: 1px solid rgba(15, 118, 110, 0.12);
    }

    .guest-queue-card {
      padding: 0.8rem;
      border: 1px solid #e2e8f0;
      border-left: 0.32rem solid #f59e0b;
      border-radius: 0.85rem;
      background: #fff;
      display: grid;
      gap: 0.7rem;
    }

    .guest-queue-card--notified {
      border-left-color: #0f766e;
      background: #f0fdfa;
    }

    .guest-queue-card-main {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.75rem;
    }

    .guest-queue-number {
      min-width: 4.25rem;
      font-size: 1.35rem;
      color: #0f766e;
      letter-spacing: 0.02em;
    }

    .guest-queue-party {
      min-width: 0;
      display: grid;
      gap: 0.1rem;
    }

    .guest-queue-party span,
    .guest-queue-party small {
      color: #64748b;
      overflow-wrap: anywhere;
    }

    .guest-queue-actions,
    .guest-queue-seat-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .guest-queue-actions .btn {
      min-height: 2.5rem;
    }

    .guest-queue-seat-picker {
      padding: 0.7rem;
      border-radius: 0.7rem;
      background: #f8fafc;
      display: grid;
      grid-template-columns: minmax(8rem, 1fr) minmax(12rem, 2fr) auto;
      align-items: center;
      gap: 0.6rem;
    }

    .guest-queue-seat-picker label {
      font-weight: 700;
    }

    .guest-queue-seat-actions {
      justify-content: flex-end;
    }

    .guest-queue-empty {
      padding: 1rem 0.2rem 0.25rem;
      color: #64748b;
      text-align: center;
    }

    .table-queue-inline,
    .pos-service-queue-context {
      color: #0f766e;
      font-weight: 700;
    }

    .table-queue-inline {
      font-size: 0.76rem;
    }

    .pos-service-queue-context {
      margin-top: 0.3rem;
    }

    @media (max-width: 920px) {
      .workspace-header-actions {
        justify-content: flex-start;
      }

      .settlement-summary-row--active {
        position: sticky;
        top: 8.9rem;
      }

      #cashier-catalog,
      #payment-dock {
        scroll-margin-top: 9.35rem;
      }

      .guest-queue-seat-picker {
        grid-template-columns: 1fr;
      }

      .guest-queue-seat-actions {
        justify-content: stretch;
      }

      .guest-queue-seat-actions .btn {
        flex: 1 1 10rem;
      }
    }

    @media (max-width: 620px) {
      .guest-queue-toggle,
      .guest-queue-card-main {
        align-items: flex-start;
      }

      .guest-queue-toggle {
        display: grid;
      }

      .guest-queue-summary {
        grid-template-columns: 1fr;
      }

      .guest-queue-card-main {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .guest-queue-card-main .state-pill {
        grid-column: 1 / -1;
        justify-self: start;
      }

      .guest-queue-actions .btn {
        flex: 1 1 7.5rem;
      }
    }

  `],
})
export class CashierPosComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  readonly queuePreviewLimit = 4;
  readonly formatPrice = (cents: number): string => {
    const settings = this.settings();
    const currencyCode = settings?.currency_code || null;
    if (currencyCode) {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
        currencyDisplay: 'symbol',
      }).format(cents / 100);
    }
    const currency = settings?.currency || '$';
    return `${currency}${(cents / 100).toFixed(2)}`;
  };

  loading = signal(true);
  error = signal<string | null>(null);
  notice = signal<string | null>(null);
  pendingTableId = signal<number | null>(null);
  processingCheckout = signal(false);
  showQuickCreate = signal(false);
  creatingProduct = signal(false);
  tableWorkspaceOpen = signal(false);
  posDrawerView = signal<PosDrawerView>('menu');
  lastCheckoutOutcome = signal<PosCheckoutOutcome | null>(null);
  hitPayFlowState = signal<PosHitPayFlowState>('idle');
  tableHistoryExpanded = signal(false);
  qrLinkCopiedTableId = signal<number | null>(null);
  qrHandoffTableId = signal<number | null>(null);
  qrHandoffUrl = signal<string | null>(null);
  pendingClearTable = signal<CanvasTable | null>(null);
  queueRailOpen = signal(false);
  queueActionId = signal<number | null>(null);
  queueSeatEntry = signal<GuestQueueEntry | null>(null);
  queueSeatTargetId = signal<number | null>(null);

  /**
   * The POS now uses the table-service drawer as the single ordering/payment workflow.
   * Keep the old inline catalog/checkout lanes unrendered so hidden duplicate buttons do
   * not appear in browser QA or accessibility trees.
   */
  showLegacyInlineLanes(): boolean {
    return false;
  }
  private focusNextClearTableAfterReload = false;
  private preferredReadyTableIdAfterReload: number | null = null;
  private scrollTargetAfterReload: 'catalog' | 'payment' | null = null;
  private showNextTableHintAfterReload = true;
  private processedHitPayReturnKey: string | null = null;
  private brokenProductImageKeys = signal<Record<string, true>>({});
  private queueRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  settings = signal<TenantSettings | null>(null);
  tables = signal<CanvasTable[]>([]);
  orders = signal<Order[]>([]);
  tenantProducts = signal<TenantProduct[]>([]);
  legacyProducts = signal<Product[]>([]);
  guestQueueEntries = signal<GuestQueueEntry[]>([]);

  selectedTableId = signal<number | null>(null);
  selectedOrderId = signal<number | null>(null);
  cartTableId = signal<number | null>(null);
  cartLines = signal<PosCartLine[]>([]);
  reservationPrefill = signal<{
    reservationId: number | null;
    guestName: string | null;
    phone: string | null;
    partySize: number | null;
    note: string | null;
  } | null>(null);
  queuePrefill = signal<{
    queueEntryId: number | null;
    guestName: string | null;
    phone: string | null;
    partySize: number | null;
    note: string | null;
  } | null>(null);
  selectedSettlementMode = signal<PosSettlementMode>('card_terminal');
  staffAccessCache = signal<Record<number, StaffMenuAccessToken>>({});
  productQuestionDialogProduct = signal<PosSellableProduct | null>(null);
  productQuestionAnswers = signal<Record<string, string | number | string[]>>({});

  productSearch = signal('');
  selectedCategory = signal('');
  quickProductDraft: QuickProductDraft = {
    name: '',
    price: '',
    category: '',
    description: '',
  };

  activeTables = computed(() => this.tables().filter((table) => !!table.is_active));
  availableTargetTables = computed(() => this.sortedTables().filter((table) => this.canStartCashierBill(table)));
  sortedGuestQueueEntries = computed(() =>
    [...this.guestQueueEntries()]
      .filter((entry) => entry.status === 'waiting' || entry.status === 'notified')
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'notified' ? -1 : 1;
        }
        return a.queue_number - b.queue_number;
      }),
  );
  queueWaitingCount = computed(
    () => this.sortedGuestQueueEntries().filter((entry) => entry.status === 'waiting').length,
  );
  queueNotifiedCount = computed(
    () => this.sortedGuestQueueEntries().filter((entry) => entry.status === 'notified').length,
  );
  queueGuestCount = computed(() =>
    this.sortedGuestQueueEntries().reduce((sum, entry) => sum + entry.party_size, 0),
  );
  nextQueueLabel = computed(() => this.sortedGuestQueueEntries()[0]?.queue_label || '—');
  queueLongestWaitLabel = computed(() => {
    const oldest = this.sortedGuestQueueEntries()
      .map((entry) => this.queueWaitMinutes(entry))
      .reduce((maximum, value) => Math.max(maximum, value), 0);
    return oldest > 0 ? `${oldest} min` : '—';
  });
  openOrders = computed(() =>
    this.orders().filter(
      (order) =>
        !this.isPaid(order) &&
        !this.isCancelledOrder(order) &&
        this.isOrderInCurrentServiceSession(order),
    ),
  );
  unpaidOrders = computed(() => this.openOrders());
  liveBills = computed(() => this.openOrders());
  paidOrders = computed(() =>
    this.orders().filter((order) => this.isPaid(order) && this.isPaidToday(order)),
  );
  totalPaidCents = computed(() =>
    this.paidOrders().reduce((sum, order) => sum + (order.total_cents || 0), 0),
  );
  sellableProducts = computed<PosSellableProduct[]>(() => {
    const legacyById = new Map(
      this.legacyProducts()
        .filter((product) => typeof product.id === 'number')
        .map((product) => [product.id as number, product]),
    );
    const tenantItems = this.tenantProducts()
      .filter((product) => product.is_active !== false && (product.price_cents || 0) > 0)
      .filter((product) => this.isProductAvailableToday(product))
      .map<PosSellableProduct>((product) => {
        const linkedLegacy =
          typeof product.product_id === 'number' ? legacyById.get(product.product_id) ?? null : null;
        return {
          id: product.id!,
          name: product.name,
          priceCents: product.price_cents,
          source: 'tenant_product',
          // Prefer the linked product category so the cashier category filter matches menu structure.
          category: linkedLegacy?.category || linkedLegacy?.subcategory || product.catalog_name || null,
          description: linkedLegacy?.description || null,
          ingredients: product.ingredients || linkedLegacy?.ingredients || null,
          imageFilename: product.image_filename || linkedLegacy?.image_filename || null,
          imageUrl: this.resolveSellableProductImageUrl(
            product.image_filename || linkedLegacy?.image_filename || null,
            product.tenant_id ?? linkedLegacy?.tenant_id ?? null,
          ),
          isActive: product.is_active !== false,
          tenantProductId: product.id!,
          legacyProductId: product.product_id ?? null,
          catalogName: product.catalog_name || null,
          questions: linkedLegacy?.questions || [],
        };
      });

    const tenantLinkedLegacyIds = new Set(
      tenantItems
        .map((item) => item.legacyProductId)
        .filter((value): value is number => typeof value === 'number' && value > 0),
    );

    const legacyItems = this.legacyProducts()
      .filter((product) => (product.price_cents || 0) > 0)
      .filter((product) => this.isProductAvailableToday(product))
      .filter((product) => !tenantLinkedLegacyIds.has(product.id!))
      .map<PosSellableProduct>((product) => ({
        id: product.id!,
        name: product.name,
        priceCents: product.price_cents,
        source: 'product',
        category: product.category || product.subcategory || null,
        description: product.description || null,
        ingredients: product.ingredients || null,
        imageFilename: product.image_filename || null,
        imageUrl: this.resolveSellableProductImageUrl(product.image_filename || null, product.tenant_id ?? null),
        isActive: true,
        tenantProductId: null,
        legacyProductId: product.id!,
        catalogName: null,
        questions: product.questions || [],
      }));

    return [...tenantItems, ...legacyItems].sort((a, b) => {
      if (a.source !== b.source) {
        return a.source === 'tenant_product' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  });
  activeProducts = computed(() => this.sellableProducts());
  productCategories = computed(() => {
    const categories = new Set<string>();
    for (const product of this.sellableProducts()) {
      if (product.category?.trim()) {
        categories.add(product.category.trim());
      }
    }
    return [...categories].sort((a, b) => a.localeCompare(b));
  });
  catalogSourceLabel = computed(() => {
    const tenantCount = this.tenantProducts().filter((product) => product.is_active !== false).length;
    const legacyCount = this.legacyProducts().length;
    if (tenantCount > 0 && legacyCount > 0) {
      return `${tenantCount} tenant menu items + ${legacyCount} legacy products`;
    }
    if (tenantCount > 0) {
      return `${tenantCount} tenant menu items loaded`;
    }
    if (legacyCount > 0) {
      return `Using ${legacyCount} legacy products`;
    }
    return 'No product source loaded';
  });
  filteredProducts = computed(() => {
    const term = this.productSearch().trim().toLowerCase();
    const category = this.selectedCategory().trim().toLowerCase();
    return this.activeProducts().filter((product) => {
      if (category && (product.category || '').toLowerCase() !== category) {
        return false;
      }
      if (!term) {
        return true;
      }
      const haystack = [
        product.name,
        product.category,
        product.catalogName,
        product.description,
        product.ingredients,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  });
  sortedTables = computed(() =>
    [...this.tables()].sort((a, b) => {
      if (!!a.is_active !== !!b.is_active) return a.is_active ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    }),
  );
  selectedTable = computed(
    () => this.tables().find((table) => table.id === this.selectedTableId()) ?? null,
  );
  selectedTableHasLiveBill = computed(() => !!this.selectedTable()?.active_order_id);
  cartBoundTable = computed(
    () => this.tables().find((table) => table.id === this.cartTableId()) ?? null,
  );
  checkoutTableSelectionId = computed(() => this.cartTableId() ?? this.selectedTableId());
  cartLockedToTable = computed(() => this.cartItemCount() > 0 && this.cartBoundTable() != null);
  cartTableConflict = computed(
    () =>
      this.cartTableId() != null &&
      this.selectedTableId() != null &&
      this.cartTableId() !== this.selectedTableId(),
  );
  cartItemCount = computed(() =>
    this.cartLines().reduce((sum, line) => sum + line.quantity, 0),
  );
  cartSubtotalCents = computed(() =>
    this.cartLines().reduce((sum, line) => sum + line.priceCents * line.quantity, 0),
  );
  visibleOrders = computed(() => this.sortQueueOrders(this.openOrders()));
  selectedOrder = computed(
    () => this.orders().find((order) => order.id === this.selectedOrderId()) ?? null,
  );
  selectedLiveBillOrder = computed(() => {
    const table = this.effectiveCheckoutTable();
    if (!table) return null;
    return this.tableCurrentOrder(table);
  });
  payableLiveBillOrder = computed(() => {
    const order = this.selectedLiveBillOrder();
    if (!order || this.isPaid(order) || this.isCancelledOrder(order)) {
      return null;
    }
    return order;
  });
  hitPayConfigured = computed(() => !!this.settings()?.hitpay_api_key?.trim());
  checkoutItemCount = computed(() => {
    const liveBillItems = this.checkoutExistingOrderItemCount();
    const cartItems = this.cartItemCount();
    if (cartItems > 0 && liveBillItems > 0) {
      return liveBillItems + cartItems;
    }
    if (cartItems > 0) {
      return cartItems;
    }
    return liveBillItems;
  });
  checkoutAmountCents = computed(() => {
    const liveBillTotal = this.payableLiveBillOrder()?.total_cents || 0;
    const cartTotal = this.cartSubtotalCents();
    if (cartTotal > 0 && liveBillTotal > 0) {
      return liveBillTotal + cartTotal;
    }
    if (cartTotal > 0) {
      return cartTotal;
    }
    return liveBillTotal;
  });
  hasCheckoutWork = computed(() => this.cartItemCount() > 0 || !!this.payableLiveBillOrder());
  tableScopedOrders = computed(() => {
    const tableId = this.effectiveCheckoutTable()?.id ?? null;
    if (tableId == null) {
      return [];
    }

    return this.sortQueueOrders(
      this.orders().filter((order) => order.table_id === tableId),
    );
  });
  posCurrentSessionOrders = computed(() => {
    const table = this.effectiveCheckoutTable();
    if (!table) {
      return [];
    }
    return this.tableScopedOrders().filter((order) => {
      return this.isCurrentTableSessionOrder(order, table);
    });
  });
  posHistoryOrders = computed(() => {
    const currentIds = new Set(this.posCurrentSessionOrders().map((order) => order.id));
    return this.tableScopedOrders().filter((order) => !currentIds.has(order.id));
  });
  posHistoryNeedsLaunchReview = computed(() => {
    const history = this.posHistoryOrders();
    if (history.length >= 8) {
      return true;
    }
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return history.some((order) => {
      const timestamp = this.backendTimestamp(order.created_at);
      return timestamp > 0 && Date.now() - timestamp > sevenDaysMs;
    });
  });
  queueOrders = computed(() => {
    const table = this.effectiveCheckoutTable();
    if (table?.id != null) {
      return this.tableScopedOrders();
    }
    return this.visibleOrders();
  });
  queueOrderGroups = computed<PosQueueOrderGroup[]>(() => {
    if (this.effectiveCheckoutTable()) {
      return [];
    }

    const groups = new Map<string, PosQueueOrderGroup>();
    for (const order of this.visibleOrders()) {
      const tableId = order.table_id ?? null;
      const label = (order.table_name || 'Counter').trim() || 'Counter';
      const key = tableId != null ? `table:${tableId}` : `counter:${label.toLowerCase()}`;
      const existing = groups.get(key);
      if (existing) {
        existing.orders.push(order);
        existing.totalCents += order.total_cents || 0;
        if (!existing.newestAt || this.backendTimestamp(order.created_at) > this.backendTimestamp(existing.newestAt)) {
          existing.newestAt = order.created_at || null;
        }
        continue;
      }

      groups.set(key, {
        key,
        label,
        tableId,
        orders: [order],
        totalCents: order.total_cents || 0,
        newestAt: order.created_at || null,
      });
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        orders: this.sortQueueOrders([...group.orders]),
      }))
      .sort((a, b) => this.compareQueueGroups(a, b));
  });
  showQueuePanel = computed(() => false);
  primaryCheckoutMode = computed<PosSettlementMode>(() => {
    const mode = this.selectedSettlementMode();
    if (mode === 'hitpay' && !this.hitPayConfigured()) {
      return 'card_terminal';
    }
    return mode;
  });
  settlementSummaryLabel = computed(() => {
    switch (this.primaryCheckoutMode()) {
      case 'card_terminal':
        return 'Terminal';
      case 'hitpay':
        return 'HitPay';
      case 'cash':
      default:
        return 'Cash';
    }
  });
  canSubmitCart = computed(() =>
    !!this.effectiveCheckoutTable() &&
    this.hasCheckoutWork() &&
    !this.cartTableConflict() &&
    !this.processingCheckout(),
  );

  canSendOrderToKitchen = computed(() =>
    !!this.effectiveCheckoutTable() &&
    this.cartItemCount() > 0 &&
    !this.cartTableConflict() &&
    !this.processingCheckout(),
  );

  checkoutPrimaryActionText(): string {
    const amount = this.checkoutSummaryTotalCopy();
    const prefix = this.cartItemCount() > 0 ? 'Send & ' : '';
    switch (this.primaryCheckoutMode()) {
      case 'card_terminal':
        return `${prefix}charge terminal - ${amount}`;
      case 'hitpay':
        return `${prefix}send HitPay - ${amount}`;
      case 'cash':
      default:
        return `${prefix}take cash - ${amount}`;
    }
  }

  tableOrdersActionLabel(table: CanvasTable): string {
    const count = table.id ? this.tableOrderCount(table.id) : 0;
    if (count <= 0) {
      return 'Orders';
    }
    return `Orders (${count})`;
  }

  posCurrentTicketsCopy(): string {
    const count = this.posCurrentSessionOrders().length;
    if (count <= 0) {
      return this.cartItemCount() > 0 ? 'New ticket not sent' : 'No tickets yet';
    }
    return `${count} current ticket${count === 1 ? '' : 's'}`;
  }

  posCartStateCopy(): string {
    const cartCount = this.cartItemCount();
    if (cartCount > 0) {
      return `${cartCount} in cart`;
    }

    const liveBill = this.payableLiveBillOrder();
    if (liveBill) {
      return `Bill #${liveBill.id} payable`;
    }

    if (this.canClearTable(this.effectiveCheckoutTable())) {
      return 'Paid - close table next';
    }

    return 'Ready for items';
  }

  posNextStepCopy(table: CanvasTable): string {
    if (this.canClearTable(table)) {
      return 'Payment received - close the table';
    }
    if (this.canReleaseEmptyTable(table)) {
      return 'Start order or release this empty table';
    }
    if (this.cartItemCount() > 0) {
      return 'Send this round to kitchen';
    }
    if (this.hasCheckoutWork()) {
      return 'Collect payment or add more items';
    }
    if (this.posCurrentSessionOrders().length > 0) {
      return 'Review current tickets or add another round';
    }
    return 'Start this table order';
  }

  posLoopSupportCopy(table: CanvasTable): string {
    if (this.canClearTable(table)) {
      return `${table.name} is settled. Clear it to move this visit into History.`;
    }
    if (this.canReleaseEmptyTable(table)) {
      return 'No bill has been sent yet. Release the table if this seating was a mistake.';
    }
    if (this.cartItemCount() > 0) {
      const cartCount = this.cartItemCount();
      const cartCopy = cartCount === 1 ? '1 add-on item' : `${cartCount} add-on items`;
      return `${cartCopy} not sent yet · ${this.checkoutSummaryTotalCopy()} cart value`;
    }
    if (this.hasCheckoutWork()) {
      return `${this.checkoutSummaryTableCopy()} · ${this.checkoutSummaryItemsCopy()} · ${this.checkoutSummaryTotalCopy()}`;
    }
    if (this.posCurrentSessionOrders().length > 0) {
      return 'Current-session tickets stay here until the table is cleared.';
    }
    return 'Choose items, review the cart, then checkout without leaving this table drawer.';
  }

  queueGroupSummaryLabel(group: PosQueueOrderGroup): string {
    const newestOrder = group.orders[0] ?? null;
    const freshness = newestOrder ? this.queueOrderAgeLabel(newestOrder) : 'Just now';
    const settleCount = group.orders.filter((order) => !this.isPaid(order) && this.isClosedOrder(order)).length;
    const liveCount = group.orders.filter((order) => !this.isPaid(order) && !this.isClosedOrder(order)).length;

    if (settleCount > 0) {
      return `${settleCount} awaiting payment · ${liveCount} live · ${freshness}`;
    }

    if (liveCount > 0) {
      return `${liveCount} live bill${liveCount === 1 ? '' : 's'} · ${freshness}`;
    }

    return `${group.orders.length} bill${group.orders.length === 1 ? '' : 's'} · ${freshness}`;
  }

  queueGroupSummaryCopy(group: PosQueueOrderGroup): string {
    const newestOrder = group.orders[0] ?? null;
    const freshness = newestOrder ? this.queueOrderAgeLabel(newestOrder) : 'Just now';
    const settleCount = group.orders.filter(
      (order) => !this.isPaid(order) && this.isClosedOrder(order),
    ).length;
    const liveCount = group.orders.filter(
      (order) => !this.isPaid(order) && !this.isClosedOrder(order),
    ).length;

    if (settleCount > 0) {
      return `${settleCount} payment | ${liveCount} live | ${freshness}`;
    }

    if (liveCount > 0) {
      return `${liveCount} live bill${liveCount === 1 ? '' : 's'} | ${freshness}`;
    }

    return `${group.orders.length} paid bill${group.orders.length === 1 ? '' : 's'} | ${freshness}`;
  }

  checkoutOutcomeHeadline(): string {
    const outcome = this.lastCheckoutOutcome();
    if (!outcome) {
      return 'Checkout completed';
    }

    switch (outcome.mode) {
      case 'cash':
        return `Cash collected - ${this.formatPrice(outcome.amountCents)}`;
      case 'card_terminal':
        return `Terminal settled - ${this.formatPrice(outcome.amountCents)}`;
      case 'hitpay':
        return `HitPay confirmed - ${this.formatPrice(outcome.amountCents)}`;
      default:
        return `Checkout completed - ${this.formatPrice(outcome.amountCents)}`;
    }
  }

  checkoutOutcomeSupport(): string {
    const outcome = this.lastCheckoutOutcome();
    if (!outcome) {
      return '';
    }

    return `${outcome.tableName} bill #${outcome.orderId} is complete.`;
  }

  queueOrderActionCopy(order: Order): string {
    if (this.isPaid(order)) {
      return 'View order';
    }

    if (this.isClosedOrder(order)) {
      return 'Collect payment';
    }

    return 'Open bill';
  }

  queueOrderAgeLabel(order: Order): string {
    const createdAt = this.backendTimestamp(order.created_at);
    if (!createdAt) {
      return 'Just now';
    }

    const minutes = Math.max(1, Math.floor((Date.now() - createdAt) / 60000));
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  queueGroupPrimaryActionLabel(group: PosQueueOrderGroup): string {
    const preferredOrder =
      group.orders.find((order) => !this.isPaid(order) && this.isClosedOrder(order)) ??
      group.orders.find((order) => !this.isPaid(order)) ??
      group.orders[0] ??
      null;

    if (preferredOrder && !this.isPaid(preferredOrder) && this.isClosedOrder(preferredOrder)) {
      return 'Settle';
    }

    if (group.tableId != null) {
      return 'Resume';
    }

    return 'Counter';
  }

  queueGroupPrimaryStateLabel(group: PosQueueOrderGroup): string {
    const preferredOrder =
      group.orders.find((order) => !this.isPaid(order) && this.isClosedOrder(order)) ??
      group.orders.find((order) => !this.isPaid(order)) ??
      group.orders[0] ??
      null;

    if (!preferredOrder) {
      return 'No action';
    }

    if (!this.isPaid(preferredOrder) && this.isClosedOrder(preferredOrder)) {
      return 'Ready for payment';
    }

    if (!this.isPaid(preferredOrder)) {
      return group.tableId != null ? 'Live table bill' : 'Live counter bill';
    }

    return 'Settled';
  }

  queueGroupActionHint(group: PosQueueOrderGroup): string {
    const preferredOrder =
      group.orders.find((order) => !this.isPaid(order) && this.isClosedOrder(order)) ??
      group.orders.find((order) => !this.isPaid(order)) ??
      group.orders[0] ??
      null;

    if (!preferredOrder) {
      return 'No cashier action';
    }

    if (!this.isPaid(preferredOrder) && this.isClosedOrder(preferredOrder)) {
      return 'Collect payment now';
    }

    if (!this.isPaid(preferredOrder)) {
      return 'Add items or settle later';
    }

    return 'View receipt if needed';
  }

  queueGroupStateBreakdownLabel(group: PosQueueOrderGroup): string {
    const settleCount = group.orders.filter((order) => !this.isPaid(order) && this.isClosedOrder(order)).length;
    const liveCount = group.orders.filter((order) => !this.isPaid(order) && !this.isClosedOrder(order)).length;
    const paidCount = group.orders.filter((order) => this.isPaid(order)).length;

    if (settleCount > 0) {
      return liveCount > 0 ? `${settleCount} settle | ${liveCount} live` : `${settleCount} settle`;
    }

    if (liveCount > 0) {
      return paidCount > 0 ? `${liveCount} live | ${paidCount} paid` : `${liveCount} live`;
    }

    return paidCount === 1 ? '1 paid' : `${paidCount} paid`;
  }

  queueGroupOrdersActionLabel(group: PosQueueOrderGroup): string {
    const count = group.orders.length;
    return count === 1 ? 'History' : `History ${count}`;
  }

  compareQueueGroups(a: PosQueueOrderGroup, b: PosQueueOrderGroup): number {
    const aLeadOrder = a.orders[0] ?? null;
    const bLeadOrder = b.orders[0] ?? null;
    const aRank = aLeadOrder ? this.queueOrderRank(aLeadOrder) : Number.MAX_SAFE_INTEGER;
    const bRank = bLeadOrder ? this.queueOrderRank(bLeadOrder) : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) {
      return aRank - bRank;
    }

    const newestDiff = this.backendTimestamp(b.newestAt) - this.backendTimestamp(a.newestAt);
    if (newestDiff !== 0) {
      return newestDiff;
    }

    if (a.tableId != null && b.tableId != null) {
      return a.tableId - b.tableId;
    }

    if (a.tableId != null) {
      return -1;
    }

    if (b.tableId != null) {
      return 1;
    }

    return a.label.localeCompare(b.label);
  }

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const tableId = Number(params.get('tableId'));
      const orderId = Number(params.get('orderId'));
      const reservationId = Number(params.get('reservationId'));
      const reservationGuest = (params.get('reservationGuest') || '').trim();
      const reservationPhone = (params.get('reservationPhone') || '').trim();
      const reservationPartySize = Number(params.get('reservationPartySize'));
      const reservationNote = (params.get('reservationNotes') || '').trim();
      const queueEntryId = Number(params.get('queueEntryId'));
      const queueGuest = (params.get('queueGuest') || '').trim();
      const queuePhone = (params.get('queuePhone') || '').trim();
      const queuePartySize = Number(params.get('queuePartySize'));
      const queueNote = (params.get('queueNotes') || '').trim();
      const normalizedTableId = Number.isFinite(tableId) && tableId > 0 ? tableId : null;
      const normalizedOrderId = Number.isFinite(orderId) && orderId > 0 ? orderId : null;
      const hasExplicitSelection = normalizedTableId != null || normalizedOrderId != null;
      const hasReservationPrefill =
        (Number.isFinite(reservationId) && reservationId > 0) ||
        !!reservationGuest ||
        !!reservationPhone ||
        (Number.isFinite(reservationPartySize) && reservationPartySize > 0) ||
        !!reservationNote;

      this.reservationPrefill.set(
        hasReservationPrefill
          ? {
              reservationId: Number.isFinite(reservationId) && reservationId > 0 ? reservationId : null,
              guestName: reservationGuest || null,
              phone: reservationPhone || null,
              partySize:
                Number.isFinite(reservationPartySize) && reservationPartySize > 0
                  ? reservationPartySize
                  : null,
              note: reservationNote || null,
            }
          : null,
      );
      const hasQueuePrefill =
        (Number.isFinite(queueEntryId) && queueEntryId > 0) ||
        !!queueGuest ||
        !!queuePhone ||
        (Number.isFinite(queuePartySize) && queuePartySize > 0) ||
        !!queueNote;

      this.queuePrefill.set(
        hasQueuePrefill
          ? {
              queueEntryId: Number.isFinite(queueEntryId) && queueEntryId > 0 ? queueEntryId : null,
              guestName: queueGuest || null,
              phone: queuePhone || null,
              partySize: Number.isFinite(queuePartySize) && queuePartySize > 0 ? queuePartySize : null,
              note: queueNote || null,
            }
          : null,
      );

      if (hasExplicitSelection) {
        this.selectedTableId.set(normalizedTableId);
        this.selectedOrderId.set(normalizedOrderId);
        this.tableWorkspaceOpen.set(true);
      } else if (this.loading()) {
        this.selectedTableId.set(null);
        this.selectedOrderId.set(null);
      }

      if (!this.loading()) {
        if (hasExplicitSelection) {
          this.applyFocusFromQuery();
        }
      }
    });

    this.api.queueUpdates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.scheduleQueueBoardRefresh());
    this.api.connectWebSocket();
    this.destroyRef.onDestroy(() => {
      if (this.queueRefreshTimer) {
        clearTimeout(this.queueRefreshTimer);
      }
    });

    this.loadData();
  }

  @HostListener('document:keydown', ['$event'])
  handleCashierShortcut(event: KeyboardEvent): void {
    if (event.defaultPrevented) {
      return;
    }

    const key = event.key.toLowerCase();
    const target = event.target as HTMLElement | null;
    const isTypingTarget =
      !!target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable);

    if (key === 'escape' && this.productQuestionDialogProduct()) {
      event.preventDefault();
      this.closeProductQuestionDialog();
      return;
    }

    if (key === 'escape' && this.pendingClearTable()) {
      event.preventDefault();
      this.cancelClearTable();
      return;
    }

    if (key === 'escape' && this.tableWorkspaceOpen()) {
      event.preventDefault();
      this.closeTableWorkspace();
      return;
    }

    if (isTypingTarget) {
      return;
    }

    if (key === 'f2') {
      event.preventDefault();
      this.scrollToCatalog();
      this.focusCatalogSearch();
      return;
    }

    if (key === 'f4') {
      event.preventDefault();
      this.scrollToPaymentDock();
      return;
    }

    if (key === 'f6') {
      event.preventDefault();
      this.selectNextReadyTable();
      return;
    }

    if (key === 'f8' && this.canSubmitCart()) {
      event.preventDefault();
      void this.submitCart(this.primaryCheckoutMode());
    }
  }

  loadData(): void {
    void this.refreshPosData({ setLoading: true, clearError: true });
  }

  private async refreshPosData(
    options: {
      setLoading?: boolean;
      clearError?: boolean;
      applyRouteFocus?: boolean;
      processHitPayReturn?: boolean;
    } = {},
  ): Promise<void> {
    const setLoading = options.setLoading !== false;
    const clearError = options.clearError !== false;
    const applyRouteFocus = options.applyRouteFocus !== false;
    const processHitPayReturn = options.processHitPayReturn !== false;

    if (setLoading) {
      this.loading.set(true);
    }
    if (clearError) {
      this.error.set(null);
    }
    const loadWarnings: string[] = [];

    try {
      const { settings, tables, orders, tenantProducts, legacyProducts, guestQueueEntries } = await firstValueFrom(forkJoin({
      settings: this.api.getTenantServiceSettings().pipe(catchError(() => of(null))),
      tables: this.api.getTablesWithStatus().pipe(
        catchError(() => {
          loadWarnings.push('tables');
          return of([]);
        }),
      ),
      orders: this.api.getOrders().pipe(
        catchError(() => {
          loadWarnings.push('orders');
          return of([]);
        }),
      ),
      tenantProducts: this.api.getTenantProducts(true).pipe(
        catchError(() => {
          loadWarnings.push('tenant menu');
          return of([]);
        }),
      ),
      // Keep the cashier floor responsive. Product questions are optional for the floor/menu
      // shell and should not block POS startup for a large imported catalog.
      legacyProducts: this.api.getProducts().pipe(
        catchError(() => {
          loadWarnings.push('legacy menu');
          return of([]);
        }),
      ),
      guestQueueEntries: this.api.getGuestQueue().pipe(
        catchError(() => {
          loadWarnings.push('guest queue');
          return of([]);
        }),
      ),
      }));
      this.settings.set(settings);
      this.tables.set(tables);
      this.orders.set(orders);
      this.tenantProducts.set(tenantProducts);
      this.legacyProducts.set(legacyProducts);
      this.guestQueueEntries.set(guestQueueEntries);
      if (setLoading) {
        this.loading.set(false);
      }
      if (loadWarnings.length) {
        this.error.set(`POS loaded partially. Refresh if ${loadWarnings.join(', ')} data is needed.`);
      }
      if (this.focusNextClearTableAfterReload) {
        this.focusNextClearTableAfterReload = false;
        this.focusReadyTableAfterReload();
        return;
      }
      if (applyRouteFocus && this.routeHasExplicitSelection()) {
        this.applyFocusFromQuery();
      }
      if (processHitPayReturn) {
        void this.processHitPayReturnFromQuery();
      }
    } catch (err) {
      if (setLoading) {
        this.loading.set(false);
      }
      this.error.set(this.getErrorMessage(err, 'Unable to load cashier POS data.'));
    }
  }

  selectTable(table: CanvasTable): void {
    if (!table.id) return;
    this.selectedTableId.set(table.id);
    const linkedOrder = this.tableCurrentOrder(table);
    this.selectedOrderId.set(linkedOrder?.id ?? null);
    this.tableHistoryExpanded.set(false);
    this.syncSelectionToQuery(table.id, linkedOrder?.id ?? null);
  }

  openTableWorkspace(table: CanvasTable): void {
    this.tableWorkspaceOpen.set(true);
    this.posDrawerView.set(this.tableCurrentOrder(table) ? 'orders' : 'menu');
    this.focusTableForSale(table);
  }

  closeTableWorkspace(): void {
    if (this.cartItemCount() > 0) {
      const tableName = this.cartBoundTable()?.name || this.selectedTable()?.name || 'this table';
      this.notice.set(`Finish or clear ${tableName}'s current ticket before returning to the floor.`);
      this.scrollToPaymentDock();
      return;
    }
    this.tableWorkspaceOpen.set(false);
    this.productQuestionDialogProduct.set(null);
    this.productQuestionAnswers.set({});
    this.tableHistoryExpanded.set(false);
    this.posDrawerView.set('menu');
    this.selectedTableId.set(null);
    this.selectedOrderId.set(null);
    this.syncSelectionToQuery(null, null);
  }

  setPosDrawerView(view: PosDrawerView): void {
    if (view === 'menu' && this.paidTableNeedsClose(this.effectiveCheckoutTable())) {
      const tableName = this.effectiveCheckoutTable()?.name || 'This table';
      this.notice.set(`${tableName} is already paid. Close and reset the table before adding another round.`);
      this.posDrawerView.set('orders');
      return;
    }
    this.posDrawerView.set(view);
  }

  selectTableById(rawValue: string | number | null): void {
    const tableId = Number(rawValue);
    if (!Number.isFinite(tableId) || tableId <= 0) {
      this.selectedTableId.set(null);
      this.selectedOrderId.set(null);
      this.syncSelectionToQuery(null, null);
      return;
    }

    const table = this.tables().find((item) => item.id === tableId) ?? null;
    if (table) {
      this.selectTable(table);
    }
  }

  selectOrder(order: Order): void {
    this.selectedOrderId.set(order.id ?? null);
    if (order.table_id != null) {
      this.selectedTableId.set(order.table_id);
    }
    this.tableHistoryExpanded.set(false);
    this.syncSelectionToQuery(order.table_id ?? null, order.id ?? null);
  }

  toggleTableHistory(): void {
    this.tableHistoryExpanded.update((value) => !value);
  }

  selectSettlementMode(mode: PosSettlementMode): void {
    if (mode === 'hitpay' && !this.hitPayConfigured()) {
      this.notice.set('HitPay is not configured in this local tenant yet, so manual settlement stays active.');
      return;
    }
    this.notice.set(null);
    this.selectedSettlementMode.set(mode);
  }

  scrollToCartLines(): void {
    this.scrollToElement('cart-lines');
  }

  scrollToCatalog(): void {
    if (this.tableWorkspaceOpen()) {
      this.posDrawerView.set('menu');
      this.focusCatalogSearch();
      return;
    }
    this.scrollToElement('cashier-catalog');
  }

  scrollToPaymentDock(): void {
    if (this.tableWorkspaceOpen()) {
      this.posDrawerView.set('checkout');
      return;
    }
    this.scrollToElement('payment-dock');
  }

  focusCatalogSearch(): void {
    if (typeof document === 'undefined') return;
    const inputId = this.tableWorkspaceOpen() ? 'pos-drawer-catalog-search' : 'cashier-catalog-search';
    window.requestAnimationFrame(() => {
      const input = document.getElementById(inputId) as HTMLInputElement | null;
      input?.focus();
    });
  }

  clearProductSearch(): void {
    this.productSearch.set('');
    this.focusCatalogSearch();
  }

  focusLiveBillForItems(): void {
    this.dismissCheckoutOutcome();
    const liveBill = this.payableLiveBillOrder();
    if (liveBill) {
      this.selectOrder(liveBill);
      this.notice.set(`Continuing bill #${liveBill.id}. Add more items from the catalog.`);
    } else if (this.effectiveCheckoutTable()) {
      this.notice.set(null);
    }

    this.scrollToCatalog();
  }

  focusLiveBillForSettlement(): void {
    this.dismissCheckoutOutcome();
    const liveBill = this.payableLiveBillOrder();
    if (liveBill) {
      this.selectOrder(liveBill);
      this.notice.set(`Bill #${liveBill.id} is ready for settlement.`);
    } else if (this.effectiveCheckoutTable()) {
      this.notice.set(null);
    }

    this.scrollToPaymentDock();
  }

  hasProductQuestions(product: PosSellableProduct): boolean {
    return (product.questions?.length ?? 0) > 0;
  }

  requiredQuestionCount(product: PosSellableProduct): number {
    return (product.questions ?? []).filter((question) => !!question.required).length;
  }

  unansweredRequiredQuestionCount(product: PosSellableProduct): number {
    return (product.questions ?? []).filter((question) => question.required && !this.isQuestionAnswered(question)).length;
  }

  isQuestionAnswered(question: ProductQuestion): boolean {
    const value = this.questionAnswerValue(question);
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value);
    }
    return String(value ?? '').trim().length > 0;
  }

  canSubmitProductQuestionDialog(): boolean {
    const product = this.productQuestionDialogProduct();
    if (!product) {
      return false;
    }
    return this.unansweredRequiredQuestionCount(product) === 0;
  }

  selectedQuestionCount(product: PosSellableProduct): number {
    return (product.questions ?? []).filter((question) => this.isQuestionAnswered(question)).length;
  }

  productDialogFooterHeadline(product: PosSellableProduct): string {
    if (!this.canSubmitProductQuestionDialog()) {
      const remaining = this.unansweredRequiredQuestionCount(product);
      return `${remaining} required choice${remaining === 1 ? '' : 's'} left`;
    }

    const selected = this.selectedQuestionCount(product);
    if (selected > 0) {
      return `${selected} option${selected === 1 ? '' : 's'} selected`;
    }

    return this.formatPrice(product.priceCents);
  }

  productDialogFooterSummary(product: PosSellableProduct): string {
    if (!this.canSubmitProductQuestionDialog()) {
      return 'Answer the required questions, then send this item into the ticket.';
    }

    if (this.hasPayableLiveBill()) {
      return 'This item will be appended to the live bill.';
    }

    return 'This item is ready to be added to the current ticket.';
  }

  productActionLabel(product: PosSellableProduct): string {
    const targetTable = this.cartTargetTable();
    if (!targetTable && !this.hasReadyTableForNewCart()) {
      return 'No table ready';
    }
    if (!targetTable) {
      return 'Select table';
    }
    if (this.hasPayableLiveBill()) {
      return this.hasProductQuestions(product) ? 'Customize item' : 'Add to order';
    }
    if (this.hasProductQuestions(product)) {
      return 'Customize';
    }
    return this.cartQuantityFor(product.id!) > 0 ? 'Add more' : 'Add';
  }

  productSourceCaption(product: PosSellableProduct): string {
    if (this.hasPayableLiveBill()) {
      return 'Add-on to bill';
    }
    return product.source === 'tenant_product' ? 'Menu' : 'Quick item';
  }

  checkoutIntroTitle(): string {
    const table = this.effectiveCheckoutTable();
    if (this.hasPayableLiveBill()) {
      return 'Live bill ready';
    }
    if (table) {
      return table.name;
    }
    return 'Select a table';
  }

  checkoutIntroCopy(): string {
    const table = this.effectiveCheckoutTable();
    if (this.hasPayableLiveBill()) {
      return 'Add items or collect payment.';
    }
    if (table) {
      return 'Add items to start the order.';
    }
    return 'Choose a table to begin.';
  }

  emptyCartHint(): string {
    if (this.payableLiveBillOrder()) {
      return 'Add items or pay now.';
    }
    if (this.selectedTableHasServiceTicket()) {
      return 'Add items to continue the order.';
    }
    return 'Add items to begin.';
  }

  cartTitle(): string {
    if (this.payableLiveBillOrder() && this.cartItemCount() > 0) {
      return 'Live order + add-ons';
    }
    return this.payableLiveBillOrder() ? 'Live order' : 'Current ticket';
  }

  confirmProductButtonLabel(): string {
    return this.hasPayableLiveBill() ? 'Add to order' : 'Add to ticket';
  }

  primarySettlementModeLabel(): string {
    switch (this.primaryCheckoutMode()) {
      case 'cash':
        return 'Cash';
      case 'card_terminal':
        return 'Terminal';
      case 'hitpay':
        return 'HitPay';
      default:
        return 'Settlement';
    }
  }

  checkoutSummaryTableCopy(): string {
    const table = this.effectiveCheckoutTable();
    if (!table) {
      return 'No table selected';
    }
    return table.name;
  }

  checkoutSummaryItemsCopy(): string {
    const count = this.checkoutItemCount();
    return count === 1 ? '1 item' : `${count} items`;
  }

  checkoutSummaryTotalCopy(): string {
    return this.formatPrice(this.checkoutAmountCents());
  }

  settlementSummaryCaption(): string {
    if (this.hasPayableLiveBill() && this.cartItemCount() > 0) {
      return 'Settle the live bill with the new items together.';
    }
    if (this.hasPayableLiveBill()) {
      return 'Live bill ready for payment.';
    }
    if (this.cartItemCount() > 0) {
      return 'Ready for payment.';
    }
    return 'Choose a table and add items.';
  }

  settlementActionSupportCopy(): string {
    if (this.cartItemCount() > 0 && this.hasPayableLiveBill()) {
      return 'Send the add-ons and settle the full live bill now, or send this round first and collect payment later.';
    }
    if (this.cartItemCount() > 0) {
      return 'For dine-in, send the order to kitchen first. Use Send & pay now only for immediate counter settlement.';
    }
    return `Collect ${this.checkoutSummaryTotalCopy()} and close the bill.`;
  }

  sendOrderButtonLabel(): string {
    if (this.hasPayableLiveBill()) {
      return 'Send add-on round';
    }
    return 'Send order';
  }

  checkoutOutcomeTitle(): string {
    const outcome = this.lastCheckoutOutcome();
    if (!outcome) {
      return 'Checkout completed';
    }

    switch (outcome.mode) {
      case 'cash':
        return `Cash collected - ${this.formatPrice(outcome.amountCents)}`;
      case 'card_terminal':
        return `Terminal settled - ${this.formatPrice(outcome.amountCents)}`;
      case 'hitpay':
        return `HitPay confirmed - ${this.formatPrice(outcome.amountCents)}`;
      default:
        return `Checkout completed - ${this.formatPrice(outcome.amountCents)}`;
    }
  }

  checkoutOutcomeSubtitle(): string {
    const outcome = this.lastCheckoutOutcome();
    if (!outcome) {
      return '';
    }

    return `${outcome.tableName} bill #${outcome.orderId} is complete. Close the table when guests leave.`;
  }
  hitPayStateLabel(): string {
    switch (this.hitPayFlowState()) {
      case 'redirecting':
        return 'Opening HitPay';
      case 'confirming':
        return 'Confirming payment';
      case 'cancelled':
        return 'HitPay cancelled';
      case 'failed':
        return 'HitPay needs attention';
      case 'idle':
      default:
        return 'HitPay';
    }
  }

  hitPayStateCopy(): string {
    switch (this.hitPayFlowState()) {
      case 'redirecting':
        return 'The hosted checkout is opening for this table bill.';
      case 'confirming':
        return 'Waiting for the cashier return to confirm the hosted payment and close the ticket.';
      case 'cancelled':
        return 'No payment was taken. The bill is still open: retry HitPay, use the terminal, or return to the cart.';
      case 'failed':
        return 'Payment was not confirmed. Do not close the table yet: retry, switch method, or return to the cart.';
      case 'idle':
      default:
        return '';
    }
  }

  paymentRecoveryVisible(): boolean {
    const state = this.hitPayFlowState();
    return state === 'cancelled' || state === 'failed';
  }

  canRetryHitPayPayment(): boolean {
    return this.hitPayConfigured() && this.canSubmitCart();
  }

  retryHitPayPayment(): void {
    if (!this.canRetryHitPayPayment()) {
      return;
    }
    this.hitPayFlowState.set('idle');
    this.selectSettlementMode('hitpay');
    void this.submitCart('hitpay');
  }

  switchPaymentRecoveryToTerminal(): void {
    if (this.processingCheckout()) {
      return;
    }
    this.hitPayFlowState.set('idle');
    this.selectSettlementMode('card_terminal');
    this.notice.set('Terminal selected. Keep this bill open until the card machine confirms payment.');
  }

  backToCartFromPaymentRecovery(): void {
    if (this.processingCheckout()) {
      return;
    }
    this.hitPayFlowState.set('idle');
    if (this.tableWorkspaceOpen()) {
      this.setPosDrawerView('menu');
    } else {
      this.scrollToCartLines();
    }
    this.notice.set('Payment was not completed. Review the cart or current bill before retrying.');
  }

  checkoutTotalCaption(): string | null {
    const liveBillTotal = this.payableLiveBillOrder()?.total_cents || 0;
    const cartTotal = this.cartSubtotalCents();
    if (liveBillTotal > 0 && cartTotal > 0) {
      return `${this.formatPrice(liveBillTotal)} live bill + ${this.formatPrice(cartTotal)} add-on`;
    }
    if (liveBillTotal > 0) {
      return 'Open bill ready to settle';
    }
    if (cartTotal > 0) {
      return 'New cashier bill';
    }
    return null;
  }

  queuePanelEyebrow(): string {
    const table = this.effectiveCheckoutTable();
    if (table) {
      return 'Table recovery';
    }
    return 'Cashier queue';
  }

  queuePanelTitle(): string {
    const table = this.effectiveCheckoutTable();
    if (table) {
      return `${table.name} history`;
    }
    return 'Cashier queue';
  }

  queuePanelSubtitle(): string {
    const table = this.effectiveCheckoutTable();
    if (table) {
      return 'Current-session orders stay in the table drawer. Previous unpaid bills are marked for review.';
    }
    return 'Grouped by table for fast cashier follow-up.';
  }

  queuePanelEmptyCopy(): string {
    const table = this.effectiveCheckoutTable();
    if (table) {
      return `No other tickets are linked to ${table.name}.`;
    }
    return 'No tickets need cashier attention right now.';
  }

  queueHistoryPrimaryActionLabel(order: Order): string {
    if (!this.isPaid(order) && this.isClosedOrder(order)) {
      return 'Pay';
    }
    if (!this.isPaid(order)) {
      return 'Open';
    }
    return 'Receipt';
  }

  tableOrderCountForTable(table: CanvasTable): number {
    if (!table.id) {
      return 0;
    }

    return this.orders().filter((order) => order.table_id === table.id).length;
  }

  tableOrdersButtonLabel(table: CanvasTable): string {
    const count = this.tableOrderCountForTable(table);
    if (count <= 0) {
      return 'Orders';
    }
    if (count === 1) {
      return 'Orders · 1';
    }
    return `Orders · ${count}`;
  }

  queueHistoryOrders(): Order[] {
    if (this.effectiveCheckoutTable()) {
      return this.posHistoryOrders();
    }
    return this.sortQueueOrders(this.queueOrders());
  }

  queueHistoryHasOverflow(): boolean {
    return this.queueHistoryOrders().length > this.queueVisibleHistoryOrders().length;
  }

  queueVisibleHistoryOrders(): Order[] {
    const history = this.queueHistoryOrders();
    if (this.tableHistoryExpanded()) {
      return history;
    }
    const safeReceipts = history.filter((order) => this.isPaid(order));
    return safeReceipts.slice(0, this.queuePreviewLimit);
  }

  queueHistoryToggleLabel(): string {
    if (this.tableHistoryExpanded()) {
      return 'Hide review';
    }
    if (this.queueHistoryOpenCount() > 0) {
      return 'Review stale bills';
    }
    return 'Show all';
  }

  queueHistoryOpenCount(): number {
    return this.queueHistoryOrders().filter((order) => !this.isPaid(order)).length;
  }

  queueHistoryPaidCount(): number {
    return this.queueHistoryOrders().filter((order) => this.isPaid(order)).length;
  }

  queueHistoryLatestLabel(): string {
    const history = this.queueHistoryOrders();
    const latest = history.find((order) => this.isPaid(order)) ?? history[0] ?? null;
    if (!latest) {
      return 'No recent bills';
    }
    return `${this.isPaid(latest) ? 'Last settled' : 'Previous unpaid'} / ${this.queueOrderAgeLabel(latest)}`;
  }

  queueSettlementCount(): number {
    return this.queueOrders().filter((order) => !this.isPaid(order) && this.isClosedOrder(order)).length;
  }

  queueLiveBillCount(): number {
    return this.queueOrders().filter((order) => !this.isPaid(order) && !this.isClosedOrder(order)).length;
  }

  queuePaidReviewCount(): number {
    return this.queueOrders().filter((order) => this.isPaid(order)).length;
  }

  queuePreviewOrders(): Order[] {
    return (this.effectiveCheckoutTable() ? this.queueHistoryOrders() : this.queueOrders()).slice(
      0,
      this.queuePreviewLimit,
    );
  }

  queueGroupPreviewOrders(group: PosQueueOrderGroup): Order[] {
    return group.orders.slice(0, this.queuePreviewLimit);
  }

  queueGroupLeadOrder(group: PosQueueOrderGroup): Order | null {
    return group.orders[0] ?? null;
  }

  queueGroupSummary(group: PosQueueOrderGroup): string {
    const newestAt = group.newestAt ? this.formatDate(group.newestAt) : 'just now';
    return `${group.orders.length} open bill${group.orders.length === 1 ? '' : 's'} · latest ${newestAt}`;
  }

  queueGroupStatusLabel(order: Order): string {
    if (this.isPaid(order)) {
      return 'Paid';
    }

    const status = String(order.status || '').trim();
    if (!status) {
      return 'Open';
    }
    if (status.toLowerCase() === 'open') {
      return 'Open';
    }
    return status.replace(/_/g, ' ');
  }

  queueOrderPreview(order: Order): string {
    const firstItem = order.items?.[0];
    const itemCount = order.items?.length || 0;
    if (!firstItem) {
      return itemCount === 1 ? '1 item' : `${itemCount} items`;
    }

    if (itemCount === 1) {
      return `${firstItem.quantity || 1} x ${firstItem.product_name}`;
    }

    return `${firstItem.quantity || 1} x ${firstItem.product_name} + ${itemCount - 1} more`;
  }

  queueOrderContext(order: Order): string {
    const tableName = (order.table_name || '').trim();
    const customerName = (order.customer_name || '').trim();
    if (tableName && customerName) {
      return `${tableName} · ${customerName}`;
    }
    if (tableName) {
      return tableName;
    }
    if (customerName) {
      return customerName;
    }
    return 'Counter ticket';
  }

  customerMenuUrl(table: CanvasTable | null | undefined): string | null {
    if (!table?.token) return null;
    const baseUrl = `${getCustomerPublicOrigin()}/menu/${table.token}`;
    return table.qr_access
      ? `${baseUrl}?qr_access=${encodeURIComponent(table.qr_access)}`
      : baseUrl;
  }

  displayedCustomerQrUrl(table: CanvasTable | null | undefined): string | null {
    if (!table?.id) return null;
    if (this.qrHandoffTableId() === table.id && this.qrHandoffUrl()) {
      return this.qrHandoffUrl();
    }
    return this.customerMenuUrl(table);
  }

  async openCustomerMenu(table: CanvasTable): Promise<void> {
    const url = this.customerMenuUrl(table);
    if (!url || typeof window === 'undefined') return;
    this.error.set(null);
    try {
      await this.ensureTableReady(table);
      this.markTableLocallyActive(table);
      this.showCustomerQrHandoff(table, url);
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      this.notice.set(
        opened
          ? `${table.name} QR is open. The QR card and link are also shown below.`
          : `${table.name} QR is ready below. If the browser blocked the new tab, use the QR card or copy the link.`,
      );
      await this.refreshPosData({ setLoading: false, clearError: false });
    } catch (err) {
      this.error.set(this.getErrorMessage(err, `Unable to open QR ordering for ${table.name}.`));
    }
  }

  async copyCustomerMenuLink(table: CanvasTable): Promise<void> {
    const url = this.customerMenuUrl(table);
    if (!url) {
      return;
    }
    this.error.set(null);
    try {
      await this.ensureTableReady(table);
      this.markTableLocallyActive(table);
      await this.copyCustomerMenuUrl(table, url);
      await this.refreshPosData({ setLoading: false, clearError: false });
    } catch (err) {
      this.error.set(this.getErrorMessage(err, `Unable to prepare QR ordering for ${table.name}.`));
    }
  }

  openCustomerMenuUrl(url: string, table: CanvasTable): void {
    if (!url || typeof window === 'undefined') return;
    this.showCustomerQrHandoff(table, url);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    this.notice.set(
      opened
        ? `${table.name} customer QR opened in a new tab.`
        : `${table.name} customer QR is ready below. Copy the link if the browser blocked the new tab.`,
    );
  }

  async copyCustomerMenuUrl(table: CanvasTable, url: string): Promise<void> {
    this.showCustomerQrHandoff(table, url);
    if (!url || typeof navigator === 'undefined' || !navigator.clipboard) {
      this.error.set('This browser cannot copy the QR link automatically. Use the visible link or Open instead.');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this.qrLinkCopiedTableId.set(table.id ?? null);
      this.notice.set(`${table.name} QR link copied. Guests can order from the current table session.`);
      window.setTimeout(() => {
        if (this.qrLinkCopiedTableId() === table.id) {
          this.qrLinkCopiedTableId.set(null);
        }
      }, 1800);
    } catch {
      this.error.set('Could not copy the QR link from this browser. Use the visible link or Open instead.');
    }
  }

  hideCustomerQrHandoff(): void {
    this.qrHandoffTableId.set(null);
    this.qrHandoffUrl.set(null);
  }

  private showCustomerQrHandoff(table: CanvasTable, url: string): void {
    this.qrHandoffTableId.set(table.id ?? null);
    this.qrHandoffUrl.set(url);
  }

  private markTableLocallyActive(table: CanvasTable): void {
    if (!table.id) return;
    table.is_active = true;
    this.tables.update((tables) =>
      tables.map((candidate) =>
        candidate.id === table.id ? { ...candidate, is_active: true } : candidate,
      ),
    );
  }

  queueOrderActionLabel(order: Order): string {
    if (this.isPaid(order)) {
      return 'View bill';
    }
    return 'Open bill';
  }

  addProduct(product: PosSellableProduct): void {
    this.lastCheckoutOutcome.set(null);
    if (this.hasProductQuestions(product)) {
      this.openProductQuestionDialog(product);
      return;
    }
    this.addProductToCart(product);
  }

  openProductQuestionDialog(product: PosSellableProduct): void {
    this.productQuestionDialogProduct.set(product);
    this.productQuestionAnswers.set({});
  }

  closeProductQuestionDialog(): void {
    this.productQuestionDialogProduct.set(null);
    this.productQuestionAnswers.set({});
  }

  setProductQuestionAnswer(
    question: ProductQuestion,
    value: string | number | string[],
  ): void {
    this.productQuestionAnswers.update((answers) => ({
      ...answers,
      [String(question.id)]: value,
    }));
  }

  toggleProductQuestionOption(question: ProductQuestion, option: string, checked: boolean): void {
    const key = String(question.id);
    this.productQuestionAnswers.update((answers) => {
      const current = Array.isArray(answers[key]) ? [...(answers[key] as string[])] : [];
      const next = checked ? [...new Set([...current, option])] : current.filter((value) => value !== option);
      return { ...answers, [key]: next };
    });
  }

  questionAnswerValue(question: ProductQuestion): string | number | string[] {
    return this.productQuestionAnswers()[String(question.id)] ?? '';
  }

  isQuestionMultiChoice(question: ProductQuestion): boolean {
    return typeof question.options === 'object' && !!question.options && 'choices' in question.options && !!question.options.multi;
  }

  questionChoiceOptions(question: ProductQuestion): string[] {
    if (Array.isArray(question.options)) {
      return question.options;
    }
    if (typeof question.options === 'object' && !!question.options && 'choices' in question.options) {
      return question.options.choices;
    }
    return [];
  }

  questionScaleMin(question: ProductQuestion): number {
    if (typeof question.options === 'object' && !!question.options && 'min' in question.options) {
      return question.options.min;
    }
    return 1;
  }

  questionScaleMax(question: ProductQuestion): number {
    if (typeof question.options === 'object' && !!question.options && 'max' in question.options) {
      return question.options.max;
    }
    return 10;
  }

  parseNumericQuestionValue(rawValue: unknown, fallback: number): number {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  isQuestionOptionChecked(question: ProductQuestion, option: string): boolean {
    const value = this.questionAnswerValue(question);
    return Array.isArray(value) ? value.includes(option) : false;
  }

  confirmProductQuestionDialog(): void {
    const product = this.productQuestionDialogProduct();
    if (!product) {
      return;
    }

    for (const question of product.questions ?? []) {
      if (!question.required) {
        continue;
      }
      const value = this.productQuestionAnswers()[String(question.id)];
      if (Array.isArray(value) && value.length === 0) {
        this.error.set(`Answer required: ${question.label}.`);
        return;
      }
      if (value == null || value === '') {
        this.error.set(`Answer required: ${question.label}.`);
        return;
      }
    }

    this.error.set(null);
    this.addProductToCart(product, this.productQuestionAnswers());
    this.closeProductQuestionDialog();
  }

  private addProductToCart(
    product: PosSellableProduct,
    customizationAnswers?: Record<string, string | number | string[]>,
  ): void {
    const table = this.cartTargetTable();
    if (!table?.id) {
      this.error.set('Select a table from the floor before adding menu items.');
      this.notice.set(null);
      return;
    }
    if (this.paidTableNeedsClose(table)) {
      this.error.set(`${table.name} is already paid. Close and reset the table before adding another round.`);
      this.notice.set(null);
      this.posDrawerView.set('orders');
      return;
    }

    if (this.selectedTableId() !== table.id) {
      this.selectedTableId.set(table.id);
    }

    const cartTableId = this.cartTableId();
    if (cartTableId != null && cartTableId !== table.id) {
      this.error.set(`This cart is already bound to ${this.cartBoundTable()?.name || 'another table'}.`);
      return;
    }

    this.error.set(null);
    this.notice.set(null);

    if (cartTableId == null) {
      this.cartTableId.set(table.id!);
    }

    this.cartLines.update((lines) => {
      const next = [...lines];
      const lineKey = this.buildCartLineKey(product, customizationAnswers);
      const index = next.findIndex((line) => line.lineKey === lineKey);
      if (index >= 0) {
        next[index] = { ...next[index], quantity: next[index].quantity + 1 };
      } else {
        next.push({
          lineKey,
          productId: product.id,
          name: product.name,
          priceCents: product.priceCents,
          quantity: 1,
          source: product.source,
          notes: '',
          customizationAnswers: customizationAnswers ? this.cloneCustomizationAnswers(customizationAnswers) : undefined,
          customizationSummary: customizationAnswers ? this.formatCustomizationSummary(customizationAnswers) : null,
        });
      }
        return next;
      });

    const liveBill = this.payableLiveBillOrder();
    if (liveBill) {
      this.notice.set(`Added ${product.name} to the add-on round for bill #${liveBill.id}. Send the round when ready.`);
    }
  }

  incrementLine(lineKey: string): void {
    this.cartLines.update((lines) =>
      lines.map((line) =>
        line.lineKey === lineKey ? { ...line, quantity: line.quantity + 1 } : line,
      ),
    );
  }

  decrementLine(lineKey: string): void {
    this.cartLines.update((lines) =>
      lines
        .map((line) =>
          line.lineKey === lineKey ? { ...line, quantity: line.quantity - 1 } : line,
        )
        .filter((line) => line.quantity > 0),
    );

    if (this.cartLines().length === 0) {
      this.clearCart();
    }
  }

  clearCart(): void {
    this.cartLines.set([]);
    this.cartTableId.set(null);
  }

  dismissCheckoutOutcome(): void {
    this.lastCheckoutOutcome.set(null);
  }

  lastCheckoutOrder(): Order | null {
    const outcome = this.lastCheckoutOutcome();
    if (!outcome) {
      return null;
    }
    return this.orders().find((entry) => entry.id === outcome.orderId) ?? null;
  }

  lastCheckoutTableId(): number | null {
    return this.lastCheckoutOrder()?.table_id ?? null;
  }

  lastCheckoutTable(): CanvasTable | null {
    const tableId = this.lastCheckoutTableId();
    if (tableId == null) {
      return null;
    }
    return this.tables().find((table) => table.id === tableId) ?? null;
  }

  canClearLastCheckoutTable(): boolean {
    const table = this.lastCheckoutTable();
    return !!table && this.canClearTable(table);
  }

  isPendingClearTable(table: CanvasTable | null | undefined): boolean {
    return !!table?.id && this.pendingClearTable()?.id === table.id;
  }

  clearLastCheckoutTable(): void {
    const table = this.lastCheckoutTable();
    if (!table) {
      return;
    }
    void this.clearTable(table);
    this.dismissCheckoutOutcome();
  }

  reviewLastCheckoutOutcome(): void {
    const order = this.lastCheckoutOrder();
    if (!order) {
      this.dismissCheckoutOutcome();
      return;
    }

    this.notice.set(`Reopening settled bill #${order.id} for review.`);
    this.continueOrderInPos(order);
  }

  advanceToNextReadyTable(): void {
    this.dismissCheckoutOutcome();
    const candidate = this.nextReadyTableCandidate(this.selectedTableId());

    if (!candidate) {
      this.notice.set('No clear tables are ready for a new order right now.');
      return;
    }

    this.tableWorkspaceOpen.set(true);
    this.selectTable(candidate);
    this.notice.set(`${candidate.name} is clear. Start the next order from the catalog.`);
    this.scrollToCatalog();
  }

  removeLine(lineKey: string): void {
    this.cartLines.update((lines) => lines.filter((line) => line.lineKey !== lineKey));
    if (this.cartLines().length === 0) {
      this.clearCart();
    }
  }

  cartQuantityFor(productId: number): number {
    return this.cartLines()
      .filter((line) => line.productId === productId)
      .reduce((sum, line) => sum + line.quantity, 0);
  }

  checkoutExistingOrderItemCount(): number {
    const liveBill = this.payableLiveBillOrder();
    if (!liveBill) {
      return 0;
    }
    return liveBill.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  canAddSelectedProduct(): boolean {
    if (this.processingCheckout()) {
      return false;
    }

    const table = this.cartTargetTable();
    return !!table && !this.paidTableNeedsClose(table);
  }

  updateLineNotes(lineKey: string, notes: string): void {
    this.cartLines.update((lines) =>
      lines.map((line) =>
        line.lineKey === lineKey
          ? { ...line, notes: (notes || '').slice(0, 160) }
          : line
      )
    );
  }

  hasReadyTableForNewCart(): boolean {
    return this.availableTargetTables().length > 0;
  }

  productCountForCategory(category: string): number {
    const normalized = category.trim().toLowerCase();
    return this.activeProducts().filter((product) => (product.category || '').trim().toLowerCase() === normalized)
      .length;
  }

  private isProductAvailableToday(product: {
    available_from?: string | null;
    available_until?: string | null;
  }): boolean {
    const today = this.localIsoDate();
    const availableFrom = (product.available_from || '').trim();
    const availableUntil = (product.available_until || '').trim();

    if (availableFrom && availableFrom > today) {
      return false;
    }
    if (availableUntil && availableUntil < today) {
      return false;
    }
    return true;
  }

  private localIsoDate(offsetDays = 0): string {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  effectiveCheckoutTable(): CanvasTable | null {
    return this.cartTargetTable();
  }

  private cartTargetTable(): CanvasTable | null {
    const boundTable = this.cartBoundTable();
    if (boundTable) {
      return boundTable;
    }

    const selectedTable = this.selectedTable();
    if (selectedTable) {
      return selectedTable;
    }

    const routeTableId = Number(this.route.snapshot.queryParamMap.get('tableId'));
    if (!Number.isFinite(routeTableId) || routeTableId <= 0) {
      return null;
    }

    return this.tables().find((table) => table.id === routeTableId) ?? null;
  }

  effectiveCheckoutTableHasLiveBill(): boolean {
    return !!this.effectiveCheckoutTable()?.active_order_id;
  }

  hasPayableLiveBill(): boolean {
    return !!this.payableLiveBillOrder();
  }

  catalogLockedByLiveBill(): boolean {
    return false;
  }

  async submitCart(mode: PosCheckoutMode): Promise<void> {
    const table = this.cartBoundTable() || this.effectiveCheckoutTable();
    if (!table?.id) {
      this.error.set('Select a table before sending or settling the ticket.');
      return;
    }
    const tableId = table.id;
    const liveBill = this.payableLiveBillOrder();
    const hasCartLines = this.cartLines().length > 0;
    if (!hasCartLines && !liveBill) {
      this.error.set('Add at least one item before payment.');
      return;
    }

    let hitPayCheckoutWindow: Window | null = null;
    if (mode === 'hitpay' && typeof window !== 'undefined') {
      hitPayCheckoutWindow = window.open('', '_blank');
    }

    this.processingCheckout.set(true);
    this.error.set(null);
    this.notice.set(null);
    if (mode !== 'hitpay') {
      this.hitPayFlowState.set('idle');
    }

    try {
      await this.ensureTableReady(table);
      let orderId = liveBill?.id ?? null;
      let access: Awaited<ReturnType<CashierPosComponent['ensureStaffAccess']>> | null = null;
      if (hasCartLines) {
        const handoffPrefill = this.activeHandoffPrefill();
        const payload = {
          items: this.cartLines().map((line) => ({
            product_id: line.productId,
            quantity: line.quantity,
            source: line.source,
            notes: line.notes?.trim() || undefined,
            customization_answers: line.customizationAnswers,
          })),
          customer_name: handoffPrefill?.guestName?.trim() || undefined,
          notes: handoffPrefill?.note?.trim() || undefined,
        };

        const orderResponse = await firstValueFrom(
          this.api.createStaffOrder({
            table_id: tableId,
            ...payload,
          }),
        );
        const createdOrderId = Number(orderResponse?.order_id);
        if (!Number.isFinite(createdOrderId) || createdOrderId <= 0) {
          throw new Error('The backend did not return a valid order id.');
        }
        orderId = createdOrderId;
      }

      if (!orderId) {
        throw new Error('No payable order could be found for this table.');
      }

      const checkoutAmountCents = this.checkoutAmountCents();

      if (mode === 'cash' || mode === 'card_terminal') {
        await firstValueFrom(this.api.markOrderPaid(orderId, mode));
        this.applyPaidOrderLocally(orderId, tableId, mode);
        this.selectedOrderId.set(orderId);
        this.syncSelectionToQuery(tableId, orderId);
        this.lastCheckoutOutcome.set({
          mode,
          tableName: table.name,
          orderId,
          amountCents: checkoutAmountCents,
        });
        this.notice.set(
          mode === 'cash'
            ? `Cash payment recorded for ${table.name}. Close the table when guests leave.`
            : `Terminal payment recorded for ${table.name}. Close the table when guests leave.`,
        );
      } else if (mode === 'hitpay') {
        this.hitPayFlowState.set('redirecting');
        access = access ?? await this.ensureStaffAccess(tableId);
        const payment = await firstValueFrom(
          this.api.createHitPayPaymentRequest(
            orderId,
            access.table_token,
            this.buildCashierHitPayReturnPath(table.id, orderId),
          ),
        );
        if (!payment?.checkout_url) {
          this.hitPayFlowState.set('failed');
          throw new Error('HitPay did not return a checkout link.');
        }
        if (hitPayCheckoutWindow && !hitPayCheckoutWindow.closed) {
          hitPayCheckoutWindow.location.href = payment.checkout_url;
          this.selectedOrderId.set(orderId);
          this.syncSelectionToQuery(tableId, orderId);
          this.clearCart();
          this.hitPayFlowState.set('idle');
          this.notice.set(`HitPay checkout opened in a new tab for ${table.name}. Keep this bill open until payment is confirmed.`);
          await this.refreshPosData({ setLoading: false, clearError: false });
          return;
        }
        window.location.href = payment.checkout_url;
        return;
      }

      this.clearCart();
      this.selectedOrderId.set(orderId);
      this.syncSelectionToQuery(tableId, orderId);
      await this.refreshPosData({ setLoading: false, clearError: false });
    } catch (err) {
      if (hitPayCheckoutWindow && !hitPayCheckoutWindow.closed) {
        hitPayCheckoutWindow.close();
      }
      if (mode === 'hitpay') {
        this.hitPayFlowState.set('failed');
      }
      this.error.set(
        this.getRecoverableCashierErrorMessage(
          err,
          'Unable to complete the cashier action. The bill/cart state was kept on this table; retry or refresh the board before continuing.',
        ),
      );
    } finally {
      this.processingCheckout.set(false);
    }
  }

  async sendOrderToKitchen(): Promise<void> {
    const table = this.cartBoundTable() || this.effectiveCheckoutTable();
    if (!table?.id) {
      this.error.set('Select a table before sending the order.');
      return;
    }
    if (this.cartLines().length === 0) {
      this.error.set('Add at least one item before sending the order.');
      return;
    }

    const tableId = table.id;
    const liveBill = this.payableLiveBillOrder();
    this.processingCheckout.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.hitPayFlowState.set('idle');

    try {
      await this.ensureTableReady(table);
      const handoffPrefill = this.activeHandoffPrefill();
      const payload = {
        items: this.cartLines().map((line) => ({
          product_id: line.productId,
          quantity: line.quantity,
          source: line.source,
          notes: line.notes?.trim() || undefined,
          customization_answers: line.customizationAnswers,
        })),
        customer_name: handoffPrefill?.guestName?.trim() || undefined,
        notes: handoffPrefill?.note?.trim() || undefined,
      };

      const orderResponse = await firstValueFrom(
        this.api.createStaffOrder({
          table_id: tableId,
          ...payload,
        }),
      );
      const orderId = Number(orderResponse?.order_id);
      if (!Number.isFinite(orderId) || orderId <= 0) {
        throw new Error('The backend did not return a valid order id.');
      }

      this.selectedOrderId.set(orderId);
      this.syncSelectionToQuery(tableId, orderId);
      this.clearCart();
      this.posDrawerView.set('checkout');
      this.notice.set(
        liveBill
          ? `Add-on round sent to bill #${orderId} for ${table.name}. Current orders stay active until the table is closed.`
          : `Order #${orderId} sent for ${table.name}. Review the bill, add another round, or collect payment.`,
      );
      await this.refreshPosData({ setLoading: false, clearError: false });
    } catch (err) {
      this.error.set(
        this.getRecoverableCashierErrorMessage(
          err,
          'Unable to send the order to the kitchen. Your cart is still safe here; retry sending the ticket or refresh the board before taking payment.',
        ),
      );
    } finally {
      this.processingCheckout.set(false);
    }
  }

  private scheduleQueueBoardRefresh(): void {
    if (this.queueRefreshTimer) {
      clearTimeout(this.queueRefreshTimer);
    }
    this.queueRefreshTimer = setTimeout(() => {
      this.queueRefreshTimer = null;
      void this.refreshQueueBoard();
    }, 180);
  }

  toggleQueueRail(): void {
    this.queueRailOpen.update((open) => !open);
  }

  private async refreshQueueBoard(): Promise<void> {
    try {
      const { guestQueueEntries, tables } = await firstValueFrom(
        forkJoin({
          guestQueueEntries: this.api.getGuestQueue(),
          tables: this.api.getTablesWithStatus(),
        }),
      );
      this.guestQueueEntries.set(guestQueueEntries);
      this.tables.set(tables);
    } catch (err) {
      this.error.set(this.getErrorMessage(err, 'Unable to refresh the live guest queue.'));
    }
  }

  queueWaitMinutes(entry: GuestQueueEntry): number {
    const requestedAt = this.backendTimestamp(entry.requested_at);
    if (!requestedAt) {
      return 0;
    }
    return Math.max(0, Math.floor((Date.now() - requestedAt) / 60_000));
  }

  queueWaitLabel(entry: GuestQueueEntry): string {
    const elapsed = this.queueWaitMinutes(entry);
    if (elapsed < 1) {
      return 'just joined';
    }
    return `${elapsed} min waiting`;
  }

  queueEligibleTables(entry: GuestQueueEntry): CanvasTable[] {
    return this.sortedTables().filter(
      (table) => this.canStartCashierBill(table) && (table.seat_count || 0) >= entry.party_size,
    );
  }

  startQueueSeating(entry: GuestQueueEntry): void {
    const eligible = this.queueEligibleTables(entry);
    this.queueSeatEntry.set(entry);
    this.queueSeatTargetId.set(eligible[0]?.id ?? null);
    if (eligible.length === 0) {
      this.notice.set(`No available table currently fits ${entry.queue_label} (${entry.party_size} pax).`);
    }
  }

  cancelQueueSeating(): void {
    this.queueSeatEntry.set(null);
    this.queueSeatTargetId.set(null);
  }

  async notifyQueueEntry(entry: GuestQueueEntry): Promise<void> {
    this.queueActionId.set(entry.id);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.updateGuestQueueStatus(entry.id, { status: 'notified' }));
      this.notice.set(`${entry.queue_label} has been pinged. Their open queue page updates automatically.`);
      await this.refreshQueueBoard();
    } catch (err) {
      this.error.set(this.getErrorMessage(err, `Unable to ping ${entry.queue_label}.`));
    } finally {
      this.queueActionId.set(null);
    }
  }

  async resolveQueueEntry(entry: GuestQueueEntry, action: QueueResolutionAction): Promise<void> {
    const label = action === 'no_show' ? 'mark as no show' : 'cancel';
    if (!window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${entry.queue_label} for ${entry.customer_name}?`)) {
      return;
    }

    this.queueActionId.set(entry.id);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.updateGuestQueueStatus(entry.id, {
          status: action,
          reason: action === 'no_show' ? 'Confirmed no show from POS' : 'Cancelled by staff from POS',
        }),
      );
      this.notice.set(`${entry.queue_label} was ${action === 'no_show' ? 'marked no show' : 'cancelled'}.`);
      if (this.queueSeatEntry()?.id === entry.id) {
        this.cancelQueueSeating();
      }
      await this.refreshQueueBoard();
    } catch (err) {
      this.error.set(this.getErrorMessage(err, `Unable to ${label} ${entry.queue_label}.`));
    } finally {
      this.queueActionId.set(null);
    }
  }

  async seatQueueEntry(entry: GuestQueueEntry): Promise<void> {
    const tableId = this.queueSeatTargetId();
    if (!tableId) {
      this.error.set('Choose an available table before seating this party.');
      return;
    }

    this.queueActionId.set(entry.id);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.seatGuestQueueEntry(entry.id, tableId));
      this.queuePrefill.set({
        queueEntryId: entry.id,
        guestName: entry.customer_name,
        phone: entry.customer_phone || null,
        partySize: entry.party_size,
        note: entry.notes || null,
      });
      this.cancelQueueSeating();
      await this.refreshPosData({ setLoading: false, clearError: false, applyRouteFocus: false });
      const table = this.tables().find((candidate) => candidate.id === tableId) ?? null;
      if (table) {
        this.openTableWorkspace(table);
      }
      this.notice.set(`${entry.queue_label} is seated. ${table?.name || 'The table'} is open for ordering.`);
    } catch (err) {
      this.error.set(this.getErrorMessage(err, `Unable to seat ${entry.queue_label}. Refresh and choose another table.`));
    } finally {
      this.queueActionId.set(null);
    }
  }

  private applyPaidOrderLocally(orderId: number, tableId: number, mode: PosCheckoutMode): void {
    const paidAt = new Date().toISOString();
    const canonicalMethod = mode === 'card_terminal' ? 'terminal' : mode;
    this.orders.update((orders) =>
      orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: 'paid',
              paid_at: paidAt,
              payment_method: mode,
            }
          : order,
      ),
    );
    this.tables.update((tables) =>
      tables.map((table) =>
        table.id === tableId
          ? (() => {
              const summaryOrderIds = table.payment_summary?.order_ids ?? [];
              const onlySettledOrder =
                summaryOrderIds.length === 0 || summaryOrderIds.every((id) => id === orderId);
              return {
                ...table,
                payment_status: onlySettledOrder ? ('paid' as const) : table.payment_status,
                payment_summary: onlySettledOrder
                  ? {
                      status: 'paid' as const,
                      method: canonicalMethod,
                      requested_at: table.payment_summary?.requested_at ?? null,
                      paid_at: paidAt,
                      order_ids: [orderId],
                    }
                  : table.payment_summary,
                active_order_id: orderId,
              };
            })()
          : table,
      ),
    );
  }

  async toggleTableState(table: CanvasTable): Promise<void> {
    if (!table.id) return;
    this.pendingTableId.set(table.id);
    this.error.set(null);

    try {
      if (table.is_active) {
        await firstValueFrom(this.api.closeTable(table.id));
        if (this.cartTableId() === table.id) {
          this.clearCart();
        }
        this.notice.set(`${table.name} is closed for new orders.`);
      } else {
        await firstValueFrom(this.api.activateTable(table.id));
        this.notice.set(`${table.name} is now accepting orders.`);
      }
      await this.refreshPosData({ setLoading: false, clearError: false });
    } catch (err) {
      this.error.set(
        this.getErrorMessage(
          err,
          table.is_active ? 'Unable to close the table.' : 'Unable to activate the table.',
        ),
      );
    } finally {
      this.pendingTableId.set(null);
    }
  }

  canClearTable(table: CanvasTable | null | undefined): boolean {
    if (!table?.id || !table.is_active || !table.active_order_id) {
      return false;
    }

    const currentOrder = this.tableCurrentOrder(table);
    const paymentState = String(table.payment_status || '').toLowerCase();
    return paymentState === 'paid' || !!(currentOrder && this.isPaid(currentOrder));
  }

  paidTableNeedsClose(table: CanvasTable | null | undefined): boolean {
    return this.canClearTable(table);
  }

  canReleaseEmptyTable(table: CanvasTable | null | undefined): boolean {
    if (!table?.id || !table.is_active || table.active_order_id) {
      return false;
    }

    if (this.cartTableId() === table.id && this.cartLines().length > 0) {
      return false;
    }

    return this.posCurrentSessionOrders().length === 0;
  }

  isReadyForCashier(table: CanvasTable | null | undefined): boolean {
    if (!table?.id || this.getTableState(table) !== 'available') {
      return false;
    }

    const serviceOrder = this.tableServiceOrder(table);
    return !serviceOrder || this.isCancelledOrder(serviceOrder);
  }

  canStartCashierBill(table: CanvasTable | null | undefined): boolean {
    return this.isReadyForCashier(table);
  }

  async clearTable(table: CanvasTable): Promise<void> {
    if (!table.id) {
      return;
    }
    if (!this.canClearTable(table) && !this.canReleaseEmptyTable(table)) {
      this.error.set(`${table.name} still has an unpaid bill. Collect payment before clearing the table.`);
      return;
    }

    this.pendingClearTable.set(table);
  }

  async releaseEmptyTable(table: CanvasTable): Promise<void> {
    if (!table.id) {
      return;
    }
    if (!this.canReleaseEmptyTable(table)) {
      this.error.set(`${table.name} cannot be released while it has a cart or bill. Finish or clear the work first.`);
      return;
    }

    this.pendingClearTable.set(table);
  }

  cancelClearTable(): void {
    if (this.pendingTableId() != null) {
      return;
    }
    this.pendingClearTable.set(null);
  }

  async confirmClearTable(): Promise<void> {
    const tableToClear = this.pendingClearTable();
    if (!tableToClear?.id) {
      return;
    }

    const tableId = tableToClear.id;
    const table = this.tables().find((candidate) => candidate.id === tableId) ?? tableToClear;
    if (!this.canClearTable(table) && !this.canReleaseEmptyTable(table)) {
      this.pendingClearTable.set(null);
      this.error.set(`${table.name} still has an unpaid bill. Collect payment before clearing the table.`);
      return;
    }

    const releasingEmptyTable = this.canReleaseEmptyTable(table);
    this.pendingTableId.set(tableId);
    this.error.set(null);

    try {
      await firstValueFrom(
        releasingEmptyTable ? this.api.releaseEmptyTable(tableId) : this.api.closeTable(tableId),
      );
      if (this.cartTableId() === tableId) {
        this.clearCart();
      }
      const reservationFinishedCopy = table.seated_reservation
        ? ` Linked reservation #${table.seated_reservation.reservation_id} was finished.`
        : '';
      this.notice.set(
        releasingEmptyTable
          ? `${table.name} was released and is available again.${reservationFinishedCopy}`
          : `${table.name} is clear and ready for the next cashier bill.${reservationFinishedCopy}`,
      );
      if (this.selectedTableId() === tableId) {
        this.selectedTableId.set(null);
        this.selectedOrderId.set(null);
        this.syncSelectionToQuery(null, null);
      }
      this.queueReadyTableAfterReload(tableId, 'catalog', false);
      await this.refreshPosData({ setLoading: false, clearError: false });
    } catch (err) {
      this.error.set(this.getErrorMessage(err, 'Unable to close the table.'));
    } finally {
      this.pendingTableId.set(null);
      this.pendingClearTable.set(null);
    }
  }

  openOrdersForTable(table: CanvasTable): void {
    if (!table.id) return;
    this.selectTable(table);
    const currentOrder = this.tableCurrentOrder(table);
    this.selectedOrderId.set(currentOrder?.id ?? null);
    void this.router.navigate(['/staff/orders'], {
      queryParams: {
        table: table.id,
        focusTableId: table.id,
      },
    });
  }

  focusTableForSale(table: CanvasTable): void {
    this.tableWorkspaceOpen.set(true);
    this.dismissCheckoutOutcome();
    const boundTable = this.cartBoundTable();
    if (boundTable?.id && table.id && boundTable.id !== table.id) {
      this.error.set(`Finish or clear ${boundTable.name}'s cart before switching to ${table.name}.`);
      this.selectTable(boundTable);
      this.scrollToPaymentDock();
      return;
    }
    this.selectTable(table);
    const linkedOrder = this.tableCurrentOrder(table);

    if (linkedOrder && !this.isPaid(linkedOrder) && this.isClosedOrder(linkedOrder)) {
      this.notice.set(`${table.name} is ready for payment. Collect it from the checkout dock.`);
      this.scrollToPaymentDock();
      return;
    }

    this.notice.set(
      table.active_order_id
        ? `${table.name} has a live order. Add items from the catalog or settle it below.`
        : `${table.name} is clear and ready for a new order.`,
    );
    this.scrollToCatalog();
  }

  openTablesBoard(table: CanvasTable): void {
    if (!table.id) return;
    this.router.navigate(['/tables/canvas'], { queryParams: { tableId: table.id } });
  }

  openCategoryManager(): void {
    this.router.navigate(['/products'], { queryParams: { tab: 'categories' } });
  }

  openOrdersForSelectedTable(): void {
    const table = this.effectiveCheckoutTable();
    if (!table?.id) return;
    this.openOrdersForTable(table);
  }

  continueOrderInPos(order: Order): void {
    this.tableWorkspaceOpen.set(true);
    this.dismissCheckoutOutcome();
    this.selectOrder(order);

    if (!this.isPaid(order) && this.isClosedOrder(order)) {
      this.notice.set(`Bill #${order.id} is awaiting payment. Collect it from the checkout dock.`);
      this.scrollToPaymentDock();
      return;
    }

    if (!this.isPaid(order)) {
      this.notice.set(`Resuming bill #${order.id}. Add items or continue service from the cashier workspace.`);
      this.scrollToCatalog();
      return;
    }

    this.notice.set(`Viewing settled bill #${order.id}. Use the rail to inspect its receipt and payment outcome.`);
    this.scrollToPaymentDock();
  }

  openOrdersForQueueGroup(group: PosQueueOrderGroup): void {
    if (group.tableId != null) {
      void this.router.navigate(['/staff/orders'], {
        queryParams: {
          table: group.tableId,
          focusTableId: group.tableId,
        },
      });
      return;
    }

    void this.router.navigate(['/staff/orders']);
  }

  focusQueueGroup(group: PosQueueOrderGroup): void {
    this.dismissCheckoutOutcome();
    const preferredOrder =
      group.orders.find((order) => !this.isPaid(order) && this.isClosedOrder(order)) ??
      group.orders.find((order) => !this.isPaid(order)) ??
      group.orders[0] ??
      null;

    if (group.tableId != null) {
      const table = this.tables().find((entry) => entry.id === group.tableId) ?? null;
      if (table) {
        if (preferredOrder && !this.isPaid(preferredOrder) && this.isClosedOrder(preferredOrder)) {
          this.selectTable(table);
          this.selectOrder(preferredOrder);
          this.notice.set(`${table.name} has a bill awaiting payment.`);
          this.scrollToPaymentDock();
          return;
        }

        this.focusTableForSale(table);
        return;
      }
    }

    if (preferredOrder) {
      this.continueOrderInPos(preferredOrder);
    }
  }

  focusCartBoundTable(): void {
    const table = this.cartBoundTable();
    if (!table) return;
    this.selectTable(table);
  }

  selectNextReadyTable(): void {
    const candidate = this.nextReadyTableCandidate(this.selectedTableId());
    if (!candidate) {
      this.notice.set('No clear tables are ready for a new order right now.');
      return;
    }

    this.tableWorkspaceOpen.set(true);
    this.selectTable(candidate);
    this.notice.set(`${candidate.name} is ready for the next order.`);
    this.scrollToCatalog();
  }

  private nextReadyTableCandidate(excludeTableId: number | null = null): CanvasTable | null {
    return (
      this.availableTargetTables().find((table) => table.id !== excludeTableId) ||
      this.availableTargetTables()[0] ||
      null
    );
  }

  private queueReadyTableAfterReload(
    currentTableId: number | null,
    scrollTarget: 'catalog' | 'payment' | null = 'catalog',
    showNextTableHint = true,
  ): void {
    const candidate = this.nextReadyTableCandidate(currentTableId);
    this.focusNextClearTableAfterReload = true;
    this.preferredReadyTableIdAfterReload = candidate?.id ?? null;
    this.scrollTargetAfterReload = scrollTarget;
    this.showNextTableHintAfterReload = showNextTableHint;
  }

  private focusReadyTableAfterReload(): void {
    const preferredId = this.preferredReadyTableIdAfterReload;
    this.preferredReadyTableIdAfterReload = null;

    const scrollTarget = this.scrollTargetAfterReload;
    this.scrollTargetAfterReload = null;
    const showNextTableHint = this.showNextTableHintAfterReload;
    this.showNextTableHintAfterReload = true;
    this.tableWorkspaceOpen.set(false);
    this.selectedTableId.set(null);
    this.selectedOrderId.set(null);
    this.syncSelectionToQuery(null, null);

    if (showNextTableHint && preferredId != null) {
      const preferredTable = this.tables().find((table) => table.id === preferredId) ?? null;
      if (preferredTable) {
        const existingNotice = this.notice();
        const nextTableHint = `${preferredTable.name} is ready for the next order.`;
        this.notice.set(existingNotice ? `${existingNotice} ${nextTableHint}` : nextTableHint);
      }
    }

    if (scrollTarget === 'payment' || scrollTarget === 'catalog') {
      this.scrollToElement('cashier-floor');
    }
  }

  productSourceLabel(product: PosSellableProduct): string {
    return product.source === 'tenant_product' ? 'Tenant menu item' : 'Legacy product';
  }

  productImageUrl(product: PosSellableProduct): string | null {
    return this.isProductImageBroken(product) ? null : product.imageUrl;
  }

  productInitials(name: string): string {
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'POS'
    );
  }

  markProductImageBroken(product: PosSellableProduct): void {
    const key = this.productImageKey(product);
    this.brokenProductImageKeys.update((state) => ({ ...state, [key]: true }));
  }

  toggleQuickCreate(): void {
    this.showQuickCreate.update((value) => !value);
    this.error.set(null);
    this.notice.set(null);
  }

  async createQuickProduct(): Promise<void> {
    const name = this.quickProductDraft.name.trim();
    const priceCents = this.parseMoneyToCents(this.quickProductDraft.price);
    const category = this.quickProductDraft.category.trim();
    const description = this.quickProductDraft.description.trim();

    if (!name || priceCents <= 0) {
      this.error.set('Enter a product name and a valid price before creating the item.');
      return;
    }

    this.creatingProduct.set(true);
    this.error.set(null);
    this.notice.set(null);

    try {
      await firstValueFrom(
        this.api.createProduct({
          name,
          price_cents: priceCents,
          category: category || undefined,
          description: description || undefined,
        }),
      );

      this.quickProductDraft = {
        name: '',
        price: '',
        category: category || this.selectedCategory() || '',
        description: '',
      };
      this.showQuickCreate.set(false);
      this.notice.set(`${name} is now sellable from the cashier screen.`);
      await this.refreshPosData({ setLoading: false, clearError: false });
    } catch (err) {
      this.error.set(this.getErrorMessage(err, 'Unable to create the quick product.'));
    } finally {
      this.creatingProduct.set(false);
    }
  }

  tableOrderCount(tableId: number): number {
    return this.orders().filter((order) => order.table_id === tableId).length;
  }

  tableLiveOrder(tableId: number): Order | null {
    const table = this.tables().find((item) => item.id === tableId) ?? null;
    if (!table) return null;
    return this.tableCurrentOrder(table);
  }

  tableServiceOrder(table: CanvasTable): Order | null {
    const explicitState = String(table.operational_status || table.status || '').toLowerCase();
    const ignoreStaleLinkedOrder =
      explicitState === 'available' &&
      String(table.payment_status || '').toLowerCase() === 'none';

    if (ignoreStaleLinkedOrder) {
      return null;
    }

    if (table.active_order_id != null) {
      return this.orders().find((order) => order.id === table.active_order_id) ?? null;
    }
    return (
      this.unpaidOrders().find((order) => order.table_id === table.id) ??
      this.openOrders().find((order) => order.table_id === table.id) ??
      null
    );
  }

  tableHasOpenService(table: CanvasTable): boolean {
    const serviceOrder = this.tableServiceOrder(table);
    return !!serviceOrder && !this.isClosedOrder(serviceOrder) && !this.isPaid(serviceOrder);
  }

  selectedTableHasServiceTicket(): boolean {
    const table = this.effectiveCheckoutTable();
    if (!table?.id) {
      return false;
    }
    return this.tableHasOpenService(table);
  }

  tableReservationBadge(table: CanvasTable): string | null {
    const reservation = table.upcoming_reservation;
    if (!reservation?.reservation_time) {
      return null;
    }
    return `Reserved ${this.formatReservationTime(reservation.reservation_time)}`;
  }

  tableReservationHint(table: CanvasTable): string | null {
    const seatedReservation = table.seated_reservation;
    if (seatedReservation) {
      const guest = seatedReservation.customer_name?.trim() || 'Guest';
      const party = seatedReservation.party_size === 1 ? '1 guest' : `${seatedReservation.party_size} guests`;
      return `${guest} · ${party}`;
    }

    const reservation = table.upcoming_reservation;
    if (!reservation) {
      return null;
    }

    const guest = reservation.customer_name?.trim() || 'Guest';
    if (!reservation.reservation_time) {
      return guest;
    }

    return `${guest} • ${this.formatReservationTime(reservation.reservation_time)}`;
  }

  getTableSaleSummary(table: CanvasTable): string {
    const serviceOrder = this.tableServiceOrder(table);
    if (serviceOrder && !this.isClosedOrder(serviceOrder) && !this.isPaid(serviceOrder)) {
      return `Bill #${serviceOrder.id} live`;
    }
    if (serviceOrder && !this.isPaid(serviceOrder) && this.isClosedOrder(serviceOrder)) {
      return `Bill #${serviceOrder.id} ready`;
    }
    if (serviceOrder && this.isPaid(serviceOrder)) {
      return `Last bill #${serviceOrder.id}`;
    }
    if (table.upcoming_reservation) {
      return this.tableReservationBadge(table) || 'Reserved soon';
    }
    if (table.seated_reservation) {
      const partySize = table.seated_reservation.party_size;
      return `Guests seated · ${partySize}`;
    }
    return 'Ready for order';
  }

  tablePrimaryActionLabel(table: CanvasTable): string {
    if (this.paidTableNeedsClose(table)) {
      return 'Review bill';
    }
    const serviceOrder = this.tableServiceOrder(table);
    if (serviceOrder && !this.isPaid(serviceOrder) && this.isClosedOrder(serviceOrder)) {
      return 'Take payment';
    }
    return this.tableHasOpenService(table) ? 'Resume order' : 'Start order';
  }

  selectedTableSummary(table: CanvasTable): string {
    const serviceOrder = this.tableServiceOrder(table);
    if (serviceOrder && !this.isClosedOrder(serviceOrder) && !this.isPaid(serviceOrder)) {
      return `Bill #${serviceOrder.id} in service`;
    }
    if (serviceOrder && !this.isPaid(serviceOrder) && this.isClosedOrder(serviceOrder)) {
      return `Bill #${serviceOrder.id} ready to pay`;
    }
    if (serviceOrder && this.isPaid(serviceOrder)) {
      return `Last bill #${serviceOrder.id} paid`;
    }
    if (table.active_order_id && serviceOrder) {
      return `Ticket #${serviceOrder.id}`;
    }
    if (table.upcoming_reservation) {
      return this.tableReservationHint(table) || 'Reserved guest pending';
    }
    if (table.seated_reservation) {
      return 'Guests seated, awaiting first order';
    }
    return 'Ready for a new order';
  }

  tableLiveOrderCount(table: CanvasTable): number {
    if (!table.id) {
      return 0;
    }

    return this.liveBills().filter((order) => order.table_id === table.id).length;
  }

  tableHistoryHint(table: CanvasTable): string {
    if (!table.id) {
      return 'No bill history yet';
    }

    const latest = this.tableLatestOrder(table.id);
    if (!latest?.created_at) {
      return 'No bill history yet';
    }

    return `${this.paymentLabel(latest)} · ${this.formatDate(latest.created_at)}`;
  }

  tableLatestOrder(tableId: number): Order | null {
    return (
      [...this.orders()]
        .filter((order) => order.table_id === tableId)
        .sort((a, b) => this.backendTimestamp(b.created_at) - this.backendTimestamp(a.created_at))[0] ??
      null
    );
  }

  getTableState(table: CanvasTable): string {
    const explicit = String(table.operational_status || table.status || '').toLowerCase();
    const serviceOrder = this.tableServiceOrder(table);
    const paymentState = String(table.payment_status || '').toLowerCase();
    const activeButIdle = !!table.is_active && !table.active_order_id && !serviceOrder;
    const staleServiceState =
      (explicit === 'open_order' || explicit === 'ready_to_serve') &&
      !table.active_order_id &&
      !serviceOrder;

    if (
      !this.tableHasOpenService(table) &&
      (paymentState === 'paid' || !!(table.active_order_id && serviceOrder && this.isPaid(serviceOrder)))
    ) {
      return 'awaiting_clear';
    }
    if (staleServiceState) {
      return table.seated_reservation ? 'occupied' : 'available';
    }
    if (activeButIdle && (explicit === 'closed' || explicit === 'idle' || explicit === 'available')) {
      return 'available';
    }
    if (explicit) {
      return explicit;
    }

    if (!table.is_active) {
      return 'closed';
    }

    if (table.active_order_id) {
      return 'occupied';
    }

    return 'available';
  }

  getTableStateLabel(table: CanvasTable): string {
    const state = this.getTableState(table);
    switch (state) {
      case 'awaiting_clear':
        return 'Ready';
      case 'open_order':
        return 'Open order';
      case 'ready_to_serve':
        return 'Ready';
      case 'reserved':
        return 'Reserved';
      case 'occupied':
        return table.seated_reservation ? 'Seated' : 'Occupied';
      case 'closed':
        return 'Closed';
      default:
        return 'Available';
    }
  }

  getPaymentStateLabel(table: CanvasTable): string | null {
    const status = this.getTablePaymentState(table);
    if (status === 'none') return null;
    if (status === 'unpaid') return 'Unpaid';
    if (status === 'requested') return 'Payment requested';

    const method = table.payment_summary?.method;
    if (method === 'hitpay') return 'Paid · Online';
    if (method === 'terminal') return 'Paid · Terminal';
    if (method === 'cash') return 'Paid · Cash';
    return 'Paid';
  }

  getTablePaymentState(table: CanvasTable): TablePaymentStatus {
    if (table.payment_summary?.status) return table.payment_summary.status;
    if (table.payment_status === 'pending') return 'requested';
    if (table.payment_status === 'paid') return 'paid';
    const currentOrder = this.tableServiceOrder(table);
    return table.active_order_id || currentOrder ? 'unpaid' : 'none';
  }

  paymentStateClass(status: TablePaymentStatus): string {
    return status === 'none' ? '' : `payment-state--${status}`;
  }

  paymentStateIcon(status: TablePaymentStatus): string {
    if (status === 'paid') return '✓';
    if (status === 'requested') return '◷';
    return '!';
  }

  private formatReservationTime(value: string): string {
    const parsed = this.parseBackendDate(value);
    if (!parsed) {
      return value;
    }

    return new Intl.DateTimeFormat('en-SG', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(parsed);
  }

  stateClass(state: string): string {
    switch (state) {
      case 'available':
        return 'state--available';
      case 'awaiting_clear':
      case 'ready_to_serve':
        return 'state--ready';
      case 'reserved':
        return 'state--reserved';
      case 'occupied':
      case 'open_order':
        return 'state--occupied';
      default:
        return 'state--closed';
    }
  }

  orderStatusClass(order: Order): string {
    const status = String(order.status || '').toLowerCase();
    if (this.isPaid(order)) return 'state--paid';
    if (status.includes('ready')) return 'state--ready';
    if (status.includes('prepar') || status.includes('cook')) return 'state--open';
    if (status.includes('cancel') || status.includes('complete') || status.includes('closed')) return 'state--closed';
    return 'state--open';
  }

  paymentLabel(order: Order): string {
    const normalizedMethod = this.orderPaymentMethodNormalized(order);
    const normalized =
      normalizedMethod === 'cash'
        ? 'Cash'
        : normalizedMethod === 'terminal'
          ? 'Terminal'
          : normalizedMethod === 'hitpay'
            ? 'HitPay'
            : normalizedMethod === 'card'
              ? 'Card'
              : order.payment_method || null;

    if (this.isPaid(order)) {
      return normalized || 'Paid';
    }
    return normalized || 'Awaiting payment';
  }

  private orderPaymentMethodNormalized(order: Order | null | undefined): string | null {
    const raw = String(order?.payment_method || '').trim().toLowerCase();
    if (!raw) {
      return null;
    }
    if (raw === 'card_terminal' || raw === 'terminal') {
      return 'terminal';
    }
    if (raw === 'card' || raw === 'card_or_wallet') {
      return 'card';
    }
    return raw;
  }

  formatDate(value?: string | null): string {
    if (!value) return 'Unknown';
    const date = this.parseBackendDate(value);
    if (!date) return value;
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  private sortQueueOrders(orders: Order[]): Order[] {
    return [...orders].sort((a, b) => {
      const aRank = this.queueOrderRank(a);
      const bRank = this.queueOrderRank(b);
      if (aRank !== bRank) {
        return aRank - bRank;
      }

      const aDate = this.queueOrderTimestamp(a);
      const bDate = this.queueOrderTimestamp(b);
      return bDate - aDate;
    });
  }

  private queueOrderRank(order: Order): number {
    if (!this.isPaid(order) && this.isClosedOrder(order)) {
      return 0;
    }

    if (!this.isPaid(order)) {
      return 1;
    }

    return 2;
  }

  private queueOrderTimestamp(order: Order): number {
    const refreshedAt = (order as Order & { updated_at?: string | null }).updated_at;
    return this.backendTimestamp(refreshedAt || order.created_at);
  }

  private applyFocusFromQuery(): void {
    const tableId = this.selectedTableId();
    const orderId = this.selectedOrderId();

    if (orderId != null) {
      const order = this.orders().find((item) => item.id === orderId) ?? null;
      if (order) {
        this.selectOrder(order);
        return;
      }
    }

    if (tableId != null) {
      const table = this.tables().find((item) => item.id === tableId) ?? null;
      if (table) {
        this.selectTable(table);
        const reservationPrefill = this.reservationPrefill();
        const queuePrefill = this.queuePrefill();
        if (reservationPrefill) {
          const guestLabel =
            reservationPrefill.guestName ||
            reservationPrefill.phone ||
            (reservationPrefill.reservationId ? `reservation #${reservationPrefill.reservationId}` : '');
          this.notice.set(
            `${table.name} opened from reservation handoff${guestLabel ? ` for ${guestLabel}` : ''}.`,
          );
        } else if (queuePrefill) {
          const guestLabel =
            queuePrefill.guestName ||
            queuePrefill.phone ||
            (queuePrefill.queueEntryId ? `queue #${queuePrefill.queueEntryId}` : '');
          this.notice.set(
            `${table.name} opened from queue handoff${guestLabel ? ` for ${guestLabel}` : ''}.`,
          );
        }
        return;
      }
    }

    this.selectedTableId.set(null);
    this.selectedOrderId.set(null);
    this.tableWorkspaceOpen.set(false);
  }

  private tableCurrentOrder(table: CanvasTable): Order | null {
    if (table.active_order_id != null) {
      const activeById = this.orders().find((order) => order.id === table.active_order_id) ?? null;
      if (activeById) {
        return activeById;
      }
    }

    const rankedUnpaidOrders = this.sortQueueOrders(
      this.orders().filter(
        (order) =>
          order.table_id === table.id &&
          !this.isPaid(order) &&
          !this.isCancelledOrder(order) &&
          this.isCurrentTableSessionOrder(order, table),
      ),
    );
    return rankedUnpaidOrders[0] ?? null;
  }

  private isOrderInCurrentServiceSession(order: Order): boolean {
    if (order.table_id == null) {
      return true;
    }
    return this.isCurrentTableSessionOrder(order);
  }

  private isCurrentTableSessionOrder(order: Order, table?: CanvasTable | null): boolean {
    const linkedTable =
      table ?? this.tables().find((candidate) => candidate.id === order.table_id) ?? null;
    const activeOrderId = linkedTable?.active_order_id ?? order.table_active_order_id ?? null;

    if (order.is_current_table_session === true) {
      return true;
    }
    if (activeOrderId != null && order.id === activeOrderId) {
      return true;
    }
    if (order.table_is_active === true && order.table_active_order_id === order.id) {
      return true;
    }
    return false;
  }

  private tableLatestOrderFallback(tableId: number | null): Order | null {
    if (tableId == null) return null;
    return (
      [...this.orders()]
        .filter((order) => order.table_id === tableId)
        .sort((a, b) => this.backendTimestamp(b.created_at) - this.backendTimestamp(a.created_at))[0] ??
      null
    );
  }

  private routeHasExplicitSelection(): boolean {
    const tableId = Number(this.route.snapshot.queryParamMap.get('tableId'));
    const orderId = Number(this.route.snapshot.queryParamMap.get('orderId'));
    return (
      (Number.isFinite(tableId) && tableId > 0) ||
      (Number.isFinite(orderId) && orderId > 0)
    );
  }

  private syncSelectionToQuery(tableId: number | null, orderId: number | null): void {
    const currentTableId = Number(this.route.snapshot.queryParamMap.get('tableId'));
    const currentOrderId = Number(this.route.snapshot.queryParamMap.get('orderId'));
    const normalizedCurrentTableId = Number.isFinite(currentTableId) && currentTableId > 0 ? currentTableId : null;
    const normalizedCurrentOrderId = Number.isFinite(currentOrderId) && currentOrderId > 0 ? currentOrderId : null;

    if (normalizedCurrentTableId === tableId && normalizedCurrentOrderId === orderId) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tableId: tableId ?? null,
        orderId: orderId ?? null,
        reservationId: null,
        reservationGuest: null,
        reservationPhone: null,
        reservationPartySize: null,
        reservationNotes: null,
        queueEntryId: null,
        queueGuest: null,
        queuePhone: null,
        queuePartySize: null,
        queueNotes: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private activeHandoffPrefill():
    | {
        guestName: string | null;
        phone: string | null;
        partySize: number | null;
        note: string | null;
      }
    | null {
    return this.queuePrefill() || this.reservationPrefill();
  }

  private buildCashierHitPayReturnPath(tableId: number, orderId: number): string {
    const query = new URLSearchParams({
      tableId: String(tableId),
      orderId: String(orderId),
      paymentReturn: 'hitpay',
    });
    return `/pos?${query.toString()}`;
  }

  private async processHitPayReturnFromQuery(): Promise<void> {
    const paymentReturn = this.route.snapshot.queryParamMap.get('paymentReturn');
    if (paymentReturn !== 'hitpay') {
      return;
    }

    const rawReturnStatus = (this.route.snapshot.queryParamMap.get('status') || '').trim().toLowerCase();
    const tableId = Number(this.route.snapshot.queryParamMap.get('tableId'));
    const orderId = Number(this.route.snapshot.queryParamMap.get('orderId'));
    const normalizedTableId = Number.isFinite(tableId) && tableId > 0 ? tableId : null;
    const normalizedOrderId = Number.isFinite(orderId) && orderId > 0 ? orderId : null;

    if (normalizedTableId == null || normalizedOrderId == null) {
      await this.clearHitPayReturnQuery();
      return;
    }

    const table = this.tables().find((item) => item.id === normalizedTableId) ?? null;
    if (!table?.id) {
      return;
    }

    const key = `hitpay:${normalizedTableId}:${normalizedOrderId}:${rawReturnStatus || 'unknown'}`;
    if (this.processedHitPayReturnKey === key || this.processingCheckout()) {
      return;
    }

    this.processedHitPayReturnKey = key;

    const successfulReturnStatuses = new Set(['', 'completed', 'complete', 'success', 'succeeded', 'paid']);
    if (!successfulReturnStatuses.has(rawReturnStatus)) {
      const cancelledReturnStatuses = new Set(['cancelled', 'canceled', 'cancel', 'abandoned']);
      this.selectedTableId.set(table.id);
      this.selectedOrderId.set(normalizedOrderId);
      this.selectedSettlementMode.set('hitpay');
      this.hitPayFlowState.set(cancelledReturnStatuses.has(rawReturnStatus) ? 'cancelled' : 'failed');
      this.processingCheckout.set(false);
      this.error.set(null);
      this.notice.set(
        cancelledReturnStatuses.has(rawReturnStatus)
          ? `HitPay checkout was cancelled for ${table.name}. The bill is still open and ready to retry.`
          : `HitPay checkout returned "${rawReturnStatus}" for ${table.name}. The bill is still open and ready to retry.`,
      );
      await this.clearHitPayReturnQuery();
      await this.refreshPosData({ setLoading: false, clearError: false });
      return;
    }

    this.hitPayFlowState.set('confirming');
    this.processingCheckout.set(true);
    this.error.set(null);
    this.notice.set(`Confirming HitPay checkout for ${table.name}...`);

    try {
      const access = await this.ensureStaffAccess(table.id);
      await firstValueFrom(this.api.confirmHitPayPayment(normalizedOrderId, access.table_token));
      const confirmedOrder =
        this.orders().find((order) => order.id === normalizedOrderId) ??
        this.tableLatestOrderFallback(table.id) ??
        null;
      this.selectedTableId.set(table.id);
      this.selectedOrderId.set(normalizedOrderId);
      this.syncSelectionToQuery(table.id, normalizedOrderId);
      this.selectedSettlementMode.set('hitpay');
      this.clearCart();
      this.lastCheckoutOutcome.set({
        mode: 'hitpay',
        tableName: table.name,
        orderId: normalizedOrderId,
        amountCents: confirmedOrder?.total_cents || 0,
      });
      this.hitPayFlowState.set('idle');
      this.notice.set(`HitPay checkout completed for ${table.name}. Close the table when guests leave.`);
      await this.clearHitPayReturnQuery();
      await this.refreshPosData({ setLoading: false, clearError: false });
    } catch (err) {
      this.hitPayFlowState.set('failed');
      this.error.set(this.getErrorMessage(err, 'Unable to confirm the HitPay payment.'));
      await this.clearHitPayReturnQuery();
    } finally {
      this.processingCheckout.set(false);
    }
  }

  private async clearHitPayReturnQuery(): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        paymentReturn: null,
        provider: null,
        status: null,
        reference: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private scrollToElement(id: string): void {
    if (typeof document === 'undefined') return;
    const element = document.getElementById(id);
    if (!element) return;
    window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private async ensureTableReady(table: CanvasTable): Promise<void> {
    if (!table.id || table.is_active) return;
    this.pendingTableId.set(table.id);
    try {
      await firstValueFrom(this.api.activateTable(table.id));
      this.notice.set(`${table.name} was activated automatically for this cashier ticket.`);
    } finally {
      this.pendingTableId.set(null);
    }
  }

  private async ensureStaffAccess(tableId: number): Promise<StaffMenuAccessToken> {
    const cached = this.staffAccessCache()[tableId];
    if (cached) {
      return cached;
    }
    const access = await firstValueFrom(this.api.getStaffMenuToken(tableId));
    this.staffAccessCache.update((cache) => ({ ...cache, [tableId]: access }));
    return access;
  }

  private isClosedOrder(order: Order): boolean {
    const status = String(order.status || '').toLowerCase();
    return status.includes('completed') || status.includes('closed') || status.includes('cancelled');
  }

  private isCancelledOrder(order: Order): boolean {
    return String(order.status || '').toLowerCase().includes('cancel');
  }

  isPaid(order: Order): boolean {
    return !!order.paid_at || String(order.status || '').trim().toLowerCase() === 'paid';
  }

  private isPaidToday(order: Order): boolean {
    const paidAt = this.parseBackendDate(order.paid_at);
    if (!paidAt) {
      return false;
    }

    const now = new Date();
    return (
      paidAt.getFullYear() === now.getFullYear() &&
      paidAt.getMonth() === now.getMonth() &&
      paidAt.getDate() === now.getDate()
    );
  }

  private backendTimestamp(value?: string | null): number {
    return this.parseBackendDate(value)?.getTime() ?? 0;
  }

  private parseBackendDate(value?: string | null): Date | null {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      return null;
    }

    const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
    const parsed = new Date(hasTimezone ? trimmed : `${trimmed}Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseMoneyToCents(raw: string): number {
    const normalized = raw.replace(/[^0-9.]/g, '').trim();
    if (!normalized) return 0;
    const value = Number(normalized);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.round(value * 100);
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    if (typeof err === 'string' && err.trim()) {
      return err;
    }

    if (err && typeof err === 'object') {
      const anyErr = err as {
        message?: unknown;
        error?: { detail?: unknown; message?: unknown };
      };

      const detail = anyErr.error?.detail;
      if (typeof detail === 'string' && detail.trim()) {
        return detail;
      }
      if (Array.isArray(detail)) {
        return detail.map((item) => String(item)).join(', ');
      }
      if (detail && typeof detail === 'object') {
        const nestedMessage = (detail as { message?: unknown }).message;
        if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
          return nestedMessage;
        }
        try {
          return JSON.stringify(detail);
        } catch {
          return fallback;
        }
      }

      const nested = anyErr.error?.message;
      if (typeof nested === 'string' && nested.trim()) {
        return nested;
      }

      if (typeof anyErr.message === 'string' && anyErr.message.trim()) {
        return anyErr.message;
      }
    }

    return fallback;
  }

  private getRecoverableCashierErrorMessage(err: unknown, fallback: string): string {
    if (this.isNetworkOrSessionError(err)) {
      return 'Connection or session check failed. Your cart was not cleared; retry sending the ticket, or sign in again and return to this table before taking payment.';
    }
    return this.getErrorMessage(err, fallback);
  }

  private isNetworkOrSessionError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const anyErr = err as {
      status?: unknown;
      message?: unknown;
      name?: unknown;
      error?: { message?: unknown; detail?: unknown };
    };
    if (anyErr.status === 0 || anyErr.status === 401 || anyErr.status === 403) return true;
    const text = [
      anyErr.message,
      anyErr.name,
      anyErr.error?.message,
      anyErr.error?.detail,
    ]
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .toLowerCase();
    return /failed to fetch|network|timeout|unauthorized|forbidden|session|login/.test(text);
  }

  private resolveSellableProductImageUrl(imageFilename: string | null, tenantId: number | null): string | null {
    if (!imageFilename) return null;
    return this.api.getProductImageUrl({
      name: '',
      price_cents: 0,
      image_filename: imageFilename,
      tenant_id: tenantId ?? undefined,
    });
  }

  private productImageKey(product: PosSellableProduct): string {
    return `${product.source}:${product.id}`;
  }

  private isProductImageBroken(product: PosSellableProduct): boolean {
    return !!this.brokenProductImageKeys()[this.productImageKey(product)];
  }

  private buildCartLineKey(
    product: PosSellableProduct,
    customizationAnswers?: Record<string, string | number | string[]>,
  ): string {
    return `${product.source}:${product.id}:${JSON.stringify(this.normalizeCustomizationAnswers(customizationAnswers))}`;
  }

  private cloneCustomizationAnswers(
    customizationAnswers: Record<string, string | number | string[]>,
  ): Record<string, string | number | string[]> {
    const clone: Record<string, string | number | string[]> = {};
    for (const [key, value] of Object.entries(customizationAnswers)) {
      clone[key] = Array.isArray(value) ? [...value] : value;
    }
    return clone;
  }

  private normalizeCustomizationAnswers(
    customizationAnswers?: Record<string, string | number | string[]>,
  ): Record<string, string | number | string[]> {
    if (!customizationAnswers) {
      return {};
    }

    return Object.keys(customizationAnswers)
      .sort()
      .reduce<Record<string, string | number | string[]>>((acc, key) => {
        const value = customizationAnswers[key];
        acc[key] = Array.isArray(value) ? [...value].sort() : value;
        return acc;
      }, {});
  }

  private formatCustomizationSummary(
    customizationAnswers: Record<string, string | number | string[]>,
  ): string {
    const parts: string[] = [];
    for (const value of Object.values(this.normalizeCustomizationAnswers(customizationAnswers))) {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          parts.push(value.join(', '));
        }
      } else if (value !== '' && value != null) {
        parts.push(String(value));
      }
    }
    return parts.join(', ');
  }
}

