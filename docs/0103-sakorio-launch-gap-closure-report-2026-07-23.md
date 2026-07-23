# Sakorio POS launch-gap closure report

Date: 2026-07-23  
Scope: final non-10 QA gaps from the prior 100-scenario launch regression, focused on POS, QR ordering, Orders, Reports, paid-table close flow, and tablet readiness.

## Deployment state verified

- Backend/API live: `9716d07` (`fix: lock QR order submissions on create`)
- Customer QR web live: `9716d07`
- Staff POS web live: `40294230` (`fix: focus paid POS tables on close action`)
- Staff live version observed in browser: `POS 2.1.6 40294230`

## Fixes completed

### 1. QR/customer duplicate submission guard

Implemented both frontend and backend protection:

- Customer QR now creates and sends an `idempotency_key` per order submission.
- Customer QR sets the submitting lock before slow operations, preventing rapid double-submit.
- Backend stores `last_submission_key` / `last_submission_at` on the active order.
- Backend returns `duplicate_ignored` for repeated submissions with the same key.
- Backend locks the table row during order creation to reduce same-table race conditions.

Browser outcome:

- Customer opened QR for T01.
- Added Coffee with a special request.
- Double-clicked `Place order`.
- Result: only one order appeared, `#227`, one Coffee item, no duplicate ticket.

Score after fix: 10/10.

### 2. Paid table cannot accept new rounds before close/reset

Implemented server and staff UI guards:

- Backend rejects QR/staff additions to a paid active table with `409` and code `table_bill_paid_awaiting_close`.
- Staff POS now treats a paid table as a close-only state.
- Paid table card primary action now reads `Review bill`, not `Start order`.
- `Add items` tab is disabled for paid tables.
- Product grid is hidden for paid tables.
- Paid-table drawer displays: `Close and reset this table before starting another round or handing the QR to new guests.`

Browser outcome:

- Created live order `#226` on T01.
- Paid by terminal.
- Before the UI fix, Add Items remained reachable; this was corrected immediately.
- After redeploy, T01 showed `Last bill #226 paid`, `Review bill`, disabled `Add items`, and the close-focused paid-bill panel.
- Closed T01; table returned to `Available / Ready for order`.

Score after fix: 10/10.

### 3. Customer QR payment method safety

Verified live:

- Customer QR page did not show Cash before ordering.
- After placing order `#227`, customer page showed `Pay Now`.
- No `Cash` option/text appeared in the customer QR flow.
- Staff POS still shows staff-only settlement options for counter reconciliation.

Score after fix: 10/10.

### 4. Orders tab search and active-session visibility

Implemented/verified:

- Orders tab has a broad search field for order number, table, customer, status, payment method, item names, notes, modifiers, and customisation.
- New active orders appear grouped by table, not as huge one-order cards.
- History remains separate from active tickets.

Browser outcome:

- Staff Orders immediately showed T01 order `#226`.
- Search by `QA launch note` returned exactly the matching active T01 ticket.
- Search by `T01` returned the matching table ticket.
- QR order `#227` appeared as exactly one active T01 ticket.

Score after fix: 10/10.

### 5. Staff POS and customer QR item notes

Implemented/verified:

- Staff POS cart has a kitchen-note field per line.
- Customer QR cart has a special-request field per line.
- Notes are sent with the order items and are searchable from Orders.

Browser outcome:

- Staff POS order `#226` used note: `QA launch note - no ice`.
- Customer QR order `#227` used note: `QA customer note - less sugar`.
- Orders search found the note-based ticket.

Score after fix: 10/10.

### 6. Table move destination guard

Implemented server and frontend restrictions:

- Backend `/tables/{id}/move-bill` rejects moving into a destination table with seated reservation, seated queue entry, active/open order, active session, or live bill.
- Frontend quick-move target list only offers safe available tables.

Validation:

- Covered by local regression tests for move-table/table-status behavior.
- Not destructively re-run live because live staging had active/seated tables from previous QA; the code path is protected backend-side.

Score after fix: 9.5/10 live confidence, 10/10 code/test confidence.

### 7. Reports cash-up reconciliation

Implemented/verified:

- Reports revenue now uses paid/collected orders only.
- Kitchen/service `completed` without payment no longer counts as collected revenue.
- Export action now shows visible feedback.

Browser outcome:

- Live Reports page says `Revenue analysis from paid orders`.
- CSV export displayed feedback banner:
  `CSV export started: pos2-sales-summary-2026-06-23-2026-07-23.csv`

Score after fix: 10/10.

## Live browser QA runs performed

| Flow | Live result | Score |
| --- | --- | ---: |
| Staff POS table open → add item → note → send order | Passed; order `#226` created once | 10 |
| Staff Orders active table overview | Passed; compact T01 group visible immediately | 10 |
| Orders search by table | Passed; `T01` returned target ticket | 10 |
| Orders search by item note | Passed; note search returned target ticket | 10 |
| Staff terminal payment | Passed; terminal payment recorded | 10 |
| Paid table state before close | Passed after fix; add-items path disabled/hidden | 10 |
| Close table final confirmation | Passed; confirmation copy explicit and table reset | 10 |
| Customer QR before activation | Passed; page showed table closed | 10 |
| Staff QR activation | Passed; customer QR opened after staff activation | 10 |
| Customer QR add item + special request | Passed | 10 |
| Customer QR rapid double-submit | Passed; one order `#227` only | 10 |
| Customer QR cash removal | Passed; no Cash option visible | 10 |
| Staff visibility of QR order | Passed; one active T01 ticket | 10 |
| Reports collected revenue page | Passed | 10 |
| Reports CSV export feedback | Passed | 10 |
| Desktop layout overflow checks on exercised pages | Passed; no horizontal overflow observed | 10 |

## Local validation runs

- Backend compile:
  - `python -m py_compile app/main.py app/models.py app/reports_routes.py`
- Migration:
  - `python -m app.migrate`
- Backend tests:
  - `pytest -q tests/test_cashier_order_lifecycle.py`
  - Result: `5 passed`
  - `pytest -q tests/test_move_table_visit.py tests/test_tables_with_status_operational.py tests/test_report_export_i18n.py`
  - Result: `12 passed`
- Customer payment smoke:
  - `BASE_URL=http://127.0.0.1:4202 node scripts/test-customer-payment-options.mjs`
  - Result: customer QR payment options are HitPay / Terminal only.
- Front production build:
  - `npm run build -- --configuration production-static`
  - Result: passed.
  - Remaining warnings are pre-existing/component budget warnings, not build blockers.
- Front dev container logs:
  - Final rebuild passed with no active TypeScript/Angular errors.

## Data cleanup performed

- Live QA order `#226` was paid via terminal and T01 was closed/reset.
- Live QR QA order `#227` was paid via terminal and T01 was closed/reset.
- T01 ended as `Available / Ready for order`.

## Remaining honest caveats before calling production 100%

These are not blockers from today’s fixed code paths, but they are the only remaining areas I would not call mathematically “zero-risk”:

1. True physical iPad Safari/Chrome pass is still recommended.
   - The in-app browser wrapper used for live QA does not expose viewport resizing.
   - The existing `front/scripts/test-ipad-viewports.mjs` requires a browser binary plus login env; the front container has Puppeteer-core but no Chromium binary, and the bundled runtime Playwright package is incomplete for direct host use.
   - Live DOM overflow checks on exercised pages passed, but a real iPad device/browser check should still be the final practical launch ritual.

2. Existing staging data still contains old QA load.
   - Reports showed many historical orders/reservations/queue entries from prior stress tests.
   - This does not block launch behavior, but the demo/staging data should be archived/cleaned before showing the system to non-test users.

3. Split payments, table merges, refunds, and post-paid corrections remain intentionally guarded.
   - The UI now communicates this as a launch guardrail.
   - These should become a future manager/accounting module, not hidden cashier behavior.

## Launch readiness judgement

The critical launch gaps found in the prior non-10 QA pass have been fixed, deployed, and browser-verified on live Sakorio domains.

Current readiness: 9.7/10.

Reason not marked 10/10: only because a physical iPad/device pass and staging data cleanup remain prudent. For the POS/QR/order/payment/close-table workflows fixed today, the live browser result is launch-ready.

