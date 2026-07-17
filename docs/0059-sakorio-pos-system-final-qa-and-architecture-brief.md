# Sakorio POS system final QA and architecture brief

Date: 2026-07-17  
Live QA surface: `https://staff.sakorio.com` and `https://order.sakorio.com`  
Repository branch: `development`  
Purpose: one working brief for launch QA, future development, onboarding, and system maintenance.

## 1. Executive summary

Sakorio is a multi-tenant restaurant operating system, not only a cashier POS. The system covers:

- staff login and role-based navigation
- table-first POS and checkout
- public QR table ordering
- HitPay payment request/webhook flow
- table and floor management
- staff order overview
- kitchen and beverage production board
- reservations, booking, queue, and guest feedback
- products, catalog, providers, and tenant menu management
- customers for invoice billing
- reports and attendance reports
- working plan, shift scheduling, clock-in/out, and payroll readiness
- inventory, suppliers, purchase orders, stock dashboard, and inventory reports
- users, permissions, staff contracts, settings, tenant branding, kitchen stations, SMTP, legal URLs, and operational configuration

The live browser QA pass found the system broadly operational across the full staff surface. The main remaining findings are small UI polish items and one real schedule data warning, not core route failures.

## 2. Final browser QA pass

QA was performed in the browser on the live Sakorio domains. No local login was used for UI/UX QA.

### 2.1 QA scope

Authenticated staff routes checked:

| Area | Route |
|---|---|
| Dashboard | `/dashboard` |
| Attendance | `/my-shift` |
| POS | `/pos` |
| Orders | `/staff/orders` |
| Reservations | `/reservations` |
| Queue | `/queue` |
| Tables | `/tables` |
| Floor canvas | `/tables/canvas` |
| Kitchen and beverages | `/kitchen` |
| Customers | `/customers` |
| Products | `/products` |
| Catalog | `/catalog` |
| Reports | `/reports` |
| Working plan week | `/working-plan/week` |
| Working plan calendar | `/working-plan/calendar` |
| Inventory dashboard/items | `/inventory`, `/inventory/items` |
| Inventory suppliers | `/inventory/suppliers` |
| Inventory purchase orders | `/inventory/purchase-orders` |
| Inventory stock | `/inventory/stock` |
| Inventory reports | `/inventory/reports` |
| Users | `/users` |
| Contracts | `/contracts` |
| Settings | `/settings` |

Public guest routes checked:

| Area | Route |
|---|---|
| Public table menu | `https://order.sakorio.com/menu/3b89cb81-33d4-402d-acc6-0be4a45d9b68` |
| Public booking | `https://order.sakorio.com/book/1` |

### 2.2 QA result summary

| Check | Result |
|---|---|
| Authenticated route access | Passed; no staff route dropped back to login after sign-in |
| Staff route rendering | Passed; all 24 staff routes produced visible content |
| Public menu rendering | Passed; menu, current order, order history, categories, and product headings loaded |
| Public booking rendering | Passed; party size, date/time, seating, guest details loaded |
| Global horizontal page overflow | Passed; no tested route had full-page horizontal overflow |
| Browser console errors | Passed in the summarized sweep; no blocking console errors surfaced |
| Settings tabs | Passed; tab container no longer overflows horizontally in the tested viewport |
| My shift profile selector | Passed; live page showed profile selector workflow |
| POS table-first indicators | Passed; POS showed floor/table context and payment/checkout vocabulary |
| Orders table overview indicators | Passed; orders showed table-oriented overview headings |
| Kitchen route switcher | Passed; All/Kitchen/Beverages indicators present |
| Working plan add/clock-in indicators | Passed; Add shift / Clock in / Calendar indicators present |
| Inventory routes | Passed; all inventory subroutes loaded |

### 2.3 QA findings

| Priority | Finding | Evidence | Recommendation |
|---|---|---|---|
| P2 | Tables page has clipped button text | `Orders for this table` buttons measured wider than the available button box | Shorten label to `Orders`, add a title/tooltip, or allow the button to grow/wrap |
| P2 | Working plan calendar shift lines truncate staff/time text | Calendar shift line for `Jason Tan (Waiter) 09:00–17:00` exceeded its visible cell width | This is partly expected for dense month calendar, but add hover/title detail or a shift detail drawer for clarity |
| P1 data/admin | Schedule compliance warning is active | `Jason Tan: planned 41h 30m in week starting 2026-07-13 (weekly limit 40h)` | Manager should adjust rota or explicitly accept overtime; this is real operational data, not a code bug |
| P2 deployment hygiene | Live sidebar/footer reported hash `ae992046` during QA | The live UI can still render expected features, but displayed commit hash did not match the latest pushed commit | Check Render/hosting `COMMIT_HASH` injection or deploy process so the footer is trustworthy |

### 2.4 Launch interpretation

The core POS system is usable and broad route coverage is healthy. The remaining launch work should focus on:

1. resolving the schedule compliance warning before real payroll use;
2. polishing clipped labels on Tables and Working Plan calendar;
3. confirming deployment hash accuracy;
4. running payment-provider sandbox/live end-to-end tests with a controlled order;
5. creating stable browser E2E scripts for the exact launch workflows.

## 3. Runtime architecture

| Layer | Technology | Main responsibility |
|---|---|---|
| Frontend | Angular standalone components | Staff app, public guest app, provider/courier portals, UI state, browser workflows |
| Backend | FastAPI | Auth, tenancy, orders, payments, reservations, tables, reporting, schedules, inventory, integrations |
| ORM | SQLModel / SQLAlchemy | Typed database models and request/response schemas |
| Database | PostgreSQL | Multi-tenant operational data |
| Realtime | Redis + WebSocket bridge | Order/table/kitchen realtime updates |
| Reverse proxy | HAProxy / frontend proxy | Routes `/api`, `/ws`, frontend SPA domains |
| Payments | HitPay | Hosted checkout, request creation, payment confirmation, webhooks |
| Files | Local/upload volume | Tenant logos, header backgrounds, product images, contract files |

Important runtime domains:

- Staff/admin app: `https://staff.sakorio.com`
- Public guest/order app: `https://order.sakorio.com`
- Local dev proxy: `http://127.0.0.1:4202`
- Backend app in Docker: `pos-back:8020`
- WebSocket bridge: `pos-ws-bridge:8021`

## 4. Frontend route and tab map

### 4.1 Public and auth routes

| Route | Module | Purpose |
|---|---|---|
| `/` | landing | Tenant discovery and public entry points |
| `/login` | auth/login | Staff login |
| `/register` | auth/register | Tenant/user registration |
| `/forgot-password` | auth | Password reset request |
| `/reset-password` | auth | Password reset completion |
| `/terms`, `/privacy` | legal | Legal documents |
| `/menu/:token` | menu | Public QR table ordering |
| `/menu/:token/payment-success` | menu | HitPay return/confirmation |
| `/public-menu/:tenantId` | public menu | Public tenant menu |
| `/book/:tenantId` | booking | Public table booking |
| `/waitlist/:tenantId` | public waitlist | Public queue join |
| `/feedback/:tenantId` | public feedback | Guest feedback |
| `/orders` | public orders | Public takeaway/order entry |
| `/reservation` | reservation view | Public reservation token view |

### 4.2 Staff/admin tabs

| Tab | Route | Role/guard | Workflow purpose |
|---|---|---|---|
| Home | `/dashboard` | authenticated | Operational launchpad |
| My shift | `/my-shift` | authenticated | Staff profile selection, shift selection, clock-in/out proof |
| POS | `/pos` | owner/admin/waiter/receptionist | Table-first order entry and payment |
| Orders | `/staff/orders` | order access | Table/order overview and order management |
| Reservations | `/reservations` | reservation access | Arrival, seating, status, reminders |
| Queue | `/queue` | reservation access | Walk-in/waitlist management |
| Tables | `/tables` | table access | Table sessions, status, QR/menu token, table actions |
| Floor canvas | `/tables/canvas` | table access | Visual floor/table plan |
| Kitchen & beverages | `/kitchen` | order access | Production board by route/station/status |
| Customers | `/customers` | order access | Billing customers for invoices |
| Products | `/products` | authenticated | Tenant menu products |
| Catalog | `/catalog` | providers module | Provider catalog and tenant catalog import |
| Reports | `/reports` | admin | Sales, revenue, attendance, exports |
| Working plan | `/working-plan/week`, `/working-plan/calendar` | schedule guard | Shift scheduling, compliance, planned vs actual, clock-in jump |
| Inventory | `/inventory/*` | admin inventory module | Items, suppliers, purchase orders, stock, valuation |
| Users | `/users` | admin | Staff/user management |
| Contracts | `/contracts` | staff contract permission | Staff contracts and templates |
| Settings | `/settings` | admin | Tenant, payments, kitchen stations, SMTP, QR, branding, modules |

### 4.3 Provider and courier routes

| Route | Purpose |
|---|---|
| `/provider/login` | Provider login |
| `/provider/register` | Provider registration |
| `/provider/forgot-password` | Provider password reset |
| `/provider` | Provider dashboard/product management |
| `/courier/login` | Courier login |
| `/courier` | Courier home/delivery placeholder |

## 5. Core workflows

### 5.1 Staff login and role routing

1. Staff opens `staff.sakorio.com/login`.
2. Login returns access/refresh tokens.
3. Angular guards check auth, role, permissions, and enabled tenant UI modules.
4. Sidebar renders only the modules the current role/tenant can use.
5. Dashboard gives quick cards into service workflows.

Key implementation:

- Frontend guards: `authGuard`, `roleGuard`, `adminGuard`, `uiModuleGuard`, `orderAccessGuard`, `reservationAccessGuard`, `scheduleGuard`, `permissionGuard`
- Backend auth: `/token`, `/refresh`, `/logout`, OTP endpoints

### 5.2 Table-first staff POS

Target workflow:

1. Waiter opens POS.
2. System shows tables first.
3. Waiter selects table.
4. Menu/catalog workspace opens for that table.
5. Waiter adds products/modifiers.
6. Order goes to kitchen/beverage board.
7. Payment lane stays on the right for checkout.
8. Staff marks cash/card/HitPay payment and closes/finishes order as needed.

Relevant data:

- `Table`
- `TableGroup`
- `Floor`
- `Order`
- `OrderItem`
- `Product`
- `ProductQuestion`
- `BillingCustomer`
- `FiscalInvoice`

Relevant API areas:

- `/tables`, `/tables/with-status`
- `/orders/staff`
- `/orders`
- `/orders/{order_id}/mark-paid`
- `/orders/{order_id}/finish`
- `/orders/{order_id}/items/*`
- `/orders/{order_id}/create-hitpay-payment-request`
- `/orders/{order_id}/confirm-hitpay-payment`

### 5.3 Public QR ordering

Target workflow:

1. Guest scans table QR.
2. Public menu loads with table token.
3. Guest browses categories/products.
4. Guest adds item questions/modifiers.
5. Guest places order.
6. Staff/kitchen see order.
7. Guest can request payment or use HitPay when enabled.
8. HitPay redirects to payment success page; webhook/confirmation marks payment.

Important behavior:

- Public table ordering no longer needs customer table PIN.
- Table token is the public access key.
- Public menu supports current order and order history.
- HitPay requires correct tenant settings and webhook configuration.

### 5.4 Kitchen and beverage production

Target workflow:

1. Kitchen opens `/kitchen`.
2. User filters by All/Kitchen/Beverages or station.
3. New tickets appear in New lane.
4. Staff moves items/tickets to in prep.
5. Ready items move to Ready lane.
6. Waiter sees readiness and serves/delivers.

Key status model:

- order status: pending/preparing/ready/delivered/paid/completed/cancelled
- item status: pending/preparing/ready/delivered/cancelled
- route/station: kitchen, beverage/bar, configured stations

### 5.5 Orders overview

Target workflow:

1. Staff opens `/staff/orders`.
2. Orders are grouped by table.
3. Staff sees compact table cards before ticket details.
4. Staff expands a table only when item-level work is needed.
5. Staff marks item statuses, payment, urgent flag, billing customer, invoices, or completion.

Launch principle:

- The broad overview should remain table-first.
- A single order should not dominate the page unless explicitly expanded.

### 5.6 Reservations and queue

Reservation workflow:

1. Public guest books via `/book/:tenantId` or staff creates via `/reservations`.
2. Reservation stores customer, date/time, party size, seating preference, notes, and table assignment.
3. Staff seats, finishes, cancels, or marks no-show.
4. Settings control booking windows, table turn assumptions, prepayment, reminders, policies, and opening hours.

Queue workflow:

1. Guest or staff adds walk-in queue entry.
2. Queue tracks party size, phone/name, seating preference, status.
3. Staff notifies/seats/marks done.
4. Queue can convert to reservation when needed.

### 5.7 Tables and floor management

Table workflows:

- create/update/delete tables
- assign floors
- activate/close sessions
- view table status
- get staff menu token
- assign waiter
- join/split table groups
- open table orders
- print/use QR codes

Canvas workflow:

- visual floor layout
- table shapes and positions
- draggable canvas elements
- unsaved change protection
- floor/table setup for staff operations

### 5.8 Products, catalog, and providers

Product workflow:

1. Tenant creates products in `/products`.
2. Products can have categories/subcategories, price, image, availability, kitchen route/station, and questions/modifiers.
3. Products appear in POS/public menu when active.

Catalog/provider workflow:

1. Provider creates catalog/provider products.
2. Tenant browses/imports provider catalog.
3. Tenant product copy becomes available for the restaurant menu.

### 5.9 Inventory

Inventory modules:

- Items: ingredients/supplies, SKU, category, unit, stock thresholds
- Suppliers: supplier details
- Purchase orders: ordering and receiving stock
- Stock dashboard: low stock and valuation
- Reports: FIFO valuation and transaction history
- Recipes: product-to-inventory costing
- Transactions: purchases, waste, adjustments, usage

Key inventory tables:

- `inventory_item`
- `inventory_batch`
- `product_recipe`
- `supplier`
- `purchase_order`
- `purchase_order_item`
- `inventory_transaction`

### 5.10 Working plan and attendance

Working plan workflow:

1. Manager opens week or calendar view.
2. Manager adds/edit/deletes shifts.
3. Manager can bulk month apply or copy week.
4. Calendar highlights coverage/compliance issues.
5. Planned-vs-actual compares scheduled minutes against clocked minutes.
6. Shift can jump to My shift with staff/shift context.

My shift workflow:

1. User opens My shift.
2. Profile selector appears when multiple staff profiles are available.
3. Staff/manager selects profile.
4. Page loads that staff member's shifts, open session, history, and summary.
5. Clock-in/out requires supported proof flow.
6. Break actions remain self-only unless future manager break endpoints are added.

Attendance tables:

- `shift`
- `work_session`
- `work_session_photo`
- `work_session_break`
- `work_session_adjustment`

### 5.11 Reports

Reports include:

- sales/revenue summary
- payment method breakdown
- orders/items reporting
- reservation reporting
- attendance/work sessions
- live work sessions
- attendance adjustment
- attendance Excel exports
- planned-vs-clocked export

### 5.12 Settings

Settings controls:

- business profile
- tenant branding/logo/header
- default language and legal URLs
- currency/tax settings
- HitPay settings
- SMTP/email settings
- reservation settings
- opening hours and overrides
- kitchen stations and station defaults
- clock QR and optional GPS checks
- social/delivery/provider integrations
- UI module enable/disable flags
- tenant export/purge lifecycle tools

## 6. Database map

### 6.1 Tenancy and auth

| Table/model | Purpose |
|---|---|
| `tenant` | Restaurant tenant, settings, branding, integrations, payment config |
| `user` | Staff/admin/provider/courier users and payroll profile fields |
| `password_reset_token` | Password reset workflow |
| `tax` | Tenant tax/GST rates |
| `i18n_text` | Entity translation text |

### 6.2 Tables, products, catalog

| Table/model | Purpose |
|---|---|
| `floor` | Floor/area grouping |
| `table` | Dining tables, QR tokens, session state |
| `table_group` | Joined table grouping |
| `product` | Tenant menu items |
| `product_question` | Modifiers/questions/options for products |
| `provider` | Provider/vendor |
| `product_catalog` | Provider/catalog categories |
| `provider_product` | Provider-owned products |
| `tenant_product` | Product imported from provider catalog into tenant menu |

### 6.3 Orders and billing

| Table/model | Purpose |
|---|---|
| `order` | Customer/staff order session |
| `order_item` | Line items, quantity, status, modifiers |
| `billing_customer` | Invoice customer/company data |
| `fiscal_invoice` | Fiscal invoice record |

### 6.4 Reservations and guest operations

| Table/model | Purpose |
|---|---|
| `reservation` | Table bookings |
| `guest_queue_entry` | Walk-in/waitlist entries |
| `guest_feedback` | Guest feedback submissions |

### 6.5 Attendance and scheduling

| Table/model | Purpose |
|---|---|
| `shift` | Planned working plan rows |
| `work_session` | Clock-in/out attendance session |
| `work_session_photo` | Photo proof for clock-in/out |
| `work_session_break` | Break tracking |
| `work_session_adjustment` | Admin/manual attendance adjustments |
| `opening_hours_baseline_schedule` | Baseline opening hours schedule |
| `opening_hours_date_override` | Date-specific opening hour overrides |

### 6.6 Kitchen, printing, and operations

| Table/model | Purpose |
|---|---|
| `kitchen_station` | Tenant station definitions |
| `printer_agent` | Print agent registration |
| `print_job` | Print queue/jobs |

### 6.7 Inventory

| Table/model | Purpose |
|---|---|
| `inventory_item` | Stock item master |
| `inventory_batch` | FIFO batch lots |
| `product_recipe` | Product-to-inventory recipe mapping |
| `supplier` | Supplier master |
| `purchase_order` | Purchase order header |
| `purchase_order_item` | Purchase order lines |
| `inventory_transaction` | Stock movements/adjustments |

### 6.8 Contracts and integrations

| Table/model | Purpose |
|---|---|
| `staff_contract` | Staff contract records/files |
| `staff_contract_template` | Tenant contract templates |
| `staff_contract_template_preset` | Built-in template presets |
| `delivery_marketplace_integration` | Delivery marketplace credentials/config |
| `delivery_catalog_mapping` | Mapping between delivery catalog and tenant catalog |
| `delivery_integration_event_log` | Integration audit/events |
| `social_oauth_state` | Social OAuth state |
| `social_connection` | Social account connection |
| `social_post` | Scheduled/published post |
| `social_post_target` | Post target destinations |

## 7. Backend API domains

The backend is currently centered in `back/app/main.py` plus routers for inventory, reports, attendance, contracts, delivery, social, pricing, printing, and tenant lifecycle.

Major API groups:

- auth: `/token`, `/refresh`, `/logout`, password reset, OTP
- user/staff: `/users`, `/users/me`, profile, work sessions, attendance summary
- tenant/settings: `/tenant/settings`, logo/header uploads, legal URLs, SMTP, HitPay, UI modules
- tables/floors: `/floors`, `/tables`, `/tables/with-status`, table activation/close, assignment, tokens
- public menu: `/menu/{table_token}`, public order, payment request, waiter call
- orders: `/orders`, `/orders/staff`, status, item status, mark paid, finish, invoices, urgent flag
- payments: HitPay request, confirmation, webhook
- reservations: `/reservations`, book calendar/week/day slots, next available, reminders, seat/cancel/finish
- queue: `/queue`, queue summary, seat, status, convert to reservation
- products/catalog/providers: `/products`, `/providers`, `/catalog`, `/provider/*`, `/tenant-products`
- kitchen: kitchen display settings and kitchen stations
- working plan: `/schedule`, `/schedule/bulk`, `/schedule/copy-week`, planned-vs-actual, compliance summary, export
- reports: sales/attendance/work sessions and exports
- inventory: inventory items, stock, suppliers, purchase orders, receiving, reports
- contracts: staff contracts/templates/presets
- integrations: delivery, social, printing

## 8. Permissions and roles

Known roles:

- owner
- admin
- waiter
- receptionist
- kitchen
- bartender
- courier
- provider

Access model:

- Staff routes require `authGuard`.
- Admin settings/users/reports/inventory generally require owner/admin.
- POS requires owner/admin/waiter/receptionist.
- Kitchen/beverage routes use order access and kitchen/bar module flags.
- Working plan uses schedule guard plus tenant module flag.
- Contracts use permission-based guard.
- UI modules can hide/disable major feature clusters per tenant.

## 9. Payment and HitPay notes

HitPay integration is tenant-configured. Required settings:

- `HITPAY_API_KEY`
- `HITPAY_WEBHOOK_SALT`
- `HITPAY_MODE` (`sandbox` or `live`)
- public app base URL/callback URLs configured correctly
- tenant HitPay settings visible/saved in Settings

Flow:

1. Order exists with payable amount.
2. Frontend requests `POST /orders/{order_id}/create-hitpay-payment-request`.
3. Backend creates HitPay hosted checkout request.
4. Customer/staff is redirected or given payment URL.
5. HitPay redirects to success path.
6. Backend confirmation and webhook validate payment and mark order paid.

Launch checklist:

- Test sandbox payment with a controlled order.
- Test webhook signature validation.
- Verify paid order updates staff POS, orders, table status, and public menu history.
- Verify duplicate webhook/idempotency behavior.
- Verify failure/cancel path is understandable to staff/customer.

## 10. Realtime and operational freshness

Realtime surfaces:

- public menu/current order
- staff orders
- kitchen and beverage board
- table status
- POS selected table/order state

Implementation notes:

- Frontend API service normalizes WebSocket base URLs.
- WebSocket tokens are requested through `/ws-token`.
- Redis/pub-sub powers the bridge.
- Polling remains as fallback on production board surfaces.

## 11. Testing and QA strategy

### 11.1 Browser QA

For UI/UX QA, use browser against Sakorio domains. Do not rely on local-login-only QA for final UX acceptance.

Minimum browser QA routes:

- `/dashboard`
- `/pos`
- `/staff/orders`
- `/tables`
- `/tables/canvas`
- `/kitchen`
- `/reservations`
- `/queue`
- `/my-shift`
- `/working-plan/week`
- `/working-plan/calendar`
- `/products`
- `/catalog`
- `/inventory/*`
- `/reports`
- `/users`
- `/contracts`
- `/settings`
- public `/menu/:token`
- public `/book/:tenantId`

QA dimensions:

- load/render
- login persistence
- no global overflow
- no obvious text/container clipping
- no console errors
- correct primary CTA
- destructive actions guarded
- workflows do not create data unless intentionally testing a transaction
- payment and email tests use controlled data

### 11.2 Code checks

When frontend changes are made:

- run Angular build/compiler check
- inspect Docker front logs
- run route-specific Puppeteer/browser smoke where available
- check local app responds if local stack is in use

When backend changes are made:

- run relevant pytest or containerized tests
- check migration/sync implications
- check container logs
- verify API docs/health

## 12. Current launch readiness by area

| Area | Status | Notes |
|---|---|---|
| Dashboard | Ready | Loads and gives module access |
| POS | Near-ready | Table-first and payment indicators present; still needs controlled payment E2E |
| Public QR menu | Near-ready | Public menu loads; payment flow still requires controlled HitPay test |
| Orders | Near-ready | Table overview present; continue polishing dense data states |
| Kitchen/beverages | Near-ready | Route switcher present; station/card clarity should continue improving |
| Tables | Near-ready | One clipped label polish remains |
| Reservations | Ready for normal operation | Public booking loads; final reminder/email QA still recommended |
| Queue | Ready for normal operation | Route and add workflow present |
| My shift | Near-ready | Profile selector present; manager-assisted break endpoints are future work |
| Working plan | Near-ready | Calendar/week work; schedule compliance warning requires admin action |
| Inventory | Early operational | Routes load; data is currently empty in live QA |
| Products/catalog | Operational | Routes load with data |
| Reports | Operational | Route loads and report sections present |
| Users/contracts | Operational | Routes load |
| Settings | Operational | Tab overflow fixed in tested viewport |

## 13. Recommended next work

### Must do before launch

1. Resolve live schedule compliance warning for Jason Tan or confirm accepted overtime.
2. Run a controlled HitPay sandbox/live order from POS/public menu through payment confirmation.
3. Fix clipped `Orders for this table` button text on Tables.
4. Add title/tooltip or detail drawer affordance for truncated Working Plan calendar shifts.
5. Verify deployment commit hash injection so the live sidebar/footer reliably reports the deployed commit.

### Should do soon after launch

1. Add browser E2E scripts for:
   - staff login
   - POS table select -> add item -> checkout
   - public QR order
   - HitPay success/failure
   - kitchen item status progression
   - reservation create/seat/finish
   - queue add/seat
   - working plan add shift -> My shift clock-in jump
2. Split large Angular components into smaller testable parts:
   - POS workspace
   - Working Plan calendar/drawer
   - Kitchen ticket card/lane
   - Orders table board/detail drawer
3. Add backend DTO endpoints for high-volume operational boards:
   - `/orders/table-overview`
   - `/production/tickets`
   - `/schedule/today-board`
4. Add manager-assisted break start/end endpoints if shared-device attendance needs full parity.
5. Create seed data profiles for launch demo and regression QA.

## 14. Operator notes for future agents

- Work on `development`.
- Sync before edits.
- Do not mix generated `front/src/environments/commit-hash.ts` noise into unrelated commits.
- For UI/UX passes, use the browser on Sakorio domains.
- Do not create live production orders/payments/reservations unless the user explicitly asks for a transaction test.
- Always check frontend compiler/build logs after frontend changes.
- Commit and push completed work.

