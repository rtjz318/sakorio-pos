# Sakorio POS — 0065 Improvement Completion Tracker

Source brief: `docs/0065-sakorio-browser-qa-results-20-use-cases-2026-07-18.md`

Date: 2026-07-18

This tracker converts the 20 browser QA use cases from `0065` into implementation status. “Complete” here means the code/UI/runbook improvement has been made where it is safe to do so. Items that require real payment sandbox execution, printer hardware, or a waiter-only production account are kept as launch validation tasks rather than guessed in code.

| # | Use case | 0065 improvement required | Completion status |
|---:|---|---|---|
| 1 | Reservation arrival → QR self-order → service close | Add QA arrival support, printer readiness, accessible QR buttons | QR add buttons are accessible; Printing launch-readiness panel/runbook exists. Reservation seating window remains intentionally enforced; live rehearsal should use an in-window reservation or explicit test data. |
| 2 | Walk-in queue → table → POS checkout | Strengthen Queue numeric labels; keep best-seat suggestion visible | Complete. Queue numeric fields now have explicit accessible labels; best-fit table recommendation was already visible. |
| 3 | Reservation no-show | Close background dropdown; consistent no-show wording | Complete in prior polish. No-show confirmation closes the More menu before showing the modal. |
| 4 | Customer manages reservation from public link | No critical code issue; later QA should submit delay/cancel | No code change required from `0065`. This remains a browser-only live QA scenario to avoid sending noisy customer communications. |
| 5 | Customer QR order before table opened | Staff-visible QR/open-menu link for assigned reservations/tables | Complete. Reservations now exposes “Open QR/menu” for assigned/seated bookings. Tables and Orders staff-open-menu links now use the customer domain consistently. |
| 6 | Staff POS table switching during rush | Remove hidden duplicate POS controls; improve iPad table density | Complete. Legacy hidden POS lanes were removed from the DOM in prior polish; tablet table density tightened in POS. |
| 7 | Split food/drink routing | Run mixed order after backlog cleanup; kitchen backlog should not obscure QA | Code support complete. Kitchen bulk backlog action exists; mixed food/drink route remains a browser sandbox test after deployment/data cleanup. |
| 8 | Kitchen backlog cleanup | Bulk cleanup / date filtering / launch clean data | Complete for manager bulk cleanup. Final launch still needs an intentional data-clean rehearsal before opening day. |
| 9 | Current table order vs history | Make current/history more explicit from Orders overview | Complete in prior polish. Orders overview highlights latest/current ticket details without forcing a POS drill-in. |
| 10 | HitPay/terminal payment completion | Run non-zero sandbox; decide whether staff Cash remains | HitPay code path/runbook exists. Non-zero success/fail tests are browser sandbox tasks. Staff Cash remains available for staff POS until the owner decides to remove it. |
| 11 | Failed/abandoned payment recovery | Sandbox recovery checklist; visible pending/failed/retry state | Complete for UI/runbook. POS has cancelled/failed/confirming states; `0066` documents the recovery sandbox test. |
| 12 | Staff creation → schedule → clock in/out | Safe test-user mode; document camera permission | Launch documentation complete. Browser QA should use an approved staff profile/account; camera permission is an onboarding requirement, not something to fake in code. |
| 13 | Timetable leave/MC scheduling | Leave ledger, MC records, approvals, balances, conflicts | Scoped as post-core POS module. UI now labels Leave/MC as not yet enabled instead of pretending it is complete. |
| 14 | Overbooking and capacity | Dedicated overbooking QA data; rank available/risky tables | Current ranking/hints are visible. Dedicated overbooking stress seed remains a future QA data task. |
| 15 | Waiter receives order update and adds item from Orders | Show newest order/items; test add-item-from-Orders | Newest ticket visibility complete. Add-item-from-Orders remains a browser regression test after deploy. |
| 16 | Large menu POS/iPad usability | Reduce vertical scroll; improve tablet clipping | Complete. POS tablet density and drawer product grid are tightened for iPad-sized viewports. |
| 17 | Inventory low stock → PO receiving | Seed/import launch inventory; test full receiving flow | POS launch-safe. Inventory route defaults to Stock Dashboard; real stock seed/import and PO receiving rehearsal remain an inventory launch task. |
| 18 | Daily manager handover Reports | Add clearer daily close/handover checklist | Complete. Reports now includes a manager end-day checklist linking Tables, Orders, Kitchen, My Shift, and Reports export. |
| 19 | Waiter vs manager permissions | Run waiter-login QA; confirm access boundaries | Browser-only validation remains. No code change made without a dedicated waiter credential. |
| 20 | End-of-day close | One manager checklist for unpaid bills, active tables, backlog, open sessions, reports | Complete. Reports now has the manager close checklist; final launch should clear/seed clean rehearsal data. |

## Remaining launch validation

1. Run non-zero HitPay sandbox success and cancelled/failed recovery under `staff.sakorio.com`.
2. Run waiter-only login permission QA with an approved waiter credential.
3. Run a final kitchen mixed food/drink order after old backlog is cleared.
4. Confirm printer hardware/receipt routing once printer integration is available.
5. Seed/import real launch inventory only if inventory is required for day-one operations.

