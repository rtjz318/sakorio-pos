# Sakorio POS Round 6 Browser QA Scenario Brief - 80 Use Cases

Date: 2026-07-21  
Run type: Browser-only exhaustive regression and discovery QA  
Execution target: Live Sakorio staff/customer domains  
Source style: Same operating skeleton as prior 80-case rounds and R5 regression report (`0082`-`0086`)  
Run prefix: `SKR-R6-20260721`

## Purpose

Round 5 scored `8.5/10`, which is good but not launch-grade. Round 6 is designed to push the system toward `9+/10` by testing the complete restaurant operating day more aggressively, with extra attention on:

- reservation → seat now → QR order → kitchen/beverage ticket → payment → close table;
- customer QR session safety and rapid-tap/idempotency;
- POS close-table consistency;
- Orders, Queue, Reservations, and Tables operational clarity;
- iPad/tablet layout stability;
- staff shifts/timetable and manager back-office surfaces;
- recovery paths when payment, refresh, browser navigation, or table movement interrupts the ideal flow.

This is a scenario brief only. Each case must later be executed through the browser, one by one, on the live Sakorio domains. Do not use local-only shortcuts or database edits to mark a workflow as passed.

## Environment

- Staff app: `https://staff.sakorio.com`
- Customer QR ordering: `https://order.sakorio.com/menu/{table_public_id}?qr_access={qr_access_token}`
- Public reservation: `https://order.sakorio.com/book/1`
- Queue guest page: `https://order.sakorio.com/queue/1`
- Payment: HitPay sandbox where available, plus staff terminal simulation for counter settlement
- Staff authentication: use the authorized staff account already provided by the owner; do not record secrets in the result brief
- Browser rule: execute through the browser only. Do not verify outcomes by database edits, API-only shortcuts, or local-only login shortcuts
- Printer rule: printer hardware remains future-scoped; only visible receipt/print workflow affordances should be assessed

## Scoring

Each executed case receives:

| Area | Score |
|---|---:|
| Functional correctness | /10 |
| UI/UX clarity | /10 |
| Workflow speed | /10 |
| Layout/stability | /10 |
| Launch readiness | /10 |

Use a single final score per case after weighing those areas. Priority flows should reach at least `9/10` before launch.

## Result skeleton for each executed case

When the browser run is executed, record each case using this structure:

```md
### R6-E2E-001 — Case title

- Priority:
- Roles:
- Preconditions:
- Browser steps executed:
- Expected result:
- Actual result:
- Score:
- Status:
- Evidence/artifacts:
- Issues found:
- Improvements needed:
- Launch decision:
```

## Case catalog

| ID | Priority | Roles | End-to-end workflow | Primary expected result |
|---|---|---|---|---|
| R6-E2E-001 | P0 | Customer, host, waiter, kitchen, cashier | Public reservation is created online → host seats reservation using Seat at table → waiter opens QR → customer self-orders → Kitchen receives ticket → ticket served → terminal payment → table closes. | Reservation becomes FINISHED, order is paid/closed, Kitchen returns to zero backlog, QR closes safely. |
| R6-E2E-002 | P0 | Customer, host, kitchen, cashier | Same as R6-E2E-001 but customer submits two separate QR orders in the same table session before payment. | Both orders remain current for the same session until table close; first order must not move to history early. |
| R6-E2E-003 | P0 | Customer, host, kitchen, cashier | Reservation → seat now → QR order beverage-only → beverage lane processes → staff terminal payment → close. | Beverage-only order is clear and stable in KDS; close flow is smooth. |
| R6-E2E-004 | P0 | Customer, host, kitchen, cashier | Reservation → seat now → QR order mixed food + beverage → food/beverage routing → both served → payment → close. | Mixed order is readable, station routing is obvious, bill total stays correct. |
| R6-E2E-005 | P0 | Customer, host, cashier | Reservation → seat now → customer opens QR but places no order → guests leave → staff closes empty table. | Empty active session can be closed from the POS without needing a different tab. |
| R6-E2E-006 | P0 | Host, waiter | Reservation created with party size larger than selected table → host attempts to seat. | System warns or blocks capacity mismatch clearly. |
| R6-E2E-007 | P0 | Host, waiter | Reservation is seated, then moved to another table before ordering. | Guest context, reservation state, and QR session transfer safely or clearly require a fresh QR. |
| R6-E2E-008 | P0 | Customer, host | Old QR from reservation table is opened after table is closed. | Page shows Table Closed only; no old orders/history/payment action leaks. |
| R6-E2E-009 | P0 | Customer, host, cashier | Reservation → QR order → customer starts HitPay checkout but returns/cancels → staff terminal payment recovery. | Cancelled payment does not clear bill; staff can recover and settle. |
| R6-E2E-010 | P0 | Customer, host, cashier | Reservation → QR order → HitPay sandbox success return → POS and Orders reflect paid → close. | HitPay success updates order/payment status without manual refresh confusion. |
| R6-E2E-011 | P0 | Customer | Customer QR rapid double-tap on Place order with one item. | Exactly one order and one line quantity are created; no duplicate quantity. |
| R6-E2E-012 | P0 | Customer | Customer QR rapid double-tap on Pay/HitPay checkout. | One payment request is created; no duplicate checkout sessions or duplicated bill state. |
| R6-E2E-013 | P0 | Customer | Customer QR adds item → refreshes before placing → cart/bill state remains clear. | No phantom order; cart either persists clearly or resets safely. |
| R6-E2E-014 | P0 | Customer | Customer QR submits order → browser back/forward → tries submit again. | No duplicate order; current order view remains session-scoped. |
| R6-E2E-015 | P0 | Customer | Customer scans QR for active table, then staff closes table while customer page remains open. | Customer page changes to closed/safe state on refresh and cannot order. |
| R6-E2E-016 | P0 | Waiter, cashier | POS table-first flow → select available table → add item → send/checkout → return to table grid. | Staff can return to table grid without losing context or landing on a confusing page. |
| R6-E2E-017 | P0 | Waiter, cashier | POS selected table → add many items from menu → cart review → terminal payment. | Menu/cart fit in view; bill summary remains readable with many lines. |
| R6-E2E-018 | P0 | Waiter | POS selected table → open Current orders → switch back to Add items → add more. | Current vs add-items modes are obvious and fast. |
| R6-E2E-019 | P0 | Waiter, cashier | POS selected table with live bill → Back / switch table → choose different table → start new order. | No wrong-table cart bleed; selected table is always obvious. |
| R6-E2E-020 | P0 | Cashier | POS paid bill → Close table from POS drawer/header. | Close table is obvious and one-step after payment. |
| R6-E2E-021 | P0 | Cashier, orders | POS paid bill → Orders tab → close from Orders. | Orders action either closes directly or is accurately labelled “Open POS to close”. |
| R6-E2E-022 | P0 | Cashier | Active unpaid table → attempt close. | System blocks unsafe close or requires proper payment/void workflow. |
| R6-E2E-023 | P0 | Cashier | Paid-but-not-closed table → start new order on same table. | System requires close/reset first or clearly creates separate session without merging incorrectly. |
| R6-E2E-024 | P0 | Cashier | Staff terminal payment success → immediate refresh of POS. | Paid state persists; no duplicate payment or open-bill confusion. |
| R6-E2E-025 | P0 | Cashier | Staff terminal payment button clicked twice rapidly. | Only one settlement is recorded. |
| R6-E2E-026 | P0 | Kitchen | Customer QR order appears in Kitchen → start ticket → refresh KDS. | Ticket remains in correct lane/status after refresh. |
| R6-E2E-027 | P0 | Kitchen | KDS ticket → ready → refresh → served. | Ready state persists and served clears the correct ticket only. |
| R6-E2E-028 | P0 | Kitchen | Multiple concurrent tickets on different tables. | KDS remains readable; counts and lanes remain correct. |
| R6-E2E-029 | P0 | Kitchen, waiter | One table has multiple QR/staff orders active. | Kitchen groups/labels tickets clearly enough to avoid serving wrong table. |
| R6-E2E-030 | P0 | Kitchen, cashier | Kitchen ticket still pending while cashier attempts payment. | Payment is blocked, warned, or allowed with clear operational meaning. |
| R6-E2E-031 | P0 | Host | Public queue guest joins → host sees guest → seats at table → POS opens. | Queue-to-POS handoff preserves guest and table context. |
| R6-E2E-032 | P0 | Host, waiter | Staff creates walk-in queue entry → seat → open QR → customer orders → kitchen → payment → close. | Full walk-in chain matches reservation chain quality. |
| R6-E2E-033 | P0 | Host | Queue guest party size larger than table capacity → attempt seat. | Capacity warning/block is clear. |
| R6-E2E-034 | P0 | Host | Duplicate queue guest same phone/name is added. | Duplicate guard prevents or flags duplicate active entry. |
| R6-E2E-035 | P0 | Host | Queue guest seated with no order → staff closes table. | Empty queue session can be closed from POS without tab-hunting. |
| R6-E2E-036 | P1 | Host | Queue guest notified → then seated. | Status progression is visible and does not leave stale active cards. |
| R6-E2E-037 | P1 | Host | Queue guest cancelled/removed. | Queue counters update immediately and no table/session is created. |
| R6-E2E-038 | P1 | Host | Queue stale toggle default/off/on. | Active board is clean by default; stale records are intentionally accessible. |
| R6-E2E-039 | P1 | Host | Reservation search/filter by guest name and status. | Host can find the target booking quickly. |
| R6-E2E-040 | P1 | Host | Reservation cancel/no-show before seating. | No table occupancy or orphan bill is created. |
| R6-E2E-041 | P1 | Host | Reservation seated then marked finished through close table. | Reservation timeline accurately shows FINISHED. |
| R6-E2E-042 | P1 | Host, waiter | Attempt to seat reservation on occupied table. | System blocks/warns clearly. |
| R6-E2E-043 | P1 | Host, waiter | Attempt to seat queue on occupied table. | System blocks/warns clearly. |
| R6-E2E-044 | P1 | Tables | Tables tab open → inspect T01-T10 → close/move actions. | Layout is compact; active vs available states are obvious. |
| R6-E2E-045 | P1 | Tables | Move occupied table with no order. | Move workflow is safe, visible, and does not orphan QR. |
| R6-E2E-046 | P1 | Tables | Move occupied table with unpaid order. | Bill, QR state, and KDS labels remain correct or move is blocked safely. |
| R6-E2E-047 | P1 | Tables | Close paid table from Tables tab. | Close works and table becomes available immediately. |
| R6-E2E-048 | P1 | Orders | Orders tab active overview after several open tables. | Broad overview groups by table and does not consume most of page per order. |
| R6-E2E-049 | P1 | Orders | Orders current vs history for a table with previous sessions. | Current session is separated from historical sessions. |
| R6-E2E-050 | P1 | Orders | Search/filter by table number. | Correct current and historical orders are findable. |
| R6-E2E-051 | P1 | Orders | Search/filter by order number. | Exact bill is findable quickly. |
| R6-E2E-052 | P1 | Orders | Paid-awaiting-close order display. | Staff sees a clear close action and table state. |
| R6-E2E-053 | P1 | Orders | Closed paid order display. | Staff can audit payment/table/method without confusing it with current orders. |
| R6-E2E-054 | P1 | Cashier, manager | Void/remove item before kitchen starts. | Bill and KDS update correctly or unsupported workflow is safely blocked. |
| R6-E2E-055 | P1 | Cashier, manager | Void/remove item after kitchen starts. | Manager-style confirmation/audit appears, or action is safely blocked. |
| R6-E2E-056 | P1 | Cashier, manager | Reopen closed bill/table attempt. | Reopen is audited or safely unavailable. |
| R6-E2E-057 | P1 | Cashier, manager | Refund/adjust paid bill attempt. | Refund path is authorized/audited or safely unavailable. |
| R6-E2E-058 | P1 | Cashier | Partial/multiple payment attempt or discovery. | Feature is clear if supported; otherwise safely unsupported without misleading UI. |
| R6-E2E-059 | P1 | Cashier | Receipt/print preview visibility after payment. | Receipt affordance is visible or printer future-scope is clear; no broken printer action. |
| R6-E2E-060 | P1 | Reports | Reports after new paid orders. | Recent paid orders are visible or searchable enough for cash-up. |
| R6-E2E-061 | P1 | Reports | Reports filter by date/today. | Totals update and remain understandable. |
| R6-E2E-062 | P1 | Reports | Reports export buttons. | Export actions are visible and do not break the page. |
| R6-E2E-063 | P1 | Reports | Cashier reconciliation by table/order/payment method. | Staff can find a specific order without manual scanning, or gap is documented. |
| R6-E2E-064 | P1 | Product/menu | Products page search and menu availability. | Staff can find items quickly and see availability/status. |
| R6-E2E-065 | P1 | Product/menu | Large product/menu set on tablet. | Cards/list remain compact; no excessive scrolling for basic ordering. |
| R6-E2E-066 | P1 | Customer | QR menu with many items on phone. | Categories/search/cart remain usable and checkout CTA is obvious. |
| R6-E2E-067 | P1 | Customer | QR item notes/modifiers if available. | Notes/modifiers appear clearly in KDS and bill, or unsupported state is clear. |
| R6-E2E-068 | P1 | Customer | QR sold-out/unavailable item if present. | Cannot order unavailable item silently. |
| R6-E2E-069 | P1 | Customer, cashier | Customer QR total vs staff POS total. | Totals match exactly before payment. |
| R6-E2E-070 | P1 | Customer, cashier | Customer HitPay/card-at-table options vs staff cash/terminal options. | Customer never sees Cash; staff sees only intended internal methods. |
| R6-E2E-071 | P1 | Tablet/iPad | POS table grid at iPad landscape size. | Table cards fit without overlap/horizontal scroll. |
| R6-E2E-072 | P1 | Tablet/iPad | POS selected table drawer at iPad landscape size. | Drawer, menu, cart, and payment lanes are reachable without weird overlap. |
| R6-E2E-073 | P1 | Tablet/iPad | POS selected table at iPad portrait size. | Layout remains usable or responsive fallback is clear. |
| R6-E2E-074 | P1 | Tablet/iPad | Reservations/Queue/Tables at iPad size. | Host can seat/close/move without hidden buttons. |
| R6-E2E-075 | P1 | Tablet/iPad | Kitchen & beverages at iPad size. | KDS lanes remain readable and actionable. |
| R6-E2E-076 | P2 | Staff | My Shift profile selection → clock in → active shift → clock out. | Correct staff can clock in/out; owner/demo session does not mask missing fixture. |
| R6-E2E-077 | P2 | Manager | Timetable create shift → staff can see shift. | Schedule creation is calendar-like and staff-facing. |
| R6-E2E-078 | P2 | Manager | Timetable drag/drop or quick-add discovery. | Drag/drop/add shift workflow is obvious or gap is documented. |
| R6-E2E-079 | P2 | Manager | Annual leave/MC entry and balance. | Leave/MC balance records or unsupported scope is clear. |
| R6-E2E-080 | P0 | All roles | End-of-service full audit: reservations, queue, active tables, kitchen, orders, reports, QR tokens. | No open bills/backlog unless intentionally left; all test tables are cleaned and the system is launch-ready for the next service. |

## Full end-to-end journey addendum - 20 complete user experience workflows

These scenarios are deliberately broader than the case catalog above. Each one should be executed as a complete restaurant story from first customer/staff action through final cleanup, not as isolated feature checks.

Use these IDs in the result document when this batch is executed: `R6-FLOW-001` to `R6-FLOW-020`.

| ID | Priority | Main roles | Full user journey | What must be proven |
|---|---|---|---|---|
| R6-FLOW-001 | P0 | Customer, host, waiter, kitchen, cashier | Customer reserves online for 2 guests -> host finds booking on arrival -> seats them at an available 2-seat table -> waiter opens QR and gives it to customer -> customer places first QR order with beverage + food -> kitchen/beverage board receives and serves it -> customer places a second QR order during the same sitting -> kitchen serves second round -> customer walks to cashier -> cashier confirms both rounds on one bill -> terminal payment -> close bill -> close table -> customer QR reload shows Table Closed -> table resets to available. | Full reservation dining lifecycle works with multiple customer order rounds and a clean table reset. |
| R6-FLOW-002 | P0 | Customer, host, cashier | Customer reserves online for 4 guests -> host attempts to seat them at a 2-seat table -> system warns/blocks or makes capacity issue clear -> host chooses correct 4-seat table -> customer scans QR -> places one order -> cashier pays by terminal -> table closes. | Capacity mismatch is handled before service starts and does not create a broken reservation/table session. |
| R6-FLOW-003 | P0 | Customer, host, kitchen, cashier | Customer books a reservation -> arrives early -> host seats them immediately -> customer scans QR and orders beverage-only first -> beverage lane completes -> later customer orders food-only -> kitchen lane completes -> cashier settles one combined bill -> close table. | Split beverage-first/food-later service remains one table session with correct station routing and one final bill. |
| R6-FLOW-004 | P0 | Customer, host, waiter, kitchen, cashier | Customer reserves online -> seated at table -> waiter adds starter from staff POS because customer asks verbally -> customer then scans QR and adds mains themselves -> kitchen receives staff and QR tickets -> both are served -> cashier reviews current orders vs history -> payment -> close. | Staff POS and customer QR ordering can coexist on the same active table without overwriting or splitting the bill. |
| R6-FLOW-005 | P0 | Customer, host, cashier | Customer reserves online -> host seats table and opens QR -> customer browses but does not order -> customer leaves due to emergency -> staff closes the no-order occupied/QR-active table -> reservation is finished/cancelled appropriately -> table resets. | No-order seated sessions are easy to close without tab-hunting or orphan active table state. |
| R6-FLOW-006 | P0 | Walk-in customer, host, waiter, kitchen, cashier | Walk-in guest joins public queue from phone -> host sees them in Queue -> host notifies/seats them -> POS opens table context -> waiter opens QR -> customer orders first round -> waiter later adds extra item from POS -> kitchen serves all tickets -> terminal payment -> close table -> queue entry is no longer active. | Public queue-to-dining lifecycle matches reservation quality and leaves no stale queue/table artifacts. |
| R6-FLOW-007 | P0 | Walk-in customer, host, cashier | Walk-in group joins queue for 6 guests -> host attempts to seat at smaller table -> system warns/blocks -> host seats at suitable table or records wait -> group orders through QR -> cashier payment -> table reset. | Queue capacity handling is clear and operationally safe. |
| R6-FLOW-008 | P0 | Host, waiter, customer, cashier | Host seats queue guest at table -> before ordering, guest requests a different table -> staff moves the table/session -> waiter opens new/current QR -> customer orders -> cashier pays -> close. | Moving a seated but unpaid/no-order guest preserves correct guest context and does not leave old QR/session confusion. |
| R6-FLOW-009 | P0 | Customer, cashier, kitchen | Customer scans QR -> adds one item -> rapidly taps Place order twice -> kitchen receives ticket -> cashier checks bill quantity -> if duplicate appears, document exact impact -> staff resolves/settles/cleans table. | QR order submission is idempotent or the duplicate-line defect is reproduced with full recovery evidence. |
| R6-FLOW-010 | P0 | Customer, cashier | Customer scans QR -> creates order -> starts HitPay sandbox payment -> cancels or returns without paying -> returns to QR/POS -> cashier confirms bill remains unpaid -> customer retries or cashier terminal-settles -> close table. | Payment cancellation is recoverable and does not lose or falsely pay the bill. |
| R6-FLOW-011 | P0 | Customer, cashier | Customer scans QR -> orders -> starts HitPay sandbox -> completes payment -> app returns to Sakorio -> POS/Orders show paid -> cashier closes table -> QR reload shows closed. | Customer-side HitPay success synchronizes cleanly to staff POS and table close. |
| R6-FLOW-012 | P0 | Cashier, kitchen, customer | Cashier starts table order from POS -> adds many menu items across categories -> sends order -> kitchen board processes -> cashier adds another round before payment -> terminal settlement -> close -> Orders history shows full paid session. | High-volume staff POS order remains readable and efficient from table selection to history. |
| R6-FLOW-013 | P0 | Customer, kitchen, cashier | Customer QR large order with many line items -> reviews cart -> submits -> KDS receives readable ticket -> staff serves -> customer checks total at cashier -> terminal payment -> close. | Large customer QR order is readable on customer, kitchen, cashier, and history surfaces. |
| R6-FLOW-014 | P1 | Manager, cashier, kitchen | Cashier adds item by mistake before kitchen starts -> manager/cashier removes or voids it if supported -> kitchen ticket updates or unsupported path is clearly blocked -> correct order served -> payment -> close. | Pre-prep correction workflow is safe and understandable. |
| R6-FLOW-015 | P1 | Manager, cashier, kitchen | Customer changes mind after kitchen has started preparing item -> staff attempts void/remove -> manager path/audit or safe block appears -> final bill reflects actual policy -> close. | After-prep correction workflow is safe and cannot silently corrupt kitchen/bill state. |
| R6-FLOW-016 | P1 | Cashier, manager | Customer pays terminal -> cashier accidentally tries to start a new order before closing table -> system prevents merge or forces table reset -> manager can audit paid bill -> close table -> new table session starts cleanly. | Paid-but-not-closed state protects the next customer from bill/session mixing. |
| R6-FLOW-017 | P1 | Host, customer, cashier | Reservation guest no-shows -> host marks no-show/cancel -> later walk-in is seated at same table -> walk-in orders by QR -> payment -> close -> reservation remains no-show and walk-in remains separate. | No-show/cancelled reservation does not occupy or contaminate a later walk-in table session. |
| R6-FLOW-018 | P1 | Staff, manager, cashier | Manager creates or confirms a staff shift in Timetable -> staff selects profile in My Shift -> clocks in -> handles a POS order/table lifecycle -> clocks out -> manager reviews attendance/report surface. | Staff scheduling/attendance connects plausibly to real service operations. |
| R6-FLOW-019 | P1 | Cashier, manager | End-of-day cashier reviews Orders and Reports -> searches for specific table/order/payment method -> exports or inspects report -> verifies no active kitchen backlog/open bills -> closes remaining paid tables. | Cash-up/end-day workflow is possible without manual guessing or hidden states. |
| R6-FLOW-020 | P0 | All roles | Simulated busy service: one reservation table, one queue/walk-in table, one staff POS-only table, and one customer QR table run concurrently -> kitchen processes multiple tickets -> cashier settles each by different supported methods -> all tables closed -> Orders/Reports/Kitchen/Queue/Reservations audited. | Whole-system launch readiness under realistic multi-table pressure, with no orphan bills, stale QR access, hidden backlog, or confusing table states. |

## Execution notes for the next browser run

1. Start with clean staff login and confirm live version in the sidebar/footer.
2. Record every created reservation, queue entry, table, order, QR URL, and payment reference.
3. After every table lifecycle, verify:
   - POS table state;
   - Orders current/history state;
   - Kitchen/backlog state;
   - customer QR closed/open state;
   - Reports/cash-up visibility when payment occurred.
4. Do not mark a workflow as passed just because it technically works. Score the restaurant usability: number of steps, confusing labels, tab-hopping, hidden actions, layout density, and recovery clarity.
5. Clean every active test table before ending the run, unless the case intentionally documents a cleanup blocker.

## Known R5 issues to retest first

- QR double-submit duplicated quantity in one order.
- Paid/no-order close-table actions are not consistent across POS, Orders, and Tables.
- Background table-card actions can remain active under POS drawer.
- Orders needs search/filter.
- Reports needs cashier reconciliation by order/table/payment method.
- `/timetable` route should resolve directly or navigation should use the correct path.
- Physical iPad/Safari validation is still needed because the in-app viewport override reported desktop dimensions.
