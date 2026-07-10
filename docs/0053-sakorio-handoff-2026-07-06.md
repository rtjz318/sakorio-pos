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
  - `Receipt`
  - `Collect`
  - `Resume`
- queue ranking now prefers cashier urgency instead of pure recency
- post-settlement recovery now moves the cashier toward the next useful table state and next clear bill-ready table
- another compactness pass was applied after the initial handoff:
  - wider floor/table lane in the cashier grid
  - cleaner table-card action hierarchy with the primary operator action surfaced first
  - reduced metadata pressure inside table cards to avoid status / payment wrap collisions
  - denser settlement dock cards and tighter payment-mode layout
  - more predictable outcome / settlement action stacking in narrow counter widths
  - tighter queue/history rail cards with clearer primary/secondary action emphasis
  - safer tablet-width fallback for grouped queue actions and history rows
  - simpler queue-group pills and more direct order-review wording for the cashier rail
  - final cashier copy cleanup so the dock now uses shorter action-first language:
    - `Choose a table to begin`
    - `Live bill with add-ons`
    - `Use terminal`
    - `Take cash`
    - `Ready for a new bill`
  - checkout / queue polish now also includes:
    - a pinned active-settlement summary inside the checkout rail while cart lines scroll
    - the active settlement mode folded into the summary pill row instead of its own column
    - denser grouped queue preview tiles for faster table-by-table scanning
  - an additional Phase D operator-language pass now keeps the cashier rail tighter:
    - selected-table status copy is shorter:
      - `Open bill #...`
      - `Ready to pay #...`
      - `Last settled #...`
      - `No active bill`
    - grouped queue actions are reduced to primary verbs:
      - `Settle`
      - `Resume`
      - `Counter`
    - grouped queue hints were shortened to cashier prompts instead of full sentences
    - no-table checkout empty states now use:
      - `Choose table`
      - `Open floor`
    - grouped queue cards now place the main cashier action first and the order-review action second
    - linked-ticket history pills are shorter:
      - `live`
      - `settled`
      - `tickets`
    - compact settlement mode cards were re-balanced for better tablet scan speed
    - the selected-table dock and payment-state strip were toned down visually so the main checkout CTA carries the weight

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

### 4. Demo floor seeding compatibility

Backend:

- `back/app/seeds/seed_demo_tables.py`

Why it changed:

- the demo floor seed now inserts `is_active` and `seating_zone` when creating a fallback floor row
- this keeps fresh staging/demo databases compatible with the current floor schema instead of failing on missing required fields

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
- repo-wide frontend build hygiene:
  - Angular build currently still fails on unresolved SCSS / SSR path issues outside the cashier module
  - cashier POS work is still valid, but a clean production build for the frontend will require a broader frontend configuration cleanup

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

### Latest cashier polish already completed

- The active settlement summary now stays pinned while the cashier cart scrolls, keeping amount due and the primary action visible during settlement.
- Settlement mode was folded into the summary pills so the checkout rail reads as a single compact decision surface.
- Grouped queue previews were tightened into denser tiles for faster scanning at the counter.
- Table-linked history wording now reads as a cashier recovery rail with shorter `Collect`, `Resume`, and `Receipt` actions and clearer live / awaiting-payment / settled bill states.
- Recovery history tiles were tightened further so action buttons sit like compact counter controls instead of wide full-card CTAs.
- Recovery / reopen transitions now use clearer operator notices for settled-bill review, awaiting-payment bills, and next-table handoff into the catalog.
- Another production-density pass was applied to the cashier and kitchen surfaces:
  - cashier grid widths were rebalanced so the table lane, catalog, and checkout dock each have enough width for tablet service
  - table cards now use cleaner top-row alignment, wider action buttons, and less status/payment wrapping pressure
  - product cards were restructured so thumbnails, copy, price, and CTA buttons stay aligned instead of fighting for vertical space
  - kitchen lane cards now give order IDs, status chips, item names, and dropdown controls more width to prevent overlap in hosted layouts
  - kitchen service lanes now scale down more safely on narrower widths without clipping active ticket content

## Hosted Render State (Current Sakorio Mapping)

This repo is now mapped onto the existing Sakorio Render estate instead of the earlier QR/Nest stack.

### Service mapping

- `restaurant-pos-staging-api`
  - repo: `rtjz318/sakorio-pos`
  - branch: `development`
  - root directory: `back`
  - runtime: Python web service
  - purpose: FastAPI backend
  - public host: `https://api.sakorio.com`

- `restaurant-pos-staging-staff-web`
  - repo: `rtjz318/sakorio-pos`
  - branch: `development`
  - root directory: `front`
  - runtime: Docker web service using `Dockerfile.prod`
  - purpose: staff/station interface
  - public host: `https://staff.sakorio.com`

- `restaurant-pos-staging-owner-web`
  - repo: `rtjz318/sakorio-pos`
  - branch: `development`
  - root directory: `front`
  - runtime: Docker web service using `Dockerfile.prod`
  - purpose: owner/admin interface
  - public host: `https://app.sakorio.com`

- `restaurant-pos-staging-customer-web`
  - repo: `rtjz318/sakorio-pos`
  - branch: `development`
  - root directory: `front`
  - runtime: Docker web service using `Dockerfile.prod`
  - purpose: public ordering / customer-facing surface
  - public host: `https://order.sakorio.com`

- `restaurant-pos-staging-redis`
  - reuse for Redis backing where required by the backend

- Render PostgreSQL
  - active database was recreated and re-seeded for the current Sakorio POS repo
  - backend migrations must target the Render Postgres hostname, not the local `db` Docker hostname, when run from Windows

### Important hosted behavior already fixed

- `order.sakorio.com` no longer needs to share the same authenticated dashboard session behavior as `staff.sakorio.com`
- the public customer surface must stay customer-facing even when staff are signed into the staff surface in another tab/session
- kitchen display now loads the live tickets again on the hosted staff surface

### Known hosted sanity baseline

At the point of this handoff, the following have already been exercised in hosted staging:

- owner app loads on `app.sakorio.com`
- staff app loads on `staff.sakorio.com`
- customer/public ordering loads on `order.sakorio.com`
- backend health and auth are wired through `api.sakorio.com`
- Render database + backend migration path were re-established after the Sakorio repo switch

### Still worth QA after each production-facing deploy

- staff login and role navigation
- POS table selection
- add item to an existing live table bill
- cash settlement
- terminal settlement
- HitPay redirect / callback path
- kitchen display ticket movement
- public order flow remaining isolated from staff sessions

## Commit Scope Reminder

This handoff corresponds to the Sakorio customization layer on top of `tanjunnan0101/pos`, not the abandoned QR/Nest codebase.
