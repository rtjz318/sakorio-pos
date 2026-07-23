# Sakorio POS final QA and improvements summary

Date: 2026-07-23  
Branch: `development`  
Latest deployed fix commit: `123e2e40`  
Latest documentation commit: `81ebe2b8`

## Executive summary

Sakorio POS has gone through an extensive live-browser QA cycle covering customer QR ordering, cashier POS, tables, reservations, queues, kitchen/beverage display, orders, reports, timetable, users, and role access.

The final 100-use-case QA run found that the system was close to launch readiness, but five blockers prevented final signoff:

1. Customer QR optional-name prompt blocked ordering on smaller/tablet viewports.
2. Timetable shift deletion was unclear and the synthetic QA shift did not clean up.
3. Stale QA reservations/queue/table artifacts cluttered live service views.
4. Role-specific QA credentials were missing for Waiter, Host, Kitchen, and Manager testing.
5. True iPad/tablet viewport regression support was missing.

All five blockers have now been addressed in code, deployed to the live staging services, and browser-verified where the current browser tooling allows.

## Systems covered in QA

The QA passes covered these major areas:

- Customer QR ordering on `order.sakorio.com`
- Staff POS on `staff.sakorio.com/pos`
- Tables and table lifecycle
- Reservations and host seating flow
- Queue / waitlist flow
- Kitchen & beverage display
- Orders overview and history
- Reports and launch close-flow checklist
- Timetable / working plan
- My Shift clock-in profile selection
- Users and role-based access
- Payment settings and HitPay/terminal readiness
- iPad/tablet layout readiness

## Key improvements completed

### 1. Customer QR ordering is no longer blocked by the name prompt

Before:

- A customer scanning a QR code was immediately shown the optional name modal.
- In the live browser, the `Skip` and `OK` buttons could be pushed too low in the viewport.
- This blocked ordering and prevented further QR, HitPay, and KDS regression flows.

Improved:

- The QR menu now opens directly to the menu.
- Customer name is now optional through a small header chip.
- The name modal still exists, but it no longer blocks first-time browsing or ordering.
- The modal was hardened with better mobile/tablet fit, sticky actions, a visible close button, safer tap targets, and test IDs.

Live verification:

- Fresh QR tab loaded menu without the blocking modal.
- Added `Coca Cola` to cart directly.

### 2. Timetable deletion and cleanup improved

Before:

- QA created a synthetic shift: `Ajisen (Owner) 2026-07-26 10:00–12:00`.
- Delete action was confusing and did not remove the shift during the earlier pass.

Improved:

- Delete confirmation now shows the exact shift detail.
- Delete action has busy-state protection.
- Successful delete optimistically removes the shift and reloads schedule data.
- A safe cleanup script was added for known QA artifacts.

Live verification:

- Synthetic shift was deleted through the live browser.
- Timetable count dropped from `25` to `24`.
- `Ajisen 10-12` no longer appeared on Jul 26.

### 3. Reservation board now defaults to active service

Before:

- The Reservations page defaulted to all statuses.
- Finished QA reservations crowded the host service timeline.

Improved:

- Reservations now default to `Active service`.
- Finished, cancelled, no-show, and full history remain available through the status dropdown.

Live verification:

- Reservations page showed version `123e2e40`.
- Default filter was `Active service`.
- Board showed `1 of 7 reservations`, keeping finished QA history out of the normal host workflow.

### 4. QA role accounts created and verified

Before:

- Role access could not be fully QA-tested because only owner credentials were available.

Improved:

- Live QA accounts were created:
  - `qa.waiter@sakario.sg`
  - `qa.host@sakario.sg`
  - `qa.kitchen@sakario.sg`
  - `qa.manager@sakario.sg`
- Added env-driven backend seeding script:
  - `back/app/seeds/seed_role_qa_users.py`
- Added browser role matrix regression:
  - `front/scripts/test-role-access-matrix.mjs`
  - `npm run test:role-access-matrix --prefix front`

Live role verification:

- Waiter:
  - Allowed: POS, Tables, Orders, My Shift
  - Restricted: Users, Settings
- Host / Receptionist:
  - Allowed: Reservations, Queue, Tables, My Shift
  - Restricted: Users, Settings
- Kitchen:
  - Allowed: Kitchen, My Shift
  - Restricted: Users, Settings
- Manager / Admin:
  - Allowed: POS, Reports, Users, Settings

Note:

- After many rapid role login swaps, the final owner re-login hit the live login rate limiter. This is expected security behavior and happened after role checks had completed.

### 5. iPad/tablet regression tooling added

Before:

- The in-app browser could inspect pages but could not force a true iPad viewport.
- Final tablet QA could not be properly automated from that browser surface.

Improved:

- Added viewport regression script:
  - `front/scripts/test-ipad-viewports.mjs`
  - `npm run test:ipad-viewports --prefix front`
- The script checks:
  - iPad portrait `820×1180`
  - iPad landscape `1180×820`
  - POS
  - Tables
  - Reservations
  - Queue
  - Kitchen
  - Optional customer QR via `CUSTOMER_QR_URL`
- It fails on:
  - blank/error pages,
  - horizontal overflow,
  - offscreen visible controls,
  - QR name modal blocking initial browsing.

Remaining validation:

- This script should be run against staging with live credentials and a current QR URL.
- A real iPad/Safari manual check is still recommended before launch.

## Supporting scripts added

### QA cleanup script

File:

- `back/app/seeds/cleanup_qa_artifacts.py`

Purpose:

- Archive clearly marked QA/test reservations.
- Archive clearly marked QA/test queue rows.
- Remove the known synthetic timetable shift.

Run example:

```bash
SAKORIO_QA_TENANT_ID=1 python -m app.seeds.cleanup_qa_artifacts
```

### QA role seed script

File:

- `back/app/seeds/seed_role_qa_users.py`

Purpose:

- Creates/updates role-specific QA users for browser testing.
- Password is environment-driven and not committed to git.

Run example:

```bash
SAKORIO_QA_TENANT_ID=1 SAKORIO_QA_PASSWORD="..." python -m app.seeds.seed_role_qa_users
```

### iPad viewport regression

File:

- `front/scripts/test-ipad-viewports.mjs`

Run example:

```bash
BASE_URL=https://staff.sakorio.com \
LOGIN_EMAIL="..." \
LOGIN_PASSWORD="..." \
CUSTOMER_QR_URL="https://order.sakorio.com/menu/..." \
npm run test:ipad-viewports --prefix front
```

### Role access regression

File:

- `front/scripts/test-role-access-matrix.mjs`

Run example:

```bash
BASE_URL=https://staff.sakorio.com \
QA_ROLE_PASSWORD="..." \
npm run test:role-access-matrix --prefix front
```

## Validation completed

Completed checks:

- Customer QR live browser check passed.
- Staff Reservations live browser check passed.
- Timetable delete live browser check passed.
- Role access live browser smoke passed.
- Staff web deployed to `123e2e40`.
- Customer web deployed to `123e2e40`.
- API service deployed to `123e2e40`.
- Angular hot-reload/compiler logs showed successful rebuild.
- Customer payment/static guard passed.
- Python maintenance scripts compiled.
- New JS QA scripts passed syntax checks.

## Current launch-readiness view

Sakorio POS is materially stronger after this QA/fix cycle. The main operational flows are now cleaner:

- Customers can start QR ordering faster.
- Hosts see active reservations instead of noisy finished history.
- Timetable cleanup is usable.
- Role-based browser QA is now possible.
- Tablet QA now has repeatable tooling.

The remaining launch gate is:

- Run the viewport-controlled iPad regression, ideally followed by one real iPad/Safari manual pass.

After that, the next recommended QA is a smaller focused rerun:

1. Reservation → seat now → QR order → KDS → terminal/HitPay payment → close table.
2. Walk-in queue → seat table → POS add-ons → payment → close table.
3. Role-based shift:
   - Waiter logs in.
   - Uses POS/Tables.
   - Cannot access Users/Settings.
4. Kitchen ticket:
   - Receives fresh ticket.
   - Moves through prep/ready/served.
5. iPad portrait and landscape:
   - POS drawer.
   - Customer QR cart.
   - Reservations/Queue host workflow.

## Bottom line

The five major blockers from the final QA pass have been fixed and mostly verified live. The product is now much closer to launch-ready. The only remaining hard launch signoff item is a true iPad/tablet viewport regression run, because the in-app browser cannot force an actual iPad viewport.
