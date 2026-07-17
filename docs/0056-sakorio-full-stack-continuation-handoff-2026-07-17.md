# Sakorio POS Full-Stack Continuation Handoff

**Date:** 17 July 2026

**Repository:** `https://github.com/rtjz318/sakorio-pos`

**Continuation branch:** `development`

**Audience:** The next senior full-stack developer taking over Sakorio POS

**Status:** Continuation-ready. Not yet production-ready until the acceptance gates in this document pass.

## 1. Read This First

This is the authoritative continuation document for the current branch. Earlier documents remain useful for design rationale and implementation history:

- `docs/0053-sakorio-handoff-2026-07-06.md`: deployment history, earlier cashier work, and prior verification notes.
- `docs/0054-sakorio-reservation-queue-integration-brief.md`: reservation and queue architecture.
- `docs/0055-pos-tables-orders-development-brief.md`: detailed POS, tables, and orders UX/technical design.
- `docs/PRINTING.md`: original printing documentation.

Use this document to decide what to do next. Do not infer production readiness from a feature being present in source code. The distinction used below is:

- **Implemented:** code and migrations exist on this branch.
- **Browser-verified:** a real local or Sakorio-hosted browser flow was exercised during development.
- **Pending acceptance:** the feature still needs provider, hardware, deployment, or end-to-end validation.

## 2. Product Scope and Intended Operating Model

Sakorio is a multi-tenant restaurant operations platform serving small outlets. A cashier and host share the same practical operator access. The main operating surfaces are:

- cashier POS and table bills;
- active orders and kitchen display;
- dining tables and table-specific self-order QR codes;
- public queue/waitlist QR and mobile queue status;
- reservations and host seating workflow;
- menu/catalogue and inventory support;
- attendance, schedules, photo clock-in/out, and hourly pay summaries;
- printer configuration, kitchen tickets, and customer receipts;
- reports split by payment rail: HitPay, external card terminal, and cash.

Split-tender payment is deliberately out of scope. “Split payments” in the business request means reporting payment methods separately, not dividing one bill across multiple tenders.

## 3. Runtime Architecture

### 3.1 Repository applications

| Component | Path | Runtime | Responsibility |
| --- | --- | --- | --- |
| Backend API | `back/` | FastAPI, SQLModel/SQLAlchemy, PostgreSQL | Auth, tenants, POS, orders, tables, queue, reservations, attendance, reports, payments, printing |
| Staff/owner/public web | `front/` | Angular, nginx production image | Operator UI, owner tools, public menu, public queue, hosted routing |
| Printer agent | `printer-agent/` | Python | Outbound polling, LAN receipt delivery, dry-run support |
| PostgreSQL | Render managed database | PostgreSQL | Tenant and operational data |
| Redis | Render managed Redis/Valkey | Redis-compatible | Existing cache/rate-limit/realtime support |

The current front end serves role- and host-aware surfaces from one Angular codebase. Host separation must remain intact so authentication on the staff domain does not convert the public ordering domain into a staff dashboard.

### 3.2 Hosted domains

| Domain | Intended use |
| --- | --- |
| `https://app.sakorio.com` | owner/management application |
| `https://staff.sakorio.com` | cashier, host, kitchen, attendance, and operations |
| `https://order.sakorio.com` | public table ordering and public queue/waitlist |
| `https://api.sakorio.com` | backend API and webhooks |

These domains were previously configured in Render. New source changes in this handoff still require deployment and final hosted QA.

### 3.3 Security boundary

- Tenant data must always remain tenant-scoped in backend queries.
- Public table access uses table/public tokens rather than staff authentication.
- Public queue access uses a permanent tenant queue token.
- Printer agents authenticate outbound to the API; the cloud service does not connect inbound to restaurant LAN printers.
- Provider credentials and database credentials belong in Render environment variables or encrypted tenant settings, never source control.
- `qa/runtime-inspect.spec.js` now requires `QA_EMAIL` and `QA_PASSWORD`; it contains no fallback credentials.

## 4. Current Implemented State

### 4.1 Roles and navigation

Implemented:

- Cashier and host are aligned for the small-outlet operating model.
- Kitchen and beverage work are consolidated under one kitchen display route.
- The guest feedback staff navigation entry was removed.
- Role permissions and staff menu/token behavior have focused backend tests.

Relevant files:

- `back/app/permissions.py`
- `front/src/app/services/permission.service.ts`
- `front/src/app/services/staff-layout.service.ts`
- `front/src/app/shared/sidebar.component.ts`
- `back/tests/test_role_permissions.py`
- `back/tests/test_staff_menu_token.py`

### 4.2 Cashier POS, tables, and orders

Implemented:

- Self-checkout-inspired cashier item picker with product photos, categories, customization, cart quantities, and a persistent payment dock.
- Table-linked bills with support for opening an existing live bill and adding subsequent items.
- Cash, external card terminal, and HitPay payment selections.
- Orders grouped and filtered for table/service context instead of an undifferentiated card wall.
- Settled orders are separated from actionable active work.
- Table cards expose table orders and direct POS continuation.
- Table state transitions are coordinated with seating and active bills.
- Queue/reservation guests can be handed to a dining table and then into POS.

Browser-verified during development:

- selecting a table and building an order;
- adding customized items;
- reopening a table-linked bill and adding more items;
- cash/terminal operator flows;
- table orders opening from table context;
- public QR order appearing in Orders and Kitchen.

Pending acceptance:

- full hosted cashier regression after this branch deploys;
- concurrent tablet/operator behavior;
- failure recovery when a payment succeeds but the browser disconnects;
- load and long-shift testing with a realistic order volume.

Primary files:

- `front/src/app/cashier-pos/cashier-pos.component.ts`
- `front/src/app/tables/tables.component.ts`
- `front/src/app/orders/orders.component.ts`
- `back/tests/test_cashier_order_lifecycle.py`
- `docs/0055-pos-tables-orders-development-brief.md`

### 4.3 Kitchen display

Implemented:

- One kitchen workspace for kitchen and beverage stations.
- New/preparing/ready progression with order and station context.
- Public QR and cashier orders feed the same operational pipeline.
- Kitchen ticket printing is queued when qualifying orders are released.

Browser-verified during development:

- orders appeared in the kitchen display;
- kitchen status progression worked in the tested environment.

Pending acceptance:

- multi-station routing with production menu data;
- simultaneous kitchen screens;
- audible/visual urgency and long-running service testing;
- physical kitchen ticket output.

Primary files:

- `front/src/app/kitchen-display/kitchen-display.component.ts`
- `front/src/app/kitchen-display/kitchen-display.component.spec.ts`
- `back/app/printing_service.py`

### 4.4 Public self-order QR

Implemented:

- Each dining table can carry a public self-order token/QR.
- Public menu orders remain associated with the scanned table.
- Public orders enter the same Orders and Kitchen pipeline.
- Public checkout exposes the configured online payment route.
- Table QR and public host routing are isolated from staff-domain authentication.

Browser-verified during development:

- a table QR opened the public menu;
- a public order was created and appeared in staff Orders/Kitchen;
- the public and staff domains no longer redirected into one another after the host-routing fixes.

Pending acceptance:

- production QR print quality and physical table scanning;
- complete HitPay hosted checkout and return/webhook flow;
- retry/idempotency behavior under mobile network interruption.

### 4.5 Queue/waitlist and reservations

Implemented:

- Permanent public queue token per tenant.
- Public mobile waitlist join/status/cancel flow under `front/src/app/waitlist-public/`.
- Host queue board with search, urgency, party details, table suggestions, and seating actions.
- Reservation arrivals can converge into the same host/table workflow.
- Queue entries and reservations can be assigned to tables.
- Seating activates the table; clearing a completed service updates the linked reservation lifecycle.
- Queue completion status migration is included.

Browser-verified during development:

- public waitlist join and cancellation;
- reservation-to-table assignment;
- queue/reservation host workflow on Sakorio/local surfaces.

Pending acceptance:

- after API restart/deployment, verify that a future-dated reservation never displays as “Due now” solely because its time of day has passed;
- realistic queue concurrency and duplicate mobile submissions;
- notification/SMS behavior if enabled later;
- complete hosted queue QR print-and-scan acceptance.

Primary files:

- `front/src/app/queue/queue.component.ts`
- `front/src/app/reservations/reservations.component.ts`
- `front/src/app/waitlist-public/`
- `front/src/app/shared/host-portal.util.ts`
- `back/tests/test_reservation_table_assignment.py`
- `back/tests/test_seating_activates_table.py`
- `back/tests/test_close_table_finishes_seated_reservation.py`
- `docs/0054-sakorio-reservation-queue-integration-brief.md`

### 4.6 Printing

Implemented:

- Printer agent registration/heartbeat and printer configuration API.
- Idempotent print jobs and station routing.
- Kitchen ticket jobs on qualifying order events.
- Customer receipt jobs after a paid settlement.
- Printer settings UI.
- Outbound-only restaurant agent with `PRINTER_DRY_RUN=true` support.

Recorded local validation:

- a paid test bill produced one kitchen and one customer receipt job;
- jobs remained pending when no printer agent was running, which is expected.

Pending acceptance:

- no physical receipt printer has been tested;
- validate ESC/POS formatting, paper width, character encoding, cutting, duplicate prevention, reconnect behavior, and LAN port `9100` delivery;
- validate one kitchen receipt plus one customer receipt for cash, terminal, and HitPay settlement.

Primary files:

- `back/app/printing_routes.py`
- `back/app/printing_service.py`
- `front/src/app/settings/printing-settings.component.ts`
- `printer-agent/`
- `back/tests/test_printing_service.py`
- `docs/PRINTING.md`

### 4.7 Attendance, scheduling, and pay summaries

Implemented:

- Employee attendance profile and hourly rate data.
- Scheduled shift selection.
- Mandatory live photo proof for the intended clock-in/out workflow.
- Clock-in/out sessions, recent records, exception handling, and reports.
- Monthly worked-hours and estimated pay summaries.
- Working-plan and user-management integration.

Pending acceptance:

- real iPad/tablet front-camera capture;
- image size, retention, access-control, and privacy policy validation;
- overnight shift, missed clock-out, manager correction, timezone, and payroll rounding scenarios;
- legal/payroll review before treating calculated values as payroll output.

Primary files:

- `back/app/work_session_serialization.py`
- `front/src/app/my-shift/my-shift.component.ts`
- `front/src/app/users/users.component.ts`
- `front/src/app/working-plan/working-plan.component.ts`
- `front/src/app/reports/reports.component.ts`
- `back/tests/test_work_session.py`
- `back/tests/test_schedule_export.py`

### 4.8 Reports

Implemented:

- Sales reporting by HitPay, external terminal, and cash.
- Attendance/hours/pay summary integration.
- Supporting report UI and styles.

The system does not implement split tender. Keep reports based on the actual settlement method recorded for each bill.

Primary files:

- `back/app/reports_routes.py`
- `front/src/app/reports/reports.component.ts`
- `front/src/app/reports/reports.component.html`
- `front/src/app/reports/reports.component.scss`

## 5. Database Migrations Included in This Checkpoint

Run migrations in version order before deploying the new API/frontend behavior:

| Migration | Purpose |
| --- | --- |
| `20260715120000_add_guest_queue_public_token.sql` | Permanent public queue token |
| `20260715123000_add_printer_agents_and_jobs.sql` | Printer agents, configuration, jobs, and delivery state |
| `20260715143000_add_attendance_profiles_and_photo_proofs.sql` | Attendance profile, hourly rate, and photo proof support |
| `20260717123000_add_completed_guest_queue_status.sql` | Completed queue lifecycle state |

Use the repository migration runner. From `back/`:

```powershell
python -m app.migrate
```

For the local Docker stack:

```powershell
docker exec pos-back python -m app.migrate
```

On Render, run the equivalent command as a one-off job or shell against the production/staging database environment before replacing the API instance. Back up the database first. Never point a local migration command at Render’s internal-only hostname; use the Render shell or the external database URL as appropriate.

## 6. Deployment Sequence

1. Back up the Render PostgreSQL database.
2. Confirm the `development` branch commit intended for deployment.
3. Apply all pending migrations using `python -m app.migrate`.
4. Deploy the backend/API service first.
5. Verify API health, queue public endpoint, auth, POS order reads, and printing agent endpoints.
6. Deploy the Angular services/images serving `app`, `staff`, and `order`.
7. Clear CDN/browser cache or use an incognito session for acceptance.
8. Verify domain isolation: staff login must not make `order.sakorio.com` render the staff dashboard.
9. Run the acceptance checklist in section 9.
10. Configure and start a printer agent only after API/database acceptance.

Do not put HitPay API URLs, webhook URLs, or public application URLs into the wrong variables. `HITPAY_API_URL` is HitPay’s provider API base, not Sakorio’s webhook URL. The Sakorio webhook receiver remains under the API domain.

## 7. Highest-Priority Remaining Work

### P0: HitPay returns an internal error

**Resolved on 18 July 2026 in `c85618d8` (`Fix rate-limited payment endpoints`).**

The hosted API had been failing at the rate-limited payment endpoints before the HitPay provider flow could complete. The fix added the required Starlette/FastAPI `Response` parameter to the rate-limited payment endpoints so SlowAPI can inject rate-limit headers without raising `parameter response must be an instance of starlette.responses.Response`.

Hosted browser verification after Render deployed `c85618d8`:

- Public QR order #47 on `order.sakorio.com` opened a real HitPay sandbox checkout, completed with a HitPay sandbox test card, returned to Sakorio's public payment-success page, and changed T07 to a paid/ready table.
- Staff POS order #48 on `staff.sakorio.com` opened a real HitPay sandbox checkout, completed with a HitPay sandbox test card, returned to POS with `paymentReturn=hitpay&status=completed`, changed T04 to paid/ready, and increased paid-today totals.
- Staff Orders no longer showed the paid T04/T07 orders in the active unpaid overview.
- Kitchen received the paid QR/POS tickets once each with table/order context and HitPay provider references.
- Reports separated HitPay from Terminal and Cash after the sandbox settlements.
- Render API logs showed no fresh payment 500/traceback after the fix; the only visible log errors during the check were unrelated missing demo product image uploads returning 404.
- `test_hitpay_webhook_replay_is_idempotent` now covers duplicate signed webhook replay and asserts only one customer receipt job is queued.
- Hosted cancelled/failed return recovery now keeps public QR and staff POS bills unpaid/retryable with clear recovery messaging.

The original failure is no longer the blocker. Keep the remaining payment acceptance notes below for idempotency, failure-mode, and production-account readiness.

Next developer actions:

1. Keep provider status/error logging sanitized; never log keys or salts.
2. Before production, swap to production HitPay credentials/base URL only in Render environment variables and repeat the end-to-end checkout with a low-value live transaction.

Relevant endpoints include:

- `POST /orders/{order_id}/create-hitpay-payment-request`
- `POST /orders/{order_id}/confirm-hitpay-payment`
- `POST /payments/hitpay/webhook`

Do not mark online payments fully production-accepted until production HitPay credentials/base URL are configured and a low-value live transaction has been tested. Hosted sandbox checkout, redirect reconciliation, failed/cancelled recovery, reports separation, and duplicate webhook idempotency coverage have passed for both public QR and cashier POS where applicable.

### Future fix: Physical printing has not been accepted

The software queue/agent path exists, but no real printer was available. Complete the hardware matrix in section 9 before a shop rollout.

As of 18 July 2026, printer acceptance is intentionally parked behind HitPay completion. Keep printer work documented, but do not block the current HitPay continuation on physical printer hardware.

### P1: Hosted end-to-end regression after this deploy

The uncommitted checkpoint includes coordinated backend, migration, frontend, queue, attendance, and printing changes. Run a complete hosted regression after deployment rather than validating pages independently.

### P1: Attendance tablet and payroll acceptance

Verify real-time photo capture on the target iPad and confirm the employer’s rounding/payroll rules. The current calculated pay is operational guidance, not payroll certification.

### P1: Reservation date presentation

Verify the date-aware upcoming reservation response after the API restarts. Specifically test tomorrow’s reservation with an earlier time of day and ensure it does not show as currently due.

## 8. Development and Verification Commands

### Local stack

```powershell
cd "C:\Users\Rick\Documents\New project\pos"
docker compose up -d --build
docker exec pos-back python -m app.migrate
```

### Frontend build

```powershell
docker exec pos-front npm run build
```

### Focused backend suite

```powershell
docker exec pos-back python -m pytest -q `
  tests/test_role_permissions.py `
  tests/test_staff_menu_token.py `
  tests/test_printing_service.py `
  tests/test_work_session.py `
  tests/test_cashier_order_lifecycle.py `
  tests/test_reservation_table_assignment.py `
  tests/test_seating_activates_table.py `
  tests/test_close_table_finishes_seated_reservation.py `
  tests/test_schedule_export.py
```

### Authenticated browser screenshots

Set credentials only in the process environment:

```powershell
$env:QA_BASE_URL="https://staff.sakorio.com"
$env:QA_EMAIL="<qa-user>"
$env:QA_PASSWORD="<qa-password>"
npx playwright test qa/runtime-inspect.spec.js
```

Generated screenshots and Playwright output are intentionally ignored by Git.

## 9. Acceptance Checklist

### Authentication and tenant isolation

- [ ] Owner can sign in at `app.sakorio.com`.
- [ ] Cashier/host can sign in at `staff.sakorio.com` with intended permissions.
- [ ] Public `order.sakorio.com` remains public while staff is signed in elsewhere.
- [ ] One tenant cannot read or mutate another tenant’s tables, orders, queue, reservations, attendance, printers, or reports.

### POS, tables, orders, and kitchen

- [ ] Cashier selects a table, adds a simple item, customizes an item, changes quantities, and settles cash.
- [ ] Cashier repeats the flow with external terminal settlement.
- [ ] A table with a live bill can receive additional items without creating an unrelated duplicate bill.
- [ ] Table view displays all relevant active orders and history cleanly.
- [ ] Settled orders leave the active action queue and remain in history/reports.
- [ ] Kitchen receives cashier and public QR orders once each.
- [ ] Kitchen progression new → preparing → ready is reflected across screens.
- [ ] Clearing a paid table leaves no stale live bill or occupied state.

### Queue and reservations

- [ ] Public queue QR opens the mobile join screen.
- [ ] Customer can join, view position/status, and cancel.
- [ ] Host can search, prioritize, seat, and complete queue entries.
- [ ] Reservation can be assigned to a suitable table and handed into POS.
- [ ] Future-dated reservations show correct timing.
- [ ] Seating and clearing update reservation, queue, and table states consistently.

### Public table ordering and HitPay

- [ ] Every active table QR opens the correct tenant/table menu.
- [ ] Customer places an order and it appears in dashboard, Orders, and Kitchen.
- [ ] HitPay sandbox checkout opens a real provider URL.
- [ ] Successful payment reconciles after return and webhook, exactly once.
- [ ] Failed/cancelled payment remains recoverable and does not mark the order paid.
- [ ] Payment report records HitPay separately from terminal and cash.

### Printing

- [ ] Printer agent registers, heartbeats, leases, completes, and retries jobs.
- [ ] Paid order creates exactly one kitchen ticket and one customer receipt where configured.
- [ ] Real kitchen and customer printers produce readable output.
- [ ] No duplicate print occurs after agent restart or network retry.
- [ ] Dry-run output is correct before enabling raw socket printing.

### Attendance

- [ ] Employee can select their scheduled shift.
- [ ] Live camera capture is required and uploaded at clock-in/out as configured.
- [ ] Hours are correct for normal, overnight, late, and corrected shifts.
- [ ] Manager can review exceptions without exposing another tenant’s records.
- [ ] Pay summary matches the approved hourly-rate and rounding policy.

### Responsive and operational UX

- [ ] Cashier POS is usable at the target tablet resolution without hidden checkout actions.
- [ ] Kitchen display works on the target screen and does not overlap text.
- [ ] Host queue/table view supports realistic table and queue counts.
- [ ] Empty, loading, offline, unauthorized, provider-error, and retry states are understandable.

## 10. Current Verification Record

Earlier checkpoints recorded successful frontend Docker builds and focused backend test runs in `docs/0053-sakorio-handoff-2026-07-06.md`. Browser work also verified the core queue, reservation assignment, QR-order-to-kitchen, and local cash/terminal flows described above.

Final local verification for this handoff checkpoint on 17 July 2026:

- `docker exec pos-back python -m pytest ...`: **39 focused tests passed** with one upstream Starlette/httpx deprecation warning.
- `docker exec pos-front npm run build`: **production build passed**.
- `git diff --cached --check`: **passed** after whitespace cleanup.
- staged credential scan: **no embedded Sakorio account, database, or HitPay credentials found**; only generic documentation examples matched.

The frontend build reports non-blocking optimization warnings:

- the cashier POS component stylesheet is approximately 7.93 kB above its configured 40 kB component budget;
- the QR library uses `dijkstrajs` and `pngjs` CommonJS modules.

These warnings should be reduced in a later performance pass, but they do not prevent the production bundle from completing. The successful local checks are useful regression evidence, but they do not replace the hosted checklist against the final commit. Provider and printer acceptance remain explicitly open.

## 11. Source Map for the Next Developer

Start with these locations rather than searching the entire repository blindly:

- API composition/routes: `back/app/main.py`
- Data models: `back/app/models.py`
- Permissions: `back/app/permissions.py`
- Reports: `back/app/reports_routes.py`
- Printing: `back/app/printing_routes.py`, `back/app/printing_service.py`
- Attendance serialization: `back/app/work_session_serialization.py`
- Migrations: `back/migrations/`
- Cashier POS: `front/src/app/cashier-pos/`
- Tables: `front/src/app/tables/`
- Orders: `front/src/app/orders/`
- Kitchen: `front/src/app/kitchen-display/`
- Queue: `front/src/app/queue/`
- Reservations: `front/src/app/reservations/`
- Public waitlist: `front/src/app/waitlist-public/`
- Frontend API contracts: `front/src/app/services/api.service.ts`
- Routes/host behavior: `front/src/app/app.routes.ts`, `front/src/app/auth/`, `front/src/app/shared/host-portal.util.ts`
- Printer settings: `front/src/app/settings/printing-settings.component.ts`
- Printer runtime: `printer-agent/`
- Browser QA: `qa/runtime-inspect.spec.js`

## 12. Recommended First Working Session

1. Pull `origin/development` and read this document plus `0054` and `0055`.
2. Start the local Docker stack and apply migrations.
3. Run the focused tests and frontend build before changing code.
4. Reproduce the HitPay 500 with sanitized backend logging and resolve it first.
5. Complete the provider return/webhook regression.
6. Deploy API then frontend to Render and run the hosted acceptance checklist.
7. Set up a printer agent in dry-run mode, then schedule physical printer acceptance.
8. Validate attendance on the actual iPad.
9. Only after these gates pass, perform lower-priority visual polish and performance work.

## 13. Handoff Definition

The branch is suitable for another developer to continue because the implementation, migrations, tests, architecture, deployment sequence, and open risks are now documented together. It must not be sold as production-complete until HitPay, real printing, hosted cross-surface regression, and attendance hardware acceptance are complete.
