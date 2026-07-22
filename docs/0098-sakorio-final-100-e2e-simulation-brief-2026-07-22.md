# Sakorio POS final launch QA brief - 100 end-to-end simulations

Date: 2026-07-22  
Run type: Final launch-readiness scenario design before browser execution  
Execution target: live Sakorio domains only  
Run prefix: `SKR-FINAL-20260722`  
Authoring purpose: create a serious senior-QA operating brief for review before running the 100 browser simulations

## 1. Executive purpose

This is not a smoke checklist. This is the final full-system restaurant simulation plan for Sakorio POS.

Every scenario below is an end-to-end business journey. A case must start from a real operational situation and end with a resolved operational state, such as:

- customer finished and table reset;
- queue guest seated, served, paid, and removed from active queue;
- reservation created, seated, completed, and not leaking old QR/session data;
- staff shift created, worked, clocked out, and visible to manager;
- manager correction attempted, audited, blocked, or safely completed;
- end-of-day board clean with no orphan bills, KDS tickets, queue rows, or QR sessions.

Do not mark a case as passed because one button clicked. The case passes only when the final state is visibly confirmed in the browser across the relevant modules.

## 2. Live execution surfaces

- Staff app: `https://staff.sakorio.com`
- Customer ordering: `https://order.sakorio.com/menu/{table_public_id}?qr_access={token}`
- Public booking: `https://order.sakorio.com/book/1`
- Public waitlist: `https://order.sakorio.com/waitlist/1`
- HitPay: sandbox only
- Render: deploy observation only when needed

Browser rule: all QA execution must happen through the live browser. Code inspection can support diagnosis, but a workflow cannot be passed from code alone.

## 3. Roles to simulate

- Customer using QR ordering
- Customer using public reservation
- Customer using public waitlist
- Host managing reservations, queues, seating, table availability, and walk-ins
- Waiter taking orders and managing table service
- Cashier managing POS, checkout, payments, bills, and close-table
- Kitchen user handling food tickets
- Beverage user handling drink tickets
- Manager handling corrections, reports, timetable, users, and end-day readiness
- Staff member handling shifts, profile selection, clock-in, clock-out
- Owner/launch auditor checking system readiness after service

## 4. Non-negotiable rules

1. Use synthetic QA data only.
2. Do not use real card details or real irreversible financial operations.
3. Use HitPay sandbox only.
4. Do not change production-like settings unless the case explicitly calls for safe observation only.
5. Do not delete real business data.
6. Do not expose passwords, secrets, tokens, or private customer data in the results.
7. Preserve defect evidence until documented.
8. Clean up all active test tables, queue rows, reservations, carts, and bills unless cleanup is blocked by the defect being documented.
9. A case with ambiguous product behavior is `NEEDS SPECIFICATION`, not automatically `PASS`.
10. Any P0/P1 finding must be reproduced once, documented, and then avoided in later cases unless needed for confirmation.

## 5. Scoring model

Each executed case receives:

| Area | Score | What it measures |
|---|---:|---|
| Functional correctness | /10 | Does the full business workflow complete correctly? |
| UI/UX clarity | /10 | Would real staff/customers know what to do under pressure? |
| Workflow speed | /10 | Are there excessive clicks, tab-hopping, hidden actions, or forced scrolling? |
| Layout and device stability | /10 | Any overlap, clipped controls, bad iPad behavior, stale panels, or broken containers? |
| Data/payment/session integrity | /10 | Are table, order, kitchen, reservation, queue, QR, and payment states consistent? |
| Launch readiness | /10 | Is this safe for real service? |

Final case score: weighted human judgement after the above areas. Core P0/P1 service flows must reach 9/10 or have a documented launch decision.

## 6. Result skeleton for execution

Use this exact shape when running each case:

```md
### SKR-FINAL-E2E-###

- Priority:
- Roles simulated:
- Starting state:
- Test data:
- Browser steps executed:
- Expected final state:
- Actual final state:
- Cross-module verification:
- Functional correctness:
- UI/UX clarity:
- Workflow speed:
- Layout/device stability:
- Data/payment/session integrity:
- Launch readiness:
- Final score:
- Status: PASS / FAIL / BLOCKED / NEEDS SPECIFICATION
- Evidence:
- Defects found:
- Improvements needed:
- Cleanup performed:
- Launch decision:
```

## 7. Severity model

- P0 Blocker: privacy leak, duplicate payment, wrong paid/unpaid state, table/session corruption, unusable core order/payment/close flow.
- P1 Critical: kitchen/order/payment/table/reservation/queue flow materially wrong but recoverable.
- P2 Major: important workflow friction or missing guardrail with workaround.
- P3 Minor: wording, layout, validation, or polish issue.
- P4 Improvement: launch-safe but can be smoother.

## 8. Core invariants to verify throughout

1. Customer QR must never show another customer/session history.
2. Same-table orders remain current until table close.
3. Closed table QR must not accept new orders on the old session.
4. Customer checkout must not show Cash.
5. Staff payment methods must be internally clear: cash/terminal/HitPay as configured.
6. Payment pending is not paid.
7. Payment success is visible in POS, Orders, Reports/history where applicable.
8. Double-click, refresh, back/forward, and payment callback repeat must not duplicate orders/payments.
9. Kitchen tickets appear once and route clearly.
10. Table availability must match active QR/session/bill state.
11. Reservations and queue entries must transition cleanly after seating/closing/no-show/cancel.
12. Stale queue/KDS/test data must not pollute live service views.
13. iPad/tablet POS must not have hidden/covered tap targets.
14. Manager-level bill corrections must be controlled, audited, or safely unavailable.
15. End-day state must be audit-friendly: no hidden open bills, unpaid tables, stale kitchen backlog, or open shifts.

## 9. Scenario catalog - 100 full end-to-end simulations

### Phase A - Core customer dining lifecycles

| ID | Priority | Roles | End-to-end simulation | Expected final state |
|---|---|---|---|---|
| SKR-FINAL-E2E-001 | P0 | Customer, host, waiter, kitchen, cashier | Customer reserves online for 2 -> host finds booking -> seats at suitable table -> waiter opens QR -> customer orders food + drink -> KDS processes both -> cashier terminal-pays -> cashier closes table. | Reservation finished, order paid, table available, QR closed, KDS clear. |
| SKR-FINAL-E2E-002 | P0 | Customer, host, kitchen, cashier | Customer reserves online -> host seats -> customer submits first QR round -> kitchen serves -> customer submits second QR round -> kitchen serves -> cashier verifies both rounds on one bill -> terminal payment -> close table. | Both rounds remain in current session until close; history updates only after close. |
| SKR-FINAL-E2E-003 | P0 | Customer, host, beverage, cashier | Customer reserves online -> seated -> QR beverage-only order -> beverage lane handles ticket -> customer pays at cashier -> table closes. | Beverage-only route is clean; table resets. |
| SKR-FINAL-E2E-004 | P0 | Customer, host, kitchen, beverage, cashier | Customer reserves -> seated -> QR mixed order food + beverage -> food and beverage progress at different times -> waiter/cashier reviews bill -> terminal payment -> close. | Mixed station status remains understandable and bill total is correct. |
| SKR-FINAL-E2E-005 | P0 | Customer, host, waiter | Customer reserves -> seated -> waiter opens QR -> customer browses but places no order -> customer leaves -> staff releases/closes empty table session. | No-order table returns available without dummy ticket or orphan reservation. |
| SKR-FINAL-E2E-006 | P0 | Customer, host, cashier | Reservation for 4 -> host attempts smaller table -> system warns/blocks -> host chooses correct table -> QR order -> payment -> close. | Capacity mismatch handled before service; final bill/session clean. |
| SKR-FINAL-E2E-007 | P0 | Customer, waiter, cashier | Direct walk-in sits without reservation/queue -> waiter starts table in POS -> adds items -> sends kitchen -> adds second staff round -> payment -> close. | Pure POS service flow is complete and smooth. |
| SKR-FINAL-E2E-008 | P0 | Customer, waiter, cashier | Direct table opened -> waiter opens QR -> customer orders first round -> waiter adds verbal add-on in staff POS -> cashier checks one combined bill -> terminal payment -> close. | POS and QR order entry coexist on one bill. |
| SKR-FINAL-E2E-009 | P0 | Customer, cashier | Customer QR order -> customer chooses card-at-table/terminal -> cashier finds table in POS -> settles terminal -> closes table -> customer QR reloads. | Customer sees no Cash; terminal settlement closes correctly. |
| SKR-FINAL-E2E-010 | P0 | Customer, cashier | Customer QR order -> customer starts HitPay sandbox -> completes success -> returns to Sakorio -> staff POS/Orders show paid -> cashier closes table. | HitPay success syncs and old QR session closes after table close. |

### Phase B - Reservation variants and host pressure

| ID | Priority | Roles | End-to-end simulation | Expected final state |
|---|---|---|---|---|
| SKR-FINAL-E2E-011 | P0 | Customer, host | Customer books online same-day -> staff searches reservation by name/phone -> highlights booking -> seats -> QR opens -> one order/payment/close. | Searchable reservation handoff works end to end. |
| SKR-FINAL-E2E-012 | P0 | Customer, host | Customer creates reservation -> host edits party size before seating -> table recommendation changes -> host seats correct table -> QR order/payment/close. | Edited reservation details carry into table service. |
| SKR-FINAL-E2E-013 | P1 | Customer, host | Customer creates reservation -> host changes table assignment before arrival -> seats at new table -> service/payment/close. | Old table is not held; new table owns session. |
| SKR-FINAL-E2E-014 | P1 | Customer, host | Customer creates reservation -> cancels/no-shows before seating -> later walk-in uses same table -> order/payment/close. | Cancelled/no-show reservation does not block table. |
| SKR-FINAL-E2E-015 | P1 | Host, customer | Reservation is seated -> customer requests table move before ordering -> host/waiter moves or releases/reseats -> QR order/payment/close. | Move/reseat behavior is clear and leaves no old QR leak. |
| SKR-FINAL-E2E-016 | P1 | Host, waiter, customer | Reservation is seated -> first order sent -> customer requests move -> staff moves table or safely blocks -> later order/payment/close. | Order, KDS labels, QR/session remain correct after move or block. |
| SKR-FINAL-E2E-017 | P1 | Host, customer | Two reservations arrive together -> host seats first -> seats second -> both QR order -> KDS processes -> cashier settles both -> closes both. | Parallel reservation seating does not mix tables/orders. |
| SKR-FINAL-E2E-018 | P1 | Host, customer | Reservation arrives early -> host seats if allowed or sees clear rule -> service/payment/close or reservation remains booked. | Early-arrival handling is understandable. |
| SKR-FINAL-E2E-019 | P1 | Host, customer | Reservation arrives late while queue exists -> host decides whether reservation or queue is seated first -> selected party orders/pays/closes. | Host has enough information to make service decision. |
| SKR-FINAL-E2E-020 | P1 | Customer, host | Public booking form invalid phone -> validation appears and focuses/points to phone -> corrected phone -> booking -> seat/order/pay/close. | Customer validation is clear and does not lose form context. |

### Phase C - Queue and walk-in lifecycles

| ID | Priority | Roles | End-to-end simulation | Expected final state |
|---|---|---|---|---|
| SKR-FINAL-E2E-021 | P0 | Customer, host, waiter, kitchen, cashier | Customer joins public waitlist -> host sees entry -> seats recommended table -> QR order -> KDS serves -> terminal payment -> close. | Public queue-to-table lifecycle works and queue entry clears. |
| SKR-FINAL-E2E-022 | P0 | Host, waiter, cashier | Host creates staff walk-in queue entry -> seats -> waiter takes POS order -> KDS serves -> terminal payment -> close. | Staff-created queue handoff works end to end. |
| SKR-FINAL-E2E-023 | P0 | Customer, host | Customer joins public waitlist -> page shows position -> customer leaves queue -> host board updates -> same customer joins again -> seats/order/pay/close. | Cancel/rejoin creates only one active queue row. |
| SKR-FINAL-E2E-024 | P0 | Host, customer | Queue party too large for available table -> host attempts seat -> warning/block -> host waits or chooses valid table -> later service/pay/close. | Capacity safety exists for queue. |
| SKR-FINAL-E2E-025 | P1 | Host | Duplicate queue entry same phone/name -> duplicate guard or warning -> host keeps one -> seats/order/pay/close. | Duplicate active queue entries prevented or clearly flagged. |
| SKR-FINAL-E2E-026 | P1 | Host, customer | Queue guest notified -> customer arrives -> host seats -> QR order/payment/close. | Notified -> seated transition updates counters and removes active waiting row. |
| SKR-FINAL-E2E-027 | P1 | Host, customer | Queue guest seated at table -> no order -> guest leaves -> staff releases empty table session. | Empty queue seating can be undone/closed safely. |
| SKR-FINAL-E2E-028 | P1 | Host | Queue stale panel before service -> stale rows hidden by default -> review stale -> archive/cancel safe QA row only -> dashboard counters remain clean. | Live board stays service-ready without deleting useful history. |
| SKR-FINAL-E2E-029 | P1 | Host, customer | Queue guest has preferred floor/seats -> host uses suggestions -> seats -> service/pay/close. | Preferences influence/appear in seating decision. |
| SKR-FINAL-E2E-030 | P1 | Host, customer | Queue guest converted to reservation instead of immediate seating -> reservation appears -> later seat/order/pay/close. | Queue-to-reservation preserves guest context. |

### Phase D - POS table service, orders, and close-table

| ID | Priority | Roles | End-to-end simulation | Expected final state |
|---|---|---|---|---|
| SKR-FINAL-E2E-031 | P0 | Waiter, cashier | Open POS with no table -> select available table -> add item -> send order -> return to table grid -> select another table -> no cart bleed. | Table-first POS remains intuitive and isolated. |
| SKR-FINAL-E2E-032 | P0 | Waiter, cashier | Select table -> add many items across categories -> correct quantity -> send -> KDS -> payment -> close. | Large cart remains readable and totals correct. |
| SKR-FINAL-E2E-033 | P0 | Waiter, cashier | Select table -> add item -> remove before sending -> add correct item -> send/pay/close. | Pre-submit correction is simple and accurate. |
| SKR-FINAL-E2E-034 | P0 | Waiter, cashier | Select table -> send first order -> use Add items -> add second staff round -> Send add-on round -> payment -> close. | Staff second-round ordering is obvious and stays same bill. |
| SKR-FINAL-E2E-035 | P0 | Waiter, cashier | Active table with live bill -> switch to Current orders -> return Add items -> add item -> payment -> close. | Mode switching does not hide actions or lose context. |
| SKR-FINAL-E2E-036 | P0 | Cashier | Paid table -> close from POS -> verify table available -> QR closed -> Orders history updated. | Paid close-table flow is one confident path. |
| SKR-FINAL-E2E-037 | P0 | Cashier | Unpaid active bill -> attempt close table -> system blocks/warns -> settle terminal -> close. | Unpaid close cannot silently clear table. |
| SKR-FINAL-E2E-038 | P0 | Cashier | Paid-but-not-closed table -> attempt new order -> system requires close/reset or makes new session rule explicit. | Next customer cannot inherit paid bill/session. |
| SKR-FINAL-E2E-039 | P1 | Cashier, orders | POS paid bill -> open Orders -> find current/paid-awaiting-close state -> close or return to POS -> table reset. | Orders action labels are operationally clear. |
| SKR-FINAL-E2E-040 | P1 | Cashier | Terminal payment button clicked twice rapidly -> table remains paid once -> close. | Duplicate payment is prevented. |
| SKR-FINAL-E2E-041 | P1 | Cashier | Begin checkout -> back to Add items -> add more -> pay final total -> close. | Checkout is reversible before payment. |
| SKR-FINAL-E2E-042 | P1 | Cashier | Select wrong table -> add item but catch before send -> clear cart -> select correct table -> order/pay/close. | Wrong-table recovery exists before commit. |
| SKR-FINAL-E2E-043 | P1 | Cashier, manager | Sent wrong item before kitchen starts -> attempt void/remove if supported -> correct order -> pay/close. | Pre-prep correction is safe or clearly unsupported. |
| SKR-FINAL-E2E-044 | P1 | Cashier, manager, kitchen | Sent wrong item after kitchen starts -> attempt correction -> manager/audit or safe block -> settle final bill -> close. | After-prep correction does not corrupt bill/KDS. |
| SKR-FINAL-E2E-045 | P1 | Cashier, manager | Paid bill correction/refund/reopen attempt -> path audited or safely unavailable -> history/report checked. | Manager correction policy is launch-safe. |

### Phase E - Customer QR safety and payment behavior

| ID | Priority | Roles | End-to-end simulation | Expected final state |
|---|---|---|---|---|
| SKR-FINAL-E2E-046 | P0 | Customer, cashier | Active QR -> customer adds item -> submits -> refresh immediately -> bill visible -> kitchen/pay/close. | Refresh after submit does not duplicate or lose order. |
| SKR-FINAL-E2E-047 | P0 | Customer, cashier | Customer double-taps Place order -> staff checks Orders/KDS/bill -> if duplicate prevented, pay/close; if not, document defect and cleanup. | Exactly one intended order/quantity or defect captured. |
| SKR-FINAL-E2E-048 | P0 | Customer, cashier | Same QR opened on two devices/tabs -> each submits different round -> staff sees one combined table bill -> pay/close. | Multi-device QR use is safe. |
| SKR-FINAL-E2E-049 | P0 | Customer, cashier | Customer starts HitPay -> returns/cancels -> staff sees unpaid -> customer retries or staff terminal-pays -> close. | Abandoned payment recoverable. |
| SKR-FINAL-E2E-050 | P0 | Customer, cashier | Customer opens old QR from closed table -> attempts order/pay/history -> page blocks safely. | No previous customer/session data leak. |
| SKR-FINAL-E2E-051 | P0 | Customer, cashier | Customer has QR cart unsent -> cashier closes table after existing paid bill -> customer tries submit cart. | Closed session blocks abandoned cart. |
| SKR-FINAL-E2E-052 | P1 | Customer, kitchen | Customer submits long note with punctuation, emoji, non-Latin text -> KDS serves -> cashier pays/closes. | Notes display safely without layout/script issue. |
| SKR-FINAL-E2E-053 | P1 | Customer, cashier | QR menu search/category -> add several items -> remove one -> submit -> kitchen/pay/close. | Customer menu/cart remains usable. |
| SKR-FINAL-E2E-054 | P1 | Customer, cashier | QR bill screen vs staff POS bill screen -> compare totals -> terminal/HitPay payment -> close. | Customer/staff totals match exactly. |
| SKR-FINAL-E2E-055 | P1 | Customer, cashier | Customer checkout screen payment policy -> verify HitPay/card-at-table only -> staff checkout verifies internal methods -> settle/close. | Customer never sees Cash. |

### Phase F - Kitchen, beverage, and service progress

| ID | Priority | Roles | End-to-end simulation | Expected final state |
|---|---|---|---|---|
| SKR-FINAL-E2E-056 | P0 | Kitchen, waiter, cashier | QR food order -> KDS pending -> start ticket -> ready -> served -> POS payment -> close. | KDS transitions persist and bill remains payable. |
| SKR-FINAL-E2E-057 | P0 | Beverage, cashier | QR beverage-only order -> beverage ticket -> served -> terminal payment -> close. | Beverage flow is not cluttered by food-only assumptions. |
| SKR-FINAL-E2E-058 | P0 | Kitchen, beverage, waiter | Mixed order -> beverage served first -> food served later -> waiter sees partial service -> payment/close. | Partial readiness is understandable. |
| SKR-FINAL-E2E-059 | P1 | Kitchen | Multiple active tickets from multiple tables -> sort/process oldest/urgent -> serve all -> cashier pays/closes each. | KDS remains readable under rush. |
| SKR-FINAL-E2E-060 | P1 | Kitchen, cashier | KDS ticket pending while cashier attempts payment -> observe allowed/blocked rule -> serve -> settle/close. | Payment-before-served policy is clear. |
| SKR-FINAL-E2E-061 | P1 | Kitchen, cashier | Kitchen refreshes during active ticket -> ticket remains correct -> transitions continue -> payment/close. | Refresh does not drop status. |
| SKR-FINAL-E2E-062 | P1 | Kitchen, cashier | Cashier void/correct item while kitchen has stale ticket view -> kitchen tries ready/serve -> final bill/KDS state checked. | Stale kitchen action cannot revive voided charge. |
| SKR-FINAL-E2E-063 | P1 | Kitchen lead | Old backlog/stale ticket view -> live board remains clean -> backlog review available -> no active test table polluted. | KDS is service-ready at shift start. |
| SKR-FINAL-E2E-064 | P1 | Cashier | Payment complete -> receipt/print affordance visible if supported -> no broken printer action -> close. | Printer future-scope does not confuse cashier. |
| SKR-FINAL-E2E-065 | P1 | Waiter, kitchen | Staff POS order with item note -> KDS note visible -> served -> payment/close. | POS notes survive to production and bill. |

### Phase G - Orders, history, reports, and reconciliation

| ID | Priority | Roles | End-to-end simulation | Expected final state |
|---|---|---|---|---|
| SKR-FINAL-E2E-066 | P0 | Cashier, manager | Create active table order -> open Orders current -> find table/order -> pay/close -> verify moves to History. | Current vs History separation correct. |
| SKR-FINAL-E2E-067 | P1 | Cashier | One table with old historical sessions -> open current table -> verify history button separate -> customer QR sees only current -> close. | Prior sessions do not clutter current service or QR. |
| SKR-FINAL-E2E-068 | P1 | Cashier | Search/filter Orders by table -> open correct bill -> payment/close. | Staff can find bill quickly. |
| SKR-FINAL-E2E-069 | P1 | Cashier | Search/filter Orders by order number -> open exact bill -> audit table/payment state. | Exact order is findable. |
| SKR-FINAL-E2E-070 | P1 | Manager | After paid table test -> open Reports today -> verify paid amount/order/table/payment method is discoverable. | Cash-up can reconcile real transactions. |
| SKR-FINAL-E2E-071 | P1 | Manager | Reports date filter today vs previous range -> totals change as expected -> no crash. | Reporting filters are reliable. |
| SKR-FINAL-E2E-072 | P1 | Manager | Reports export/download if available -> safe export or clear unsupported state. | Export path is understood. |
| SKR-FINAL-E2E-073 | P1 | Manager, cashier | End-day audit after several cases -> check active tables, open bills, KDS backlog, queue, reservations, reports. | No hidden launch blockers remain. |
| SKR-FINAL-E2E-074 | P1 | Manager | Paid bill in history -> inspect details/receipt/payment method -> no accidental edit path. | History is audit-safe. |
| SKR-FINAL-E2E-075 | P1 | Manager | Refund/reversal path discovery on synthetic paid bill -> blocked or audited -> report checked. | Post-payment correction policy is clear. |

### Phase H - Tables, movement, and floor operations

| ID | Priority | Roles | End-to-end simulation | Expected final state |
|---|---|---|---|---|
| SKR-FINAL-E2E-076 | P1 | Host, waiter | Tables tab -> inspect all T01-T10 -> seat/open table -> QR/order/pay/close from Tables/POS handoff. | Tables workflow remains intuitive and compact. |
| SKR-FINAL-E2E-077 | P1 | Waiter, cashier | Active unpaid table -> move to another available table -> add second round -> KDS/pay/close. | Bill/session follows destination table or move safely blocked. |
| SKR-FINAL-E2E-078 | P1 | Waiter | Move active table to occupied table attempt -> warning/block -> continue original service/pay/close. | No unsafe overwrite/merge. |
| SKR-FINAL-E2E-079 | P1 | Host | Paid table awaiting close -> close from Tables if available -> table available -> history intact. | Tables tab can finish paid table flow. |
| SKR-FINAL-E2E-080 | P1 | Host, customer | Closed table old QR reopened -> blocked -> host starts new table session -> new QR works -> order/pay/close. | New session is separate from old QR. |

### Phase I - Staff, timetable, users, and permissions

| ID | Priority | Roles | End-to-end simulation | Expected final state |
|---|---|---|---|---|
| SKR-FINAL-E2E-081 | P1 | Manager, staff | Manager opens Timetable -> creates/edits shift for synthetic staff -> staff sees/uses My Shift -> clock in -> clock out. | Staff shift lifecycle is workable. |
| SKR-FINAL-E2E-082 | P1 | Staff | Shared tablet My Shift -> staff selects correct profile -> clocks in -> active state visible -> clocks out. | Wrong-person clock-in risk is controlled. |
| SKR-FINAL-E2E-083 | P2 | Manager | Timetable calendar quick-add -> create shift -> inspect day/week -> delete or cleanup. | Calendar scheduling is not fiddly. |
| SKR-FINAL-E2E-084 | P2 | Manager | Leave/MC entry if supported -> balance changes or unsupported state clear -> timetable conflict reviewed. | Leave policy is visible enough. |
| SKR-FINAL-E2E-085 | P1 | Manager | Create synthetic staff user/profile -> role set -> staff role permissions checked -> cleanup/deactivate if safe. | User creation/role boundary works. |
| SKR-FINAL-E2E-086 | P1 | Waiter role | Login/role test if available -> access POS/Tables/Orders/Kitchen -> attempt Users/Settings/Reports. | Restricted modules protected. |
| SKR-FINAL-E2E-087 | P1 | Manager | Open Settings payment configuration -> verify HitPay/terminal status without revealing secrets -> perform QR/POS payment case. | Config visibility aligns with payment behavior. |
| SKR-FINAL-E2E-088 | P2 | Manager | Products/menu search -> verify product visible in POS/QR -> order/pay/close. | Menu administration reflects service surfaces. |
| SKR-FINAL-E2E-089 | P2 | Manager | Inventory stock dashboard -> inspect default route -> no destructive actions -> then run normal POS sale and check reporting surface. | Back-office navigation is stable. |
| SKR-FINAL-E2E-090 | P1 | Owner | Logout/relogin after service -> dashboard shows clean queue/tables/open bills -> no stale permission/session issue. | Fresh login reflects true operational state. |

### Phase J - Recovery, concurrency, and device stress

| ID | Priority | Roles | End-to-end simulation | Expected final state |
|---|---|---|---|---|
| SKR-FINAL-E2E-091 | P0 | Customer, cashier | Customer submits QR order -> browser refresh/back/forward -> attempts resubmit -> KDS/pay/close. | No duplicate order from navigation. |
| SKR-FINAL-E2E-092 | P0 | Customer, cashier | Customer hits HitPay return URL twice/refreshes success page -> POS/Orders checked -> close. | One payment confirmation only. |
| SKR-FINAL-E2E-093 | P0 | Customer, cashier | Customer attempts add-on while cashier is paying/closing -> system includes safely or blocks clearly -> final close. | Race condition does not create orphan item. |
| SKR-FINAL-E2E-094 | P1 | Host A, Host B | Same reservation open in two staff tabs -> Host A seats -> Host B attempts stale seat elsewhere -> continue service/pay/close. | Double-seating prevented. |
| SKR-FINAL-E2E-095 | P1 | Waiter A, Waiter B | Same table POS open in two tabs -> A submits item -> B submits item from stale view -> KDS/bill checked -> pay/close. | No silent overwrite or duplicate from concurrency. |
| SKR-FINAL-E2E-096 | P1 | Cashier | POS checkout page -> browser back/forward/refresh before payment -> return to bill -> terminal pay -> close. | Browser navigation does not lose or falsely pay bill. |
| SKR-FINAL-E2E-097 | P1 | iPad cashier | iPad landscape full table lifecycle -> select table -> product tap -> send -> pay -> close. | Landscape touch targets and layout pass. |
| SKR-FINAL-E2E-098 | P1 | iPad host | iPad portrait host flow -> reservation/queue seating -> empty release or order/pay/close. | Host touch workflow passes in portrait. |
| SKR-FINAL-E2E-099 | P1 | iPad kitchen | iPad KDS flow with mixed ticket -> start -> ready -> served -> POS payment/close. | KDS touch flow is readable and stable. |
| SKR-FINAL-E2E-100 | P0 | Owner, all roles | Full launch rehearsal: clean starting board -> one reservation table, one queue table, one POS-only table, one QR-only table, one mixed POS+QR table -> KDS serves all -> payments completed -> all tables closed -> queue/reservations/orders/reports/KDS audited. | System returns to clean launch-ready state with no orphan active records. |

## 10. Recommended execution order

Run in this order, because it builds confidence without polluting later cases:

1. SKR-FINAL-E2E-001 to 010: core dining/payment baseline.
2. SKR-FINAL-E2E-021 to 030: queue and walk-in baseline.
3. SKR-FINAL-E2E-031 to 045: POS/payment/correction behavior.
4. SKR-FINAL-E2E-046 to 055: QR safety and payment behavior.
5. SKR-FINAL-E2E-056 to 065: KDS/beverage/service behavior.
6. SKR-FINAL-E2E-011 to 020: reservation host-pressure variants.
7. SKR-FINAL-E2E-066 to 080: Orders, reports, tables, movement.
8. SKR-FINAL-E2E-081 to 090: timetable, users, permissions, settings.
9. SKR-FINAL-E2E-091 to 099: recovery, concurrency, and iPad stress.
10. SKR-FINAL-E2E-100: final full launch rehearsal.

## 11. Checkpoints during execution

After every 10 cases, record:

- cases completed;
- passed/failed/blocked/needs-specification count;
- new P0/P1 issues;
- data cleanup status;
- open test tables;
- open bills;
- KDS backlog;
- queue active/stale state;
- next case group decision.

Do not ask what to test next unless a real irreversible action, real payment, unavailable credential, or unauthorized access would be required.

## 12. Final launch gate

Sakorio should be treated as launch-ready only if:

1. No open P0/P1 defects remain.
2. All P0 flows score at least 9/10, or owner signs off on a documented exception.
3. Customer QR never exposes prior customer/session history.
4. Customer checkout never shows Cash.
5. HitPay success, cancellation, retry/recovery, and staff terminal settlement are verified.
6. Same-session orders remain current until table close.
7. Paid-but-not-closed tables cannot contaminate the next guest session.
8. Kitchen/beverage lanes remain readable under mixed and concurrent tickets.
9. Queue and reservation seating do not create orphan records.
10. iPad POS product taps and checkout remain reliable.
11. Reports/Orders allow end-day reconciliation.
12. End of run confirms clean queue, no unintended open bills, no stale KDS live backlog, and all test tables reset.

## 13. Review note

This brief is intentionally heavier than a normal regression list because Sakorio is near launch. If approved, the next step is to execute all 100 cases through the live browser and produce a scored result document with defects, improvements, cleanup evidence, and a final release recommendation.
