# Sakorio Render company deployment checklist

Use this when deploying Sakorio POS for a new company or outlet.

## 1. Pre-deployment intake

- Confirm company/outlet name.
- Confirm staff, order, and API domains.
- Confirm payment provider details.
- Confirm menu source file.
- Confirm table layout.
- Confirm initial staff users and roles.
- Confirm launch date and first-service support window.

## 2. Create Render infrastructure

### PostgreSQL

- Create a PostgreSQL database.
- Use the same region as the API service.
- Enable recovery/backups.
- Record database service ID in the company launch record.
- Restrict inbound access before launch.

### Redis

- Create Redis if login/rate/session state needs it.
- Keep Redis private/internal where possible.
- Record Redis service ID.

### API service

- Create API service from the master repository.
- Select approved branch/tag.
- Configure all backend environment variables.
- Attach persistent disk.
- Disk mount path:
  - `/opt/render/project/src/uploads`
- Deploy.
- Confirm health endpoint.

### Staff web service

- Create staff web service from the master repository.
- Configure staff frontend/API variables.
- Add staff custom domain.
- Deploy.
- Confirm login page loads.

### Order web service

- Create order web service from the master repository.
- Configure customer frontend/API variables.
- Add order custom domain.
- Deploy.
- Confirm public menu, booking, and waitlist pages load.

## 3. Configure DNS

- Add `api.company.com`.
- Add `staff.company.com`.
- Add `order.company.com`.
- Wait for SSL to become active.
- Confirm each domain loads over HTTPS.

## 4. Configure company data

- Create tenant/company settings.
- Upload logo/header images.
- Create areas/floors.
- Create tables.
- Generate fixed QR links.
- Import menu products.
- Upload product images.
- Create staff users.
- Create temporary QA users if needed.

## 5. Configure payment

- Add HitPay sandbox credentials.
- Add webhook URL in HitPay dashboard.
- Run sandbox payment from Staff POS.
- Run sandbox payment from Customer QR.
- Verify return flow.
- Verify payment status updates in Orders.
- Switch to production credentials only after approval.

## 6. Live browser QA

Run all QA in the live browser:

- Owner/admin login.
- Manager login.
- Waiter login.
- Host login.
- Kitchen login.
- POS table open -> add items -> send order -> pay -> close.
- Customer QR order -> kitchen -> payment -> close.
- Reservation -> host seat now -> QR order -> payment -> close.
- Waitlist -> host seat -> POS/QR order -> payment -> close.
- Products page image check.
- Customer menu image check.
- iPad/tablet viewport check.
- Backup/export visibility check.

## 7. Security launch gate

Before launch:

- Restrict database inbound IPs.
- Confirm no shared QA password remains active.
- Confirm production secrets are not in code/docs.
- Confirm login limiter works.
- Confirm `/users/me` does not expose password hashes.
- Confirm staff roles cannot access unauthorized pages.
- Confirm CORS/trusted hosts are company-specific.

## 8. Backup launch gate

Before launch:

- Create logical database export.
- Confirm PITR is available.
- Confirm upload disk is persistent.
- Confirm product images survive redeploy.
- Record backup/export timestamp.

## 9. Go-live

- Freeze menu changes.
- Print/paste table QRs.
- Train staff by role.
- Switch HitPay to production.
- Run one small live payment.
- Keep support watching first service.
- Record all issues in launch record.

## 10. Post-launch

- Disable or rotate QA accounts.
- Review first-service issues.
- Export database after first service.
- Confirm no failed payment webhooks.
- Confirm no high-error API logs.
- Plan next improvement batch.

