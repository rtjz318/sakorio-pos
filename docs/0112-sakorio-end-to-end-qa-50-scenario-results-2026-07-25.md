# Sakorio POS end-to-end QA results - 50 scenario execution pass 1

Date: 2026-07-25  
Scenario source: `0111-sakorio-end-to-end-qa-50-scenario-brief-2026-07-25.md`  
Run prefix: `SKR-20260725-E2E`  
Execution surface: live browser only  
Overall status: **NOT LAUNCH READY - P0 blockers found**

## Executive summary

The 50-scenario suite was started against the live Sakorio browser environment. The run cannot honestly be marked complete/green because the first launch gates exposed blockers that prevent most downstream end-to-end workflows from being executed reliably.

The most serious findings are:

1. **Staff login/session is unstable.** Login succeeded once and reached Dashboard, but later fresh login attempts returned `Sign-in failed. Check your details and try again.` Protected staff pages also redirected to login during direct route sweeps.
2. **POS route is stuck on Syncing.** `/pos` loads the shell, but after waiting it still shows `Tables loaded: Syncing`, `Open bills: Syncing`, `Paid today: Syncing`, `Catalog: Syncing`, `0 loaded`, and `Loading floor tables…`.
3. **Existing stale QA bill remains visible.** During the successful Tables load, T02 showed `Live order` and `Bill #229`, matching the previous known cleanup risk.
4. **Public waitlist is unavailable.** `/waitlist/1` loads, but shows `The queue is temporarily unavailable. Please speak to the host.` and `Join queue` is disabled.
5. **Old QR token is invalid.** The tested QR URL returned `Menu / Not found`, so QR scenarios need a freshly generated valid table QR after staff access is stable.

Because POS, staff auth, queue, and valid QR handoff are core dependencies, many scenarios are marked `BLOCKED`, not `PASS`. This is the correct launch QA result: the suite uncovered issues early enough to fix before final regression.

## Live browser evidence captured

### Staff login and Dashboard

- First staff login attempt reached `https://staff.sakorio.com/dashboard`.
- Dashboard showed `POS (Ajisen Ramen)`, build `2.1.6 0d141e58`, user `ricktan318@hotmail.com`, role `Owner`.
- Later fresh login attempt returned `Sign-in failed. Check your details and try again.`

### POS

- URL tested: `https://staff.sakorio.com/pos`
- Visible result after waiting: `Service counter`, `Refreshing...`, `Tables loaded Syncing`, `Open bills Syncing`, `Paid today Syncing`, `Catalog Syncing`, `0 loaded`, `Loading floor tables…`.
- Score impact: P0 blocker. Table ordering, payment, close-table, and POS checkout workflows cannot be fully executed until this loads reliably.

### Tables

- URL tested: `https://staff.sakorio.com/tables`
- Loaded successfully once after staff login.
- Observed: `Main`, `10` tables, `51 Total in view`.
- T01: `Seated · start order`.
- T02: `Live order`, `Bill #229`, buttons included `Open order`, `Add items`, `Settle first`.
- T03/T04/T05: idle tables visible.
- Score impact: Tables page can render, but stale active QA bill and unstable staff session block clean full-flow testing.

### Public reservation

- URL tested: `https://order.sakorio.com/book/1`
- Page loaded with `Book a table`, party size, seating preference, allergies, calendar, phone, email, notes, and `Book table`.
- Visible July 2026 days were disabled as `Outside opening hours`.
- Score impact: public reservation UI loads, but full booking-to-host seating flow is blocked by staff auth.

### Public waitlist

- URL tested: `https://order.sakorio.com/waitlist/1`
- Page loaded with `Join the queue`.
- Visible alert: `The queue is temporarily unavailable. Please speak to the host.`
- `Join queue` button is disabled.
- Score impact: queue scenarios cannot pass until public queue availability/config is corrected or intentionally documented as closed.

### Public QR menu

- URL tested: an older known QR URL for table menu.
- Result: `Menu / Not found`.
- Score impact: QR scenarios require a fresh valid QR generated from live Tables after staff access is stable.

## Scenario scorecard

| ID | Status | Score | Browser outcome |
|---|---:|---:|---|
| SKR-20260725-E2E-001 | FAIL | 5.0 | Staff login initially succeeded and Dashboard loaded, but later fresh login failed and protected routes redirected to login during route sweeps. |
| SKR-20260725-E2E-002 | FAIL | 4.0 | POS loaded shell but stayed on `Syncing` with 0 tables/catalog; cannot be considered cashier-ready. |
| SKR-20260725-E2E-003 | BLOCKED | 3.0 | QR order flow requires valid table QR and staff order verification; old QR returned `Not found`, staff/POS unstable. |
| SKR-20260725-E2E-004 | FAIL | 5.0 | Tables loaded once and confirmed stale T02 `Bill #229`; cleanup cannot be safely completed while staff auth/POS is unstable. |
| SKR-20260725-E2E-005 | BLOCKED | 4.0 | Multi-tab/session testing exposed instability; protected routes returned to login after earlier successful login. |
| SKR-20260725-E2E-006 | BLOCKED | 3.0 | Full walk-in QR order requires staff seating, valid QR, Kitchen, and POS; blocked by auth/POS/QR. |
| SKR-20260725-E2E-007 | BLOCKED | 3.0 | Two-round same-table QR test requires active valid QR and staff Orders; blocked. |
| SKR-20260725-E2E-008 | BLOCKED | 3.0 | QR session privacy cannot be verified with invalid QR token. |
| SKR-20260725-E2E-009 | BLOCKED | 3.0 | QR after served-state test requires valid active ticket and Kitchen; blocked. |
| SKR-20260725-E2E-010 | BLOCKED | 4.0 | iPad QR ordering requires valid QR; old QR returned not found. |
| SKR-20260725-E2E-011 | BLOCKED | 3.0 | Special instruction propagation requires active QR order and kitchen ticket; blocked. |
| SKR-20260725-E2E-012 | BLOCKED | 3.0 | Combined QR/POS bill cannot execute while POS is stuck. |
| SKR-20260725-E2E-013 | BLOCKED | 4.0 | Old QR behavior partially observed as `Not found`, but correct expired-session messaging cannot be confirmed without fresh QR lifecycle. |
| SKR-20260725-E2E-014 | BLOCKED | 4.0 | Empty cart/quantity testing requires valid QR. |
| SKR-20260725-E2E-015 | BLOCKED | 5.0 | Menu audit needs valid QR/catalog page; old QR not found. |
| SKR-20260725-E2E-016 | BLOCKED | 4.0 | Reservation page loads, but host assignment/staff seating/POS close are blocked. |
| SKR-20260725-E2E-017 | PARTIAL | 7.0 | Reservation form and phone field are visible; full validation and host search not completed due staff auth blocker. |
| SKR-20260725-E2E-018 | BLOCKED | 4.0 | Host reservation edit/assignment requires stable staff Reservations/Tables access. |
| SKR-20260725-E2E-019 | BLOCKED | 4.0 | Reservation cancellation/no-show requires staff Reservations access. |
| SKR-20260725-E2E-020 | BLOCKED | 4.0 | Double reservation seating requires stable staff access and multiple valid QR sessions. |
| SKR-20260725-E2E-021 | BLOCKED | 4.0 | Seat-now flow requires staff Reservations/Tables access. |
| SKR-20260725-E2E-022 | BLOCKED | 4.0 | Reservation finish/close rules require active staff table and bill state. |
| SKR-20260725-E2E-023 | PARTIAL | 7.0 | Public reservation form handles long text fields visibly; host/iPad verification blocked. |
| SKR-20260725-E2E-024 | FAIL | 4.0 | Public waitlist page loads but queue is temporarily unavailable and Join button is disabled. |
| SKR-20260725-E2E-025 | BLOCKED | 4.0 | Manual host queue seating requires stable staff Queue/Tables access. |
| SKR-20260725-E2E-026 | BLOCKED | 4.0 | Duplicate queue test blocked because public queue is disabled. |
| SKR-20260725-E2E-027 | BLOCKED | 4.0 | Large-party queue/capacity test blocked because queue is disabled and staff session unstable. |
| SKR-20260725-E2E-028 | BLOCKED | 4.0 | Queue stale cleanup requires stable staff Queue access. |
| SKR-20260725-E2E-029 | BLOCKED | 4.0 | Queue-to-reservation conversion requires Queue and Reservations staff access. |
| SKR-20260725-E2E-030 | BLOCKED | 4.0 | Queue abandon/no-show flow requires public queue availability and staff archive action. |
| SKR-20260725-E2E-031 | FAIL | 4.0 | POS table-first workflow cannot start because POS remains syncing. |
| SKR-20260725-E2E-032 | FAIL | 4.0 | POS add-on to active table blocked by POS syncing; T02 bill exists but cannot be settled from POS. |
| SKR-20260725-E2E-033 | BLOCKED | 3.0 | HitPay sandbox completion requires QR/POS checkout path; blocked by invalid QR and POS. |
| SKR-20260725-E2E-034 | BLOCKED | 3.0 | HitPay cancel/abandon truth test blocked by unavailable checkout path. |
| SKR-20260725-E2E-035 | BLOCKED | 4.0 | Unpaid close-table guard cannot be fully tested while POS is stuck; Tables shows `Settle first` for T02, which is promising but incomplete. |
| SKR-20260725-E2E-036 | BLOCKED | 4.0 | Multi-table POS switching blocked by POS syncing. |
| SKR-20260725-E2E-037 | BLOCKED | 4.0 | POS imported-menu search blocked by POS syncing. |
| SKR-20260725-E2E-038 | BLOCKED | 4.0 | Manager void/correction blocked by unstable staff/POS. |
| SKR-20260725-E2E-039 | BLOCKED | 4.0 | Reopen/history flow requires stable staff History/POS access. |
| SKR-20260725-E2E-040 | FAIL | 4.0 | POS payment lane tablet QA cannot pass because POS never leaves syncing state. |
| SKR-20260725-E2E-041 | BLOCKED | 3.0 | Kitchen/beverage routing requires creating live order; blocked by QR/POS. |
| SKR-20260725-E2E-042 | BLOCKED | 4.0 | Kitchen status progression requires live ticket; blocked. |
| SKR-20260725-E2E-043 | BLOCKED | 4.0 | Two-table Kitchen sorting requires live tickets and stable staff session. |
| SKR-20260725-E2E-044 | BLOCKED | 4.0 | Beverage-only routing requires live QR/POS order. |
| SKR-20260725-E2E-045 | BLOCKED | 4.0 | Kitchen tablet long-ticket test requires live ticket; blocked. |
| SKR-20260725-E2E-046 | BLOCKED | 4.0 | Kitchen-to-POS billing handoff blocked by POS and live ticket creation. |
| SKR-20260725-E2E-047 | BLOCKED | 4.0 | Staff clock-in/out requires stable staff session and Users/Timetable access. |
| SKR-20260725-E2E-048 | BLOCKED | 4.0 | Timetable shift creation requires stable staff access. |
| SKR-20260725-E2E-049 | BLOCKED | 4.0 | Role permission pass requires stable staff login for alternate roles. |
| SKR-20260725-E2E-050 | BLOCKED | 4.0 | Paid table to reports/history requires successful POS/HitPay/close flow first. |

## Blockers to fix before rerun

### P0-1: Staff auth/session reliability

Observed behavior:

- Login succeeded once, then later failed using the same QA credentials.
- Direct protected route sweeps redirected to `/login`.

Required outcome:

- Staff can log in repeatedly with valid credentials.
- Reloading or direct-opening protected routes keeps the session if still authenticated.
- Failed login shows only when credentials are genuinely invalid.

### P0-2: POS data loading

Observed behavior:

- `/pos` stays on `Syncing`.
- Tables/catalog/open bills/paid stats remain `0` or `Syncing`.

Required outcome:

- POS should load table grid, open bills, paid-today count, and catalog within a practical service window.
- If API/data load fails, POS must show a specific recoverable error, not indefinite syncing.

### P0-3: Test data cleanup / active bill #229

Observed behavior:

- Tables page showed T02 with `Live order` and `Bill #229`.

Required outcome:

- QA bills must be closable/settleable or clearly archived.
- Fresh regression should start from known table states.

### P0-4: Valid QR handoff

Observed behavior:

- Old QR token returns `Menu / Not found`.

Required outcome:

- Staff can generate/open a fresh table QR.
- QR page should distinguish expired/closed/missing table with clear messaging.

### P1-1: Public queue availability/config

Observed behavior:

- Public waitlist loads but queue is temporarily unavailable and disabled.

Required outcome:

- If queue is meant to be live, public queue entry must be enabled.
- If queue is intentionally closed, staff UI and public copy should make the operating-hours/config reason clear.

## Rerun plan after fixes

1. Re-run SKR-20260725-E2E-001 through 005 first.
2. Confirm POS leaves syncing and fresh staff login remains stable after reload/direct route.
3. Clean T02 / Bill #229 or document it as intentional test state.
4. Generate a fresh QR from Tables and run SKR-20260725-E2E-006 through 015.
5. Re-enable or explicitly configure queue, then run SKR-20260725-E2E-024 through 030.
6. Run payment, kitchen, timetable, role, and reports scenarios only after POS/QR are stable.

## Launch decision from this pass

**Do not launch yet.** The system is not at 10/10 because the live browser run hit P0 blockers before the full operational workflows could complete.

This pass did its job: it found the launch-critical blockers at the front door. The next work should be fixing staff auth/session persistence, POS syncing, stale active test bill cleanup, QR handoff, and queue availability, then rerunning this same 50-scenario suite.
