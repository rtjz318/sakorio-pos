# Sakorio POS developer handoff

Date: 2026-07-26  
Repository: `rtjz318/sakorio-pos`  
Primary branch: `development`  
Purpose: full system handoff for the next developer to understand, maintain, and fine tune Sakorio POS.

## 1. Executive summary

Sakorio POS is an end-to-end restaurant operating system. It covers:

- Customer QR ordering.
- Staff/cashier POS table service.
- Tables and floor operations.
- Orders and bill/session history.
- Kitchen and beverage production display.
- Reservations.
- Queue/waitlist.
- Products/menu management.
- HitPay and terminal/counter payment flows.
- Users, roles, shifts/timetable, attendance.
- Reports, invoices, settings, tenant/company configuration.
- Multi-company deployment/onboarding.

The current product is close to soft-launch readiness. The core table-first restaurant workflow has been repeatedly tested through live browser QA, including customer QR ordering, kitchen handoff, payment, and table close/reset.

The next developer should treat the remaining work as:

1. Launch hardening.
2. iPad/physical-device rehearsal.
3. UI/UX polish under real service pressure.
4. Deployment automation for future companies.
5. Security/backup operational tightening.

## 2. Current mental model

The system should be thought of as a table-session engine.

Core principle:

- A table has a fixed QR.
- Staff opens/activates the table for a customer session.
- Customer QR ordering and staff POS ordering both feed the same active table bill/session.
- Orders remain current until the table is paid and closed.
- History appears only after table close/reset.
- Closing a table ends the customer QR session and prevents old customers from seeing the next session.

This mental model is important. Earlier versions were confusing because POS felt like a separate checkout page. The current target is:

- POS behaves like the Tables workflow.
- Staff selects a table.
- A table service drawer opens.
- Staff adds items, sends to kitchen, reviews current orders, pays, and closes the table without losing table context.

## 3. High-level architecture

### Frontend

Path:

- `front/`

Stack:

- Angular 20+
- Static production build
- Staff web and customer order web are both Angular routes/build surfaces
- SSR exists in project dependencies but normal deployment is static/client-side

Important frontend areas:

| Area | Path |
| --- | --- |
| Route map | `front/src/app/app.routes.ts` |
| Customer QR menu | `front/src/app/menu/` |
| Customer reservation | `front/src/app/book/` |
| Customer waitlist | `front/src/app/waitlist-public/` |
| Staff POS | `front/src/app/cashier-pos/` |
| Tables | `front/src/app/tables/` |
| Orders | `front/src/app/orders/` |
| Kitchen display | `front/src/app/kitchen-display/` |
| Reservations | `front/src/app/reservations/` |
| Queue | `front/src/app/queue/` |
| Products/menu admin | `front/src/app/products/` |
| Settings | `front/src/app/settings/` |
| Users | `front/src/app/users/` |
| Timetable | `front/src/app/working-plan/` |
| My Shift | `front/src/app/my-shift/` |
| Reports | `front/src/app/reports/` |
| Shared sidebar/layout | `front/src/app/shared/` |
| API service wrapper | `front/src/app/services/api.service.ts` |

### Backend

Path:

- `back/`

Stack:

- FastAPI
- SQLModel
- PostgreSQL
- Redis for rate/session-support areas where configured

Important backend areas:

| Area | Path |
| --- | --- |
| Main API routes | `back/app/main.py` |
| Core models | `back/app/models.py` |
| Database engine/session | `back/app/db.py` |
| Auth/security utilities | `back/app/security.py` |
| Settings/env | `back/app/settings.py` |
| Rate limiting | `back/app/rate_limits.py` |
| Pricing | `back/app/pricing_service.py` / `back/app/pricing_routes.py` |
| Product bulk import | `back/app/product_bulk_import.py` / `back/app/product_bulk_import_routes.py` |
| Kitchen stations | `back/app/kitchen_stations_util.py` |
| Printing jobs | `back/app/printing_service.py` / `back/app/printing_routes.py` |
| Reports | `back/app/reports_routes.py` |
| Attendance | `back/app/attendance_routes.py` |
| Staff contracts | `back/app/staff_contract_routes.py` |
| Multi-company onboarding | `back/app/onboarding/company_onboarding.py` |
| Migrations | `back/migrations/` |
| Tests | `back/tests/` |

### Infrastructure

Local/dev:

- `docker-compose.yml`
- `docker-compose.dev.yml`
- HAProxy exposes the frontend/backend stack locally.

Production/staging:

- Render web services.
- Separate staff/order/API domains.
- PostgreSQL service.
- Redis service.
- Persistent upload disk for media.

Current live domains used during QA:

- Staff: `https://staff.sakorio.com`
- Customer order: `https://order.sakorio.com`
- API: `https://api.sakorio.com`

## 4. Route structure

### Public/customer routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/login` | Staff login route when staff domain maps here |
| `/menu/:token` | Customer fixed table QR ordering |
| `/menu/:token/payment-success` | Customer payment return |
| `/public-menu/:tenantId` | Public tenant menu |
| `/book/:tenantId` | Public reservation booking |
| `/waitlist/:tenantId` | Public waitlist |
| `/feedback/:tenantId` | Public feedback |
| `/reservation` | Public reservation view/cancel by token |
| `/orders` | Public take-away/home ordering list when enabled |

### Staff routes

| Route | Purpose |
| --- | --- |
| `/dashboard` | Staff dashboard |
| `/my-shift` | Clock in/out, staff shift self-service |
| `/pos` | Cashier/waiter POS table service |
| `/tables` | Floor/table management |
| `/tables/canvas` | Canvas/floor-plan layout view |
| `/staff/orders` | Table-grouped orders/current/history |
| `/reservations` | Host reservation management |
| `/queue` | Guest queue/waitlist management |
| `/kitchen` | Kitchen and beverage production display |
| `/bar` | Redirects to `/kitchen` |
| `/products` | Menu/product admin |
| `/catalog` | Provider/catalog menu integration |
| `/customers` | Billing/invoice customers |
| `/working-plan` / `/working-plan/:view` | Timetable |
| `/reports` | Sales/reports |
| `/users` | User management |
| `/contracts` | Staff contracts |
| `/settings` | Tenant/company/system settings |
| `/inventory` | Inventory module when enabled |

Important route note:

- The UI label is `Timetable`, but the technical route is still `/working-plan`.
- Orders deep links commonly resolve to `/staff/orders`.

## 5. Roles and access

Primary roles in `UserRole`:

- `owner`
- `admin`
- `waiter`
- `receptionist`
- `kitchen`
- `bartender`
- `courier`
- `provider`

Latest live role matrix result:

| Role | Allowed | Restricted | Status |
| --- | --- | --- | --- |
| Waiter | POS, Tables, Orders, My Shift | Users, Settings, Reports | Passed live browser |
| Host/receptionist | Reservations, Queue, Tables, My Shift | Users, Settings, Reports | Passed live browser |
| Kitchen | Kitchen, Orders, My Shift | POS, Tables, Users, Settings, Reports | Passed live browser |
| Manager/admin | POS, Tables, Orders, Reservations, Queue, Kitchen, Reports, Users, Settings, Products, Timetable | Admin role; no staff restriction expected | Passed live browser |

Reference:

- `docs/0130-sakorio-role-matrix-and-backup-rehearsal-2026-07-26.md`

## 6. Core workflows

### Workflow A - Staff opens table and takes order

Actor:

- Waiter/cashier/manager.

Flow:

1. Staff logs into `staff.sakorio.com`.
2. Opens POS.
3. Selects an available table.
4. Table service drawer opens in-place.
5. Staff searches/browses menu.
6. Staff adds items to cart.
7. Staff sends order to kitchen.
8. POS stays on the same table context.
9. Table board updates to open-order state.

Expected behavior:

- Staff should not be sent to a separate checkout-style page.
- Payment lane/controls should remain available on the right/within the service drawer.
- Table context should be obvious at all times.

### Workflow B - Customer scans fixed QR and orders

Actor:

- Customer.

Flow:

1. Customer scans fixed QR pasted on table.
2. Customer opens `/menu/:token` with QR/session access.
3. Customer sees current table session if table is active.
4. Customer sees menu categories and search.
5. Customer adds items.
6. Customer submits order.
7. Order appears in staff POS/current orders and kitchen.

Expected behavior:

- Customer is not asked to input their name.
- Customer sees only current active session/current bill.
- Customer does not see previous customers' history.
- Customer payment options exclude Cash.
- Customer can pay by HitPay or card/terminal at table.
- If table is closed/inactive, page shows `Table Closed` or unavailable state.

### Workflow C - Kitchen and beverage production

Actor:

- Kitchen/bartender/manager.

Flow:

1. Staff opens `/kitchen`.
2. New tickets appear in lane.
3. Staff starts ticket.
4. Ticket moves to in-prep/working.
5. Staff marks ready.
6. Staff marks served/delivered.
7. Counters return to zero when all tickets are served.

Expected behavior:

- Tickets show order number and table, e.g. `#255 - T07`.
- Items route to kitchen/beverage station depending on product/station configuration.
- Empty state should be steady and clear.
- Served action should show completion feedback.

### Workflow D - Payment and table close

Actor:

- Cashier/manager/customer.

Flow:

1. Bill contains sent order items.
2. Customer pays through HitPay, or staff records terminal/counter payment.
3. Payment status updates on order/bill.
4. Table moves to paid-awaiting-close or ready-to-close state.
5. Staff taps close table.
6. Final confirmation explains table reset and QR session end.
7. Staff confirms.
8. Table returns to available.
9. Closed bill moves to history.
10. Old customer QR now shows closed/unavailable state.

Expected behavior:

- Orders should not move to history until table close.
- Same customer can place multiple rounds before table close.
- Paid order remains tied to current table session until close.
- After close, customer cannot see old bill/session through QR.

### Workflow E - Reservation to seated customer

Actor:

- Customer and host.

Flow:

1. Customer books at `/book/:tenantId`.
2. Reservation appears in staff `/reservations`.
3. Host searches/highlights booking.
4. Host assigns table or uses seat-now.
5. Table becomes occupied/seated.
6. Customer uses table QR to order.
7. Kitchen receives orders.
8. Customer/staff pays.
9. Staff closes table.
10. Reservation is finished and table resets.

Expected behavior:

- Phone validation should be clear.
- Newly-created reservations should be easy to find.
- Seat-now should be obvious.
- Finishing/closing should require confirmation.

### Workflow F - Queue/waitlist to seated customer

Actor:

- Walk-in guest and host.

Flow:

1. Guest joins waitlist at `/waitlist/:tenantId`.
2. Host sees queue entry in `/queue`.
3. Host can notify/call guest.
4. Host seats guest to a table.
5. Guest orders through QR or staff POS.
6. Kitchen receives orders.
7. Guest pays.
8. Table closes and resets.

Expected behavior:

- Stale QA/test entries should be archived/cleaned before launch.
- Queue dashboard should prioritize active waiting/notified/seated states.

### Workflow G - Products/menu setup

Actor:

- Manager/admin.

Flow:

1. Admin opens Products.
2. Existing products can be deleted/replaced for a new restaurant setup.
3. Menu items are imported or manually created.
4. Categories, prices, descriptions, stations, and images are configured.
5. Product images persist on Render persistent disk.
6. Customer menu and staff POS both show correct names/prices/images.

Expected behavior:

- Menu names must be cleaned of PDF/encoding artifacts.
- Prices must match source menu.
- Same-name menu items with images should be updated correctly.
- Images must survive redeploy.

Reference:

- `docs/company-onboarding-tools.md`

### Workflow H - Timetable, My Shift, and attendance

Actor:

- Manager and staff.

Flow:

1. Manager opens Timetable (`/working-plan`).
2. Manager creates shifts for staff.
3. Staff opens My Shift.
4. Staff selects profile/scheduled shift.
5. Staff clocks in/out with required proof/QR/GPS settings when enabled.
6. Reports can summarize planned vs actual attendance/pay.

Expected behavior:

- UI label is `Timetable`.
- Technical route remains `/working-plan`.
- Staff should be able to clock against their profile/shift.
- Leave/MC records are tracked through schedule leave records.

## 7. Database and model map

Most core models live in:

- `back/app/models.py`

Key model groups:

| Domain | Important models |
| --- | --- |
| Tenant/company | `Tenant`, `Tax`, `OpeningHoursBaselineSchedule`, `OpeningHoursDateOverride` |
| Staff/users | `User`, `UserRole`, `PasswordResetToken`, `Shift`, `WorkSession`, `WorkSessionPhoto`, `WorkSessionBreak`, `StaffLeaveRecord` |
| Tables/floor | `Floor`, `Table`, `TableGroup` |
| Menu/products | `Product`, `ProductQuestion`, `KitchenStation`, `TenantProduct`, provider/catalog models |
| Orders | `Order`, `OrderItem`, order status/payment fields |
| Reservations | Reservation models and reservation status fields |
| Queue | Guest queue models |
| Printing | `PrinterAgent`, `PrintJob` |
| Billing/invoices | Billing customer and fiscal invoice models |
| Contracts | `StaffContract`, `StaffContractTemplate`, presets |
| Integrations | Delivery, social, provider models |

Important tenant isolation rule:

- Any tenant-scoped object must be filtered by `tenant_id`.
- Never trust frontend-hidden buttons as authorization.
- Backend route handlers must enforce tenant ownership and role permission.

## 8. Payment structure

Current payment rules:

- Customer QR checkout:
  - HitPay
  - Card/terminal at table
  - No Cash
- Staff POS:
  - Terminal
  - Counter cash/staff-only settlement where enabled
  - HitPay request support

HitPay backend areas:

- `orders/{order_id}/create-hitpay-payment-request`
- `orders/{order_id}/confirm-hitpay-payment`
- `payments/hitpay/webhook`
- `menu/{table_token}/order/{order_id}/request-payment`

Security note:

- Unknown HitPay payment request IDs should return generic ignored status, not order-not-found details.

Reference:

- `docs/0129-sakorio-final-security-resilience-pass-2026-07-26.md`

## 9. Media/uploads

Render API service needs a persistent disk mounted at:

- `/opt/render/project/src/uploads`

Local path in backend:

- `back/uploads/`

Upload routes include:

- Tenant logo
- Tenant header background
- Product images
- Provider product images
- Staff contract documents

Critical launch note:

- Database backups alone are not enough for menu images.
- Image filenames are stored in DB, but files live on disk.
- Always verify images after redeploy and backup/restore rehearsal.

Recent hardening:

- Tenant logo upload is raster-only: JPG, PNG, WebP, AVIF.
- Raw SVG logo upload is rejected.

## 10. Security status and known operational risks

Security work completed:

- Security headers verified live.
- CORS arbitrary origin rejected.
- Invalid customer QR does not leak stack traces.
- Staff routes redirect when unauthenticated.
- Auth cookies are `HttpOnly`, `Secure`, `SameSite=Lax`.
- Login rate limiter verified.
- Protected staff/admin APIs return `401` unauthenticated.
- `/users/me` no longer exposes `hashed_password`.
- HitPay unknown webhook behavior hardened.
- SVG logo upload rejected.
- Settings secrets are masked in UI.
- Role matrix passed live browser QA.

Known operational risk before full production launch:

- Render PostgreSQL inbound restrictions showed `0.0.0.0/0` / `everywhere`.
- This must be removed/restricted before final production launch.
- Prefer private/internal Render networking.
- If external DB access is needed, restrict to named admin IPs only.

References:

- `docs/0128-sakorio-launch-security-hardening-2026-07-26.md`
- `docs/0129-sakorio-final-security-resilience-pass-2026-07-26.md`
- `docs/0130-sakorio-role-matrix-and-backup-rehearsal-2026-07-26.md`

## 11. Backup and restore status

Render PostgreSQL recovery observed:

- PostgreSQL 18
- Singapore region
- PITR available for past 7 days
- Logical exports supported
- Export created July 26, 2026 at 8:24 PM

Important:

- A destructive restore was not performed, by design.
- Safe restore drill should use a temporary restored database, then point a temporary API/local backend to it.
- Verify tenant, products, images, tables, orders, reservations, staff login, and reports.

Reference:

- `docs/0130-sakorio-role-matrix-and-backup-rehearsal-2026-07-26.md`

## 12. Deployment and multi-company duplication

Sakorio is duplicatable.

Near-term recommended deployment model:

- Isolated deployment per company.
- Separate API/staff/order web services.
- Separate PostgreSQL.
- Separate Redis.
- Separate upload disk.
- Separate HitPay credentials.
- Separate domains.

Reusable docs/tools:

- `docs/0131-sakorio-multi-company-deployment-blueprint.md`
- `docs/company-launch-record-template.md`
- `docs/render-company-deployment-checklist.md`
- `docs/company-onboarding-tools.md`
- `back/app/onboarding/company_onboarding.py`

Onboarding CLI:

```bash
cd back
python -m app.onboarding.company_onboarding --help
```

Subcommands:

- `create-tenant`
- `import-menu-csv`
- `launch-check`
- `render-env-template`

## 13. QA history and current product confidence

Major QA documentation:

| File | Purpose |
| --- | --- |
| `docs/0098-sakorio-final-100-e2e-simulation-brief-2026-07-22.md` | 100-scenario final simulation brief |
| `docs/0099-sakorio-final-100-e2e-execution-results-2026-07-22.md` | 100-scenario execution results |
| `docs/0102-sakorio-non-10-launch-gap-register-2026-07-23.md` | Non-10/10 gap register |
| `docs/0103-sakorio-launch-gap-closure-report-2026-07-23.md` | Gap closure |
| `docs/0104-sakorio-final-launch-polish-and-ipad-simulation-2026-07-23.md` | Final polish/iPad simulation |
| `docs/0105-sakorio-opening-day-ipad-e2e-rehearsal-2026-07-24.md` | Opening-day iPad E2E rehearsal |
| `docs/0120-sakorio-prelaunch-live-browser-100-scenario-results-2026-07-25.md` | Prelaunch live browser 100-scenario results |
| `docs/0126-sakorio-live-ui-ux-audit-customer-staff-2026-07-26.md` | Customer/staff UI/UX audit |
| `docs/0127-sakorio-ui-ux-polish-fix-report-2026-07-26.md` | UI/UX polish fixes |
| `docs/0129-sakorio-final-security-resilience-pass-2026-07-26.md` | Security resilience pass |
| `docs/0130-sakorio-role-matrix-and-backup-rehearsal-2026-07-26.md` | Role matrix and backup rehearsal |

Latest confidence summary:

- Core POS table flow is strong.
- Customer QR ordering is strong.
- Kitchen workflow is clear.
- Table close/session isolation is strong.
- Customer cash removal is correct.
- Menu images and persistent disk were validated after redeploy.
- Role permissions passed live browser checks.
- Security hardening is materially improved.

Remaining confidence gap:

- Real physical iPad/phone/hardware/printer/network rehearsal.
- Database inbound network restriction.
- Continued cleanup of QA/test data before opening-day service.

## 14. Known polish/backlog items

Priority items for next developer:

1. Physical iPad/phone rehearsal.
   - Browser viewport simulation is useful but not enough.
   - Test actual iPad touch targets, restaurant Wi-Fi, customer phone QR scan.
2. Database network lockdown.
   - Remove broad `0.0.0.0/0` DB inbound access.
3. Tables QR activation live QA.
   - Recent Tables fixed-QR strip needs post-deploy staff browser verification if not already done.
4. POS inline style cleanup.
   - `cashier-pos.component.ts` style block is large and triggers non-blocking Angular budget warnings.
   - Long-term: move styles into SCSS/shared utilities and reduce component style size.
5. Customer menu long-menu experience.
   - Search and category segmentation exist.
   - Continue improving sticky category jump bar/active section indicators for 100+ item menus.
6. Orders loading skeleton and refresh steadiness.
   - Skeleton was added; continue checking under live data volume.
7. Table status hierarchy.
   - Improve scan speed for available/seated/open/paid states if staff feedback says still slow.
8. Printer system.
   - Printer was explicitly deferred earlier.
   - Printing service/job model exists, but physical receipt hardware integration should be treated as future launch phase unless required.
9. Multi-company automation.
   - Onboarding CLI exists.
   - Render service provisioning is still checklist/manual.
   - Next step: automated company launch report and browser role matrix script.
10. Production payment cutover.
   - Sandbox has been tested.
   - Production HitPay should be switched only with live credentials and one controlled small payment test.

## 15. How to work safely in this repo

Follow `AGENTS.md`.

Key rules:

- Work on `development`, not `master`, unless production hotfix/promotion is explicitly requested.
- Sync before changes:

```bash
git pull --rebase --autostash origin development
```

- Commit completed work.
- Push `development`.
- Do not put secrets in docs/code.
- Do not use `npm install`; use `npm ci --ignore-scripts` if dependency installation is required.
- Prefer Docker/container checks.
- After frontend changes, always check Angular/front compiler/logs.

Frontend log check:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --since 10m --tail=80 front
```

Backend focused tests:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m pytest -q tests/<test_file>.py
```

Landing/local smoke:

```bash
cd front
BASE_URL=http://127.0.0.1:4202 npm run test:landing-version
```

## 16. Suggested next-developer starting sequence

1. Read this file first.
2. Read:
   - `docs/0126-sakorio-live-ui-ux-audit-customer-staff-2026-07-26.md`
   - `docs/0127-sakorio-ui-ux-polish-fix-report-2026-07-26.md`
   - `docs/0129-sakorio-final-security-resilience-pass-2026-07-26.md`
   - `docs/0130-sakorio-role-matrix-and-backup-rehearsal-2026-07-26.md`
   - `docs/0131-sakorio-multi-company-deployment-blueprint.md`
3. Run local Docker stack and smoke tests.
4. Verify current live deployed commit/build in Render/staff footer.
5. Run one live browser POS rehearsal:
   - open table,
   - customer QR order,
   - kitchen serve,
   - terminal payment,
   - close table,
   - verify old QR is closed.
6. Fix only the highest-confidence launch issues first.
7. Keep every QA result documented.

## 17. Launch readiness position

The system is soft-launch close, not something to casually rewrite.

Do:

- Fine tune.
- Simplify where possible.
- Preserve the table-session model.
- Keep customer QR ordering name-free.
- Keep customer payment cash-free.
- Keep current/history separation tied to table close.
- Keep browser QA evidence for UI changes.

Avoid:

- Reintroducing table PINs for customers.
- Reintroducing generated QR cards at the top of POS table service.
- Moving first-round and second-round same-table orders into history before close.
- Making POS jump away from the table workflow.
- Copying the codebase per company instead of using configured deployments.
- Adding secrets to docs or commits.

## 18. Current handoff conclusion

Sakorio POS now has a coherent operating shape:

Reservation or queue -> seat table -> fixed QR/customer or staff POS order -> kitchen/beverage prep -> payment -> close table -> history -> QR closed.

The system is ready for a next developer to fine tune around real launch operations. The most valuable next work is physical-device/hardware rehearsal, network/security lockdown, and carefully selected UI polish from actual restaurant staff feedback.

