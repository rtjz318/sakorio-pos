# Sakorio P0 QA blocker fix report

Date: 2026-07-25  
Source QA: `0112-sakorio-end-to-end-qa-50-scenario-results-2026-07-25.md`  
Status: fixes implemented, redeployed, and P0 browser checks rerun

## Fixes completed

### 1. Staff auth/session and live API routing

Problem found in browser QA:

- Staff login could succeed once, then later fail or protected routes redirected back to login.
- POS/queue behavior suggested that live frontend domains were trying to use same-origin `/api`.

Root cause addressed:

- The standalone production frontend has no nginx `/api` proxy.
- `index.html` defaults `window.__API_URL__` to the current frontend host `/api`.
- `environment.staging.ts` also rejected absolute API URLs when the API host differed from the frontend host.

Change made:

- `staff.sakorio.com`, `order.sakorio.com`, `sakorio.com`, and the Render staging frontend hosts now fall back to `https://api.sakorio.com` when runtime API injection is absent or points to same-origin `/api`.
- WebSocket fallback now points to `wss://api.sakorio.com/ws` for the same Sakorio frontend hosts.
- Absolute runtime API URLs are no longer discarded just because they use a different host.

Files changed:

- `front/src/environments/environment.staging.ts`
- `front/src/environments/environment.prod.ts`

Expected live impact after redeploy:

- Staff login should authenticate against the real API service instead of the static frontend host.
- Protected routes should stop randomly falling back to login due to failed same-origin API calls.
- Public reservation/queue/QR flows should call the correct API origin.

### 2. POS stuck on Syncing

Problem found in browser QA:

- `/pos` showed `Tables loaded: Syncing`, `Open bills: Syncing`, `Paid today: Syncing`, `Catalog: Syncing`, `0 loaded`, and `Loading floor tables…`.

Root cause addressed:

- POS startup was preloading product questions for every legacy product before completing the board load.
- With the imported menu size, this can create a very large fan-out of product-question API calls and hold the whole POS screen hostage.

Change made:

- POS now loads settings, tables, orders, tenant menu, and legacy menu directly.
- Product-question preloading no longer blocks the cashier floor/menu shell.
- If optional data fails, POS exits loading and shows a partial-load warning rather than remaining in indefinite `Syncing`.

File changed:

- `front/src/app/cashier-pos/cashier-pos.component.ts`

Expected live impact after redeploy:

- POS should render the floor/table grid much faster.
- Cashier can proceed with table selection and menu actions even if optional product-question data has issues.
- Any remaining API problem should be visible as a recoverable warning, not a frozen board.

### 3. QR invalid/expired handoff messaging

Problem found in browser QA:

- Old QR link returned a generic `Menu / Not found` screen.

Change made:

- QR menu error state now explains whether the table link is inactive/expired, not open for ordering, or temporarily unavailable.
- Customer is instructed to ask staff to reopen the table or scan a fresh QR.

Files changed:

- `front/src/app/menu/menu.component.ts`
- `front/src/app/menu/menu.component.html`

Expected live impact after redeploy:

- Expired/invalid QR links become service-recoverable instead of confusing.
- Staff can quickly explain to customers that the table must be reopened/regenerated.

### 4. Public queue unavailable

Problem found in browser QA:

- Public waitlist loaded but showed `The queue is temporarily unavailable. Please speak to the host.`

Fix path:

- No separate queue endpoint code change was required yet.
- The API-origin fix should address the most likely cause: customer frontend calling same-origin `/api` on a static web service rather than the backend API service.

Expected live impact after redeploy:

- `/waitlist/1` should call `https://api.sakorio.com/public/tenants/1/queue` and receive queue info.
- If queue still fails after redeploy, the next issue is backend data/config rather than frontend API routing.

### 5. Stale QA bill #229

Problem found in browser QA:

- Tables showed T02 with `Live order` and `Bill #229`.

Fix path:

- No destructive live data mutation was made in code.
- This must be cleaned through the live staff UI after the API/POS fixes deploy, because settlement/close-table truth must stay auditable.

Expected live impact after redeploy:

- POS should load again so the stale bill can be settled/closed/reset through the visible UI.
- The next regression should begin by clearing T02/Bill #229 before running QR/payment scenarios.

## Verification completed locally

- Local app HTTP smoke: `http://127.0.0.1:4202/` returned `200`.
- Frontend dev hot reload compiled successfully after edits.
- Production-static Angular build passed:
  - Command: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T front npm run build -- --configuration production-static`
  - Result: success.
  - Notes: existing stylesheet budget/CommonJS warnings only; no TypeScript/Angular errors.
- Docker logs checked after changes:
  - Backend health checks continued returning `200`.
  - Frontend bundle generation completed successfully.

## Live browser verification after redeploy

Redeployed commit: `ff97e03c`  
Staff service: `restaurant-pos-staging-staff-web`  
Render result: deploy live on 2026-07-25, approximately 12:33 AM SGT

### SKR-20260725-E2E-001 - staff login/session

Result: **PASS for this gate**

- Live URL: `https://staff.sakorio.com/login`
- Login with staff credentials reached `https://staff.sakorio.com/dashboard`.
- Dashboard displayed build `2.1.6 ff97e03c`.
- No browser console errors were observed during login.

### SKR-20260725-E2E-002 - POS exits Syncing

Result: **PASS for this gate**

- Live URL: `https://staff.sakorio.com/pos`
- POS loaded successfully after redeploy.
- Observed live values:
  - Tables loaded: `10`
  - Open bills: `1` before cleanup, then `0` after cleanup
  - Paid today: `SGD 0.00` before cleanup, then `SGD 12.00`
  - Catalog: `112`
- The old indefinite `Syncing` state did not recur.
- No browser console errors were observed.

### SKR-20260725-E2E-004 - stale T02/Bill #229 cleanup

Result: **PASS for cleanup**

- POS showed T02 with `Bill #229 ready`, amount `SGD 12.00`.
- Used live POS payment panel with staff terminal settlement.
- POS updated:
  - `Terminal payment recorded for T02`
  - Open bills dropped from `1` to `0`
  - Paid today became `SGD 12.00`
- Used the visible final confirmation:
  - Dialog title: `Close T02?`
  - Copy: resets the table, ends QR ordering, moves bill to History
  - Confirmed via `Yes, close table`
- Final live state:
  - T02 displayed `Available / Ready for order`
  - `Bill #229` no longer appeared on the current POS floor

### SKR-20260725-E2E-024 - public queue availability

Result: **PASS for availability gate**

- Live URL: `https://order.sakorio.com/waitlist/1`
- The previous `The queue is temporarily unavailable. Please speak to the host.` alert was gone.
- Queue page displayed:
  - Ajisen Ramen
  - 0 parties ahead
  - Name, mobile, party size, notes fields
  - Join queue button disabled only because required fields were empty
- No browser console errors were observed.

### SKR-20260725-E2E-006 / QR handoff gate

Result: **PASS for fresh QR load**

- Opened T02 from live POS after cleanup.
- POS drawer showed:
  - T02 QR handoff
  - 112 menu items
  - Menu categories: Deep Fried Menu, Drink Menu, Izakaya Menu, Noodle & Rice Menu, Quick Bites, Stir Fried Menu
- Opened the fresh T02 QR:
  - `https://order.sakorio.com/menu/98091cef-5f1d-46dd-bbec-c64d78b45e47?...`
- Customer QR loaded:
  - Ajisen Ramen
  - T02
  - Current order: no active order
  - 112 menu items
  - Product images and Add buttons visible
- T02 remained `Available / Ready for order` afterward because no customer order was submitted.
- No browser console errors were observed.

### Old QR recovery messaging

Result: **PASS for customer-facing recovery**

- The old T07 QR no longer showed a bare `Not found`.
- It displayed a clear `Table Closed` state:
  - `This table is not currently accepting orders. Please ask a member of staff for assistance.`

## Remaining note

These fixes clear the original P0 blockers from the first 50-scenario pass. The system still needs the full 50-scenario regression rerun now that the gates are open again.

## Required full rerun

Run these first:

1. `SKR-20260725-E2E-001` - staff login/session.
2. `SKR-20260725-E2E-002` - POS exits syncing and loads tables/catalog.
3. `SKR-20260725-E2E-004` - clean T02/Bill #229 through UI.
4. `SKR-20260725-E2E-024` - public queue is available.
5. `SKR-20260725-E2E-006` - seat table, fresh QR, QR order, kitchen/order verification.

Only after these pass should the full 50-scenario suite be rerun.
