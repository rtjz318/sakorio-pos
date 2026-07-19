# Sakorio POS Round 3 Browser QA Scenario Brief - 80 End-to-End Use Cases

Date: 2026-07-19  
Run type: Exhaustive browser scenario design  
Execution target: Sakorio staff/customer browser flows  
Primary goal: Prepare the next browser-only QA pass with 80 realistic restaurant workflows, mixing previously tested flows with new unknown/edge workflows.

## Test configuration

Environment URL:

- Staff app: `https://staff.sakorio.com/login`
- Customer QR ordering: `https://order.sakorio.com/menu/{table_public_id}?qr_access={qr_access_token}`
- Public reservation: `https://order.sakorio.com/book/1`
- Payment provider: HitPay sandbox only

Environment type: Staging / sandbox-style live QA environment  
Restaurant/location: Sakorio test restaurant / tenant 1 unless another location is explicitly chosen  
Time zone: Asia/Singapore  
Currency: Singapore dollars unless the app displays otherwise  
Tax/service charge/rounding: determine from displayed bill and settings during browser execution  
Cashier account: use the secured staff account already provided by the owner; do not record the password in this document  
Manager account: use owner/admin access if available; otherwise mark manager-only cases `BLOCKED`  
Kitchen/KDS account: use accessible kitchen/beverage tabs if separate login is not available  
Receipt/printer access: browser-visible receipt/print preview only unless physical printer access is explicitly provided later  
Payment mode: sandbox only  
Enabled payment methods expected: HitPay / terminal for customer payment; cash must not appear on customer QR payment  
Priority modules: POS, Tables, Orders, Queue, Reservations, QR Ordering, Kitchen/Beverages, Timetable/Shifts, Users, Reports

## Non-negotiable safety rules

1. Test only inside the authorized Sakorio environment.
2. Never initiate a real financial transaction.
3. Use only HitPay sandbox or approved terminal simulation.
4. Never enter real customer personal information or real card information.
5. Use synthetic names, phone numbers, emails, notes, and addresses.
6. Prefix all test data with a unique run identifier: `SKR-R3-YYYYMMDD-###`.
7. Do not change global restaurant, tax, menu, printer, employee, or payment settings unless explicitly authorized.
8. Do not perform load testing, denial-of-service behavior, security exploitation, or credential attacks.
9. Do not access data outside the authorized restaurant account.
10. If an action may cause real payment, irreversible deletion, production disruption, or disclosure of real information, mark the case `BLOCKED`.
11. Do not expose passwords, tokens, payment data, or personal data in the test report.
12. Never claim success unless the final state was visibly confirmed in the browser.

## General browser operating method

Before execution:

1. Create a unique run ID, for example `SKR-R3-20260719-001`.
2. Open browser tabs for staff, customer QR, reservation, kitchen/beverage, and payment when needed.
3. Record browser viewport/device mode. At minimum test desktop and iPad/tablet width for POS-heavy flows.
4. Inspect available statuses before assuming behavior:
   - Reservation statuses
   - Queue statuses
   - Table statuses
   - Order statuses
   - Kitchen item statuses
   - Bill/payment statuses
   - Staff shift statuses
5. Use browser-only actions for QA. Do not verify workflow by local login or direct database edits.

For every scenario:

1. Assign the case ID shown below.
2. State the precondition and expected result before doing the critical action.
3. Operate the browser like the real role: customer, cashier, host, kitchen, manager, or staff.
4. Verify the result through at least two views where possible.
5. Record actual outcome, score, issue, and improvement suggestion.
6. Mark status as `PASS`, `FAIL`, `BLOCKED`, or `NEEDS SPECIFICATION`.
7. Capture screenshots for UI overlap, wrong total, wrong status, duplicated records, error messages, or unclear workflow.
8. Clean up safely where possible.

## Scorecard to use during execution

Each use case should receive these scores:

| Score area | Meaning |
|---|---|
| Functional correctness, /10 | Did the system complete the business workflow correctly? |
| UI/UX clarity, /10 | Could a real restaurant staff/customer understand what to do without guessing? |
| Workflow speed, /10 | Are there redundant steps, context switches, hidden buttons, or forced scrolling? |
| Layout/stability, /10 | Any overlaps, broken containers, iPad issues, stale screens, or confusing state? |
| Launch readiness, /10 | Would this flow be safe and smooth during actual restaurant service? |

Target before launch: every priority case should score at least 9/10, or have a clear product decision recorded.

## Core data-integrity invariants

Continuously verify:

1. One submit action must not create duplicate reservations, orders, kitchen tickets, payments, or customers.
2. Reservation, queue, table, order, kitchen, and billing statuses must agree across all relevant screens.
3. Totals must follow configured pricing, tax, discount, service charge, tip, and rounding rules.
4. Removed or voided items must not remain chargeable.
5. Voided kitchen items should show the appropriate kitchen cancellation signal when supported.
6. Every kitchen item should appear once at the correct station unless intentionally resent.
7. Required modifiers must be enforced.
8. Sold-out or unavailable items must not be accepted silently.
9. A closed bill must not be edited without required authorization and audit history.
10. Reopened, edited, voided, discounted, refunded, or transferred bills must retain an audit trail.
11. Payments, balances, refunds, and remaining amounts must be mathematically correct.
12. Concurrent users must not silently overwrite one another.
13. Refreshing, reconnecting, retrying, or double-clicking must not duplicate transactions.
14. Table occupancy must match active sessions and unpaid bills.
15. A table must not become available while active unpaid orders remain unless explicitly configured.
16. No order, payment, customer, reservation, or kitchen ticket should become orphaned.
17. Every receipt or displayed bill must match the final stored bill.

## Case mix

- Cases `R3-E2E-001` to `R3-E2E-040`: regression/improvement retests based on previous QA findings and polished flows.
- Cases `R3-E2E-041` to `R3-E2E-080`: new discovery scenarios to expose unknown or less-tested workflows.

---

# Regression and improvement retest scenarios

## R3-E2E-001 — Reservation to seated QR order to kitchen to close table

Type: Regression / core launch flow  
Roles: Customer, host, waiter, kitchen, cashier  
Preconditions: Public booking page is available; at least one clean table is available; kitchen view is accessible.  
Browser steps:

1. Customer creates a reservation using synthetic `SKR-R3-001` details.
2. Host opens Reservations and marks the booking as arrived.
3. Host assigns the reservation to an available table.
4. Customer opens that table QR session and submits one food item and one beverage.
5. Kitchen/beverage view confirms the ticket appears at the correct station.
6. Cashier opens POS/Tables, reviews the active table bill, proceeds to payment, and closes table.

Expected result: Reservation, table, order, kitchen, payment, and close-table statuses agree. Table becomes available only after the bill is closed.  
Verify in: Reservations, Tables, POS, Orders, Kitchen/Beverage, customer QR bill.  
Watch for: stale table state, customer seeing previous sessions, hidden close-table button, incorrect station routing.

## R3-E2E-002 — Walk-in queue to table assignment to cashier order to terminal checkout

Type: Regression / queue and cashier POS  
Roles: Host, waiter, cashier  
Preconditions: Queue tab is available; at least one table is available.  
Browser steps:

1. Host adds a walk-in party to Queue with `SKR-R3-002` name and party size.
2. Host sorts/searches queue to locate the entry.
3. Host seats the queue entry at a table.
4. Cashier opens POS through the table and adds menu items.
5. Cashier selects terminal checkout and completes/simulates payment.
6. Cashier closes the table.

Expected result: Queue entry no longer appears as waiting; table shows occupied during service; payment path is clear; closed table moves only completed bill to history.  
Verify in: Queue, Tables, POS, Orders, History.

## R3-E2E-003 — POS table-first flow mirrors Tables workflow with checkout added

Type: Regression / POS UX polish  
Roles: Waiter, cashier  
Preconditions: POS tab is available; several tables exist.  
Browser steps:

1. Open POS without `tableId`.
2. Confirm the first screen is table selection, not a giant menu/cart screen.
3. Select a table.
4. Confirm the ordering panel opens smoothly, with checkout visible and payment lane on the right.
5. Add items, then return to table selection without losing active order state.

Expected result: POS behaves like the Tables flow plus checkout, with no forced deep scroll or confusing page transition.  
Verify in: POS and Tables.

## R3-E2E-004 — Add second order to same active table without moving first order to history

Type: Regression / session integrity  
Roles: Customer, waiter, cashier  
Preconditions: A table has an active open session and one existing order.  
Browser steps:

1. Open the active table in POS.
2. Submit a second order from cashier or customer QR.
3. Open Orders and the table bill.
4. Check whether both orders remain in the current session.
5. Close the table and then check History.

Expected result: Both orders remain current until table close. Only after close should they move to History.  
Verify in: Orders current view, table bill, History.

## R3-E2E-005 — Close table button is visible and closes only after bill is settled

Type: Regression / table lifecycle  
Roles: Cashier, manager if required  
Preconditions: Active table with unpaid orders.  
Browser steps:

1. Open Tables and select an occupied table.
2. Confirm Close Table action is visible in the table layout or active session panel.
3. Attempt to close before payment.
4. Complete payment.
5. Close table.

Expected result: Close Table is easy to find; unpaid close is blocked or clearly requires manager policy; settled close releases the table.  
Verify in: Tables, Orders, History.

## R3-E2E-006 — Customer QR shows only current session bill and orders

Type: Regression / customer privacy  
Roles: Customer, waiter  
Preconditions: A table has previous historical orders and a new active session.  
Browser steps:

1. Open customer QR for the new session.
2. Check current order/bill view before ordering.
3. Submit a new item.
4. Refresh customer QR.
5. Close table and reopen QR if still accessible.

Expected result: Customer sees only current session and total bill. Previous sessions are never visible. After close, ordering should be blocked or start only through a new valid session/token.  
Verify in: Customer QR, Orders, History.

## R3-E2E-007 — Customer QR payment offers HitPay/terminal only, not Cash

Type: Regression / payment policy  
Roles: Customer  
Preconditions: Customer QR has an active payable bill.  
Browser steps:

1. Open customer QR active bill.
2. Proceed to payment.
3. Inspect available payment methods.
4. Attempt to find or trigger Cash payment.

Expected result: Customer payment does not expose Cash. Allowed options are HitPay/terminal according to configured product language.  
Verify in: Customer QR payment screen.

## R3-E2E-008 — Staff POS HitPay checkout returns to the correct order/table state

Type: Regression / HitPay recovery  
Roles: Cashier  
Preconditions: HitPay sandbox environment is active.  
Browser steps:

1. Create an order from staff POS for an active table.
2. Select HitPay checkout.
3. Complete sandbox payment or approved recovery path.
4. Return to staff POS from payment callback.
5. Open Orders and table bill.

Expected result: Payment completion is recognized, table/order state is not lost, and the order is still findable in Orders or History according to table status.  
Verify in: POS, Orders, History, payment confirmation page.

## R3-E2E-009 — Customer QR HitPay checkout completes without duplicate orders

Type: Regression / customer payment  
Roles: Customer, cashier  
Preconditions: Active QR session with submitted order.  
Browser steps:

1. Customer submits an order through QR.
2. Customer opens bill and proceeds to HitPay sandbox.
3. Complete sandbox flow.
4. Return to QR/order app.
5. Staff checks POS/Orders.

Expected result: Order and payment are linked once. No duplicate bill, order, payment, or table session is created.  
Verify in: Customer QR, POS, Orders.

## R3-E2E-010 — Terminal checkout label and fallback behavior are clear

Type: Regression / payment UX  
Roles: Cashier  
Preconditions: Active table bill.  
Browser steps:

1. Open checkout for active table.
2. Select terminal payment.
3. Confirm the screen explains what staff should do on physical terminal.
4. Cancel/back out and return to the table.
5. Complete terminal payment if sandbox/manual completion is supported.

Expected result: Terminal flow is understandable and reversible. No accidental payment is recorded unless confirmed.  
Verify in: POS checkout, payment status, Orders.

## R3-E2E-011 — Move active bill from one table to another

Type: Regression / table move workflow  
Roles: Host, waiter, cashier  
Preconditions: Source table has an active unpaid session; destination table is available.  
Browser steps:

1. Open active source table.
2. Trigger Move Table.
3. Select destination table.
4. Confirm move.
5. Check both source and destination table cards.
6. Continue ordering and close bill from the destination table.

Expected result: Source table becomes available; destination table carries the full bill, orders, and session. No orphaned orders remain.  
Verify in: Tables, POS, Orders, History.

## R3-E2E-012 — Attempt to move active bill to occupied table

Type: Regression / guardrail  
Roles: Host, waiter  
Preconditions: Source table and destination table are both occupied.  
Browser steps:

1. Open source active table.
2. Start Move Table.
3. Attempt to choose occupied destination.
4. Observe warning and available alternatives.

Expected result: System blocks unsafe overwrite/merge unless an explicit merge feature exists. If merge exists, it must clearly explain consequences.  
Verify in: Tables and Orders.

## R3-E2E-013 — Queue board sort and search remains usable during service

Type: Regression / queue polish  
Roles: Host  
Preconditions: Multiple queue entries exist or can be created safely.  
Browser steps:

1. Create at least three synthetic queue entries with different party sizes/timestamps.
2. Use sorting controls.
3. Use search by name or phone fragment.
4. Seat one entry.
5. Cancel one entry.

Expected result: Queue order, filters, and statuses remain correct after each action.  
Verify in: Queue and Tables.

## R3-E2E-014 — Reservation double-submit does not create duplicate booking

Type: Regression / duplicate prevention  
Roles: Customer, host  
Preconditions: Public reservation page is available.  
Browser steps:

1. Fill public reservation form with `SKR-R3-014`.
2. Double-click or rapidly repeat submit once.
3. Open staff Reservations.
4. Search for the customer name/contact.

Expected result: Only one reservation is created, or duplicate attempt is clearly blocked.  
Verify in: Public booking confirmation, Reservations.

## R3-E2E-015 — Reservation edit retains linked table/session state

Type: Regression / reservation editing  
Roles: Host  
Preconditions: Existing future reservation.  
Browser steps:

1. Create a reservation.
2. Edit name, time, party size, and notes.
3. Assign or change table if supported.
4. Mark arrived and seat.

Expected result: Edited details carry through to seating and do not create a second reservation/customer unintentionally.  
Verify in: Reservations, Tables.

## R3-E2E-016 — Orders overview is table-based and compact

Type: Regression / orders UX  
Roles: Cashier, manager  
Preconditions: Several active tables with current orders.  
Browser steps:

1. Open Orders.
2. Confirm overview is grouped by table/current session.
3. Expand one table to inspect items.
4. Compare against table bill.

Expected result: One table order does not consume most of the page by default. Active/current orders are separated from History.  
Verify in: Orders, Tables.

## R3-E2E-017 — Current Orders versus History separation

Type: Regression / order lifecycle  
Roles: Cashier  
Preconditions: One closed table and one active table exist.  
Browser steps:

1. Open Orders current view.
2. Confirm only active/current-session orders are visible.
3. Open History.
4. Confirm closed sessions are available there.

Expected result: Previous sessions do not clutter current orders. Current sessions do not disappear into History until close table.  
Verify in: Orders and History.

## R3-E2E-018 — Kitchen station item chips improve clarity under mixed order

Type: Regression / kitchen UI  
Roles: Kitchen, beverage staff  
Preconditions: Mixed food and beverage order can be created.  
Browser steps:

1. Submit an order containing food and beverage items.
2. Open Kitchen and Beverage views.
3. Confirm items appear under correct station with clear chips/status.
4. Mark one station item ready/served while the other remains pending.

Expected result: Mixed routing is clear and stable; statuses do not overwrite unrelated station items.  
Verify in: Kitchen/Beverage, Orders, table bill.

## R3-E2E-019 — Beverage-only order routes without kitchen noise

Type: Regression / station routing  
Roles: Waiter, beverage staff  
Preconditions: Beverage product exists.  
Browser steps:

1. Submit a beverage-only order from QR or POS.
2. Open Beverage view.
3. Open Kitchen view.
4. Mark beverage ready and served.

Expected result: Beverage appears in beverage workflow; kitchen view is not cluttered unless configured to show all.  
Verify in: Beverage, Kitchen, Orders.

## R3-E2E-020 — Mark item served updates waiter/order view clearly

Type: Regression / served state  
Roles: Kitchen, waiter  
Preconditions: Active order with at least one item.  
Browser steps:

1. Submit order.
2. Kitchen marks item ready.
3. Waiter marks item served if workflow supports it.
4. Open Orders and table bill.

Expected result: Served state is visible and does not remove unpaid items from bill.  
Verify in: Kitchen, Orders, Tables.

## R3-E2E-021 — Manager void of sent item creates clear bill and kitchen effect

Type: Regression / manager correction  
Roles: Cashier, manager, kitchen  
Preconditions: Sent item exists; manager access available.  
Browser steps:

1. Submit and send item to kitchen.
2. Attempt void as cashier.
3. If blocked, use manager override.
4. Confirm kitchen cancellation/void indicator.
5. Confirm bill total is corrected.

Expected result: Voided item is not chargeable and audit/manager requirement is visible.  
Verify in: POS, Kitchen, bill/receipt.

## R3-E2E-022 — POS iPad/tablet layout with active checkout lane

Type: Regression / iPad UI  
Roles: Waiter, cashier  
Preconditions: Browser device mode or tablet viewport available.  
Browser steps:

1. Open POS at iPad/tablet width.
2. Select table.
3. Add multiple items across categories.
4. Confirm cart/payment lane remains reachable and non-overlapping.
5. Checkout.

Expected result: No overlapping text/containers; menu is compact enough for 20 to 30 items; payment lane remains on right or in a clearly accessible tablet layout.  
Verify in: POS tablet viewport screenshots.

## R3-E2E-023 — Large menu list remains compact and searchable

Type: Regression / menu scalability  
Roles: Waiter  
Preconditions: Demo menu contains enough items or can be filtered.  
Browser steps:

1. Open POS table order view.
2. Scroll categories/menu.
3. Search or filter for an item if available.
4. Add several items without excessive scrolling.

Expected result: Menu cards are compact, readable, and efficient. No giant item cards that make 20 to 30 items impractical.  
Verify in: POS.

## R3-E2E-024 — Return from active table to table grid is obvious

Type: Regression / POS navigation  
Roles: Waiter  
Preconditions: Active table selected in POS.  
Browser steps:

1. Select a table in POS.
2. Add an item to cart or active bill.
3. Use Back to tables / table grid control.
4. Select another table.
5. Return to original table and verify state.

Expected result: Waiter can switch tables quickly without browser back confusion or losing cart/session state.  
Verify in: POS.

## R3-E2E-025 — Browser refresh on POS active table preserves state

Type: Regression / refresh safety  
Roles: Cashier  
Preconditions: Active table and cart/order present.  
Browser steps:

1. Open POS with selected table.
2. Add items to active cart or order.
3. Refresh browser before submission.
4. Refresh after submission.
5. Check Orders.

Expected result: Unsaved cart behavior is clear; submitted orders are not duplicated or lost.  
Verify in: POS, Orders.

## R3-E2E-026 — Browser Back/Forward does not corrupt table/order state

Type: Regression / navigation safety  
Roles: Cashier  
Preconditions: Active POS table.  
Browser steps:

1. Navigate POS → selected table → checkout → back.
2. Use browser Back and Forward several times.
3. Check active bill and table state.

Expected result: Browser navigation does not create ghost checkout, duplicate order, or stale table state.  
Verify in: POS, Tables.

## R3-E2E-027 — QR token after table close cannot expose old bill

Type: Regression / QR privacy  
Roles: Customer, cashier  
Preconditions: QR session used for a table that is later closed.  
Browser steps:

1. Open active QR and submit order.
2. Close/pay table from staff.
3. Refresh old QR link.
4. Try to view bill/order history.

Expected result: Closed session is not exposed to the next customer. Old QR either shows closed/unavailable or requires new session.  
Verify in: Customer QR, Tables.

## R3-E2E-028 — New customer at same table gets clean session

Type: Regression / session rollover  
Roles: Host, customer  
Preconditions: A table has just been closed.  
Browser steps:

1. Close previous session.
2. Seat or start a new session at same table.
3. Open the new QR/customer flow.
4. Submit a new order.

Expected result: New customer sees only their own current session and bill; previous orders are hidden.  
Verify in: Customer QR, Orders, History.

## R3-E2E-029 — Long reservation/order notes render safely

Type: Regression / text handling  
Roles: Customer, host, kitchen  
Preconditions: Reservation and order note fields available.  
Browser steps:

1. Create a reservation with long note, punctuation, apostrophe, accents, Chinese characters, and emoji.
2. Submit QR order with similar special instruction.
3. Check staff, kitchen, and bill views.

Expected result: Text is preserved enough to be useful, does not break layout, and does not execute as markup.  
Verify in: Reservations, Kitchen, Orders.

## R3-E2E-030 — Sold-out/unavailable item is not silently accepted

Type: Regression / menu availability  
Roles: Manager/cashier, customer  
Preconditions: Product availability control exists; if not, mark `NEEDS SPECIFICATION`.  
Browser steps:

1. Add an available item to customer cart.
2. Mark item unavailable from staff/menu if accessible.
3. Customer attempts to submit cart.

Expected result: Customer receives clear message and order is blocked or item removed. No silent accepted unavailable item.  
Verify in: Customer QR, Orders.

## R3-E2E-031 — Timetable name and navigation are correct

Type: Regression / staff backend polish  
Roles: Manager, staff  
Preconditions: Staff app navigation visible.  
Browser steps:

1. Open side navigation.
2. Confirm `Working Plan` has been renamed to `Timetable`.
3. Open Timetable.
4. Inspect calendar layout and employee list.

Expected result: Navigation label is Timetable, calendar is understandable, employee list/shift tools are discoverable.  
Verify in: Staff navigation, Timetable.

## R3-E2E-032 — Drag or assign employee into timetable shift

Type: Regression / scheduling  
Roles: Manager  
Preconditions: At least one employee exists; timetable is accessible.  
Browser steps:

1. Open Timetable.
2. Add or drag an employee into a shift slot if supported.
3. Save shift.
4. Reopen calendar/day/week view.

Expected result: Shift appears at the expected date/time and employee. If drag-and-drop is not implemented, the add flow must be clear.  
Verify in: Timetable.

## R3-E2E-033 — Annual leave / MC ledger records balance change

Type: Regression / staff leave  
Roles: Manager  
Preconditions: Leave ledger feature is accessible.  
Browser steps:

1. Open employee leave/Timetable view.
2. Record annual leave or MC for synthetic staff.
3. Confirm total balance is reduced or recorded according to policy.
4. Edit or cancel the leave entry if safely supported.

Expected result: Leave balance/record updates clearly and is auditable.  
Verify in: Timetable/Users.

## R3-E2E-034 — Staff clocks in from assigned shift

Type: Regression / clock-in flow  
Roles: Staff  
Preconditions: Staff has an assigned shift.  
Browser steps:

1. Open shift/timetable view as staff or from available staff selector.
2. Select profile/shift.
3. Clock in.
4. Confirm active shift status.

Expected result: User can select their profile and clock in from the shift without hunting through admin tools.  
Verify in: Timetable, Shifts/clock view.

## R3-E2E-035 — Staff clocks out and shift duration is correct

Type: Regression / clock-out flow  
Roles: Staff, manager  
Preconditions: Staff is clocked in.  
Browser steps:

1. Open active shift.
2. Clock out.
3. Confirm duration and status.
4. Check manager/timetable view.

Expected result: Shift becomes completed, time math is correct, and status is visible.  
Verify in: Timetable/Shifts.

## R3-E2E-036 — Create staff user and assign role

Type: Regression / users  
Roles: Manager  
Preconditions: Users tab accessible.  
Browser steps:

1. Create synthetic staff `SKR-R3-036`.
2. Assign waiter/cashier role.
3. Save.
4. Verify user appears and role permissions are reflected.

Expected result: User creation is clear, no duplicate user is created, role is visible.  
Verify in: Users, login/permissions if safe.

## R3-E2E-037 — Non-manager cannot perform manager-only bill actions

Type: Regression / permissions  
Roles: Cashier, manager  
Preconditions: Manager-only actions exist.  
Browser steps:

1. Login/use cashier role.
2. Attempt void/refund/reopen/discount manager-only action.
3. Observe prompt/block.
4. Use manager role if available to approve.

Expected result: Cashier is blocked or must obtain manager authorization; manager action is auditable.  
Verify in: POS, Orders, audit/history if available.

## R3-E2E-038 — Reports reflect closed table/payment totals

Type: Regression / reporting  
Roles: Manager  
Preconditions: At least one table is closed during QA run.  
Browser steps:

1. Complete and close a table bill.
2. Open Reports.
3. Check sales/payment/order count for the run window.
4. Compare against receipt/bill total.

Expected result: Reports update accurately or explain refresh timing clearly.  
Verify in: Reports, History.

## R3-E2E-039 — Customer and cashier submit orders close together without duplicates

Type: Regression / concurrency  
Roles: Customer, cashier  
Preconditions: Same active table available in QR and POS.  
Browser steps:

1. Customer prepares QR order but does not submit.
2. Cashier adds and submits an order on same table.
3. Customer submits their order.
4. Check Orders and Kitchen.

Expected result: Both orders appear once, on the same active session, with correct source/timestamps.  
Verify in: Orders, Kitchen, table bill.

## R3-E2E-040 — End-to-end service cycle twice on same table

Type: Regression / session durability  
Roles: Host, customer, cashier, kitchen  
Preconditions: Table can be used for two complete cycles.  
Browser steps:

1. Run a full order/pay/close cycle for customer A.
2. Start a second cycle for customer B at same table.
3. Order/pay/close again.
4. Compare current/history views.

Expected result: Two separate table sessions are preserved in History; second customer never sees first customer’s data.  
Verify in: Tables, Orders, History, QR.

---

# New discovery scenarios

## R3-E2E-041 — Customer abandons HitPay checkout and returns later

Type: New discovery / payment abandonment  
Roles: Customer, cashier  
Preconditions: Active QR bill with HitPay sandbox available.  
Browser steps:

1. Customer opens bill and enters HitPay checkout.
2. Customer closes/back-navigates before payment.
3. Staff opens table bill.
4. Customer returns to QR and tries again.

Expected result: Bill remains unpaid and recoverable; no fake payment is recorded; retry path is clear.  
Verify in: QR, POS, Orders.

## R3-E2E-042 — HitPay success callback opened twice

Type: New discovery / idempotency  
Roles: Customer, cashier  
Preconditions: Sandbox payment success callback can be revisited.  
Browser steps:

1. Complete HitPay sandbox payment.
2. Refresh the success/callback page.
3. Open staff Orders/payment state.

Expected result: Payment is recorded once only; no duplicate settlement, no duplicate close, no double receipt.  
Verify in: POS, Orders, History.

## R3-E2E-043 — Terminal payment marked failed then retried

Type: New discovery / payment failure  
Roles: Cashier  
Preconditions: Terminal/manual payment flow has failure/cancel path.  
Browser steps:

1. Begin terminal checkout.
2. Cancel or mark failure if supported.
3. Return to bill.
4. Retry terminal or HitPay checkout.

Expected result: Failed attempt does not mark bill paid; retry is clean and understandable.  
Verify in: POS payment state.

## R3-E2E-044 — Partial payment or split tender decision

Type: New discovery / payment policy  
Roles: Cashier, manager  
Preconditions: Active bill.  
Browser steps:

1. Open checkout.
2. Look for partial payment/split tender.
3. Attempt a safe partial flow only if visible.
4. Complete or cancel.

Expected result: If supported, balance math is correct. If not supported, UI should not imply partial payment exists. Mark `NEEDS SPECIFICATION` if unclear.  
Verify in: POS, receipt/bill.

## R3-E2E-045 — Refund or reverse paid bill

Type: New discovery / manager correction  
Roles: Manager, cashier  
Preconditions: A paid closed bill from synthetic test data.  
Browser steps:

1. Open History/Orders for paid bill.
2. Look for refund/reversal.
3. Attempt only if sandbox-safe and manager-authorized.
4. Verify table state remains closed.

Expected result: Refund is manager-controlled, auditable, mathematically correct, and does not reopen table unintentionally.  
Verify in: History, Reports.

## R3-E2E-046 — Reopen closed bill and add forgotten item

Type: New discovery / manager override  
Roles: Manager, cashier, kitchen  
Preconditions: Closed bill exists.  
Browser steps:

1. Open closed bill in History.
2. Attempt reopen.
3. Add a forgotten item if allowed.
4. Check whether kitchen ticket and payment balance are handled.

Expected result: Reopen requires authorization and shows clear balance/payment implications. Mark `NEEDS SPECIFICATION` if product policy is undefined.  
Verify in: History, POS, Kitchen.

## R3-E2E-047 — Customer tries QR ordering while cashier is closing bill

Type: New discovery / race condition  
Roles: Customer, cashier  
Preconditions: Active table bill; QR session open.  
Browser steps:

1. Customer keeps QR menu open with items in cart.
2. Cashier starts checkout/close table.
3. Customer submits order during or after close attempt.

Expected result: System either blocks customer order with clear message or safely includes it before final payment; no orphaned item.  
Verify in: QR, POS, Kitchen.

## R3-E2E-048 — Two hosts attempt to seat the same reservation

Type: New discovery / concurrency  
Roles: Host A, Host B  
Preconditions: Same reservation visible in two browser tabs.  
Browser steps:

1. Open reservation in two staff tabs.
2. Host A seats reservation at table A.
3. Host B attempts to seat the stale reservation at table B.

Expected result: Second action is blocked or requires refresh; reservation cannot occupy two tables.  
Verify in: Reservations, Tables.

## R3-E2E-049 — Two waiters edit same table order at same time

Type: New discovery / concurrency  
Roles: Waiter A, Waiter B  
Preconditions: Active table open in two staff tabs.  
Browser steps:

1. Waiter A adds item A.
2. Waiter B adds item B from stale view.
3. Both submit.
4. Check final order list.

Expected result: Both items are preserved once, or conflicts are clearly resolved. No silent overwrite.  
Verify in: POS, Orders, Kitchen.

## R3-E2E-050 — Kitchen marks ready while cashier voids item

Type: New discovery / kitchen-bill race  
Roles: Kitchen, cashier/manager  
Preconditions: Sent item exists.  
Browser steps:

1. Kitchen opens ticket.
2. Cashier/manager voids same item.
3. Kitchen marks ready from stale ticket.
4. Check final bill and kitchen state.

Expected result: Voided item stays voided; kitchen receives clear cancellation/stale-state signal.  
Verify in: Kitchen, POS, bill.

## R3-E2E-051 — Party is seated at table smaller than reservation size

Type: New discovery / capacity policy  
Roles: Host  
Preconditions: Reservation party size exceeds a smaller available table.  
Browser steps:

1. Create party larger than target table seats.
2. Attempt assignment to smaller table.
3. Observe warning/block.

Expected result: System warns clearly or blocks according to policy. Mark `NEEDS SPECIFICATION` if it allows silently.  
Verify in: Reservations, Tables.

## R3-E2E-052 — Public reservation outside operating hours

Type: New discovery / booking constraints  
Roles: Customer  
Preconditions: Operating hours are configured or visible.  
Browser steps:

1. Open public booking page.
2. Attempt reservation outside likely business hours.
3. Submit if UI allows.

Expected result: Invalid time is blocked or flagged. If no rules exist, document as product gap.  
Verify in: Public booking, Reservations.

## R3-E2E-053 — Late reservation arrival becomes queue/waitlist

Type: New discovery / host decision  
Roles: Host  
Preconditions: A reservation exists and all ideal tables are occupied.  
Browser steps:

1. Create reservation.
2. Simulate late arrival by marking arrived when no table is free.
3. Move party to queue/waitlist if supported.
4. Seat later.

Expected result: Host has a smooth path to manage late arrivals without losing reservation context.  
Verify in: Reservations, Queue, Tables.

## R3-E2E-054 — No-show reservation releases assigned table

Type: New discovery / reservation lifecycle  
Roles: Host  
Preconditions: Reservation has assigned/held table.  
Browser steps:

1. Create and assign reservation.
2. Mark no-show or cancel.
3. Check table availability.

Expected result: Held table is released and reservation moves out of active seating workflow.  
Verify in: Reservations, Tables.

## R3-E2E-055 — Queue quoted wait time updates after seating others

Type: New discovery / queue expectation  
Roles: Host  
Preconditions: Multiple queue entries exist.  
Browser steps:

1. Add multiple queue parties.
2. Seat the first party.
3. Inspect remaining queue entries.
4. Adjust wait time/priority if supported.

Expected result: Queue remains useful for real host operations and does not require manual mental tracking.  
Verify in: Queue.

## R3-E2E-056 — Table cleaning/reset state between paid and available

Type: New discovery / restaurant operations  
Roles: Waiter, host  
Preconditions: Paid table is ready to be reset.  
Browser steps:

1. Pay a table.
2. Look for cleaning/reset state before availability.
3. Mark cleaned/reset if supported.
4. Seat new guest.

Expected result: If cleaning state exists, it is clear. If not, document whether immediate availability is acceptable.  
Verify in: Tables.

## R3-E2E-057 — Customer opens wrong or expired QR token

Type: New discovery / QR access control  
Roles: Customer  
Preconditions: Invalid/expired QR token can be created or copied from old closed session.  
Browser steps:

1. Open invalid/expired QR URL.
2. Attempt menu/order/bill access.

Expected result: Customer receives safe unavailable/expired message. No other table/session data is exposed.  
Verify in: Customer QR.

## R3-E2E-058 — Same QR opened on two customer devices

Type: New discovery / multi-device customer  
Roles: Customer A, Customer B  
Preconditions: Active table QR.  
Browser steps:

1. Open same QR in two browser tabs/sessions.
2. Customer A submits one item.
3. Customer B submits another item.
4. Both refresh bill.

Expected result: Both orders appear once in same active session; bill total updates for both.  
Verify in: QR, Orders, Kitchen.

## R3-E2E-059 — Customer cart abandoned, then table is closed

Type: New discovery / abandoned cart  
Roles: Customer, cashier  
Preconditions: Customer has items in cart not submitted.  
Browser steps:

1. Customer adds items to QR cart but does not submit.
2. Cashier closes table after payment for existing orders.
3. Customer returns and tries to submit cart.

Expected result: Submission is blocked with clear explanation; no new order is created on closed session.  
Verify in: QR, Orders.

## R3-E2E-060 — Special instructions with unsafe-looking text

Type: New discovery / input safety  
Roles: Customer, kitchen  
Preconditions: Special instruction field available.  
Browser steps:

1. Submit notes containing punctuation, HTML-like text, apostrophes, newline, emoji, and non-Latin text.
2. Inspect kitchen and order displays.

Expected result: Text is displayed safely as text, does not break layout, and does not run as markup/script.  
Verify in: QR, Kitchen, Orders.

## R3-E2E-061 — Required modifier missing on QR and POS

Type: New discovery / menu rules  
Roles: Customer, cashier  
Preconditions: At least one item has required modifier; if not, mark `NEEDS SPECIFICATION`.  
Browser steps:

1. Try to submit item without required modifier from QR.
2. Try same from POS.
3. Select valid modifier and submit.

Expected result: Both channels enforce the same rule and show clear validation.  
Verify in: QR, POS.

## R3-E2E-062 — Duplicate same item with different modifiers stays distinct

Type: New discovery / order accuracy  
Roles: Customer, kitchen  
Preconditions: Modifier-enabled item exists.  
Browser steps:

1. Add same item twice with different modifiers.
2. Submit order.
3. Check kitchen and bill lines.

Expected result: Items remain distinct with correct modifier labels and pricing.  
Verify in: QR/POS, Kitchen, bill.

## R3-E2E-063 — Discount requires manager and recalculates bill correctly

Type: New discovery / discount policy  
Roles: Cashier, manager  
Preconditions: Discount feature exists; if not, mark `NEEDS SPECIFICATION`.  
Browser steps:

1. Open active bill.
2. Attempt discount as cashier.
3. Approve as manager if required.
4. Confirm total, tax/service charge, and receipt.

Expected result: Discount authorization and math are correct and auditable.  
Verify in: POS, receipt, Reports.

## R3-E2E-064 — Service charge/tax/rounding visible before payment

Type: New discovery / bill transparency  
Roles: Customer, cashier  
Preconditions: Active bill.  
Browser steps:

1. Open bill in QR and POS.
2. Compare subtotal, tax, service charge, rounding, total.
3. Proceed to checkout and compare again.

Expected result: Staff and customer see matching totals and transparent charge breakdown.  
Verify in: QR, POS checkout.

## R3-E2E-065 — Takeaway order without table

Type: New discovery / non-table sale  
Roles: Cashier, kitchen  
Preconditions: POS supports takeaway or non-table order; if not, mark `NEEDS SPECIFICATION`.  
Browser steps:

1. Start order without selecting table if possible.
2. Add food/beverage.
3. Send to kitchen and checkout.

Expected result: Takeaway flow is clear, not forced into fake table unless that is the chosen product rule.  
Verify in: POS, Kitchen, Orders.

## R3-E2E-066 — Reservation customer changes party size after arrival

Type: New discovery / seating adjustment  
Roles: Host  
Preconditions: Reservation exists.  
Browser steps:

1. Mark reservation arrived.
2. Increase party size before seating.
3. Assign table or move to larger table.
4. Check queue/table suggestions if available.

Expected result: Host can adjust party size without creating duplicate booking or wrong capacity state.  
Verify in: Reservations, Tables.

## R3-E2E-067 — Move party after ordering but before payment

Type: New discovery / mid-service table transfer  
Roles: Waiter, cashier  
Preconditions: Active table with submitted orders.  
Browser steps:

1. Submit food/beverage order.
2. Move party to another available table.
3. Submit additional order from new table/session.
4. Checkout.

Expected result: All orders stay on one moved session and bill; QR link behavior is clear after move.  
Verify in: Tables, POS, QR, Orders.

## R3-E2E-068 — Combine two active tables into one bill decision

Type: New discovery / merge policy  
Roles: Manager, cashier  
Preconditions: Two occupied tables exist.  
Browser steps:

1. Open table A and table B.
2. Look for combine/merge bill.
3. If supported, merge safely with synthetic data.
4. If not supported, document product decision.

Expected result: Merge is either absent/clearly unsupported, or it preserves item/payment/audit integrity.  
Verify in: Tables, Orders.

## R3-E2E-069 — Split bill by item decision

Type: New discovery / split policy  
Roles: Cashier  
Preconditions: Active bill with multiple items.  
Browser steps:

1. Open checkout.
2. Look for split bill by item/person.
3. Attempt only if supported.
4. Verify balances.

Expected result: Split bill is either clearly unsupported or mathematically exact and easy to reverse.  
Verify in: POS checkout.

## R3-E2E-070 — Kitchen overload view with many active tickets

Type: New discovery / KDS scalability  
Roles: Kitchen  
Preconditions: Multiple synthetic active tickets can be created safely.  
Browser steps:

1. Create several active table orders.
2. Open Kitchen.
3. Filter/sort by station/status/time if available.
4. Mark selected tickets ready.

Expected result: Kitchen remains steady and readable; no messy container overlap or unclear ticket priority.  
Verify in: Kitchen/Beverage.

## R3-E2E-071 — Beverage and kitchen complete at different times

Type: New discovery / partial fulfillment  
Roles: Kitchen, beverage, waiter  
Preconditions: Mixed order exists.  
Browser steps:

1. Submit mixed order.
2. Beverage marks ready quickly.
3. Kitchen remains pending, then ready.
4. Waiter reviews table status.

Expected result: Partial readiness is obvious. Waiter can tell what is ready versus still cooking.  
Verify in: Kitchen, Beverage, Orders.

## R3-E2E-072 — Staff profile selection before clock-in

Type: New discovery / staff UX  
Roles: Staff  
Preconditions: Multiple staff profiles exist.  
Browser steps:

1. Open shift/clock-in area.
2. Select staff profile.
3. Clock in.
4. Confirm correct profile is active.

Expected result: Staff cannot accidentally clock in as the wrong person without clear selection/confirmation.  
Verify in: Timetable/Shifts.

## R3-E2E-073 — Early clock-in and late clock-in handling

Type: New discovery / attendance policy  
Roles: Staff, manager  
Preconditions: Shift exists for a staff user.  
Browser steps:

1. Attempt clock-in before shift time if testable.
2. Attempt late clock-in or simulate by selecting current/near shift.
3. Check flags/notes.

Expected result: Early/late behavior is explicit. Mark `NEEDS SPECIFICATION` if no policy is visible.  
Verify in: Timetable/Shifts.

## R3-E2E-074 — Staff swap shift request

Type: New discovery / scheduling policy  
Roles: Staff, manager  
Preconditions: Two staff users and shifts exist.  
Browser steps:

1. Look for shift swap/edit function.
2. Attempt safe manager shift reassignment.
3. Confirm both employees’ calendars.

Expected result: Shift ownership updates cleanly and does not duplicate shifts. If self-service swap is absent, document product gap.  
Verify in: Timetable.

## R3-E2E-075 — Leave request overlaps scheduled shift

Type: New discovery / leave scheduling conflict  
Roles: Staff/manager  
Preconditions: Staff has a scheduled shift.  
Browser steps:

1. Add annual leave/MC that overlaps the shift.
2. Observe warning or automatic conflict handling.
3. Check timetable.

Expected result: System warns about conflict or clearly records unresolved conflict. Leave balance remains correct.  
Verify in: Timetable, leave ledger.

## R3-E2E-076 — User deactivation while staff has future shifts

Type: New discovery / user lifecycle  
Roles: Manager  
Preconditions: Synthetic staff has future shift.  
Browser steps:

1. Open Users.
2. Attempt deactivate/disable synthetic staff.
3. Check future shifts.

Expected result: System warns about future shifts or handles reassignment. No orphaned timetable rows.  
Verify in: Users, Timetable.

## R3-E2E-077 — Role permission boundary across tabs

Type: New discovery / access control  
Roles: Waiter, cashier, manager  
Preconditions: Multiple roles exist or can be tested.  
Browser steps:

1. Use non-manager role.
2. Open POS, Tables, Orders, Reservations, Users, Reports, Timetable.
3. Record accessible tabs/actions.

Expected result: Staff can access only appropriate functions. Restricted actions are hidden or blocked with a clear message.  
Verify in: Navigation and each tab.

## R3-E2E-078 — End-of-day close or report reconciliation

Type: New discovery / operations close  
Roles: Manager  
Preconditions: Several synthetic paid orders exist.  
Browser steps:

1. Open reports/end-day view if available.
2. Compare paid orders, payment methods, refunds/voids, totals.
3. Export or view summary if safe.

Expected result: Manager can reconcile sales without manual hunting. Missing end-day flow should be documented as product gap.  
Verify in: Reports, History.

## R3-E2E-079 — Audit trail for correction actions

Type: New discovery / accountability  
Roles: Manager, cashier  
Preconditions: At least one correction action is performed safely.  
Browser steps:

1. Void, discount, reopen, refund, or edit a synthetic bill if supported.
2. Open history/audit/details.
3. Confirm actor/time/reason is recorded.

Expected result: Critical corrections leave visible audit trail. Mark `NEEDS SPECIFICATION` if audit view is absent.  
Verify in: History, Reports, order details.

## R3-E2E-080 — Multi-tab disaster recovery during active service

Type: New discovery / resilience  
Roles: Customer, cashier, host, kitchen  
Preconditions: Active reservation, table, QR cart/order, kitchen ticket, and checkout path.  
Browser steps:

1. Open staff POS, Tables, Kitchen, customer QR, and reservation tabs.
2. Submit an order.
3. Refresh all tabs in different order.
4. Continue service, payment, and close table.

Expected result: System recovers correct live state in every tab; no duplicate order/payment/ticket; UX explains stale state where needed.  
Verify in: POS, Tables, QR, Kitchen, Orders, History.

---

# Execution result template for the next QA pass

Use this block under each case when the browser run is performed:

```md
## Result — R3-E2E-###

Run ID:
Browser/device:
Roles simulated:
Status: PASS / FAIL / BLOCKED / NEEDS SPECIFICATION

Functional correctness: __/10
UI/UX clarity: __/10
Workflow speed: __/10
Layout/stability: __/10
Launch readiness: __/10

Steps actually performed:
1.
2.
3.

Expected result:

Actual result:

Evidence captured:
- Screenshot/video:
- URLs/tabs:
- Visible order/table/reservation/payment IDs:

Defects:

Improvement notes:

Cleanup performed:
```

# Recommended execution order

1. Run `R3-E2E-001` to `R3-E2E-010` first. These prove the highest-risk launch flows: reservation, QR, POS, orders, payment, and table close.
2. Run `R3-E2E-011` to `R3-E2E-030` next. These retest the improvements already made and should show whether previous scores improved.
3. Run `R3-E2E-041` to `R3-E2E-060` before the staff-backend cases. These are the highest-risk unknown customer/payment/table edge cases.
4. Run `R3-E2E-031` to `R3-E2E-040` and `R3-E2E-072` to `R3-E2E-079` after the restaurant-service flows. These validate staff, timetable, permissions, reports, and audit controls.
5. Run `R3-E2E-080` last as a final resilience/disaster-recovery scenario after all core modules have fresh test data.

# Launch readiness gate

Before launch, the system should meet these gates:

1. All priority POS/Tables/Orders/QR/Payment cases score at least 9/10.
2. No case exposes previous customer session data through QR.
3. No customer QR payment path shows Cash.
4. No order leaves the active session before table close.
5. No payment/order/kitchen ticket duplicates after refresh, double-submit, callback repeat, or multi-tab usage.
6. iPad/tablet POS layout remains compact and non-overlapping.
7. Host can manage reservations, queue, seating, table moves, and table closing without hidden actions.
8. Kitchen and beverage views remain readable under mixed and busy ticket loads.
9. Manager corrections are permissioned, auditable, and mathematically correct.
10. Timetable, staff clock-in/out, leave tracking, and role boundaries are clear enough for actual operations.
