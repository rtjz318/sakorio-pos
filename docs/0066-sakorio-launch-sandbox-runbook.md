# Sakorio Launch Sandbox Runbook

Date: 2026-07-18

This runbook covers the remaining QA items that require the deployed Sakorio domains and/or restaurant hardware. Code polish for backlog cleanup and printer readiness has been implemented; the steps below are the final live checks before launch.

## 1. HitPay non-zero sandbox payment

Goal: confirm a real non-zero bill can leave POS, complete on HitPay, return to POS, mark the order paid, and keep the table ready to clear.

Steps:

1. Log in at `https://staff.sakorio.com/login`.
2. Open POS and select an idle test table.
3. Add one non-zero item to the table.
4. Go to Bill / Pay.
5. Select HitPay.
6. Complete the hosted sandbox checkout.
7. Confirm POS returns with `status=completed` and the correct order reference.
8. Open Orders and confirm the order is paid / no longer active.
9. Open Tables and confirm the table shows paid / ready to clear.
10. Clear the table.

Pass criteria:

- HitPay checkout opens without API error.
- Return URL lands back inside POS.
- The bill is marked paid exactly once.
- Customer receipt print job is created if printing is enabled.
- Table can be cleared after payment.

Failure/cancel test:

1. Repeat the same setup with a new non-zero bill.
2. Start HitPay checkout.
3. Cancel or abandon the hosted checkout.
4. Return to POS.

Pass criteria:

- POS shows HitPay cancelled / needs attention.
- Bill remains open.
- Staff can retry HitPay or use terminal.
- No duplicate paid receipt is created.

## 2. Printer hardware / dry-run verification

Goal: confirm kitchen tickets and customer receipts flow through the print-agent pipeline.

Steps:

1. Open Settings → Printing.
2. Confirm Launch readiness panel.
3. Pair or start at least one print agent.
4. If hardware is not connected, set the agent to dry-run mode.
5. Place one QR or staff POS order with at least one kitchen item and one beverage item.
6. Confirm kitchen/bar ticket jobs appear in Recent receipt delivery.
7. Pay the order.
8. Confirm customer receipt job appears.

Pass criteria:

- At least one print agent is online.
- Failed jobs count is zero.
- Kitchen/bar ticket jobs complete.
- Customer receipt job completes after payment.

## 3. Waiter-role permission QA

Goal: confirm waiter account can operate service screens without admin access.

Steps:

1. Log out of owner account.
2. Log in with a waiter account.
3. Confirm waiter can open POS, Tables, Orders, Queue, Reservations, Kitchen/Beverages if intended by restaurant policy.
4. Confirm waiter cannot open admin-only Settings, Users, and restricted Reports if not intended.
5. Place a staff POS order, update an item status if waiter role allows it, and close via terminal/cash policy.

Pass criteria:

- No admin-only data is exposed.
- Waiter can complete the day-one service workflow.
- Any blocked page explains permission clearly rather than crashing.

## 4. Final clean-service rehearsal

Before launch rehearsal:

1. Open Kitchen.
2. Use Review backlog.
3. Filter by route/station.
4. Use Complete visible backlog only for stale tickets that were already handled.
5. Return to current shift.

Pass criteria:

- Kitchen current-shift board is clean.
- New QR/staff POS order appears within seconds.
- Old QA tickets no longer dominate service lanes.

