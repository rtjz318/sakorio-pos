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

Render plan and recovery verification must be completed in the authenticated Render dashboard before Morinaga is onboarded. The dashboard session was signed out during this pass; see the final hosting checklist below.

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
| `restaurant-pos-staging-api` | Paid / always-on | Pending authenticated dashboard check |
| `restaurant-pos-staging-staff-web` | Paid / always-on or Static Site | Pending authenticated dashboard check |
| Customer/order web service | Paid / always-on or Static Site | Pending authenticated dashboard check |
| PostgreSQL | Paid + PITR | Previously verified paid; reconfirm current Recovery page |
| API upload disk | Attached + daily snapshots | Disk previously attached; reconfirm Snapshots page |

Do not approve any new recurring charge without recording the selected plan and monthly delta.

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

Migration `20261021120000_add_tenant_demo_flag.sql` adds `tenant.is_demo` and marks known Ajisen tenant names as demo.

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

- Recovery page shows PITR available.
- Create a fresh logical export after Morinaga setup and menu import.
- Record the export timestamp in the company launch record.
- Quarterly, restore to a temporary database and run the launch smoke suite before deleting the temporary recovery instance.

### Uploaded images

Product images are not in PostgreSQL. They live on the API persistent disk. Render creates a persistent-disk snapshot every 24 hours and retains available snapshots for at least seven days. Confirm a recent snapshot is visible after the API service/disk check.

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

The containerized Puppeteer script could not launch Chrome because that image does not include a browser binary. The HTTP reachability check succeeded; browser-visible live verification should be repeated after deployment from the in-app browser.

## 7. Final launch gate for the shared server

Do not create or use Morinaga for live orders until all items are checked:

- [ ] All Render production web services are paid/always-on or true static sites.
- [ ] PostgreSQL Recovery page shows current PITR.
- [ ] API disk page shows a recent daily snapshot.
- [ ] Database external inbound access is restricted.
- [ ] The new migration is deployed.
- [ ] Ajisen displays the demo banner on staff desktop and tablet layouts.
- [ ] Ajisen refuses HitPay live mode.
- [ ] Morinaga has unique HitPay sandbox credentials.
- [ ] Morinaga sandbox payment reaches `paid` through its own webhook salt.
- [ ] Cross-tenant staff, QR, order, table, payment, reservation, queue, upload, and report checks pass live.
- [ ] A fresh logical database export is created after Morinaga setup.
- [ ] A restore rehearsal into a temporary database is scheduled and owned.
