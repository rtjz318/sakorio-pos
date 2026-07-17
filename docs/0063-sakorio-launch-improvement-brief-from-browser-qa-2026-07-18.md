# Sakorio launch improvement brief from browser QA

Date: 2026-07-18  
Source QA brief: `docs/0062-sakorio-browser-qa-20-use-cases-2026-07-18.md`  
Tested frontend build: `2.1.6 8e4d35c2`  
Purpose: convert the 20 browser-tested restaurant use cases into a focused improvement plan.

## Launch readiness summary

The POS system is functional end-to-end, but several launch-facing workflows need polish before real service. The most important problem is not that the system cannot complete orders; it is that staff must know hidden sequence rules.

Example: reservation -> assign table -> QR self-order does not work immediately. The staff must first open the table by sending an item. A trained tester can discover this, but a real waiter during dinner rush should not need to.

## Improvement priorities

### P0 - Must fix before launch sandbox sign-off

These issues can directly block customers or confuse staff during normal service.

#### 1. Add a real reservation arrival/seating lifecycle

Observed in use cases: 1, 2, 3, 4, 18, 19.

Current behavior:

- Customer creates reservation successfully.
- Staff can assign reservation to a table.
- The reservation remains `BOOKED`.
- Assigned table can still be closed for QR ordering.
- After a paid bill is cleared, the table can return to `Reserved` because the reservation never became seated/finished.

Needed behavior:

- Reservation statuses should support an obvious service flow:
  - `Booked`
  - `Arrived`
  - `Seated`
  - `Finished`
  - `Cancelled`
  - `No-show`
- Staff should have a primary action:
  - `Seat now`
  - `Seat and open table`
  - `Finish reservation`
- Seating a reservation should bind the reservation to the table session and open the table for ordering.

Acceptance criteria:

- From Reservations, staff assigns a table and clicks `Seat and open table`.
- Table changes from reserved to live/seated.
- QR page accepts orders without requiring staff to send a dummy item.
- After payment and close table, reservation becomes `Finished`, not still `Booked`.
- Tables tab no longer shows the old reservation as blocking the table after the table session is closed.

Suggested implementation notes:

- Backend should have explicit reservation transition endpoint(s), e.g. seat/finish/no-show/cancel.
- Table opening should be part of the seat action when requested.
- Tables and POS should read reservation session state, not only `active_order_id`.

#### 2. Fix public reservation manage/cancel button

Observed in use case: public reservation confirmation.

Current behavior:

- Confirmation text says: `View or cancel my reservation`.
- It renders as a button.
- Clicking does not navigate or reveal management UI.

Needed behavior:

- Customer can view reservation status from confirmation.
- Customer can cancel using the token/session link.

Acceptance criteria:

- After public booking confirmation, clicking `View or cancel my reservation` opens a status page.
- Status page shows reservation number, date/time, party size, name, table if assigned, and current status.
- `Cancel reservation` works and updates staff Reservations to `Cancelled`.

Suggested implementation notes:

- Confirm route/token generation in public booking success response.
- Render a real router link or implement a working click handler.
- Add a browser regression test for public booking -> manage -> cancel.

#### 3. Fix POS drawer post-payment Clear table button

Observed in use case: 9.

Current behavior:

- After terminal payment, the drawer contains `Clear table`.
- Browser measured this button at `0x0`; it was hidden/unclickable.
- Staff had to use the table card's visible `Clear paid` action instead.

Needed behavior:

- The post-payment outcome panel must expose a clear, visible `Clear table` action.
- Staff should not have to search another part of the page after payment.

Acceptance criteria:

- After staff settlement, drawer shows visible:
  - payment success message,
  - `Clear table`,
  - `View receipt`,
  - `Back to tables`.
- `Clear table` is clickable and returns table to idle/available.
- Button is visible on iPad viewport.

Suggested implementation notes:

- Inspect drawer conditional rendering and CSS layout after `lastCheckoutOutcome`.
- Ensure action row is not inside a hidden/zero-size container.
- Add a browser smoke path for order -> terminal payment -> clear table.

#### 4. Clean or isolate kitchen/test backlog

Observed in use case: 7 and Kitchen focused checks.

Current behavior:

- New order appears correctly.
- Old tickets dominate Kitchen board.
- Backlog warning appears, but `Review / clear backlog` did not clearly open a cleanup workflow.

Needed behavior:

- Live Kitchen should show today's actionable tickets by default.
- Old test/training tickets should not dominate launch service.

Acceptance criteria:

- Kitchen default view shows only live/current-shift tickets.
- Backlog is reachable in a separate clearly labelled mode.
- Backlog screen gives staff safe actions:
  - `Hide from live shift`
  - `Mark training/test resolved`
  - `Bulk close stale test tickets` for admin/owner only.

Suggested implementation notes:

- Add stricter default filtering for stale orders.
- Consider a one-time admin cleanup command for staging/test data.
- Keep audit trail if closing old tickets.

### P1 - Important UX polish before launch

These are not total blockers, but they reduce speed and confidence during real operations.

#### 5. Make reservation-to-table assignment safer

Observed in use case: 2.

Current behavior:

- Assign-table drawer shows available, occupied, open-order, and ready-to-serve tables together.
- It is possible to assign to risky tables.

Needed behavior:

- Available matching tables should be first and visually recommended.
- Occupied/open-order/paid-but-not-cleared tables should be behind warning affordance.

Acceptance criteria:

- Table assignment groups:
  - Recommended available tables
  - Larger available tables
  - Risky/unavailable tables
- Clicking risky table requires confirmation.
- Table capacity mismatch is highlighted.

#### 6. Reduce repeated Advanced Controls noise on table cards

Observed in Tables and POS use cases.

Current behavior:

- `ADVANCED CONTROLS` appears on every table tile.
- It is collapsed, but repeated label creates visual noise.

Needed behavior:

- Advanced table admin tools should not compete with service actions.

Acceptance criteria:

- Staff service view prioritizes:
  - table,
  - status,
  - guest/reservation,
  - current order,
  - primary action.
- Advanced controls are minimized to a small icon/menu or shown only on hover/expanded admin mode.

#### 7. Tighten POS selected-table drawer dominance

Observed in use cases: 8, 20.

Current behavior:

- New POS drawer works.
- Legacy underlying table/recovery/checkout content is still visible in DOM and contributes to visual crowding.

Needed behavior:

- Once a table is selected, the table drawer should feel like the only active work surface.

Acceptance criteria:

- On iPad, selected table view fits in one screen as much as possible.
- Cart/payment remains on the right at tablet width.
- No duplicated checkout controls confuse the cashier.
- Back/switch table is always visible.

#### 8. Improve customer order submission feedback

Observed in use case: 5.

Current behavior:

- Customer clicked Place order.
- It succeeded, but the confirmation/update was delayed enough to look like nothing happened.

Needed behavior:

- Customer should immediately see feedback.

Acceptance criteria:

- On Place order click:
  - button changes to `Sending...`,
  - duplicate clicks are blocked,
  - success toast or current order card appears promptly,
  - errors are visible and actionable.

#### 9. Add customer post-payment/session summary

Observed after staff paid/cleared T09.

Current behavior:

- After table clear, customer QR page returns to `Table Closed`.
- Customer does not see final paid/current-session summary.

Needed behavior:

- Customer should understand the session is paid/closed.

Acceptance criteria:

- If the customer's session just paid/closed, customer sees:
  - `Bill paid / Table closed`,
  - items,
  - total,
  - payment status,
  - ask staff if more help is needed.

#### 10. Make Reports jump navigation deterministic

Observed in use case: Reports focused check.

Current behavior:

- Jump chips render.
- Target section IDs exist.
- Clicking `Tables` did not update `location.hash` in the browser pass.

Needed behavior:

- Report jumps should visibly and predictably move managers to sections.

Acceptance criteria:

- Clicking jump chip scrolls to correct section.
- URL hash updates.
- Active/current chip state is clear if feasible.

### P2 - Launch cleanup and operational readiness

These can be done after P0/P1, but should be completed before a real restaurant launch.

#### 11. Decide staff POS cash policy

Current behavior:

- Customer QR has no Cash option.
- Staff POS still has `Staff cash` for internal settlement.

Decision needed:

- If Sakorio launch policy is terminal/HitPay only even for staff, remove or permission-gate staff cash.
- If staff cash is allowed for counter settlement, current labeling is acceptable.

#### 12. Inventory default route

Observed in Inventory checks.

Current behavior:

- Sidebar `Inventory` opens Inventory Items.
- Stock Dashboard with launch guidance is at `/inventory/stock`.

Needed decision:

- If managers expect dashboard first, change Inventory default to Stock Dashboard.
- Otherwise rename sidebar or make the subnav clearer.

#### 13. Timetable leave ledger scope

Observed in Timetable checks.

Current behavior:

- Annual leave / MC panel is visible.
- Copy says entitlement tracking will deduct balances once the ledger is enabled.

Needed decision:

- Either implement leave deduction ledger before launch or mark it clearly as coming soon/admin-preview.

#### 14. My Shift clock-in/out full test

Observed in My Shift check.

Current behavior:

- Staff profile selector exists.
- No current shift available, so clock-in could not be completed.

Needed behavior:

- Schedule a live shift and rerun full clock-in/out with camera/photo proof.

Acceptance criteria:

- Staff selects own profile.
- Staff sees active scheduled shift.
- Clock-in works.
- Clock-out works.
- Reports attendance reflects session.

## Recommended implementation order

### Batch 1 - Reservation/table lifecycle

1. Reservation status transitions.
2. `Seat and open table`.
3. QR unlock after seating.
4. Finish reservation after close table.
5. Regression test: booking -> assign -> seat/open -> QR order -> payment -> close.

### Batch 2 - Public reservation self-service

1. Fix manage/cancel button.
2. Add status/cancel page checks.
3. Regression test: public booking -> manage -> cancel -> staff sees cancelled.

### Batch 3 - POS checkout polish

1. Fix hidden post-payment `Clear table`.
2. Reduce duplicated/legacy visual noise in POS selected table view.
3. Regression test: POS order -> terminal -> clear table.

### Batch 4 - Kitchen launch cleanup

1. Hide stale tickets from live board by default.
2. Make backlog review/cleanup action obvious.
3. Add admin cleanup path for test/training tickets.

### Batch 5 - Secondary polish

1. Table assignment safety.
2. Table card admin noise reduction.
3. Customer order submission feedback.
4. Customer post-payment summary.
5. Reports anchor behavior.
6. Inventory landing decision.
7. Timetable leave ledger decision.
8. My Shift live-shift test.

## Definition of launch-ready for this area

The POS/reservation/table system can be considered launch-ready when:

- A first-time waiter can seat a reservation and enable customer QR ordering without knowing hidden steps.
- Customer reservation self-service works.
- Customer QR order flow gives clear confirmation and payment state.
- POS checkout and clear-table actions are visible and one-path.
- Kitchen default view shows only actionable service tickets.
- Orders current/history separation remains correct after multiple add-ons and close-table events.
- Queue public/staff flows continue to work after table cleanup.

