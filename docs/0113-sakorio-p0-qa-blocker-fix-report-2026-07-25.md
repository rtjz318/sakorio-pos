# Sakorio P0 QA blocker fix report

Date: 2026-07-25  
Source QA: `0112-sakorio-end-to-end-qa-50-scenario-results-2026-07-25.md`  
Status: fixes implemented, pending live redeploy/browser rerun

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

## Required live browser rerun after redeploy

Run these first:

1. `SKR-20260725-E2E-001` - staff login/session.
2. `SKR-20260725-E2E-002` - POS exits syncing and loads tables/catalog.
3. `SKR-20260725-E2E-004` - clean T02/Bill #229 through UI.
4. `SKR-20260725-E2E-024` - public queue is available.
5. `SKR-20260725-E2E-006` - seat table, fresh QR, QR order, kitchen/order verification.

Only after these pass should the full 50-scenario suite be rerun.
