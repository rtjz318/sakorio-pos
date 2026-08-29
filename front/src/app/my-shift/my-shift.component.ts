import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EMPTY, forkJoin, from, Observable, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { Html5Qrcode } from 'html5-qrcode';
import { SidebarComponent } from '../shared/sidebar.component';
import {
  ApiService,
  AttendanceSummary,
  ClockQrStatus,
  Shift,
  StaffProfile,
  User,
  WorkSession,
  WorkSessionClockPayload,
  workSessionNetWorkSeconds,
} from '../services/api.service';

const QR_READER_ID = 'attendance-venue-qr-reader';

@Component({
  selector: 'app-my-shift',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <app-sidebar>
      <main class="attendance-shell">
        <header class="page-heading">
          <div>
            <p class="eyebrow">Attendance</p>
            <h1>My shift</h1>
            <p class="lede">Choose a staff profile, select the scheduled shift, take a live photo, and clock in.</p>
          </div>
          <div class="connection-pill" [class.ready]="!loading()">
            <span></span>{{ loading() ? 'Syncing' : 'Live' }}
          </div>
        </header>

        @if (error()) {
          <div class="alert" role="alert">{{ error() }}</div>
        }

        @if (staffProfiles().length > 1) {
          <section class="panel profile-switcher-panel" aria-label="Staff profile selector">
            <div>
              <p class="eyebrow">Staff profile</p>
              <h2>Who is clocking in?</h2>
              <p class="status-copy">Pick the staff member first, then choose their scheduled shift below.</p>
            </div>
            <label class="profile-select">
              Profile
              <select [ngModel]="selectedUserId()" (ngModelChange)="onSelectedProfileChange($event)" [disabled]="loading() || actionLoading()">
                @for (staff of staffProfiles(); track staff.id) {
                  <option [ngValue]="staff.id">{{ staff.full_name || staff.email }} — {{ formatRole(staff.role) }}</option>
                }
              </select>
            </label>
          </section>
        }

        <section class="overview-grid">
          <article class="panel profile-panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Employee profile</p>
                <h2>{{ profile()?.full_name || 'Complete your profile' }}</h2>
              </div>
              @if (isSelfProfile()) {
                <button class="text-btn" type="button" (click)="editingProfile.set(!editingProfile())">
                  {{ editingProfile() ? 'Cancel' : 'Edit' }}
                </button>
              } @else {
                <span class="managed-profile-pill">Selected profile</span>
              }
            </div>
            @if (editingProfile()) {
              <form class="profile-form" (ngSubmit)="saveProfile()">
                <label>
                  Full name
                  <input name="profileName" [(ngModel)]="profileName" required minlength="2" />
                </label>
                <label>
                  Job title
                  <input name="profileJob" [(ngModel)]="profileJob" placeholder="Server, cashier, kitchen" />
                </label>
                <label>
                  Phone
                  <input name="profilePhone" [(ngModel)]="profilePhone" inputmode="tel" />
                </label>
                <button class="primary-btn" type="submit" [disabled]="profileSaving()">
                  {{ profileSaving() ? 'Saving...' : 'Save profile' }}
                </button>
              </form>
            } @else {
              <dl class="profile-details">
                <div><dt>Role</dt><dd>{{ profile()?.job_title || formatRole(profile()?.role) }}</dd></div>
                @if (isPayrollEmployee()) {
                  <div><dt>Employee ID</dt><dd>{{ profile()?.employee_number || 'Not assigned' }}</dd></div>
                } @else {
                  <div><dt>Account</dt><dd>Administrative</dd></div>
                }
                <div><dt>Contact</dt><dd>{{ profile()?.phone || profile()?.email || '-' }}</dd></div>
                <div><dt>Attendance</dt><dd>Shift eligible</dd></div>
              </dl>
            }
          </article>

          <article class="panel status-panel" [class.on-shift]="!!open()">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Current status</p>
                <h2>{{ open() ? (open()?.on_break ? 'On break' : 'Clocked in') : 'Off shift' }}</h2>
              </div>
              <span class="status-badge">{{ open() ? 'Active' : 'Ready' }}</span>
            </div>
            @if (open(); as session) {
              <div class="active-time">{{ elapsedLabel() }}</div>
              <p class="status-copy">
                {{ session.shift_label || 'Scheduled shift' }} | {{ formatDt(session.started_at) }}
              </p>
              <div class="action-row">
                @if (isSelfProfile()) {
                  @if (session.on_break) {
                    <button class="secondary-btn" type="button" (click)="endBreak()" [disabled]="actionLoading()">End break</button>
                  } @else {
                    <button class="secondary-btn" type="button" (click)="startBreak()" [disabled]="actionLoading()">Start break</button>
                  }
                }
                <button class="danger-btn" type="button" (click)="requestCamera('clock_out')" [disabled]="actionLoading()">
                  Clock out
                </button>
              </div>
            } @else {
              @if (selectedShift(); as shift) {
                <div class="selected-shift-context">
                  <span>{{ weekday(shift.date) }} {{ dayNumber(shift.date) }}</span>
                  <strong>{{ shortTime(shift.start_time) }} - {{ shortTime(shift.end_time) }}</strong>
                  <span class="shift-window-state">{{ shiftStateLabel(shift) }}</span>
                </div>
              } @else {
                <p class="status-copy">No shift is currently open for attendance.</p>
              }
              <button
                class="primary-btn wide"
                type="button"
                (click)="requestCamera('clock_in')"
                [disabled]="actionLoading() || !selectedShift() || !canClockShift(selectedShift()!)"
              >
                {{ selectedShift() && canClockShift(selectedShift()!) ? 'Take photo and clock in' : 'No shift available to clock in' }}
              </button>
            }
          </article>
        </section>

        <section class="panel timetable-panel">
          <div class="panel-head timetable-head">
            <div>
              <p class="eyebrow">My timetable</p>
              <h2>Scheduled shifts</h2>
            </div>
            <div class="summary-chips">
              <span>{{ upcomingShifts().length }} upcoming</span>
              <span>{{ formatMinutes(summary()?.worked_minutes || 0) }} this month</span>
            </div>
          </div>
          @if (shifts().length === 0) {
            <div class="empty-state">
              <strong>No shifts scheduled</strong>
              <span>Ask a manager to add your shift to the Timetable.</span>
            </div>
          } @else {
            <div class="shift-list">
              @for (shift of shifts(); track shift.id) {
                <button
                  type="button"
                  class="shift-card"
                  [class.selected]="selectedShiftId() === shift.id"
                  [class.today]="isToday(shift.date)"
                  [class.completed]="shiftRecorded(shift.id)"
                  [class.available]="canClockShift(shift)"
                  [class.expired]="shiftWindowClosed(shift)"
                  [disabled]="!!open() || shiftRecorded(shift.id) || !canClockShift(shift)"
                  (click)="selectShift(shift)"
                >
                  <span class="shift-date">
                    <small>{{ weekday(shift.date) }}</small>
                    <strong>{{ dayNumber(shift.date) }}</strong>
                  </span>
                  <span class="shift-main">
                    <strong>{{ shortTime(shift.start_time) }} - {{ shortTime(shift.end_time) }}</strong>
                    <small>{{ shift.label || 'Scheduled shift' }}</small>
                  </span>
                  <span class="shift-state">
                    {{ selectedShiftId() === shift.id && canClockShift(shift) ? 'Selected' : shiftStateLabel(shift) }}
                  </span>
                </button>
              }
            </div>
          }
        </section>

        <section class="metrics-grid">
          <article class="metric-card"><span>Hours this month</span><strong>{{ formatMinutes(summary()?.worked_minutes || 0) }}</strong></article>
          <article class="metric-card"><span>Completed shifts</span><strong>{{ summary()?.completed_sessions || 0 }}</strong></article>
          <article class="metric-card">
            <span>Missing proofs</span>
            <strong>{{ (summary()?.missing_clock_in_photos || 0) + (summary()?.missing_clock_out_photos || 0) }}</strong>
          </article>
          <article class="metric-card"><span>Open sessions</span><strong>{{ summary()?.open_sessions || 0 }}</strong></article>
        </section>

        <section class="panel history-panel">
          <div class="panel-head">
            <div><p class="eyebrow">Recent attendance</p><h2>Clock history</h2></div>
          </div>
          @if (history().length === 0) {
            <div class="empty-state"><strong>No attendance yet</strong><span>Your completed shifts will appear here.</span></div>
          } @else {
            <div class="history-list">
              @for (row of history(); track row.id) {
                <article class="history-row">
                  <div><strong>{{ row.shift_label || 'Scheduled shift' }}</strong><span>{{ row.shift_date || dateOnly(row.started_at) }}</span></div>
                  <div><small>In</small><strong>{{ timeOnly(row.started_at) }}</strong></div>
                  <div><small>Out</small><strong>{{ row.ended_at ? timeOnly(row.ended_at) : 'Active' }}</strong></div>
                  <div><small>Worked</small><strong>{{ formatMinutes(row.duration_minutes ?? row.open_duration_minutes ?? 0) }}</strong></div>
                  <div class="proofs" title="Camera proof status">
                    <span [class.ok]="row.clock_in_photo_present">{{ row.clock_in_photo_present ? 'In photo' : 'Missing in photo' }}</span>
                    <span [class.ok]="row.clock_out_photo_present">{{ row.clock_out_photo_present ? 'Out photo' : 'Missing out photo' }}</span>
                  </div>
                </article>
              }
            </div>
          }
        </section>
      </main>

      @if (cameraOpen()) {
        <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Attendance camera">
          <div class="camera-modal">
            <div class="modal-head">
              <div><p class="eyebrow">Live proof</p><h2>{{ pendingAction() === 'clock_in' ? 'Clock-in photo' : 'Clock-out photo' }}</h2></div>
              <button class="close-btn" type="button" (click)="closeCamera()" aria-label="Close">&times;</button>
            </div>
            <p>Position your face in the frame. Gallery uploads are not accepted.</p>
            <div class="camera-frame">
              <video #cameraVideo autoplay playsinline muted></video>
              <div class="face-guide"></div>
            </div>
            <canvas #cameraCanvas hidden></canvas>
            <div class="camera-actions">
              @if (cameraError()) { <div class="alert">{{ cameraError() }}</div> }
              <button class="primary-btn wide" type="button" (click)="captureAndClock()" [disabled]="!cameraReady() || actionLoading()">
                {{ actionLoading() ? 'Recording...' : (cameraReady() ? 'Capture and confirm' : 'Starting camera...') }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (scanOpen()) {
        <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Venue QR scanner">
          <div class="camera-modal">
            <div class="modal-head"><div><p class="eyebrow">Venue check</p><h2>Scan attendance QR</h2></div><button class="close-btn" type="button" (click)="closeQrScanner()">&times;</button></div>
            <div [id]="qrReaderId" class="qr-reader"></div>
            @if (scanError()) { <div class="alert">{{ scanError() }}</div> }
          </div>
        </div>
      }
    </app-sidebar>
  `,
  styles: `
    :host { display: block; }
    .attendance-shell { --ink:#17211f; --muted:#68736f; --line:#dce5e1; --teal:#0f746d; --orange:#db5836; max-width:1440px; margin:0 auto; padding:28px 30px 60px; color:var(--ink); }
    .page-heading,.panel-head,.action-row,.modal-head { display:flex; align-items:center; justify-content:space-between; gap:18px; }
    h1,h2,p { margin:0; } h1 { font-size:clamp(2rem,4vw,3.6rem); letter-spacing:-.055em; line-height:.96; } h2 { font-size:1.35rem; letter-spacing:-.025em; }
    .eyebrow { margin-bottom:7px; color:#a53b24; font-size:.73rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase; }
    .lede,.status-copy { margin-top:10px; color:var(--muted); font-size:.98rem; }
    .connection-pill,.status-badge,.summary-chips span,.shift-state,.proofs span { border-radius:999px; background:#edf1ef; padding:8px 12px; font-size:.75rem; font-weight:800; }
    .connection-pill span { display:inline-block; width:7px; height:7px; margin-right:7px; border-radius:50%; background:#d39a21; } .connection-pill.ready span { background:#27a171; }
    .alert { margin:18px 0; padding:13px 16px; border:1px solid #efb3a3; border-radius:14px; background:#fff0ec; color:#a43d28; font-weight:700; }
    .profile-switcher-panel { display:grid; grid-template-columns:minmax(0,1fr) minmax(280px,420px); align-items:end; gap:18px; margin-top:24px; }
    .profile-select { display:block; }
    .profile-select select { width:100%; box-sizing:border-box; margin-top:7px; padding:12px; border:1px solid var(--line); border-radius:12px; background:#fff; color:var(--ink); font:inherit; }
    .managed-profile-pill { border-radius:999px; background:#edf1ef; padding:8px 12px; color:var(--muted); font-size:.75rem; font-weight:800; }
    .overview-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(380px,.8fr); gap:18px; margin-top:24px; }
    .panel,.metric-card { border:1px solid var(--line); border-radius:22px; background:#fff; box-shadow:0 16px 42px rgba(27,45,41,.06); }
    .panel { padding:22px; } .text-btn,.close-btn { border:0; background:transparent; color:var(--teal); font-weight:800; cursor:pointer; }
    .profile-details { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin:20px 0 0; }
    .profile-details div { padding:12px 14px; border-radius:14px; background:#f5f8f7; } dt { color:var(--muted); font-size:.72rem; font-weight:800; text-transform:uppercase; } dd { margin:5px 0 0; font-weight:750; }
    .profile-form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:18px; } .profile-form label:first-child { grid-column:1/-1; }
    label { color:#48534f; font-size:.76rem; font-weight:800; text-transform:uppercase; } input { width:100%; box-sizing:border-box; margin-top:7px; padding:12px; border:1px solid var(--line); border-radius:12px; font:inherit; }
    button { font:inherit; } .primary-btn,.secondary-btn,.danger-btn { min-height:44px; padding:0 18px; border-radius:13px; font-weight:800; cursor:pointer; }
    .primary-btn { border:1px solid var(--orange); background:var(--orange); color:#fff; } .secondary-btn { border:1px solid var(--line); background:#fff; color:var(--ink); } .danger-btn { border:1px solid #b54132; background:#fff1ed; color:#a23829; } .wide { width:100%; margin-top:20px; }
    button:disabled { cursor:not-allowed; opacity:.48; }
    .status-panel { background:linear-gradient(145deg,#fff 20%,#f6faf8); } .status-panel.on-shift { border-color:#9fcfc7; background:linear-gradient(145deg,#effaf7,#fff); }
    .active-time { margin-top:22px; font-size:clamp(2.4rem,5vw,4rem); font-weight:850; letter-spacing:-.06em; } .action-row { justify-content:flex-start; margin-top:20px; }
    .selected-shift-context { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:10px; margin-top:18px; padding:14px 16px; border:1px solid #cfe2dd; border-radius:15px; background:#f2f8f6; }
    .selected-shift-context > span:first-child { color:var(--muted); font-size:.82rem; font-weight:800; text-transform:uppercase; }
    .shift-window-state { justify-self:end; border-radius:999px; padding:6px 10px; background:#dff1eb; color:#176f55; font-size:.72rem; font-weight:850; }
    .timetable-panel { margin-top:18px; } .timetable-head { align-items:flex-start; } .summary-chips { display:flex; gap:8px; flex-wrap:wrap; }
    .shift-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(265px,1fr)); gap:11px; margin-top:20px; }
    .shift-card { display:grid; grid-template-columns:54px minmax(0,1fr) auto; align-items:center; gap:12px; min-height:84px; padding:12px; border:1px solid var(--line); border-radius:16px; background:#fff; color:var(--ink); text-align:left; cursor:pointer; }
    .shift-card:not(:disabled):hover { border-color:#8dbdb7; transform:translateY(-1px); } .shift-card.selected { border:2px solid var(--teal); background:#eef9f7; } .shift-card.today:not(.selected) { border-color:#e9b5a6; } .shift-card.available:not(.selected) { border-color:#9bcac2; background:#f5fbf9; } .shift-card.completed,.shift-card.expired { opacity:.58; } .shift-card.expired { background:#f7f8f7; }
    .shift-date { display:flex; flex-direction:column; align-items:center; border-right:1px solid var(--line); } .shift-date small,.shift-main small { color:var(--muted); } .shift-date strong { margin-top:3px; font-size:1.5rem; } .shift-main { display:flex; flex-direction:column; gap:4px; }
    .metrics-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin:18px 0; } .metric-card { padding:18px; } .metric-card span { color:var(--muted); font-size:.78rem; font-weight:750; } .metric-card strong { display:block; margin-top:8px; font-size:1.8rem; letter-spacing:-.04em; }
    .empty-state { display:flex; flex-direction:column; align-items:center; gap:6px; margin-top:18px; padding:35px; border:1px dashed #cfdad6; border-radius:16px; color:var(--muted); text-align:center; }
    .history-list { margin-top:15px; } .history-row { display:grid; grid-template-columns:minmax(180px,1.5fr) repeat(3,minmax(90px,.7fr)) auto; align-items:center; gap:14px; padding:13px 3px; border-top:1px solid #e8eeeb; }
    .history-row > div { display:flex; flex-direction:column; gap:3px; } .history-row span,.history-row small { color:var(--muted); } .proofs { flex-direction:row!important; } .proofs span { color:#9b4a38; background:#fff0ec; } .proofs span.ok { color:#176f55; background:#e7f5ee; }
    .modal-backdrop { --ink:#17211f; --muted:#68736f; --line:#dce5e1; --teal:#0f746d; --orange:#db5836; position:fixed; z-index:1200; inset:0; display:grid; place-items:center; overflow-y:auto; padding:18px; background:rgba(11,24,22,.72); backdrop-filter:blur(7px); }
    .camera-modal { display:flex; flex-direction:column; width:min(520px,100%); max-height:calc(100dvh - 36px); overflow:hidden; padding:22px; box-sizing:border-box; border-radius:24px; background:#fff; box-shadow:0 30px 90px rgba(0,0,0,.28); } .camera-modal > p { flex:0 0 auto; margin:8px 0 14px; color:var(--muted); }
    .close-btn { color:var(--ink); font-size:2rem; line-height:1; } .camera-frame { position:relative; flex:0 1 auto; overflow:hidden; width:100%; max-height:min(52dvh,420px); aspect-ratio:4/3; border-radius:18px; background:#14201e; } .camera-frame video { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); }
    .camera-actions { flex:0 0 auto; padding-top:14px; background:#fff; } .camera-actions .alert { margin:0 0 10px; } .camera-actions .wide { margin-top:0; }
    .face-guide { position:absolute; top:12%; left:27%; width:46%; height:69%; border:2px solid rgba(255,255,255,.72); border-radius:48%; box-shadow:0 0 0 999px rgba(0,0,0,.13); }
    .qr-reader { min-height:300px; margin-top:18px; overflow:hidden; border-radius:18px; }
    @media (max-width:900px) { .profile-switcher-panel,.overview-grid { grid-template-columns:1fr; } .metrics-grid { grid-template-columns:repeat(2,1fr); } .history-row { grid-template-columns:1.4fr 1fr 1fr; } .history-row > div:nth-child(4),.proofs { display:none; } }
    @media (max-width:600px) { .attendance-shell { padding:20px 14px 44px; } .page-heading,.panel-head.timetable-head { align-items:flex-start; flex-direction:column; } .profile-form,.profile-details { grid-template-columns:1fr; } .profile-form label:first-child { grid-column:auto; } .metrics-grid { grid-template-columns:1fr 1fr; } .shift-list { grid-template-columns:1fr; } .shift-state { display:none; } .selected-shift-context { grid-template-columns:auto 1fr; } .shift-window-state { grid-column:1/-1; justify-self:start; } .history-row { grid-template-columns:1.5fr 1fr 1fr; font-size:.83rem; } .modal-backdrop { padding:10px; } .camera-modal { max-height:calc(100dvh - 20px); padding:16px; border-radius:18px; } .camera-modal > p { margin-bottom:10px; font-size:.88rem; } .camera-frame { max-height:42dvh; } .camera-actions { padding-top:10px; } }
  `,
})
export class MyShiftComponent implements OnInit, OnDestroy {
  @ViewChild('cameraVideo') cameraVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('cameraCanvas') cameraCanvas?: ElementRef<HTMLCanvasElement>;

  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private stream: MediaStream | null = null;
  private qrReader: Html5Qrcode | null = null;
  private elapsedTimer: ReturnType<typeof setInterval> | null = null;

  readonly qrReaderId = QR_READER_ID;
  loading = signal(true);
  actionLoading = signal(false);
  profileSaving = signal(false);
  error = signal<string | null>(null);
  staffProfiles = signal<User[]>([]);
  selectedUserId = signal<number | null>(null);
  profile = signal<StaffProfile | null>(null);
  shifts = signal<Shift[]>([]);
  history = signal<WorkSession[]>([]);
  open = signal<WorkSession | null>(null);
  summary = signal<AttendanceSummary | null>(null);
  clockStatus = signal<ClockQrStatus | null>(null);
  selectedShiftId = signal<number | null>(null);
  editingProfile = signal(false);
  cameraOpen = signal(false);
  cameraReady = signal(false);
  cameraError = signal<string | null>(null);
  pendingAction = signal<'clock_in' | 'clock_out'>('clock_in');
  scanOpen = signal(false);
  scanError = signal<string | null>(null);
  clockQrToken = signal<string | null>(null);
  tick = signal(0);
  private preferredShiftId: number | null = null;
  profileName = '';
  profilePhone = '';
  profileJob = '';

  selectedStaffProfile = computed(() => {
    const id = this.selectedUserId();
    return this.staffProfiles().find((staff) => staff.id === id) || null;
  });
  isSelfProfile = computed(() => this.isSelfUserId(this.selectedUserId()));
  selectedShift = computed(() => this.shifts().find((shift) => shift.id === this.selectedShiftId()) || null);
  upcomingShifts = computed(() => {
    this.tick();
    return this.shifts().filter((shift) => !this.shiftRecorded(shift.id) && !this.shiftWindowClosed(shift));
  });
  elapsedLabel = computed(() => { this.tick(); return this.formatMinutes(Math.floor(workSessionNetWorkSeconds(this.open()) / 60)); });

  ngOnInit(): void {
    const token = (this.route.snapshot.queryParamMap.get('clock_qr') || '').trim();
    if (token) this.clockQrToken.set(token);
    const requestedUserId = Number(
      this.route.snapshot.queryParamMap.get('staffId') ||
        this.route.snapshot.queryParamMap.get('userId') ||
        0,
    );
    const requestedShiftId = Number(this.route.snapshot.queryParamMap.get('shiftId') || 0);
    this.preferredShiftId = Number.isFinite(requestedShiftId) && requestedShiftId > 0 ? requestedShiftId : null;
    this.loadStaffProfiles(Number.isFinite(requestedUserId) && requestedUserId > 0 ? requestedUserId : null);
    this.elapsedTimer = setInterval(() => this.tick.update((value) => value + 1), 1000);
  }

  ngOnDestroy(): void {
    if (this.elapsedTimer) clearInterval(this.elapsedTimer);
    this.stopCamera();
    void this.stopQrReader();
  }

  private dateRange(): { historyFrom: string; shiftFrom: string; shiftTo: string; monthFrom: string; monthTo: string } {
    const today = new Date();
    const history = new Date(today); history.setDate(today.getDate() - 30);
    const shiftFrom = new Date(today); shiftFrom.setDate(today.getDate() - 3);
    const shiftTo = new Date(today); shiftTo.setDate(today.getDate() + 21);
    const monthFrom = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthTo = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      historyFrom: this.isoDate(history), shiftFrom: this.isoDate(shiftFrom), shiftTo: this.isoDate(shiftTo),
      monthFrom: this.isoDate(monthFrom), monthTo: this.isoDate(monthTo),
    };
  }

  private isoDate(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  private loadStaffProfiles(requestedUserId: number | null = null): void {
    this.api.getUsersForSchedule().pipe(catchError(() => of([] as User[]))).subscribe((users) => {
      const staff = users.filter((user) => user.id != null);
      this.staffProfiles.set(staff);
      const currentId = this.currentUserId();
      const requestedExists = requestedUserId != null && staff.some((user) => user.id === requestedUserId);
      const nextId = requestedExists ? requestedUserId : (currentId ?? staff[0]?.id ?? null);
      this.selectedUserId.set(nextId);
      this.loadAll();
    });
  }

  onSelectedProfileChange(value: number | string | null): void {
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0 || next === this.selectedUserId()) return;
    this.selectedUserId.set(next);
    this.selectedShiftId.set(null);
    this.open.set(null);
    this.editingProfile.set(false);
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true); this.error.set(null);
    const range = this.dateRange();
    const selectedUserId = this.selectedUserId() ?? this.currentUserId();
    const selectedUser = this.staffProfiles().find((staff) => staff.id === selectedUserId) || null;
    const isSelf = this.isSelfUserId(selectedUserId);
    const profile$ = isSelf
      ? this.api.getMyStaffProfile()
      : of(this.userToStaffProfile(selectedUser, selectedUserId));
    const shifts$ = isSelf
      ? this.api.getMyShifts(range.shiftFrom, range.shiftTo)
      : this.api
          .getSchedule(range.shiftFrom, range.shiftTo)
          .pipe(map((shifts) => shifts.filter((shift) => shift.user_id === selectedUserId)));
    const open$ = isSelf
      ? this.api.getMyOpenWorkSession()
      : selectedUserId != null
        ? this.api.getUserOpenWorkSession(selectedUserId)
        : of(null);
    const history$ = isSelf
      ? this.api.getMyWorkSessions(range.historyFrom, range.shiftTo)
      : selectedUserId != null
        ? this.api.getUserWorkSessions(selectedUserId, range.historyFrom, range.shiftTo)
        : of([] as WorkSession[]);
    const summary$ = isSelf
      ? this.api.getMyAttendanceSummary(range.monthFrom, range.monthTo)
      : selectedUserId != null
        ? this.api
            .getAttendancePaySummary(range.monthFrom, range.monthTo, selectedUserId)
            .pipe(map((rows) => rows[0] || this.emptyAttendanceSummary(selectedUser, selectedUserId)))
        : of(this.emptyAttendanceSummary(selectedUser, null));
    forkJoin({
      profile: profile$,
      shifts: shifts$,
      open: open$,
      history: history$,
      summary: summary$,
      qr: this.api.getMyClockQrStatus(),
    }).subscribe({
      next: (data) => {
        this.profile.set(data.profile); this.shifts.set(data.shifts); this.open.set(data.open);
        this.history.set(data.history); this.summary.set(data.summary); this.clockStatus.set(data.qr);
        this.profileName = data.profile.full_name || ''; this.profilePhone = data.profile.phone || ''; this.profileJob = data.profile.job_title || '';
        const preferred = this.preferredShiftId
          ? data.shifts.find((shift) => shift.id === this.preferredShiftId)
          : null;
        this.preferredShiftId = null;
        if (data.open?.shift_id) this.selectedShiftId.set(data.open.shift_id);
        else if (preferred) this.selectedShiftId.set(preferred.id);
        else {
          const eligible = data.shifts.filter((shift) => !this.shiftRecordedFrom(data.history, shift.id) && this.isWithinShiftWindow(shift));
          const preferredEligible = eligible.find((shift) => this.isToday(shift.date)) || eligible[0];
          this.selectedShiftId.set(preferredEligible?.id || null);
        }
        this.loading.set(false);
      },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.detail || 'Attendance could not be loaded.'); },
    });
  }

  private currentUserId(): number | null {
    return this.api.getCurrentUser()?.id ?? null;
  }

  private isSelfUserId(userId: number | null | undefined): boolean {
    const currentId = this.currentUserId();
    return userId == null || currentId == null || userId === currentId;
  }

  private userToStaffProfile(user: User | null, userId: number | null | undefined): StaffProfile {
    return {
      id: userId ?? user?.id ?? 0,
      email: user?.email || '',
      full_name: user?.full_name || user?.email || 'Selected staff',
      tenant_id: user?.tenant_id ?? null,
      provider_id: user?.provider_id ?? null,
      role: user?.role || 'waiter',
      employee_number: user?.employee_number ?? null,
      job_title: user?.job_title ?? null,
      phone: user?.phone ?? null,
      employment_start_date: user?.employment_start_date ?? null,
      profile_completed_at: user?.profile_completed_at ?? null,
    };
  }

  private emptyAttendanceSummary(user: User | null, userId: number | null): AttendanceSummary {
    return {
      user_id: userId ?? user?.id ?? 0,
      user_name: user?.full_name || user?.email || 'Selected staff',
      employee_number: user?.employee_number ?? null,
      job_title: user?.job_title ?? null,
      completed_sessions: 0,
      open_sessions: 0,
      worked_minutes: 0,
      missing_clock_in_photos: 0,
      missing_clock_out_photos: 0,
    };
  }

  saveProfile(): void {
    if (!this.isSelfProfile()) { this.error.set('Open Users to edit another staff profile.'); return; }
    if (this.profileName.trim().length < 2) { this.error.set('Enter your full name.'); return; }
    this.profileSaving.set(true); this.error.set(null);
    this.api.updateMyStaffProfile({ full_name: this.profileName.trim(), phone: this.profilePhone.trim() || null, job_title: this.profileJob.trim() || null })
      .pipe(finalize(() => this.profileSaving.set(false)))
      .subscribe({ next: (profile) => { this.profile.set(profile); this.editingProfile.set(false); }, error: (err) => this.error.set(err?.error?.detail || 'Profile could not be saved.') });
  }

  selectShift(shift: Shift): void { if (!this.open() && this.canClockShift(shift)) this.selectedShiftId.set(shift.id); }
  shiftRecorded(id: number): boolean { return this.shiftRecordedFrom(this.history(), id); }
  private shiftRecordedFrom(rows: WorkSession[], id: number): boolean { return rows.some((row) => row.shift_id === id); }

  private shiftWindow(shift: Shift): { start: Date; end: Date; opens: Date; closes: Date } {
    const start = new Date(`${shift.date}T${shift.start_time}`);
    const end = new Date(`${shift.date}T${shift.end_time}`);
    if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
    const opens = new Date(start.getTime() - 6 * 60 * 60 * 1000);
    const closes = new Date(end.getTime() + 12 * 60 * 60 * 1000);
    return { start, end, opens, closes };
  }

  private isWithinShiftWindow(shift: Shift): boolean {
    const now = Date.now();
    const window = this.shiftWindow(shift);
    return now >= window.opens.getTime() && now <= window.closes.getTime();
  }

  canClockShift(shift: Shift): boolean {
    return !this.open() && !this.shiftRecorded(shift.id) && this.isWithinShiftWindow(shift);
  }

  shiftWindowClosed(shift: Shift): boolean {
    return Date.now() > this.shiftWindow(shift).closes.getTime();
  }

  shiftStateLabel(shift: Shift): string {
    if (this.shiftRecorded(shift.id)) return 'Recorded';
    if (this.open()?.shift_id === shift.id) return 'Active';
    const now = Date.now();
    const window = this.shiftWindow(shift);
    if (now < window.opens.getTime()) return 'Upcoming';
    if (now < window.start.getTime()) return 'Clock in open';
    if (now <= window.end.getTime()) return 'Clock in now';
    if (now <= window.closes.getTime()) return 'Late clock-in';
    return 'Window closed';
  }

  requestCamera(action: 'clock_in' | 'clock_out'): void {
    if (action === 'clock_in' && !this.selectedShift()) { this.error.set('Select a scheduled shift first.'); return; }
    if (action === 'clock_in' && !this.canClockShift(this.selectedShift()!)) { this.error.set('This shift is not currently open for attendance.'); return; }
    if (this.clockStatus()?.clock_qr_required && !this.effectiveClockQr()) { this.openQrScanner(); return; }
    this.pendingAction.set(action); this.cameraError.set(null); this.cameraReady.set(false); this.cameraOpen.set(true);
    setTimeout(() => void this.startCamera(), 0);
  }

  private async startCamera(): Promise<void> {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera is not supported on this device.');
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      const video = this.cameraVideo?.nativeElement;
      if (!video) throw new Error('Camera view is unavailable.');
      video.srcObject = this.stream; await video.play(); this.cameraReady.set(true);
    } catch (err: any) { this.cameraError.set(err?.message || 'Allow camera access and try again.'); this.stopCamera(); }
  }

  closeCamera(): void { this.stopCamera(); this.cameraOpen.set(false); this.cameraError.set(null); }
  private stopCamera(): void { this.stream?.getTracks().forEach((track) => track.stop()); this.stream = null; this.cameraReady.set(false); }

  captureAndClock(): void {
    const video = this.cameraVideo?.nativeElement; const canvas = this.cameraCanvas?.nativeElement;
    if (!video || !canvas || video.videoWidth < 1) { this.cameraError.set('Camera is not ready yet.'); return; }
    const width = Math.min(640, video.videoWidth); const height = Math.round(width * video.videoHeight / video.videoWidth);
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d'); if (!context) { this.cameraError.set('Photo could not be captured.'); return; }
    context.translate(width, 0); context.scale(-1, 1); context.drawImage(video, 0, 0, width, height);
    const photo = canvas.toDataURL('image/jpeg', 0.68); const capturedAt = new Date().toISOString();
    const shiftId = this.pendingAction() === 'clock_out' ? this.open()?.shift_id : this.selectedShiftId();
    if (!shiftId) { this.cameraError.set('Scheduled shift is missing. Refresh and try again.'); return; }
    this.actionLoading.set(true); this.error.set(null);
    this.buildVenuePayload().pipe(
      switchMap((payload) => {
        const fullPayload = { ...payload, shift_id: shiftId, photo_data_url: photo, photo_captured_at: capturedAt };
        const selectedUserId = this.selectedUserId();
        if (this.isSelfUserId(selectedUserId)) {
          return this.pendingAction() === 'clock_in' ? this.api.startMyWorkSession(fullPayload) : this.api.endMyWorkSession(fullPayload);
        }
        if (!selectedUserId) throw new Error('Selected staff profile is missing.');
        return this.pendingAction() === 'clock_in'
          ? this.api.startUserWorkSession(selectedUserId, fullPayload)
          : this.api.endUserWorkSession(selectedUserId, fullPayload);
      }), finalize(() => this.actionLoading.set(false))
    ).subscribe({
      next: () => { this.closeCamera(); this.loadAll(); },
      error: (err) => { this.cameraError.set(err?.error?.detail || 'Attendance could not be recorded.'); },
    });
  }

  startBreak(): void {
    if (!this.isSelfProfile()) { this.error.set('Break actions are only available for your own active shift.'); return; }
    this.actionLoading.set(true); this.api.startMyWorkSessionBreak().pipe(finalize(() => this.actionLoading.set(false))).subscribe({ next: (row) => this.open.set(row), error: (err) => this.error.set(err?.error?.detail || 'Break could not be started.') });
  }
  endBreak(): void {
    if (!this.isSelfProfile()) { this.error.set('Break actions are only available for your own active shift.'); return; }
    this.actionLoading.set(true); this.buildVenuePayload().pipe(switchMap((payload) => this.api.endMyWorkSessionBreak(payload)), finalize(() => this.actionLoading.set(false))).subscribe({ next: (row) => this.open.set(row), error: (err) => this.error.set(err?.error?.detail || 'Break could not be ended.') });
  }

  private buildVenuePayload(): Observable<WorkSessionClockPayload> {
    const payload: WorkSessionClockPayload = {}; const qr = this.effectiveClockQr(); if (qr) payload.clock_qr = qr;
    if (!this.clockStatus()?.clock_qr_location_verify) return of(payload);
    return from(new Promise<WorkSessionClockPayload>((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Location is unavailable.')); return; }
      navigator.geolocation.getCurrentPosition((position) => resolve({ ...payload, latitude: position.coords.latitude, longitude: position.coords.longitude }), reject, { timeout:15000, maximumAge:60000 });
    })).pipe(catchError(() => { this.cameraError.set('Allow location access to clock at this venue.'); return EMPTY; }));
  }

  private effectiveClockQr(): string | null { return (this.clockQrToken() || sessionStorage.getItem('attendance_clock_qr') || '').trim() || null; }
  openQrScanner(): void { this.scanOpen.set(true); this.scanError.set(null); setTimeout(() => void this.startQrReader(), 0); }
  closeQrScanner(): void { void this.stopQrReader(); this.scanOpen.set(false); }
  private async startQrReader(): Promise<void> {
    try {
      this.qrReader = new Html5Qrcode(this.qrReaderId);
      await this.qrReader.start({ facingMode:'environment' }, { fps:10, qrbox:{ width:220, height:220 } }, (decoded) => {
        let token = decoded.trim();
        try { const url = new URL(decoded); token = url.searchParams.get('clock_qr') || decoded; } catch {}
        this.clockQrToken.set(token); sessionStorage.setItem('attendance_clock_qr', token); this.closeQrScanner();
      }, () => {});
    } catch { this.scanError.set('Camera could not scan the venue QR. Allow camera access and retry.'); }
  }
  private async stopQrReader(): Promise<void> { if (!this.qrReader) return; try { if (this.qrReader.isScanning) await this.qrReader.stop(); } catch {} try { this.qrReader.clear(); } catch {} this.qrReader = null; }

  formatRole(role?: string): string { if (!role) return 'Staff'; return role.replace(/_/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase()); }
  isPayrollEmployee(): boolean { const role = this.profile()?.role; return role !== 'owner' && role !== 'admin'; }
  formatMoney(amount: number): string { return new Intl.NumberFormat('en-SG', { style:'currency', currency:'SGD' }).format(amount); }
  formatMinutes(minutes: number): string { const total = Math.max(0, Math.floor(minutes)); const hours = Math.floor(total / 60); const rest = total % 60; return hours ? `${hours}h ${rest}m` : `${rest}m`; }
  formatDt(value: string): string { return new Date(value).toLocaleString([], { dateStyle:'medium', timeStyle:'short' }); }
  dateOnly(value: string): string { return new Date(value).toLocaleDateString([], { month:'short', day:'numeric' }); }
  timeOnly(value: string): string { return new Date(value).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }); }
  weekday(value: string): string { return new Date(`${value}T12:00:00`).toLocaleDateString([], { weekday:'short' }); }
  dayNumber(value: string): string { return new Date(`${value}T12:00:00`).toLocaleDateString([], { day:'2-digit' }); }
  shortTime(value: string): string { const [hour, minute] = value.split(':').map(Number); const d = new Date(); d.setHours(hour, minute, 0, 0); return d.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }); }
  isToday(value: string): boolean { return value === this.isoDate(new Date()); }
}
