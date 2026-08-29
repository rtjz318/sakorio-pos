# Sakorio Operations Upgrade — Live Acceptance Report

Date: 2026-08-29  
Environment: `staff.sakorio.com`, `order.sakorio.com`, HitPay sandbox  
Branch: `development`  
Live version accepted: `2.1.6 2c103e6a`  
Blueprint: `0159-sakorio-first-iteration-operations-upgrade-blueprint-2026-08-29.md`

## 1. Executive result

The six operations-upgrade requirements were exercised through the live browser. The queue, reservation, table, POS, payment, order-history, Timetable, and payroll-authorisation paths are working on the deployed build.

Three defects were found during live operation, fixed, pushed, deployed, and re-tested:

1. historical completed orders could reappear as unpaid when a fresh table visit started;
2. inactive but available tables were missing from the POS queue-assignment list;
3. a confirmed terminal payment briefly remained red `Unpaid` until a manual refresh.

The final live build fixes all three. Software acceptance for the upgraded workflows is **pass**. Launch remains conditional on the restaurant clearing three old test bills and completing the camera/printer checks on the physical shop tablet.

## 2. Live browser acceptance matrix

| ID | Live workflow | Evidence | Result |
| --- | --- | --- | --- |
| OPS-LIVE-001 | Staff login and deployment | Owner login reached the live dashboard; footer advanced from `45aa755d` to `9ef09d01`, then `2c103e6a` after fixes | Pass |
| OPS-LIVE-002 | Public queue join | Public waitlist created daily number `Q001`; number was large and clearly separated from status | Pass |
| OPS-LIVE-003 | Queue appears in POS | POS queue rail changed from 0 to 1 without a manual reload and displayed `Q001`, party, phone, wait state and actions | Pass |
| OPS-LIVE-004 | Host Ping | Staff Ping changed the open customer page automatically to `Your table is nearly ready` | Pass |
| OPS-LIVE-005 | Queue table assignment | After the fix, the selector offered all four clear fitting tables: T03, T04, T06 and T08 | Pass |
| OPS-LIVE-006 | Seat and open POS | Seating removed the party from the live rail, updated the customer page to `You are seated`, and retained `Q001` on T03 | Pass |
| OPS-LIVE-007 | First table order | One Char Siu line was added and sent; bill #267 opened against the same seated visit | Pass |
| OPS-LIVE-008 | Terminal payment state | Unpaid bill was red; confirmed terminal payment became green `Paid · Terminal` | Pass after fix |
| OPS-LIVE-009 | Final close confirmation | Close Table displayed the explicit irreversible reset summary and required `Yes, close table` | Pass |
| OPS-LIVE-010 | Session/history separation | Closed bills #267, #268 and #269 disappeared from Current Orders and appeared in read-only Order History | Pass |
| OPS-LIVE-011 | Customer QR menu | T04 fixed QR opened the segmented 112-item menu; customer name was not requested; category headers prevented a single undifferentiated menu wall | Pass |
| OPS-LIVE-012 | Customer payment methods | Customer checkout showed HitPay and Card at Table only; cash was absent | Pass |
| OPS-LIVE-013 | HitPay requested state | HitPay sandbox request for bill #269 opened successfully; T04 showed yellow `Payment requested` | Pass |
| OPS-LIVE-014 | Requested bill fallback settlement | Staff terminal settlement changed requested bill #269 immediately to green `Paid · Terminal`; T04 then reset cleanly | Pass after fix |
| OPS-LIVE-015 | Reservation service date | 29 Aug showed the two assigned arrivals; 30 Aug showed no inherited reservations | Pass |
| OPS-LIVE-016 | Reservation/table visibility | Only same-day assigned bookings appeared on T07 and T09; future/unassigned work remains in Reservations | Pass |
| OPS-LIVE-017 | Queue history | Active queue defaulted clean; `Include closed` exposed historical rows with their `Q###` identity and outcome | Pass |
| OPS-LIVE-018 | Dynamic staff selection | My Shift offered all attendance-ready profiles and allowed QA Waiter selection without a planned shift | Pass |
| OPS-LIVE-019 | Optional planned shift | Selected profile stated that clock-in would still be recorded on Timetable with no plan selected | Pass |
| OPS-LIVE-020 | Camera proof guardrail | Desktop browser reported `Requested device not found` and created no attendance record | Pass-safe; physical device pending |
| OPS-LIVE-021 | Timetable actual-first view | Timetable displayed actual attendance, 0 open sessions, optional plans, employee roster, leave/MC ledger and planned-vs-clocked comparison | Pass |
| OPS-LIVE-022 | Owner payroll visibility | Owner could see hourly-rate badges and Attendance & Payroll totals | Pass |
| OPS-LIVE-022A | Waiter payroll negative login | A temporary waiter account was created for the negative UI check, but the production login rate limiter rejected the additional login before authentication; the account was deleted | Live check blocked; server regression pass |
| OPS-LIVE-023 | Kitchen current shift | Current production board contained 0 active tickets after the QA tables were settled and closed | Pass |
| OPS-LIVE-024 | End-day reconciliation | Reports matched POS/KDS after asynchronous load: 3 active tables, 3 unpaid bills and 3 unsettled kitchen tickets | Pass |
| OPS-LIVE-025 | Tablet portrait routes | 820×1180 live Chrome sweep passed POS, Tables, Reservations, Queue, Kitchen, Orders, Reports, My Shift, Timetable and Users | Pass |
| OPS-LIVE-026 | Tablet landscape routes | 1180×820 live Chrome sweep passed the same ten staff routes | Pass |
| OPS-LIVE-027 | Tablet overflow controls | No root horizontal overflow and no offscreen operational controls; the intentionally collapsed sidebar was excluded | Pass |
| OPS-LIVE-028 | QA data cleanup | Q001 completed with table close, Q002 was cancelled, T03/T04 were reset, and both temporary QA users were deleted | Pass |

## 3. Defects fixed during this pass

### 3.1 Fresh table session inherited historical unpaid state

Live symptom:

- available T03/T08 displayed red `Unpaid` from historical completed tickets;
- a newly settled T03 bill could remain aggregated with a stale unpaid ticket.

Root cause:

- `/tables/with-status` fell back to the newest in-flight order without requiring it to belong to the current `activated_at` table visit.

Correction:

- fallback orders must belong to the current active visit;
- legacy active tables with no `activated_at` retain their compatibility fallback;
- regression coverage seats a queue party over a stale completed order and confirms payment state `none`.

Commit: `9ef09d01`

### 3.2 Clear inactive tables missing from queue assignment

Live symptom:

- the Q001 assignment selector offered only T03 although T04, T06 and T08 were visibly clear.

Root cause:

- the cashier readiness predicate rejected `is_active === false`, even though seating is the action that starts the table visit.

Correction:

- queue assignment now accepts tables whose derived operational state is `available` and have no live service order.

Live re-test:

- Q002 assignment offered T03, T04, T06 and T08.

Commit: `9ef09d01`

### 3.3 Confirmed payment stayed red until refresh

Live symptom:

- the drawer confirmed terminal settlement while the table card still showed red `Unpaid` until Refresh Board.

Root cause:

- the optimistic update changed legacy `payment_status` but left the canonical `payment_summary` at `unpaid`; the card correctly preferred the canonical field.

Correction:

- a single-bill settlement now updates the local canonical summary, method, timestamp and order id atomically;
- multi-order summaries remain server-authoritative and are not falsely marked paid.

Live re-test:

- requested bill #269 changed immediately to green `Paid · Terminal` without manual refresh.

Commit: `2c103e6a`

## 4. Automated verification

### Backend combined regression

The following live-affected suites ran inside Docker:

- cashier order lifecycle;
- table status/payment derivation;
- queue/reservation seating activation;
- daily queue numbering, duplicate prevention and stale-summary rules;
- reservation table assignment;
- role permissions and payroll privacy, including non-administrator response redaction;
- work sessions and schedule export.

Result: **60 passed**, 1 existing FastAPI/httpx deprecation warning.

### Frontend/compiler

- Angular hot-reload build after each frontend correction: passed.
- Production-static Angular build: passed.
- Known non-blocking warnings remain:
  - POS and customer-menu stylesheet budgets;
  - `dijkstrajs` CommonJS optimisation warning from the QR dependency.

### Tablet browser sweep

- 20 live authenticated route checks passed: 10 routes × portrait and landscape.
- No empty pages, application errors, root-width overflow or offscreen operational controls.
- A temporary administrator was created for this isolated sweep and deleted after completion.

## 5. Remaining launch checkpoints

### 5.1 Old operational test data — must be resolved before opening

The live end-day report and KDS agree that three four-day-old bills remain open:

| Table | Bill | Current condition |
| --- | --- | --- |
| T01 | #257 | Unpaid; stale kitchen ticket |
| T02 | #263 | Unpaid; stale kitchen ticket |
| T05 | #261 | Unpaid; stale kitchen ticket |

These were not silently marked paid or deleted because that would alter accounting history without a manager decision. Before launch, an owner must decide whether each is a genuine bill to collect or QA residue to void through the accounting process, then close the tables and confirm KDS backlog returns to zero.

### 5.2 Physical attendance proof

The live desktop browser reached the camera checkpoint and failed safely because no camera device was exposed. Complete one real profile clock-in and clock-out on the shop Android tablet, then confirm the actual times appear in Timetable.

### 5.3 Physical printer/payment hardware

This pass did not claim physical Bluetooth printing or payment-terminal hardware success. Complete the documented Android/XP-80T pairing, kitchen split-ticket, cashier receipt and terminal handoff tests on the shop devices.

### 5.4 Waiter payroll UI after the login limiter cools down

The server-side non-administrator payroll tests passed, and operational payloads contain no rates. The extra live waiter login was blocked by the production login rate limiter before authentication, so repeat this final UI-negative check after the limiter window clears: sign in as a waiter and confirm Users/payroll reports and hourly-rate values are unavailable.

## 6. Launch decision

**Application workflows covered by this operations upgrade: accepted.**

**Unconditional restaurant launch: not yet signed off.** The remaining work is operational/hardware acceptance, not an unresolved defect in the upgraded queue, reservation, payment-indicator or dynamic-attendance code:

1. resolve bills #257, #261 and #263 and clear KDS backlog;
2. clock one employee in/out with the physical tablet camera;
3. print kitchen and cashier receipts on the real XP-80T;
4. run one low-value real terminal/HitPay settlement and reconcile it in Reports.
5. complete the cooled-down waiter login check and confirm payroll values are absent.

Once those four checks pass, the system can move to a supervised soft launch.
