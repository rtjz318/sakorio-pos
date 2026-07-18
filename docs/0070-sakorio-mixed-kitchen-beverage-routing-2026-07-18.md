# 0070 — Mixed Kitchen + Beverage Routing Browser QA

Date: 2026-07-18  
Environment: production staging domains (`staff.sakorio.com`, `order.sakorio.com`)  
Build observed: POS 2.1.6 `09768dbb`  
Browser-only rule: followed. No local login/API shortcut was used for the workflow.

## Goal

Validate that one customer QR order containing both food and beverage items:

1. Can be created from a real table QR session.
2. Appears as one live table bill.
3. Routes correctly into Kitchen and Beverages station filters.
4. Can be paid and cleared through staff POS without leaving the table stuck open.

## Test data

- Table: T04
- Customer QR URL: `order.sakorio.com/menu/c2e9b521-0b26-470f-af3d-4a3cd1f75ae7?...`
- Order created: `#56`
- Items:
  - `1 x Chile Relleno` — Main Course — SGD 15.00
  - `1 x Coca Cola` — Beverages — SGD 3.00
- Total: SGD 18.00

## Browser simulation result

| Step | Result |
| --- | --- |
| Opened T04 public QR while T04 was idle | QR correctly showed `Table Closed` and blocked ordering. |
| Activated T04 through Staff Tables | Passed using `More → Activate`; T04 changed to `SEATED · START ORDER`. |
| Reloaded public QR | Passed; menu became active and showed T04 menu/catalog. |
| Added mixed items through QR | Passed; cart showed `2 items / SGD 18.00`. |
| Submitted QR order | Passed; order `#56` was created with status `Pending`. |
| Customer payment options | Passed; showed `Pay with HitPay` and `Pay with Card at Table`. No Cash option was shown to customer. |
| Kitchen display — All | Passed; order `#56` showed both `Chile Relleno` and `Coca Cola`. |
| Kitchen display — Kitchen filter | Passed; order `#56` showed `1 x Chile Relleno` only. |
| Kitchen display — Beverages filter | Passed; order `#56` showed `1 x Coca Cola` only. |
| Staff POS settlement | Passed; T04 order `#56` was paid via Terminal for SGD 18.00. |
| Table cleanup | Passed; T04 returned to `Available / Ready for order`. |

## Findings

### Pass

- The permanent QR security/activation guard is working: idle tables are not accepting customer orders.
- The customer checkout correctly removed Cash from the public flow.
- Mixed station routing works:
  - Main Course item goes to Kitchen.
  - Beverage item goes to Beverages.
  - The combined bill remains linked to T04 as one order.
- Staff POS payment + clear-table recovery worked after the QR order.

### Polish notes

1. The route to make a QR usable is not obvious enough.
   - `Start order` opens the table service drawer, but if there are no items, the drawer still says `Closed` and `Open table & send` is disabled.
   - The successful path is `More → Activate`, which is operationally correct but hidden below a secondary control.
   - Recommended improvement: when a waiter clicks `Start order` on an idle table, make the drawer include a clear primary button: `Open table for QR ordering`. This should call the same activation endpoint and then change the drawer status to `Ready`.

2. The Kitchen display still has a large inherited backlog.
   - Routing for #56 passed, but older pending tickets create visual noise.
   - Recommended improvement: add a default “Today / Active session” view or a stronger backlog cleanup workflow before launch.

3. Staff POS still defaults to staff Cash on checkout.
   - This is acceptable for staff counter settlement if desired.
   - Public customer QR correctly does not show Cash.
   - If Sakorio wants all staff settlement to prefer Terminal/HitPay, default the POS checkout method to Terminal.

## Launch verdict for this pass

Functional pass. The routing logic is correct and the table was cleaned up successfully. The main launch polish item is UX clarity: idle table activation should be exposed directly in the table service drawer so waiters do not need to discover `More → Activate`.
