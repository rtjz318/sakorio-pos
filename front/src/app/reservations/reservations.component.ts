import { Component, inject, signal, computed, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  Reservation,
  ReservationCreate,
  ReservationUpdate,
  ReservationStatus,
  CanvasTable,
  OverbookingReport,
  TenantSummary,
  ReservationBookZone,
  GuestQueueEntry,
} from '../services/api.service';
import { PermissionService } from '../services/permission.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal.component';
import { FocusFirstInputDirective } from '../shared/focus-first-input.directive';
import { ReservationWeekSlotGridComponent } from '../shared/reservation-week-slot-grid.component';
import { tenantOpeningHoursHasMealSplit } from '../shared/booking-meal-split';
import { reservationDietaryNotesDisplay, reservationDietaryNotesFormValue } from '../shared/reservation-dietary-notes';
import { contactEmailValid, contactPhoneValid } from '../shared/contact-validators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiErrorMessageService } from '../services/api-error-message.service';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    SidebarComponent,
    TranslateModule,
    ConfirmationModalComponent,
    FocusFirstInputDirective,
    ReservationWeekSlotGridComponent,
  ],
  template: `
    <app-sidebar>
      <section class="reservation-command">
      <div class="page-header">
        <div>
          <span class="eyebrow">Front of house</span>
          <h1>{{ 'RESERVATIONS.TITLE' | translate }}</h1>
          <p class="page-subtitle">Run arrivals, seating, and guest handoffs from one service-day view.</p>
        </div>
        <div class="page-header-actions">
          <a [routerLink]="['/settings']" [queryParams]="{ section: 'reservations' }" class="btn btn-ghost btn-sm btn-icon" [title]="'RESERVATIONS.EDIT_RESERVATION_OPTIONS' | translate" aria-label="{{ 'RESERVATIONS.EDIT_RESERVATION_OPTIONS' | translate }}">
            <svg class="icon-settings" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span class="btn-icon-label">{{ 'RESERVATIONS.EDIT_RESERVATION_OPTIONS' | translate }}</span>
          </a>
          @if (tenantId != null) {
            <a [routerLink]="['/book', tenantId]" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">Public booking page</a>
          }
          @if (canWrite()) {
          <button class="btn btn-primary" (click)="openCreate()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {{ 'RESERVATIONS.NEW' | translate }}
          </button>
          }
        </div>
      </div>

      <div class="service-toolbar">
        <div class="date-control">
          <button type="button" class="date-step" (click)="moveDate(-1)" aria-label="Previous day">&#8249;</button>
          <div class="date-input-wrap">
            <span>Service date</span>
            <input type="date" [(ngModel)]="filterDate" (ngModelChange)="load()" class="filter-input" />
          </div>
          <button type="button" class="date-step" (click)="moveDate(1)" aria-label="Next day">&#8250;</button>
          <button type="button" class="today-button" (click)="goToToday()">Today</button>
        </div>
        <input type="search" [(ngModel)]="filterPhone" (ngModelChange)="load()" placeholder="Search phone" class="filter-input guest-search" />
        <select [(ngModel)]="filterStatus" (ngModelChange)="load()" class="filter-select">
          <option value="">{{ 'RESERVATIONS.ALL_STATUSES' | translate }}</option>
          <option value="booked">{{ 'RESERVATIONS.STATUS_BOOKED' | translate }}</option>
          <option value="seated">{{ 'RESERVATIONS.STATUS_SEATED' | translate }}</option>
          <option value="finished">{{ 'RESERVATIONS.STATUS_FINISHED' | translate }}</option>
          <option value="cancelled">{{ 'RESERVATIONS.STATUS_CANCELLED' | translate }}</option>
          <option value="no_show">{{ 'RESERVATIONS.STATUS_NO_SHOW' | translate }}</option>
        </select>
        <button class="btn btn-ghost btn-sm" (click)="load()">{{ 'ORDERS.REFRESH' | translate }}</button>
      </div>
      </section>

      <section class="service-metrics" aria-label="Reservation summary">
        <article class="metric-card">
          <span>Expected guests</span>
          <strong>{{ expectedGuestCount() }}</strong>
          <small>Across {{ activeReservationCount() }} active bookings</small>
        </article>
        <article class="metric-card booked-metric">
          <span>Awaiting arrival</span>
          <strong>{{ bookedCount() }}</strong>
          <small>Bookings still to welcome</small>
        </article>
        <article class="metric-card seated-metric">
          <span>Now seated</span>
          <strong>{{ seatedCount() }}</strong>
          <small>Guests currently in service</small>
        </article>
        <article class="metric-card warning-metric" [class.has-warning]="unassignedCount() > 0">
          <span>Needs a table</span>
          <strong>{{ unassignedCount() }}</strong>
          <small>{{ unassignedCount() === 0 ? 'All arrivals are covered' : 'Assign before arrival' }}</small>
        </article>
      </section>

      @if (loading()) {
        <div class="empty-state"><p>{{ 'RESERVATIONS.LOADING' | translate }}</p></div>
      } @else if (reservations().length === 0) {
        <div class="empty-state">
          <p>{{ 'RESERVATIONS.NONE' | translate }}</p>
          @if (canWrite()) {
            <button class="btn btn-primary" (click)="openCreate()">{{ 'RESERVATIONS.NEW' | translate }}</button>
          }
        </div>
      } @else {
        <section class="reservation-board">
          <div class="board-heading">
            <div>
              <span class="eyebrow">Service timeline</span>
              <h2>{{ serviceDateLabel() }}</h2>
            </div>
            <span class="board-count">{{ reservations().length }} reservations</span>
          </div>
          <div class="reservation-list">
          @for (r of sortedReservations(); track r.id) {
            <article
              class="reservation-card"
              [class.status-booked]="r.status === 'booked'"
              [class.status-seated]="r.status === 'seated'"
              [class.status-finished]="r.status === 'finished'"
              [class.status-cancelled]="r.status === 'cancelled'"
              [class.status-no_show]="r.status === 'no_show'"
            >
              <div class="arrival-time">
                <strong>{{ displayTime(r.reservation_time) }}</strong>
                <span>#{{ r.id }}</span>
              </div>
              <div class="reservation-main">
                <div class="card-header">
                  <span class="res-name">{{ r.customer_name }}</span>
                  <span class="status-badge" [class]="r.status">{{ getStatusLabel(r.status) | translate }}</span>
                  @if (isSlotOverbooked(r)) {
                    <span class="overbooked-badge">{{ 'RESERVATIONS.OVERBOOKED' | translate }}</span>
                  }
                </div>
                <div class="reservation-facts">
                  <span class="party-fact">{{ r.party_size }} guests</span>
                  <span [class.needs-table]="!r.table_id">{{ getTableDisplay(r) }}</span>
                  @if (r.service_type) { <span>{{ serviceTypeLabel(r.service_type) }}</span> }
                  @if (r.seating_preference) { <span>{{ seatingLabel(r.seating_preference) }}</span> }
                </div>
                <div class="contact-row">
                  <a [href]="'tel:' + r.customer_phone">{{ r.customer_phone }}</a>
                  @if (r.customer_email) { <a [href]="'mailto:' + r.customer_email">{{ r.customer_email }}</a> }
                </div>
                @if (r.service_type) {
                  <span class="sr-only">{{ 'BOOK.SERVICE_TYPE' | translate }}: {{ serviceTypeLabel(r.service_type) }}</span>
                }
                @if (r.client_notes) {
                  <div class="res-notes client-notes">{{ r.client_notes }}</div>
                }
                @if (dietaryNotesLine(r); as dn) {
                  <div class="dietary-alert"><strong>Guest requirement</strong><span>{{ dn }}</span></div>
                } @else if (r.allergies_has) {
                  <div class="dietary-alert"><strong>Allergy noted</strong></div>
                }
                @if (r.owner_notes) {
                  <div class="res-notes owner-notes"><strong>{{ 'RESERVATIONS.OWNER_NOTES' | translate }}:</strong> {{ r.owner_notes }}</div>
                }
                @if (latestQueueMatch(r); as queueMatch) {
                  <div class="queue-handoff-summary">
                    <span class="queue-handoff-chip">{{ queueStatusLabel(queueMatch) }}</span>
                    <span class="queue-handoff-copy">
                      {{ queueMatch.linked_reservation_id === r.id ? 'Queue linked to this reservation' : 'Recent queue history found' }}
                      · {{ queueRelativeTime(queueMatch.updated_at || queueMatch.requested_at) }}
                    </span>
                  </div>
                }
                </div>
              <div class="card-actions">
                @if (r.status === 'booked' && canWrite()) {
                  <button class="btn btn-primary primary-reservation-action" (click)="openReservationTable(r)">{{ reservationTableActionLabel(r) }}</button>
                  <details class="more-actions">
                    <summary>More</summary>
                    <div class="more-actions-menu">
                      <button type="button" (click)="openQueueForReservation(r)">{{ hasActiveQueueMatch(r) ? 'Open queue' : 'Send to queue' }}</button>
                      @if (r.customer_email || r.customer_phone) {
                        <button type="button" (click)="sendReminder(r)" [disabled]="sendingReminderId() === r.id">{{ sendingReminderId() === r.id ? ('COMMON.LOADING' | translate) : ('RESERVATIONS.SEND_REMINDER' | translate) }}</button>
                      }
                      <button type="button" (click)="openEdit(r)">{{ 'RESERVATIONS.EDIT' | translate }}</button>
                      <button type="button" class="no-show-btn" (click)="confirmNoShow(r)">{{ 'RESERVATIONS.NO_SHOW' | translate }}</button>
                      <button type="button" class="danger" (click)="confirmCancel(r)">{{ 'RESERVATIONS.CANCEL' | translate }}</button>
                    </div>
                  </details>
                }
                @if (r.status === 'seated' && canWrite()) {
                  <button class="btn btn-primary primary-reservation-action" (click)="openPosForReservation(r)">Open POS</button>
                  <button class="btn btn-ghost btn-sm" (click)="finish(r)">{{ 'RESERVATIONS.FINISH' | translate }}</button>
                }
              </div>
            </article>
          }
          </div>
        </section>
      }

      <!-- Create/Edit modal -->
      @if (showForm()) {
        <div class="modal-overlay">
          <div class="modal-content" (click)="$event.stopPropagation()" appFocusFirstInput>
            <div class="modal-header">
              <h3>{{ editingReservation() ? ('RESERVATIONS.EDIT' | translate) : ('RESERVATIONS.NEW' | translate) }}</h3>
              <button type="button" class="close-btn" (click)="closeForm()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <form (ngSubmit)="saveReservation()" class="reservation-modal-form">
              <div class="modal-body">
                <p class="reservation-modal-hint">{{ 'BOOK.WEEK_GRID_HINT' | translate }}</p>
                <div class="res-booking-controls">
                  <div class="form-group">
                    <label for="res-modal-party">{{ 'RESERVATIONS.PARTY_SIZE' | translate }}</label>
                    <input
                      id="res-modal-party"
                      type="number"
                      name="partySize"
                      min="1"
                      [max]="maxPartySize()"
                      required
                      [(ngModel)]="formPartySize"
                      (ngModelChange)="loadSlotCapacity()"
                    />
                  </div>
                  @if (hasMealSplit()) {
                    <div class="form-group">
                      <label for="res-modal-service">{{ 'BOOK.SERVICE_TYPE' | translate }}</label>
                      <select id="res-modal-service" [(ngModel)]="formService" name="formService" (ngModelChange)="loadSlotCapacity()">
                        <option value="all">{{ 'BOOK.SERVICE_ALL' | translate }}</option>
                        <option value="lunch">{{ 'BOOK.SERVICE_LUNCH' | translate }}</option>
                        <option value="dinner">{{ 'BOOK.SERVICE_DINNER' | translate }}</option>
                      </select>
                    </div>
                  }
                  <div class="form-group res-seating-group">
                    <span class="label-block">{{ 'BOOK.SEATING_PREFERENCE' | translate }}</span>
                    <div class="radio-row">
                      <label class="radio-label">
                        <input type="radio" name="resSeating" [(ngModel)]="formSeating" (ngModelChange)="onSeatingPreferenceChange(); loadSlotCapacity()" value="no_preference" />
                        {{ 'BOOK.SEATING_ANY' | translate }}
                      </label>
                      <label class="radio-label">
                        <input type="radio" name="resSeating" [(ngModel)]="formSeating" (ngModelChange)="onSeatingPreferenceChange(); loadSlotCapacity()" value="indoor" />
                        {{ 'BOOK.SEATING_INDOOR' | translate }}
                      </label>
                      <label class="radio-label">
                        <input type="radio" name="resSeating" [(ngModel)]="formSeating" (ngModelChange)="onSeatingPreferenceChange(); loadSlotCapacity()" value="terrace" />
                        {{ 'BOOK.SEATING_TERRACE' | translate }}
                      </label>
                    </div>
                  </div>
                  @if (bookZones().length >= 1 && bookZonesForSeating().length === 0) {
                    <div class="form-error form-hint-block">{{ 'BOOK.NO_ZONE_FOR_SEATING' | translate }}</div>
                  }
                  @if (bookZonesForSeating().length >= 2) {
                    <div class="form-group">
                      <label for="res-modal-zone">{{ 'BOOK.LOCATION_ZONE' | translate }}</label>
                      <select id="res-modal-zone" [(ngModel)]="formFloorId" name="resFloorId" required (ngModelChange)="loadSlotCapacity()">
                        <option [ngValue]="null" disabled>{{ 'BOOK.LOCATION_ZONE_PLACEHOLDER' | translate }}</option>
                        @for (z of bookZonesForSeating(); track z.id) {
                          <option [ngValue]="z.id">{{ z.name }}</option>
                        }
                      </select>
                    </div>
                  }
                  <div class="form-group">
                    <label for="res-modal-dietary">{{ 'RESERVATIONS.CUSTOMER_NOTES' | translate }}</label>
                    <textarea
                      id="res-modal-dietary"
                      class="res-dietary-notes"
                      [(ngModel)]="formDietaryNotes"
                      name="resDietaryNotes"
                      rows="2"
                      [placeholder]="'BOOK.ALLERGIES_DETAIL_PLACEHOLDER' | translate"
                    ></textarea>
                  </div>
                </div>
                @if (tenantId != null) {
                  <app-reservation-week-slot-grid
                    [tenantId]="tenantId"
                    [partySize]="formPartySize"
                    [timezone]="tenantSummary()?.timezone ?? null"
                    [weekAnchorSeed]="formDate"
                    [excludeReservationId]="editingReservation()?.id ?? null"
                    [serviceType]="hasMealSplit() ? formService : 'all'"
                    [bookFloorId]="formFloorId"
                    [(selectedDate)]="formDate"
                    [(selectedTime)]="formTime"
                    (selectedDateChange)="loadSlotCapacity()"
                    (selectedTimeChange)="loadSlotCapacity()"
                  />
                }
                @if (slotCapacity(); as cap) {
                  <p class="slot-capacity">{{ 'RESERVATIONS.SEATS_LEFT' | translate }}: {{ cap.seats_left }} · {{ 'RESERVATIONS.TABLES_LEFT' | translate }}: {{ cap.tables_left }}</p>
                }
                <div class="form-group">
                  <label for="res-modal-name">{{ 'RESERVATIONS.CUSTOMER_NAME' | translate }}</label>
                  <input id="res-modal-name" type="text" name="customerName" [(ngModel)]="formName" required autocomplete="name" />
                </div>
                <div class="form-group">
                  <label for="res-modal-phone">{{ 'RESERVATIONS.CUSTOMER_PHONE' | translate }}</label>
                  <div class="phone-with-prefill">
                    <input id="res-modal-phone" type="tel" name="customerPhone" [(ngModel)]="formPhone" required autocomplete="tel" />
                    @if (!editingReservation()) {
                      <button type="button" class="btn btn-ghost btn-sm" (click)="prefillFromPhone()" [disabled]="prefillLoading() || !formPhone.trim()" [title]="'RESERVATIONS.PREFILL_FROM_PHONE' | translate">
                        {{ prefillLoading() ? ('COMMON.LOADING' | translate) : ('RESERVATIONS.PREFILL_FROM_PHONE' | translate) }}
                      </button>
                    }
                  </div>
                  @if (prefillMessage()) {
                    <small class="prefill-message" [class.prefill-success]="prefillSuccess()">{{ prefillMessage() }}</small>
                  }
                </div>
                <div class="form-group">
                  <label for="res-modal-email">{{ 'RESERVATIONS.CUSTOMER_EMAIL' | translate }}</label>
                  <input
                    id="res-modal-email"
                    type="email"
                    name="customerEmail"
                    [(ngModel)]="formEmail"
                    placeholder="your@email.com"
                    autocomplete="email"
                  />
                </div>
                <div class="form-group">
                  <label for="res-modal-notes">{{ 'RESERVATIONS.RESERVATION_NOTES' | translate }}</label>
                  <textarea
                    id="res-modal-notes"
                    name="clientNotes"
                    [(ngModel)]="formClientNotes"
                    rows="2"
                    [placeholder]="'RESERVATIONS.RESERVATION_NOTES_PLACEHOLDER' | translate"
                  ></textarea>
                </div>
                <div class="form-group">
                  <label for="res-modal-owner-notes">{{ 'RESERVATIONS.OWNER_NOTES' | translate }}</label>
                  <textarea
                    id="res-modal-owner-notes"
                    name="ownerNotes"
                    [(ngModel)]="formOwnerNotes"
                    rows="2"
                    [placeholder]="'RESERVATIONS.OWNER_NOTES_PLACEHOLDER' | translate"
                  ></textarea>
                </div>
                @if (formError()) {
                  <div class="form-error">{{ formError() }}</div>
                }
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-ghost" (click)="closeForm()">{{ 'COMMON.CANCEL' | translate }}</button>
                <button type="submit" class="btn btn-primary">{{ 'COMMON.SAVE' | translate }}</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Reservation table assignment / seating modal -->
      @if (reservationToSeat()) {
        <div class="modal-overlay">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <p class="modal-eyebrow">{{ reservationTableMode() === 'seat' ? 'Arrival handoff' : 'Floor planning' }}</p>
                <h3>{{ reservationTableMode() === 'seat' ? 'Seat at a table' : (reservationToSeat()?.table_id ? 'Change assigned table' : 'Assign a table') }}</h3>
              </div>
              <button class="close-btn" (click)="closeSeatModal()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <p class="table-action-intro">
                <strong>{{ reservationToSeat()?.customer_name }}</strong>
                · {{ reservationToSeat()?.party_size }} guests
                · {{ reservationToSeat()?.reservation_date }} at {{ reservationToSeat()?.reservation_time }}
              </p>
              @if (reservationTableMode() === 'seat' && upcomingNoTableCount() !== null && upcomingNoTableCount()! > 0) {
                <p class="upcoming-no-table-warning">{{ 'RESERVATIONS.UPCOMING_NO_TABLE' | translate: { count: upcomingNoTableCount()! } }}</p>
              }
              @if (reservationTableError()) {
                <p class="table-action-error" role="alert">{{ reservationTableError() }}</p>
              }
              <div class="table-list">
                @for (t of availableTablesForSeat(); track t.id) {
                  <div class="table-option-wrap">
                    @if (t.upcoming_reservation) {
                      <p class="table-upcoming-warning">{{ 'RESERVATIONS.TABLE_UPCOMING' | translate: { table: t.name, time: t.upcoming_reservation.reservation_time, name: t.upcoming_reservation.customer_name } }}</p>
                    }
                    <button
                      class="table-option"
                      [class.current-assignment]="reservationToSeat()?.table_id === t.id"
                      [disabled]="reservationTableSubmittingId() !== null"
                      (click)="applyReservationTable(t.id!)">
                      <span>
                        <strong>{{ t.name }}</strong>
                        <small>{{ tableCapacity(t) }} seats · {{ tableOperationalLabel(t) }}</small>
                      </span>
                      <span class="table-option-action">
                        @if (reservationToSeat()?.table_id === t.id && reservationTableMode() === 'assign') {
                          Assigned
                        } @else if (reservationTableSubmittingId() === t.id) {
                          Saving…
                        } @else {
                          {{ reservationTableMode() === 'seat' ? 'Seat here' : 'Assign' }}
                        }
                      </span>
                    </button>
                  </div>
                }
              </div>
              @if (availableTablesForSeat().length === 0) {
                <p class="no-tables">No table with enough capacity is available for this action.</p>
              }
            </div>
          </div>
        </div>
      }

      <!-- Cancel confirm -->
      @if (reservationToCancel()) {
        <app-confirmation-modal
          title="RESERVATIONS.CANCEL_CONFIRM_TITLE"
          message="RESERVATIONS.CANCEL_CONFIRM_MESSAGE"
          [confirmText]="'RESERVATIONS.YES_CANCEL_RESERVATION'"
          cancelText="COMMON.CLOSE"
          confirmBtnClass="btn-danger"
          [showSecondaryButton]="false"
          (confirm)="doCancel()"
          (cancel)="reservationToCancel.set(null)"
        />
      }
      <!-- No-show confirm -->
      @if (reservationToNoShow()) {
        <app-confirmation-modal
          title="RESERVATIONS.NO_SHOW_CONFIRM_TITLE"
          message="RESERVATIONS.NO_SHOW_CONFIRM_MESSAGE"
          [confirmText]="'RESERVATIONS.NO_SHOW'"
          cancelText="COMMON.CANCEL"
          confirmBtnClass="btn-primary"
          (confirm)="doNoShow()"
          (cancel)="reservationToNoShow.set(null)"
        />
      }
    </app-sidebar>
  `,
  styles: [`
    :host { --reservation-ink: #18201f; --reservation-muted: #6f7775; --reservation-line: #e4e7e4; --reservation-soft: #f5f7f5; --reservation-accent: #d95132; display: block; }
    .reservation-command { padding: 1.4rem; border: 1px solid var(--reservation-line); border-radius: 22px; background: linear-gradient(135deg, #fff 0%, #fbf8f4 100%); box-shadow: 0 14px 36px rgba(24,32,31,.06); }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; margin-bottom: 1.25rem; }
    .page-header h1 { margin: .15rem 0 .2rem; color: var(--reservation-ink); font-size: clamp(1.75rem, 3vw, 2.45rem); letter-spacing: -.045em; }
    .eyebrow { color: #a64229; font-size: .72rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    .page-subtitle { max-width: 650px; margin: 0; color: var(--reservation-muted); line-height: 1.5; }
    .page-header-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .btn-icon { display: inline-flex; align-items: center; gap: 0.35rem; }
    .btn-icon .icon-settings { flex-shrink: 0; }
    .service-toolbar { display: grid; grid-template-columns: auto minmax(220px, 1fr) minmax(150px, 190px) auto; gap: .75rem; align-items: stretch; }
    .date-control { display: flex; align-items: stretch; border: 1px solid var(--reservation-line); border-radius: 14px; background: #fff; overflow: hidden; }
    .date-step, .today-button { border: 0; background: #fff; color: var(--reservation-ink); font-weight: 750; cursor: pointer; }
    .date-step { width: 38px; font-size: 1.5rem; }
    .date-step:hover, .today-button:hover { background: #f7f2ed; }
    .today-button { padding: 0 .85rem; border-left: 1px solid var(--reservation-line); }
    .date-input-wrap { display: grid; gap: .05rem; min-width: 165px; padding: .35rem .45rem; border-left: 1px solid var(--reservation-line); }
    .date-input-wrap span { padding-left: .35rem; color: var(--reservation-muted); font-size: .66rem; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
    .filter-input, .filter-select { min-height: 48px; padding: .65rem .85rem; border: 1px solid var(--reservation-line); border-radius: 14px; background: #fff; color: var(--reservation-ink); }
    .date-input-wrap .filter-input { min-height: 0; padding: 0 .3rem; border: 0; border-radius: 0; }
    .service-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem; margin: 1rem 0; }
    .metric-card { display: grid; gap: .2rem; min-height: 112px; padding: 1rem 1.1rem; border: 1px solid var(--reservation-line); border-radius: 18px; background: #fff; box-shadow: 0 10px 28px rgba(24,32,31,.045); }
    .metric-card span { color: var(--reservation-muted); font-size: .76rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
    .metric-card strong { color: var(--reservation-ink); font-size: 2rem; letter-spacing: -.04em; }
    .metric-card small { color: var(--reservation-muted); }
    .booked-metric { border-top: 3px solid #4b7bec; }
    .seated-metric { border-top: 3px solid #2f9e73; }
    .warning-metric { border-top: 3px solid #cbd5d1; }
    .warning-metric.has-warning { border-top-color: #e79032; background: #fffaf2; }
    .reservation-board { border: 1px solid var(--reservation-line); border-radius: 22px; background: #fff; overflow: hidden; box-shadow: 0 16px 40px rgba(24,32,31,.06); }
    .board-heading { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1.2rem 1.35rem; border-bottom: 1px solid var(--reservation-line); background: #fbfcfb; }
    .board-heading h2 { margin: .15rem 0 0; color: var(--reservation-ink); font-size: 1.35rem; }
    .board-count { padding: .45rem .75rem; border-radius: 999px; background: #edf1ef; color: #53605c; font-size: .8rem; font-weight: 750; }
    .reservation-list { display: grid; }
    .reservation-card { display: grid; grid-template-columns: 90px minmax(0, 1fr) auto; gap: 1rem; align-items: center; padding: 1.05rem 1.35rem; border-bottom: 1px solid var(--reservation-line); background: #fff; transition: background .18s ease, box-shadow .18s ease; }
    .reservation-card:last-child { border-bottom: 0; }
    .reservation-card:hover { position: relative; z-index: 1; background: #fdfcfb; box-shadow: inset 4px 0 0 #e8aa98; }
    .reservation-card.status-finished, .reservation-card.status-cancelled, .reservation-card.status-no_show { background: #fafafa; opacity: .78; }
    .arrival-time { display: grid; align-content: center; gap: .2rem; min-height: 68px; padding-right: 1rem; border-right: 1px solid var(--reservation-line); }
    .arrival-time strong { color: var(--reservation-ink); font-size: 1.25rem; letter-spacing: -.02em; }
    .arrival-time span { color: var(--reservation-muted); font-size: .76rem; }
    .card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: .4rem; flex-wrap: wrap; }
    .res-name { color: var(--reservation-ink); font-size: 1.05rem; font-weight: 800; }
    .status-badge { font-size: 0.7rem; font-weight: 800; letter-spacing: .04em; padding: 0.28rem 0.58rem; border-radius: 999px; text-transform: uppercase; }
    .status-badge.booked { background: #dbeafe; color: #1d4ed8; }
    .status-badge.seated { background: #dcfce7; color: #15803d; }
    .status-badge.finished { background: #f3f4f6; color: #4b5563; }
    .status-badge.cancelled { background: #fee2e2; color: #b91c1c; }
    .status-badge.no_show { background: #ffedd5; color: #c2410c; }
    .reservation-facts, .contact-row { display: flex; flex-wrap: wrap; gap: .45rem .85rem; align-items: center; }
    .reservation-facts span { color: #57615e; font-size: .85rem; }
    .reservation-facts span + span::before { content: ''; display: inline-block; width: 4px; height: 4px; margin: 0 .6rem .15rem 0; border-radius: 50%; background: #c1c8c5; }
    .reservation-facts .party-fact { color: var(--reservation-ink); font-weight: 750; }
    .reservation-facts .needs-table { color: #b55a1d; font-weight: 750; }
    .contact-row { margin-top: .38rem; }
    .contact-row a { color: #64716d; font-size: .82rem; text-decoration: none; }
    .contact-row a:hover { color: var(--reservation-accent); text-decoration: underline; }
    .dietary-alert { display: inline-flex; flex-wrap: wrap; gap: .4rem; margin-top: .5rem; padding: .35rem .55rem; border-radius: 8px; background: #fff3e5; color: #9a4819; font-size: .78rem; }
    .queue-handoff-summary { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-top: 0.55rem; }
    .queue-handoff-chip { display: inline-flex; align-items: center; border-radius: 999px; background: #fff7ed; color: #c2410c; font-size: 0.75rem; font-weight: 700; padding: 0.28rem 0.6rem; }
    .queue-handoff-copy { font-size: 0.82rem; color: #64748b; }
    .card-actions { position: relative; display: flex; justify-content: flex-end; gap: .5rem; align-items: center; }
    .primary-reservation-action { min-width: 108px; }
    .more-actions { position: relative; }
    .more-actions summary { min-width: 70px; padding: .65rem .8rem; border: 1px solid var(--reservation-line); border-radius: 10px; background: #fff; color: var(--reservation-ink); font-size: .85rem; font-weight: 750; text-align: center; cursor: pointer; list-style: none; }
    .more-actions summary::-webkit-details-marker { display: none; }
    .more-actions-menu { position: absolute; z-index: 20; top: calc(100% + .4rem); right: 0; display: grid; min-width: 180px; padding: .4rem; border: 1px solid var(--reservation-line); border-radius: 12px; background: #fff; box-shadow: 0 16px 36px rgba(24,32,31,.14); }
    .more-actions-menu button { padding: .65rem .75rem; border: 0; border-radius: 8px; background: transparent; color: var(--reservation-ink); text-align: left; cursor: pointer; }
    .more-actions-menu button:hover { background: var(--reservation-soft); }
    .more-actions-menu button.danger { color: #b42318; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    @media (max-width: 1000px) {
      .service-toolbar { grid-template-columns: 1fr 1fr; }
      .service-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 700px) {
      .reservation-command { padding: 1rem; border-radius: 16px; }
      .page-header { display: grid; }
      .service-toolbar { grid-template-columns: 1fr; }
      .date-control { width: 100%; }
      .date-input-wrap { flex: 1; }
      .service-metrics { grid-template-columns: 1fr 1fr; }
      .metric-card { min-height: 96px; padding: .85rem; }
      .reservation-card { grid-template-columns: 68px minmax(0, 1fr); padding: 1rem; }
      .card-actions { grid-column: 1 / -1; justify-content: stretch; padding-left: 84px; }
      .card-actions > .btn, .card-actions .primary-reservation-action { flex: 1; }
      .more-actions { flex: 1; }
      .more-actions summary { width: 100%; box-sizing: border-box; }
    }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: #fff; border-radius: var(--radius-md, 8px); max-width: min(720px, 96vw); width: 100%; max-height: 90vh; overflow: auto; box-shadow: var(--shadow-lg, 0 12px 32px rgba(0,0,0,0.1)); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1.15rem 1.25rem; border-bottom: 1px solid #e5e7eb; }
    .modal-header h3 { margin: .15rem 0 0; color: var(--reservation-ink); }
    .modal-eyebrow { margin: 0; color: #a64229; font-size: .68rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .modal-body { padding: 1.25rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.5rem; padding: 1rem; border-top: 1px solid #e5e7eb; }
    .reservation-modal-hint { font-size: 0.875rem; color: var(--color-text-muted); margin: 0 0 var(--space-3) 0; line-height: 1.45; }
    .form-error { color: var(--color-error); font-size: 0.875rem; margin-top: var(--space-2); }
    .form-hint-block { margin-bottom: 0.5rem; }
    .table-action-intro { margin: 0 0 1rem; color: var(--reservation-muted); }
    .table-action-error { margin: 0 0 1rem; padding: .75rem .85rem; border: 1px solid #efb4a7; border-radius: 10px; background: #fff4f1; color: #9f2e1a; }
    .table-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
    .table-option { display: flex; justify-content: space-between; align-items: center; gap: 1rem; width: 100%; min-height: 74px; padding: .8rem .9rem; text-align: left; border: 1px solid #dfe4e1; border-radius: 12px; background: #fff; cursor: pointer; }
    .table-option span:first-child { display: grid; gap: .15rem; }
    .table-option small { color: var(--reservation-muted); }
    .table-option-action { color: #a64229; font-size: .8rem; font-weight: 800; white-space: nowrap; }
    .table-option:hover { border-color: #dc9d8c; background: #fff9f6; }
    .table-option.current-assignment { border-color: #70a69a; background: #f0f8f6; }
    .table-option:disabled { cursor: wait; opacity: .7; }
    .no-tables { color: #6b7280; }
    .overbooked-badge { font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; background: #fef2f2; color: #b91c1c; margin-left: 0.25rem; }
    .slot-capacity { font-size: 0.875rem; color: #4b5563; margin-bottom: 0.5rem; }
    .upcoming-no-table-warning { background: #fef3c7; padding: 0.5rem; border-radius: 4px; margin-bottom: 0.75rem; font-size: 0.875rem; }
    .table-option-wrap { min-width: 0; }
    .table-upcoming-warning { font-size: 0.8rem; color: #b45309; margin-bottom: 0.25rem; }
    .empty-state { text-align: center; padding: 2rem; color: #6b7280; }
    .btn.danger { color: #dc2626; }
    .btn.no-show-btn { color: #b45309; }
    .res-notes { font-size: 0.85rem; margin-top: 0.25rem; }
    .client-notes { color: #4b5563; }
    .owner-notes { color: #6b21a8; }
    .client-tech { margin-top: 0.5rem; font-size: 0.8rem; color: #6b7280; }
    .client-tech summary { cursor: pointer; }
    .client-tech-inner { margin-top: 0.25rem; padding-left: 0.5rem; }
    @media (max-width: 600px) {
      .table-list { grid-template-columns: 1fr; }
      .modal-overlay { align-items: flex-end; }
      .modal-content { max-width: 100vw; max-height: 88vh; border-radius: 18px 18px 0 0; }
    }
    .client-tech .ua { word-break: break-all; }
    .phone-with-prefill { display: flex; gap: 0.5rem; align-items: center; }
    .phone-with-prefill input { flex: 1; min-width: 0; width: auto; }
    .prefill-message { display: block; margin-top: 0.25rem; font-size: 0.8rem; color: #6b7280; }
    .prefill-message.prefill-success { color: #15803d; }
    .res-meta { font-size: 0.85rem; color: #4b5563; }
    .res-booking-controls { margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb; }
    .res-seating-group .label-block { display: block; font-weight: 500; margin-bottom: 0.35rem; }
    .res-seating-group .radio-row { display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; align-items: center; }
    .res-seating-group .radio-label { display: inline-flex; align-items: center; gap: 0.5rem; font-weight: normal; font-size: 1rem; line-height: 1.4; cursor: pointer; }
    .reservation-modal-form input[type="radio"],
    .reservation-modal-form input[type="checkbox"] { width: 1.125em; height: 1.125em; flex-shrink: 0; margin: 0; padding: 0; border: none; background: transparent; accent-color: var(--color-primary, #2563eb); vertical-align: middle; }
    .res-dietary-notes { display: block; width: 100%; margin-top: 0.35rem; padding: 0.35rem 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
  `],
})
export class ReservationsComponent implements OnInit, OnDestroy {
  @ViewChild(ReservationWeekSlotGridComponent) private weekSlotGrid?: ReservationWeekSlotGridComponent;

  private api = inject(ApiService);
  private permissions = inject(PermissionService);
  private translate = inject(TranslateService);
  private apiErr = inject(ApiErrorMessageService);
  private router = inject(Router);

  /** Public tenant (timezone for week grid, same as /book). */
  tenantSummary = signal<TenantSummary | null>(null);

  loading = signal(false);
  reservations = signal<Reservation[]>([]);
  tablesWithStatus = signal<CanvasTable[]>([]);
  filterDate = '';
  filterPhone = '';
  filterStatus = '';
  showForm = signal(false);
  editingReservation = signal<Reservation | null>(null);
  formName = '';
  formPhone = '';
  formEmail = '';
  formClientNotes = '';
  formOwnerNotes = '';
  formDate = '';
  formTime = '';
  formPartySize = 1;
  /** lunch/dinner/all â€” week grid when opening hours have a break */
  formService: 'all' | 'lunch' | 'dinner' = 'all';
  /** Allergies / special requirements (synced to allergies_* and customer_notes on save). */
  formDietaryNotes = '';
  formSeating: 'no_preference' | 'indoor' | 'terrace' = 'no_preference';
  /** Bookable floor for zone-scoped slot grid (same semantics as public /book `formFloorId`). */
  formFloorId: number | null = null;
  bookZones = signal<ReservationBookZone[]>([]);
  formError = signal<string | null>(null);
  reservationToSeat = signal<Reservation | null>(null);
  reservationTableMode = signal<'assign' | 'seat'>('assign');
  reservationTableError = signal<string | null>(null);
  reservationTableSubmittingId = signal<number | null>(null);
  reservationToCancel = signal<Reservation | null>(null);
  reservationToNoShow = signal<Reservation | null>(null);
  sendingReminderId = signal<number | null>(null);
  overbookingReport = signal<OverbookingReport | null>(null);
  slotCapacity = signal<{ seats_left: number; tables_left: number } | null>(null);
  upcomingNoTableCount = signal<number | null>(null);
  prefillLoading = signal(false);
  prefillMessage = signal<string | null>(null);
  prefillSuccess = signal(false);
  queueEntries = signal<GuestQueueEntry[]>([]);

  canWrite = () => this.permissions.hasPermission(this.permissions.getCurrentUser(), 'reservation:write');

  hasMealSplit = computed(() => tenantOpeningHoursHasMealSplit(this.tenantSummary()?.opening_hours ?? null));

  maxPartySize = computed(() => {
    const cap = this.tenantSummary()?.reservation_max_guests_per_slot;
    if (cap != null && cap > 0) return Math.min(20, cap);
    return 20;
  });

  sortedReservations = computed(() => [...this.reservations()].sort((a, b) => {
    const statusRank: Record<ReservationStatus, number> = {
      booked: 0,
      seated: 1,
      finished: 2,
      no_show: 3,
      cancelled: 4,
    };
    const statusDelta = statusRank[a.status] - statusRank[b.status];
    if (statusDelta !== 0) return statusDelta;
    return `${a.reservation_date}T${a.reservation_time}`.localeCompare(`${b.reservation_date}T${b.reservation_time}`);
  }));

  activeReservationCount = computed(() => this.reservations().filter((r) => r.status === 'booked' || r.status === 'seated').length);
  expectedGuestCount = computed(() => this.reservations()
    .filter((r) => r.status === 'booked' || r.status === 'seated')
    .reduce((total, r) => total + r.party_size, 0));
  bookedCount = computed(() => this.reservations().filter((r) => r.status === 'booked').length);
  seatedCount = computed(() => this.reservations().filter((r) => r.status === 'seated').length);
  unassignedCount = computed(() => this.reservations().filter((r) => r.status === 'booked' && !r.table_id).length);

  displayTime(value: string): string {
    const match = /^(\d{1,2}):(\d{2})/.exec(value || '');
    if (!match) return value;
    const hour = Number(match[1]);
    const minute = match[2];
    const suffix = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minute} ${suffix}`;
  }

  serviceDateLabel(): string {
    const date = this.parseCalendarDate(this.filterDate);
    if (!date) return 'All service dates';
    return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  }

  moveDate(days: number): void {
    const current = this.parseCalendarDate(this.filterDate) ?? new Date();
    current.setDate(current.getDate() + days);
    this.filterDate = this.formatCalendarDate(current);
    this.load();
  }

  goToToday(): void {
    this.filterDate = this.localCalendarTodayYyyyMmDd();
    this.load();
  }

  private parseCalendarDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  private formatCalendarDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get tenantId(): number | undefined {
    const tid = this.permissions.getCurrentUser()?.tenant_id;
    return tid ?? undefined;
  }

  private wsSub?: Subscription;

  ngOnInit() {
    const tid = this.permissions.getCurrentUser()?.tenant_id;
    if (tid) {
      this.api.getPublicTenant(tid).subscribe({
        next: (t) => {
          this.tenantSummary.set(t);
          this.api.getReservationBookZones(tid).subscribe({
            next: (z) => {
              this.bookZones.set(z.floors);
              if (this.showForm()) this.onSeatingPreferenceChange();
            },
            error: () => this.bookZones.set([]),
          });
        },
        error: () => this.tenantSummary.set(null),
      });
    }
    const today = this.localCalendarTodayYyyyMmDd();
    this.filterDate = today;
    this.load();
    this.loadTables();
    try {
      this.api.connectWebSocket();
      this.wsSub = this.api.reservationUpdates$.subscribe(() => {
        this.load();
        this.loadTables();
      });
      this.wsSub.add(
        this.api.queueUpdates$.subscribe(() => {
          this.loadQueueHistory();
        }),
      );
    } catch {
      // continue without WebSocket
    }
    this.loadQueueHistory();
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
  }

  load() {
    this.loading.set(true);
    this.api.getReservations({
      date: this.filterDate || undefined,
      status: this.filterStatus || undefined,
      phone: this.filterPhone || undefined,
    }).subscribe({
      next: (list) => { this.reservations.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    if (this.filterDate) {
      this.api.getOverbookingReport(this.filterDate).subscribe({
        next: (report) => this.overbookingReport.set(report),
        error: () => this.overbookingReport.set(null),
      });
    } else {
      this.overbookingReport.set(null);
    }
  }

  loadTables() {
    this.api.getTablesWithStatus().subscribe((list) => this.tablesWithStatus.set(list));
  }

  getStatusLabel(s: ReservationStatus): string {
    const key: Record<string, string> = {
      booked: 'RESERVATIONS.STATUS_BOOKED',
      seated: 'RESERVATIONS.STATUS_SEATED',
      finished: 'RESERVATIONS.STATUS_FINISHED',
      cancelled: 'RESERVATIONS.STATUS_CANCELLED',
      no_show: 'RESERVATIONS.STATUS_NO_SHOW',
    };
    return key[s] ?? s;
  }

  serviceTypeLabel(s: string): string {
    const k: Record<string, string> = { lunch: 'BOOK.SERVICE_LUNCH', dinner: 'BOOK.SERVICE_DINNER' };
    return this.translate.instant(k[s] || s);
  }

  seatingLabel(s: string): string {
    const k: Record<string, string> = {
      indoor: 'BOOK.SEATING_INDOOR',
      terrace: 'BOOK.SEATING_TERRACE',
      no_preference: 'BOOK.SEATING_ANY',
    };
    return this.translate.instant(k[s] || s);
  }

  getTableName(tableId: number): string {
    return this.tablesWithStatus().find(t => t.id === tableId)?.name ?? String(tableId);
  }

  /** Table to show in list: API table_name, or lookup by id, or "not assigned". */
  getTableDisplay(r: Reservation): string {
    if (r.table_name) return r.table_name;
    if (r.table_id != null) return this.getTableName(r.table_id);
    return this.translate.instant('RESERVATIONS.TABLE_NOT_ASSIGNED');
  }

  dietaryNotesLine(r: Reservation): string | null {
    return reservationDietaryNotesDisplay(r);
  }

  isSlotOverbooked(r: Reservation): boolean {
    const report = this.overbookingReport();
    if (!report?.slots?.length) return false;
    const timeKey = r.reservation_time.slice(0, 5);
    const slot = report.slots.find(s => s.reservation_time === timeKey || s.reservation_time === r.reservation_time);
    return slot ? (slot.over_seats || slot.over_tables) : false;
  }

  /** Local calendar date YYYY-MM-DD (staff UI; avoids UTC midnight shifting the day). */
  private localCalendarTodayYyyyMmDd(d = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Today YYYY-MM-DD in tenant TZ (fallback: staff browser local calendar). */
  private tenantTodayForForm(): string {
    const tz = this.tenantSummary()?.timezone?.trim();
    if (tz) {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    }
    return this.localCalendarTodayYyyyMmDd();
  }

  /** Floors that match the current seating preference (aligned with public /book). */
  bookZonesForSeating(): ReservationBookZone[] {
    return this.bookZones().filter((z) => this.zoneMatchesSeating(z, this.formSeating));
  }

  private zoneMatchesSeating(
    z: ReservationBookZone,
    pref: 'no_preference' | 'indoor' | 'terrace',
  ): boolean {
    const zone = (z.seating_zone || 'any').toLowerCase();
    if (zone === 'any') return true;
    if (pref === 'no_preference') return true;
    if (pref === 'indoor') return zone === 'indoor';
    if (pref === 'terrace') return zone === 'outdoor';
    return true;
  }

  onSeatingPreferenceChange(): void {
    const opts = this.bookZonesForSeating();
    if (opts.length === 1) {
      this.formFloorId = opts[0].id;
    } else if (opts.length === 0) {
      this.formFloorId = null;
    } else if (this.formFloorId != null && !opts.some((x) => x.id === this.formFloorId)) {
      this.formFloorId = null;
    }
  }

  openCreate() {
    this.editingReservation.set(null);
    this.formName = '';
    this.formPhone = '';
    this.formEmail = '';
    this.formClientNotes = '';
    this.formOwnerNotes = '';
    this.formDate = this.tenantTodayForForm();
    this.formTime = '';
    this.formPartySize = 2;
    this.formService = 'all';
    this.formDietaryNotes = '';
    this.formSeating = 'no_preference';
    this.formFloorId = null;
    this.onSeatingPreferenceChange();
    this.formError.set(null);
    this.prefillMessage.set(null);
    this.slotCapacity.set(null);
    this.showForm.set(true);
    this.loadSlotCapacity();
  }

  loadSlotCapacity() {
    if (!this.formDate?.trim() || !this.formTime?.trim() || !this.showForm()) return;
    const timeNorm = this.formTime.length >= 5 ? this.formTime.slice(0, 5) : this.formTime;
    const excludeId = this.editingReservation()?.id;
    const floorId =
      this.formFloorId != null && !Number.isNaN(this.formFloorId) ? this.formFloorId : undefined;
    this.api.getSlotCapacity(this.formDate, timeNorm, excludeId, floorId).subscribe({
      next: (cap) => this.slotCapacity.set({ seats_left: cap.seats_left, tables_left: cap.tables_left }),
      error: () => this.slotCapacity.set(null),
    });
  }

  prefillFromPhone() {
    if (this.editingReservation() || !this.formPhone.trim()) return;
    this.prefillMessage.set(null);
    this.prefillLoading.set(true);
    this.api.getReservationPrefillByPhone(this.formPhone).subscribe({
      next: (r) => {
        this.prefillLoading.set(false);
        if (r) {
          this.formName = r.customer_name ?? '';
          this.formEmail = r.customer_email ?? '';
          this.formClientNotes = r.client_notes ?? '';
          this.formOwnerNotes = r.owner_notes ?? '';
          this.formPartySize = r.party_size ?? this.formPartySize;
          const st = (r.service_type || '').toLowerCase();
          this.formService = st === 'lunch' || st === 'dinner' ? (st as 'lunch' | 'dinner') : 'all';
          this.formDietaryNotes = reservationDietaryNotesFormValue(r);
          const sp = (r.seating_preference || 'no_preference').toLowerCase();
          this.formSeating =
            sp === 'indoor' || sp === 'terrace' ? sp : 'no_preference';
          this.formFloorId = r.preferred_floor_id ?? null;
          this.onSeatingPreferenceChange();
          this.prefillSuccess.set(true);
          this.prefillMessage.set(this.translate.instant('RESERVATIONS.PREFILL_SUCCESS'));
        } else {
          this.prefillSuccess.set(false);
          this.prefillMessage.set(this.translate.instant('RESERVATIONS.PREFILL_NONE'));
        }
      },
      error: () => {
        this.prefillLoading.set(false);
        this.prefillSuccess.set(false);
        this.prefillMessage.set(this.translate.instant('RESERVATIONS.PREFILL_NONE'));
      },
    });
  }

  openEdit(r: Reservation) {
    this.editingReservation.set(r);
    this.formName = r.customer_name;
    this.formPhone = r.customer_phone;
    this.formEmail = r.customer_email ?? '';
    this.formClientNotes = r.client_notes ?? '';
    this.formOwnerNotes = r.owner_notes ?? '';
    this.formDate = r.reservation_date.slice(0, 10);
    this.formTime = r.reservation_time.length >= 5 ? r.reservation_time.slice(0, 5) : r.reservation_time;
    this.formPartySize = r.party_size;
    const st = (r.service_type || '').toLowerCase();
    this.formService = st === 'lunch' || st === 'dinner' ? (st as 'lunch' | 'dinner') : 'all';
    this.formDietaryNotes = reservationDietaryNotesFormValue(r);
    const sp = (r.seating_preference || 'no_preference').toLowerCase();
    this.formSeating = sp === 'indoor' || sp === 'terrace' ? sp : 'no_preference';
    this.formFloorId = r.preferred_floor_id ?? null;
    this.onSeatingPreferenceChange();
    this.formError.set(null);
    this.slotCapacity.set(null);
    this.showForm.set(true);
    queueMicrotask(() => this.loadSlotCapacity());
  }

  closeForm() {
    this.showForm.set(false);
    this.editingReservation.set(null);
    this.formFloorId = null;
    this.prefillMessage.set(null);
  }

  saveReservation() {
    this.formError.set(null);
    if (!contactPhoneValid(this.formPhone)) {
      this.formError.set(this.translate.instant('BOOK.INVALID_PHONE'));
      return;
    }
    const em = this.formEmail.trim();
    if (em && !contactEmailValid(em)) {
      this.formError.set(this.translate.instant('BOOK.INVALID_EMAIL'));
      return;
    }
    const timeNorm = this.formTime?.trim()
      ? this.formTime.length >= 5
        ? this.formTime.slice(0, 5)
        : this.formTime
      : '';
    if (!this.formDate?.trim() || !timeNorm) {
      this.formError.set(this.translate.instant('BOOK.PICK_SLOT'));
      return;
    }
    if (this.bookZones().length >= 1 && this.bookZonesForSeating().length === 0) {
      this.formError.set(this.translate.instant('BOOK.NO_ZONE_FOR_SEATING'));
      return;
    }
    if (
      this.bookZonesForSeating().length >= 2 &&
      (this.formFloorId == null || Number.isNaN(this.formFloorId))
    ) {
      this.formError.set(this.translate.instant('BOOK.LOCATION_ZONE_REQUIRED'));
      return;
    }
    const ed0 = this.editingReservation();
    const origDate = ed0 ? ed0.reservation_date.slice(0, 10) : '';
    const origTime = ed0
      ? ed0.reservation_time.length >= 5
        ? ed0.reservation_time.slice(0, 5)
        : ed0.reservation_time
      : '';
    const unchangedSlot = !!ed0 && origDate === this.formDate.trim() && origTime === timeNorm;
    if (!unchangedSlot) {
      const stSlot = this.weekSlotGrid?.slotState(this.formDate.trim(), timeNorm) ?? 'out_of_hours';
      if (stSlot !== 'available') {
        this.formError.set(this.translate.instant('BOOK.SLOT_UNAVAILABLE'));
        return;
      }
    }
    const ps = Number(this.formPartySize);
    const maxP = this.maxPartySize();
    if (!Number.isFinite(ps) || ps < 1 || ps > maxP) {
      this.formError.set(this.translate.instant('RESERVATIONS.ERROR_PARTY_SIZE_RANGE'));
      return;
    }
    const user = this.api.getCurrentUser();
    const tenantId = user?.tenant_id;
    if (!tenantId && !this.editingReservation()) {
      this.formError.set(this.translate.instant('RESERVATIONS.ERROR_MISSING_TENANT'));
      return;
    }
    const svc = this.hasMealSplit() && this.formService !== 'all' ? this.formService : null;
    const dietary = this.formDietaryNotes.trim();
    const preferredFloorId =
      this.formFloorId != null && !Number.isNaN(this.formFloorId) ? this.formFloorId : undefined;
    const payload: ReservationCreate = {
      customer_name: this.formName.trim(),
      customer_phone: this.formPhone.trim(),
      customer_email: this.formEmail.trim() || undefined,
      reservation_date: this.formDate.trim(),
      reservation_time: timeNorm,
      party_size: ps,
      client_notes: this.formClientNotes.trim() || undefined,
      customer_notes: dietary || undefined,
      service_type: svc,
      seating_preference: this.formSeating,
      allergies_has: dietary.length > 0,
      allergies_detail: dietary || undefined,
      preferred_floor_id: preferredFloorId,
    };
    if (!this.editingReservation() && tenantId) (payload as ReservationCreate).tenant_id = tenantId;
    if (this.editingReservation()) {
      const update: ReservationUpdate = {
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        customer_email: payload.customer_email,
        reservation_date: this.formDate.trim(),
        reservation_time: timeNorm,
        party_size: ps,
        client_notes: this.formClientNotes.trim() || undefined,
        customer_notes: dietary.length > 0 ? dietary : null,
        owner_notes: this.formOwnerNotes.trim() || undefined,
        service_type: svc,
        seating_preference: this.formSeating,
        allergies_has: dietary.length > 0,
        allergies_detail: dietary.length > 0 ? dietary : null,
        preferred_floor_id: preferredFloorId ?? null,
      };
      this.api.updateReservation(this.editingReservation()!.id, update).subscribe({
        next: () => { this.closeForm(); this.load(); this.loadTables(); },
        error: (e) => this.formError.set(this.apiErr.fromHttpError(e, 'RESERVATIONS.ERROR_FAILED_UPDATE')),
      });
    } else {
      this.api.createReservation(payload).subscribe({
        next: () => { this.closeForm(); this.load(); this.loadTables(); },
        error: (e) => this.formError.set(this.apiErr.fromHttpError(e, 'RESERVATIONS.ERROR_FAILED_CREATE')),
      });
    }
  }

  reservationIsReadyToSeat(r: Reservation): boolean {
    const reservationAt = new Date(`${r.reservation_date.slice(0, 10)}T${r.reservation_time.slice(0, 5)}:00`);
    if (Number.isNaN(reservationAt.getTime())) return false;
    return reservationAt.getTime() - Date.now() <= 2 * 60 * 60 * 1000;
  }

  reservationTableActionLabel(r: Reservation): string {
    if (this.reservationIsReadyToSeat(r)) return 'Seat now';
    return r.table_id ? 'Change table' : 'Assign table';
  }

  openReservationTable(r: Reservation) {
    this.reservationToSeat.set(r);
    this.reservationTableMode.set(this.reservationIsReadyToSeat(r) ? 'seat' : 'assign');
    this.reservationTableError.set(null);
    this.reservationTableSubmittingId.set(null);
    this.upcomingNoTableCount.set(null);
    this.loadTables();
    if (this.reservationTableMode() === 'seat') {
      const dateStr = r.reservation_date.slice(0, 10);
      this.api.getUpcomingNoTableCount(dateStr, r.id).subscribe({
        next: (res) => this.upcomingNoTableCount.set(res.count),
        error: () => this.upcomingNoTableCount.set(0),
      });
    }
  }

  closeSeatModal() {
    this.reservationToSeat.set(null);
    this.reservationTableError.set(null);
    this.reservationTableSubmittingId.set(null);
    this.upcomingNoTableCount.set(null);
  }

  tableCapacity(table: CanvasTable): number {
    return table.group_seat_total ?? table.seat_count ?? 0;
  }

  tableOperationalLabel(table: CanvasTable): string {
    if (table.operational_status === 'open_order') return 'Open order';
    if (table.operational_status === 'ready_to_serve') return 'Ready to serve';
    if (table.status === 'occupied') return 'Occupied';
    if (table.status === 'reserved') return 'Reserved';
    return 'Available';
  }

  availableTablesForSeat = computed(() => {
    const r = this.reservationToSeat();
    const tables = this.tablesWithStatus();
    if (!r) return [];
    const capacityMatches = tables.filter(t => this.tableCapacity(t) >= r.party_size);
    const eligible = this.reservationTableMode() === 'assign'
      ? capacityMatches
      : capacityMatches.filter(t =>
          t.id === r.table_id || t.status === 'available' || t.status === 'reserved'
        );
    return [...eligible].sort((a, b) => {
      if (a.id === r.table_id) return -1;
      if (b.id === r.table_id) return 1;
      return this.tableCapacity(a) - this.tableCapacity(b) || a.name.localeCompare(b.name);
    });
  });

  applyReservationTable(tableId: number) {
    const r = this.reservationToSeat();
    if (!r) return;
    if (this.reservationTableMode() === 'assign' && r.table_id === tableId) {
      this.closeSeatModal();
      return;
    }
    this.reservationTableError.set(null);
    this.reservationTableSubmittingId.set(tableId);
    const request = this.reservationTableMode() === 'seat'
      ? this.api.seatReservation(r.id, tableId)
      : this.api.assignReservationTable(r.id, tableId);
    request.subscribe({
      next: () => {
        const mode = this.reservationTableMode();
        this.closeSeatModal();
        this.load();
        this.loadTables();
        if (mode === 'seat') {
          this.openPosForReservation({ ...r, table_id: tableId, status: 'seated' }, tableId);
        }
      },
      error: (e) => {
        this.reservationTableSubmittingId.set(null);
        this.reservationTableError.set(
          this.apiErr.fromHttpError(
            e,
            this.reservationTableMode() === 'seat'
              ? 'RESERVATIONS.ERROR_FAILED_SEAT'
              : 'Could not assign this table.',
          ),
        );
      },
    });
  }

  loadQueueHistory() {
    this.api.getGuestQueue(true).subscribe({
      next: (rows) => this.queueEntries.set(rows),
      error: () => this.queueEntries.set([]),
    });
  }

  openPosForReservation(reservation: Reservation, forcedTableId?: number | null) {
    const tableId = forcedTableId ?? reservation.table_id ?? null;
    if (!tableId) return;

    const note =
      reservation.owner_notes?.trim() ||
      reservation.client_notes?.trim() ||
      reservation.customer_notes?.trim() ||
      '';

    void this.router.navigate(['/pos'], {
      queryParams: {
        tableId,
        reservationId: reservation.id,
        reservationGuest: reservation.customer_name || null,
        reservationPhone: reservation.customer_phone || null,
        reservationPartySize: reservation.party_size || null,
        reservationNotes: note || null,
      },
    });
  }

  openQueueForReservation(reservation: Reservation) {
    const queueMatch = this.latestQueueMatch(reservation);
    const note =
      reservation.owner_notes?.trim() ||
      reservation.client_notes?.trim() ||
      reservation.customer_notes?.trim() ||
      '';

    void this.router.navigate(['/queue'], {
      queryParams: {
        reservationId: reservation.id,
        queueEntryId: queueMatch?.id ?? null,
        queueGuest: reservation.customer_name || null,
        queuePhone: reservation.customer_phone || null,
        queuePartySize: reservation.party_size || null,
        preferredFloorId: reservation.preferred_floor_id ?? null,
        queueNotes: note || null,
      },
    });
  }

  hasActiveQueueMatch(reservation: Reservation): boolean {
    const match = this.latestQueueMatch(reservation);
    return !!match && ['waiting', 'notified', 'seated'].includes(match.status);
  }

  latestQueueMatch(reservation: Reservation): GuestQueueEntry | null {
    const linkedMatches = this.queueEntries()
      .filter((entry) => entry.linked_reservation_id === reservation.id)
      .sort((a, b) => this.queueSortTime(b) - this.queueSortTime(a));
    if (linkedMatches.length > 0) {
      return linkedMatches[0];
    }

    const phone = this.normalizePhone(reservation.customer_phone);
    if (!phone) return null;

    const phoneMatches = this.queueEntries()
      .filter((entry) => this.normalizePhone(entry.customer_phone) === phone)
      .sort((a, b) => this.queueSortTime(b) - this.queueSortTime(a));
    return phoneMatches[0] ?? null;
  }

  queueStatusLabel(entry: GuestQueueEntry): string {
    switch (entry.status) {
      case 'waiting':
        return 'Waiting';
      case 'notified':
        return 'Notified';
      case 'seated':
        return 'Seated';
      case 'completed':
        return 'Completed';
      case 'converted_to_reservation':
        return 'Converted';
      case 'cancelled':
        return 'Cancelled';
      case 'no_show':
        return 'No-show';
      case 'expired':
        return 'Expired';
      default:
        return 'Queue';
    }
  }

  queueRelativeTime(value?: string | null): string {
    if (!value) return 'recently';
    const date = new Date(value);
    const diffMinutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} d ago`;
  }

  private normalizePhone(value?: string | null): string {
    return (value ?? '').replace(/\D+/g, '');
  }

  private queueSortTime(entry: GuestQueueEntry): number {
    return new Date(entry.updated_at || entry.completed_at || entry.requested_at).getTime();
  }

  confirmCancel(r: Reservation) {
    this.reservationToCancel.set(r);
  }

  doCancel() {
    const r = this.reservationToCancel();
    if (!r) return;
    this.api.updateReservationStatus(r.id, 'cancelled').subscribe({
      next: () => { this.reservationToCancel.set(null); this.load(); this.loadTables(); },
      error: () => this.reservationToCancel.set(null),
    });
  }

  confirmNoShow(r: Reservation) {
    this.reservationToNoShow.set(r);
  }

  doNoShow() {
    const r = this.reservationToNoShow();
    if (!r) return;
    this.api.updateReservationStatus(r.id, 'no_show').subscribe({
      next: () => { this.reservationToNoShow.set(null); this.load(); this.loadTables(); },
      error: () => this.reservationToNoShow.set(null),
    });
  }

  sendReminder(r: Reservation) {
    this.sendingReminderId.set(r.id);
    this.api.sendReservationReminder(r.id).subscribe({
      next: (res) => {
        this.sendingReminderId.set(null);
        const msg = this.reminderSuccessMessage(res);
        alert(msg);
      },
      error: (e) => {
        this.sendingReminderId.set(null);
        alert(this.apiErr.fromHttpError(e, 'RESERVATIONS.REMINDER_FAILED'));
      },
    });
  }

  private reminderSuccessMessage(res: { email_sent: boolean; whatsapp_sent: boolean }): string {
    if (res.email_sent && res.whatsapp_sent) {
      return this.translate.instant('RESERVATIONS.REMINDER_SENT_EMAIL_AND_WHATSAPP');
    }
    if (res.whatsapp_sent) {
      return this.translate.instant('RESERVATIONS.REMINDER_SENT_WHATSAPP');
    }
    if (res.email_sent) {
      return this.translate.instant('RESERVATIONS.REMINDER_SENT_EMAIL');
    }
    return this.translate.instant('RESERVATIONS.REMINDER_FAILED');
  }

  finish(r: Reservation) {
    this.api.finishReservation(r.id).subscribe({
      next: () => { this.load(); this.loadTables(); },
      error: (e) => alert(this.apiErr.fromHttpError(e, 'RESERVATIONS.ERROR_FAILED')),
    });
  }
}


