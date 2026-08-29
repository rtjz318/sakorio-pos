# Sakorio Operations Upgrade — Part 1: Payroll Privacy

Date: 2026-08-29  
Blueprint: `0159-sakorio-first-iteration-operations-upgrade-blueprint-2026-08-29.md`  
Implementation commit: `0df16bd4`  
Branch: `development`

## 1. Outcome

Part 1 is implemented and deployed. Hourly rates and calculated pay are now protected by explicit administrator-only permissions at the API boundary. Ordinary staff self-service, schedule, and work-session responses no longer contain payroll values. Owner/admin payroll workflows remain available through the restricted user-management and attendance-pay report endpoints.

Administrator means the Sakorio `owner` and `admin` roles. Waiter, receptionist, kitchen, bartender, courier, provider, and future non-administrator roles are not granted payroll permissions.

## 2. Security controls added

Three explicit permissions were added:

- `payroll:rate_read`
- `payroll:rate_write`
- `payroll:summary_read`

Only owner/admin roles receive these permissions. Payroll checks are enforced by FastAPI before data is serialized; hiding a frontend control is not treated as a security boundary.

## 3. API and data-contract changes

### Safe-by-default user responses

`UserResponse` no longer exposes `hourly_rate_cents`. A separate `PayrollUserResponse` adds the field only for protected administrator workflows.

The following broad or self-service responses are now payroll-free:

- `GET /users/me`
- `GET /users/me/staff-profile`
- `GET /schedule/plan-users`
- self attendance summaries
- ordinary work-session serialization

### Protected payroll responses

- `GET /users` requires both user-read and payroll-rate-read permission and returns the payroll-aware DTO.
- User creation requires payroll-rate-write permission because rate data may be accepted.
- User update checks payroll-rate-write permission whenever `hourly_rate_cents` is supplied.
- `GET /reports/attendance-pay-summary` requires report-read and payroll-summary-read permission.
- Payroll report work-session serialization opts into payroll fields explicitly; the serializer defaults to excluding them.

### Failure behaviour

Non-administrator callers receive `403 Forbidden` when calling payroll-reporting or payroll-rate management paths. Restricted fields are omitted from safe responses rather than returned as zero or null.

## 4. Frontend changes

### My Shift

Removed from staff self-service:

- hourly rate
- estimated pay

The screen continues to show operational attendance information and now uses missing proof count as a non-financial completeness indicator.

### Timetable

Removed hourly-rate readiness and wage warnings from general timetable planning. The readiness presentation now focuses on staff-profile completeness and attendance operation.

### Permissions and types

The Angular permission model now recognises the three payroll permissions and grants them only to the `admin` role in addition to the owner's full access. Safe attendance and payroll attendance response types are separated so ordinary components cannot accidentally depend on wage fields.

## 5. Files changed

- `back/app/permissions.py`
- `back/app/models.py`
- `back/app/main.py`
- `back/app/work_session_serialization.py`
- `back/app/reports_routes.py`
- `back/tests/test_role_permissions.py`
- `back/tests/test_schedule_export.py`
- `back/tests/test_work_session.py`
- `front/src/app/services/permission.service.ts`
- `front/src/app/services/api.service.ts`
- `front/src/app/my-shift/my-shift.component.ts`
- `front/src/app/working-plan/working-plan.component.ts`

## 6. Verification evidence

### Backend security regression

Command:

```text
python -m pytest tests/test_role_permissions.py tests/test_schedule_export.py tests/test_work_session.py -q
```

Result: **26 passed**. One existing Starlette deprecation warning was reported; there were no test failures.

Coverage includes:

- payroll-permission matrix for every non-administrator role;
- safe schedule-plan user payloads;
- safe waiter self-profile responses;
- rate visibility retained for administrators;
- safe self work-session and attendance-summary responses;
- non-administrator payroll endpoint denial;
- administrator payroll summary success.

### Angular production build

Command:

```text
npm run build -- --configuration production-static
```

Result: **passed** with no Angular or TypeScript compiler errors.

Existing non-blocking warnings remain for the Cashier POS and public menu SCSS size budgets and the `dijkstrajs` CommonJS dependency.

### Local application smoke test

The local frontend and backend containers were healthy. HAProxy was restarted to clear a stale health state, after which the application returned HTTP `200` and HAProxy recorded a successful frontend response.

### Live deployment verification

The live `staff.sakorio.com` landing page loaded successfully in the in-app browser and displayed application version `2.1.6 0df16bd4`, proving the Part 1 commit reached the deployed staff frontend. No browser console errors were observed on the deployed landing page.

The previously open authenticated staff tab belonged to an older build and its session expired when refreshed. Consequently, the post-deployment authenticated visual checks of My Shift, Timetable, Users, and Reports remain a final operational checkpoint; no credentials were re-entered during this verification pass.

## 7. Acceptance status

| Requirement | Status | Evidence |
| --- | --- | --- |
| Non-admin roles have no payroll permissions | Passed | Permission matrix tests |
| Safe self and schedule responses omit rate/pay | Passed | Backend response tests |
| Direct payroll access by waiter is denied | Passed | `403` backend test |
| Admin rate and payroll report access remains | Passed | Admin response/report tests |
| My Shift no longer presents rate/pay | Passed in build | Component change and production build |
| Timetable no longer presents payroll readiness | Passed in build | Component change and production build |
| Deployed frontend contains Part 1 commit | Passed live | Live footer hash `0df16bd4` |
| Authenticated live visual regression | Pending checkpoint | Staff browser session expired after refresh |

## 8. Operational and migration impact

- No database migration is required.
- Existing stored hourly rates are unchanged.
- Existing administrator payroll functions remain available.
- API consumers that incorrectly expected payroll fields from self-service or schedule payloads must use an authorised payroll endpoint instead.
- This is a security-contract change and should remain in place before further launch preparation.

## 9. Next phase

Part 2 is the canonical table payment-status indicator from the blueprint:

- derive collection status from the active table session and payment records;
- show `Payment requested` in yellow, `Paid` in green, and `Unpaid` in red;
- place the indicator beside the open-table state in Tables and POS;
- preserve server authority for HitPay confirmation and cash/terminal handling;
- verify table, POS, payment-return, and close-table workflows in the live browser.

