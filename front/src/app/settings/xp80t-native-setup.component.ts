import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IpadPrinterWorkerService } from '../services/ipad-printer-worker.service';
import {
  Xp80tPrinterDevice,
  Xp80tPrinterService,
} from '../services/xp80t-printer.service';

@Component({
  selector: 'app-xp80t-native-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="xp80t-panel" data-testid="xp80t-native-setup">
      <header>
        <div>
          <p class="eyebrow">XP-80T iPad app</p>
          <h3>Native Bluetooth printer setup</h3>
          <p class="muted">
            Use this when Sakorio is running as the iPad app. Browser mode stays safe and will show this as unavailable.
          </p>
        </div>
        <span class="status-pill" [class.online]="nativeReady()" [class.warning]="!nativeReady()">
          {{ nativeReady() ? 'Native plugin ready' : 'App plugin not detected' }}
        </span>
      </header>

      <div class="status-grid">
        <div>
          <span>Bluetooth printer</span>
          <strong>{{ printerStatus().connected ? 'Connected' : 'Not connected' }}</strong>
          <small>{{ printerStatus().deviceName || printerStatus().error || 'Waiting for XP-80T pairing' }}</small>
        </div>
        <div>
          <span>Print worker</span>
          <strong>{{ workerStatus().running ? 'Running' : 'Stopped' }}</strong>
          <small>{{ workerStatus().lastError || workerStatusCopy() }}</small>
        </div>
        <div>
          <span>Last printed job</span>
          <strong>{{ workerStatus().lastPrintedJobId || '-' }}</strong>
          <small>{{ workerStatus().lastHeartbeatAt ? 'Heartbeat ' + (workerStatus().lastHeartbeatAt | date:'shortTime') : 'No heartbeat yet' }}</small>
        </div>
      </div>

      @if (message()) {
        <p class="notice" [class.error]="messageType() === 'error'">{{ message() }}</p>
      }

      <div class="actions">
        <button type="button" class="button secondary" (click)="refreshStatus()">Check app plugin</button>
        <button type="button" class="button secondary" [disabled]="busy() || !nativeReady()" (click)="requestBluetooth()">
          Allow Bluetooth
        </button>
        <button type="button" class="button secondary" [disabled]="busy() || !nativeReady()" (click)="scan()">
          {{ busy() ? 'Scanning...' : 'Scan XP-80T' }}
        </button>
      </div>

      @if (devices().length > 0) {
        <div class="device-list">
          @for (device of devices(); track device.id) {
            <button type="button" class="device" [disabled]="busy()" (click)="connect(device)">
              <strong>{{ device.name }}</strong>
              <small>{{ device.id }}</small>
            </button>
          }
        </div>
      }

      <label>
        <span>Printer-agent pairing token</span>
        <input
          type="password"
          autocomplete="off"
          [(ngModel)]="token"
          placeholder="Paste the one-time token created above"
        />
      </label>

      <div class="actions">
        <button type="button" class="button primary" [disabled]="token.trim().length < 12" (click)="configureWorker()">
          Configure worker
        </button>
        <button type="button" class="button secondary" [disabled]="!workerStatus().configured" (click)="startWorker()">
          Start worker
        </button>
        <button type="button" class="button secondary" [disabled]="!workerStatus().running" (click)="stopWorker()">
          Stop worker
        </button>
      </div>

      <p class="footnote">
        Security note: the production iPad app should store this token in iOS Keychain once the native shell is built.
        This browser-safe scaffold does not persist the token.
      </p>
    </article>
  `,
  styles: [`
    .xp80t-panel {
      display: grid;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 1.15rem;
      border: 1px solid #dce7f2;
      border-radius: 18px;
      background: linear-gradient(135deg, #f5fbff, #fff);
      box-shadow: 0 10px 28px rgb(28 35 43 / 5%);
    }
    header, .actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .8rem;
      flex-wrap: wrap;
    }
    h3, p { margin: 0; }
    h3 { margin-top: .2rem; font-size: 1.15rem; }
    .eyebrow {
      color: #0a7b83;
      font-size: .72rem;
      font-weight: 800;
      letter-spacing: .13em;
      text-transform: uppercase;
    }
    .muted, .footnote, small { color: #6b7280; }
    .status-pill {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: .35rem .7rem;
      border-radius: 999px;
      background: #fff3d9;
      color: #94630a;
      font-size: .78rem;
      font-weight: 850;
    }
    .status-pill.online { background: #dff4eb; color: #157352; }
    .status-pill.warning { background: #fff3d9; color: #94630a; }
    .status-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: .75rem;
    }
    .status-grid > div {
      display: grid;
      gap: .18rem;
      padding: .85rem;
      border: 1px solid #e5eef5;
      border-radius: 13px;
      background: rgb(255 255 255 / 72%);
    }
    .status-grid span {
      color: #58626e;
      font-size: .72rem;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .status-grid strong { font-size: 1.05rem; }
    .notice {
      padding: .75rem .85rem;
      border-radius: 11px;
      background: #edf6f4;
      color: #14675d;
    }
    .notice.error {
      background: #fff1ef;
      color: #a83220;
    }
    .button {
      min-height: 40px;
      padding: .58rem .9rem;
      border-radius: 11px;
      border: 1px solid transparent;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
    .button:disabled {
      cursor: not-allowed;
      opacity: .55;
    }
    .button.primary { background: #d85132; color: #fff; }
    .button.secondary { background: #fff; border-color: #d8d4cf; color: #252b31; }
    .device-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: .65rem;
    }
    .device {
      display: grid;
      gap: .15rem;
      padding: .8rem;
      border: 1px solid #d8e5ef;
      border-radius: 13px;
      background: #fff;
      text-align: left;
      cursor: pointer;
    }
    label {
      display: grid;
      gap: .38rem;
      font-weight: 800;
    }
    input {
      width: 100%;
      min-height: 44px;
      box-sizing: border-box;
      padding: .65rem .75rem;
      border: 1px solid #d9d6d1;
      border-radius: 10px;
      background: #fff;
      font: inherit;
    }
    input:focus {
      outline: 3px solid rgb(10 123 131 / 16%);
      border-color: #0a7b83;
    }
    .footnote { font-size: .86rem; line-height: 1.45; }
    @media (max-width: 760px) {
      .status-grid { grid-template-columns: 1fr; }
      header, .actions { align-items: stretch; flex-direction: column; }
      .button { width: 100%; }
    }
  `],
})
export class Xp80tNativeSetupComponent implements OnInit {
  private readonly printer = inject(Xp80tPrinterService);
  private readonly worker = inject(IpadPrinterWorkerService);

  readonly printerStatus = this.printer.status;
  readonly workerStatus = this.worker.status;
  readonly nativeReady = computed(() => this.printer.isNativeAvailable);
  readonly devices = signal<Xp80tPrinterDevice[]>([]);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly messageType = signal<'info' | 'error'>('info');
  token = '';

  ngOnInit(): void {
    void this.refreshStatus();
  }

  async refreshStatus(): Promise<void> {
    const status = await this.printer.refreshStatus();
    if (status.available) {
      this.setMessage('XP-80T native plugin detected. Continue with Bluetooth permission and scan.');
    } else {
      this.setMessage(status.error || 'Native XP-80T plugin is not available in browser mode.', 'error');
    }
  }

  async requestBluetooth(): Promise<void> {
    this.busy.set(true);
    try {
      const granted = await this.printer.requestPermissions();
      this.setMessage(granted ? 'Bluetooth permission is ready.' : 'Bluetooth permission is not granted.', granted ? 'info' : 'error');
    } catch (error) {
      this.setMessage(errorMessage(error), 'error');
    } finally {
      this.busy.set(false);
    }
  }

  async scan(): Promise<void> {
    this.busy.set(true);
    try {
      const devices = await this.printer.scan();
      this.devices.set(devices);
      this.setMessage(devices.length ? `Found ${devices.length} Bluetooth printer device(s).` : 'No XP-80T printer found. Keep the printer on and nearby.');
    } catch (error) {
      this.setMessage(errorMessage(error), 'error');
    } finally {
      this.busy.set(false);
    }
  }

  async connect(device: Xp80tPrinterDevice): Promise<void> {
    this.busy.set(true);
    try {
      const status = await this.printer.connect(device.id);
      this.setMessage(status.connected ? `Connected to ${status.deviceName || device.name}.` : 'Printer connection did not complete.', status.connected ? 'info' : 'error');
    } catch (error) {
      this.setMessage(errorMessage(error), 'error');
    } finally {
      this.busy.set(false);
    }
  }

  configureWorker(): void {
    this.worker.configure(this.token);
    this.setMessage('Printer worker configured for this session. Start worker when XP-80T is connected.');
  }

  startWorker(): void {
    this.worker.start();
    const status = this.workerStatus();
    this.setMessage(status.lastError || 'iPad printer worker started.', status.lastError ? 'error' : 'info');
  }

  stopWorker(): void {
    this.worker.stop();
    this.setMessage('iPad printer worker stopped.');
  }

  workerStatusCopy(): string {
    const status = this.workerStatus();
    if (!status.configured) return 'Paste a printer-agent token to configure.';
    if (!status.nativePrinterAvailable) return 'Native XP-80T plugin is required.';
    return status.lastHeartbeatAt ? 'Ready for print jobs' : 'Configured, no heartbeat yet';
  }

  private setMessage(message: string, type: 'info' | 'error' = 'info'): void {
    this.message.set(message);
    this.messageType.set(type);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'XP-80T setup action failed.';
}
