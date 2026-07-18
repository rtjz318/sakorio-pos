# Sakorio POS exhaustive browser QA use-case brief

Date: 2026-07-18
Authoring purpose: create the full scenario brief before live browser execution.
Execution surface: Sakorio deployed domains only.

This brief is the operating script for an autonomous QA pass on Sakorio POS. It is intentionally broader than a normal smoke checklist. The goal is to behave like the restaurant roles that will actually use the system, complete real end-to-end workflows in the browser, verify state across modules, and document where the product is ready, unclear, risky, or too slow for service.

Do not treat this document as a proposal. During execution, each scenario must be operated through the browser and recorded in a result document.

## 1. Test configuration

Run ID format: `SKR-QA-20260718-EXH-{sequence}`

Primary domains:

- Staff: `https://staff.sakorio.com`
- Customer QR ordering: `https://order.sakorio.com`
- Render dashboard: only for deploy observation when already authorized

Environment type:

- Live deployed Sakorio staging/production-like environment
- Payment mode must remain sandbox/test only
- No real customer card data
- No real irreversible payment operations

Restaurant/location:

- Sakorio tenant currently available in staff account
- Time zone: Asia/Singapore unless the system displays otherwise
- Currency: SGD unless the system displays otherwise
- Tax, service charge, rounding: determine from visible system totals during testing

Primary roles to simulate:

- Customer using table QR ordering
- Customer using public booking or waitlist pages
- Cashier taking, editing, and settling orders
- Waiter managing tables, adding items, checking order state, and closing tables
- Host managing reservations, queue, seating, and table availability
- Kitchen user receiving and progressing food tickets
- Beverage user receiving and progressing drink tickets
- Manager performing corrections, overrides, reports, users, shifts, and end-day review
- Staff member using timetable, shift, clock-in, and clock-out
- Back office user checking inventory, settings, payment configuration, and reports

Known limitations:

- Physical printer verification is future work unless hardware or print queue access is available.
- Real payments are forbidden. HitPay must be sandbox only.
- Do not expose passwords, tokens, raw secrets, or real personal data in reports.
- If an operation would trigger real payment, irreversible deletion, or customer communication, mark it blocked or use a synthetic QA record.

Synthetic data convention:

- Names: `SKR QA {Role} {6-digit number}`
- Phone: use clearly synthetic test numbers already accepted by the app.
- Email: use an approved non-example test inbox or leave blank if optional.
- Notes: prefix with `SKR-QA` and include the scenario ID.
- Preserve serious defect data until documented. Clean up safe test records at the end.

## 2. Non-negotiable operating rules

1. Test only the authorized Sakorio environment.
2. Use browser-only QA for product workflows.
3. Never initiate a real financial transaction.
4. Use only sandbox payment paths.
5. Never enter real customer card information.
6. Do not change global tax, payment, printer, menu, or tenant settings unless explicitly required and safe.
7. Do not load test, denial-of-service test, scrape, or attack the system.
8. Do not access unrelated customer information beyond what appears in the authorized test tenant.
9. Do not claim success after clicking a button only. Confirm resulting state in the relevant module.
10. If the intended behavior is unclear, mark `NEEDS SPECIFICATION`, not automatically `FAIL`.
11. Record exact table, order, reservation, queue, bill, and user identifiers.
12. Continue with unrelated safe scenarios after a failure, but stop the specific risky path.

## 3. Evidence rules

For every scenario, record:

- Test ID
- Run ID
- Browser role/session used
- Preconditions
- Test data
- Steps actually performed
- Expected result
- Actual result
- Evidence observed in UI
- Related record IDs
- Status: `PASS`, `FAIL`, `BLOCKED`, or `NEEDS SPECIFICATION`
- UI/UX score from 1 to 10
- Workflow smoothness score from 1 to 10
- Data correctness: `Pass`, `Partial`, `Fail`, or `Not verified`
- Launch blocker: `Yes`, `No`, or `Watch`
- Cleanup result
- Notes and recommended improvement

Capture screenshots for:

- Payment state issues
- Incorrect totals
- Wrong table/order mapping
- Customer data leakage
- Duplicate orders, tickets, or payments
- Permission leaks
- Layout overlap, clipped controls, or excessive scrolling
- Any P0/P1 defect

## 4. Data-integrity invariants

These must be checked continuously:

1. One submit action creates one reservation, queue entry, order, kitchen ticket set, payment request, or customer record.
2. Reservation, queue, table, order, kitchen, bill, and payment states agree across screens.
3. Same-session orders remain current until the table is closed.
4. Previous-session orders appear only in History, not current QR or active table orders.
5. Public QR customers see only their own current table session.
6. Active tables cannot be cleared while unpaid bills remain.
7. Payment request/pending state must not equal paid state.
8. Paid state must require confirmed paid status or paid timestamp.
9. Failed or abandoned payment must leave the bill recoverable.
10. Kitchen and beverage items route to the correct station exactly once.
11. Voided or removed items must not remain chargeable.
12. Kitchen cancellation/void signal should exist when supported.
13. Totals must match line items, modifiers, discounts, tax, service charge, rounding, paid amount, and balance.
14. Closed bills cannot be edited without the proper authorization and audit trail.
15. Reopened, voided, refunded, discounted, or corrected bills keep audit history.
16. Role permissions prevent unauthorized manager actions.
17. Refresh, double-click, retry, and stale tab behavior must not duplicate transactions.
18. Table occupancy reflects real service state.
19. No order, payment, reservation, queue entry, or kitchen ticket becomes orphaned.
20. Receipt or displayed bill must match the stored final bill.

## 5. Status and severity model

Scenario status:

- `PASS`: expected behavior was visibly confirmed.
- `FAIL`: behavior violates a requirement, visible rule, financial correctness, privacy, or data integrity.
- `BLOCKED`: missing access, hardware, safe payment path, or prior defect prevents completion.
- `NEEDS SPECIFICATION`: behavior is consistent but intended product rule is unclear.

Defect severity:

- `P0 Blocker`: financial corruption, duplicate charge, serious data loss, privacy leak, unauthorized financial action, or unusable core system.
- `P1 Critical`: ordering, kitchen, billing, payment, or table workflow blocked or materially wrong.
- `P2 Major`: important feature incorrect but workaround exists.
- `P3 Minor`: limited display, validation, wording, or non-critical inconsistency.
- `P4 Improvement`: feature works, but usability, clarity, speed, or error prevention can improve.

## 6. Browser session layout

Use separate tabs or sessions where possible:

- Staff manager tab: dashboard, users, timetable, reports, settings
- Staff cashier tab: POS, orders, payments
- Staff host tab: reservations, queue, tables
- Kitchen tab: kitchen and beverages display
- Customer tab 1: QR menu
- Customer tab 2: same QR or reservation management token for concurrency checks

If separate sessions are not available, execute sequentially and record the limitation.

## 7. Baseline workflow to run first

Baseline A - reservation to QR service:

1. Create a same-day public reservation with synthetic data.
2. Confirm reservation appears in staff Reservations.
3. Assign a suitable table.
4. Seat the reservation.
5. Open/copy the table QR link.
6. Customer orders one food and one beverage item.
7. Kitchen and beverage stations receive correct tickets.
8. Customer adds a second round to the same table.
9. Staff sees both rounds under the same active table session.
10. Cashier settles using sandbox terminal/HitPay flow.
11. Table becomes ready to clear.
12. Close table.
13. Reservation becomes completed/finished.
14. QR no longer exposes previous customer data.

Baseline B - walk-in queue to staff POS:

1. Create a walk-in queue entry.
2. Seat it at a suitable table.
3. Add items through POS.
4. Send to kitchen.
5. Add a second round.
6. Settle the bill.
7. Clear the table.
8. Confirm queue record no longer appears as waiting.

## 8. Exhaustive scenario bank

The core exhaustive run contains 80 scenarios. The first 40 focus on POS, tables, orders, queue, reservations, kitchen, and payment because these are launch-critical. The remaining 40 cover permissions, timetable, users, reports, inventory, recovery, and deeper edge behavior.

### Phase A - Reservation, queue, seating, and tables

| ID | Scenario | Roles | Main verification |
| --- | --- | --- | --- |
| E2E-001 | Public reservation -> staff assign table -> seat -> QR order -> kitchen -> payment -> close | Customer, host, waiter, cashier, kitchen | Full reservation lifecycle, current session, paid close |
| E2E-002 | Public reservation created, customer opens manage link, sends delay notice, staff sees it | Customer, host | Public token access and staff visibility |
| E2E-003 | Public reservation cancellation before table assignment | Customer, host | Cancelled reservation does not block table |
| E2E-004 | Reservation assigned to table, then cancelled | Customer, host | Assigned table becomes available again |
| E2E-005 | Reservation no-show after arrival window | Host, manager | No-show releases table and changes reports/counts |
| E2E-006 | Early-arrival reservation attempted before allowed seating window | Host | System explains early seating rule clearly |
| E2E-007 | Late-arrival reservation seated after scheduled time | Host, waiter | Late reservation can still be seated or correctly blocked |
| E2E-008 | Change reservation party size before seating | Host | Table recommendation/capacity updates |
| E2E-009 | Change assigned reservation table before seating | Host | Old table released, new table marked planned/reserved |
| E2E-010 | Attempt to assign reservation to occupied/unpaid table | Host | Risk warning or block prevents wrong seating |
| E2E-011 | Walk-in queue entry -> best fit table -> seat -> POS opens | Host, waiter | Queue handoff and table activation |
| E2E-012 | Queue entry cancelled before seating | Host | Queue count and table recommendations update |
| E2E-013 | Queue with no free table | Host | Seating blocked with useful explanation |
| E2E-014 | Queue party larger than available tables | Host | Capacity warning and alternative recommendations |
| E2E-015 | Linked reservation also appears in queue | Host | No duplicate active linked queue entries |
| E2E-016 | Seat linked reservation from queue | Host | Reservation and queue both transition consistently |
| E2E-017 | Host seats walk-in while another stale staff tab views table as free | Host, cashier | Conflict is prevented or refresh requested |
| E2E-018 | Table opened directly with no reservation or queue | Waiter | Table becomes active and QR can order |
| E2E-019 | Table transfer after seating | Waiter, cashier | Orders and table state move correctly |
| E2E-020 | Table close with unpaid bill attempted | Cashier, waiter | Close is blocked with visible reason |

### Phase B - Customer QR ordering

| ID | Scenario | Roles | Main verification |
| --- | --- | --- | --- |
| E2E-021 | Valid active QR opens menu, adds items, submits order | Customer | Order created once and appears staff-side |
| E2E-022 | QR scanned before table is opened | Customer, waiter | Friendly closed-table state, refresh works after opening |
| E2E-023 | Same QR opened on two customer tabs, both submit different rounds | Customer | No duplicate or lost orders; same table session |
| E2E-024 | Customer adds food and beverage in one cart | Customer, kitchen, beverage | Station routing correct |
| E2E-025 | Customer submits, refreshes immediately | Customer | No duplicate order, status remains visible |
| E2E-026 | Customer double-clicks Submit Order | Customer | One order only |
| E2E-027 | Customer abandons cart and returns later | Customer | Draft behavior understandable, no ghost order |
| E2E-028 | Customer adds special instructions with long text and punctuation | Customer, kitchen | Notes show correctly and do not break layout |
| E2E-029 | Customer uses Unicode/emoji in name or item note | Customer, kitchen | Text remains readable, no corrupted ticket |
| E2E-030 | Customer orders after bill requested but before paid | Customer, cashier | Behavior matches policy and is clearly messaged |
| E2E-031 | Customer tries QR after table closed | Customer | Previous session hidden, ordering blocked |
| E2E-032 | Customer payment options on QR bill | Customer | Cash not offered; only allowed HitPay/terminal paths |
| E2E-033 | Customer requests terminal/card-at-table payment | Customer, cashier | Staff sees unpaid bill/payment request correctly |
| E2E-034 | Customer starts HitPay sandbox then cancels/abandons | Customer, cashier | Bill remains unpaid and retryable |
| E2E-035 | Customer completes HitPay sandbox payment | Customer, cashier | Return state, paid status, clear table |
| E2E-036 | Customer cannot see previous people's order history | Customer | Privacy invariant |

### Phase C - Cashier POS, orders, and bill management

| ID | Scenario | Roles | Main verification |
| --- | --- | --- | --- |
| E2E-037 | POS floor first, select table, add items, send order, return to floor | Waiter | Table switching is fast and cart is isolated |
| E2E-038 | POS table selected on iPad landscape viewport | Waiter | No overlap, no excessive scroll, payment lane stable |
| E2E-039 | POS table selected on iPad portrait/narrow viewport | Waiter | Controls remain reachable and readable |
| E2E-040 | Large menu 30 item browse, search, category filter | Waiter | Dense enough for service rush |
| E2E-041 | Add wrong item then remove before submit | Waiter | Unsaved item removal clean |
| E2E-042 | Add wrong quantity then correct before submit | Waiter | Cart total correct |
| E2E-043 | Add item, submit, then add second round | Waiter, kitchen | Same session, new ticket/round visible |
| E2E-044 | Remove or void sent item | Cashier, manager, kitchen | Charge and kitchen state corrected with audit |
| E2E-045 | Add item notes from POS | Waiter, kitchen | Notes visible on ticket |
| E2E-046 | Order contains mixed kitchen/beverage items | Waiter, kitchen, beverage | Correct production routing |
| E2E-047 | Open Orders overview after new table order | Waiter | Newest order/table obvious, current only |
| E2E-048 | Add item from Orders or return to POS from Orders | Waiter | Context preserved |
| E2E-049 | Completed current-session order remains current until table close | Cashier | Not moved to History prematurely |
| E2E-050 | Table History shows previous sessions only | Waiter | Privacy and service clarity |
| E2E-051 | Begin checkout, return to edit bill | Cashier | No false paid state, edits safe |
| E2E-052 | Terminal payment request before completion | Cashier | Payment method pending is not paid |
| E2E-053 | Successful terminal/staff payment | Cashier | Paid state, table clear availability, reports |
| E2E-054 | HitPay successful sandbox payment | Cashier, customer | Return URL and status consistent |
| E2E-055 | HitPay failed/cancelled sandbox payment | Cashier, customer | Bill unpaid and retryable |
| E2E-056 | Attempt pay same bill twice | Cashier | Duplicate payment prevented |
| E2E-057 | Partial/mixed payment if supported | Cashier, manager | Remaining balance correct or unsupported clearly |
| E2E-058 | Discount or correction if supported | Manager | Authorization/audit trail |
| E2E-059 | Reopen paid/closed bill if supported | Manager | Permissions and audit |
| E2E-060 | End-of-day all unpaid/open bill check | Manager, cashier | No hidden unpaid orders |

### Phase D - Kitchen, beverages, receipts, and service progress

| ID | Scenario | Roles | Main verification |
| --- | --- | --- | --- |
| E2E-061 | Kitchen live board shows new food ticket at top/current shift | Kitchen | New order discoverability |
| E2E-062 | Beverage lane shows drinks only | Beverage | Drinks not mixed into food lane |
| E2E-063 | All lane shows combined ticket with clear station labels | Kitchen lead | No ambiguity |
| E2E-064 | Progress item pending -> preparing -> ready -> delivered | Kitchen, waiter, customer | Status sync across screens |
| E2E-065 | Customer QR sees item progress update | Customer | Guest status accuracy |
| E2E-066 | Old backlog hidden from live shift but reviewable | Kitchen lead | Service board not polluted |
| E2E-067 | Manager bulk cleanup/archive test backlog if available | Manager | Launch board can be cleaned |
| E2E-068 | Kitchen handles long notes and special instructions | Kitchen | Layout readable |
| E2E-069 | Void/cancel sent item displays kitchen cancellation if supported | Cashier, kitchen | Kitchen does not prepare removed item |
| E2E-070 | Receipt/print placeholder after payment | Cashier | Print moment visible; no false claim of physical print |

### Phase E - Users, permissions, timetable, shifts, reports, inventory

| ID | Scenario | Roles | Main verification |
| --- | --- | --- | --- |
| E2E-071 | Manager creates test staff user/profile safely | Manager | Role, profile, required fields |
| E2E-072 | Waiter role can access POS/Tables/Orders/Kitchen | Waiter | Service permissions |
| E2E-073 | Waiter role cannot access Settings/Users/Reports if restricted | Waiter | Admin boundary |
| E2E-074 | Manager creates timetable shift for staff | Manager | Shift appears in calendar and staff view |
| E2E-075 | Staff selects profile and clocks in | Staff | Attendance starts and is auditable |
| E2E-076 | Staff clocks out | Staff | Attendance closes and duration recorded |
| E2E-077 | Missed clock-out or open session visibility | Manager | Manager can detect open shifts |
| E2E-078 | Leave/MC entry if supported | Manager | Ledger, balance, roster conflict |
| E2E-079 | Timetable drag/drop or quick-add behavior | Manager | Scheduling is calendar-grade or gap recorded |
| E2E-080 | Reports dashboard summary after payments | Manager | Totals match paid orders |
| E2E-081 | Reports table/product/category navigation | Manager | Jump links and section content correct |
| E2E-082 | Daily close checklist | Manager | Active tables, unpaid bills, backlog, open shifts |
| E2E-083 | Inventory stock dashboard default route | Manager | Operational default view |
| E2E-084 | Low-stock -> supplier -> PO -> receiving if data exists | Manager, stock staff | Stock movement correctness |
| E2E-085 | Settings payment configuration visibility | Manager | HitPay/terminal config discoverable, no secrets exposed |
| E2E-086 | Menu item availability change affects QR/POS | Manager, customer, waiter | Sold-out items not silently accepted |
| E2E-087 | Logout and relogin clears role/session state | Staff, manager | No permission carryover |
| E2E-088 | Staff password/profile validation | Manager | Clear validation and no accidental user creation |
| E2E-089 | Reports export/download if available | Manager | File/action works or unsupported clear |
| E2E-090 | End-day report after table close | Manager | Closed tables and paid totals align |

### Phase F - Recovery, concurrency, and mistake behavior

| ID | Scenario | Roles | Main verification |
| --- | --- | --- | --- |
| E2E-091 | Refresh before saving reservation | Customer | No duplicate/incomplete reservation |
| E2E-092 | Refresh immediately after QR submit | Customer | No duplicate order |
| E2E-093 | Browser Back/Forward during POS checkout | Cashier | No false paid or lost bill |
| E2E-094 | Two customers submit same QR at same time | Customer x2 | Orders merge safely, no duplicate from one submit |
| E2E-095 | Customer submits while cashier edits table | Customer, cashier | Conflict handled without silent loss |
| E2E-096 | Cashier closes bill while customer attempts add-on | Cashier, customer | Add-on blocked or attached according to policy |
| E2E-097 | Host assigns table while cashier opens same table | Host, cashier | No double seating |
| E2E-098 | Kitchen marks ready while cashier voids item | Kitchen, cashier | Status and charge remain consistent |
| E2E-099 | Payment return opened twice or refreshed | Cashier, customer | One payment confirmation only |
| E2E-100 | Abandoned HitPay checkout, later terminal settlement | Cashier, customer | Open bill recoverable and final paid state correct |

## 9. Recommended execution order

Run in this order to produce reusable data and reduce cleanup risk:

1. E2E-071 to E2E-076: staff/timetable baseline
2. E2E-001 and E2E-002: reservation happy path
3. E2E-011 and E2E-018: queue/walk-in/direct table baselines
4. E2E-021 to E2E-036: customer QR privacy and payment request behavior
5. E2E-037 to E2E-060: POS/order/payment lifecycle
6. E2E-061 to E2E-070: kitchen/beverage/service/receipt checks
7. E2E-003 to E2E-020: reservation/queue edge cases
8. E2E-077 to E2E-090: reports, inventory, settings, end-day
9. E2E-091 to E2E-100: recovery and concurrency checks

Stop immediately for the specific path if a P0/P1 financial, privacy, duplicate, or data-loss issue appears. Continue unrelated safe scenarios.

## 10. Result record template

Use this exact shape in the execution result document:

```text
Test ID:
Run ID:
Module:
Scenario:
Roles involved:
Preconditions:
Test data:
Steps performed:
Expected result:
Actual result:
Status:
UI/UX score:
Workflow smoothness score:
Operational readiness score:
Data correctness:
Launch blocker:
Evidence:
Related record IDs:
Cleanup result:
Notes:
Improvement:
```

## 11. Bug report template

```text
Bug ID:
Title:
Severity:
Priority:
Module:
Environment:
Run ID and Test ID:
Roles involved:
Preconditions:
Exact reproduction steps:
Expected result:
Actual result:
Frequency:
Data impact:
Financial impact:
Permission or privacy impact:
Evidence:
Related record IDs:
Workaround:
Technical hypothesis, if evidence supports one:
Recommended acceptance criteria:
Suggested regression tests:
```

Bug titles must be specific and searchable, for example:

- `QR customer sees previous table session guest name after table reopen`
- `POS marks terminal-requested bill as paid before payment confirmation`
- `Reservation seated from table activation remains Booked`

## 12. Improvement report template

```text
Improvement ID:
Module:
Current behavior:
User friction or risk:
Recommended behavior:
Affected roles:
Business value:
Suggested acceptance criteria:
Priority:
```

Focus improvements on:

- Faster table switching
- Fewer hidden service actions
- Better iPad fit
- Clearer order/session state
- Payment safety
- Kitchen readability
- Host stand speed
- Customer privacy
- Manager close confidence
- Staff scheduling clarity

## 13. Progress checkpoints

After every 10 executed scenarios, record:

- Scenarios completed
- Passed
- Failed
- Blocked
- Needs specification
- New P0/P1 defects
- Data-integrity observations
- Cleanup state
- Next module

Do not stop to ask what to test next unless continuing requires a real payment, irreversible production action, unavailable credentials, or unauthorized access.

## 14. Final report requirements

The final browser QA report must include:

1. Executive summary
2. Environment, build, date, browser, viewport, and limitations
3. Coverage summary by module
4. Complete scenario results
5. Defects sorted by severity
6. Product questions needing specification
7. Improvement backlog sorted by value and effort
8. Payment and total-calculation findings
9. Data-integrity findings
10. Concurrency and recovery findings
11. Kitchen, beverage, and receipt findings
12. Permissions and audit-trail findings
13. Timetable and staff operations findings
14. Cleanup status and preserved test data
15. Recommended regression suite
16. Release recommendation: `Ready`, `Ready with known minor issues`, `Not ready`, or `Testing incomplete`

## 15. Release gate

Sakorio POS should not be considered launch-ready from this exhaustive pass unless:

- No open P0 or P1 defect remains.
- Payment success, payment failure, and payment retry are verified in sandbox.
- Same-session orders remain current until table close.
- Customer QR never exposes previous session/customer information.
- Tables cannot be cleared while unpaid bills remain.
- Kitchen/beverage routing is correct and current shift board is not polluted by stale backlog.
- Staff can operate POS on iPad without layout overlap or excessive scrolling.
- Host can manage reservation, queue, and table assignment under service pressure.
- Manager can find unpaid bills, active tables, backlog, and open shifts at end day.
- Every score below 8 for core service workflows has either a committed fix or a conscious launch decision.

