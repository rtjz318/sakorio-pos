# Sakorio POS Round 4 Browser QA Results - 80 Use Cases

Date executed: 2026-07-20  
Scenario brief: `docs/0084-sakorio-round-4-browser-qa-80-use-cases-2026-07-20.md`  
Execution method: Browser-only actions on Sakorio staff/customer domains  
Run prefix: `SKR-R4-20260720`  
Live deployed version observed in browser: `2.1.6 b35d9e58`

## Executive summary

The POS has improved enough for table-first cashier work to be usable, but the live deployment tested in the browser is still not launch-ready.

The biggest launch blockers found in this pass:

1. Live deployment is still on `b35d9e58`, so several recently pushed fixes are not yet visible in production/staging browser QA.
2. Reservation -> table -> customer QR ordering is not smooth: assigning a reservation to a table does not visibly activate a seated/customer ordering session, and `Open QR/menu` opened a closed table view.
3. Customer QR handoff from POS is weak: `Copy QR link` gave no visible/usable browser clipboard value, and `Open customer QR` did not reliably open a usable customer QR tab.
4. Orders/payment truth still has timing/state issues: immediately after terminal payment, Orders can still show the paid bill under current/not-paid until the table is fully cleared or refreshed into history.
5. Queue counters are inconsistent: queue board showed `3/4 waiting`, while the header showed `6/8 waiting`.
6. Kitchen has `80 unresolved tickets older than 6h` hidden behind backlog mode, which must be cleaned before launch.
7. Tables/POS history contains old pending/live orders from days ago, causing confusing table recovery panels and launch-risk data pollution.
8. Close-table language is inconsistent: `Clear paid`, `Clear table`, and `Close table` should be unified into one obvious service action.

## Browser artifacts created during this run

| Artifact | Result |
|---|---|
| Public reservation | `#56`, `SKR-R4-20260720 E001 Guest`, created then cancelled during cleanup |
| Queue entry | `#20`, `SKR-R4-20260720 E002 Walkin`, seated to T07 |
| POS order | `#82`, T02, Coffee, terminal-paid, table cleared |
| POS order | `#83`, T07, Tecate Light, terminal-paid, table cleared |
| Kitchen tickets observed | `#82`, `#83` appeared in Kitchen & beverages |
| Active browser QR tab inspected | old T01 customer QR returned `Table Closed` |

## Score key

Scores are listed as:

`F / UX / Speed / Layout / Launch`

Where:

- `F` = functional correctness
- `UX` = UI/UX clarity
- `Speed` = workflow speed
- `Layout` = layout/stability
- `Launch` = launch readiness

## Detailed observations from fully executed browser flows

### R4-E2E-001 - Reservation to seated QR order to kitchen to close table

Status: `FAIL`  
Score: `5 / 6 / 5 / 7 / 5`

Browser actions performed:

1. Opened `https://order.sakorio.com/book/1?qa=r4-e001`.
2. Created reservation `#56` for `SKR-R4-20260720 E001 Guest`, party size `2`, `2026-07-20 18:00`.
3. Opened staff Reservations.
4. Confirmed reservation `#56` appeared under `BOOKED`.
5. Clicked `Assign table`.
6. Assigned T07.
7. Confirmed T07 was planned for reservation `#56`.
8. Clicked `Open QR/menu`.
9. Browser opened/contained a menu preview using `staff_access`, but the page showed `Table Closed`.
10. Cancelled reservation `#56` for cleanup.

Expected: Host can seat/activate the reservation, customer QR opens active menu, customer order reaches kitchen, cashier settles, table closes.  
Actual: Reservation creation and table planning worked, but no clear "seat/activate now" action was available, and opened QR/menu showed table closed.

Main improvements:

- Add an explicit `Seat / activate table now` button after table assignment.
- `Open QR/menu` must create or expose an active customer QR session when the guest has arrived.
- Staff preview URL and customer QR URL should be clearly distinguished.

### R4-E2E-002 - Walk-in queue to table assignment to cashier order to terminal checkout

Status: `PASS WITH DEFECTS`  
Score: `8 / 7 / 7 / 8 / 7`

Browser actions performed:

1. Opened Queue.
2. Created queue entry `#20`, `SKR-R4-20260720 E002 Walkin`, party size `2`.
3. Confirmed it appeared and was auto-selected.
4. Seated it to recommended T07.
5. POS opened with queue handoff URL and guest context.
6. Added Tecate Light.
7. Sent order `#83`.
8. Verified ticket `#83` in Kitchen & beverages.
9. Paid by terminal.
10. Cleared T07.
11. Reopened Queue to verify the entry left waiting.

Expected: Queue status, table status, POS order, kitchen ticket, payment, and close state agree.  
Actual: Core flow worked, but Queue counters were inconsistent and the seated lane did not reflect the just-seated guest after completion.

Main improvements:

- Fix queue summary counters.
- Decide whether completed seated guests should appear in Seated lane for today, or make the metric label clearer.
- Clear stale waiting queue data before launch.

### R4-E2E-003 - POS table-first flow mirrors Tables workflow with checkout added

Status: `PASS WITH DEFECTS`  
Score: `8 / 7 / 8 / 8 / 7`

Browser actions performed:

1. Opened POS.
2. Confirmed table grid is first view.
3. Selected T02.
4. Added Coffee.
5. Sent order `#82`.
6. Verified T02 current session showed order `#82`.
7. Verified Kitchen & beverages displayed ticket `#82`.
8. Opened checkout.
9. Paid by terminal.
10. Cleared T02.

Expected: Select table -> add items -> send/pay -> return to table grid smoothly.  
Actual: Functional, but wording still mixes `No tickets yet`, `1 in cart`, `Pay bill`, and `Send order`, which can confuse staff during dine-in service.

Main improvements:

- Make "Send order to kitchen" primary before payment for dine-in carts.
- Keep payment lane clearly separated from unsent cart state.
- Make table-close copy consistent.

### R4-E2E-005 - Paid bill appears paid in POS and Orders immediately after terminal settlement

Status: `FAIL UNTIL TABLE CLEAR / REFRESH`  
Score: `6 / 6 / 6 / 8 / 6`

Browser actions performed:

1. Paid T02 order `#82` by terminal.
2. POS immediately showed `Card terminal payment recorded for T02`, `Last bill #82`, `Paid`.
3. Opened Orders immediately after payment.
4. Orders showed the bill as current table order / not-paid style until the table was cleared and history refreshed.
5. After clearing T02, Orders history showed `#82` as `Paid`.

Expected: POS and Orders payment status agree immediately after settlement.  
Actual: POS shows paid immediately; Orders current/history separation is delayed/confusing until clear/refresh.

Main improvements:

- Orders should use the same paid truth as POS immediately.
- Paid but not closed should be labelled `Paid - awaiting close`, not `Not Paid Yet`.

### R4-E2E-006 / R4-E2E-007 - Customer QR current-session privacy and payment method policy

Status: `PARTIAL PASS / HANDOFF FAIL`  
Score: `6 / 5 / 5 / 7 / 5`

Browser actions performed:

1. Claimed existing customer QR tab for T01.
2. Confirmed old token showed `Table Closed`, not old order history.
3. Opened seated T06 in POS.
4. Clicked `Copy QR link`.
5. Browser clipboard exposed no usable copied link.
6. Clicked `Open customer QR`.
7. No reliable new customer QR tab appeared.

Expected: Staff can hand customer a valid QR link, customer sees current session only, and customer payment excludes cash.  
Actual: Old QR privacy looked safe, but staff cannot reliably expose a usable customer QR link from POS on the deployed version.

Main improvements:

- Replace copy-only behavior with a modal showing QR code, URL, copy result, and open customer preview.
- Add visible success/error toast for `Copy QR link`.
- Keep customer payment methods as HitPay/terminal only.

## 80-case score matrix

| ID | Status | Score | Browser outcome | Needed improvement |
|---|---|---:|---|---|
| R4-E2E-001 | FAIL | 5.6 | Reservation `#56` created and assigned, but QR/menu opened closed table. | Add seat/activate action and working customer QR handoff. |
| R4-E2E-002 | PASS WITH DEFECTS | 7.4 | Queue `#20` -> T07 -> order `#83` -> kitchen -> terminal pay -> clear worked. | Fix queue counters and stale queue data. |
| R4-E2E-003 | PASS WITH DEFECTS | 7.6 | T02 -> Coffee -> order `#82` -> kitchen -> terminal pay -> clear worked. | Clarify send-vs-pay copy and close-table labels. |
| R4-E2E-004 | NEEDS RETEST | 6.8 | Current session panel worked for one order, but same-table second-order was not fully repeated in this run. | Retest after latest deployment; keep all active session orders current until close. |
| R4-E2E-005 | FAIL | 6.4 | POS showed paid immediately, Orders only became clean after clear/history refresh. | Align paid truth in Orders immediately. |
| R4-E2E-006 | PARTIAL PASS | 6.0 | Old QR token showed `Table Closed`, but live QR handoff was not usable. | Improve QR link modal/copy/open flow. |
| R4-E2E-007 | PARTIAL PASS | 6.4 | Staff checkout copy says customer QR uses HitPay/card-at-table only; customer payment screen not reached due QR handoff failure. | Verify on active customer QR after QR handoff is fixed. |
| R4-E2E-008 | BLOCKED | 5.0 | HitPay completed return not run because deployed app is old and QR/staff handoff is unstable. | Retest after Render deploys latest HitPay fixes. |
| R4-E2E-009 | BLOCKED | 5.0 | HitPay cancelled recovery not visible on deployed `b35d9e58`. | Deploy latest `39454c31` and retest retry/terminal/back actions. |
| R4-E2E-010 | PASS WITH DEFECTS | 7.0 | Terminal settlement worked for separate live bills; add-on live-bill scenario not fully exercised. | Retest live bill + new cart add-on after deployment. |
| R4-E2E-011 | PASS WITH DEFECTS | 7.8 | Beverage tickets `#82/#83` appeared in Kitchen & beverages. | Kitchen backlog cleanup needed before launch. |
| R4-E2E-012 | NEEDS RETEST | 6.5 | Kitchen board was inspected, but status progression was not changed to avoid disturbing backlog. | Test preparing/served actions on dedicated QA ticket. |
| R4-E2E-013 | PASS | 8.0 | Reservation `#56` cancelled safely and did not remain active. | Add clearer cancellation confirmation aftermath. |
| R4-E2E-014 | FAIL | 5.5 | Queue still had duplicate stale `QA R2 Duplicate` entries. | Enforce duplicate guard on deployed app and clean stale queue. |
| R4-E2E-015 | NEEDS RETEST | 6.5 | Queue seating before order worked; move seated visit not retested on live old deploy. | Retest after latest move-table commits deploy. |
| R4-E2E-016 | NEEDS RETEST | 6.0 | Old pending/live orders from days ago exist; close protection policy unclear. | Block/label unpaid close explicitly. |
| R4-E2E-017 | PASS WITH DEFECTS | 7.0 | Paid table can be cleared, but first visible `Clear paid` led to another drawer action. | Use one obvious `Close table` action. |
| R4-E2E-018 | NEEDS RETEST | 7.0 | POS table drawer is compact on desktop; iPad viewport not fully rechecked in this run. | Run tablet viewport pass after deployment. |
| R4-E2E-019 | PASS WITH DEFECTS | 7.4 | Menu list with 9 items is usable; larger 20-30 item catalog not represented. | Stress with larger menu dataset. |
| R4-E2E-020 | PASS WITH DEFECTS | 7.2 | Back/switch table exists and table grid remains reachable. | Make return-to-table-grid more visually dominant. |
| R4-E2E-021 | NEEDS RETEST | 5.5 | Active customer QR could not be opened reliably. | Fix QR handoff first. |
| R4-E2E-022 | NEEDS RETEST | 5.5 | QR submit double-click not run because active QR handoff failed. | Add/browser-test idempotency after QR fix. |
| R4-E2E-023 | PASS | 8.0 | Old T01 QR token showed `Table Closed`, not history. | Add friendly "ask staff for new QR" CTA. |
| R4-E2E-024 | NEEDS RETEST | 5.5 | Staff+customer same-table mix not run because QR handoff failed. | Retest after QR modal/open fix. |
| R4-E2E-025 | NEEDS RETEST | 6.8 | POS table-bound cart appeared stable for selected table. | Add explicit warning when switching table with cart. |
| R4-E2E-026 | NEEDS SPEC | 6.0 | No discount/tip/service-charge path exercised in live POS. | Decide billing rules and expose totals clearly. |
| R4-E2E-027 | PASS WITH DEFECTS | 7.0 | Current session separated from history, but table recovery shows old live orders. | Clean/close old live orders; tighten history/live filters. |
| R4-E2E-028 | PASS WITH DEFECTS | 7.0 | Orders broad overview is more compact, but payment/current separation still confusing. | Show paid-awaiting-close separately. |
| R4-E2E-029 | FAIL | 5.5 | Kitchen board hides `80` old tickets behind backlog. | Launch cleanup workflow required. |
| R4-E2E-030 | PASS WITH DEFECTS | 7.8 | Beverage-only ticket routed to beverages. | Clear paid tickets from active production or mark served. |
| R4-E2E-031 | PASS | 8.0 | Reservation list surfaced `#56` clearly for today. | Add search highlight for busy days. |
| R4-E2E-032 | PASS WITH DEFECTS | 7.4 | New queue entry auto-selected and visible. | Fix stale duplicates/counters. |
| R4-E2E-033 | NEEDS SPEC | 6.0 | Reservation assignment warns on occupied/open tables but still shows Assign. | Decide whether occupied assignment should be blocked. |
| R4-E2E-034 | NEEDS SPEC | 6.0 | Queue recommends ready tables; occupied-table assignment not intentionally attempted. | Block unsafe seating or require manager override. |
| R4-E2E-035 | NEEDS RETEST | 6.5 | Table move not retested on old deployed commit. | Retest after move-table deployment. |
| R4-E2E-036 | NEEDS RETEST | 6.5 | Receipt/review actions visible in history, but reopen/review not exercised. | Add safe review mode separate from edit/reopen. |
| R4-E2E-037 | PASS WITH DEFECTS | 7.2 | Payment success summary/notice appears, but flow still needs two close actions. | Streamline paid summary -> close table. |
| R4-E2E-038 | NEEDS RETEST | 6.0 | Terminal failure/abort not simulated. | Add explicit terminal failure recovery UI. |
| R4-E2E-039 | BLOCKED | 5.0 | HitPay failed path not on deployed latest. | Deploy latest HitPay recovery and retest. |
| R4-E2E-040 | BLOCKED | 5.0 | HitPay return/tab flow not run in this pass. | Retest after deployment and sandbox availability. |
| R4-E2E-041 | NEEDS RETEST | 5.5 | Void item path not visible in tested current bill flow. | Add/verify item void workflow and audit. |
| R4-E2E-042 | NEEDS RETEST | 5.5 | Post-prep void not tested. | Require manager override/audit. |
| R4-E2E-043 | NEEDS SPEC | 5.0 | Refund/adjust path not obvious in browser. | Define manager correction workflow. |
| R4-E2E-044 | NEEDS SPEC | 5.0 | Reopen closed bill not intentionally run. | Define safe reopen/audit policy. |
| R4-E2E-045 | PASS WITH DEFECTS | 7.0 | Queue notes carried into kitchen ticket `#83`; item-level note not tested. | Add item-note visibility test. |
| R4-E2E-046 | NEEDS RETEST | 6.0 | No required-modifier item present in menu. | Seed required modifier product for QA. |
| R4-E2E-047 | NEEDS RETEST | 6.0 | Sold-out unavailable item not present in menu. | Add sold-out state QA product. |
| R4-E2E-048 | NEEDS RETEST | 6.5 | Large order not run; current menu has only 9 products. | Stress test 20-30 line cart. |
| R4-E2E-049 | BLOCKED | 5.0 | QR active order blocked by QR handoff failure. | Fix QR handoff first. |
| R4-E2E-050 | BLOCKED | 5.0 | QR vs staff total comparison blocked by QR handoff failure. | Fix QR handoff first. |
| R4-E2E-051 | PASS WITH DEFECTS | 7.0 | My Shift has profile selector and shift list; no current shift available to clock in. | Add test shift at current time for end-to-end clock-in. |
| R4-E2E-052 | NEEDS RETEST | 6.5 | Timetable exists; scheduled-shift login from shift not executed. | Create current shift and retest clock-in. |
| R4-E2E-053 | PASS WITH DEFECTS | 7.5 | Timetable shows staff roster, calendar, schedule buttons, leave ledger. | Improve drag/drop discoverability on tablet. |
| R4-E2E-054 | PASS WITH DEFECTS | 7.0 | Leave/MC ledger is visible. | Verify deduction math with test leave entry. |
| R4-E2E-055 | NEEDS RETEST | 6.5 | Users page opens and roles visible; no new user created to avoid data clutter. | Use disposable test staff cleanup flow. |
| R4-E2E-056 | PASS WITH DEFECTS | 7.2 | Roles visible (`Owner`, `Waiter`). | Add clearer permission matrix. |
| R4-E2E-057 | PASS WITH DEFECTS | 7.0 | Reports opens and shows sales/launch close checklist. | Reports shows `7 unpaid/open bills` despite POS `0 open`; align metrics. |
| R4-E2E-058 | PASS | 8.0 | Products opens, search/category controls visible. | Tablet viewport retest still needed. |
| R4-E2E-059 | PASS WITH DEFECTS | 7.0 | Settings has Payment Settings; no secrets exposed in visible default tab. | Verify HitPay status panel after latest deploy. |
| R4-E2E-060 | PASS | 8.0 | Customers/Invoice nav present; not interfering with POS in observed run. | Dedicated invoice QA still needed. |
| R4-E2E-061 | BLOCKED | 5.0 | Concurrent QR+staff blocked by QR handoff failure. | Fix QR modal/open first. |
| R4-E2E-062 | PASS WITH DEFECTS | 7.0 | Refresh/navigation did not duplicate browser-created orders. | Add explicit reload-in-cart test. |
| R4-E2E-063 | BLOCKED | 5.0 | QR checkout browser back/forward blocked by QR handoff failure. | Fix QR active session first. |
| R4-E2E-064 | PASS WITH DEFECTS | 7.0 | Reservation assignment persisted after refresh until cancellation. | Missing arrived/seated activation remains. |
| R4-E2E-065 | PASS WITH DEFECTS | 7.0 | Queue seating persisted into POS URL; queue no longer showed test guest waiting. | Queue counts still wrong. |
| R4-E2E-066 | PASS WITH DEFECTS | 6.8 | T06 seated-without-order displayed QR/start-order actions. | QR actions unreliable. |
| R4-E2E-067 | PASS WITH DEFECTS | 7.0 | Queue-seated T07 displayed guest handoff and ready order state. | Need seated-lane/current visit visibility. |
| R4-E2E-068 | FAIL | 5.8 | Kitchen filters work, but backlog of `80` old tickets is severe. | Add/complete backlog cleanup before launch. |
| R4-E2E-069 | FAIL | 6.0 | Orders current/history separation eventually correct after clear, but immediate paid state confusing. | Add `paid awaiting close` status. |
| R4-E2E-070 | NEEDS RETEST | 6.5 | Orders list visible; search not fully exercised in this run. | Verify search by table/order/guest. |
| R4-E2E-071 | BLOCKED | 5.0 | Transfer with unpaid bill not retested on old deploy. | Retest latest move-table code. |
| R4-E2E-072 | BLOCKED | 5.0 | Transfer paid-not-closed not retested. | Retest latest move-table code. |
| R4-E2E-073 | NEEDS SPEC | 6.0 | Reservation assignment can show table capacity; oversized blocking not tested. | Enforce or warn on capacity mismatch. |
| R4-E2E-074 | NEEDS SPEC | 6.0 | Queue recommendations account for party/table fit. | Test oversized queue and define override. |
| R4-E2E-075 | NEEDS SPEC | 5.5 | Partial/multiple payments not visible in checkout. | Decide whether unsupported or required for launch. |
| R4-E2E-076 | FUTURE SCOPE | 6.0 | Receipt actions visible; printer kept future-scoped. | Keep printer out of launch blocker unless required. |
| R4-E2E-077 | BLOCKED | 5.0 | Customer QR payment retry blocked by QR handoff failure. | Fix QR and HitPay retry path. |
| R4-E2E-078 | BLOCKED | 5.0 | Staff HitPay retry not visible on deployed `b35d9e58`. | Deploy `39454c31` and retest. |
| R4-E2E-079 | PASS WITH DEFECTS | 7.0 | Empty/loading states generally readable; Render wake/login handled. | Reduce dense pages and stale-state confusion. |
| R4-E2E-080 | FAIL | 5.8 | Full lifecycle cannot pass due reservation QR activation, queue counters, Orders paid-state, kitchen backlog. | Fix P0 blockers, redeploy, rerun R4 P0/P1. |

## Priority fix backlog from this QA pass

### P0 - Must fix before launch

1. Deploy latest `development` so browser QA can test current code, not `b35d9e58`.
2. Fix reservation arrival/seating activation:
   - `Assign table` should not be the final step.
   - Add `Seat now / activate table`.
   - Active customer QR should open after seating.
3. Fix POS customer QR handoff:
   - QR modal with URL, QR image, copy button, copy success/failure, and open customer tab.
4. Fix Orders paid/current truth:
   - Paid bills should not show as not-paid.
   - Use `Paid - awaiting close` until table close.
5. Clean or resolve stale kitchen backlog before launch.
6. Clean old live/pending orders from demo/staging data, or add a safe manager cleanup workflow.

### P1 - Important polish

1. Rename/unify table close actions: use `Close table` everywhere, with subcopy for paid/unpaid rules.
2. Fix Queue counters and duplicate stale queue records.
3. Make POS send-vs-pay copy more obvious on deployed build.
4. Add tablet viewport QA for POS/Tables/Orders after deploy.
5. Add seeded QA products for modifiers, sold-out, and large-order stress testing.

### P2 - Later but valuable

1. Complete manager adjustment/refund/void audit workflow.
2. Expand Timetable QA with current-shift clock-in/clock-out seed.
3. Keep printer integration documented as future-scope until hardware is available.
