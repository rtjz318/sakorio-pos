import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ApiService,
  CanvasTable,
  Floor,
  GuestQueueCreate,
  GuestQueueEntry,
  GuestQueueStatus,
  GuestQueueSummary,
  Reservation,
} from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { StaffPosToolbarComponent } from '../shared/staff-pos-toolbar.component';

type QueueTableChoice = {
  table: CanvasTable;
  seats: number;
  seatGap: number;
  floorName: string;
  preferredFloorMatch: boolean;
  fitLabel: string;
  riskCopy: string;
  urgencyLabel: string | null;
  urgencyTone: 'clear' | 'soon' | 'due';
  suggested: boolean;
  score: number;
};

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, StaffPosToolbarComponent],
  template: `
    <app-sidebar>
      <section class="page-shell">
        <app-staff-pos-toolbar></app-staff-pos-toolbar>

        <section class="page-header card">
          <div>
            <p class="eyebrow">Host Stand</p>
            <h1>Guest queue</h1>
            <p class="lede">
              Manage walk-ins, quote wait times, seat guests to tables, and convert them into timed reservations.
            </p>
          </div>
          <div class="header-actions">
            <button type="button" class="btn btn-secondary" (click)="reload()">Refresh</button>
            <label class="closed-toggle">
              <input type="checkbox" [(ngModel)]="includeClosed" (change)="reloadQueue()" />
              Include closed
            </label>
          </div>
        </section>

        @if (error()) {
          <section class="error-banner card">
            {{ error() }}
          </section>
        }

        @if (prefillContext()) {
          <section class="card prefill-banner">
            <div>
              <p class="eyebrow">Reservation handoff</p>
              <h2>{{ prefillContext() }}</h2>
              <p class="lede-inline">Guest details are prefilled so the host stand can move this reservation into the live queue without retyping.</p>
            </div>
            <button type="button" class="btn btn-secondary" (click)="clearPrefill()">Clear prefill</button>
          </section>
        }

        <section class="summary-grid">
          <article class="card stat">
            <span class="label">Waiting guests</span>
            <strong>{{ summary()?.waiting_guests ?? 0 }}</strong>
            <span class="hint">Across the active queue</span>
          </article>
          <article class="card stat">
            <span class="label">Notified</span>
            <strong>{{ summaryCount('notified') }}</strong>
            <span class="hint">Ready to be seated now</span>
          </article>
          <article class="card stat">
            <span class="label">Seated</span>
            <strong>{{ summaryCount('seated') }}</strong>
            <span class="hint">Already handed to floor service</span>
          </article>
          <article class="card stat">
            <span class="label">Total entries</span>
            <strong>{{ summary()?.total_entries ?? 0 }}</strong>
            <span class="hint">Including completed queue records</span>
          </article>
        </section>

      @if (arrivalsDueSoon().length) {
        <section class="card arrivals-card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Reservation arrivals</p>
              <h2>Due soon</h2>
            </div>
            <div class="chips">
              <span class="chip">{{ arrivalsDueSoon().length }} in window</span>
              <span class="chip">{{ arrivalsDueNowCount() }} due now</span>
            </div>
          </div>

          <div class="arrival-grid">
            @for (reservation of arrivalsDueSoon(); track reservation.id) {
              <article class="arrival-card" [class.arrival-card--due]="reservationUrgencyTone(reservation) === 'due'">
                <div class="arrival-top">
                  <div>
                    <strong>{{ reservation.customer_name }}</strong>
                    <p>
                      {{ reservation.party_size }} pax
                      @if (reservation.preferred_floor_name) {
                        | {{ reservation.preferred_floor_name }}
                      }
                    </p>
                  </div>
                  <div class="chips">
                    <span
                      class="chip"
                      [class.chip--warn]="reservationUrgencyTone(reservation) === 'soon'"
                      [class.chip--danger]="reservationUrgencyTone(reservation) === 'due'">
                      {{ reservationUrgencyLabel(reservation) }}
                    </span>
                    <span class="chip">{{ reservation.reservation_time.slice(0, 5) }}</span>
                  </div>
                </div>

                <div class="arrival-meta">
                  <span>{{ reservation.customer_phone }}</span>
                  @if (reservation.table_name) {
                    <span>{{ reservation.table_name }}</span>
                  } @else {
                    <span>No table assigned yet</span>
                  }
                  @if (latestQueueMatchForReservation(reservation); as queueMatch) {
                    <span>{{ queueStatusLabel(queueMatch) }}</span>
                  }
                </div>

                @if (reservation.client_notes || reservation.owner_notes) {
                  <p class="arrival-note">
                    {{ reservation.owner_notes || reservation.client_notes }}
                  </p>
                }

                <div class="arrival-decision">
                  <div>
                    <span class="label">Best next step</span>
                    <strong>{{ arrivalDecisionTitle(reservation) }}</strong>
                    <p>{{ arrivalDecisionCopy(reservation) }}</p>
                  </div>
                  @if (latestQueueMatchForReservation(reservation); as queueMatch) {
                    <span class="chip chip--good">{{ queueStatusLabel(queueMatch) }}</span>
                  } @else if (reservation.table_id) {
                    <span class="chip">Table assigned</span>
                  } @else {
                    <span class="chip chip--warn">Needs host action</span>
                  }
                </div>

                <div class="arrival-actions">
                  <button
                    type="button"
                    class="btn btn-primary"
                    [disabled]="arrivalPrimaryActionDisabled(reservation)"
                    (click)="runArrivalPrimaryAction(reservation)">
                    {{ arrivalPrimaryActionLabel(reservation) }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary"
                    [disabled]="arrivalSecondaryActionDisabled(reservation)"
                    (click)="runArrivalSecondaryAction(reservation)">
                    {{ arrivalSecondaryActionLabel(reservation) }}
                  </button>
                </div>
              </article>
            }
          </div>
        </section>
      }

      <section class="queue-layout">
        <article class="card create-card">
          <div class="card-head">
            <div>
              <p class="eyebrow">New walk-in</p>
              <h2>Add to queue</h2>
            </div>
            <div class="chips">
              <span class="chip">{{ floors().length || 0 }} floors</span>
              <span class="chip">{{ readyTableCount() }} clear tables</span>
            </div>
          </div>

          <div class="form-grid">
            <label>
              <span>Guest name</span>
              <input [(ngModel)]="draft.customer_name" placeholder="Walk-in guest name" />
            </label>
            <label>
              <span>Phone</span>
              <input [(ngModel)]="draft.customer_phone" placeholder="+65 phone (optional)" />
            </label>
            <label>
              <span>Party size</span>
              <input type="number" min="1" [(ngModel)]="draft.party_size" />
            </label>
            <label>
              <span>Quoted wait (mins)</span>
              <input type="number" min="0" [(ngModel)]="draft.quoted_wait_minutes" />
            </label>
            <label>
              <span>Preferred floor</span>
              <select [(ngModel)]="preferredFloorDraft">
                <option value="">Any floor</option>
                @for (floor of floors(); track floor.id) {
                  <option [value]="floor.id">{{ floor.name }}</option>
                }
              </select>
            </label>
            <label>
              <span>Preferred seats</span>
              <input type="number" min="1" [(ngModel)]="draft.preferred_table_size" placeholder="Optional" />
            </label>
          </div>

          <label class="notes-field">
            <span>Notes</span>
            <textarea [(ngModel)]="draft.notes" rows="3" placeholder="Arrival notes, stroller, accessibility, birthday..."></textarea>
          </label>

          <div class="toggle-row">
            <label class="checkbox">
              <input type="checkbox" [(ngModel)]="draft.arrived_now" />
              Mark as arrived now
            </label>
            <span class="toggle-hint">Hosts can still convert or seat this guest immediately from the right lane.</span>
          </div>

          <div class="card-actions">
            <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="createQueueEntry()">
              {{ saving() ? 'Saving...' : 'Add to queue' }}
            </button>
          </div>
        </article>

        <article class="card board-card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Live board</p>
              <h2>Queue lanes</h2>
            </div>
            <div class="chips">
              <span class="chip">{{ filteredActiveEntries().length }} active</span>
              <span class="chip">{{ filteredBoardEntries().length }} visible</span>
              <span class="chip">{{ queue().length }} loaded</span>
            </div>
          </div>

          <div class="board-controls">
            <label>
              <span>Search queue</span>
              <input
                [(ngModel)]="queueSearch"
                (ngModelChange)="syncSelectionWithVisibleBoard()"
                placeholder="Guest, phone, reservation, floor, notes" />
            </label>
            <label>
              <span>Source</span>
              <select [(ngModel)]="queueSourceFilter" (ngModelChange)="syncSelectionWithVisibleBoard()">
                <option value="all">All sources</option>
                <option value="staff_manual">Host stand</option>
                <option value="walk_in">Walk-in</option>
                <option value="phone">Phone</option>
                <option value="web_waitlist">Web waitlist</option>
                <option value="reservation_linked">Reservation-linked</option>
              </select>
            </label>
            <label>
              <span>Preferred floor</span>
              <select [(ngModel)]="queueFloorFilter" (ngModelChange)="syncSelectionWithVisibleBoard()">
                <option value="">Any floor</option>
                @for (floor of floors(); track floor.id) {
                  <option [value]="floor.id">{{ floor.name }}</option>
                }
              </select>
            </label>
            <label>
              <span>Urgency</span>
              <select [(ngModel)]="queueUrgencyFilter" (ngModelChange)="syncSelectionWithVisibleBoard()">
                <option value="all">Any urgency</option>
                <option value="danger">Long waiting / urgent</option>
                <option value="warn">Watch closely</option>
                <option value="normal">Fresh queue</option>
              </select>
            </label>
          </div>

          <div class="board-summary">
            <div class="chips board-summary-chips">
              <span class="chip">{{ getEntriesForStatus('waiting').length }} waiting</span>
              <span class="chip">{{ getEntriesForStatus('notified').length }} notified</span>
              <span class="chip">{{ getEntriesForStatus('seated').length }} seated</span>
              <span class="chip chip--warn">{{ actionNowCount() }} action now</span>
              <span class="chip">{{ visibleReservationLinkedCount() }} reservation-linked</span>
              @if (boardFilterActive()) {
                <button type="button" class="chip chip-button" (click)="clearBoardFilters()">Clear filters</button>
              }
            </div>
            @if (boardFilterActive()) {
              <p class="board-summary-copy">
                Showing {{ filteredBoardEntries().length }} queue entries after filters.
              </p>
            }
          </div>

          <div class="lane-grid">
            @for (lane of lanes; track lane.status) {
              <section class="lane">
                <header class="lane-header">
                  <div>
                    <h3>{{ lane.label }}</h3>
                    <p>{{ getEntriesForStatus(lane.status).length }} entries</p>
                  </div>
                  @if (laneLeadLabel(lane.status); as leadLabel) {
                    <span
                      class="chip"
                      [class.chip--warn]="laneLeadTone(lane.status) === 'warn'"
                      [class.chip--danger]="laneLeadTone(lane.status) === 'danger'">
                      {{ leadLabel }}
                    </span>
                  }
                </header>

                <div class="lane-list">
                  @for (entry of getEntriesForStatus(lane.status); track entry.id) {
                    <button
                      type="button"
                      class="queue-card"
                      [class.queue-card--warn]="queuePriorityTone(entry) === 'warn'"
                      [class.queue-card--danger]="queuePriorityTone(entry) === 'danger'"
                      [class.selected]="selectedEntry()?.id === entry.id"
                      (click)="selectEntry(entry)">
                      <div class="queue-card-top">
                        <div class="queue-card-title">
                          <strong>{{ entry.customer_name }}</strong>
                          <span class="queue-card-subtitle">{{ queueSourceLabel(entry.source) }}</span>
                        </div>
                        <div class="chips">
                          <span class="chip chip--status">{{ lane.label }}</span>
                          @if (queuePriorityLabel(entry); as priority) {
                            <span
                              class="chip"
                              [class.chip--warn]="queuePriorityTone(entry) === 'warn'"
                              [class.chip--danger]="queuePriorityTone(entry) === 'danger'">
                              {{ priority }}
                            </span>
                          }
                        </div>
                      </div>
                      <div class="queue-meta">
                        <span>{{ entry.party_size }} pax</span>
                        @if (entry.quoted_wait_minutes) {
                          <span>{{ entry.quoted_wait_minutes }} min quote</span>
                        }
                        @if (entry.preferred_floor_name) {
                          <span>{{ entry.preferred_floor_name }}</span>
                        }
                        @if (entry.linked_reservation_id) {
                          <span>Reservation #{{ entry.linked_reservation_id }}</span>
                        }
                      </div>
                      <div class="queue-meta queue-meta--muted">
                        <span>{{ relativeTime(entry.requested_at) }}</span>
                        @if (entry.customer_phone) {
                          <span>{{ entry.customer_phone }}</span>
                        }
                      </div>
                      @if (queueCardActionLabel(entry); as actionLabel) {
                        <div class="queue-card-action">
                          <span>{{ actionLabel }}</span>
                        </div>
                      }
                    </button>
                  } @empty {
                    <div class="empty-lane">No entries in this lane.</div>
                  }
                </div>
              </section>
            }
          </div>
        </article>

        <article class="card detail-card">
          @if (selectedEntry(); as entry) {
            <div class="card-head">
              <div>
                <p class="eyebrow">Selected guest</p>
                <h2>{{ entry.customer_name }}</h2>
              </div>
              <div class="chips">
                <span class="chip">{{ entry.party_size }} pax</span>
                <span class="chip">{{ prettyStatus(entry.status) }}</span>
              </div>
            </div>

            <div class="decision-banner">
              <div>
                <span class="label">Next move</span>
                <strong>{{ selectedEntryDecisionTitle(entry) }}</strong>
                <p>{{ selectedEntryDecisionCopy(entry) }}</p>
              </div>
              @if (queuePriorityLabel(entry); as priority) {
                <span
                  class="chip"
                  [class.chip--warn]="queuePriorityTone(entry) === 'warn'"
                  [class.chip--danger]="queuePriorityTone(entry) === 'danger'">
                  {{ priority }}
                </span>
              }
            </div>

            <div class="detail-grid">
              <div class="detail-block">
                <span class="label">Requested</span>
                <strong>{{ relativeTime(entry.requested_at) }}</strong>
              </div>
              <div class="detail-block">
                <span class="label">Quote</span>
                <strong>{{ entry.quoted_wait_minutes ? entry.quoted_wait_minutes + ' min' : 'Not set' }}</strong>
              </div>
              <div class="detail-block">
                <span class="label">Phone</span>
                <strong>{{ entry.customer_phone || 'No phone' }}</strong>
              </div>
              <div class="detail-block">
                <span class="label">Source</span>
                <strong>{{ queueSourceLabel(entry.source) }}</strong>
              </div>
            </div>

            <div class="detail-chip-strip">
              <span class="chip">{{ entry.preferred_floor_name || 'Any floor' }}</span>
              @if (entry.preferred_table_size) {
                <span class="chip">{{ entry.preferred_table_size }} seats preferred</span>
              }
              @if (entry.linked_reservation_id) {
                <span class="chip">Reservation #{{ entry.linked_reservation_id }}</span>
              }
              @if (entry.seated_table_name) {
                <span class="chip chip--good">{{ entry.seated_table_name }}</span>
              }
            </div>

            @if (entry.notes) {
              <div class="note-panel">
                <span class="label">Notes</span>
                <p>{{ entry.notes }}</p>
              </div>
            }

            <section class="sub-panel sub-panel--actions">
              <div class="sub-panel-head sub-panel-head--compact">
                <div>
                  <p class="eyebrow">Host controls</p>
                  <h3>Update this guest</h3>
                </div>
                <span class="chip">{{ prettyStatus(entry.status) }}</span>
              </div>

              <div class="action-grid">
                <button
                  type="button"
                  class="btn btn-secondary"
                  [disabled]="busyEntryId() === entry.id || !canNotify(entry)"
                  (click)="markStatus(entry, 'notified')">
                  Notify guest
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  [disabled]="busyEntryId() === entry.id || !canResetToWaiting(entry)"
                  (click)="markStatus(entry, 'waiting')">
                  Back to waiting
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  [disabled]="busyEntryId() === entry.id || !canCloseEntry(entry)"
                  (click)="markStatus(entry, 'cancelled', 'Guest left the queue')">
                  Cancel
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  [disabled]="busyEntryId() === entry.id || !canCloseEntry(entry)"
                  (click)="markStatus(entry, 'no_show', 'Guest did not return')">
                  No-show
                </button>
              </div>
            </section>

            @if (canSeat(entry)) {
              <section class="sub-panel">
                <div class="sub-panel-head">
                  <div>
                    <p class="eyebrow">Seat to table</p>
                    <h3>Choose a table</h3>
                  </div>
                  <span class="chip">{{ matchingTableChoices().length }} ready</span>
                </div>

                @if (bestTableChoice(); as bestChoice) {
                  <div class="best-fit-banner" [class.best-fit-banner--caution]="bestChoice.urgencyTone !== 'clear'">
                    <div>
                      <span class="label">Best next seat</span>
                      <strong>{{ bestChoice.table.name }}</strong>
                      <p>{{ bestChoiceSummary(bestChoice) }}</p>
                    </div>
                    @if (bestChoice.urgencyLabel) {
                      <span
                        class="chip"
                        [class.chip--warn]="bestChoice.urgencyTone === 'soon'"
                        [class.chip--danger]="bestChoice.urgencyTone === 'due'">
                        {{ bestChoice.urgencyLabel }}
                      </span>
                    } @else {
                      <span class="chip chip--good">Safe to seat now</span>
                    }
                  </div>
                }

                <div class="table-list">
                  @for (choice of matchingTableChoices(); track choice.table.id) {
                    <button type="button" class="table-choice" (click)="seatEntry(entry, choice.table)">
                      <div class="table-choice-top">
                        <strong>{{ choice.table.name }}</strong>
                        @if (choice.suggested) {
                          <span class="chip chip--good">Best fit</span>
                        } @else if (bestTableChoice(); as bestChoice) {
                          <span class="chip">{{ tableChoiceLabel(choice, bestChoice) }}</span>
                        }
                      </div>
                      <div class="table-choice-meta">
                        <span>{{ choice.seats }} seats</span>
                        <span>{{ choice.floorName }}</span>
                        <span>{{ choice.fitLabel }}</span>
                      </div>
                      <div class="table-choice-foot">
                        <span>{{ tableChoiceDecisionCopy(choice, bestTableChoice() || choice) }}</span>
                        @if (choice.urgencyLabel) {
                          <span
                            class="chip"
                            [class.chip--warn]="choice.urgencyTone === 'soon'"
                            [class.chip--danger]="choice.urgencyTone === 'due'">
                            {{ choice.urgencyLabel }}
                          </span>
                        }
                      </div>
                    </button>
                  } @empty {
                    <div class="empty-lane">No clear table currently matches this party size.</div>
                  }
                </div>
              </section>

              <section class="sub-panel">
                <div class="sub-panel-head">
                  <div>
                    <p class="eyebrow">Convert instead</p>
                    <h3>Turn queue into reservation</h3>
                  </div>
                </div>

                <div class="form-grid">
                  <label>
                    <span>Date</span>
                    <input type="date" [(ngModel)]="reservationDraft.date" />
                  </label>
                  <label>
                    <span>Time</span>
                    <input type="time" [(ngModel)]="reservationDraft.time" />
                  </label>
                  <label>
                    <span>Email</span>
                    <input [(ngModel)]="reservationDraft.email" placeholder="Optional email" />
                  </label>
                  <label>
                    <span>Service type</span>
                    <input [(ngModel)]="reservationDraft.serviceType" placeholder="dine_in / event / private" />
                  </label>
                </div>

                <label class="notes-field">
                  <span>Reservation notes</span>
                  <textarea [(ngModel)]="reservationDraft.clientNotes" rows="2" placeholder="Owner note carried into reservation"></textarea>
                </label>

                <div class="card-actions">
                  <button
                    type="button"
                    class="btn btn-primary"
                    [disabled]="busyEntryId() === entry.id"
                    (click)="convertToReservation(entry)">
                    Create reservation
                  </button>
                </div>
              </section>
            }

            @if (entry.status === 'seated' && entry.seated_table_id) {
              <section class="sub-panel">
                <div class="sub-panel-head">
                  <div>
                    <p class="eyebrow">Floor handoff</p>
                    <h3>Guest already seated</h3>
                  </div>
                </div>
                <p class="lede-inline">
                  Seated at {{ entry.seated_table_name || ('Table #' + entry.seated_table_id) }}. Open POS to start service.
                </p>
                <div class="card-actions">
                  <button type="button" class="btn btn-primary" (click)="openPosForSeatedEntry(entry)">
                    Open POS
                  </button>
                </div>
              </section>
            }
          } @else {
            <div class="empty-detail">
              <p class="eyebrow">Queue detail</p>
              <h2>Select a guest</h2>
              <p>Choose an entry from the queue lanes to notify, seat, or convert to a reservation.</p>
            </div>
          }
        </article>
      </section>
    </section>
    </app-sidebar>
  `,
  styles: [`
    :host {
      --queue-max-width: 1680px;
      display: block;
      background: var(--bg-color, #f8fafc);
      min-height: 100vh;
      color: var(--text-color, #0f172a);
    }

    .page-shell {
      padding: 1.5rem;
      display: grid;
      gap: 1rem;
    }

    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 24px;
      padding: 1.1rem;
      box-shadow: 0 14px 38px rgba(15, 23, 42, 0.05);
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    .eyebrow {
      margin: 0 0 0.4rem;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #c2410c;
    }

    h1, h2, h3, p {
      margin: 0;
    }

    h1 {
      font-size: 2rem;
      line-height: 1.1;
      margin-bottom: 0.35rem;
    }

    h2 {
      font-size: 1.55rem;
      line-height: 1.15;
    }

    h3 {
      font-size: 1.05rem;
    }

    .lede,
    .lede-inline {
      color: #64748b;
      line-height: 1.55;
      max-width: 60ch;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .closed-toggle,
    .checkbox {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #475569;
      font-size: 0.95rem;
    }

    .error-banner {
      border-color: #fecaca;
      background: #fff1f2;
      color: #b91c1c;
      font-weight: 600;
    }

    .summary-grid {
      display: grid;
      gap: 0.8rem;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .arrivals-card {
      display: grid;
      gap: 1rem;
    }

    .arrival-grid {
      display: grid;
      gap: 0.85rem;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }

    .arrival-card {
      display: grid;
      gap: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 0.95rem;
      background: linear-gradient(180deg, #ffffff 0%, #fffaf5 100%);
    }

    .arrival-card--due {
      border-color: #fdba74;
      box-shadow: inset 0 0 0 1px rgba(249, 115, 22, 0.12);
    }

    .arrival-top,
    .arrival-actions {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .arrival-top strong {
      display: block;
      font-size: 1rem;
      color: #0f172a;
      margin-bottom: 0.2rem;
    }

    .arrival-top p,
    .arrival-note {
      color: #64748b;
      font-size: 0.9rem;
      line-height: 1.45;
      margin: 0;
    }

    .arrival-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      color: #475569;
      font-size: 0.82rem;
    }

    .arrival-meta span {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      background: #f8fafc;
      padding: 0.28rem 0.6rem;
    }

    .arrival-decision {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.8rem 0.9rem;
      border-radius: 16px;
      background: #fff7ed;
      border: 1px solid #fed7aa;
    }

    .arrival-decision strong {
      display: block;
      color: #9a3412;
      margin-bottom: 0.22rem;
      font-size: 0.98rem;
    }

    .arrival-decision p {
      color: #7c2d12;
      font-size: 0.88rem;
      line-height: 1.45;
      margin: 0;
      max-width: 34ch;
    }

    .stat {
      display: grid;
      gap: 0.35rem;
    }

    .stat strong {
      font-size: 1.8rem;
      line-height: 1;
    }

    .label {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #94a3b8;
      font-weight: 700;
    }

    .hint {
      color: #64748b;
      font-size: 0.92rem;
    }

    .queue-layout {
      display: grid;
      gap: 0.9rem;
      grid-template-columns: 332px minmax(0, 1fr) 430px;
      align-items: start;
    }

    .card-head,
    .sub-panel-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.8rem;
    }

    .form-grid {
      display: grid;
      gap: 0.7rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .board-controls {
      display: grid;
      gap: 0.7rem;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-bottom: 0.85rem;
    }

    .board-summary {
      display: grid;
      gap: 0.35rem;
      margin-bottom: 0.9rem;
    }

    .board-summary-chips {
      justify-content: flex-start;
    }

    .board-summary-copy {
      color: #64748b;
      font-size: 0.84rem;
      line-height: 1.45;
    }

    label {
      display: grid;
      gap: 0.4rem;
      font-weight: 600;
      color: #334155;
    }

    input,
    select,
    textarea {
      width: 100%;
      border: 1px solid #dbe3ee;
      border-radius: 14px;
      background: #fff;
      padding: 0.72rem 0.9rem;
      font: inherit;
      color: #0f172a;
    }

    textarea {
      resize: vertical;
    }

    .notes-field {
      margin-top: 0.7rem;
    }

    .toggle-row,
    .card-actions,
    .action-grid {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 0.8rem;
      align-items: center;
    }

    .toggle-hint {
      color: #64748b;
      font-size: 0.84rem;
    }

    .btn {
      border: 1px solid transparent;
      border-radius: 14px;
      padding: 0.72rem 1rem;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      transition: 160ms ease;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #ea580c;
      color: #fff;
    }

    .btn-primary:hover:not(:disabled) {
      background: #c2410c;
    }

    .btn-secondary {
      background: #fff;
      border-color: #dbe3ee;
      color: #0f172a;
    }

    .btn-secondary:hover:not(:disabled) {
      border-color: #cbd5e1;
      background: #f8fafc;
    }

    .chips {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      border-radius: 999px;
      background: #f1f5f9;
      color: #475569;
      padding: 0.4rem 0.7rem;
      font-size: 0.82rem;
      font-weight: 700;
    }

    .chip--status {
      background: #fff7ed;
      color: #c2410c;
    }

    .chip-button {
      border: 0;
      cursor: pointer;
    }

    .chip-button:hover {
      background: #e2e8f0;
    }

    .chip--good {
      background: #dcfce7;
      color: #166534;
    }

    .chip--warn {
      background: #fef3c7;
      color: #a16207;
    }

    .chip--danger {
      background: #fee2e2;
      color: #b91c1c;
    }

    .lane-grid {
      display: grid;
      gap: 0.8rem;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .lane {
      border: 1px solid #eef2f7;
      border-radius: 18px;
      padding: 0.8rem;
      background: #f8fafc;
      min-height: 460px;
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 0.7rem;
    }

    .lane-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.7rem;
    }

    .lane-header p {
      color: #64748b;
      margin-top: 0.2rem;
      font-size: 0.85rem;
    }

    .lane-list {
      display: grid;
      gap: 0.6rem;
      align-content: start;
    }

    .queue-card {
      width: 100%;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: #fff;
      padding: 0.8rem;
      display: grid;
      gap: 0.45rem;
      cursor: pointer;
      text-align: left;
      transition: 160ms ease;
    }

    .queue-card--warn {
      border-color: #fcd34d;
      background: #fffdf5;
    }

    .queue-card--danger {
      border-color: #fca5a5;
      background: #fff7f7;
    }

    .queue-card:hover,
    .queue-card.selected {
      border-color: #fdba74;
      box-shadow: 0 10px 24px rgba(234, 88, 12, 0.08);
      transform: translateY(-1px);
    }

    .queue-card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.6rem;
    }

    .queue-card-title {
      display: grid;
      gap: 0.18rem;
    }

    .queue-card-subtitle {
      color: #64748b;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .queue-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      font-size: 0.84rem;
      color: #334155;
    }

    .queue-meta--muted {
      color: #64748b;
      font-size: 0.78rem;
    }

    .queue-card-action {
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      margin-top: 0.1rem;
      color: #c2410c;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .empty-lane,
    .empty-detail {
      border: 1px dashed #dbe3ee;
      border-radius: 18px;
      padding: 0.9rem;
      color: #64748b;
      background: #fff;
    }

    .detail-card {
      display: grid;
      gap: 1rem;
    }

    .decision-banner {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.8rem;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: linear-gradient(180deg, #fffaf5 0%, #ffffff 100%);
      padding: 0.9rem 1rem;
    }

    .decision-banner strong {
      display: block;
      margin-top: 0.15rem;
      font-size: 1.02rem;
    }

    .decision-banner p {
      margin-top: 0.3rem;
      color: #64748b;
      line-height: 1.45;
      font-size: 0.9rem;
    }

    .detail-grid {
      display: grid;
      gap: 0.75rem;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .detail-chip-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-top: -0.25rem;
    }

    .detail-block,
    .note-panel,
    .sub-panel {
      border: 1px solid #eef2f7;
      border-radius: 18px;
      padding: 0.9rem;
      background: #fff;
    }

    .note-panel p {
      margin-top: 0.4rem;
      color: #334155;
      line-height: 1.55;
    }

    .detail-block {
      display: grid;
      gap: 0.22rem;
      padding: 0.8rem 0.9rem;
    }

    .detail-block strong {
      font-size: 0.98rem;
      line-height: 1.35;
    }

    .detail-card .action-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem;
      margin-top: 0;
    }

    .detail-card .action-grid .btn {
      width: 100%;
    }

    .sub-panel--actions {
      display: grid;
      gap: 0.8rem;
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    }

    .sub-panel-head--compact {
      margin-bottom: 0;
    }

    .table-list {
      display: grid;
      gap: 0.55rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .best-fit-banner {
      border: 1px solid #dbeafe;
      border-radius: 16px;
      background: linear-gradient(135deg, #eff6ff, #f8fafc);
      padding: 0.95rem 1rem;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.8rem;
    }

    .best-fit-banner--caution {
      border-color: #fed7aa;
      background: linear-gradient(135deg, #fff7ed, #fff);
    }

    .best-fit-banner strong {
      display: block;
      font-size: 1.05rem;
      margin-top: 0.15rem;
    }

    .best-fit-banner p {
      margin-top: 0.35rem;
      color: #64748b;
      line-height: 1.45;
    }

    .table-choice {
      border: 1px solid #dbe3ee;
      border-radius: 16px;
      background: #f8fafc;
      padding: 0.75rem;
      display: grid;
      gap: 0.25rem;
      text-align: left;
      cursor: pointer;
    }

    .table-choice:hover {
      border-color: #fdba74;
      background: #fff7ed;
    }

    .table-choice-top,
    .table-choice-foot {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.6rem;
    }

    .table-choice-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      color: #475569;
      font-size: 0.88rem;
    }

    .table-choice-foot {
      margin-top: 0.15rem;
      color: #64748b;
      font-size: 0.84rem;
    }

    @media (max-width: 1440px) {
      .queue-layout {
        grid-template-columns: 320px minmax(0, 1fr);
      }

      .detail-card {
        grid-column: 1 / -1;
      }

      .lane-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 1180px) {
      .page-shell {
        margin-left: 0;
        padding: 1rem;
      }

      .summary-grid,
      .queue-layout,
      .lane-grid,
      .table-list,
      .detail-grid,
      .form-grid,
      .board-controls {
        grid-template-columns: 1fr;
      }

      .best-fit-banner,
      .decision-banner,
      .table-choice-top,
      .table-choice-foot,
      .lane-header {
        flex-direction: column;
      }

      .detail-card .action-grid,
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class QueueComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  includeClosed = false;
  queue = signal<GuestQueueEntry[]>([]);
  reservations = signal<Reservation[]>([]);
  floors = signal<Floor[]>([]);
  tables = signal<CanvasTable[]>([]);
  summary = signal<GuestQueueSummary | null>(null);
  selectedQueueEntryId = signal<number | null>(null);
  busyEntryId = signal<number | null>(null);
  prefillContext = signal<string | null>(null);

  queueSearch = '';
  queueSourceFilter:
    | 'all'
    | 'staff_manual'
    | 'walk_in'
    | 'phone'
    | 'web_waitlist'
    | 'reservation_linked' = 'all';
  queueFloorFilter = '';
  queueUrgencyFilter: 'all' | 'normal' | 'warn' | 'danger' = 'all';

  preferredFloorDraft = '';
  draft: GuestQueueCreate = this.emptyDraft();
  reservationDraft = this.createReservationDraft();

  readonly lanes: Array<{ status: GuestQueueStatus; label: string }> = [
    { status: 'waiting', label: 'Waiting' },
    { status: 'notified', label: 'Notified' },
    { status: 'seated', label: 'Seated' },
  ];

  selectedEntry = computed(() => {
    const id = this.selectedQueueEntryId();
    return this.queue().find((entry) => entry.id === id) ?? null;
  });

  activeEntries = computed(() =>
    this.queue().filter((entry) => ['waiting', 'notified', 'seated'].includes(entry.status)),
  );

  filteredBoardEntries = computed(() => {
    const term = this.queueSearch.trim().toLowerCase();
    const floorFilterId = this.queueFloorFilter ? Number(this.queueFloorFilter) : null;
    return this.queue().filter((entry) => {
      if (
        this.queueSourceFilter !== 'all' &&
        !(
          this.queueSourceFilter === 'reservation_linked'
            ? Boolean(entry.linked_reservation_id)
            : entry.source === this.queueSourceFilter
        )
      ) {
        return false;
      }
      if (floorFilterId && entry.preferred_floor_id !== floorFilterId) {
        return false;
      }
      if (this.queueUrgencyFilter !== 'all' && this.queuePriorityTone(entry) !== this.queueUrgencyFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      const haystack = [
        entry.customer_name,
        entry.customer_phone,
        entry.notes,
        entry.preferred_floor_name,
        entry.seated_table_name,
        entry.linked_reservation_id ? `reservation ${entry.linked_reservation_id}` : '',
        this.queueSourceLabel(entry.source),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  });

  filteredActiveEntries = computed(() =>
    this.filteredBoardEntries().filter((entry) => ['waiting', 'notified', 'seated'].includes(entry.status)),
  );

  actionNowCount = computed(
    () =>
      this.filteredActiveEntries().filter(
        (entry) => entry.status === 'notified' || this.queuePriorityTone(entry) !== 'normal',
      ).length,
  );

  visibleReservationLinkedCount = computed(
    () => this.filteredBoardEntries().filter((entry) => Boolean(entry.linked_reservation_id)).length,
  );

  boardFilterActive = computed(
    () =>
      !!this.queueSearch.trim() ||
      this.queueSourceFilter !== 'all' ||
      !!this.queueFloorFilter ||
      this.queueUrgencyFilter !== 'all',
  );

  arrivalsDueSoon = computed(() =>
    this.reservations()
      .filter((reservation) => reservation.status === 'booked')
      .map((reservation) => ({
        reservation,
        minutes: this.minutesUntilReservationStart(reservation),
      }))
      .filter(
        (row) => row.minutes !== null && row.minutes >= -30 && row.minutes <= 180,
      )
      .sort((a, b) => (a.minutes ?? 9_999) - (b.minutes ?? 9_999))
      .map((row) => row.reservation),
  );

  arrivalsDueNowCount = computed(
    () =>
      this.arrivalsDueSoon().filter(
        (reservation) => this.reservationUrgencyTone(reservation) === 'due',
      ).length,
  );

  readyTableCount = computed(
    () =>
      this.tables().filter(
        (table) =>
          table.is_active !== false &&
          (table.operational_status ?? table.status ?? 'available') === 'available',
      ).length,
  );

  matchingTableChoices = computed<QueueTableChoice[]>(() => {
    const entry = this.selectedEntry();
    if (!entry || !this.canSeat(entry)) return [];

    return this.tables()
      .filter((table) => table.is_active !== false)
      .filter((table) => (table.operational_status ?? table.status ?? 'available') === 'available')
      .filter((table) => (entry.preferred_floor_id ? table.floor_id === entry.preferred_floor_id : true))
      .filter((table) => (table.seat_count ?? 0) >= entry.party_size)
      .map((table) => {
        const seats = table.seat_count ?? entry.party_size;
        const urgency = this.tableUrgency(table);
        const score =
          Math.abs(seats - entry.party_size) +
          (entry.preferred_floor_id && table.floor_id !== entry.preferred_floor_id ? 12 : 0) +
          (urgency === 'due' ? 50 : urgency === 'soon' ? 18 : 0);
        return {
          table,
          seats,
          seatGap: Math.max(0, seats - entry.party_size),
          floorName: this.floorNameForTable(table),
          preferredFloorMatch: entry.preferred_floor_id ? table.floor_id === entry.preferred_floor_id : true,
          fitLabel: this.tableFitLabel(table, entry.party_size),
          riskCopy: this.tableRiskCopy(table),
          urgencyLabel: this.tableUrgencyLabel(table),
          urgencyTone: urgency,
          suggested: false,
          score,
        } satisfies QueueTableChoice;
      })
      .sort((a, b) => a.score - b.score || a.table.name.localeCompare(b.table.name))
      .map((choice, index) => ({ ...choice, suggested: index === 0 }));
  });

  bestTableChoice = computed<QueueTableChoice | null>(() => this.matchingTableChoices()[0] ?? null);

  ngOnInit(): void {
    this.reload();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.applyRoutePrefill(params);
      });
    this.api.queueUpdates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.reloadQueue();
        this.reloadSummary();
        this.reloadTables();
      });
  }

  reload(): void {
    this.reloadQueue();
    this.reloadReservations();
    this.reloadSummary();
    this.reloadTables();
    this.reloadFloors();
  }

  reloadQueue(): void {
    this.loading.set(true);
    this.api.getGuestQueue(this.includeClosed).subscribe({
      next: (rows) => {
        this.queue.set(rows);
        this.ensureSelection();
        this.syncSelectionWithVisibleBoard();
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the guest queue right now.');
        this.loading.set(false);
      },
    });
  }

  reloadSummary(): void {
    this.api.getGuestQueueSummary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.error.set('Could not load queue summary.'),
    });
  }

  reloadReservations(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.api.getReservations({ date: today, status: 'booked' }).subscribe({
      next: (rows) => this.reservations.set(rows),
      error: () => this.error.set('Could not load booked arrivals.'),
    });
  }

  reloadTables(): void {
    this.api.getTablesWithStatus().subscribe({
      next: (rows) => this.tables.set(rows),
      error: () => this.error.set('Could not load tables for seating.'),
    });
  }

  reloadFloors(): void {
    this.api.getFloors().subscribe({
      next: (rows) => this.floors.set(rows),
      error: () => this.error.set('Could not load floors.'),
    });
  }

  createQueueEntry(): void {
    if (!this.draft.customer_name?.trim()) {
      this.error.set('Guest name is required.');
      return;
    }
    if (!this.draft.party_size || this.draft.party_size < 1) {
      this.error.set('Party size must be at least 1.');
      return;
    }

    this.error.set(null);
    this.saving.set(true);
    const payload: GuestQueueCreate = {
      ...this.draft,
      customer_name: this.draft.customer_name.trim(),
      customer_phone: this.draft.customer_phone?.trim() || null,
      quoted_wait_minutes: this.draft.quoted_wait_minutes || null,
      preferred_floor_id: this.preferredFloorDraft ? Number(this.preferredFloorDraft) : null,
      preferred_table_size: this.draft.preferred_table_size || null,
      linked_reservation_id: this.draft.linked_reservation_id || null,
      notes: this.draft.notes?.trim() || null,
      source: 'staff_manual',
    };

    this.api.createGuestQueueEntry(payload).subscribe({
      next: (entry) => {
        this.draft = this.emptyDraft();
        this.preferredFloorDraft = '';
        this.saving.set(false);
        this.reload();
        this.selectEntry(entry);
      },
      error: () => {
        this.error.set('Could not add this guest to the queue.');
        this.saving.set(false);
      },
    });
  }

  selectEntry(entry: GuestQueueEntry): void {
    this.selectedQueueEntryId.set(entry.id);
    this.reservationDraft = this.createReservationDraft();
  }

  getEntriesForStatus(status: GuestQueueStatus): GuestQueueEntry[] {
    return this.filteredBoardEntries()
      .filter((entry) => entry.status === status)
      .sort((a, b) => this.queueLaneSortScore(b) - this.queueLaneSortScore(a) || this.queueSortTime(a) - this.queueSortTime(b));
  }

  clearBoardFilters(): void {
    this.queueSearch = '';
    this.queueSourceFilter = 'all';
    this.queueFloorFilter = '';
    this.queueUrgencyFilter = 'all';
    this.syncSelectionWithVisibleBoard();
  }

  summaryCount(status: GuestQueueStatus): number {
    return this.summary()?.counts?.[status] ?? 0;
  }

  prettyStatus(status: GuestQueueStatus): string {
    return status.replace(/_/g, ' ');
  }

  queueSourceLabel(source: GuestQueueEntry['source']): string {
    switch (source) {
      case 'walk_in':
        return 'Walk-in';
      case 'phone':
        return 'Phone';
      case 'web_waitlist':
        return 'Web waitlist';
      default:
        return 'Host stand';
    }
  }

  queuePriorityLabel(entry: GuestQueueEntry): string | null {
    const minutes = this.minutesSince(entry.requested_at);
    if (minutes === null) return null;
    if (minutes >= 60) return `${minutes} min waiting`;
    if (minutes >= 30) return `${minutes} min in queue`;
    return null;
  }

  queuePriorityTone(entry: GuestQueueEntry): 'normal' | 'warn' | 'danger' {
    const minutes = this.minutesSince(entry.requested_at);
    if (minutes === null) return 'normal';
    if (minutes >= 60) return 'danger';
    if (minutes >= 30) return 'warn';
    return 'normal';
  }

  laneLeadLabel(status: GuestQueueStatus): string | null {
    const lead = this.getEntriesForStatus(status)[0];
    if (!lead) return null;
    if (status === 'seated') {
      return lead.seated_table_name ? `On ${lead.seated_table_name}` : 'Already seated';
    }
    return this.queuePriorityLabel(lead) ?? 'Newest first';
  }

  laneLeadTone(status: GuestQueueStatus): 'normal' | 'warn' | 'danger' {
    const lead = this.getEntriesForStatus(status)[0];
    if (!lead || status === 'seated') return 'normal';
    return this.queuePriorityTone(lead);
  }

  queueCardActionLabel(entry: GuestQueueEntry): string | null {
    if (entry.status === 'waiting') return 'Tap to notify or seat';
    if (entry.status === 'notified') return 'Tap to seat or convert';
    if (entry.status === 'seated') return 'Tap to open POS handoff';
    return null;
  }

  selectedEntryDecisionTitle(entry: GuestQueueEntry): string {
    if (entry.status === 'waiting') return 'Notify or seat this guest now';
    if (entry.status === 'notified') return 'Seat the guest or convert the visit';
    if (entry.status === 'seated') return 'Open POS and start service';
    return 'Review this queue entry';
  }

  selectedEntryDecisionCopy(entry: GuestQueueEntry): string {
    if (entry.status === 'waiting') {
      return entry.preferred_floor_name
        ? `Start with ${entry.preferred_floor_name} if a clear table is ready, otherwise notify the guest and keep the queue moving.`
        : 'Choose a clear table if one fits now, or notify the guest so the next handoff is ready.';
    }
    if (entry.status === 'notified') {
      return 'The guest has been called. Seat them now if the floor is clear, or convert this visit into a timed booking.';
    }
    if (entry.status === 'seated') {
      return 'The floor handoff is complete. Move into POS to start or continue the table bill.';
    }
    return 'Use the actions below to close or inspect this queue record.';
  }

  latestQueueMatchForReservation(reservation: Reservation): GuestQueueEntry | null {
    const linkedMatches = this.queue()
      .filter((entry) => entry.linked_reservation_id === reservation.id)
      .sort((a, b) => this.queueSortTime(b) - this.queueSortTime(a));
    if (linkedMatches.length) return linkedMatches[0] ?? null;

    const phone = this.normalizePhone(reservation.customer_phone);
    if (!phone) return null;
    const phoneMatches = this.queue()
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

  reservationUrgencyTone(reservation: Reservation): 'clear' | 'soon' | 'due' {
    const minutes = this.minutesUntilReservationStart(reservation);
    if (minutes === null) return 'clear';
    if (minutes <= 10) return 'due';
    if (minutes <= 45) return 'soon';
    return 'clear';
  }

  reservationUrgencyLabel(reservation: Reservation): string {
    const minutes = this.minutesUntilReservationStart(reservation);
    if (minutes === null) return 'Time pending';
    if (minutes < 0) return `${Math.abs(minutes)} min late`;
    if (minutes <= 10) return `Due in ${minutes} min`;
    return `${minutes} min out`;
  }

  arrivalDecisionTitle(reservation: Reservation): string {
    const queueMatch = this.latestQueueMatchForReservation(reservation);
    if (queueMatch?.status === 'seated') return 'Guest is already seated';
    if (queueMatch) return 'Guest is already on the live queue';
    if (!reservation.table_id) return 'No table is assigned yet';
    if (this.reservationUrgencyTone(reservation) === 'due') return 'Reservation is due right now';
    return 'Reservation is approaching service time';
  }

  arrivalDecisionCopy(reservation: Reservation): string {
    const queueMatch = this.latestQueueMatchForReservation(reservation);
    if (queueMatch?.status === 'seated') {
      return 'Open POS to continue service on the seated table and keep the floor handoff moving.';
    }
    if (queueMatch) {
      return 'The guest is already on the host board. Open queue to notify, seat, or convert without creating duplicate traffic.';
    }
    if (!reservation.table_id) {
      return 'Push this arrival into the queue now so the host can manage the wait against live floor availability.';
    }
    if (this.reservationUrgencyTone(reservation) === 'due') {
      return 'The table is assigned and the booking is due. Open POS when the guest arrives, or move them into queue if the floor starts slipping.';
    }
    return 'Keep the table ready and stage the queue handoff only if the arrival timing starts drifting or the guest checks in early.';
  }

  arrivalPrimaryActionLabel(reservation: Reservation): string {
    const queueMatch = this.latestQueueMatchForReservation(reservation);
    if (queueMatch?.status === 'seated') return 'Open POS';
    if (queueMatch) return 'Open queue';
    if (!reservation.table_id) return 'Send to queue';
    if (this.reservationUrgencyTone(reservation) === 'due') return 'Open POS';
    return 'Prep queue handoff';
  }

  arrivalSecondaryActionLabel(reservation: Reservation): string {
    const queueMatch = this.latestQueueMatchForReservation(reservation);
    if (queueMatch?.status === 'seated') return 'Open queue';
    if (queueMatch) return reservation.table_id ? 'Open POS' : 'Reservation only';
    if (!reservation.table_id) return 'Reservation only';
    return 'Open POS';
  }

  arrivalPrimaryActionDisabled(reservation: Reservation): boolean {
    const queueMatch = this.latestQueueMatchForReservation(reservation);
    return queueMatch?.status === 'seated' ? !reservation.table_id : false;
  }

  arrivalSecondaryActionDisabled(reservation: Reservation): boolean {
    const queueMatch = this.latestQueueMatchForReservation(reservation);
    if (queueMatch?.status === 'seated') return false;
    if (queueMatch) return !reservation.table_id;
    return !reservation.table_id;
  }

  runArrivalPrimaryAction(reservation: Reservation): void {
    const queueMatch = this.latestQueueMatchForReservation(reservation);
    if (
      queueMatch?.status === 'seated' ||
      (reservation.table_id && !queueMatch && this.reservationUrgencyTone(reservation) === 'due')
    ) {
      this.openPosForReservation(reservation);
      return;
    }
    this.openQueueForReservation(reservation);
  }

  runArrivalSecondaryAction(reservation: Reservation): void {
    const queueMatch = this.latestQueueMatchForReservation(reservation);
    if (queueMatch?.status === 'seated') {
      this.openQueueForReservation(reservation);
      return;
    }
    if (queueMatch && reservation.table_id) {
      this.openPosForReservation(reservation);
      return;
    }
    if (!queueMatch && reservation.table_id) {
      this.openPosForReservation(reservation);
    }
  }

  bestChoiceSummary(choice: QueueTableChoice): string {
    const floor = choice.preferredFloorMatch ? 'Preferred floor matched.' : `Best available on ${choice.floorName}.`;
    const urgency = choice.urgencyLabel ? ` ${choice.urgencyLabel}.` : '';
    return `${choice.fitLabel}. ${floor} ${choice.riskCopy}${urgency}`.trim();
  }

  tableChoiceLabel(choice: QueueTableChoice, bestChoice: QueueTableChoice): string {
    if (choice.urgencyTone === 'due') return 'Risky soon';
    if (choice.urgencyTone === 'soon') return 'Short turn';
    if (!choice.preferredFloorMatch && bestChoice.preferredFloorMatch) return 'Other floor';
    if (choice.seatGap > bestChoice.seatGap) return 'Larger backup';
    if (choice.seatGap === 0 && bestChoice.seatGap === 0) return 'Exact-fit backup';
    return 'Backup seat';
  }

  tableChoiceDecisionCopy(choice: QueueTableChoice, bestChoice: QueueTableChoice): string {
    if (choice.suggested) {
      return choice.riskCopy;
    }
    if (choice.urgencyTone === 'due') {
      return 'A reservation is due very soon here. Use only if you expect a very short turn.';
    }
    if (choice.urgencyTone === 'soon') {
      return 'This table works now, but service pace must stay tight because a booking is coming up.';
    }
    if (!choice.preferredFloorMatch && bestChoice.preferredFloorMatch) {
      return `Seats the guest, but moves them away from the preferred floor.`;
    }
    if (choice.seatGap > bestChoice.seatGap) {
      return `Seats the party, but holds back ${choice.seatGap - bestChoice.seatGap} extra seat${choice.seatGap - bestChoice.seatGap === 1 ? '' : 's'} compared with the best-fit option.`;
    }
    if (choice.seatGap === 0 && bestChoice.seatGap === 0) {
      return 'Also an exact fit if the recommended table changes first.';
    }
    return 'Solid backup if the preferred seat changes before you commit.';
  }

  canNotify(entry: GuestQueueEntry): boolean {
    return entry.status === 'waiting';
  }

  canResetToWaiting(entry: GuestQueueEntry): boolean {
    return entry.status === 'notified';
  }

  canCloseEntry(entry: GuestQueueEntry): boolean {
    return entry.status === 'waiting' || entry.status === 'notified';
  }

  canSeat(entry: GuestQueueEntry): boolean {
    return entry.status === 'waiting' || entry.status === 'notified';
  }

  markStatus(entry: GuestQueueEntry, status: GuestQueueStatus, reason?: string): void {
    this.error.set(null);
    this.busyEntryId.set(entry.id);
    this.api.updateGuestQueueStatus(entry.id, { status, reason: reason ?? null }).subscribe({
      next: (updated) => {
        this.busyEntryId.set(null);
        this.mergeEntry(updated);
      },
      error: () => {
        this.error.set('Could not update this queue entry.');
        this.busyEntryId.set(null);
      },
    });
  }

  seatEntry(entry: GuestQueueEntry, table: CanvasTable): void {
    if (!table.id) {
      this.error.set('This table is missing an id and cannot be used for seating.');
      return;
    }
    this.error.set(null);
    this.busyEntryId.set(entry.id);
    this.api.seatGuestQueueEntry(entry.id, table.id).subscribe({
      next: (updated) => {
        this.busyEntryId.set(null);
        this.mergeEntry(updated);
        this.openPosForSeatedEntry(updated);
      },
      error: () => {
        this.error.set('Could not seat this guest on the selected table.');
        this.busyEntryId.set(null);
      },
    });
  }

  convertToReservation(entry: GuestQueueEntry): void {
    if (!this.reservationDraft.date || !this.reservationDraft.time) {
      this.error.set('Reservation date and time are required.');
      return;
    }

    this.error.set(null);
    this.busyEntryId.set(entry.id);
    this.api
      .convertGuestQueueToReservation(entry.id, {
        reservation_date: this.reservationDraft.date,
        reservation_time: this.reservationDraft.time,
        customer_email: this.reservationDraft.email || null,
        client_notes: this.reservationDraft.clientNotes || null,
        customer_notes: null,
        service_type: this.reservationDraft.serviceType || null,
        seating_preference: null,
      })
      .subscribe({
        next: ({ queue_entry, reservation }) => {
          this.busyEntryId.set(null);
          this.mergeEntry(queue_entry);
          this.openPosForReservation(reservation);
        },
        error: () => {
          this.error.set('Could not convert this guest into a reservation.');
          this.busyEntryId.set(null);
        },
      });
  }

  openPosForSeatedEntry(entry: GuestQueueEntry): void {
    if (!entry.seated_table_id) return;
    void this.router.navigate(['/pos'], {
      queryParams: {
        tableId: entry.seated_table_id,
        queueEntryId: entry.id,
        queueGuest: entry.customer_name,
        queuePhone: entry.customer_phone || null,
        queuePartySize: entry.party_size,
        queueNotes: entry.notes || null,
      },
    });
  }

  openPosForReservation(reservation: Reservation): void {
    if (!reservation.table_id) return;
    void this.router.navigate(['/pos'], {
      queryParams: {
        tableId: reservation.table_id,
        reservationId: reservation.id,
        reservationGuest: reservation.customer_name || null,
        reservationPhone: reservation.customer_phone || null,
        reservationPartySize: reservation.party_size || null,
        reservationNotes: reservation.client_notes || reservation.customer_notes || null,
      },
    });
  }

  openQueueForReservation(reservation: Reservation): void {
    const queueMatch = this.latestQueueMatchForReservation(reservation);
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

  relativeTime(value?: string | null): string {
    if (!value) return 'N/A';
    const date = new Date(value);
    const diffMinutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} d ago`;
  }

  floorNameForTable(table: CanvasTable): string {
    if (!table.floor_id) return 'Floor';
    return this.floors().find((floor) => floor.id === table.floor_id)?.name || 'Floor';
  }

  private tableUrgency(table: CanvasTable): 'clear' | 'soon' | 'due' {
    const minutes = this.minutesUntilReservation(table.upcoming_reservation?.reservation_time);
    if (minutes === null) return 'clear';
    if (minutes <= 20) return 'due';
    if (minutes <= 45) return 'soon';
    return 'clear';
  }

  private tableUrgencyLabel(table: CanvasTable): string | null {
    const reservation = table.upcoming_reservation;
    if (!reservation?.reservation_time) return null;
    const minutes = this.minutesUntilReservation(reservation.reservation_time);
    if (minutes === null) return null;
    if (minutes <= 20) return `Reserved in ${Math.max(minutes, 0)} min`;
    if (minutes <= 45) return `Booking soon (${minutes} min)`;
    return `Upcoming booking in ${minutes} min`;
  }

  private tableRiskCopy(table: CanvasTable): string {
    const reservation = table.upcoming_reservation;
    if (!reservation?.reservation_time) {
      return 'No upcoming reservation pressure on this table.';
    }
    const minutes = this.minutesUntilReservation(reservation.reservation_time);
    const guest = reservation.customer_name || 'next booking';
    if (minutes === null) return `Upcoming reservation for ${guest}.`;
    if (minutes <= 20) return `${guest} is due very soon; seat only for a short turn.`;
    if (minutes <= 45) return `${guest} arrives soon; use only if service can move fast.`;
    return `${guest} is booked later, so this table is still workable now.`;
  }

  private tableFitLabel(table: CanvasTable, partySize: number): string {
    const seats = table.seat_count ?? partySize;
    if (seats === partySize) return 'Exact fit';
    if (seats === partySize + 1) return 'Near fit';
    return `${seats - partySize} spare seat${seats - partySize === 1 ? '' : 's'}`;
  }

  private minutesUntilReservation(value?: string | null): number | null {
    if (!value) return null;
    const target = new Date(value).getTime();
    if (Number.isNaN(target)) return null;
    return Math.round((target - Date.now()) / 60000);
  }

  private minutesSince(value?: string | null): number | null {
    if (!value) return null;
    const started = new Date(value).getTime();
    if (Number.isNaN(started)) return null;
    return Math.max(0, Math.round((Date.now() - started) / 60000));
  }

  private ensureSelection(): void {
    const existing = this.selectedQueueEntryId();
    if (existing && this.queue().some((entry) => entry.id === existing)) {
      return;
    }
    const next = this.activeEntries()[0] ?? this.queue()[0] ?? null;
    this.selectedQueueEntryId.set(next?.id ?? null);
  }

  syncSelectionWithVisibleBoard(): void {
    const existing = this.selectedQueueEntryId();
    if (existing && this.filteredBoardEntries().some((entry) => entry.id === existing)) {
      return;
    }
    const next = this.filteredActiveEntries()[0] ?? this.filteredBoardEntries()[0] ?? null;
    this.selectedQueueEntryId.set(next?.id ?? null);
  }

  private mergeEntry(updated: GuestQueueEntry): void {
    const next = this.queue().map((entry) => (entry.id === updated.id ? updated : entry));
    this.queue.set(next);
    this.selectedQueueEntryId.set(updated.id);
    this.syncSelectionWithVisibleBoard();
    this.reloadSummary();
    this.reloadTables();
  }

  private emptyDraft(): GuestQueueCreate {
    return {
      customer_name: '',
      customer_phone: '',
      party_size: 2,
      quoted_wait_minutes: 15,
      source: 'staff_manual',
      arrived_now: true,
      preferred_floor_id: null,
      preferred_table_size: null,
      linked_reservation_id: null,
      notes: '',
    };
  }

  clearPrefill(): void {
    this.prefillContext.set(null);
    this.draft = this.emptyDraft();
    this.preferredFloorDraft = '';
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        reservationId: null,
        queueEntryId: null,
        queueGuest: null,
        queuePhone: null,
        queuePartySize: null,
        preferredFloorId: null,
        queueNotes: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  private applyRoutePrefill(params: import('@angular/router').ParamMap): void {
    const reservationId = Number(params.get('reservationId') || 0) || null;
    const queueEntryId = Number(params.get('queueEntryId') || 0) || null;
    const guest = params.get('queueGuest')?.trim() || '';
    const phone = params.get('queuePhone')?.trim() || '';
    const partySize = Number(params.get('queuePartySize') || 0) || null;
    const preferredFloorId = Number(params.get('preferredFloorId') || 0) || null;
    const notes = params.get('queueNotes')?.trim() || '';

    if (queueEntryId) {
      this.selectedQueueEntryId.set(queueEntryId);
    }

    if (!reservationId && !guest && !phone && !notes && !preferredFloorId && !partySize) {
      this.prefillContext.set(null);
      return;
    }

    this.draft = {
      ...this.draft,
      customer_name: guest || this.draft.customer_name,
      customer_phone: phone || this.draft.customer_phone,
      party_size: partySize || this.draft.party_size,
      preferred_floor_id: preferredFloorId || this.draft.preferred_floor_id || null,
      preferred_table_size: partySize || this.draft.preferred_table_size || null,
      linked_reservation_id: reservationId,
      notes: notes || this.draft.notes,
    };
    this.preferredFloorDraft = preferredFloorId ? String(preferredFloorId) : this.preferredFloorDraft;
    this.prefillContext.set(
      reservationId
        ? `Reservation #${reservationId} is ready for queue handoff`
        : 'Guest details prefilled from reservation flow',
    );
  }

  private createReservationDraft(): {
    date: string;
    time: string;
    email: string;
    clientNotes: string;
    serviceType: string;
  } {
    const now = new Date(Date.now() + 60 * 60000);
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 5);
    return {
      date,
      time,
      email: '',
      clientNotes: '',
      serviceType: 'dine_in',
    };
  }

  private minutesUntilReservationStart(reservation: Reservation): number | null {
    if (!reservation.reservation_date || !reservation.reservation_time) return null;
    const start = new Date(`${reservation.reservation_date}T${reservation.reservation_time}`);
    if (Number.isNaN(start.getTime())) return null;
    return Math.round((start.getTime() - Date.now()) / 60000);
  }

  private queueSortTime(entry: GuestQueueEntry): number {
    const value =
      entry.completed_at ||
      entry.seated_at ||
      entry.notified_at ||
      entry.arrived_at ||
      entry.requested_at;
    return value ? new Date(value).getTime() : 0;
  }

  private queueLaneSortScore(entry: GuestQueueEntry): number {
    const minutes = this.minutesSince(entry.requested_at) ?? 0;
    const reservationWeight = entry.linked_reservation_id ? 30 : 0;
    const statusWeight =
      entry.status === 'notified'
        ? 180
        : entry.status === 'waiting'
          ? 120
          : entry.status === 'seated'
            ? 60
            : 0;
    const urgencyWeight =
      this.queuePriorityTone(entry) === 'danger'
        ? 90
        : this.queuePriorityTone(entry) === 'warn'
          ? 40
          : 0;
    return statusWeight + reservationWeight + urgencyWeight + minutes;
  }

  private normalizePhone(value?: string | null): string {
    return (value || '').replace(/\D/g, '');
  }
}
