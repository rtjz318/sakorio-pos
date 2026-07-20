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

- Completed: 2 / 50
- Pending: 48 / 50
- Completed average score: 8.55 / 10

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

## Cross-case findings so far

1. The core table lifecycle is working: reservation, seating, QR order, KDS, payment, close, QR lockout.
2. QR customer ordering is the main recurring UX drag:
   - icon-only add buttons;
   - repeated optional name prompt;
   - weak submit feedback;
   - scroll position makes the active order/card easy to miss.
3. Staff capacity handling is stronger than expected: 4-guest reservations filter to 4-seat tables.
4. KDS is stable for mixed and beverage-only tickets so far.
5. POS terminal payment and close table work, but post-payment close should feel more immediate.

## Pending workflows

`R6-FLOW-003` through `R6-FLOW-050` remain pending in this results brief.

