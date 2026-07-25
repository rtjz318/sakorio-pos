# Sakorio Launch Readiness Operational Checks

Date: 2026-07-26  
Live site checked: `https://staff.sakorio.com`  
Live build observed: `2.1.6 662b1559`

## Summary

This pass continued from the prelaunch blocker verification and focused on the remaining launch-readiness items that were operational rather than pure code defects.

## 1. Settings timezone and restaurant profile

Status: Fixed and verified live

Live path:

- `https://staff.sakorio.com/settings`

Before:

- Business Type was unset.
- Country code was unset.
- Timezone showed: `No timezone configured. UTC will be used for reservation time validation.`

Action taken:

- Set Business Type to `Restaurant`.
- Set Country code to `SG`.
- Selected timezone from the timezone dropdown as `Asia/Singapore`.
- Saved settings.
- Reloaded Settings and verified persistence.

After:

- Business Type: `restaurant`
- Country code: `SG`
- Timezone field: `Asia/Singapore`
- UTC warning disappeared after reload.

Launch impact:

- Reservation time validation is now aligned to Singapore instead of UTC.

## 2. Active/seated table review

Status: Requires owner cleanup decision before opening service

Live path:

- `https://staff.sakorio.com/tables`

Observed live table state:

- `T01` idle
- `T02` idle
- `T03` idle
- `T04` idle
- `T05` idle
- `T06` live order, Bill `#136`, guest label `Luca Rossi · 4 guests`
- `T07` idle
- `T08` idle
- `T09` seated / start order
- `T10` seated, guest label `Emma Wilson · 3 guests`

Action taken:

- No tables were force-closed in this pass.

Reason:

- Closing or resetting live/seated tables is destructive business state. It should be done only after owner review, especially because some entries may represent real or intentionally preserved trial data.

Launch recommendation:

- Before opening service, owner should either:
  - close/reset `T06`, `T09`, and `T10`, or
  - intentionally keep them if they are part of the real trial setup.

## 3. My Shift / camera clock-in readiness

Status: UI verified live; physical hardware test still required

Live path:

- `https://staff.sakorio.com/my-shift`

Observed:

- My Shift page loaded successfully.
- Staff profile selector was visible.
- Page explains the intended flow: choose profile, select scheduled shift, take live photo, clock in.
- Current owner profile had no open scheduled shift.
- Clock-in button was disabled with: `No shift available to clock in`.

Action taken:

- No fake shift was created in this pass.
- No camera capture was attempted because there was no active shift and the live browser is not a physical iPad/tablet camera environment.

Launch recommendation:

- For physical go-live testing:
  1. Add one short test shift in Timetable for the intended staff profile.
  2. Open My Shift on the actual iPad/tablet.
  3. Select profile and scheduled shift.
  4. Confirm camera permission prompt.
  5. Take photo and clock in.
  6. Clock out and confirm attendance appears in history.

## 4. Role permission account readiness

Status: Accounts exist; permission testing needs confirmed role passwords or intentional reset

Live path:

- `https://staff.sakorio.com/users`

Observed QA role accounts:

- `qa.manager@sakario.sg` — Administrator / QA Manager
- `qa.kitchen@sakario.sg` — Kitchen Staff / QA Kitchen
- `qa.waiter@sakario.sg` — Waiter / QA Waiter
- `qa.host@sakario.sg` — Receptionist / QA Host

Action taken:

- No passwords were reset in this pass.

Reason:

- Resetting staff passwords is an access-control change. The accounts exist, but login credentials need to be confirmed by the owner or intentionally reset as a separate controlled step.

Launch recommendation:

- Run one final role-based permission check with known credentials:
  - Host: reservations, queue, tables; no sensitive reports/settings.
  - Waiter: POS/table ordering; no settings/users.
  - Kitchen: kitchen display only; no billing/settings.
  - Manager/Admin: override/void/refund/settings as expected.

## Current launch-readiness result

The code/UI blockers from the previous pass are fixed and deployed. This operational pass also fixed the timezone configuration live.

Remaining before a true production opening:

1. Owner decision on whether to reset/close `T06`, `T09`, and `T10`.
2. Physical iPad/tablet test for camera-based clock-in/out.
3. Role permission login checks once QA role passwords are confirmed or intentionally reset.

