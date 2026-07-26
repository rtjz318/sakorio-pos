# Sakorio POS multi-company deployment blueprint

Date: 2026-07-26  
Purpose: master reference for duplicating Sakorio POS for multiple companies, restaurants, outlets, or brands.

## Executive summary

Yes, Sakorio POS is duplicatable.

The cleanest long-term model is:

- Keep one master codebase.
- Deploy one isolated environment per company or group.
- Use tenant/company records inside the database for restaurant identity, tables, products, staff, reservations, QR links, and settings.
- Use repeatable Render/DNS/environment setup instead of manual one-off configuration.
- Keep media uploads on persistent storage.
- Keep payment, email, security, and backup settings company-specific.

This avoids a messy "copy-paste codebase per client" situation and lets us improve the POS once, then roll improvements out to each company safely.

## Recommended deployment models

### Model A - Single shared platform, multiple tenants

Best for: many restaurants under Sakorio control.

Structure:

- One frontend staff app.
- One customer ordering app.
- One API service.
- One database.
- Each company/outlet is separated by `tenant_id`.

Pros:

- Fastest to onboard new companies.
- One deployment updates everyone.
- Lower hosting cost.
- Easier reporting across companies if needed.

Cons:

- Requires strong tenant isolation in code and QA.
- One serious bug could affect multiple companies.
- Database backup/restore for one tenant is more complex.

Use when:

- Companies are managed under the Sakorio platform.
- Same feature set and release cycle is acceptable.
- The team is confident all APIs enforce tenant scoping.

### Model B - One isolated deployment per company

Best for: paid clients, franchise groups, higher-security customers.

Structure:

- One Render API service per company.
- One Render staff web service per company.
- One Render customer order web service per company.
- One PostgreSQL database per company.
- One persistent upload disk per company API service.
- Separate domains/subdomains per company.

Pros:

- Strong operational isolation.
- Easier company-specific backup/restore.
- Easier to debug and migrate one customer at a time.
- Safer for launch-stage product maturity.

Cons:

- Higher hosting cost.
- More deployments to manage.
- Need stricter version tracking.

Use when:

- We deploy Sakorio POS for external companies.
- Each company may have different payment accounts, menus, or launch timing.
- We want lower blast radius.

### Recommended for near-term launch

Use Model B first.

Once the system is mature and automated, we can move toward a hybrid:

- One production codebase.
- One isolated deployment/database per paying company.
- Optional shared master/staging environment for regression testing.

## Master codebase strategy

### Repository

Master repository:

- `rtjz318/sakorio-pos`

Primary branch flow:

- `development`: active work and staging deployments.
- `master`: production promotion only.

Rules:

- Do not fork the codebase manually for each company unless absolutely necessary.
- Deploy each company from the same repository and same approved branch/tag.
- Track the deployed commit hash per company.
- Keep company-specific configuration in environment variables and database rows, not hardcoded code.

### Release versioning

Every company deployment should record:

- Company name
- Environment name
- Render service IDs
- Domain names
- Git commit hash
- Deployment date/time
- Database backup/export timestamp
- Payment mode
- Operator/admin contact

Recommended naming:

- Git tag: `company-name-launch-yyyy-mm-dd`
- Deployment note: `Sakorio POS vX / commit abc1234`

## Company deployment unit

Each company should have this deployment bundle:

| Component | Example | Notes |
| --- | --- | --- |
| API service | `company-pos-api` | FastAPI backend |
| Staff web service | `company-pos-staff-web` | Staff/cashier/manager UI |
| Order web service | `company-pos-order-web` | Customer QR/order/reservation UI |
| PostgreSQL | `company-pos-postgres` | Company-isolated database |
| Redis | `company-pos-redis` | Queue/cache/session/rate-limit support if configured |
| Upload disk | `/opt/render/project/src/uploads` | Persistent menu/product images |
| Staff domain | `staff.company.com` | Staff login/POS |
| Order domain | `order.company.com` | QR order/reservation |
| API domain | `api.company.com` | Backend API |

## Environment variable master checklist

Each deployment must have company-specific values.

### Backend/API variables

Required:

- `DATABASE_URL`
- `REDIS_URL`
- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `PUBLIC_APP_BASE_URL`
- `STAFF_APP_BASE_URL`
- `API_BASE_URL`
- `PRODUCTION=true`
- `DEFAULT_PHONE_COUNTRY`

Email:

- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_USE_TLS`

HitPay:

- `HITPAY_API_KEY`
- `HITPAY_WEBHOOK_SALT`
- `HITPAY_MODE`

Recommended:

- `RATE_LIMIT_ENABLED=true`
- `SECURE_COOKIES=true`
- `ALLOWED_ORIGINS=https://staff.company.com,https://order.company.com`
- `TRUSTED_HOSTS=api.company.com,staff.company.com,order.company.com`

Never reuse across companies:

- `SECRET_KEY`
- `HITPAY_API_KEY`
- `HITPAY_WEBHOOK_SALT`
- `SMTP_PASSWORD`
- Database credentials

### Frontend variables

Staff web:

- API URL must point to that company API.
- Staff base URL must be that company staff domain.
- Build commit hash should be visible in footer/version.

Order web:

- API URL must point to that company API.
- Public order domain must be that company order domain.

## Render setup blueprint

### 1. Create PostgreSQL

Recommended minimum:

- PostgreSQL 18
- Region close to restaurant/company operations
- Paid plan with backup/recovery
- Point-in-time recovery enabled

Security:

- Remove `0.0.0.0/0` public inbound access unless temporarily needed.
- Prefer Render private/internal access between API and database.
- If external admin access is required, restrict to named admin IPs only.

### 2. Create Redis

Use for:

- Login rate limiting
- Session/rate-limit state
- Future realtime/queue support

Security:

- Private/internal access where possible.
- Do not expose publicly.

### 3. Create API service

Runtime:

- Python 3
- Deploy from master approved branch/tag for production, or development for staging.

Required:

- Attach persistent disk for uploads.
- Mount path:
  - `/opt/render/project/src/uploads`
- Confirm API stores product/menu images under the persisted uploads path.

Post-deploy checks:

- `/health` returns healthy.
- `/docs` should not expose sensitive operations publicly if production lockdown is enabled.
- `/users/me` must not expose `hashed_password`.
- Login rate limiter should be active.

### 4. Create staff web service

Runtime:

- Docker / Angular built static output.

Domains:

- `staff.company.com`

Post-deploy checks:

- Login page loads.
- Staff login works.
- Dashboard version/commit hash matches deployment.
- POS, Tables, Orders, Reservations, Queue, Kitchen, Products, Reports, Timetable load based on role.

### 5. Create customer order web service

Runtime:

- Docker / Angular static output.

Domains:

- `order.company.com`

Post-deploy checks:

- QR menu URL loads.
- Reservation page loads.
- Waitlist page loads.
- Customer cart/order flow works without staff login.
- Customer only sees current table/session bill, not other sessions.

## DNS blueprint

For each company:

| Domain | Points to | Purpose |
| --- | --- | --- |
| `api.company.com` | Render API service | Backend |
| `staff.company.com` | Render staff web service | Staff POS/admin |
| `order.company.com` | Render order web service | Customer QR/reservations |

Checklist:

- Add DNS records.
- Verify SSL is active.
- Verify no mixed-content warnings.
- Verify CORS allows only company staff/order domains.
- Verify API does not accept random hostnames if trusted-host protection is enabled.

## Tenant/company data blueprint

Each company needs a tenant setup package:

### Tenant identity

- Company legal name
- Public restaurant name
- UEN/company number if needed
- Tax/GST registration if applicable
- Address
- Phone
- Email
- Logo/header image
- Operating hours
- Timezone
- Currency

### Users and roles

Minimum launch roles:

- Owner/admin
- Manager
- Cashier
- Waiter
- Host/receptionist
- Kitchen
- Beverage

Rules:

- No shared real-user accounts for production.
- QA accounts may exist temporarily but must be disabled or rotated after launch.
- Managers/admins require stronger passwords.
- Staff leaving the company must be disabled immediately.

### Tables

Required fields:

- Table name/code, e.g. T01
- Seats
- Area/floor
- Active/inactive
- Fixed customer QR code

QR strategy:

- Table QR should be fixed and printed.
- QR should open the active table order session only when the table is open/activated.
- If a table is closed/reset, previous customers must not see the next session.
- QR token/session access must be rotated or session-bound if required by security policy.

### Menu/products

Required:

- Product name
- Clean display name
- Category
- Price
- Availability
- Station routing: kitchen/beverage
- Image
- Optional modifiers/add-ons
- Optional description/allergens

Menu import rules:

- Remove funny characters and broken encoding.
- Preserve exact prices from source menu.
- Cross-check image, name, and price in staff Products and customer Order menu.
- Confirm images persist after redeploy.

### Reservations

Required:

- Public booking page
- Host reservation dashboard
- Seat-now flow
- Search/highlight new booking
- Phone validation with clear examples
- Reservation completion/close behavior

### Queue/waitlist

Required:

- Public waitlist page
- Host queue dashboard
- Notify/call guest
- Seat queue guest to table
- Archive stale/test entries

## Payment blueprint

### HitPay setup

Per company:

- Create or obtain company HitPay account.
- Configure sandbox first.
- Configure production after sandbox signoff.
- Add company-specific:
  - API key
  - webhook salt
  - mode: `sandbox` or `production`
- Configure webhook URL pointing to company API.

Validation:

- Staff POS HitPay checkout works.
- Customer QR HitPay checkout works.
- Return URL lands back cleanly.
- Paid order appears in Orders.
- Paid bill remains tied to current table session until table close.
- History only appears after close/reset.

Payment rules:

- Customer QR payment should only show HitPay/terminal options.
- Cash should not appear on customer QR checkout if business policy disallows it.
- Staff POS may support cash only if restaurant wants cashier cash settlement.

### Terminal payment

For physical launch:

- Confirm terminal flow is operationally clear.
- Staff should be able to mark terminal-paid with appropriate confirmation/role permission.
- Manager override should be required for corrections/refunds/voids.

## Security blueprint

### Application security

Required:

- Strong `SECRET_KEY` per company.
- Password hashes never returned to frontend.
- `/users/me` and staff profile endpoints return safe response models.
- Role-based route protection on frontend and backend.
- Backend authorization cannot rely only on hidden frontend buttons.
- Rate limiting on login/payment-sensitive endpoints.
- CORS restricted to company staff/order domains.
- Trusted hosts restricted to company domains.
- Secure cookies if cookies are used.
- HTTPS only.

### Database security

Required:

- No broad inbound `0.0.0.0/0` for production unless temporarily justified.
- Private/internal networking preferred.
- Unique database credentials per company.
- Least privilege where supported.
- PITR and logical exports enabled.
- Backup access limited to owners/admins only.

### File/media security

Required:

- Uploads stored on persistent disk.
- Validate file type.
- Limit upload size.
- Do not execute uploaded files.
- Serve media safely.
- Verify images survive redeploy.

### Operational security

Required:

- Disable test/QA accounts after launch.
- Rotate temporary launch passwords.
- Store secrets only in Render/env manager, not code/docs.
- Restrict Render dashboard access.
- Use MFA for Render/GitHub/HitPay admin accounts.
- Document who has production access.

## Backup and restore blueprint

### Backup policy

Minimum:

- Render PITR: 7 days or better.
- Logical export before major launch/migration.
- Export before big menu import.
- Export before production domain cutover.

### Restore drill

Do not restore directly over production unless there is a confirmed incident and downtime approval.

Safe drill:

1. Pick latest export/PITR timestamp.
2. Restore to temporary database.
3. Point temporary API service or local backend to restored DB.
4. Verify:
   - login works;
   - tenant settings exist;
   - tables exist;
   - menu/products/images exist;
   - reservations exist;
   - active orders/bills exist;
   - reports load.
5. Delete temporary restore once verified.

### Media restore

Database backup alone is not enough if images are on disk.

Need:

- Persistent disk backup/export strategy.
- Image filenames in DB must match files in uploads disk.
- After restore, verify menu images on customer page and staff Products page.

## New company rollout checklist

### Phase 0 - Intake

- Confirm company name and legal billing details.
- Confirm domains/subdomains.
- Confirm restaurant operating hours/timezone.
- Confirm payment provider details.
- Confirm menu PDF/source.
- Confirm table layout and QR print requirements.
- Confirm staff roles and initial users.

### Phase 1 - Infrastructure

- Create Render PostgreSQL.
- Create Redis.
- Create API service.
- Attach upload disk to API service.
- Create staff web service.
- Create order web service.
- Add domains and SSL.
- Configure environment variables.

### Phase 2 - Data setup

- Create tenant/company settings.
- Upload logo/header assets.
- Create tables and seating layout.
- Generate fixed table QR codes.
- Import menu items.
- Upload product images.
- Create staff users.
- Create QA accounts if needed.

### Phase 3 - Payment setup

- Configure HitPay sandbox.
- Run staff POS payment test.
- Run customer QR payment test.
- Confirm webhook updates payment status.
- Confirm bill can be closed after payment.
- Switch to production HitPay only after signoff.

### Phase 4 - Live QA

Run browser QA on:

- Customer reservation
- Customer waitlist
- Customer QR ordering
- Staff POS ordering
- Table open/add order/pay/close
- Orders tab current/history behavior
- Kitchen display
- Queue seating
- Reservation seat-now
- Manager bill correction/void/refund rules
- Timetable/clock-in/out
- iPad/tablet viewport
- Image persistence after redeploy
- Role matrix
- Backup/export visibility

### Phase 5 - Launch

- Freeze menu.
- Export database.
- Confirm upload disk persistence.
- Disable/rotate QA accounts.
- Restrict database inbound network access.
- Switch HitPay to production.
- Print and paste table QR codes.
- Train staff with role-specific checklist.
- Monitor first service.

## Per-company launch record template

Copy this section for every company.

```md
# Company launch record

Company:
Outlet:
Environment:
Launch date:
Git commit:

## Domains

- Staff:
- Order:
- API:

## Render services

- API service:
- Staff web:
- Order web:
- PostgreSQL:
- Redis:
- Upload disk path:

## Payment

- HitPay mode:
- Webhook configured:
- Sandbox test reference:
- Production test reference:

## Tenant data

- Tenant ID:
- Tables:
- Products:
- Categories:
- Staff users:

## QA signoff

- Role matrix:
- Customer QR order:
- Staff POS order:
- Reservation to seating:
- Queue to seating:
- Kitchen workflow:
- Payment and close table:
- iPad viewport:
- Image persistence:
- Backup/export:

## Open launch notes

- 
```

## Master duplication SOP

Use this whenever deploying Sakorio POS for a new company.

1. Choose deployment model.
   - Near-term default: isolated deployment per company.
2. Create infrastructure.
   - API, staff web, order web, PostgreSQL, Redis, upload disk.
3. Configure domains.
   - `api`, `staff`, `order`.
4. Configure environment variables.
   - Never reuse secrets across companies.
5. Deploy from approved branch/tag.
6. Run migrations.
7. Create tenant/company settings.
8. Create staff users.
9. Import menu and upload images.
10. Create tables and QR codes.
11. Configure HitPay sandbox.
12. Run browser QA.
13. Create backup/export.
14. Lock down database network access.
15. Switch payment to production.
16. Train staff.
17. Launch.
18. Monitor and document first service.

## Launch readiness gate

A company deployment is not ready until all are true:

- Staff login works.
- Role matrix passes.
- POS table flow passes.
- Customer QR order flow passes.
- Orders remain current until table close.
- History only appears after close/reset.
- Kitchen tickets are clear and actionable.
- Reservation to table assignment passes.
- Queue to table assignment passes.
- HitPay sandbox passes.
- Production payment configuration is ready.
- Menu names, prices, and images match source.
- Images survive redeploy.
- iPad viewport passes.
- Database backup/export exists.
- Restore path is known.
- Database inbound access is locked down.
- Temporary QA credentials are rotated or disabled.

## Remaining automation opportunities

To make this truly one-click duplicatable, build these next:

1. Tenant setup command
   - Creates tenant, default settings, roles, tables, and initial admin.
2. Menu import command
   - Imports CSV/PDF-extracted menu data and validates prices/categories.
3. Image upload verification command
   - Confirms all products with expected images display in staff and customer UIs.
4. Render service template
   - Standardizes API/staff/order service configuration.
5. Domain/env checklist generator
   - Outputs per-company Render env var checklist.
6. Role matrix browser test
   - Logs in as each role and verifies allowed/blocked pages.
7. Backup drill script
   - Records export timestamp and restore test result.
8. Launch report generator
   - Produces final handoff per company.

## Recommended next build item

The highest-value next improvement is a `company-onboarding` package:

- `docs/company-launch-record-template.md`
- `scripts/create_tenant.py`
- `scripts/import_menu_csv.py`
- `scripts/check_company_launch.mjs`
- `docs/render-company-deployment-checklist.md`

That would turn company duplication from a manual checklist into a repeatable deployment machine.
