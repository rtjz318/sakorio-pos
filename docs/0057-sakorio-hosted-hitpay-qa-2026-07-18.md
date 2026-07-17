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

Follow-up hardening after hosted QA:

- Added `test_hitpay_webhook_replay_is_idempotent` to verify that duplicate signed HitPay webhooks keep the order paid but queue only one customer receipt.
- Re-ran the focused suite:
  - `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m pytest -q tests/test_payment_security.py tests/test_cashier_order_lifecycle.py`
  - Result: `11 passed, 1 warning`

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

## Cancelled and failed return recovery

Follow-up deployed commit:

- `e784aa94` – `Handle HitPay cancelled returns`

Hosted browser verification:

- Public QR cancelled return:
  - URL shape: `/menu/{token}/payment-success?order_id=47&provider=hitpay&status=cancelled&reference=...`
  - Result: page showed `Payment not completed`, explained the order is still open, and offered `Back to payment options`.
- Public QR failed return:
  - URL shape: `/menu/{token}/payment-success?order_id=47&provider=hitpay&status=failed&reference=...`
  - Result: page showed `Payment needs attention`, explained HitPay returned an unsuccessful status, and offered `Back to payment options`.
- Staff POS cancelled return:
  - URL shape before processing: `/pos?tableId=3&orderId=46&paymentReturn=hitpay&status=cancelled&reference=...`
  - Result: POS showed `HitPay checkout was cancelled for T03. The bill is still open and ready to retry.`
  - URL cleanup removed `paymentReturn`, `status`, and `reference`, leaving `/pos?tableId=3&orderId=46`.
  - Bill #46 remained open/unpaid and retryable.
- Staff POS failed return:
  - URL shape before processing: `/pos?tableId=3&orderId=46&paymentReturn=hitpay&status=failed&reference=...`
  - Result: POS showed `HitPay checkout returned "failed" for T03. The bill is still open and ready to retry.`
  - URL cleanup removed `paymentReturn`, `status`, and `reference`, leaving `/pos?tableId=3&orderId=46`.
  - Bill #46 remained open/unpaid and retryable.

## Remaining acceptance work

HitPay is now usable in sandbox from both public QR and POS, and hosted cancelled/failed return recovery has been verified. The following should still be completed before production acceptance:

1. Repeat with production HitPay credentials/base URL in Render environment variables before real launch.
2. Clean up or replace missing hosted demo product images that currently generate `/uploads/1/products/...` 404s.

Future/hardware lane:

- Verify HitPay customer receipt print jobs with a printer agent or physical printer. This remains important for launch operations, but it is intentionally parked outside the current HitPay software-continuation pass.
