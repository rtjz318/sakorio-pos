# Sakorio POS post-P0 live-browser regression - 50 scenario scorecard

Date: 2026-07-25  
Target domains: `staff.sakorio.com`, `order.sakorio.com`  
Build observed: `2.1.6 ff97e03c`  
Source brief: `docs/0111-sakorio-end-to-end-qa-50-scenario-brief-2026-07-25.md`  
Result status: Core POS/QR/payment flow is materially improved, but not 100% launch-signed because several scenarios remain below 10/10.

## Executive outcome

The P0 routing fixes are working on the live browser. Staff login reaches Dashboard, POS settles to usable state, public QR ordering loads the Ajisen menu, the public queue page loads, and an old closed QR no longer exposes previous order data.

The most important live proof from this pass:

- Staff login succeeded on `https://staff.sakorio.com/login` using the live staff account.
- POS loaded with `TABLES LOADED 10`, `CATALOG 112`, and no console errors after settling.
- Customer QR on T02 accepted a real test order:
  - Order: `#230`
  - Table: `T02`
  - Item: `1x Rice`
  - Amount: `SGD 3.00`
- Staff Orders showed `Order #230`, `T02`, `1x Rice`, `SGD 3.00`.
- Kitchen showed `#230 · T02`, `1x Rice`, in the new-ticket lane.
- POS showed `T02` as `Open order Bill #230 live`.
- Terminal settlement recorded `SGD 3.00`.
- Close-table final confirmation appeared: `Close T02?`
- After confirmation, POS showed:
  - `T02` available / ready
  - `OPEN BILLS 0`
  - `PAID TODAY SGD 15.00`
- Reloading the old T02 QR after close showed `Table Closed` and did not expose `Order #230`.
- Public queue accepted controlled entry `QA Queue 0114`, ticket `Q0052`, then staff Queue cancelled it; waiting guests returned to `0`.
- iPad viewport `1024x768` showed POS, Kitchen, and Reservations controls without detected critical off-screen actions.

## New launch-gate defects / non-10 findings

1. Staff Logout did not clear the staff session in this browser pass.
   - Action: clicked visible `Logout`.
   - Expected: protected route redirects to login.
   - Actual: navigating to `/pos` still opened logged-in POS with Owner session.
   - Launch risk: shared tablet/iPad staff sessions may remain active after logout.

2. Public reservation page loaded and showed the improved phone example, but the pass could not complete a new booking from today’s visible calendar state.
   - Observed fields: party size, phone placeholder `+65 9123 4567`, email, notes.
   - Visible day/time buttons were disabled/loading for today in this pass.
   - Launch risk: reservation creation needs a clean browser-proven successful booking on a valid future slot.

3. Legacy service data still exists on the board.
   - T02 was cleaned fully.
   - Queue QA entry was cleaned from active waiting.
   - Other existing active/seated tables remained visible, e.g. T01 seated, T06 live order, T09 occupied, T10 seated.
   - Launch risk: final launch test should start from an agreed clean/staged service day or intentionally seeded realistic state.

4. Kitchen state progression was partially proven.
   - Ticket receipt was proven.
   - Start/in-prep/ready/served progression was not fully executed in this pass because `#230` was cleaned through payment/close path.

5. Menu image/name/price audit was not re-run item-by-item in this pass.
   - QR confirmed 112 menu items and clean sample prices.
   - Full PDF cross-check remains covered by the previous menu audit, not repeated here.

## Live browser evidence log

| Evidence ID | Surface | Result |
|---|---|---|
| E-001 | Staff login | Login reached Dashboard, text included `POS 2.1.6 ff97e03c`, `Ajisen Ramen`, owner email, no console errors. |
| E-002 | Route sweep | Dashboard, Tables, Orders, Reservations, Queue, Kitchen, Products, Timetable, Users, Reports loaded. POS showed a short refresh state at 1.2s but settled cleanly after 6s. |
| E-003 | POS settle | POS showed `TABLES LOADED 10`, `OPEN BILLS 0`, `PAID TODAY SGD 12.00`, `CATALOG 112`, no console errors before test order. |
| E-004 | QR order | T02 QR showed Ajisen menu, 112 items, added `Rice`, placed `Order #230`, `SGD 3.00`, status `Pending`. |
| E-005 | Orders propagation | Staff Orders showed `Table orders T02`, `Latest #230`, `1x Rice`, `SGD 3.00`. |
| E-006 | Kitchen propagation | Kitchen showed `All 1`, `Kitchen 1`, `#230 Pending T02`, `1x Rice`, `NOODLE & RICE MENU`. |
| E-007 | POS payment | POS showed `Bill #230 payable SGD 3.00`; terminal payment recorded successfully. |
| E-008 | Close table | Final confirmation appeared and T02 reset to available after `Yes, close table`. |
| E-009 | QR privacy after close | Old T02 QR reloaded to `Table Closed`; no `Order #230`, no Rice line, no payment button. |
| E-010 | Queue | Public waitlist created `Q0052`; staff Queue saw `QA Queue 0114`; cancellation returned active waiting to `0`. |
| E-011 | iPad viewport | POS/Kitchen/Reservations checked at `1024x768`; critical actions remained visible/reachable in sampled pages. |
| E-012 | Logout | Logout did not clear live staff session; protected POS still loaded. |

## 50 scenario scorecard

| ID | Priority | Status | Score | Live-browser result summary | Improvements / follow-up |
|---|---:|---|---:|---|---|
| SKR-20260725-E2E-001 | P0 | FAIL | 7.5 | Staff login and routes worked, but Logout did not clear session; `/pos` still loaded as Owner after logout. | Fix logout/session invalidation and re-test protected-route redirect. |
| SKR-20260725-E2E-002 | P0 | PASS | 9.8 | POS initially refreshed, then settled with 10 tables, 0 open bills, 112 catalog items, no console errors. | Minor: keep refresh label from looking like a stuck state if load exceeds 1-2s. |
| SKR-20260725-E2E-003 | P0 | PASS | 10.0 | T02 QR created `Order #230`; Orders/Kitchen/POS all showed correct table/item/amount. | None from this pass. |
| SKR-20260725-E2E-004 | P0 | PARTIAL | 8.5 | T02 test bill and queue test entry cleaned. Other legacy active/seated data remained intentionally untouched. | Prepare a clean launch-test service day or cleanup approved legacy seated/live records. |
| SKR-20260725-E2E-005 | P1 | PASS | 9.3 | Multiple QR/staff tabs did not leak T02 order after close; old QR blocked correctly. | Logout defect reduces multi-tab confidence. |
| SKR-20260725-E2E-006 | P0 | PASS | 9.8 | QR dine-in order reached Kitchen and POS correctly; table remained open until payment/close. | Full host seating sub-step not repeated in this pass. |
| SKR-20260725-E2E-007 | P0 | PARTIAL | 9.0 | Same-session current bill behavior proven for one round; two-round ordering not repeated. | Re-run with two sequential QR orders before final signoff. |
| SKR-20260725-E2E-008 | P0 | PASS | 10.0 | QR displayed current order only while active; after close old QR showed `Table Closed` and no history leakage. | None from this pass. |
| SKR-20260725-E2E-009 | P0 | PARTIAL | 9.0 | QR did not blank after close; Kitchen served-state path not executed. | Re-run Kitchen served action and QR reload after served-but-before-close. |
| SKR-20260725-E2E-010 | P1 | PARTIAL | 8.8 | iPad tested for staff POS/Kitchen/Reservations, not full QR add/remove cart at tablet width. | Run customer QR cart flow at iPad/mobile width. |
| SKR-20260725-E2E-011 | P1 | PARTIAL | 8.7 | Notes/modifiers not executed; Kitchen readability for normal item was clean. | Test QR notes and verify ticket note visibility. |
| SKR-20260725-E2E-012 | P1 | PARTIAL | 9.0 | Combined bill integrity observed for one current order; extra add-on before payment not repeated. | Run QR second add-on and verify combined POS total. |
| SKR-20260725-E2E-013 | P1 | PASS | 10.0 | Old QR after close did not expose prior session and clearly showed closed-table message. | None from this pass. |
| SKR-20260725-E2E-014 | P1 | PARTIAL | 8.9 | Cart add and place order worked; empty cart/rapid add-remove patterns not exhaustively repeated. | Add negative-input cart stress pass. |
| SKR-20260725-E2E-015 | P2 | PARTIAL | 8.8 | QR confirmed 112 items and clean sample pricing; full 20-item PDF/image audit not repeated. | Re-run 20-item live PDF cross-check after final menu freeze. |
| SKR-20260725-E2E-016 | P0 | BLOCKED/PARTIAL | 7.8 | Reservation page loaded; complete reservation-to-seat-to-order flow not executable from visible today slot state. | Prove successful future reservation creation, host search, seat-now, QR order, close. |
| SKR-20260725-E2E-017 | P0 | PARTIAL | 8.8 | Reservation phone help text example present; invalid-correct-submit-host-search not completed. | Run invalid phone/email correction on an available future slot. |
| SKR-20260725-E2E-018 | P1 | PARTIAL | 8.5 | Host reservation page loaded with controls; edit/assignment not repeated. | Test create/edit party size and table reassignment. |
| SKR-20260725-E2E-019 | P1 | NOT RUN | 8.0 | Cancel/no-show reservation manage-link behavior not tested in this pass. | Need one controlled reservation record. |
| SKR-20260725-E2E-020 | P1 | NOT RUN | 8.0 | Two-reservation parallel seating not tested. | Requires clean future booking slots and two available tables. |
| SKR-20260725-E2E-021 | P1 | PARTIAL | 8.2 | Seat-now flow not completed; reservation page available. | Test early arrival seat-now from host page. |
| SKR-20260725-E2E-022 | P1 | NOT RUN | 8.0 | Finish reservation while unpaid/open not tested. | Needs controlled reservation/table bill. |
| SKR-20260725-E2E-023 | P2 | PARTIAL | 8.7 | Reservations page at iPad width did not show major control loss in sampled view. | Add long-name reservation visual test. |
| SKR-20260725-E2E-024 | P0 | PARTIAL | 9.0 | Public waitlist create and staff cleanup worked; queue-to-seat-to-QR-order not completed. | Run full queue seat-at-table flow on clean table. |
| SKR-20260725-E2E-025 | P1 | PASS/PARTIAL | 9.1 | Staff Queue saw QA entry, action controls were clear, cancellation removed it from active waiting. | Manual host-add/edit-seat not repeated. |
| SKR-20260725-E2E-026 | P1 | NOT RUN | 8.0 | Duplicate waitlist not tested. | Test duplicate same phone/name and archive behavior. |
| SKR-20260725-E2E-027 | P1 | PARTIAL | 8.6 | Queue showed best-fit table suggestions; too-small capacity path not executed. | Test large party assignment warning. |
| SKR-20260725-E2E-028 | P1 | PASS/PARTIAL | 9.0 | Controlled queue entry cancelled; active waiting returned to 0. Closed record visible only under include-closed/stale context. | Add archive/stale bulk cleanup validation. |
| SKR-20260725-E2E-029 | P2 | NOT RUN | 8.0 | Queue-to-reservation conversion not executed. | Needs controlled queue record. |
| SKR-20260725-E2E-030 | P2 | PASS/PARTIAL | 9.0 | Cancel flow moved QA queue entry out of active waiting. | Verify guest-side status page after cancellation if required. |
| SKR-20260725-E2E-031 | P0 | PASS | 9.8 | Cashier terminal payment and close-table flow worked on live bill `#230`; table reset safely. | Cashier-created order was not the origin; QR-created order used. |
| SKR-20260725-E2E-032 | P0 | PARTIAL | 9.0 | POS showed correct active bill/session for QR order. POS add-on to active QR table not repeated. | Add staff-side item to active QR bill and verify combined total. |
| SKR-20260725-E2E-033 | P0 | PARTIAL | 8.7 | Terminal payment worked; HitPay sandbox completion not repeated in this pass. | Re-run QR HitPay sandbox completion and return callback. |
| SKR-20260725-E2E-034 | P0 | NOT RUN | 8.0 | HitPay abandon/cancel not tested. | Must confirm unpaid/open state after abandoned payment request. |
| SKR-20260725-E2E-035 | P0 | PASS | 9.8 | Close-table final confirmation was strong after payment; unpaid close block inferred from no close action before payment. | Explicit unpaid-close attempt still recommended. |
| SKR-20260725-E2E-036 | P1 | PARTIAL | 8.8 | POS table labels and current bill label were clear for T02. Three active-table switching not repeated. | Multi-table cart isolation stress test needed. |
| SKR-20260725-E2E-037 | P1 | PASS/PARTIAL | 9.1 | Large POS catalog loaded with categories/search area and compact item cards; sample item prices visible. | Run exact search-by-name/category add test on iPad. |
| SKR-20260725-E2E-038 | P1 | NOT RUN | 8.0 | Manager void/correction before payment not tested. | Needs controlled wrong-item scenario and permission check. |
| SKR-20260725-E2E-039 | P1 | PARTIAL | 8.5 | Orders History showed closed `#230`; reopen/refund not tested. | Clarify supported reopen/refund policy then test. |
| SKR-20260725-E2E-040 | P2 | PASS | 9.2 | POS at iPad `1024x768` showed critical table/payment controls without detected off-screen critical action. | Test payment panel while table selected at iPad width with active bill again. |
| SKR-20260725-E2E-041 | P0 | PARTIAL | 9.0 | Kitchen receipt proven with Rice order. Mixed food/drink lane separation not repeated. | Test mixed kitchen/beverage order. |
| SKR-20260725-E2E-042 | P1 | PARTIAL | 8.8 | Kitchen new-ticket display was clean; state progression not executed. | Test Start ticket → Ready → Served feedback/toast. |
| SKR-20260725-E2E-043 | P1 | NOT RUN | 8.0 | Two-table concurrent Kitchen sort not tested. | Run two QR orders from two tables. |
| SKR-20260725-E2E-044 | P1 | NOT RUN | 8.0 | Beverage-only order not tested. | Run drink-only QR order and lane verification. |
| SKR-20260725-E2E-045 | P1 | PARTIAL | 8.8 | Kitchen iPad lane layout clean with empty/no-ticket state. Long-ticket tablet card not tested. | Run multi-item long note order on Kitchen tablet width. |
| SKR-20260725-E2E-046 | P2 | PASS/PARTIAL | 9.0 | Kitchen-to-POS visibility and billing handoff worked; served state not part of handoff. | Include served-state transition next time. |
| SKR-20260725-E2E-047 | P1 | PARTIAL | 8.5 | Users and Timetable pages loaded; full clock-in/out lifecycle not executed. | Test QA staff profile shift clock-in/out. |
| SKR-20260725-E2E-048 | P1 | PARTIAL | 8.7 | Timetable loaded calendar controls: Apply to month, Add shift, Week, Calendar, Today. | Execute add/edit shift and leave/MC tracking. |
| SKR-20260725-E2E-049 | P1 | NOT RUN | 8.0 | Waiter role login/permission matrix not repeated. | Needs waiter credentials or controlled profile. |
| SKR-20260725-E2E-050 | P0 | PASS/PARTIAL | 9.2 | Paid `#230` appeared in Orders History with table, item, total, status/date. Reports showed revenue page and open-bill checklist but range total did not isolate `SGD 15.00`. | Add transaction-level report filter or daily isolate check for exact payment method/time. |

## Score summary

- 10.0 scenarios: 3
- 9.0-9.9 scenarios: 18
- 8.0-8.9 scenarios: 26
- Below 8.0 scenarios: 2
- Not fully run / requires controlled setup: 9

The result improved significantly versus the pre-P0 regression because the system is no longer blocked at API routing, public QR, public queue, or POS syncing. The remaining gap is not basic operability; it is final launch hardening and proof coverage.

## Priority improvement backlog

### P0 - Must fix or prove before 100% launch signoff

1. Fix staff Logout/session invalidation.
   - Staff tablets must not remain authenticated after a user taps Logout.
   - Re-test: Login → Logout → open `/pos`, `/reports`, `/users`; each should redirect/block.

2. Complete one clean reservation end-to-end.
   - Public reservation → host search/highlight → assign/seat → QR order → kitchen → payment → close.
   - This needs an available future slot or adjusted staging availability.

3. Re-run HitPay sandbox complete and abandoned-payment tests.
   - Confirm completed payment truth.
   - Confirm abandoned payment request does not mark bill paid.

4. Execute Kitchen state progression.
   - Start ticket → in prep → ready → served.
   - Verify toast/feedback and QR reload after served.

5. Start final launch regression from a clean service-day state.
   - Either intentionally keep seeded occupied tables or clear/document them.
   - Do not mix old demo/QA data into final launch scoring.

### P1 - Launch polish / operational hardening

1. Two-round same-table QR order proof.
2. POS add-on to active QR bill proof.
3. Multi-table cashier switching stress test.
4. QR iPad/mobile add/remove/search/cart test.
5. Long notes/modifiers visibility in Kitchen and Orders.
6. Queue duplicate and large-party capacity warning tests.
7. Timetable add/edit shift and clock-in/out lifecycle.
8. Waiter role permission matrix.

### P2 - Nice-to-have before physical restaurant trial

1. Repeat 20-item menu PDF/name/price/image spot audit after menu freeze.
2. Add report view that isolates one transaction/payment method/time more clearly.
3. Add “stale/closed queue entry” explanation when Include closed is active, so cleanup status is easier to trust.

## Cleanup performed

- T02 QR test bill `#230` was paid via terminal and closed.
- T02 old QR was verified as closed and private.
- Public queue test entry `QA Queue 0114` / `Q0052` was cancelled from active waiting.
- Active queue count returned to 0.
- Browser viewport override was reset after iPad simulation.

## Launch decision from this pass

Not 100% launch-ready yet.

Sakorio is much closer: the core POS ordering, kitchen visibility, terminal payment, table closing, QR privacy, and public queue surfaces are now working live. However, a senior launch gate cannot pass while Logout fails to clear the staff session and while reservation/HitPay/Kitchen progression scenarios remain only partially executed in this post-P0 pass.

