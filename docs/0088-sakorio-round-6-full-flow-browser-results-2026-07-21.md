# Sakorio POS Round 6 full-flow browser QA results

Date started: 2026-07-21  
Run type: Browser-only full journey execution  
Scenario source: `docs/0087-sakorio-round-6-browser-qa-80-use-cases-2026-07-21.md`  
Scenario IDs: `R6-FLOW-001` to `R6-FLOW-050`  
Execution target: live Sakorio domains only  
Observed live version: `2.1.6 fd48a511`

## Run status

This result document is a live checkpoint. The full-flow journeys are being executed one by one through the browser as customer, host, waiter, kitchen, and cashier. Each case is scored from the real user experience, not just whether the backend technically completes.

Current checkpoint:

- Completed: 5 / 50
- Pending: 45 / 50
- Completed average score: 8.10 / 10
- Current launch posture: not ready yet. The core QR lifecycle is improving, but R6-FLOW-004 exposed a launch-blocking mixed staff POS + customer QR ordering issue.

## Score meaning

| Score | Meaning |
|---:|---|
| 9.0-10.0 | Launch-ready, smooth, low-risk |
| 8.0-8.9 | Functionally working, but needs UX/operability polish |
| 7.0-7.9 | Works only with friction, hidden steps, or recovery issues |
| 6.0-6.9 | Risky for launch; likely to confuse staff/customers |
| below 6.0 | Blocking issue or workflow cannot be completed safely |

## Completed workflow results

### R6-FLOW-001 — Reservation → seat → QR two rounds → kitchen → terminal payment → close/reset

- Priority: P0
- Roles acted through browser: customer, host, waiter, kitchen, cashier
- Status: PASS WITH UX IMPROVEMENTS
- Score: 8.4 / 10
- Artifacts:
  - Reservation: `#58`
  - Guest: `R6 Flow 001 Guest 797022`
  - Table: `T07`
  - Order: `#91`
  - Final paid total: `SGD 26.50`
- Browser workflow executed:
  1. Customer created public reservation for 2 guests.
  2. Host found reservation in staff Reservations.
  3. Host assigned T07, then confirmed early arrival seating.
  4. POS opened directly with T07, guest context, and QR active.
  5. Customer opened QR link and placed round 1: Enchiladas + Tecate Light.
  6. Kitchen received mixed food/beverage ticket, started it, readied it, and served it.
  7. Customer reopened QR and placed round 2: Coffee.
  8. Kitchen received Coffee as a new pending item under the same order and served it.
  9. Cashier opened POS bill, confirmed 3 items / `SGD 26.50`.
  10. Cashier terminal-paid the bill.
  11. Cashier closed T07.
  12. Customer QR reload showed Table Closed.
  13. Reservation showed FINISHED.
  14. KDS returned to zero active tickets.
- What passed:
  - Full reservation lifecycle completed.
  - First and second customer QR rounds stayed on the same table bill.
  - First round did not move into history prematurely.
  - KDS handled mixed first round and beverage-only second round.
  - POS bill total matched expected total.
  - Close-table reset worked.
  - Old QR was blocked after close.
- Issues found:
  - Customer QR optional name prompt appeared again on QR reload.
  - Product add controls are icon-only; accessible labels exist, but visible discoverability is weak.
  - `Place order` / `Add to order` did not give strong immediate feedback; state became clear only after re-checking/scrolling.
  - Second round reused order `#91`; functionally okay, but staff/customer cannot clearly see separate “rounds” except through item status.
- Improvements needed:
  - Make QR add buttons visibly obvious, not only icon/ARIA controls.
  - Persist skipped/entered customer name for the QR session.
  - After submit, immediately show loading/success state and jump to the current order card.
  - Consider bill grouping such as “Round 1” / “Added later” while keeping one bill.
- Launch decision: not launch-blocking, but below 9/10 because customer ordering feedback is not smooth enough.

### R6-FLOW-002 — 4-guest reservation capacity filtering → correct table → QR order → payment → close

- Priority: P0
- Roles acted through browser: customer, host, cashier, kitchen
- Status: PASS WITH MINOR UX IMPROVEMENTS
- Score: 8.7 / 10
- Artifacts:
  - Reservation: `#59`
  - Guest: `R6 Flow 002 Party4 134331`
  - Table: `T04`
  - Order: `#92`
  - Final paid total: `SGD 2.50`
- Browser workflow executed:
  1. Customer created public reservation for 4 guests.
  2. Host opened Reservations and found the booking.
  3. Host attempted capacity assignment workflow.
  4. Assignment modal offered only 4-seat tables; 2-seat tables were filtered out.
  5. Host assigned T04.
  6. Host seated T04 and opened POS handoff.
  7. Customer opened QR and placed Coffee order.
  8. KDS received the beverage order and served it.
  9. Cashier terminal-paid the bill.
  10. Cashier closed T04.
  11. Customer QR reload showed Table Closed.
- What passed:
  - Capacity mismatch was prevented cleanly by filtering out smaller tables.
  - Correct 4-seat table assignment worked.
  - Reservation-to-POS handoff worked.
  - QR order, KDS, terminal payment, close table, and QR closed-state all worked.
- Issues found:
  - Public booking time selector lagged after changing party size; it needed extra wait before becoming usable.
  - After terminal payment, the close button appeared after a render delay; an immediate check missed it.
  - QR ordering shares the same icon-only add button / weak submit feedback concerns from R6-FLOW-001.
- Improvements needed:
  - Show clearer loading state while availability/time slots recalculate after party-size change.
  - Keep the post-payment Close table action immediately stable and prominent.
  - Apply QR menu submit/discoverability improvements from R6-FLOW-001.
- Launch decision: launch-capable for capacity handling; needs polish to reach 9+/10.

### R6-FLOW-003 - Reservation arrives early -> beverage first -> food second -> kitchen lane completes -> one combined bill -> close/reset

- Priority: P0
- Roles acted through browser: customer, host, kitchen, cashier
- Status: PASS WITH UX IMPROVEMENTS
- Score: 8.6 / 10
- Artifacts:
  - Reservation: `#60`
  - Guest: `R6 Flow 003 SplitRounds 459855`
  - Table: `T07`
  - Order: `#93`
  - Final paid total: `SGD 14.50`
- Browser workflow executed:
  1. Customer created public reservation for 2 guests.
  2. Host assigned and seated reservation to T07.
  3. Customer opened QR and placed beverage-only first round: Coffee.
  4. KDS beverage lane received Coffee and served it.
  5. Customer reopened QR and added food-only second round: Tacos de Carne Asada.
  6. KDS kitchen lane received the food item under the same order and served it.
  7. Cashier opened POS, verified `2 items / SGD 14.50`.
  8. Cashier terminal-paid and closed T07.
  9. Customer QR reload showed Table Closed.
  10. Reservation showed FINISHED.
  11. KDS returned to zero active tickets.
- What passed:
  - Beverage-first and food-second service stayed on one bill.
  - KDS split the second-round food item into the kitchen lane correctly.
  - Terminal payment and close-table reset worked.
- Issues found:
  - QR add-on ordering remains visually uncertain because add controls are not obvious enough.
  - `Add to order` feedback is subtle; the user has to re-check the current order to know the add-on landed.
  - The same order number is reused correctly, but there is no clear round/add-on grouping for staff.
- Improvements needed:
  - Make customer add buttons visible with text/stronger affordance.
  - After add-on order submission, auto-scroll to Current order and show a short confirmation toast.
  - Display added-round grouping or last-added timestamp on the bill.
- Launch decision: launch-capable, but QR add-on UX should be polished to reach 9+/10.

### R6-FLOW-004 - Reservation -> seated -> waiter adds from POS -> customer QR mains -> kitchen -> payment -> close

- Priority: P0
- Roles acted through browser: customer, host, waiter, kitchen, cashier
- Status: PARTIAL FAIL - STAFF POS ADD ITEM
- Score: 6.8 / 10
- Artifacts:
  - Reservation: `#61`
  - Guest: `R6 Flow 004 MixedStaffQR 734806`
  - Table: `T07`
  - QR order: `#94`
  - Final paid total: `SGD 20.00`
- Browser workflow executed:
  1. Customer created public reservation.
  2. Host assigned and seated T07.
  3. POS opened with T07, guest context, and QR active.
  4. Waiter attempted to add Tecate Light from staff POS product grid.
  5. Staff POS product cards were visible and appeared tappable, but the Current cart remained `0 items / SGD 0.00`.
  6. Tried the intended Start order path and tapped the item again; cart still stayed empty.
  7. Customer QR then placed Enchiladas order `#94`.
  8. KDS received `#94`, moved it through Ready for pass, then Served / Delivered.
  9. Cashier terminal-paid `SGD 20.00`.
  10. Cashier closed T07.
  11. Customer QR reload showed Table Closed.
  12. Reservation showed FINISHED.
- What passed:
  - Reservation seating and QR handoff worked.
  - Customer QR order worked.
  - KDS processing worked after manual lane-state inspection.
  - Terminal payment and close/reset worked.
- Issues found:
  - Launch-blocking for waiter-assisted service: staff POS product taps did not add to the current cart for a seated reservation table with no existing order.
  - The failure was silent: no disabled state, no toast, no error, no explanation.
  - Public booking confirmation again showed an unexpected displayed time value during this run; needs follow-up.
- Improvements needed:
  - Fix staff POS product add action for seated/no-order table sessions opened from reservation handoff.
  - If a product cannot be added, show an explicit disabled state or error.
  - Add regression coverage for mixed staff-POS plus customer-QR ordering on the same table/session.
  - Review the public reservation time selector/confirmation flow.
- Launch decision: launch blocker for waiter-assisted service. Customer-only QR lifecycle is working, but mixed staff + QR ordering is not ready.

### R6-FLOW-005 - Reservation seated with QR active -> customer leaves before ordering -> close no-order table -> reset

- Priority: P0
- Roles acted through browser: customer, host, cashier
- Status: PASS WITH UX GAP
- Score: 8.0 / 10
- Artifacts:
  - Reservation: `#62`
  - Guest: `R6 Flow 005 NoOrderExit 919901`
  - Table: `T07`
- Browser workflow executed:
  1. Customer created public reservation.
  2. Host assigned and seated T07.
  3. POS opened with QR active and no order.
  4. Customer left before ordering.
  5. POS table drawer was inspected for a no-order Close/Release action.
  6. No obvious no-order close action was found inside POS.
  7. Staff opened Tables tab.
  8. Tables tab showed Close table on T07.
  9. Staff clicked Close table and received a confirmation dialog.
  10. Staff confirmed the close.
  11. T07 became IDLE/available.
  12. Customer QR reload showed Table Closed.
  13. Reservation showed FINISHED.
- What passed:
  - No-order seated sessions can be closed safely from Tables.
  - Confirmation dialog protects accidental close.
  - QR lockout worked after confirmation.
  - Reservation state finished correctly.
- Issues found:
  - POS does not expose the no-order close/release action where a cashier/waiter is already working.
  - The close action is discoverable only from Tables, which adds unnecessary operational hunting.
- Improvements needed:
  - Add Close/Release table action directly inside POS table drawer when table is seated with QR active and no orders.
  - Label the outcome clearly: "Close table - no bill" or "Release table".
  - Keep the confirmation dialog and make the post-confirm QR-closed state explicit in the success toast.
- Launch decision: not a hard blocker because Tables handles it correctly, but POS workflow should be improved for launch smoothness.

## Cross-case findings so far

1. The core customer-QR table lifecycle is working: reservation, seating, QR order, KDS, payment, close, QR lockout.
2. QR customer ordering is the main recurring UX drag:
   - icon-only add buttons;
   - repeated optional name prompt;
   - weak submit feedback;
   - scroll position makes the active order/card easy to miss.
3. Staff capacity handling is stronger than expected: 4-guest reservations filter to 4-seat tables.
4. KDS is stable for QR-created mixed, beverage-only, and kitchen-only tickets so far.
5. POS terminal payment and close table work, but post-payment close should feel more immediate.
6. Staff POS add-to-cart from a seated/no-order reservation table failed silently in R6-FLOW-004. This is the first launch-blocking finding in this batch.
7. Closing a seated no-order table works from Tables, but POS should expose the same action to reduce service friction.
8. Public reservation confirmation/time selection needs follow-up because multiple later bookings displayed an unexpected confirmation time.

## Pending workflows

`R6-FLOW-006` through `R6-FLOW-050` remain pending in this results brief.
