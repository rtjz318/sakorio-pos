# Morinaga launch readiness, technical stack and QA record

Date: 5 November 2026 (Asia/Singapore)  
Repository: `https://github.com/rtjz318/sakorio-pos.git`  
Branch: `development`  
Deployed commit verified in the live staff browser: `9eeb23eb`  
Production tenant: `3` — Morinaga Ramen Izakaya

## 1. Executive decision

The Sakorio application and Morinaga tenant are ready for continued user
acceptance testing. They are **not yet approved for an unrestricted restaurant
launch**.

The software foundation is healthy: the complete backend suite passes, the
Angular production build succeeds, the live API and database are healthy, the
Morinaga public menu renders, tenant-specific staff and management login pages
render, and the Android/XP-80T software checks pass.

The complete production setup is not finished. The dedicated Morinaga
infrastructure and domains have not been provisioned, online payments have not
been accepted end to end with Morinaga credentials, current backup/restore
evidence was not accessible in this audit, the physical Android printer flow
still needs restaurant acceptance, and public booking availability is too slow
for launch quality.

### Launch verdict

| Decision | Status |
|---|---|
| Continue configuration and controlled UAT | **GO** |
| Staff training with test transactions | **GO**, using non-live payments |
| Public launch with online payments | **NO-GO** until the P0 gates in section 11 pass |
| Dedicated Morinaga deployment | **Prepared in code; infrastructure not provisioned** |

No software can be guaranteed to have zero future errors. Launch approval must
mean that defined critical risks are tested, monitored and recoverable—not that
failure is impossible.

## 2. What is already set up

### Morinaga tenant

- Tenant id `3`, production flag (`is_demo=false`).
- Name, description, Singapore timezone and SGD currency.
- Public contact details, address, website, maps link and overnight operating
  hours.
- 112 menu products in six categories; product images were copied to the
  tenant-specific upload area.
- Ten tables, with independent Morinaga table tokens.
- `Kitchen` and `Beverages` preparation stations and product routing.
- Morinaga owner account and tenant-scoped staff login.
- Tenant-scoped HitPay settings model. Demo credentials are not inherited.
- Fixed QR/table-session model, reservations, waitlist, kitchen, orders,
  reports, attendance and timetable modules.

### Deployment-safe structure

- Customer, staff and management builds accept a fixed runtime tenant id.
- Staff and management portal modes are supported without source-code forks.
- `/management/login` enforces owner/admin scope in the API; it is not merely a
  different frontend label.
- Android builds require explicit tenant, API and customer-order origins.
- Database restore-and-prune tooling defaults to dry-run and requires an
  isolated-deployment guard and exact confirmation phrase.
- Demo cleanup requires explicit ids and refuses to delete a non-demo tenant.
- Static-site deployment supports runtime build injection for free/paid Render
  web frontends.

## 3. Current and target topology

### Current live topology

Morinaga is tenant `3` in the shared Sakorio production stack:

```text
Customer / staff browser
          |
     Cloudflare TLS
          |
  order.sakorio.com       staff.sakorio.com
          \                 /
           Angular static web
                  |
          api.sakorio.com
             FastAPI
            /       \
      PostgreSQL    Redis / WebSocket bridge
            |
     persistent uploads disk
```

The shared landing page currently shows both `Ajisen Ramen` (clearly labelled
`DEMO RESTAURANT — TRAINING ONLY`) and Morinaga. This is acceptable for
development, but the restaurant launch should use fixed Morinaga domains so
staff and guests never see a tenant picker or accidentally enter the demo.

### Target isolated Morinaga topology

```text
morinaga-order.sakorio.com  -> fixed customer portal, tenant 3
morinaga-staff.sakorio.com  -> fixed staff portal, tenant 3
  /management/login         -> owner/admin-only management entry
morinaga-api.sakorio.com    -> Morinaga API
Morinaga PostgreSQL         -> Morinaga-only database copy
Morinaga Redis              -> private cache/pub-sub/rate state
Morinaga persistent disk    -> tenant 3 uploads/images
```

DNS verification on 5 November 2026 found all three proposed Morinaga domains
unconfigured. The source code is ready for this layout; the Render services,
datastores, disk and DNS cutover are not present yet.

## 4. Technology stack

| Layer | Technology | Responsibility |
|---|---|---|
| Web frontend | Angular 21.0.x, TypeScript 5.9, RxJS 7.8 | Customer menu/QR ordering, staff POS, management, reservations, queue and operational UI |
| Mobile wrapper | Capacitor 8.5, Android native project | Android tablet installation and native Bluetooth printer access |
| Receipt protocol | ESC/POS, Sakorio XP-80T renderer/agent | Cashier receipt, kitchen item tickets and printer health |
| Backend | Python 3.12, FastAPI, Uvicorn | REST API, authorization, workflows, payments, reports and integrations |
| ORM/model layer | SQLModel / SQLAlchemy, Pydantic | Tenant-scoped data model and validation |
| Primary database | PostgreSQL 18 | Tenants, users, tables, sessions, orders, payments, reservations, queue and attendance |
| Realtime/cache | Redis 7 | Pub/sub, rate-limiting state and live operational updates |
| Realtime delivery | FastAPI WebSocket bridge | Kitchen, order, queue and table-state updates |
| Web edge | Cloudflare, Render, Nginx/static web services | TLS, public domains, static frontend hosting and API routing |
| Development proxy | HAProxy 2.8 | Local unified frontend/API/WebSocket entry point |
| Payments | HitPay payment requests and webhook | Online payment request, confirmation and paid-state transition |
| Email | SMTP via `aiosmtplib` | Reservation/operational email where configured |
| Documents/exports | ReportLab, OpenPyXL | PDF receipts/invoices and Excel reports |
| Images | Pillow and persistent upload disk | Product/menu/tenant image processing and storage |
| Test automation | Pytest, Puppeteer scripts, live browser QA | Backend regression, browser workflows and launch gates |

## 5. Core data and isolation model

Every operational record is owned directly or indirectly by a tenant. The
critical boundaries are:

- `Tenant`: branding, currency, timezone, opening hours, public details,
  payment settings and feature configuration.
- `User`: tenant, role, authentication state and token version.
- `Floor` / `Table`: tenant floor plan, capacity, status and QR/session token.
- `Order` / `OrderItem`: table session, product snapshot, price/tax snapshot,
  kitchen route, item state and payment lifecycle.
- `Payment`: provider reference, amount, payment mode and verified completion.
- `Reservation`: tenant, guest details, service time, table assignment and
  public management token.
- `Queue`: tenant, queue number, guest status and live notification state.
- `Shift` / attendance / leave models: tenant staff scheduling, clock-in/out
  and restricted pay-rate data.
- `Product` / `TenantProduct`: menu, category, image, availability, price and
  kitchen station.

API authorization must derive the tenant from the authenticated user or a
validated public table/reservation token. A client-supplied tenant id is never
enough to authorize access to another restaurant's private data.

## 6. Main restaurant workflows

### Customer QR ordering

1. Staff opens a table session.
2. Guest scans the fixed table QR.
3. The API validates the current table/session access token.
4. Guest browses category-segmented menu and submits one or more rounds.
5. Order items enter the active table bill and their assigned kitchen station.
6. Customer sees only the current session and total bill.
7. Payment is requested through HitPay or handled at the terminal/counter.
8. Staff confirms service/payment and closes the table.
9. Closing invalidates the previous customer session and resets the table.

### Staff POS and table service

1. Staff signs in to the Morinaga tenant.
2. POS shows the table floor; selecting a table opens its service workspace.
3. Staff adds items, sends the round and remains in the same table context.
4. Current orders remain current until table close; previous sessions are
   available only in history.
5. Payment status is visible on the table (`Payment requested`, `Paid` or
   `Unpaid`/terminal workflow).
6. Authorized staff closes the bill/table with final confirmation.

### Kitchen and beverage

1. Submitted items route to `Kitchen` or `Beverages`.
2. The realtime channel updates the station display.
3. Staff moves tickets through accepted/preparing/ready/served states.
4. XP-80T item-ticket mode can produce one kitchen ticket per menu item.
5. Cashier receipts use the same price snapshots as the order total.

### Reservation to table

1. Guest selects party size, service date/time and enters contact details.
2. Host sees the reservation on its service date.
3. Host assigns/seats it at a table.
4. The assigned table starts a normal POS/QR table session.
5. Payment, close and table reset follow the standard table workflow.

### Queue to table

1. Guest joins the Morinaga public waitlist and receives a visible queue
   number.
2. Host sees the same number in the staff queue board.
3. Realtime updates show waiting/pinged/called/cancelled/seated state without a
   manual guest refresh.
4. Seating creates or joins the destination table session.

### Attendance

1. A staff member selects their own profile on the shared device.
2. Clock-in creates the actual attendance shift.
3. Clock-out records the actual end time and calendar entry.
4. Hourly rates and payroll-sensitive values remain owner/admin-only.

## 7. Authentication and security controls

Verified or implemented controls include:

- Role-based authorization for owner, admin, waiter, receptionist, kitchen,
  bartender, courier and provider areas.
- Tenant-scoped login and management-scope login.
- Owner/admin-only management entry enforced server-side.
- Password hashing, token-version invalidation, optional OTP/2FA support and
  rate-limit infrastructure.
- Unauthenticated `/users/me` returns `null`; a protected `/users` request is
  rejected as not authenticated.
- HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, restrictive
  permissions policy and strict referrer policy on live services.
- CORS permits `https://staff.sakorio.com` and does not return an allow-origin
  header for an untrusted origin.
- Secrets are not stored in this document or Git.
- Database/destructive tenant utilities use explicit safety guards.

Security follow-up: the staff and customer HTML responses did not include a
Content-Security-Policy header in this audit. Add and stage a tested CSP before
or shortly after launch; it must allow the API, WebSocket, HitPay redirect and
required image/font origins without breaking the POS.

## 8. Build and deployment model

### Routine development

1. Work on `development`.
2. Pull with rebase before edits.
3. Run container tests and Angular compiler/build checks.
4. Commit, pull/rebase again and push `development`.
5. Promote `development` to `master` only through the repository production
   promotion rules.

### Dedicated web runtime variables

The deployments require values equivalent to:

```text
SAKORIO_TENANT_ID=3
SAKORIO_PORTAL_MODE=customer | staff | management
SAKORIO_API_URL=https://morinaga-api.sakorio.com
SAKORIO_PUBLIC_ORDER_ORIGIN=https://morinaga-order.sakorio.com
```

Secret values such as database URLs, JWT secret, HitPay keys, SMTP password and
webhook salt belong in Render secret storage or the tenant's encrypted settings,
never in frontend assets, Git or this document.

### Android preparation

Before Capacitor sync/build, inject tenant `3`, the Morinaga API and customer
origin using `npm run native:configure-runtime`. An unbranded native build is a
warning/failure condition for release. The APK must then be signed, installed on
the restaurant tablet and paired with the XP-80T in Android settings.

## 9. QA executed in this audit

### Code and container evidence

| Check | Result |
|---|---|
| Repository synchronized with `origin/development` | Pass; already current |
| Docker services | Pass; backend, frontend, PostgreSQL, Redis, HAProxy and WebSocket bridge running |
| Full backend regression | **372 passed**, 2 dependency deprecation warnings |
| Angular `production-static` build | Pass |
| Angular build warnings | Existing POS/menu style-budget warnings and QR CommonJS warning; no compiler error |
| Frontend service logs after build | No TypeScript/Angular error reported in inspected window |
| Native runtime configuration test | Pass |
| Capacitor Android readiness | Pass, with expected warning that a release tenant must be injected before sync |
| XP-80T software readiness scenarios | Pass |
| Dedicated portal Puppeteer script in container | Not executed: container image has no Chromium; equivalent live routes were checked in the in-app browser |
| Local browser landing smoke test | Pass |

### Live browser and network evidence

| Area | Result | Notes |
|---|---|---|
| API health | Pass | `{"status":"ok"}` |
| Database health | Pass | Connected; schema `20261023110000` |
| Deployed version | Pass | Live staff footer shows `2.1.6 9eeb23eb` |
| Morinaga public menu | Pass | Restaurant name, six category sections, images and SGD prices rendered |
| Morinaga booking identity | Pass | Correct name, contact, address, hours and booking form |
| Reservation availability API | Functional | Returned correct overnight slots and available days |
| Reservation booking UX | **Performance fail** | Cold browser load required about 25 seconds; repeated month endpoint calls took 6.1s, 5.0s and 5.2s |
| Morinaga public waitlist | Pass for read-only smoke | Correct restaurant, queue count and join form rendered; no production entry was created |
| Staff login | Pass for entry page | Tenant-specific page says it is logging in to Morinaga |
| Management login | Pass for entry page | `Management sign in` and owner/admin-only message rendered |
| Unauthenticated access boundary | Pass | `/users/me` returned `null`; protected `/users` rejected |
| CORS | Pass | Staff origin allowed; untrusted origin not allowed |
| Security headers | Partial pass | HSTS/frame/nosniff/referrer/permissions present; CSP absent |
| Tenant discovery | Pass with launch caveat | Ajisen is marked demo; Morinaga is production. Dedicated portal is still needed to remove picker risk |
| Dedicated Morinaga DNS | **Not configured** | API, staff and order hostnames did not resolve |
| Render backup/deploy dashboard | Not reverified | Existing browser session had expired |
| HitPay end-to-end payment | Not run | Requires Morinaga sandbox credentials and approval before live credentials |
| Physical Android/XP-80T acceptance | Not run | Requires the shop tablet and printer |

This audit deliberately did not create production reservations, queue entries,
orders or payments. Functional mutation tests should run in a controlled UAT
window and be cleaned up before opening service.

## 10. Readiness scorecard

| Capability | Score | Reason |
|---|---:|---|
| Application build/regression | 9.5/10 | Full backend and production frontend build pass |
| Tenant identity/menu isolation | 9/10 | Morinaga tenant works; dedicated domains not provisioned |
| Public menu | 9/10 | Correct restaurant, categories, prices and images |
| Reservations | 6.5/10 | Correct data, but 10–25 second availability experience is too slow |
| Queue/waitlist | 8/10 | Public page works; final join-to-live-ping device rehearsal remains |
| Staff/management access | 8.5/10 | Correct tenant/scoped entry; final role-by-role production rehearsal remains |
| Online payments | 4/10 | Tenant model exists; Morinaga sandbox/live completion not evidenced |
| Android Bluetooth printing | 6.5/10 | Software checks pass; physical XP-80T acceptance remains |
| Security | 8/10 | Strong baseline; CSP, credential rotation and dedicated boundary remain |
| Backup/recovery | 6/10 | Prior backup documented; fresh export and restore evidence not reverified |
| Dedicated deployment | 5/10 | Code/template complete; Render resources and DNS absent |

## 11. Mandatory P0 launch gates

Complete these before declaring a public launch:

1. **Choose and provision the production topology.** Recommended: dedicated
   Morinaga API, database, Redis, disk and fixed customer/staff portals. If the
   shared stack is used temporarily, record that risk explicitly and use direct
   tenant-specific links only.
2. **Fix reservation availability latency.** Profile the month/day capacity
   queries, add/verify indexes and remove repeated per-slot database work. Target
   first usable dates in under 2 seconds at normal load.
3. **Complete Morinaga HitPay sandbox acceptance.** Staff payment, customer QR
   payment, webhook confirmation, paid-state transition, duplicate webhook,
   timeout/cancel and table close must all pass. Only then load live credentials
   and run one small controlled live payment.
4. **Run physical Android/XP-80T acceptance.** Pair/reconnect, print cashier
   receipt, print one kitchen slip per item, verify prices/company name, test
   printer offline/retry and confirm no duplicate receipt.
5. **Create a fresh protected database export and verify recovery.** Record the
   export timestamp, PITR window, upload-disk persistence and a restore rehearsal
   into a disposable database.
6. **Create individual production staff accounts and rotate the owner
   credential.** Do not share one owner password at service.
7. **Run a clean production UAT transaction.** Reservation or queue -> seat ->
   first and second order rounds -> kitchen/beverage -> payment -> receipt ->
   close -> table reset -> old QR/session isolation.
8. **Approve final restaurant data.** Legal name/UEN/GST status, menu/tax,
   address/phone/hours, tables, QR labels, policies and staff roles must be signed
   off by Morinaga management.

## 12. P1 hardening before or immediately after launch

- Deploy and test a restrictive Content-Security-Policy.
- Run queue join/ping/cancel/seat on two real phones and confirm live updates.
- Run role matrix with owner, waiter, host and kitchen production accounts.
- Test offline/reconnect behavior for API, WebSocket and printer interruptions.
- Freeze the menu before service, then verify every displayed price against the
  approved source menu.
- Add uptime/error/webhook alerts and nominate the first-service responder.
- Remove or disable temporary QA accounts after UAT.
- Ensure Ajisen remains inaccessible from the dedicated Morinaga portal; do not
  delete historical demo data as a substitute for correct routing.

## 13. What is needed from the owner

The engineering team can continue diagnosis and non-destructive QA without more
input. The following owner inputs are required to cross the launch gates:

1. Confirm **dedicated Morinaga deployment** versus an explicitly temporary
   shared-stack launch. Dedicated is recommended.
2. Authorize the selected Render resources/budget and provide an authenticated
   Render session for provisioning and backup verification.
3. Provide DNS access for the three Morinaga hostnames.
4. Add Morinaga HitPay sandbox credentials securely; later provide live
   credentials only after sandbox sign-off. Do not paste them into Git or this
   document.
5. Confirm official legal/tax details and the final restaurant contact/hours.
6. Provide the production staff roster with each person's role and email.
7. Confirm the physical table names/capacities and approve printed fixed QRs.
8. Make the Android tablet and XP-80T available for a 30–60 minute acceptance
   session at the restaurant.
9. Choose a launch date and a first-service support window.

### Owner response and live account verification — 5 November 2026

| Input | Current status |
|---|---|
| Dedicated Morinaga deployment | Confirmed by the owner |
| Render access | Authenticated workspace verified |
| DNS | Owner approved proceeding; DNS-provider access/records still need to be available at cutover |
| HitPay | Dashboard credentials supplied and accepted; login is waiting for the six-digit email verification code. Credentials are not stored in Git or this document |
| GST | Owner confirmed Morinaga is GST registered at **9%**; final invoice/legal identity and UEN still need confirmation |
| Staff roster | Deferred; may remain empty during infrastructure setup, but individual accounts are required before launch |
| Physical Android/XP-80T test | Deferred |
| Launch date/support window | Deferred |

### Verified Render cost impact

The live Render billing page projected the existing shared workspace at
**USD 92.00/month** for November 2026. The following isolated Morinaga estimate
uses the same production-sized backend components and free static customer/staff
portals:

| Added resource | Monthly estimate |
|---|---:|
| API Standard (1 CPU / 2 GB) | USD 25.00 |
| API persistent disk (2 GB) | approximately USD 0.44 |
| PostgreSQL Basic compute | USD 6.00 |
| PostgreSQL storage (15 GB) | approximately USD 4.50 |
| Redis/Valkey Starter | USD 10.00 |
| Customer and staff static portals | USD 0.00 |
| **Estimated additional total** | **USD 45.94/month** |
| **Estimated combined workspace total** | **USD 137.94/month** |

The estimate excludes tax, bandwidth or other overages. Render charges begin
when the new paid resources are created. Point-in-time recovery can create the
new Morinaga database from the current shared database's seven-day recovery
window; the restored copy must then run the guarded tenant-isolation command
before any dedicated API is connected to it.

## 14. Cutover and rollback

### Cutover

1. Freeze menu/configuration changes.
2. Create the pre-cutover backup.
3. Restore the shared database to the isolated database and run the guarded
   tenant-isolation dry run.
4. Execute prune only in the isolated environment and verify tenant `3`.
5. Deploy API, customer, staff and management runtime bindings.
6. Verify image disk, CORS, trusted hosts, WebSocket and payment webhook.
7. Complete the UAT transaction and physical print test.
8. Point DNS and verify TLS.
9. Run the controlled first live payment.
10. Monitor the first service and export another backup afterward.

### Rollback

- Keep the shared Morinaga tenant unchanged until isolated cutover is accepted.
- If the isolated deployment fails before new transactions, revert DNS to the
  shared direct tenant links.
- If new transactions exist, stop writes, export both databases and reconcile
  before rollback; never overwrite newer order/payment data blindly.
- Payment webhooks must remain idempotent during any DNS or API rollback.

## 15. Next engineering sequence

1. Profile and fix reservation availability performance.
2. Provision the isolated Render/DNS stack after owner authorization.
3. Run sandbox payment acceptance.
4. Run physical Android printer acceptance.
5. Create and rehearse the current backup.
6. Execute the final cross-role UAT transaction and issue the signed go/no-go
   record.

This document is the launch source of truth for the current Morinaga rollout.
Update each gate with a timestamp, operator and evidence link rather than
replacing an unverified item with an assumption.
