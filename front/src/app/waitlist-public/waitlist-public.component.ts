import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap } from 'rxjs';
import {
  ApiService,
  PublicQueueCreate,
  PublicQueueInfo,
  PublicQueueStatus,
} from '../services/api.service';

@Component({
  selector: 'app-waitlist-public',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './waitlist-public.component.html',
  styleUrl: './waitlist-public.component.scss',
})
export class WaitlistPublicComponent implements OnInit {
  readonly Math = Math;
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  tenantId = 0;
  info = signal<PublicQueueInfo | null>(null);
  status = signal<PublicQueueStatus | null>(null);
  loading = signal(true);
  submitting = signal(false);
  cancelling = signal(false);
  error = signal<string | null>(null);
  copied = signal(false);
  private activeStatusToken: string | null = null;

  form: PublicQueueCreate = {
    customer_name: '',
    customer_phone: '',
    party_size: 2,
    preferred_floor_id: null,
    notes: '',
  };

  ngOnInit(): void {
    this.tenantId = Number(this.route.snapshot.paramMap.get('tenantId'));
    if (!Number.isInteger(this.tenantId) || this.tenantId <= 0) {
      this.error.set('This queue link is invalid. Please ask the host for a new QR code.');
      this.loading.set(false);
      return;
    }

    this.loadQueueInfo();
    const queryToken = this.route.snapshot.queryParamMap.get('status');
    const savedToken = localStorage.getItem(this.storageKey());
    const token = queryToken || savedToken;
    if (token) this.watchStatus(token);
  }

  joinQueue(): void {
    if (this.submitting()) return;
    this.error.set(null);
    const payload: PublicQueueCreate = {
      customer_name: this.form.customer_name.trim(),
      customer_phone: this.form.customer_phone.trim(),
      party_size: Number(this.form.party_size),
      preferred_floor_id: this.form.preferred_floor_id || null,
      notes: this.form.notes?.trim() || null,
    };
    if (payload.customer_name.length < 2 || payload.customer_phone.length < 6) {
      this.error.set('Enter your name and a valid mobile number.');
      return;
    }

    this.submitting.set(true);
    this.api.joinPublicQueue(this.tenantId, payload).subscribe({
      next: (status) => {
        localStorage.setItem(this.storageKey(), status.token);
        this.activeStatusToken = status.token;
        this.status.set(status);
        this.submitting.set(false);
        this.watchStatus(status.token);
      },
      error: (err) => {
        this.error.set(this.errorMessage(err, 'We could not join the queue. Please check your details or speak to the host.'));
        this.submitting.set(false);
      },
    });
  }

  cancelQueue(): void {
    const current = this.status();
    if (!current || this.cancelling()) return;
    this.cancelling.set(true);
    this.api.cancelPublicQueue(current.token).subscribe({
      next: (status) => {
        this.status.set(status);
        this.cancelling.set(false);
      },
      error: () => {
        this.error.set('We could not cancel the queue entry. Please speak to the host.');
        this.cancelling.set(false);
      },
    });
  }

  startAgain(): void {
    this.activeStatusToken = null;
    localStorage.removeItem(this.storageKey());
    this.status.set(null);
    this.error.set(null);
    this.form = {
      customer_name: '',
      customer_phone: '',
      party_size: 2,
      preferred_floor_id: null,
      notes: '',
    };
    this.loadQueueInfo();
  }

  async copyStatusLink(): Promise<void> {
    const current = this.status();
    if (!current || !navigator.clipboard) return;
    const url = `${window.location.origin}/waitlist/${this.tenantId}?status=${encodeURIComponent(current.token)}`;
    await navigator.clipboard.writeText(url);
    this.copied.set(true);
    window.setTimeout(() => this.copied.set(false), 1800);
  }

  isActive(): boolean {
    return ['waiting', 'notified'].includes(this.status()?.status ?? '');
  }

  statusTitle(): string {
    switch (this.status()?.status) {
      case 'notified': return 'Your table is nearly ready';
      case 'seated': return 'You are seated';
      case 'completed': return 'Visit completed';
      case 'cancelled': return 'Queue entry cancelled';
      case 'no_show': return 'Queue entry closed';
      case 'expired': return 'Queue entry expired';
      case 'converted_to_reservation': return 'Moved to a reservation';
      default: return 'You are in the queue';
    }
  }

  statusCopy(): string {
    switch (this.status()?.status) {
      case 'notified': return 'Please return to the host stand now. We will hold your place briefly.';
      case 'seated': return 'The host has completed your queue check-in. Enjoy your meal.';
      case 'completed': return 'Your table session has ended. Thank you for dining with us.';
      case 'cancelled': return 'This entry is no longer active. You may join again if your plans change.';
      case 'no_show': return 'The host could not reach your party. Speak to the host if you are still nearby.';
      case 'expired': return 'This queue entry is no longer active.';
      case 'converted_to_reservation': return 'The host has scheduled your party for a later time.';
      default: return 'Keep this page open. Your position updates automatically.';
    }
  }

  private loadQueueInfo(): void {
    this.loading.set(true);
    this.api.getPublicQueueInfo(this.tenantId).subscribe({
      next: (info) => {
        this.info.set(info);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The queue is temporarily unavailable. Please speak to the host.');
        this.loading.set(false);
      },
    });
  }

  private watchStatus(token: string): void {
    this.activeStatusToken = token;
    interval(12_000)
      .pipe(
        startWith(0),
        switchMap(() => this.api.getPublicQueueStatus(token)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (status) => {
          if (this.activeStatusToken !== token) return;
          this.status.set(status);
          if (!['waiting', 'notified', 'seated'].includes(status.status)) {
            localStorage.removeItem(this.storageKey());
          }
        },
        error: () => {
          if (this.activeStatusToken !== token) return;
          localStorage.removeItem(this.storageKey());
          this.status.set(null);
          this.error.set('We could not find that queue entry. You can join the queue again below.');
        },
      });
  }

  private storageKey(): string {
    return `sakorio_queue_${this.tenantId}`;
  }

  private errorMessage(err: any, fallback: string): string {
    const detail = err?.error?.detail;
    return typeof detail === 'string' && detail.trim() ? detail : fallback;
  }
}
