# Sakorio next developer access pack

Date: 2026-07-26  
Purpose: checklist for onboarding the next developer safely without putting secrets in GitHub, chat, or documentation.

## Important security rule

Do not paste passwords, API keys, database URLs, SMTP passwords, HitPay secrets, Render secrets, or recovery codes into this document.

Use one of these instead:

- a secure password manager;
- one-time secret sharing link;
- direct account invitation;
- temporary credential that must be rotated after first login.

Where possible, create named accounts for the developer instead of sharing the owner's personal login.

## Minimum access pack summary

The next developer needs:

1. GitHub repo access.
2. Render dashboard access.
3. New Sakorio admin/staff login.
4. HitPay sandbox dashboard access.
5. DNS access.
6. SMTP/email provider access.
7. Secure password manager or one-time credential handoff.
8. Physical device/payment terminal access before launch.

## 1. GitHub repo access

Repository:

- `rtjz318/sakorio-pos`

Branch:

- `development`

Required permissions:

- Pull repository.
- Push to `development`.
- Create branches.
- Create pull requests.
- View Actions/checks if enabled.
- Read issues/PRs/docs.

Preferred role:

- Write access for normal development.
- Admin access only if the developer will manage repo settings, secrets, or branch protection.

Verification steps:

1. Developer clones repo.
2. Developer runs:

```bash
git checkout development
git pull --rebase --autostash origin development
```

3. Developer confirms they can see:
   - `docs/0132-sakorio-pos-developer-handoff-2026-07-26.md`
   - `docs/0131-sakorio-multi-company-deployment-blueprint.md`
   - `docs/company-onboarding-tools.md`

Do not provide:

- GitHub personal access tokens through chat.
- Owner GitHub password.
- Recovery codes.

## 2. Render dashboard access

Purpose:

- Inspect deployments.
- View service logs.
- Trigger manual deploy.
- Manage environment variables.
- Manage disks/uploads.
- Inspect database recovery/export.
- Restrict database inbound network access.

Required Render resources:

| Resource | Purpose |
| --- | --- |
| `restaurant-pos-staging-api` | FastAPI backend |
| `restaurant-pos-staging-staff-web` | Staff POS/admin web |
| Customer/order web service | Customer QR/order web |
| `restaurant-pos-staging-postgres` | PostgreSQL database |
| Redis service, if active | Rate/session/cache support |
| Upload disk | Persistent product/menu images |

Required permissions:

- View services.
- View deploy logs.
- Manual deploy.
- Edit environment variables if authorized.
- View/manage disks.
- View PostgreSQL recovery/export page.
- Manage database network restrictions if authorized.

Verification steps:

1. Developer logs into Render.
2. Developer opens API service.
3. Developer confirms latest deployed commit/hash.
4. Developer opens staff web service logs.
5. Developer opens PostgreSQL recovery page.
6. Developer confirms whether DB inbound restriction is still `0.0.0.0/0`; if yes, this remains a security follow-up.

Do not provide:

- Owner Render password.
- Render API key through chat.
- Raw environment variable values in documents.

## 3. New Sakorio admin/staff login

Purpose:

- Live browser QA.
- Staff POS testing.
- User/role verification.
- Settings/products/tables/reservations/queue testing.

Login URL:

- `https://staff.sakorio.com/login`

Recommended account:

- Create a new named user for the developer.
- Role: `Administrator` or `Owner`, depending on scope.
- Use the developer's real email.
- Require password change/rotation after first login if possible.

Required access areas:

- Dashboard
- POS
- Tables
- Orders
- Reservations
- Queue
- Kitchen & beverages
- Products
- Reports
- Users
- Settings
- Timetable

QA role accounts may also be provided separately:

- `qa.waiter@sakario.sg`
- `qa.host@sakario.sg`
- `qa.kitchen@sakario.sg`
- `qa.manager@sakario.sg`

Important:

- QA passwords should be rotated before sharing.
- Disable or rotate QA accounts after final launch signoff.
- Do not use shared QA accounts for real restaurant operations.

Verification steps:

1. Developer logs into staff portal.
2. Developer confirms dashboard loads.
3. Developer opens POS.
4. Developer opens Products.
5. Developer opens Users.
6. Developer opens Settings.
7. Developer logs out successfully.

## 4. HitPay sandbox dashboard access

Purpose:

- Validate sandbox payment flows.
- Inspect payment request logs.
- Configure/test webhooks.
- Confirm payment status callbacks.
- Prepare production cutover.

Required access:

- HitPay sandbox account/dashboard.
- Ability to view API keys or coordinate with owner who manages keys.
- Ability to view webhook settings.
- Ability to inspect sandbox transactions/payment requests.

Required information:

- Current `HITPAY_MODE`.
- Sandbox webhook URL.
- Sandbox API key configured in Render.
- Sandbox webhook salt configured in Render.
- Production cutover owner and approval process.

Verification steps:

1. Developer opens HitPay sandbox dashboard.
2. Developer finds latest sandbox payment request from Sakorio.
3. Developer confirms webhook configuration points to Sakorio API.
4. Developer runs a controlled sandbox payment test only when authorized.

Do not provide:

- Raw HitPay API key in this document.
- Webhook salt in chat/docs.
- Production keys until production cutover is approved.

## 5. DNS access

Purpose:

- Manage production/staging domains.
- Add domains for future company deployments.
- Verify SSL and custom domains.

Current Sakorio domains:

- `sakorio.com`
- `staff.sakorio.com`
- `order.sakorio.com`
- `api.sakorio.com`

Future company pattern:

- `staff.company.com`
- `order.company.com`
- `api.company.com`

Required permissions:

- View DNS records.
- Add/update CNAME/A records.
- Verify custom domain records for Render.
- Manage SSL-related DNS records if needed.

Verification steps:

1. Developer logs into DNS provider.
2. Developer confirms records for staff/order/API domains.
3. Developer confirms DNS owner/contact for production changes.
4. Developer documents any TTL or propagation constraints before cutover.

Do not provide:

- Domain registrar owner password through chat.
- Domain transfer codes unless explicitly needed.

## 6. SMTP/email provider access

Purpose:

- Reservation confirmation emails.
- Password reset emails.
- Reminder emails.
- Launch email troubleshooting.

Required access:

- SMTP dashboard/provider.
- Sender email configuration.
- SMTP username/password management.
- Email logs if provider supports them.
- DNS email authentication records if needed: SPF, DKIM, DMARC.

Required information:

- SMTP host.
- SMTP port.
- TLS mode.
- Sender email.
- Sender display name.
- Which Render service/environment variables hold SMTP settings.

Verification steps:

1. Developer confirms SMTP settings are configured in Render.
2. Developer sends/observes a reservation confirmation email test if authorized.
3. Developer confirms password reset emails work.
4. Developer checks whether SPF/DKIM/DMARC are configured.

Do not provide:

- SMTP password in GitHub/docs/chat.
- Owner email password.

## 7. Secure credential handoff method

Purpose:

- Avoid leaking secrets in permanent channels.

Accepted methods:

- 1Password / Bitwarden / Dashlane / similar password manager.
- One-time secret link.
- Direct platform invitation.
- Temporary credential that is immediately rotated.

Minimum items to share securely:

| Secret/access | Preferred method |
| --- | --- |
| Render invitation | Direct Render team invite |
| GitHub access | Direct GitHub repo/team invite |
| Sakorio admin login | Create named account + temporary password |
| HitPay sandbox | Direct HitPay user invite |
| DNS provider | Direct user invite or password manager |
| SMTP provider | Direct user invite or password manager |
| Database URL | Prefer Render access; otherwise password manager |

Handoff hygiene:

1. Use named accounts.
2. Enable MFA where possible.
3. Share temporary passwords only through secure method.
4. Rotate temporary passwords after first login.
5. Revoke access when developer offboards.

## 8. Physical device/payment terminal access

Purpose:

- Final launch rehearsal cannot be browser-only.
- Restaurant hardware/network behavior must be tested before go-live.

Required physical access:

- Staff iPad/tablet.
- Customer phone for QR scan.
- Kitchen display device.
- Payment terminal.
- Restaurant Wi-Fi.
- Optional printer hardware if receipt printing enters launch scope.

Required test sequence:

1. Connect staff iPad to restaurant Wi-Fi.
2. Open `https://staff.sakorio.com/login`.
3. Log in as staff/admin.
4. Open POS.
5. Open a table.
6. Scan fixed table QR from customer phone.
7. Customer orders one small item.
8. Kitchen display receives ticket.
9. Mark kitchen ticket served.
10. Pay using payment terminal or sandbox/approved live flow.
11. Close table.
12. Reload old customer QR and confirm it shows closed/unavailable.

Payment terminal details to prepare:

- Provider/bank.
- Terminal model.
- Settlement method.
- Who can perform refunds/voids.
- Who reconciles terminal transactions against POS orders.

## 9. Access ownership checklist

Fill this before handoff.

| Access area | Owner/provider | Developer invited? | MFA required? | Verified login? | Notes |
| --- | --- | --- | --- | --- | --- |
| GitHub |  |  |  |  |  |
| Render |  |  |  |  |  |
| Sakorio admin user |  |  |  |  |  |
| HitPay sandbox |  |  |  |  |  |
| DNS provider |  |  |  |  |  |
| SMTP/email provider |  |  |  |  |  |
| Password manager |  |  |  |  |  |
| Restaurant iPad |  | N/A | N/A |  |  |
| Payment terminal |  | N/A | N/A |  |  |
| Kitchen display device |  | N/A | N/A |  |  |

## 10. First-day developer checklist

The new developer should complete this on day one.

1. Read:
   - `docs/0132-sakorio-pos-developer-handoff-2026-07-26.md`
   - `docs/0131-sakorio-multi-company-deployment-blueprint.md`
   - `docs/company-onboarding-tools.md`
2. Clone repo.
3. Checkout `development`.
4. Confirm Docker stack starts locally.
5. Run at least one backend focused test.
6. Log into Render and inspect services.
7. Log into Sakorio staff app.
8. Run one live-browser smoke:
   - open POS;
   - open Tables;
   - open Orders;
   - open Kitchen;
   - open Products.
9. Confirm access to HitPay sandbox.
10. Confirm DNS and SMTP access or identify who owns them.

## 11. Offboarding checklist

When the developer no longer needs access:

1. Remove GitHub access.
2. Remove Render team access.
3. Disable Sakorio staff/admin account.
4. Remove HitPay access.
5. Remove DNS access.
6. Remove SMTP/email provider access.
7. Revoke password manager shared items.
8. Rotate any shared temporary passwords.
9. Review Render/GitHub audit logs if available.

## 12. Final note

The access pack is separate from the technical handoff.

Technical handoff:

- `docs/0132-sakorio-pos-developer-handoff-2026-07-26.md`

Access handoff:

- this document.

Keep technical knowledge in GitHub. Keep secrets out of GitHub.

