# 0074 — HitPay Final Retest on `0e59ede8`

Date: 2026-07-18  
Environment: live Sakorio staging domains  
Build observed: POS 2.1.6 `0e59ede8`  
Browser-only rule: followed.

## Scope

Retest the customer QR → HitPay path after the latest POS/Tables/Kitchen polish deploy.

## Result

Partial pass / provider iframe automation blocked final card completion.

The Sakorio side of the workflow passed:

- Staff opened T04 for QR ordering through the new Tables drawer CTA.
- Customer QR became orderable.
- Customer created order `#57`.
- Order amount was non-zero: `1 x Coca Cola`, SGD 3.00.
- Customer checkout showed `Pay with HitPay` and `Pay with Card at Table`; Cash was not shown.
- HitPay sandbox checkout opened for `SGD 3.00`.
- Sakorio recovery URL correctly showed: `HitPay checkout was cancelled for T04. The bill is still open and ready to retry.`
- Staff POS showed bill `#57` still open and payable.
- Cleanup was completed via Terminal payment.
- T04 returned to `Available / Ready for order`.
- Customer QR returned to `Table Closed`.

## Blocked point

The hosted HitPay sandbox card form is served inside Stripe's secure payment iframe. During this browser automation run, the iframe fields did not accept automated test-card input even after direct coordinate and tab-order attempts. Because of that, this run did not produce a new successful HitPay-paid order.

This is not evidence that Sakorio's HitPay integration failed. The earlier successful browser sandbox run remains valid in `0068`:

- Order `#54`
- `1 x Coca Cola`
- SGD 3.00
- Payment method: HitPay
- Table cleanup passed

## Recommendation

For final launch sign-off, complete one manual sandbox card payment in the visible browser if needed. Automated QA can continue to validate:

1. Sakorio creates the HitPay checkout.
2. Customer checkout excludes Cash.
3. Cancelled/abandoned checkout returns/recovery keep the bill retryable.
4. Staff can settle by Terminal and clear the table.

## Cleanup

Order `#57` was settled by Terminal only for cleanup. T04 was returned to Available.
