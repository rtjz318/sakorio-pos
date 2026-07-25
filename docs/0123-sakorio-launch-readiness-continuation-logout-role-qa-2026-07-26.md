# Sakorio Launch Readiness Continuation: Logout and Role QA

Date: 2026-07-26  
Live site checked: `https://staff.sakorio.com`  
Builds involved:

- `2.1.6 c07dae14` — logout flow hardening deployed
- `2.1.6 a719e5dd` — collapsed staff menu fix deployed and verified

## Summary

This continuation pass followed the remaining launch-readiness items from the previous operational check. During role-permission testing, a more basic navigation/logout issue surfaced first. That issue was fixed and verified live before continuing with further role testing.

## 1. Role permission test attempt

Status: Blocked pending clean credential reset and rate-limit cooldown

Observed:

- Existing QA role accounts are present:
  - `qa.manager@sakario.sg`
  - `qa.kitchen@sakario.sg`
  - `qa.waiter@sakario.sg`
  - `qa.host@sakario.sg`
- Attempted QA role logins did not authenticate.
- The page showed `Incorrect username or password` and later `Too many login attempts. Please try again later.`

Important correction:

- The initial route checks after the failed role logins were not valid permission evidence because the browser was still in the owner session.
- Those route results must not be treated as passed role-permission QA.

Root cause learned:

- The Users modal correctly requires the owner/current actor password when changing another user's password.
- The QA password reset attempt did not include that required current-password field, so it should be considered not completed.
- This is good security behavior, but the live QA reset needs to be repeated intentionally after the login rate limit cools down.

## 2. Logout / collapsed navigation issue

Status: Fixed and verified live

Observed before fix:

- On the live staff viewport, the staff sidebar was collapsed off-canvas.
- The logout button existed in the DOM but was positioned off-screen.
- The top menu button was not visible in that collapsed wider/tablet layout.
- Clicking the off-screen logout element through automation did not log out.

Fixes shipped:

- `front/src/app/shared/sidebar.component.ts`
  - Logout button is now explicitly `type="button"`.
  - Logout click prevents default/bubbling.
  - Logout waits for API logout finalization and then forces a clean `/login?logged_out=1` reload.
- `front/src/app/services/api.service.ts`
  - Logout API call now explicitly sends credentials.
- `front/src/app/shared/sidebar.component.scss`
  - Collapsed staff navigation now shows the top header/menu button.
  - Opening the collapsed menu brings the sidebar back on-screen.
  - Close button/overlay behavior works in collapsed navigation mode.

## 3. Live verification

Status: Passed

Live build verified:

- `2.1.6 a719e5dd`

Steps:

1. Opened `https://staff.sakorio.com/dashboard`.
2. Confirmed build hash `2.1.6 a719e5dd`.
3. Confirmed collapsed top menu button is visible.
4. Opened the menu.
5. Confirmed logout button is now on-screen.
6. Clicked Logout.
7. Confirmed browser landed on `https://staff.sakorio.com/login?logged_out=1`.
8. Confirmed owner email/session text disappeared from the page.

Result:

- Logout passed live.

## Remaining launch-readiness items

1. Wait for login rate-limit cooldown.
2. Re-login as owner.
3. Reset QA role account passwords intentionally with the owner/current-password field filled.
4. Re-run role-permission QA using real QA role sessions, not owner session.
5. Owner still needs to decide whether to close/reset live tables `T06`, `T09`, and `T10`.
6. Physical iPad/tablet clock-in/out camera test still remains.

