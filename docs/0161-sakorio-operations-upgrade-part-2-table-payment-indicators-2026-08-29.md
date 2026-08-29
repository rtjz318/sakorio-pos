# Sakorio Operations Upgrade — Part 2: Table Payment Indicators

Date: 2026-08-29  
Blueprint: `0159-sakorio-first-iteration-operations-upgrade-blueprint-2026-08-29.md`  
Implementation commit: `da6b8789`  
Branch: `development`

## 1. Outcome

Part 2 is implemented and deployed. Tables, POS, and the floor canvas now consume one server-derived collection state that is independent of kitchen/service state.

The canonical states are:

| API state | Staff label | Colour | Meaning |
| --- | --- | --- | --- |
| `none` | No chip | Neutral | No current billable order. |
| `unpaid` | Unpaid | Red | Billable items exist without confirmed collection. |
| `requested` | Payment requested | Amber | A terminal/bill request or HitPay checkout exists but payment is not confirmed. |
| `paid` | Paid | Green | Every current-session order is settled by an authoritative backend path. |

Each rendered state includes text and an icon, so payment status is not communicated by colour alone.

## 2. Backend contract

`GET /tables/with-status` now returns:

```json
{
  "payment_summary": {
    "status": "none | unpaid | requested | paid",
    "method": "hitpay | terminal | cash | null",
    "requested_at": "ISO timestamp or null",
    "paid_at": "ISO timestamp or null",
    "order_ids": [123]
  },
  "payment_status": "none | pending | paid"
}
```

`payment_summary` is canonical. `payment_status` remains temporarily for compatibility with older deployed clients; `requested` maps to legacy `pending`, while canonical `unpaid` maps to legacy `none`.

## 3. Derivation rules

The backend helper derives payment state from current-session orders and active order items:

1. No current billable order: `none`.
2. All current billable orders settled: `paid`.
3. Any unsettled order has a bill request or HitPay request: `requested`.
4. Otherwise: `unpaid`.

Payment authority remains unchanged:

- HitPay is paid only after server verification/webhook handling sets the order paid.
- Starting or returning from checkout does not prove payment.
- Terminal/cash becomes paid only through an authorised mark-paid action.
- A paid table remains an open table visit until staff closes it.

## 4. Joined-table behaviour

Joined tables merge canonical payment state in this priority:

```text
unpaid > requested > paid > none
```

Every member receives the same merged payment summary and combined order IDs. This prevents a paid member from hiding another member's unpaid bill.

## 5. Staff UI changes

### Tables tiles and list

- Operational state remains its own chip, for example `Open order` or `Ready to serve`.
- The payment chip is displayed beside/below it instead of replacing it.
- Unpaid is red with `!`.
- Payment requested is amber with a clock symbol.
- Paid is green with a check mark.
- Paid labels include method when known: `Paid · Online`, `Paid · Terminal`, or `Paid · Cash`.
- The data-table view and grouped-table summary also expose payment state.

### POS table selector

- Payment state appears under the operational table summary.
- Red, amber, and green states use the same wording and icon logic as Tables.
- Chips remain inside the table card's wrapping layout at tablet widths.

### Floor canvas

- The bottom payment chip now supports all three visible states.
- Table fill remains driven only by operational state.
- The payment legend includes Unpaid, Payment requested, and Paid.
- The selected-table panel shows the same canonical state.

### Internationalisation

The two new labels were added to all shipped locales: English, Spanish, French, Catalan, German, Bulgarian, Simplified Chinese, Hindi, and Urdu.

## 6. Files changed

- `back/app/main.py`
- `back/tests/test_tables_with_status_operational.py`
- `back/tests/test_cashier_order_lifecycle.py`
- `front/src/app/services/api.service.ts`
- `front/src/app/tables/tables.component.ts`
- `front/src/app/tables/tables-canvas.component.ts`
- `front/src/app/cashier-pos/cashier-pos.component.ts`
- `front/public/i18n/*.json`

## 7. Verification evidence

### Backend payment/table regression

Result: **45 passed** across:

- canonical table payment state tests;
- cashier order lifecycle;
- close-table and seated-reservation handling;
- payment security;
- tip/payment flows.

Focused canonical tests additionally passed **11/11** and cover:

- empty/no-bill state;
- unpaid billable order;
- terminal payment request and timestamp;
- HitPay checkout requested but not verified;
- paid order and payment method;
- joined-table unpaid-over-paid priority;
- compatibility field mapping.

### Frontend/compiler

- Angular production-static build: **passed**.
- Latest Docker hot-reload build: **passed**.
- All nine translation JSON files parsed successfully.
- Existing non-blocking warnings remain for Cashier POS/public-menu stylesheet budgets and `dijkstrajs` CommonJS usage.

### Local smoke

- Application returned HTTP `200` through HAProxy.
- Backend health checks remained HTTP `200`.
- Latest frontend/backend container logs showed a successful rebuild and no runtime errors.

### Live deployment

The live `staff.sakorio.com` landing page loaded in the in-app browser with no console errors and displayed version `2.1.6 da6b8789`, proving that the Part 2 implementation is deployed.

The in-app browser currently has no signed-in staff session. Authenticated live visual checks of Tables, POS, and Floor Canvas therefore remain the final deployment checkpoint; no staff password was entered during this verification pass.

## 8. Acceptance status

| Requirement | Status |
| --- | --- |
| Empty table has no payment chip | Passed automated |
| Items without payment request show red Unpaid | Passed automated/build |
| Terminal/bill request shows amber Payment requested | Passed automated/build |
| Unverified HitPay request never shows Paid | Passed automated |
| Confirmed cash payment shows Paid · Cash | Passed automated/build |
| Joined-table unpaid member dominates paid member | Passed automated |
| Operational colour/state remains independent | Passed build/code review |
| iPad-width chips wrap without overlap | Passed layout implementation; live authenticated visual checkpoint pending |
| Live deployment contains Part 2 commit | Passed live |

## 9. Next phase

Part 3 is reservation day-of and table-assignment behaviour:

- public reservations remain unassigned until the host selects a physical table;
- future reservations remain in Reservations but do not appear on Tables/POS early;
- assigned bookings appear on the floor only on the tenant-local reservation date;
- seating activates the table visit atomically;
- table close finishes the seated reservation;
- conflict checks remain server-authoritative.

