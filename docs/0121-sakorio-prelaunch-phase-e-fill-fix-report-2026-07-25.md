# Sakorio POS Prelaunch Phase E Fill Fix Report

Date: 2026-07-25

Scope: Fill the open gaps from E2E-041 through E2E-050 before continuing beyond E2E-050.

## Fixes completed

| Area | Gap filled | Implementation note | Expected retest result |
|---|---|---|---|
| POS drawer refresh | Cashier actions could leave stale table/order state until a reload. | Added a shared async POS data refresh path and reused it after QR open/copy, send-to-kitchen, terminal/cash payment, HitPay return confirmation, quick product creation, table state changes, and close/release table. | Staff should see the selected table, live bill, paid state, and close-table controls update immediately after each action. |
| Payment handoff | After payment, POS could switch away from the paid table too early, making close-table flow less obvious. | Kept the paid table and paid bill selected after cash/card terminal settlement and HitPay return confirmation. Removed the automatic switch-to-next-table behavior from payment completion paths. | Cashier should land on the paid bill and can close/reset the table without hunting for it again. |
| Payment amount display | Terminal/cash success messaging could calculate amount after the order was already marked paid. | Captured checkout amount before changing the local order to paid, then reused that captured amount for the checkout outcome. | Settlement confirmation should show the actual bill amount instead of SGD 0.00. |
| Paid close confirmation | Live retest showed the paid table stayed selected, but the drawer close action did not expose the final confirmation clearly enough. | Added an inline final confirmation inside the POS drawer outcome/ready-to-clear state with explicit `Keep open` and `Yes, close table` actions. | Cashier can close/reset the paid table directly from the POS drawer after payment. |
| Desktop bill dock close confirmation | E2E-051 live retest showed desktop/landscape bill dock had a separate paid-table branch that still changed to “ready to clear” without a visible `Yes, close table` action. | Added the same inline final confirmation to the desktop checkout outcome and ready-to-clear bill dock branches. | Cashier can complete paid-table close from desktop/iPad landscape bill dock without switching surfaces. |
| Fixed table QR activation | E2E-052 live retest showed fixed printed QR links can be visible/printable while the table session is still closed, with no obvious action in the Table QR panel to open ordering. | Added an explicit `Open QR ordering` action and open/closed status inside the Tables → Table QR drawer. | Staff can seat/open a table, then customers scanning the fixed QR can order without needing a regenerated QR. |
| Search clear UX | Menu search needed a clear/reset control for large menus. | Added a visible Clear button beside the POS menu search field that resets the search and returns focus to the field. | Staff can recover from filtered results quickly without manually deleting text. |
| History/demo-data clarity | Older staging/demo bills were separated from active orders but not clearly flagged during launch review. | Added a launch data review note in table history when there are many old sessions or sessions older than seven days. | Current orders remain separate; old/demo sessions are visibly treated as review/history data before go-live. |

## Verification completed locally

- Angular production-static build: passed.
- Frontend Docker rebuild logs: clean; no TypeScript or Angular compiler errors in the checked window.

## Live browser retest required after deployment

After Render deploys this commit, retest these E2E-041 to E2E-050 checkpoints in the live browser:

1. Send a first order from POS and confirm the selected bill appears immediately.
2. Add a second round to the same table and confirm both rounds remain in the current session until close table.
3. Pay by terminal and confirm the paid bill stays selected with the correct amount and close-table action visible.
4. Close/reset the table and confirm the board/drawer clears without stale last-bill state.
5. Search a menu item, press Clear, confirm the full menu/category view returns.
6. Open History on a table with old staging sessions and confirm the launch data review note is visible.
