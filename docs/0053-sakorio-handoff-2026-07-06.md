# Sakorio Handoff - 2026-07-06

Repository: `https://github.com/tanjunnan0101/pos`

Branch used locally: `development`

Local path: `C:\Users\Rick\Documents\New project\pos`

## Current Objective

This repo is now the active Sakorio restaurant POS base. The earlier QR/Nest project is no longer the implementation target. Work in this repo has focused on making the existing Angular + FastAPI stack fit Sakorio's restaurant operations flow, especially:

- payment-type sales reporting
- cashier POS workflow refinement
- product category/subcategory editing
- staff navigation into a dedicated cashier surface

## What Was Added Or Changed

### 1. Cashier POS module

Primary frontend surface:

- `front/src/app/cashier-pos/cashier-pos.component.ts`

Route added:

- `/pos`

Purpose:

- dedicated cashier flow separate from the generic orders page
- table-aware item picking
- cart review
- settlement path selection
- reopen / continue / collect-payment handling for live table bills

Implemented direction so far:

- cashier-first screen instead of forcing staff through generic order cards
- product cards support photos where present
- category filtering and product search live in the cashier lane
- selected-table state and linked order state are surfaced inside the cashier flow
- live bill continuation is supported, so staff can add more items to an existing table bill instead of being forced into a fresh order
- queue/history language was tightened toward cashier wording:
  - `Continue`
  - `Settle`
  - `View receipt`
  - `Collect payment`
  - `Resume bill`
- queue ranking now prefers cashier urgency instead of pure recency
- post-settlement recovery now moves the cashier toward the next useful table state

### 2. Reports now include Sakorio payment buckets

Backend:

- `back/app/reports_routes.py`
- `back/app/report_export_i18n.py`
- `back/app/main.py`
- `back/app/models.py`

Frontend:

- `front/src/app/reports/reports.component.ts`
- `front/src/app/reports/reports.component.html`
- `front/src/app/reports/reports.component.scss`

Behavior added:

- reporting grouped by Sakorio payment buckets:
  - `cash`
  - `terminal`
  - `hitpay`
  - `other`
- reports UI shows payment method totals
- CSV export supports payment dataset
- Excel export includes a payment-method worksheet

This is the accepted replacement for the earlier "split payment" wording. There is no multi-payer bill split flow in scope.

### 3. Product category management was expanded

Primary frontend surface:

- `front/src/app/products/categories.component.ts`

Backend support:

- `back/app/tenant_subcategories.py`
- `back/app/tenant_subcategory_routes.py`

Current category-management direction:

- add category
- rename custom top-level category
- delete custom top-level category
- add subcategory
- edit subcategory
- delete subcategory

Important note:

- standard built-in categories remain protected
- custom categories are editable/removable

### 4. Staff shell and navigation were adjusted

Files touched:

- `front/src/app/app.routes.ts`
- `front/src/app/dashboard/dashboard.component.ts`
- `front/src/app/orders/orders.component.ts`
- `front/src/app/shared/sidebar.component.ts`
- `front/src/app/shared/staff-pos-toolbar.component.ts`
- `front/src/app/services/api.service.ts`
- `front/src/app/services/permission.service.ts`

Purpose:

- expose the cashier route as a first-class staff tool
- support new POS/taskboard flows
- keep staff navigation aligned with Sakorio operations

### 5. Deployment/dev proxy updates

Files touched:

- `front/src/proxy.conf.json`
- `haproxy/haproxy.cfg`
- `front/scripts/codex-live-api-proxy.mjs`

Purpose:

- support local development against the live API when needed
- improve local POS iteration without constant Render redeploys

## Working Product State

### Stable enough to keep

- local repo runs and routes correctly through the Angular frontend
- cashier POS route exists
- payment-method reporting exists
- category and subcategory management exists
- product cards can render photos in cashier flow

### Still needs more polish

The cashier workflow is functional, but it is not yet "done done". Remaining effort is mostly UX/product polish, not missing core infrastructure.

The largest remaining refinement area is:

- making the cashier POS feel consistently fast and obvious under real service pressure

That includes continued polish around:

- cart layout density
- payment dock clarity
- table-to-order mental model
- table/order recovery after actions
- product customization modal quality
- grouped order visibility by table

## Important Product Decisions Locked In

- No split-bill or multi-party payment workflow is needed.
- Sales reporting by payment type is required.
- HitPay remains the online payment provider.
- POS product cards should support images where useful.
- The current stack should be extended, not rewritten.

## Files Worth Reading First Next Time

- `docs/SAKORIO_POS_REPO_BRIEF.md`
- `docs/0051-cashier-pos-module-plan.md`
- `docs/0052-sakorio-gap-checklist.md`
- `docs/0053-sakorio-handoff-2026-07-06.md`
- `front/src/app/cashier-pos/cashier-pos.component.ts`
- `front/src/app/products/categories.component.ts`
- `back/app/reports_routes.py`

## Render / Deployment Notes

Before deploying this version to Render:

1. Push the current source to GitHub.
2. Make sure the Render service points at this repo and branch.
3. Confirm build/start commands still match this repo's runtime.
4. Confirm environment variables for:
   - frontend API URL
   - backend database
   - Redis
   - HitPay
   - JWT/auth secrets
5. Run migrations for the current backend before switching traffic.

If the old Render setup was pointing at the previous repo or previous branch, it must be updated to this repo and the correct branch before redeploying.

## Recommended Next Work

1. Finish cashier POS UX polish locally first.
2. Smoke-test:
   - table selection
   - add item
   - customize item
   - continue live bill
   - settle with cash
   - settle with terminal
   - settle with HitPay
3. Verify reports reflect those payment outcomes correctly.
4. Only then promote this repo cleanly onto Render.

## Commit Scope Reminder

This handoff corresponds to the Sakorio customization layer on top of `tanjunnan0101/pos`, not the abandoned QR/Nest codebase.
