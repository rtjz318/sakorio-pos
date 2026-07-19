# Sakorio POS round 2 browser QA brief - 50 use cases

Date: 2026-07-19  
Run ID format: `SKR-QA-20260719-R2-{case-id}`  
Execution surface: deployed Sakorio domains only  
Primary goal: run another end-to-end browser QA round after the 2026-07-18 rectification batch, score whether the user experience improved, and expose remaining launch risks.

## Purpose

This brief is the test script for the next live browser QA cycle. It deliberately uses restaurant-style end-to-end journeys rather than isolated button tests. Each use case should be operated in the browser and then recorded in a separate results document with evidence, scores, blockers, cleanup, and recommended fixes.

## Domains and roles

- Staff / cashier / host / manager: `https://staff.sakorio.com`
- Customer QR ordering: `https://order.sakorio.com`
- Payment: HitPay sandbox only
- Render dashboard: deploy/status observation only when needed

Roles to simulate:

- Customer scanning a table QR
- Customer making public reservation / queue entry
- Waiter selecting tables and adding orders
- Cashier collecting payment and closing bills
- Host assigning reservations, queues, and tables
- Kitchen and beverage operator processing tickets
- Manager reviewing history, corrections, users, timetable, reports, and settings
- Staff member using timetable / shifts / clock in / clock out

## Browser QA result template

For every case, record:

- Case ID
- Run ID
- Role/session used
- Preconditions
- Test data used
- Steps actually performed
- Expected result
- Actual result
- Evidence observed in UI
- Related table / reservation / queue / order / payment IDs
- Status: `PASS`, `FAIL`, `BLOCKED`, `NEEDS SPECIFICATION`
- UI/UX score: 1-10
- Workflow smoothness score: 1-10
- Data correctness: `Pass`, `Partial`, `Fail`, `Not verified`
- Launch blocker: `Yes`, `No`, `Watch`
- Cleanup result
- Improvement recommendation

## Scoring guide

- `9-10`: launch-grade, natural flow, no confusing extra steps, state is clear.
- `7-8`: usable, but some copy/layout/process polish remains.
- `5-6`: works only with care; staff could make mistakes during service.
- `3-4`: workflow is fragile, confusing, or risky.
- `1-2`: broken, unsafe, or data integrity risk.

## Round 2 invariants

These must be checked repeatedly:

1. Payment requested does not mean payment completed.
2. Active/current table orders remain current until the table is closed.
3. Previous-session table orders appear under History only.
4. QR customers only see their current table session.
5. Staff cannot clear a table with unpaid bills.
6. Reservation / queue / table / order / kitchen state agrees across modules.
7. Kitchen and beverage tickets are readable and do not hide live work under old backlog.
8. iPad/tablet layout must expose all required navigation and actions.
9. Staff logout must end the visible browser session and protected pages must return to login.
10. No cash payment option should appear on customer QR checkout.

## Use cases

| Case ID | Area | Scenario | Browser steps to execute | Expected result | Key score focus |
| --- | --- | --- | --- | --- | --- |
| E2E-101 | Reservation → Table → QR → Kitchen → Pay | Customer reserves online, arrives, host seats reservation, customer orders by QR, kitchen receives ticket, cashier settles, table closes. | Create public reservation; staff assigns table; seat reservation; open QR; place customer order; verify kitchen; pay by terminal or sandbox-safe method; close table; finish reservation. | Reservation becomes seated then finished; table opens then clears; QR session does not leak history; kitchen receives only current order; bill is paid before close. | End-to-end flow, state agreement, QR privacy |
| E2E-102 | Reservation pre-assignment | Host assigns table before arrival, then seats guest later. | Create staff reservation for later today; assign table but do not seat; verify table remains not active for QR; seat when ready; verify QR opens. | Planning assignment does not prematurely open QR ordering; seating activates table session. | Host workflow clarity |
| E2E-103 | Reservation cancellation cleanup | Host cancels a booked reservation from the reservation list. | Create synthetic reservation; locate card; click visible Cancel; confirm; refresh reservations and tables. | Reservation status becomes Cancelled; table capacity is released; action buttons are clickable without hidden dropdowns. | Operability, cleanup |
| E2E-104 | Reservation no-show | Guest does not arrive, host marks no-show. | Create reservation; use visible No-show action; confirm; verify reservation and table state. | Status becomes No-show; no active table/order is created. | Host exception handling |
| E2E-105 | Oversized reservation | Host attempts party size above configured limit. | Open New reservation; set party size above allowed limit; choose date/time if available; observe warnings. | Clear warning explains party-size/capacity issue; save is blocked or fails with useful message. | Capacity guidance |
| E2E-106 | Reservation edit after creation | Host edits name, phone, party size, notes, and time. | Create synthetic booking; edit details; save; refresh; verify all edited fields. | No duplicate reservation; updated fields persist; capacity recalculates correctly. | Data correctness |
| E2E-107 | Reservation to queue fallback | Reservation guest arrives but no table is ready, host sends reservation to queue. | Create reservation; use Send to queue; open Queue; verify prefilled guest/phone/party; seat from queue later. | Queue entry links to reservation context and can be seated cleanly. | Host recovery path |
| E2E-108 | Reservation linked table conflict | Two reservations compete for the same table/time. | Create/identify first assigned reservation; try assigning overlapping second reservation to same table. | System blocks or warns about conflict; no silent double assignment. | Data integrity |
| E2E-109 | Reservation finish after table close | Staff finishes reservation only after bill/table close. | Seat reservation; create order; try finish before close; pay/clear table; finish reservation. | Premature finish is blocked or clearly warned; finish works after close. | Lifecycle correctness |
| E2E-110 | Public booking validation | Customer submits public reservation with invalid phone/email then corrected data. | Use public booking page; enter invalid phone/email; observe errors; correct; submit. | Validation explains expected format; successful booking produces retrievable record/token. | Customer booking UX |
| E2E-111 | Queue walk-in full path | Walk-in joins queue, host seats guest, QR ordering starts, cashier closes table. | Create public/staff queue entry; host seats to table; customer QR order; kitchen verifies; cashier settles and clears. | Queue moves to seated/completed; table session and order are current; no stale queue entry remains active. | Queue-to-table lifecycle |
| E2E-112 | Queue party sorting | Host manages several queue entries with different party sizes. | Create or inspect multiple queue entries; apply filters/sort; seat best matching party. | Queue clearly shows party count and wait time; host can pick suitable table quickly. | Host speed |
| E2E-113 | Queue cancel/no-show | Queue guest leaves before seating. | Create queue entry; cancel/no-show/complete it through visible action; refresh. | Entry leaves active queue and appears only in history/completed status. | Exception handling |
| E2E-114 | Queue table mismatch | Host attempts to seat party into table with insufficient seats. | Create queue party larger than chosen table; attempt seat. | System blocks with clear reason; table remains unchanged. | Capacity safety |
| E2E-115 | Queue duplicate prevention | Same phone/name attempts duplicate queue entry. | Submit queue entry twice with same details; inspect staff queue. | System prevents duplicate or makes duplicate state obvious. | Data cleanliness |
| E2E-116 | Table walk-in order | Waiter selects an empty table, adds items, sends order, kitchen receives ticket. | Staff POS/Tables: select available table; add food/drink; submit; open Kitchen/Beverage. | Table becomes active; order appears current; kitchen/beverage tickets route correctly. | Core service flow |
| E2E-117 | Table add-on same session | Same table orders more items after first order. | Use active table; add second round; verify Orders tab and table Current orders. | First and second orders remain current until table is closed; none moves to History early. | Current-session correctness |
| E2E-118 | Table close unpaid block | Staff tries to clear table while bill remains unpaid. | Create/identify unpaid table bill; attempt Clear table. | Clear is blocked; UI says payment is required; table remains active. | Payment safety |
| E2E-119 | Table close paid success | Staff pays bill and clears table. | Open unpaid/current table; settle by terminal; clear table; reopen table history. | Table becomes available; current orders clear; previous session appears under History. | Table lifecycle |
| E2E-120 | Table history separation | Staff opens table Orders and History after several sessions. | Use table with prior orders; inspect Current orders vs History. | Current tab only shows active session; History shows previous sessions. | Information architecture |
| E2E-121 | Table QR after close | Customer reloads QR after staff closes table. | Use QR URL for a cleared table; reload after table close. | Shows Table Closed and no previous customer bill/history. | Privacy |
| E2E-122 | Joined/combined tables | Host joins or manages combined tables for a larger party, then orders/pay/close. | Use Tables workflow to join/assign if available; create order; pay; close group. | Combined capacity/state is coherent; closing releases all involved tables. | Multi-table correctness |
| E2E-123 | Table move active bill | Staff moves an active party/order to another table if supported. | Start order on one table; use move/change table flow; verify Orders/POS/Kitchen. | Order follows the new table; old table frees only when appropriate; no duplicate bill. | Recovery path |
| E2E-124 | Table search/filter at service speed | Waiter finds table quickly on iPad width. | Set tablet viewport; open POS/Tables; locate T01/T09/T10 without long scroll. | Tables are easy to choose; no hidden controls; navigation remains available. | iPad UX |
| E2E-125 | POS unpaid recovery from Orders | Orders tab shows unpaid bill, cashier clicks Collect payment into POS. | Open Orders; choose unpaid order; Collect payment; verify POS drawer. | POS agrees it is unpaid/payable; no false paid state; Clear table not offered. | Payment truth |
| E2E-126 | POS menu density | Waiter orders from 20-30 item menu on iPad. | Open POS table drawer; search/filter categories; add multiple items; checkout. | Menu fits screen reasonably; search/category makes item selection fast; cart remains visible. | iPad usability |
| E2E-127 | POS cart switch-table protection | Waiter starts cart then attempts to switch table. | Select table; add item but do not submit; click another table/back. | System warns or preserves cart safely; no accidental wrong-table order. | Error prevention |
| E2E-128 | POS checkout with live bill + new cart | Cashier has existing live bill and adds new items before payment. | Open active bill; add items; checkout together. | Total combines existing bill and new cart correctly; item count and amount due are clear. | Billing correctness |
| E2E-129 | POS terminal settlement | Cashier settles unpaid bill by terminal. | Open unpaid bill; choose/confirm terminal; verify Orders/Paid Today/Table. | Paid timestamp/status updates; table becomes clearable; amount is correct. | Settlement workflow |
| E2E-130 | POS HitPay policy | Verify whether staff POS exposes HitPay consistently with intended product policy. | Open staff POS checkout on unpaid bill and compare to customer QR Pay Now. | Either HitPay is available to staff, or staff UI clearly explains terminal/cash-only policy. | Product specification |
| E2E-131 | POS quick item/manual item | Cashier adds a temporary/manual item if supported. | Use quick item/manual product flow; add price; checkout; verify order detail. | Manual item appears correctly and totals/taxes calculate correctly. | Cashier flexibility |
| E2E-132 | POS void/remove before send | Waiter removes mistaken cart item before submitting. | Add several items; remove/decrease one; submit remaining order. | Removed item is not sent to kitchen and not billed. | Mistake recovery |
| E2E-133 | POS item customization | Customer/waiter orders item with options/notes. | Select customizable item; answer required questions; submit; inspect kitchen ticket and order. | Customizations show clearly on ticket/order; required answers enforced. | Kitchen clarity |
| E2E-134 | POS large bill readability | Table has many line items and add-ons. | Build or find larger bill; inspect cart, checkout, order detail. | Lines remain readable; totals sticky/visible; no excessive confusion. | Layout under load |
| E2E-135 | Orders broad table overview | Manager uses Orders to understand current restaurant state. | Open Orders; filter active/current; inspect table grouping and unpaid/paid state. | Orders overview is table-based enough to find action quickly; one table does not dominate page. | Operational overview |
| E2E-136 | Orders history vs current | Staff verifies old orders do not appear in current operational queue. | Use Orders filters/history; inspect a recently closed table. | Previous sessions are findable in history, not mixed into current action queue. | Information architecture |
| E2E-137 | Orders collect payment from old unpaid | Old unpaid/closed order is paid without creating new session confusion. | Locate old unpaid order; collect payment; verify table and Orders. | Payment can be completed; table does not become falsely active unless intended. | Recovery billing |
| E2E-138 | Orders cancellation/void permission | Manager voids/cancels an order; waiter cannot if permission-limited credentials exist. | Use manager flow; if waiter credentials available, verify restriction. | Permission model is clear; audit/state updates correctly. | Controls and audit |
| E2E-139 | Customer QR first order | Customer scans active table QR, enters name, orders items. | Activate table; open QR with valid access; enter name; add food/drink; submit. | Order submitted once; current bill visible; no cash option on payment. | Customer self-order |
| E2E-140 | Customer QR reload same session | Customer reloads page after ordering. | Submit QR order; reload; inspect customer name/current bill. | Current session persists without showing other sessions; no unnecessary re-prompt if identity exists. | Session continuity |
| E2E-141 | Customer QR payment recovery | Customer requests terminal payment or abandons HitPay, then staff settles. | From QR bill, request card-at-table or start/abandon HitPay sandbox; staff opens POS/Orders and settles by terminal. | Bill remains unpaid until staff settlement; no false paid state; retry is clear. | Payment truth |
| E2E-142 | Kitchen live ticket routing | Food and beverage items route to the right displays. | Create mixed food/drink order; open Kitchen/Beverage filters. | Food appears in kitchen lane; beverages in beverage lane; ticket text is readable. | Production routing |
| E2E-143 | Kitchen stale backlog guard | Manager reviews stale backlog with many tickets. | Open Kitchen; Review backlog; observe bulk action state and guidance. | Above 25 visible tickets, bulk complete is locked and guidance says to narrow filters. | Operational safety |
| E2E-144 | Timetable schedule creation | Manager creates timetable shift and staff sees it. | Open Timetable; create shift for employee; staff/manager checks schedule. | Shift is visible, editable, and linked to the correct employee/date/time. | Staff planning |
| E2E-145 | Shift clock in/out | Staff selects own profile and clocks in/out. | Open My Shift/clock page; select staff profile; attempt clock-in/out with available hardware permissions. | Staff can identify profile; hardware blockers are clearly explained; time records are correct if completed. | Staff backend |
| E2E-146 | User creation role permissions | Manager creates waiter/cashier user and checks accessible tabs. | Create synthetic user if safe; assign role; login if credentials are safe; inspect nav/actions. | Role sees only appropriate modules/actions. | Permissions |
| E2E-147 | Settings payment visibility | Manager verifies HitPay sandbox settings and customer/staff payment options. | Open Settings payment area; inspect mode/config visibility; compare QR/POS options. | Sandbox mode is clear; no secret exposed; customer cash option remains absent. | Payment configuration |
| E2E-148 | Reports end-day review | Manager checks paid today, unpaid, table turnover, and sales. | Create/pay a small test bill; open Reports/Dashboard; verify totals. | Report totals match orders/payments; unpaid bills are visible as unpaid. | Financial reporting |
| E2E-149 | Staff logout/relogin | Staff logs out from collapsed iPad nav and protected route redirects. | Set iPad-like viewport; open hamburger; logout; navigate to `/users`; relogin. | Logout goes to login; protected pages require auth; hamburger exposes nav/logout. | Session security |
| E2E-150 | Browser refresh resilience | Refresh key operational pages mid-workflow. | Refresh POS drawer, Orders, Tables, Kitchen, QR during active sessions. | State reloads correctly; no duplicate orders; user can continue. | Real-world resilience |

## Suggested execution batches

To keep the next QA pass manageable, execute in batches:

1. Batch A: E2E-101 to E2E-115 — reservation and queue lifecycle.
2. Batch B: E2E-116 to E2E-130 — tables, POS, orders, payment truth.
3. Batch C: E2E-131 to E2E-143 — POS edge cases, QR, HitPay sandbox, kitchen/beverage.
4. Batch D: E2E-144 to E2E-150 — timetable, users, settings, reports, resilience.

## Priority watch list from previous passes

During execution, pay extra attention to:

- POS unpaid bills must never look paid just because a payment method was requested.
- iPad/tablet layout must avoid hidden required actions.
- Reservation and queue action buttons must remain clickable after filtering, scrolling, and refresh.
- Kitchen backlog must stay separate from live service tickets.
- Customer QR history must stay session-scoped and must not reveal previous diners.
- Staff logout must work from collapsed navigation.
- Staff POS HitPay policy still needs final product decision if staff-side HitPay is expected.

## Results document to create after execution

Create a new result file after the browser run:

`docs/0081-sakorio-round-2-browser-qa-results-50-use-cases-2026-07-19.md`

The result file should include:

- Executive summary and overall launch score.
- 50-row result table.
- P0/P1/P2/P3 defect list.
- Improvement backlog.
- Before/after comparison against 2026-07-18 scores.
- Cleanup log for synthetic reservations, queues, orders, and users.
