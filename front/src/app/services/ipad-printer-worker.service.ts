import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { LeasedPrintJob, runIpadPrintJob } from './ipad-printer-job-runner';
import { Xp80tPrinterService } from './xp80t-printer.service';

export interface IpadPrinterWorkerStatus {
  running: boolean;
  configured: boolean;
  nativePrinterAvailable: boolean;
  lastHeartbeatAt: string | null;
  lastPrintedJobId: number | null;
  lastError: string | null;
}

@Injectable({ providedIn: 'root' })
export class IpadPrinterWorkerService {
  private readonly http = inject(HttpClient);
  private readonly xp80t = inject(Xp80tPrinterService);
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');
  private token = '';
  private timer?: ReturnType<typeof setInterval>;

  readonly status = signal<IpadPrinterWorkerStatus>({
    running: false,
    configured: false,
    nativePrinterAvailable: false,
    lastHeartbeatAt: null,
    lastPrintedJobId: null,
    lastError: null,
  });

  configure(token: string): void {
    this.token = token.trim();
    this.patchStatus({
      configured: this.token.length > 0,
      nativePrinterAvailable: this.xp80t.isNativeAvailable,
      lastError: null,
    });
  }

  start(intervalMs = 3000): void {
    if (!this.token) {
      this.patchStatus({ lastError: 'Printer token is required before starting the worker.' });
      return;
    }
    if (!this.xp80t.isNativeAvailable) {
      this.patchStatus({
        nativePrinterAvailable: false,
        lastError: 'XP-80T native printer plugin is not available in this build.',
      });
      return;
    }
    if (this.timer) return;
    this.patchStatus({ running: true, nativePrinterAvailable: true, lastError: null });
    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), Math.max(1000, intervalMs));
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.patchStatus({ running: false });
  }

  async runOnce(): Promise<number> {
    if (!this.token) return 0;
    try {
      await this.heartbeat();
      const jobs = await this.leaseJobs();
      for (const job of jobs) {
        await this.printJob(job);
      }
      return jobs.length;
    } catch (error) {
      this.patchStatus({
        lastError: error instanceof Error ? error.message : 'iPad printer worker failed.',
      });
      return 0;
    }
  }

  private async heartbeat(): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.apiUrl}/printer-agent/heartbeat`, {}, { headers: this.headers() }),
    );
    this.patchStatus({ lastHeartbeatAt: new Date().toISOString() });
  }

  private async leaseJobs(): Promise<LeasedPrintJob[]> {
    return firstValueFrom(
      this.http.post<LeasedPrintJob[]>(
        `${this.apiUrl}/printer-agent/jobs/lease?limit=5`,
        {},
        { headers: this.headers() },
      ),
    );
  }

  private async printJob(job: LeasedPrintJob): Promise<void> {
    const result = await runIpadPrintJob(job, {
      printEscPos: (jobId, bytes) => this.xp80t.printEscPos(jobId, bytes),
      complete: (jobId, leaseToken) =>
        firstValueFrom(
          this.http.post(
            `${this.apiUrl}/printer-agent/jobs/${jobId}/complete`,
            { lease_token: leaseToken },
            { headers: this.headers() },
          ),
        ).then(() => undefined),
      fail: (jobId, leaseToken, error) =>
        firstValueFrom(
          this.http.post(
            `${this.apiUrl}/printer-agent/jobs/${jobId}/fail`,
            { lease_token: leaseToken, error },
            { headers: this.headers() },
          ),
        ).then(() => undefined),
    });
    if (result.printed) {
      this.patchStatus({ lastPrintedJobId: job.id, lastError: null });
    } else {
      this.patchStatus({ lastError: result.error });
    }
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Printer-Agent-Token': this.token,
    });
  }

  private patchStatus(patch: Partial<IpadPrinterWorkerStatus>): void {
    this.status.update((current) => ({ ...current, ...patch }));
  }
}
