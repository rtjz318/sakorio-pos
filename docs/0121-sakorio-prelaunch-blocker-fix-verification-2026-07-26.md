# Sakorio Prelaunch Blocker Fix Verification

Date: 2026-07-26  
Live build verified: `2.1.6 662b1559`  
Scope: fixes raised after the 100-scenario prelaunch QA pass.

## Fixes shipped

### 1. Users Add User autofill hardening

- File: `front/src/app/users/users.component.ts`
- Change:
  - Add User form now disables generic browser autofill.
  - Email field uses `autocomplete="off"`, `autocapitalize="none"`, and `spellcheck="false"`.
  - Password and confirm password fields use `autocomplete="new-password"`.

### 2. Timetable shift deletion UX

- File: `front/src/app/working-plan/working-plan.component.ts`
- Change:
  - Selected-day shift cards now show clear `Edit` and `Delete` buttons.
  - Delete click now stops event bubbling before opening the confirmation dialog, preventing the shift editor from opening instead.
  - Selected-day shift cards are easier to operate on iPad/tablet because the destructive action is visible and text-labelled.

### 3. POS failed-send recovery copy

- File: `front/src/app/cashier-pos/cashier-pos.component.ts`
- Change:
  - Failed kitchen-send messaging now tells staff the cart is still safe and to retry before taking payment.
  - Checkout failure messaging now tells staff the bill/cart state is kept and to retry/refresh before continuing.

## Live browser verification

### Users

Status: Passed live

Steps run on `https://staff.sakorio.com/users`:

1. Opened Users.
2. Clicked `Add User`.
3. Inspected the live modal fields.

Observed:

- Email field was empty and had `autocomplete="off"`.
- Password and confirm password fields were empty and had `autocomplete="new-password"`.
- No saved staff credentials were injected into the new-user form.
- Hourly rate still defaulted intentionally.

### Timetable

Status: Passed live

Steps run on `https://staff.sakorio.com/working-plan/calendar`:

1. Opened Timetable calendar.
2. Confirmed selected-day shift cards show explicit `Edit` and `Delete` buttons.
3. Deleted one old QA Manager test shift using the visible selected-day `Delete` button.
4. Confirmed the delete modal.
5. Verified success toast and selected-day count reduction.
6. Repeated cleanup for the remaining old QA Manager test shift on the selected day.

Observed:

- Confirmation modal appeared with the correct shift details.
- Success message displayed: `Shift removed.`
- Selected day reduced from 2 QA Manager shifts to 0 QA Manager shifts.

### POS

Status: Partially verified live

Steps run on `https://staff.sakorio.com/pos`:

1. Opened POS.
2. Selected available table T08.
3. Added `A12 Boiled Seasoned Egg` to the cart.
4. Confirmed the cart held 1 item at SGD 2.00.
5. Cleared the cart afterward.

Observed:

- POS table drawer loaded correctly on live build `662b1559`.
- Item add worked.
- Cart clear worked and returned to 0 items.
- No live kitchen ticket was created during this check.

Note:

- A forced browser-side failed-send simulation could not be completed because the current in-app browser wrapper allows normal interaction/inspection but does not expose request routing or reliable page monkeypatching on this tab. The deployed source contains the improved recovery copy, and normal POS cart behavior was verified live without creating a real order.

## Remaining non-code / operational checks

These remain outside the completed code patch:

1. Settings timezone should be set/confirmed in production settings.
2. Staff clock-in/out camera path still needs real iPad/tablet camera hardware validation.
3. Role permission QA still needs separate real role credentials if strict permission isolation is required before launch.
4. Existing active/seated tables should be reviewed by the owner before opening day so live test sessions do not look like real service sessions.
