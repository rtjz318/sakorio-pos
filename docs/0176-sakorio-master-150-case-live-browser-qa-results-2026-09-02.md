# Sakorio Master 150-Case Live Browser QA Results

**Execution date:** 2 September 2026 (Singapore time)  
**Source brief:** `0175-sakorio-master-full-pos-rerun-qa-brief-2026-08-31.md`  
**Live staff build observed:** `2.1.6 89b5fb07`  
**Method:** Browser-only inspection and interaction on `staff.sakorio.com` and `order.sakorio.com`. No result below is promoted from a code-only check.

> **Post-report correction and remediation:** The staff service eventually recovered after roughly 55–60 seconds, so the original wording that it never recovered was too strong. A controlled queue-to-terminal lifecycle and tablet retest were subsequently completed on builds `1355dbe8` and `05737dd7`. See [0177-sakorio-launch-blocker-remediation-live-results-2026-09-02.md](0177-sakorio-launch-blocker-remediation-live-results-2026-09-02.md). The historical scores below remain the honest results of the original 150-case execution window; the addendum records which blocked paths were reopened and which launch blockers remain.

## Executive decision

**NO-GO for production launch.** The customer booking and queue surfaces are usable, but the staff service entered a repeating Render wake screen and did not return to the authenticated application. This blocked the critical reservation/queue -> seat -> QR order -> KDS -> payment -> close chain. Printing is also not launch-ready: the live Settings page showed `0/3` agents online, 17 waiting jobs, and no native Bluetooth plugin in the browser build.

The test created only two labelled synthetic records and cleaned both up:

- Queue `Q001`: created, live status viewed, then cancelled from the guest page.
- Reservation `#99`: booked for the current service date, manage page opened, delay notice sent, then cancelled with confirmation.

No old table, bill, kitchen ticket, payment, user, shift, reservation, queue record, or printer job was changed.

## Scoring rules

- **PASS:** the stated workflow was completed in the live browser and met its acceptance result.
- **PARTIAL:** a meaningful part was completed, but a cross-role or final-state assertion was blocked.
- **FAIL:** the live workflow completed far enough to demonstrate an acceptance failure.
- **BLOCKED:** the required role, physical device, permission, or service was unavailable.
- Scores are usability/readiness scores from 0 to 10. A technical pass is not automatically a 10.

## Live evidence summary

- Staff login initially succeeded and exposed POS, Orders, Queue, Reservations, Tables, KDS, Reports, Timetable, My Shift, Users and Settings.
- POS baseline: 10 tables, 4 open bills, 112 products, SGD 0 paid today.
- Old unresolved state was visible: four open/unpaid bills, three kitchen backlog tickets, and 17 waiting printer jobs.
- Customer queue join produced a large, clear `Q001`, live/polling status, party size and parties-ahead count.
- Booking availability took roughly 40 seconds from cold start. Reservation creation, manage link, delay notice and cancellation worked.
- Product audit found 112 items; 90 image elements loaded successfully, zero broken images, and 22 items intentionally lacked images.
- Staff POS local cart behavior worked for search, add, note, quantity increase/decrease and clear without sending a live order.
- At 1024x768 and 768x1024 the POS/table layouts had no page-level horizontal overflow, but many staff action targets measured about 36-40 px rather than the preferred 44 px.
- Customer queue at 390x844 had no horizontal overflow. Booking calendar controls also contained several sub-44 px targets.
- A stale signed table link correctly showed `Table reset required` and did not expose bill history.
- Reports eventually reconciled to four active tables, four open/unpaid bills, three unsettled kitchen tickets and zero open shifts, but the async counters briefly displayed stale zeroes.

## Case results: complete journeys

| Case ID | Status | Score | Live-browser evidence and required improvement |
|---|---:|---:|---|
| MASTER-E2E-001 | FAIL | 3.0 | Login initially worked, but a later protected-route load entered an endless Render wake cycle. Remove free-instance cold starts or add reliable post-wake route/session recovery. |
| MASTER-E2E-002 | FAIL | 3.0 | Warm navigation was initially stable; direct route/reload later lost the usable staff shell to the wake page. Persist the requested route and session through recovery. |
| MASTER-E2E-003 | PARTIAL | 6.0 | Baseline inspection found four old open bills, three KDS backlog tickets and 17 waiting print jobs. Add an explicit pre-shift cleanup/quarantine workflow. |
| MASTER-E2E-004 | PARTIAL | 6.5 | Multiple staff/customer tabs showed correct table/tenant identities before the staff outage; cross-tab mutation could not finish. Retest after staff uptime is fixed. |
| MASTER-E2E-005 | BLOCKED | 2.0 | Disposable-role lifecycle was not safe to run after the staff service became unavailable. Provide stable staff access and a dedicated QA tenant. |
| MASTER-E2E-006 | PARTIAL | 7.0 | Correct owner login was proven with safe UI; wrong-password/recovery sequence was not completed. Add a nonproduction account-lockout test fixture. |
| MASTER-E2E-007 | FAIL | 3.0 | The authenticated session could not be resumed after the wake-screen interruption. Make expiry and recovery explicit instead of silently stranding the operator. |
| MASTER-E2E-008 | PARTIAL | 6.0 | Language selector exposed nine languages, but route-wide translation traversal was blocked by staff outage. Retest critical terminology per language. |
| MASTER-E2E-009 | PARTIAL | 5.5 | Authenticated shell showed `2.1.6 89b5fb07`; a stale pre-login shell had shown another hash. Make deployment/version state singular and visible after wake. |
| MASTER-E2E-010 | FAIL | 4.0 | Starting state was not clean: old bills, KDS backlog, printer queue and an over-capacity seated table existed. Require a signed clean-shift gate before service. |
| MASTER-E2E-011 | PARTIAL | 5.0 | Reservation #99 was booked live; host assignment through close was blocked by staff outage. Fix uptime, then rerun the full chain. |
| MASTER-E2E-012 | PARTIAL | 7.5 | Phone guidance and valid international-format booking worked; host search was blocked. Focus invalid fields and prove staff search after recovery. |
| MASTER-E2E-013 | PARTIAL | 7.0 | Date availability and future selectable days were visible; host today/future filter comparison was blocked. |
| MASTER-E2E-014 | PARTIAL | 8.0 | Guest manage link and confirmed cancellation worked; staff-side cancelled-seat prevention was blocked. |
| MASTER-E2E-015 | BLOCKED | 2.5 | Staff-created walk-in reservation/edit/finish could not execute while staff service was down. |
| MASTER-E2E-016 | BLOCKED | 2.5 | Seat-now and exact-capacity assignment require the host interface; no live staff access. |
| MASTER-E2E-017 | BLOCKED | 2.5 | Late-arrival override/audit path unavailable. |
| MASTER-E2E-018 | BLOCKED | 2.5 | No-show recovery requires stable host access and a disposable reservation. |
| MASTER-E2E-019 | BLOCKED | 2.5 | Reassignment between T07/T08 could not be safely completed. |
| MASTER-E2E-020 | BLOCKED | 2.0 | Concurrent dual-reservation service could not be executed after staff outage. |
| MASTER-E2E-021 | PARTIAL | 6.5 | Guest joined as Q001 and saw a large number and live status; host ping/seat/order/pay/close was blocked. |
| MASTER-E2E-022 | BLOCKED | 2.5 | Two-guest ping isolation requires staff queue control. |
| MASTER-E2E-023 | BLOCKED | 2.5 | Duplicate queue handling requires host access. |
| MASTER-E2E-024 | BLOCKED | 2.5 | Ping/return/re-ping realtime transitions could not be initiated. |
| MASTER-E2E-025 | PARTIAL | 6.5 | Guest cancellation produced a final inactive state and Join again action; host call-next path was blocked. |
| MASTER-E2E-026 | BLOCKED | 2.5 | Large-party capacity rejection requires live host table assignment. |
| MASTER-E2E-027 | BLOCKED | 2.5 | Staff-created queue row and completion unavailable. |
| MASTER-E2E-028 | PASS | 8.5 | Public cancellation worked immediately and exposed Join again. Add a short undo/confirmation affordance to reduce accidental taps. |
| MASTER-E2E-029 | BLOCKED | 2.5 | Full-floor recovery recommendations require live staff board mutations. |
| MASTER-E2E-030 | BLOCKED | 2.5 | Reservation/queue duplicate reconciliation unavailable. |
| MASTER-E2E-031 | PARTIAL | 6.0 | Old signed QR was blocked with `Table reset required`; new-session reuse was blocked by staff outage. |
| MASTER-E2E-032 | PARTIAL | 5.0 | Closed/stale QR state was friendly, but opening the table and recovering on the same physical QR could not be proven. |
| MASTER-E2E-033 | PARTIAL | 6.0 | Stale token rejection worked; unpaid-close guard and paid reset were not executed. |
| MASTER-E2E-034 | BLOCKED | 2.5 | Reserved guest-count changes require live staff assignment. |
| MASTER-E2E-035 | BLOCKED | 2.5 | Zero-bill accidental-open cleanup unavailable. |
| MASTER-E2E-036 | BLOCKED | 2.0 | Table transfer was not run on production data without a disposable active session. |
| MASTER-E2E-037 | BLOCKED | 2.0 | Unsafe-destination transfer rejection not executed. |
| MASTER-E2E-038 | BLOCKED | 1.5 | Two-staff conflict test requires a stable second staff session. |
| MASTER-E2E-039 | BLOCKED | 2.0 | Payment-request/add-round policy could not be safely mutated. |
| MASTER-E2E-040 | PARTIAL | 6.5 | Current/history separation was visible in POS/Orders; close/reopen session boundary was blocked. |
| MASTER-E2E-041 | PARTIAL | 6.5 | T07 search/add/note/quantity/clear worked with exact totals; send/KDS/terminal/close was blocked. |
| MASTER-E2E-042 | BLOCKED | 2.5 | Mixed QR/POS multi-round chain requires a fresh table session and staff uptime. |
| MASTER-E2E-043 | BLOCKED | 2.5 | Three-table unsent-cart isolation was not safe to test without cleanup access. |
| MASTER-E2E-044 | PARTIAL | 8.0 | Exact menu search and category chips worked across 112 products; complete search matrix and submit were blocked. |
| MASTER-E2E-045 | PARTIAL | 8.0 | Add, decrement, remove and clear behaved correctly locally; double-Send idempotency was not exercised. |
| MASTER-E2E-046 | PARTIAL | 7.5 | Preparation note persisted through quantity changes; KDS and receipt preservation remain blocked. |
| MASTER-E2E-047 | BLOCKED | 2.5 | Sent-item void with role/audit requires completed order and manager path. |
| MASTER-E2E-048 | BLOCKED | 2.5 | Refresh-between-rounds could not proceed to a live submitted order. |
| MASTER-E2E-049 | BLOCKED | 2.5 | A destructive 20-item live production order was not created without reliable staff cleanup. |
| MASTER-E2E-050 | PARTIAL | 6.0 | Menu availability surface was inspected, but a controlled sold-out fixture was unavailable. |
| MASTER-E2E-051 | PARTIAL | 7.0 | Customer menu previously exposed category sections and no required customer name; current QR was stale, so submit/current bill was blocked. |
| MASTER-E2E-052 | BLOCKED | 2.0 | Two-round guest/KDS live progression unavailable. |
| MASTER-E2E-053 | PARTIAL | 8.5 | Stale signed URL disclosed no order/history and required reset. Full cross-table token-component swap was not performed. |
| MASTER-E2E-054 | BLOCKED | 2.0 | Same-table concurrent dual-device submit requires a fresh session. |
| MASTER-E2E-055 | BLOCKED | 2.5 | Customer cart reload/idempotent confirmation could not use stale QR. |
| MASTER-E2E-056 | PARTIAL | 8.0 | 112-product category chips and search were usable; some category chips require horizontal scrolling on 768 px portrait. |
| MASTER-E2E-057 | PASS | 8.5 | 90 menu images loaded with zero broken image elements; 22 no-image products remained identifiable. |
| MASTER-E2E-058 | BLOCKED | 3.0 | Unicode/punctuation note was not submitted to KDS/receipt. |
| MASTER-E2E-059 | BLOCKED | 2.0 | Network-loss order recovery not safe without a fresh disposable session. |
| MASTER-E2E-060 | BLOCKED | 2.0 | Payment-request lock and paid/closed customer state unavailable. |
| MASTER-E2E-061 | BLOCKED | 2.0 | Mixed station routing could not be triggered; KDS showed zero live and three old backlog tickets. |
| MASTER-E2E-062 | BLOCKED | 2.0 | Independent food/beverage table progression unavailable. |
| MASTER-E2E-063 | BLOCKED | 2.0 | Five-table pressure test unsafe while cleanup access was unavailable. |
| MASTER-E2E-064 | PARTIAL | 5.5 | KDS layout was inspected, but no controlled 20-line ticket could be generated. |
| MASTER-E2E-065 | BLOCKED | 2.0 | Live new-ticket cue could not be triggered. |
| MASTER-E2E-066 | BLOCKED | 2.0 | Pending-to-Served transitions and toast/countdown could not be run. |
| MASTER-E2E-067 | PARTIAL | 5.0 | Three old KDS backlog tickets were visible as unresolved; no safe linked-bill resolution was performed. |
| MASTER-E2E-068 | BLOCKED | 2.0 | Manager void-to-KDS cancellation path unavailable. |
| MASTER-E2E-069 | BLOCKED | 2.0 | KDS disconnect/reconnect requires live tickets. |
| MASTER-E2E-070 | BLOCKED | 2.0 | Partial food/beverage completion policy unavailable. |
| MASTER-E2E-071 | PARTIAL | 5.0 | Existing payment-requested T06 demonstrated yellow/unpaid distinction; terminal settlement/print/close was not changed. |
| MASTER-E2E-072 | BLOCKED | 2.0 | New HitPay sandbox payment was not started because the staff chain was unavailable. |
| MASTER-E2E-073 | BLOCKED | 2.0 | HitPay abandonment/retry requires a disposable live bill. |
| MASTER-E2E-074 | BLOCKED | 2.0 | HitPay callback idempotency was not rerun. |
| MASTER-E2E-075 | BLOCKED | 2.5 | Payment drawer amount-refresh path unavailable. |
| MASTER-E2E-076 | BLOCKED | 2.0 | Double payment confirmation was not attempted. |
| MASTER-E2E-077 | PARTIAL | 7.5 | Prior customer payment surface showed HitPay/terminal policy and no customer Cash; cashier close path was blocked this run. |
| MASTER-E2E-078 | BLOCKED | 2.0 | Manager discount/correction fixture unavailable. |
| MASTER-E2E-079 | BLOCKED | 1.5 | Refund/reopen was not performed on live data. |
| MASTER-E2E-080 | BLOCKED | 1.5 | Full order-to-reset lifecycle did not complete. |
| MASTER-E2E-081 | PARTIAL | 6.5 | Orders displayed Active 3, Not Paid Yet 1, Paid awaiting close 0 and History 262; controlled bucket transitions were blocked. |
| MASTER-E2E-082 | PARTIAL | 7.0 | Table-grouped current/history overview was compact; filter persistence after detail was not fully exercised. |
| MASTER-E2E-083 | PARTIAL | 6.0 | POS/Orders/Reports were inspected, but no new completed transaction existed for exact reconciliation. |
| MASTER-E2E-084 | PARTIAL | 7.0 | Today's report showed zero revenue and the operational checklist eventually showed four open/unpaid bills; settlement refresh was blocked. |
| MASTER-E2E-085 | BLOCKED | 2.0 | Disposable bill cancellation/revenue audit unavailable. |
| MASTER-E2E-086 | BLOCKED | 2.0 | Singapore day-boundary execution window/fixture unavailable. |
| MASTER-E2E-087 | PARTIAL | 7.5 | End-day checklist eventually reconciled tables, bills, KDS and shifts; printing/queue/reservations need a unified readiness gate. |
| MASTER-E2E-088 | PARTIAL | 7.0 | Today/month report filters worked; export and all staff/category permutations were not completed. |
| MASTER-E2E-089 | PARTIAL | 6.5 | Requested/unpaid and historical paid totals were distinguishable; controlled requested-to-paid-to-close comparison was blocked. |
| MASTER-E2E-090 | BLOCKED | 2.0 | No new QA payment was created, so final financial cross-record reconciliation could not run. |
| MASTER-E2E-091 | PARTIAL | 6.0 | Seven selectable profiles and dynamic unscheduled clock-in wording were present; camera-dependent clock-in/out was not authorized. |
| MASTER-E2E-092 | BLOCKED | 2.5 | Planned shift plus break flow requires a physical/permission-enabled attendance run. |
| MASTER-E2E-093 | BLOCKED | 2.5 | Concurrent clock-in prevention was not exercised. |
| MASTER-E2E-094 | BLOCKED | 2.5 | Manager attendance correction not executed. |
| MASTER-E2E-095 | PARTIAL | 5.5 | Annual leave/MC ledger and calendar controls were visible; disposable balance mutation was not performed. |
| MASTER-E2E-096 | PARTIAL | 6.5 | Owner could view hourly rates; regular-staff privacy remained unproven without regular credentials. |
| MASTER-E2E-097 | BLOCKED | 2.0 | Disposable employee login/disable lifecycle unavailable after staff outage. |
| MASTER-E2E-098 | PARTIAL | 6.0 | Full timetable calendar and schedule actions were visible; create/move/delete was not mutated. |
| MASTER-E2E-099 | BLOCKED | 1.0 | Physical Android camera/profile clock-in requires the target tablet and permission prompt. |
| MASTER-E2E-100 | FAIL | 3.0 | QA synthetic public records were cleaned, but old bills/KDS/prints remained and staff logout could not be completed after outage. |

## Case results: cross-cutting reliability, security and printing

| Case ID | Status | Score | Live-browser evidence and required improvement |
|---|---:|---:|---|
| MASTER-XCUT-101 | PASS | 9.0 | Stale signed QR displayed only `Table reset required`; no prior bill/history was exposed. Rerun once after an actual new close. |
| MASTER-XCUT-102 | PARTIAL | 7.0 | Signed-session binding behavior appeared sound on stale URL; deliberate two-table component swap was not completed. |
| MASTER-XCUT-103 | BLOCKED | 2.0 | Logout/back/direct protected-route test was overtaken by Render wake failure. |
| MASTER-XCUT-104 | BLOCKED | 2.0 | Waiter server-side denials require waiter credentials and stable staff service. |
| MASTER-XCUT-105 | BLOCKED | 2.0 | Manager-versus-cashier correction comparison unavailable. |
| MASTER-XCUT-106 | PARTIAL | 6.5 | Notes safely displayed plain text in public reservation; full script-like cross-module payload was not submitted. |
| MASTER-XCUT-107 | PARTIAL | 5.5 | Basic invalid phone/disabled-submit behavior was seen; bounded login/queue/reservation rate-limit behavior was not proven. |
| MASTER-XCUT-108 | PARTIAL | 8.0 | Visible URLs/errors exposed no password, API key, stack trace or printer token; signed URLs must stay out of logs/screenshots. |
| MASTER-XCUT-109 | BLOCKED | 1.5 | Same-order concurrent staff mutation needs two stable staff sessions. |
| MASTER-XCUT-110 | PARTIAL | 5.5 | History and statuses were visible, but complete actor/reason before/after audit coverage was not verified. |
| MASTER-XCUT-111 | BLOCKED | 1.5 | Throttled double QR submit requires a new active session. |
| MASTER-XCUT-112 | BLOCKED | 1.5 | Repeat HitPay callback/return not run. |
| MASTER-XCUT-113 | BLOCKED | 2.0 | Queue Ping/Seat/Cancel double-action test requires staff queue access. |
| MASTER-XCUT-114 | BLOCKED | 2.0 | Reservation Assign/Seat/Finish double-action test unavailable. |
| MASTER-XCUT-115 | BLOCKED | 2.0 | Send/Serve/Print/Close idempotency could not be triggered. |
| MASTER-XCUT-116 | PARTIAL | 6.0 | Queue page changed from Live to Polling while staff/backend availability degraded and continued showing final state. Reconnect semantics still need live ping proof. |
| MASTER-XCUT-117 | BLOCKED | 2.0 | KDS disconnect/catch-up needs controlled incoming tickets. |
| MASTER-XCUT-118 | FAIL | 3.0 | Reopening/navigating the staff browser did not restore server truth; it remained on the Render wake loop. |
| MASTER-XCUT-119 | PARTIAL | 5.5 | Guest queue visibly fell back to Polling, but a live state-changing event could not prove catch-up. |
| MASTER-XCUT-120 | PARTIAL | 4.5 | Render timeout/wake failure was visible, but the staff UI supplied no actionable recovery other than waiting. |
| MASTER-XCUT-121 | BLOCKED | 1.0 | Live Settings showed 0/3 online agents; no physical Android/XP-80T pairing was available in browser QA. |
| MASTER-XCUT-122 | BLOCKED | 1.0 | Three item-per-slip physical prints unavailable. |
| MASTER-XCUT-123 | BLOCKED | 1.0 | Kitchen/beverage physical route proof unavailable. |
| MASTER-XCUT-124 | BLOCKED | 1.0 | New paid receipt could not print; existing queue must be cleared only after agent recovery. |
| MASTER-XCUT-125 | PARTIAL | 3.0 | Offline state and 17 waiting jobs were visible; restore-and-drain could not execute without a printer agent. |
| MASTER-XCUT-126 | BLOCKED | 1.0 | Agent restart and no-reprint proof require physical app. |
| MASTER-XCUT-127 | BLOCKED | 1.0 | Paper-out/disconnect recovery requires physical printer. |
| MASTER-XCUT-128 | BLOCKED | 1.5 | Authorized manual reprint requires live printer and disposable receipt. |
| MASTER-XCUT-129 | BLOCKED | 1.0 | Token revoke/replace requires the Android agent; no secret was exposed in the browser. |
| MASTER-XCUT-130 | BLOCKED | 0.5 | Full Android order/print/payment/close journey is unproven and remains a launch blocker. |

## Case results: UI, tablet, accessibility and usability

| Case ID | Status | Score | Live-browser evidence and required improvement |
|---|---:|---:|---|
| MASTER-UX-131 | PARTIAL | 7.5 | POS drawer fit 1024x768 without horizontal overflow; local cart worked. Several staff targets were only 36-40 px and payment/close was blocked. |
| MASTER-UX-132 | PARTIAL | 7.0 | 768x1024 remained within the page width, but category chips extended offscreen horizontally and the page was long. Make horizontal affordance obvious. |
| MASTER-UX-133 | BLOCKED | 2.0 | No physical Android 1280x800 touch order/pay/close run. |
| MASTER-UX-134 | BLOCKED | 2.0 | No physical Android portrait payment-request run. |
| MASTER-UX-135 | PARTIAL | 8.0 | Queue at 390x844 had no overflow and clear status. Current customer QR was stale, so order/status/payment portion was blocked. |
| MASTER-UX-136 | PARTIAL | 7.5 | Menu product names/images were inspected; full 360x800 long-note submit was blocked. |
| MASTER-UX-137 | PARTIAL | 6.5 | Reservation page was responsive, but host tablet Assign/Seat actions were unavailable. Ensure labels explicitly include table names. |
| MASTER-UX-138 | PARTIAL | 6.5 | Guest queue number/status was excellent on mobile; host tablet ping/seat/cancel counters were not reachable. |
| MASTER-UX-139 | BLOCKED | 2.0 | No five-ticket KDS touch pressure run. |
| MASTER-UX-140 | PARTIAL | 7.5 | Orders used compact table-based buckets and did not let one order dominate; tablet detail/filter handoff was incomplete. |
| MASTER-UX-141 | PARTIAL | 5.5 | Accessible names existed on many controls, but a complete keyboard-only POS/logout pass was not finished. |
| MASTER-UX-142 | PARTIAL | 7.0 | Public form roles/names and queue status labels were meaningful; owner/staff status-chip announcements need full screen-reader proof. |
| MASTER-UX-143 | BLOCKED | 2.5 | 200% zoom execution was not completed before staff outage. |
| MASTER-UX-144 | PARTIAL | 7.5 | Payment/KDS states used text in addition to color in observed screens. Verify all chips and disabled states under high contrast. |
| MASTER-UX-145 | PARTIAL | 7.0 | Booking confirmation, delay success and cancellation confirmation were readable; conflict/offline/payment toasts remain untested. |
| MASTER-UX-146 | PARTIAL | 6.5 | Mobile form fields remained reachable in the simulated viewport; real virtual-keyboard obstruction requires device testing. |
| MASTER-UX-147 | PASS | 8.5 | 112-product search/category navigation, loaded images and readable prices were confirmed. Improve portrait chip discoverability and 44 px targets. |
| MASTER-UX-148 | PARTIAL | 6.0 | Slow loading exposed explicit reservation loading text, but roughly 40 seconds is excessive and reduced-motion behavior was not proven. |
| MASTER-UX-149 | FAIL | 4.0 | The novice reservation-to-close journey stopped at staff handoff due wake loop; it cannot be considered smooth or launch ready. |
| MASTER-UX-150 | FAIL | 2.0 | Final cross-role target-device journey did not complete; staff availability and physical printing remain P0 blockers. |

## Score distribution

| Outcome | Count |
|---|---:|
| PASS | 4 |
| PARTIAL | 60 |
| FAIL | 8 |
| BLOCKED | 78 |
| **Total** | **150** |

The mean readiness score is approximately **4.04/10**. This low number is driven primarily by a single systemic dependency: once the staff service became unavailable, every cross-role mutation, KDS transition, payment, close, concurrency and role test became honestly blocked rather than falsely passed.

## Launch blockers in priority order

### P0-1 — Staff service availability and route recovery

The staff custom domain repeatedly cycled through Render's free-instance wake page for several minutes. It did not return to Login, Queue or the previously authenticated route. Move the staff web service to an always-on production instance, verify health checks, and add post-wake deep-link/session restoration. Then rerun MASTER-E2E-001, 002, 007, 011, 021, 031-100, MASTER-XCUT-103-120 and MASTER-UX-149-150.

### P0-2 — Physical Android/XP-80T acceptance

The live browser reported 0/3 printer agents online and 17 waiting jobs. Browser fallback correctly stated that the native Bluetooth plugin was unavailable. Connect the production Android app and XP-80T, obtain 1/1 online, then run MASTER-XCUT-121-130 with real paper and controlled receipts.

### P0-3 — Controlled full lifecycle

After P0-1 and P0-2, complete one labelled disposable journey:

1. Public reservation or queue join.
2. Host assigns and seats a clean table.
3. Customer scans the fixed QR and submits food plus drink without a name.
4. Kitchen and beverage lanes receive only their lines and progress to Served.
5. Customer requests payment; cashier completes HitPay sandbox or terminal settlement.
6. Cashier prints, closes, verifies History/Reports, and rescans the same physical QR for a clean next session.

### P1 — Operational cleanup and usability

- Resolve or explicitly quarantine the four old open/unpaid bills and three old KDS tickets.
- Restore the printer agent before touching the 17 waiting jobs; prove no duplicate reprints.
- Add a single pre-shift/end-day readiness screen for tables, bills, KDS, queue, reservations, shifts and printing.
- Raise primary tablet touch targets to at least 44 px.
- Make horizontally scrollable category chips visually obvious in portrait.
- Eliminate the roughly 40-second public reservation cold start.
- Complete regular-staff hourly-rate privacy with a true non-admin account.
- Complete camera/attendance flows on the target Android tablet.

## Cleanup ledger

| Synthetic resource | Final state | Evidence |
|---|---|---|
| Queue Q001 | Cancelled | Guest page showed `Queue entry cancelled` and `Join again`. |
| Reservation #99 | Cancelled | Manage page showed final `Cancelled` state after confirmation. |
| Tables/bills/orders/payments | None created | POS cart was cleared before submission; staff outage prevented mutation. |
| Printer jobs | None created | Physical/native printer path was not available. |

## Retest exit criteria

Sakorio should not be called launch-ready until all of the following are true:

- Staff cold start and deep-link recovery pass ten consecutive attempts without a wake loop.
- The complete customer-host-waiter-kitchen-cashier journey passes twice on live domains.
- One HitPay sandbox success, one abandoned/retry case and one callback-refresh case reconcile exactly once.
- Android XP-80T reaches 1/1 online and all ten physical print cases pass.
- Old operational state is either resolved or formally quarantined with ownership.
- All P0 cases pass and no P1 case is failed or blocked.
- Target tablet and mobile journeys score at least 9/10 with no hidden or sub-44 px primary action.
