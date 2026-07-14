# Sakorio Reservation And Queue Integration Brief

Repository: `https://github.com/tanjunnan0101/pos`  
Active Sakorio fork/remote in use: `rtjz318/sakorio-pos`  
Primary local path: `C:\Users\Rick\Documents\New project\pos`

## Objective

Integrate the repo's existing reservation capability into the current Sakorio POS/staff workflow, then add a proper front-of-house queue / waitlist layer that works with:

- tables
- live POS bills
- reservation seating
- public booking
- owner/staff dashboards
- hosted Sakorio staging domains

This brief is for implementation planning. It is not a rewrite proposal.

## Executive summary

### Already present in this repo

The repo already contains a mature reservation subsystem:

- public booking page at `/book/:tenantId`
- public reservation view/cancel page at `/reservation?token=...`
- staff reservations module at `/reservations`
- reservation lifecycle:
  - `booked`
  - `seated`
  - `finished`
  - `cancelled`
  - `no_show`
- reservation reminders:
  - email
  - WhatsApp hooks/design support
  - reminder heartbeat worker
- reservation capacity planning:
  - bookable day/month/week slot APIs
  - overbooking report
  - arrival tolerance
  - table-turn timing
  - walk-in table buffer via `reservation_walk_in_tables_reserved`
- reservation websocket/pubsub updates
- permission gating:
  - `reservation:read`
  - `reservation:write`

### Not yet present as a clean Sakorio operator feature

The repo does **not** currently expose a dedicated host/waitlist/queue-management module for walk-ins and waiting guests. Generic "queue" language exists elsewhere, but that is mostly:

- cashier queue
- kitchen queue
- print queue
- social post queue

For Sakorio, "queue management" should mean:

- guest waitlist
- walk-in holding queue
- host stand sequencing
- notify/seat/cancel flow
- fast handoff into reservation or direct seating

## What existing code should be reused

## 1. Backend reservation foundations

Use the current reservation stack as the base:

- `back/app/main.py`
  - reservation APIs
  - booking calendar/day/week slot logic
  - capacity calculation
  - reservation walk-in buffer logic
- `back/app/models.py`
  - `Tenant` reservation settings
  - reservation statuses and related DTOs
- `back/app/email_service.py`
  - reservation emails/reminders
- `back/app/whatsapp_service.py`
  - reminder/confirmation expansion path
- `back/app/reservation_reminder_heartbeat.py`
  - scheduled reminder worker
- `back/app/websocket_bridge.py`
  - tenant reservation update channels

Important tenant settings already available:

- `reservation_average_table_turn_minutes`
- `reservation_slot_minutes`
- `reservation_max_guests_per_slot`
- `reservation_walk_in_tables_reserved`
- `reservation_arrival_tolerance_minutes`
- `reservation_prepayment_cents`
- `reservation_prepayment_text`
- `reservation_cancellation_policy`
- `reservation_dress_code`

## 2. Frontend reservation foundations

Reuse these frontend surfaces instead of replacing them:

- `front/src/app/reservations/reservations.component.ts`
  - staff reservation management
  - create/edit/cancel/seat/finish/no-show actions
  - date/phone/status filters
  - overbooking awareness
  - seating preference and dietary notes
- `front/src/app/book/book.component.ts`
  - public booking flow
  - branding and tenant-aware public booking
  - public token redirect into reservation management
- `front/src/app/services/api.service.ts`
  - reservation CRUD methods
  - public booking methods
  - reservation slot/capacity queries
  - websocket update streams

## 3. Existing Sakorio surfaces that should consume reservations later

- `/tables`
- `/pos`
- `/staff/orders`
- `/kitchen`
- `/dashboard`
- owner/admin reporting

These should consume reservation state, not duplicate it.

## Current Sakorio gaps

## A. Reservation feature exists, but Sakorio operating flow is not unified yet

Today the codebase can already book and manage reservations, but Sakorio still needs a clearer cross-surface flow:

- table board should visibly differentiate:
  - free table
  - reserved upcoming
  - arrival due now
  - seated reservation
  - walk-in occupied
- POS should understand:
  - "this table is reserved next at 7:30 PM"
  - "this active bill belongs to a seated reservation"
  - "do not auto-clear this table if another reservation is imminent"
- owner/admin reporting should expose:
  - reservation volume
  - no-show rate
  - seated conversion rate
  - walk-in vs reserved mix

## B. Queue/waitlist module is now scaffolded, but still needs product polish

There is now a first working host-stand queue surface in the Sakorio frontend, but it still needs operator refinement for:

- walk-in guests when no suitable table is available immediately
- moving a waiting party into a newly free table
- prioritizing waiting guests against near-term reservations
- converting a queue entry into:
- immediate seating
- a future reservation
- cancellation / no-show / left venue

Current frontend pieces now present:

- `front/src/app/queue/queue.component.ts`
- route:
  - `/queue`
- sidebar navigation:
  - `Queue`
- staff POS toolbar shortcut:
  - `Queue`
- translation key:
  - `NAV.QUEUE`

Current queue screen capabilities:

- create walk-in entry
- lane view by status
- notify / return-to-waiting / cancel / no-show actions
- seat guest onto a clear matching table
- convert queue entry into reservation
- open POS after seating
- live refresh via queue websocket events

What still needs polish:

- denser host-stand layout for tablet operators
- queue priority cues against upcoming reservations
- clearer floor readiness / best-fit-table suggestions
- stronger tie-in to reservation arrivals due soon
- same-screen arrival actions so hosts can push reservations into queue without bouncing back to `/reservations`
- owner dashboard rollups for queue volume and conversion

### Queue visibility stop point now completed

This implementation slice is now in place:

- Dashboard exposes a queue quick action card
- Dashboard can surface live queue summary counts
- Tables exposes a host-stand pulse panel above the live floor board
- Tables can jump directly into `/queue`

This means queue is no longer hidden behind a standalone module only; it is now visible from the two main service-orientation surfaces.

### Reservation-to-queue convergence stop point now completed

This implementation slice is now in place:

- Tables now derives a compact reservation-arrivals panel from `CanvasTable.upcoming_reservation`
- tables can surface:
  - guest name
  - floor
  - upcoming reservation time
  - urgency state for near-term arrivals
- Tables now derives queue seating suggestions against:
  - party size
  - clear available tables
  - preferred floor
  - preferred table size
  - reservation pressure on candidate tables
- Queue screen seating logic now aligns with the current `CanvasTable` model:
  - `seat_count`
  - `floor_id`
  - guarded `table.id` before seat action
- shared queue summary calls are aligned on:
  - `getGuestQueueSummary()`

This means the queue layer is no longer just visible; it is now starting to behave like a real host-stand bridge between waiting guests, reservation arrivals, and floor readiness.

### Queue-aware cashier handoff stop point now completed

This implementation slice is now in place:

- Queue seating now opens cashier POS with queue handoff context:
  - `tableId`
  - `queueEntryId`
  - guest name
  - phone
  - party size
  - notes
- Cashier POS now consumes queue handoff query params the same way it already handled reservation handoff data
- cashier order creation now uses a unified handoff prefill source:
  - reservation handoff
  - queue handoff
- cashier opening notice now distinguishes:
  - reservation handoff
  - queue handoff
- cashier query sync now clears stale queue/reservation handoff params when the operator intentionally moves to another table or order

This means host stand can now seat a guest and pass them into cashier without losing guest context.

### Queue module implementation state confirmed on 2026-07-13

This brief should now treat queue as an implemented operational module, not only a planned backend slice.

Confirmed backend state:

- queue model exists in `back/app/models.py`
- queue routes exist in `back/app/main.py`
- queue realtime publish exists on:
  - `queue:tenant:{tenant_id}`
- queue timestamps available for reporting:
  - `requested_at`
  - `notified_at`
  - `seated_at`
  - `completed_at`
- queue estimate field available for reporting:
  - `quoted_wait_minutes`

Confirmed frontend state:

- queue route exists:
  - `/queue`
- queue board exists in:
  - `front/src/app/queue/queue.component.ts`
- queue API client methods exist in:
  - `front/src/app/services/api.service.ts`
- dashboard queue quick action exists
- tables queue pulse and seat suggestions exist
- cashier POS queue handoff support exists
- sidebar and staff toolbar queue navigation exist

Confirmed queue UX already live:

- add guest to queue
- lane-based queue visibility
- notify guest
- return guest to waiting
- cancel / no-show guest
- seat guest onto valid table
- convert queue entry into reservation
- open POS after seating
- refresh from queue websocket events

### Hosted Sakorio deployment gap confirmed on 2026-07-13

Local implementation and hosted availability are not yet the same thing.

Hosted verification against `https://app.sakorio.com` found:

- `/queue` currently resolves back to `/dashboard`
- dashboard currently shows no live queue entry point in the hosted build
- reservation, reports, and tables routes are loading, so this is not a broad auth failure

Root cause confirmed locally:

- the queue feature folder still exists as an untracked local slice:
  - `front/src/app/queue/queue.component.ts`
- queue route wiring and surface integrations were already modified in tracked files, but the queue component itself has not yet been shipped with the hosted build

Operational conclusion:

- do **not** treat the hosted `/queue` redirect as a permission or API problem first
- the next deployment must include the queue component itself before hosted queue QA is meaningful

Required next deployment checkpoint:

1. add the queue frontend slice into git
2. include the queue brief/migration/docs updates in the same change set
3. redeploy Sakorio staff/owner frontend build
4. re-check:
   - `https://app.sakorio.com/queue`
   - dashboard queue quick action
   - tables host-stand pulse
   - cashier queue-to-POS handoff

### Next recommended implementation slice

Continue from here with:

1. owner/admin queue rollups
   - queue volume by day
   - average quoted wait vs actual seat time
   - conversion into seated
   - conversion into reservation
   - no-show / cancelled / expired percentages
2. host-stand product polish
   - stronger visual priority for arrivals due now
   - denser tablet-first queue lane layout
   - clearer best-fit table explanation
   - optional urgency / VIP / stroller / accessibility indicators
3. reservation + queue cross-links
   - jump from reservation list into queue when guest becomes a walk-in delay case
   - show recent queue history on reservation profile when relevant
     - queue entry linked for reporting
2. owner rollups
   - queue throughput
   - seated conversion
   - cancelled / no-show walk-ins
3. host-stand product polish
   - denser tablet layout for the queue board
   - stronger urgency styling for arrivals due now
   - clearer “best fit” explanations for seating recommendations
   - explicit “hold for reservation” messaging when a table should not be used

## Recommended product architecture

## 1. Keep reservations as their own domain

Do **not** overload reservation records to represent every waiting walk-in.

Reservations should stay optimized for:

- planned future bookings
- pre-seated customer records
- reminder/confirmation policies
- capacity planning
- no-show tracking

## 2. Add a separate FOH queue model

Recommended new entity:

- `GuestQueueEntry` or `WaitlistEntry`

Purpose:

- represent guests physically waiting or requesting next-available seating
- bridge walk-ins into tables or into formal reservations

### Suggested fields

- `id`
- `tenant_id`
- `customer_name`
- `customer_phone` nullable
- `party_size`
- `requested_at`
- `quoted_wait_minutes` nullable
- `status`
- `preferred_floor_id` nullable
- `preferred_table_size` nullable
- `notes` nullable
- `source`
  - `walk_in`
  - `phone`
  - `web_waitlist`
  - `staff_manual`
- `linked_reservation_id` nullable
- `seated_table_id` nullable
- `seated_order_id` nullable
- `cancel_reason` nullable
- `notified_at` nullable
- `arrived_at` nullable
- `seated_at` nullable
- `completed_at` nullable
- `created_by_user_id` nullable
- `updated_at`

### Suggested queue statuses

- `waiting`
- `notified`
- `seated`
- `converted_to_reservation`
- `cancelled`
- `no_show`
- `expired`

This keeps host queue logic separate from planned bookings while still allowing linkage.

## Backend queue slice now completed

The Sakorio fork now includes the first backend implementation of the queue domain.

### Added backend pieces

- `back/app/models.py`
  - `GuestQueueStatus`
  - `GuestQueueSource`
  - `GuestQueueEntry`
  - DTOs:
    - `GuestQueueCreate`
    - `GuestQueueUpdate`
    - `GuestQueueStatusUpdate`
    - `GuestQueueSeat`
    - `GuestQueueConvertToReservation`
- `back/migrations/20260712120000_add_guest_queue_entry.sql`
- `back/app/main.py`
  - queue serializer helper
  - queue Redis publisher
  - queue seating helper with reservation-grade table checks
  - tenant queue CRUD + summary + seat + convert endpoints

### Live backend contract added

- `GET /queue`
- `GET /queue/summary`
- `POST /queue`
- `GET /queue/{queue_entry_id}`
- `PUT /queue/{queue_entry_id}`
- `PUT /queue/{queue_entry_id}/status`
- `PUT /queue/{queue_entry_id}/seat`
- `PUT /queue/{queue_entry_id}/convert-to-reservation`

### Important implementation note

For the first slice, queue endpoints intentionally reuse:

- `reservation:read`
- `reservation:write`

instead of introducing new queue-specific RBAC permissions immediately.

### Seating rules already enforced

Queue seating now blocks invalid seating in the backend if:

- table group capacity is too small
- another live order is already occupying the table/group
- another booked reservation is already assigned to that table/group

This mirrors the current reservation seating expectations and keeps queue seating compatible with existing floor logic.

## 3. Reservation and queue interaction rules

### Reservation to table

- reservation can be seated directly onto a table
- that seating can open or attach an order
- seated reservation should flow into the existing table/POS order lifecycle

### Queue to table

- queue entry can be seated to any currently valid free table
- seating should open the POS on that table with guest context prefilled

### Queue to reservation

- if the guest chooses a later slot instead of waiting, create a reservation and mark queue entry:
  - `converted_to_reservation`

### Reservation and walk-in capacity

Use the existing tenant setting:

- `reservation_walk_in_tables_reserved`

as the operational buffer that protects a configurable number of small tables for walk-ins.  
That should become visible in Sakorio owner/staff settings and the future host queue UI.

## UI / UX integration plan

## Next frontend integration slice

The next developer should build the Sakorio host/waitlist board using the new queue endpoints.

### Recommended first UI block

- new staff page or drawer module for waitlist / host queue
- cards or rows grouped by:
  - waiting
  - notified
  - seated today
- primary actions:
  - add guest
  - notify guest
  - seat now
  - convert to reservation
  - cancel / no-show

### Required cross-links

- queue card -> seat into table board
- queue card -> open POS with table + guest context
- queue card -> convert into formal reservation
- table board -> show waiting list pressure summary
- dashboard/reporting -> expose queue counts and seated conversion later

## 1. Owner/admin surfaces

### Add a Reservations & Queue section

In owner/admin navigation:

- `Reservations`
  - existing reservation list/calendar/operator controls
- `Queue`
  - new waitlist/host queue board
- optional combined landing:
  - `Front of House`

### Owner settings that should surface existing backend fields

- slot interval
- average table turn
- max guests per slot
- walk-in table reserve count
- arrival tolerance
- reminder toggles
- prepayment policy text
- cancellation policy
- dress code

### Owner reporting additions

New report cards / exports:

- reservations created
- reservations seated
- reservations cancelled
- reservations no-show
- waitlist entries created
- waitlist seated conversion
- waitlist abandonment rate
- average quoted wait vs actual seat time
- walk-in revenue vs reservation revenue

## 2. Staff / host stand surfaces

### New queue board

Recommended route:

- `/queue`

Primary zones:

- waiting now
- next to seat
- recently notified
- converted
- completed / history

Row/card fields:

- guest name
- party size
- waited so far
- quoted wait
- floor preference
- special notes
- next available table suggestion
- actions:
  - notify
  - seat
  - convert to reservation
  - cancel
  - no-show

### Reservation board improvements

Existing `/reservations` stays, but Sakorio should add:

- clearer host-oriented arrival buckets:
  - due soon
  - arriving now
  - seated
  - unresolved no-table bookings
- faster table assignment action
- one-click send into POS when seated

## 3. Tables board integration

Tables should display new FOH states more clearly:

- available
- reserved upcoming
- reserved arriving now
- seated reservation
- walk-in occupied
- queue candidate

New table actions should include:

- seat reservation
- seat from queue
- inspect reservation
- inspect queue

## 4. POS integration

The cashier POS should understand both reservation and queue context.

### When opening POS from a reservation

Prefill:

- guest name
- party size
- reservation note
- dietary notes if appropriate

Mark order context as:

- `reservation`

### When opening POS from a queue entry

Prefill:

- guest name
- party size
- queue note

Mark order context as:

- `walk_in_queue`

### Behavior needed

- allow add-on orders for seated reservation tables just like normal tables
- do not force creation of a second disconnected bill
- preserve guest context in the active bill summary

## 5. Public/customer surfaces

### Existing public booking stays

- `/book/:tenantId`
- `/reservation?token=...`

### Optional later public queue

If Sakorio wants digital waitlist later, add:

- "join waitlist" on public site
- token-based status view similar to reservation token handling

This should be a later phase, not MVP.

## Backend implementation plan

## Current implementation status

### Phase 1 slice completed so far

- staff Tables now consumes `getTablesWithStatus()` / `CanvasTable` instead of the thinner legacy table payload
- staff Tables surfaces upcoming reservation timing and guest context in:
  - list rows
  - floor tiles
  - operator state labels
- cashier POS now surfaces upcoming reservation timing and guest context in:
  - left table rail summary
  - selected bill-dock header
  - selected table summary copy
- reservation seating now supports direct POS handoff:
  - seating a reservation opens `/pos` on the chosen table
  - seated reservation cards expose an explicit `Open POS` action
- cashier POS now accepts reservation handoff query params for:
  - `reservationId`
  - `reservationGuest`
  - `reservationPhone`
  - `reservationPartySize`
  - `reservationNotes`
- fresh staff-created orders opened from a reservation handoff now carry:
  - guest name
  - reservation note

### What Phase 1 still needs next

- dashboard/report cards for reservation volume and no-show / seated conversion
- websocket verification for reservation updates across Sakorio surfaces
- optional follow-up polish:
  - show reservation source explicitly on the created POS ticket
  - surface a lighter reservation handoff pill in the checkout rail instead of relying mainly on notices

### Queue work not started yet

- no Sakorio host/waitlist model has been added yet
- no queue endpoints or queue UI board exist yet
- no queue-to-table or queue-to-reservation conversion flow exists yet

## Phase 1. Reservation adoption into Sakorio

No new reservation rewrite. Instead:

- expose reservation module in Sakorio owner/staff navigation
- map reservation actions into tables/POS workflows
- add dashboard/report visibility
- ensure realtime updates reach relevant Sakorio screens

### Backend work

- verify reservation endpoints are exposed in current staging auth flow
- add any missing summary endpoints for dashboard/report cards
- add reservation context fields to table/POS summary DTOs if missing

## Phase 2. FOH queue model

Add:

- new SQLModel/table
- migrations
- CRUD/status endpoints
- seat/notify/convert endpoints
- tenant-scoped list filters

### Suggested endpoints

- `GET /queue`
- `POST /queue`
- `GET /queue/{id}`
- `PUT /queue/{id}`
- `PUT /queue/{id}/status`
- `PUT /queue/{id}/seat`
- `PUT /queue/{id}/convert-to-reservation`
- `GET /queue/summary`

## Phase 3. Realtime and dashboards

Publish queue events into Redis/websocket channels:

- `queue:tenant:{tenant_id}`

Event types:

- `queue_created`
- `queue_updated`
- `queue_notified`
- `queue_seated`
- `queue_cancelled`
- `queue_converted`

Frontend consumers:

- queue board
- tables board
- dashboard FOH widgets

## Phase 4. Reporting

Add query/report support for:

- queue conversion rates
- seating times
- reservation lead times
- no-show and cancellation rates
- walk-in vs reservation sales mix

## Data and migration considerations

## Reservation migration strategy

No new reservation base schema should be invented unless a field is genuinely missing.

Instead:

- inspect and reuse existing `Reservation` fields
- add only Sakorio-specific reporting or UI context fields if unavoidable

## Queue migration strategy

Queue/waitlist should be added as a clean new table.  
Do **not** overload:

- `Order`
- `Table`
- `Reservation`

with waiting-guest semantics they were not designed to own.

## API and UI dependencies

## Required before coding

- confirm which current Sakorio frontend host is the long-term staff surface:
  - `app.sakorio.com`
  - `staff.sakorio.com`
- decide whether queue board sits under:
  - owner/admin surface only
  - staff surface only
  - both
- decide whether waiter/cashier can manage queue or only host/manager

## Existing permissions to reuse / extend

Current reservation permissions exist:

- `reservation:read`
- `reservation:write`

Recommended new permissions:

- `queue:read`
- `queue:write`
- `queue:seat`

## Recommended implementation order

1. surface existing reservations cleanly inside Sakorio
2. connect reservation state to tables/POS/dashboard
3. finish host-stand queue product polish on top of the already-built queue model + APIs
4. tighten reservation-arrival awareness inside `/queue`
5. extend owner reporting / dashboard rollups for queue and reservation flow
6. complete final hosted deployment QA across Sakorio domains

## Definition of done

Sakorio reservation + queue integration is complete when:

- staff can view, create, edit, seat, finish, and cancel reservations from the Sakorio operating flow
- tables clearly show reserved vs occupied vs queue-available states
- walk-ins can be placed into a host queue when no table is free
- queued guests can be seated directly into POS on a chosen table
- queued guests can be converted into future reservations
- owner can configure reservation policies and walk-in reservation buffer
- reports distinguish reservations, no-shows, cancellations, and walk-in queue outcomes
- websocket updates keep the host/table/POS views in sync without manual refresh

## Practical next pickup

If the next developer starts from this brief now, the first safe build block is:

1. visually QA `/queue` in the hosted Sakorio surfaces after the new host-board filtering pass
2. continue host-stand product polish:
   - denser selected-guest rail
   - faster reservation-arrival to queue actioning
   - clearer seating outcomes after POS handoff
3. extend owner rollups so queue + reservation pressure is visible from reports/dashboard without drilling into operations

### Queue host-board filtering stop point completed on 2026-07-13

The latest queue polish slice is now in place inside:

- `front/src/app/queue/queue.component.ts`

Completed operator improvements:

- board-level search for:
  - guest name
  - phone
  - floor
  - notes
  - reservation reference text
- source filter for:
  - host stand
  - walk-in
  - phone
  - web waitlist
  - reservation-linked entries
- preferred-floor filter
- urgency filter using existing wait-time priority logic
- visible-board counters:
  - active
  - visible
  - loaded
  - waiting
  - notified
  - seated
  - action now
  - reservation-linked
- automatic lane ordering so the board floats:
  - notified guests
  - long-waiting guests
  - reservation-linked entries
  ahead of lower-pressure rows
- selection sync so the right detail rail does not stay pinned to a guest hidden by active filters

This means `/queue` is now functionally present **and** has its first real host-stand productivity layer.

### Reservation-arrival actioning stop point completed on 2026-07-14

The due-soon reservation cards inside `/queue` now carry stronger operator guidance and actioning.

Completed improvements:

- every due-soon reservation card now shows a "best next step" decision panel
- each card now explains whether the guest is:
  - already seated
  - already on the live queue
  - still missing a table assignment
  - due right now on an assigned table
- primary / secondary arrival actions are now contextual instead of static:
  - `Open POS`
  - `Open queue`
  - `Send to queue`
  - `Prep queue handoff`
- reservation cards now avoid forcing the host to interpret raw metadata before choosing the next move

This means the reservation-arrivals block is now acting more like a real host stand launcher instead of a passive reminder strip.

### Next queue slice after this stop point

The next recommended queue-specific implementation block is:

1. visually QA the hosted Sakorio `/queue` page and tighten spacing / density based on live operator use
2. compress lane density further for tablet operators if the hosted page still feels too airy
3. refine competing-table explanations when several candidate tables are all technically valid

### Queue selected-guest rail tightened on 2026-07-14

The selected guest side rail inside `/queue` is now denser and reads more like an operator dock.

Completed improvements:

- replaced the old tall fact-card block with a tighter summary strip
- surfaced source / preferred floor / preferred seats / reservation / seated table as compact chips
- moved queue status controls into a dedicated **Host controls** panel
- reduced vertical sprawl before the seat / convert sections so the host reaches action sooner

This means the selected-guest rail now exposes:

- who the guest is
- why they matter now
- what the host should do next

without forcing extra scrolling before the seat / convert actions.
