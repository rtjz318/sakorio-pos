# Sakorio POS first-iteration operations upgrade blueprint

Date: 2026-08-29  
Status: implementation-ready technical design  
Target branch: `development`  
Audience: product owner, senior full-stack developer, QA engineer, deployment owner  
Scope: Tables, reservations, queue/waitlist, POS queue operations, attendance, timetable, and payroll privacy

## 1. Executive summary

The first restaurant trial confirmed that Sakorio's core table, ordering, kitchen, payment, and attendance foundations are useful. The next iteration must make six operational changes:

1. Add an independent payment-state indicator to every open table.
2. Show reservations on their assigned table only, and only on the restaurant's local reservation date.
3. Give customers a large, stable queue number and update their open queue page automatically when staff ping or change their status.
4. Show the same queue numbers and queue actions in the staff POS.
5. Replace mandatory preplanned shifts with dynamic profile-based clock-in and clock-out records that appear directly on the Timetable.
6. Restrict hourly rates and calculated pay to owner/admin users at the API level, not only by hiding frontend fields.

The implementation should preserve Sakorio's current table-session model:

- A table has one active visit/session.
- Customer QR and staff POS orders feed the same table visit.
- Service state and payment state are separate.
- A paid table remains occupied until staff closes it.
- Reservations and queue entries become attached to a physical table when seated.
- Work sessions are factual attendance records; planned shifts are optional planning records.

## 2. Product decisions fixed by this brief

These decisions resolve ambiguity before coding begins.

### 2.1 Payment meanings

The table chip is a collection state, not a kitchen/service state.

| API state | UI label | Colour | Meaning |
| --- | --- | --- | --- |
| `none` | No payment chip | Neutral | No billable items in the current table session. |
| `unpaid` | Unpaid | Red | Current session has billable items and no authoritative payment confirmation. Cash/terminal flows remain here until staff confirms collection. |
| `requested` | Payment requested | Yellow | Customer requested the bill or an online payment request is pending. |
| `paid` | Paid | Green | Payment is authoritatively settled. HitPay requires a verified webhook; cash/terminal requires an authorised staff confirmation. |

`Paid` must not be inferred from a browser return URL. Online payment becomes paid only after server-side HitPay verification/webhook processing. A terminal or cash attempt remains red until staff explicitly marks it collected; after that it is green and the secondary label identifies `Terminal` or `Cash`.

### 2.2 Reservation visibility

- Public customers do not choose an exact physical table.
- A new public booking may remain unassigned (`table_id = null`) until the host allocates it.
- An unassigned reservation remains visible in the Reservations workspace, not on a table card.
- An assigned reservation appears only on its assigned table.
- Future reservations remain available in the Reservations workspace for planning.
- The Tables/POS floor shows a booked reservation only when `reservation_date` equals the tenant's current local date.
- A seated reservation stays visible on its table until the table is closed/visit is finished.

This interpretation satisfies restaurant operations without forcing customers to understand the physical floor plan.

### 2.3 Queue auto-update boundary

The first implementation guarantees automatic updates while the queue page is open or suspended briefly in the browser. It uses WebSocket realtime updates, automatic reconnect, and HTTP polling fallback.

If the requirement later means an operating-system notification while the browser is fully closed, add Web Push, SMS, or WhatsApp as a separately consented integration. A normal web page cannot guarantee background delivery on every phone/browser.

### 2.4 Administrator definition

For wage privacy, `administrator` means Sakorio roles `owner` and `admin`. Waiter, receptionist, kitchen, bartender, courier, provider, and any future non-administrator roles must not receive hourly rates or estimated pay in API responses.

### 2.5 Attendance versus planned shifts

- `WorkSession` is the source of truth for actual work.
- `Shift` remains an optional planning record for historical compatibility but is no longer required to clock in.
- Timetable defaults to actual attendance blocks.
- An open work session renders from its start time to `now`; clock-out fixes its end time.

## 3. Current architecture and reusable foundations

### 3.1 Stack

| Layer | Technology | Relevant location |
| --- | --- | --- |
| Staff/customer UI | Angular 20+, static SPA/Capacitor Android shell | `front/src/app/` |
| API | FastAPI | `back/app/main.py` |
| Models | SQLModel | `back/app/models.py` |
| Database | PostgreSQL | `back/migrations/` |
| Realtime fan-out | Redis Pub/Sub + WebSocket endpoints | `back/app/main.py`, `front/src/app/services/api.service.ts` |
| Auth/RBAC | Cookie/JWT auth + permission dependencies | `back/app/security.py`, `back/app/permissions.py` |
| Deployment | Render staff/order/API services, PostgreSQL, Redis | Render blueprints/configuration |

### 3.2 Existing capabilities that should be extended

- `GET /tables/with-status` already returns service state plus `payment_status` values `none`, `pending`, and `paid`.
- `Order` already stores `bill_requested_at`, `paid_at`, `payment_method`, and `hitpay_payment_request_id`.
- `Reservation` already stores `reservation_date`, `reservation_time`, `status`, and nullable `table_id`.
- `GuestQueueEntry` already stores a private `public_token`, lifecycle timestamps, status, and `seated_table_id`.
- The public queue API already calculates `position` and returns a reference based on the database ID.
- Redis already publishes staff queue events on `queue:tenant:{tenant_id}`.
- The public waitlist currently refreshes status using HTTP polling.
- `WorkSession.shift_id` is already nullable in the database model, although the clock endpoints currently require a valid planned `Shift`.
- Selected-profile clock endpoints already exist at `/users/{user_id}/work-session/start` and `/end`, but targeting another user is restricted to accounts with `user:read`.
- `User.hourly_rate_cents` and attendance pay calculations already exist, but the field currently appears in several broad payloads and non-admin screens.

### 3.3 Main files affected

| Concern | Backend | Frontend |
| --- | --- | --- |
| Table/payment state | `back/app/main.py`, payment handlers | `tables.component.ts`, `tables-canvas.component.ts`, `cashier-pos.component.ts`, `api.service.ts` |
| Reservation day scoping | `back/app/main.py` | `reservations.component.ts`, tables/POS components |
| Queue numbering/realtime | `back/app/models.py`, `back/app/main.py`, new migration | `waitlist-public/*`, `queue.component.ts`, `api.service.ts` |
| POS queue rail | table/queue serializers in `main.py` | `cashier-pos.component.ts`, shared toolbar if used |
| Dynamic attendance | `models.py`, `main.py`, `work_session_serialization.py` | `my-shift.component.ts`, `working-plan.component.ts`, `dashboard.component.ts` |
| Payroll privacy | `permissions.py`, `models.py` DTOs, `main.py`, `reports_routes.py`, `work_session_serialization.py` | `users.component.ts`, `my-shift.component.ts`, `working-plan.component.ts`, `reports.component.*`, `api.service.ts` |

## 4. Target architecture and event flow

```text
Customer/Staff action
        |
        v
FastAPI transaction ------> PostgreSQL canonical state
        |
        +---- after commit ----> Redis tenant channel ----> Staff POS/Host screens
        |
        +---- after commit ----> Redis private queue channel ----> One customer's queue page

Angular renders server state; it does not invent payment, queue, reservation, or wage authority.
```

Core rules:

- PostgreSQL is authoritative.
- Redis events are invalidation/change messages, not the only copy of state.
- Every realtime screen reloads the authoritative resource after reconnect.
- Tenant-local time is used for service-day decisions.
- Derived UI state is calculated in one backend serializer and reused by Tables and POS.
- Sensitive wage fields are omitted server-side for unauthorised roles.

## 5. Phase 0 - contracts, feature flags, and baseline tests

### Objective

Freeze terminology and current behaviour before changing database or UI code.

### Work

1. Add shared backend enums/constants for table payment state and attendance source.
2. Add frontend literal union types matching the API values.
3. Record the tenant timezone used for all service-day calculations; do not use UTC date for table reservations or queue numbering.
4. Add tenant-scoped rollout switches if progressive activation is desired:
   - `table_payment_state_v2`
   - `queue_realtime_v2`
   - `dynamic_attendance_v2`
5. Capture baseline API and live browser evidence for:
   - open table with unpaid order;
   - customer bill request;
   - HitPay paid callback/webhook;
   - future and same-day bookings;
   - public queue join and ping;
   - planned-shift clock-in;
   - waiter fetching profile and attendance payloads.

### Exit criteria

- State labels in section 2 are approved and represented by typed constants.
- Existing regression tests pass before functional changes.
- No change has yet altered production behaviour.

## 6. Phase 1 - table payment-status indicator

### 6.1 Backend design

Do not add a mutable `payment_status` column to `Table`. It is derived from the current table session and persisting it would create two competing sources of truth.

Create one helper, for example:

```python
derive_table_payment_summary(table, current_session_orders) -> {
    "status": "none" | "unpaid" | "requested" | "paid",
    "method": null | "hitpay" | "terminal" | "cash",
    "requested_at": str | null,
    "paid_at": str | null,
    "order_ids": list[int],
}
```

Derivation priority:

1. No active items in the current table session -> `none`.
2. Every billable current-session order is settled -> `paid`.
3. Any unsettled order has `bill_requested_at` or a pending HitPay request -> `requested`.
4. Otherwise -> `unpaid`.

For joined table groups, merge by highest operational priority:

`unpaid` > `requested` > `paid` > `none`

This prevents one paid sibling from hiding an unpaid sibling. Return the detailed summary from `GET /tables/with-status`; retain a compatibility `payment_status` string during the frontend cutover.

### 6.2 Payment authority

- HitPay: `paid_at` is set only by a verified webhook/payment-status verification path.
- Browser `status=completed` is only a prompt to re-fetch; it is never proof of payment.
- Terminal/cash: only roles with `order:mark_paid` may confirm collection.
- The mark-paid endpoint records `payment_method`, `paid_by_user_id`, and `paid_at` in one transaction.
- Duplicate mark-paid requests must be idempotent and return the existing paid result.
- Closing a table remains blocked if any current-session order is unsettled.

### 6.3 Frontend design

On both Tables and POS table selectors:

- Keep the primary operational chip (`Available`, `Reserved`, `Open table`, `Ready to serve`, etc.).
- Place the payment chip immediately beside it.
- Do not replace table fill colours with payment colours; the two dimensions must remain visually separate.
- Use icon + text + colour so status is not colour-only.

Suggested tokens:

| State | Background | Text/border | Icon |
| --- | --- | --- | --- |
| Unpaid | pale red | dark red | wallet/alert |
| Payment requested | pale yellow | dark amber | clock/card |
| Paid | pale green | dark green | check-circle |

At 768–1024px tablet widths, the chips wrap within the card and never overlap the table name or action button.

### 6.4 Acceptance tests

- Open empty table: no payment chip.
- Add items without bill request: red `Unpaid`.
- Customer requests terminal/bill: yellow `Payment requested` without page refresh.
- Start HitPay but abandon checkout: remains yellow, never green.
- Verified HitPay webhook: green `Paid · Online`.
- Staff confirms terminal/cash: green `Paid · Terminal/Cash`.
- Payment failure/cancel: returns/remains red `Unpaid` with retry available.
- Paid table stays occupied and cannot accept a new visit until closed.
- Joined table group with one unpaid order shows red on every member.

## 7. Phase 2 - reservation assignment and day-of table visibility

### 7.1 Backend query rules

Replace UTC-based floor logic with tenant-local service-day logic:

```python
tenant_today = datetime.now(timezone.utc).astimezone(ZoneInfo(tenant.timezone)).date()
```

For each table, booked reservation lookup must include:

- matching `tenant_id`;
- matching `table_id`;
- `status == booked`;
- `reservation_date == tenant_today`;
- deterministic `ORDER BY reservation_time, id`.

Never select a future booking for a table card. Never display an unassigned reservation on an arbitrary table.

### 7.2 Assignment workflow

1. Public reservation is created, usually unassigned.
2. It appears in the Reservations workspace for its booking date.
3. Host selects `Assign table` and sees only tenant tables with adequate capacity and no overlapping booking/active visit.
4. Backend validates tenant ownership, capacity warning policy, and overlap in the same transaction.
5. The booking stores `table_id`.
6. Before the reservation date, it remains visible in Reservations but not on the floor.
7. On the local reservation date, the assigned table shows time, customer name, party size, and reservation status.
8. `Seat now` changes status to `seated`, starts/activates the table session, and records `seated_at` atomically.
9. Closing the table changes the seated reservation to `finished`.

The queue must not be required for a normal reservation. A booking should enter the queue only through an explicit `Move to queue` exception flow, such as no table currently available.

### 7.3 Conflict and concurrency safeguards

- Re-run availability checks server-side; never trust the table list rendered earlier in the browser.
- Lock the target table and conflicting reservations during assignment/seat transaction.
- Return `409 table_no_longer_available` when another host has just assigned or opened it.
- Preserve the reservation record if seating fails.
- Use tenant timezone for midnight and daylight-saving boundaries.

### 7.4 Frontend behaviour

- Tables/POS show only today's assigned reservations.
- Reservation card shows `HH:mm · Name · N pax`.
- Future booking count may be shown only inside a planning drawer clearly labelled `Future`, not as today's table status.
- Reservations screen keeps date navigation, search, filters, and all future bookings.
- Unassigned same-day bookings receive a visible `Needs table` warning in Reservations.
- Tables should not contain a general wall of reservation cards; the booking belongs to its assigned table.

### 7.5 Acceptance tests

- Booking for tomorrow is present in Reservations and absent from today's Tables/POS.
- At local midnight, it becomes visible without a deployment.
- Same-day unassigned booking is visible as `Needs table` only in Reservations.
- Assigned same-day booking appears only on that table.
- Two hosts cannot assign overlapping bookings to one table.
- A booking cannot be assigned to another tenant's table.
- Seating opens one clean table session and closing finishes the booking.
- Timezone test near UTC/local midnight uses the restaurant's date.

## 8. Phase 3 - stable queue numbers and customer realtime status

### 8.1 Why database IDs must not be queue numbers

The current public reference `Q{id}` leaks the global row identifier, does not reset by service day, and is not a restaurant-friendly calling sequence. Introduce an explicit daily queue number.

### 8.2 Database changes

Add to `guest_queue_entry`:

| Column | Type | Rules |
| --- | --- | --- |
| `service_date` | `DATE` | Tenant-local date at creation; indexed. |
| `queue_number` | `INTEGER` | Positive; unique within tenant and service date. |

Add a counter table:

```text
guest_queue_counter
- tenant_id (FK, composite PK)
- service_date (DATE, composite PK)
- next_number (INTEGER)
- updated_at (TIMESTAMPTZ)
```

Add unique constraint:

```text
UNIQUE (tenant_id, service_date, queue_number)
```

Allocate numbers with a PostgreSQL atomic upsert/`RETURNING` inside the same transaction as queue creation. Do not use `MAX(queue_number) + 1` without a lock. No midnight reset job is required because each date has its own counter row.

Display format is presentation-only: `Q001`, `Q002`, etc. Store integer `1`, `2`, etc.

Backfill existing rows deterministically by tenant, tenant-local requested date, `requested_at`, then `id`. Preserve `public_token`.

### 8.3 API payload

Both public and staff queue serializers return:

```json
{
  "queue_number": 23,
  "queue_label": "Q023",
  "service_date": "2026-08-29",
  "position": 4,
  "status": "waiting",
  "status_version": 7,
  "updated_at": "..."
}
```

`queue_number` is the number the restaurant calls. `position` is the customer's current relative place and may change when other guests are seated/cancelled.

Add `status_version` or use a monotonic event/update version so clients ignore duplicated/out-of-order events.

### 8.4 Private realtime channel

Add a capability-token WebSocket endpoint, for example:

```text
GET/WS /ws/public/queue/{public_token}
```

Security requirements:

- Validate the opaque high-entropy `public_token`.
- Subscribe only to a channel for that entry, not the entire tenant queue.
- Never send phone number, notes, other guests, or staff identity.
- Apply connection and message rate limits.
- Do not log raw public tokens; log a short hash/fingerprint.
- Expire/close the stream after a terminal queue status plus a short grace period.

On each committed queue mutation, publish both:

- staff invalidation event to `queue:tenant:{tenant_id}`;
- private public event to `queue:public:{token_fingerprint}`.

The event should contain the safe public serializer or tell the client to re-fetch it.

### 8.5 Public Angular behaviour

- After join, replace the form with a status card.
- Render `Q023` as the dominant element (minimum approximately 48px on phone).
- Render `4 ahead of you`/current position separately.
- For `notified`, change the card immediately to a high-contrast `Please return to the host now` state and optionally vibrate/play a user-enabled sound.
- Show `Last updated just now` and connection status.
- Reconnect with capped exponential backoff and jitter.
- On reconnect or tab visibility change, fetch `GET /public/queue/{token}`.
- Keep a 15–30 second polling fallback when WebSocket is unavailable.
- Persist the token in local storage as today, but clear/replace it after terminal status or `Start again`.
- Maintain cancel action with confirmation.

### 8.6 Staff queue behaviour

- Queue board cards lead with `Q023`, followed by name, party size, wait time, and phone.
- `Ping` changes `waiting -> notified`, records `notified_at`, publishes realtime events, and shows success to staff.
- `No show` and `Cancel` require an explicit reason/confirmation and publish immediately.
- `Seat` requires choosing an available table and writes `seated_table_id`.
- Stale previous-day records are excluded from the live queue by `service_date`, not only by an age threshold.

### 8.7 Acceptance tests

- Two simultaneous joins get distinct sequential numbers.
- First queue entry on next local day receives `Q001`.
- Customer sees a large number immediately after join.
- Staff ping changes the open phone page without manual refresh.
- WebSocket loss displays reconnecting state and HTTP fallback still updates.
- Refresh/reopen preserves the same queue entry and number.
- No customer's event leaks another guest's data.
- Cancel/no-show removes the entry from active position calculations.
- Multiple API instances receive updates through Redis.

## 9. Phase 4 - queue visibility and actions in POS

### 9.1 UI placement

Add a collapsible `Queue` rail/button to the POS table board rather than crowding every table card.

The POS queue summary shows:

- waiting count;
- notified count;
- longest wait;
- next queue label.

The expanded rail shows each active entry with:

- large `Q023`;
- guest name and party size;
- elapsed/quoted wait;
- status (`Waiting` or `Pinged`);
- `Ping`, `Seat`, `No show`, and `Cancel` actions subject to permission.

When an entry is seated, its queue label appears on the assigned table and inside the table service drawer until the table closes. Add `seated_queue_entry` to the table status response:

```json
{
  "id": 456,
  "queue_number": 23,
  "queue_label": "Q023",
  "customer_name": "...",
  "party_size": 3,
  "status": "seated"
}
```

### 9.2 Shared state and code reuse

- Do not build a second queue business service inside the POS component.
- Put typed queue operations in `ApiService` and shared display helpers in a small queue utility/service.
- Queue and POS screens consume the same backend serializers and mutation endpoints.
- Reuse the tenant staff WebSocket; events trigger a debounced queue/table refresh.
- Protect against duplicate refresh storms by coalescing events for 100–300ms.

### 9.3 Action permissions

Use existing reservation/host permissions initially:

- View: `reservation:read`.
- Ping, cancel, no-show, seat: `reservation:write`.

If queue responsibilities later diverge from reservation duties, introduce explicit `queue:read` and `queue:write` permissions in a separate migration rather than relying on UI visibility.

### 9.4 Acceptance tests

- New public join appears in POS without refresh.
- Queue number is identical on customer, Queue tab, POS rail, and seated table.
- Cashier can ping and customer page updates.
- Seat action rejects an occupied/reserved-conflicting table with a clear message.
- No-show removes entry from active POS rail and updates customer page.
- Waiter without write permission cannot mutate via direct API request.
- Tablet layout at 768x1024 and 1024x768 has no overlap and keeps table selection usable.

## 10. Phase 5 - dynamic profile-based attendance and Timetable

### 10.1 Target workflow

1. Staff opens `My Shift`/attendance kiosk on the restaurant tablet.
2. Staff selects their profile from active employee profiles.
3. Staff completes configured venue proof (PIN/QR, photo, and/or GPS according to tenant policy).
4. Staff presses `Clock in`.
5. Backend creates a `WorkSession` immediately with `shift_id = null`, exact UTC start, tenant, user, source, and audit metadata.
6. Timetable shows a live actual-attendance block on the tenant-local date.
7. Staff selects the same profile and presses `Clock out`.
8. Backend records exact UTC end, closes any open break, and Timetable fixes the block end.

No planned `Shift` is required.

### 10.2 Security model for a shared tablet

Do not give a shared kiosk unrestricted administrator credentials indefinitely. Implement least-privilege attendance station access:

- Register an attendance station/device for the tenant with a revocable token.
- Station API may list only safe profile fields: user ID, display name, role/job title, and avatar/initials.
- Each staff profile should use a short clock PIN stored as a strong password hash, or retain the existing photo/venue QR proof if the owner explicitly accepts profile-only clocking.
- Rate-limit failed PIN/proof attempts per station/profile.
- Record station ID, actor profile, IP, and proof timestamps.
- Never expose email, hourly rate, password state, or payroll data to the kiosk profile list.

For a first controlled rollout, owner/admin-authenticated profile selection can remain available, but the dedicated station token is the launch-safe endpoint.

### 10.3 Database changes

`WorkSession.shift_id` is already nullable. Add only fields needed for provenance/audit:

| Column | Type | Example |
| --- | --- | --- |
| `source` | varchar/enum | `self_clock`, `shared_kiosk`, `manager_adjustment`, `legacy_planned` |
| `station_id` | nullable FK | Attendance station used for clock action. |
| `client_request_id` | nullable string | Double-tap/idempotency key. |

Add a PostgreSQL partial unique index to guarantee one open session per user:

```text
UNIQUE (tenant_id, user_id) WHERE ended_at IS NULL
```

If implementing a station table:

```text
attendance_station
- id
- tenant_id
- name
- token_hash
- is_active
- last_seen_at
- created_at
- revoked_at
```

Do not delete historical `Shift` records. Planned schedules can remain an optional overlay or be hidden from the default UI.

### 10.4 Backend changes

- Replace mandatory `_validate_scheduled_shift` on dynamic clock-in with an optional shift-link resolver.
- When `shift_id` is supplied, validate and link it; when absent, create an unscheduled factual work session.
- Clock-out uses the open session; it must not require a shift ID.
- Retain venue QR/GPS/photo validation according to tenant settings.
- Start/end transactions use the partial unique index and idempotency key to handle double taps.
- Cross-midnight session remains one database record; calendar serialization may split it visually by local day.
- Add stale-open-session warnings to admin Timetable, but never auto-clock-out without an explicit configured policy and audit event.

### 10.5 Timetable API and UI

Provide a date-range attendance calendar endpoint or extend the existing planned-versus-actual endpoint. Return:

```json
{
  "work_session_id": 123,
  "user_id": 9,
  "user_name": "Staff A",
  "started_at": "...Z",
  "ended_at": null,
  "local_date": "2026-08-29",
  "source": "shared_kiosk",
  "is_open": true,
  "worked_minutes": 87
}
```

Timetable requirements:

- Default view displays actual attendance, grouped by staff and local day.
- Open blocks have a live/pulsing indicator and extend to current time.
- Clock-out updates through WebSocket or short staff-side polling.
- Optional planned shifts use a visually different outline and are not required.
- Admin can correct times through the existing audited adjustment flow.
- Normal staff see their clock history and worked time, but no wage/rate.

### 10.6 Acceptance tests

- Staff with no planned shift can clock in.
- Their live block appears on Timetable without refresh.
- Clock-out records the correct local date/time and fixes the block.
- Two rapid clock-in taps create one work session.
- One user cannot have two open sessions.
- Staff A cannot clock Staff B without valid kiosk/admin authority and required proof.
- Break intervals subtract from net worked minutes.
- Cross-midnight shift renders correctly on both dates.
- Offline/error state never falsely shows a successful clock action.
- Historical planned-shift records remain readable after rollout.

## 11. Phase 6 - hourly-rate and payroll privacy

### 11.1 Current exposure to remove

`hourly_rate_cents` currently appears in broad `UserResponse`, schedule plan-user payloads, self-profile/attendance summaries, work-session serialization, My Shift, Timetable payroll readiness, Users, and Reports. Hiding HTML alone is insufficient because a waiter can inspect network responses.

### 11.2 Permission model

Add explicit permissions:

```text
payroll:rate_read
payroll:rate_write
payroll:summary_read
```

Assign them only to `owner` and `admin`.

Do not use `schedule:read` or `user:read` as wage permissions. A kitchen user needs schedule names/times but not salaries.

### 11.3 DTO separation

Replace one oversized user response with purpose-specific DTOs:

1. `StaffDirectoryResponse`: ID, display name, role, job title, active/profile state. No rate.
2. `StaffSelfResponse`: safe personal/profile data. No rate for non-admin users.
3. `PayrollStaffResponse`: safe directory fields plus `hourly_rate_cents`; owner/admin only.
4. `WorkSessionResponse`: timestamps, breaks, worked minutes, proof flags. No pay by default.
5. `PayrollWorkSessionResponse`: adds rate and estimated pay; payroll permission required.

Serializers must take an explicit `include_payroll` flag derived from permission, defaulting to `False`. Never default to exposing the field.

### 11.4 Endpoint changes

- `/users/me`: omit rate for non-admin.
- `/users`: use safe directory payload unless caller has payroll permission; preferably provide a separate `/payroll/staff` endpoint.
- `/schedule/plan-users`: always safe directory payload, no rate.
- `/users/me/attendance-summary`: return hours/session counts only for non-admin; no rate or estimated pay.
- `/reports/attendance-pay-summary`: require `payroll:summary_read`.
- Work-session list/live/photo endpoints: never include rate unless endpoint explicitly belongs to payroll and checks permission.
- Create/update user: accept `hourly_rate_cents` only when caller has `payroll:rate_write`; reject with `403`, do not silently ignore.
- Exports containing wage/pay values require payroll permission.

### 11.5 Frontend changes

- Remove `Rate` and estimated-pay cards from My Shift for non-admin accounts.
- Timetable accessible to operational staff contains names and attendance only.
- Payroll-readiness and rate warnings render only for owner/admin.
- Users edit form shows hourly rate only to owner/admin.
- Reports wage tables/exports are owner/admin-only.
- Route guards improve UX, but backend permission checks remain authoritative.

### 11.6 Security tests

For waiter, receptionist, kitchen, bartender, courier, and provider roles:

- Search every JSON response for `hourly_rate_cents`, `estimated_pay_cents`, and payroll totals; they must be absent.
- Directly call payroll endpoints; expect `403`.
- Try updating another/self hourly rate; expect `403`.
- Confirm frontend contains no rate after login, reload, or cached response.

For owner/admin:

- View/update rate succeeds.
- Payroll summary and export succeed.
- Audit trail records rate changes without storing the raw previous/new value in ordinary application logs.

## 12. Database migration plan

Create timestamped, idempotent SQL migrations under `back/migrations/`. Suggested sequence:

1. `..._add_queue_service_date_number_and_counter.sql`
2. `..._add_dynamic_attendance_source_station.sql`
3. `..._add_open_work_session_unique_index.sql`
4. Optional tenant feature-flag/station migration.

### Expand

- Add nullable queue columns and new counter table.
- Add attendance provenance fields.
- Add indexes/constraints that do not invalidate existing rows.

### Backfill

- Compute `service_date` using each tenant's timezone.
- Assign deterministic queue numbers per tenant/day.
- Mark existing work sessions with `source = legacy_planned` when `shift_id` exists and `source = manager_adjustment`/`legacy_unscheduled` otherwise.
- Detect duplicate open work sessions and place them in an admin review report before creating the partial unique index.

### Enforce

- Make queue number/service date non-null for newly created queue entries through application validation first.
- Add unique constraints after backfill passes.
- Add partial open-session unique index after duplicate cleanup.

### Compatibility window

- API emits old `reference` and new `queue_label` during one frontend deployment window.
- API emits compatibility `payment_status` while new `payment_summary.status` is adopted.
- Deploy backend expansion before frontend consumption.
- Remove obsolete fields only in a later cleanup release after live QA.

## 13. API contract summary

### Modified

| Endpoint | Change |
| --- | --- |
| `GET /tables/with-status` | Return canonical payment summary, today's assigned reservation only, and seated queue summary. |
| Queue create/list/status/seat endpoints | Return service date, queue number, queue label, version. |
| `GET /public/queue/{token}` | Return the same safe live customer payload. |
| Work-session start/end | Allow no planned shift; record source/station/idempotency. |
| Schedule/Timetable range endpoints | Return actual attendance blocks without wage data. |
| User/attendance responses | Remove payroll fields unless explicit payroll permission. |

### New or recommended

| Endpoint | Purpose |
| --- | --- |
| `WS /ws/public/queue/{public_token}` | Private realtime customer queue status. |
| `GET /attendance/station/profiles` | Safe profile selector for registered station. |
| `POST /attendance/station/clock-in` | Dynamic kiosk clock-in. |
| `POST /attendance/station/clock-out` | Dynamic kiosk clock-out. |
| `GET /attendance/calendar` | Actual attendance blocks for Timetable range. |
| `GET /payroll/staff` | Admin-only profiles with rates. |
| `GET /payroll/attendance-summary` | Admin-only wage calculation. |

All endpoints must be tenant-scoped and use typed Pydantic/SQLModel response models rather than unfiltered `model_dump()` of sensitive models.

## 14. Realtime reliability requirements

1. Publish only after the database transaction commits.
2. Treat Redis/WebSocket delivery as at-least-once; events can duplicate.
3. Include entity ID and version/update timestamp.
4. Client ignores older versions and de-duplicates refreshes.
5. On WebSocket reconnect, fetch authoritative HTTP state.
6. Staff UI may use a tenant queue channel; public UI must use one private token channel.
7. When Redis is down, mutations still succeed and polling maintains eventual UI correctness.
8. Track connection count, reconnect rate, publish failures, and update latency without logging PII/tokens.

## 15. Error handling and operator messages

Return stable machine codes plus plain-language messages:

| Code | Staff/customer message |
| --- | --- |
| `table_no_longer_available` | This table was just taken. Choose another table. |
| `reservation_not_today` | This reservation is not scheduled for today. |
| `queue_entry_closed` | This queue entry is no longer active. |
| `already_clocked_in` | This staff member is already clocked in. |
| `no_open_work_session` | No active clock-in was found for this profile. |
| `payroll_permission_required` | Administrator access is required to view or change pay rates. |
| `payment_not_confirmed` | Payment has not been confirmed. Retry or verify at the terminal. |

Do not clear the UI or show success until the backend confirms the mutation.

## 16. Test strategy

### 16.1 Backend automated tests

- Payment derivation matrix, group merge, and close-table guard.
- HitPay webhook verification/idempotency.
- Reservation exact local-day filtering and assignment conflicts.
- Queue atomic numbering with concurrent transactions.
- Public queue serializer privacy and WebSocket token isolation.
- Dynamic clock-in/out without shift, double-tap, cross-midnight, break totals.
- RBAC matrix proving payroll fields are absent and endpoints return `403`.
- Migration/backfill tests on a copy-like data fixture.

### 16.2 Frontend component tests

- Payment chip label/colour/icon and tablet wrapping.
- Reservation card only for assigned same-day booking.
- Queue number prominence and realtime state transitions.
- POS queue rail actions and table badge.
- Dynamic profile selection, pending/success/error clock state.
- Timetable live/closed actual blocks.
- Wage components not constructed for unauthorised users.

### 16.3 Live browser end-to-end journeys

Every workflow must be tested on deployed Sakorio domains after deployment, not only against code or local mocks.

1. Walk-in joins queue -> sees Q number -> host pings -> phone updates -> cashier seats -> POS table shows Q number -> order -> terminal payment -> close table.
2. Online reservation for tomorrow -> absent from today's table -> appears next day/local-date simulation -> host assigns/seats -> QR order -> HitPay webhook -> paid chip -> close.
3. Same-day unassigned reservation -> host receives Needs table -> assigns valid table -> seats atomically.
4. Two phones join simultaneously -> unique numbers -> position updates when first cancels.
5. Redis/WebSocket interruption -> customer sees reconnect -> fallback HTTP reflects ping.
6. Staff A/B/C each selects profile -> clocks in without plan -> all live blocks appear -> clocks out -> exact blocks close.
7. Double clock-in tap -> one session only.
8. Waiter inspects browser/network -> no hourly rate/pay fields anywhere.
9. Admin opens payroll -> rates and calculations available -> edit requires permission and persists.
10. iPad/Android tablet landscape and portrait -> table, payment chips, POS queue rail, and attendance selector remain touch-safe with no overlap.

### 16.4 Performance targets

- Table/queue mutation API p95 under 500ms under expected outlet load, excluding external payment latency.
- Realtime ping-to-phone visible update p95 under 2 seconds with healthy Redis/WebSocket.
- POS queue/table event update p95 under 2 seconds.
- Queue number allocation remains correct under at least 20 concurrent joins.
- Timetable month view remains responsive with at least 100 staff work sessions in range.

## 17. Rollout plan

### Release A - privacy and response contracts

- Add payroll permissions and safe DTOs first.
- Add compatibility response fields.
- Deploy and run RBAC/browser network inspection.

### Release B - payment and reservation floor logic

- Deploy canonical payment summary.
- Deploy exact tenant-day reservation query.
- Verify HitPay, terminal, and table-close flows live.

### Release C - queue schema and realtime

- Expand/backfill queue database.
- Deploy dual fields, then public/staff UI.
- Exercise multi-instance Redis and fallback polling.

### Release D - dynamic attendance

- Add provenance/station schema and optional shift clock path.
- Deploy profile selector and actual Timetable blocks behind flag.
- Pilot with three staff profiles for several days.
- Make dynamic attendance the default only after reconciliation against manual times.

### Release E - cleanup

- Remove old queue-ID display and mandatory planned-shift UI.
- Remove compatibility fields after monitoring confirms no old frontend remains.
- Archive test entries and update the master developer handoff/user manual.

## 18. Monitoring, audit, and recovery

Record audit events for:

- manual payment confirmation/reversal;
- reservation assignment/reassignment/seat/finish/no-show;
- queue ping/cancel/no-show/seat;
- clock-in/out and admin time adjustment;
- hourly-rate change and payroll export.

Metrics/alerts:

- payment requests pending over a configured threshold;
- occupied tables with paid state not closed;
- same-day unassigned reservations due soon;
- notified queue entries not seated after threshold;
- WebSocket publish/reconnect failure rate;
- work sessions left open beyond threshold;
- denied payroll access attempts.

Recovery rules:

- Redis outage: HTTP remains authoritative; polling fallback active.
- Payment provider uncertainty: remain `requested`/`unpaid`, never assume paid.
- Clock action timeout: re-fetch open session before allowing retry.
- Reservation seat conflict: keep reservation booked and ask host to choose another table.

## 19. Delivery phases, dependencies, and estimate

| Phase | Deliverable | Depends on | Estimated focused effort |
| --- | --- | --- | --- |
| 0 | Contracts/baseline | None | 0.5–1 day |
| 1 | Payment chips/state | Phase 0 | 1–2 days |
| 2 | Reservation table/day rules | Phase 0 | 1–2 days |
| 3 | Queue numbers + private realtime | Phase 0, migration | 3–5 days |
| 4 | POS queue rail/table badge | Phase 3 | 2–3 days |
| 5 | Dynamic attendance + Timetable | Phase 0, station decision | 4–6 days |
| 6 | Payroll privacy | Can start early; required before launch | 2–3 days |
| Integration | Live browser regression, tablet QA, docs | All | 2–4 days |

Expected total: approximately 16–26 focused developer-days, depending on attendance kiosk authentication, realtime infrastructure issues, and live payment test access. This is an engineering range, not a launch promise.

## 20. Definition of done

The programme is complete only when all conditions are true:

- Payment chip is correct for empty, unpaid, requested, failed, terminal/cash-confirmed, and verified online-paid states.
- No future reservation appears as today's table state.
- Same-day assigned reservations appear only on their assigned table.
- Customer queue number is stable, large, private, and realtime while the page is open.
- POS shows and can operate the same queue numbers with permission checks.
- Staff can clock in/out without a planned shift and Timetable reflects actual time/date.
- At most one open work session exists per staff user.
- Non-admin API responses contain no hourly rate or calculated wage data.
- Owner/admin payroll access and rate editing still work.
- Backend, frontend, migration, and security tests pass.
- Angular production build has no compiler errors.
- Container logs contain no new runtime errors.
- All priority journeys pass on the live staff/customer domains in phone and tablet viewports.
- Change report and master developer handoff are updated with actual endpoint/schema names after implementation.

## 21. Developer handoff checklist

Before implementation:

- Read `docs/0132-sakorio-pos-developer-handoff-2026-07-26.md`.
- Read current payment/queue/attendance QA documents and `docs/testing.md`.
- Sync `development` and preserve tenant data.
- Confirm tenant timezone and HitPay sandbox access.
- Confirm whether the shared attendance tablet will use an admin session temporarily or a dedicated station token/PIN from first release.

For every phase:

- Add migration first when schema changes.
- Add backend tests and typed response contracts.
- Add frontend implementation and component tests.
- Run Angular production compiler/build check.
- Check frontend/backend/container logs.
- Deploy backend-compatible changes before frontend-dependent changes.
- Perform live browser QA on `staff.sakorio.com` and `order.sakorio.com`.
- Record test evidence, regressions, and final score in a dated document.
- Commit and push completed work to `development`; promote to production only under the repository release rules.

## 22. Recommended implementation order

Implement in this order to reduce risk and avoid rework:

1. Payroll privacy and safe DTOs (security boundary).
2. Canonical payment summary (small, visible operational win).
3. Tenant-local reservation table filtering.
4. Queue schema and atomic numbering.
5. Customer private realtime queue channel.
6. POS queue rail and seated queue table badge.
7. Dynamic attendance backend.
8. Attendance kiosk/profile UI and actual Timetable blocks.
9. Full live browser and tablet regression.

This order protects sensitive data first, establishes shared backend contracts before UI duplication, and leaves the higher-risk attendance conversion until payment, reservation, and queue flows are stable.
