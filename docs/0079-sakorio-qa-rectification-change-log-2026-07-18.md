# Sakorio POS QA Rectification Change Log

Date: 2026-07-18  
Source QA briefs: `0077-sakorio-exhaustive-browser-qa-results-batch-1-2026-07-18.md`, `0078-sakorio-exhaustive-browser-qa-results-batch-2-2026-07-18.md`

## Scope

This batch focuses on launch-readiness defects found during the browser QA simulations. Printer integration remains a future fix and is intentionally not included in this code batch.

## Changes completed

### 1. QR customer session privacy and stale identity cleanup

Problem observed: after table/session changes, the QR ordering page could retain stale browser-local customer/order state.

Change:
- Public menu responses now include `table_session_started_at`.
- QR ordering reconciles the table activation marker with local browser state.
- When a table is closed, QR local session/order/customer state is cleared.
- Backward-compatible active-order matching is preserved for existing sessions.

Expected QA improvement:
- A customer who scans a newly activated QR should only see the current table session.
- A closed table should show the closed-state message, not previous customer orders.

### 2. Customer terminal payment request no longer makes an order look paid

Problem observed: an unpaid order could appear paid/clearable after a terminal payment request because `payment_method` was being treated as payment truth.

Change:
- Customer `/request-payment` records a bill request without setting `order.payment_method`.
- POS `isPaid()` now only treats `paid_at` or explicit `status = paid` as paid.
- POS clear-table logic blocks unpaid bills and shows a visible error in the table drawer.

Expected QA improvement:
- Orders such as T09 #58 should stay `Awaiting payment` until the payment is actually completed.
- `Clear table` should not appear for unpaid bills.

### 3. POS current-session and paid-today logic

Problem observed: POS and Orders could disagree about which bills were live/current, and old paid orders polluted cashier totals.

Change:
- POS open/live bill lists now include unpaid current-session orders even if their order status is closed/completed.
- Cancelled orders are excluded from live-payment queues.
- Paid totals are limited to orders actually paid today.
- Backend timestamp parsing now treats timezone-less backend timestamps consistently.

Expected QA improvement:
- Current table orders remain current until the table is cleared.
- Same-customer add-ons stay under the live table session instead of moving prematurely to history.

### 4. POS selected-table drawer layout polish

Problem observed: the service-loop copy had visual/text collisions such as `Start this table orderChoose items...`.

Change:
- The POS service-loop copy now has explicit grid layout, block text rows, wrapping, and min-width safeguards.
- Metrics and action rows can wrap on iPad/narrow browser widths instead of overlapping.

Expected QA improvement:
- Table drawer guidance, metrics, and buttons should remain readable on iPad-like widths.

### 5. Reservation action operability

Problem observed: booked reservation actions were hidden behind a `More` dropdown that was unreliable during browser QA; cancelling reservation #42 timed out.

Change:
- Replaced the dropdown with visible secondary action buttons: Queue, Reminder, Edit, No-show, Cancel.
- Removed stale dropdown-close logic.
- Buttons wrap cleanly on smaller screens.

Expected QA improvement:
- Hosts can cancel/no-show/edit/queue a reservation without opening a hidden menu.
- Reservation #42 cleanup should be straightforward after redeploy.

### 6. Reservation phone and capacity guidance

Problem observed: phone validation worked but the expected format was not obvious; oversized parties removed time slots without a clear explanation.

Change:
- Added visible phone format guidance: `Use international format, for example +65 9123 4567.`
- Added capacity warnings when party size exceeds the configured booking limit or selected-slot availability.

Expected QA improvement:
- Hosts should understand whether a booking failed because of phone format, party-size limit, no tables, or insufficient seats.

### 7. Kitchen backlog safety

Problem observed: backlog mode showed a large stale pile and a bulk `Complete visible backlog` action, creating operational risk.

Change:
- Bulk backlog completion is locked when more than 25 stale tickets are visible.
- The UI tells kitchen/manager users to narrow station/route filters and clear reviewed batches.
- Existing browser confirmation remains in place for smaller reviewed batches.

Expected QA improvement:
- Kitchen live-shift view stays clean.
- Large backlog cleanup cannot be accidentally completed in one broad action.

### 8. Staff logout clarity

Problem observed: logout did not visibly end the browser session during QA.

Change:
- Staff sidebar logout now navigates directly to `/login` after clearing auth state.
- Backend logout deletes cookies with the same production security attributes used when setting them.

Expected QA improvement:
- After logout, protected pages should redirect to login or require authentication.

## Follow-up QA pass checklist

Run these in browser after redeploy:

1. T09 unpaid order recovery: Orders → Collect payment → POS must show unpaid/payable, not paid/clearable.
2. Table add-on flow: create first order, add second order on same table, confirm both remain current until table clear.
3. QR privacy: close table, reopen/new session, scan QR, confirm no previous-session history appears.
4. POS iPad width: open table drawer and confirm service-loop text/buttons do not overlap.
5. Reservation #42 cleanup: find the booked QA cancellation reservation and cancel it using the visible Cancel button.
6. Reservation oversized party: set party above limit and confirm warning copy is visible.
7. Kitchen backlog: open backlog with many stale tickets and confirm bulk completion is locked until filters reduce count to 25 or fewer.
8. Staff logout: click Logout, confirm `/login`, then try a protected tab and confirm it requires auth.

## Known future items

- Printer / receipt routing remains intentionally parked for a future hardware/integration pass.
- My Shift camera-based clock-in still requires device/hardware validation in a browser session with camera access.
