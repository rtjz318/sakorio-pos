# Sakorio company launch record template

Copy this file for every new company deployment.

Recommended filename:

- `docs/company-launch-records/company-name-launch-yyyy-mm-dd.md`

## Company

- Company name:
- Outlet/brand:
- Legal entity:
- UEN/company number:
- GST/tax registration:
- Main contact:
- Technical contact:
- Launch owner:

## Environment

- Environment: staging / production
- Deployment model: isolated company deployment / shared multi-tenant
- Git branch:
- Git commit:
- Deployment date:
- Deployment operator:

## Domains

- Staff URL:
- Customer order URL:
- API URL:
- Render dashboard URL:

## Render services

- API service name:
- API service ID:
- Staff web service name:
- Staff web service ID:
- Order web service name:
- Order web service ID:
- PostgreSQL name:
- PostgreSQL ID:
- Redis name:
- Redis ID:
- Upload disk mount path:
- Upload disk size:

## Environment variables

Do not paste secret values here. Record only whether they are configured.

| Variable group | Configured | Notes |
| --- | --- | --- |
| Database URL |  |  |
| Redis URL |  |  |
| Secret key |  |  |
| Staff/order/API base URLs |  |  |
| CORS/allowed origins |  |  |
| Trusted hosts |  |  |
| Email SMTP |  |  |
| HitPay API key |  |  |
| HitPay webhook salt |  |  |
| HitPay mode |  |  |
| Production flag |  |  |

## Tenant data

- Tenant ID:
- Restaurant display name:
- Currency:
- Timezone:
- Default phone country:
- Address:
- Operating hours:
- Logo uploaded:
- Header/background uploaded:

## Tables and QR

- Total tables:
- Areas/floors:
- Table naming format:
- Fixed QR generated:
- QR printed:
- QR pasted on tables:
- QR scan test passed:

Table verification:

| Table | Seats | QR works | Current session only | Notes |
| --- | ---: | --- | --- | --- |
| T01 |  |  |  |  |

## Menu/products

- Source menu file:
- Total products:
- Total categories:
- Images uploaded:
- Images persist after redeploy:
- Price cross-check complete:

Menu verification:

| Category | Expected count | Live count | Price check | Image check | Notes |
| --- | ---: | ---: | --- | --- | --- |

## Staff users

Do not record passwords here.

| Name/email | Role | Login verified | Notes |
| --- | --- | --- | --- |

## Payment

- HitPay mode: sandbox / production
- Webhook configured:
- Staff POS payment test:
- Customer QR payment test:
- Return URL test:
- Paid order appears in Orders:
- Table close after payment:

Payment test references:

| Flow | Reference | Outcome | Notes |
| --- | --- | --- | --- |

## Security checklist

| Check | Status | Notes |
| --- | --- | --- |
| HTTPS active |  |  |
| CORS restricted |  |  |
| Trusted hosts restricted |  |  |
| Database inbound restricted |  |  |
| No `0.0.0.0/0` database access |  |  |
| Login rate limiter active |  |  |
| `/users/me` does not expose password hash |  |  |
| QA accounts disabled/rotated |  |  |
| Render/GitHub/HitPay admin MFA |  |  |

## Backup and restore

- PITR available:
- Logical export created:
- Export timestamp:
- Upload/media backup approach:
- Restore drill completed:
- Temporary restored DB deleted:

## Browser QA signoff

| Area | Status | Score | Notes |
| --- | --- | ---: | --- |
| Staff login |  |  |  |
| Role matrix |  |  |  |
| POS table flow |  |  |  |
| Customer QR order |  |  |  |
| Orders current/history |  |  |  |
| Kitchen display |  |  |  |
| Reservations |  |  |  |
| Queue/waitlist |  |  |  |
| Payment and close table |  |  |  |
| Products/menu images |  |  |  |
| iPad viewport |  |  |  |
| Backup/export |  |  |  |

## Launch decision

- Launch status: ready / not ready
- Blockers:
- Follow-up improvements:
- Final approval by:
- Approval date:

