# Sakorio launch sandbox stress brief

Date: 2026-07-18  
Live QA surface: `https://staff.sakorio.com` and `https://order.sakorio.com`  
Repository branch: `development`  
Purpose: define and record launch sandbox simulations before production sign-off.

## 1. Test intent

This brief is the sandbox stress-test playbook for Sakorio before launch. It focuses on whether the restaurant can run a realistic service session without staff getting trapped, confused, or forced into unsafe workarounds.

The focus split is:

- 80% core service operations: POS, tables, orders, queue, reservations.
- 20% support operations: kitchen, timetable, reports, inventory, settings/payment configuration.

## 2. Test principles

- Use hosted Sakorio domains only for UI/UX QA.
- Prefer iPad-sized browser checks for staff workflows because waiters and cashiers are likely to use tablets.
- Do not rely on local-login-only QA for launch sign-off.
- Avoid destructive actions unless the record is clearly marked as QA/sandbox data.
- For payment testing, use HitPay sandbox only until live credentials and a low-value production transaction are approved.
- Printer testing remains parked for a future dedicated pass.

## 3. Launch-risk watchlist

| Risk | Why it matters | Sandbox signal to watch |
|---|---|---|
| Waiter cannot return to table board after selecting a table | Slows down service when handling multiple tables | POS selected-table view must always expose Back to tables / table board recovery |
| Paid table orders disappear too early | Confuses cashiers and reports if table is not closed yet | Orders must remain current until Clear table / table close |
| Queue and reservation handoff unclear | Host stand loses walk-ins or double-seats guests | Queue and reservations must show service-day status and seating cues |
| Kitchen backlog too noisy | Kitchen staff miss urgent tickets | Kitchen board must expose current lanes and oldest wait |
| Payment methods unclear | Cashier may select unsupported method | POS/public QR should guide HitPay/terminal, with cash removed where required |
| Settings/payment config not visible | Launch team cannot verify HitPay readiness | Payment settings route must load and show payment controls |

## 4. Sandbox use cases

The following 20 use cases are the required sandbox simulation set.

| ID | Area | Use case | User story | Expected result | Simulation result |
|---|---|---|---|---|---|
| UC-01 | Staff auth | Staff login and landing | Owner signs in and lands in the staff system | Dashboard or staff navigation loads with Sakorio version visible | Pass |
| UC-02 | POS | POS table board loads | Cashier opens POS before service | Table-first POS board loads with tables, open bills, paid today, catalog stats | Pass |
| UC-03 | POS | Select a paid table | Cashier opens a paid/ready table | Selected table shows clear-table / receipt / recovery actions without trapping cashier | Pass |
| UC-04 | POS | Select an open table | Cashier resumes an unpaid table | POS shows current orders, checkout/payment lane, and return-to-table-board path | Pass |
| UC-05 | POS | Return from selected table to table board | Cashier switches from one table to another | Back to tables or equivalent recovery path is visible | Pass |
| UC-06 | POS | Table menu flow remains compact | Waiter needs to add items from 20-30 menu items | Menu view should not force excessive full-page scrolling or hide payment lane | Pass with observation: current active table uses order/payment wording instead of a literal "Cart" label |
| UC-07 | POS | Checkout action visibility | Cashier is ready to settle an active table | Checkout/payment action remains obvious and right-side/payment area stays reachable | Pass with observation: HitPay/payment/checkout were visible; public QR cash check was handled separately |
| UC-08 | Orders | Active orders overview by table | Manager opens Orders during service | Active orders are grouped by table and do not show one order occupying most of the page | Pass |
| UC-09 | Orders | Current vs history split | Manager checks a table with current session tickets | Current session appears in active/current area; old closed sessions remain in history | Pass |
| UC-10 | Tables | Table grid operational overview | Waiter opens Tables tab | Tables show status, orders/start-order actions, and paid tables expose clear-table flow | Pass |
| UC-11 | Tables | Paid table clearing affordance | Waiter sees a settled table | Clear table is visible in the table layout for paid/ready-to-clear tables | Pass |
| UC-12 | Tables | Table orders handoff | Waiter taps a table order path | User can jump from table to POS/orders without losing service context | Pass |
| UC-13 | Queue | Host stand queue overview | Host opens Queue during service | Queue shows waiting/notified/seated/total counts and add/waitlist controls | Pass |
| UC-14 | Queue | Queue-to-table readiness | Host checks if queued guests can be seated | Queue should expose seating handoff language and avoid hidden controls | Pass |
| UC-15 | Reservations | Reservation service-day overview | Host opens Reservations | Reservations show service date, statuses, expected guests, and table-needed cues | Pass |
| UC-16 | Reservations | New reservation path discoverability | Host needs to create a booking | New reservation and public booking page actions are visible without hunting | Pass |
| UC-17 | Kitchen | Kitchen/beverage production board | Kitchen staff open production display | Lane counts, current work, oldest wait, and backlog signals are clear | Pass |
| UC-18 | Timetable | Scheduling command center | Manager opens Timetable | Timetable scope, scheduled shifts, unscheduled staff, coverage status, roster and leave panels load | Pass |
| UC-19 | Reports/Inventory | Manager handover and stock action | Manager checks reporting and stock before/after service | Reports handover strip and inventory stock-action strip load without overflow | Pass after clean recheck |
| UC-20 | Settings/Payments | Launch payment settings visibility | Owner verifies payment configuration | Settings payment tab is reachable and visible; HitPay configuration can be reviewed | Pass after clean recheck |

## 5. Browser simulation record

Status: Completed browser-only hosted simulation.

| Metric | Result |
|---|---|
| Hosted version tested | `2.1.6 2f47d236` on staff routes |
| Browser viewport | iPad-sized viewport, 1024 x 768 |
| Console errors | Passed on clean recheck; no blocking console errors on tested routes |
| Horizontal overflow | Passed; no full-page horizontal overflow on tested routes |
| Authenticated staff session | Passed; logged in through `staff.sakorio.com/login` using staff credentials |
| Public guest route checks | Supplemental pass on `order.sakorio.com/menu/3b89cb81-33d4-402d-acc6-0be4a45d9b68` |

### 5.1 Routes and surfaces tested

| Surface | Route |
|---|---|
| Dashboard | `https://staff.sakorio.com/dashboard` |
| POS board | `https://staff.sakorio.com/pos` |
| POS paid table | `https://staff.sakorio.com/pos?tableId=4` |
| POS open table | `https://staff.sakorio.com/pos?tableId=1` |
| Orders | `https://staff.sakorio.com/staff/orders` |
| Tables | `https://staff.sakorio.com/tables` |
| Queue | `https://staff.sakorio.com/queue` |
| Reservations | `https://staff.sakorio.com/reservations` |
| Kitchen and beverages | `https://staff.sakorio.com/kitchen` |
| Timetable | `https://staff.sakorio.com/working-plan/calendar` |
| Reports | `https://staff.sakorio.com/reports` |
| Inventory stock | `https://staff.sakorio.com/inventory/stock` |
| Settings | `https://staff.sakorio.com/settings` |
| Public QR menu | `https://order.sakorio.com/menu/3b89cb81-33d4-402d-acc6-0be4a45d9b68` |

### 5.2 Supplemental public QR result

The public QR menu was checked because guest ordering is a launch-critical path and was a prior concern.

| Check | Result |
|---|---|
| Public menu loads | Passed |
| Current order panel visible | Passed; showed "Current order" and "No active order" for the current session |
| Other customer order history visible | Passed; no history/past-order text was visible in the checked public session |
| Cash visible on public menu surface | Passed; `Cash` was not visible |
| Horizontal overflow | Passed |
| Console errors | Passed |

## 6. Simulation findings

### Passed

- Staff login and authenticated navigation worked.
- POS table board loaded with table-first layout, open bill counts, paid-today totals, and catalog count.
- Paid table flow exposed clear-table/recovery actions.
- Open table flow exposed current orders, checkout, HitPay/payment wording, menu, and back-to-table recovery.
- Orders view grouped active orders by table and exposed current/history concepts.
- Tables tab exposed status, orders/start-order handoffs, and paid-table clear affordance.
- Queue showed host-stand summary and readiness language.
- Reservations showed service-day workflow, statuses, expected guests, and new-reservation/public-booking actions.
- Kitchen showed lane counts, backlog, oldest wait, and production lanes.
- Timetable showed scheduling command center, roster, coverage, and leave panels.
- Reports showed manager handover strip and sales summary.
- Inventory stock showed stock action strip and quick action links.
- Settings showed the payment settings tab and other launch configuration tabs.

### Observations

- UC-06 originally looked for a literal "Cart" label, but the active table screen uses order/payment wording. This is acceptable if staff understand the current-ticket/payment lane language; otherwise consider a future microcopy change from "order" to "cart/order" in POS.
- UC-07 confirmed HitPay/payment/checkout visibility. Staff POS may still expose staff-only payment options; public QR was checked separately and did not show Cash on the menu surface.
- A generic minified browser log (`ERROR Vt`) appeared late in the long single-tab sweep, but clean rechecks of Reports, Inventory, and Settings produced no console errors. Treat as non-blocking unless it recurs during a user-visible action.
- Kitchen has a real backlog signal: 40 older unresolved tickets hidden from live shift, with oldest visible wait over 10 hours. This is operational test data/backlog noise, not a route failure, but it should be cleaned before live launch training.
- Inventory stock is structurally ready but has zero items in the tested tenant. Inventory launch readiness still depends on loading real stock data.

## 7. Launch decision notes

Based on this sandbox pass, the POS system is ready for a deeper data-mutating sandbox test.

Recommended next sandbox test layer:

1. Create one clearly named QA queue entry, seat it, then confirm it appears correctly in Tables/Orders context.
2. Create one clearly named QA reservation, seat it, finish it, then verify reservation status and table status.
3. Create one POS table order with 2-3 items, add another item later to the same table, verify Orders keeps both tickets current until table clear.
4. Run one HitPay sandbox checkout from POS and one public QR checkout, then confirm Reports separates HitPay from other payment methods.
5. Clear the test table and verify all tickets move from current to history only after table clear.

Do not move to a real live-payment launch sign-off until:

- production HitPay credentials are configured;
- a low-value live transaction is approved and tested;
- kitchen backlog test data is cleaned or archived;
- staff have a written SOP for queue/reservation/table close flows.
