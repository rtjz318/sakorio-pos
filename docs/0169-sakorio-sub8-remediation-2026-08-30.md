# Sakorio POS sub-8 remediation report

Date: 2026-08-30  
Source: `0168-sakorio-provisional-and-100-e2e-live-browser-qa-2026-08-30.md`  
Target branch: `development`  
Target repository: `https://github.com/rtjz318/sakorio-pos.git`

## Outcome

This pass converts the actionable low-scoring browser findings into guarded, testable product behavior. It does not mark physical hardware, real payment, destructive accounting cleanup, or multi-role cases as passed without executing those live acceptance steps.

## Implemented fixes

| QA finding | Improvement implemented | Expected score effect |
|---|---|---|
| QA-168-01 / E2E-024, 046, 062: Drink Menu routed to Kitchen | Bar routing now recognizes Drink Menu, beverages, beer, wine, spirits, tea/coffee and related category terms while preserving food categories. Tests cover Green Tea in Drink Menu and a food item whose name contains tea. | Removes the Kitchen/Beverage routing blocker. |
| QA-168-02 / E2E-060, 080, 082: Today report mismatch | Revenue, paid-order, queue and daily report grouping now use the tenant IANA time zone. Today closeout loads tables and orders atomically and treats every non-paid/non-cancelled current-service order as open. | Aligns Singapore-day reporting with floor operations. |
| QA-168-03 / E2E-087: Logout remained authenticated | Logout response is non-cacheable. The staff shell clears local auth immediately, limits a stalled server logout to two seconds, and always replaces the route with `/login`. | Prevents stale authenticated UI after logout/reload. |
| QA-168-05 / E2E-036: old fixed QR exposed old bill | Public table sessions older than 24 hours are locked for guests. The guest sees `Table reset required`, while staff see a stale-session warning and can review/settle/close the preserved bill. Staff links retain review access. | Removes cross-visit QR exposure without deleting accounting records. |
| QA-168-06 / E2E-014: over-capacity party | Existing server-side capacity rejection remains authoritative. Tables now visibly flag any legacy/anomalous seated party above the configured seats. | Prevents new over-capacity seating and surfaces old bad state. |
| QA-168-07: reservation phone validation | Booking remains disabled until core fields are valid; invalid phone receives inline example, accessibility state and touched feedback, with existing submit focus behavior retained. | Reduces invalid booking retries. |
| QA-168-09 / E2E-012: cancelled queue card lingered | Closed queue updates are removed from the active signal immediately and selection moves to the next active entry. | Removes the manual Refresh step. |
| QA-168-10 / E2E-030, 096: add-on after payment request | Policy is now explicit: a new add-on automatically withdraws a terminal payment request and returns the bill to unpaid with a recalculated total. An already-created HitPay checkout blocks add-ons until staff resolves that payment. | Prevents collection against an outdated total. |
| QA-168-13 / E2E-089: unreliable export feedback/download | CSV, sales Excel and attendance Excel downloads now attach the browser anchor before clicking and delay object-URL cleanup; sales exports keep explicit success/error feedback. | Improves browser download reliability and visibility. |
| QA-168-15: staff login clutter | Create Account, Provider/Courier links, provider registration and Contact Us are removed from the staff login. Legal links remain when configured. | Keeps the login task focused. |
| Public order mutation security | Order placement and payment requests now require either the signed permanent-QR credential or a valid staff-access credential. | Rejects forged submissions that only know a table UUID. |
| Repository ownership references | Live Source/Help links, README clone/badges, deployment origin checks, automation defaults and import user-agents now point to `rtjz318/sakorio-pos`. Historical closed-task evidence is retained unchanged. | Prevents future developers and automation from returning to the obsolete repository. |

## Existing safeguards confirmed in code

The current `development` branch already contains several requested improvements which therefore were not duplicated:

- server-side reservation and queue capacity checks;
- explicit no-capacity empty states and best-fit table ranking;
- same-reservation exclusion from upcoming-reservation risk copy;
- submit-button in-flight protection and order idempotency keys;
- `Settle first` protection before table close;
- queue status versioning and row locking for seat transitions;
- KDS served completion feedback and backlog separation;
- permission-based access to staff, payroll, settings and reports;
- iPad portrait/landscape responsive layouts.

## Acceptance tests completed

- Focused backend regression: **52 passed**.
- Coverage includes station routing, tenant-local reports, QR credential enforcement, stale-session lock, payment-request withdrawal, session isolation, idempotency, cashier lifecycle and table payment status.
- Angular hot-reload compiler: **successful**, no TypeScript or template error.
- Local HTTP smoke: `/` returned **200** and `/api/health` returned `{"status":"ok"}`.
- Full backend suite baseline: **336 passed, 9 failed**. The nine failures are pre-existing test/environment issues outside this remediation: five SQLite-vs-PostgreSQL JSONB fixture cases, two legacy localized-error shape expectations, one seed-dependent overbooking test, and one legacy email-normalization expectation. The focused changed paths are green.

## Live or operational gates that remain

These cannot truthfully be converted to a software pass by source changes alone:

1. Bring the Android/Bluetooth printer agent online and physically accept kitchen and cashier receipts.
2. Complete HitPay sandbox success, cancel, retry, timeout and double-return/webhook tests.
3. With explicit accounting confirmation, settle synthetic bill #270, close T06 and reconcile it in History/Reports.
4. Manager must disposition old bills and backlog tickets; the system intentionally does not delete financial/production history automatically.
5. Run disposable waiter/kitchen/admin accounts for the full permission matrix.
6. Run clock-in/out on the physical Android tablet with camera permission.
7. Decide product scope for split payments, discounts/refunds/reopening, inventory and start-of-day backlog bulk resolution before those `NEEDS SPEC` cases can receive a launch score.
8. Reduce Render cold-start latency through paid always-on infrastructure or an approved hosting change.

## Release position

The software defects identified by the live report have been remediated where an unambiguous safe behavior exists. The remaining sub-8 entries are acceptance gates, data cleanup, hardware validation or unresolved product policies. Launch approval must remain conditional until the live deployed regression and the operational gates above are completed.
