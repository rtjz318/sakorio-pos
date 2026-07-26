# Sakorio POS launch security hardening

Date: 2026-07-26  
Scope: pre-launch security controls for Sakorio POS staff web, customer QR ordering, API, database, Redis, uploads, and operations.

## Security position

No internet-connected POS can be guaranteed “unhackable”. The launch goal is to reduce attack surface, enforce least privilege, prevent obvious configuration mistakes, and make failures visible quickly.

## Implemented in code/config

### Backend/API

- Production now fails fast if `SECRET_KEY` or `REFRESH_SECRET_KEY` are default, short, or identical.
- Production now fails fast if `CORS_ORIGINS` contains `*` while credential cookies are enabled.
- Production requires HTTPS origins for CORS, except localhost/127.0.0.1 development origins.
- Optional `ALLOWED_HOSTS` support added through FastAPI `TrustedHostMiddleware`.
- API security headers added:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Strict-Transport-Security` in production
- Existing protections confirmed present:
  - HTTP-only auth cookies.
  - Secure cookies when `PRODUCTION=true`.
  - Separate access and refresh token secrets.
  - Redis-backed rate limiting with per-login/public/payment/admin limits.
  - Signed printed table QR bearer credential.
  - Staff menu link uses short-lived signed token.

### Frontend/static web

- Nginx production image now sends baseline security headers:
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Strict-Transport-Security`

### HAProxy production

- Production HAProxy now strips `Server` and sets baseline hardening headers.
- HTTPS redirect remains enabled.
- HSTS is added only for TLS traffic.
- DB and Redis are not publicly exposed through HAProxy.

### Docker/local network

- PostgreSQL and Redis are bound to `127.0.0.1` on local/dev compose.
- Backend, frontend, Redis, DB, and websocket bridge communicate over internal Docker network.
- Production compose exposes only HAProxy ports `80` and `443`.

## Required Render/deployment settings before go-live

Set these exactly in Render/API service environment variables:

```env
PRODUCTION=true
SECRET_KEY=<unique random 64+ char value>
REFRESH_SECRET_KEY=<different unique random 64+ char value>
CORS_ORIGINS=https://staff.sakorio.com,https://order.sakorio.com
ALLOWED_HOSTS=api.sakorio.com,staff.sakorio.com,order.sakorio.com
SECURITY_HEADERS_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REDIS_URL=<private Redis URL if separate from REDIS_URL>
PUBLIC_APP_BASE_URL=https://staff.sakorio.com
```

If the API is served from `api.sakorio.com`, confirm CORS includes only the frontends that call it. Do not use `*` in production.

## Firewall / network checklist

### Render services

- API service:
  - Public inbound only on HTTPS.
  - No shell/SSH access unless actively debugging.
  - Environment variables hidden and rotated if exposed.
- Staff web service:
  - Public inbound only on HTTPS.
  - No persistent disk unless needed for static assets.
- Customer order web:
  - Public inbound only on HTTPS.
  - Same production headers as staff web.
- PostgreSQL:
  - Prefer Render managed database with private/internal connection string.
  - Disable public database connections if possible.
  - If public access must exist temporarily, restrict by source IP and remove after migration/import.
  - Use unique strong DB password, not `pos`.
- Redis:
  - Use private/internal Redis URL.
  - Do not expose Redis publicly.
  - Require TLS/password if using a managed Redis with public endpoint.

### DNS/TLS

- `staff.sakorio.com`, `order.sakorio.com`, and `api.sakorio.com` must all enforce HTTPS.
- Confirm certificate auto-renewal is active.
- Confirm no direct backend/admin service URL is advertised to staff/customers.

## Database security checklist

- Use managed PostgreSQL backups.
- Enable point-in-time recovery if the plan supports it.
- Create a pre-launch manual backup before physical trial.
- Create a post-menu-import backup after final menu/images are loaded.
- Restrict database user permissions where possible:
  - App user should not be a broad superuser in production.
  - Migration/admin user can be separate if Render workflow allows.
- Confirm Render disk is attached for uploaded menu images, and backups include both:
  - database rows storing image references;
  - persistent upload disk files.

## Authentication and staff operations

- Remove or disable stale QA/test users before launch.
- Enforce strong unique passwords for owner/admin accounts.
- Turn on OTP/MFA for owner/admin accounts if available.
- Create separate accounts per staff member; do not share one cashier login.
- Keep role permissions tight:
  - kitchen only for kitchen users;
  - waiter/cashier only for service users;
  - admin/owner only for management.
- Rotate credentials after physical trial if temporary QA accounts were used.

## Payment security

- Keep HitPay in sandbox until physical trial is complete.
- Switch to live HitPay only after:
  - webhook salt is configured;
  - webhook delivery is verified;
  - customer Cash option remains removed;
  - terminal settlement workflow is approved.
- Do not store card details in Sakorio POS.
- Ensure refund/void/correction flows require manager/accounting approval.

## Upload/image security

- Keep uploaded images on persistent disk.
- Do not allow arbitrary file extensions for menu uploads.
- Keep generated filenames random/server-controlled.
- Do not expose raw filesystem paths in API responses.
- Verify `/uploads/...` serves only intended public image files.

## Monitoring / response checklist

- Enable Render alerts for:
  - service down;
  - deploy failure;
  - high CPU/memory;
  - database connection exhaustion;
  - high 4xx/5xx rate.
- Watch API logs for:
  - repeated `429` rate limit violations;
  - repeated failed login;
  - invalid QR/menu tokens;
  - HitPay webhook failures.
- Keep a launch rollback plan:
  - previous Render deploy available;
  - database backup timestamp recorded;
  - emergency admin login tested;
  - contact list for Render/HitPay/domain access.

## Final go-live gate

Before public launch, run:

1. Render deploy with `PRODUCTION=true`.
2. Browser QA on `staff.sakorio.com`, `order.sakorio.com`, and `api.sakorio.com`.
3. Security header check on all public domains.
4. Database backup verification.
5. 20–30 end-to-end service simulations on live staging/production-like environment.
6. Physical iPad/phone QR rehearsal.
7. HitPay sandbox-to-live decision sign-off.

