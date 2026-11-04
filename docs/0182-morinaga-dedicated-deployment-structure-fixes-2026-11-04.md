# Morinaga dedicated deployment structure fixes

Date: 4 November 2026 (Asia/Singapore)

## Decision

Morinaga can launch on the current shared Sakorio infrastructure while the
isolated deployment is prepared. Its live tenant data and production payment
credentials are tenant-scoped. The work in this change makes an isolated
deployment safe and repeatable without changing the existing Morinaga data.

## Implemented structure

1. **Runtime tenant binding** — customer, staff and management web deployments
   accept a fixed tenant id and portal mode at container startup.
2. **Dedicated portal roots** — a customer deployment opens the configured
   restaurant menu; staff opens its tenant login; management opens a dedicated
   management login.
3. **Server-enforced management login** — the API accepts the management scope
   only with a tenant id and only for owner/admin roles. A route label alone is
   not treated as security.
4. **Native build binding** — Android/iOS assets have a required preparation
   command. Unconfigured native builds no longer silently default to Ajisen.
5. **Demo cleanup safety** — the old hard-coded tenant id list was removed.
   Cleanup now requires explicit ids, an exact phrase, and `is_demo=true` for
   every selected tenant before anything is deleted.
6. **Isolated database migration** — a restore-and-prune command defaults to a
   dry run and requires both an isolated-deployment flag and a phrase containing
   the exact production tenant id/name before execution.
7. **Deployment template** — generated Render settings now contain the tenant,
   customer/staff/management portal modes, native build settings and the rule
   that production HitPay credentials live on the tenant.
8. **Static-site compatibility** — the build-time configurator accepts
   customer, staff or management modes, so the two frontends can use free
   Render static services without relying on a Docker startup hook.

## Morinaga portal values

| Purpose | Value |
|---|---|
| Tenant | `3` (`Morinaga Ramen Izakaya`) |
| Customer | `https://morinaga-order.sakorio.com` |
| Staff | `https://morinaga-staff.sakorio.com/login` |
| Management | `https://morinaga-staff.sakorio.com/management/login` |
| API | `https://morinaga-api.sakorio.com` |

These domains are proposed isolated-deployment values. The current shared URLs
remain usable until the new services pass QA and DNS is deliberately switched.

## Native preparation

After the production-static Angular build and before `npx cap sync android`:

```powershell
$env:SAKORIO_TENANT_ID = "3"
$env:SAKORIO_API_URL = "https://morinaga-api.sakorio.com"
$env:SAKORIO_PUBLIC_ORDER_ORIGIN = "https://morinaga-order.sakorio.com"
npm run native:configure-runtime
```

The generated app is then permanently branded to Morinaga. Future restaurants
use the same command with their own tenant and domains; no source-code edit is
required.

## Payment boundary

No HitPay credentials were added or changed in this work. Production tenants
must store their own key and webhook salt in tenant settings. The shared
environment fallback remains limited to tenants marked as demos.

## Cutover rule

Do not point Morinaga DNS or enable live HitPay until the isolated API,
PostgreSQL, Redis, upload disk and both portals pass the launch checklist. The
current shared Morinaga tenant remains the rollback path until cutover is
signed off.

## Verification evidence

| Check | Result |
|---|---|
| Focused backend/runtime tests | 20 passed |
| Complete backend regression | 372 passed, 2 dependency deprecation warnings |
| Angular production-static build | Passed; existing POS/menu style-budget and QR CommonJS warnings only |
| Angular development compiler | Rebuilt successfully; no current TypeScript/Angular compiler errors |
| Native runtime configuration test | Passed for Morinaga tenant `3`, HTTPS API, WSS and order origin |
| Android readiness | Passed; correctly warns until a specific tenant is injected before Capacitor sync |
| Customer portal browser simulation | Root redirected to `/public-menu/1` in the disposable tenant-1 fixture |
| Staff portal browser simulation | Root redirected to `/login?tenant=1` |
| Management portal browser simulation | Root redirected to `/management/login?tenant=1` and displayed the owner/admin-only heading |
| Management API authorization | Owner allowed; waiter rejected; cross-tenant login rejected; missing tenant rejected |
| Runtime entrypoint shell validation | Passed |
| Container health/log audit | Frontend compile succeeded; backend health checks returned HTTP 200; no new application exception found |
| Current shared Morinaga staff path | Live browser displayed `Logging in to Morinaga Ramen Izakaya` at `/login?tenant=3` |
| Current shared Morinaga customer path | Live browser rendered the Morinaga public menu, categories, images and SGD prices at `/public-menu/3` |

The disposable local database did not contain tenant `1`, so the simulated
portal could not render restaurant branding after routing and returned the
expected tenant-not-found response. Route selection itself was verified in the
browser. Morinaga branding is already verified on the shared live tenant; the
dedicated Morinaga domains can be tested only after those services exist.
