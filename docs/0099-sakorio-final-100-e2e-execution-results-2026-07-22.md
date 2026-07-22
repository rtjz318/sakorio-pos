# Sakorio POS final 100-case live browser QA execution results

Date started: 2026-07-22  
Run prefix: `SKR-FINAL-20260722`  
Scenario source: `docs/0098-sakorio-final-100-e2e-simulation-brief-2026-07-22.md`  
Execution target: live Sakorio domains only  
Execution rule: browser-only QA for workflow pass/fail decisions

## Environment baseline

- Staff app: `https://staff.sakorio.com`
- Customer app: `https://order.sakorio.com`
- Staff build observed in browser: `2.1.6 1d49ca90`
- Staff account role observed: Owner
- Initial dashboard queue state: `0 waiting`, `0 notified`, `0 open queue`
- Initial ready table count: `3`
- Initial operational finding: the first staff app visit showed Render's service waking/loading page before redirecting to login. This confirms cold-start behavior is still present on at least the staff web surface.

## Scoring legend

| Status | Meaning |
|---|---|
| PASS | Full final state visibly confirmed in browser. |
| FAIL | Requirement or data/session/payment integrity violated. |
| BLOCKED | Safe execution could not continue because of environment/access/hardware/payment limitation. |
| NEEDS SPECIFICATION | Product behavior is unclear and needs owner decision. |

Scores are out of 10 for:

- Functional correctness
- UI/UX clarity
- Workflow speed
- Layout/device stability
- Data/payment/session integrity
- Launch readiness

## Run checkpoints

### Checkpoint 0 - start

- Completed cases: 0 / 100
- New P0/P1 defects: none yet
- Open QA tables: none
- Open QA bills: none
- Open QA queue entries: none
- KDS backlog: not yet inspected in this run
- Notes: Staff web cold-start observed before login.

## Case results

### SKR-FINAL-E2E-001 - Reservation to seating to QR order to KDS to terminal payment to table close

- Status: PASS
- Score: 9.4 / 10
- Live paths verified:
  - Public reservation: `https://order.sakorio.com/book/1`
  - Staff reservations: `https://staff.sakorio.com/reservations`
  - Customer QR menu: `https://order.sakorio.com/menu/...`
  - KDS: `https://staff.sakorio.com/kitchen`
  - POS cashier: `https://staff.sakorio.com/pos`
- Browser execution evidence:
  - Created public reservation `#76` for `Final QA E2E001 24810`, 2 guests, `2026-07-22 18:00`.
  - Host reservation page surfaced the new booking at the top and allowed `Assign T07` via accessible table label.
  - `Seat + customer QR` moved the booking to `SEATED` and generated a visible customer ordering link.
  - Customer QR page showed only the active T07 session; no other guests' order histories were visible.
  - Customer placed order `#149`: `1x Tacos de Carne Asada`, `1x Coca Cola`, total `SGD 15.00`.
  - Customer payment surface showed `Pay Now`; no customer-facing `Cash` option appeared.
  - KDS showed order `#149 · T07` in `Send to prep`, advanced through `Start ticket`, `Ready for pass`, and `Served / Delivered`.
  - KDS completion toast appeared after served: `Ticket #149 served`, with countdown and ticket removed from live board.
  - POS opened T07 directly as bill `#149`, right-side payment panel stayed usable, Terminal payment recorded.
  - Close-table confirmation clearly stated the effects: reset table, end QR session, move current bill to history, finish linked reservation `#76`.
  - After close, POS confirmed `T07 is clear and ready... Linked reservation #76 was finished.`
  - Reservation page showed `#76 FINISHED`.
  - Reloaded QR link showed `Table Closed` for T07.
- What worked well:
  - Host → table assignment → QR handoff is now smooth and understandable.
  - Reservation finish automation after table close is correct.
  - KDS lane flow is clear and clean once a ticket is served.
  - QR session security/reset behavior passed.
- Improvement notes:
  - Public booking page initially displayed a loading/outside-hours state before availability resolved. It recovered, so this is a minor UX polish item, not a blocker.
  - Reservation card still shows `Cancelled / Recent queue history found · 4 d ago` on the active booking; this copy is confusing because it refers to stale queue history, not the current reservation.

### SKR-FINAL-E2E-002 - Reservation with two customer QR rounds on one table bill

- Priority: P0
- Roles simulated: customer, host, kitchen, beverage, cashier
- Starting state: T07 available after E2E-001 cleanup; KDS live board clear.
- Test data:
  - Reservation `#77`, customer `Final QA SKR-FINAL-E2E-002 440562`, party size 2.
  - Table `T07`.
  - Live bill/order `#150`.
- Browser steps executed:
  - Created public reservation through `order.sakorio.com/book/1`.
  - Assigned `T07` from staff Reservations and seated with customer QR.
  - Customer entered name `E2E002 Guest`.
  - First QR round: `1x Tacos de Carne Asada`, submitted to order `#150`.
  - KDS processed the first round.
  - Second QR round: `1x Coca Cola`; CTA changed from `Place order` to `Add to order`.
  - Confirmed the second round stayed on the same order `#150`, total `SGD 15.00`.
  - KDS recheck showed no active tickets after service processing.
  - POS showed one current bill `#150` with 2 items and `SGD 15.00`.
  - Terminal payment recorded and T07 close confirmed.
  - Reservation page showed `#77 FINISHED`.
  - Reloaded old QR link showed `Table Closed`.
- Expected final state: both rounds remain in current session until close; bill moves to history only after table close; QR closes.
- Actual final state: matched expected after a post-close POS refresh.
- Cross-module verification:
  - QR current order: `Order #150`, `Coca Cola`, `Tacos de Carne Asada`, `SGD 15.00`.
  - KDS: no active tickets after processing.
  - POS: `Open bills 0`, `Paid today` increased to `SGD 135.50`, T07 available after refresh.
  - Reservations: `#77 FINISHED`.
  - QR: `Table Closed`.
- Functional correctness: 9.5 / 10
- UI/UX clarity: 9.0 / 10
- Workflow speed: 8.8 / 10
- Layout/device stability: 9.2 / 10
- Data/payment/session integrity: 9.6 / 10
- Launch readiness: 9.3 / 10
- Final score: 9.3 / 10
- Status: PASS
- Evidence:
  - Second round retained the same bill/order number `#150`.
  - POS showed `2 items · SGD 15.00` before payment.
  - Closed QR returned `Table Closed`.
- Defects found: none blocking.
- Improvements needed:
  - Public booking availability can appear empty for a few seconds before slot data resolves; add stronger loading skeleton or disable submit until slot load is complete.
  - POS immediately after close may briefly show the just-paid guest/table card while the board says `Refreshing...`; after reload it resolves. Consider optimistic card reset or a clearer refresh overlay.
  - Customer second-round CTA says `Add to order`, which is good for users, but automated/accessibility targeting should have a specific aria-label such as `Add current cart to Order #150`.
- Cleanup performed:
  - T07 terminal-paid and closed.
  - Reservation `#77` finished.
  - QR session closed.
- Launch decision: launch-safe for the core two-round QR lifecycle, with minor polish items.

### SKR-FINAL-E2E-003 - Reservation with QR beverage-only order through beverage lane

- Priority: P0
- Roles simulated: customer, host, beverage/KDS, cashier
- Starting state: T07 available, KDS clear.
- Test data:
  - Reservation `#78`, customer `Final QA SKR-FINAL-E2E-003 661789`, party size 2.
  - Table `T07`.
  - Order `#151`.
- Browser steps executed:
  - Created public reservation.
  - Host assigned and seated reservation at T07 with customer QR.
  - Customer QR submitted beverage-only order: `1x Coca Cola`, `SGD 3.00`.
  - KDS displayed and advanced order `#151` through `Start ticket`, `Ready for pass`, `Served / Delivered`.
  - KDS showed completion toast: `Ticket #151 served`, `1 item delivered`, with no active tickets remaining.
  - POS recorded Terminal payment for T07.
  - Cashier closed T07 using final confirmation.
  - Reservation `#78` finished automatically.
  - Old QR link reloaded to `Table Closed`.
- Expected final state: beverage-only route is clear, bill paid, table reset, reservation finished, QR closed.
- Actual final state: matched expected.
- Cross-module verification:
  - QR: order `#151`, beverage-only, `Pay Now`, no Cash.
  - KDS: active counts returned to zero.
  - POS: `Paid today` increased to `SGD 138.50`; T07 closed and later available.
  - Reservations: `#78 FINISHED`.
  - QR after close: `Table Closed`.
- Functional correctness: 9.5 / 10
- UI/UX clarity: 9.1 / 10
- Workflow speed: 8.9 / 10
- Layout/device stability: 9.2 / 10
- Data/payment/session integrity: 9.6 / 10
- Launch readiness: 9.4 / 10
- Final score: 9.4 / 10
- Status: PASS
- Evidence:
  - Beverage-only KDS path completed without food-route clutter.
  - POS terminal payment and table close linked reservation finish correctly.
- Defects found: none.
- Improvements needed:
  - POS close button should carry a table-specific aria-label such as `Close T07 table` to avoid ambiguity when several paid cards are visible.
  - Continue improving post-payment/post-close refresh messaging so cashiers know whether the table is paid-but-not-closed or fully reset.
- Cleanup performed:
  - T07 terminal-paid and closed.
  - Reservation `#78` finished.
  - QR session closed.
- Launch decision: launch-safe.

### SKR-FINAL-E2E-004 - Reservation with mixed food and beverage station flow

- Priority: P0
- Roles simulated: customer, host, kitchen, beverage, cashier
- Starting state: T07 available, KDS clear.
- Test data:
  - Reservation `#79`, party size 2.
  - Table `T07`.
  - Order `#152`: `Tacos de Carne Asada` + `Coca Cola`, total `SGD 15.00`.
- Browser steps executed:
  - Created reservation through public booking.
  - Staff assigned and seated T07 with customer QR.
  - Customer QR submitted mixed food + beverage order.
  - KDS showed the mixed ticket and advanced it through `Start ticket`, `Ready for pass`, `Served / Delivered`.
  - KDS completion confirmed `Ticket #152 served`, `2 items delivered`, no active tickets.
  - POS showed bill payable, Terminal payment recorded.
  - Cashier closed table; linked reservation finished.
  - QR reload showed `Table Closed`.
- Expected final state: mixed station ticket remains understandable, bill total correct, table reset.
- Actual final state: matched expected.
- Cross-module verification:
  - KDS active counts returned to zero.
  - POS after close: `T07 is clear and ready... Linked reservation #79 was finished.`
  - POS `Paid today` increased to `SGD 153.50`.
  - Reservation `#79 FINISHED`.
  - QR old session blocked.
- Functional correctness: 9.5 / 10
- UI/UX clarity: 9.1 / 10
- Workflow speed: 9.0 / 10
- Layout/device stability: 9.3 / 10
- Data/payment/session integrity: 9.6 / 10
- Launch readiness: 9.4 / 10
- Final score: 9.4 / 10
- Status: PASS
- Evidence:
  - Order `#152` served with `2 items delivered`.
  - POS final close linked to reservation finish.
- Defects found: none.
- Improvements needed:
  - For true station-by-station pressure testing, run a later case with Kitchen-only and Beverages-only filters separately to confirm station-specific operators see the same ticket routing cleanly.
- Cleanup performed:
  - T07 terminal-paid and closed.
  - Reservation `#79` finished.
  - QR session closed.
- Launch decision: launch-safe.

### SKR-FINAL-E2E-005 - Reservation seated, customer browses QR, no order, staff releases empty table

- Priority: P0
- Roles simulated: customer, host, waiter/cashier
- Starting state: T07 available, KDS clear, no open bills.
- Test data:
  - Reservation `#80`, customer `Final QA SKR-FINAL-E2E-005 888757`.
  - Table `T07`.
- Browser steps executed:
  - Created reservation from public booking.
  - Host assigned and seated T07 with customer QR.
  - Customer opened QR, entered name `E2E005 Browser`, browsed menu, placed no order.
  - POS showed empty seated service state:
    - `Guests seated, awaiting first order`
    - `No bill has been sent yet. Release the table if this seating was a mistake.`
    - `Release table`
    - `Pay bill` disabled at `SGD 0.00`
  - Clicked `Release table`.
  - Final confirmation stated:
    - releases empty table;
    - ends current QR ordering session;
    - returns table to Available;
    - linked reservation `#80` will be finished automatically.
  - Clicked `Yes, release table`.
  - Verified Reservations and KDS.
  - Reloaded customer QR and POS table board.
- Expected final state: no-order table returns available, reservation finished, QR closed, no dummy ticket/bill, KDS clear.
- Actual final state:
  - Reservation `#80` became `FINISHED`.
  - KDS remained clear with no active orders.
  - POS table `T07` remained `Seated` with the same guest after confirmation.
  - Customer QR still showed the active menu and could still accept items.
- Cross-module verification:
  - POS after release: `T07 ... Final QA SKR-FINAL-E2E-005 888757 · 2 guests ... Seated`.
  - QR after release: still showed `Hey, E2E005 Browser! · T07`, menu items, and `No active order`; did not show `Table Closed`.
  - KDS: `No active orders`.
- Functional correctness: 5.0 / 10
- UI/UX clarity: 8.8 / 10 for the confirmation copy, but final behavior contradicts the copy.
- Workflow speed: 8.5 / 10
- Layout/device stability: 9.0 / 10
- Data/payment/session integrity: 4.0 / 10
- Launch readiness: 4.5 / 10
- Final score: 5.0 / 10
- Status: FAIL
- Evidence:
  - `Release table` confirmation promised QR/table reset.
  - Reservation finished, but POS table and QR session remained active.
- Defects found:
  - P1/P0 candidate: empty-table release does not actually clear table seating or revoke the QR session, despite finishing the reservation.
- Improvements needed:
  - Fix release-table backend/frontend action so it clears table occupancy and active QR/session state atomically when no bill exists.
  - After fix, re-run E2E-005 live in browser before continuing the remaining launch pass.
- Cleanup performed:
  - Not yet clean: T07 remains seated with an active QR from this failed case and must be cleared by the fix/retest path.
- Launch decision: not launch-safe until fixed.

#### Fix implemented for SKR-FINAL-E2E-005

- Code change:
  - Added backend endpoint `POST /tables/{table_id}/release-empty` for zero-bill seated table releases.
  - The endpoint blocks release if any current-session order has active items.
  - The endpoint clears `order_pin`, `is_active`, `active_order_id`, finishes seated reservations, completes seated queue entries, publishes reservation/queue updates, and sends the `table_closed` order update for customer QR sessions.
  - POS now calls `releaseEmptyTable(tableId)` only for the empty-table release branch; paid close still uses `/tables/{id}/close`.
- Regression added:
  - `back/tests/test_close_table_finishes_seated_reservation.py::test_release_empty_table_finishes_seated_reservation_and_closes_qr_session`
- Local verification:
  - Backend targeted test file: `2 passed`.
  - Frontend hot reload compile: `Application bundle generation complete`.
  - Local HAProxy smoke: HTTP `200`.
- Live verification status:
  - Pending deployment, then E2E-005 must be re-run in browser and rescored.
