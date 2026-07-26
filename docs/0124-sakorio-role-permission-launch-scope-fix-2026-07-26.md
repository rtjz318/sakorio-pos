# Sakorio Role Permission Launch Scope Fix

Date: 2026-07-26  
Live site checked: `https://staff.sakorio.com`  
Relevant live builds:

- `2.1.6 a719e5dd` — logout/collapsed menu fix
- `b57fb5c` / commit `b57fb5ce` — launch role navigation scope fix

## Summary

This pass continued role-permission launch readiness after the collapsed-menu/logout issue was fixed.

The QA role accounts were reset correctly through the live Users UI using the required owner/current-password re-auth field. Role logins then worked on build `a719e5dd`, allowing the first valid role QA run to proceed.

That run exposed a launch-scope polish/security issue: restricted admin pages were blocked correctly, but non-admin roles still saw too many back-office navigation/dashboard entries. The code was tightened and deployed as commit `b57fb5ce`.

## QA accounts reset through live UI

Status: Done

Accounts reset through `https://staff.sakorio.com/users`:

- `qa.manager@sakario.sg`
- `qa.kitchen@sakario.sg`
- `qa.waiter@sakario.sg`
- `qa.host@sakario.sg`

The temporary QA password was not written into this document.

Important observation:

- The Users modal correctly requires the owner/current-password field before changing another user's password.
- This is good security behavior and should remain.

## Valid pre-fix role QA observations

Build: `2.1.6 a719e5dd`

### Waiter

Login status: Passed

Allowed:

- `/pos`
- `/tables`

Denied / redirected to dashboard:

- `/settings`
- `/users`
- `/reports`

Issue found:

- Waiter sidebar/dashboard still showed extra back-office entries such as Products, Catalog, Timetable, Contracts, and Kitchen.

### Host / Receptionist

Login status: Passed

Allowed:

- `/reservations`
- `/queue`
- `/tables`
- `/pos`

Denied / redirected to dashboard:

- `/settings`
- `/users`
- `/reports`

Issue found:

- Host sidebar/dashboard still showed extra back-office entries such as Products, Catalog, Timetable, Contracts, and Kitchen.

### Kitchen

Login status: Passed

Allowed:

- `/kitchen`

Denied / redirected to dashboard:

- `/pos`
- `/settings`
- `/users`
- `/reports`

Issue found:

- Kitchen sidebar/dashboard still showed Products, Catalog, Timetable, and Contracts, which is too broad for launch.

### Manager / Admin

Login status: Passed

Allowed:

- `/dashboard`
- `/settings`
- `/users`
- `/reports`
- `/pos`
- `/tables`
- `/kitchen`

Manager access aligned with expectations.

## Code fix shipped

Commit: `b57fb5ce fix: tighten launch role navigation scope`

Files changed:

- `front/src/app/services/permission.service.ts`
- `front/src/app/auth/role.guard.ts`
- `front/src/app/app.routes.ts`
- `front/src/app/shared/sidebar.component.ts`
- `front/src/app/dashboard/dashboard.component.ts`

Changes:

- Products and Catalog are now owner/admin only.
- Timetable / Working Plan is now owner/admin only.
- Contracts are now owner/admin only.
- Kitchen display is now owner/admin/kitchen/bartender only.
- Waiter and Host remain focused on service-floor flows.
- Sidebar visibility now follows the tightened route permissions.
- Dashboard action cards now follow the tightened route permissions.

Local verification before push:

- Angular/frontend Docker rebuild completed with `Application bundle generation complete`.
- Local smoke response returned HTTP `200`.

Render deployment:

- Render deployed commit `b57fb5c`.
- Render showed the staff web service as Live on `b57fb5c`.

## Post-fix live role rerun

Status: Blocked by live login rate limit

After deployment, the post-fix browser rerun was attempted immediately. The live login endpoint returned:

- `Too many login attempts. Please try again later.`

The backend limit is configured as:

- `rate_limit_login_per_15min`
- default observed in code: `5/15 minutes`

Because the role rerun requires logging in as multiple accounts, the final post-fix browser proof must wait for the cooldown window before continuing.

## Next required step

After the 15-minute login cooldown:

1. Log in as each QA role again.
2. Confirm each role lands in its own account, not owner session.
3. Confirm expected allowed paths:
   - Waiter: POS, Tables
   - Host: Reservations, Queue, Tables, POS
   - Kitchen: Kitchen display
   - Manager: full admin/service access
4. Confirm denied paths redirect to Dashboard or otherwise do not expose restricted modules:
   - Settings
   - Users
   - Reports
   - Products
   - Catalog
   - Timetable
   - Contracts
   - Kitchen for non-kitchen service roles
5. Confirm sidebar/dashboard no longer show irrelevant back-office links for Waiter, Host, and Kitchen.

