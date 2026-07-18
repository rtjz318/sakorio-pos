# Sakorio exhaustive browser QA results - batch 2

Date: 2026-07-18
Run ID: `SKR-QA-20260718-EXH-B2`
Base brief: `docs/0076-sakorio-exhaustive-browser-qa-use-case-brief-2026-07-18.md`
Previous batch: `docs/0077-sakorio-exhaustive-browser-qa-results-batch-1-2026-07-18.md`
Test surface: live browser on Sakorio deployed domains
Observed staff build: `POS 2.1.6 f4d559e9`

## Executive summary

Batch 2 continued the exhaustive browser QA run after Batch 1. This pass focused on edge and recovery paths:

- Staff reservation creation, validation, capacity checks, and cancellation operability
- QR closed-table behavior
- Customer QR add-on to an existing order
- HitPay sandbox launch and abandonment recovery
- Staff terminal cleanup after abandoned HitPay
- Orders-to-POS payment recovery for an old unpaid bill
- Kitchen backlog review mode
- Current POS layout at the active browser viewport
- Protected route/session behavior after clicking Logout

The strongest pass in this batch is payment recovery from the customer side:

`T07 order #53 -> customer adds Coffee -> Pay Now -> HitPay sandbox opens SGD 2.50 -> browser Back/abandon -> Sakorio returns to unpaid #53 -> staff terminal payment -> T07 cleared`

The biggest confirmed blocker remains POS payment truth:

`Orders` correctly shows T09 `#58` as unpaid, but clicking `Collect payment` opens POS where the same order is displayed as paid and clearable.

Overall batch 2 launch score: **7.4 / 10**

## Scenario results

| Test ID | Scenario | Browser result | UI/UX | Workflow | Data correctness | Launch blocker | Evidence |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| E2E-003 | Staff-created reservation cancellation before seating | Fail / cleanup preserved | 5 | 4 | Partial | Watch | Created reservation `#42 SKR QA Cancel 302611`; visible `Cancel`/`More` actions repeatedly timed out in browser. Record remains booked. |
| E2E-008 | Change reservation party size / validation | Partial | 7 | 6 | Pass | No | Party size changed safely in modal. Phone validation rejected malformed numbers. |
| E2E-014 | Oversized reservation capacity check | Needs specification | 6 | 6 | Partial | Watch | Party 20 showed capacity for July 19. Party 99 removed time slots but still showed `Seats left: 30 · Tables left: 10` without a clear too-large message. |
| E2E-022 | QR scanned before table is opened | Pass | 9 | 9 | Pass | No | Available T04 QR showed `Table Closed` and did not expose old customer/order data. |
| E2E-030 | Customer orders after active bill exists | Pass | 8 | 8 | Pass | No | T07 active order `#53` accepted Coffee add-on and stayed same order, total SGD 2.50. |
| E2E-032 | Customer payment options | Pass | 9 | 9 | Pass | No | Customer Pay Now showed only `Pay with HitPay` and `Pay with Card at Table`; no Cash. |
| E2E-034 | Customer starts HitPay then abandons | Pass | 8 | 8 | Pass | No | HitPay sandbox opened for SGD 2.50; browser Back returned to Sakorio with order still Pending and Pay Now visible. |
| E2E-055 | Failed/abandoned payment recovery | Pass | 8 | 8 | Pass | No | Staff POS still showed #53 live, unpaid, payable after abandoned HitPay. |
| E2E-053 | Staff terminal cleanup after recovery | Pass | 8 | 8 | Pass | No | T07 #53 terminal settlement increased Paid Today by SGD 2.50; T07 cleared successfully. |
| E2E-052 | Payment pending/requested must not equal paid | Fail | 4 | 4 | Fail | Yes | Orders showed T09 #58 unpaid; POS opened from Collect Payment showed #58 as paid and clearable. |
| E2E-047 | Orders overview as source of payment truth | Pass | 8 | 8 | Pass | No | Orders page clearly showed `Awaiting payment`, T09, #58, SGD 17.50, `Collect payment`. |
| E2E-066 | Kitchen backlog review mode | Pass with operational risk | 7 | 7 | Partial | Watch | Backlog mode showed 60 visible stale tickets and `Complete visible backlog`; destructive bulk action was not clicked. |
| E2E-067 | Manager bulk cleanup/archive test backlog | Blocked by scope | 7 | 6 | Not verified | Watch | Bulk cleanup exists, but not executed during QA because it would modify 60 stale tickets at once. |
| E2E-038 | POS layout current viewport | Partial | 6 | 7 | Pass | Watch | Browser viewport was 925x912. POS usable, but service-loop text still overlaps and some start-order cards sit below fold. |
| E2E-087 | Logout/relogin clears protected access | Fail / needs retest | 4 | 4 | Fail watch | Watch | After clicking Logout, UI still showed authenticated owner and `/users` remained accessible. Could be failed click or logout defect. |
| E2E-073 | Restricted admin route check | Blocked | 5 | 5 | Not verified | Watch | No separate waiter credentials available in this run. Owner access to `/users` verified. |

## Defects

### BUG-0078-01 - Reservation actions for #42 visible but not operable in browser

Severity: P2
Module: Reservations
Evidence: Reservation #42 exposed `Seat at table`, `More`, and after one view `Cancel`, `Edit`, `Mark as no-show`. Browser clicks on `Cancel` and `More` repeatedly timed out even after reload.
Impact: QA record #42 remains active/booked; if reproduced manually, host may be unable to cancel or manage an arrival from the reservation list.
Acceptance criteria: Reservation action buttons are reliably clickable without requiring hidden scroll/precise viewport state.

### BUG-0078-02 - Staff reservation phone validation lacks accepted-format guidance

Severity: P3
Module: Reservations
Evidence: `+65900302611` and `900302611` showed `Invalid phone number`; `+6590302611` succeeded.
Impact: Staff can fix it, but the message does not explain expected Singapore format.
Acceptance criteria: Validation message says the expected format, e.g. `Use +65 followed by 8 digits`.

### BUG-0078-03 - Oversized reservation party removes slots without clear explanation

Severity: P3
Module: Reservations / Capacity
Evidence: Party size 99 removed time slots but still displayed `Seats left: 30 · Tables left: 10`.
Impact: Host may not know whether the date is full, party is too large, or system is still loading.
Acceptance criteria: Show a clear capacity warning when party size exceeds total usable capacity.

### BUG-0078-04 - Orders Collect payment routes to POS false-paid state

Severity: P1
Module: Orders / POS / Payments
Evidence: Orders showed T09 #58 as unpaid SGD 17.50. Clicking `Collect payment` opened POS where #58 appeared as `Last bill #58 paid`, `Paid - clear next`, `Clear table`, SGD 0 due.
Impact: Staff may clear a genuinely unpaid bill or be blocked by backend while UI says it is paid.
Acceptance criteria: POS and Orders must agree. Payment method/requested/pending must not be interpreted as paid without confirmed paid status or paid timestamp.

### BUG-0078-05 - Customer active-order refresh re-prompts for name

Severity: P4
Module: Customer QR
Evidence: T07 active order #53 showed current order and Pay Now, but also displayed `What's your name` after opening/reloading the QR page.
Impact: Mild customer confusion; no privacy leak observed.
Acceptance criteria: Existing active table session with order context should not show the first-visit name prompt unless the customer chooses to edit identity.

### BUG-0078-06 - Kitchen backlog/live board remains polluted by paid and cleared orders

Severity: P2
Module: Kitchen & beverages
Evidence: Kitchen current shift showed #59, #60, #61 after their tables had been paid/cleared because their kitchen items were still pending/ready. Backlog mode showed 60 visible stale tickets.
Impact: Kitchen launch rehearsal is noisy and staff may miss live orders.
Acceptance criteria: End-day manager flow must either complete kitchen tickets or make stale paid/cleared tickets easy to bulk-resolve safely.

### BUG-0078-07 - Logout did not visibly end the session in browser run

Severity: P2 watch
Module: Auth / Session
Evidence: After clicking `Logout`, the UI still displayed authenticated owner navigation. Navigating to `/users` still showed User Management.
Impact: If reproducible manually, protected access may persist after logout.
Acceptance criteria: Logout redirects to login and protected routes require authentication after logout.

## Improvements

### IMP-0078-01 - Staff POS should expose HitPay consistently or define policy

Current behavior: Staff POS checkout for new cart/live bill showed Staff Cash and Terminal, but not HitPay. Customer QR Pay Now offered HitPay and Card at Table.
Recommendation: Decide whether staff POS should support HitPay. If yes, expose it consistently. If no, label staff POS as terminal/cash only.
Priority: P2

### IMP-0078-02 - Preserve table cleanup guidance after paid-but-unserved kitchen tickets

Current behavior: Table can be paid and cleared while kitchen tickets remain pending, causing kitchen backlog growth.
Recommendation: Add a manager close checklist warning for paid/cleared tables with unresolved kitchen items, with a safe bulk-complete workflow.
Priority: P1

### IMP-0078-03 - Reservation capacity messaging

Current behavior: Oversized party removed times but did not explain why.
Recommendation: Add clear message: `Party size exceeds current available capacity for this service`.
Priority: P2

### IMP-0078-04 - Reservation action layout

Current behavior: Critical actions can be below fold or hidden under More, and browser automation struggled to click them.
Recommendation: Keep `Seat`, `Edit`, `Cancel`, and `No-show` in a stable action row or modal with clear spacing on tablet.
Priority: P1

## Data created or touched

- Reservation `#42 SKR QA Cancel 302611`: created and remains BOOKED due cancellation action operability issue.
- T07 order `#53`: Coffee added, HitPay sandbox abandoned, then terminal-paid and table cleared.
- T04 order `#61`: Coffee staff POS test, terminal-paid and table cleared.
- T09 order `#58`: not changed; preserved as payment-state defect evidence.
- Kitchen backlog: opened in review mode only; no bulk cleanup executed.

## Cleanup status

- T04: available after cleanup.
- T07: available after cleanup.
- T09: still has inconsistent POS/Orders payment state for #58; do not clear until payment-state fix is deployed or a deliberate cleanup is performed.
- Reservation #42: still active/booked and needs cleanup after reservation action fix or manual cancellation.
- Kitchen: backlog remains intentionally untouched.

## Remaining exhaustive areas after batch 2

The highest-value remaining scenarios before rectification are:

1. True waiter-role login and permission boundary, if credentials are available.
2. Manager void/discount/reopen/refund flows, preferably on a dedicated low-value QA bill.
3. Split/partial/mixed payment, if supported.
4. Browser double-submit/concurrent QR tests using two customer tabs on a fresh table.
5. Full iPad portrait and landscape screenshots if a controllable viewport is available.
6. Manual physical-device logout retest because browser automation did not visibly end the session.

## Release recommendation from batch 2

Testing incomplete and not launch-ready for final sign-off yet.

Core service flows are improving, but these must be resolved before launch sign-off:

- POS false-paid/clearable state for T09 #58.
- Kitchen backlog and paid/cleared unresolved production tickets.
- Reservation action operability for #42.
- Logout/session retest.
- HitPay success completion still needs one full sandbox card success, not only abandoned checkout.

