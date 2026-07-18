# Sakorio HitPay Sandbox Validation — 2026-07-18

Surface: browser-only QA on deployed Sakorio domains  
Staff domain: `https://staff.sakorio.com`  
Customer/payment provider: HitPay sandbox checkout  
Build observed in deployed UI: `POS 2.1.6 ab27b5df`

## Result

HitPay sandbox success path passed. Cancelled/abandoned recovery UI passed through Sakorio's `paymentReturn=hitpay&status=cancelled` return handler. The test table was cleaned up after both runs.

## Test 1 — Non-zero HitPay success

Steps run:

1. Logged in to staff domain through the browser.
2. Opened POS.
3. Selected T04.
4. Added `1x Coca Cola` for `SGD 3.00`.
5. Opened Checkout.
6. Selected HitPay.
7. Created the hosted HitPay sandbox checkout.
8. Completed payment with a sandbox card.
9. Returned to Sakorio POS.
10. Verified POS, Tables, and Orders.
11. Cleared T04 after payment.

Evidence:

- Order created: `#54`
- Table: `T04`
- Item: `1x Coca Cola`
- Amount: `SGD 3.00`
- Payment method shown in history: `HitPay`
- POS return after payment: `https://staff.sakorio.com/pos?tableId=4&orderId=54`
- POS table state after payment: `T04 4 seats Ready Last bill #54 Paid`
- Orders → Not Paid Yet: no unpaid orders
- Orders → Order History row: `#54 T04 - 1x Coca Cola SGD 3.00 Paid`
- Tables state after clear: `T04 4 Seats Idle table`

Outcome: pass.

## Test 2 — Cancelled / abandoned HitPay recovery

Steps run:

1. Re-opened POS.
2. Selected T04 again after it was cleared.
3. Added `1x Coffee` for `SGD 2.50`.
4. Opened Checkout.
5. Selected HitPay.
6. Created a second hosted HitPay sandbox checkout.
7. Attempted HitPay checkout Back/cancel route.
8. Verified Sakorio's cancelled-return recovery by opening the supported return URL:
   `https://staff.sakorio.com/pos?tableId=4&orderId=55&paymentReturn=hitpay&status=cancelled`
9. Confirmed bill remained open and retryable.
10. Cleaned up by recording Terminal payment and clearing T04.

Evidence:

- Order created: `#55`
- Table: `T04`
- Item: `1x Coffee`
- Amount: `SGD 2.50`
- Recovery message: `HitPay checkout was cancelled for T04. The bill is still open and ready to retry.`
- Recovery state label: `HitPay cancelled`
- Recovery copy: `The hosted checkout was cancelled or left unpaid. The bill is still open and can be retried.`
- Retry options visible: Staff cash, Terminal, HitPay
- Cleanup payment method: Terminal
- POS table state after cleanup: `T04 4 seats Available Ready for order`

Outcome: pass with note.

## Note / improvement watch

HitPay's visible `Back` button on the sandbox checkout did not redirect back to Sakorio during this browser run. Sakorio's cancelled-return handler works when HitPay or a return URL supplies `paymentReturn=hitpay&status=cancelled`, and an abandoned checkout leaves the bill open and retryable. For launch, staff training should treat a guest closing or abandoning HitPay as an open bill that can be retried or settled by terminal.

