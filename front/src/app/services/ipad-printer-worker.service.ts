import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { LeasedPrintJob, runIpadPrintJob } from './ipad-printer-job-runner';
import { Xp80tPrinterService } from './xp80t-printer.service';

export interface TabletPrinterProfile {
  id: string;
  name: string;
  token: string;
  deviceId: string;
  deviceName: string;
}

export const TABLET_PRINTER_PROFILES_STORAGE_KEY = 'sakorio.printerProfiles.v2';

export interface IpadPrinterWorkerStatus {
  running: boolean;
  configured: boolean;
  nativePrinterAvailable: boolean;
  connected: boolean;
  lastHeartbeatAt: string | null;
  lastPrintedJobId: number | null;
  lastError: string | null;
}

const EMPTY_STATUS: IpadPrinterWorkerStatus = {
  running: false,
  configured: false,
  nativePrinterAvailable: false,
  connected: false,
  lastHeartbeatAt: null,
  lastPrintedJobId: null,
  lastError: null,
};

@Injectable({ providedIn: 'root' })
export class IpadPrinterWorkerService {
  private readonly http = inject(HttpClient);
  private readonly printer = inject(Xp80tPrinterService);
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly profiles = new Map<string, TabletPrinterProfile>();
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly busyProfiles = new Set<string>();

  readonly profileStatuses = signal<Record<string, IpadPrinterWorkerStatus>>({});
  readonly status = signal<IpadPrinterWorkerStatus>({ ...EMPTY_STATUS });

  configureProfiles(profiles: TabletPrinterProfile[]): void {
    const nextIds = new Set(profiles.map((profile) => profile.id));
    for (const existingId of this.profiles.keys()) {
      if (!nextIds.has(existingId)) this.stopProfile(existingId);
    }
    this.profiles.clear();
    const statuses = { ...this.profileStatuses() };
    for (const profile of profiles) {
      const normalized = normalizeProfile(profile);
      this.profiles.set(normalized.id, normalized);
      statuses[normalized.id] = {
        ...(statuses[normalized.id] || EMPTY_STATUS),
        configured: Boolean(normalized.token && normalized.deviceId),
        nativePrinterAvailable: this.printer.isNativeAvailable,
      };
    }
    for (const profileId of Object.keys(statuses)) {
      if (!nextIds.has(profileId)) delete statuses[profileId];
    }
    this.profileStatuses.set(statuses);
    this.refreshAggregateStatus();
  }

  startAll(intervalMs = 3000): void {
    for (const profileId of this.profiles.keys()) this.startProfile(profileId, intervalMs);
  }

  startProfile(profileId: string, intervalMs = 3000): void {
    const profile = this.profiles.get(profileId);
    if (!profile?.token || !profile.deviceId) {
      this.patchProfileStatus(profileId, {
        lastError: 'Printer profile requires both a paired device and printer-agent token.',
      });
      return;
    }
    if (!this.printer.isNativeAvailable) {
      this.patchProfileStatus(profileId, {
        nativePrinterAvailable: false,
        lastError: 'Bluetooth ESC/POS printer plugin is not available in this build.',
      });
      return;
    }
    if (this.timers.has(profileId)) return;
    this.patchProfileStatus(profileId, {
      running: true,
      configured: true,
      nativePrinterAvailable: true,
      lastError: null,
    });
    void this.runOnce(profileId);
    const timer = setInterval(
      () => void this.runOnce(profileId),
      Math.max(1000, intervalMs),
    );
    this.timers.set(profileId, timer);
  }

  stopAll(): void {
    for (const profileId of [...this.timers.keys()]) this.stopProfile(profileId);
  }

  stopProfile(profileId: string): void {
    const timer = this.timers.get(profileId);
    if (timer) clearInterval(timer);
    this.timers.delete(profileId);
    this.patchProfileStatus(profileId, { running: false });
  }

  async runOnce(profileId: string): Promise<number> {
    const profile = this.profiles.get(profileId);
    if (!profile || this.busyProfiles.has(profileId)) return 0;
    this.busyProfiles.add(profileId);
    try {
      await this.ensureConnected(profile);
      await this.heartbeat(profile);
      const jobs = await this.leaseJobs(profile);
      for (const job of jobs) await this.printJob(profile, job);
      return jobs.length;
    } catch (error) {
      this.patchProfileStatus(profileId, {
        connected: false,
        lastError: errorMessage(error, 'Tablet printer worker failed.'),
      });
      return 0;
    } finally {
      this.busyProfiles.delete(profileId);
    }
  }

  private async ensureConnected(profile: TabletPrinterProfile): Promise<void> {
    const current = await this.printer.refreshStatus(profile.deviceId);
    if (current.connected) {
      this.patchProfileStatus(profile.id, { connected: true, lastError: null });
      return;
    }
    const connected = await this.printer.connect(profile.deviceId);
    if (!connected.connected) {
      throw new Error(`Could not connect ${profile.name} to ${profile.deviceName}.`);
    }
    this.patchProfileStatus(profile.id, { connected: true, lastError: null });
  }

  private async heartbeat(profile: TabletPrinterProfile): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.apiUrl}/printer-agent/heartbeat`, {}, { headers: this.headers(profile) }),
    );
    this.patchProfileStatus(profile.id, { lastHeartbeatAt: new Date().toISOString() });
  }

  private async leaseJobs(profile: TabletPrinterProfile): Promise<LeasedPrintJob[]> {
    return firstValueFrom(
      this.http.post<LeasedPrintJob[]>(
        `${this.apiUrl}/printer-agent/jobs/lease?limit=5`,
        {},
        { headers: this.headers(profile) },
      ),
    );
  }

  private async printJob(profile: TabletPrinterProfile, job: LeasedPrintJob): Promise<void> {
    const result = await runIpadPrintJob(job, {
      printEscPos: (jobId, bytes) =>
        this.printer.printEscPos(jobId, bytes, profile.deviceId),
      complete: (jobId, leaseToken) =>
        firstValueFrom(
          this.http.post(
            `${this.apiUrl}/printer-agent/jobs/${jobId}/complete`,
            { lease_token: leaseToken },
            { headers: this.headers(profile) },
          ),
        ).then(() => undefined),
      fail: (jobId, leaseToken, error) =>
        firstValueFrom(
          this.http.post(
            `${this.apiUrl}/printer-agent/jobs/${jobId}/fail`,
            { lease_token: leaseToken, error },
            { headers: this.headers(profile) },
          ),
        ).then(() => undefined),
    });
    if (result.printed) {
      this.patchProfileStatus(profile.id, {
        connected: true,
        lastPrintedJobId: job.id,
        lastError: null,
      });
    } else {
      this.patchProfileStatus(profile.id, { lastError: result.error });
    }
  }

  private headers(profile: TabletPrinterProfile): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Printer-Agent-Token': profile.token,
    });
  }

  private patchProfileStatus(
    profileId: string,
    patch: Partial<IpadPrinterWorkerStatus>,
  ): void {
    this.profileStatuses.update((current) => ({
      ...current,
      [profileId]: { ...(current[profileId] || EMPTY_STATUS), ...patch },
    }));
    this.refreshAggregateStatus();
  }

  private refreshAggregateStatus(): void {
    const statuses = Object.values(this.profileStatuses());
    const lastHeartbeatAt =
      statuses
        .map((item) => item.lastHeartbeatAt)
        .filter((item): item is string => Boolean(item))
        .sort()
        .at(-1) || null;
    const lastPrintedJobId =
      statuses
        .map((item) => item.lastPrintedJobId)
        .filter((item): item is number => item !== null)
        .sort((a, b) => b - a)[0] ?? null;
    this.status.set({
      running: statuses.some((item) => item.running),
      configured: statuses.length > 0 && statuses.every((item) => item.configured),
      nativePrinterAvailable: this.printer.isNativeAvailable,
      connected: statuses.length > 0 && statuses.every((item) => item.connected),
      lastHeartbeatAt,
      lastPrintedJobId,
      lastError: statuses.find((item) => item.lastError)?.lastError || null,
    });
  }
}

function normalizeProfile(profile: TabletPrinterProfile): TabletPrinterProfile {
  return {
    id: profile.id.trim(),
    name: profile.name.trim(),
    token: profile.token.trim(),
    deviceId: profile.deviceId.trim().toUpperCase(),
    deviceName: profile.deviceName.trim(),
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
