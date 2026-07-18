# Sakorio exhaustive browser QA results - batch 1

Date: 2026-07-18
Run ID: `SKR-QA-20260718-EXH-B1`
Base brief: `docs/0076-sakorio-exhaustive-browser-qa-use-case-brief-2026-07-18.md`
Test surface: live browser on Sakorio deployed domains
Observed staff build: `POS 2.1.6 f4d559e9`
Staff domain: `https://staff.sakorio.com`
Customer domain: `https://order.sakorio.com`

## Executive summary

Batch 1 executed the highest-risk baseline workflows through the browser:

- Timetable and My Shift readiness
- Reservation arrival, table seating, QR self-ordering, kitchen routing, terminal settlement, table close
- Queue walk-in, seating, staff POS order, terminal settlement, table close
- Current-session vs history behavior
- QR privacy after table close
- Kitchen and beverage station routing
- Orders overview
- Reports, inventory, and payment settings visibility
- Unpaid/paid close-guard scan

The strongest result is that the full reservation service lifecycle now works cleanly when the reservation is seated through the reservation handoff:

`Booked reservation #41 -> T04 seated -> QR order #59 -> kitchen ticket -> terminal paid -> T04 cleared -> reservation #41 FINISHED -> QR shows Table Closed`

The main issues found are not route failures. They are launch-polish and state clarity issues:

1. POS service-loop copy overlaps on the table drawer.
2. POS table recovery panel can show `0 live` while the selected table service correctly shows a live order.
3. T09 still shows contradictory `Pending` plus `Clear paid` for old bill `#58`.
4. Kitchen backlog is still large enough to pollute live service validation.
5. Kitchen status controls need stronger item-specific accessible names.
6. Staff POS bundles order submission and payment too tightly for a waiter service flow.
7. My Shift clock-in depends on camera availability; this needs launch device readiness.

Overall batch 1 launch score: **8.1 / 10**

## Environment limitations

- Browser-only QA was used.
- No real payment was performed.
- Terminal payment was used as the sandbox-safe staff settlement path.
- Physical printer output was not verified.
- Camera hardware was unavailable in the browser session, so photo clock-in was tested only up to the live-photo modal.
- Existing old QA data remains in the tenant, including old kitchen tickets and old table history.

## Scenario results

| Test ID | Scenario | Browser result | UI/UX | Workflow | Data correctness | Launch blocker | Evidence |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| E2E-074 | Manager creates timetable shift for staff | Pass | 8 | 8 | Pass | No | Timetable showed QA shift `Ajisen 09-22` on Sat 18, 24 scheduled shifts, coverage warning visible. |
| E2E-078 | Leave/MC entry if supported | Needs specification | 7 | 4 | Not implemented | Watch | Timetable says `Annual leave / MC balances COMING SOON`, `Ledger not enabled`. |
| E2E-075 | Staff selects profile and clocks in | Blocked at hardware boundary | 7 | 6 | Partial | Watch | My Shift showed selected QA shift and `Take photo and clock in`; modal reported `Requested device not found`. |
| E2E-001 | Public reservation -> staff assign/seat -> QR order -> kitchen -> payment -> close | Pass | 8 | 8 | Pass | No | Reservation `#41` seated to T04, QR order `#59`, terminal paid, T04 cleared, reservation changed to `FINISHED`. |
| E2E-010 | Attempt to seat assigned reservation on risky/unpaid table | Pass with warning | 8 | 8 | Pass | No | Handoff modal warned T09 had an open bill and also offered safe T04. |
| E2E-021 | Active QR opens menu and submits order | Pass | 9 | 9 | Pass | No | T04 QR opened, guest `SKR QA Customer 117421`, order `#59` created once. |
| E2E-024 | QR food and beverage in one cart | Pass | 9 | 9 | Pass | No | Tacos SGD 12 + Coca Cola SGD 3 = SGD 15. |
| E2E-023 | Customer adds second round from same QR | Pass | 9 | 9 | Pass | No | Coffee add-on stayed on order `#59`, total updated to SGD 17.50. |
| E2E-036 | QR privacy after table close | Pass | 9 | 9 | Pass | No | After T04 close, QR showed `Table Closed` only; no guest name, order number, or history leaked. |
| E2E-047 | Orders overview after table order | Pass | 8 | 8 | Pass | No | Orders showed T04 `1 active`, `Latest #59`, SGD 17.50. |
| E2E-046 | Mixed kitchen/beverage routing | Pass with backlog noise | 7 | 7 | Pass | Watch | Kitchen-only showed only Tacos; Beverages-only showed Coca Cola and Coffee. |
| E2E-064 | Kitchen status progress | Partial pass | 7 | 7 | Pass | No | Tacos moved Pending -> Preparing -> Ready; customer saw Tacos `READY` and overall order `Preparing`. |
| E2E-011 | Walk-in queue -> best table -> seat -> POS | Pass | 9 | 9 | Pass | No | Queue entry `SKR QA Queue 214882`, entry id `6`, recommended T04, opened POS with queue handoff. |
| E2E-041 | Waiter wrong item/quantity corrected before payment | Pass | 7 | 8 | Pass | No | Accidental Chile x2 was corrected to Chile x1 + Coffee x1; total corrected to SGD 17.50. |
| E2E-043 | Staff POS order creates production ticket | Partial pass | 7 | 6 | Pass | Watch | Payment created bill `#60`; Kitchen received #60 with Chile and Coffee plus queue notes. POS did not expose a separate send-to-kitchen step. |
| E2E-053 | Terminal staff payment | Pass | 8 | 8 | Pass | No | Terminal payment recorded for #59 and #60; paid-today increased by exact SGD 17.50 each time. |
| E2E-020 | Close unpaid bill guard | Mixed | 7 | 7 | Partial | Watch | T07 live unpaid bill had no clear button, correct. T09 showed `Pending` and `Clear paid`, contradictory. |
| E2E-031 | QR after table closed | Pass | 9 | 9 | Pass | No | Closed T04 QR blocked ordering and did not show previous customer data. |
| E2E-066 | Old backlog hidden but reviewable | Partial | 7 | 6 | Partial | Watch | Kitchen warned `56 unresolved tickets older than 6h hidden`; old #57 still polluted beverage/all lanes. |
| E2E-080 | Reports dashboard after payments | Pass with reporting watch | 8 | 8 | Partial | Watch | Reports loaded payment methods, tables, products, attendance, close checklist. Queue daily throughput may not reflect same-day seated queue clearly. |
| E2E-083 | Inventory stock dashboard default route | Pass for route, blocked for workflow data | 8 | 6 | Pass for route | Watch | `/inventory` redirected to `/inventory/stock`; stock count 0, low stock 0, setup-needed message. |
| E2E-085 | Payment settings visibility | Pass | 8 | 8 | Pass | No | Payment Settings showed currency SGD, HitPay sandbox/live config, API/webhook fields, immediate payment setting, tip settings. |

## Defects

### BUG-0077-01 - POS service-loop text overlaps in table drawer

Severity: P3
Module: POS
Evidence: On T04 after seating and again after queue handoff, the table drawer showed `Start this table orderChoose items...` and `Collect payment or add more itemsT04...` without spacing or line break.
Impact: iPad/service readability is reduced; staff can still complete the flow.
Acceptance criteria: Service-loop title, guidance, table metadata, and totals render as separate readable lines at desktop and iPad widths.

### BUG-0077-02 - POS table recovery panel shows 0 live while selected table service shows live bill

Severity: P2
Module: POS / Tables
Evidence: After QR order `#59`, selected POS service showed `Live order #59`, `Orders 1`, SGD 17.50, but the T04 recovery/history block still showed `Orders 0 live / 10 settled`.
Impact: Staff can trust the selected drawer, but the nearby recovery panel contradicts it.
Acceptance criteria: Table recovery/live counts use the same current-session source as the selected table service drawer.

### BUG-0077-03 - Pending old bill exposes Clear paid on T09

Severity: P1/P2 watch
Module: POS / Payments
Evidence: POS floor shows `T09`, `Last bill #58`, `Pending`, while also showing `Clear paid`.
Impact: Staff may attempt to clear an unpaid or pending bill. Earlier backend behavior may reject it, but the UI state is wrong.
Acceptance criteria: `Clear paid` appears only when the latest/current bill is actually paid or safely clearable.

### BUG-0077-04 - Kitchen status controls have ambiguous accessible names

Severity: P3
Module: Kitchen & beverages
Evidence: Item status buttons expose generic names like `Pending`, `Preparing`, `Ready`. `Ready` collided with the lane header and required targeting a test-id dropdown.
Impact: Operators can use it visually, but keyboard/accessibility/automation quality is weaker.
Acceptance criteria: Status controls include order/table/item context, e.g. `Move T04 #59 Tacos de Carne Asada to Ready`.

### BUG-0077-05 - Customer name prompt returns after QR refresh while active order exists

Severity: P4
Module: Customer QR
Evidence: After order `#59` was active and customer refreshed, the page still showed current order but also asked `What's your name`.
Impact: Mild guest confusion. No privacy leak observed.
Acceptance criteria: If the active table session already has a guest name/order identity, refresh should not re-prompt unless customer explicitly edits name.

### BUG-0077-06 - Queue report daily throughput may not show seated conversion clearly

Severity: P3 watch
Module: Reports / Queue
Evidence: After queue entry `SKR QA Queue 214882` was seated and closed, Reports showed queue outcomes including completed records, but daily throughput for 18 Jul showed `1 total · 0 seated`.
Impact: Manager handover may understate same-day seating if the metric is not using the same outcome definition.
Acceptance criteria: Queue reporting labels clearly distinguish party count vs entry count and seated/completed conversion.

## Improvements

### IMP-0077-01 - Add separate POS send-to-kitchen action for waiter service

Module: POS
Current behavior: Staff POS cart flows straight into payment/checkout. Bill `#60` and kitchen ticket were created after terminal payment.
Risk: Waiters normally need to send food to kitchen before payment. Bundling send and payment is less natural for dine-in service.
Recommended behavior: Provide a primary `Send order` or `Send to kitchen` action when a table has an unpaid active session, with payment available separately.
Priority: P1

### IMP-0077-02 - Keep kitchen live shift clean before launch rehearsal

Module: Kitchen & beverages
Current behavior: Board still showed `Review backlog 56`, and old ticket `#57` appeared beside current live tickets.
Risk: Kitchen staff may miss new orders during training or service.
Recommended behavior: Complete/bulk-clean old QA tickets before final rehearsal; keep backlog mode separate from current shift.
Priority: P1

### IMP-0077-03 - Staff cash policy needs launch decision

Module: Payments
Current behavior: Public QR correctly excludes Cash, while staff POS still shows `Staff Cash`.
Risk: If Sakorio launch policy is HitPay/terminal only, staff cash is a policy mismatch.
Recommended behavior: Either keep staff cash as manager-approved internal settlement or permission-gate/hide it.
Priority: P2

### IMP-0077-04 - Camera readiness checklist for My Shift

Module: My Shift / Timetable
Current behavior: Clock-in flow reaches live-photo modal, but browser/device reported `Requested device not found`.
Risk: Staff cannot clock in on devices without cameras or permissions.
Recommended behavior: Add launch onboarding note and possibly a device readiness/status hint before shift start.
Priority: P2

### IMP-0077-05 - Inventory launch data

Module: Inventory
Current behavior: Stock dashboard has zero inventory items.
Risk: Inventory workflows cannot be launch-tested end to end.
Recommended behavior: Seed/import launch stock before inventory sign-off, or keep Inventory out of day-one launch scope.
Priority: P2

## Data created or touched

- Reservation `#41` `QA E2E Reservation 639475`: seated to T04 and finished.
- Order `#59`: T04, customer QR, SGD 17.50, terminal paid.
- Queue entry `#6` `SKR QA Queue 214882`: seated to T04.
- Order `#60`: T04, staff POS/queue handoff, SGD 17.50, terminal paid.
- T04 was cleared after both #59 and #60.
- Kitchen item for #59 Tacos was progressed to Ready.
- Beverage items for #59 and #60 were left as live production records; old backlog remains.

## Cleanup status

- T04: cleared and available.
- Reservation #41: finished.
- Queue entry #6: no longer active/waiting.
- Orders #59 and #60: paid.
- Kitchen backlog: not cleaned in this pass to avoid bulk-changing old records without explicit cleanup scope.
- QA shift `Ajisen 09-22` remains in timetable from the earlier setup; delete after attendance/timetable QA is complete.

## Next execution batch

Continue with:

1. E2E-003 to E2E-009: reservation cancel/no-show/edit/assigned-table edge cases.
2. E2E-012 to E2E-017: queue cancel/no-free-table/linked-reservation/stale-tab edge cases.
3. E2E-034, E2E-035, E2E-055, E2E-100: HitPay sandbox success, cancel, retry, and recovery.
4. E2E-037 to E2E-040: iPad portrait/landscape and large-menu POS density.
5. E2E-044, E2E-058, E2E-059: void, correction, discount, reopen permissions.
6. E2E-071 to E2E-073 and E2E-087: waiter permissions and logout/relogin boundaries.
7. E2E-091 to E2E-099: refresh, double-submit, stale tab, and concurrency.

## Release recommendation from batch 1

Testing incomplete.

The main happy paths are strong enough to continue launch rehearsal, but final sign-off still needs:

- Payment-state fix for pending/clearable bills.
- Kitchen backlog cleanup.
- HitPay sandbox success/cancel/retry test.
- POS service-loop layout fix.
- More edge/concurrency scenarios from the exhaustive brief.

