# Sakorio Hosted HitPay QA Record

**Date:** 18 July 2026  
**Branch:** `development`  
**Deployed commit:** `c85618d8` – `Fix rate-limited payment endpoints`  
**Environment:** Sakorio hosted staging domains on Render

## Summary

The original HitPay internal server error is fixed on the hosted Sakorio deployment.

Root cause observed in Render logs before the fix:

- SlowAPI raised `parameter response must be an instance of starlette.responses.Response` on rate-limited payment endpoints.

Code fix:

- Added the required `Response` parameter to the rate-limited payment endpoints in `back/app/main.py`.

Local verification before deploy:

- `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m pytest -q tests/test_payment_security.py tests/test_cashier_order_lifecycle.py`
- Result: `10 passed, 1 warning`

Hosted verification after Render deployed `c85618d8`:

- Render API service showed `Deploy live for c85618d: Fix rate-limited payment endpoints`.
- Public QR checkout opened a real HitPay sandbox provider URL.
- POS checkout opened a real HitPay sandbox provider URL.
- Both flows completed with HitPay sandbox card payment and returned to Sakorio successfully.

## Public QR flow

URL tested:

- `https://order.sakorio.com/menu/3b89cb81-33d4-402d-acc6-0be4a45d9b68`

Result:

- Public QR page loaded for Ajisen Ramen table T07.
- Cash option remained removed from public checkout.
- Payment options shown: HitPay and Card at Table.
- HitPay opened a real sandbox provider checkout:
  - `https://checkout.sandbox.hit-pay.com/payment-request/.../checkout`
- Sandbox checkout completed for order #47.
- Return URL:
  - `/payment-success?order_id=47&provider=hitpay&status=completed&reference=...`
- Public page showed: `Payment successful`.
- Staff POS later showed T07 as paid/ready, not as an open bill.

## Staff POS flow

URL tested:

- `https://staff.sakorio.com/pos`

Result:

- Staff POS loaded under the Sakorio staff domain.
- Table T04 was selected.
- Coffee was added to cart.
- Checkout showed Cash, Terminal, and HitPay rails for staff POS.
- HitPay opened a real sandbox provider checkout in a new tab.
- Sandbox checkout completed for order #48.
- Return URL:
  - `/pos?tableId=4&orderId=48&paymentReturn=hitpay&status=completed&reference=...`
- POS displayed: `HitPay checkout completed for T04`.
- T04 changed to paid/ready.
- Paid-today totals increased.

## Cross-surface checks

Orders:

- Paid T04/T07 bills were not shown in the active unpaid overview.
- Active order overview remained table-based and compact.

Kitchen:

- Paid public QR and POS tickets appeared once each with table/order context.
- Ticket notes contained the HitPay paid provider reference.

Reports:

- Sales by payment method separated HitPay, Terminal, and Cash.
- HitPay totals updated after the two sandbox payments.

Render logs:

- No fresh payment 500/traceback appeared after `c85618d8`.
- Only unrelated demo product upload 404s were visible during the log check.

## Remaining acceptance work

HitPay is now usable in sandbox from both public QR and POS, but the following should still be completed before production acceptance:

1. Replay or trigger duplicate sandbox webhooks to prove `/payments/hitpay/webhook` is idempotent.
2. Test cancelled/failed HitPay checkout recovery from both public QR and POS.
3. Verify HitPay customer receipt print jobs once a printer agent or physical printer is available.
4. Repeat with production HitPay credentials/base URL in Render environment variables before real launch.
5. Clean up or replace missing hosted demo product images that currently generate `/uploads/1/products/...` 404s.
