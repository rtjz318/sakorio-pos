import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  KitchenStation,
  PrintJob,
  PrinterAgent,
} from '../services/api.service';

@Component({
  selector: 'app-printing-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="printing" data-testid="settings-printing-section">
      <header class="hero">
        <div>
          <p class="eyebrow">Kitchen printing</p>
          <h2>Receipt delivery</h2>
          <p class="lede">Connect the restaurant's local print agent, route tickets by station, and monitor every kitchen receipt.</p>
        </div>
        <button type="button" class="button secondary" [disabled]="loading()" (click)="reload()">
          {{ loading() ? 'Refreshing...' : 'Refresh status' }}
        </button>
      </header>

      @if (error()) {
        <div class="notice error" role="alert">{{ error() }}</div>
      }

      <div class="metrics" aria-label="Printing status summary">
        <article>
          <span>Online agents</span>
          <strong>{{ onlineAgents() }}/{{ activeAgents().length }}</strong>
          <small>Seen in the last 90 seconds</small>
        </article>
        <article>
          <span>Waiting</span>
          <strong>{{ pendingJobs() }}</strong>
          <small>Pending or currently printing</small>
        </article>
        <article [class.attention]="failedJobs() > 0">
          <span>Needs attention</span>
          <strong>{{ failedJobs() }}</strong>
          <small>Failed jobs scheduled to retry</small>
        </article>
        <article>
          <span>Printed</span>
          <strong>{{ completedJobs() }}</strong>
          <small>In the recent job window</small>
        </article>
      </div>

      <article class="panel readiness-panel" [class.ready]="printingLaunchReady()" [class.attention]="!printingLaunchReady()">
        <div>
          <p class="eyebrow">Launch readiness</p>
          <h3>{{ printingLaunchReady() ? 'Printing is ready for service' : 'Printing still needs setup' }}</h3>
          <p class="muted">{{ printingReadinessCopy() }}</p>
        </div>
        <ul>
          <li [class.done]="activeAgents().length > 0">Pair at least one active print agent</li>
          <li [class.done]="onlineAgents() > 0">Keep one agent online in the last 90 seconds</li>
          <li [class.done]="failedJobs() === 0">Resolve failed jobs before opening</li>
          <li [class.done]="completedJobs() > 0">Run one dry-run or real receipt test</li>
        </ul>
      </article>

      @if (pairingToken()) {
        <div class="token-panel" role="status">
          <div>
            <p class="eyebrow">One-time pairing token</p>
            <h3>Connect {{ pairedAgentName() }}</h3>
            <p>Copy this token now. For security, it will not be shown again.</p>
          </div>
          <code>{{ pairingToken() }}</code>
          <div class="button-row">
            <button type="button" class="button primary" (click)="copyToken()">
              {{ copied() ? 'Copied' : 'Copy token' }}
            </button>
            <button type="button" class="button secondary" (click)="dismissToken()">I have saved it</button>
          </div>
        </div>
      }

      <div class="workspace">
        <article class="panel setup-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Pair a device</p>
              <h3>Add print agent</h3>
            </div>
            <span class="step">1</span>
          </div>
          <p class="muted">Install the lightweight agent on a Windows PC or mini PC connected to the restaurant Wi-Fi and printer.</p>
          <label>
            <span>Device name</span>
            <input type="text" [(ngModel)]="agentName" maxlength="128" placeholder="Kitchen counter PC" />
          </label>
          <label>
            <span>Receipt route</span>
            <select [(ngModel)]="stationId">
              <option [ngValue]="null">All kitchen and bar stations</option>
              @for (station of stations(); track station.id) {
                <option [ngValue]="station.id">{{ station.name }} · {{ station.display_route }}</option>
              }
            </select>
          </label>
          <button type="button" class="button primary wide" [disabled]="creating() || agentName.trim().length < 2" (click)="createAgent()">
            {{ creating() ? 'Creating...' : 'Create pairing token' }}
          </button>

          <div class="runbook">
            <p class="eyebrow">On the restaurant device</p>
            <ol>
              <li>Download this repository's <code>printer-agent</code> folder.</li>
              <li>Copy <code>.env.example</code> to <code>.env</code> and enter the API URL, token, and printer IP.</li>
              <li>Run <code>python agent.py</code>. The device should appear online here within 30 seconds.</li>
            </ol>
            <p class="tip">No printer yet? Set <code>PRINTER_DRY_RUN=true</code> to produce test receipt files safely.</p>
          </div>
        </article>

        <article class="panel agents-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Local devices</p>
              <h3>Print agents</h3>
            </div>
            <span class="step">2</span>
          </div>
          @if (!loading() && agents().length === 0) {
            <div class="empty">
              <strong>No printer device paired</strong>
              <span>Create the first token to connect the kitchen printer.</span>
            </div>
          } @else {
            <div class="agent-list">
              @for (agent of agents(); track agent.id) {
                <div class="agent" [class.disabled]="!agent.active">
                  <span class="status-dot" [class.online]="isOnline(agent)" aria-hidden="true"></span>
                  <div class="agent-main">
                    <strong>{{ agent.name }}</strong>
                    <span>{{ stationName(agent.kitchen_station_id) }}</span>
                    <small>{{ agentStatus(agent) }}</small>
                  </div>
                  @if (agent.active) {
                    <button type="button" class="text-button danger" (click)="disableAgent(agent)">Disable</button>
                  } @else {
                    <span class="disabled-label">Disabled</span>
                  }
                </div>
              }
            </div>
          }
        </article>
      </div>

      <article class="panel jobs-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Delivery log</p>
            <h3>Recent receipt delivery</h3>
          </div>
          <span class="muted">Latest {{ jobs().length }} jobs</span>
        </div>
        @if (!loading() && jobs().length === 0) {
          <div class="empty horizontal">
            <strong>No receipt jobs yet</strong>
            <span>Submitted orders create preparation tickets; payment creates one customer receipt.</span>
          </div>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Order</th>
                  <th>Station</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                @for (job of jobs(); track job.id) {
                  <tr>
                    <td>{{ receiptLabel(job.job_type) }}</td>
                    <td>#{{ job.order_id }}</td>
                    <td>{{ stationName(job.kitchen_station_id) }}</td>
                    <td>
                      <span class="job-status" [attr.data-status]="job.status">{{ job.status }}</span>
                      @if (job.last_error) { <small class="job-error" [title]="job.last_error">{{ job.last_error }}</small> }
                    </td>
                    <td>{{ job.attempts }}</td>
                    <td>{{ job.created_at | date:'short' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </article>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .printing { color: #1f2933; }
    .hero, .panel-heading, .button-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .hero { margin-bottom: 1.25rem; }
    h2, h3, p { margin: 0; }
    h2 { margin-top: .25rem; font-size: clamp(1.55rem, 3vw, 2.1rem); }
    h3 { margin-top: .2rem; font-size: 1.15rem; }
    .eyebrow { color: #d84d2f; font-size: .72rem; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
    .lede, .muted { color: #6b7280; }
    .lede { max-width: 720px; margin-top: .35rem; line-height: 1.5; }
    .notice { border-radius: 12px; margin-bottom: 1rem; padding: .85rem 1rem; }
    .notice.error { background: #fff1ef; color: #a83220; border: 1px solid #f3c6bd; }
    .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem; margin-bottom: 1rem; }
    .metrics article, .panel, .token-panel { background: #fff; border: 1px solid #e5e1dc; border-radius: 18px; box-shadow: 0 10px 28px rgb(28 35 43 / 5%); }
    .metrics article { padding: 1rem; display: grid; gap: .2rem; }
    .metrics span { color: #626a73; font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
    .metrics strong { font-size: 1.75rem; }
    .metrics small, .agent small { color: #79818a; }
    .metrics .attention { border-color: #e6a14b; background: #fffaf1; }
    .readiness-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 0.9fr);
      gap: 1rem;
      align-items: start;
      margin-bottom: 1rem;
    }
    .readiness-panel.ready {
      border-color: #b9e5d0;
      background: linear-gradient(135deg, #f1fbf6, #fff);
    }
    .readiness-panel.attention {
      border-color: #f0c36b;
      background: linear-gradient(135deg, #fff8e8, #fff);
    }
    .readiness-panel ul {
      display: grid;
      gap: 0.45rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .readiness-panel li {
      position: relative;
      padding-left: 1.55rem;
      color: #6b7280;
      line-height: 1.35;
    }
    .readiness-panel li::before {
      content: '!';
      position: absolute;
      left: 0;
      top: 0.05rem;
      display: grid;
      place-items: center;
      width: 1.05rem;
      height: 1.05rem;
      border-radius: 999px;
      background: #fde8b2;
      color: #8a5a13;
      font-size: 0.72rem;
      font-weight: 900;
    }
    .readiness-panel li.done {
      color: #216e4e;
      font-weight: 700;
    }
    .readiness-panel li.done::before {
      content: '✓';
      background: #dff4eb;
      color: #137a53;
    }
    .token-panel { display: grid; gap: 1rem; margin-bottom: 1rem; padding: 1.1rem; border-color: #e3a38e; background: linear-gradient(135deg, #fff8f4, #fff); }
    .token-panel code { display: block; overflow-wrap: anywhere; padding: .85rem; border-radius: 10px; background: #20262d; color: #fff; }
    .button { min-height: 42px; padding: .65rem 1rem; border-radius: 11px; border: 1px solid transparent; font: inherit; font-weight: 750; cursor: pointer; }
    .button:disabled { cursor: not-allowed; opacity: .55; }
    .button.primary { background: #d85132; color: #fff; }
    .button.secondary { background: #fff; border-color: #d8d4cf; color: #252b31; }
    .button.wide { width: 100%; margin-top: .2rem; }
    .workspace { display: grid; grid-template-columns: minmax(300px, .9fr) minmax(360px, 1.1fr); gap: 1rem; margin-bottom: 1rem; }
    .panel { padding: 1.15rem; }
    .step { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: #edf6f4; color: #14675d; font-weight: 800; }
    .setup-panel > .muted { margin: .7rem 0 1rem; line-height: 1.45; }
    label { display: grid; gap: .38rem; margin-bottom: .8rem; font-weight: 700; }
    input, select { width: 100%; min-height: 44px; padding: .65rem .75rem; border: 1px solid #d9d6d1; border-radius: 10px; background: #fff; font: inherit; box-sizing: border-box; }
    input:focus, select:focus { outline: 3px solid rgb(216 81 50 / 16%); border-color: #d85132; }
    .runbook { margin-top: 1.1rem; padding: 1rem; border-radius: 13px; background: #f7f6f4; }
    .runbook ol { margin: .65rem 0; padding-left: 1.25rem; color: #515861; line-height: 1.55; }
    .runbook code { color: #9d3b27; }
    .tip { color: #4d5a64; font-size: .86rem; }
    .agent-list { display: grid; gap: .65rem; margin-top: 1rem; }
    .agent { display: grid; grid-template-columns: auto 1fr auto; gap: .75rem; align-items: center; padding: .85rem; border: 1px solid #e7e4df; border-radius: 13px; }
    .agent.disabled { opacity: .6; background: #fafafa; }
    .status-dot { width: 11px; height: 11px; border-radius: 50%; background: #aab0b5; box-shadow: 0 0 0 4px #f0f1f2; }
    .status-dot.online { background: #1f9d72; box-shadow: 0 0 0 4px #dff4eb; }
    .agent-main { display: grid; gap: .12rem; }
    .agent-main span { color: #4d5660; font-size: .9rem; }
    .text-button { border: 0; background: transparent; font: inherit; font-weight: 700; cursor: pointer; }
    .text-button.danger { color: #b83d29; }
    .disabled-label { color: #7a8086; font-size: .8rem; font-weight: 700; }
    .empty { display: grid; gap: .25rem; margin-top: 1rem; padding: 1.2rem; border: 1px dashed #d8d5d0; border-radius: 13px; color: #6f767d; }
    .empty strong { color: #32383e; }
    .empty.horizontal { grid-template-columns: auto 1fr; align-items: center; }
    .jobs-panel { margin-bottom: 1rem; }
    .table-wrap { margin-top: 1rem; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 700px; }
    th, td { padding: .75rem; text-align: left; border-bottom: 1px solid #ece9e5; }
    th { color: #69717a; font-size: .72rem; text-transform: uppercase; letter-spacing: .08em; }
    td { font-size: .9rem; }
    .job-status { display: inline-flex; padding: .28rem .5rem; border-radius: 999px; background: #f0f1f2; font-size: .72rem; font-weight: 800; text-transform: capitalize; }
    .job-status[data-status='completed'] { background: #e2f4eb; color: #157352; }
    .job-status[data-status='failed'] { background: #fff0ed; color: #ae3927; }
    .job-status[data-status='pending'], .job-status[data-status='leased'] { background: #fff3d9; color: #94630a; }
    .job-error { display: block; max-width: 260px; margin-top: .25rem; color: #ae3927; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media (max-width: 900px) {
      .metrics { grid-template-columns: repeat(2, 1fr); }
      .readiness-panel { grid-template-columns: 1fr; }
      .workspace { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .hero, .panel-heading { align-items: flex-start; }
      .hero { flex-direction: column; }
      .metrics { grid-template-columns: 1fr; }
      .button-row { align-items: stretch; flex-direction: column; }
      .empty.horizontal { grid-template-columns: 1fr; }
    }
  `],
})
export class PrintingSettingsComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private refreshTimer?: ReturnType<typeof setInterval>;

  loading = signal(true);
  creating = signal(false);
  error = signal('');
  copied = signal(false);
  stations = signal<KitchenStation[]>([]);
  agents = signal<PrinterAgent[]>([]);
  jobs = signal<PrintJob[]>([]);
  pairingToken = signal('');
  pairedAgentName = signal('');
  agentName = '';
  stationId: number | null = null;

  activeAgents = computed(() => this.agents().filter((agent) => agent.active));
  onlineAgents = computed(() => this.activeAgents().filter((agent) => this.isOnline(agent)).length);
  pendingJobs = computed(() => this.jobs().filter((job) => job.status === 'pending' || job.status === 'leased').length);
  failedJobs = computed(() => this.jobs().filter((job) => job.status === 'failed').length);
  completedJobs = computed(() => this.jobs().filter((job) => job.status === 'completed').length);
  printingLaunchReady = computed(() =>
    this.activeAgents().length > 0 &&
    this.onlineAgents() > 0 &&
    this.failedJobs() === 0 &&
    this.completedJobs() > 0
  );

  ngOnInit(): void {
    this.reload();
    this.refreshTimer = setInterval(() => this.reload(true), 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  reload(silent = false): void {
    if (!silent) this.loading.set(true);
    this.error.set('');
    let remaining = 3;
    const done = () => {
      remaining -= 1;
      if (remaining === 0) this.loading.set(false);
    };
    this.api.getKitchenStations().subscribe({
      next: (rows) => { this.stations.set(rows); done(); },
      error: () => { this.error.set('Kitchen stations could not be loaded.'); done(); },
    });
    this.api.getPrinterAgents().subscribe({
      next: (rows) => { this.agents.set(rows); done(); },
      error: () => { this.error.set('Printer agents could not be loaded.'); done(); },
    });
    this.api.getPrintJobs().subscribe({
      next: (rows) => { this.jobs.set(rows); done(); },
      error: () => { this.error.set('Receipt history could not be loaded.'); done(); },
    });
  }

  createAgent(): void {
    const name = this.agentName.trim();
    if (name.length < 2 || this.creating()) return;
    this.creating.set(true);
    this.error.set('');
    this.api.createPrinterAgent({ name, kitchen_station_id: this.stationId }).subscribe({
      next: (agent) => {
        this.pairingToken.set(agent.token);
        this.pairedAgentName.set(agent.name);
        this.agentName = '';
        this.stationId = null;
        this.creating.set(false);
        this.reload(true);
      },
      error: () => {
        this.error.set('The printer agent could not be created. Please try again.');
        this.creating.set(false);
      },
    });
  }

  disableAgent(agent: PrinterAgent): void {
    if (!window.confirm(`Disable ${agent.name}? Its current token will stop working.`)) return;
    this.api.disablePrinterAgent(agent.id).subscribe({
      next: () => this.reload(true),
      error: () => this.error.set('The printer agent could not be disabled.'),
    });
  }

  async copyToken(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.pairingToken());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.error.set('Copy was blocked by the browser. Select the token and copy it manually.');
    }
  }

  dismissToken(): void {
    this.pairingToken.set('');
    this.pairedAgentName.set('');
    this.copied.set(false);
  }

  isOnline(agent: PrinterAgent): boolean {
    if (!agent.active || !agent.last_seen_at) return false;
    return Date.now() - new Date(agent.last_seen_at).getTime() < 90000;
  }

  agentStatus(agent: PrinterAgent): string {
    if (!agent.active) return 'Token disabled';
    if (!agent.last_seen_at) return 'Waiting for first connection';
    if (this.isOnline(agent)) return 'Online now';
    return `Last seen ${new Date(agent.last_seen_at).toLocaleString()}`;
  }

  stationName(stationId: number | null): string {
    if (stationId === null) return 'All stations';
    return this.stations().find((station) => station.id === stationId)?.name ?? `Station ${stationId}`;
  }

  receiptLabel(type: string): string {
    if (type === 'customer_receipt') return 'Customer receipt';
    return type === 'bar_receipt' ? 'Bar ticket' : 'Kitchen ticket';
  }

  printingReadinessCopy(): string {
    if (this.printingLaunchReady()) {
      return 'At least one agent is online, recent receipts have printed, and there are no failed jobs in the current window.';
    }
    if (this.activeAgents().length === 0) {
      return 'Pair the first print agent, then run a dry-run receipt before launch.';
    }
    if (this.onlineAgents() === 0) {
      return 'A print agent exists, but none are online. Start the restaurant printer agent on the local device.';
    }
    if (this.failedJobs() > 0) {
      return 'Resolve or retry failed print jobs before launch.';
    }
    return 'Run one dry-run or real receipt test so the delivery log confirms receipts are flowing.';
  }
}
