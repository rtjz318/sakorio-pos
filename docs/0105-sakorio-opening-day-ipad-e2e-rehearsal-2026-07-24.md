# Sakorio opening-day iPad E2E rehearsal

Date: 2026-07-24  
Live staff build verified: `POS 2.1.6 0d141e58`  
Viewport: iPad landscape simulation, `1180 x 820`  
Environment: live Sakorio staging domains

## Purpose

After the full iPad layout matrix passed, this run tested one practical opening-day service loop end to end, using the live browser rather than code-only checks.

The goal was to confirm that a waiter/cashier can:

1. open an available table,
2. add an item without leaving the POS table drawer,
3. send the order,
4. see it on KDS,
5. complete KDS service,
6. return to POS,
7. take terminal payment,
8. close/reset the table,
9. find the paid order in History,
10. confirm the old customer QR link is closed.

## Scenario executed

| Step | Actor | Action | Result |
| --- | --- | --- | --- |
| 1 | Cashier/waiter | Opened live POS at iPad landscape size | Staff app showed `POS 2.1.6 0d141e58`; no horizontal overflow. |
| 2 | Cashier/waiter | Selected T09, an available 2-seat table | POS table drawer opened in-place; no page jump. |
| 3 | Cashier/waiter | Added `Coca Cola` | Cart updated to `1 add-on item not sent yet`; total `SGD 3.00`; Send Order and Pay Bill remained visible. |
| 4 | Cashier/waiter | Sent order to kitchen | Order `#228` created for T09; POS stayed in same workflow; T09 showed live bill/order state. |
| 5 | Kitchen/beverage | Opened KDS | KDS showed `#228 · T09`, `1x Coca Cola`, in Beverages; no layout overflow. |
| 6 | Kitchen/beverage | Tapped `Start ticket` | Ticket moved from New tickets to In prep; toast showed the action. |
| 7 | Kitchen/beverage | Tapped `Ready for pass` | Ticket moved to Ready pass; toast showed the action. |
| 8 | Kitchen/beverage | Tapped `Served / Delivered` | KDS counters returned to zero; served toast showed `Ticket #228 served`; live board cleared. |
| 9 | Cashier | Returned to POS for T09/order `#228` | POS showed T09 ready to pay, one current ticket, bill `SGD 3.00`. |
| 10 | Cashier | Opened Pay Bill | Payment lane displayed Cash (staff), Terminal, HitPay/terminal policy copy; Terminal selected. |
| 11 | Cashier | Charged terminal | T09 moved to paid-awaiting-close; Paid Today became `SGD 3.00`; Add Items was no longer exposed. |
| 12 | Cashier | Tapped Close table | Final confirmation clearly stated table reset, QR session end, and History move. |
| 13 | Cashier | Confirmed `Yes, close table` | T09 returned to `Available / Ready for order`; no open `#228` bill remained on POS. |
| 14 | Manager/cashier | Opened Orders History and searched `228` | History returned `#228`, T09, `1x Coca Cola`, `SGD 3.00`, Paid, with read-only launch banner. |
| 15 | Customer | Reopened the old T09 QR link | QR page showed `Table Closed`; no cash option; order `#228` was not exposed. |

## Scorecard

| Area | Score | Notes |
| --- | ---: | --- |
| POS table selection / drawer continuity | 10/10 | Table opened in-place; no confusing checkout page jump. |
| Menu density on iPad landscape | 9.5/10 | Enough items visible for realistic service; larger menus should still use search/category filters. |
| Cart and send-order clarity | 10/10 | Cart count, total, Send Order, and Pay Bill were clear. |
| KDS beverage flow | 10/10 | New → In prep → Ready → Served worked cleanly with toasts/counters. |
| Terminal payment | 10/10 | Payment amount and selected terminal action were clear. |
| Paid-awaiting-close guard | 10/10 | After payment, T09 focused on Close table/Review bill; Add Items was not exposed. |
| Close-table confirmation | 10/10 | Copy clearly described reset, QR closure, and History move. |
| Orders history lookup | 10/10 | Closed paid bill found by order number; history clearly read-only. |
| QR post-close safety | 10/10 | Old QR showed Table Closed and no order/payment leakage. |
| iPad layout/container safety | 10/10 | No horizontal overflow in POS, KDS, Orders history, or QR surfaces used. |

Overall opening-day rehearsal score: **9.95 / 10**.

The only reason this is not written as a literal 10.00 is that simulated iPad browser viewport still does not replace a real physical iPad touch/network rehearsal.

## Findings

No new code defect was found in this pass.

The flow behaved the way a launch cashier/waiter would expect:

- POS stayed table-centered.
- KDS showed the right ticket and cleared after service.
- Terminal payment correctly moved the table into paid-awaiting-close.
- Close table reset T09.
- Orders History retained the paid bill.
- The old customer QR link was closed and did not expose the previous session.

## Data created and cleaned

- Created order: `#228`
- Table: T09
- Item: `1x Coca Cola`
- Payment: terminal, `SGD 3.00`
- Cleanup: T09 was closed/reset and ended as `Available / Ready for order`.

## Next practical launch action

The software flow is ready from this browser/iPad simulation.

Before opening-day use, run one physical-device rehearsal on the actual restaurant iPad:

1. connect to the restaurant Wi-Fi,
2. open staff POS,
3. open customer QR from a phone,
4. run one small order,
5. verify KDS visibility,
6. pay terminal,
7. close table.

This is now an operational hardware/network rehearsal, not a software blocker found in the browser pass.

