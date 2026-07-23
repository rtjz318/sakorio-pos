# Sakorio final launch polish and iPad simulation report

Date: 2026-07-23  
Branch: `development`  
Live build verified: staff web `POS 2.1.6 a29d2924`  
Scope: remaining 10/10 launch-polish gaps after the final 100-case QA pass and follow-up closure report.

## Executive summary

This pass closed the remaining launch-signoff items that were still practical to fix in code and verify live:

1. Inventory is now removed from day-one launch navigation and direct route access until real stock data/workflows are signed off.
2. HitPay payment return confirmation is now backend-idempotent for already-paid orders, so refresh/back-button returns do not call HitPay again or risk duplicate receipt work.
3. Active table move in the Tables workflow now has iPad-friendly destination cards and inline disabled-state guidance.
4. The iPad/tablet simulation was run through the live browser using explicit viewport overrides for both portrait and landscape.
5. The iPad smoke script now points Orders at the real staff route, `/staff/orders`.

Result: the main POS, Tables, Reservations, Queue, Kitchen, Orders, Reports, My Shift, Inventory guard, and customer QR surfaces passed viewport-controlled iPad checks with no horizontal overflow, no offscreen actionable controls, and no blocking customer name prompt.

## Code changes completed

### 1. Inventory launch guard

Files:

- `front/src/app/services/api.service.ts`

Change:

- Added a day-one launch guard set for tenant UI modules.
- Forced `inventory` to `false` after tenant settings are applied.
- Changed the frontend default module map so Inventory is also hidden during first paint, before settings finish loading.

Why:

- Previous QA found Inventory was structurally stable but operationally empty for launch.
- The safest launch behavior is to hide it from day-one staff navigation and route access until stock data and receiving/deduction workflows are ready.

Live result:

- Direct `/inventory` navigation redirects to `/dashboard`.
- iPad portrait and landscape checks no longer found `Inventory` in the checked nav/body text.

### 2. HitPay return idempotency

Files:

- `back/app/main.py`
- `back/tests/test_payment_security.py`

Change:

- `POST /orders/{order_id}/confirm-hitpay-payment` now returns immediately when the order is already paid:
  - `status: paid`
  - `already_paid: true`
  - current `payment_method`
- Added regression test proving the already-paid path does not call HitPay retrieval again.

Why:

- This hardens the refresh/back-button payment return workflow.
- Even though the lower-level receipt queue already avoided duplicate receipt jobs, the endpoint should still be cleanly idempotent at the API boundary.

Validation:

- `pytest -q tests/test_payment_security.py`
- Result: `12 passed`.

### 3. iPad-friendly table move UX

Files:

- `front/src/app/tables/tables.component.ts`

Change:

- Added large clickable destination cards for active table move.
- Kept the native dropdown as a precise fallback.
- Added inline disabled-state guidance:
  - `Choose a destination table.`
  - `Confirm the guests are physically moving before enabling the transfer.`
- Cards use accessible labels like `Move visit to T05`.

Why:

- Older QA scored table move poorly because the destination selector behaved like a dropdown-only trap on tablet.
- The new design gives waiters an obvious tap-first path while preserving safety confirmation.

Validation:

- Angular production-static build passed.
- Live iPad layout matrix passed Tables in portrait and landscape with no overflow/offscreen controls.

### 4. iPad viewport smoke route correction

Files:

- `front/scripts/test-ipad-viewports.mjs`

Change:

- Updated Orders route from `/orders` to `/staff/orders`.

Why:

- The live staff Orders module is mounted at `/staff/orders`.
- The previous script route could create false negatives during viewport QA.

Validation:

- `node --check front/scripts/test-ipad-viewports.mjs`
- Result: passed.

## Local validation

Commands run:

- Backend syntax:
  - `python -m py_compile back/app/main.py`
  - Result: passed.
- Backend payment tests:
  - `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back pytest -q tests/test_payment_security.py`
  - Result: `12 passed`.
- Frontend production build:
  - `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T front npm run build -- --configuration production-static`
  - Result: passed.
  - Remaining warnings are existing bundle-size/CommonJS warnings, not compile blockers.
- Frontend dev logs:
  - `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --since 10m --tail=120 front`
  - Result: Angular rebuild completed, no active TS/Angular errors.
- iPad smoke script syntax:
  - `node --check front/scripts/test-ipad-viewports.mjs`
  - Result: passed.

## Live deployment verification

Render dashboard showed:

- `restaurant-pos-staging-staff-web`: Deployed
- `restaurant-pos-staging-customer-webv2`: Deployed
- `restaurant-pos-staging-api`: Deployed
- `restaurant-pos-staging-owner-web`: Deployed

Live staff app showed:

- `POS 2.1.6 a29d2924`

## Live iPad/tablet simulation

Method:

- Used the live in-app browser viewport override.
- Simulated:
  - iPad portrait: `820 x 1180`
  - iPad landscape: `1180 x 820`
- Checked:
  - rendered body content,
  - app error text,
  - horizontal overflow,
  - actionable controls rendered offscreen,
  - customer QR blocking name prompt,
  - Inventory launch visibility/route guard.

### Final route matrix

| Viewport | Route / flow | Result | Notes |
| --- | --- | --- | --- |
| iPad portrait | `/dashboard` | Pass | No overflow; Inventory hidden. |
| iPad portrait | `/pos` | Pass | POS shell rendered; no overflow/offscreen controls. |
| iPad portrait | `/tables` | Pass | Tables rendered; no overflow/offscreen controls. |
| iPad portrait | `/reservations` | Pass | Reservations rendered; no overflow/offscreen controls. |
| iPad portrait | `/queue` | Pass | Queue rendered; no overflow/offscreen controls. |
| iPad portrait | `/kitchen` | Pass | KDS standalone board rendered; no overflow/offscreen controls. |
| iPad portrait | `/staff/orders` | Pass | Orders rendered; no overflow/offscreen controls. |
| iPad portrait | `/reports` | Pass | Reports rendered; no overflow/offscreen controls. |
| iPad portrait | `/my-shift` | Pass | My Shift rendered; no overflow/offscreen controls. |
| iPad portrait | direct `/inventory` | Pass | Redirected to `/dashboard`; Inventory hidden. |
| iPad portrait | customer QR | Pass | QR page rendered; no blocking name prompt. |
| iPad landscape | `/dashboard` | Pass | No overflow; Inventory hidden. |
| iPad landscape | `/pos` | Pass | POS shell rendered; no overflow/offscreen controls. |
| iPad landscape | `/tables` | Pass | Tables rendered; no overflow/offscreen controls. |
| iPad landscape | `/reservations` | Pass | Reservations rendered; no overflow/offscreen controls. |
| iPad landscape | `/queue` | Pass | Queue rendered; no overflow/offscreen controls. |
| iPad landscape | `/kitchen` | Pass | KDS standalone board rendered; no overflow/offscreen controls. |
| iPad landscape | `/staff/orders` | Pass | Orders rendered; no overflow/offscreen controls. |
| iPad landscape | `/reports` | Pass | Reports rendered; no overflow/offscreen controls. |
| iPad landscape | `/my-shift` | Pass | My Shift rendered; no overflow/offscreen controls. |
| iPad landscape | direct `/inventory` | Pass | Redirected to `/dashboard`; Inventory hidden. |
| iPad landscape | customer QR | Pass | QR page rendered; no blocking name prompt. |

## Current launch-readiness judgement

For the launch-scoped POS system, the system is now launch-ready from the latest live browser and viewport-controlled iPad simulation.

Launch-scoped areas now verified:

- POS table selection and service shell
- Tables service workflow surface
- Reservations active-service surface
- Queue host surface
- Kitchen/beverage display
- Orders overview route
- Reports route
- My Shift route
- Customer QR safe initial render
- Inventory hidden/guarded for day-one launch
- HitPay return idempotency at backend API boundary

## Remaining non-code operational notes

These are not software blockers from this pass:

1. A physical iPad Safari/Chrome rehearsal is still recommended before opening day, because viewport simulation is very strong but not identical to real touch hardware, browser chrome, camera permissions, and network conditions.
2. Printer/receipt hardware remains a future operational integration item, as previously agreed.
3. Refunds, split payments, table merges, and post-paid corrections remain intentionally guarded/manual for launch unless the business decides to bring them into POS scope later.

