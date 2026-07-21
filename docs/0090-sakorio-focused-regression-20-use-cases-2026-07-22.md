# Sakorio POS focused regression - 20 browser use cases

Date: 2026-07-22  
Environment: live staging domains (`staff.sakorio.com`, `order.sakorio.com`)  
Build verified: `2.1.6 ee37d573`  
Tester mode: browser-only live workflow regression

## Executive summary

- Total use cases executed: 20
- Passed: 17
- Passed with note: 3
- Failed: 0
- Average score: 9.14 / 10
- Live full-flow proof completed: public reservation -> host assigns T07 -> guest seated -> QR order -> Orders/KDS -> kitchen prep/ready/served -> terminal settlement -> close/reset table.
- Synthetic data created during pass:
  - Reservation `#70`, customer `QA Regression 20`, phone `+6590000000`, table `T07`.
  - QR order `#137`, `1 x Enchiladas`, terminal-paid and table closed.
  - T07 was reset to available after the flow.

## Top findings

1. The core launch workflow is now strong. POS, QR, Orders, KDS, payment, and close-table path completed end-to-end.
2. The recent sold-out fix is holding: Coffee disappeared from QR when sold out and was restored after QA.
3. Reservation phone validation needs clearer UX. `80000000` failed with `Invalid phone number`; `+6590000000` succeeded. The field should show an inline example and failed submit should focus/scroll to the invalid field.
4. Queue has accumulated old QA/test entries. This is not a blocker, but queue cleanup/archive controls should be added before launch.
5. Payment/close works, but final close/reservation finish messaging can be stronger. The reservation auto-finished after close, but the user-facing confirmation path should be more explicit.

## Scorecard

| ID | Workflow | Area | Score | Status | Browser outcome | Improvement |
|---|---|---:|---:|---|---|---|
| REG20-001 | Staff login and dashboard recovery | Auth / staff shell | 9.5 | PASS | Expired session recovered cleanly through staff login; dashboard loaded with owner role and navigation. | Keep session-expiry redirect message explicit so staff know why they are back at login. |
| REG20-002 | POS shell loads latest deploy and table board | POS | 9.5 | PASS | POS loaded on `2.1.6 ee37d573`; table board, open bill metrics and catalog count visible. | Continue monitoring Render free wake delays. |
| REG20-003 | Orders tab loads operational modes | Orders | 9.2 | PASS | Orders loads with active/not paid/paid-close/history structure; paid/history policy callout present. | Add stronger quick filters by table/customer once data grows. |
| REG20-004 | Tables tab loads floor/session controls | Tables | 9.0 | PASS | Tables page loads; floor board and table workflow remain available. | Run deeper table move/close regression in table-specific batch. |
| REG20-005 | Queue tab loads host queue overview | Queue | 8.8 | PASS | Queue page loads with waiting/open state; no auth/layout failure. | Add cleanup/archive controls for old QA queue entries. |
| REG20-006 | Kitchen board loads service-flow guide | Kitchen/KDS | 9.6 | PASS | `/kitchen` loads and shows service-flow guide. | Add sound/alert testing with real incoming ticket. |
| REG20-007 | POS select table opens table drawer | POS | 9.4 | PASS | T01 drawer opened; Bill/Pay, Orders, History, menu grid visible. | Keep selected-table drawer as default service loop. |
| REG20-008 | POS add item to cart without page navigation | POS | 9.3 | PASS | Coca Cola added to cart in drawer without navigating away. | Add clearer cart highlight/animation after product tap if needed. |
| REG20-009 | POS launch guardrail visible before checkout | POS / payment policy | 9.5 | PASS | One-bill/split/refund guardrail visible in selected table drawer. | Keep policy visible before checkout. |
| REG20-010 | POS current orders/history separation visible | POS / Orders history | 9.0 | PASS | Drawer shows separate Orders and History counts. | Add current-session empty-state examples for new staff. |
| REG20-011 | Products sold-out hides item from live QR | Products / QR | 9.7 | PASS | Coffee marked sold out; QR did not show Coffee; QR count dropped to 9. | Keep UTC-safe sold-out behavior in regression. |
| REG20-012 | Products restore returns item to staff menu state | Products | 9.2 | PASS | Coffee restored; Products row returned to Available. | Add direct customer-side restore check to future automated tests. |
| REG20-013 | Public reservation requires explicit time and submits synthetic booking | Reservations / public | 8.8 | PASS_WITH_NOTE | Blank time required; booking succeeded after phone used `+65` format. | Add phone format example and focus/scroll invalid phone field after failed submit. |
| REG20-014 | Staff reservations can see public booking | Reservations / host | 8.6 | PASS_WITH_NOTE | Staff Reservations showed synthetic booking after successful retry. | Add search/filter prominence and new-booking highlight for host confidence. |
| REG20-015 | Host assigns synthetic reservation to recommended table | Reservations / Tables | 9.0 | PASS | Assigned reservation `#70` to available T07; modal closed and row showed T07. | Add stronger success toast/highlight after assignment. |
| REG20-016 | Reservation seat now / QR handoff opens service state | Reservations -> Tables/POS | 9.0 | PASS | `Seat + customer QR` changed reservation to SEATED on T07 with POS/QR actions. | Add deterministic success toast/direct POS fallback if this ever regresses. |
| REG20-017 | Customer QR places first order for seated reservation table | QR ordering | 9.0 | PASS | T07 QR added Enchiladas and created order `#137`. | Add stronger success banner/order number if not always prominent. |
| REG20-018 | QR order appears in Orders and Kitchen board | Orders / KDS | 9.1 | PASS | Orders and KDS showed T07/Enchiladas. | Automate KDS transition clicks in future test suite. |
| REG20-019 | Kitchen ticket advances through prep/ready/served | Kitchen/KDS | 9.0 | PASS | KDS advanced `#137`: Start ticket -> Ready for pass -> Served / Delivered; ticket disappeared from active board. | Add completion toast/countdown after Served. |
| REG20-020 | Cashier settles terminal payment and table can be closed/reset | POS payment / close table | 8.7 | PASS_WITH_NOTE | Terminal payment recorded, T07 closed and reset, reservation `#70` finished. | Strengthen final close confirmation and reservation auto-finish messaging. |

## iPad/tablet viewport addendum

Viewport sanity was run at an iPad-like breakpoint through the browser viewport override.

- POS at tablet size: no horizontal overflow signal; table board and drawer text remained accessible.
- KDS at tablet size: no horizontal overflow signal; service-flow guide remained visible.
- Recommendation: keep doing full iPad regression with screenshots before launch, especially POS drawer, Tables, Orders, KDS, and Reservations.

## Next polish backlog from this pass

1. Reservation phone validation UX
   - Show example format near the field: `+65 9000 0000`.
   - On failed submit, scroll/focus to invalid phone field.
   - Make the error visually stronger.

2. Queue cleanup/archive
   - Old QA queue entries are accumulating.
   - Add bulk archive/cleanup for stale queue entries, protected by confirmation.

3. Reservation host confidence
   - After public booking, host page should make the new booking easy to find.
   - Add search-by-name/phone and a newly-created highlight.

4. Table assignment feedback
   - Assignment works, but repeated `Assign` buttons are hard for automation/accessibility.
   - Use accessible labels such as `Assign T07`.
   - Add success toast: `Reservation #70 assigned to T07`.

5. Close table / reservation finish messaging
   - Payment and close table completed.
   - The reservation was finished automatically, but staff should see an explicit close/finish confirmation.

6. KDS completion reassurance
   - Served ticket disappearance is correct.
   - Add a small toast/countdown so kitchen knows the ticket intentionally left the board.

