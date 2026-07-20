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

- Completed: 50 / 50
- Pending: 0 / 50
- Completed average score: 7.59 / 10
- Current launch posture: not ready yet. The core QR/order/payment lifecycle is much stronger, and end-day close checks now pass with open bills zero and KDS zero. However, launch-blocking or major polish gaps remain in table move, manager void/refund controls, sold-out item handling, booking time reliability, split/merge bill policy, notes/modifiers, and KDS action-state noise.

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

### R6-FLOW-006 - Public queue walk-in -> host notify/seat -> QR order -> waiter POS add-on -> KDS -> terminal payment -> close

- Priority: P0
- Roles acted through browser: walk-in customer, host, waiter, kitchen, cashier
- Status: PASS WITH MINOR UX IMPROVEMENTS
- Score: 8.8 / 10
- Artifacts:
  - Queue ticket: `Q0022`
  - Guest: `R6 Flow 006 QueueWalkIn 116487`
  - Table: `T07`
  - Order: `#95`
  - Final paid total: `SGD 14.50`
- Browser workflow executed:
  1. Customer joined public waitlist at `order.sakorio.com/waitlist/1`.
  2. Customer received queue ticket `Q0022`, position 4, party size 2.
  3. Host opened Queue and found the web waitlist entry immediately.
  4. Host clicked Notify guest.
  5. Customer phone view changed to "Your table is nearly ready".
  6. Host seated guest to recommended exact-fit T07.
  7. POS opened from queue handoff with T07 and QR active.
  8. Customer used QR to order Tacos de Carne Asada.
  9. Waiter later added Coffee from staff POS after the live bill existed.
  10. Waiter sent the POS add-on round.
  11. KDS received one mixed kitchen/beverage ticket and served it.
  12. Cashier terminal-paid the bill.
  13. Cashier closed T07.
  14. Customer QR reload showed Table Closed.
  15. Queue board returned to `0 active / 0 visible`.
- What passed:
  - Public waitlist creation worked.
  - Host board showed the guest, source, party size, phone, notes, and fit guidance.
  - Notify state synchronized to customer phone.
  - Exact-fit table recommendation was clear and useful.
  - Staff POS add-on worked once a live bill existed.
  - Mixed QR + staff POS ticket reached KDS correctly.
  - Payment, close/reset, QR lockout, and queue cleanup worked.
- Issues found:
  - After queue seating, POS showed QR active but did not make the active QR link as visibly available as reservation handoff.
  - This case narrowed R6-FLOW-004: staff POS add-on works after an order exists; the broken state is seated/no-order first item creation.
- Improvements needed:
  - Expose the active QR link more clearly after queue seating, same as reservation handoff.
  - Preserve waiter POS add-on after QR order with automated regression coverage.
  - Fix seated/no-order staff POS cart creation from R6-FLOW-004.
- Launch decision: launch-capable for public queue to seated dining lifecycle; polish QR handoff visibility and preserve POS add-on behavior.

### R6-FLOW-007 - Public queue party of 6 -> host capacity safety -> no suitable table -> cleanup

- Priority: P0
- Roles acted through browser: walk-in customer, host
- Status: PASS CAPACITY / FAIL HOST CANCEL CONTROLS
- Score: 7.4 / 10
- Artifacts:
  - Queue ticket: `Q0023`
  - Guest: `R6 Flow 007 QueueParty6 599387`
- Browser workflow executed:
  1. Customer joined public waitlist as a party of 6.
  2. Customer received queue ticket `Q0023`, position 4, party size 6.
  3. Host opened Queue and selected the guest.
  4. Queue detail showed `READY TABLES 0`.
  5. Seat-to-table section showed "No clear table currently matches this party size."
  6. No unsafe T07/T09/T04 seating buttons were offered.
  7. Host clicked Cancel and No-show controls for cleanup; the entry did not visibly change.
  8. Customer clicked Leave queue.
  9. Customer view showed Queue entry cancelled.
  10. Staff Queue returned to `0 active / 0 visible`.
- What passed:
  - Capacity safety is strong. The host could not seat 6 guests into smaller 2-seat or 4-seat tables.
  - The system explained the absence of matching tables clearly.
  - Customer-side Leave queue worked and synchronized back to staff Queue.
- Issues found:
  - Host-side Cancel and No-show buttons appeared active but did not visibly update the entry or show a confirmation/error.
  - For a no-fit party, the decision path should be clearer: wait, convert to reservation, split party, or cancel.
- Improvements needed:
  - Keep the `0 ready` capacity block; it prevents unsafe seating.
  - Fix or clarify host-side Cancel and No-show queue controls.
  - If no suitable table exists, offer a clearer "convert to reservation / split party / keep waiting" path.
  - Show customer-facing status after host cancel/no-show, matching customer Leave queue behavior.
- Launch decision: capacity handling is launch-capable; host queue cancellation/no-show controls need fixing before heavy service use.

### R6-FLOW-008 - Queue guest seated -> moved before ordering -> new QR order -> KDS -> payment -> close

- Priority: P0
- Roles acted through browser: walk-in customer, host, waiter, kitchen, cashier
- Status: PASS WITH QR HANDOFF UX IMPROVEMENTS
- Score: 8.5 / 10
- Artifacts:
  - Queue ticket: `Q0024`
  - Guest: `R6 Flow 008 MoveBeforeOrder 638602`
  - Moved from: `T07`
  - Moved to: `T09`
  - Order: `#96`
  - Final paid total: `SGD 2.50`
- Browser workflow executed:
  1. Customer joined public waitlist.
  2. Host seated guest to T07.
  3. Guest requested another table before ordering.
  4. Staff opened Tables and used Move table on T07.
  5. Move modal explained that the customer session, queue entry, and current orders would move while T07 clears.
  6. Staff moved the visit from T07 to T09.
  7. T07 became idle/available.
  8. Old T07 QR showed Table Closed.
  9. Staff opened POS for T09 and used Open customer QR to reveal the actual T09 QR link.
  10. New T09 QR was active and accepted Coffee order `#96`.
  11. KDS showed `#96` tagged T09 and served it.
  12. Cashier terminal-paid and closed T09.
  13. T09 QR showed Table Closed.
  14. Queue board no longer showed the guest active.
- What passed:
  - Table move before ordering preserved the live session correctly.
  - Old table QR was locked after the move.
  - Destination table QR was active and created the order under the new table.
  - KDS used the new table label.
  - Payment and close/reset worked.
- Issues found:
  - After move, the destination QR/link was not obvious in Tables.
  - POS required using Open customer QR before the link became visible.
  - Destination table card did not make guest/queue identity very obvious.
- Improvements needed:
  - After moving a table, immediately show the destination table QR card/link in the success panel.
  - Keep old-table QR lockout behavior.
  - Add regression coverage for old QR closed + new QR active after no-order table move.
  - Consider showing moved guest/queue name on the destination table card.
- Launch decision: launch-capable for table move before ordering, with QR handoff polish needed.

### R6-FLOW-009 - Customer QR one-item order with rapid double Place order tap -> duplicate protection -> KDS/payment/close

- Priority: P0
- Roles acted through browser: customer, kitchen, cashier
- Status: PASS WITH MINOR FEEDBACK IMPROVEMENT
- Score: 8.9 / 10
- Artifacts:
  - Queue ticket: `Q0025`
  - Guest: `R6 Flow 009 DoubleSubmit 951566`
  - Table: `T07`
  - Order: `#97`
  - Final paid total: `SGD 2.50`
- Browser workflow executed:
  1. Fresh public queue guest was seated to T07.
  2. Customer opened T07 QR.
  3. Customer added Coffee.
  4. Customer rapidly clicked Place order twice.
  5. First click succeeded.
  6. Second click could not submit because the button disappeared/disabled during submission.
  7. Customer view showed one order `#97`.
  8. POS showed `T07 · 1 item · SGD 2.50`.
  9. KDS showed exactly one ticket `#97` with `1x Coffee`.
  10. KDS cleared to zero after service.
  11. Cashier terminal-paid and closed T07.
  12. QR showed Table Closed.
- What passed:
  - No duplicate order was created.
  - No duplicate KDS ticket appeared.
  - No duplicate bill line appeared.
  - Cleanup lifecycle worked.
- Issues found:
  - Customer does not get an explicit "Submitting order..." state; the button simply disappears/flow changes.
- Improvements needed:
  - Keep the post-submit disabled/disappearing behavior.
  - Add a clear submitting spinner/state and success toast.
  - Add automated regression for rapid double-submit on QR Place order.
- Launch decision: launch-capable for QR double-submit protection.

### R6-FLOW-010 - QR order -> start HitPay sandbox -> abandon without paying -> POS remains unpaid -> terminal recovery -> close

- Priority: P0
- Roles acted through browser: customer, kitchen, cashier
- Status: PASS WITH UX IMPROVEMENTS
- Score: 8.7 / 10
- Artifacts:
  - Queue ticket: `Q0026`
  - Guest: `R6 Flow 010 HitPayCancel 143807`
  - Table: `T07`
  - Order: `#98`
  - HitPay: sandbox checkout opened, then abandoned without payment
  - Final recovery payment: terminal, `SGD 2.50`
- Browser workflow executed:
  1. Fresh public queue guest was seated to T07.
  2. Customer placed Coffee order `#98`.
  3. KDS served the order and returned to zero.
  4. Customer clicked Pay Now.
  5. Recurring optional name prompt appeared and had to be skipped.
  6. Payment sheet showed only Pay with HitPay and Pay with Card at Table; Cash was not shown.
  7. Customer clicked Pay with HitPay.
  8. HitPay sandbox checkout opened.
  9. Customer abandoned payment by returning to Sakorio without paying.
  10. Customer QR still showed delivered/unpaid Pay Now state.
  11. Staff POS still showed `Bill #98 payable` for `SGD 2.50`.
  12. Cashier terminal-settled the bill.
  13. Cashier closed T07.
  14. QR showed Table Closed.
- What passed:
  - HitPay checkout opened correctly.
  - Abandoned checkout did not falsely mark the bill paid.
  - POS remained payable/unpaid.
  - Terminal recovery worked.
  - Customer QR payment sheet correctly removed Cash.
- Issues found:
  - Optional name prompt reappeared on return and blocked payment action until skipped.
  - After abandoning HitPay, QR simply returned to Pay Now instead of saying payment was not completed.
- Improvements needed:
  - Persist skipped/entered QR name so abandoned-payment return does not show the prompt again.
  - Show a clear "Payment not completed" status after unpaid HitPay return.
  - Keep Cash removed from customer QR payment options.
- Launch decision: launch-capable for abandoned HitPay recovery, with QR return-state messaging polish.

### R6-FLOW-011 - Customer QR order -> HitPay sandbox card success -> staff POS sync -> close table

- Priority: P0
- Roles acted through browser: customer, kitchen, cashier
- Status: PASS WITH CLOSE-FLOW UX CAVEAT
- Score: 8.9 / 10
- Artifacts:
  - Queue ticket: `Q0027`
  - Guest: `R6 Flow 011 HitPaySuccess 531465`
  - Table: `T07`
  - Order: `#99`
  - HitPay reference: `a24e7833-8144-47f8-872b-e11b90d3d828`
- Browser workflow executed:
  1. Fresh public queue guest was seated to T07.
  2. Customer opened the active T07 QR link and placed Coffee order `#99`.
  3. Kitchen processed the ticket through start, ready, and served.
  4. Customer clicked Pay Now.
  5. Recurring optional name prompt appeared and had to be skipped.
  6. Payment sheet showed Pay with HitPay and Pay with Card at Table; Cash was not shown.
  7. Customer clicked Pay with HitPay and was sent to HitPay sandbox checkout.
  8. Customer entered sandbox card details and completed payment.
  9. HitPay redirected to Sakorio `/payment-success` with `status=completed` and the expected reference.
  10. Staff POS opened T07/order `#99` and showed `Last bill #99 paid`, `Payment received - close the table`, and `SGD 0.00`.
  11. First close attempt was ambiguous because two visible `Close table` buttons existed and the table remained active.
  12. Clicking the table-drawer close button completed the reset: POS showed `T07 is clear and ready for the next cashier bill`.
  13. Customer QR reload showed `Table Closed`.
- What passed:
  - End-to-end customer-side HitPay sandbox success worked.
  - Staff POS payment sync reflected the paid state after the HitPay redirect.
  - Customer QR payment options correctly excluded Cash.
  - Final table reset blocked the old QR after close.
- Issues found:
  - Two visible `Close table` buttons created an ambiguous close action after a paid HitPay bill.
  - Optional QR name prompt still appears before payment even when it is not important to the payment task.
  - Staff POS needs a clearer post-HitPay state transition after pressing close.
- Improvements needed:
  - Deduplicate or clearly distinguish the two `Close table` buttons.
  - Ensure either close button uses the same final close-table handler.
  - Persist skipped/entered QR name before payment.
  - Keep this HitPay success path protected with regression coverage.
- Launch decision: launch-capable for HitPay payment sync, but the paid-close UX should be polished before final launch.

### R6-FLOW-012 - Staff POS table order -> many items -> KDS -> add-on round -> terminal payment -> close -> Orders history

- Priority: P0
- Roles acted through browser: cashier, kitchen
- Status: PASS WITH LAUNCH-RISK POS LAYOUT DEFECT
- Score: 7.4 / 10
- Artifacts:
  - Table: `T01`
  - Order: `#100`
  - First round: Enchiladas, Coffee, Mole Poblano, Pozole, Tecate Roja
  - Add-on round: Coffee
  - Final total: `SGD 62.00`
- Browser workflow executed:
  1. Cashier opened POS directly on available T01.
  2. POS table-service drawer showed T01, QR actions, service loop, current orders, add items, bill/pay, and history tabs.
  3. Attempting to click an early left-side product card from the live browser navigated to Customers instead of adding the item.
  4. Rechecked button coordinates and confirmed the POS product grid was rendering at the far-left of the viewport while the table grid/navigation remained behind/near it.
  5. Cashier retried using product cards positioned farther right; Enchiladas added successfully.
  6. Cashier added Coffee, Mole Poblano, Pozole, and Tecate Roja.
  7. Cashier sent order `#100`; T01 became `Open order`, current session showed 5 items and `SGD 59.50`.
  8. Kitchen & beverages showed order `#100` with 5 mixed food/beverage items.
  9. Kitchen moved the ticket from Start ticket to Ready for pass to Served / Delivered; KDS returned to zero.
  10. Cashier reopened POS for T01/order `#100`, added a second Coffee round, and sent it.
  11. KDS showed the second Coffee as a new pending beverage ticket on the same order.
  12. Kitchen served the add-on; KDS returned to zero.
  13. POS bill showed 6 items and `SGD 62.00`.
  14. Cashier opened Bill / Pay and selected the terminal payment path.
  15. Terminal payment recorded successfully.
  16. POS returned to table grid and showed T01 paid / ready to close.
  17. Cashier closed T01 from the grid.
  18. Orders page showed order `#100` in Order History as Paid with all six items and `SGD 62.00`.
- What passed:
  - Pure staff POS order creation works when the product hit target is actually reachable.
  - Multi-item staff order sent correctly to KDS.
  - KDS handled mixed food and beverage items on one ticket.
  - Same-bill add-on round worked before payment.
  - Terminal payment posted correctly.
  - Table close/reset worked.
  - Orders history preserved the paid order and full item list.
- Issues found:
  - Product cards in the POS service drawer are mispositioned across the page instead of staying inside the selected-table drawer.
  - Left-side POS product cards can sit behind or collide with navigation/table-grid clickable areas; one attempted product click navigated to Customers.
  - Payment has multiple `Pay bill` buttons, which increases ambiguity.
  - After terminal payment, the drawer closes and cashier must find/click Close table from the grid.
  - Orders page has duplicate `Order History` heading/count text and no obvious table/session search focus by default.
- Improvements needed:
  - Fix POS drawer layout so menu, cart, and payment rail stay inside one coherent table-service workspace.
  - Ensure every product card has a clean, non-overlapped hit target at desktop and iPad widths.
  - Deduplicate or visually prioritize `Pay bill` actions.
  - After payment, keep the selected table drawer open with one obvious `Close table` CTA.
  - Add an Orders search/filter shortcut for the just-closed table/order.
- Launch decision: not launch-ready for staff POS-only ordering until the drawer/menu hit-target layout is fixed, even though the backend lifecycle works.

### R6-FLOW-013 - Customer QR large order -> cart review -> KDS readable ticket -> terminal payment -> close

- Priority: P0
- Roles acted through browser: customer, host, kitchen, cashier
- Status: PASS WITH CART/KDS WORDING POLISH
- Score: 8.2 / 10
- Artifacts:
  - Queue ticket: `Q0028`
  - Guest: `R6 Flow 013 QRLarge 648055 652640`
  - Table: `T07`
  - Order: `#101`
  - Final total: `SGD 98.50`
- Browser workflow executed:
  1. Customer joined public queue from the live waitlist page.
  2. Host selected the queue guest and seated them to recommended exact-fit T07.
  3. Staff POS opened T07 from queue handoff with QR active.
  4. Customer opened the T07 QR link from the staff handoff.
  5. Customer skipped the optional name prompt.
  6. Customer added a large cart across food and drinks.
  7. Sticky cart summary showed `10 items` and `SGD 98.50`.
  8. Customer opened the sticky cart sheet.
  9. Cart review showed grouped quantities, including `2` Enchiladas, and total `SGD 98.50`.
  10. Customer placed order `#101`.
  11. Customer current order showed all ordered lines with Pending status and Pay Now.
  12. Kitchen & beverages showed order `#101` for T07 with grouped quantities and station tags.
  13. Kitchen moved the ticket from Start ticket to Ready for pass to Served / Delivered.
  14. KDS briefly showed the ticket in ready lane with a “cleared from KDS” message, then cleared to zero after refresh.
  15. Staff POS opened T07/order `#101` and showed `10 items` / `SGD 98.50`.
  16. Cashier terminal-settled the bill.
  17. Cashier closed T07.
  18. Customer QR reload showed `Table Closed`.
- What passed:
  - Full queue-to-QR-to-KDS-to-payment-to-close lifecycle completed.
  - QR cart review handled a large order without duplicate lines or bill corruption.
  - Customer order summary was readable after submission.
  - KDS grouped quantities and station tags clearly enough for kitchen/beverage staff.
  - POS bill total matched customer QR total.
  - Terminal payment and close/reset worked.
  - Old QR was blocked after close.
- Issues found:
  - QR add buttons remain icon-only; customers need clearer visible add controls.
  - Cart action is hidden inside the sticky cart summary; `Place order` is only visible after expanding it.
  - One intended item, Mole Poblano, did not appear in the final cart, likely from a missed horizontal featured-card tap; the UI should make missed taps more obvious.
  - Customer cart says `10 items`; KDS says `9 items` because it counts lines, not quantity. POS later shows both `10 items` and a 9-line bill list. This is technically correct but confusing.
  - KDS briefly displayed a served ticket with “cleared from KDS” before the board refreshed to zero.
- Improvements needed:
  - Make customer add buttons visibly labeled or add a clear plus/quantity affordance.
  - Add stronger tap feedback when a product is added, especially in the horizontal Featured carousel.
  - Expose `Place order` more clearly from the sticky cart state.
  - Standardize wording: `10 items / 9 lines` or `10 total items` across QR, KDS, and POS.
  - After `Served / Delivered`, remove the KDS ticket immediately or show an explicit fading/transition state.
- Launch decision: launch-capable for large QR order lifecycle, but below 9/10 until cart discoverability and count wording are polished.

### R6-FLOW-014 - Wrong item correction before kitchen starts -> correct order served -> payment -> close

- Priority: P1
- Roles acted through browser: cashier, kitchen
- Status: PARTIAL PASS - PRE-SEND CORRECTION WORKS, POST-SUBMIT CORRECTION NOT DISCOVERABLE
- Score: 7.1 / 10
- Artifacts:
  - Table: `T01`
  - Wrong item tested: Coffee
  - Correct order: `#102`
  - Correct item sent: Enchiladas
  - Final total: `SGD 20.00`
- Browser workflow executed:
  1. Cashier opened available T01 in POS.
  2. Cashier added wrong item Coffee to the cart.
  3. POS cart showed Coffee, `SGD 2.50`, Clear, minus, plus, Send order, and Pay bill controls.
  4. Cashier clicked the minus/remove control.
  5. Cart reset to zero items and `SGD 0.00`.
  6. Cashier added the correct item, Enchiladas.
  7. Cashier sent order `#102`.
  8. POS showed T01/order `#102` pending with 1x Enchiladas and `SGD 20.00`.
  9. Before kitchen started the ticket, cashier opened Orders overview.
  10. Orders overview showed T01 active, latest `#102`, `1x Enchiladas`, and View tickets.
  11. Cashier opened View tickets.
  12. Ticket detail showed `#102`, item, Pending, Open table POS, Hide tickets, and Open bill.
  13. No visible void/remove/edit/correction action was present before kitchen start.
  14. Kitchen then processed the correct order through start, ready, and served.
  15. Cashier terminal-paid `SGD 20.00`.
  16. Cashier closed T01 and table reset to available.
- What passed:
  - Cart-level mistake correction before sending is functional.
  - Removing the last cart item resets the order total correctly.
  - Corrected order sent cleanly to KDS.
  - KDS processed the correct item only; Coffee was not sent.
  - Payment and close/reset worked.
- Issues found:
  - Once a mistaken order is submitted but before kitchen starts, no void/remove/edit/correct path is visible in Orders or ticket detail.
  - Orders detail has `Show Removed Items`, but there is no obvious way to remove an active item.
  - The only recovery path appears to be operational/manual: add a correcting item later or abandon/settle outside a proper audit trail.
  - POS menu layout overlap from R6-FLOW-012 still affects correction workflows because selecting the intended replacement item can be hit-target sensitive.
- Improvements needed:
  - Add a clear pre-prep correction action for pending submitted tickets: Void item, Void ticket, or Send correction.
  - Require reason/manager override if needed, but do not hide the path.
  - Surface correction state in KDS immediately if a pending ticket is removed before prep.
  - Make `Show Removed Items` meaningful by pairing it with a visible remove/void workflow.
  - Add audit trail: who voided, reason, timestamp, and original item.
- Launch decision: launch-risk for manager/cashier correction workflows. Cart mistakes are safe before send, but submitted pending-ticket corrections are not operationally ready.

### R6-FLOW-015 - Customer changes mind after kitchen started -> correction policy check -> final bill -> close

- Priority: P1
- Roles acted through browser: cashier, kitchen, manager-policy reviewer
- Status: PARTIAL FAIL - AFTER-PREP CORRECTION PATH NOT VISIBLE
- Score: 6.6 / 10
- Artifacts:
  - Table: `T01`
  - Order: `#103`
  - Item: Enchiladas
  - Final total: `SGD 20.00`
- Browser workflow executed:
  1. Cashier opened available T01 in POS.
  2. Cashier added Enchiladas and sent order `#103`.
  3. Kitchen & beverages showed `#103` pending for T01.
  4. Kitchen clicked Start ticket.
  5. KDS moved `#103` into Preparing / In prep.
  6. Cashier returned to POS for T01/order `#103` while the ticket was preparing.
  7. POS showed bill `#103`, 1 item, `SGD 20.00`, Pay bill, and Add items.
  8. No visible void, remove, edit, manager override, or “blocked after prep” message was present.
  9. Cashier opened Orders while the ticket was in kitchen.
  10. Orders showed T01 active, latest `#103`, `1 in kitchen`, and View tickets.
  11. Orders controls still only showed Open table POS and View tickets; no after-prep correction path.
  12. Kitchen clicked Ready for pass during cleanup.
  13. KDS text briefly showed `#103 moved to ready`, while still visually describing the ticket under the preparing lane.
  14. After refresh, KDS cleared to zero.
  15. Cashier terminal-paid `SGD 20.00`.
  16. Cashier closed T01 and the table reset.
- What passed:
  - KDS correctly exposes that the order is already in prep.
  - Orders overview shows `1 in kitchen`, which is useful operational context.
  - Final payment and table close/reset worked.
  - No orphan KDS ticket remained after refresh.
- Issues found:
  - No visible after-prep correction workflow exists: no manager override, no void-with-reason, no compensated item, no explicit policy block.
  - The user is left guessing whether changing an in-prep item is impossible, manager-only, or unsupported.
  - POS still allows payment flow while a ticket is/was in prep; it should at least warn when kitchen completion is not clearly served.
  - KDS transition text briefly says the ticket moved to ready while it still appears in the preparing lane, which is confusing.
- Improvements needed:
  - Add a manager-controlled after-prep correction policy: block with clear reason, void with reason, comp item, or manager approval.
  - Show the correction policy directly in POS and Orders when a ticket is in prep.
  - Prevent or warn before payment/close if any ticket is not clearly served/delivered.
  - Make KDS transition states unambiguous: preparing, ready, served/cleared.
  - Store and show an audit trail for after-prep corrections.
- Launch decision: not launch-ready for real restaurant correction policy. The normal happy-path bill can complete, but after-prep exception handling is under-specified.

### R6-FLOW-016 - Paid terminal bill -> cashier tries new order before table close -> audit/close/reset

- Priority: P1
- Roles acted through browser: cashier, kitchen, manager/audit reviewer
- Status: FAIL - PAID-BUT-NOT-CLOSED SESSION CAN ACCEPT NEW ORDER
- Score: 5.0 / 10
- Artifacts:
  - Table: `T01`
  - Paid first bill: `#104`, Coffee, `SGD 2.50`
  - Accidental second bill/order before close: `#105`, Enchiladas, `SGD 20.00`
- Browser workflow executed:
  1. Cashier opened available T01 in POS.
  2. Cashier added Coffee and sent order `#104`.
  3. Cashier terminal-paid bill `#104` for `SGD 2.50` but deliberately did not close T01.
  4. POS grid showed T01 with `Last bill #104`, `Paid`, `Close table`, and `Start order`.
  5. Cashier clicked `Start order` on T01 before closing.
  6. System did not create a new bill immediately; it reopened paid bill `#104` with message `Payment received - close the table`.
  7. The drawer still exposed Add items, menu cards, cart, Send order, and Pay bill.
  8. Cashier clicked Enchiladas on the paid bill.
  9. POS accepted it into cart on the paid-but-not-closed session.
  10. Cashier clicked Send order.
  11. System created/sent order `#105` on T01 before table reset.
  12. POS current session showed unpaid `#105` plus paid `#104` together.
  13. KDS showed old ready ticket `#104` and new pending/ready ticket `#105` during cleanup.
  14. Cashier processed and terminal-paid `#105` for `SGD 20.00`.
  15. Cashier closed T01.
  16. Final KDS recheck showed zero active tickets and T01 reset available.
- What passed:
  - Initial `Start order` click did not immediately create a new bill; it reopened the paid bill state.
  - Final cleanup/payment/close was possible.
  - KDS eventually returned to zero after refresh.
- Issues found:
  - Paid-but-not-closed table still allows Add items and Send order.
  - A new order `#105` can be created before closing/resetting the previous paid session `#104`.
  - Current session can display paid and unpaid orders together after payment, which is exactly the session-mixing risk this case was designed to catch.
  - The grid still shows `Start order` next to a paid-but-not-closed table, which invites the mistake.
  - KDS can still show older ready tickets during this state, adding operational confusion.
- Improvements needed:
  - Hard-block all Add items / Send order actions once the active bill is paid.
  - Replace `Start order` with a single dominant `Close table` action for paid-but-not-closed tables.
  - If staff tries to add items after payment, show a clear modal: `Close table first to start a new visit`.
  - Do not allow a new order ID/session to be created on a paid table until table close/reset completes.
  - Add backend guardrails too; this cannot be frontend-only.
  - Add regression coverage for paid table -> attempted add/send before close.
- Launch decision: launch-blocking. This can mix customer sessions and create cashier/accounting confusion in real service.

### R6-FLOW-017 - Reservation no-show -> later walk-in same service board/table flow -> QR order -> payment -> close

- Priority: P1
- Roles acted through browser: customer, host, kitchen, cashier
- Status: PASS WITH RESERVATION/TIME CAVEATS
- Score: 8.3 / 10
- Artifacts:
  - Reservation: `#63`
  - Reservation guest: `R6 Flow 017 NoShow 175201`
  - No-show final status: `NO-SHOW`
  - Walk-in queue guest: `R6 Flow 017 WalkInAfterNoShow 545457 761760`
  - Walk-in table: `T07`
  - Walk-in order: `#106`
  - Final total: `SGD 2.50`
- Browser workflow executed:
  1. Customer created public reservation `#63`.
  2. Public confirmation displayed reservation time `2026-07-21 16:15`, even though the requested helper input was 19:00.
  3. Staff opened Reservations and found `#63` in Booked status.
  4. Staff clicked `Mark as no-show`.
  5. Confirmation modal explained that the guest did not show and the action would free the table/record no-show.
  6. Staff confirmed `Mark as no-show`.
  7. Reservation board updated `#63` to `NO-SHOW`; active expected guests/awaiting arrival dropped to zero.
  8. Later customer joined public waitlist.
  9. Staff queue board showed the generated walk-in name and recommended T07 as exact fit.
  10. Staff seated the walk-in to T07.
  11. POS opened T07 from queue handoff with QR active and no prior reservation contamination.
  12. Customer opened T07 QR and placed Coffee order `#106`.
  13. KDS received the beverage ticket, processed it, and returned to zero.
  14. Cashier terminal-paid `SGD 2.50`.
  15. Cashier closed T07 and table reset.
  16. Final Reservations check still showed `#63` as `NO-SHOW`.
- What passed:
  - Reservation no-show action is visible and guarded by a confirmation modal.
  - No-show status persisted after confirmation.
  - No-show booking no longer counted as active expected/awaiting guests.
  - Queue later recommended/seated a walk-in table cleanly.
  - Walk-in QR, KDS, payment, close, and reservation audit all completed without cross-contamination.
- Issues found:
  - This run did not pre-assign a table before marking no-show, so assigned-table release specifically still needs a sharper follow-up case.
  - Public reservation time mismatch recurred: requested 19:00, confirmation showed 16:15.
  - Queue helper generated an extra unique suffix, causing one seating lookup miss during automation; human-visible queue board was still clear.
  - Staff login session expired mid-run and required live browser re-login.
- Improvements needed:
  - Add a dedicated regression: assign table -> mark no-show -> verify exact table returns to available.
  - Fix or explain public reservation time-slot selection/confirmation mismatch.
  - Keep the no-show confirmation modal; it is good UX.
  - Consider a no-show audit badge linking the later walk-in/session when the same table is reused.
- Launch decision: launch-capable for unassigned reservation no-show plus later walk-in lifecycle, but assigned-table no-show release and time selection need follow-up.

### R6-FLOW-018 - Timetable shift -> staff profile clock-in -> POS table lifecycle -> clock-out/attendance audit

- Priority: P1
- Roles acted through browser: manager, staff, cashier, kitchen
- Status: PARTIAL PASS - ATTENDANCE BLOCKED BY CAMERA AVAILABILITY
- Score: 7.2 / 10
- Artifacts:
  - Staff profile tested: `Jason Tan — Waiter`
  - Shift shown: `Tue 21, 9:00 AM - 5:00 PM`
  - POS table: `T01`
  - POS order: `#107`
  - Final total: `SGD 2.50`
- Browser workflow executed:
  1. Manager opened Timetable from the staff sidebar.
  2. Timetable displayed monthly calendar, employee roster, schedule actions, Add shift, leave/MC ledger, coverage warning, planned hours, and Excel export.
  3. Manager verified Jason Tan had visible scheduled shifts, including the active Tue 21 shift.
  4. Staff opened My shift.
  5. Staff used the profile dropdown and selected `Jason Tan — Waiter`.
  6. My shift updated to Jason's waiter profile with role, contact, hourly rate, current status, and selected scheduled shift.
  7. Staff clicked `Take photo and clock in`.
  8. Live proof panel opened, but browser environment showed `Requested device not found` while starting camera.
  9. Because clock-in could not complete without a camera device, clock-out and completed attendance record could not be verified in this run.
  10. Cashier still completed the linked service operation: opened POS, selected T01, added Coffee, and sent order `#107`.
  11. Kitchen & beverages received #107, moved it to ready/hand-off, and staff marked it `Served / Delivered`.
  12. Cashier terminal-paid `SGD 2.50`.
  13. POS confirmed T01 reset to available after close.
  14. Staff returned to My shift; no open attendance session existed because clock-in was blocked.
- What passed:
  - Timetable has a credible world-class structure: roster, schedule buttons, coverage warnings, leave/MC ledger, monthly calendar, and exports.
  - My shift now supports the requested staff profile selection before clock-in.
  - Selecting Jason's profile correctly exposed the active scheduled shift and `Take photo and clock in` action.
  - POS/KDS/payment/close lifecycle remained operational while validating the attendance flow.
  - End state was clean: T01 available and KDS had zero active tickets.
- Issues found:
  - Clock-in cannot complete in a browser/device without camera access; the UI stops at `Requested device not found`.
  - No visible manager fallback/manual clock-in approval route appeared from My shift when camera is unavailable.
  - After navigating away and back, My shift defaulted to the Owner profile again, so the selected staff profile is not sticky.
  - Since clock-in was blocked, clock-out and completed attendance/payroll audit could not be fully verified.
- Improvements needed:
  - Add a clear fallback state for no-camera devices: `Camera unavailable - ask manager for manual clock-in approval`.
  - Expose a manager-authorized manual attendance correction path from Reports/Timetable or My shift.
  - Make the selected staff profile sticky for the session, or remember the last selected profile on shared devices.
  - Add browser regression coverage for camera unavailable, permission denied, successful camera, clock-out, and report audit states.
- Launch decision: launch-capable for scheduling visibility and staff profile selection, but attendance is not launch-ready until no-camera/permission-denied fallback and clock-out audit are verified.

### R6-FLOW-019 - End-of-day Orders + Reports audit -> export -> no backlog/open bills verification

- Priority: P1
- Roles acted through browser: cashier, manager
- Status: PASS WITH END-DAY USABILITY POLISH
- Score: 8.8 / 10
- Artifacts:
  - Latest verified paid order: `#107`
  - Reports range shown: `2026-06-21 - 2026-07-21`
  - Report collected total shown: `SGD 1,708.50`
  - Report order count shown: `82`
  - Launch close checklist values: `0 active`, `0 unpaid / open bills`, `0 kitchen tickets not settled`, `0 staff still clocked in`
- Browser workflow executed:
  1. Cashier opened Orders from the staff sidebar.
  2. Orders loaded paid history and showed latest paid order `#107` for T01 with Coffee and `SGD 2.50`.
  3. Cashier verified recent QA orders #106 through #99 were visible in history with table, items, total, status, and timestamp.
  4. Cashier inspected Orders controls and status tabs: Active Orders, Not Paid Yet, Paid - awaiting close, and Order History.
  5. Manager opened Reports from the staff sidebar.
  6. Reports displayed sales summary, date range, quick ranges, CSV/Excel export actions, attendance audit, and report tabs.
  7. Manager reviewed the Launch Close Flow checklist.
  8. Checklist showed zero active/ready-to-clear tables, zero unpaid/open bills, zero unsettled kitchen tickets, and zero open staff sessions.
  9. Manager reviewed sales by payment method, reservations, queue flow, product/category/table/waiter breakdowns, and attendance/payroll sections.
  10. Manager clicked `Export CSV`; the Reports page remained stable and did not crash or navigate away.
  11. End state remained clean with no active KDS backlog or open bills reported.
- What passed:
  - End-day report is much stronger than earlier passes: the Launch Close Flow checklist is exactly the kind of manager-facing safety net needed before launch.
  - Reports expose payment method totals, reservations, queue metrics, product/category/table sales, waiter revenue, and attendance/payroll.
  - Export CSV and Export Excel controls are visible from the main report surface.
  - Orders history shows the latest completed bill immediately after payment/close.
  - Reports and Orders agree that there are no unpaid/open bills after cleanup.
- Issues found:
  - Orders page does not expose a clear search input for order number, table, customer, or payment method.
  - Payment method is visible in Reports but not directly in the Orders history table, so cashier cash-up still requires cross-checking two pages.
  - Historical `Cash` remains in Reports payment-method totals, even though new customer QR payment choices should be HitPay/terminal only; this may be historical data, but it should be labelled or filtered clearly for launch.
  - Export click stability was verified, but actual downloaded file contents were not inspected in this browser run.
- Improvements needed:
  - Add Orders search/filter by order number, table, date/time, status, and payment method.
  - Add payment method and paid timestamp to Orders history rows.
  - Add a one-click `Today cash-up` view that combines latest paid orders, payment totals, open bills, KDS backlog, and export actions.
  - Label legacy/historical payment methods clearly so staff do not think Cash is still a current customer QR option.
  - Add a lightweight post-export toast such as `CSV downloaded`.
- Launch decision: launch-capable for manager close-flow visibility, with search/filter/payment-method UX polish needed before a 10/10 cashier handover.

### R6-FLOW-020 - Busy service pressure: reservation table + queue table + staff POS table + direct QR table -> KDS -> payment -> close -> audit

- Priority: P0
- Roles acted through browser: customer, host, waiter, kitchen, cashier, manager
- Status: PARTIAL PASS - CLEAN FINAL STATE, BUT STAFF POS LEG FAILED
- Score: 7.1 / 10
- Artifacts:
  - Reservation: `#64`
  - Reservation guest: `R6 Flow 020 Reservation 811653`
  - Reservation assigned table attempt: `T02`, then seated at `T04`
  - Queue ticket: `Q0030`
  - Queue guest: `R6 Flow 020 Queue 634854`
  - Queue table: `T07`
  - Direct QR table: `T08`
  - QR orders completed: `#108` T04 Enchiladas `SGD 20.00`, `#109` T07 Coffee `SGD 2.50`, `#110` T08 Coca Cola `SGD 3.00`
  - Staff POS-only table attempted: `T01`
  - Final report checkpoint: `85 orders`, `SGD 1,734.00 collected`
- Browser workflow executed:
  1. Customer created public reservation `#64` for 2 guests at `20:00`.
  2. Host assigned the reservation to T02, but arrival handoff warned `Currently occupied — service may need to turn this table first`.
  3. Host chose the safer available T04 handoff and seated the reservation there.
  4. POS opened T04 with reservation guest context and QR active.
  5. Customer opened T04 QR and placed order `#108` for Enchiladas.
  6. Customer joined public waitlist and received ticket `Q0030`.
  7. Host opened Queue, found `R6 Flow 020 Queue 634854`, and seated the walk-in at recommended exact-fit T07.
  8. POS opened T07 with queue handoff context and QR active.
  9. Customer opened T07 QR and placed order `#109` for Coffee.
  10. Cashier attempted a staff POS-only order on T01 while T04/T07 were already active.
  11. T01 drawer opened and product buttons were visible, but clicking product text/button/visible DOM product button did not add anything to cart; cart stayed at `0 items`, `SGD 0.00`, and Send order never appeared.
  12. Cashier abandoned T01 without creating a bill, leaving T01 clean.
  13. Cashier opened available T08, copied QR link, and customer placed direct QR order `#110` for Coca Cola.
  14. Kitchen & beverages showed three active tickets: 1 kitchen ticket and 2 beverage tickets.
  15. Kitchen moved #108, #109, and #110 from pending to preparing, then ready, then served/delivered.
  16. KDS returned to zero active tickets.
  17. Customer opened T04 Pay Now; payment modal correctly offered `Pay with HitPay` and `Pay with Card at Table` only, with no Cash option.
  18. Customer chose HitPay and reached sandbox checkout for `Order #108 at Ajisen Ramen - T04`.
  19. Test-card completion was attempted twice in the HitPay/Stripe-framed checkout, but checkout remained on the HitPay page and did not redirect/complete.
  20. Cashier recovered T04 safely using terminal payment and closed T04.
  21. Cashier terminal-paid and closed T07.
  22. Cashier terminal-paid T08; the helper stopped before close, so cashier clicked visible `Close table` manually.
  23. Final POS board showed `OPEN BILLS 0`, T04/T07/T08 reset available, and T01 still clean.
  24. Final KDS audit showed zero active tickets.
  25. Final Reservations audit showed `#64` as `FINISHED`.
  26. Final Queue audit showed `0 waiting`, `0 notified`, `0 seated`.
  27. Final Reports Launch Close Flow showed `0 active`, `0 unpaid / open bills`, `0 kitchen tickets not settled`, and `0 staff still clocked in`.
- What passed:
  - Reservation creation, seating recovery, QR ordering, KDS, terminal recovery, close, and FINISHED reservation audit completed.
  - Queue join, host seating, QR ordering, KDS, payment, close, and queue cleanup completed.
  - Direct QR from an available table completed after staff opened/copied the QR.
  - KDS handled three concurrent tickets cleanly with correct kitchen/beverage counts.
  - Final cross-page audit was clean: POS open bills zero, KDS zero, Queue zero active, reservation finished, Reports close checklist all zero.
  - Customer payment modal correctly removed Cash and offered HitPay/terminal only.
- Issues found:
  - T02 looked available on POS but reservation arrival handoff warned it was currently occupied/needed turn. This cross-surface table availability mismatch needs investigation.
  - Staff POS product add failed on T01 during a busy service state. Product buttons were visible in the DOM, but clicking Tacos text, product button, and visible DOM node did not update the cart.
  - The open drawer/table grid interaction is still fragile; earlier click attempts hit the prior T07 drawer instead of T01 until `Back / switch table` was used.
  - HitPay sandbox checkout was created correctly but embedded card completion did not advance after email/test-card input and Pay click.
  - Terminal payment sometimes records payment but does not close automatically; visible manual close works, but the close completion path is inconsistent enough to break automation and confuse rushed cashiers.
  - The direct QR table (T08) can be opened from an available table without seating guest metadata; functionally useful, but it may under-record guest/session source.
- Improvements needed:
  - Fix POS product-card click hit targets inside the table drawer, especially when multiple active/seated tables exist.
  - Add regression coverage for table drawer open -> switch table -> add product -> send order under multiple active tables.
  - Reconcile table availability logic between Reservations arrival handoff and POS grid.
  - Add a single, dominant close-table state after terminal payment, and remove/disable competing `Start order` until close/reset.
  - Add a clear fallback for HitPay sandbox card completion failures: return-to-POS recovery messaging, retry link, and staff-side payment-status refresh.
  - Track direct QR sessions with a clear source label such as `Walk-in QR opened by staff` so reports do not lose context.
- Launch decision: not launch-ready for busy-service pressure. The final cleanup is strong, but the staff POS product-add failure and table-state mismatch are too risky for peak service.

### R6-FLOW-021 - Two simultaneous reservations -> staggered seating -> two QR orders -> KDS -> payment -> close

- Priority: P0
- Roles acted through browser: customer, host, waiter, kitchen, cashier
- Status: PASS WITH RECURRING TIME/QR BUTTON POLISH
- Score: 8.4 / 10
- Artifacts:
  - First reservation: `#65`, guest `R6 Flow 021 First 458745`, table `T07`, order `#111`, Coffee `SGD 2.50`
  - Second reservation: `#66`, guest `R6 Flow 021 Second 468956`, table `T09`, order `#112`, Chile Relleno `SGD 15.00`
  - Final table states: T07 available, T09 available
  - Final QR states: both old QR links showed `Table Closed`
  - Final KDS state: zero active tickets
- Browser workflow executed:
  1. Customer created first public reservation `#65`.
  2. Customer created second public reservation `#66` for the same requested time.
  3. Both public confirmations showed `2026-07-21 16:15` despite the helper requesting `20:15`, repeating the reservation time mismatch finding.
  4. Staff opened Reservations and saw both bookings active, `EXPECTED GUESTS 4`, `AWAITING ARRIVAL 2`, and `NEEDS A TABLE 2`.
  5. Host deliberately selected #65 first even though #66 sorted above it.
  6. Host assigned #65 to exact-fit T07.
  7. Reservations updated to #65 planned at T07 and `NEEDS A TABLE 1`.
  8. Host clicked `Seat + customer QR` for #65.
  9. #65 became `SEATED`, `AWAITING ARRIVAL 1`, `NOW SEATED 1`.
  10. `Open QR/menu` did not visibly open a usable customer tab, so staff used `Open POS` and copied T07 QR from the POS drawer.
  11. Customer opened T07 QR and placed order `#111` for Coffee.
  12. Host returned to Reservations while #65 was live and #66 was still waiting.
  13. Host assigned #66 to exact-fit T09.
  14. Reservations updated to `NEEDS A TABLE 0`.
  15. Host clicked `Seat + customer QR` for #66.
  16. Reservations showed `AWAITING ARRIVAL 0`, `NOW SEATED 2`, and both #65/#66 as seated.
  17. Staff opened POS for #66/T09 and copied the QR link.
  18. Customer opened T09 QR and placed order `#112` for Chile Relleno.
  19. KDS showed two active tickets split correctly: #111 beverage and #112 kitchen.
  20. Kitchen moved both tickets through Start ticket -> Ready for pass -> Served / Delivered.
  21. KDS returned to zero.
  22. Cashier terminal-paid T07 #111; payment recorded but visible manual `Close table` was needed.
  23. Cashier closed T07 and POS showed it available.
  24. Cashier terminal-paid and closed T09 #112.
  25. POS showed `OPEN BILLS 0`.
  26. Customer reloaded old T07 and T09 QR links; both showed `Table Closed`.
  27. Reservations audit showed #65 and #66 as `FINISHED`.
- What passed:
  - Host can manage two same-time reservations without mixing tables or guest names.
  - The board clearly shows first seated / second still waiting, then both seated.
  - Exact-fit table assignment worked for T07 and T09.
  - Two active QR orders stayed separate by table and order ID.
  - KDS station splitting was correct for beverage vs kitchen.
  - Payment/close reset both table QR sessions correctly.
  - Reservation final statuses advanced to FINISHED after payment/close.
- Issues found:
  - Public reservation time mismatch repeated: requested `20:15`, confirmations showed `16:15`.
  - `Open QR/menu` from Reservations did not visibly open a usable customer tab in this browser run; staff had to open POS and copy QR from there.
  - With same-time bookings, sorting placed #66 above #65; staff must read carefully to seat the intended guest first.
  - Terminal payment again landed in paid-awaiting-close state with `Start order` visible beside `Close table`.
- Improvements needed:
  - Fix or clarify public reservation time-slot selection/confirmation mismatch.
  - Make `Open QR/menu` reliable and obvious from Reservations, with copy/open feedback.
  - Add a visible `Arrived order` or `Check-in sequence` marker when multiple bookings share the same time.
  - After payment, suppress `Start order` until table close/reset completes.
  - Add regression coverage for two same-time reservations, staggered seating, parallel QR orders, and final QR lockout.
- Launch decision: launch-capable for concurrent reservation seating and QR order separation, but still needs time-selection and QR handoff polish.

### R6-FLOW-022 - Reservation booked for 2 arrives with 4 -> edit party size -> larger table -> QR order -> KDS -> payment -> close

- Priority: P0
- Roles acted through browser: customer, host, waiter, kitchen, cashier
- Status: PASS WITH TIME/CLOSE-FLOW POLISH
- Score: 8.6 / 10
- Artifacts:
  - Reservation: `#67`
  - Guest: `R6 Flow 022 PartySizeChange 782162`
  - Original party size: `2`
  - Updated party size: `4`
  - Table: `T04`
  - Order: `#113`
  - Item/total: Pozole, `SGD 18.00`
  - Final QR state: `Table Closed`
- Browser workflow executed:
  1. Customer created public reservation `#67` for 2 guests.
  2. Public confirmation again showed `2026-07-21 16:15` despite the requested later slot.
  3. Host opened Reservations and saw #67 booked for 2 guests, active, and needing a table.
  4. Host clicked `Edit` on #67.
  5. Inline edit form opened with party size, seating preference, allergies, calendar/time-slot selector, customer contact fields, reservation notes, staff notes, Cancel, and Save.
  6. Host changed `Party size` from 2 to 4.
  7. Availability recalculated and displayed `Party size: 4` plus time slots and remaining capacity.
  8. Host attempted to keep/select `20:30`, then clicked `Save`.
  9. Reservation list updated #67 to `4 guests`, but still displayed `4:15 PM`.
  10. Host clicked `Assign table`.
  11. Floor planning filtered candidates for 4 guests and showed T04 as clean available, with other 4-seat tables marked `Ready to serve` / `Currently occupied`.
  12. Host assigned T04.
  13. Reservations updated to #67 booked, 4 guests, T04, `NEEDS A TABLE 0`.
  14. Host clicked `Seat + customer QR`.
  15. #67 moved to `SEATED`, 4 guests, T04, `AWAITING ARRIVAL 0`, `NOW SEATED 1`.
  16. Staff opened POS, copied T04 QR, and customer placed QR order `#113` for Pozole.
  17. KDS showed #113 as a kitchen ticket for T04.
  18. Kitchen moved #113 through Start ticket -> Ready for pass -> Served / Delivered.
  19. KDS returned to zero active tickets.
  20. Cashier terminal-paid #113. The helper stopped before close, but visible `Close table` was available.
  21. Cashier clicked `Close table`.
  22. POS showed T04 available, open bills zero.
  23. Reservations audit showed #67 `FINISHED` with `4 guests`.
  24. Customer reloaded old T04 QR and saw `Table Closed`.
- What passed:
  - Staff can edit an active booked reservation's party size.
  - Updated party size persists into reservation summary and final FINISHED record.
  - Table assignment filters/recommends correctly for a larger 4-person party.
  - Seating, QR ordering, KDS, terminal payment, close, reservation finish, and QR lockout all completed.
  - Host guidance was useful: T04 was clean available, while other 4-seat tables were flagged as needing turn/occupied state.
- Issues found:
  - Reservation time mismatch continues. The edit flow recalculated times, but after save the reservation still displayed `4:15 PM`.
  - The system does not explicitly show an `arrived with more guests` reason or change log; staff only see the final 4-guest value.
  - Terminal payment again required visible manual close after payment state.
  - Some 4-seat tables were labelled `Ready to serve` but also `Currently occupied`, which may confuse hosts.
- Improvements needed:
  - Add an explicit party-size change audit line, e.g. `Party changed from 2 to 4 by staff`.
  - Fix reservation time editing/confirmation persistence.
  - Clarify table state wording: avoid combining `Ready to serve` with `Currently occupied`.
  - Keep capacity filtering; this worked well.
  - Add regression coverage for party-size increase before seating and larger-table assignment.
- Launch decision: launch-capable for larger-party handling, with reservation time persistence and wording polish still needed.

### R6-FLOW-023 - Same seated reservation QR opened on two phones -> sequential orders -> one combined bill -> payment -> close

- Priority: P0
- Roles acted through browser: customer on phone A, customer on phone B, host, kitchen, cashier
- Status: PASS - MULTI-DEVICE QR SESSION INTEGRITY WORKS
- Score: 9.0 / 10
- Artifacts:
  - Reservation: `#68`
  - Guest: `R6 Flow 023 MultiDevice 314191`
  - Table: `T07`
  - Shared QR: T07 session QR
  - Combined order: `#114`
  - Phone A item: Enchiladas, `SGD 20.00`
  - Phone B item: Coffee, `SGD 2.50`
  - Combined bill total: `SGD 22.50`
  - Final QR state on both tabs: `Table Closed`
- Browser workflow executed:
  1. Initial booking helper timed out because the public booking page's expected time selector was not immediately available.
  2. Customer manually used the visible booking form, selected `20:45`, filled contact details, and submitted.
  3. Public confirmation correctly preserved `2026-07-21 20:45` for reservation `#68`.
  4. Host opened Reservations and saw #68 at `8:45 PM`, booked for 2 guests.
  5. Host assigned #68 to exact-fit T07.
  6. Host clicked `Seat + customer QR`.
  7. Staff opened POS for T07 and copied the active QR link.
  8. Customer phone A opened the QR and placed Enchiladas.
  9. Phone A showed order `#114`, pending, `SGD 20.00`.
  10. Customer phone B opened the same QR and placed Coffee.
  11. Phone B showed the same order `#114`, pending, total `SGD 22.50`, with both Coffee and Enchiladas listed.
  12. Cashier opened POS for T07/#114.
  13. POS showed one combined live bill #114 with 2 items and `SGD 22.50`.
  14. KDS showed one ticket #114 with both station lines: Coffee as beverage and Enchiladas as kitchen/main course.
  15. Kitchen moved #114 through Start ticket -> Ready for pass -> Served / Delivered.
  16. KDS returned to zero.
  17. Cashier terminal-paid #114. The helper again stopped at post-payment close, but visible `Close table` was available.
  18. Cashier closed T07.
  19. POS showed T07 available and open bills zero.
  20. Reservations audit showed #68 as `FINISHED`.
  21. Phone A reloaded the old QR and saw `Table Closed`.
  22. Phone B reloaded the old QR and also saw `Table Closed`.
- What passed:
  - Same QR on two devices did not create two separate bills.
  - Sequential QR submissions merged into the same order ID and total.
  - POS cashier view showed the combined bill clearly.
  - KDS kept one ticket while still splitting station/category lines correctly.
  - Payment/close reset both QR tabs and finalized the reservation.
  - Manual public booking preserved the intended time, unlike the helper-driven failures seen earlier.
- Issues found:
  - Public booking automation exposed a fragile state where `bookSlotTime` timed out until the visible form was inspected; staff/customer UI itself was usable manually.
  - Post-payment close still has the recurring helper/UX issue: payment records, then staff must click visible close.
  - Same-table multi-device ordering is strong, but no visible "another device just added item" live toast was observed on phone A after phone B submitted.
- Improvements needed:
  - Add live refresh/toast on already-open QR tabs when another device adds to the same bill.
  - Stabilize booking time-slot control loading so automated and fast human interactions do not hit a half-ready state.
  - Keep backend session merge logic; it performed very well.
  - Continue simplifying post-payment close state.
- Launch decision: launch-ready for same-table multi-device QR session integrity, with optional live-sync polish.

### R6-FLOW-024 - QR order -> waiter adds item with special note from POS -> KDS note visibility -> payment -> close

- Priority: P0
- Roles acted through browser: customer, waiter, kitchen, cashier
- Status: PARTIAL FAIL - STAFF ADD-ON WORKS, BUT NOTES ARE MISSING
- Score: 6.2 / 10
- Artifacts:
  - Table: `T07`
  - Order: `#115`
  - Customer QR item: Coca Cola, `SGD 3.00`
  - Staff add-on actually added: Mole Poblano, `SGD 15.00`
  - Final total: `SGD 18.00`
  - Final QR state: `Table Closed`
- Browser workflow executed:
  1. Staff opened a clean T07 session and copied the active QR link.
  2. Customer opened T07 QR and placed Coca Cola order `#115`.
  3. Waiter opened POS for T07/#115.
  4. POS showed one live bill, one QR item, `SGD 3.00`, and Add items menu.
  5. Waiter inspected POS controls for note/special-request/remark/comment fields.
  6. No note or special-request input was visible in the POS table drawer.
  7. Waiter attempted to add Enchiladas from POS.
  8. The clicked product target/index resulted in Mole Poblano being added instead, showing the repeated product hit-target fragility.
  9. Cart showed one staff add-on, total became `SGD 18.00`, and `Send order` appeared.
  10. Waiter sent the add-on to kitchen without any note because no note field existed.
  11. POS current session showed order #115 with `1x Coca Cola` and `1x Mole Poblano`.
  12. KDS showed one ticket #115 with both lines split by station: Coca Cola beverage and Mole Poblano kitchen/main course.
  13. KDS did not show any special note, because none could be entered.
  14. Kitchen served the ticket and KDS returned to zero.
  15. Initial payment helper failed to find Pay bill timing after KDS, but manual Pay bill worked.
  16. Staff payment sheet showed staff-only Cash plus Terminal, with copy explaining customer QR checkout only shows HitPay/card-at-table.
  17. Cashier selected Terminal, recorded payment, closed T07, and POS showed open bills zero.
  18. Customer old QR reload showed `Table Closed`.
- What passed:
  - Staff can add an item to an existing QR-created bill and keep it under the same order ID.
  - KDS receives the combined QR + staff add-on as one ticket with correct kitchen/beverage station split.
  - Customer QR payment choices remain cashless; staff cash is clearly labelled as internal counter settlement.
  - Terminal payment/close/reset completed and QR locked out.
- Issues found:
  - No POS note/special-request input exists in the add-on workflow.
  - Because no note can be entered, KDS cannot display customer/waiter special instructions.
  - Product hit target/index fragility caused the wrong product to be added during staff add-on testing.
  - Payment helper/timing failed until manual Pay bill click, indicating the drawer state remains brittle after KDS transitions.
- Improvements needed:
  - Add item-level notes from POS before sending an add-on, e.g. `No spice`, `less ice`, `allergy`, `serve later`.
  - Show item notes prominently in KDS, POS current session, order history, and printed receipts once printers are revisited.
  - Fix product button hit targets/indexing so a waiter cannot accidentally add the wrong dish under pressure.
  - Add regression coverage for QR order + waiter add-on + note -> KDS note display.
  - Consider requiring confirmation when a staff add-on differs from the tapped product/category during UI testing.
- Launch decision: not launch-ready for special-request handling. Functional add-on works, but notes are a must-have for real kitchen operations.

### R6-FLOW-025 - Pure waiter POS order for non-QR guest -> served -> verbal add-on -> payment -> close

- Priority: P0
- Roles acted through browser: waiter, kitchen, cashier
- Status: PASS WITH MENU/WORDING/CLOSE POLISH
- Score: 8.1 / 10
- Artifacts:
  - Table: `T01`
  - Order: `#116`
  - Initial staff order: Coffee + Enchiladas, `SGD 22.50`
  - Verbal add-on used because no dessert SKU existed: Coca Cola, `SGD 3.00`
  - Final total: `SGD 25.50`
  - Final table state: T01 available, open bills zero
- Browser workflow executed:
  1. Waiter opened clean T01 in POS for an elderly/non-QR customer.
  2. Waiter added Coffee and Enchiladas from POS product cards.
  3. Cart showed 2 items and `SGD 22.50`.
  4. Waiter clicked `Send order`.
  5. POS created order `#116` and kept the bill open for add-ons/payment.
  6. KDS received ticket #116 with Coffee as beverage and Enchiladas as kitchen/main course.
  7. Kitchen moved #116 through Start ticket -> Ready for pass -> Served / Delivered.
  8. KDS returned to zero.
  9. Customer verbally requested an add-on/dessert.
  10. Waiter reopened T01/#116 in POS.
  11. No dessert category or dessert menu item existed, so waiter used Coca Cola as a stand-in add-on.
  12. POS add-on cart showed Coca Cola, and total became `SGD 25.50`.
  13. The service loop copy said `3 items not sent yet` even though only the 1 add-on item was unsent; the cart itself correctly showed `1 in cart`.
  14. Waiter sent the add-on.
  15. POS kept #116 as one order with Coffee, Enchiladas, and Coca Cola, status partially delivered / awaiting payment.
  16. KDS received only the add-on Coca Cola as a new 1-item beverage ticket.
  17. Kitchen served the add-on and KDS returned to zero.
  18. Cashier terminal-paid #116. The helper stopped at paid-awaiting-close again, but manual visible close worked.
  19. Cashier closed T01.
  20. POS showed T01 available and open bills zero.
- What passed:
  - Pure waiter/POS ordering can work smoothly when product card hit targets behave.
  - Initial mixed station ticket split correctly in KDS.
  - Verbal add-on stayed under the same order/bill #116.
  - Add-on created a new KDS ticket only for the new item, not the whole bill again.
  - Payment and close cleaned up the table.
- Issues found:
  - No dessert SKU/category exists, so a real dessert add-on workflow cannot be tested properly.
  - Add-on summary copy is misleading: `3 items not sent yet` should say 1 new item pending, 3 total items on bill.
  - Post-payment close remains a two-step state that frequently breaks helper automation and can confuse staff.
  - Earlier POS hit-target failures mean this pass is not enough to clear the product-click risk globally.
- Improvements needed:
  - Add demo dessert items/category or ensure real restaurant menus support desserts/add-ons if expected in service.
  - Change POS service-loop wording to distinguish `new unsent cart items` from `total bill items`.
  - Keep the add-on KDS behavior; it correctly sent only the newly added item.
  - Simplify/strengthen post-payment close behavior.
  - Add regression coverage for pure staff order -> served -> add-on -> only add-on sent to KDS -> payment/close.
- Launch decision: launch-capable for pure waiter service and add-on rounds, with menu data, wording, and close-state polish.

### R6-FLOW-026 - QR order active -> waiter adds POS item -> customer QR checks updated bill -> terminal payment -> close

- Priority: P0
- Roles acted through browser: customer, waiter, cashier, kitchen
- Status: PASS WITH WORDING/CLOSE POLISH
- Score: 8.7 / 10
- Artifacts:
  - Table: `T07`
  - Order: `#117`
  - Customer QR item: Coca Cola, `SGD 3.00`
  - Waiter POS add-on: Coffee, `SGD 2.50`
  - Customer/cashier verified total: `SGD 5.50`
  - Final QR state: `Table Closed`
- Browser workflow executed:
  1. Staff opened clean T07 and copied the QR link.
  2. Customer opened the T07 QR and placed Coca Cola order `#117`.
  3. Waiter opened POS for T07/#117.
  4. POS showed one live bill #117 with Coca Cola and `SGD 3.00`.
  5. Waiter added Coffee from POS.
  6. POS add-on cart showed Coffee and total `SGD 5.50`.
  7. Service-loop copy said `2 items not sent yet` even though only Coffee was the new unsent item; cart correctly said `1 in cart`.
  8. Waiter clicked `Send order`.
  9. POS kept the same order #117 and showed two items, `SGD 5.50`.
  10. Customer reloaded/checks QR and saw the same order #117 with Coffee + Coca Cola, total `SGD 5.50`.
  11. Cashier opened POS and confirmed the same bill/order/total.
  12. KDS showed one beverage ticket #117 with both Coca Cola and Coffee.
  13. Kitchen moved the ticket through Start ticket -> Ready for pass -> Served / Delivered.
  14. KDS returned to zero.
  15. Cashier terminal-paid #117.
  16. Cashier closed T07.
  17. POS showed open bills zero and T07 available.
  18. Customer reloaded old QR and saw `Table Closed`.
- What passed:
  - QR-originated bill and staff POS add-on synchronized correctly.
  - Customer QR showed the waiter-added item and same total.
  - Cashier POS total matched customer QR total.
  - KDS received the combined beverage ticket and cleared normally.
  - Payment/close reset the QR session safely.
- Issues found:
  - Add-on wording again confuses total bill item count with unsent cart item count.
  - Post-payment still requires a separate close-table action.
  - Browser helper/tab state was brittle during the run; manual direct browser interaction recovered the flow without losing the live order.
- Improvements needed:
  - Change add-on copy to `1 new item to send · 2 total bill items`.
  - Keep the QR/POS sync behavior; it worked well.
  - Continue simplifying paid-awaiting-close state.
  - Add regression coverage for QR order -> POS add-on -> QR bill reload total parity.
- Launch decision: launch-capable for mixed QR + staff POS item sync.

### R6-FLOW-027 - QR order -> cashier terminal payment instead of HitPay -> kitchen -> close

- Priority: P0
- Roles acted through browser: customer, cashier, kitchen
- Status: PASS WITH CLOSE-POLISH NOTE
- Score: 8.8 / 10
- Artifacts:
  - Table: `T07`
  - Order: `#118`
  - Item: Coca Cola, `SGD 3.00`
  - Payment: cashier terminal/card-at-table path
  - Final QR state: `Table Closed`
- Browser workflow executed:
  1. Staff opened T07 in POS and copied the live customer QR link.
  2. Customer opened the QR and placed Coca Cola.
  3. Customer order panel showed `Order #118`, Pending, `SGD 3.00`.
  4. Cashier opened POS for T07/#118 and saw one open bill.
  5. Kitchen & beverages received the beverage ticket.
  6. Kitchen moved it through Start ticket -> Ready for pass -> Served / Delivered.
  7. Cashier reopened POS and selected Pay bill.
  8. Cashier used the terminal/card-at-table payment path.
  9. Cashier closed T07.
  10. POS board showed `OPEN BILLS 0` and T07 available.
  11. Customer reloaded the old QR and saw `Table Closed`.
- What passed:
  - Customer can choose not to pay by HitPay and still be settled safely by cashier.
  - Staff POS recognized the QR order as an open bill.
  - KDS ticket lifecycle worked for the beverage order.
  - Terminal payment and close reset QR access correctly.
- Issues found:
  - KDS sweep had extra `Served / Delivered` buttons visible during the run, implying previous/secondary ticket rows can still be visually noisy during rush-state cleanup.
  - Payment and close are still two distinct cashier actions.
- Improvements needed:
  - Keep the terminal fallback path; it is important and works.
  - Reduce KDS residual action noise after a ticket is delivered.
  - Continue making paid-awaiting-close state more obvious.
- Launch decision: launch-capable for QR-to-cashier terminal settlement.

### R6-FLOW-028 - QR order -> customer starts payment but abandons -> cashier terminal recovery -> close

- Priority: P0
- Roles acted through browser: customer, cashier, kitchen
- Status: PASS WITH RECOVERY FRICTION
- Score: 7.8 / 10
- Artifacts:
  - Table: `T08`
  - Order: `#119`
  - Item: Coffee, `SGD 2.50`
  - Recovery payment: cashier terminal/card-at-table path
  - Final staff state: T08 verified available after refresh
- Browser workflow executed:
  1. Staff opened T08 in POS and copied the customer QR link.
  2. Customer opened the QR and placed Coffee.
  3. Customer order panel showed `Order #119`, Pending, `SGD 2.50`.
  4. Customer clicked `Pay Now`.
  5. Customer remained in the in-app payment-choice modal area (`How would you...`) rather than completing HitPay, simulating abandonment before external payment completion.
  6. Cashier opened T08/#119 in POS and saw `OPEN BILLS 1`.
  7. Kitchen received and completed the beverage ticket.
  8. Cashier selected Pay bill and used terminal/card-at-table payment.
  9. POS changed to paid/ready-close state for bill #119.
  10. A first close attempt did not fully remove the close affordance from the board until refresh/retry.
  11. After retry/refresh, T08 verified as `Available` and `Ready for order`.
- What passed:
  - Abandoned customer payment did not corrupt the order.
  - Cashier could recover the unpaid QR bill and terminal-settle it.
  - Kitchen ticket processing remained independent of payment abandonment.
  - The table could be cleaned after a retry/refresh.
- Issues found:
  - `Pay Now` first lands in the payment choice modal; the next required step is not strong enough if the customer hesitates.
  - Paid-awaiting-close state briefly left a stale close affordance on the table board until refresh.
  - Customer-side post-abandonment copy should more clearly say the order is still unpaid and can be paid at the cashier.
- Improvements needed:
  - Add a stronger customer payment-choice CTA such as `Pay online with HitPay` and `Pay at cashier`.
  - After terminal payment, auto-refresh the table board or make close-state reconciliation immediate.
  - Add regression coverage for customer-abandoned online payment -> cashier terminal recovery.
- Launch decision: safe recovery path exists, but the customer payment-choice and close-state refresh polish should be improved before launch.

### R6-FLOW-029 - Cashier selects wrong table -> catches before send -> switches to correct table -> order/pay/close

- Priority: P0
- Roles acted through browser: cashier, kitchen
- Status: PASS WITH CLOSE POLISH
- Score: 8.5 / 10
- Artifacts:
  - Wrong table cart: T01, Coca Cola, not sent
  - Correct table: T02
  - Correct order: `#120`
  - Final state: T02 available, open bills zero
- Browser workflow executed:
  1. Cashier opened T01 in POS by mistake.
  2. Cashier added Coca Cola to the current cart.
  3. Before sending, cashier used `Back / switch table`.
  4. Board still showed `OPEN BILLS 0`; the unsent wrong-table cart did not become a live ticket.
  5. Cashier opened correct table T02.
  6. Cashier added Coca Cola and clicked `Send order`.
  7. POS created `Order #120` for T02.
  8. Kitchen received the ticket and completed Start ticket -> Ready for pass -> Served / Delivered.
  9. Cashier terminal-paid and closed T02.
  10. Final board verified T02 available and `OPEN BILLS 0`.
- What passed:
  - Wrong-table mistakes can be caught safely before send.
  - Switching table before send does not open a bill.
  - Correct-table POS order, KDS, payment, and close all completed.
- Issues found:
  - Close-state action again required repeated click/refresh behavior before the board fully settled.
  - There is no explicit warning when leaving a table with an unsent cart; this is safe but could surprise a cashier.
- Improvements needed:
  - Add `Discard unsent cart?` confirmation when switching away from a table with items.
  - Stabilize paid-close refresh behavior.
- Launch decision: launch-capable for pre-send wrong-table recovery.

### R6-FLOW-030 - Wrong item submitted before kitchen starts -> attempt correction -> workaround/pay/close

- Priority: P0
- Roles acted through browser: cashier, manager, kitchen
- Status: FAILS MANAGER-CORRECTION EXPECTATION
- Score: 6.4 / 10
- Artifacts:
  - Table: `T03`
  - Order: `#121`
  - Wrong item: Coca Cola
  - Corrective add-on: Coffee
  - Final state: T03 available, open bills zero
- Browser workflow executed:
  1. Cashier opened T03 in POS.
  2. Cashier intentionally submitted the wrong item, Coca Cola.
  3. POS created `Order #121`.
  4. Before starting kitchen, cashier/manager inspected POS and Orders for correction controls.
  5. POS had no obvious `Void`, `Cancel item`, `Edit`, or `Correction` action.
  6. Orders tab exposed `Show Removed Items`, but not a clear actionable item-void workflow.
  7. Cashier used the workaround: add the correct Coffee item to the same bill.
  8. Kitchen processed the visible ticket.
  9. Cashier terminal-paid and closed the table for cleanup.
- What passed:
  - The wrong item stayed visible in Orders and POS.
  - The table/order could still be settled and closed.
  - Adding a corrective item did not create a duplicate table session.
- Issues found:
  - There is no clear pre-kitchen manager void/correction path.
  - `Show Removed Items` reads like a filter, not a correction tool.
  - The workaround overcharges unless staff manually compensate outside the system.
- Improvements needed:
  - Add manager-authorized item void before kitchen starts.
  - Record void reason, staff, time, and removed amount.
  - Surface voided/removed items in order history and reports.
- Launch decision: not launch-complete for cashier mistake recovery.

### R6-FLOW-031 - Wrong item already started in kitchen -> correction attempt -> safe cleanup

- Priority: P0
- Roles acted through browser: cashier, manager, kitchen
- Status: FAILS MANAGER-CORRECTION EXPECTATION
- Score: 6.0 / 10
- Artifacts:
  - Table: `T04`
  - Order: `#122`
  - Item: Coca Cola
  - Kitchen state observed: Preparing / in prep
  - Final state: T04 available, open bills zero
- Browser workflow executed:
  1. Cashier opened T04 in POS.
  2. Cashier submitted Coca Cola.
  3. POS created `Order #122`.
  4. Kitchen opened the ticket and clicked `Start ticket`.
  5. KDS showed #122 in `WORKING NOW`, Preparing, T04.
  6. Manager/cashier inspected Orders for post-start correction options.
  7. Orders showed the active kitchen ticket but no clear manager override, void, comp, or cancel action.
  8. Kitchen finished the ticket.
  9. Cashier terminal-paid and closed the table for cleanup.
- What passed:
  - Kitchen started-state visibility is clear.
  - The system avoids casual destructive edits after kitchen has started.
  - Cleanup through serve/payment/close remained safe.
- Issues found:
  - No manager policy path is visible for already-started item corrections.
  - There is no clear distinction between `cannot void because kitchen started` and `void tool not available`.
- Improvements needed:
  - Add a manager-only correction workflow for started tickets: void/comp with kitchen acknowledgement, reason, and audit trail.
  - If correction is intentionally blocked, show the reason and recommended procedure.
- Launch decision: not launch-complete for real-world started-ticket mistakes.

### R6-FLOW-032 - Paid order complaint -> partial refund/adjustment/reopen visibility

- Priority: P1
- Roles acted through browser: manager, cashier
- Status: MISSING REFUND/ADJUSTMENT WORKFLOW
- Score: 5.5 / 10
- Artifacts:
  - Checked latest paid history including `#122`, `#121`, `#120`, `#119`, `#118`
  - Reports range showed `97 orders`, `SGD 1,858.00 collected`
- Browser workflow executed:
  1. Manager opened Orders after recent paid orders.
  2. Orders history listed paid orders with table, items, total, status, and date.
  3. Manager searched the page for refund/partial refund/adjustment/reopen/void controls.
  4. No action controls were visible.
  5. Manager opened Reports.
  6. Reports summarized payment method totals, end-day checklist, and exports.
  7. Reports did not expose a refund or paid-bill adjustment workflow.
- What passed:
  - Paid order history is readable and useful.
  - Reports summarize payment methods clearly.
  - End-day checklist gives a good operations frame.
- Issues found:
  - No partial refund, adjustment, reopen, or manager override path is visible for paid orders.
  - No refund audit trail exists in the visible manager workflow.
- Improvements needed:
  - Add manager-only paid bill correction/refund workflow.
  - Require refund reason and link it to original payment method.
  - Add refund totals and net/gross reporting.
- Launch decision: not launch-complete for manager cash-up controls.

### R6-FLOW-033 - Customer table move after first order -> move attempt -> QR/session/table labels

- Priority: P0
- Roles acted through browser: host, waiter, cashier, kitchen
- Status: FAILS MOVE-TABLE UX EXPECTATION
- Score: 5.8 / 10
- Artifacts:
  - First order: `#123` on T01, cleaned normally
  - Move attempt order: `#124`, started on T05
  - Unexpected visual result: order appeared under T01 after pressing `Move table`
  - Final cleanup: open bills zero; T01/T05/T09 available
- Browser workflow executed:
  1. Cashier created a simple Coffee order on T01 to inspect move controls.
  2. POS did not show a clear move action; Tables tab did show `Move table`.
  3. Cashier cleaned T01.
  4. Cashier created fresh order `#124` on T05.
  5. Host opened Tables and clicked `Move table` on the live T05 order.
  6. No clear destination selection or confirmation was presented to the operator.
  7. The live order appeared to jump to T01 while T05 became idle.
  8. Staff cleaned the resulting order safely and verified open bills zero.
- What passed:
  - The Tables tab surfaces table-move intent.
  - The system kept a single live bill and could be cleaned.
- Issues found:
  - Table move is not safe enough: destination/confirmation was unclear.
  - The order appeared to move to an unexpected table.
  - QR/session implications of a move are not explained to staff.
- Improvements needed:
  - Replace current move action with an explicit `Move bill from T05 to...` modal.
  - Require destination selection, confirmation, and show old/new QR status.
  - Add success toast: `Bill #124 moved from T05 to T09`.
  - Add regression coverage for table move with QR link refresh.
- Launch decision: launch-blocking for table move workflows.

### R6-FLOW-034 - Merge two tables before ordering -> support/workaround -> separate bills cleanup

- Priority: P1
- Roles acted through browser: host, cashier, kitchen
- Status: UNSUPPORTED WITH SAFE WORKAROUND
- Score: 5.5 / 10
- Artifacts:
  - Tables checked: T07 and T08
  - Orders: `#125` T07 Coffee, `#126` T08 Coca Cola
  - Final state: open bills zero; T07/T08 available
- Browser workflow executed:
  1. Host opened Tables and searched for merge/combine/link-table controls.
  2. No merge/combine table action was visible; only `Move table` appeared.
  3. Cashier created separate bills on T07 and T08 as the workaround.
  4. Orders tab showed two independent active table orders.
  5. Kitchen received tickets and staff processed them.
  6. Cashier terminal-paid and closed both tables.
- What passed:
  - Separate-table workaround is safe.
  - Orders remain separated by table and can be paid independently.
- Issues found:
  - No table merge/combine workflow for groups spanning tables.
  - KDS cleanup again showed more action buttons than expected for the number of created tickets.
- Improvements needed:
  - Add explicit merge/link table workflow or a clear “not supported” policy.
  - If unsupported, provide staff guidance: keep separate bills or move to one larger table.
- Launch decision: acceptable only if merge/split-table service is explicitly out of launch scope.

### R6-FLOW-035 - Split bill/partial payment after ordering -> inspect payment support -> full-pay cleanup

- Priority: P1
- Roles acted through browser: cashier
- Status: UNSUPPORTED WITH FULL-PAY WORKAROUND
- Score: 6.2 / 10
- Artifacts:
  - Table: `T09`
  - Order: `#127`
  - Items: Coffee + Coca Cola, `SGD 5.50`
  - Final state: T09 available after extra close
- Browser workflow executed:
  1. Cashier created a two-item bill on T09.
  2. Cashier opened Bill / Pay.
  3. Payment sheet showed amount due and staff payment methods.
  4. The sheet exposed Cash, Terminal, HitPay/context copy, and custom/counter wording.
  5. No split-by-item, split-by-person, or partial amount workflow was visible.
  6. Cashier full-paid by terminal.
  7. T09 required an extra close action after refresh before becoming available.
- What passed:
  - Full bill payment is clear.
  - Staff-only cash copy is explicit.
- Issues found:
  - No split bill or partial payment support.
  - Paid table remained in close-required state until explicitly closed.
- Improvements needed:
  - Add split bill support or label it out-of-scope.
  - Add partial payment/tendered amount if cash-counter workflows remain.
- Launch decision: usable for single-payment restaurants, incomplete for split-bill dining.

### R6-FLOW-036 - Paid bill then missed item before guest leaves -> add-on attempt -> close/reset

- Priority: P1
- Roles acted through browser: cashier, waiter
- Status: PASS WITH POLICY COPY NEEDED
- Score: 7.6 / 10
- Artifacts:
  - Table: `T07`
  - Order: `#128`
  - Final state: T07 available
- Browser workflow executed:
  1. Cashier created a Coffee order on T07.
  2. Cashier terminal-paid the bill but did not immediately close the table.
  3. Staff attempted to add Coca Cola into the paid-awaiting-close state.
  4. Add/send was not allowed in the settled bill state.
  5. Staff closed/reset the table.
- What passed:
  - The system protects paid bills from casual post-payment modification.
  - Table can be reset safely.
- Issues found:
  - Staff copy does not clearly explain the policy: close/reset first, then start a new bill if the guest orders again.
- Improvements needed:
  - Add paid-state helper copy: `This bill is paid. Close table to start a new order.`
  - Add a `Start new bill after close` shortcut.
- Launch decision: safe, but staff policy copy should be clearer.

### R6-FLOW-037 - Queue guest leaves before seating -> rejoins same phone -> staff queue visibility

- Priority: P1
- Roles acted through browser: customer, host
- Status: PASS WITH SESSION-STATE POLISH
- Score: 8.0 / 10
- Artifacts:
  - Queue entry observed: `Q0031`
  - Rejoin entry observed: `Q0032`
  - Staff queue saw rejoined guest
- Browser workflow executed:
  1. Customer opened public waitlist.
  2. Existing completed queue status offered `Join again`.
  3. Customer/public flow created an active queue entry.
  4. Customer clicked `Leave queue`.
  5. Public page showed `Queue entry cancelled`.
  6. Customer clicked `Join again`.
  7. Customer rejoined with the same phone and a new QA name.
  8. Public page showed a new queue number.
  9. Staff Queue showed the rejoined guest in the live board.
- What passed:
  - Customer can cancel and rejoin.
  - Staff sees the rejoined guest.
  - Public waitlist has a useful saved status page.
- Issues found:
  - After cleanup, the public page appeared to fall back to the earlier queue number/status in one refresh path.
  - Host-side cancellation controls are less obvious than customer-side `Leave queue`.
- Improvements needed:
  - Tighten public queue session identity after cancel/rejoin.
  - Make host cancel/remove action more discoverable in Queue.
- Launch decision: launch-capable with session-state polish.

### R6-FLOW-038 - Fully booked/late reservation while queue waiting -> host priority context

- Priority: P1
- Roles acted through browser: customer, host
- Status: FAILS TIME-SELECTION RELIABILITY
- Score: 6.3 / 10
- Artifacts:
  - Reservation: `#69`
  - Attempted intent: July 22, 2026 at 19:00
  - Actual confirmation: `2026-07-22 09:00`
  - Cleanup: public cancellation completed
- Browser workflow executed:
  1. Customer opened public booking page.
  2. Customer attempted to book a future reservation for July 22 at 19:00.
  3. Booking confirmed successfully, but at `09:00` instead of intended `19:00`.
  4. Staff Reservations today view did not show the booking because it was for tomorrow.
  5. Tables best-next-seats and Queue showed walk-in/queue priority context separately.
  6. Customer opened the reservation status page and cancelled #69.
- What passed:
  - Public booking can create and cancel a reservation.
  - Staff Reservations can see future cancelled reservation after date navigation.
  - Queue and Tables provide useful host context.
- Issues found:
  - Date/time selection is unreliable or unclear; attempted 19:00 became 09:00.
  - Staff has to navigate service date to see tomorrow’s booking.
  - Queue-vs-reservation priority is contextual, not a single decision workflow.
- Improvements needed:
  - Fix or clarify public booking time-slot selection.
  - Add stronger confirmation before submit: selected date/time in large text.
  - Add host priority panel combining queue + upcoming reservations.
- Launch decision: public booking time accuracy must be fixed before launch.

### R6-FLOW-039 - Public reservation cancel -> staff cancellation visibility -> no table residue

- Priority: P1
- Roles acted through browser: customer, host
- Status: PASS
- Score: 8.4 / 10
- Artifacts:
  - Reservation: `#69`
  - Final status: `CANCELLED`
  - Staff date checked: Wednesday, July 22, 2026
- Browser workflow executed:
  1. Customer opened the reservation status link.
  2. Customer clicked `Cancel`.
  3. Customer confirmed `Yes, cancel reservation`.
  4. Public page showed `Cancelled`.
  5. Staff opened Reservations.
  6. Staff navigated to July 22.
  7. Staff saw #69 with customer name, phone, email, party size, and `CANCELLED`.
- What passed:
  - Customer cancellation works.
  - Staff cancellation visibility works.
  - Cancelled reservation did not create a table residue.
- Issues found:
  - Staff date navigation is manual; the cancellation is easy to miss if staff remains on today.
- Improvements needed:
  - Add recent changes/cancellations feed.
  - Add “tomorrow changed” badge or notification.
- Launch decision: launch-capable.

### R6-FLOW-040 - Unavailable/sold-out item handling

- Priority: P0
- Roles acted through browser: manager, cashier
- Status: MISSING SOLD-OUT WORKFLOW
- Score: 4.5 / 10
- Artifacts:
  - Checked Products page
  - Checked Inventory page
  - Inventory state: setup needed, zero items
- Browser workflow executed:
  1. Manager opened Products.
  2. Manager searched visible product list/actions for Available, Unavailable, Sold out, In stock, Disable, Hide.
  3. No menu-item availability toggle was visible.
  4. Manager opened Inventory.
  5. Inventory showed setup-needed and zero items.
  6. No menu sold-out linkage was visible.
- What passed:
  - Product list is readable.
  - Inventory clearly says setup is needed.
- Issues found:
  - No same-day sold-out/unavailable item workflow.
  - QR/POS cannot visibly hide or disable sold-out items.
  - Inventory is not connected to menu availability in the visible UI.
- Improvements needed:
  - Add per-product `Available / Sold out` toggle.
  - Reflect sold-out state in customer QR, POS, and KDS.
  - Add quick sold-out controls from KDS/POS for rush service.
- Launch decision: launch-blocking for real service unless menu availability is handled outside the system.

### R6-FLOW-041 - Customer notes/modifiers across multiple QR rounds

- Priority: P0
- Roles acted through browser: customer, waiter, kitchen
- Status: MISSING NOTES/MODIFIERS
- Score: 6.5 / 10
- Artifacts:
  - Table: `T07`
  - Order: `#129`
  - Round 1: Coffee
  - Round 2: Coca Cola
  - Final total: `SGD 5.50`
- Browser workflow executed:
  1. Staff copied T07 QR.
  2. Customer opened QR and added Coffee.
  3. Customer cart showed Coffee and `Place order`.
  4. No notes/special request/modifier input was visible.
  5. Customer placed order #129.
  6. Customer added Coca Cola in a second round.
  7. Same order #129 updated to two pending items and `SGD 5.50`.
  8. Staff POS showed both items on the live bill.
  9. KDS showed both beverage items.
  10. No note/modifier text appeared in POS or KDS.
  11. Staff processed, paid, and closed the table.
- What passed:
  - Multi-round QR ordering stays on the same bill.
  - Customer total and staff POS total matched.
  - KDS ticket received both items.
- Issues found:
  - No visible customer notes/special requests.
  - No item modifiers/options.
  - POS and KDS cannot receive prep notes from QR.
- Improvements needed:
  - Add item-level notes and optional modifiers.
  - Show notes clearly in KDS and POS bill.
  - Consider high-friction guard for allergies.
- Launch decision: launch-capable for simple menu; not launch-complete for modifier-heavy operations.

### R6-FLOW-042 - Unpaid/unserved close guardrails

- Priority: P0
- Roles acted through browser: cashier, kitchen
- Status: PARTIAL PASS
- Score: 7.2 / 10
- Artifacts:
  - Table: `T08`
  - Order: `#130`
  - Item: Coffee
  - Final state: T08 available
- Browser workflow executed:
  1. Cashier created Coffee order #130 on T08.
  2. Before payment, POS did not show `Close table`; unpaid close was guarded.
  3. Cashier paid the bill by terminal before kitchen started/served the ticket.
  4. KDS still showed #130 as pending after payment.
  5. Kitchen processed the ticket after payment.
  6. Staff closed/reset T08.
- What passed:
  - Unpaid table cannot be casually closed.
  - Payment before service is possible for prepaid/counter-service mode.
  - Kitchen ticket remains visible after prepayment.
- Issues found:
  - POS allows payment while KDS still has unserved items without a strong warning.
  - Dine-in operators may assume paid means service completed.
- Improvements needed:
  - Add warning before payment/close when any kitchen item is pending/in prep.
  - Add mode-specific policy: counter prepaid vs dine-in settle-after-service.
- Launch decision: safe but needs clearer unserved-ticket warning.

### R6-FLOW-043 - KDS refresh during rush

- Priority: P0
- Roles acted through browser: cashier, kitchen
- Status: PASS WITH KDS ACTION-STATE NOISE
- Score: 7.1 / 10
- Artifacts:
  - Orders: `#131` T01 Coffee, `#132` T02 Coca Cola, `#133` T03 Tecate Light
  - Initial KDS: 3 beverage tickets
  - Final state: open bills zero; residue cleaned
- Browser workflow executed:
  1. Cashier created three quick beverage tickets across T01/T02/T03.
  2. Kitchen opened KDS and saw all three tickets.
  3. Kitchen refreshed/reloaded the KDS view.
  4. All three tickets remained visible and actionable after refresh.
  5. Kitchen processed tickets through the standard lanes.
  6. Staff terminal-paid and closed the tables.
- What passed:
  - KDS refresh does not lose tickets.
  - Ticket table labels, item names, and lane counts are visible.
  - Cleanup can restore open bills to zero.
- Issues found:
  - The click/action sequence showed more Start/Ready actions than the three tickets warranted.
  - One ready ticket residue remained after the first sweep and needed a second cleanup.
  - KDS action-state transitions feel noisy under rush automation.
- Improvements needed:
  - Debounce or disable KDS action buttons immediately after click.
  - Reconcile lane counters instantly after each state transition.
  - Add stronger “all clear” confirmation.
- Launch decision: usable but KDS state polish is needed for rush confidence.

### R6-FLOW-044 - iPad landscape cashier full lifecycle

- Priority: P0
- Roles acted through browser: cashier, kitchen
- Status: PASS WITH KDS NOISE NOTE
- Score: 8.5 / 10
- Artifacts:
  - Viewport: tablet landscape override, observed browser width around `1280px`
  - Table: `T07`
  - Order: `#134`
  - Final state: T07 available, open bills zero
- Browser workflow executed:
  1. Browser viewport was set to tablet/iPad landscape.
  2. Cashier opened POS for T07.
  3. Layout check showed no horizontal overflow.
  4. Cashier added Coffee; cart remained inside the table drawer.
  5. Cashier sent order #134.
  6. Kitchen processed the ticket.
  7. Cashier terminal-paid and closed T07.
  8. Final POS board showed open bills zero and T07 available after sync.
- What passed:
  - POS cashier workflow works on tablet landscape.
  - No horizontal overflow detected.
  - Table drawer/cart/payment remained usable.
- Issues found:
  - KDS cleanup again showed duplicate delivered-action noise.
  - Close-state sync still needed a short wait after clicks.
- Improvements needed:
  - Keep tablet CSS as a required regression breakpoint.
  - Stabilize KDS action transition counts.
- Launch decision: launch-capable for iPad POS.

### R6-FLOW-045 - iPad host reservations/queue/tables

- Priority: P1
- Roles acted through browser: host
- Status: PASS
- Score: 8.2 / 10
- Artifacts:
  - Pages checked: Tables, Queue, Reservations
  - Viewport: tablet landscape
  - Horizontal overflow: none detected
- Browser workflow executed:
  1. Host opened Tables on tablet landscape.
  2. Host verified floor board, best-next-seats, Start order, Orders, and waiter/QR actions.
  3. Host opened Queue.
  4. Host verified permanent waitlist QR, Add to queue, live board, filters, and waiting lanes.
  5. Host opened Reservations.
  6. Host verified New reservation, status filters, service date navigation, and timeline.
  7. Layout metrics showed no horizontal overflow on all three pages.
- What passed:
  - Host pages are tablet-usable.
  - Key actions are present on the visible page.
  - No container overlap/horizontal scroll issue was detected.
- Issues found:
  - Pages are vertically long; host may scroll heavily during rush.
  - Queue still contains stale hidden entries and best-next-seat cards from previous QA data.
- Improvements needed:
  - Add sticky host action toolbar for iPad.
  - Add one-tap stale queue cleanup/review mode.
- Launch decision: launch-capable.

### R6-FLOW-046 - iPad kitchen ticket handling

- Priority: P0
- Roles acted through browser: customer, kitchen, cashier
- Status: PASS AFTER SESSION RECOVERY
- Score: 8.4 / 10
- Artifacts:
  - Table: `T08`
  - Order: `#135`
  - Item: Coca Cola
  - Final KDS state: zero active orders
  - Final POS state: T08 available, open bills zero
- Browser workflow executed:
  1. Staff session had expired during tablet testing and redirected to login.
  2. Staff logged back in through browser.
  3. Staff copied T08 QR link from POS.
  4. Customer placed Coca Cola order #135 via QR.
  5. Kitchen opened KDS on tablet landscape.
  6. KDS showed one beverage ticket with no horizontal overflow.
  7. Kitchen completed Start ticket -> Ready for pass -> Served / Delivered.
  8. KDS showed `No active tickets` and `No active orders`.
  9. Cashier terminal-paid and closed T08.
- What passed:
  - KDS is clean and efficient for a single tablet ticket.
  - QR handoff to KDS works after staff relogin.
  - Final cleanup restored table/open-bill state.
- Issues found:
  - POS product-grid click timed out once in tablet testing before relogin/state recovery.
  - Staff session expiry can interrupt long QA/service operations.
- Improvements needed:
  - Add session-expiry warning or smoother return-to-intended-page after login.
  - Keep tablet KDS in regression tests.
- Launch decision: launch-capable with session-timeout polish.

### R6-FLOW-047 - User/profile/timetable/shift readiness

- Priority: P1
- Roles acted through browser: manager, staff
- Status: PARTIAL PASS
- Score: 7.0 / 10
- Artifacts:
  - Users page: Owner + Jason Tan waiter visible
  - Actual timetable route: `/working-plan`
  - My Shift: profile selector visible; no open shift currently available
- Browser workflow executed:
  1. Manager opened Users and verified Add User plus existing owner/waiter profiles.
  2. Manager opened `/timetable`; it redirected to Dashboard.
  3. Manager inspected dashboard links and found `Timetable` points to `/working-plan`.
  4. Manager opened `/working-plan`.
  5. Timetable showed Add shift, Week/Calendar, employee roster, coverage warnings, export, and leave/MC ledger.
  6. Staff opened My Shift.
  7. My Shift showed profile selector, employee profile details, scheduled shifts, and “No shift available to clock in.”
- What passed:
  - Users/profiles exist and roles are visible.
  - Timetable has strong roster planning features.
  - My Shift now supports selecting staff profile before attendance.
- Issues found:
  - `/timetable` route is not valid despite the tab being named Timetable; actual route is `/working-plan`.
  - No current open shift meant clock-in/out could not be completed end-to-end in this pass.
  - Camera/photo fallback was not re-tested here.
- Improvements needed:
  - Add `/timetable` redirect/alias to `/working-plan`.
  - Provide manager “open test shift now” or easier shift-start path.
  - Re-run clock-in/out when an active shift window exists.
- Launch decision: timetable planning is strong; attendance E2E needs another pass with an active shift.

### R6-FLOW-048 - Annual leave / MC ledger

- Priority: P1
- Roles acted through browser: manager
- Status: PASS WITH FORM-DENSITY POLISH
- Score: 7.5 / 10
- Artifacts:
  - Page: `/working-plan`
  - Existing leave record visible: Jason Tan annual leave, 2026-07-01, 1 day
  - Annual leave total showed `1 day(s)`
  - MC / sick leave total showed `0 day(s)`
- Browser workflow executed:
  1. Manager opened Timetable.
  2. Manager opened/activated `Record leave / MC`.
  3. Leave control area showed Staff, Type, From, To, Days deducted, Notes, and Record leave / MC.
  4. Existing annual leave record appeared in the ledger with Delete action.
  5. Form fields could be interacted with, but no new record was intentionally submitted in this pass.
- What passed:
  - Annual leave and MC ledger exists.
  - Deducted days are visible.
  - Existing records can be reviewed.
- Issues found:
  - Form is dense on iPad because it lives inside a very large calendar page.
  - Control discovery is noisy due many calendar add/delete shift buttons.
- Improvements needed:
  - Use a focused modal/drawer for leave/MC record creation.
  - Add leave balance remaining per staff, not just records in current timetable range.
- Launch decision: usable for basic leave ledger, not yet “world-class” leave management.

### R6-FLOW-049 - Payment settings -> reports reconciliation -> secret safety

- Priority: P0
- Roles acted through browser: manager
- Status: PASS
- Score: 8.6 / 10
- Artifacts:
  - Settings Payment section checked
  - Reports payment breakdown checked
  - No raw key/salt leak detected in visible page text
- Browser workflow executed:
  1. Manager opened Settings.
  2. Manager opened Payment Settings.
  3. Payment Settings showed SGD, HitPay Sandbox/Live controls, Business API Key field, Webhook Salt field, fiscal settings, immediate payment required, tip settings, and location verification.
  4. Key/salt values were not exposed in visible page text.
  5. Manager opened Reports.
  6. Reports showed payment method reconciliation: HitPay, Terminal, Cash, and other.
- What passed:
  - Payment settings are discoverable and secret-safe.
  - Reports reconcile payment methods clearly.
  - HitPay configuration is visibly available without leaking credentials.
- Issues found:
  - Cash remains in Reports because staff-side historical/internal cash payments exist, even though customer QR cash is removed.
  - Payment Settings is a long form with many unrelated fiscal/location settings.
- Improvements needed:
  - Add a payment-health card showing HitPay configured, webhook reachable, and current mode.
  - Add explanation that Cash in reports is staff/internal only.
- Launch decision: launch-capable.

### R6-FLOW-050 - Final launch rehearsal: POS/KDS/Orders/Reports/public surfaces

- Priority: P0
- Roles acted through browser: manager, cashier, kitchen, customer
- Status: PASS WITH NON-CORE OPEN ITEMS
- Score: 8.8 / 10
- Artifacts:
  - POS: `OPEN BILLS 0`
  - KDS: `No active tickets`, `No active orders`
  - Reports launch close flow: 0 active/ready tables, 0 unpaid/open bills, 0 kitchen tickets not settled, 0 staff still clocked in
  - Reports: `110 orders`, `SGD 1,899.50 collected`
  - Public booking page loaded
  - Public waitlist active QA entry cancelled after check
- Browser workflow executed:
  1. Manager opened POS board.
  2. POS showed open bills zero.
  3. Manager opened KDS.
  4. KDS showed zero active tickets/orders.
  5. Manager opened Orders.
  6. Orders history showed the latest QA paid orders.
  7. Manager opened Reports.
  8. Launch close flow checklist showed zero active/open/backlog/staff-session blockers.
  9. Customer opened public booking page.
  10. Customer opened public waitlist page.
  11. Remaining QA waitlist entry was cancelled.
  12. Tablet viewport override was reset after testing.
- What passed:
  - Core end-day state is clean.
  - Reports checklist is useful and accurate for launch close.
  - Public booking/waitlist surfaces load.
  - No open bills or KDS backlog remained after the full 50-case run.
- Issues found:
  - Public waitlist can retain active QA/customer session state until explicitly cancelled.
  - Launch readiness is held back by feature gaps rather than core close-state failure.
- Improvements needed:
  - Add a QA/service cleanup dashboard for stale public waitlist sessions.
  - Resolve the P0/P1 gaps listed in this brief before calling the system launch-ready.
- Launch decision: core close rehearsal passes, but overall launch remains conditional on the documented high-priority fixes.

## Cross-case findings after all 50 browser workflows

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
9. Public queue flow is strong: waitlist join, notify, recommended seating, QR order, waiter add-on, KDS, payment, close, and queue cleanup all worked.
10. Queue capacity safety is strong for oversized parties, but host-side Cancel/No-show controls need repair or clearer feedback.
11. Table move before ordering is functionally correct, including old QR lockout and destination QR activation.
12. QR rapid double-submit protection is effective; no duplicate order, KDS ticket, or bill line was produced.
13. Abandoned HitPay checkout is recoverable; POS remains unpaid and terminal settlement can finish the bill safely.
14. HitPay sandbox success synchronizes into POS correctly, but the paid table close action has duplicate visible buttons and needs cleanup.
15. Pure staff POS order lifecycle works from order to KDS to payment to history, but the POS product grid can overlap navigation/table hit targets, making staff ordering unreliable.
16. Large QR orders are operationally stable, but cart expansion and item/line-count wording need usability polish.
17. POS supports pre-send cart correction, but there is no discoverable void/remove path for a submitted pending ticket before KDS starts.
18. After-prep correction/manager override policy is not visible. POS/Orders need explicit safe handling for changes once kitchen has started.
19. Earlier paid-but-not-closed testing showed a second POS order could be created before table reset. The later R6-FLOW-036 retest blocked add/send after payment, so this appears improved but must stay in regression coverage.
20. Reservation no-show is functional and confirmed by modal, but public booking time mismatch continues and assigned-table no-show release still needs direct verification.
21. Timetable now has strong roster/calendar/leave/coverage foundations, and My shift has the requested staff profile picker.
22. Attendance clock-in is blocked on devices without camera access and needs a manager-approved fallback path.
23. Reports now has a strong Launch Close Flow checklist with table/order/kitchen/staff-session safety checks.
24. Orders history needs practical cash-up filters/search and payment-method visibility.
25. Busy-service cleanup is reliable once orders exist: KDS, terminal payment, table close, queue cleanup, reservation completion, and Reports checklist all reached clean final state.
26. Staff POS product add can fail even when product buttons are visible, especially with drawer/table-grid pressure. This is now a repeated launch-risk defect.
27. Reservation/POS table availability can disagree; one surface showed T02 available while arrival handoff warned it was occupied.
28. HitPay checkout creation works, and Cash is removed from the customer payment modal, but embedded sandbox card completion still needs a more deterministic QA path.
29. Two simultaneous reservations can be seated, ordered, paid, closed, and finished without cross-table QR/session leakage.
30. Reservation `Open QR/menu` is less reliable than opening POS and copying QR from the table drawer.
31. Party-size increase before seating works and capacity-filtered larger table assignment is strong.
32. Reservation edit/save still does not reliably preserve or display the intended time slot.
33. Table-state copy such as `Ready to serve` plus `Currently occupied` needs clearer operational wording.
34. Same QR opened on two devices correctly merges sequential submissions into one order/bill and one KDS ticket.
35. Manual public booking with explicit slot selection can preserve the intended time; the recurring mismatch appears tied to fragile/incorrect slot selection paths rather than all booking flows.
36. POS has no visible item-level special-request/note field for waiter add-ons, so kitchen cannot receive service notes from POS.
37. Product hit-target fragility is now observed in multiple flows and can add the wrong item during staff POS add-ons.
38. Pure waiter/POS order plus later add-on can work and correctly sends only the new add-on to KDS.
39. POS add-on copy confuses total bill items with unsent cart items.
40. Demo/restaurant catalog lacks dessert items, limiting real dessert/add-on workflow QA.
41. Customer QR bill and cashier POS bill stay synchronized after waiter POS add-ons.
42. Table move is currently not safe enough: the destination/confirmation UX is unclear, and one live move attempt appeared to move a bill to an unexpected table.
43. Paid-order manager controls are incomplete: no visible refund, partial adjustment, reopen, comp, or manager override workflow was found.
44. Sold-out/unavailable menu item handling is missing from Products, POS, QR, and visible Inventory workflows.
45. Split bill, partial payment, and table merge/link workflows are not available; restaurants needing these should not launch without a policy/workaround.
46. Customer QR and staff POS both lack item-level notes/modifiers, which limits allergy/special-request handling.
47. KDS refresh preserves tickets, but state transitions can show extra action buttons or require an additional cleanup pass under rush conditions.
48. iPad/tablet layout is mostly strong: POS, Tables, Queue, Reservations, KDS, Settings, and Reports showed no horizontal overflow at the tested landscape viewport.
49. The Timetable page is implemented at `/working-plan`; `/timetable` redirects to Dashboard and should become an alias.
50. Final launch rehearsal passed core operational close checks: POS open bills zero, KDS zero active tickets, Reports checklist zero unresolved tables/orders/kitchen/staff sessions.

## Pending workflows

All `R6-FLOW-001` through `R6-FLOW-050` have been executed through the browser and documented in this results brief.
