# Sakorio POS Browser QA Results — 20 End-to-End Use Cases

Date: 2026-07-18  
Test surface: live browser QA on deployed Sakorio domains  
Staff build observed: `POS 2.1.6 489ef2a3`  
Staff domain: `https://staff.sakorio.com`  
Customer/order domain checked: `https://order.sakorio.com`

Follow-up completion tracker: `docs/0067-sakorio-0065-improvement-completion-2026-07-18.md`

## Executive summary

This QA pass was run through the browser against the deployed Sakorio system. The strongest areas are now:

- Tables → POS drawer workflow.
- Queue → table seating → POS handoff.
- Public reservation creation and reservation management link.
- Current-session vs history separation inside POS table drawer.
- Reports jump navigation.
- Timetable visibility and staff profile selection for clock-in.

Main launch risks found:

1. Kitchen/beverage backlog is still too polluted for a real launch rehearsal.
2. Physical receipt/printer steps are not browser-verifiable and remain future/follow-up work.
3. Customer QR product add buttons are visually usable but have weak accessible names.
4. Payment completion/failure needs a dedicated sandbox payment run with a non-zero bill.
5. Leave/MC entitlement ledger is visibly not implemented yet.
6. POS still contains hidden duplicate controls in DOM at `0x0`; visible UI is usable, but this should be cleaned for accessibility/testing quality.
7. Staff Orders overview updates table-level active counts but does not always expose the newest exact order number without drilling in.

## Browser actions executed during this pass

- Created public reservation `#41 QA E2E Reservation 639475`.
- Opened the public reservation token page from the confirmation link.
- Assigned reservation `#41` to `T09`.
- Created staff queue entry `QA Queue 854386`.
- Cleared paid table `T04`.
- Seated `QA Queue 854386` into `T04`; system opened POS with queue handoff.
- Opened customer QR menu on `order.sakorio.com`.
- Placed customer QR order `#53` with `1x Water` on `T07`.
- Verified `#53` appears in Kitchen/Beverage display.
- Verified T07 live bill/payment lane in staff POS.
- Marked old QA reservation `#40` as no-show.
- Checked POS table drawer at iPad-like viewport `1024×768`.
- Opened Users → Add User modal, then cancelled before saving.
- Opened Timetable and My Shift; selected Jason Tan profile and verified scheduled shifts.
- Opened public waitlist form.
- Tested Reports → Tables jump navigation and hash update.
- Verified Inventory default opens Stock Dashboard.

## Score legend

- UI/UX: 1–10
- Workflow smoothness: 1–10
- Operational readiness: 1–10
- Data correctness: Pass / Partial / Fail
- Launch blocker: Yes / No / Watch

## Use Case 1 — Reservation arrival to QR self-order to service close

Browser result: Partial pass

Executed:

1. Created public reservation `#41 QA E2E Reservation 639475`.
2. Confirmation page displayed reservation number, date, party size, name, email, phone.
3. Clicked `View or cancel my reservation`; token page opened successfully.
4. Staff Reservations showed `#41`.
5. Assigned `#41` to `T09`.
6. Staff UI changed to `T09` and “Table is planned. Seat the guest from here when they arrive.”
7. Customer QR order was separately tested on active `T07`: `1x Water`, order `#53`.
8. Kitchen showed `#53 Pending T07 <1m 1x Water Pending`.

Not fully executed:

- `#41` could not be seated because its reservation time was outside the arrival window; this is correct business behavior.
- Physical receipt printing was not browser-verifiable.

Scores:

- UI/UX: 8
- Workflow smoothness: 7
- Operational readiness: 7
- Data correctness: Partial
- Launch blocker: Watch

Needs improvement:

- Add a QA/admin “simulate arrival now” option or test-mode ability to seat a reservation during launch rehearsals.
- Expose printer/receipt readiness as a visible status or placeholder if hardware is not connected.
- Make customer QR add buttons accessible with clear labels.

## Use Case 2 — Walk-in queue to table to staff POS order to checkout

Browser result: Pass

Executed:

1. Created queue entry `QA Queue 854386`, party size 2, quoted wait 15 minutes.
2. Queue initially showed `0 clear tables`, blocking seating correctly.
3. Cleared paid table `T04`.
4. Tables immediately displayed `BEST NEXT SEATS`, recommending `QA Queue 854386 → T04`.
5. Queue page showed T04 as `Best fit`, `4 seats`, `2 spare seats`, no upcoming reservation pressure.
6. Clicked seat action.
7. System opened POS at `T04` with message: `T04 opened from queue handoff for QA Queue 854386`.

Scores:

- UI/UX: 9
- Workflow smoothness: 9
- Operational readiness: 9
- Data correctness: Pass
- Launch blocker: No

Needs improvement:

- Numeric fields in Queue form need stronger labels for accessibility.
- Keep the “best next seats” recommendation visible/prominent; this is a very useful launch feature.

## Use Case 3 — Reservation no-show during peak service

Browser result: Pass with minor friction

Executed:

1. Opened old QA reservation `#40`.
2. Opened `More`.
3. Clicked no-show action.
4. Confirmation modal opened.
5. Confirmed via modal primary button.
6. Reservation changed to `NO-SHOW`.
7. Reservation summary changed to expected guests 2 / active bookings 1 / needs table 0.

Scores:

- UI/UX: 8
- Workflow smoothness: 8
- Operational readiness: 9
- Data correctness: Pass
- Launch blocker: No

Needs improvement:

- Background dropdown remains open behind confirmation, producing two matching “Mark as no-show” elements. Visible UX is acceptable, but accessibility/automation is weaker.
- Use consistent wording: menu says no-show, modal says mark as no-show.

## Use Case 4 — Customer changes/cancels reservation from public link

Browser result: Pass for access; update/cancel not executed

Executed:

1. Created reservation `#41`.
2. Clicked `View or cancel my reservation`.
3. Public token page opened at `/reservation?token=...`.
4. Page showed reservation details, delay notice input, `Send delay notice`, and `Cancel`.

Not executed:

- Did not cancel `#41`, because it is used by other QA checks.
- Did not submit delay notice to avoid extra customer communication noise.

Scores:

- UI/UX: 9
- Workflow smoothness: 9
- Operational readiness: 8
- Data correctness: Pass for access, Partial for update/cancel
- Launch blocker: No

Needs improvement:

- None critical from browser result.
- Later QA should submit a delay notice and verify staff-side display.

## Use Case 5 — Customer QR order before table is opened

Browser result: Partial

Executed:

1. Verified QR menu on `order.sakorio.com` for active `T07`.
2. Confirmed active menu loads and accepts ordering.
3. Verified customer page did not show previous history before placing the new order.

Not executed:

- Did not test QR for assigned-but-not-open `T09`, because the table token was not easily accessible from staff UI during QA.

Scores:

- UI/UX: 7
- Workflow smoothness: 6
- Operational readiness: 7
- Data correctness: Partial
- Launch blocker: Watch

Needs improvement:

- Staff Reservations/Tables should expose “Open customer QR / Copy QR link” for assigned reservations/tables.
- Add a direct staff-visible QR test/open link for each table to make launch QA easier.

## Use Case 6 — Staff POS table switching during rush

Browser result: Pass with accessibility watch

Executed:

1. Opened POS at `T09`.
2. POS floor remained visible.
3. Selected table drawer showed `Back / switch table`, `Current orders`, `Add items`, `Bill / Pay`, `Orders`, `History`.
4. Added `Coca Cola`; cart updated to SGD 3.00.
5. Checkout button became enabled.
6. Cleared the test cart.
7. iPad-sized viewport check confirmed drawer controls and product cards remain visible.

Scores:

- UI/UX: 8
- Workflow smoothness: 8
- Operational readiness: 8
- Data correctness: Pass
- Launch blocker: No

Needs improvement:

- Remove hidden duplicate controls at `0x0` from POS DOM.
- Floor table list can still become long on iPad; consider denser table grid/filtering.

## Use Case 7 — Split production routing: food to kitchen, drinks to beverages

Browser result: Partial

Executed:

1. Customer QR order `#53` with `Water` appeared in Kitchen/Beverage display.
2. Kitchen page showed route counters: All, Kitchen, Beverages.
3. The new order appeared as pending under production board.

Not fully executed:

- Did not submit a mixed food + beverage order during this pass.

Scores:

- UI/UX: 7
- Workflow smoothness: 7
- Operational readiness: 6
- Data correctness: Partial
- Launch blocker: Watch

Needs improvement:

- Run a dedicated mixed food/drink test after backlog cleanup.
- Kitchen board is hard to validate while old backlog dominates.

## Use Case 8 — Kitchen backlog cleanup before opening

Browser result: Fail / launch watch

Executed:

1. Opened Kitchen.
2. Observed `Review backlog 40`.
3. Observed warning: older unresolved tickets hidden from live shift.
4. Observed 13 “Send to prep” new tickets, many from old QA orders.

Scores:

- UI/UX: 7
- Workflow smoothness: 5
- Operational readiness: 4
- Data correctness: Partial
- Launch blocker: Watch

Needs improvement:

- Add bulk backlog cleanup or manager-only “archive test tickets before launch.”
- Add stronger date/shift filtering.
- Kitchen cannot be considered launch-clean until backlog is cleared.

## Use Case 9 — Table has current order plus previous history

Browser result: Pass

Executed:

1. Opened POS table drawers for T09/T07/T04.
2. T09 showed `Orders 0 live` and `History 8 settled`.
3. T07 showed live bill `#53` and history separately.
4. Customer QR page did not reveal previous session order history before new order.

Scores:

- UI/UX: 8
- Workflow smoothness: 8
- Operational readiness: 8
- Data correctness: Pass
- Launch blocker: No

Needs improvement:

- Staff Orders overview should make “current vs history” more explicit without drilling into POS.

## Use Case 10 — HitPay/terminal payment completion and POS return

Browser result: Partial

Executed:

1. Opened checkout lane for T07 live order `#53`.
2. Payment methods displayed: Staff Cash, Terminal, HitPay.
3. `Bill / Pay`, order count, history and table drawer remained visible.

Not executed:

- Did not perform non-zero HitPay payment in this pass.
- Did not process zero-dollar bill payment.

Scores:

- UI/UX: 8
- Workflow smoothness: 7
- Operational readiness: 6
- Data correctness: Partial
- Launch blocker: Watch

Needs improvement:

- Run a controlled non-zero sandbox HitPay payment test.
- Decide whether Staff Cash should remain for staff POS if launch policy is terminal/HitPay-focused.

## Use Case 11 — Failed or abandoned payment recovery

Browser result: Not executed

Reason:

- Requires a controlled non-zero payment attempt and deliberate cancellation/failed return. This was not run during this pass to avoid creating incomplete payment state without explicit sandbox payment window.

Scores:

- UI/UX: 6
- Workflow smoothness: 5
- Operational readiness: 5
- Data correctness: Not verified
- Launch blocker: Watch

Needs improvement:

- Add a sandbox payment recovery script/checklist.
- Add visible recovery state for `payment pending`, `payment failed`, and `retry`.

## Use Case 12 — Staff creates employee, assigns role, schedules shift, clocks in/out

Browser result: Partial

Executed:

1. Opened Users.
2. Opened Add User modal.
3. Verified fields: email, full name, role, job title, phone, hourly pay, start date, password, confirm password.
4. Cancelled before saving a real user.
5. Opened Timetable.
6. Verified employee roster, Add shift, Schedule actions, Jason shifts.
7. Opened My Shift.
8. Selected Jason Tan profile.
9. Verified scheduled shifts and `Take photo and clock in` CTA.

Not executed:

- Did not create a real user/login.
- Did not accept camera permission or clock in/out.

Scores:

- UI/UX: 8
- Workflow smoothness: 7
- Operational readiness: 7
- Data correctness: Partial
- Launch blocker: Watch

Needs improvement:

- Add a safe QA/test-user mode or seeded staff account creation flow.
- Clock-in requires camera permission; document this for staff onboarding.

## Use Case 13 — Timetable leave/MC scheduling affects roster

Browser result: Not launch-ready

Executed:

1. Opened Timetable.
2. Verified leave section exists.
3. UI states: `Annual leave / MC balances`, `Policy setup required`, `Next backend slice`.

Scores:

- UI/UX: 7
- Workflow smoothness: 4
- Operational readiness: 3
- Data correctness: Not implemented
- Launch blocker: No for POS launch, Yes for world-class scheduling launch

Needs improvement:

- Implement leave ledger, MC records, approvals, entitlement balances, roster conflict checks.

## Use Case 14 — Manager handles overbooking and table capacity

Browser result: Partial

Executed:

1. Reservation assignment modal showed capacity-matching table options.
2. For `#41`, system recommended `T09 2 seats · Available`.
3. Risk labels appeared for occupied/open-bill tables.

Not executed:

- Did not intentionally create an overbooking scenario during this pass.

Scores:

- UI/UX: 8
- Workflow smoothness: 7
- Operational readiness: 7
- Data correctness: Partial
- Launch blocker: No

Needs improvement:

- Add a dedicated overbooking QA seed or test mode.
- Show “available first / risky lower” ranking consistently.

## Use Case 15 — Waiter receives order update and adds item from Orders

Browser result: Partial

Executed:

1. Customer QR order `#53` updated staff Orders page table-level count for T07.
2. Orders page showed T07 as active/current.
3. POS drawer showed T07 live bill `#53`.

Not executed:

- Did not add an item directly from Orders page.

Scores:

- UI/UX: 7
- Workflow smoothness: 7
- Operational readiness: 7
- Data correctness: Partial
- Launch blocker: Watch

Needs improvement:

- Orders overview should expose newest order number and newest items more clearly.
- Add-item-from-Orders path should be tested next.

## Use Case 16 — Large menu POS/iPad usability test

Browser result: Pass with improvements

Executed:

1. Set temporary iPad-like viewport `1024×768`.
2. Opened POS table drawer.
3. Verified visible table drawer controls.
4. Verified compact product cards in the table drawer.
5. Verified cart/payment area remains in the same drawer.

Scores:

- UI/UX: 8
- Workflow smoothness: 8
- Operational readiness: 8
- Data correctness: Pass
- Launch blocker: No

Needs improvement:

- Keep reducing vertical scroll in floor table list.
- Improve sidebar/table-grid clipping on tablet viewport.

## Use Case 17 — Inventory low-stock to purchase order before service

Browser result: Partial / setup gap

Executed:

1. Opened `/inventory`.
2. Verified it redirects to `/inventory/stock`.
3. Stock Dashboard displayed.
4. Dashboard showed `0 total items`, `0 low stock alerts`, setup-needed message.

Scores:

- UI/UX: 8
- Workflow smoothness: 6
- Operational readiness: 4
- Data correctness: Pass for route, not enough data for workflow
- Launch blocker: No for POS, Watch for inventory launch

Needs improvement:

- Seed or import launch inventory.
- Test low-stock → supplier → purchase order → receiving flow after stock exists.

## Use Case 18 — Daily manager handover: Reports across payments, tables, staff

Browser result: Pass

Executed:

1. Opened Reports.
2. Verified summary cards and payment methods.
3. Clicked `Tables`.
4. URL changed to `#reports-tables`.
5. Page scrolled to By table section.

Scores:

- UI/UX: 9
- Workflow smoothness: 9
- Operational readiness: 8
- Data correctness: Pass
- Launch blocker: No

Needs improvement:

- Add a clearer daily close/handover checklist that links tables/orders/staff open sessions.

## Use Case 19 — Permission boundary: waiter vs manager

Browser result: Partial

Executed:

1. Observed owner account access to all modules.
2. Users page shows existing waiter `Jason Tan`.
3. Did not log out/in as waiter during this pass.

Scores:

- UI/UX: 6
- Workflow smoothness: 5
- Operational readiness: 5
- Data correctness: Not verified
- Launch blocker: Watch

Needs improvement:

- Run a dedicated waiter-login QA pass.
- Confirm waiter can access POS/Tables/Orders but not admin-only Settings/Users/Reports.

## Use Case 20 — End-of-day close: all active tables, orders, backlog, shifts

Browser result: Partial / launch watch

Executed:

1. Tables showed paid/ready table T04.
2. Clicked Clear table.
3. T04 became idle.
4. Tables surfaced best next seat recommendation for queue.
5. Kitchen still showed heavy backlog.
6. My Shift showed open sessions 0 for Jason, but clock history empty.
7. Reports showed revenue/payment totals.

Scores:

- UI/UX: 8
- Workflow smoothness: 7
- Operational readiness: 6
- Data correctness: Partial
- Launch blocker: Watch

Needs improvement:

- Add one manager “end day” checklist: unpaid bills, active tables, kitchen backlog, open staff sessions, reports summary.
- Clear/seed clean demo data before final launch rehearsal.

## Prioritized improvement backlog from this QA pass

### P0 / Launch blockers or strong launch-watch items

1. Kitchen/backlog cleanup: 40 older unresolved tickets plus active old tickets make kitchen QA and service readiness poor.
2. Payment recovery QA: run a non-zero sandbox HitPay success and failed/cancelled payment test.
3. Printer/receipt workflow: browser cannot verify hardware; add printer status placeholders or a printer integration checklist.

### P1 / High-value polish

1. Add accessible labels to customer QR plus buttons.
2. Remove hidden duplicate POS controls at `0x0`.
3. Staff Orders overview should show newest order number/items per table.
4. Add table QR/open customer menu link to Tables/Reservations for faster QA and service support.
5. Improve no-show modal/dropdown interaction so background menu does not leave duplicate actionable text.
6. Add a daily manager close checklist.
7. Run waiter-role permission QA.

### P2 / Next product depth

1. Timetable leave/MC ledger and entitlement tracking.
2. Inventory seed/import plus full purchase-order receiving workflow.
3. Dedicated overbooking stress dataset.
4. iPad floor table density improvements.

## Recommended next work order

1. Clean kitchen/order backlog and add a launch reset/cleanup tool.
2. Run non-zero HitPay sandbox success + failed/cancelled recovery.
3. Fix QR product button accessibility labels.
4. Remove hidden duplicate POS controls.
5. Improve Orders overview for newest order visibility.
6. Build daily close checklist.
7. Run waiter-role QA.
8. Continue leave/inventory as post-core-POS launch modules unless they are required for day-one operations.
