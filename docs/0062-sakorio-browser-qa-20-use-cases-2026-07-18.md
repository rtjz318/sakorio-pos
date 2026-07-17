# Sakorio POS browser QA: 20 launch use cases

Date: 2026-07-18  
Environment tested: live Sakorio domains via browser only  
Frontend build observed: `2.1.6 8e4d35c2`  
Primary staff domain: `https://staff.sakorio.com`  
Customer domains used: `https://staff.sakorio.com/book/1`, `https://order.sakorio.com/menu/...`, `https://order.sakorio.com/waitlist/1`

## Executive summary

Overall launch readiness score from this pass: **7.9 / 10**.

The core flow works end-to-end: a public reservation can be created, staff can assign a table, staff can open the table, a QR customer can self-order, kitchen sees the ticket, POS can take terminal payment, Orders moves the bill from active to history, and staff can clear the table.

The biggest launch blockers are workflow clarity rather than raw operability:

1. **Reservation assignment does not seat/open the table.** A customer QR page remains `Table Closed` after reservation assignment until staff manually opens the table by sending an item.
2. **Reservations need a clear Arrived / Seated / Finished lifecycle.** After the paid table is cleared, the table returns to `Reserved` because the reservation itself is still `BOOKED`.
3. **Public reservation "View or cancel my reservation" button is non-functional.**
4. **POS post-payment "Clear table" outcome button exists in DOM but is hidden / unclickable; staff must use the table card's visible `Clear paid` action instead.**
5. **Kitchen still has large old/test backlog noise.** Warning is visible, but cleanup action is not clear enough.

## Use case results

| # | Use case | Browser steps executed | Result | UI/UX | Workflow | Improvement needed |
|---:|---|---|---|---:|---:|---|
| 1 | Customer creates public reservation | Opened public booking page, selected 18:00, submitted `QA Reservation QA994793`, received reservation `#39`. | Pass | 8.5 | 8.5 | Confirmation should show a real working manage/cancel link. |
| 2 | Waiter assigns reservation to table | Staff Reservations showed `#39`; clicked Assign table; selected available `T09`. | Pass with gap | 8.0 | 7.0 | Assignment should offer "Seat now / open table" after table assignment. |
| 3 | Customer QR immediately after assignment | Opened T09 QR link from Table QR before staff opened table. | Blocked as designed, but confusing | 6.5 | 5.5 | Reservation assignment should explain QR remains closed until table is opened, or auto-open on seating. |
| 4 | Staff opens reserved table from Tables | From T09 table service, added Water and clicked `Open table & send`. | Pass | 8.0 | 8.0 | Avoid requiring a dummy/opening item just to activate QR self-order. |
| 5 | Customer QR self-order | Reloaded QR, entered guest name, selected Coffee, added to cart, placed order. | Pass | 8.5 | 8.3 | Order confirmation was delayed; add clearer "sending" and success feedback. |
| 6 | Customer payment options after self-order | Customer order showed `Pay Now`; no Cash option appeared. | Pass | 9.0 | 9.0 | Good: customer cash removed. |
| 7 | Kitchen receives staff + customer order | Kitchen showed order `#52`, T09, guest `QA Guest Self Order`, Water + Coffee. | Pass with noise | 7.0 | 7.5 | Old backlog makes new orders harder to spot; launch cleanup required. |
| 8 | POS checkout for live table | Opened `/pos?tableId=9&orderId=52`, chose Bill/Pay, selected Terminal, submitted. | Pass | 8.0 | 8.5 | Drawer works, but underlying legacy POS content still adds visual noise. |
| 9 | Paid table clear after checkout | T09 became `Ready / Last bill #52 Paid`; visible table-card `Clear paid` worked. | Partial | 6.8 | 7.5 | Post-payment drawer `Clear table` button was hidden at 0x0; fix visibility/clickability. |
| 10 | Orders current vs history | Active Orders did not show #52; Order History showed #52 with guest and items. | Pass | 9.0 | 9.0 | Good separation of active/current and history. |
| 11 | Queue walk-in capture | Added `QA Walk-in QA994793` from staff Queue with phone, party size, notes. | Pass | 8.5 | 8.5 | Good host-stand flow. |
| 12 | Queue notify guest | Clicked Notify guest; entry moved from Waiting to Notified. | Pass | 8.0 | 8.5 | Good status movement. |
| 13 | Queue no-table fallback | Queue showed `0 ready`; seating blocked with clear message. | Pass | 8.2 | 8.0 | Good, but dashboard data should be cleaned so launch staff see realistic availability. |
| 14 | Convert queue to reservation | Filled date/time/email/notes; created reservation `#40` from queue. | Pass | 8.2 | 8.5 | Good fallback path. |
| 15 | Public waitlist join | Opened `order.sakorio.com/waitlist/1`, submitted `QA Public Waitlist QA994793`. | Pass | 9.0 | 9.0 | Good customer-side flow; submit disabled until required fields are complete. |
| 16 | Staff sees public waitlist | Staff Queue showed public entry as `WEB WAITLIST` with phone and notes. | Pass | 8.8 | 9.0 | Good staff/customer handoff. |
| 17 | Public waitlist leave queue | Customer clicked Leave queue; page showed cancelled and Join again; staff no longer showed active entry. | Pass | 9.0 | 9.0 | Good cancellation sync. |
| 18 | Staff reservation cancellation | Staff cancelled #39 with confirmation modal; reservation moved to `CANCELLED`; T09 returned to idle. | Pass | 8.5 | 8.5 | Good cleanup path. |
| 19 | Reservation status filtering | Selected Cancelled filter; #39 appeared with `CANCELLED` and active counts dropped to zero. | Pass | 8.8 | 8.8 | Good. |
| 20 | Support tabs: POS idle, Kitchen controls, Reports, Timetable, Inventory, My Shift | Checked idle T09 POS drawer, Kitchen route/backlog, Reports anchors, Timetable roster/iPad hints, Inventory stock dashboard, My Shift profile selector. | Mixed pass | 8.0 | 7.5 | Reports jump links render but hash did not update; Inventory launch guidance is on `/inventory/stock`, not default Inventory; My Shift profile selector works but no current shift available. |

## Detailed notes by module

### Reservations

What worked:

- Public booking page can create reservations.
- Staff Reservations sees new bookings immediately.
- Table assignment works.
- Staff-side cancellation has a confirmation modal and correctly frees the table.
- Cancelled filter works.

Needs improvement:

- Add an explicit `Arrive / Seat / Finish` reservation workflow.
- After assigning a table, offer a primary action: `Seat and open table`.
- Public confirmation says "View or cancel my reservation", but the button did nothing in browser testing.
- Reservation assignment alone should either open QR ordering or clearly state that QR ordering remains locked until table opening.

### Tables

What worked:

- Tables highlights incoming reserved table state.
- T09 returned to `IDLE TABLE` after staff cancelled the reservation.
- Table QR link is visible and copyable.

Needs improvement:

- `ADVANCED CONTROLS` still appears loudly on every card. It is collapsed, but the repeated label creates visual noise.
- For launch, table cards should prioritize: table name, state, guest/reservation, primary action.

### Customer QR ordering

What worked:

- Closed tables correctly block QR ordering.
- Once staff opens the table, customer can enter name, add item, place order.
- Customer sees `Pay Now`; Cash is not shown.

Needs improvement:

- The transition after Place order needs clearer loading/success feedback.
- After staff closes the bill/table, customer QR returns to `Table Closed`; there is no obvious receipt/session summary screen.

### POS checkout

What worked:

- POS selected-table drawer opens for idle and live tables.
- Idle T09 drawer showed `Ready for a new order`.
- Live T09 bill showed correct total and items.
- Terminal checkout recorded payment.
- Orders moved correctly into history.

Needs improvement:

- The legacy POS layout/content remains visible beneath the drawer in DOM and may still feel crowded.
- The drawer-level post-payment `Clear table` action was hidden/unusable; visible table-card `Clear paid` worked.
- Staff cash is still available for staff POS, correctly labelled as internal staff cash. If the launch policy is terminal/HitPay only for staff too, remove or permission-gate staff cash.

### Kitchen & beverages

What worked:

- New order #52 appeared in Kitchen with T09 and guest name.
- Route buttons for All / Kitchen / Beverages exist.
- Backlog warning text is visible.

Needs improvement:

- Old/test backlog dominates the live board and must be cleaned before launch.
- `Review / clear backlog` did not clearly open a cleanup mode in this pass.
- Consider a "Today only / Live service" default that hides stale tickets even more aggressively.

### Queue

What worked:

- Staff can add walk-ins.
- Staff can notify guest.
- Public waitlist page works.
- Public waitlist entry appears as `WEB WAITLIST`.
- Customer leave queue syncs back to staff.
- Queue-to-reservation conversion works.

Needs improvement:

- When no tables are ready, Queue correctly blocks seating, but launch seed/test data makes this hard to evaluate.
- Seat-to-table should be retested after old paid/open test tables are cleaned.

### Reports

What worked:

- Summary, Products, Categories, Tables, Attendance jump chips render.
- Target section IDs exist.

Needs improvement:

- Clicking `Tables` did not update `location.hash` in the browser test. If scroll happens visually, the state is still not obvious. Anchor behavior should be made deterministic.

### Timetable

What worked:

- Timetable page loads with roster panel.
- iPad/desktop guidance is visible: tap Schedule on iPad, drag on desktop.
- Coverage warning is visible.
- Annual leave / MC balance panel is visible.

Needs improvement:

- Leave ledger is still described as future-ready rather than fully enabled.
- For launch, decide whether leave balance functionality is required or should be marked "coming soon."

### Inventory

What worked:

- `/inventory/stock` shows Stock Dashboard.
- Empty inventory guidance says: `Inventory setup needed`.
- Quick actions for Manage items / Create PO / Suppliers exist.

Needs improvement:

- Default `/inventory` opens Inventory Items, not the Stock Dashboard. If managers expect a dashboard, make Stock Dashboard the default or make the sidebar label clearer.

### My Shift

What worked:

- Staff profile selector exists.
- Staff can select Ajisen / Jason Tan.
- No available shift state is clear.

Needs improvement:

- Clock-in cannot be fully tested without an active shift. Schedule a current shift for Jason/Ajisen and rerun photo clock-in/out.

## Recommended next fixes

Priority 1:

1. Add `Seat / Arrive / Finish reservation` lifecycle and link it to table opening.
2. Fix public reservation "View or cancel my reservation" button.
3. Fix hidden POS drawer `Clear table` button after payment.
4. Clean old kitchen/orders test backlog before launch testing.

Priority 2:

5. Make staff table assignment safer: available tables first, occupied/open-order tables behind warning.
6. Make Reports jump links update hash/scroll reliably.
7. Reduce repeated `ADVANCED CONTROLS` noise on table cards.
8. Improve customer post-payment/closed-table session summary.

Priority 3:

9. Decide whether staff POS cash remains allowed or should be terminal/HitPay only.
10. Make Inventory landing default to Stock Dashboard if the user selects "Inventory".
11. Enable or hide leave balance deduction until the ledger is complete.
12. Schedule a live shift and rerun My Shift clock-in/out QA.
