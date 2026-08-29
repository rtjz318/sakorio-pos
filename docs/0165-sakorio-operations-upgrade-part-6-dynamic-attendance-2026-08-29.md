# Sakorio Operations Upgrade — Part 6: Dynamic Attendance and Actual Timetable

Date: 2026-08-29  
Blueprint: `0159-sakorio-first-iteration-operations-upgrade-blueprint-2026-08-29.md`  
Implementation commit: `156708df`  
Branch: `development`

## 1. Outcome

Staff no longer need a preplanned shift to clock in. On an authorised shared tablet, staff select their profile, complete the configured camera/venue proof, and clock in. The factual work session appears automatically in the Timetable and remains live until clock-out.

## 2. Clock workflow

1. Open My Shift.
2. Select the staff profile.
3. Press `Take photo and clock in`.
4. Complete the tenant's configured QR/location proof when enabled.
5. Capture the required live photo.
6. Backend records the exact UTC start with `shift_id = null` when no plan was selected.
7. Timetable refreshes actual attendance every 15 seconds.
8. Select the profile again and clock out with the required proof.
9. Backend closes an open break, records the exact end, and fixes the Timetable duration.

Planned shifts remain available as an optional reference and can still be linked when deliberately selected.

## 3. Database and concurrency

Migration `20260829190000_add_dynamic_attendance_provenance.sql` adds:

- `source`: `self_clock`, `shared_kiosk`, `legacy_planned`, or `legacy_unscheduled`;
- `client_request_id`: per clock-in idempotency key;
- one-open-session partial unique index per tenant/user;
- idempotency unique index per tenant/user/client request;
- source lookup index.

Existing rows are backfilled without deleting planned shifts or historical attendance.

## 4. Double-tap handling

The tablet creates one request ID when the clock-in camera flow begins. Replaying the same request returns the existing open session. A different request while already clocked in returns `409`. PostgreSQL remains the final concurrency guard.

## 5. Timetable behaviour

The Timetable now leads with an `Actual attendance` calendar panel that contains:

- number currently clocked in;
- records in the selected week/month;
- date-grouped staff attendance;
- clock-in and clock-out time;
- live indicator for open sessions;
- actual duration for closed sessions;
- source description, without any rate or pay value.

It polls every 15 seconds so clock-in/out appears without a manual refresh. Planned scheduling, leave/MC, coverage, and historical shift tools remain available below it.

## 6. Security and privacy

- Camera proof remains mandatory.
- Venue QR and GPS rules remain enforced when configured.
- Selecting another profile still requires the existing same-tenant administrative/shared-dashboard authority.
- The Timetable actual-attendance payload uses the safe work-session serializer and contains no hourly rate or estimated pay.
- One employee cannot hold two simultaneous open sessions.

The dedicated revocable attendance-station token described as a future hardened deployment option in the blueprint is not required for this controlled owner/admin-authenticated tablet rollout.

## 7. Verification

- Work-session and attendance-report suites: **17 passed**.
- Unscheduled clock-in/out: passed.
- Optional planned-shift linking: preserved.
- Idempotent repeated clock-in: passed with one database row.
- Fresh photo enforcement: passed.
- Invalid employee shift rejection: passed.
- Angular production-static build: passed.
- Latest Docker frontend build: passed.
- Local migration: applied successfully at schema version `20260829190000`.
- Backend health and application smoke: HTTP `200`.

## 8. Acceptance status

| Requirement | Status |
| --- | --- |
| No planned shift required | Passed |
| Staff profile can be selected on shared tablet | Passed |
| Camera/venue proof remains enforced | Passed |
| Actual clock-in appears on Timetable automatically | Passed implementation/build |
| Clock-out fixes exact end time | Passed |
| Double tap creates one session | Passed |
| One open session per employee | Passed database constraint |
| Planned history remains readable | Passed |
| Timetable contains no wage data | Passed contract/code review |
| Live deployment contains dynamic-attendance commit | Passed — live footer displayed `156708df` |
| Authenticated tablet visual check | Pending a signed-in browser session |
