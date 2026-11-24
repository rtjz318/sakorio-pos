import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IpadPrinterWorkerService,
  TABLET_PRINTER_PROFILES_STORAGE_KEY,
  TabletPrinterProfile,
} from '../services/ipad-printer-worker.service';
import { NativeSecureStorageService } from '../services/native-secure-storage.service';
import {
  BluetoothEscPosPrinterDevice,
  EscPosPrinterVendor,
  Xp80tPrinterService,
} from '../services/xp80t-printer.service';

@Component({
  selector: 'app-xp80t-native-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="printer-panel" data-testid="multi-printer-native-setup">
      <header>
        <div>
          <p class="eyebrow">Android tablet printing</p>
          <h3>One tablet · multiple Bluetooth printers</h3>
          <p class="muted">
            Each printer profile combines one paired ESC/POS printer with one station-specific
            printer-agent token. Sakorio keeps every profile connected and routes its own jobs only.
          </p>
        </div>
        <span class="status-pill" [class.online]="allProfilesReady()">
          {{ profilesReady() }}/{{ profiles().length }} printers ready
        </span>
      </header>

      @if (message()) {
        <p class="notice" [class.error]="messageType() === 'error'">{{ message() }}</p>
      }

      <div class="actions">
        <button type="button" class="button secondary" [disabled]="busy() || !nativeReady()" (click)="requestBluetooth()">
          Allow Bluetooth
        </button>
        <button type="button" class="button secondary" [disabled]="busy() || !nativeReady()" (click)="scan()">
          {{ busy() ? 'Scanning...' : 'Scan paired printers' }}
        </button>
        <button type="button" class="button secondary" [disabled]="profiles().length === 0" (click)="startAll()">
          Start all printers
        </button>
        <button type="button" class="button secondary" [disabled]="profiles().length === 0" (click)="stopAll()">
          Stop all
        </button>
      </div>

      @if (!nativeReady()) {
        <div class="empty-state">
          <strong>Open this page in the Sakorio Android app</strong>
          <span>Chrome/browser mode cannot access Bluetooth Classic receipt printers.</span>
        </div>
      }

      <section class="profile-grid">
        @for (profile of profiles(); track profile.id) {
          <article class="profile-card" [class.ready]="profileReady(profile.id)">
            <div class="profile-heading">
              <div>
                <p class="eyebrow">{{ profile.name }}</p>
                <h4>{{ profile.deviceName }}</h4>
                <small>{{ profile.deviceId }}</small>
              </div>
              <span class="connection-dot" [class.online]="profileStatus(profile.id).connected"></span>
            </div>
            <dl>
              <div>
                <dt>Bluetooth</dt>
                <dd>{{ profileStatus(profile.id).connected ? 'Connected' : 'Reconnecting' }}</dd>
              </div>
              <div>
                <dt>Worker</dt>
                <dd>{{ profileStatus(profile.id).running ? 'Running' : 'Stopped' }}</dd>
              </div>
              <div>
                <dt>Last job</dt>
                <dd>{{ profileStatus(profile.id).lastPrintedJobId || '-' }}</dd>
              </div>
              <div>
                <dt>Heartbeat</dt>
                <dd>{{ profileStatus(profile.id).lastHeartbeatAt ? (profileStatus(profile.id).lastHeartbeatAt | date:'shortTime') : '-' }}</dd>
              </div>
            </dl>
            @if (profileStatus(profile.id).lastError) {
              <p class="profile-error">{{ profileStatus(profile.id).lastError }}</p>
            }
            <div class="profile-actions">
              <button type="button" class="text-button" (click)="connectProfile(profile)">Reconnect</button>
              <button type="button" class="text-button" (click)="startProfile(profile.id)">Start</button>
              <button type="button" class="text-button" (click)="stopProfile(profile.id)">Stop</button>
              <button type="button" class="text-button danger" (click)="removeProfile(profile)">Remove</button>
            </div>
          </article>
        }
      </section>

      <section class="add-profile">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Add printer profile</p>
            <h4>Connect a station token to a physical printer</h4>
          </div>
          <span class="step">{{ profiles().length + 1 }}</span>
        </div>

        <div class="form-grid">
          <label>
            <span>Profile name</span>
            <input [(ngModel)]="profileName" placeholder="Printer 1 — Ramen" maxlength="80" />
          </label>
          <label>
            <span>Paired Bluetooth printer</span>
            <select [(ngModel)]="selectedDeviceId">
              <option value="">Select printer</option>
              @for (device of devices(); track device.id) {
                <option [value]="device.id">{{ device.name }} · {{ device.id }}</option>
              }
            </select>
          </label>
          <label class="token-field">
            <span>Station-specific printer-agent token</span>
            <input
              type="password"
              autocomplete="off"
              [(ngModel)]="token"
              placeholder="Paste the one-time token from Add print agent"
            />
          </label>
        </div>

        <button
          type="button"
          class="button primary"
          [disabled]="!canAddProfile() || busy()"
          (click)="addProfile()">
          Save and start this printer
        </button>
      </section>

      <p class="footnote">
        Create one Sakorio print agent per physical printer. Assign Printer 1 to the Ramen station.
        Assign Printer 2 to the Other Food &amp; Drinks station and enable customer receipts for Printer 2.
        Tokens and Bluetooth addresses are encrypted by Android Keystore on this tablet.
      </p>
    </article>
  `,
  styles: [`
    :host { display: block; }
    .printer-panel {
      display: grid;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 1.15rem;
      border: 1px solid #dce7f2;
      border-radius: 18px;
      background: linear-gradient(135deg, #f5fbff, #fff);
      box-shadow: 0 10px 28px rgb(28 35 43 / 5%);
    }
    header, .actions, .profile-heading, .profile-actions, .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .8rem;
      flex-wrap: wrap;
    }
    h3, h4, p, dl, dd { margin: 0; }
    h3 { margin-top: .2rem; font-size: 1.2rem; }
    h4 { margin-top: .15rem; }
    .eyebrow {
      color: #0a7b83;
      font-size: .72rem;
      font-weight: 800;
      letter-spacing: .11em;
      text-transform: uppercase;
    }
    .muted, .footnote, small { color: #6b7280; }
    .muted { max-width: 760px; margin-top: .3rem; line-height: 1.45; }
    .status-pill {
      padding: .4rem .75rem;
      border-radius: 999px;
      background: #fff3d9;
      color: #94630a;
      font-size: .78rem;
      font-weight: 850;
    }
    .status-pill.online { background: #dff4eb; color: #157352; }
    .button {
      min-height: 42px;
      padding: .62rem .95rem;
      border: 1px solid transparent;
      border-radius: 11px;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
    .button:disabled { cursor: not-allowed; opacity: .5; }
    .button.primary { background: #d85132; color: #fff; }
    .button.secondary { background: #fff; border-color: #d8d4cf; color: #252b31; }
    .notice, .empty-state {
      padding: .8rem .9rem;
      border-radius: 12px;
      background: #edf6f4;
      color: #14675d;
    }
    .notice.error { background: #fff1ef; color: #a83220; }
    .empty-state { display: grid; gap: .2rem; background: #fff8e8; color: #7d5918; }
    .profile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; }
    .profile-card, .add-profile {
      padding: 1rem;
      border: 1px solid #dfe5e8;
      border-radius: 15px;
      background: #fff;
    }
    .profile-card.ready { border-color: #9bd8c0; box-shadow: 0 0 0 3px rgb(31 157 114 / 8%); }
    .connection-dot { width: 12px; height: 12px; border-radius: 50%; background: #aab0b5; box-shadow: 0 0 0 4px #eef0f1; }
    .connection-dot.online { background: #1f9d72; box-shadow: 0 0 0 4px #dff4eb; }
    dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem; margin-top: .8rem; }
    dl > div { padding: .55rem; border-radius: 10px; background: #f7f8f8; }
    dt { color: #6b7280; font-size: .68rem; font-weight: 800; text-transform: uppercase; }
    dd { margin-top: .12rem; font-weight: 750; }
    .profile-error { margin-top: .65rem; padding: .55rem; border-radius: 9px; background: #fff1ef; color: #a83220; font-size: .82rem; }
    .profile-actions { justify-content: flex-start; margin-top: .75rem; }
    .text-button { border: 0; background: transparent; color: #176b73; font: inherit; font-weight: 750; cursor: pointer; }
    .text-button.danger { color: #b43d28; margin-left: auto; }
    .add-profile { display: grid; gap: .85rem; border-style: dashed; }
    .step { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: #edf6f4; color: #14675d; font-weight: 850; }
    .form-grid { display: grid; grid-template-columns: .75fr 1fr; gap: .75rem; }
    .token-field { grid-column: 1 / -1; }
    label { display: grid; gap: .35rem; font-weight: 750; }
    input, select { min-height: 44px; padding: .65rem .7rem; border: 1px solid #d9d6d1; border-radius: 10px; background: #fff; font: inherit; }
    input:focus, select:focus { outline: 3px solid rgb(10 123 131 / 14%); border-color: #0a7b83; }
    .footnote { font-size: .85rem; line-height: 1.45; }
    @media (max-width: 760px) {
      .profile-grid, .form-grid { grid-template-columns: 1fr; }
      .token-field { grid-column: auto; }
      header, .actions { align-items: stretch; flex-direction: column; }
      .button { width: 100%; }
    }
  `],
})
export class Xp80tNativeSetupComponent implements OnInit {
  private readonly printer = inject(Xp80tPrinterService);
  private readonly worker = inject(IpadPrinterWorkerService);
  private readonly secureStorage = inject(NativeSecureStorageService);

  readonly nativeReady = computed(() => this.printer.isNativeAvailable);
  readonly profiles = signal<TabletPrinterProfile[]>([]);
  readonly devices = signal<BluetoothEscPosPrinterDevice[]>([]);
  readonly profileStatuses = this.worker.profileStatuses;
  readonly busy = signal(false);
  readonly message = signal('');
  readonly messageType = signal<'info' | 'error'>('info');
  readonly profilesReady = computed(
    () => this.profiles().filter((profile) => this.profileReady(profile.id)).length,
  );
  readonly allProfilesReady = computed(
    () => this.profiles().length >= 2 && this.profilesReady() === this.profiles().length,
  );

  profileName = '';
  selectedDeviceId = '';
  token = '';

  async ngOnInit(): Promise<void> {
    this.secureStorage.refreshAvailability();
    await this.loadProfiles();
    if (this.nativeReady()) {
      await this.scan();
      this.worker.startAll();
    }
  }

  async requestBluetooth(): Promise<void> {
    this.busy.set(true);
    try {
      const granted = await this.printer.requestPermissions();
      this.setMessage(
        granted ? 'Bluetooth permission is ready.' : 'Bluetooth permission was not granted.',
        granted ? 'info' : 'error',
      );
    } catch (error) {
      this.setMessage(errorMessage(error), 'error');
    } finally {
      this.busy.set(false);
    }
  }

  async scan(): Promise<void> {
    if (!this.nativeReady()) return;
    this.busy.set(true);
    try {
      const devices = await this.printer.scan();
      this.devices.set(devices);
      this.setMessage(
        devices.length
          ? `Found ${devices.length} paired Bluetooth printer(s).`
          : 'No paired ESC/POS printer found. Pair both printers in Android settings first.',
        devices.length ? 'info' : 'error',
      );
    } catch (error) {
      this.setMessage(errorMessage(error), 'error');
    } finally {
      this.busy.set(false);
    }
  }

  canAddProfile(): boolean {
    return (
      this.profileName.trim().length >= 2 &&
      this.selectedDeviceId.length > 0 &&
      this.token.trim().length >= 12
    );
  }

  async addProfile(): Promise<void> {
    if (!this.canAddProfile()) return;
    if (this.profiles().some((profile) => profile.deviceId === this.selectedDeviceId)) {
      this.setMessage('This physical printer already has a profile.', 'error');
      return;
    }
    const device = this.devices().find((item) => item.id === this.selectedDeviceId);
    if (!device) {
      this.setMessage('Select a paired Bluetooth printer.', 'error');
      return;
    }
    const profile: TabletPrinterProfile = {
      id: createProfileId(),
      name: this.profileName.trim(),
      token: this.token.trim(),
      deviceId: device.id.toUpperCase(),
      deviceName: device.name,
    };
    const next = [...this.profiles(), profile];
    if (!(await this.saveProfiles(next))) return;
    this.worker.configureProfiles(next);
    this.worker.startProfile(profile.id);
    this.profileName = '';
    this.selectedDeviceId = '';
    this.token = '';
    this.setMessage(`${profile.name} saved and started.`);
  }

  async removeProfile(profile: TabletPrinterProfile): Promise<void> {
    this.worker.stopProfile(profile.id);
    await this.printer.disconnect(profile.deviceId);
    const next = this.profiles().filter((item) => item.id !== profile.id);
    await this.saveProfiles(next);
    this.worker.configureProfiles(next);
    this.setMessage(`${profile.name} removed from this tablet.`);
  }

  async connectProfile(profile: TabletPrinterProfile): Promise<void> {
    this.busy.set(true);
    try {
      const status = await this.printer.connect(profile.deviceId);
      this.setMessage(
        status.connected
          ? `${profile.name} connected to ${profile.deviceName}.`
          : `${profile.name} did not connect.`,
        status.connected ? 'info' : 'error',
      );
      await this.worker.runOnce(profile.id);
    } catch (error) {
      this.setMessage(errorMessage(error), 'error');
    } finally {
      this.busy.set(false);
    }
  }

  startProfile(profileId: string): void {
    this.worker.startProfile(profileId);
  }

  stopProfile(profileId: string): void {
    this.worker.stopProfile(profileId);
  }

  startAll(): void {
    this.worker.startAll();
    this.setMessage('All configured printer workers started.');
  }

  stopAll(): void {
    this.worker.stopAll();
    this.setMessage('All printer workers stopped.');
  }

  profileStatus(profileId: string) {
    return (
      this.profileStatuses()[profileId] || {
        running: false,
        configured: true,
        nativePrinterAvailable: this.nativeReady(),
        connected: false,
        lastHeartbeatAt: null,
        lastPrintedJobId: null,
        lastError: null,
      }
    );
  }

  profileReady(profileId: string): boolean {
    const status = this.profileStatus(profileId);
    return status.running && status.connected && Boolean(status.lastHeartbeatAt) && !status.lastError;
  }

  printerVendorLabel(vendor?: EscPosPrinterVendor): string {
    if (vendor === 'epson') return 'Epson ESC/POS';
    if (vendor === 'xprinter') return 'XPrinter ESC/POS';
    return 'Generic ESC/POS';
  }

  private async loadProfiles(): Promise<void> {
    if (!this.secureStorage.isNativeAvailable) return;
    const stored = await this.secureStorage.get(TABLET_PRINTER_PROFILES_STORAGE_KEY);
    if (!stored) return;
    try {
      const profiles = JSON.parse(stored) as TabletPrinterProfile[];
      if (!Array.isArray(profiles)) throw new Error('Invalid printer profile data');
      this.profiles.set(profiles);
      this.worker.configureProfiles(profiles);
      this.setMessage(`${profiles.length} encrypted printer profile(s) loaded.`);
    } catch {
      this.setMessage('Saved printer profiles could not be read. Re-add both printers.', 'error');
    }
  }

  private async saveProfiles(profiles: TabletPrinterProfile[]): Promise<boolean> {
    if (!this.secureStorage.isNativeAvailable) {
      this.setMessage('Android secure storage is required for printer tokens.', 'error');
      return false;
    }
    const saved = await this.secureStorage.set(
      TABLET_PRINTER_PROFILES_STORAGE_KEY,
      JSON.stringify(profiles),
    );
    if (!saved) {
      this.setMessage(this.secureStorage.lastError() || 'Printer profiles could not be saved.', 'error');
      return false;
    }
    this.profiles.set(profiles);
    return true;
  }

  private setMessage(message: string, type: 'info' | 'error' = 'info'): void {
    this.message.set(message);
    this.messageType.set(type);
  }
}

function createProfileId(): string {
  return globalThis.crypto?.randomUUID?.() || `printer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Bluetooth printer action failed.';
}
