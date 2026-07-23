# Sakorio POS non-10 launch gap register

Date: 2026-07-23  
Branch: `development`  
Source documents reviewed:

- `docs/0088-sakorio-round-6-full-flow-browser-results-2026-07-21.md`
- `docs/0099-sakorio-final-100-e2e-execution-results-2026-07-22.md`
- `docs/0100-sakorio-final-blockers-1-5-fix-report-2026-07-23.md`
- `docs/0101-sakorio-final-qa-improvements-summary-2026-07-23.md`
- Other QA/final/results docs matching the historical score register search.

## Executive launch answer

Sakorio POS is not yet safe to describe as **100% launch-ready**.

The system is much closer after the latest live fixes. The five most recent blockers around QR name-prompt blocking, timetable cleanup, stale service-board clutter, role QA accounts, and tablet regression tooling have been addressed and mostly browser-verified on live staging.

However, the historical and final QA documents still contain unresolved or not-yet-rescored items below 10/10. Some are true launch blockers, some are launch-polish items, and some are explicit scope decisions. Before going live, every item below should either be:

1. fixed and live-browser rescored,
2. intentionally deferred with owner approval,
3. or removed from launch scope and hidden from staff/customer workflows.

## Non-10 score scan summary

Automated score scan found **157 scored entries below 10/10** across previous QA/final/result documents.

Historical score bands:

| Score band | Count |
|---|---:|
| Below 6.0 | 12 |
| 6.0 to 6.9 | 23 |
| 7.0 to 7.9 | 24 |
| 8.0 to 8.9 | 59 |
| 9.0 to 9.9 | 39 |

Important note: this count includes older findings that were later fixed or superseded. The final launch decision should be based on the latest status below, not the raw count alone.

## Already fixed or materially improved after the final QA run

These items were previously below 10/10, but the latest live fix report shows they have been addressed.

| Area | Previous score / issue | Current status |
|---|---:|---|
| Customer QR first-load prompt | 6.2 / QR prompt viewport blocker | Fixed. QR menu now loads without blocking name modal; customer can add item immediately. |
| Timetable shift delete cleanup | 5.8 / synthetic shift could not be removed cleanly | Fixed. Live browser confirmed shift deletion and count reduction. |
| Reservations service-board clutter | Non-10 stale QA/history clutter | Fixed. Reservations now default to Active service; history still accessible by filter. |
| Role-specific QA access | 6.0 / waiter login credential missing | Fixed. Waiter, host, kitchen, manager QA accounts created and browser-smoked. |
| Tablet regression capability | 6.7 / 6.8 / true viewport unavailable | Tooling added. Still needs actual viewport-controlled execution before signoff. |
| Public waitlist leave/rejoin | 3.5 initial fail, retested to 9.3 | Recovered in final document; monitor only. |
| Empty seated reservation release | 5.0 initial fail, retested to 9.2 | Recovered in final document; monitor only. |

## Remaining launch blockers and high-priority gaps

### P0 - Must fix or retest before launch

| ID / source | Last score | Gap | Required action |
|---|---:|---|---|
| E2E-047 | 5.2 | Customer double-tapping `Place order` can create duplicate backend/KDS tickets. | Add client submission lock/idempotency key and rerun live browser double-tap test. |
| E2E-038 | 6.4 | Paid-but-not-closed table attempts new order before reset; session guard defect. | Enforce paid-awaiting-close state so new order cannot start until table is closed/reset. |
| E2E-070 | 6.4 | POS Paid Today and Reports Today reconciliation mismatch. | Fix reports/cash-up calculation or clearly define included states; rerun paid-table reconciliation. |
| E2E-077 | 6.4 | Active unpaid table move cannot be completed from live UI. | Implement or clearly disable active-table move workflow; rerun move-to-available-table flow. |
| E2E-078 | 6.8 | Occupied/seated tables can appear as move destinations. | Hide/disable invalid destinations and add clear reason text. |
| E2E-091 | 6.2 | QR refresh/back/forward duplicate protection blocked by earlier prompt issue; not yet fully rescored. | Rerun live browser refresh/back/forward duplicate test after QR prompt fix. |
| E2E-092 | 6.0 | HitPay return refresh/idempotency blocked by E2E-091. | Rerun live sandbox HitPay return/refresh/idempotency test after E2E-091 passes. |
| E2E-093 | 5.8 | Add-on order while cashier is preparing payment was blocked by customer prompt. | Rerun concurrent customer add-on versus cashier checkout after QR prompt fix. |

### P1 - Should fix before launch if these modules are in scope

| ID / source | Last score | Gap | Required action |
|---|---:|---|---|
| E2E-052 | 6.8 | Customer note/special-instructions feature missing. | Add QR item note field or explicitly defer notes from launch scope. |
| E2E-065 | 6.9 | Staff POS item note discovery/KDS visibility missing. | Add staff item notes visible on KDS, or clearly defer operational note support. |
| E2E-068 | 7.2 | Orders table search/filter not launch-ready. | Add reliable table/order filters and highlight current-session results. |
| E2E-069 | 6.5 | Order-number search and audit detail missing. | Add exact order lookup and better lifecycle/payment audit detail. |
| E2E-072 | 5.2 | Reports export/download action lacks proof/feedback. | Add visible export success/failure feedback and verify downloaded file. |
| E2E-074 | 7.0 | History is safe read-only but not manager-grade for receipt/payment detail. | Improve paid-bill detail drawer: receipt, payment method, table/session, timestamps. |
| E2E-075 | 7.1 | Refund/reversal/correction path blocks unsafe action but lacks audited manager workflow. | Either implement audited manager adjustments or mark refunds as external/manual for launch. |
| E2E-081 | 7.2 | Timetable shift create/edit/clock-in lifecycle not completed. | Complete browser flow for create, edit, assignment, profile clock-in, and cleanup. |
| E2E-084 | 7.8 | Leave/MC ledger visible, mutation deferred. | Decide whether leave/MC accrual/editing is launch scope; if yes, implement ledger mutation. |
| E2E-089 | 7.0 | Inventory module stable but launch stock data is empty/not launch-ready. | Seed stock or hide Inventory from launch navigation until operationally ready. |

### P1 - Concurrency and recovery reruns

| ID / source | Last score | Gap | Required action |
|---|---:|---|---|
| E2E-094 | 6.5 | Reservation same-record concurrent seating not safely mutated. | Rerun with two host tabs; prevent double-seat/double-table assignment. |
| E2E-095 | 6.0 | Same table POS in two tabs needs clean-board concurrency run. | Rerun two-cashier same-table conflict test and add stale-state guard if needed. |
| E2E-096 | 6.3 | POS checkout back/forward/refresh recovery not executed end-to-end. | Verify no duplicate payment state or lost cart after navigation recovery. |
| E2E-062 | 7.6 | POS correction/void with stale KDS action had defect. | Confirm served/cancelled stale KDS actions cannot mutate already-closed state. |
| E2E-073 | 7.9 | End-day audit has cleanup risks. | Add/verify close-day checklist: unpaid, paid-awaiting-close, stale queue/reservation, pending KDS. |

### P1 - Tablet/iPad launch verification

| ID / source | Last score | Gap | Required action |
|---|---:|---|---|
| E2E-097 | 6.8 | iPad landscape POS lifecycle blocked by lack of true viewport simulation. | Run `test:ipad-viewports` against live staging with credentials and QR URL. |
| E2E-098 | 6.7 | iPad portrait host flow blocked by lack of true viewport simulation. | Run viewport-controlled Reservations, Queue, Tables, POS checks. |
| E2E-099 | 7.0 | iPad kitchen/beverages flow had clean board but no fresh ticket. | Generate fresh QR/POS ticket and verify kitchen lane on iPad viewport. |
| E2E-080 / E2E-082 | 8.0 to 9.0 | My Shift/profile clock-in still needs device camera/iPad validation. | Test on real iPad or browser with camera permissions. |

### P2 - Workflow polish, but not hard launch blockers if accepted

| ID / source | Last score | Gap | Required action |
|---|---:|---|---|
| E2E-031 | 8.3 | POS table switching/cart isolation works but needs clearer state refresh. | Improve selected-table banner and stale-cart warning. |
| E2E-035 | 8.8 | POS mode switching works but can be smoother. | Make Add items / Current orders transition more obvious. |
| E2E-039 | 8.6 | Paid-awaiting-close handoff needs stronger close guidance. | Keep persistent close-table CTA on paid awaiting close. |
| E2E-064 | 8.2 | Receipt/print affordance discovery not strong enough. | Add clearer receipt/print placeholder and future printer note. |
| E2E-067 | 8.1 | Old table history separation works but needs stronger labels. | Label current session versus history consistently. |
| E2E-071 | 8.8 | Reports date presets work but need accessibility polish. | Improve labels/focus order/date range feedback. |
| E2E-076 | 8.6 | Tables-led service flow strong; loader/duplicate-control polish remains. | Tighten loading states and duplicate click protection. |
| E2E-087 | 8.6 | Payment settings visible; gateway self-test/webhook timestamp polish remains. | Add gateway health timestamp and webhook status affordance. |

## Old low-score themes from previous rounds that overlap with current gaps

The older round-6 document contains several low scores that map to the same launch-risk categories above:

- Corrections/voids/refunds after kitchen or payment: scores around 5.5 to 7.1.
- Table move/merge/split workflows: scores around 5.5 to 6.8.
- Special notes/modifiers: scores around 6.2 to 6.5.
- Split/partial payment: score around 6.2.
- Timetable/profile/shift lifecycle: scores around 7.0 to 7.8.
- Rush/KDS refresh and stale-action handling: scores around 7.1 to 7.6.

These should not be treated as separate random defects; they are the same product themes repeating across many realistic end-to-end flows.

## Recommended next work order

1. Fix QR order submission idempotency and duplicate-click protection.
2. Fix paid-awaiting-close table guard so a paid table cannot accept a fresh order until closed/reset.
3. Fix table move destination safety and either implement active-table move or remove/disable it clearly.
4. Fix POS/Reports cash-up reconciliation and export feedback.
5. Improve Orders search/audit/history detail.
6. Rerun HitPay return refresh, QR refresh/back/forward, and add-on-while-cashier-paying tests.
7. Run true iPad viewport regression against live staging.
8. Decide whether notes/modifiers, refunds, inventory, and leave/MC are launch scope. If yes, implement. If no, hide or label them as not available for launch.

## Launch decision

Current recommendation: **not 100% launch-ready yet**.

The product is close enough that the next work should be focused and finite, not another broad discovery sweep. The biggest risk is not ordinary happy-path POS service; the biggest risk is duplicate submissions, payment/report reconciliation, table state transitions, and tablet/iPad verification.

Launch signoff should happen only after the P0 list is fixed and live-browser rescored to at least 9.5/10, with P1 items either fixed or explicitly deferred.
