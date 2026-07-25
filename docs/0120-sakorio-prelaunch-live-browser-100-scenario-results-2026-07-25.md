# Sakorio POS pre-launch live-browser QA execution results - 100 scenarios

Date started: 2026-07-25  
Source brief: `docs/0119-sakorio-prelaunch-live-browser-100-scenario-qa-brief-2026-07-25.md`  
Run prefix: `SKR-PRELAUNCH-20260725-E2E`  
Execution rule: live browser only for scoring  
Status: in progress

## Executive running summary

This document records the live-browser execution results for the 100-scenario pre-launch QA pass.

Current run note: execution started after the POS drawer QR removal/menu-card polish was deployed and live build `2.1.6 1367af54` was observed on `staff.sakorio.com` in the previous live browser pass.

## Score table

| ID | Priority | Status | Score | Live-browser result summary | Improvements / follow-up |
|---|---:|---|---:|---|---|
| SKR-PRELAUNCH-20260725-E2E-001 | P0 | PASS | 10.0 | Staff login/session route sweep worked. Dashboard, POS, Tables, Orders, Reservations, Queue, Kitchen, Products, Reports, Timetable, and Users loaded. Logout redirected to login, and direct `/pos` after logout stayed blocked at login. | None from this pass. |
| SKR-PRELAUNCH-20260725-E2E-002 | P0 | PASS | 9.5 | POS loaded after Render wake and settled to `TABLES LOADED 10`, `OPEN BILLS 0`, `CATALOG 112`, `PAID TODAY SGD 15.00`; no console errors in route sweep. | Wake/loading screen still takes time after idle; acceptable but not instant. |
| SKR-PRELAUNCH-20260725-E2E-003 | P0 | PARTIAL | 8.5 | Board showed 0 open bills and queue waiting 0, but legacy visible seated/occupied context remains: T06 seated, T09 occupied, T10 seated, plus many history counts. | Need agreed final clean launch-service state or documented seeded realistic state before final signoff. |
| SKR-PRELAUNCH-20260725-E2E-004 | P0 | PARTIAL | 9.0 | Staff multi-tab/session behavior looked stable during route reloads and logout/re-login. Full QR + staff multi-tab identity was not yet run in this case. | Re-run with two QR tabs and two staff tabs during a live order. |
| SKR-PRELAUNCH-20260725-E2E-005 | P1 | PARTIAL | 8.8 | Language switch to French worked and the app stayed usable. Returning to English by label did not restore immediately; using the select value `en` restored English. | Improve language select reliability/feedback, or verify if label-based selection issue is automation-only. |
| SKR-PRELAUNCH-20260725-E2E-006 | P1 | PASS | 9.0 | Render wake page appeared first, then staff POS loaded cleanly after wait/reload. User-facing wake state is visible but not broken. | Paid Render instances reduce wake delay for launch; Standard tier is already recommended. |
| SKR-PRELAUNCH-20260725-E2E-007 | P1 | PASS | 9.5 | Products page loaded imported menu categories; visible images reported 90/90 loaded with no broken images. POS/QR menu parity still needs deeper item-by-item checks in Phase H. | Run Phase H PDF/menu item cross-check for exact names/prices/images. |
| SKR-PRELAUNCH-20260725-E2E-008 | P1 | PASS/PARTIAL | 9.0 | POS drawer opened for T02. QR handoff text/buttons were absent, service loop and cart were visible, 112 product cards loaded, zero measured overlaps and zero copy overflows in sampled cards. Sidebar collapse control did not visibly reduce nav in this automation pass. | Re-test sidebar collapse/fullscreen manually or with viewport QA; core POS drawer passed. |
| SKR-PRELAUNCH-20260725-E2E-009 | P2 | PASS | 9.8 | Hard route sweep found no blank core route and no obvious 404/503/application error after wake. Kitchen page intentionally has a different fullscreen display without sidebar. | None urgent. |
| SKR-PRELAUNCH-20260725-E2E-010 | P2 | PASS | 10.0 | Live staff build displayed `2.1.6 1367af54`, matching the deployed POS QR-removal/menu-card polish commit. | None. |
| SKR-PRELAUNCH-20260725-E2E-011 | P0 | PASS | 10.0 | T02 QR was initially closed while table idle, then opened only after staff used `Open table for QR ordering`; customer placed Rice order #231 SGD 3.00; Orders, Kitchen, and POS all showed T02/#231/Rice correctly. | None. |
| SKR-PRELAUNCH-20260725-E2E-012 | P0 | PARTIAL | 8.6 | Same-table second-round attempt found duplicate `Add A12 Boiled Seasoned Egg to cart` controls from Featured/Menu areas; generic browser target was ambiguous and no second order was submitted. Existing #231 remained current, not History. | Improve QR duplicate add-button accessibility/scoping or test with visible DOM in next pass. |
| SKR-PRELAUNCH-20260725-E2E-013 | P0 | PASS | 10.0 | Customer QR after order showed current order #231, Rice, SGD 3.00, Pending, Pay Now; no other customer history appeared. | None. |
| SKR-PRELAUNCH-20260725-E2E-014 | P0 | PASS | 10.0 | After terminal payment and close, reloading the old T02 QR showed `Table Closed`, no `#231`, no Rice, and no Pay Now. | None. |
| SKR-PRELAUNCH-20260725-E2E-015 | P0 | PASS/PARTIAL | 9.2 | Customer QR current order/payment area had Pay Now and no Cash text. Staff POS payment panel correctly showed staff-only Cash and Terminal with explanatory note that customer QR checkout shows HitPay/card-at-table only. | Still need direct HitPay sandbox success/abandon tests in Phase E. |
| SKR-PRELAUNCH-20260725-E2E-016 | P1 | PARTIAL | 8.5 | Rapid add/remove negative cart test was not completed. A duplicate add-control ambiguity was discovered while trying to add A12, and cart submission did not proceed. | Add dedicated visible-cart stress test later; improve duplicate item action labels. |
| SKR-PRELAUNCH-20260725-E2E-017 | P1 | NOT RUN | 8.0 | Kitchen note/allergy note path was not run in this segment. | Needs controlled note order. |
| SKR-PRELAUNCH-20260725-E2E-018 | P1 | PASS/PARTIAL | 9.0 | QR menu showed 112 items and correct searchable/scannable item text for Rice, categories, and prices; exact search interaction not run yet. | Run exact QR search/category case in Phase H. |
| SKR-PRELAUNCH-20260725-E2E-019 | P1 | PARTIAL | 8.8 | Customer QR loaded large menu and images, but iPad/mobile add/remove/submit was not run in this segment. | Run iPad QR workflow during device phase. |
| SKR-PRELAUNCH-20260725-E2E-020 | P2 | PARTIAL | 8.8 | Two tabs existed: staff and T02 QR. Old QR after close was safe. Simultaneous two-QR-tab same-session ordering was not fully exercised. | Re-run during multi-tab/session pressure pass. |
| SKR-PRELAUNCH-20260725-E2E-021 | P0 | PASS | 9.8 | Created public reservation #94, host found it, seated T07, opened QR, customer ordered #232, KDS served, cashier terminal-paid SGD 6.00, closed table, old QR closed, reservation auto-finished. | Tables tab `Open menu`/`Copy` handoff did not open/copy in-browser; Reservations fallback link worked. |
| SKR-PRELAUNCH-20260725-E2E-022 | P0 | PASS/PARTIAL | 9.2 | Public reservation page shows clear phone example `+65 9123 4567`; valid +65 phone normalized and booking was searchable in host page. | Invalid-phone correction path not run in this segment. |
| SKR-PRELAUNCH-20260725-E2E-023 | P1 | PARTIAL | 8.8 | Host seating panel offered suitable available tables with accessible labels (`Seat at T07`, `Seat at T04`). | Manual staff-created reservation/edit path not run yet. |
| SKR-PRELAUNCH-20260725-E2E-024 | P1 | PASS | 9.6 | Same-day upcoming reservation at 20:00 could be seated immediately during arrival window, then QR ordering worked. | None for tested path. |
| SKR-PRELAUNCH-20260725-E2E-025 | P1 | PARTIAL | 8.5 | Reservation page correctly showed only #94 active and no queue pressure during test. | Late-arrival-with-queue conflict not run yet. |
| SKR-PRELAUNCH-20260725-E2E-026 | P1 | NOT RUN | 0.0 | Not executed in this batch. | Cancel/no-show prevention still pending. |
| SKR-PRELAUNCH-20260725-E2E-027 | P1 | PARTIAL | 8.8 | Seated reservation exposed table move controls on Tables/POS. | Move-before-order not executed because #94 was used for full lifecycle close. |
| SKR-PRELAUNCH-20260725-E2E-028 | P1 | PARTIAL | 8.8 | T07 bill #232 behaved as one active bill through order, kitchen, payment, close. | Move-after-order path not executed. |
| SKR-PRELAUNCH-20260725-E2E-029 | P2 | PASS/PARTIAL | 9.0 | Customer notes and allergy note displayed cleanly on Reservations desktop card. | Long-name/iPad wrapping not run yet. |
| SKR-PRELAUNCH-20260725-E2E-030 | P2 | NOT RUN | 0.0 | Not executed in this batch. | Parallel reservations cross-link test pending. |
| SKR-PRELAUNCH-20260725-E2E-031 | P0 | PASS | 9.8 | Public waitlist Q0053 joined, host saw web waitlist guest, recommended exact-fit T07, seated to POS, QR order #233, KDS served, terminal-paid SGD 2.00, table closed/reset. | Tables QR handoff still relies on known/fallback QR URL; host queue-to-POS handoff itself passed. |
| SKR-PRELAUNCH-20260725-E2E-032 | P1 | PARTIAL | 8.8 | Staff Queue page manual Add-to-queue form and fields were visible and clear. | Staff-created queue entry was not submitted in this segment. |
| SKR-PRELAUNCH-20260725-E2E-033 | P1 | NOT RUN | 0.0 | Not executed in this batch. | Duplicate waitlist detection pending. |
| SKR-PRELAUNCH-20260725-E2E-034 | P1 | PASS/PARTIAL | 9.0 | Queue seating recommendations showed exact-fit T07 and larger backup T04 with clear spare-seat explanation. | Too-small-table prevention not directly forced. |
| SKR-PRELAUNCH-20260725-E2E-035 | P1 | NOT RUN | 0.0 | Not executed in this batch. | Customer leave/cancel/rejoin pending. |
| SKR-PRELAUNCH-20260725-E2E-036 | P1 | PARTIAL | 8.8 | Queue page exposed `Notify guest`, waiting/notified/seated lanes, and active counters. | Notify transition not clicked before seating. |
| SKR-PRELAUNCH-20260725-E2E-037 | P1 | PASS/PARTIAL | 9.0 | Queue-seated T07 initially showed no bill and a safe `Release table` option before ordering. | Empty release was not clicked because case proceeded through full order/payment lifecycle. |
| SKR-PRELAUNCH-20260725-E2E-038 | P2 | PARTIAL | 8.5 | Queue filters `Include closed` and `Show stale` were visible; active queue was clean after close. | Archive/stale cleanup action not run. |
| SKR-PRELAUNCH-20260725-E2E-039 | P2 | PARTIAL | 8.5 | Queue page exposed `Turn queue into reservation` form with date/time/email/service/notes. | Conversion not submitted. |
| SKR-PRELAUNCH-20260725-E2E-040 | P2 | PARTIAL | 8.5 | Queue notes displayed cleanly on desktop for `QA queue to seat to QR workflow`. | iPad note wrapping pending. |
| SKR-PRELAUNCH-20260725-E2E-041 | P0 | PASS | 9.2 | Cashier selected T03, added A12, sent order #234, KDS received/started/readied/served it, terminal-paid SGD 2.00, and closed/reset T03. | POS board/drawer briefly showed stale paid/current state until reload after close; improve immediate refresh after terminal pay/close. |
| SKR-PRELAUNCH-20260725-E2E-042 | P0 | PASS/PARTIAL | 8.8 | T04 fixed QR order #235 A7 SGD 6.00 plus cashier POS add-on A12 SGD 2.00 combined into one SGD 8.00 bill after reload; terminal-paid and closed/reset T04. | Add-on toast fired immediately, but drawer initially still showed 1 item/SGD 6.00 until reload. Need immediate bill refresh after add-on send. |
| SKR-PRELAUNCH-20260725-E2E-043 | P0 | PASS/PARTIAL | 9.0 | T05 unpaid order #236 could not be directly closed from POS; after terminal payment, final close confirmation reset T05. | After initial send, drawer briefly reset to zero bill until reload; unpaid close guardrail worked. |
| SKR-PRELAUNCH-20260725-E2E-044 | P0 | PASS | 9.8 | T07 QR order #237 redirected to HitPay sandbox, test card payment returned to Sakorio payment-success, staff POS showed paid/SGD 0 due, and T07 closed/reset. | None urgent. Payment modal copy is clear, but Pay Now opens a modal rather than direct redirect, so staff/customer training should mention the second tap. |
| SKR-PRELAUNCH-20260725-E2E-045 | P0 | PASS/PARTIAL | 9.2 | T08 QR order #238 opened HitPay sandbox, no payment was submitted, and staff POS correctly kept the bill unpaid/open; terminal cleanup then closed/reset T08. | HitPay sandbox Back/browser-back did not return cleanly during abandon test; payment truth was correct. Consider clearer customer return/cancel guidance. |
| SKR-PRELAUNCH-20260725-E2E-046 | P1 | PASS/PARTIAL | 8.8 | Unsent T01 cart stayed isolated from T02 and was still present on return to T01; T02 did not inherit T01 cart. Cart cleared after test. | After clearing/releasing an empty table, drawer copy stayed in release context while board said available. Refresh drawer state after release. |
| SKR-PRELAUNCH-20260725-E2E-047 | P1 | PASS/PARTIAL | 9.0 | POS exact search found `Chita Highball` at SGD 13.00; keyboard-clearing search then category chip `Deep Fried Menu` showed 8 correct deep-fried items/prices. | Programmatic/fill clear did not update search during automation; real keyboard clear worked. Add visible clear-search `x` button for iPad/staff speed. |
| SKR-PRELAUNCH-20260725-E2E-048 | P1 | PASS/PARTIAL | 8.5 | Wrong pre-send item `C1 (2pcs)Deep Fried Chicken` could be cleared before kitchen send/payment, returning T02 to SGD 0.00. | Post-send manager void/refund/correction path was not executed; needs dedicated manager-permission pass. |
| SKR-PRELAUNCH-20260725-E2E-049 | P1 | PASS/PARTIAL | 8.8 | T08 History showed recently closed #238 with Paid state, A5 Chanja, Terminal, SGD 5.00. | Older legacy demo/test history entries remain visible with outdated item names; clean launch data or label demo history. Reopen/refund action not executed. |
| SKR-PRELAUNCH-20260725-E2E-050 | P2 | PARTIAL | 8.5 | POS layout remained usable at the available browser landscape size; payment lane stayed visible/reachable and no measured menu/cart overlap occurred. | In-app browser viewport override did not actually switch to 1024x768; true iPad device/browser test still required. |
| SKR-PRELAUNCH-20260725-E2E-051 | P0 | PASS | 9.5 | T03 cashier order #240 stayed current until terminal payment and final close, then moved to History with T03 available. | Completed fix: desktop paid-close confirmation now exposes `Yes, close table`. |
| SKR-PRELAUNCH-20260725-E2E-052 | P0 | PASS | 9.5 | T08 fixed QR opened, customer placed two QR rounds into the same #241 session, KDS processed both items, cashier terminal-paid and closed the table. | Completed fixes: fixed QR activation is visible above the fold, and customer product detail add-to-cart is reachable on 1280x720/tablet-landscape height. |
| SKR-PRELAUNCH-20260725-E2E-053 | P1 | PASS/PARTIAL | 8.0 | Orders Active, Paid-awaiting-close and History can find live #242 and closed #241/#242; staff can complete the table workflow. | `Not Paid Yet` does not show active unpaid table bills, and exact history searches can include unrelated legacy rows. |
| SKR-PRELAUNCH-20260725-E2E-054 | P1 | PARTIAL | 6.5 | Closed History row shows #242/T07/A12/SGD 2.00/Paid/date, but no detail drawer opens. | Manager audit lacks payment method, close timestamp, and a full paid-order detail view in closed History. |
| SKR-PRELAUNCH-20260725-E2E-055 | P1 | PASS | 9.0 | T05/#243 was served in KDS but remained current/unpaid in Orders with Collect payment available, then terminal-paid/closed cleanly. | Served status correctly does not equal paid; minor copy `1 ready to close` can confuse before payment. |

## Detailed execution notes

### Phase A - Access, session, health, and clean launch board

#### SKR-PRELAUNCH-20260725-E2E-001

- Priority: P0
- Roles simulated: Staff, owner
- Browser/device mode: Desktop live browser
- Starting state: Existing staff session on `staff.sakorio.com`
- Test data: Staff account `ricktan318@hotmail.com`
- Browser steps executed:
  - Opened staff POS after Render wake.
  - Swept Dashboard, POS, Tables, Orders, Reservations, Queue, Kitchen, Products, Reports, Timetable, Users.
  - Clicked Logout.
  - Attempted direct protected `/pos` after logout.
- Expected final state: Staff routes load while authenticated; after logout protected routes redirect/block to login.
- Actual final state: PASS. Logout landed on login page. Direct `/pos` after logout stayed at login and did not show Owner/POS board.
- Cross-module verification: Staff route sweep included all major launch modules.
- Functional correctness: 10/10
- UI/UX clarity: 10/10
- Workflow speed: 9.5/10
- Layout/device stability: 10/10
- Data/payment/session integrity: 10/10
- Launch readiness: 10/10
- Final score: 10.0
- Status: PASS
- Evidence: Login route sweep text included owner session before logout; after logout text showed `Welcome back`, `Sign in to your account`, no Owner, no POS board.
- Defects found: None in this pass.
- Improvements needed: None.
- Cleanup performed: Re-logged in for continued QA.
- Launch decision: Launch-ready for this case.

#### SKR-PRELAUNCH-20260725-E2E-002

- Priority: P0
- Roles simulated: Cashier
- Browser/device mode: Desktop live browser
- Starting state: Render wake screen appeared first.
- Test data: None.
- Browser steps executed:
  - Opened `https://staff.sakorio.com/pos?qa=prelaunch100-*`.
  - Waited through Render wake.
  - Reloaded and confirmed POS board.
  - Swept routes and checked console errors.
- Expected final state: POS loads and settles without stuck syncing or auth redirect.
- Actual final state: PASS. POS showed `TABLES LOADED 10`, `OPEN BILLS 0`, `PAID TODAY SGD 15.00`, `CATALOG 112`.
- Cross-module verification: POS and route sweep.
- Functional correctness: 10/10
- UI/UX clarity: 9/10
- Workflow speed: 8.5/10
- Layout/device stability: 10/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9.5/10
- Final score: 9.5
- Status: PASS
- Evidence: Browser text confirmed counters; route sweep console errors: none.
- Defects found: Render wake delay remains visible after idle.
- Improvements needed: Paid/non-idling instance recommended for launch-day smoothness.
- Cleanup performed: None needed.
- Launch decision: Launch-ready if paid instance/wake strategy is accepted.

#### SKR-PRELAUNCH-20260725-E2E-003

- Priority: P0
- Roles simulated: Manager
- Browser/device mode: Desktop live browser
- Starting state: Live board with previous seeded/QA history.
- Test data: Existing live visible table state.
- Browser steps executed:
  - Reviewed POS counters.
  - Reviewed queue route.
  - Reviewed visible table cards and history counts.
- Expected final state: Known clean or intentionally seeded state.
- Actual final state: PARTIAL. No open bills and no waiting queue entries, but visible legacy seated/occupied records remain.
- Cross-module verification: POS showed 0 open bills; Queue showed 0 waiting.
- Functional correctness: 8/10
- UI/UX clarity: 8/10
- Workflow speed: 9/10
- Layout/device stability: 10/10
- Data/payment/session integrity: 8/10
- Launch readiness: 8/10
- Final score: 8.5
- Status: PARTIAL
- Evidence: POS visible cards included T06 seated, T09 occupied, T10 seated; Orders history badges present.
- Defects found: Not a code defect; launch QA needs a clean/known service state.
- Improvements needed: Prepare final clean launch-service board or preserve a documented realistic seed.
- Cleanup performed: None, to avoid deleting real/seeded data without a targeted cleanup step.
- Launch decision: Needs clean-state decision before final launch signoff.

#### SKR-PRELAUNCH-20260725-E2E-004

- Priority: P0
- Roles simulated: Staff, customer
- Browser/device mode: Desktop live browser
- Starting state: Authenticated staff session.
- Test data: Existing staff session.
- Browser steps executed:
  - Opened and reloaded multiple staff routes.
  - Logged out and verified protected route block.
  - Re-logged in.
- Expected final state: Multiple staff tabs and QR tabs keep correct role/session.
- Actual final state: PARTIAL. Staff session path passed; customer QR multi-tab identity was not executed yet.
- Cross-module verification: Staff routes and auth guard.
- Functional correctness: 9/10
- UI/UX clarity: 9/10
- Workflow speed: 9/10
- Layout/device stability: 10/10
- Data/payment/session integrity: 9/10
- Launch readiness: 9/10
- Final score: 9.0
- Status: PARTIAL
- Evidence: Staff route reload/logout/re-login stayed consistent.
- Defects found: None from staff-side; QR multi-tab not covered yet.
- Improvements needed: Re-run during live QR order in Phase B/E.
- Cleanup performed: None.
- Launch decision: Staff side launch-ready; full case pending QR multi-tab portion.

#### SKR-PRELAUNCH-20260725-E2E-005

- Priority: P1
- Roles simulated: Staff
- Browser/device mode: Desktop live browser
- Starting state: Staff dashboard in English.
- Test data: Language select.
- Browser steps executed:
  - Switched language to French.
  - Confirmed app stayed usable.
  - Attempted to restore English by label.
  - Restored English using select value `en`.
- Expected final state: Language can change and return cleanly without breaking routes.
- Actual final state: PARTIAL. French switch worked; English restoration by label was not immediate in automation, but value restore worked.
- Cross-module verification: POS route still loaded after language change.
- Functional correctness: 8/10
- UI/UX clarity: 8/10
- Workflow speed: 8/10
- Layout/device stability: 10/10
- Data/payment/session integrity: 10/10
- Launch readiness: 8.8/10
- Final score: 8.8
- Status: PARTIAL
- Evidence: POS text switched to French labels; later selected option showed `English/en` and English labels returned.
- Defects found: Possible language selector restoration flakiness.
- Improvements needed: Verify manually or make select change feedback more deterministic.
- Cleanup performed: Restored English.
- Launch decision: Not launch-blocking for core POS, but should be polished.

#### SKR-PRELAUNCH-20260725-E2E-006

- Priority: P1
- Roles simulated: Staff
- Browser/device mode: Desktop live browser
- Starting state: Render application loading screen.
- Test data: None.
- Browser steps executed:
  - Opened staff POS while service was waking.
  - Waited and reloaded.
  - Confirmed app reached POS board.
- Expected final state: Wake screen transitions to working app.
- Actual final state: PASS. App loaded after waiting; route was usable.
- Cross-module verification: POS board after wake.
- Functional correctness: 9/10
- UI/UX clarity: 8.5/10
- Workflow speed: 8/10
- Layout/device stability: 10/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9/10
- Final score: 9.0
- Status: PASS
- Evidence: Initial Render wake screen, then POS board.
- Defects found: Wake delay.
- Improvements needed: Paid/non-idling instance for launch.
- Cleanup performed: None.
- Launch decision: Acceptable if infrastructure is upgraded/non-idling.

#### SKR-PRELAUNCH-20260725-E2E-007

- Priority: P1
- Roles simulated: Manager
- Browser/device mode: Desktop live browser
- Starting state: Authenticated staff session.
- Test data: Imported Ajisen menu.
- Browser steps executed:
  - Opened Products page.
  - Counted visible loaded images.
  - Checked visible menu categories.
  - Opened POS board to verify 112 catalog items.
- Expected final state: Products/POS menu data agree at high level.
- Actual final state: PASS. Products visible images: 90/90 loaded, no broken images; POS catalog: 112.
- Cross-module verification: Products and POS.
- Functional correctness: 9.5/10
- UI/UX clarity: 9/10
- Workflow speed: 9.5/10
- Layout/device stability: 10/10
- Data/payment/session integrity: 9.5/10
- Launch readiness: 9.5/10
- Final score: 9.5
- Status: PASS
- Evidence: Categories included Deep Fried, Drink, Izakaya, Noodle & Rice, Quick Bites, Stir Fried.
- Defects found: Full PDF/image item-by-item audit not part of this case.
- Improvements needed: Execute Phase H exact cross-check.
- Cleanup performed: None.
- Launch decision: High-level menu health passed.

#### SKR-PRELAUNCH-20260725-E2E-008

- Priority: P1
- Roles simulated: Staff
- Browser/device mode: Desktop live browser
- Starting state: POS route, T02 available.
- Test data: T02 drawer.
- Browser steps executed:
  - Opened POS.
  - Opened T02 table drawer.
  - Verified QR handoff controls are gone.
  - Measured product card overlap/overflow.
  - Tested navigation collapse control.
- Expected final state: POS drawer remains usable; QR handoff is removed; layout has no overlap.
- Actual final state: PASS/PARTIAL. Drawer passed; nav collapse did not visibly reduce sidebar in this automation pass.
- Cross-module verification: POS only.
- Functional correctness: 9/10
- UI/UX clarity: 9/10
- Workflow speed: 9/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9/10
- Final score: 9.0
- Status: PASS/PARTIAL
- Evidence: Drawer text had no `Open customer QR`, `QR active`, `QR is ready`, or `Copy QR link`; 112 cards, 0 overlaps, 0 overflow in sample.
- Defects found: Sidebar collapse result unclear; fullscreen skipped to avoid browser permission interference.
- Improvements needed: Re-test toolbar controls during iPad Phase J.
- Cleanup performed: No cart/order sent.
- Launch decision: POS drawer portion launch-ready.

#### SKR-PRELAUNCH-20260725-E2E-009

- Priority: P2
- Roles simulated: Staff
- Browser/device mode: Desktop live browser
- Starting state: Authenticated staff session.
- Test data: Core route list.
- Browser steps executed:
  - Hard navigated to Dashboard, POS, Tables, Orders, Reservations, Queue, Kitchen, Products, Reports, Timetable, Users.
  - Checked obvious blank/error text.
- Expected final state: No blank app routes.
- Actual final state: PASS. All checked routes loaded content.
- Cross-module verification: All major staff modules.
- Functional correctness: 10/10
- UI/UX clarity: 9.5/10
- Workflow speed: 9.5/10
- Layout/device stability: 10/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9.8/10
- Final score: 9.8
- Status: PASS
- Evidence: No route showed obvious 404/503/application error; browser console errors: none.
- Defects found: None.
- Improvements needed: None urgent.
- Cleanup performed: None.
- Launch decision: Launch-ready for route health.

#### SKR-PRELAUNCH-20260725-E2E-010

- Priority: P2
- Roles simulated: Owner
- Browser/device mode: Desktop live browser
- Starting state: Authenticated staff session.
- Test data: Deployed build label.
- Browser steps executed:
  - Read visible app version/build from staff app.
- Expected final state: Browser QA is on expected build.
- Actual final state: PASS. Staff app showed `2.1.6 1367af54`.
- Cross-module verification: Staff routes repeated same build label.
- Functional correctness: 10/10
- UI/UX clarity: 10/10
- Workflow speed: 10/10
- Layout/device stability: 10/10
- Data/payment/session integrity: 10/10
- Launch readiness: 10/10
- Final score: 10.0
- Status: PASS
- Evidence: Visible sidebar/header text.
- Defects found: None.
- Improvements needed: None.
- Cleanup performed: None.
- Launch decision: Correct build confirmed.

### Phase B - Customer QR ordering and session privacy

#### SKR-PRELAUNCH-20260725-E2E-011

- Priority: P0
- Roles simulated: Customer, kitchen, cashier
- Browser/device mode: Desktop live browser
- Starting state: T02 idle/available.
- Test data: T02 QR, Order #231, Rice, SGD 3.00.
- Browser steps executed:
  - Opened T02 QR from staff Tables UI.
  - Confirmed idle T02 QR initially showed `Table Closed`.
  - Staff opened T02 service and clicked `Open table for QR ordering`.
  - Reloaded T02 QR.
  - Customer added Rice and placed order.
  - Checked Staff Orders, Kitchen, and POS.
- Expected final state: First QR order lands on correct table/session.
- Actual final state: PASS. QR showed Order #231 Rice SGD 3.00 Pending; Orders showed T02, Latest #231, 1x Rice, SGD 3.00; Kitchen showed #231 T02 Rice Pending; POS showed T02 Bill #231 live.
- Cross-module verification: QR, Orders, Kitchen, POS.
- Functional correctness: 10/10
- UI/UX clarity: 9.8/10
- Workflow speed: 9/10
- Layout/device stability: 10/10
- Data/payment/session integrity: 10/10
- Launch readiness: 10/10
- Final score: 10.0
- Status: PASS
- Evidence: Live browser text: `Order # 231`, `Rice`, `SGD 3.00`, `#231 · T02`, `Bill #231 live`.
- Defects found: None for first-order path.
- Improvements needed: None.
- Cleanup performed: Order #231 was later terminal-paid and T02 closed/reset.
- Launch decision: Launch-ready for first QR order path.

#### SKR-PRELAUNCH-20260725-E2E-012

- Priority: P0
- Roles simulated: Customer, kitchen, cashier
- Browser/device mode: Desktop live browser
- Starting state: T02 active with QR order #231.
- Test data: Attempted second item A12 Boiled Seasoned Egg.
- Browser steps executed:
  - Reloaded QR after first order.
  - Attempted to add A12 Boiled Seasoned Egg using browser role target.
  - Checked QR and staff Orders.
- Expected final state: Second order/round can be added to current session, not History.
- Actual final state: PARTIAL. The QR page exposed duplicate `Add A12 Boiled Seasoned Egg to cart` controls due Featured/Menu duplication; the generic browser target matched 2 controls and no Place order button appeared. Staff Orders still showed #231 as active/current, not History.
- Cross-module verification: QR and Orders.
- Functional correctness: 8/10
- UI/UX clarity: 8/10
- Workflow speed: 7.5/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 10/10
- Launch readiness: 8.6/10
- Final score: 8.6
- Status: PARTIAL
- Evidence: `eggCount: 2`, `place2Count: 0`; Orders still `Active Orders 1`, `Latest #231`.
- Defects found: Duplicate accessible add labels make item actions ambiguous for automation/accessibility and may affect screen readers.
- Improvements needed: Distinguish Featured and Menu add buttons with contextual labels or dedupe duplicate rendered actions.
- Cleanup performed: No second order was submitted.
- Launch decision: Not a payment/session blocker, but should be fixed for accessibility and reliable QA.

#### SKR-PRELAUNCH-20260725-E2E-013

- Priority: P0
- Roles simulated: Customer
- Browser/device mode: Desktop live browser
- Starting state: T02 active with Order #231.
- Test data: T02 QR current order panel.
- Browser steps executed:
  - Opened/reloaded T02 QR after order placement.
  - Reviewed current order section.
- Expected final state: Customer sees only current session and current bill.
- Actual final state: PASS. QR showed #231, Rice, SGD 3.00, Pending, Pay Now, and did not show previous-customer history.
- Cross-module verification: QR only.
- Functional correctness: 10/10
- UI/UX clarity: 10/10
- Workflow speed: 10/10
- Layout/device stability: 10/10
- Data/payment/session integrity: 10/10
- Launch readiness: 10/10
- Final score: 10.0
- Status: PASS
- Evidence: QR text contained current order only; no history records were displayed.
- Defects found: None.
- Improvements needed: None.
- Cleanup performed: Later paid/closed.
- Launch decision: Launch-ready for QR session privacy while active.

#### SKR-PRELAUNCH-20260725-E2E-014

- Priority: P0
- Roles simulated: Customer, staff
- Browser/device mode: Desktop live browser
- Starting state: T02 paid and closed after order #231.
- Test data: Old T02 QR URL.
- Browser steps executed:
  - Terminal-paid #231 through staff POS.
  - Used final close confirmation for T02.
  - Reloaded old T02 QR.
- Expected final state: Old QR is blocked/closed and does not expose previous bill.
- Actual final state: PASS. Old QR showed `Table Closed`; no #231, no Rice, no Pay Now.
- Cross-module verification: POS and QR.
- Functional correctness: 10/10
- UI/UX clarity: 10/10
- Workflow speed: 9.5/10
- Layout/device stability: 10/10
- Data/payment/session integrity: 10/10
- Launch readiness: 10/10
- Final score: 10.0
- Status: PASS
- Evidence: POS `T02 is clear and ready for the next cashier bill`; QR `Table Closed`.
- Defects found: None.
- Improvements needed: None.
- Cleanup performed: T02 reset; open bills returned to 0.
- Launch decision: Launch-ready for closed QR privacy.

#### SKR-PRELAUNCH-20260725-E2E-015

- Priority: P0
- Roles simulated: Customer, cashier
- Browser/device mode: Desktop live browser
- Starting state: T02 active order #231 before payment.
- Test data: Payment panels.
- Browser steps executed:
  - Reviewed QR current order and Pay Now area.
  - Opened staff POS payment panel.
  - Verified payment options and explanatory text.
- Expected final state: Customer checkout has no Cash; staff payment choices are clear.
- Actual final state: PASS/PARTIAL. QR text had Pay Now and no Cash. Staff panel showed Staff Cash and Terminal, with note: customer QR checkout shows HitPay/card-at-table only. Direct HitPay sandbox was not run in this case.
- Cross-module verification: QR and POS payment panel.
- Functional correctness: 9/10
- UI/UX clarity: 9.5/10
- Workflow speed: 9/10
- Layout/device stability: 9.5/10
- Data/payment/session integrity: 9/10
- Launch readiness: 9.2/10
- Final score: 9.2
- Status: PASS/PARTIAL
- Evidence: QR `hasCash: false`; staff POS text clearly differentiates staff cash vs customer checkout.
- Defects found: HitPay not executed in this scenario.
- Improvements needed: Run HitPay success/abandon in Phase E.
- Cleanup performed: Staff terminal payment used to settle #231.
- Launch decision: Customer no-Cash invariant passed; HitPay remains separate proof.

#### SKR-PRELAUNCH-20260725-E2E-016

- Priority: P1
- Roles simulated: Customer
- Browser/device mode: Desktop live browser
- Starting state: QR active with current order #231.
- Test data: A12 add attempt.
- Browser steps executed:
  - Attempted add of A12 using accessible name.
- Expected final state: Cart handles rapid add/remove/empty invalid states.
- Actual final state: PARTIAL. Full negative cart stress was not completed; duplicate add labels caused ambiguity.
- Cross-module verification: QR only.
- Functional correctness: 8/10
- UI/UX clarity: 8/10
- Workflow speed: 8/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 9.5/10
- Launch readiness: 8.5/10
- Final score: 8.5
- Status: PARTIAL
- Evidence: Duplicate A12 add controls detected.
- Defects found: Duplicate accessible add labels.
- Improvements needed: Dedicated cart stress later.
- Cleanup performed: No extra cart/order left.
- Launch decision: Needs follow-up, not a P0 blocker.

#### SKR-PRELAUNCH-20260725-E2E-017

- Priority: P1
- Roles simulated: Customer, kitchen
- Browser/device mode: Not run
- Starting state: Not run.
- Test data: None.
- Browser steps executed: Not run in this segment.
- Expected final state: Notes persist to Kitchen.
- Actual final state: NOT RUN.
- Cross-module verification: None.
- Functional correctness: 8/10 placeholder
- UI/UX clarity: 8/10 placeholder
- Workflow speed: 8/10 placeholder
- Layout/device stability: 8/10 placeholder
- Data/payment/session integrity: 8/10 placeholder
- Launch readiness: 8/10 placeholder
- Final score: 8.0
- Status: NOT RUN
- Evidence: None.
- Defects found: Not assessed.
- Improvements needed: Controlled note order.
- Cleanup performed: None.
- Launch decision: Pending.

#### SKR-PRELAUNCH-20260725-E2E-018

- Priority: P1
- Roles simulated: Customer
- Browser/device mode: Desktop live browser
- Starting state: T02 QR active.
- Test data: QR menu.
- Browser steps executed:
  - Reviewed live QR menu.
  - Verified 112 items and visible names/prices including Rice.
- Expected final state: Large menu is visible, scannable, and prices are correct in sampled view.
- Actual final state: PASS/PARTIAL. Menu content loaded and was scannable; exact search interaction not performed.
- Cross-module verification: QR menu.
- Functional correctness: 9/10
- UI/UX clarity: 9/10
- Workflow speed: 8.5/10
- Layout/device stability: 9.5/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9/10
- Final score: 9.0
- Status: PASS/PARTIAL
- Evidence: QR showed `Menu 112 items`, Rice SGD 3.00, categories and prices.
- Defects found: None in sampled browsing.
- Improvements needed: Run exact search/category tests.
- Cleanup performed: None.
- Launch decision: Sample menu browsing ready; exact search pending.

#### SKR-PRELAUNCH-20260725-E2E-019

- Priority: P1
- Roles simulated: Customer
- Browser/device mode: Desktop only in this segment
- Starting state: QR active.
- Test data: QR menu with 96 images.
- Browser steps executed:
  - Loaded QR menu after QR activation.
  - Checked initial image load count and menu length.
- Expected final state: Menu usable on iPad/mobile.
- Actual final state: PARTIAL. Desktop QR loaded large menu; iPad/mobile add/remove/submit was not run here.
- Cross-module verification: QR only.
- Functional correctness: 9/10
- UI/UX clarity: 8.5/10
- Workflow speed: 8/10
- Layout/device stability: 8.5/10
- Data/payment/session integrity: 10/10
- Launch readiness: 8.8/10
- Final score: 8.8
- Status: PARTIAL
- Evidence: QR menu loaded 112 items; images began loading.
- Defects found: Not assessed on iPad in this segment.
- Improvements needed: Device phase must run.
- Cleanup performed: None.
- Launch decision: Pending iPad proof.

#### SKR-PRELAUNCH-20260725-E2E-020

- Priority: P2
- Roles simulated: Staff, customer
- Browser/device mode: Desktop live browser
- Starting state: Staff and QR tabs open.
- Test data: T02 QR and staff POS.
- Browser steps executed:
  - Used staff tab and T02 QR tab.
  - Reloaded old QR after close.
- Expected final state: Same table/session remains understandable across tabs.
- Actual final state: PARTIAL. Two-tab safety after close passed; simultaneous duplicate QR ordering was not fully exercised.
- Cross-module verification: Staff POS and QR.
- Functional correctness: 9/10
- UI/UX clarity: 8.5/10
- Workflow speed: 8/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 10/10
- Launch readiness: 8.8/10
- Final score: 8.8
- Status: PARTIAL
- Evidence: Staff and QR tabs remained separate; old QR did not leak after close.
- Defects found: None in close-state tab behavior.
- Improvements needed: Multi-QR simultaneous active ordering still pending.
- Cleanup performed: T02 closed/reset.
- Launch decision: Partial pass.

### Phase C - Reservations to seating to QR/order/payment/close

#### SKR-PRELAUNCH-20260725-E2E-021

- Priority: P0
- Roles simulated: Customer, host, kitchen, cashier
- Browser/device mode: Live desktop browser
- Starting state: Public booking page available; staff logged in after Render wake.
- Test data: Reservation #94, `QA Prelaunch C021`, party 2, phone `+65 9123 4521`, email `ralf.roeber@sakario.sg`, allergy note `QA shellfish allergy note`; T07; QR order #232 A7 Edamame SGD 6.00.
- Browser steps executed:
  - Opened `https://order.sakorio.com/book/1`.
  - Selected 2026-07-25 20:00 and submitted the public reservation.
  - Confirmed the public page showed `Reservation confirmed`, reservation #94, normalized phone `+6591234521`.
  - Opened staff Reservations, confirmed #94 appeared with arrival window open, customer notes, and allergy note.
  - Clicked `Seat at table`; verified suitable choices `Seat at T07` and `Seat at T04`; seated at T07.
  - Confirmed POS handoff: `T07 opened from reservation handoff for QA Prelaunch C021`.
  - Opened reservation `Open QR/menu`; used fallback link `Open customer ordering page`.
  - On customer QR, confirmed T07 menu active with 112 items and `No active order`.
  - Added A7 Edamame and clicked `Place order`; confirmed customer order #232 Pending SGD 6.00 with Pay Now and no Cash.
  - Opened Orders; confirmed active T07 ticket #232.
  - Opened Kitchen; started #232, moved it ready, then marked served/delivered.
  - Opened POS T07; terminal-paid SGD 6.00.
  - Closed table with final confirmation; confirmed linked reservation #94 was finished automatically.
  - Reloaded old T07 QR; confirmed it showed `Table Closed` and did not expose #232/A7/Pay Now.
- Expected final state: Full reservation lifecycle succeeds and no old QR/session data leaks after close.
- Actual final state: PASS. Lifecycle completed and cleaned.
- Cross-module verification: Public booking, Reservations, Tables, QR, Orders, Kitchen, POS.
- Functional correctness: 10/10
- UI/UX clarity: 9.5/10
- Workflow speed: 9.5/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9.8/10
- Final score: 9.8
- Status: PASS
- Evidence: `Reservation confirmed #94`; `T07 opened from reservation handoff`; QR order `#232`; KDS `Ticket #232 served`; POS `Terminal payment recorded for T07`; close toast `Linked reservation #94 was finished`; QR after close `Table Closed`.
- Defects found: Tables tab `Open menu` and `Copy` for T07 did not open/copy in this browser pass. The Reservations fallback link worked and allowed the workflow to continue.
- Improvements needed: Make Tables tab QR handoff show the same fallback link/status as Reservations when popup/copy is blocked.
- Cleanup performed: T07 closed/reset; reservation #94 auto-finished.
- Launch decision: Ready for core reservation lifecycle; Tables QR handoff polish recommended.

#### SKR-PRELAUNCH-20260725-E2E-022 to SKR-PRELAUNCH-20260725-E2E-030

- 022 PASS/PARTIAL 9.2: Phone guidance is visible and valid phone booking/search worked. Invalid-phone correction remains to be executed.
- 023 PARTIAL 8.8: Seat assignment panel showed suitable tables and accessible labels. Manual staff-created reservation/edit path remains pending.
- 024 PASS 9.6: Same-day upcoming reservation was seatable immediately during arrival window and QR ordering worked.
- 025 PARTIAL 8.5: Reservation page correctly showed no queue conflict for #94. Late-arrival-with-queue case still pending.
- 026 NOT RUN: Cancel/no-show prevention still pending.
- 027 PARTIAL 8.8: Move controls were visible for seated T07 before order. Move-before-order not executed.
- 028 PARTIAL 8.8: Active bill integrity held through order/payment/close. Move-after-order not executed.
- 029 PASS/PARTIAL 9.0: Normal notes/allergy wrapped cleanly on desktop. Long-name/iPad wrapping pending.
- 030 NOT RUN: Parallel reservations cross-link test pending.

### Phase D - Queue and walk-in lifecycle

#### SKR-PRELAUNCH-20260725-E2E-031

- Priority: P0
- Roles simulated: Customer, host, kitchen, cashier
- Browser/device mode: Live desktop browser
- Starting state: T07 reset after reservation lifecycle; queue active count 0.
- Test data: Public waitlist Q0053, `QA Queue D031`, phone `+65 9123 4531`, party 2, note `QA queue to seat to QR workflow`; T07; QR order #233 A12 Boiled Seasoned Egg SGD 2.00.
- Browser steps executed:
  - Opened public waitlist page.
  - Entered queue guest details and joined queue.
  - Confirmed public status page showed Q0053, position 1, party 2, quoted wait host-confirming.
  - Opened staff Queue; confirmed web waitlist guest appeared with phone, note, party size, waiting lane, and selected guest panel.
  - Verified recommendation engine showed T07 as exact-fit best table and T04 as larger backup with clear spare-seat explanation.
  - Seated queue guest at T07.
  - Confirmed POS handoff `T07 opened from queue handoff for QA Queue D031`.
  - Opened permanent T07 QR URL and confirmed clean new session with no active order.
  - Added A12 Boiled Seasoned Egg and placed QR order #233.
  - Verified KDS received #233, started it, marked ready, then served/delivered.
  - Opened POS T07, confirmed bill #233 payable SGD 2.00, terminal-paid it, then closed/reset T07.
  - Reloaded public queue page and confirmed it returned to join form with 0 parties ahead.
- Expected final state: Queue guest can join, host seats, QR order reaches kitchen, cashier settles, table resets, public queue status clears.
- Actual final state: PASS.
- Cross-module verification: Public waitlist, Queue, Tables/POS, QR, Kitchen, payment/close.
- Functional correctness: 10/10
- UI/UX clarity: 9.5/10
- Workflow speed: 9.5/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9.8/10
- Final score: 9.8
- Status: PASS
- Evidence: Public `Q0053`; Queue `QA Queue D031 WEB WAITLIST`; recommendation `Seat QA Queue D031 at T07`; POS `T07 opened from queue handoff`; QR order `#233`; KDS `Ticket #233 served`; POS `Terminal payment recorded for T07`; final `T07 is clear`.
- Defects found: None in core queue lifecycle. Same broader QR handoff concern remains from Tables: direct table admin Open menu/Copy was unreliable, while known/permanent QR worked.
- Improvements needed: Add the reservation-style fallback link to every table QR handoff path.
- Cleanup performed: T07 closed/reset; public queue page cleared to join form.
- Launch decision: Core queue lifecycle ready.

#### SKR-PRELAUNCH-20260725-E2E-032 to SKR-PRELAUNCH-20260725-E2E-040

- 032 PARTIAL 8.8: Manual walk-in form was visible with fields for guest, phone, party size, quoted wait, preferred floor/seats, notes, and arrived-now. Staff-created queue submission remains pending.
- 033 NOT RUN: Duplicate queue detection remains pending.
- 034 PASS/PARTIAL 9.0: Best-fit/backup table recommendations were clear. Too-small table block was not forced.
- 035 NOT RUN: Leave/cancel/rejoin flow remains pending.
- 036 PARTIAL 8.8: Notify/back-to-waiting controls and lane counters were visible. Notify transition not executed.
- 037 PASS/PARTIAL 9.0: Empty seated queue table initially offered safe release before ordering. Release action not executed.
- 038 PARTIAL 8.5: Include-closed/show-stale filters visible. Archive/stale cleanup not executed.
- 039 PARTIAL 8.5: Queue-to-reservation form visible. Conversion not submitted.
- 040 PARTIAL 8.5: Queue note displayed cleanly on desktop. iPad view pending.

### Phase E - POS cashier table service and payments

Live build observed for this phase: `2.1.6 a7e24524`.

#### SKR-PRELAUNCH-20260725-E2E-041

- Priority: P0
- Roles simulated: Cashier, kitchen
- Browser/device mode: Live desktop browser
- Starting state: T03 available; open bills 0.
- Test data: T03, order #234, A12 Boiled Seasoned Egg SGD 2.00.
- Browser steps executed:
  - Opened live POS and selected T03.
  - Added A12 Boiled Seasoned Egg from POS product grid.
  - Sent order #234 from POS.
  - Opened Kitchen; confirmed `#234 · T03` appeared in New tickets.
  - Advanced ticket through Start ticket, Ready for pass, and Served / Delivered.
  - Returned to POS T03 and verified bill #234 payable SGD 2.00.
  - Terminal-paid SGD 2.00.
  - Clicked Close table and confirmed the final confirmation.
  - Reloaded POS and confirmed T03 returned to Available / Ready for order.
- Expected final state: POS table-first order reaches kitchen, can be paid, and table resets cleanly.
- Actual final state: PASS with stale-state UX note.
- Cross-module verification: POS, Kitchen, Tables board.
- Functional correctness: 10/10
- UI/UX clarity: 8.5/10
- Workflow speed: 8.5/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9.2/10
- Final score: 9.2
- Status: PASS
- Evidence: `Order #234 sent for T03`; KDS `Ticket #234 served`; POS `Terminal payment recorded for T03`; final T03 board `Available / Ready for order`.
- Defects found: KDS start needed reload before lane visually moved from Pending to Preparing. After POS close, success toast appeared immediately but table card fully reset after reload.
- Improvements needed: Immediate refresh/reconcile after KDS status transition and table close.
- Cleanup performed: T03 paid and closed/reset.
- Launch decision: Core POS table-first service flow ready.

#### SKR-PRELAUNCH-20260725-E2E-042

- Priority: P0
- Roles simulated: Customer, cashier
- Browser/device mode: Live desktop browser
- Starting state: T04 idle/available.
- Test data: T04 QR order #235 A7 Edamame SGD 6.00; POS add-on A12 Boiled Seasoned Egg SGD 2.00.
- Browser steps executed:
  - Opened Tables, expanded T04 More / waiter / QR, activated T04.
  - Used the new visible QR handoff fallback and opened fixed T04 QR URL.
  - Customer QR placed A7 Edamame order #235 for SGD 6.00.
  - Opened staff POS T04/#235 and verified live bill SGD 6.00.
  - Added A12 Boiled Seasoned Egg in POS; cart showed 2 items / SGD 8.00 before sending.
  - Sent POS add-on round.
  - Reloaded POS T04 and confirmed bill updated to 2 items / SGD 8.00.
  - Terminal-paid SGD 8.00 and closed/reset T04.
- Expected final state: QR and cashier add-on entries remain one active bill until table close.
- Actual final state: PASS/PARTIAL. Backend/bill truth correct after reload; immediate drawer state was stale.
- Cross-module verification: Tables QR handoff, QR ordering, POS add-on, terminal payment, table close.
- Functional correctness: 9/10
- UI/UX clarity: 8/10
- Workflow speed: 8/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 10/10
- Launch readiness: 8.8/10
- Final score: 8.8
- Status: PASS/PARTIAL
- Evidence: T04 QR fallback link visible; QR order #235; POS cart total SGD 8.00; after reload `T04 · 2 items · SGD 8.00`; `Terminal payment recorded for T04`.
- Defects found: After `Add-on round sent to bill #235`, the drawer initially still displayed 1 item / SGD 6.00 until reload.
- Improvements needed: Refresh active order/bill summary immediately after add-on send.
- Cleanup performed: T04 terminal-paid and closed/reset.
- Launch decision: Data integrity ready; UX refresh polish needed.

#### SKR-PRELAUNCH-20260725-E2E-043

- Priority: P0
- Roles simulated: Cashier
- Browser/device mode: Live desktop browser
- Starting state: T05 available.
- Test data: T05 order #236, A10 Cold Tofu SGD 5.00.
- Browser steps executed:
  - Selected T05 in POS.
  - Added A10 Cold Tofu and sent order #236.
  - Verified unpaid bill #236 after reload: 1 item / SGD 5.00.
  - Checked POS workflow: unpaid table offered Open bill / Resume order / Pay bill, not direct close.
  - Terminal-paid SGD 5.00.
  - Verified final close confirmation and closed/reset T05.
- Expected final state: Unpaid table cannot be closed; paid table close requires explicit confirmation.
- Actual final state: PASS/PARTIAL.
- Cross-module verification: POS table drawer, payment guardrail, close confirmation.
- Functional correctness: 10/10
- UI/UX clarity: 8.5/10
- Workflow speed: 8/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9/10
- Final score: 9.0
- Status: PASS/PARTIAL
- Evidence: `Bill #236 payable SGD 5.00`; unpaid state had no close action; after terminal payment final confirmation showed `Close T05?`.
- Defects found: After order send, drawer briefly showed T05 as ready / SGD 0.00 until reload.
- Improvements needed: Same immediate POS refresh issue after send.
- Cleanup performed: T05 terminal-paid and closed/reset.
- Launch decision: Payment/close guardrail ready.

#### SKR-PRELAUNCH-20260725-E2E-044

- Priority: P0
- Roles simulated: Customer, cashier
- Browser/device mode: Live desktop browser
- Starting state: T07 available.
- Test data: T07 QR order #237, A12 Boiled Seasoned Egg SGD 2.00, HitPay sandbox reference `a257f187-861d-4cb2-b1d1-1ecd0f58b886`.
- Browser steps executed:
  - Activated T07 from Tables and opened visible fixed QR handoff link.
  - Customer placed QR order #237.
  - Clicked Pay Now; modal offered Pay with HitPay and Pay with Card at Table.
  - Clicked Pay with HitPay and landed on `checkout.sandbox.hit-pay.com`.
  - Filled sandbox email and Stripe test card in HitPay/Stripe secure iframe.
  - Submitted payment and observed Sakorio return URL `/payment-success?order_id=237&provider=hitpay&status=completed&reference=a257f187-861d-4cb2-b1d1-1ecd0f58b886`.
  - Opened staff POS T07/#237 and verified paid state, SGD 0 due, close-table-only flow.
  - Closed/reset T07.
- Expected final state: HitPay success is truthful in Sakorio; staff sees paid, not payable.
- Actual final state: PASS.
- Cross-module verification: Tables fixed QR, QR checkout modal, HitPay sandbox, Sakorio payment return, staff POS close.
- Functional correctness: 10/10
- UI/UX clarity: 9.5/10
- Workflow speed: 9.5/10
- Layout/device stability: 10/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9.8/10
- Final score: 9.8
- Status: PASS
- Evidence: HitPay checkout for `Order #237 at Ajisen Ramen - T07`; Sakorio `Payment successful`; staff POS `Last bill #237 paid`.
- Defects found: None urgent.
- Improvements needed: Pay Now opens an intermediate payment-method modal; this is acceptable but should be expected in training.
- Cleanup performed: T07 closed/reset.
- Launch decision: HitPay success path ready.

#### SKR-PRELAUNCH-20260725-E2E-045

- Priority: P0
- Roles simulated: Customer, cashier
- Browser/device mode: Live desktop browser
- Starting state: T08 available.
- Test data: T08 QR order #238, A5 Chanja SGD 5.00, abandoned HitPay reference `a257f3ca-6eb0-4fa8-b0be-d50fb2e622d2`.
- Browser steps executed:
  - Activated T08 and opened visible fixed QR handoff link.
  - Customer placed QR order #238.
  - Clicked Pay Now, selected Pay with HitPay, and landed on HitPay sandbox checkout.
  - Did not submit payment.
  - Opened staff POS T08/#238 and verified bill remained open/unpaid at SGD 5.00.
  - Terminal-paid and closed/reset T08 for cleanup.
- Expected final state: Abandoned HitPay does not mark Sakorio bill as paid.
- Actual final state: PASS/PARTIAL.
- Cross-module verification: QR, HitPay sandbox checkout, staff POS payment truth.
- Functional correctness: 10/10
- UI/UX clarity: 8.5/10
- Workflow speed: 8.5/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9.2/10
- Final score: 9.2
- Status: PASS/PARTIAL
- Evidence: HitPay checkout opened for #238; staff POS still showed `Bill #238 payable SGD 5.00`; no false paid state.
- Defects found: HitPay sandbox Back/browser-back did not return cleanly in this browser run.
- Improvements needed: Add clearer customer cancel/return guidance if HitPay checkout is abandoned.
- Cleanup performed: T08 terminal-paid and closed/reset.
- Launch decision: Payment truth ready; abandon UX can be improved.

#### SKR-PRELAUNCH-20260725-E2E-046

- Priority: P1
- Roles simulated: Cashier
- Browser/device mode: Live desktop browser
- Starting state: T01 and T02 available.
- Test data: T01 unsent A12 cart; T02 blank.
- Browser steps executed:
  - Selected T01 and added A12 without sending.
  - Switched back to floor and selected T02.
  - Verified T02 did not inherit T01 cart.
  - Returned to T01 and verified the unsent A12 cart was still present.
  - Cleared T01 cart and released the empty seating.
- Expected final state: Table carts/orders do not mix when cashier switches tables.
- Actual final state: PASS/PARTIAL.
- Cross-module verification: POS table board and table drawer state.
- Functional correctness: 9.5/10
- UI/UX clarity: 8/10
- Workflow speed: 8/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 9.5/10
- Launch readiness: 8.8/10
- Final score: 8.8
- Status: PASS/PARTIAL
- Evidence: T01 cart showed A12/SGD 2.00; T02 cart empty; returning to T01 restored A12/SGD 2.00.
- Defects found: After release, board said T01 available but drawer copy still showed release-table context until navigation/refresh.
- Improvements needed: Refresh drawer state immediately after empty-table release.
- Cleanup performed: T01 cart cleared and released.
- Launch decision: Isolation ready; drawer stale-copy polish needed.

#### SKR-PRELAUNCH-20260725-E2E-047

- Priority: P1
- Roles simulated: Cashier
- Browser/device mode: Live desktop browser
- Starting state: T02 drawer open; no sent order.
- Test data: Search `Chita Highball`; category `Deep Fried Menu`.
- Browser steps executed:
  - Used POS menu search for `Chita Highball`.
  - Verified result showed Drink Menu / Chita Highball / SGD 13.00.
  - Cleared search with keyboard and clicked Deep Fried Menu category chip.
  - Verified 8 Deep Fried items displayed, including add (1pcs)Deep Fried Gyoza SGD 2.00, C1 SGD 6.00, C1.5 SGD 11.00, C2 SGD 7.00, C2.5 SGD 12.00, C3 SGD 6.00, C4 SGD 16.00, C5 SGD 16.00.
- Expected final state: Cashier can quickly find exact imported item and browse category with correct prices.
- Actual final state: PASS/PARTIAL.
- Cross-module verification: POS imported menu/search/category filtering.
- Functional correctness: 9.5/10
- UI/UX clarity: 8.5/10
- Workflow speed: 8.5/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9/10
- Final score: 9.0
- Status: PASS/PARTIAL
- Evidence: `Chita Highball SGD 13.00`; Deep Fried Menu list with 8 expected prices.
- Defects found: Automation `fill('')` did not clear search; real keyboard select-all/backspace did clear it. This may indicate input event handling can be made more robust.
- Improvements needed: Add a visible clear-search `x` button and ensure filter reset is obvious on iPad.
- Cleanup performed: No sent order.
- Launch decision: Search usable; clear-search polish recommended.

#### SKR-PRELAUNCH-20260725-E2E-048

- Priority: P1
- Roles simulated: Cashier, manager
- Browser/device mode: Live desktop browser
- Starting state: T02 drawer open; no sent order.
- Test data: Wrong item `C1 (2pcs)Deep Fried Chicken` SGD 6.00.
- Browser steps executed:
  - Added wrong item before kitchen send/payment.
  - Verified cart showed C1 and SGD 6.00.
  - Clicked Clear before send.
  - Verified T02 returned to zero items / SGD 0.00 and no kitchen send occurred.
- Expected final state: Wrong item can be corrected safely before send; manager void/correction is clear if already sent.
- Actual final state: PASS/PARTIAL.
- Cross-module verification: POS cart correction.
- Functional correctness: 9/10
- UI/UX clarity: 8/10
- Workflow speed: 8.5/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 9/10
- Launch readiness: 8.5/10
- Final score: 8.5
- Status: PASS/PARTIAL
- Evidence: Cart before clear showed C1/SGD 6.00; after clear T02 showed ready/zero bill.
- Defects found: Post-send manager void/refund/reopen path not executed in this case.
- Improvements needed: Run dedicated manager correction pass for sent/paid bills.
- Cleanup performed: T02 cart cleared; no order sent.
- Launch decision: Pre-send correction ready; manager correction not signed off yet.

#### SKR-PRELAUNCH-20260725-E2E-049

- Priority: P1
- Roles simulated: Manager, cashier
- Browser/device mode: Live desktop browser
- Starting state: T08 recently closed after #238.
- Test data: T08 order #238, A5 Chanja SGD 5.00.
- Browser steps executed:
  - Opened POS T08.
  - Clicked History.
  - Verified Previous Sessions showed recent order #238, Paid, 1x A5 Chanja, Terminal, SGD 5.00.
  - Confirmed current T08 had zero active orders and history count incremented to 18.
- Expected final state: Recently closed bill is easy to review in History; reopen/refund policy is clear.
- Actual final state: PASS/PARTIAL.
- Cross-module verification: POS table history.
- Functional correctness: 9/10
- UI/UX clarity: 8.5/10
- Workflow speed: 9/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 9/10
- Launch readiness: 8.8/10
- Final score: 8.8
- Status: PASS/PARTIAL
- Evidence: `Order #238 Paid 1x A5 Chanja Terminal SGD 5.00`.
- Defects found: Older historical demo/test entries remain visible with unrelated legacy item names.
- Improvements needed: Clean launch/staging historical demo data or label archived demo data; run reopen/refund manager policy pass.
- Cleanup performed: None needed.
- Launch decision: History review usable; launch-data cleanup recommended.

#### SKR-PRELAUNCH-20260725-E2E-050

- Priority: P2
- Roles simulated: Cashier
- Browser/device mode: Attempted iPad landscape via in-app browser viewport capability.
- Starting state: T02 available; no order sent.
- Test data: Viewport target `1024x768`; observed browser remained `1280x720`.
- Browser steps executed:
  - Requested browser viewport override to 1024x768.
  - Opened POS T02 in existing and fresh tabs.
  - Measured reported viewport and POS drawer/menu/cart rectangles.
  - Verified at the available landscape size the payment lane stayed visible and menu/cart did not overlap.
  - Reset viewport override.
- Expected final state: iPad landscape payment lane remains reachable with no overlap/scroll trap.
- Actual final state: PARTIAL. Layout looked usable at available landscape size, but true 1024x768 could not be simulated because the in-app browser kept reporting 1280x720.
- Cross-module verification: POS responsive layout sampling.
- Functional correctness: 8.5/10
- UI/UX clarity: 8.5/10
- Workflow speed: 8.5/10
- Layout/device stability: 8/10
- Data/payment/session integrity: 10/10
- Launch readiness: 8.5/10
- Final score: 8.5
- Status: PARTIAL
- Evidence: Reported viewport stayed `1280x720`; menu pane x=29/w=878, cart pane x=907/w=336, Pay button visible at y=712.
- Defects found: Browser viewport override unavailable/ineffective for this run, so true iPad 1024x768 remains pending.
- Improvements needed: Run a real iPad/Safari or Chrome devtools device-mode check before final launch signoff.
- Cleanup performed: Viewport reset.
- Launch decision: Needs true-device verification.

#### SKR-PRELAUNCH-20260725-E2E-051

- Priority: P0
- Roles simulated: Cashier, manager
- Browser/device mode: Live desktop browser
- Live build: `2.1.6 dd4aad50`
- Starting state: T03 available; Orders history count 12; no active bill.
- Test data: T03, order #240, 1x A7 Edamame, SGD 6.00, terminal payment.
- Browser steps executed:
  - Opened live POS and selected T03.
  - Added A7 Edamame and sent the order to kitchen.
  - Verified POS stayed on T03 with Bill #240, 1 current ticket, SGD 6.00.
  - Opened Orders filtered for T03.
  - Verified Orders current view showed 1 active ticket, latest #240, 1x A7 Edamame, SGD 6.00.
  - Returned to POS, opened Bill / Pay, charged terminal for SGD 6.00.
  - Pressed Close table and verified final confirmation appeared.
  - Confirmed `Yes, close table`.
  - Verified T03 reset to Available / Ready for order and stale #240 text disappeared from POS board.
  - Reopened Orders filtered for T03 and verified Order History count 13 with #240, T03, 1x A7 Edamame, SGD 6.00, Paid.
- Expected final state: Active table order appears in current Orders until payment/close; after close it moves to History.
- Actual final state: PASS after one live-found fix.
- Cross-module verification: POS table lifecycle, Orders current view, Orders history view.
- Functional correctness: 10/10
- UI/UX clarity: 9/10
- Workflow speed: 9/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9.5/10
- Final score: 9.5
- Status: PASS
- Evidence: Current Orders showed `Latest #240`, `1x A7 Edamame`, SGD 6.00; History showed `#240 T03 1x A7 Edamame SGD 6.00 Paid`.
- Defects found: Initial live run exposed a desktop/landscape paid-close gap: after terminal payment, the desktop bill dock could show “ready to clear” without a clear inline `Yes, close table` action. This was fixed in commit `dd4aad50`.
- Improvements completed: Added final confirmation to desktop checkout outcome and ready-to-clear bill dock branches, matching the POS drawer behavior.
- Cleanup performed: T03 order #240 terminal-paid and closed; T03 reset to Available / Ready.
- Launch decision: Current/history boundary is ready for launch for this flow.

#### SKR-PRELAUNCH-20260725-E2E-052

- Priority: P0
- Roles simulated: Host, customer, kitchen, cashier
- Browser/device mode: Live browser at observed 1280x720 landscape height
- Live build: `2.1.6 cf39262f`
- Starting state: T08 seated/start-order state; fixed QR URL existed but needed staff-open verification.
- Test data: T08 fixed QR, order #241, 1x A12 Boiled Seasoned Egg SGD 2.00, 1x A7 Edamame SGD 6.00, terminal payment SGD 8.00.
- Browser steps executed:
  - Opened live Tables and verified the live build reached `cf39262f`.
  - Verified T08 fixed QR ordering could be opened from the Tables table-service header after the fixed-QR activation polish.
  - Opened the fixed customer QR URL for T08.
  - Confirmed customer QR did not ask for customer name and showed segmented category headers instead of a single menu wall.
  - Opened A12 product detail and measured the new inline `Add to cart · SGD 2.00` button inside the 1280x720 viewport.
  - Added A12 from product detail and placed the first customer order.
  - Verified customer page showed Order #241, Pending, SGD 2.00.
  - Added A7 Edamame as a second round from the same QR page.
  - Verified the second submit button changed to `Add to order`, and after submission #241 remained the same current order with both A12 and A7, total SGD 8.00.
  - Opened staff Orders and verified T08 showed one active ticket, latest #241, SGD 8.00.
  - Opened ticket detail and verified both A12 and A7 were present on #241.
  - Opened Kitchen & beverages and verified #241/T08 appeared with both items in New tickets.
  - Advanced #241 through `Start ticket` → `Ready for pass` → `Served / Delivered`.
  - Verified KDS returned to zero active tickets and showed the served completion toast/countdown.
  - Opened POS T08/#241, charged terminal for SGD 8.00, used final close confirmation, and verified T08 reset to Available / Ready for order.
- Expected final state: Fixed QR table can accept repeat customer rounds into one active session; KDS sees the ticket; cashier can pay and close; table resets cleanly.
- Actual final state: PASS after live-found UI fixes.
- Cross-module verification: Tables fixed QR, customer QR menu, Orders current ticket, KDS status lanes, POS terminal payment, POS close confirmation, table reset.
- Functional correctness: 10/10
- UI/UX clarity: 9/10
- Workflow speed: 9/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9.5/10
- Final score: 9.5
- Status: PASS
- Evidence: Customer current order showed `Order # 241`, `A7 Edamame`, `A12 Boiled Seasoned Egg`, SGD 8.00; Orders showed `Latest #241`; KDS showed `#241 · T08`; POS showed `T08 is clear and ready for the next cashier bill`.
- Defects found: Fixed QR activation was not obvious above the fold, and product-detail add-to-cart initially rendered below the usable viewport on the live 1280x720 browser.
- Improvements completed: Added above-fold fixed QR activation in Tables; added customer QR inline add-to-cart and compact tablet/landscape product detail sheet.
- Cleanup performed: #241 served in KDS, terminal-paid, closed; T08 reset to Available / Ready.
- Launch decision: Fixed QR multi-round customer ordering is ready for launch at the tested landscape/browser size. True physical iPad pass remains useful before production go-live.

#### SKR-PRELAUNCH-20260725-E2E-053

- Priority: P1
- Roles simulated: Cashier, manager
- Browser/device mode: Live desktop browser
- Live build: `2.1.6 cf39262f`
- Starting state: E2E-052 had just closed paid T08/#241. No unpaid Orders tickets were present, so a controlled T07 test bill was created for unpaid/current filtering.
- Test data: T07, order #242, 1x A12 Boiled Seasoned Egg, SGD 2.00, terminal payment.
- Browser steps executed:
  - Opened live Orders and confirmed #241/T08 appeared in Order History with Paid status, SGD 8.00, A7 Edamame + A12 Boiled Seasoned Egg.
  - Searched Order History for `241`.
  - Searched Order History for `T08`.
  - Switched to Active Orders and Not Paid Yet before creating a new unpaid order.
  - Opened POS T07 and added A12 Boiled Seasoned Egg to the cart.
  - Sent the order to kitchen/payment flow, creating Order #242.
  - Returned to Orders and verified Active Orders showed T07, latest #242, SGD 2.00, 1 active ticket.
  - Searched Active Orders for `242` and verified one matching T07 ticket.
  - Switched to Not Paid Yet while #242 was still unpaid/current.
  - Paid #242 by terminal from POS without closing the table.
  - Switched to Paid - awaiting close and verified #242/T07 appeared with SGD 2.00, payment by card terminal, and close action.
  - Closed T07 from POS using final confirmation.
  - Searched Order History for `242` and verified #242/T07/A12/SGD 2.00/Paid was present.
- Expected final state: Staff can quickly find the correct live, unpaid, paid-awaiting-close, and closed/history bill by table or order number.
- Actual final state: PASS/PARTIAL.
- Cross-module verification: Orders filters/search, POS live bill creation, POS terminal payment, POS final close, History.
- Functional correctness: 8/10
- UI/UX clarity: 7/10
- Workflow speed: 8/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 9/10
- Launch readiness: 8/10
- Final score: 8.0
- Status: PASS/PARTIAL
- Evidence:
  - Active Orders showed `T07`, `Latest #242`, `SGD 2.00`, `#242 · 1x A12 Boiled Seasoned Egg`.
  - Paid - awaiting close showed `T07`, `Latest #242`, `SETTLEMENT RECORDED`, `Paid by card terminal`, `Close table`.
  - POS cleanup showed `T07 is clear and ready for the next cashier bill`.
  - History search showed `#242`, `T07`, `1x A12 Boiled Seasoned Egg`, `SGD 2.00`, `Paid`.
- Defects found:
  - `Not Paid Yet` showed `All orders are paid` while #242 was still a live unpaid/current table bill in Active Orders.
  - Exact history search for `241` and `242` returned the correct order at the top, but also unrelated legacy/history rows. This appears to match hidden metadata or broad fields and reduces cashier confidence.
  - Staff POS product cards work visually, but the A12 card was not exposed as a semantic `Add A12...` button; automation had to click the visible card area.
- Improvements recommended:
  - Treat active unpaid table bills as `Not Paid Yet`, or rename the tab to clarify what it excludes.
  - Add exact order-number mode or exact-match prioritization for `#241` / `241` / `242`, especially in History.
  - Visually highlight exact order/table matches and optionally separate “other broad matches.”
  - Improve staff POS product-card accessibility labels so every product has a unique `Add [item] to cart` control.
- Cleanup performed: #242 terminal-paid and closed; T07 reset to Available / Ready.
- Launch decision: Orders can be used operationally, but this is not yet a 10/10 cashier lookup experience. Fix search precision and Not Paid semantics before final production confidence.

#### SKR-PRELAUNCH-20260725-E2E-054

- Priority: P1
- Roles simulated: Manager
- Browser/device mode: Live desktop browser
- Live build: `2.1.6 cf39262f`
- Starting state: #242 had been terminal-paid and closed during E2E-053.
- Test data: Closed paid Order #242, T07, 1x A12 Boiled Seasoned Egg, SGD 2.00.
- Browser steps executed:
  - Opened live Orders.
  - Searched History for `242`.
  - Verified #242 was visible in Order History.
  - Verified visible row fields: order number, table, customer placeholder, item line, total, status, date/time.
  - Clicked the #242 history row to test whether a manager detail drawer/modal opened.
  - Inspected visible buttons/links after row click for detail, invoice, print, export, refund, reopen, or audit actions.
- Expected final state: Manager can open paid order detail and verify item lines, total, payment method, table, and close timestamp.
- Actual final state: PARTIAL.
- Cross-module verification: Orders History/search only.
- Functional correctness: 7/10
- UI/UX clarity: 6/10
- Workflow speed: 7/10
- Layout/device stability: 8/10
- Data/payment/session integrity: 6/10
- Launch readiness: 6.5/10
- Final score: 6.5
- Status: PARTIAL
- Evidence:
  - History row showed `#242`, `T07`, `1x A12 Boiled Seasoned Egg`, `SGD 2.00`, `Paid`, `7/26/2026, 01:16:19`.
  - Clicking the row did not change the page or open any detail panel.
  - Available action controls remained limited to filters/search/refresh; no paid-detail, payment-method, invoice/export, close timestamp, refund, reopen, or audit action appeared in the History row.
- Defects found:
  - Closed paid History does not expose a full order-detail view.
  - Closed paid History row does not show payment method, despite Paid-awaiting-close showing `Paid by card terminal` before the table was closed.
  - Closed paid History row shows one date/time but does not label whether it is order time, payment time, or close time.
  - The page copy mentions invoice print/export, but no visible print/export action is available in this History view.
- Improvements recommended:
  - Add `View details` for closed History rows.
  - Detail panel should show order created time, payment time, close time, payment method/reference, staff/cashier, table, item lines, void/refund/reopen policy, and invoice/receipt action if supported.
  - Label the existing History date column clearly, or split it into `Ordered`, `Paid`, and `Closed`.
  - Preserve payment method in History after close.
- Cleanup performed: None needed; #242 was already closed from E2E-053.
- Launch decision: Not manager-audit ready at 10/10. Operational row-level history exists, but accounting/manager audit detail needs improvement before launch confidence.

#### SKR-PRELAUNCH-20260725-E2E-055

- Priority: P1
- Roles simulated: Cashier, kitchen
- Browser/device mode: Live desktop browser
- Live build: `2.1.6 cf39262f`
- Starting state: T05 available; no open bills.
- Test data: T05, order #243, 1x A12 Boiled Seasoned Egg, SGD 2.00.
- Browser steps executed:
  - Opened POS T05.
  - Added A12 Boiled Seasoned Egg to the cart and sent the order, creating #243.
  - Opened Kitchen & beverages and verified #243/T05/A12 appeared in New tickets.
  - Advanced #243 through `Start ticket` → `Ready for pass` → `Served / Delivered`.
  - Verified KDS showed `Ticket #243 served`, `1 item delivered`, and returned to zero active tickets.
  - Opened Orders before payment.
  - Verified #243 remained under `Awaiting payment`, T05, SGD 2.00, with `Collect payment` available.
  - Verified item line showed `Delivered`, proving served/kitchen-complete did not mark the bill as paid or closed.
  - Clicked `Not Paid Yet` and verified the same #243/T05 awaiting-payment state remained visible.
  - Returned to POS, charged terminal, and closed T05 with final confirmation for cleanup.
- Expected final state: Served tickets remain current/unpaid until cashier payment and table close.
- Actual final state: PASS.
- Cross-module verification: POS order creation, KDS service lifecycle, Orders current/unpaid state, POS terminal payment, POS final close.
- Functional correctness: 10/10
- UI/UX clarity: 8/10
- Workflow speed: 9/10
- Layout/device stability: 9/10
- Data/payment/session integrity: 10/10
- Launch readiness: 9/10
- Final score: 9.0
- Status: PASS
- Evidence:
  - KDS showed `#243 · T05`, A12, then `Ticket #243 served`, `1 item delivered`.
  - Orders showed `Awaiting payment`, `T05`, `Latest #243`, `SGD 2.00`, `Collect payment`, `Delivered`.
  - `Not Paid Yet` also showed #243 after service completion.
  - POS cleanup showed `Terminal payment recorded for T05`, then `T05 is clear and ready for the next cashier bill`.
- Defects found:
  - Orders copy for served/unpaid ticket says `1 ready to close` while the bill is still unpaid; operationally correct due `Awaiting payment` and `Collect payment`, but the phrase could mislead staff into thinking close is available before payment.
  - Staff POS product-card accessibility issue from E2E-053 repeated: visual card click works, but semantic button naming is weak.
- Improvements recommended:
  - Rename the pre-payment served count from `ready to close` to `served / ready for payment`.
  - Keep `Collect payment` as the strongest CTA until settlement.
  - Add semantic accessible labels to POS product cards.
- Cleanup performed: #243 terminal-paid and closed; T05 reset to Available / Ready.
- Launch decision: Served-but-unpaid order integrity is launch-ready; copy polish would bring this closer to 10/10.
