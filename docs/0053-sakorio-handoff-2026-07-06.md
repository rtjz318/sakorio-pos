# Sakorio Handoff - 2026-07-06

Repository: `https://github.com/tanjunnan0101/pos`

Branch used locally: `development`

Local path: `C:\Users\Rick\Documents\New project\pos`

## Current Objective

This repo is now the active Sakorio restaurant POS base. The earlier QR/Nest project is no longer the implementation target. Work in this repo has focused on making the existing Angular + FastAPI stack fit Sakorio's restaurant operations flow, especially:

- payment-type sales reporting
- cashier POS workflow refinement
- product category/subcategory editing
- staff navigation into a dedicated cashier surface
- reservation-to-host-stand unification
- queue / waitlist operations for walk-ins and next-available seating

## What Was Added Or Changed

### 1. Cashier POS module

Primary frontend surface:

- `front/src/app/cashier-pos/cashier-pos.component.ts`

Route added:

- `/pos`

Purpose:

- dedicated cashier flow separate from the generic orders page
- table-aware item picking
- cart review
- settlement path selection
- reopen / continue / collect-payment handling for live table bills

Implemented direction so far:

- cashier-first screen instead of forcing staff through generic order cards
- product cards support photos where present
- category filtering and product search live in the cashier lane
- selected-table state and linked order state are surfaced inside the cashier flow
- live bill continuation is supported, so staff can add more items to an existing table bill instead of being forced into a fresh order
- queue/history language was tightened toward cashier wording:
  - `Continue`
  - `Settle`
  - `Receipt`
  - `Collect`
  - `Resume`
- queue ranking now prefers cashier urgency instead of pure recency
- post-settlement recovery now moves the cashier toward the next useful table state and next clear bill-ready table
- another compactness pass was applied after the initial handoff:
  - wider floor/table lane in the cashier grid
  - cleaner table-card action hierarchy with the primary operator action surfaced first
  - reduced metadata pressure inside table cards to avoid status / payment wrap collisions
  - denser settlement dock cards and tighter payment-mode layout
  - more predictable outcome / settlement action stacking in narrow counter widths
  - tighter queue/history rail cards with clearer primary/secondary action emphasis
  - safer tablet-width fallback for grouped queue actions and history rows
  - simpler queue-group pills and more direct order-review wording for the cashier rail
  - final cashier copy cleanup so the dock now uses shorter action-first language:
    - `Choose a table to begin`
    - `Live bill with add-ons`
    - `Use terminal`
    - `Take cash`
    - `Ready for a new bill`
  - checkout / queue polish now also includes:
    - a pinned active-settlement summary inside the checkout rail while cart lines scroll
    - the active settlement mode folded into the summary pill row instead of its own column
    - denser grouped queue preview tiles for faster table-by-table scanning
  - an additional Phase D operator-language pass now keeps the cashier rail tighter:
    - selected-table status copy is shorter:
      - `Open bill #...`
      - `Ready to pay #...`
      - `Last settled #...`
      - `No active bill`
    - grouped queue actions are reduced to primary verbs:
      - `Settle`
      - `Resume`
      - `Counter`
    - grouped queue hints were shortened to cashier prompts instead of full sentences
    - no-table checkout empty states now use:
      - `Choose table`
      - `Open floor`
    - grouped queue cards now place the main cashier action first and the order-review action second
    - linked-ticket history pills are shorter:
      - `live`
      - `settled`
      - `tickets`
    - compact settlement mode cards were re-balanced for better tablet scan speed
    - the selected-table dock and payment-state strip were toned down visually so the main checkout CTA carries the weight
  - reservation adoption work has now started inside Sakorio cashier/tables surfaces:
    - staff Tables now reads `CanvasTable` / `getTablesWithStatus()` instead of the thinner base table payload
    - table list rows and table tiles can now surface upcoming reservation timing and guest context
    - table operator copy now distinguishes:
      - `Live bill`
      - `Reserved soon`
      - `Ready for bill`
      - `Idle table`
    - cashier POS left rail now surfaces reservation guest/time for upcoming bookings when no live bill is attached
    - cashier POS bill dock header now surfaces reservation timing/guest context so cashiers can see who the table is being held for before opening a new ticket
    - reservation visibility was added without breaking add-on order continuation for already-open table bills

### 2. Reports now include Sakorio payment buckets

Backend:

- `back/app/reports_routes.py`
- `back/app/report_export_i18n.py`
- `back/app/main.py`
- `back/app/models.py`

Frontend:

- `front/src/app/reports/reports.component.ts`
- `front/src/app/reports/reports.component.html`
- `front/src/app/reports/reports.component.scss`

Behavior added:

- reporting grouped by Sakorio payment buckets:
  - `cash`
  - `terminal`
  - `hitpay`
  - `other`
- reports UI shows payment method totals
- CSV export supports payment dataset
- Excel export includes a payment-method worksheet

This is the accepted replacement for the earlier "split payment" wording. There is no multi-payer bill split flow in scope.

### 3. Product category management was expanded

Primary frontend surface:

- `front/src/app/products/categories.component.ts`

Backend support:

- `back/app/tenant_subcategories.py`
- `back/app/tenant_subcategory_routes.py`

Current category-management direction:

- add category
- rename custom top-level category
- delete custom top-level category
- add subcategory
- edit subcategory
- delete subcategory

### 4. Demo floor seeding compatibility

Backend:

- `back/app/seeds/seed_demo_tables.py`

Why it changed:

- the demo floor seed now inserts `is_active` and `seating_zone` when creating a fallback floor row
- this keeps fresh staging/demo databases compatible with the current floor schema instead of failing on missing required fields

Important note:

- standard built-in categories remain protected
- custom categories are editable/removable

### 4. Staff shell and navigation were adjusted

Files touched:

- `front/src/app/app.routes.ts`
- `front/src/app/dashboard/dashboard.component.ts`
- `front/src/app/orders/orders.component.ts`
- `front/src/app/shared/sidebar.component.ts`
- `front/src/app/shared/staff-pos-toolbar.component.ts`
- `front/src/app/services/api.service.ts`
- `front/src/app/services/permission.service.ts`

Purpose:

- expose the cashier route as a first-class staff tool
- support new POS/taskboard flows
- keep staff navigation aligned with Sakorio operations

### 5. Deployment/dev proxy updates

Files touched:

- `front/src/proxy.conf.json`
- `haproxy/haproxy.cfg`
- `front/scripts/codex-live-api-proxy.mjs`

Purpose:

- support local development against the live API when needed
- improve local POS iteration without constant Render redeploys

### 6. Guest queue backend and frontend API wiring

Backend already added:

- `back/app/models.py`
- `back/app/main.py`
- `back/migrations/20260712120000_add_guest_queue_entry.sql`

What exists now:

- `GuestQueueEntry` persistence model
- queue statuses:
  - `waiting`
  - `notified`
  - `seated`
  - `converted_to_reservation`
  - `cancelled`
  - `no_show`
  - `expired`

### 7. Queue visibility is now bridged into staff operations

Frontend bridge completed:

- `front/src/app/dashboard/dashboard.component.ts`
- `front/src/app/tables/tables.component.ts`
- `front/public/i18n/en.json`

What changed:

- Dashboard now exposes a first-class `Guest queue` quick action card
- the dashboard queue card reads live queue summary counts when the reservations module is enabled
- Tables now includes a compact host-stand pulse panel above the floor workspace:
  - waiting guests
  - notified guests
  - total visible queue entries
  - direct `Open host stand` jump

Why this matters:

- front-of-house staff can now see queue pressure without leaving the live floor context
- reservation + walk-in traffic is starting to converge into one operator flow instead of staying isolated in separate modules

Current stop point:

- queue awareness is now visible from Dashboard and Tables
- reservation-arrival awareness is now bridged into the Tables operator surface
- best-fit queue seating suggestions are now derived from the live table model using:
  - seat count
  - preferred floor
  - preferred table size
  - reservation pressure on candidate tables
- queue/frontend compile alignment was corrected around:
  - `getGuestQueueSummary()`
  - `CanvasTable.seat_count`
  - floor lookup by `floor_id`
- queue-aware cashier POS handoff is now wired:
  - queue seating opens POS with:
    - `tableId`
    - `queueEntryId`
    - guest name
    - phone
    - party size
    - notes
  - cashier POS now consumes queue handoff as a first-class prefill source alongside reservation handoff
  - cashier order creation now uses a unified handoff prefill source
  - cashier query sync clears stale queue/reservation params when the operator changes table/order focus
- next integration slice should connect:
  - owner/admin queue conversion reporting
  - owner/admin queue volume / wait-time rollups
  - host-stand layout/product polish
- queue sources:
  - `walk_in`
  - `phone`
  - `web_waitlist`
  - `staff_manual`
- queue endpoints:
  - `GET /queue`
  - `GET /queue/summary`
  - `POST /queue`
  - `GET /queue/{id}`
  - `PUT /queue/{id}`
  - `PUT /queue/{id}/status`
  - `PUT /queue/{id}/seat`
  - `PUT /queue/{id}/convert-to-reservation`
- websocket publishing for:
  - queue created
  - queue updated
  - queue status changes
  - queue seating
  - queue conversion

Frontend API service wiring already added:

- `front/src/app/services/api.service.ts`

What exists there now:

- queue DTOs / interfaces
- queue REST methods
- queue websocket subject stream

### 7. Queue frontend route and navigation

Frontend queue surface:

- `front/src/app/queue/queue.component.ts`

This screen now exists as the host-stand board for:

- adding walk-ins
- reviewing queue lanes
- notifying guests
- seating guests onto available tables
- converting queue entries into future reservations
- jumping seated guests directly into POS

The missing integration bridge has now been wired:

- route added:
  - `/queue`
- sidebar entry added:
  - `Queue`
- staff toolbar shortcut added:
  - `Queue`
- translation key added:
  - `NAV.QUEUE`

## Working Product State

### Stable enough to keep

- local repo runs and routes correctly through the Angular frontend
- cashier POS route exists
- payment-method reporting exists
- category and subcategory management exists
- product cards can render photos in cashier flow
- first reservation-adoption slice is live in staff Tables and cashier POS surfaces
- guest queue backend exists
- guest queue frontend screen exists
- queue route/nav wiring now exists

### Still needs more polish

The cashier workflow is functional, but it is not yet "done done". Remaining effort is mostly UX/product polish, not missing core infrastructure.

The largest remaining refinement area is:

- making the cashier POS feel consistently fast and obvious under real service pressure
- completing reservation/queue adoption so front-of-house staff can manage:
  - upcoming reservations
  - arriving reserved guests
  - waiting walk-ins
  - seating priority across queue vs reservations
  - conversion from queue to table service with minimal taps
  - walk-in waitlist / queue seating
  - queue-to-table / queue-to-reservation conversion

That includes continued polish around:

- cart layout density
- payment dock clarity
- table-to-order mental model
- table/order recovery after actions
- product customization modal quality
- grouped order visibility by table
- reservation-aware table actions and POS context beyond passive visibility
- a dedicated FOH waitlist / queue module
- repo-wide frontend build hygiene:
  - Angular build currently still fails on unresolved SCSS / SSR path issues outside the cashier module
  - cashier POS work is still valid, but a clean production build for the frontend will require a broader frontend configuration cleanup

## Important Product Decisions Locked In

### Reservation / queue direction

- existing reservation subsystem in this repo is being reused, not rewritten
- Phase 1 started by surfacing reservation context in Sakorio staff tables and cashier POS
- next backend/frontend functional block is the new Sakorio FOH queue / waitlist layer
- queue should remain separate from reservation records, but be linkable to reservations and tables

- No split-bill or multi-party payment workflow is needed.
- Sales reporting by payment type is required.
- HitPay remains the online payment provider.
- POS product cards should support images where useful.
- The current stack should be extended, not rewritten.

## Files Worth Reading First Next Time

- `docs/SAKORIO_POS_REPO_BRIEF.md`
- `docs/0051-cashier-pos-module-plan.md`
- `docs/0052-sakorio-gap-checklist.md`
- `docs/0053-sakorio-handoff-2026-07-06.md`
- `front/src/app/cashier-pos/cashier-pos.component.ts`
- `front/src/app/products/categories.component.ts`
- `back/app/reports_routes.py`

## Render / Deployment Notes

Before deploying this version to Render:

1. Push the current source to GitHub.
2. Make sure the Render service points at this repo and branch.
3. Confirm build/start commands still match this repo's runtime.
4. Confirm environment variables for:
   - frontend API URL
   - backend database
   - Redis
   - HitPay
   - JWT/auth secrets
5. Run migrations for the current backend before switching traffic.

If the old Render setup was pointing at the previous repo or previous branch, it must be updated to this repo and the correct branch before redeploying.

## Recommended Next Work

1. Finish cashier POS UX polish locally first.
2. Smoke-test:
   - table selection
   - add item
   - customize item
   - continue live bill
   - settle with cash
   - settle with terminal
   - settle with HitPay
3. Verify reports reflect those payment outcomes correctly.
4. Only then promote this repo cleanly onto Render.

### Reservation + queue integration stop point

- `/queue` is now live as a real Sakorio host-stand surface rather than a placeholder integration.
- The latest completed queue slice added:
  - board search
  - source filter
  - preferred-floor filter
  - urgency filter
  - visible/action-now/reservation-linked counters
  - smarter lane ordering for notified and long-waiting guests
  - selection sync when active filters hide the previously selected guest
- Current next pickup for queue is:
  1. compress the selected-guest detail rail
  2. tighten reservation-arrival actions on the due-soon cards
  3. visually QA hosted `/queue` density on Sakorio domains

### Latest cashier polish already completed

- The active settlement summary now stays pinned while the cashier cart scrolls, keeping amount due and the primary action visible during settlement.
- Settlement mode was folded into the summary pills so the checkout rail reads as a single compact decision surface.
- Grouped queue previews were tightened into denser tiles for faster scanning at the counter.
- Table-linked history wording now reads as a cashier recovery rail with shorter `Collect`, `Resume`, and `Receipt` actions and clearer live / awaiting-payment / settled bill states.
- Recovery history tiles were tightened further so action buttons sit like compact counter controls instead of wide full-card CTAs.
- Recovery / reopen transitions now use clearer operator notices for settled-bill review, awaiting-payment bills, and next-table handoff into the catalog.
- Another production-density pass was applied to the cashier and kitchen surfaces:
  - cashier grid widths were rebalanced so the table lane, catalog, and checkout dock each have enough width for tablet service
  - table cards now use cleaner top-row alignment, wider action buttons, and less status/payment wrapping pressure
  - product cards were restructured so thumbnails, copy, price, and CTA buttons stay aligned instead of fighting for vertical space
  - kitchen lane cards now give order IDs, status chips, item names, and dropdown controls more width to prevent overlap in hosted layouts
  - kitchen service lanes now scale down more safely on narrower widths without clipping active ticket content

## Hosted Render State (Current Sakorio Mapping)

This repo is now mapped onto the existing Sakorio Render estate instead of the earlier QR/Nest stack.

### Service mapping

- `restaurant-pos-staging-api`
  - repo: `rtjz318/sakorio-pos`
  - branch: `development`
  - root directory: `back`
  - runtime: Python web service
  - purpose: FastAPI backend
  - public host: `https://api.sakorio.com`

- `restaurant-pos-staging-staff-web`
  - repo: `rtjz318/sakorio-pos`
  - branch: `development`
  - root directory: `front`
  - runtime: Docker web service using `Dockerfile.prod`
  - purpose: staff/station interface
  - public host: `https://staff.sakorio.com`

- `restaurant-pos-staging-owner-web`
  - repo: `rtjz318/sakorio-pos`
  - branch: `development`
  - root directory: `front`
  - runtime: Docker web service using `Dockerfile.prod`
  - purpose: owner/admin interface
  - public host: `https://app.sakorio.com`

- `restaurant-pos-staging-customer-web`
  - repo: `rtjz318/sakorio-pos`
  - branch: `development`
  - root directory: `front`
  - runtime: Docker web service using `Dockerfile.prod`
  - purpose: public ordering / customer-facing surface
  - public host: `https://order.sakorio.com`

- `restaurant-pos-staging-redis`
  - reuse for Redis backing where required by the backend

- Render PostgreSQL
  - active database was recreated and re-seeded for the current Sakorio POS repo
  - backend migrations must target the Render Postgres hostname, not the local `db` Docker hostname, when run from Windows

### Important hosted behavior already fixed

- `order.sakorio.com` no longer needs to share the same authenticated dashboard session behavior as `staff.sakorio.com`
- the public customer surface must stay customer-facing even when staff are signed into the staff surface in another tab/session
- kitchen display now loads the live tickets again on the hosted staff surface

### Known hosted sanity baseline

At the point of this handoff, the following have already been exercised in hosted staging:

- owner app loads on `app.sakorio.com`
- staff app loads on `staff.sakorio.com`
- customer/public ordering loads on `order.sakorio.com`
- backend health and auth are wired through `api.sakorio.com`
- Render database + backend migration path were re-established after the Sakorio repo switch

### Still worth QA after each production-facing deploy

- staff login and role navigation
- POS table selection
- add item to an existing live table bill
- cash settlement
- terminal settlement
- HitPay redirect / callback path
- kitchen display ticket movement
- public order flow remaining isolated from staff sessions

## Commit Scope Reminder

This handoff corresponds to the Sakorio customization layer on top of `tanjunnan0101/pos`, not the abandoned QR/Nest codebase.

## 2026-07-12 Status Update

This section is the current pickup point after the later Sakorio staging migration and hosted QA work.

### What is now true

- Sakorio is actively running on the `pos` repo, not the old restaurant QR backend repo.
- Render staging has been remapped onto this repo and re-seeded.
- The public/customer host, staff host, owner host, and API host are all now tied to the same Sakorio codebase.
- Host-specific session behavior was fixed so the public order host no longer always drops staff into the dashboard when they are signed in elsewhere.

### Current staging host picture

- `https://api.sakorio.com`
  - FastAPI backend
  - auth, tables, orders, reports, reservations, catalog, kitchen/bar data, HitPay settings
- `https://app.sakorio.com`
  - owner/admin-capable frontend surface
  - also being used for the main staff POS flow in staging QA
- `https://staff.sakorio.com`
  - staff-facing frontend surface
- `https://order.sakorio.com`
  - public/customer-facing ordering surface

### Render migration outcome so far

- legacy Render service names were reused instead of throwing away the paid staging estate
- backend database was recreated and migrations were rerun against the new Sakorio repo
- frontend services were repointed to the `front` app in this repo
- API CORS / frontend host relationships were re-established for Sakorio domains
- public-vs-staff session isolation on different Sakorio domains was patched after repeated hosted checks

### Verified hosted baseline

At the time of this update, these have already been exercised on hosted staging:

- owner/admin app can load
- staff app can load
- public order app can load
- API health and auth are responding through `api.sakorio.com`
- registration/login path works again after the Sakorio repo switch
- kitchen display tickets were restored after hosted fixes

### Still not considered finished

The most important unfinished area is still frontend operator quality, especially:

- cashier POS layout density and action clarity
- table-card alignment and table-state scanability
- kitchen display layout polish
- smoother hosted staff/operator QA without repeated visual regressions

### Reservations and queue status

- **Reservations are already substantially implemented in this repo.**
- **Guest queue / host waitlist backend scaffolding has now started.**
- The latest reservation adoption slice now goes beyond passive visibility:
  - staff reservation cards can open POS directly once a reservation is seated
  - seating a reservation now immediately hands staff into `/pos` with the chosen table preselected
  - POS can now accept reservation handoff query params for:
    - reservation id
    - guest name
    - phone
    - party size
    - reservation note
  - when a fresh POS bill is created from that handoff, the guest name and reservation note are carried into the created order payload
- Queue backend slice now added in Sakorio repo:
  - new SQLModel entity: `GuestQueueEntry`
  - new enums:
    - `GuestQueueStatus`
    - `GuestQueueSource`
  - new migration:
    - `back/migrations/20260712120000_add_guest_queue_entry.sql`
  - new tenant-scoped queue endpoints:
    - `GET /queue`
    - `GET /queue/summary`
    - `POST /queue`
    - `GET /queue/{queue_entry_id}`
    - `PUT /queue/{queue_entry_id}`
    - `PUT /queue/{queue_entry_id}/status`
    - `PUT /queue/{queue_entry_id}/seat`
    - `PUT /queue/{queue_entry_id}/convert-to-reservation`
  - queue seating intentionally reuses the same table occupancy safeguards as reservations:
    - table group capacity checks
    - active order blocking
    - booked reservation blocking
  - queue events now publish on Redis tenant channel:
    - `queue:tenant:{tenant_id}`

### Current pickup point after queue backend slice

The next meaningful Sakorio integration block is now:

1. build the staff/front-of-house queue board UI on top of the new `/queue` endpoints
2. wire queue seating into the same POS handoff pattern now used by reservations
3. add queue-to-reservation conversion controls in staff UI
4. add reservation/queue visibility to dashboard and reporting surfaces
5. keep polishing hosted operator UX only after the reservation/queue functional rails are in place

This is important for the next developer:

- do **not** rebuild reservations from scratch
- do **not** assume queue management is fully complete just because the backend endpoints now exist
- reservation work should be integrated into Sakorio flows
- queue management should continue as a new FOH/waitlist module that cooperates with reservations, tables, and POS

### Next documentation to read before coding

- `docs/0054-sakorio-reservation-queue-integration-brief.md`
- `docs/0010-table-reservation-implementation-plan.md`
- `docs/0011-table-reservation-user-guide.md`
- `docs/0019-no-show-implementation-plan.md`
- `docs/0051-cashier-pos-module-plan.md`
- `docs/0052-sakorio-gap-checklist.md`

### Recommended next build order

1. finish remaining cashier/KDS/staff UX stabilization on hosted Sakorio staging
2. integrate the existing reservation subsystem into Sakorio navigation and operating flows
3. build FOH queue/waitlist management as a new module on top of current tables + reservation capacity logic
4. wire reservation + queue states into reports, table board, and operator actions

## 2026-07-13 Queue Integration Stop Point

This is the exact continuation point for the next queue-focused implementation pass.

### Confirmed live queue surfaces

Queue is no longer only a backend scaffold. The following are already present in the Sakorio repo:

- backend queue model in [models.py](C:\Users\Rick\Documents\New project\pos\back\app\models.py)
- backend queue routes in [main.py](C:\Users\Rick\Documents\New project\pos\back\app\main.py)
- frontend queue board in [queue.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\queue\queue.component.ts)
- queue API client methods in [api.service.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\services\api.service.ts)
- dashboard queue quick action in [dashboard.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\dashboard\dashboard.component.ts)
- tables queue pulse and seating suggestions in [tables.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\tables\tables.component.ts)
- cashier queue-aware handoff in [cashier-pos.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\cashier-pos\cashier-pos.component.ts)

### Confirmed queue capabilities already working in code

- create walk-in queue entry
- list active queue entries
- load queue summary
- notify guest
- return guest to waiting
- cancel / no-show guest
- seat onto valid table
- convert queue entry into reservation
- open cashier POS after queue seating
- publish queue events over Redis/websocket

### Important queue fields confirmed for next reporting slice

Available queue data already exists for reporting and owner analytics:

- `quoted_wait_minutes`
- `requested_at`
- `notified_at`
- `seated_at`
- `completed_at`
- `status`
- `source`
- `linked_reservation_id`
- `seated_table_id`

### Exact next implementation phase

Do not rebuild queue CRUD or redo the queue route.

The next correct phase is:

1. owner/admin queue reporting
   - queue volume by day
   - average quoted wait
   - average actual seat wait
   - seated conversion rate
   - converted-to-reservation count
   - cancelled / no-show / expired outcomes
2. dashboard enrichment
   - stronger queue health insight than only waiting/notified counts
3. host-stand product polish
   - denser tablet-first lane layout
   - clearer best-fit table reasoning
   - stronger urgency cues when reservations are due soon
4. reservation / queue cross-links
   - jump from reservation flows into queue workflows when required
   - expose queue history linkage where operationally useful

### Recommended first files to touch next

- [reports_routes.py](C:\Users\Rick\Documents\New project\pos\back\app\reports_routes.py)
- [reports.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\reports\reports.component.ts)
- [dashboard.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\dashboard\dashboard.component.ts)

That is the current queue integration stop point.

## 2026-07-13 Queue Reporting Progress Update

Queue integration has now moved one slice forward beyond the earlier stop point.

### Newly completed in this pass

- owner/admin sales reporting now includes a `queue` payload block from [reports_routes.py](C:\Users\Rick\Documents\New project\pos\back\app\reports_routes.py)
- frontend report typings now understand queue analytics in [api.service.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\services\api.service.ts)
- reports UI now has a queue flow section in:
  - [reports.component.html](C:\Users\Rick\Documents\New project\pos\front\src\app\reports\reports.component.html)
  - [reports.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\reports\reports.component.ts)
  - [reports.component.scss](C:\Users\Rick\Documents\New project\pos\front\src\app\reports\reports.component.scss)

### Queue analytics now included in report payload

- total queue entries in range
- waiting count
- notified count
- seated count
- converted-to-reservation count
- cancelled count
- no-show count
- expired count
- average quoted wait minutes
- average actual wait minutes
- seat conversion percentage
- queue-to-reservation conversion percentage
- queue totals by source
- queue totals by outcome/status
- daily queue counts with seated counts

### Important note about verification

Frontend build verification in this workspace currently hits pre-existing Angular/path-resolution issues unrelated to the queue reporting patch. The failure includes unresolved SCSS/component path errors across many existing front-end files, so do not treat that failed build as evidence that the queue reporting slice itself is broken.

### Exact next pickup after this pass

1. verify the reports page visually in the running Sakorio app with real queue data
2. enrich the owner dashboard with queue health cards using the same queue payload concepts
3. add reservation/queue widgets and shortcuts into hosted operator surfaces
4. continue with FOH host-stand polish:
   - tablet queue lane density
   - best-fit table suggestions
   - urgency around near-due reservations

## 2026-07-13 Hosted Queue Deployment Finding

This is the important hosted Sakorio reality check that must be preserved for the next continuation pass.

### What was verified live

Hosted checks against `https://app.sakorio.com` confirmed:

- `/reservations` loads
- `/reports` loads
- `/tables` loads
- `/queue` currently resolves back to `/dashboard`
- the hosted dashboard currently does not expose a visible queue entry point

### What this does and does not mean

This does **not** currently point to a general auth failure or a broken queue backend.

Local code inspection confirmed:

- queue route wiring already exists in:
  - [app.routes.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\app.routes.ts)
- dashboard queue card wiring already exists in:
  - [dashboard.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\dashboard\dashboard.component.ts)
- sidebar queue navigation wiring already exists in:
  - [sidebar.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\shared\sidebar.component.ts)
- tables host-stand queue pulse wiring already exists in:
  - [tables.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\tables\tables.component.ts)

### Root cause confirmed

The hosted build is still missing the queue feature itself because the queue frontend slice is still local-only at this stop point:

- untracked queue feature:
  - [queue.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\queue\queue.component.ts)

So the hosted `/queue` fallback should be treated first as a deployment-content gap, not as a permission bug.

### Exact next pickup from this hosted finding

1. add the queue frontend slice into git
2. include the queue brief/migration/docs changes in the same change set
3. redeploy the Sakorio frontend service
4. re-verify hosted:
   - `/queue`
   - dashboard queue card
   - tables host-stand pulse
   - queue seating into cashier POS

This is the new continuation point after the queue reporting implementation slice.

## 2026-07-13 Host Stand Queue Polish Update

Queue implementation moved one more step in this pass.

### Newly completed

- queue seating on [queue.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\queue\queue.component.ts) now behaves more like a real host stand instead of a generic admin chooser
- seating candidates now render as scored table choices instead of a plain table-name list
- queue now surfaces:
  - best-fit table recommendation
  - exact-fit / near-fit / spare-seat guidance
  - floor label on each candidate
  - upcoming reservation pressure on candidate tables
  - urgency chips for near-due and due-soon reservations

### Product impact

For a selected waiting/notified guest, the host can now see:

- which table is the best immediate seat
- whether a table is safe to use now
- whether a reservation will collide soon
- whether a larger table is being overused for a smaller party

This is the first meaningful pass toward the tablet-first host-stand experience described in the queue brief.

### Remaining queue polish after this pass

1. verify the new host-stand seating guidance visually in the running Sakorio app
2. tighten lane density for tablet use so more cards fit above the fold
3. add stronger best-fit explanations when multiple ready tables compete for one party
4. package and deploy the queue feature set so hosted `/queue` stops depending on local-only files

## 2026-07-13 Host Stand Queue Density Pass

The queue module received a second usability pass focused on tablet scanning speed.

### Newly completed

- the left-side walk-in form is denser and now shows quick floor / clear-table context immediately
- queue lanes are tighter vertically so more guests can fit in view without scrolling
- each lane now surfaces a lead urgency chip so hosts can see the oldest / most urgent guest at a glance
- queue cards now include short action-copy (`Tap to notify or seat`, `Tap to seat or convert`, `Tap to open POS handoff`) instead of relying only on status labels
- table-choice cards and best-fit banners were tightened so table-selection reads more like a host stand tool and less like an admin settings page

### Product impact

This pass should make `/queue` much easier to run from a tablet near the entrance:

- less wasted whitespace
- faster recognition of which lane needs action first
- clearer explanation of what happens when the host taps a guest card

### Remaining queue work after this pass

1. visually QA the tightened `/queue` screen in the running Sakorio app
2. improve competing-table explanations when several tables are all technically valid for one party
3. add final packaging / commit coverage for queue frontend + migration + docs so hosted `/queue` is deployable from git alone

## 2026-07-13 Reservation Arrivals Rail Added To Queue

Queue integration advanced one more host-stand step in this pass.

### Newly completed

- `/queue` now loads same-day booked reservations directly into the host stand screen
- queue now surfaces a dedicated **Reservation arrivals / Due soon** rail above the live lanes
- each arrival card now shows:
  - guest name
  - party size
  - preferred floor when present
  - reservation time
  - urgency label based on minutes-to-arrival
  - current queue linkage when a related queue entry already exists
- hosts can now act from the arrival rail without jumping away:
  - `Send to queue` when no active queue match exists
  - `Open queue` when a linked or recent queue match exists
  - `Open POS` when the reservation already has a table assigned

### Product impact

This gives the host stand one combined operating surface:

- walk-ins already waiting
- guests already called/notified
- reservations due soon that may need queue or floor action

It reduces toggling between `/reservations` and `/queue` during service buildup.

### Remaining queue polish after this pass

1. visually QA the new arrivals rail in the running Sakorio app
2. improve competing-table explanations when several tables are all technically valid for one party
3. package and commit queue frontend + migration + docs so hosted `/queue` is fully deployable from git alone

## 2026-07-14 Reservation Arrival Actions Tightened In Queue

The `/queue` reservation-arrivals rail has now moved beyond passive reminders.

### Newly completed

- each due-soon reservation card now includes a **Best next step** decision panel
- arrival cards now branch their CTA based on current live state:
  - guest already seated -> `Open POS`
  - guest already on queue -> `Open queue`
  - no table assigned -> `Send to queue`
  - table assigned and due now -> `Open POS`
  - table assigned but not due yet -> `Prep queue handoff`
- secondary actions now stay contextual instead of always showing a generic static POS button

### Product impact

Hosts no longer need to interpret reservation metadata and decide the next screen manually.

The arrival rail now behaves more like an operator launcher into:

- queue
- seated service / POS
- reservation follow-up

### Next queue pickup after this pass

1. visually QA hosted `/queue` density and spacing on Sakorio domains
2. tighten queue-lane card density again if hosted testing still feels too airy
3. refine competing-table explanations when several candidate tables are valid

## 2026-07-14 Queue Selected Guest Rail Tightened

The queue detail rail has been compressed into a denser host-operator panel.

### Newly completed

- replaced the old four-card fact area with a tighter summary strip
- moved source / preferred floor / preferred seats / reservation / seated-table context into compact chips
- wrapped queue status buttons into a dedicated **Host controls** panel
- reduced vertical whitespace before seating / reservation-conversion actions

### Product impact

Hosts now reach the useful actions faster after tapping a guest:

- notify
- reset to waiting
- cancel / no-show
- seat to a suggested table
- convert to reservation

This should make `/queue` feel more like a real front-desk operator dock than a generic admin form.

## 2026-07-14 Hosted Queue Render Root-Cause Confirmed

Live hosted inspection on `https://app.sakorio.com/queue` confirmed the queue content is present in the DOM, but the visible page remains blank because the queue shell is still rendering outside the sidebar's main content viewport.

### What was observed live

- sidebar renders normally
- queue text exists in the DOM
- `app-queue .page-shell` starts below the visible `app-sidebar .main` container on hosted
- result: the host stand looks empty even though queue content exists

### Root cause

Hosted Sakorio was still serving the old queue layout structure:

- standalone `<app-sidebar></app-sidebar>`
- separate `<main class="page-shell">`

The queue screen must instead be rendered inside the sidebar shell:

- `<app-sidebar>`
- inner queue section
- closing `</app-sidebar>`

### Local fix already prepared

The queue layout fix is already staged in local repo work on:

- [queue.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\queue\queue.component.ts)

The same local batch also includes UI density cleanup for:

- [cashier-pos.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\cashier-pos\cashier-pos.component.ts)
- [kitchen-display.component.ts](C:\Users\Rick\Documents\New project\pos\front\src\app\kitchen-display\kitchen-display.component.ts)

### Exact next pickup

1. commit queue + kitchen + cashier local batch
2. push `development`
3. redeploy the Sakorio frontend service
4. re-verify hosted:
   - `/queue`
   - `/kitchen`
   - `/pos`

## 2026-07-15 Current Authoritative Handoff

This section supersedes the older "next pickup" notes above. Keep the historical entries for context, but use this section to continue development.

### Completed application code

- **Customer queue management**
  - permanent tenant public queue token and migration
  - staff QR generation, copy, preview, and printable entrance sign
  - public mobile waitlist join, status, and cancellation flow
  - host board search, filters, urgency ordering, reservation arrivals, seating recommendations, and POS handoff
- **Customer reservations**
  - public booking and token management flows retained and polished
  - staff reservation operations board supports lifecycle actions and table/POS handoff
  - queue and reservation arrivals now share the host-stand operating surface
- **POS, tables, orders, and kitchen**
  - connected service flow remains intact from table selection to order, kitchen, and payment
  - POS status/header chrome is compressed so item selection and checkout reach the working viewport sooner
  - table host controls are denser and single cards now use the available width
  - orders remove duplicated summary blocks and use valid UTF-8 separators
  - kitchen removes the duplicate lane summary, shows three desktop lanes, and labels legacy data as `Stale ticket` instead of displaying multi-day wait counters
- **Automatic kitchen and receipt printing**
  - durable printer-agent and print-job database models plus migration
  - authenticated agent registration, heartbeat, lease, completion, and failure routes
  - kitchen print jobs are enqueued atomically with the order/kitchen workflow
  - venue-side `printer-agent/` worker can poll the cloud backend and route jobs to LAN printers
  - staff Printing settings surface is implemented for setup and monitoring
- **Attendance, employee profiles, and payroll readiness**
  - staff users now support operational profile fields: job title, phone, hourly rate, employment start date, and profile completion timestamp
  - attendance clock-in/out now requires a selected assigned shift and a fresh live photo capture, not a file upload
  - photo proof is validated for freshness and image type, compressed server-side, and stored as binary attendance proof
  - `/my-shift` now behaves like an employee self-service station:
    - complete staff profile
    - choose an assigned timetable shift
    - capture a real-time camera proof
    - clock in / clock out
    - review month-to-date hours and estimated pay
  - manager Users screen now supports editing staff payroll/profile fields
  - Reports now include attendance/payroll summaries, proof review status, and per-staff estimated pay
  - Working Plan now includes an attendance setup readiness strip so managers can spot staff missing hourly rates or completed profiles before publishing schedules

### Validation completed in this workspace

- Angular application type-check: `npx tsc -p tsconfig.app.json --noEmit` passed
- patch integrity: `git diff --check` passed (line-ending warnings only)
- the four connected operator files contain no replacement-character or mojibake regressions
- focused printing, attendance, and staff-menu-token tests passed inside Docker: `docker exec pos-back python -m pytest -q tests/test_staff_menu_token.py tests/test_printing_service.py tests/test_work_session.py` with 20 passing tests
- latest frontend production build passed inside Docker: `docker exec pos-front npm run build`
- latest focused attendance test suite passed inside Docker: `docker exec pos-back pytest -q tests/test_work_session.py` with 13 passing tests
- live camera attendance modal was visually checked locally; capture actions now remain visible in the authenticated viewport and the modal no longer depends on missing inherited CSS variables

### Deployment required before hosted acceptance

1. apply both pending database migrations:
   - `20260715120000_add_guest_queue_public_token.sql`
   - `20260715123000_add_printer_agents_and_jobs.sql`
   - `20260715143000_add_attendance_profiles_and_photo_proofs.sql`
2. deploy the API/backend changes
3. deploy the Sakorio staff/owner frontend changes
4. deploy the public customer frontend changes for the mobile waitlist route
5. perform authenticated hosted QA on queue, reservations, POS, tables, orders, kitchen, Printing settings, My Shift, Users, Reports, and Working Plan

### Venue setup and deferred hardware validation

- install and configure `printer-agent/` on an always-on device inside each restaurant LAN
- register that agent against the correct tenant and map `kitchen` and `receipt` roles to real printers
- validate automatic kitchen and customer receipt output with physical hardware when available
- physical-printer validation is operational acceptance work; the required application code is already implemented
- deploy attendance to an iPad/tablet station with camera permissions enabled
- define hourly rates and profile details for each staff member before trusting payroll estimates

### Next engineering pickup

Do not rebuild queue, reservations, or printing. After deployment, use hosted QA findings to make only targeted fixes. The highest-value remaining work is:

1. verify the full public queue QR journey on a real mobile device
2. verify a reservation arrival can move through queue/table/POS without losing guest context
3. verify a newly paid order appears once in Orders, once in Kitchen, and creates the expected kitchen and receipt print jobs
4. test role/permission boundaries for owner, cashier, host, and kitchen users
5. run the physical-printer acceptance checklist when printer hardware is available
6. verify staff attendance on the actual iPad/tablet camera flow:
   - manager creates staff profile and hourly rate
   - manager publishes/assigns the shift
   - employee selects their own shift
   - employee captures live proof and clocks in
   - employee clocks out
    - Reports show hours and estimated pay correctly

### Local cashier-to-print acceptance completed (2026-07-16)

- completed a fresh authenticated cash checkout for Table 1, producing paid bill `#30` for SGD 3.90
- verified bill `#30` appears once in the staff Orders board and is marked paid
- verified bill `#30` appears in the Kitchen display `New tickets` lane with the correct table and item
- verified the Printing delivery log contains exactly the expected two jobs for bill `#30` at the same creation time:
  - `Kitchen ticket`
  - `Customer receipt`
- both jobs remain pending because no venue printer agent or physical printer is connected in this workspace
- fixed an intermittent cashier checkout failure in `_verify_staff_menu_token`: raw SHA-256 HMAC bytes can contain `.` and must be parsed by their fixed 32-byte width rather than `rpartition(b".")`
- added `tests/test_staff_menu_token.py` to reproduce and prevent that regression
- acceptance item 3 above is complete locally; hosted re-check remains appropriate after deployment

### Role and permission boundary acceptance completed locally (2026-07-16)

- aligned the staff frontend with the backend permission model:
  - `waiter` is the cashier/operator role and retains POS access
  - `receptionist` is the host role and retains reservations, queue, tables, and order visibility without cashier/payment access
  - `kitchen` remains limited to prep visibility and item progression
  - owner/admin management boundaries remain unchanged
- removed `receptionist` from the `/pos` route and permission map, which also removes the POS entry points from the staff sidebar and dashboard for host users
- changed the reservation access guard from a permissive backend-fallback to an explicit redirect for unsupported roles
- added `tests/test_role_permissions.py` to cover cashier, host, kitchen, owner/admin, and user-management hierarchy boundaries
- focused backend regression suite passed inside Docker with 25 tests:
  - `tests/test_role_permissions.py`
  - `tests/test_staff_menu_token.py`
  - `tests/test_printing_service.py`
  - `tests/test_work_session.py`
- frontend production build passed after the route and navigation changes; remaining output is limited to existing bundle-size and CommonJS warnings
- acceptance item 4 above is complete locally; hosted verification with dedicated role accounts remains appropriate after deployment

### Small-outlet operator and production navigation consolidation (2026-07-16)

This section supersedes the earlier Cashier-versus-Host separation described immediately above.

- Cashier (`waiter`) and Host (`receptionist`) now use the same small-outlet operator permission set in both backend and frontend.
- Both roles can operate POS, tables, reservations, queue, orders, billing-customer context, payment settlement, and working-plan tasks exposed to outlet operators.
- Owner/admin-only configuration, reporting, user management, and destructive management boundaries remain unchanged.
- Kitchen and beverage production now share one `/kitchen` workspace and one navigation entry.
- The combined production board shows all active food and drink tickets by default; its station selector remains available for dedicated station filtering.
- Legacy `/bar` bookmarks redirect to `/kitchen`.
- Guest Feedback was removed from the staff sidebar, and `/guest-feedback` redirects to the dashboard.
- Public customer feedback at `/feedback/:tenantId` and the existing public/backend feedback APIs were intentionally retained.

Validation completed:

- focused role regression suite passed with 5 tests in `tests/test_role_permissions.py`
- frontend production build passed
- combined KDS test bundle compiles successfully
- browser-run Karma execution is currently limited by the test container not including a Chrome binary
- `git diff --check` passes with line-ending warnings only

### Authoritative POS/Tables/Orders continuation brief (2026-07-16)

The full integratable development brief is now:

- `docs/0055-pos-tables-orders-development-brief.md`

It documents the current Angular/FastAPI/PostgreSQL/Redis/HitPay/printer-agent architecture, domain and state invariants, existing APIs, real-time events, UX rules, test strategy, and five mergeable implementation phases.

Exact next engineering pickup:

1. begin Phase 1 only: state contracts and workflow invariants
2. define a typed cross-stack operator event contract
3. codify table/order/payment transition guards and tests
4. introduce shared signal-based operator context for `tableId` and `orderId`
5. adapt POS, Tables, and Orders to preserve the same selected context across refresh and real-time updates
6. do not start the Phase 2 visual redesign until the Phase 1 navigation and lifecycle acceptance tests pass
