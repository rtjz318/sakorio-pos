# Sakorio POS, Tables, and Orders Development Brief

**Status:** Authoritative implementation brief

**Prepared:** 2026-07-16

**Repository:** `rtjz318/sakorio-pos`

**Target branch:** `development`

## 1. Purpose

This brief defines how to finish and harden the connected Sakorio operator workflow across:

- cashier POS
- table and floor operations
- order operations
- kitchen and beverage production
- payment settlement
- automatic kitchen and customer receipt printing

It is based on the current repository, models, APIs, routes, WebSocket events, payment implementation, and deployed Sakorio topology. It is not a replacement application or a disconnected UI concept.

## 2. Product outcome

Sakorio must let one small-outlet operator move through the complete service cycle without changing mental models:

1. identify or activate a table
2. open or resume its live bill
3. add and customise products
4. collect cash, confirm an external terminal payment, or redirect to HitPay
5. mark the bill paid exactly once
6. release production tickets and print the required documents exactly once
7. monitor food and beverage preparation from one production display
8. complete service and clear the table for the next party

The same system must remain usable for larger teams by allowing dedicated kitchen, bartender, admin, and owner accounts.

## 3. Confirmed baseline completed on 2026-07-16

The following decisions are already implemented and are the baseline for this brief:

- Cashier and Host use equivalent small-outlet operator permissions.
- Backend `waiter` and `receptionist` roles share one permission set.
- Frontend role permissions mirror the backend permission set.
- Both operator roles can access POS, tables, reservations, queue, orders, and payment operations.
- Kitchen and beverage production are presented in one `/kitchen` workspace.
- Legacy `/bar` links redirect to `/kitchen`.
- The KDS station selector can still focus a specific kitchen or beverage station.
- The staff Guest Feedback tab is removed.
- Legacy `/guest-feedback` staff links redirect to the dashboard.
- Public customer feedback routes and APIs remain available and are not removed.

## 4. Current technical architecture

### 4.1 Frontend

- Angular 21 standalone application
- TypeScript and Angular signals
- Angular Router guards for authentication, role access, and UI modules
- RxJS for HTTP and real-time subscriptions
- `@ngx-translate` for runtime localisation
- SCSS and the existing Sakorio design tokens
- Angular QR libraries for table, reservation, and queue QR workflows

Primary operator components:

- `front/src/app/cashier-pos/cashier-pos.component.ts`
- `front/src/app/tables/tables.component.ts`
- `front/src/app/orders/orders.component.ts`
- `front/src/app/kitchen-display/kitchen-display.component.ts`
- `front/src/app/services/api.service.ts`
- `front/src/app/services/permission.service.ts`
- `front/src/app/shared/sidebar.component.ts`

### 4.2 Backend

- FastAPI
- SQLModel on SQLAlchemy
- PostgreSQL with sequential SQL migrations
- JWT/cookie authentication and tenant isolation
- Redis for rate limiting, coordination, and pub/sub
- WebSocket fan-out for tenant and table channels
- Pillow for image handling
- ReportLab and OpenPyXL for generated documents and reports

Primary backend files:

- `back/app/main.py`
- `back/app/models.py`
- `back/app/permissions.py`
- `back/app/websocket_bridge.py`
- `back/app/printing_routes.py`
- `back/app/printing_service.py`

### 4.3 External and venue services

- HitPay for hosted online checkout
- external physical card terminal confirmation as a manual settlement rail
- cash settlement
- Redis-backed WebSocket updates
- venue-side printer agent for LAN printers
- Render-hosted API, frontend, PostgreSQL, and Redis services

## 5. Current domain model

### 5.1 Table

The current `Table` model contains:

- tenant ownership
- name and public token
- floor and canvas position
- rotation, shape, width, and height
- seat count
- optional table group
- assigned waiter
- ordering PIN
- `is_active`
- `active_order_id`
- `activated_at`

The UI must not invent a second table truth. Floor tiles, POS table selection, and order grouping must derive from these records and `/tables/with-status`.

### 5.2 Order

The current `Order` model contains:

- tenant and table linkage
- status
- payment timestamps and payment actor
- payment method
- HitPay payment request identifiers
- bill request and service metadata
- billing customer linkage
- order items and calculated totals

Supported settlement labels include:

- `cash`
- `terminal`
- `hitpay`

The product does not require split tender. Reports must distinguish HitPay, terminal, and cash as separate payment methods.

### 5.3 Order item

The current `OrderItem` model and APIs support:

- product name and price snapshot
- quantity
- selected options/modifiers
- preparation status
- cancellation and removal
- staff updates
- production station routing

Historical orders must retain their commercial snapshot even if the product or modifier is later edited.

### 5.4 Kitchen station

Kitchen stations are data, not separate applications. Food and beverage tickets must share one KDS and can be filtered by station when a dedicated production screen requires it.

### 5.5 Print jobs

Durable print jobs support:

- kitchen tickets
- customer receipts
- pending, leased, completed, and failed states
- venue printer-agent delivery
- retries and failure visibility

Printing is part of order settlement and production reliability, not a browser-only `window.print()` feature.

## 6. Canonical state model

The implementation must treat the following as separate state axes.

### 6.1 Table service state

- closed or clear
- active or seated
- linked to a live order
- payment pending
- paid and ready to clear
- unavailable or grouped

### 6.2 Order commercial state

- draft/open
- payment requested
- paid
- cancelled
- completed/finished

### 6.3 Production state

- sent to production
- preparing
- ready
- delivered/served
- cancelled or removed

### 6.4 Payment state

- not requested
- awaiting settlement
- cash confirmed
- external terminal confirmed
- HitPay pending
- HitPay succeeded
- payment reversed/unmarked when authorised

The UI must not infer table state solely from order status or production state. Every tile and action must combine the relevant axes explicitly.

## 7. Non-negotiable invariants

- Every tenant-scoped read and mutation must enforce tenant isolation.
- A table may have at most one active service bill.
- Opening an occupied table must resume its active bill rather than create a duplicate.
- Adding items to an active bill must append to that bill.
- Monetary calculations use integer cents on the server.
- The server is authoritative for totals, tax, and settlement.
- HitPay webhooks and return reconciliation must be idempotent.
- Marking an order paid must be idempotent.
- Kitchen tickets and customer receipts must not duplicate on retries.
- Real-time events are hints to refresh authoritative HTTP state, not a replacement database.
- A failed WebSocket connection must not make POS, Tables, Orders, or KDS unusable.
- A paid table is not automatically clear until the operator completes the table handoff.

## 8. Current API contracts to preserve

### 8.1 Tables

- `GET /tables`
- `GET /tables/with-status`
- `POST /tables`
- `PUT /tables/{table_id}`
- `DELETE /tables/{table_id}`
- `POST /tables/{table_id}/activate`
- `POST /tables/{table_id}/close`
- `PUT /tables/{table_id}/assign-waiter`
- `GET /tables/{table_id}/staff-menu-token`

### 8.2 Orders

- `GET /orders`
- `POST /orders/staff`
- `PUT /orders/{order_id}/status`
- `PUT /orders/{order_id}/mark-paid`
- `PUT /orders/{order_id}/unmark-paid`
- `PUT /orders/{order_id}/finish`
- `DELETE /orders/{order_id}`
- `PUT /orders/{order_id}/staff-urgent`
- `PUT /orders/{order_id}/items/{item_id}`
- `PUT /orders/{order_id}/items/{item_id}/status`
- `PUT /orders/{order_id}/items/{item_id}/reset-status`
- `PUT /orders/{order_id}/items/{item_id}/cancel`
- `DELETE /orders/{order_id}/items/{item_id}`

### 8.3 Customer ordering

- `GET /menu/{table_token}/order`
- `GET /menu/{table_token}/order-history`
- `POST /menu/{table_token}/order`
- `POST /menu/{table_token}/order/{order_id}/request-payment`

### 8.4 Payments

- `POST /orders/{order_id}/create-hitpay-payment-request`
- `POST /orders/{order_id}/confirm-hitpay-payment`
- `POST /payments/hitpay/webhook`

### 8.5 Real-time

- `GET /ws-token`
- `WS /ws/tenant/{tenant_id}`
- `WS /ws/table/{table_token}`
- `GET /ws/health`

## 9. Real-time event contract

The backend currently publishes order events through Redis. Existing event types include:

- `new_order`
- `items_added`
- `payment_requested`
- `order_paid`
- `status_update`
- `item_status_update`
- `item_updated`
- `item_removed`
- `item_cancelled`
- `order_cancelled`
- `order_urgent_updated`
- `table_closed`
- `call_waiter`

Required frontend behavior:

- show a restrained visual/sound cue for a genuinely new production ticket
- refresh affected table and order data after each event
- reconnect WebSockets with backoff
- continue HTTP polling or manual refresh when disconnected
- ignore duplicate events safely
- preserve the selected table/order during background refreshes

Future improvement:

- define a versioned `OperatorEvent` TypeScript/Pydantic contract instead of untyped dictionaries
- include `event_id`, `event_version`, `occurred_at`, `tenant_id`, `table_id`, and `order_id`
- add event reducer tests to prove duplicate and out-of-order delivery is safe

## 10. UX design system requirements

The operator interface must optimise for speed, legibility, and recovery rather than marketing presentation.

### 10.1 Visual hierarchy

- use a bright, high-contrast operating surface
- retain the existing Sakorio type and colour system
- show one dominant action per working context
- use colour for state, not decoration
- keep secondary metadata visually quieter
- avoid oversized summary cards that push work below the fold
- avoid repeated explanatory text after onboarding

### 10.2 Density

- target 1280x800 and 1366x768 cashier terminals first
- keep table selection, catalogue, ticket, total, and payment action in the first working viewport
- use internal scrolling for long catalogues and queues
- keep the selected bill dock visible while the catalogue scrolls
- support touch without making every panel oversized

### 10.3 Interaction

- minimum practical touch target: 44-48 px
- visible keyboard focus on all actionable controls
- no hidden primary action at the bottom of a long page
- preserve current table, bill, search, and filter context across navigation
- confirm destructive operations with the affected table/order/item named
- disable double submission while mutations are running

### 10.4 Error handling

- render errors adjacent to the failing action
- use `role="alert"` or an `aria-live` region for asynchronous failures
- state what happened and what the operator can do next
- never replace an actionable backend error with only “Something went wrong”
- retain cart and selected table after recoverable payment or network failure

### 10.5 Motion and accessibility

- motion must communicate a state change, not decorate routine work
- respect `prefers-reduced-motion`
- do not rely on colour alone for paid, pending, ready, or unavailable states
- provide text labels for icons and station states

## 11. POS workstream

### 11.1 Required layout

Desktop layout:

- left rail: compact table/floor selector
- centre: category and product item picker with images
- right rail: persistent current bill and payment dock

The operator must be able to see the selected table, cart count, total, and next action without scrolling the page.

### 11.2 Table binding

- selecting a clear table prepares a new bill
- selecting a table with an active bill resumes it
- selecting a paid table offers the explicit clear-table action
- route query parameters `tableId` and `orderId` remain supported
- stale or invalid query parameters recover to a safe table-selection state
- the cashier may switch tables only after preserving or clearing the current draft intentionally

### 11.3 Product picker

- use product photo when available
- show stable image placeholder otherwise
- category chips must filter immediately
- search covers product, category, and station
- direct-add products use one tap
- products with required modifiers open the customisation sheet
- sold-out or inactive products remain visible only when useful and cannot be added
- newly added items provide visible confirmation without moving the operator away from the catalogue

### 11.4 Customisation

- show product name, image, base price, and modifier groups in a focused dialog/sheet
- required choices are visibly marked
- enforce min/max selections before submission
- keep the Add to bill action visible
- show the calculated line price before confirmation
- restore previous selections when editing an existing line

### 11.5 Bill dock

- show line name, modifiers, quantity controls, line total, edit, and remove
- keep server-calculated subtotal, tax, service charge, and total visible
- allow additional items on an existing live bill
- do not lock the catalogue merely because a table already has an order
- avoid duplicate helper panels, redundant “fastest next move” blocks, and repeated table fields

### 11.6 Payment dock

Payment choices:

- Cash: immediate server settlement after cashier confirmation
- Terminal: settlement after the physical card terminal succeeds
- HitPay: create hosted request and redirect to returned `checkout_url`

Required behavior:

- primary payment action remains visible when the bill has items
- selected rail and total are explicit
- cash and terminal calls use `mark-paid` with the correct payment method
- HitPay return calls `confirm-hitpay-payment`
- pending HitPay payment can be safely resumed
- success refreshes Orders, Tables, KDS, reports, and printing state
- failures retain the bill and offer retry

### 11.7 Checkout side effects

Successful settlement must result in:

- one paid order record
- one Orders entry
- production tickets available in the combined KDS
- one kitchen print job per required production route
- one customer receipt job
- the table moving to paid/ready-to-clear state

## 12. Tables workstream

### 12.1 Floor board

- render every active table in its floor/canvas position when layout data exists
- provide a dense grid fallback when layout data is incomplete
- filter by floor, availability, active bill, payment pending, ready to clear, help request, and reservation
- support search by table name/code
- preserve selected table while data refreshes

### 12.2 Table tile

Every tile should show only operationally relevant data:

- table name
- seats
- state label and icon
- active order number when present
- elapsed service time when current
- amount/payment attention when relevant
- help or reservation indicator when relevant

Primary tile interaction selects the table. Secondary actions belong in the selected-table dock rather than being repeated on every tile.

### 12.3 Selected-table dock

The dock must expose:

- resume/open POS
- view all table orders
- activate or seat
- clear table after settlement
- reservation and queue guest context
- waiter assignment when enabled
- QR/PIN controls for authorised users
- table group controls for authorised users

### 12.4 Table history

“Orders” for a table must show all orders for that table, grouped by current and historical service sessions. It must not be a generic global order list with a weak filter.

### 12.5 Clear-table safeguards

- block clear when an unpaid active order remains
- require explicit confirmation for force-close operations
- after clear, remove active order linkage and reset session-specific values atomically
- publish `table_closed`
- refresh POS, Tables, Orders, customer menu, and queue/reservation handoff

## 13. Orders workstream

### 13.1 Information architecture

Required top-level modes:

- Action now
- Awaiting payment
- Open tickets
- History

Default ordering prioritises current operational work. Historical data must never dominate the live queue.

### 13.2 Grouping

- group live orders by table
- show takeaway/delivery/counter orders in explicit non-table groups
- preserve table identity in every order card
- show the latest active bill first inside a table group
- allow a table group to collapse to reduce clutter

### 13.3 Order card

An order card must show:

- order number
- table or service type
- age
- payment state
- production state
- item count and total
- next valid action

Do not show every backend field on the card. Full item and payment detail belongs in the selected-order panel.

### 13.4 Selected-order panel

- item and modifier detail
- item-level production controls
- payment records and method
- kitchen station routing
- edit/remove/cancel controls based on permission and state
- mark paid/unmark paid based on permission
- urgent flag
- open in POS with table/order context
- audit-friendly reason fields for destructive or reversing actions

### 13.5 Historical behavior

- completed and cancelled orders load separately from the live queue
- server-side pagination is required before production-scale history
- search and filters must be expressed as API query parameters
- do not fetch an unbounded order history into the browser

## 14. Combined kitchen and beverage workstream

- one `/kitchen` route and one navigation entry
- all active production tickets visible by default
- station selector filters food or beverage stations when required
- three production lanes: new, preparing, ready
- old unresolved tickets live in a separate backlog view
- item-level actions update only the affected line/station
- paid/completed commercial state must not hide unfinished production lines
- new-order sound occurs once per new ticket
- WebSocket failure falls back to periodic refresh

## 15. Shared frontend state and services

Introduce these boundaries incrementally without rewriting the application:

### 15.1 Operator context store

Owns:

- selected tenant/outlet
- current operator and permissions
- selected table
- selected order
- route/query synchronisation

### 15.2 Table operations store

Owns:

- `/tables/with-status` result
- selected floor and filters
- table activation/close mutations
- reconciliation after order events

### 15.3 Bill/cart store

Owns:

- current table/order binding
- draft lines and modifier selections
- server order refresh
- settlement state
- HitPay return recovery

### 15.4 Order operations store

Owns:

- live, unpaid, and history query state
- grouping by table
- selected order detail
- order/item mutations
- event-driven refresh

These may begin as injectable Angular services using signals. A new external state library is not required.

## 16. Backend hardening work

### 16.1 Service layer extraction

Move critical orchestration out of route handlers into transaction-aware services:

- `TableService`
- `OrderService`
- `PaymentService`
- `ProductionService`
- existing `PrintingService`

### 16.2 Transaction boundaries

The following operations need explicit transaction tests:

- create or append staff order
- mark paid
- finish order
- clear table
- enqueue print jobs
- reconcile HitPay webhook/return

### 16.3 Idempotency

Add or verify unique/idempotency controls for:

- HitPay payment request reference
- HitPay webhook event or request identifier
- order settlement
- print job purpose per order/station
- repeated client submission caused by timeout/retry

### 16.4 Query performance

- eliminate N+1 table/order/item loading
- index tenant, table, status, paid timestamp, created timestamp, and HitPay request identifier paths
- paginate history
- return purpose-built operational DTOs instead of serialising entire ORM graphs

## 17. Security and authorisation

- backend permissions remain authoritative
- frontend permissions only hide or guide controls
- Cashier and Host share `SMALL_OUTLET_OPERATOR_PERMISSIONS`
- dedicated Kitchen/Bartender roles remain production-focused
- owner/admin retain configuration and destructive management permissions
- every mutation validates tenant ownership of table, order, item, product, customer, and printer resources
- public table operations validate table token/session/PIN rules
- payment webhook verification must use the correct tenant HitPay secret
- secrets must never enter Angular bundles or logs

## 18. Testing strategy

### 18.1 Backend unit and integration tests

- role permission parity
- table activation and close invariants
- one active bill per table
- append items to existing bill
- order item state transitions
- cash/terminal settlement
- HitPay request, return, and webhook idempotency
- automatic kitchen and receipt print jobs
- tenant isolation

### 18.2 Frontend unit tests

- table/order route restoration
- product filter and search
- required modifier validation
- bill quantity/edit/remove behavior
- payment rail selection
- grouped Orders selectors
- combined KDS station filtering
- event reducer duplicate handling

### 18.3 End-to-end scenarios

1. Cashier opens a clear table, adds a direct item, takes cash, and clears the table.
2. Host uses the same credentials boundary to seat a queue guest and open POS.
3. Cashier adds a required-modifier product and edits it before payment.
4. Customer QR order appears in Orders and KDS without refresh.
5. Cashier adds more food to an already open table bill.
6. Terminal payment records `terminal` and produces both print jobs.
7. HitPay redirects, returns, reconciles, and does not double-charge or double-print.
8. KDS sees food and beverage tickets together and filters by station.
9. Kitchen marks individual lines preparing and ready.
10. Orders groups multiple bills under the correct table.
11. Unpaid table cannot be cleared.
12. Paid table can be cleared and reused.
13. Network loss retains bill state and recovers.
14. WebSocket loss falls back to HTTP refresh.
15. A second tenant cannot access the first tenant's operational records.

### 18.4 Visual and accessibility QA

- 1366x768 desktop
- 1280x800 terminal
- 1024x768 tablet landscape
- iPad portrait only for supported staff utility flows
- 200% zoom smoke test
- keyboard-only primary workflow
- visible focus and alerts
- reduced-motion preference
- long names, large prices, and translated labels

## 19. Observability and operations

Add structured logs and metrics for:

- order creation latency and failures
- payment request and reconciliation outcomes
- duplicate/idempotent payment handling
- WebSocket connected clients and reconnects
- print queue depth, lease age, retries, and failures
- stale active tables and stale production tickets
- API error rate by endpoint and tenant-safe correlation ID

Do not log passwords, JWTs, HitPay keys, webhook salts, table PINs, or full customer payment data.

## 20. Phased implementation plan

### Phase 1: State contracts and workflow invariants

Goal: make all three screens operate from one explicit lifecycle.

Deliverables:

- document and codify table/order/payment/production transition guards
- introduce typed operational DTOs and event contracts
- add one-active-bill and append-to-bill regression tests
- introduce shared operator/table/order context services without changing visual design
- make route/query restoration deterministic

Merge boundary:

- backend contract/tests can merge independently from frontend store adapters
- no broad visual redesign in this phase

Acceptance:

- the same table/order selected in Tables opens the same bill in POS and Orders
- duplicate order creation is prevented
- refresh and reconnect preserve context

### Phase 2: POS speed and payment reliability

Goal: finish the cashier's primary transaction loop.

Deliverables:

- dense three-lane desktop POS
- product image and modifier polish
- persistent bill and payment dock
- safe append-to-open-bill behavior
- cash, terminal, and HitPay error/recovery states
- settlement idempotency and print-job assertions

Acceptance:

- a trained cashier completes a standard order without page scrolling
- successful payment appears once and creates exactly the intended print jobs

### Phase 3: Table operations

Goal: make the floor board the source of operational truth.

Deliverables:

- floor/canvas and dense fallback layouts
- selected-table dock
- table-specific current and historical orders
- queue/reservation guest handoff
- clear-table safeguards and table grouping polish

Acceptance:

- any table state is understood in under three seconds
- every table action reaches the correct order and returns to the same floor context

### Phase 4: Orders and production operations

Goal: turn Orders and KDS into fast exception-management surfaces.

Deliverables:

- table-grouped live Orders queue
- server-side history filtering/pagination
- selected-order action panel
- typed real-time event reducer
- combined KDS station and backlog polish
- production/receipt print monitoring links

Acceptance:

- operators can identify the next action without opening every card
- food and beverage production remain synchronised with paid/open bills

### Phase 5: Production hardening

Goal: complete market-readiness acceptance.

Deliverables:

- full E2E suite
- accessibility and supported-viewport pass
- query/load performance pass
- hosted Render/WebSocket/HitPay QA
- physical printer acceptance when hardware is available
- operational runbooks and rollback checklist

## 21. Phase 1 first implementation slice

The next developer should begin with this narrow slice:

1. define a typed `OperatorEvent` contract in backend and frontend
2. define explicit table/order/payment transition helper functions
3. add tests for opening a clear table, resuming an occupied table, and appending items
4. add a signal-based operator context service that synchronises `tableId` and `orderId`
5. adapt POS, Tables, and Orders to read selected context through the service without changing their current APIs
6. verify refresh, browser back/forward, and WebSocket refresh do not lose selection

Do not begin the visual Phase 2 redesign until these state and navigation acceptance tests pass.

## 22. Definition of done

A phase is complete only when:

- backend permissions and tenant isolation are enforced
- API and frontend types agree
- unit/integration tests pass
- production Angular build passes
- relevant hosted or local E2E scenarios pass
- desktop and tablet layouts are visually checked
- loading, empty, error, success, and reconnect states are covered
- handoff documentation is updated with exact deployment and migration requirements

## 23. Explicit non-goals

- split payments or split tender
- replacing Angular or FastAPI
- replacing HitPay with another provider
- deleting customer feedback APIs merely because the staff tab is removed
- separate kitchen and beverage applications
- relying on physical printer testing before application development can continue
- a full visual rewrite before state contracts and workflow invariants are stable
