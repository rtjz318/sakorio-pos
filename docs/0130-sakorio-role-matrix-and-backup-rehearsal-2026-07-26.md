# Sakorio role matrix and backup rehearsal

Date: 2026-07-26  
Environment: live Sakorio / Render dashboard  
Requested scope: items 1 and 2 from final launch checklist

## Item 1 - QA role matrix

### QA account preparation

The live Users page shows these QA accounts:

- `qa.manager@sakario.sg` - Administrator / QA Manager
- `qa.kitchen@sakario.sg` - Kitchen Staff / QA Kitchen
- `qa.waiter@sakario.sg` - Waiter / QA Waiter
- `qa.host@sakario.sg` - Receptionist / QA Host

Action completed:

- Rotated the four QA account passwords through the live Users UI.
- Each edit was opened from the visible user card.
- Each modal email was verified before saving.
- The owner current-password confirmation was required before password changes were accepted.

Temporary QA password for this launch role matrix:

- `SakorioQA-2026-Launch!`

Important:

- Rotate or disable these QA accounts after final launch signoff.
- Do not use shared QA accounts for real operations.

### Role matrix execution status

Status: Completed through the live browser after the login limiter cooldown.

Earlier security testing triggered the login limiter. That was expected and confirms the live `/token` limiter is active. After cooldown, the role matrix was completed successfully from the live `staff.sakorio.com` browser UI.

### Live browser route results

| Role | Live login result | Allowed routes verified | Restricted routes verified | Outcome |
| --- | --- | --- | --- | --- |
| QA Waiter | Logged in to `/dashboard` as `qa.waiter@sakario.sg` / Waiter | `/pos`, `/tables`, `/orders` -> `/staff/orders`, `/my-shift` | `/users`, `/settings`, `/reports` redirected to `/dashboard` | Pass |
| QA Host | Logged in to `/dashboard` as `qa.host@sakario.sg` / Receptionist | `/reservations`, `/queue`, `/tables`, `/my-shift` | `/users`, `/settings`, `/reports` redirected to `/dashboard` | Pass |
| QA Kitchen | Logged in to `/dashboard` as `qa.kitchen@sakario.sg` / Kitchen Staff | `/kitchen`, `/orders` -> `/staff/orders`, `/my-shift` | `/pos`, `/tables`, `/users`, `/settings`, `/reports` redirected to `/dashboard` | Pass |
| QA Manager | Logged in to `/dashboard` as `qa.manager@sakario.sg` / Administrator | `/pos`, `/tables`, `/orders` -> `/staff/orders`, `/reservations`, `/queue`, `/kitchen`, `/reports`, `/users`, `/settings`, `/products`, `/working-plan` | Not applicable for this admin role matrix pass | Pass |

Notes:

- The live Orders route uses `/staff/orders` as the routed path when opening `/orders`. This is a working alias, not a permission failure.
- The Timetable UI label currently routes to `/working-plan`. This is a technical route-name mismatch only; the page is reachable for the Manager account.
- QA Kitchen can view Orders and Kitchen & beverages, but cannot enter POS/table/admin surfaces.
- QA Host can manage front-of-house flows but cannot access user/admin/reporting surfaces.

## Security blocker found while preparing item 1

Finding:

- Live `/users/me` returned `hashed_password` for authenticated users.
- This was a password hash, not the raw password, but it should not be sent to the frontend.

Fix completed:

- `/users/me` now returns `UserResponse | None` instead of the full ORM user model.
- Added regression test:
  - `test_users_me_does_not_expose_hashed_password`

Verification:

- Focused backend tests passed:
  - `9 passed`

Commit:

- `65b39de4 security: stop exposing password hashes from users me`

## Item 2 - Backup / restore rehearsal

### Render PostgreSQL service

Service:

- `restaurant-pos-staging-postgres`

Observed:

- PostgreSQL 18
- Region: Singapore
- Instance: Basic-256mb
- Storage: 15 GB
- Storage used: about 0.68%
- Status: Available

### Recovery capability

Render Recovery page shows:

- Point-in-Time Recovery is available.
- Restore can be created from any timestamp in the past 7 days.
- Logical database exports are supported.
- Export files are retained for at least 7 days.

### Logical export rehearsal

Action completed:

- Created a fresh logical export from Render Recovery.

Observed:

- Export row created at:
  - July 26, 2026 at 8:24 PM
- Initial state displayed:
  - `Creating export`
- Follow-up check:
  - `Creating export` message disappeared.
  - Export row remained visible.

Note:

- The browser UI did not show a clearly named download file in the row during the observation window. Recheck before launch and download/store the export if Render exposes the file after additional processing.

### Restore rehearsal

Non-destructive rehearsal result:

- Restore path exists through the Render Recovery page.
- Restore should not be executed directly onto production/staging without a confirmed downtime window.

Recommended safe restore drill:

1. Create a new temporary Render PostgreSQL database from a chosen recovery timestamp.
2. Point a temporary API service or local backend to the restored database.
3. Verify:
   - tenant exists;
   - products/menu images reference expected filenames;
   - tables/orders/reservations exist;
   - staff login works;
   - reports can query restored data.
4. Delete the temporary restore database after verification.

### Database network security concern

Finding:

- Database inbound IP restrictions currently show:
  - `0.0.0.0/0` / `everywhere`

Risk:

- This allows external network reachability to the database endpoint if credentials are compromised.

Recommendation before final production launch:

- Remove broad external access if not required.
- Prefer private/internal Render networking from API service to database.
- If external DB admin access is needed, restrict to named office/admin IP ranges only.

## Current launch status for items 1 and 2

- Item 1 account preparation: complete.
- Item 1 browser role matrix: complete; all four QA roles passed live-route checks.
- Item 2 backup capability: verified.
- Item 2 logical export: created.
- Item 2 destructive restore: not performed, by design.
- Item 2 safe restore drill: recommended as a temporary clone/restore, not production overwrite.
- Open security follow-up: remove or restrict database inbound access currently shown as `0.0.0.0/0` before final production launch.
