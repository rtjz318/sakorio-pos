# Sakorio R5 browser regression results — 30 use cases

Date: 2026-07-20  
Environment: live Sakorio domains only  
Staff domain: `https://staff.sakorio.com`  
Customer domain: `https://order.sakorio.com`  
Live version observed: `2.1.6 fd48a511`  
Run id: `R5-20260720`

## Purpose

This pass was a fresh regression run after the Kitchen backlog cleanup and QR handoff fixes. The main focus was the launch-critical front-of-house chain:

Reservation → seat now → QR order → kitchen/beverage production → payment → close table.

Secondary focus was tablet/iPad usability and the supporting host/cashier surfaces: POS, Tables, Orders, Queue, Reservations, Reports, Timetable, and My Shift.

All checks were executed through the browser on the live Sakorio domains. No local login or local app testing was used.

## Executive summary

Overall score: 8.5 / 10 across 30 browser-run use cases.

Status mix:

- PASS: 18
- PASS WITH IMPROVEMENT: 6
- PASS WITH UX DEFECT: 2
- PASS WITH DEFECT: 2
- PASS WITH MINOR DEFECT: 1
- PASS WITH ROUTE DEFECT: 1

Launch readout:

- The core reservation-to-close-table flow is working end to end.
- QR session privacy is working: closed QR links show Table Closed and do not expose ordering/history.
- Kitchen & beverages remained clean after ticket processing.
- POS terminal payment and close-table recovery worked.
- The biggest actual functional bug found is customer QR rapid double-submit: one intended Coffee became 2× Coffee in one order.
- The biggest UX gap is still close-table consistency: paid/no-order table close actions work, but the best action is sometimes on a different tab or routes through POS.
- Tablet/iPad layout did not show horizontal overflow in the browser test, but the current in-app viewport override still reported desktop dimensions, so a physical iPad/Safari pass is still required before launch confidence.

## Test artifacts created/used

- Reservation `#57`: `R5 QA Reservation 266318`, finished after being seated and closed.
- Paid QR order `#89`: T07, Coffee + Tecate Light, `SGD 6.50`, served and closed.
- Queue entry `#21`: R5 queue walk-in, seated to T09, then cleaned up.
- Paid cleanup order `#90`: T02, double-submit test artifact, recorded as 2× Coffee / `SGD 5.00`, served, terminal-paid, and closed.

## Scorecard

| Case ID | Workflow | Status | Score | Browser outcome | Improvement / fix needed |
|---|---|---:|---:|---|---|
| R5-E2E-001 | Public reservation creation | PASS | 9.2 | Created public reservation `#57` at 20:00 for the R5 QA guest. Confirmation page showed reservation number and details. | No blocker. |
| R5-E2E-002 | Reservation arrival seat now to POS | PASS | 9.0 | Staff Reservations showed `#57`; Seat at table opened modal; seating T07 routed directly to POS with guest context and active QR. | Keep this as the primary host workflow. |
| R5-E2E-003 | POS QR handoff from seated reservation | PASS | 9.2 | Open customer QR exposed QR-ready card, URL, Open/Copy/Hide. URL used `qr_access` and table was active. | No blocker. |
| R5-E2E-004 | Customer QR current session/privacy/payment policy | PASS | 9.0 | Customer QR for T07 loaded the menu, did not show Table Closed, did not leak old history, and Cash was not visible. | No blocker. |
| R5-E2E-005 | Customer self-order to current bill | PASS | 9.0 | Customer added Coffee + Tecate Light and placed order `#89`, total `SGD 6.50`. Current order showed pending items and Pay Now. | No blocker. |
| R5-E2E-006 | Kitchen receives and processes QR ticket | PASS | 9.5 | Kitchen & beverages showed `#89` in Beverages. Start ticket → Ready for pass → Served/Delivered worked and the board cleared to 0. | No blocker; backlog stayed clean. |
| R5-E2E-007 | Staff POS payment for QR order | PASS | 8.8 | POS T07 showed bill `#89` ready to pay; terminal payment recorded; Orders showed Paid - awaiting close. | Customer HitPay sandbox payment still needs its own focused pass. |
| R5-E2E-008 | Close paid table after order | PASS WITH UX DEFECT | 7.8 | Final POS close cleared T07, but Orders Close table routed back to POS rather than closing in one step; a background close button was also present under the drawer. | Fix direct Orders close to close immediately or relabel as Open POS; hide/disable background actions while drawer is open. |
| R5-E2E-009 | QR token after table close | PASS | 8.8 | Reloaded customer QR after T07 close. It showed a closed state, with no place-order path and no history leakage. | Add friendlier CTA: ask staff for a fresh QR. |
| R5-E2E-010 | Paid closed bill moves to order history | PASS | 9.0 | Order `#89` remained visible after table close in the historical paid context. | Improve paid-history detail by showing payment method/table close state more clearly. |
| R5-E2E-011 | Queue walk-in create and counters | PASS | 9.0 | Created R5 queue walk-in; queue counters became 1 active / 1 visible / 4 loaded / 3 stale hidden / 1 waiting. | No blocker. |
| R5-E2E-012 | Queue seating to POS handoff | PASS | 8.8 | Seated queue guest to T09; POS handoff opened with guest context and active QR. | No blocker. |
| R5-E2E-013 | Queue table cleanup/no-order close | PASS WITH UX DEFECT | 7.2 | Queue-seated T09 with no order could not be closed from the POS drawer; Tables tab provided Close table and cleanup succeeded. | Add Close table to POS drawer for occupied/QR-active/no-order tables. |
| R5-E2E-014 | Reservation status after table close | PASS | 9.0 | Reservation `#57` remained visible in the service timeline after table close with status FINISHED, which is expected. | Keep status visibility in the Finished filter. |
| R5-E2E-015 | iPad landscape POS table grid | PASS | 8.6 | POS grid loaded under the tablet pass with no horizontal overflow and visible table grid. | No blocker. |
| R5-E2E-016 | iPad landscape POS drawer layout | PASS WITH MINOR DEFECT | 8.0 | Drawer, search, and menu were visible with no horizontal overflow. | Continue watching dense drawer controls; background-action overlap still needs code cleanup. |
| R5-E2E-017 | iPad portrait POS layout | PASS | 8.2 | Browser reported effective viewport 1280×720 despite portrait override; rendered layout stayed usable with no horizontal overflow. | Retest on physical iPad/Safari or a browser environment whose innerWidth matches the target size. |
| R5-E2E-018 | Orders overview/history compactness | PASS WITH IMPROVEMENT | 8.0 | Orders history loaded; `#89` was visible; compact table rows were present. No Orders search input was present. | Add search/filter by table, order number, and guest. |
| R5-E2E-019 | Queue stale toggle | PASS | 8.8 | Default queue showed 0 active and 3 stale hidden; Show stale exposed the stale queue records correctly. | Purge old QA duplicates from staging/demo data before launch demos. |
| R5-E2E-020 | Kitchen clean-state regression | PASS | 9.5 | KDS final counters were All 0 / Kitchen 0 / Beverages 0; no backlog remained. | No blocker. |
| R5-E2E-021 | Tables tab layout/actions | PASS | 8.6 | Tables page loaded T01-T10 with close/move actions and no horizontal overflow. | Clean old QA labels/demo state before launch demos. |
| R5-E2E-022 | QR/session activation cleanup behavior | PASS WITH IMPROVEMENT | 7.8 | Opening POS/QR during tablet QA left T01 active/seated without an order; Tables Close table cleaned it. | Avoid auto-activating tables until QR is explicitly opened or order is started, or make this state easier to close in POS. |
| R5-E2E-023 | Timetable launch surface | PASS WITH ROUTE DEFECT | 7.4 | `/timetable` routed to dashboard, but `/working-plan` loaded Timetable. Employee roster, leave surface, and add/schedule surface were visible. | Add `/timetable` route alias or update navigation URLs; deeper drag/drop and leave-balance QA still needed. |
| R5-E2E-024 | My Shift clock-in surface | PASS WITH IMPROVEMENT | 8.0 | My Shift loaded and profile/staff selector was visible, but no current clock-in was available for this owner session. | Seed/test with a staff account assigned to a current shift. |
| R5-E2E-025 | Customer QR double-submit safety | PASS WITH DEFECT | 6.8 | Rapid double-click on Place order created one order number, `#90`, but one Coffee became 2× Coffee / `SGD 5.00`. | P0/P1 fix: disable Place order immediately and/or add idempotency key so rapid submit cannot duplicate line quantity. |
| R5-E2E-026 | Cleanup and end-to-end settlement after QR double-submit defect | PASS WITH DEFECT | 7.4 | `#90` appeared in KDS, progressed through Start → Ready → Served, then staff POS terminal payment and close-table cleanup worked. | Source double-submit defect remains; keep cleanup recovery as regression coverage. |
| R5-E2E-027 | Reports/payment reconciliation after POS terminal cleanup | PASS WITH IMPROVEMENT | 8.0 | Reports page loaded after terminal-paid `#90`; no horizontal overflow; revenue/reporting surface was available. | Add cashier-shift reconciliation filters/search by order number, table, method, and close-table state. |
| R5-E2E-028 | Customer QR after T02 close blocks ordering and history leakage | PASS | 9.0 | Reloaded T02 QR after `#90` was paid/closed. It showed Table Closed, no ordering CTA, and no Cash. | Keep this as a privacy/payment-policy regression guard. |
| R5-E2E-029 | Reservation and queue residue check after E2E closeout | PASS WITH IMPROVEMENT | 8.4 | Authenticated rerun confirmed reservation `#57` is FINISHED. Queue had active-zero/waiting-zero, with stale indicator available. | Add launch-safe data reset/cleanup checklist and clearer host filters for Today / Active / Finished / Stale. |
| R5-E2E-030 | iPad/tablet viewport final POS board sanity | PASS WITH IMPROVEMENT | 8.2 | Applied 1024×768 viewport override; browser still reported 1280×720, but POS table board showed no horizontal overflow and T01-T10 were usable. | Continue iPad QA on physical Safari/Chrome; keep compact grid/drawer hit-target checks in automated pass. |

## Priority backlog from this pass

### P0/P1 — functional correctness

1. Customer QR order submission must be idempotent.
   - Evidence: R5-E2E-025.
   - One intended Coffee became 2× Coffee in order `#90` after rapid double-clicking Place order.
   - Recommended fix: guard the customer submit handler with an immediate `submitting` lock and send an idempotency key to the backend for duplicate POST protection.

2. Close-table action consistency.
   - Evidence: R5-E2E-008 and R5-E2E-013.
   - Paid table can close, but the fastest action is not always obvious. Orders close routes to POS, while no-order occupied tables need Tables tab cleanup.
   - Recommended fix: make Close table a visible, same-place action in POS drawer whenever a table is occupied, paid-awaiting-close, or QR-active/no-order; if Orders cannot close directly, label the action “Open POS to close”.

### P1 — launch usability

3. Hide/disable background table-card actions while POS drawer is open.
   - Evidence: R5-E2E-008 and R5-E2E-016.
   - Buttons behind the drawer can still appear in hit-testing/DOM and make the interface feel layered rather than modal.

4. Add Orders search/filter.
   - Evidence: R5-E2E-018.
   - Search by order number, table, guest, payment status, and current/history would make cashier recovery much faster.

5. Add cashier reconciliation filters in Reports.
   - Evidence: R5-E2E-027.
   - Cash-up should be able to find `#89`, `#90`, table, method, amount, and close state without scanning broad revenue tables.

### P2 — readiness polish

6. Add `/timetable` route alias or update all links to `/working-plan`.
   - Evidence: R5-E2E-023.

7. Seed a current-shift staff test fixture.
   - Evidence: R5-E2E-024.
   - Required for realistic clock-in/clock-out regression.

8. Staging/demo data cleanup.
   - Evidence: R5-E2E-019, R5-E2E-021, R5-E2E-029.
   - Old QA queue records and demo seated labels make host boards harder to interpret.

9. Physical iPad QA.
   - Evidence: R5-E2E-017 and R5-E2E-030.
   - Browser viewport override did not change actual `innerWidth`; layout still had no overflow, but launch confidence needs a physical tablet pass.

## Recommended next work order

1. Fix QR double-submit/idempotency first.
2. Fix POS close-table visibility and Orders close action labeling/behavior.
3. Hide background table-card actions while POS drawer is active.
4. Add Orders search/filter.
5. Add Reports order/table/payment-method reconciliation filters.
6. Add `/timetable` alias.
7. Add current-shift QA seed and run staff clock-in/out.
8. Clean staging demo data.
9. Run a physical iPad/Safari pass.

## Final state after regression

- T07 reservation table from `#57/#89`: closed and available.
- T02 double-submit cleanup order `#90`: served, terminal-paid, and close-table action reported clear.
- Kitchen & beverages: clean-state pass recorded after primary order; `#90` was also cleared during cleanup.
- Queue: active/waiting count returned to zero; stale records remain hidden by default.

