# Sakorio final security resilience pass

Date: 2026-07-26  
Environment: live Sakorio domains + local Docker regression checks  
Commit under test before fixes: `4b4a98e7`  
Hardening commit verified live: `cc0ed9b`

## Scope

This pass focused on the launch security items requested before go-live:

- Browser/API security headers
- Public QR/menu token behavior
- Staff login and session behavior
- Login rate limiting
- Protected staff/admin API access
- HitPay webhook spoofing behavior
- Upload/public file serving security
- Staff Settings secret masking
- Remaining role-permission verification gaps

## Live checks completed

### SEC-001 - Public security headers

Result: Pass

Checked:

- `https://api.sakorio.com/health`
- `https://staff.sakorio.com/`
- `https://order.sakorio.com/`

Observed:

- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`

### SEC-002 - CORS arbitrary origin

Result: Pass

Checked API health with `Origin: https://evil.invalid`.

Observed:

- No `access-control-allow-origin` for the untrusted origin.
- API still returns normal health response.

### SEC-003 - Invalid customer QR/menu link

Result: Pass

Browser URL:

- `https://order.sakorio.com/menu/not-a-real-token?qr_access=bad-token`

Observed:

- Safe customer-facing message: menu link not available.
- No stack trace, SQL details, Python exception, or internal debug output.

### SEC-004 - Customer QR ordering surface

Result: Pass

Observed on live QR page:

- Menu categories render.
- Menu images load.
- No customer name prompt.
- No Cash option shown to customer.
- Add-to-cart works.
- Order CTA appears after item selection.

### SEC-005 - Protected staff route redirects when unauthenticated

Result: Pass

Checked:

- `https://staff.sakorio.com/users`

Observed:

- Redirects to staff login when unauthenticated.

### SEC-006 - Staff owner login/session

Result: Pass

Observed:

- Owner login works.
- Auth cookies are `HttpOnly`, `Secure`, `SameSite=Lax`.
- Access token max age: 30 minutes.
- Refresh token max age: 7 days.

### SEC-007 - Login brute-force rate limiting

Result: Pass

Method:

- Six failed login attempts with a harmless fake account.

Observed:

- Attempts 1-5: `401`
- Attempt 6: `429`

### SEC-008 - Protected staff/admin APIs

Result: Pass

Checked unauthenticated requests:

- `/users`
- `/orders`
- `/tenant/settings`

Observed:

- All return `401 Not authenticated`.

Note:

- `/users/me` returns `200 null` when unauthenticated. This appears intentional because the frontend uses it to determine session state.

### SEC-009 - HitPay webhook spoofing

Initial result: Fix applied

Observed:

- A spoofed HitPay webhook with an unknown payment request ID returned `404 Order not found for HitPay webhook`.

Concern:

- This could help an attacker distinguish unknown vs known HitPay request IDs.

Fix:

- Unknown HitPay request IDs now return generic `{ "status": "ignored" }`.
- Added regression test to ensure the old `Order not found` message is not exposed.

### SEC-010 - Upload security

Result: Pass, plus hardening fix applied

Live checks:

- Unauthenticated product image upload returns `401`.
- Upload path traversal attempt returns `404`.
- Public contract upload path returns `403` with safe message.

Concern found:

- Tenant logo upload allowed raw SVG.

Fix:

- Tenant logos are now raster-only: JPG, PNG, WebP, AVIF.
- Settings UI file picker no longer accepts SVG.
- Settings upload hint translations no longer advertise SVG.
- Added regression test to reject SVG logo upload.

### SEC-011 - Settings secret masking

Result: Pass

Checked live Settings > Payment Settings.

Observed:

- HitPay API key, webhook salt, and fiscal API secret use password fields.
- Full values are not visible in browser text.
- No `test_...` API key or long webhook salt was exposed in visible text.

## Role permission verification

Status: Partial

Observed:

- Existing QA role users are present:
  - `qa.waiter@sakario.sg`
  - `qa.host@sakario.sg`
  - `qa.kitchen@sakario.sg`
  - `qa.manager@sakario.sg`

Blocked:

- Their password is intentionally not committed to git.
- I did not guess or brute-force QA role credentials.

Launch requirement:

- Before final go-live, either provide/reset the QA role password and run the browser role matrix, or rotate the QA users with a known temporary password and run:
  - waiter cannot access Users/Settings/Reports;
  - host cannot access Users/Settings/Reports;
  - kitchen cannot access Users/Settings/Reports;
  - manager/admin can access required management areas.

## Regression checks run

Backend:

```text
python -m pytest -q tests/test_payment_security.py tests/test_uploads_security.py tests/test_settings_security.py
18 passed
```

Frontend:

```text
npm run build -- --configuration production-static
passed
```

Notes:

- Existing non-blocking Angular warnings remain for component style budget and `qrcode` CommonJS dependency.
- No TypeScript/Angular compiler error was observed in Docker frontend logs after the Settings change.

## Changes made in this pass

1. HitPay webhook hardening:
   - Unknown payment request IDs now return a generic ignored response.
   - Prevents webhook ID enumeration through response differences.

2. Logo upload hardening:
   - Removed raw SVG logo upload support.
   - Kept logo uploads to raster image formats only.
   - Updated Settings UI and translations.

3. Regression tests:
   - Added unknown HitPay webhook test.
   - Added SVG logo rejection test.

## Post-deploy live verification

Deployment:

- Render API service deployed `cc0ed9b`.
- Staff frontend displayed `2.1.6 cc0ed9b` in the live browser.

Verified after deploy:

- API `/health` returned `200 OK` with security headers.
- Spoofed unknown HitPay webhook returned generic `status: ignored`.
- Settings > Business Profile logo upload hint now says: `JPG, PNG, WebP, AVIF`.
- Settings logo file input now accepts only: `image/jpeg,image/png,image/webp,image/avif`.
- Settings logo hint no longer mentions SVG.

## Remaining before 100% launch signoff

1. Run QA role matrix with known QA role password.
2. Perform backup/restore rehearsal.
3. Complete physical iPad/phone QR/printer trial.
