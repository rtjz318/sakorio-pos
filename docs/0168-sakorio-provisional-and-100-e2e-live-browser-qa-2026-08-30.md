# Sakorio POS provisional and 100-case live-browser QA report

Date: 2026-08-30  
Run ID: `SKR-QA-20260830-PROV-100`  
Environment: deployed Sakorio domains only  
Build observed: `2.1.6 2c103e6a`  
Restaurant: Ajisen Ramen  
Currency/time zone: SGD / Asia/Singapore  
Source scenario bank: `0076-sakorio-exhaustive-browser-qa-use-case-brief-2026-07-18.md`

## 1. Executive decision

**Release recommendation: NOT READY.**

The primary customer-to-service journey is substantially better than earlier passes. A guest can join the public queue, see a large queue number, receive a live ping without refreshing, be seated, scan the fixed table QR, submit two rounds to one order, watch kitchen progress update live, request terminal payment, and appear in the cashier payment lane. Reservation assignment/reassignment and empty-session release also work. Twenty tablet viewport checks found no page-level horizontal overflow or off-screen controls.

Launch is still blocked by five operational defects:

1. A drink product routed to the Kitchen lane instead of the Beverage lane.
2. Today's Reports view showed zero unpaid/open bills while four open bills were visible in POS/Tables, and zero queue entries while today's seated queue handoff existed.
3. No printer agent was live; three kitchen jobs for the test order remained pending with zero attempts.
4. Staff Logout did not clear the authenticated session, including after a page reload.
5. Old open table sessions expose their current bill to anyone scanning that table's still-open fixed QR. The application is enforcing the open session, but operations have left three four-day-old bills and one customer-visible old bill active.

The run also found a three-guest party seated at a two-seat table, 22 menu products without images, three unresolved kitchen tickets older than six hours, and a cold-start wake-up of roughly 13 seconds.

## 2. How this report was executed

- All product observations were made through the live in-app browser on `staff.sakorio.com` and `order.sakorio.com`.
- No backend API, database query, local login, source-code assumption, or headless local environment was used as QA evidence.
- The 100 cases below are an **evidence-linked simulation matrix**. A case is marked `PASS` only when its defining invariant was seen live. `PARTIAL` means the live journey covered only part of the variant. `BLOCKED` means the final action was intentionally not performed because it needed hardware, a second role, a payment confirmation, or a destructive manager decision. `NEEDS SPEC` means the expected policy is unclear.
- Shared live records were deliberately reused to test cross-module consistency rather than creating 100 unrelated orders.
- No real card data or real payment was used.

## 3. Principal live records and evidence

| Record | Live journey and state at handoff |
|---|---|
| Queue Q001 | Public waitlist -> live queue number -> staff ping -> customer auto-update -> seated at T06 |
| Order/Bill #270 | T06; A1 Kimchi, Green Tea, Char Siu 1pc; two rounds; SGD 10.50; all delivered; terminal payment requested |
| Reservation #97 | Public booking -> same-day host search -> T07 assignment -> T08 reassignment -> seat -> empty-session release -> automatically Finished |
| Reservation #98 | Public booking -> manage token -> cancellation confirmation -> Cancelled |
| Queue Q002 | Host-created walk-in -> best-fit recommendations -> cancel confirmation -> removed after Refresh |
| Old bills | #257 T01 SGD 142.00, #263 T02 SGD 13.00, #261 T05 SGD 12.00 remained open from four days earlier |

## 4. Provisional health scores

| Area | UI/UX | Workflow | Data confidence | Outcome |
|---|---:|---:|---|---|
| Public reservation | 8.5 | 8.0 | High | Good flow; invalid-phone feedback and same-booking seating copy need polish |
| Queue/host stand | 9.0 | 8.5 | High | Live number/ping excellent; cancelled selection lingers until Refresh |
| Tables | 8.5 | 8.0 | Medium | Payment badges clear; capacity and stale-session discipline block launch |
| Customer QR/menu | 9.0 | 8.5 | High | 112-item categorized menu works; old open session privacy risk remains |
| POS/Orders | 8.5 | 8.5 | High | Same-session rounds work; payment completion awaiting confirmation |
| Kitchen/beverage | 8.0 | 6.5 | High | Status loop excellent; drink routing is wrong |
| Payments | 8.5 | 7.0 | Partial | Request state correct; final settlement/close not yet executed |
| Reports/end-day | 7.0 | 5.0 | Low | Today's operational totals contradict live floor state |
| Timetable/attendance | 8.0 | 7.0 | Partial | Dynamic profile model visible; physical clock-in/out not run |
| Printing | 7.0 | 3.0 | High | Jobs created, but no agent consumed them |
| Authentication/session | 7.0 | 4.0 | High | Login works; Logout failed to terminate session |
| Tablet/iPad layout | 9.0 | 9.0 | High | 20/20 route/orientation checks had no root overflow/off-screen controls |

## 5. Complete 100-case scorecard

Scores are `UI / workflow / readiness`, each out of 10.

### E2E-001 to E2E-020: reservation, queue, seating and tables

| ID | Live-browser flow/evidence | Status | Score | Improvement or gate |
|---|---|---|---:|---|
| E2E-001 | #97 covered public booking, assignment, reassignment, seating and release; #270 covered QR, kitchen and payment request. Final settlement/close remains pending. | PARTIAL | 8/8/7 | Complete sandbox terminal settlement and table reset. |
| E2E-002 | #98 public manage link loaded the correct booking and exposed delay/cancel controls; delay notice was not sent. | PARTIAL | 9/8/8 | Add a clear sent-at timestamp after a delay notice. |
| E2E-003 | #98 was booked, opened by token, cancelled through confirmation, and displayed `Cancelled`. | PASS | 9/9/9 | No change required. |
| E2E-004 | #97 was assigned and later released; the linked reservation automatically became Finished rather than Cancelled. | PARTIAL | 8/8/8 | Add an explicit host choice between finish, cancel, and no-show. |
| E2E-005 | No-show was visible as a host action but not used on live data. | BLOCKED | 8/7/6 | Add a safe QA tenant/data reset for lifecycle tests. |
| E2E-006 | The calendar showed past/too-soon dates disabled; early-seat policy itself was not independently exercised. | NEEDS SPEC | 8/7/6 | Define and display the allowed early-arrival window. |
| E2E-007 | #97 could be seated from its same-day arrival workflow; an intentionally late booking was not created. | PARTIAL | 8/8/7 | Add a visible `late` flag and one-tap seat override. |
| E2E-008 | Party-size controls and table-capacity recommendations were visible, but an existing booking was not edited. | PARTIAL | 8/7/6 | Recalculate and announce table recommendations after party edits. |
| E2E-009 | #97 changed T07 -> T08; T07 was released and T08 became reserved, then seated. | PASS | 9/9/9 | No change required. |
| E2E-010 | Occupied/unpaid tables were shown with strong warnings while safe exact-fit choices were ranked first. | PASS | 9/8/9 | Disable clearly unsafe choices instead of leaving them clickable. |
| E2E-011 | Q001 public waitlist -> best-fit T06 -> seat -> POS handoff worked end to end. | PASS | 9/9/9 | Preserve this flow as a launch regression. |
| E2E-012 | Q002 was created, cancelled with confirmation, and disappeared after Refresh. | PASS | 8/8/8 | Remove the cancelled selected card immediately; do not require Refresh. |
| E2E-013 | The no-free-table state was not created; current board showed five clear tables. | PARTIAL | 8/7/6 | Add an explicit no-capacity empty state and quoted-wait guidance. |
| E2E-014 | Live floor showed Emma Wilson, 3 guests on T10, a 2-seat table. | FAIL | 7/5/4 | Block over-capacity seating or require a logged manager override. |
| E2E-015 | Reservation-linked queue filters and counts were present, but no linked duplicate was created. | PARTIAL | 8/7/6 | Add a duplicate-prevention message with the linked reservation number. |
| E2E-016 | Reservation seating and queue seating both synchronized to Tables/POS, but not from one linked record. | PARTIAL | 8/8/7 | Run one linked-reservation queue regression after fixes. |
| E2E-017 | A true stale-tab simultaneous seat race was not safely generated. | BLOCKED | 8/6/5 | Add optimistic locking and a conflict toast, then automate two-session QA. |
| E2E-018 | Direct table-start controls were visible; Q001 rather than a direct walk-in created the tested session. | PARTIAL | 8/8/7 | Add a one-tap `Open walk-in table` action with guest count. |
| E2E-019 | Table-transfer controls were visible but no live paid/unpaid order was moved. | BLOCKED | 8/6/5 | Require a destination recheck and preserve bill/session IDs. |
| E2E-020 | Tables used `Settle first` on open bills, preventing direct unpaid closure. | PASS | 9/9/9 | Preserve this guardrail. |

### E2E-021 to E2E-050: QR, menu, POS and current-session orders

| ID | Live-browser flow/evidence | Status | Score | Improvement or gate |
|---|---|---|---:|---|
| E2E-021 | Active T06 QR added items and created order #270 once. | PASS | 9/9/9 | No change required. |
| E2E-022 | Closed-table QR pages showed a friendly `Table Closed` state. | PASS | 9/9/9 | Keep polling so opening can recover without a new scan. |
| E2E-023 | Two rounds from the same QR merged into #270; two simultaneous customer tabs were not submitted. | PARTIAL | 9/8/7 | Automate concurrent-tab idempotency. |
| E2E-024 | A1 Kimchi and Green Tea were submitted together; Green Tea incorrectly entered Kitchen and Beverage stayed at zero. | FAIL | 8/4/3 | Route Drink Menu products to Beverage by station metadata. |
| E2E-025 | Refresh after submission retained #270 and current item statuses without a duplicate. | PASS | 9/9/9 | Preserve idempotency. |
| E2E-026 | Submit created one order; deliberate rapid double-click was not performed. | PARTIAL | 8/8/7 | Disable Submit while the request is in flight. |
| E2E-027 | A local cart was abandoned and a reload removed it without a ghost order. | PASS | 9/9/9 | No change required. |
| E2E-028 | Kitchen note `no chilli; allergy check` remained readable in customer, POS and KDS views. | PASS | 9/9/9 | Visually elevate allergy keywords. |
| E2E-029 | Normal punctuation rendered correctly; emoji/complex Unicode was not submitted to production. | PARTIAL | 8/8/7 | Add automated Unicode note coverage. |
| E2E-030 | After payment request, the menu and add-item surface were still available. Expected policy is unclear. | NEEDS SPEC | 8/6/5 | Decide whether payment request locks ordering or withdraws the request on add-on. |
| E2E-031 | Closed QR checks did not expose a previous closed session. | PASS | 9/9/9 | Add automated token/session isolation coverage. |
| E2E-032 | QR payment sheet offered HitPay and Card at Table only; Cash was absent. | PASS | 9/9/9 | No change required. |
| E2E-033 | Card at Table request moved #270 to yellow `Payment requested` in Tables and Orders. | PASS | 9/9/9 | Keep request note and timestamp visible to cashier. |
| E2E-034 | HitPay sandbox abandonment was not repeated in this pass. | BLOCKED | 8/6/5 | Run after the terminal path is cleaned up. |
| E2E-035 | HitPay sandbox success was not completed in this pass. | BLOCKED | 8/5/4 | Mandatory pre-launch sandbox success test. |
| E2E-036 | A stale open T01 session exposed bill #257 and its items through that table's still-open fixed QR. | FAIL | 6/4/3 | Auto-expire anomalously old sessions and force manager review before reopening QR. |
| E2E-037 | Floor-first selection and table handoff worked; the actual new items were entered from QR rather than staff POS. | PARTIAL | 9/8/8 | Add a dedicated staff-add smoke path. |
| E2E-038 | POS landscape 1180x820 had no root overflow or off-screen controls. | PASS | 9/9/9 | Preserve in visual regression. |
| E2E-039 | POS portrait 820x1180 had no root overflow or off-screen controls. | PASS | 9/9/9 | Preserve in visual regression. |
| E2E-040 | 112 items were browsable by category; search narrowed `Char Siu 1pc` to one SGD 1.50 result. | PASS | 9/9/9 | Add sticky active-category feedback while scrolling. |
| E2E-041 | Cart add/abandon was verified; wrong-item removal before submit was not separately recorded. | PARTIAL | 8/8/7 | Keep remove action large and reversible. |
| E2E-042 | Quantity and total rendering were correct for tested single quantities; correction variant was not run. | PARTIAL | 8/8/7 | Add inline quantity stepper feedback. |
| E2E-043 | Second round Char Siu joined the same table session/order #270 and generated a new current KDS ticket. | PASS | 9/9/9 | Preserve this as a core regression. |
| E2E-044 | Sent-item void was not performed against the live bill. | BLOCKED | 8/6/5 | Require role authorization, reason and audit trail. |
| E2E-045 | POS/customer note appeared on the production ticket and remained legible. | PASS | 9/9/9 | No change required. |
| E2E-046 | Mixed food/drink order failed station separation. | FAIL | 8/4/3 | Same blocker as E2E-024. |
| E2E-047 | Orders overview placed #270 in `Not Paid Yet`; current ticket, items, total and table were clear. | PASS | 9/9/9 | No change required. |
| E2E-048 | `Open table POS` and `Collect payment` actions preserved table/order context. | PASS | 9/9/9 | No change required. |
| E2E-049 | First and second rounds stayed current under #270 until table close. | PASS | 9/9/9 | Preserve session invariant. |
| E2E-050 | Active/Not Paid/History separation was visible; closing #270 was not yet completed to verify migration. | PARTIAL | 9/8/7 | Verify current-to-history transition after confirmed settlement. |

### E2E-051 to E2E-070: checkout, payments, KDS and printing

| ID | Live-browser flow/evidence | Status | Score | Improvement or gate |
|---|---|---|---:|---|
| E2E-051 | Payment drawer opened with #270/SGD 10.50 and could be exited without changing paid state. | PASS | 9/9/9 | No change required. |
| E2E-052 | Terminal payment request remained pending, not paid; yellow state appeared across customer, Tables and Orders. | PASS | 9/9/9 | Preserve the three-state payment model. |
| E2E-053 | Final terminal settlement and table clearing require action-time financial confirmation and remain paused. | BLOCKED | 9/7/6 | Complete #270 settlement, verify green Paid, then close/reset T06. |
| E2E-054 | HitPay sandbox success was not completed in this run. | BLOCKED | 8/5/4 | Mandatory success/return/webhook test before launch. |
| E2E-055 | HitPay cancel/failure was not completed in this run. | BLOCKED | 8/5/4 | Mandatory cancel, retry and timeout test before launch. |
| E2E-056 | Duplicate terminal/payment submission was not attempted. | BLOCKED | 8/5/4 | Server-side idempotency plus a disabled in-flight payment button. |
| E2E-057 | Partial/mixed payment behavior was not exposed in the tested drawer. | NEEDS SPEC | 7/5/4 | Explicitly support it with remaining balance or label it unsupported. |
| E2E-058 | Manager discount/correction was not applied to live financial data. | NEEDS SPEC | 7/5/4 | Define permissions, reasons, tax recalculation and audit export. |
| E2E-059 | Reopen paid/closed bill was not available without first completing payment. | NEEDS SPEC | 7/5/4 | Define manager-only correction workflow. |
| E2E-060 | Live POS/Tables showed four open bills, but Today's Reports showed zero unpaid/open bills. | FAIL | 7/3/2 | Fix Singapore-day boundaries and use the same operational bill query. |
| E2E-061 | #270 appeared immediately on the live KDS and could be progressed. | PASS | 9/9/9 | No change required. |
| E2E-062 | Beverage lane stayed at zero while Green Tea was on Kitchen. | FAIL | 8/4/3 | Correct product station assignment and add route tests. |
| E2E-063 | All-production view showed the combined ticket; station labeling could not compensate for the incorrect route. | PARTIAL | 8/7/6 | Display explicit station badge on every item. |
| E2E-064 | Pending -> Preparing -> Ready -> Served worked; served toast/countdown appeared. | PASS | 9/9/9 | Preserve the completion feedback. |
| E2E-065 | Customer page auto-updated Pending -> Preparing -> Ready -> Delivered without refresh. | PASS | 9/9/9 | No change required. |
| E2E-066 | Three tickets older than six hours were hidden from the live shift and exposed through backlog mode. | PASS | 9/8/8 | Add a manager-owned start-of-day backlog checklist. |
| E2E-067 | Backlog count and review action were visible; old live records were preserved for manager disposition. | PARTIAL | 8/7/6 | Add bulk resolve with reason and audit. |
| E2E-068 | Special note remained readable while the ticket moved through KDS. | PASS | 9/9/9 | Highlight allergy notes separately from preparation notes. |
| E2E-069 | KDS cancellation after a sent-item void was not performed. | BLOCKED | 8/6/5 | Add a visible cancelled-item strike-through and acknowledgement. |
| E2E-070 | Three kitchen print jobs for #270 were queued with zero attempts because no printer agent was online. | FAIL | 7/3/2 | Bring one Android/Bluetooth agent online and run physical receipt acceptance. |

### E2E-071 to E2E-090: roles, attendance, timetable, reports and administration

| ID | Live-browser flow/evidence | Status | Score | Improvement or gate |
|---|---|---|---:|---|
| E2E-071 | User creation was not submitted because final account creation needs explicit confirmation. | BLOCKED | 8/7/6 | Use a dedicated disposable role matrix in QA. |
| E2E-072 | Service routes were accessible in the Owner session; a real Waiter session was unavailable. | PARTIAL | 8/7/6 | Provide launch role test accounts. |
| E2E-073 | Non-admin denial for Settings/Users/Reports could not be verified without that role session. | BLOCKED | 7/5/4 | P1 permission regression before launch. |
| E2E-074 | Timetable displayed one planned shift and six unscheduled staff; staff profile selection was dynamic. | PASS | 8/8/8 | Add a direct link from timetable shift to the clock-in profile. |
| E2E-075 | My Shift listed seven selectable profiles and optional planned shift; camera clock-in was not performed. | BLOCKED | 8/7/6 | Run on the physical Android tablet with camera permission. |
| E2E-076 | Clock-out duration was not generated because clock-in was not started. | BLOCKED | 8/6/5 | Physical clock-in/out acceptance is mandatory. |
| E2E-077 | Timetable exposed actual attendance separately and showed zero current records. | PASS | 8/8/8 | Add an obvious open-session warning on manager dashboard. |
| E2E-078 | Annual-leave/MC ledger surfaces existed; no entitlement was changed. | PASS | 8/7/7 | Add balance-before/balance-after confirmation. |
| E2E-079 | Calendar-grade scheduling UI was present; drag/drop persistence was not mutated. | PARTIAL | 8/7/6 | Run an isolated schedule create/move/delete regression. |
| E2E-080 | Month range showed SGD 316.50/11 orders; Today contradicted the current operational bill state. | FAIL | 7/4/3 | One canonical local-day reporting query is required. |
| E2E-081 | Products, Categories, Tables and Attendance report sections opened and rendered. | PASS | 8/8/8 | No change required. |
| E2E-082 | Active tables, unpaid bills, backlog and open shifts were discoverable only across different tabs; Reports hid the unpaid bills. | FAIL | 7/4/3 | Build one reliable end-day close checklist. |
| E2E-083 | Inventory stock dashboard was not part of the tested navigation surface. | NEEDS SPEC | 6/5/4 | Confirm whether inventory is launch scope or a later module. |
| E2E-084 | Low-stock -> supplier -> PO -> receiving was not available with safe test data. | BLOCKED | 6/5/4 | Isolate from restaurant launch gate if out of scope. |
| E2E-085 | Settings clearly showed Singapore time zone and HitPay sandbox mode without exposing secret values in page text. | PASS | 9/9/9 | Keep secrets masked and rotate before production. |
| E2E-086 | Product availability was not changed because it would alter the live menu. | BLOCKED | 8/7/6 | Add a synthetic sold-out product to QA data. |
| E2E-087 | Logout was clicked twice; dashboard remained authenticated and stayed accessible after reload. | FAIL | 7/2/2 | Clear tokens/session, redirect to login, and add a logout regression. |
| E2E-088 | User/profile forms were inspected but no account was created. | PARTIAL | 8/7/6 | Validate password, role and hourly-rate rules with disposable accounts. |
| E2E-089 | CSV export was clicked; no browser download event or visible success/error feedback followed. | PARTIAL | 6/5/5 | Show an explicit download success or empty-range message. |
| E2E-090 | Paid end-day totals could not be reconciled until #270 is settled and report dates are fixed. | BLOCKED | 6/4/3 | Retest after E2E-053 and the report fix. |

### E2E-091 to E2E-100: refresh, concurrency and recovery

| ID | Live-browser flow/evidence | Status | Score | Improvement or gate |
|---|---|---|---:|---|
| E2E-091 | Reloading the booking form before submit did not create a reservation; #98 appeared only after one final Book action. | PASS | 9/9/9 | No change required. |
| E2E-092 | QR reload after order submission retained #270 and did not create another order. | PASS | 9/9/9 | Preserve request idempotency. |
| E2E-093 | Payment drawer could be exited and reopened without a paid-state change; browser Back/Forward was not stressed. | PARTIAL | 8/8/7 | Add navigation-state automation around checkout. |
| E2E-094 | Two-customer simultaneous submit was not safely executed against the live tenant. | BLOCKED | 8/5/4 | Add two-session concurrency automation in staging. |
| E2E-095 | Customer submit during cashier edit was not executed. | BLOCKED | 8/5/4 | Define optimistic concurrency and visible merge/conflict handling. |
| E2E-096 | Menu remained open after payment request; policy for add-on submission is undefined. | NEEDS SPEC | 8/5/4 | Lock ordering or automatically cancel/recalculate the payment request. |
| E2E-097 | Unsafe occupied/unpaid tables were clearly identified during assignment and safe alternatives ranked first. | PASS | 9/8/8 | Add server-side conflict rejection and a refresh prompt. |
| E2E-098 | Ready-vs-void production race was not executed. | BLOCKED | 8/5/4 | Add item versioning and explicit cancelled production state. |
| E2E-099 | Payment return double-open/refresh was not executed. | BLOCKED | 8/5/4 | Mandatory idempotent webhook/return regression. |
| E2E-100 | #270 demonstrates recoverable unpaid terminal request; abandoned HitPay -> terminal settlement remains incomplete. | PARTIAL | 8/7/6 | Finish terminal settlement after confirmation and verify one paid record. |

## 6. Coverage totals

| Status | Cases | Meaning |
|---|---:|---|
| PASS | 37 | Defining invariant observed live |
| PARTIAL | 24 | Shared live flow covered part of the variant |
| FAIL | 10 | Live behavior contradicted the expected result |
| BLOCKED | 22 | Hardware, payment, second role, concurrency or destructive decision required |
| NEEDS SPEC | 7 | Product policy is not defined clearly enough to score |
| **Total** | **100** | All scenario IDs assessed and evidence-linked |

## 7. Defect and improvement register

### P0/P1 launch blockers

| ID | Severity | Module | Live evidence | Required acceptance criterion |
|---|---|---|---|---|
| QA-168-01 | P1 | Kitchen/beverage routing | Green Tea from Drink Menu appeared in Kitchen; Beverage stayed at zero. | Every product has a station; mixed cart creates correct station items; All view remains coherent. |
| QA-168-02 | P1 | Reports/end-day | Today showed zero unpaid/open bills while T01, T02, T05 and T06 were open. | Singapore-day Reports and live floor queries return the same open-bill set. |
| QA-168-03 | P1 | Authentication | Logout did not redirect or invalidate the session, even after reload. | Logout clears all auth state; protected route redirects to `/login`; Back/reload cannot restore it. |
| QA-168-04 | P1 | Printing | #270 created three pending kitchen jobs with zero attempts; no agent was live. | Android agent online; jobs leave pending; physical line-by-line kitchen and cashier receipts match order. |
| QA-168-05 | P1 | Session/privacy operations | T01 fixed QR exposed old active bill #257 because table was never closed. | Old-session detector alerts manager; inactive/expired service cannot expose another party's bill. |
| QA-168-06 | P1 | Table capacity | Three guests were seated on two-seat T10. | Over-capacity seating is blocked or requires reasoned manager override. |

### P2/P3 improvements

| ID | Priority | Module | Change needed |
|---|---|---|---|
| QA-168-07 | P2 | Reservations | Invalid phone should show inline error immediately, focus the field, and keep Book disabled. |
| QA-168-08 | P2 | Reservations | Do not warn that the assigned table has an upcoming reservation when the upcoming reservation is the same booking. |
| QA-168-09 | P2 | Queue | Remove a cancelled/no-show card immediately; Refresh should not be needed. |
| QA-168-10 | P2 | Payments | Define ordering policy after payment request and reflect it in UI/state transitions. |
| QA-168-11 | P2 | Kitchen | Resolve/archive the three old backlog tickets before service, with an audit reason. |
| QA-168-12 | P2 | Products | Add or intentionally mark placeholders for the approximately 22 products without images. |
| QA-168-13 | P2 | Reports | Export must produce a download or an explicit empty/error message. |
| QA-168-14 | P2 | Infrastructure | Reduce or mask the approximately 13-second Render cold-start wake-up. |
| QA-168-15 | P2 | Login UX | Remove Create account, Provider/Courier login, Register as provider and Contact us from staff-only login. |
| QA-168-16 | P3 | Timetable | Complete the profile with missing employment data and clarify planned-vs-clocked variance. |

## 8. Tablet/iPad viewport acceptance

The deployed staff application was inspected at 820x1180 portrait and 1180x820 landscape on these ten routes: POS, Tables, Reservations, Queue, Kitchen, Orders, Reports, My Shift, Timetable and Products.

- Checks: 20
- Pages with missing content: 0
- Render wake-up pages during warm sweep: 0
- Root horizontal overflow: 0
- Off-screen interactive controls detected: 0

This is a strong UI result, but it does not replace physical Android tablet testing of the camera, Bluetooth printing, keyboard, safe areas and long-shift memory use.

## 9. Cleanup and preserved state

- Reservation #98: cancelled and safe.
- Reservation #97: finished; T08 released and available.
- Queue Q002: cancelled; disappears after Refresh.
- Queue Q001: seated at T06 and linked to bill #270.
- Bill #270: deliberately preserved as `Payment requested`, SGD 10.50, awaiting explicit settlement confirmation.
- Print jobs for #270: deliberately preserved pending for printer-agent diagnosis.
- Old bills #257/#263/#261 and three old KDS tickets: preserved because closing/cancelling them requires a manager accounting decision.

## 10. Required next sequence

1. With explicit confirmation, settle synthetic #270 by terminal, verify Paid, close T06, verify fixed QR privacy and History transition.
2. Fix logout/session invalidation.
3. Fix beverage routing and add product-station regression data.
4. Fix Singapore-day Reports and reconcile all open bills/queue entries.
5. Bring the Android Bluetooth printer agent online and physically accept kitchen/cashier receipts.
6. Clean up or account for old bills and KDS backlog.
7. Run a focused 20-case regression across the five blockers before making a launch decision.

## 11. Final conclusion

Sakorio's main service workflow is now coherent and pleasant for a waiter and customer, and its tablet layout is materially launch-grade. The remaining issues are not cosmetic: they affect production routing, end-day accounting visibility, session security, physical printing and stale customer-session exposure. The product should remain in controlled pilot mode until the P1 acceptance criteria above pass live.
