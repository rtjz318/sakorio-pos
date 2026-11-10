# Morinaga Sunday/After-Midnight Reservations and Billing

Date: 2026-11-10  
Target branch: `development`

## Implemented behaviour

### Reservation dates across midnight

- A service configured as `18:30–04:30` is split truthfully across calendar dates.
- Saturday evening remains bookable on Saturday.
- Sunday `00:00–04:30` remains bookable as the continuation of Saturday service.
- Sunday evening remains closed unless Sunday opening hours are configured separately.
- The calendar and time selector now label an early-hours-only Sunday instead of describing the whole day as generally available.
- After-midnight choices are explicitly labelled in the time selector.

This prevents a booking made for Sunday `01:00` from being stored under the wrong date while still making the operational service-day relationship clear to the guest.

### Morinaga bill calculation

Morinaga menu prices remain advertised base prices. New Morinaga orders use:

1. Menu subtotal
2. 10% service charge on the menu subtotal
3. 9% GST on the subtotal plus service charge
4. Optional tip, if configured and selected

Example:

| Component | Amount |
| --- | ---: |
| Menu item | SGD 5.00 |
| Service charge (10%) | SGD 0.50 |
| GST (9% of SGD 5.50) | SGD 0.50 |
| Customer pays | **SGD 6.00** |

All monetary percentages are calculated in cents and rounded to the nearest cent.

## Data integrity

- Tenant fields: `service_charge_percent`, `prices_include_tax`.
- Order snapshots: `service_charge_percent_applied`, `prices_include_tax_applied`.
- Existing orders with no snapshot keep their historical legacy calculation; the migration does not add new charges retroactively.
- The migration configures the tenant named `Morinaga Ramen Izakaya` with 10% service charge, tax-exclusive menu prices, and a valid 9% GST rate.

## Payment and UI coverage

The authoritative calculation is shared by:

- customer current-order totals;
- staff Orders/POS totals;
- HitPay payment request amount and callback validation;
- cash/terminal amount-due validation;
- reports and collected totals;
- ESC/POS customer receipts;
- printable invoices.

Customer cart, active bill, staff payment modal, invoice, and receipt now show the service/GST breakdown.

## Verification

- Database migration applied successfully in Docker.
- Python compile passed in the backend container.
- Targeted backend suite: **61 passed**.
- Exact SGD 5.00 test: subtotal 500, service 50, GST 50, total 600 cents.
- HitPay regression verifies `amount_cents=600` for the same case.
- Sunday/overnight test verifies Sunday `00:00` is available, Sunday `18:30` is absent, and the response marks the date as after-midnight-only.
- Angular hot-reload build completed without TypeScript or template errors.

## Deployment check

After the `development` deployment finishes:

1. Confirm Morinaga Settings shows default GST 9%, service charge 10%, and tax-inclusive prices off.
2. Create a fresh order (existing open bills intentionally retain their old calculation).
3. Add an SGD 5.00 item and confirm the customer cart and staff bill show SGD 6.00 total.
4. Open HitPay sandbox and confirm the hosted checkout requests SGD 6.00.
5. Print a customer receipt and confirm subtotal, service charge, GST, and total lines.
6. Select the next Sunday on the public reservation page and confirm only after-midnight carry-over times appear when Sunday evening is closed.
