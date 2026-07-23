# Sakorio final blockers 1–5 fix report

Date: 2026-07-23  
Branch: `development`

## Scope

This pass addresses the five launch blockers from the final E2E-001 to E2E-100 browser QA execution:

1. QR customer optional-name prompt blocks ordering on smaller/tablet viewports.
2. Timetable shift delete/cleanup is ambiguous and did not remove the synthetic test shift during QA.
3. Stale QA queue/reservation/table artifacts clutter live boards.
4. Role-specific QA credentials are missing for Waiter/Host/Kitchen/Manager access testing.
5. True iPad/tablet viewport regression coverage is missing.

## Fix 1 — QR customer optional-name prompt

- Changed the customer QR flow so the optional name prompt no longer opens automatically when a new QR session starts.
- Added a non-blocking `Add name` chip in the menu header.
- Kept the name modal available for customers who want to add their name.
- Hardened the modal for mobile/tablet:
  - centered sheet,
  - max-height with internal scrolling,
  - visible close button,
  - sticky action row,
  - safer tap targets,
  - test IDs for browser QA.
- Added a static regression assertion to `front/scripts/test-customer-payment-options.mjs` so the QR menu cannot quietly regress to first-load blocking behavior.

Expected browser result:

- Customer scans QR.
- Menu opens immediately.
- Customer can browse and add items without first dismissing a modal.
- Optional name remains available but does not block ordering.

## Fix 2 — Timetable shift delete/cleanup

- Improved Timetable delete confirmation:
  - confirmation now includes the exact shift detail,
  - delete action has a busy state,
  - duplicate confirm clicks are blocked,
  - the shift is optimistically removed from the UI after successful delete,
  - the schedule reloads after success/failure.
- Added a safe cleanup script for the known synthetic E2E shift:
  - `back/app/seeds/cleanup_qa_artifacts.py`
  - Removes only the known synthetic `Ajisen/Owner 2026-07-26 10:00–12:00` shift.

Expected browser result after redeploy:

- Manager clicks a shift delete action.
- Confirmation names the exact shift.
- Confirming delete removes the shift visibly.
- Reload does not bring the deleted shift back.

## Fix 3 — Stale QA artifact cleanup/archive

- Reservations now default to `Active service` instead of `All statuses`.
- Finished/cancelled/no-show/history records remain accessible through the status dropdown.
- Added `cleanup_qa_artifacts.py`, scoped to tenant 1 by default, to archive only clearly marked QA/test rows:
  - QA/Final QA/SKR-style reservations are marked `finished` and unassigned from tables.
  - QA/Final QA/SKR-style queue rows are marked `expired`.
  - The known synthetic timetable shift is deleted.

Operational note:

- The script intentionally avoids broad deletion of normal restaurant records.
- Run it with:

```bash
SAKORIO_QA_TENANT_ID=1 python -m app.seeds.cleanup_qa_artifacts
```

## Fix 4 — Role-specific QA accounts

- Added env-driven QA user seeding:
  - `back/app/seeds/seed_role_qa_users.py`
- It creates/updates:
  - `qa.waiter@sakario.sg`
  - `qa.host@sakario.sg`
  - `qa.kitchen@sakario.sg`
  - `qa.manager@sakario.sg`
- No password is committed.
- Password must come from `SAKORIO_QA_PASSWORD`.

Run with:

```bash
SAKORIO_QA_TENANT_ID=1 SAKORIO_QA_PASSWORD="..." python -m app.seeds.seed_role_qa_users
```

- Added browser role matrix test:
  - `front/scripts/test-role-access-matrix.mjs`
  - package script: `npm run test:role-access-matrix --prefix front`

## Fix 5 — iPad/tablet viewport regression

- Added browser viewport regression:
  - `front/scripts/test-ipad-viewports.mjs`
  - package script: `npm run test:ipad-viewports --prefix front`
- It checks:
  - iPad portrait `820×1180`
  - iPad landscape `1180×820`
  - POS
  - Tables
  - Reservations
  - Queue
  - Kitchen
  - optional customer QR via `CUSTOMER_QR_URL`.
- It fails on:
  - blank/error pages,
  - horizontal overflow,
  - visible controls rendered offscreen,
  - customer QR name modal blocking initial browsing.

## Follow-up validation required after redeploy

1. Open customer QR live and confirm the menu loads without the name modal blocking first tap.
2. Delete the synthetic timetable shift through the live browser or run the cleanup script on staging.
3. Confirm Reservations default view shows active service only.
4. Seed QA users with a staging-only password and run role access matrix.
5. Run iPad viewport regression against staging with live credentials and a current customer QR URL.

## Launch-readiness impact

These changes directly address the five blockers found in E2E-082 through E2E-100. The system still needs a live redeploy and browser regression rerun before changing the final launch decision from “not launch-signed” to “launch-ready”.
