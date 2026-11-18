import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import {
  ApiService,
  Order,
  OrderItem,
  TenantSettings,
} from '../services/api.service';
import { PermissionService } from '../services/permission.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { StaffPosToolbarComponent } from '../shared/staff-pos-toolbar.component';

type ReceiptFilter = 'all' | 'open' | 'paid' | 'adjusted' | 'voided';
type AdjustmentMode = 'refund' | 'void' | 'remove' | null;

@Component({
  selector: 'app-receipts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent, StaffPosToolbarComponent],
  template: `
    <app-sidebar>
      <div class="page-shell">
        <app-staff-pos-toolbar />

        <header class="page-heading">
          <div>
            <span class="eyebrow">Financial records</span>
            <h1>Receipts</h1>
            <p>Review every table bill, correct open orders, and audit paid receipt adjustments.</p>
          </div>
          <button type="button" class="button secondary" (click)="loadReceipts()" [disabled]="loading()">
            {{ loading() ? 'Refreshing…' : 'Refresh receipts' }}
          </button>
        </header>

        @if (toast()) {
          <div class="toast" [class.toast--warning]="toastWarning()" role="status">
            <span>{{ toast() }}</span>
            <button type="button" aria-label="Dismiss message" (click)="toast.set('')">×</button>
          </div>
        }

        <section class="summary-grid" aria-label="Receipt totals">
          <article><span>Receipts</span><strong>{{ filteredReceipts().length }}</strong></article>
          <article><span>Gross value</span><strong>{{ money(summary().gross) }}</strong></article>
          <article><span>Refunded / voided</span><strong class="negative">−{{ money(summary().refunded) }}</strong></article>
          <article><span>Net value</span><strong>{{ money(summary().net) }}</strong></article>
        </section>

        <section class="filters" aria-label="Receipt filters">
          <label class="search-field">
            <span class="sr-only">Search receipts</span>
            <input
              type="search"
              [ngModel]="search()"
              (ngModelChange)="search.set($event)"
              placeholder="Search receipt, table, item or payment method"
              data-testid="receipt-search" />
          </label>
          <div class="filter-tabs" role="group" aria-label="Receipt status">
            @for (option of filterOptions; track option.value) {
              <button
                type="button"
                [class.active]="filter() === option.value"
                (click)="filter.set(option.value)">
                {{ option.label }}
              </button>
            }
          </div>
        </section>

        @if (loading()) {
          <div class="state-card" role="status">Loading receipt records…</div>
        } @else if (error()) {
          <div class="state-card state-card--error">
            <strong>Receipts could not be loaded.</strong>
            <span>{{ error() }}</span>
            <button type="button" class="button secondary" (click)="loadReceipts()">Try again</button>
          </div>
        } @else if (!filteredReceipts().length) {
          <div class="state-card">
            <strong>No matching receipts</strong>
            <span>Change the search or status filter to see more records.</span>
          </div>
        } @else {
          <div class="receipt-workspace">
            <aside class="receipt-list" aria-label="Receipt list">
              @for (receipt of filteredReceipts(); track receipt.id) {
                <button
                  type="button"
                  class="receipt-row"
                  [class.selected]="selected()?.id === receipt.id"
                  (click)="selectReceipt(receipt)"
                  [attr.aria-label]="'Open ' + receiptNumber(receipt) + ' for ' + receipt.table_name">
                  <span class="row-top">
                    <strong>{{ receiptNumber(receipt) }}</strong>
                    <span class="status" [attr.data-status]="receipt.receipt_status || 'open'">
                      {{ statusLabel(receipt) }}
                    </span>
                  </span>
                  <span class="table-name">{{ receipt.table_group_label || receipt.table_name }}</span>
                  <span class="row-meta">
                    <span>{{ receipt.created_at | date: 'dd MMM, HH:mm' }}</span>
                    <strong>{{ money(receipt.net_total_cents ?? receipt.total_cents) }}</strong>
                  </span>
                </button>
              }
            </aside>

            @if (selected(); as receipt) {
              <main class="receipt-detail" data-testid="receipt-detail">
                <div class="detail-heading">
                  <div>
                    <span class="eyebrow">{{ receiptNumber(receipt) }}</span>
                    <h2>{{ receipt.table_group_label || receipt.table_name }}</h2>
                    <p>{{ receipt.created_at | date: 'fullDate' }} · {{ receipt.created_at | date: 'shortTime' }}</p>
                  </div>
                  <span class="status status--large" [attr.data-status]="receipt.receipt_status || 'open'">
                    {{ statusLabel(receipt) }}
                  </span>
                </div>

                <div class="receipt-facts">
                  <div><span>Payment</span><strong>{{ paymentLabel(receipt) }}</strong></div>
                  <div><span>Table</span><strong>{{ receipt.table_group_label || receipt.table_name }}</strong></div>
                  <div><span>Order ID</span><strong>#{{ receipt.id }}</strong></div>
                </div>

                <section class="line-section">
                  <div class="section-heading">
                    <div>
                      <h3>Receipt items</h3>
                      <p>{{ receipt.items.length }} line{{ receipt.items.length === 1 ? '' : 's' }}</p>
                    </div>
                    @if (isOpen(receipt)) {
                      <a class="text-link" [routerLink]="['/staff/orders']" [queryParams]="{ orderId: receipt.id }">
                        Full order view
                      </a>
                    }
                  </div>

                  <div class="line-list">
                    @for (item of visibleItems(receipt); track item.id) {
                      <article class="receipt-line" [class.receipt-line--removed]="isRemovedLine(item)">
                        <div class="line-main">
                          <strong>{{ item.product_name }}</strong>
                          @if (item.customization_summary || item.line_modifiers_summary || item.notes) {
                            <small>{{ item.customization_summary || item.line_modifiers_summary || item.notes }}</small>
                          }
                          @if ((item.refunded_quantity || 0) > 0) {
                            <span class="refunded-note">
                              {{ item.refunded_quantity }} of {{ item.quantity }} refunded
                            </span>
                          }
                          @if (isRemovedLine(item)) {
                            <span class="removed-note">Removed · {{ item.removed_reason || 'No reason recorded' }}</span>
                          }
                        </div>
                        <div class="line-numbers">
                          <span>{{ item.quantity }} × {{ money(item.price_cents) }}</span>
                          <strong>{{ money(item.quantity * item.price_cents) }}</strong>
                        </div>
                        @if (isOpen(receipt) && !isRemovedLine(item)) {
                          <div class="line-actions">
                            @if (item.status !== 'delivered') {
                              <button type="button" (click)="changeQuantity(receipt, item, -1)" [disabled]="busy() || item.quantity <= 1">−</button>
                              <span>{{ item.quantity }}</span>
                              <button type="button" (click)="changeQuantity(receipt, item, 1)" [disabled]="busy()">+</button>
                            }
                            <button type="button" class="danger-link" (click)="openRemove(receipt, item)" [disabled]="busy()">Remove</button>
                          </div>
                        } @else if (canAdjust() && isPaid(receipt) && (item.refundable_quantity || 0) > 0) {
                          <div class="line-actions">
                            <button type="button" class="refund-button" (click)="openRefund(receipt, item)" [disabled]="busy()">
                              Refund item
                            </button>
                          </div>
                        }
                      </article>
                    }
                  </div>
                </section>

                <section class="totals-card" aria-label="Receipt totals">
                  <div><span>Menu subtotal</span><strong>{{ money(receipt.subtotal_cents || 0) }}</strong></div>
                  @if ((receipt.service_charge_cents || 0) > 0) {
                    <div><span>Service charge ({{ receipt.service_charge_percent || 0 }}%)</span><strong>{{ money(receipt.service_charge_cents || 0) }}</strong></div>
                  }
                  @if ((receipt.tax_cents || 0) > 0) {
                    <div><span>GST / tax</span><strong>{{ money(receipt.tax_cents || 0) }}</strong></div>
                  }
                  @if ((receipt.tip_amount_cents || 0) > 0) {
                    <div><span>Tip</span><strong>{{ money(receipt.tip_amount_cents || 0) }}</strong></div>
                  }
                  <div class="gross"><span>Original total</span><strong>{{ money(receipt.total_cents) }}</strong></div>
                  @if ((receipt.refunded_cents || 0) > 0) {
                    <div class="negative"><span>Refunded / voided</span><strong>−{{ money(receipt.refunded_cents || 0) }}</strong></div>
                  }
                  <div class="net"><span>Net receipt</span><strong>{{ money(receipt.net_total_cents ?? receipt.total_cents) }}</strong></div>
                </section>

                @if ((receipt.receipt_adjustments?.length || 0) > 0) {
                  <section class="audit-section">
                    <h3>Adjustment history</h3>
                    @for (adjustment of receipt.receipt_adjustments || []; track adjustment.id) {
                      <div class="audit-row">
                        <span class="audit-icon">{{ adjustment.type === 'receipt_void' ? 'V' : 'R' }}</span>
                        <div>
                          <strong>{{ adjustment.type === 'receipt_void' ? 'Receipt voided' : 'Item refunded' }}</strong>
                          <p>{{ adjustment.reason }}</p>
                          <small>{{ adjustment.created_at | date: 'medium' }} · {{ adjustment.created_by_name || 'Manager' }}</small>
                        </div>
                        <strong>−{{ money(adjustment.amount_cents) }}</strong>
                      </div>
                    }
                  </section>
                }

                <footer class="receipt-actions">
                  @if (canAdjust() && !isVoided(receipt)) {
                    <button type="button" class="button danger" (click)="openVoid(receipt)" [disabled]="busy()">
                      Void receipt
                    </button>
                  }
                  @if (!canAdjust()) {
                    <p>Only an owner or administrator can refund or void paid receipts.</p>
                  } @else {
                    <p>Refunds are recorded in Sakorio. Reverse the payment in HitPay or the terminal when required.</p>
                  }
                </footer>
              </main>
            }
          </div>
        }
      </div>

      @if (adjustmentMode()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <section class="modal" role="dialog" aria-modal="true" [attr.aria-labelledby]="'receipt-adjustment-title'" (click)="$event.stopPropagation()">
            <h2 id="receipt-adjustment-title">{{ modalTitle() }}</h2>
            <p>{{ modalDescription() }}</p>
            @if (adjustmentMode() === 'refund' && modalItem(); as item) {
              <label>
                Quantity to refund
                <input
                  type="number"
                  min="1"
                  [max]="item.refundable_quantity || 1"
                  [ngModel]="refundQuantity()"
                  (ngModelChange)="refundQuantity.set(+$event)" />
                <small>{{ item.refundable_quantity || 0 }} unit(s) available</small>
              </label>
            }
            <label>
              Reason
              <textarea
                rows="3"
                maxlength="500"
                [ngModel]="reason()"
                (ngModelChange)="reason.set($event)"
                placeholder="Required for the audit trail"></textarea>
            </label>
            <div class="modal-warning">
              This action is audited and cannot be silently removed from receipt history.
            </div>
            <div class="modal-actions">
              <button type="button" class="button secondary" (click)="closeModal()" [disabled]="busy()">Keep receipt</button>
              <button type="button" class="button danger" (click)="confirmAdjustment()" [disabled]="!modalValid() || busy()">
                {{ busy() ? 'Saving…' : modalConfirmLabel() }}
              </button>
            </div>
          </section>
        </div>
      }
    </app-sidebar>
  `,
  styles: [`
    :host { display: block; color: var(--color-text, #17202a); }
    .page-shell { padding: clamp(1rem, 2vw, 2rem); max-width: 1500px; margin: 0 auto; }
    .page-heading, .detail-heading, .section-heading, .receipt-actions, .row-top, .row-meta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .page-heading { align-items: flex-start; margin-bottom: 1.25rem; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { margin-bottom: .35rem; font-size: clamp(1.8rem, 3vw, 2.5rem); }
    h2 { margin-bottom: .2rem; }
    h3 { margin-bottom: .2rem; }
    p { color: var(--color-text-muted, #667085); margin-bottom: 0; }
    .eyebrow { display: block; margin-bottom: .3rem; color: var(--color-primary, #dd4b2a); font-size: .72rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .button { min-height: 44px; border: 0; border-radius: 12px; padding: .7rem 1rem; font-weight: 750; cursor: pointer; }
    .button:disabled { opacity: .55; cursor: wait; }
    .secondary { border: 1px solid var(--color-border, #d9dee7); background: white; color: inherit; }
    .danger { background: #b42318; color: white; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem; margin-bottom: 1rem; }
    .summary-grid article { padding: 1rem; border: 1px solid var(--color-border, #e1e5eb); border-radius: 14px; background: white; }
    .summary-grid span { display: block; color: #667085; font-size: .8rem; }
    .summary-grid strong { display: block; margin-top: .3rem; font-size: 1.25rem; }
    .negative { color: #b42318 !important; }
    .filters { display: flex; gap: .8rem; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .search-field { flex: 1; }
    input, textarea { width: 100%; box-sizing: border-box; border: 1px solid #cfd5df; border-radius: 10px; padding: .75rem .85rem; font: inherit; background: white; }
    input:focus, textarea:focus { outline: 3px solid rgba(221,75,42,.14); border-color: var(--color-primary, #dd4b2a); }
    .filter-tabs { display: flex; border: 1px solid #d9dee7; border-radius: 12px; overflow: auto; background: white; }
    .filter-tabs button { border: 0; background: transparent; padding: .72rem .9rem; white-space: nowrap; font-weight: 650; cursor: pointer; }
    .filter-tabs button.active { background: #fff0ec; color: #b9381d; }
    .receipt-workspace { display: grid; grid-template-columns: minmax(280px, 380px) minmax(0, 1fr); gap: 1rem; min-height: 580px; }
    .receipt-list, .receipt-detail, .state-card { border: 1px solid #e1e5eb; border-radius: 16px; background: white; }
    .receipt-list { padding: .55rem; max-height: calc(100vh - 330px); overflow: auto; }
    .receipt-row { width: 100%; border: 1px solid transparent; border-radius: 12px; background: transparent; padding: .85rem; text-align: left; cursor: pointer; color: inherit; }
    .receipt-row + .receipt-row { margin-top: .35rem; }
    .receipt-row:hover { background: #f8fafc; }
    .receipt-row.selected { border-color: #f0a08b; background: #fff5f1; }
    .table-name { display: block; margin: .45rem 0; font-weight: 700; }
    .row-meta { color: #667085; font-size: .8rem; }
    .row-meta strong { color: inherit; }
    .status { display: inline-flex; align-items: center; border-radius: 999px; padding: .25rem .55rem; background: #f2f4f7; color: #475467; font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; }
    .status[data-status='paid'] { background: #dcfae6; color: #067647; }
    .status[data-status='partially_refunded'] { background: #fff1c2; color: #8a4b0a; }
    .status[data-status='refunded'], .status[data-status='voided'], .status[data-status='cancelled'] { background: #fee4e2; color: #b42318; }
    .status--large { padding: .45rem .7rem; }
    .receipt-detail { padding: clamp(1rem, 2vw, 1.5rem); min-width: 0; }
    .detail-heading { align-items: flex-start; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb; }
    .receipt-facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: .65rem; margin: 1rem 0; }
    .receipt-facts div { padding: .75rem; border-radius: 10px; background: #f8fafc; }
    .receipt-facts span { display: block; color: #667085; font-size: .75rem; }
    .receipt-facts strong { display: block; margin-top: .2rem; overflow-wrap: anywhere; }
    .line-section { margin: 1.2rem 0; }
    .section-heading { margin-bottom: .7rem; }
    .text-link { color: #b9381d; font-weight: 700; text-decoration: none; }
    .receipt-line { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .75rem; padding: .85rem 0; border-top: 1px solid #edf0f4; }
    .receipt-line--removed { opacity: .55; text-decoration: line-through; }
    .line-main strong, .line-main small { display: block; }
    .line-main small { margin-top: .25rem; color: #667085; }
    .refunded-note, .removed-note { display: inline-block; margin-top: .35rem; border-radius: 999px; padding: .2rem .45rem; background: #fee4e2; color: #b42318; font-size: .72rem; font-weight: 700; }
    .line-numbers { min-width: 130px; text-align: right; }
    .line-numbers span, .line-numbers strong { display: block; }
    .line-numbers span { color: #667085; font-size: .8rem; }
    .line-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; align-items: center; gap: .35rem; }
    .line-actions button { min-height: 36px; border: 1px solid #d9dee7; border-radius: 9px; background: white; padding: .45rem .7rem; font-weight: 700; cursor: pointer; }
    .line-actions button:disabled { opacity: .45; }
    .line-actions .danger-link, .line-actions .refund-button { color: #b42318; border-color: #f2b8b5; }
    .totals-card { margin-left: auto; max-width: 440px; border-radius: 13px; padding: .9rem 1rem; background: #f8fafc; }
    .totals-card div { display: flex; justify-content: space-between; gap: 1rem; padding: .35rem 0; }
    .totals-card .gross { margin-top: .35rem; padding-top: .7rem; border-top: 1px solid #d9dee7; }
    .totals-card .net { margin-top: .35rem; padding-top: .7rem; border-top: 2px solid #1f2937; font-size: 1.12rem; }
    .audit-section { margin-top: 1.2rem; }
    .audit-row { display: grid; grid-template-columns: auto 1fr auto; gap: .7rem; align-items: start; padding: .8rem 0; border-top: 1px solid #edf0f4; }
    .audit-row p { margin: .18rem 0; color: #344054; }
    .audit-row small { color: #667085; }
    .audit-icon { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: #fee4e2; color: #b42318; font-weight: 800; }
    .receipt-actions { align-items: center; margin-top: 1.3rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
    .receipt-actions p { max-width: 580px; font-size: .8rem; }
    .state-card { min-height: 250px; display: grid; place-content: center; gap: .5rem; padding: 2rem; text-align: center; }
    .state-card--error { color: #b42318; }
    .toast { position: sticky; top: .5rem; z-index: 10; display: flex; justify-content: space-between; gap: 1rem; margin-bottom: .8rem; padding: .8rem 1rem; border: 1px solid #a6f4c5; border-radius: 12px; background: #ecfdf3; color: #067647; font-weight: 650; }
    .toast--warning { border-color: #fedf89; background: #fffaeb; color: #93370d; }
    .toast button { border: 0; background: transparent; color: inherit; font-size: 1.2rem; cursor: pointer; }
    .modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 1rem; background: rgba(16,24,40,.62); }
    .modal { width: min(520px, 100%); border-radius: 18px; padding: 1.3rem; background: white; box-shadow: 0 24px 80px rgba(0,0,0,.25); }
    .modal label { display: block; margin-top: 1rem; font-weight: 700; }
    .modal label input, .modal label textarea { margin-top: .4rem; }
    .modal label small { display: block; margin-top: .3rem; color: #667085; font-weight: 400; }
    .modal-warning { margin-top: 1rem; padding: .7rem; border-radius: 10px; background: #fffaeb; color: #93370d; font-size: .82rem; }
    .modal-actions { display: flex; justify-content: flex-end; gap: .6rem; margin-top: 1rem; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    @media (max-width: 980px) {
      .summary-grid { grid-template-columns: repeat(2, 1fr); }
      .receipt-workspace { grid-template-columns: minmax(240px, 310px) minmax(0, 1fr); }
    }
    @media (max-width: 760px) {
      .page-shell { padding: .75rem; }
      .page-heading, .filters { align-items: stretch; flex-direction: column; }
      .filter-tabs { width: 100%; }
      .filter-tabs button { flex: 1; }
      .receipt-workspace { display: block; }
      .receipt-list { max-height: 300px; margin-bottom: .8rem; }
      .receipt-facts { grid-template-columns: 1fr; }
      .receipt-actions { align-items: stretch; flex-direction: column; }
      .receipt-actions .button { width: 100%; }
    }
    @media (max-width: 430px) {
      .summary-grid { grid-template-columns: 1fr 1fr; }
      .summary-grid article { padding: .75rem; }
      .summary-grid strong { font-size: 1rem; }
      .detail-heading { flex-direction: column; }
      .receipt-line { grid-template-columns: 1fr; }
      .line-numbers { text-align: left; }
      .line-actions { justify-content: flex-start; }
    }
  `],
})
export class ReceiptsComponent implements OnInit {
  private api = inject(ApiService);
  private permissions = inject(PermissionService);

  readonly receipts = signal<Order[]>([]);
  readonly selected = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly toast = signal('');
  readonly toastWarning = signal(false);
  readonly search = signal('');
  readonly filter = signal<ReceiptFilter>('all');
  readonly adjustmentMode = signal<AdjustmentMode>(null);
  readonly modalReceipt = signal<Order | null>(null);
  readonly modalItem = signal<OrderItem | null>(null);
  readonly refundQuantity = signal(1);
  readonly reason = signal('');
  readonly tenant = signal<TenantSettings | null>(null);

  readonly filterOptions: { value: ReceiptFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'paid', label: 'Paid' },
    { value: 'adjusted', label: 'Adjusted' },
    { value: 'voided', label: 'Voided' },
  ];

  readonly filteredReceipts = computed(() => {
    const query = this.search().trim().toLowerCase();
    const filter = this.filter();
    return this.receipts().filter((receipt) => {
      const status = receipt.receipt_status || 'open';
      const matchesFilter =
        filter === 'all' ||
        (filter === 'open' && status === 'open') ||
        (filter === 'paid' && status === 'paid') ||
        (filter === 'adjusted' && ['partially_refunded', 'refunded'].includes(status)) ||
        (filter === 'voided' && ['voided', 'cancelled'].includes(status));
      if (!matchesFilter) return false;
      if (!query) return true;
      const haystack = [
        this.receiptNumber(receipt),
        receipt.table_name,
        receipt.table_group_label,
        receipt.payment_method,
        ...receipt.items.map((item) => item.product_name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  });

  readonly summary = computed(() =>
    this.filteredReceipts().reduce(
      (totals, receipt) => ({
        gross: totals.gross + receipt.total_cents,
        refunded: totals.refunded + (receipt.refunded_cents || 0),
        net: totals.net + (receipt.net_total_cents ?? receipt.total_cents),
      }),
      { gross: 0, refunded: 0, net: 0 },
    ),
  );

  ngOnInit(): void {
    this.loadReceipts();
  }

  loadReceipts(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ receipts: this.api.getOrders(true), tenant: this.api.getTenantSettings() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ receipts, tenant }) => {
          this.receipts.set(receipts);
          this.tenant.set(tenant);
          const currentId = this.selected()?.id;
          this.selected.set(receipts.find((row) => row.id === currentId) || receipts[0] || null);
        },
        error: (err) => this.error.set(this.errorText(err)),
      });
  }

  selectReceipt(receipt: Order): void {
    this.selected.set(receipt);
  }

  canAdjust(): boolean {
    return this.permissions.hasPermission(this.api.getCurrentUser(), 'receipt:adjust');
  }

  isOpen(receipt: Order): boolean {
    return (receipt.receipt_status || 'open') === 'open';
  }

  isPaid(receipt: Order): boolean {
    return ['paid', 'partially_refunded'].includes(receipt.receipt_status || '');
  }

  isVoided(receipt: Order): boolean {
    return ['voided', 'cancelled', 'refunded'].includes(receipt.receipt_status || '');
  }

  visibleItems(receipt: Order): OrderItem[] {
    return receipt.items;
  }

  isRemovedLine(item: OrderItem): boolean {
    return !!item.removed_by_customer || item.removed_by_user_id != null || item.status === 'cancelled';
  }

  receiptNumber(receipt: Order): string {
    return receipt.receipt_number || `R-${String(receipt.id).padStart(6, '0')}`;
  }

  statusLabel(receipt: Order): string {
    const labels: Record<string, string> = {
      open: 'Open',
      paid: 'Paid',
      partially_refunded: 'Part-refunded',
      refunded: 'Refunded',
      voided: 'Voided',
      cancelled: 'Cancelled',
    };
    return labels[receipt.receipt_status || 'open'] || receipt.status;
  }

  paymentLabel(receipt: Order): string {
    if (!receipt.paid_at) return 'Not paid';
    const method = (receipt.payment_method || 'recorded').replace(/_/g, ' ');
    return method.charAt(0).toUpperCase() + method.slice(1);
  }

  money(cents: number): string {
    const currency = this.tenant()?.currency_code || 'SGD';
    try {
      return new Intl.NumberFormat('en-SG', { style: 'currency', currency }).format((cents || 0) / 100);
    } catch {
      return `${currency} ${((cents || 0) / 100).toFixed(2)}`;
    }
  }

  changeQuantity(receipt: Order, item: OrderItem, delta: number): void {
    if (!item.id || this.busy()) return;
    const quantity = item.quantity + delta;
    if (quantity < 1) return;
    this.busy.set(true);
    this.api
      .updateOrderItemQuantityStaff(receipt.id, item.id, quantity)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.showToast('Receipt item quantity updated.');
          this.loadReceipts();
        },
        error: (err) => this.showToast(this.errorText(err), true),
      });
  }

  openRefund(receipt: Order, item: OrderItem): void {
    this.adjustmentMode.set('refund');
    this.modalReceipt.set(receipt);
    this.modalItem.set(item);
    this.refundQuantity.set(1);
    this.reason.set('');
  }

  openVoid(receipt: Order): void {
    this.adjustmentMode.set('void');
    this.modalReceipt.set(receipt);
    this.modalItem.set(null);
    this.reason.set('');
  }

  openRemove(receipt: Order, item: OrderItem): void {
    this.adjustmentMode.set('remove');
    this.modalReceipt.set(receipt);
    this.modalItem.set(item);
    this.reason.set('');
  }

  closeModal(): void {
    if (this.busy()) return;
    this.adjustmentMode.set(null);
    this.modalReceipt.set(null);
    this.modalItem.set(null);
    this.reason.set('');
  }

  modalTitle(): string {
    if (this.adjustmentMode() === 'refund') return `Refund ${this.modalItem()?.product_name || 'item'}`;
    if (this.adjustmentMode() === 'remove') return `Remove ${this.modalItem()?.product_name || 'item'}`;
    return `Void ${this.modalReceipt() ? this.receiptNumber(this.modalReceipt()!) : 'receipt'}`;
  }

  modalDescription(): string {
    if (this.adjustmentMode() === 'refund') {
      return 'Choose the quantity being refunded. The service charge and GST share are calculated automatically.';
    }
    if (this.adjustmentMode() === 'remove') {
      return 'Remove this line from the open order before payment.';
    }
    return 'This cancels the receipt and records its remaining paid value as a void adjustment.';
  }

  modalConfirmLabel(): string {
    if (this.adjustmentMode() === 'refund') return 'Record item refund';
    if (this.adjustmentMode() === 'remove') return 'Remove item';
    return 'Void receipt';
  }

  modalValid(): boolean {
    if (this.reason().trim().length < 3) return false;
    if (this.adjustmentMode() === 'refund') {
      const max = this.modalItem()?.refundable_quantity || 0;
      return this.refundQuantity() >= 1 && this.refundQuantity() <= max;
    }
    return !!this.adjustmentMode();
  }

  confirmAdjustment(): void {
    const mode = this.adjustmentMode();
    const receipt = this.modalReceipt();
    const item = this.modalItem();
    if (!mode || !receipt || !this.modalValid()) return;
    this.busy.set(true);

    if (mode === 'refund' && item?.id) {
      this.api
        .refundReceiptItem(receipt.id, item.id, this.refundQuantity(), this.reason().trim())
        .pipe(finalize(() => this.busy.set(false)))
        .subscribe({
          next: (result) => {
            this.closeModalAfterSave();
            this.showToast(
              `${this.money(result.amount_cents)} refund recorded. Reverse the payment in HitPay or the terminal if required.`,
              true,
            );
            this.loadReceipts();
          },
          error: (err) => this.showToast(this.errorText(err), true),
        });
      return;
    }

    if (mode === 'remove' && item?.id) {
      this.api
        .removeOrderItemStaff(receipt.id, item.id, this.reason().trim())
        .pipe(finalize(() => this.busy.set(false)))
        .subscribe({
          next: () => {
            this.closeModalAfterSave();
            this.showToast('Item removed from the open receipt.');
            this.loadReceipts();
          },
          error: (err) => this.showToast(this.errorText(err), true),
        });
      return;
    }

    this.api
      .voidReceipt(receipt.id, this.reason().trim())
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (result) => {
          this.closeModalAfterSave();
          this.showToast(
            result.payment_reversal_required
              ? `${this.money(result.amount_cents)} void recorded. Reverse the payment in HitPay or the terminal.`
              : 'Unpaid receipt voided.',
            result.payment_reversal_required,
          );
          this.loadReceipts();
        },
        error: (err) => this.showToast(this.errorText(err), true),
      });
  }

  private closeModalAfterSave(): void {
    this.adjustmentMode.set(null);
    this.modalReceipt.set(null);
    this.modalItem.set(null);
    this.reason.set('');
  }

  private showToast(message: string, warning = false): void {
    this.toast.set(message);
    this.toastWarning.set(warning);
  }

  private errorText(err: any): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (detail?.message) return detail.message;
    return err?.message || 'The request could not be completed.';
  }
}
