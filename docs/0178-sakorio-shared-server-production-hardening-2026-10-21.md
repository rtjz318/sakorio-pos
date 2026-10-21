# Sakorio shared-server production hardening

Date: 2026-10-21  
Target: one Sakorio deployment hosting Ajisen demo data and Morinaga Ramen Izakaya as a real tenant.

## Outcome summary

The application layer is now prepared for a shared multi-tenant deployment:

- Production tenants cannot inherit a global HitPay API key or webhook salt.
- Every real tenant must configure its own HitPay credentials in Settings.
- Shared HitPay credentials remain available only to explicitly marked demo tenants and are forced to sandbox.
- Ajisen and the legacy tenant named `test` are marked by a database migration as demo data.
- Staff using a demo tenant see a persistent `DEMO - TRAINING ONLY` badge and a full-width warning on every staff screen.
- A fail-closed route inventory test requires every API route to be either authenticated or explicitly reviewed as public/capability-token based.
- The complete backend suite passes: 353 tests.
- The Staff and Owner web services were upgraded from sleeping Free instances to paid always-on 0.5 CPU / 512 MB instances.
- Render PostgreSQL point-in-time recovery, a fresh logical export, and the API upload-disk snapshots were verified in the authenticated dashboard.

## 1. Always-on Render services

Production requirement:

- API web service: paid/always-on.
- Staff web service: paid/always-on, unless converted to a Render Static Site.
- Customer order web service: paid/always-on, unless converted to a Render Static Site.
- PostgreSQL: paid plan with point-in-time recovery.
- Upload disk: attached to the API at `/opt/render/project/src/uploads` and covered by daily snapshots.
- Redis/Key Value used for rate limits and WebSocket delivery: paid persistence appropriate to its purpose.

Free Render web services sleep after an idle period and are not acceptable for a restaurant launch. The dashboard must show no production web service using `Free`.

### Dashboard verification record

| Service | Required state | Verified state |
|---|---|---|
| `restaurant-pos-staging-api` | Paid / always-on | Verified Standard |
| `restaurant-pos-staging-staff-web` | Paid / always-on | Upgraded and verified 0.5 CPU / 512 MB at USD 7/month |
| `restaurant-pos-staging-owner-web` | Paid / always-on | Upgraded and verified 0.5 CPU / 512 MB at USD 7/month |
| `restaurant-pos-staging-customer-webv2` | Paid / always-on | Verified Starter at USD 7/month |
| PostgreSQL | Paid + PITR | Verified Basic-256mb with a seven-day recovery window |
| API upload disk | Attached + daily snapshots | Verified 2 GB mount and seven daily snapshots through 21 October 2026 |
| Redis/Valkey | Paid / always-on | Verified Starter at USD 10/month |

The two upgrades add USD 14/month. The regular workspace baseline is approximately USD 115.50/month before bandwidth or other usage overages. Render's billing page projected USD 106.36 for October because the two upgrades began partway through the billing month.

The baseline includes a second datastore named `restaurant-pos-staging-db` at approximately USD 23.50/month. It must not be deleted until its connection and data ownership are separately confirmed; if it is genuinely unused, retiring it would reduce the baseline to approximately USD 92/month.

## 2. Tenant-isolation controls

### Structural route inventory

The FastAPI application currently exposes:

- 222 method/path route pairs.
- 167 protected route pairs with authenticated user/provider/courier, permission, role, or internal-secret dependencies.
- 55 reviewed public or capability-token route pairs.

`back/tests/test_route_security_inventory.py` makes this classification fail closed. A developer adding an unauthenticated route cannot merge it silently: the test fails until the route is explicitly reviewed and added to the inventory.

Public routes are limited to deliberately public functions such as health, tenant discovery, public reservations, signed table QR ordering, public queue tokens, media reads, authentication, password reset, and the signed HitPay webhook.

### Resource-level tenant tests

The hardening run includes dedicated tests for:

- Cross-tenant order mutation/IDOR.
- QR dining-session isolation and previous-customer history privacy.
- Tenant lifecycle export/delete behavior.
- Tenant settings and secret masking.
- Public tenant/menu behavior.
- Upload path and file isolation.
- Payment amount, order reference, table token, webhook HMAC, and replay handling.

This is a regression safety net, not a claim that any Internet system is impossible to compromise. A formal external penetration test remains recommended before handling high transaction volume.

## 3. Per-tenant HitPay

### New rules

For a production tenant (`is_demo=false`):

1. `tenant.hitpay_api_key` is mandatory for checkout creation and confirmation.
2. `tenant.hitpay_webhook_salt` is mandatory for webhook validation.
3. Global `HITPAY_API_KEY` and `HITPAY_WEBHOOK_SALT` environment values are ignored.
4. The tenant-selected `sandbox` or `live` mode applies only with the tenant's own key.

For a demo tenant (`is_demo=true`):

1. Tenant credentials may be used.
2. Global credentials may be used only as a fallback.
3. HitPay is always forced to sandbox.
4. An attempt to save `live` mode is rejected with HTTP 400.

### Morinaga setup

Morinaga must be created without `--demo`, then its own credentials must be entered in Staff Settings > Payments:

- Morinaga HitPay Business API key.
- Morinaga webhook salt.
- Start in sandbox; run an end-to-end checkout and webhook test.
- Switch only Morinaga to live after business-account approval and launch sign-off.

The webhook URL remains shared:

`https://api.sakorio.com/api/payments/hitpay/webhook`

The payment request ID resolves the order and tenant first; the signature is then validated with that tenant's salt.

## 4. Demo-tenant guardrails

Migration `20261021120000_add_tenant_demo_flag.sql` adds `tenant.is_demo`; follow-up migration `20261021123000_mark_legacy_demo_tenants.sql` safely marks known Ajisen/demo/legacy QA tenants even if the schema migration was already deployed.

Staff guardrails:

- Sidebar badge: `DEMO - TRAINING ONLY`.
- Mobile header badge: `DEMO`.
- Sticky staff-shell banner: `DEMO RESTAURANT - DO NOT ENTER LIVE CUSTOMER ORDERS`.
- Public restaurant picker badge: `DEMO RESTAURANT - TRAINING ONLY`.
- Live HitPay is blocked server-side, not merely hidden in the UI.

New real restaurants default to `is_demo=false`. The onboarding CLI supports `--demo` only for deliberate test/training tenants.

## 5. Automated backups and recovery

The shared server needs both data classes protected.

### PostgreSQL

Use paid Render Postgres. Render continuously backs up paid databases for point-in-time recovery. The available window depends on the Render workspace plan. Confirm the current window on the database Recovery page before launch.

Required checks:

- Recovery page shows PITR available. Verified on 21 October 2026 with a seven-day recovery window.
- A fresh logical export was created and completed on 21 October 2026 at 1:32 PM Singapore time. Create another after Morinaga setup and menu import.
- Record the export timestamp in the company launch record.
- Quarterly, restore to a temporary database and run the launch smoke suite before deleting the temporary recovery instance.

### Uploaded images

Product images are not in PostgreSQL. They live on the API persistent disk. Render creates a persistent-disk snapshot every 24 hours and retains available snapshots for at least seven days. Confirm a recent snapshot is visible after the API service/disk check.

Verified on 21 October 2026: the 2 GB disk is mounted at `/opt/render/project/src/uploads`; seven restore points were visible from 15 through 21 October, with the latest captured at 8:01 AM.

### Recovery targets

- Database recovery point objective: Render PITR window, with a target of less than 24 hours for a logical-export fallback.
- Upload recovery point objective: latest daily disk snapshot.
- Recovery time objective: four hours for a temporary restore, validation, and service connection change.

### Security requirement

Remove database inbound access from `0.0.0.0/0`. Use Render private networking for the API. If an administrator needs external database access, allow only a named, temporary IP and remove it after use.

## 6. Verification evidence

Completed locally in Docker:

- Schema migration applied successfully: `20261021120000`.
- Focused tenant/payment/security suite: 47 passed.
- Complete backend test suite: 353 passed, 2 dependency deprecation warnings.
- Angular development compiler: application bundle generated successfully; no TypeScript/Angular errors.
- Local staff/web endpoint: HTTP 200.
- Backend runtime logs: healthy startup and repeated HTTP 200 health checks.

Completed against the hosted deployment:

- Live schema version: `20261021123000`.
- Public tenant API: Ajisen Ramen and the legacy `test` tenant both return `is_demo=true`.
- Public restaurant picker: both demo tenants visibly show `DEMO RESTAURANT - TRAINING ONLY`.
- Staff and Owner services: paid always-on plans applied and both domains loaded successfully after the compute-plan deployments.
- PostgreSQL: seven-day PITR and completed logical export verified.
- Upload disk: daily snapshots verified through the current day.

The containerized Puppeteer script could not launch Chrome because that image does not include a browser binary. The HTTP reachability check succeeded; browser-visible live verification should be repeated after deployment from the in-app browser.

## 7. Final launch gate for the shared server

Do not create or use Morinaga for live orders until all items are checked:

- [x] All Render production web services are paid/always-on or true static sites.
- [x] PostgreSQL Recovery page shows current PITR.
- [x] API disk page shows a recent daily snapshot.
- [ ] Database external inbound access is restricted.
- [x] The new migration is deployed.
- [x] Ajisen displays the demo badge on the public restaurant picker; authenticated staff desktop/tablet banner remains part of the same deployed build.
- [ ] Ajisen refuses HitPay live mode.
- [ ] Morinaga has unique HitPay sandbox credentials.
- [ ] Morinaga sandbox payment reaches `paid` through its own webhook salt.
- [ ] Cross-tenant staff, QR, order, table, payment, reservation, queue, upload, and report checks pass live.
- [ ] A fresh logical database export is created after Morinaga setup.
- [ ] A restore rehearsal into a temporary database is scheduled and owned.
