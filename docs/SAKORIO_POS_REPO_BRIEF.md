# Sakario POS Repo Brief

Last reviewed: 2026-06-28

Repository: `tanjunnan0101/pos`

Local path: `C:\Users\Rick\Documents\New project\pos`

## 1. Executive Summary

This repository is a full multi-tenant restaurant POS / restaurant operations platform. It is not the same architecture as the scrapped `restaurant-qr-pos-backend` project. The old project can still be used as product reference for QR ordering, HitPay checkout expectations, and printer-agent thinking, but code should not be copied directly without adaptation because this repo uses Angular + FastAPI + SQLModel, not the previous Nest/Prisma stack.

The current repo already contains native HitPay support, public QR/table ordering, staff order management, kitchen/bar displays, tables and reservations, products/catalog/provider flows, inventory, reporting, working-plan/attendance, contracts, courier/provider portals, tenant branding, and deployment docs. It is much broader than a basic POS.

The strongest existing areas are the backend domain coverage, migrations, test coverage, HitPay integration, and operational documentation. The main future modification risk is product/UI complexity: many modules exist, but staff-facing workflows can become hard to operate if we modify without tightening UX around daily restaurant use.

## 2. Runtime Architecture

The system is split into four runtime services:

- `front`: Angular 21 frontend. It serves staff/admin screens, public QR menu, public tenant menu, provider portal, courier portal, booking, feedback, reports, inventory, and settings.
- `back`: Python FastAPI backend on port `8020`. It owns auth, tenancy, products, tables, orders, payments, inventory, reservations, reports, contracts, delivery/social integrations, and migrations.
- `ws-bridge`: FastAPI/WebSocket bridge on port `8021`. It subscribes to Redis pub/sub events and pushes realtime updates to table and tenant clients.
- `db` and `redis`: Postgres 18 and Redis 7. Postgres stores all domain data; Redis powers rate limits, pub/sub, and realtime state.

Traffic is normally routed through HAProxy/nginx:

- `/` goes to the Angular frontend.
- `/api/*` goes to FastAPI.
- `/ws/*` goes to the WebSocket bridge.

Local quick start is documented in `README.md`:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file config.env up -d
```

The dev entrypoint is usually `http://localhost:4202`, with API docs under `/api/docs` and health under `/api/health`.

## 3. Configuration And Deployment

Primary config templates:

- `.env.example`
- `config.env.example`
- `docker-compose.yml`
- `docker-compose.dev.yml`
- `docker-compose.prod.yml`
- `docs/0004-deployment.md`
- `docs/0001-ci-cd-amvara9.md`
- `docs/0026-haproxy-ssl-amvara9.md`

Important environment variables:

- Database: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Redis: `REDIS_URL`
- Auth: `SECRET_KEY`, `REFRESH_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`
- Frontend routing: `API_URL`, `WS_URL`, `CORS_ORIGINS`, `ROOT_PATH`
- HitPay: `HITPAY_MODE`, `HITPAY_API_KEY`, `HITPAY_WEBHOOK_SALT`
- Public URLs: `PUBLIC_APP_BASE_URL`, legal URL overrides
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`
- WhatsApp/Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- Marketing deployment: artifact and branch variables for static marketing sites.

Frontend environment handling:

- `front/src/environments/environment.ts` reads runtime `window.__API_URL__` and `window.__WS_URL__`, falling back to `/api` and `/ws`.
- `environment.prod.ts` protects production by forcing same-origin `/api` and `/ws` if a mismatched external host is injected. This matters for custom domains and avoids frontend pointing to the wrong API host.

Deployment notes:

- Production docs are centered around `amvara9` and `sakario.sg`, not Render.
- Docker images run backend, frontend, ws-bridge, Redis, Postgres, and HAProxy.
- Migrations are executed with `python -m app.migrate`.
- The migration runner tracks applied migrations in `schema_version`.

## 4. Frontend Structure

Frontend root: `front/`

Important files:

- `front/package.json`: Angular 21 app with many test/debug scripts.
- `front/src/app/app.routes.ts`: route map and guards.
- `front/src/app/services/api.service.ts`: large typed API client for almost every backend endpoint.
- `front/src/app/services/auth.service.ts`: user/session handling.
- `front/src/app/auth/role.guard.ts`: route-level role and module guards.
- `front/public/i18n/*.json`: translations in `bg`, `ca`, `de`, `en`, `es`, `fr`, `hi`, `ur`, and `zh-CN`.

Main frontend route groups:

- Public landing and auth: `/`, `/login`, `/register`, `/terms`, `/privacy`, `/forgot-password`, `/reset-password`
- Provider portal: `/provider/login`, `/provider/register`, `/provider`
- Courier portal: `/courier/login`, `/courier`
- QR table menu: `/menu/:token`, `/menu/:token/payment-success`
- Public read-only menu: `/public-menu/:tenantId`
- Booking and reservations: `/book/:tenantId`, `/reservation?token=...`
- Public feedback: `/feedback/:tenantId`
- Staff/admin: `/dashboard`, `/products`, `/catalog`, `/settings`, `/users`, `/contracts`, `/reports`
- Tables: `/tables`, `/tables/canvas`
- Orders and production: `/staff/orders`, `/kitchen`, `/bar`
- Inventory: `/inventory/items`, `/inventory/suppliers`, `/inventory/purchase-orders`, `/inventory/stock`, `/inventory/reports`
- Schedule and attendance: `/working-plan`, `/working-plan/:view`, `/my-shift`

Guarding model:

- `authGuard` protects staff/admin routes.
- `providerGuard` protects provider portal.
- `courierGuard` protects courier portal.
- `uiModuleGuard` hides disabled tenant modules.
- Role guards separate owner/admin/kitchen/bartender/waiter/receptionist/courier/provider access.
- `reservationAccessGuard`, `orderAccessGuard`, `scheduleGuard`, and `permissionGuard` protect feature clusters.

## 5. Key Frontend Modules

### Dashboard

Component: `front/src/app/dashboard/dashboard.component.ts`

Purpose:

- Staff/admin home after login.
- Shows enabled modules, tenant status, quick cards, and navigation into operational areas.
- Uses tenant module flags so not every tenant sees every feature.

### Public QR Menu

Components:

- `front/src/app/menu/menu.component.ts`
- `front/src/app/menu/payment-success.component.ts`

Purpose:

- Customer scans a table token and loads tenant/table/menu context.
- Customer adds items, customizes product questions/modifiers, creates an order, views current and stored orders, requests payment, calls waiter, or pays online through HitPay.
- `payment-success` confirms HitPay payment after redirect and marks order paid through backend verification.

Important behavior:

- Uses table token as the public access key.
- Uses local storage fallback for some order/session continuity.
- Supports HitPay hosted checkout through `createHitPayPaymentRequest`.
- Supports request-payment messaging when staff-assisted settlement is needed.

### Staff Orders

Component: `front/src/app/orders/orders.component.ts`

Purpose:

- Staff order board and operational order editor.
- Supports order status changes, item status changes, quantity updates, line modifier edits, mark paid, finish order, unmark paid, delete/soft delete, factura/invoice printing, and billing customer assignment.

Important behavior:

- Paid orders may remain active until completed/delivered, so kitchen/waiter workflows can continue after payment.
- Invoice/factura print uses browser print with generated invoice HTML.
- Fiscal invoice support exists for Spain/VeriFactu preparation.

### Kitchen And Bar Displays

Component: `front/src/app/kitchen-display/kitchen-display.component.ts`

Purpose:

- Station display for kitchen and bar.
- Same component is reused for `/kitchen` and `/bar` via route data.
- Filters items by route/station/category.
- Shows order timers, urgency, item status, fullscreen mode, sound toggle, and station settings.

Important behavior:

- Uses polling plus WebSocket refresh.
- Avoids full-page reload on background updates to keep kitchen dropdowns and current work stable.
- Supports kitchen station defaults and tenant-specific timer thresholds.

### Tables

Components:

- `front/src/app/tables/tables.component.ts`
- `front/src/app/tables/tables-canvas.component.ts`

Purpose:

- Table list, floor management, QR/PIN/session operations, waiter assignment, and visual floor plan.
- Canvas supports draggable shapes, table groups, seating layout, join/split interactions, and floor positioning.

Important behavior:

- Tables have persistent tokens for QR menu access.
- Table sessions can be activated/closed, PIN regenerated, waiter assigned, and menu token generated.
- Canvas has unsaved-change protection and post-join layout rollback protection.

### Settings

Component: `front/src/app/settings/settings.component.ts`

Purpose:

- Tenant configuration hub.
- Includes tenant profile, taxes, payment/HitPay, SMTP, social posts, delivery integrations, provider settings, kitchen stations, clock QR, tenant data export/purge, reservations, opening hours, branding, legal URLs, and UI module flags.

Important behavior:

- HitPay settings are saved per tenant and empty key fields are not overwritten.
- Currency is forced to SGD in current settings save path.
- Clock QR can be generated and downloaded for printing.

### Products And Catalog

Components:

- `front/src/app/products`
- `front/src/app/catalog`
- provider catalog components.

Purpose:

- Staff product/menu management, categories, subcategories, product images, product questions/customizations, provider catalog imports, and pricing helpers.

### Inventory

Root: `front/src/app/inventory`

Purpose:

- Inventory items, suppliers, purchase orders, receiving, stock levels, valuation, recipe/cost integration, and reports.

### Working Plan / Attendance / Contracts

Components:

- `front/src/app/working-plan`
- `front/src/app/my-shift`
- `front/src/app/staff-contracts`
- settings contract template components.

Purpose:

- Staff schedule, shifts, working plan, clock QR, work sessions, attendance reports, staff contracts, and templates.

## 6. Backend Structure

Backend root: `back/`

Important files:

- `back/app/main.py`: primary FastAPI app and many endpoint groups.
- `back/app/models.py`: core SQLModel domain models and request/response models.
- `back/app/settings.py`: configuration loading and environment validation.
- `back/app/db.py`: SQLModel engine/session setup.
- `back/app/security.py`: JWT, password hashing, current-user helpers.
- `back/app/permissions.py`: RBAC and permission checks.
- `back/app/migrate.py`: SQL migration runner.
- `back/migrations/`: 100 SQL migration files.
- `back/tests/`: pytest coverage for auth, orders, payments, tables, reservations, reports, inventory, tenant isolation, uploads, contracts, schedule, and more.

The backend is mostly monolithic in `main.py`, but many newer feature areas are split into routers/services:

- `inventory_routes.py`, `inventory_models.py`, `inventory_service.py`
- `reports_routes.py`
- `attendance_report_routes.py`
- `staff_contract_routes.py`
- `staff_contract_template_routes.py`
- `delivery_integration_routes.py`
- `pricing_routes.py`, `pricing_service.py`
- `product_bulk_import_routes.py`
- `tenant_lifecycle_routes.py`
- `tenant_subcategory_routes.py`
- `social_routes.py`
- `fiscal_invoice.py`

## 7. Backend Domain Model

Core entities:

- `Tenant`: restaurant/company. Stores business profile, currency/language/timezone, branding, payment settings, HitPay keys, SMTP, reservation settings, kitchen display config, tip settings, fiscal settings, UI module flags, clock QR, and public/legal fields.
- `User`: tenant user or provider user. Roles include owner, admin, kitchen, bartender, waiter, receptionist, courier, and provider.
- `Tax`: per-tenant tax configuration with tax-inclusive logic and validity dates.
- `Product`: global/tenant menu item with price, cost, category/subcategory, image, active/deleted flags, kitchen station route, and customization questions.
- `Provider`, `ProductCatalog`, `ProviderProduct`, `TenantProduct`: provider marketplace/catalog import model.
- `Floor`, `Table`, `TableGroup`: floor plan, table QR/session state, grouping, canvas coordinates, waiter assignment, table token.
- `Reservation`: booking lifecycle with tokenized public access, zone/table seating, reminders, no-show handling, and notes.
- `Order`: tenant/table/customer order with status, payment state, HitPay request id, tips, billing customer, delivery refs, soft-delete fields, and location flags.
- `OrderItem`: product snapshot, quantity, price/cost, customization answers, modifiers, tax snapshot, kitchen station routing, item status, and soft-delete fields.
- `BillingCustomer`, `FiscalInvoice`: customer identity and fiscal invoice/factura metadata.
- `Shift`, `WorkSession`, `WorkSessionBreak`, `WorkSessionAdjustment`: schedule and attendance.
- `KitchenStation`: station routing for kitchen/bar displays.

Inventory entities:

- `InventoryItem`: SKU, category, supplier, unit, reorder levels, stock, average cost, active/deleted status.
- `InventoryBatch`: batch-level stock/cost/expiry.
- `InventoryTransaction`: purchase/sale/adjust/waste/transfer movement history.
- `Supplier`
- `PurchaseOrder`, `PurchaseOrderLine`, receiving flows.
- Recipe models linking products to inventory usage and cost.

## 8. Backend API Areas

Major API clusters:

- Health/version: `/health`, `/health/db`, `/changelog`
- Auth: `/register`, `/token`, `/token/otp`, `/refresh`, `/logout`, `/password-reset/*`, `/ws-token`
- Current user/session: `/users/me`, OTP, work sessions, clock in/out/breaks
- Users/RBAC: `/users`, role update/delete, support access
- Tenant settings: `/tenant/settings`, logo/header uploads, opening hours, kitchen display settings, kitchen stations, clock QR
- Products/catalog: `/products`, `/catalog`, `/providers`, `/tenant-products`
- Public discovery/menu: `/public/tenants`, `/public/tenants/{id}`, `/public/tenants/{id}/menu`, `/public/table-lookup`
- Tables/floors: `/floors`, `/tables`, `/tables/with-status`, table sessions, PIN, QR/menu tokens, waiter assignment, groups
- Reservations: public and staff booking, slots, calendar, status, seating, reminders, no-show/overbooking reporting
- Public QR ordering: `/menu/{table_token}`, order create/update/history/payment request/call waiter
- Staff orders: `/orders`, status changes, item changes, mark paid, finish, unmark, delete, billing/fiscal invoice
- HitPay: order checkout create, confirm, webhook
- Inventory: items, suppliers, purchase orders, receiving, recipes, stock, reports, valuation
- Reports: sales, exports, live reports, attendance excel
- Working plan/schedule: shifts, copy week, export, planned vs actual, compliance
- Contracts/templates: staff contract generation and template management
- Delivery integrations: provider config, mappings, events, webhook ingest
- Social marketing: Meta OAuth, connections, posts
- Tenant lifecycle: export and purge

## 9. HitPay Integration

This repo already supports HitPay. The main implementation is in `back/app/main.py` around the HitPay helper functions and endpoints.

Backend flow:

1. Customer order exists and has a table token.
2. Frontend calls `POST /orders/{order_id}/create-hitpay-payment-request`.
3. Backend validates table token, tenant, order amount, and configuration.
4. Backend creates a HitPay payment request via:
   - Sandbox base: `https://api.sandbox.hit-pay.com/v1`
   - Live base: `https://api.hit-pay.com/v1`
5. Backend stores `order.hitpay_payment_request_id`.
6. Backend returns hosted checkout URL.
7. Customer is redirected to HitPay.
8. Redirect returns to `/menu/:token/payment-success?order_id=...&provider=hitpay`.
9. Frontend calls `POST /orders/{order_id}/confirm-hitpay-payment`.
10. Backend retrieves payment request from HitPay, validates status, amount, currency, and reference, then marks order paid.

Webhook flow:

- Endpoint: `POST /payments/hitpay/webhook`
- Validates `Hitpay-Signature` with tenant or global webhook salt.
- Extracts order id from metadata/reference.
- Validates amount/currency/reference.
- Marks order paid if event/status indicates completed payment.

Config resolution:

- Tenant-level `hitpay_api_key`, `hitpay_webhook_salt`, and `hitpay_mode` are preferred.
- Global fallback uses `HITPAY_API_KEY`, `HITPAY_WEBHOOK_SALT`, and `HITPAY_MODE`.
- Current POS-wide currency is SGD only, per `back/app/tenant_currency.py`.

Future modification warning:

- Do not use fake HitPay URLs. Always create a real payment request through backend and use the `url` returned by HitPay.
- If adding multi-client live onboarding, prefer tenant-level HitPay settings so each restaurant can use its own HitPay account.

## 10. Realtime System

Realtime path:

1. Backend order/table/reservation changes publish to Redis channels.
2. `ws-bridge` subscribes to:
   - `orders:table:*`
   - `orders:tenant:*`
   - `reservations:tenant:*`
3. Browser clients connect to `/ws`.
4. Table clients are validated via backend internal table-token validation.
5. Tenant/staff clients are validated with JWT and tenant id.
6. Updates are broadcast to connected table or tenant clients.

This allows customer menus, staff order boards, kitchen display, and reservation surfaces to update without manual refresh. Some screens still combine polling and WebSocket updates for resilience.

## 11. Printing

Current repo contains strong printing documentation in `docs/PRINTING.md`.

Key principle:

- A cloud backend cannot directly print to restaurant WiFi/LAN printers.
- Printing needs an agent or bridge running inside the restaurant network.

Recommended patterns documented:

- Browser-to-local WebSocket bridge, such as WebApp Hardware Bridge.
- Browser extension plus native host.
- Headless Node/Python print agent that polls or subscribes to backend jobs.

Current code state:

- Staff orders can print invoices/facturas through browser print.
- There is no full production print-agent implementation committed as a core runtime service.
- If automatic kitchen/customer receipts are required later, build a print-job queue plus LAN print agent rather than trying to make the cloud API print directly.

## 12. Security And Tenant Isolation

Security documentation:

- `docs/SECURITY-REVIEW.md`
- `docs/0009-table-pin-security.md`
- `docs/0020-rate-limiting-production.md`
- `.cursor/rules/security-secrets-tenant.mdc`

Implemented controls:

- JWT access token plus refresh token.
- `HttpOnly` cookies; secure cookies when `PRODUCTION=true`.
- User token version for revocation.
- OTP/TOTP support.
- Role and permission guards.
- Tenant-scoped resource queries for sensitive resources.
- Rate limiting through SlowAPI and Redis.
- Upload validation and explicit blocking of public contract uploads.
- Password reset token hashing.
- HitPay webhook signature validation.

Known security notes:

- Refresh token rotation is not implemented; review if higher assurance is needed.
- CORS must be locked to real production domains.
- Public table tokens and PIN flows depend on rate limits and good token hygiene.
- Any new endpoint that accepts `id` must filter by tenant/provider scope in the same query.

## 13. Test Coverage

Backend tests live in `back/tests/`.

Coverage includes:

- Attendance exports and registro horario Excel.
- Public booking day/week/month slots.
- Table close/session behavior.
- Contact validation.
- Delivery adapters and encrypted credentials.
- Fiscal invoice API.
- Guest feedback.
- Inventory unit conversion.
- Kitchen stations.
- Line modifiers.
- Menu order price fallback.
- Opening hours.
- Order prepay and tips.
- Overbooking detection.
- Password reset.
- Payment security.
- Provider APIs.
- Pricing service.
- Product deletion, bulk import, and customization.
- Public menu/order responses.
- Public table lookup.
- Public tenants/menu.
- Reservation emails/reminders/seating.
- Schedule auth/bulk/copy/export.
- Tenant IDOR order security.
- Session isolation.
- Settings defaults.
- Staff contracts and templates.
- Tables with operational status.
- Table groups.
- Tenant currency.
- Tenant lifecycle.
- UI module flags.
- Upload security.
- Work sessions.

Frontend has many Puppeteer/debug scripts under `front/scripts/`, including tests for tables, reports, order/tip flows, register, provider flows, catalog, websocket, working plan, kitchen status dropdown, and staff menu links.

## 14. Documentation Map

Important docs:

- `README.md`: project overview, features, and quick start.
- `ROADMAP.md`: completed/missing feature plan. Contains some stale Stripe wording, see risks below.
- `CHANGELOG.md`: very detailed user-visible release notes.
- `docs/0004-deployment.md`: deployment process.
- `docs/0014-provider-portal.md`: provider portal.
- `docs/0015-kitchen-display.md`: kitchen/bar display.
- `docs/0016-reports.md`: reporting.
- `docs/0017-billing-customers-factura.md`: billing/fiscal invoice.
- `docs/0021-working-plan.md`: working plan.
- `docs/0028-tenant-public-branding.md`: branding.
- `docs/0031-order-customizations-plan.md`: customization roadmap.
- `docs/0032-github-issues-roadmap.md`: issue roadmap.
- `docs/PRINTING.md`: printing architecture.
- `docs/SECURITY-REVIEW.md`: security pass.
- `docs/testing.md`: test guidance.

## 15. Product Capabilities By Section

### Tenant And Auth

- Multi-tenant restaurant registration.
- Role-based staff access.
- Provider and courier portal access.
- OTP support.
- Password reset.
- Tenant branding and public profile.
- Tenant UI module toggles.

### QR Table Ordering

- Table token opens public menu.
- Customer can add items, answer customization questions, see existing orders, request payment, call waiter, and pay via HitPay.
- Table token is linked to table/session and validates public access.
- Payment success flow verifies HitPay before marking paid.

### Staff Orders

- Staff sees active orders.
- Orders can be moved through statuses.
- Items can be updated or individually statused.
- Orders can be marked paid/finished/unmarked/deleted.
- Billing customer and invoice/factura support exists.

### Kitchen / Bar

- Kitchen and bar displays are split by route/station.
- Item-level status and station routing are supported.
- Fullscreen and audio alert controls exist.
- Kitchen timer thresholds are tenant-configurable.

### Tables / Floor

- Floors, table cards, table canvas, table groups, QR/PIN/session control.
- Staff can activate/close tables, assign waiters, regenerate PINs, and access staff menu links.
- Canvas supports shape placement and joined tables.

### Reservations

- Public booking page.
- Staff reservation management.
- Slots, day/week/month views.
- No-show, overbooking, seating zones, reminders.
- WhatsApp reminder hooks exist.

### Products / Menus / Catalog

- Product CRUD with images.
- Categories and subcategories.
- Product questions/customizations.
- Provider catalog and tenant product imports.
- Bulk import with JSON and menu-photo vision preview.
- Pricing helper and recipe cost integration.

### Payments / Tax / Fiscal

- HitPay hosted checkout for online payments.
- Staff cash/card terminal mark-paid flows.
- Tip support.
- GST/tax-inclusive logic.
- Billing customers.
- Fiscal invoice/factura preparation.

### Inventory

- Items, suppliers, purchase orders, receiving, recipes, stock levels, valuation, low-stock, transactions.
- Unit conversion supports piece, weight, and volume units including `cl`.

### Staff Operations

- Working plan and schedules.
- Clock QR and work sessions.
- Attendance exports.
- Staff contract templates and generated contracts.

### Reports

- Sales/report APIs.
- Export support.
- Live reports.
- Attendance and planned-vs-actual reporting.

### Integrations

- HitPay payment requests and webhooks.
- SMTP email.
- Twilio WhatsApp reminders.
- Delivery marketplace configuration and webhook ingest.
- Meta social posts/OAuth.

## 16. Known Risks, Mismatches, And Technical Debt

- `ROADMAP.md` still contains stale wording around Stripe in at least one completed/payment note. Current code and recent commits are HitPay-first.
- `docs/SECURITY-REVIEW.md` has a stale sentence saying there are no inbound HitPay webhooks. Current code has `POST /payments/hitpay/webhook`.
- Backend `main.py` is very large. New feature work should prefer separate routers/services rather than adding more monolithic logic.
- Frontend `api.service.ts` is very large. New API areas should consider feature-specific services for maintainability.
- Printing is documented but not fully implemented as an automatic LAN print-agent product flow.
- Currency is effectively SGD-only in current HitPay/payment settings despite some multi-currency-looking fields.
- Product scope is very broad. Before major UI modification, decide whether the market-ready product is restaurant POS only or also provider/courier/marketing ERP.
- Public QR flow, staff order flow, kitchen display, table operations, and payment reconciliation should be smoke-tested together after any change.

## 17. What To Reuse From The Scrapped Project

Safe to reuse conceptually:

- HitPay operational lessons: tenant-level credentials, hosted checkout URL must come from API, webhook/return verification, sandbox/live separation.
- Printing product expectations: customer receipt plus kitchen ticket after payment/order confirmation.
- QR menu UX expectations and table-specific checkout flow.
- Render/domain deployment lessons, if this repo is later deployed to Render instead of the current documented stack.

Do not copy directly without rework:

- Nest/Prisma modules.
- Prisma migrations.
- React/Next UI code.
- Any hardcoded provider enums or table/tenant assumptions.

This repo already has its own data model and routes. Any migration from old code should be translated into the existing FastAPI/SQLModel/Angular patterns.

## 18. Recommended Modification Strategy

Before changing features, lock down the target MVP surface:

1. Staff POS daily flow: table selection, item add/edit, cart, checkout, payment, receipt, order handoff.
2. Customer QR flow: scan table, order, HitPay, confirmation, live status.
3. Kitchen flow: paid/confirmed orders arrive, station status is clear, completed items/orders are visible.
4. Table/floor flow: table state, active orders, clear table, QR health.
5. Owner/admin flow: products, menu, payment settings, staff users, reports.

Recommended first engineering pass:

- Create a short smoke-test checklist for the five flows above.
- Verify existing HitPay settings UI and backend payment flows in sandbox.
- Decide whether automatic printing is in-scope now; if yes, design print-job queue and LAN agent.
- If UI is being redesigned, do it on top of existing APIs instead of replacing backend behavior.
- Keep tenant isolation and rate limiting tests passing after every API change.

## 19. Suggested Future Briefs

Create separate implementation briefs before modifying:

- `STAFF_POS_UX_REDESIGN_BRIEF.md`: cashier/table/kitchen UX target and API mapping.
- `HITPAY_PRODUCTION_RUNBOOK.md`: tenant onboarding, sandbox/live, webhook, reconciliation, refund handling.
- `PRINT_AGENT_IMPLEMENTATION_BRIEF.md`: print job schema, agent auth, kitchen/customer receipt templates, retry logic.
- `MARKET_READY_MVP_CHECKLIST.md`: exact go-live requirements for a Singapore restaurant pilot.

## 20. Cashier POS Module Direction

A dedicated cashier POS module is now the recommended next frontend product layer for this repo.

See:

- [0051-cashier-pos-module-plan.md](0051-cashier-pos-module-plan.md)

Summary:

- Current repo already has the backend primitives for table state, staff order management, mark paid, finish order, item status control, and HitPay checkout.
- What is missing is a cashier-first route that unifies table selection, menu picking, cart review, payment, and kitchen handoff into one screen.
- The safest implementation path is additive:
  - new `/pos` route
  - Angular cashier module under `front/src/app/cashier-pos/`
  - reuse current `ApiService` methods and order/table endpoints
  - preserve existing `/tables`, `/staff/orders`, and `/kitchen`

This should be treated as the main staff-facing product refinement track if the goal is a market-ready restaurant terminal experience.
