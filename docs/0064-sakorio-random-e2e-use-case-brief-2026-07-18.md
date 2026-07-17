# Sakorio POS Launch QA Brief — 20 Random End-to-End Use Cases

Date: 2026-07-18  
Scope: POS, Tables, Orders, Kitchen/Beverages, Queue, Reservations, Timetable, Shifts, Users, Reports, Inventory  
Purpose: Generate realistic restaurant end-to-end scenarios for the next browser QA and polish pass before launch.

## How to use this brief

Each use case should be executed through the browser on the deployed Sakorio domains after redeploy:

- Staff/admin: `https://staff.sakorio.com/login`
- Customer QR/order: `https://order.sakorio.com/menu/{tableToken}`
- Public booking/queue where applicable: public Sakorio booking/queue links

For every simulated use case, record:

- Pass/fail for every step.
- UI/UX friction: confusing labels, excessive scrolling, hidden buttons, unclear state.
- Workflow smoothness: whether staff can complete it during a real service rush.
- Data correctness: table status, order status, reservation status, bill totals, order history/current-session separation.
- Notification/production correctness: kitchen/bar ticket visibility, waiter order visibility, receipt/printer placeholder behavior.
- Improvement notes, even when the use case technically passes.

Printing note: receipt printing is still marked as a future implementation area. During QA, validate that the workflow exposes the right print/receipt moments or placeholders, not that physical printing is complete.

## Use Case 1 — Reservation arrival to QR self-order to service close

Primary actors: customer, waiter, kitchen, cashier  
Main modules: Reservations, Tables, Customer QR, Kitchen/Beverages, POS, Orders

Steps:

1. Customer creates a reservation online for today.
2. Staff opens Reservations and finds the booking.
3. Waiter assigns the reservation to a suitable table.
4. Customer arrives.
5. Waiter uses `Seat & open POS` or equivalent reservation seating action.
6. Table becomes active/open for QR ordering.
7. Customer scans QR and orders food and beverage.
8. Kitchen receives food items; beverages receives drink items.
9. Waiter can see the table’s current-session order in Orders/Tables/POS.
10. Kitchen marks food preparing/ready/served or delivered.
11. Beverage station marks drinks ready/served.
12. Customer adds one more QR order during the same seated session.
13. The added order remains part of the current table session, not history.
14. Cashier checks out via terminal/HitPay/staff payment flow.
15. Table shows paid/ready to clear.
16. Waiter clears/closes table.
17. Reservation becomes finished only after service/table close.

Expected result:

- Reservation lifecycle is clear: booked → seated → finished.
- QR order is accepted only after table is active.
- Kitchen/bar tickets are clear and separated.
- Orders tab shows only current session before close.
- History receives orders only after table close.
- Clear table action is visible and usable.

Key risks to inspect:

- Reservation action wording.
- QR table closed state before seating.
- Multiple same-session orders wrongly moving older orders into history.
- Hidden or tiny clear table buttons.
- Kitchen/bar ticket clutter.

## Use Case 2 — Walk-in queue to table to staff POS order to checkout

Primary actors: host, waiter, kitchen, cashier  
Main modules: Queue, Tables, POS, Kitchen, Orders

Steps:

1. Host creates a walk-in queue entry for a party of 3.
2. Host quotes wait time and saves guest phone/name.
3. A suitable table becomes free.
4. Host seats the queue entry at a table.
5. Waiter opens POS from the table.
6. Waiter adds food and drinks from POS menu.
7. Waiter submits order.
8. Kitchen/bar receive tickets.
9. Waiter returns to floor view without losing table context.
10. Waiter later reopens same table and adds dessert.
11. Dessert order joins same active table session.
12. Cashier checks out.
13. Table is cleared.
14. Queue entry becomes seated/completed as appropriate.

Expected result:

- Queue-to-table handoff is simple and visible.
- Staff can return to table selection easily after adding items.
- All orders stay in the same current session until table close.
- Queue record does not remain stuck as waiting after seating.

Key risks to inspect:

- Queue status transitions.
- Table matching by party size.
- POS flow returning to floor/table selection.
- Order session grouping.

## Use Case 3 — Reservation no-show during peak service

Primary actors: host, manager  
Main modules: Reservations, Tables, Queue, Reports

Steps:

1. Customer has a reservation assigned to a table.
2. Reservation time passes.
3. Customer does not arrive.
4. Staff marks reservation as no-show.
5. Assigned table is released.
6. Host seats a queue/walk-in party into the released table.
7. Later, manager checks reports/reservation stats.

Expected result:

- No-show action is easy to find under reservation actions.
- Table is no longer blocked by the no-show reservation.
- The released table can be used immediately.
- No-show is reflected in reports/summary.

Key risks to inspect:

- No-show action buried too deeply.
- Table remains visually reserved.
- Reports counting no-shows incorrectly.

## Use Case 4 — Customer changes/cancels reservation from public link

Primary actors: customer, host  
Main modules: Public booking, Reservation view, Reservations

Steps:

1. Customer creates a public reservation.
2. On success page, customer clicks `View or cancel my reservation`.
3. Reservation management page opens using the token.
4. Customer adds a delay notice or reservation note.
5. Staff sees delay/note on Reservations page.
6. Customer cancels the reservation from public page.
7. Staff sees reservation as cancelled.
8. Assigned table, if any, is released.

Expected result:

- Manage reservation button/link always navigates.
- Public token page loads without staff login.
- Delay/cancel changes are visible to staff.
- Cancelled reservations do not block seating.

Key risks to inspect:

- Public manage link reliability.
- Token route errors.
- Cancelled reservation still occupying a table.

## Use Case 5 — Customer QR order before table is opened

Primary actors: customer, waiter  
Main modules: Customer QR, Tables, Reservations/POS

Steps:

1. Customer scans QR before being seated or before table is opened.
2. Customer sees a clear `table closed/not accepting orders` state.
3. Waiter opens/seats the table.
4. Customer refreshes QR page.
5. Menu is available.
6. Customer orders successfully.

Expected result:

- Closed-table state is friendly and instructive.
- Once table is opened, QR ordering works without generating duplicate sessions.

Key risks to inspect:

- Customer confusion.
- QR page requiring unnecessary PIN.
- Refresh not updating table active state.

## Use Case 6 — Staff POS table switching during rush

Primary actors: waiter  
Main modules: POS, Tables

Steps:

1. Waiter opens POS floor.
2. Waiter selects Table 1.
3. Waiter adds two items.
4. Waiter submits order.
5. Waiter returns to table floor quickly.
6. Waiter selects Table 8.
7. Waiter adds items.
8. Waiter returns again to floor.
9. Waiter reopens Table 1 and adds one more item.

Expected result:

- POS behaves like Tables flow: floor first, then table drawer/workspace.
- Waiter does not get trapped on checkout/order page.
- Table switching is obvious and fast.
- Cart does not leak from one table to another.

Key risks to inspect:

- Excessive scrolling inside POS drawer.
- Cart/session leakage.
- Back-to-floor action hidden.

## Use Case 7 — Split production routing: food to kitchen, drinks to beverages

Primary actors: waiter, kitchen staff, bartender  
Main modules: POS/QR, Kitchen Display, Beverages

Steps:

1. Order contains food, coffee, and bottled drink.
2. Staff submits through POS or customer submits through QR.
3. Kitchen station sees food only.
4. Beverage station sees drinks only.
5. Kitchen marks food ready.
6. Beverage station marks drinks ready.
7. Waiter sees readiness by table/order.
8. Items are marked served/delivered.

Expected result:

- Production routing is accurate.
- Kitchen and beverages remain uncluttered.
- Waiter can understand what is ready without opening every ticket.

Key risks to inspect:

- Drinks appearing in kitchen, food appearing in beverages.
- Ticket status out of sync.
- Ready/served actions unclear.

## Use Case 8 — Kitchen backlog cleanup before opening

Primary actors: kitchen lead, manager  
Main modules: Kitchen Display, Orders

Steps:

1. Kitchen opens before service.
2. System shows hidden older unresolved backlog count.
3. Kitchen lead opens backlog mode.
4. Lead reviews stale tickets.
5. Lead marks stale items delivered/cancelled as appropriate.
6. Lead returns to current shift.
7. Live board is clean for service.

Expected result:

- Backlog mode is explicit and safe.
- Current shift is not polluted by stale tickets.
- User understands how to clear backlog before launch/service.

Key risks to inspect:

- Backlog button wording.
- Stale orders impossible to clear.
- Staff accidentally mixing backlog and live tickets.

## Use Case 9 — Table has current order plus previous history

Primary actors: waiter, cashier  
Main modules: Tables, Orders, POS

Steps:

1. Table completes a bill and is cleared.
2. Same table is opened for a new customer.
3. New customer places an order.
4. Waiter opens Orders from table.
5. Waiter sees only current-session orders.
6. Waiter clicks History.
7. Previous session is visible there only.

Expected result:

- Current orders and history are separated cleanly.
- Previous customers’ orders do not appear in current active session.
- Customer QR cannot see previous session order history.

Key risks to inspect:

- Privacy leak through QR/customer order page.
- History mixed into current session.
- Close table not resetting session correctly.

## Use Case 10 — HitPay/terminal payment completion and POS return

Primary actors: cashier, customer  
Main modules: POS, Payments, Tables, Orders

Steps:

1. Table has an unpaid current bill.
2. Cashier opens checkout.
3. Cashier selects HitPay/terminal payment.
4. Payment completes successfully.
5. Browser returns to POS.
6. POS shows payment success state.
7. Orders tab shows paid/completed status correctly.
8. Table shows ready to clear.
9. Cashier clears table.

Expected result:

- Return URL lands in sensible POS context.
- Paid order is visible in Orders/History as expected.
- Clear table action is obvious after payment.

Key risks to inspect:

- Payment success returning to blank POS.
- Paid order missing from Orders/History.
- Clear table hidden or disabled.

## Use Case 11 — Failed or abandoned payment recovery

Primary actors: cashier, customer  
Main modules: POS, Payments, Orders

Steps:

1. Table has an unpaid bill.
2. Cashier starts HitPay/terminal payment.
3. Payment is cancelled/failed/abandoned.
4. Cashier returns to POS.
5. Bill remains unpaid and recoverable.
6. Cashier can retry payment or choose a different allowed method.
7. No duplicate paid order is created.

Expected result:

- Failed payment does not close the bill.
- Retry path is obvious.
- No duplicate payment/order state.

Key risks to inspect:

- Order incorrectly marked paid.
- Payment state stuck in pending.
- Duplicate payment requests.

## Use Case 12 — Staff creates employee, assigns role, schedules shift, staff clocks in/out

Primary actors: manager, employee  
Main modules: Users, Timetable, My Shift

Steps:

1. Manager creates a new employee profile/user.
2. Manager assigns waiter/employee role and permissions.
3. Manager opens Timetable.
4. Manager creates a shift for the employee.
5. Employee logs in or selects profile if required.
6. Employee opens My Shift.
7. Employee clocks in at shift start.
8. Employee clocks out at shift end.
9. Manager checks attendance record.
10. Reports/payroll summary reflects shift.

Expected result:

- New employee can be scheduled.
- Shift appears clearly in timetable.
- Clock in/out is smooth and auditable.
- Attendance appears in reports.

Key risks to inspect:

- Role missing permissions.
- Timetable shift creation friction.
- Clock profile selection unclear.
- Attendance not linked to user/shift.

## Use Case 13 — Timetable leave/MC scheduling affects roster

Primary actors: manager  
Main modules: Timetable, Attendance/Leave, Reports

Steps:

1. Manager opens Timetable.
2. Manager records annual leave or MC for an employee.
3. Leave appears on timetable.
4. Manager tries to schedule that employee during leave.
5. System warns/prevents conflict or clearly shows conflict.
6. Leave balance is reduced where supported.
7. Manager views staff availability for the day.

Expected result:

- Leave/MC is visible where shifts are planned.
- Scheduling conflict is obvious.
- Leave balance logic is understandable.

Key risks to inspect:

- Leave hidden from roster.
- Duplicate/invalid shift on leave day.
- Leave balances not updated or not visible.

## Use Case 14 — Manager handles overbooking and table capacity

Primary actors: host, manager  
Main modules: Reservations, Tables

Steps:

1. Staff creates several reservations for same time slot.
2. Staff attempts to create one more booking near capacity.
3. System shows capacity/overbooking warning.
4. Staff assigns tables by party size.
5. Staff tries assigning a 6-person party to a 2-seat table.
6. System blocks or warns.
7. Staff assigns suitable table/group.

Expected result:

- Capacity constraints are visible.
- Overbooking warnings are understandable.
- Table capacity prevents bad seating plans.

Key risks to inspect:

- Overbooking allowed silently.
- Bad table assignment accepted.
- Warning text too technical.

## Use Case 15 — Waiter receives order update and adds item from Orders

Primary actors: waiter, kitchen  
Main modules: Orders, Tables, Kitchen

Steps:

1. Customer places QR order.
2. Waiter opens Orders.
3. Waiter sees current-session table order.
4. Customer requests one extra item verbally.
5. Waiter adds item from Orders or opens POS for table.
6. Kitchen receives extra item.
7. Original and added items remain under same table session.
8. Waiter marks delivered/served where applicable.

Expected result:

- Waiter can act from Orders without losing context.
- Added item routes correctly.
- Current session remains coherent.

Key risks to inspect:

- Orders overview too large per table.
- Add-item flow buried.
- Extra item creates separate history prematurely.

## Use Case 16 — Large menu POS/iPad usability test

Primary actors: waiter  
Main modules: POS, Product/Menu

Steps:

1. POS table is opened on iPad-sized viewport.
2. Waiter selects a table.
3. Waiter browses 20–30 menu items.
4. Waiter filters/searches/categories.
5. Waiter adds multiple items quickly.
6. Cart and payment lane remain visible/usable.
7. Waiter submits order without excessive scrolling.

Expected result:

- POS fits screen well.
- Menu item cards are not oversized.
- Cart/payment lane remains predictable.
- Staff can operate fast during service.

Key risks to inspect:

- Excessive vertical scroll.
- Payment lane pushed away.
- Product cards too large.
- Category/search not sticky enough.

## Use Case 17 — Inventory low-stock to purchase order before service

Primary actors: manager, stock staff  
Main modules: Inventory, Suppliers, Purchase Orders, Reports

Steps:

1. Manager opens Inventory.
2. Default view shows Stock Dashboard.
3. Low-stock items are visible.
4. Manager opens supplier/item details.
5. Manager creates purchase order.
6. Purchase order is submitted/approved.
7. Stock receiving updates inventory.
8. Low-stock alert clears or changes.

Expected result:

- Inventory default route is operationally useful.
- Low-stock workflow is discoverable.
- Purchase order changes stock status.

Key risks to inspect:

- Inventory landing on wrong screen.
- Low-stock alert not actionable.
- Stock not updated after receiving.

## Use Case 18 — Daily manager handover: Reports across payments, tables, staff

Primary actors: manager  
Main modules: Reports, Orders, Attendance

Steps:

1. Manager opens Reports after service.
2. Manager checks summary.
3. Manager jumps to Products.
4. Manager jumps to Categories.
5. Manager jumps to Tables.
6. Manager checks payment methods/collected totals.
7. Manager checks attendance section if permitted.
8. Manager exports or records key numbers.

Expected result:

- Jump navigation lands exactly on selected section.
- Revenue/order/table numbers are understandable.
- Attendance audit is visible to managers with permission.

Key risks to inspect:

- Jump buttons do not move page.
- Hash/section state inconsistent.
- Totals mismatch paid orders.

## Use Case 19 — Permission boundary: waiter vs manager

Primary actors: waiter, manager/admin  
Main modules: Login, POS, Tables, Reservations, Users, Reports

Steps:

1. Waiter logs in.
2. Waiter can access POS/Tables/Orders needed for service.
3. Waiter cannot access owner-only settings/users/restricted reports.
4. Manager logs in.
5. Manager can access reservations, reports, users, timetable, inventory as permitted.
6. Manager changes table/waiter assignment.
7. Waiter sees only their operational changes.

Expected result:

- Role boundaries protect admin areas.
- Waiter service flow remains available.
- Permissions do not block normal service accidentally.

Key risks to inspect:

- Waiter blocked from needed order/table actions.
- Waiter can access sensitive admin areas.
- UI shows links that later 403.

## Use Case 20 — End-of-day close: all active tables, orders, backlog, shifts

Primary actors: manager, cashier, waiters, kitchen  
Main modules: Tables, POS, Orders, Kitchen, Reports, My Shift

Steps:

1. Manager opens Tables near closing.
2. Identify all active/open tables.
3. Cashier settles unpaid bills.
4. Waiters mark remaining served/delivered states.
5. Tables are cleared/closed.
6. Kitchen backlog/current shift is clean.
7. Staff clock out.
8. Manager opens Reports and checks daily totals.
9. Manager verifies no unpaid active orders remain.
10. Manager verifies no staff has accidental open session.

Expected result:

- End-of-day close can be completed from visible screens.
- No active table/order is left behind accidentally.
- Staff open shift sessions are visible.
- Reports match closed/paid service.

Key risks to inspect:

- Active order hidden in history/current split.
- Table cannot be cleared due to stale status.
- Kitchen item status blocks close.
- Open staff shift not obvious.

## Suggested execution order for next QA pass

Run these in this order so created data supports later scenarios:

1. Use Case 12 — create/schedule staff.
2. Use Case 13 — timetable leave/MC.
3. Use Case 17 — inventory readiness.
4. Use Case 1 — full reservation/QR/service close.
5. Use Case 2 — queue/walk-in service.
6. Use Case 6 — POS table switching.
7. Use Case 7 — kitchen/beverage routing.
8. Use Case 10 — successful payment.
9. Use Case 11 — failed payment recovery.
10. Use Case 9 — current session vs history privacy.
11. Use Cases 3–5 — reservation edge cases.
12. Use Cases 14–16 — capacity and iPad usability.
13. Use Cases 18–20 — reporting, permissions, end-of-day close.

## QA result scoring template

For each use case, score:

- UI/UX: 1–10
- Workflow smoothness: 1–10
- Operational readiness: 1–10
- Data correctness: pass/fail
- Launch blocker: yes/no

Recommended launch threshold:

- No P0/P1 blockers.
- Every core service scenario, especially Use Cases 1, 2, 6, 7, 9, 10, and 20, scores at least 8/10 in UI/UX and workflow smoothness.
- Any score below 8 must have a documented fix or a deliberate launch decision.

