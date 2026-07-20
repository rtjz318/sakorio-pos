# Sakorio POS Round 4 Browser QA Scenario Brief - 80 Use Cases

Date: 2026-07-20  
Run type: Browser-only regression and discovery QA  
Execution target: Live Sakorio staff/customer domains  
Source style: Same operating skeleton as Round 3 (`0082` / `0083`)  
Run prefix: `SKR-R4-20260720`

## Environment

- Staff app: `https://staff.sakorio.com`
- Customer QR ordering: `https://order.sakorio.com/menu/{table_public_id}?qr_access={qr_access_token}`
- Public reservation: `https://order.sakorio.com/book/1`
- Payment: HitPay sandbox / staff terminal simulation only
- Staff authentication: use the authorized staff account already provided by the owner; do not record secrets.
- Browser rule: execute through browser only. Do not verify outcomes by database edits or local-only login shortcuts.

## Scoring

Each case receives:

| Area | Score |
|---|---:|
| Functional correctness | /10 |
| UI/UX clarity | /10 |
| Workflow speed | /10 |
| Layout/stability | /10 |
| Launch readiness | /10 |

Target: priority flows should reach at least `9/10` before launch.

## Case catalog

| ID | Priority | Roles | End-to-end workflow |
|---|---|---|---|
| R4-E2E-001 | P0 | Customer, host, waiter, kitchen, cashier | Reservation created online -> host seats reservation -> customer self-orders by QR -> kitchen receives ticket -> cashier settles -> table closes. |
| R4-E2E-002 | P0 | Host, waiter, cashier | Walk-in queue entry -> seat at recommended table -> cashier adds order -> terminal payment -> close table. |
| R4-E2E-003 | P0 | Waiter, cashier | POS table-first flow -> select table -> add items -> send to kitchen -> checkout -> return to table grid. |
| R4-E2E-004 | P0 | Customer, waiter | Same table submits first order, then second order -> Orders keeps both current until table close. |
| R4-E2E-005 | P0 | Cashier | Paid bill appears paid in POS and Orders immediately after terminal settlement. |
| R4-E2E-006 | P0 | Customer | Customer QR shows only current session orders and bill, never previous table history. |
| R4-E2E-007 | P0 | Customer | Customer QR checkout offers HitPay/terminal only, no cash option. |
| R4-E2E-008 | P0 | Cashier | HitPay checkout completed return -> POS confirms payment -> Orders reflects paid -> table can close. |
| R4-E2E-009 | P0 | Cashier | HitPay cancelled return -> POS shows retry/terminal/back-to-cart recovery without clearing table. |
| R4-E2E-010 | P0 | Cashier | Terminal payment after cart and live bill add-on -> totals correct, cart clears, table remains controlled. |
| R4-E2E-011 | P0 | Waiter, kitchen | Food and beverage mixed order routes clearly to Kitchen & beverages. |
| R4-E2E-012 | P0 | Kitchen | Kitchen marks item preparing -> served/done -> POS/order status stays consistent. |
| R4-E2E-013 | P0 | Host | Reservation no-show/cancel does not occupy table or create orphan bill. |
| R4-E2E-014 | P0 | Host | Queue duplicate phone/name guard prevents accidental active duplicate. |
| R4-E2E-015 | P0 | Host | Seated queue entry can move to another table before order is created. |
| R4-E2E-016 | P0 | Waiter | Active table with unpaid bill cannot be closed silently. |
| R4-E2E-017 | P0 | Waiter | Paid table shows obvious close/clear action in table layout. |
| R4-E2E-018 | P0 | Cashier | POS iPad layout fits table selection, menu, cart, and checkout without overlap. |
| R4-E2E-019 | P0 | Cashier | POS menu list with many items remains usable without giant cards or excessive scrolling. |
| R4-E2E-020 | P0 | Cashier | Back from selected table to all tables is obvious and does not lose order context. |
| R4-E2E-021 | P1 | Customer | QR customer adds item, refreshes page, cart/session state remains correct. |
| R4-E2E-022 | P1 | Customer | QR customer double-clicks submit; no duplicate order is created. |
| R4-E2E-023 | P1 | Customer | QR customer opens old closed token; old history remains hidden and ordering is blocked/new-session-safe. |
| R4-E2E-024 | P1 | Waiter | Staff creates order, customer adds QR order later, both appear under same active table session. |
| R4-E2E-025 | P1 | Waiter | Staff changes selected table after cart items; system prevents accidental wrong-table checkout. |
| R4-E2E-026 | P1 | Cashier | Discount/tip/service charge visible on bill if configured; totals are understandable. |
| R4-E2E-027 | P1 | Cashier | Table bill review shows current orders separate from history. |
| R4-E2E-028 | P1 | Cashier | Orders broad overview groups by table and remains compact. |
| R4-E2E-029 | P1 | Kitchen | Kitchen board remains readable with multiple concurrent tickets. |
| R4-E2E-030 | P1 | Kitchen | Beverage-only order appears clearly in beverage workflow. |
| R4-E2E-031 | P1 | Host | Reservation search/filter finds synthetic booking quickly. |
| R4-E2E-032 | P1 | Host | Queue search/filter finds synthetic walk-in quickly. |
| R4-E2E-033 | P1 | Host | Reservation assigned to occupied table is blocked or clearly warned. |
| R4-E2E-034 | P1 | Host | Queue entry assigned to occupied table is blocked or clearly warned. |
| R4-E2E-035 | P1 | Host | Table move preserves guest, bill, QR session, and order state. |
| R4-E2E-036 | P1 | Cashier | Staff can reopen/review last checkout without corrupting paid status. |
| R4-E2E-037 | P1 | Cashier | Cashier can dismiss payment success summary and select next table smoothly. |
| R4-E2E-038 | P1 | Cashier | Terminal payment failure/abort path remains safe and recoverable. |
| R4-E2E-039 | P1 | Cashier | HitPay failed confirmation path remains safe and recoverable. |
| R4-E2E-040 | P1 | Cashier | Payment page/tab return does not strand cashier away from POS. |
| R4-E2E-041 | P1 | Manager | Void item before kitchen preparation; bill and kitchen status are correct. |
| R4-E2E-042 | P1 | Manager | Void item after kitchen preparation requires clear manager-style workflow or is blocked. |
| R4-E2E-043 | P1 | Manager | Refund/adjust paid bill is visible only through authorized path or blocked safely. |
| R4-E2E-044 | P1 | Manager | Reopen closed table/bill is audited or blocked safely. |
| R4-E2E-045 | P1 | Waiter | Add notes/modifiers to item; kitchen sees notes clearly. |
| R4-E2E-046 | P1 | Waiter | Required modifiers cannot be skipped. |
| R4-E2E-047 | P1 | Waiter | Sold-out/unavailable item cannot be ordered silently. |
| R4-E2E-048 | P1 | Waiter | Large party table order with many line items remains readable in cart and bill. |
| R4-E2E-049 | P1 | Customer | QR large order remains readable and checkout CTA stays obvious. |
| R4-E2E-050 | P1 | Customer | QR customer payment total matches staff bill total. |
| R4-E2E-051 | P2 | Staff | My Shift profile selection -> clock in -> visible active shift -> clock out. |
| R4-E2E-052 | P2 | Staff | Timetable creates shift -> staff can login/clock in from scheduled shift. |
| R4-E2E-053 | P2 | Manager | Timetable drag/add shift workflow is discoverable and calendar-like. |
| R4-E2E-054 | P2 | Manager | Annual leave/MC entry records balance or clearly shows missing feature. |
| R4-E2E-055 | P2 | Manager | Create employee/user -> role appears in users list -> can be disabled safely. |
| R4-E2E-056 | P2 | Manager | Role-based access labels are understandable for cashier/kitchen/host. |
| R4-E2E-057 | P2 | Manager | Reports can open without layout break and show recent paid orders. |
| R4-E2E-058 | P2 | Manager | Product/menu list opens and remains searchable on tablet size. |
| R4-E2E-059 | P2 | Manager | Settings payment section clearly exposes HitPay mode/status without leaking secrets. |
| R4-E2E-060 | P2 | Manager | Customer invoice module opens and does not interfere with POS customer sessions. |
| R4-E2E-061 | P1 | Cashier, customer | Concurrent staff POS and QR order on same table do not overwrite each other. |
| R4-E2E-062 | P1 | Cashier | Browser refresh during active POS cart does not create duplicate order or lose paid bill. |
| R4-E2E-063 | P1 | Customer | Browser back/forward during QR checkout does not duplicate order/payment. |
| R4-E2E-064 | P1 | Host | Browser refresh after seating reservation keeps table/reservation state correct. |
| R4-E2E-065 | P1 | Host | Browser refresh after seating queue keeps queue/table state correct. |
| R4-E2E-066 | P1 | Cashier | Table with active reservation but no order displays move/seat/QR actions clearly. |
| R4-E2E-067 | P1 | Cashier | Table with active queue visit but no order displays move/seat/QR actions clearly. |
| R4-E2E-068 | P1 | Kitchen | Kitchen ticket count and filters remain steady after refresh. |
| R4-E2E-069 | P1 | Orders | Orders tab active/current/history separation remains correct after table close. |
| R4-E2E-070 | P1 | Orders | Search by table/order/guest finds correct current or historical bill. |
| R4-E2E-071 | P1 | Cashier | Table transfer with unpaid bill keeps QR/customer session secure. |
| R4-E2E-072 | P1 | Cashier | Table transfer with paid-but-not-closed bill remains safe. |
| R4-E2E-073 | P1 | Host | Reservation party size larger than table capacity warns or blocks clearly. |
| R4-E2E-074 | P1 | Host | Queue party size larger than table capacity warns or blocks clearly. |
| R4-E2E-075 | P1 | Cashier | Multiple payments/partial payment concept is visible or safely unsupported. |
| R4-E2E-076 | P1 | Cashier | Receipt/print preview path is visible but printer hardware remains future-scoped. |
| R4-E2E-077 | P1 | Customer | QR payment retry after failed/cancelled HitPay is understandable. |
| R4-E2E-078 | P1 | Cashier | Staff payment retry after failed/cancelled HitPay is understandable. |
| R4-E2E-079 | P1 | All roles | Empty/loading/error states are human-readable across priority tabs. |
| R4-E2E-080 | P0 | All roles | End-of-service full table lifecycle audit: reservation/queue/order/kitchen/payment/history consistency. |
