# Sakorio POS end-to-end QA brief - 50 launch scenarios

Date: 2026-07-25  
Run prefix: `SKR-20260725-E2E`  
Target: live Sakorio staging/production domains through browser only  
Status: scenario brief ready for execution

## Purpose

This document is the next launch-readiness QA script for Sakorio POS. It is designed for full end-to-end restaurant simulations, not isolated button checks. Each scenario starts from a real-world user intent and ends with a verifiable operational state: seated, ordered, routed to kitchen/beverage, paid, closed, cleaned up, reported, or blocked correctly.

The execution pass for this brief must be performed through the live browser only. Code inspection can support diagnosis later, but scenario scoring must come from the visible live product.

## Reference documents used

- `0064-sakorio-random-e2e-use-case-brief-2026-07-18.md`
- `0065-sakorio-browser-qa-results-20-use-cases-2026-07-18.md`
- `0080-sakorio-round-2-browser-qa-50-use-cases-2026-07-19.md`
- `0098-sakorio-final-100-e2e-simulation-brief-2026-07-22.md`
- `0099-sakorio-final-100-e2e-simulation-results-2026-07-22.md`
- `0109-sakorio-menu-final-pdf-audit-2026-07-24.md`
- `0110-sakorio-menu-live-browser-button-qa-2026-07-24.md`

## Live surfaces to test

- Staff portal: `https://staff.sakorio.com`
- Customer QR ordering: `https://order.sakorio.com/menu/<table_token>`
- Public reservation: `https://order.sakorio.com/book/1`
- Public queue/waitlist: `https://order.sakorio.com/waitlist/1`
- HitPay sandbox checkout, when reached from Sakorio
- Render dashboard only for deploy/status confirmation, not for UX scoring

## Non-negotiable launch invariants

1. A payment request is not the same as a completed payment.
2. Orders from the same table session stay current until the table is closed.
3. Previous table sessions must appear only under History, not current Orders.
4. QR customers can see only their own active session and total bill.
5. QR checkout must not show Cash; allowed options are HitPay/terminal-style flows only.
6. Unpaid tables cannot be closed accidentally.
7. Closing a table requires clear final confirmation and resets the table safely.
8. Kitchen and beverage views must be readable during active service.
9. POS/Tables/Orders/Kitchen/Reservations/Queue must agree on table state.
10. iPad/tablet layouts must avoid overlaps, hidden critical actions, or excessive scrolling.
11. Staff protected routes must require a valid staff session.
12. Menu names, prices, and images should match the imported menu audit where available.

## Current known risks to re-test

These risks came from the latest browser/menu QA pass and must be covered in the scenarios below:

- Staff auth/session can become inconsistent, especially after redirects or multiple open tabs.
- POS previously showed a long syncing state and redirected to login in some sessions.
- Reopening QR after a ticket was served produced a blank menu once.
- Test order `#229` / other QA orders may remain active unless explicitly cleaned up.
- Menu image coverage is high but not perfect; image/name/price verification still matters.
- Multi-tab browser testing can create stale QR/table state if the table is not closed.

## Scoring model

Use a 10-point score for each scenario.

- 10.0: Launch-grade. Fast, clear, no data issues, no confusing steps.
- 9.0-9.9: Launch-ready with minor polish only.
- 8.0-8.9: Usable but not launch-perfect; improvement required before final signoff.
- 7.0-7.9: Functional weakness or confusing workflow; fix before launch.
- Below 7.0: Blocker-level user or operational risk.

A scenario cannot receive 10/10 if any of these happen: stale data appears, wrong table/session appears, payment truth is unclear, close-table flow is ambiguous, critical buttons are hidden on iPad, or staff is redirected unexpectedly.

## Browser result template

Use this exact structure when executing each scenario:

```md
### SKR-20260725-E2E-###
- Priority:
- Roles simulated:
- Browser/device mode:
- Starting state:
- Test data:
- Steps actually performed:
- Expected final state:
- Actual final state:
- Cross-module verification:
- Functional correctness:
- UI/UX clarity:
- Workflow speed:
- Layout/device stability:
- Data/payment/session integrity:
- Final score:
- Status: PASS / FAIL / BLOCKED / NEEDS SPECIFICATION
- Evidence:
- Defects found:
- Improvements needed:
- Cleanup performed:
- Launch decision:
```

## Recommended execution order

1. Run scenarios 001-005 first to prove staff auth, POS load, QR load, and cleanup are stable.
2. Run table and QR ordering scenarios before heavy reservation/queue scenarios.
3. Run reservation and queue scenarios while keeping one clean table available for controlled testing.
4. Run payment scenarios with HitPay sandbox only. Do not use real customer payment data.
5. Run kitchen/beverage scenarios during the same browser session to catch live state propagation.
6. Run manager/staff/timetable/reporting scenarios last.
7. Finish with cleanup and iPad/tablet regression.

## Scenario catalog

### A. Baseline access, session, and system health

| ID | Priority | Roles | End-to-end workflow | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-20260725-E2E-001 | P0 | Staff | Staff logs in, opens Dashboard, POS, Tables, Orders, Kitchen, Reservations, Queue, Products, Timetable, then logs out. | Use only `staff.sakorio.com`; verify protected pages after logout redirect to login. | Staff auth is stable; no surprise redirects while logged in. |
| SKR-20260725-E2E-002 | P0 | Cashier | Fresh staff login, open POS, wait for table grid/menu/payment lane to settle, refresh POS twice, then navigate away and back. | Confirm POS does not stay stuck on syncing and does not redirect to login. | POS is usable within acceptable time and session persists. |
| SKR-20260725-E2E-003 | P0 | Customer, Waiter | Open a live table QR, browse categories, search/menu scroll, add one item, submit order, then staff verifies order appears. | Customer side and staff Orders/Tables/Kitchen views. | QR customer can order; order lands on correct table/session. |
| SKR-20260725-E2E-004 | P0 | Manager | Identify all active QA tables/orders from earlier runs, close or mark test data safely, then confirm current service board is clean. | Tables, Orders, Kitchen, History. | No old QA noise blocks new regression scoring. |
| SKR-20260725-E2E-005 | P1 | Staff, Customer | Open two staff tabs and two QR tabs, perform refresh/navigation, then confirm each tab still shows the correct role/session. | Multi-tab live browser behavior. | No cross-session leakage, stale QR, or forced logout from normal multi-tab work. |

### B. Core dine-in QR ordering flows

| ID | Priority | Roles | End-to-end workflow | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-20260725-E2E-006 | P0 | Host, Customer, Kitchen, Cashier | Seat walk-in at an idle table, customer scans QR, orders one food item, kitchen receives it, cashier views current bill, table remains open. | Tables, QR menu, Kitchen, Orders/POS. | First order is active and visible everywhere. |
| SKR-20260725-E2E-007 | P0 | Customer, Kitchen, Cashier | Same table orders round 1, then orders round 2 from the same QR; staff verifies both rounds remain current. | QR bill, Orders, Kitchen, POS table bill. | Earlier order must not move to History until table close. |
| SKR-20260725-E2E-008 | P0 | Customer | Customer reloads QR after ordering, opens bill/order history area, and checks current session total. | QR page only. | Customer sees only current session and current bill, not previous customers. |
| SKR-20260725-E2E-009 | P0 | Customer, Waiter | Customer orders, kitchen marks ticket served, customer reopens QR from same table. | QR page after served state; Kitchen. | QR must not blank; bill/current session remains understandable. |
| SKR-20260725-E2E-010 | P1 | Customer | Customer uses QR on iPad/mobile width, browses 30+ menu items, searches, adds/removes cart items, submits. | Browser tablet/mobile viewport. | Menu remains compact, buttons visible, no excessive forced scrolling. |
| SKR-20260725-E2E-011 | P1 | Customer, Waiter | Customer submits special instructions/modifier-like notes, waiter/kitchen review them, then order is served. | QR cart/order note; Kitchen ticket; Orders detail. | Notes are not lost and are readable. |
| SKR-20260725-E2E-012 | P1 | Customer, Cashier | Customer creates an order, then decides to order additional item before payment; cashier confirms combined total. | QR, POS, Orders. | Combined bill total is correct; no duplicate table session. |
| SKR-20260725-E2E-013 | P1 | Customer, Staff | Customer uses an old QR from a previously closed table session after close/reset. | Old QR URL after table close. | Old session is blocked, expired, or clearly reset without exposing history. |
| SKR-20260725-E2E-014 | P1 | Customer | Customer tries empty cart checkout, invalid quantity patterns, and rapid add/remove actions. | QR menu/cart. | UI blocks bad submission and remains stable. |
| SKR-20260725-E2E-015 | P2 | Customer | Customer scrolls imported menu categories, checks 20 random item names/prices/images against menu audit expectations. | QR menu and product detail/cards. | Names/prices are clean; no funny characters; images load where available. |

### C. Reservations to seating to order to close

| ID | Priority | Roles | End-to-end workflow | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-20260725-E2E-016 | P0 | Customer, Host, Waiter, Kitchen, Cashier | Customer reserves online, host finds booking, assigns table, customer QR orders, kitchen serves, cashier takes payment, closes table. | Public booking, Reservations, Tables, QR, Kitchen, POS/Orders. | Full reservation lifecycle works end to end. |
| SKR-20260725-E2E-017 | P0 | Customer, Host | Customer enters invalid phone/email during reservation, corrects it, submits, host searches by corrected details. | Public booking validation; host Reservations search. | Validation is clear, focus returns to error, host can find booking. |
| SKR-20260725-E2E-018 | P1 | Host | Host creates/edits reservation party size, assigns suitable table, then changes assignment before seating. | Reservations and Tables. | Capacity/state updates clearly and no double assignment. |
| SKR-20260725-E2E-019 | P1 | Host, Customer | Customer reservation is cancelled/no-showed, then customer attempts to use old booking/manage link if available. | Public manage link, Reservations. | Cancelled booking cannot be seated accidentally. |
| SKR-20260725-E2E-020 | P1 | Host, Waiter | Two reservations arrive close together; host seats both to separate tables, waiter verifies QR/table identity for both. | Reservations, Tables, two QR pages. | No table/reservation cross-linking. |
| SKR-20260725-E2E-021 | P1 | Host, Customer | Reservation party arrives early; host seats now; QR order starts before original booking time. | Reservations, Tables, QR. | Seat-now flow is clear and state changes from reservation to active table. |
| SKR-20260725-E2E-022 | P1 | Host, Manager | Host attempts to close/finish reservation while table is unpaid/open. | Reservations, Tables, POS. | System blocks or warns strongly before finishing. |
| SKR-20260725-E2E-023 | P2 | Customer, Host | Customer creates reservation with long name/remarks; host views on desktop and iPad. | Public booking, Reservations tablet viewport. | Long text does not overlap containers. |

### D. Queue and walk-in guest flows

| ID | Priority | Roles | End-to-end workflow | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-20260725-E2E-024 | P0 | Customer, Host, Waiter, Kitchen, Cashier | Walk-in joins public waitlist, host seats them, customer QR orders, kitchen serves, cashier closes table. | Waitlist, Queue, Tables, QR, Kitchen, POS. | Full queue lifecycle works. |
| SKR-20260725-E2E-025 | P1 | Host | Host adds walk-in manually, edits party size/name, seats to available table, confirms queue entry leaves active queue. | Queue and Tables. | Queue does not retain seated stale entry. |
| SKR-20260725-E2E-026 | P1 | Customer, Host | Customer creates duplicate waitlist entry with same phone/name; host handles duplicate. | Public waitlist and Queue. | Duplicate is blocked, highlighted, or easy to archive. |
| SKR-20260725-E2E-027 | P1 | Host | Large party joins queue; host tries assigning too-small table, then corrects to larger/combined table if supported. | Queue, Tables assignment. | Capacity warning is clear. |
| SKR-20260725-E2E-028 | P1 | Host | Several stale QA queue entries exist; host archives/cleans them and confirms queue view stays readable. | Queue search/filter/archive. | Cleanup is fast and auditable. |
| SKR-20260725-E2E-029 | P2 | Host | Host converts a waiting guest into future reservation instead of immediate seating. | Queue and Reservations. | Guest record does not duplicate incorrectly. |
| SKR-20260725-E2E-030 | P2 | Host, Customer | Customer abandons waitlist; host marks cancelled/no-show, then confirms it appears in history/archive only. | Queue and history/archive. | Active queue stays clean. |

### E. POS cashier, payment, and close-table flows

| ID | Priority | Roles | End-to-end workflow | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-20260725-E2E-031 | P0 | Cashier | Cashier selects idle table in POS, adds menu items, checks out through terminal-style payment, then closes table. | POS and Tables/Orders after close. | POS table-first workflow is intuitive and table resets cleanly. |
| SKR-20260725-E2E-032 | P0 | Cashier | Cashier adds order to active table with existing QR orders, reviews combined bill, then completes payment. | POS, Orders, Tables. | POS add-on does not create wrong session or hide earlier orders. |
| SKR-20260725-E2E-033 | P0 | Cashier, Customer | Customer uses QR checkout with HitPay sandbox, completes payment, returns to Sakorio, staff verifies paid state and closes table. | QR, HitPay sandbox, POS/Orders/Tables. | Payment-completed state is truthful and close is allowed. |
| SKR-20260725-E2E-034 | P0 | Cashier, Customer | Customer starts HitPay but cancels/abandons before completion, then staff checks table state. | HitPay return/cancel behavior; POS. | Payment request exists but bill remains unpaid/open. |
| SKR-20260725-E2E-035 | P0 | Cashier | Cashier attempts close table with unpaid bill, then pays correctly and closes. | POS close button/confirmation. | Unpaid close is blocked; final confirmation is unmistakable. |
| SKR-20260725-E2E-036 | P1 | Cashier | Cashier switches between three active tables while carts/orders are open, then returns to original table. | POS and Tables. | No cart/table mix-up; clear active table label. |
| SKR-20260725-E2E-037 | P1 | Cashier | Cashier searches imported menu item by name, category, and scroll; adds exact item; verifies price. | POS menu picker and cart. | Large menu is fast and legible on desktop/iPad. |
| SKR-20260725-E2E-038 | P1 | Manager, Cashier | Manager voids/corrects a wrong item before payment, then cashier completes bill. | POS/Orders detail, permission boundary if available. | Correction is authorized and reflected in totals. |
| SKR-20260725-E2E-039 | P1 | Manager | Manager reopens a recently closed table/bill if supported, reviews history, then re-closes or records unsupported behavior. | Tables History, Orders History, POS. | Reopen/refund rules are clear and safe. |
| SKR-20260725-E2E-040 | P2 | Cashier | Cashier views payment lanes on tablet viewport while table is selected and while no table is selected. | iPad viewport POS. | Payment panel remains fixed/right-side enough and does not overlap. |

### F. Kitchen, beverage, and service operations

| ID | Priority | Roles | End-to-end workflow | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-20260725-E2E-041 | P0 | Customer, Kitchen, Beverage, Waiter | Customer orders mixed food and drink; kitchen/beverage lanes receive appropriate tickets; waiter marks served. | QR/POS order, Kitchen, beverage lane if available, Orders. | Routing is clear; tickets are readable. |
| SKR-20260725-E2E-042 | P1 | Kitchen | Kitchen processes order through new/accepted/ready/served states, with refresh after each state. | Kitchen page and Orders/Tables. | Status persists and served action gives clear feedback/toast. |
| SKR-20260725-E2E-043 | P1 | Kitchen, Waiter | Two tables submit orders close together; kitchen sorts/reads both, serves one, leaves other active. | Kitchen backlog and table labels. | No confusion between tables or tickets. |
| SKR-20260725-E2E-044 | P1 | Beverage | Beverage-only QR order is submitted, processed, and reflected in staff order view. | QR, Kitchen/beverage view, Orders. | Beverage tickets do not create kitchen noise if lanes are separate. |
| SKR-20260725-E2E-045 | P1 | Kitchen | Long order with multiple menu items and notes is viewed on kitchen tablet width. | Kitchen tablet viewport. | Ticket card does not overflow; item grouping is scannable. |
| SKR-20260725-E2E-046 | P2 | Kitchen, Cashier | Kitchen serves order, cashier immediately opens bill and pays/closes. | Kitchen to POS handoff. | Served state does not block billing or create stale QR page. |

### G. Staff backend, timetable, permissions, and reporting

| ID | Priority | Roles | End-to-end workflow | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-20260725-E2E-047 | P1 | Manager, Staff | Manager creates/uses QA staff profile, staff selects profile, clocks in, clocks out, manager reviews shift record. | Users, Shifts/Timetable, clock-in/out surfaces. | Staff shift lifecycle is understandable. |
| SKR-20260725-E2E-048 | P1 | Manager | Manager creates a timetable shift by drag/drop or fastest available UI, edits it, records leave/MC if supported, then verifies totals. | Timetable. | Scheduling feels calendar-like and data is saved. |
| SKR-20260725-E2E-049 | P1 | Manager, Waiter | Waiter role logs in and attempts POS/Tables/Kitchen/Users/Reports. | Role-specific staff login. | Allowed areas work; restricted areas are blocked cleanly. |
| SKR-20260725-E2E-050 | P0 | Manager, Cashier | Complete one paid table, then manager opens Orders/Reports/history to verify sales, payment method, table, items, and close time. | Orders current/history, Reports if available, Tables history. | End-of-day records match the live transaction and no open QA data remains. |

## Minimum evidence to capture per scenario

- Browser URL and role used.
- Table number, order ID, reservation ID, queue ID, or payment reference where applicable.
- Screenshot or written observation for any score below 10.
- Whether test data was cleaned up.
- Final table/session state after the scenario.

## Cleanup checklist after execution

- All QA reservations are seated/finished/cancelled as appropriate.
- All QA queue entries are archived/cancelled/seated.
- All QA tables are paid/closed/reset.
- All kitchen/beverage QA tickets are served or clearly cleaned up.
- No unpaid test bills remain unless deliberately preserved and documented.
- Any temporary QA staff profiles are removed, disabled, or clearly labelled.
- HitPay sandbox references are recorded without exposing secrets.

## Launch gate

Sakorio should not be considered 100% launch-ready until:

- Every P0 scenario scores 10/10.
- Every P1 scenario scores at least 9/10.
- No scenario has unresolved session/privacy/payment/table-state defects.
- Staff auth and POS route stability pass repeated refresh/multi-tab checks.
- iPad/tablet flows for POS, Tables, Kitchen, Reservations, and QR ordering score at least 9/10.
- The final results document lists all cleanup completed.

## Suggested execution result document

Create the execution results as:

`docs/0112-sakorio-end-to-end-qa-50-scenario-results-2026-07-25.md`

The result document should copy each scenario ID from this brief, fill in the browser result template, and include an improvement backlog grouped by P0/P1/P2 at the end.
