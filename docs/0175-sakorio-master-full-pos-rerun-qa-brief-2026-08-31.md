# Sakorio POS master full-system rerun QA brief

Date: 2026-08-31  
Run prefix: `SKR-MASTER-20260831`  
Target: deployed Sakorio environment, operated through the live browser  
Status: **test specification ready for owner review; execution has not started**  
Prepared as: senior developer/tester launch-certification plan

## 1. Certification objective

This is the master rerun for the complete Sakorio restaurant operating day. It is designed to answer one question: **can a real restaurant launch Sakorio without losing an order, seating the wrong guest, reporting a false payment, exposing another guest's session, missing a kitchen ticket, or leaving staff unable to operate under service pressure?**

The suite contains **150 executable cases**:

- `MASTER-E2E-001` to `MASTER-E2E-100`: complete customer and staff journeys from an initial real-world situation to a reconciled final state.
- `MASTER-XCUT-101` to `MASTER-XCUT-130`: permissions, security, concurrency, recovery, reporting, deployment, and data-integrity tests.
- `MASTER-UX-131` to `MASTER-UX-150`: mobile, Android tablet, iPad simulation, layout, accessibility, usability, and high-volume menu tests.

A route loading or a button responding is not an end-to-end pass. Each case must visibly prove its final state in every affected module and must leave the QA environment clean.

## 2. Live system under test

| Surface | Target |
|---|---|
| Staff portal | `https://staff.sakorio.com` |
| Customer ordering | `https://order.sakorio.com/menu/<table-token>?qr_access=<signed-token>` |
| Public reservation | `https://order.sakorio.com/book/1` |
| Public queue | `https://order.sakorio.com/waitlist/1` |
| Payment | HitPay sandbox reached only from Sakorio |
| Android POS | Installed Sakorio build, used when native printer acceptance is reached |
| Receipt printer | Paired ESC/POS Bluetooth printer through the Sakorio Android printer agent |

At execution start, record the visible application version, commit hash, deployment time, browser version, Android build version, printer model, and local time. The latest previously observed browser build was `2.1.6 89b5fb07`; this is a reference only and must be revalidated.

## 3. Roles and handoffs

The executor must alternate between these real operating roles rather than testing everything as an owner:

| Role | Primary responsibility |
|---|---|
| Customer | Reservation, queue, QR ordering, status, payment request |
| Host | Queue, reservations, capacity, seating, table assignment |
| Waiter | Open table, add rounds, notes, serve, payment request |
| Cashier | Bill truth, payment, receipt, close/reset table |
| Kitchen | Food tickets, notes, progress, ready/served |
| Beverage | Drink tickets and station-specific completion |
| Staff | Profile selection, clock in, break, clock out |
| Manager | Corrections, overrides, backlog, end-day reconciliation |
| Owner/admin | Rates, users, roles, settings, reports, audit |
| Printer agent | Pairing, online state, job consumption, retry behavior |

Credentials must come from the approved credential manager or execution environment. Do not copy passwords, API keys, printer tokens, signed QR tokens, or payment secrets into this document or screenshots.

## 4. Non-negotiable launch invariants

1. A QR guest can see only the current open session for that table, never a previous session or another table.
2. A closed or expired QR session cannot order, pay, or reveal historical bill details.
3. All rounds for one open table stay current until the table is explicitly closed.
4. Reservations shown for today's floor operations are scoped to the restaurant's Singapore calendar day.
5. Queue number, notify state, seating state, and cancellation state update without a guest refresh.
6. Capacity violations are blocked or require an explicit, audited manager override.
7. Table payment states are truthful: `Unpaid`, `Payment requested`, and `Paid` cannot be inferred from navigation or button presses.
8. Customer checkout never offers Cash. Terminal and HitPay requests are not marked paid until confirmed.
9. Unpaid tables cannot be closed accidentally; paid tables require an explicit table-specific confirmation before reset.
10. POS, Tables, Orders, Kitchen, Queue, Reservations, Reports, receipts, and History agree on identity, amount, status, and time.
11. Food and beverage items reach the correct station; a ticket is never silently lost.
12. Order submit, payment, webhook, print, seat, and close operations are idempotent under double-click and refresh.
13. Staff roles cannot access owner-only rates, users, settings, refunds, or overrides.
14. Logout terminates the staff session; protected routes remain protected after refresh and back navigation.
15. Clock-in/out actuals are derived from real actions and appear on the timetable without needing a preplanned shift.
16. Menu names, prices, availability, categories, images, currency, tax, and receipt totals agree.
17. Android printer jobs print once, route correctly, survive a temporary disconnect, and remain auditable.
18. No critical action overlaps, clips, becomes unreachable, or requires precision tapping on supported tablet/mobile layouts.
19. A Render cold start, WebSocket reconnect, or transient network loss does not create false business state.
20. The run ends with no orphan QA bills, tables, queue entries, reservations, shifts, KDS tickets, or print jobs.

## 5. Test-data and safety rules

- Use unique labels: `QA-MASTER-<case-id>-<timestamp>` for guest names, notes, reservations, queue rows, and staff records.
- Use only designated QA tables agreed at execution start. Keep two clean tables available for concurrency tests.
- Use HitPay sandbox only. Never enter real card data or treat a sandbox redirect as payment proof without the Sakorio return state.
- Before any destructive financial action, record the order/table and verify it is QA data.
- User creation, manager overrides, voids, refunds, rate edits, and entitlement changes use disposable QA records only.
- Do not delete unexplained production-looking data. Isolate it, record it as a defect or cleanup gate, and leave it for an authorized manager.
- Every case must restore its starting resources or document why a controlled shared record continues into the next case.
- Browser-visible behavior is the acceptance evidence. Source inspection and automated tests may diagnose a failure but cannot turn an unverified live flow into a pass.

## 6. Browser and device matrix

| Mode | Baseline viewport/use |
|---|---|
| Staff desktop | Chromium, 1440x900 and 1366x768 |
| Android tablet | Physical device where available; 1280x800 landscape and 800x1280 portrait |
| iPad simulation | 1024x768 landscape and 768x1024 portrait |
| Customer mobile A | 390x844 portrait |
| Customer mobile B | 412x915 portrait |
| Narrow mobile | 360x800 portrait |
| Kitchen display | 1280x800 landscape, touch interaction |
| Multi-session | Customer and staff tabs; two staff sessions where safe |

For every supported layout, check page-level horizontal overflow, clipped buttons, sticky panels, virtual keyboard obstruction, orientation change, touch target size, readable focus, and restoration after refresh.

## 7. Execution protocol

For every case:

1. Record starting tables, active bills, queue count, today's reservations, KDS backlog, online printer agents, waiting print jobs, and open shifts when relevant.
2. Create a unique trace label and record every generated ID.
3. Execute each role handoff through the deployed UI.
4. Observe updates in the second role without refreshing first; then refresh to prove persistence.
5. Cross-check every affected module.
6. Capture evidence at the decisive state, including the visible URL/path but redacting tokens.
7. Score the case and log every dimension below 10 with a concrete reason.
8. Perform and prove cleanup.

### Result record template

```md
### SKR-MASTER-20260831-<CASE-ID>

- Start/end time (SGT):
- Build/version:
- Priority and roles:
- Browser/device/viewport:
- Trace label and record IDs:
- Starting state:
- Steps personally executed in the live UI:
- Expected final state:
- Actual final state:
- Cross-module checks:
- Functional correctness /35:
- Data/payment/session integrity /20:
- Usability and workflow speed /15:
- Realtime and recovery /10:
- Layout/accessibility /10:
- Performance/operational readiness /10:
- Total /100 and score /10:
- Status: PASS / PARTIAL / FAIL / BLOCKED / NEEDS-SPEC
- Severity of defects:
- Evidence:
- Improvements required:
- Cleanup proof:
- Launch decision:
```

## 8. Scoring and defect policy

| Dimension | Weight | Pass expectation |
|---|---:|---|
| Functional correctness | 35 | The complete business outcome occurs once and correctly |
| Data/payment/session integrity | 20 | All modules agree; no privacy or financial ambiguity |
| Usability and workflow speed | 15 | A trained operator can finish without guesswork or redundant steps |
| Realtime and recovery | 10 | State updates live and recovers safely from refresh/reconnect |
| Layout/accessibility | 10 | Critical actions are visible, readable, keyboard/touch usable |
| Performance/operational readiness | 10 | Response time and feedback are acceptable during service |

- Pass: at least `90/100` (`9.0/10`) and no P0/P1 defect.
- Launch-critical pass: payment, privacy, order routing, authentication, close/reset, and reporting cases require at least `95/100`.
- A perfect `10/10` means no material improvement was observed; it is not assigned merely because a workflow completed.
- `BLOCKED` and `NEEDS-SPEC` are not passes and must have an owner and retest gate.

| Severity | Definition | Release treatment |
|---|---|---|
| P0 | Privacy breach, false paid state, lost/duplicated charge, cross-tenant leak, destructive data corruption | Immediate stop; release prohibited |
| P1 | Lost order, wrong station, unpaid close, auth/role bypass, wrong reports, unusable core tablet flow | Release prohibited until fixed and retested |
| P2 | Workaround exists but causes service risk, confusion, material delay, or poor recovery | Fix before launch unless owner accepts in writing |
| P3 | Cosmetic or low-frequency polish with no truth/safety impact | Backlog with evidence |

## 9. Stop-ship conditions

The run stops for triage if any P0 occurs. Final launch sign-off is prohibited if any of these remain:

- a QR/session privacy leak;
- an incorrect or duplicated payment state;
- an unpaid table can be closed without an audited override;
- a submitted order is missing, duplicated, or routed to the wrong production station;
- reports cannot reconcile the live floor and payments;
- logout or role authorization fails;
- persistent uploads/menu images disappear after deployment;
- no physical printer agent can complete the required acceptance set;
- the Android/tablet POS cannot complete a core order-to-close journey;
- unresolved QA data makes the operational board ambiguous.

## 10. Scenario catalogue

### Phase A — deployment, access, session, and clean operational board

| ID | Priority | End-to-end live workflow | Required final proof and cleanup |
|---|---|---|---|
| MASTER-E2E-001 | P0 | Cold-start staff service -> login -> Dashboard -> every main sidebar route -> logout -> revisit protected routes. | Correct build is visible; routes load; session is terminated after logout. |
| MASTER-E2E-002 | P1 | Warm login -> refresh Dashboard/POS/Orders repeatedly -> navigate back/forward -> reopen POS. | No redirect loop, blank route, lost session, or stale shell. |
| MASTER-E2E-003 | P0 | Owner reviews POS, Tables, Orders, KDS, Queue, Reservations, Printing and shifts -> classifies or safely clears old QA state. | Known clean baseline or an explicit quarantined-record list. |
| MASTER-E2E-004 | P1 | Staff opens POS, Orders, Kitchen and customer QR in parallel tabs -> acts in each -> refreshes all. | Correct tenant/table identity and no stale cross-tab overwrite. |
| MASTER-E2E-005 | P1 | Owner creates disposable waiter -> waiter logs in -> uses permitted service routes -> attempts owner-only routes -> owner removes/archives user. | Least privilege is enforced and account cleanup is proven. |
| MASTER-E2E-006 | P1 | Staff starts login with wrong password -> sees safe error -> corrects password -> logs in -> logs out. | Clear feedback without account/secret leakage or broken recovery. |
| MASTER-E2E-007 | P1 | Staff leaves an authenticated tab idle -> resumes -> performs harmless read then protected action. | Expiry/refresh behavior is explicit; no silent action loss. |
| MASTER-E2E-008 | P2 | Change supported language -> traverse POS/Tables/Orders -> return to English -> refresh. | Critical terms and routes remain usable and preference persists correctly. |
| MASTER-E2E-009 | P1 | Owner verifies visible deployment version -> compares menu/POS/KDS route build -> records Render wake behavior. | One coherent deployed version and measured startup time. |
| MASTER-E2E-010 | P0 | Clean-shift checklist -> confirm tables, bills, tickets, queue, reservations, agents and shifts -> open one controlled QA table. | Starting board is unambiguous and traceable. |

### Phase B — public reservations through completed table service

| ID | Priority | End-to-end live workflow | Required final proof and cleanup |
|---|---|---|---|
| MASTER-E2E-011 | P0 | Customer books today -> host finds today's booking -> assigns suitable table -> seats -> QR orders -> kitchen serves -> cashier pays/closes. | Reservation finished, order in History, table reset, old QR blocked. |
| MASTER-E2E-012 | P1 | Customer enters invalid phone -> error focuses/explains example -> fixes details -> books -> host searches by phone/name. | One valid searchable reservation; invalid attempt creates none. |
| MASTER-E2E-013 | P1 | Customer books future date -> host checks today's view -> changes to future date/filter -> returns to today. | Future booking is absent today and visible only in correct context. |
| MASTER-E2E-014 | P1 | Customer books then uses manage link to cancel -> host verifies status -> attempts accidental seating. | Cancelled booking cannot create a live table session. |
| MASTER-E2E-015 | P1 | Host creates same-day walk-in reservation -> edits party size/time/notes -> assigns -> seats -> finishes empty session. | Edits persist; Finish/Cancel/No-show meanings are clear. |
| MASTER-E2E-016 | P1 | Early customer arrives -> host selects seat-now -> assigns exact-capacity table -> completes one-order service. | Early seat is allowed/guarded per policy and booking is linked. |
| MASTER-E2E-017 | P1 | Late customer arrives -> host identifies late state -> seats with override if needed -> completes service. | Late decision is explicit and auditable. |
| MASTER-E2E-018 | P1 | Host marks no-show -> table remains free -> customer later arrives -> authorized recovery/reopen or clear refusal. | No duplicate table session; policy is understandable. |
| MASTER-E2E-019 | P1 | Reservation assigned T07 -> host reassigns T08 before seating -> seats -> QR orders -> closes. | T07 releases; only T08 QR/session/order is active. |
| MASTER-E2E-020 | P1 | Two similar-time reservations -> host seats different tables -> both order two rounds -> one pays first -> both close. | IDs, tables, bills and history never cross. |

### Phase C — queue, notification, seating, and no-show handling

| ID | Priority | End-to-end live workflow | Required final proof and cleanup |
|---|---|---|---|
| MASTER-E2E-021 | P0 | Customer joins public waitlist -> sees large Q number -> host sees same number -> pings -> guest page auto-updates -> seat -> order/pay/close. | One complete queue-to-history journey with realtime evidence. |
| MASTER-E2E-022 | P1 | Two guests join consecutively -> host pings second only -> pages reflect correct state -> seat first then second. | No cross-notification or queue-number confusion. |
| MASTER-E2E-023 | P1 | Guest submits duplicate name/phone -> host detects duplicate -> keeps one active entry -> seats it. | One active identity and documented duplicate handling. |
| MASTER-E2E-024 | P1 | Guest joins -> host pings -> no response -> returns to waiting -> pings again -> guest acknowledges -> seats. | Realtime transitions persist without page refresh. |
| MASTER-E2E-025 | P1 | Guest joins -> is pinged -> becomes no-show/cancelled -> host calls next guest -> later scans old page. | Old entry cannot be seated or impersonate active queue. |
| MASTER-E2E-026 | P1 | Large party joins -> host attempts too-small table -> selects valid table -> completes service. | Capacity is blocked or override is explicit and logged. |
| MASTER-E2E-027 | P1 | Staff manually adds walk-in -> edits party/note -> pings -> seats -> waiter orders -> cashier closes. | Staff-created row behaves like public queue and clears. |
| MASTER-E2E-028 | P2 | Guest cancels from public page -> rejoins later -> host seats new entry. | First entry inactive; only the new ticket is actionable. |
| MASTER-E2E-029 | P1 | Full-floor condition -> guest joins -> host sees no-capacity state -> table frees -> recommendations update -> seat. | Honest wait/no-table guidance and live recovery. |
| MASTER-E2E-030 | P1 | Queue guest also has today's reservation -> host resolves duplicate identity -> seats once -> completes service. | No double occupancy, duplicate session, or orphan queue row. |

### Phase D — table lifecycle, capacity, fixed QR, and transfer

| ID | Priority | End-to-end live workflow | Required final proof and cleanup |
|---|---|---|---|
| MASTER-E2E-031 | P0 | Host opens walk-in table -> customer scans fixed QR -> orders -> pays -> cashier closes -> next guest scans same physical QR. | New signed session is clean; old session/history is inaccessible. |
| MASTER-E2E-032 | P0 | Scan fixed QR while table closed -> open table in staff UI -> guest page recovers/reloads -> first order succeeds. | Closed state is friendly; opening does not require a new physical QR. |
| MASTER-E2E-033 | P0 | Active unpaid table -> staff attempts close -> pays -> confirms table-specific close -> scans old link. | Unpaid close blocked; paid close resets; stale token blocked. |
| MASTER-E2E-034 | P1 | Reserved table opens -> guest count changes -> waiter records correct count -> service completes. | Capacity/guest count truth remains visible. |
| MASTER-E2E-035 | P1 | Empty table session opened accidentally -> no order -> release/close -> reopen for real guest. | Safe zero-bill cleanup with no History noise. |
| MASTER-E2E-036 | P1 | Table orders first round -> manager transfers to clean destination -> second round -> pay/close. | Bill/session/tickets follow destination once; source releases. |
| MASTER-E2E-037 | P1 | Attempt transfer into occupied/unpaid destination -> choose safe alternative -> finish. | Unsafe destination is blocked with useful explanation. |
| MASTER-E2E-038 | P1 | Two staff sessions attempt same table assignment/seat action. | One succeeds; loser gets conflict feedback; no duplicate session. |
| MASTER-E2E-039 | P1 | Table payment requested -> waiter tries to add another round -> follows defined unlock/re-request behavior -> pays. | No hidden balance or stale payment request. |
| MASTER-E2E-040 | P1 | Review active bill/current orders/history on one table -> close -> reopen new session -> recheck all three. | Current is session-scoped; History retains prior session only. |

### Phase E — cashier POS ordering, menu, carts, and corrections

| ID | Priority | End-to-end live workflow | Required final proof and cleanup |
|---|---|---|---|
| MASTER-E2E-041 | P0 | Cashier selects available table -> searches item -> adds note/quantity -> sends -> kitchen processes -> terminal pays -> closes. | Complete staff-originated transaction and correct totals. |
| MASTER-E2E-042 | P0 | QR first round -> waiter adds verbal POS round -> guest adds second QR round -> combined bill pays/closes. | One active bill; all lines retain origin/note/status correctly. |
| MASTER-E2E-043 | P1 | Cashier switches across three active tables with unsent carts and sent orders -> returns to each -> completes them. | Cart/order/table isolation and no accidental cross-submit. |
| MASTER-E2E-044 | P1 | Search exact, partial, lowercase, category, long name and code-like menu names -> add/remove items -> submit. | Fast search; correct product, image and price every time. |
| MASTER-E2E-045 | P1 | Add same item repeatedly -> decrement/remove -> clear cart -> rebuild -> double-click Send. | Valid final quantity; one ticket/order mutation only. |
| MASTER-E2E-046 | P1 | Add long preparation/allergy note -> send -> verify POS, KDS, receipt -> serve/pay. | Note preserved and visually elevated where needed. |
| MASTER-E2E-047 | P1 | Wrong unsent item -> remove -> right item -> send; then manager handles sent-item void with reason. | Bill/KDS/audit/revenue agree; permission enforced. |
| MASTER-E2E-048 | P1 | Cashier enters first round -> refreshes during request -> returns -> adds second round -> closes. | No lost, duplicated, or prematurely historical round. |
| MASTER-E2E-049 | P1 | Very large 20-item order across categories -> edit quantities/notes -> send -> KDS and bill reconcile -> pay. | Usable cart and exact line/total reconciliation. |
| MASTER-E2E-050 | P1 | Sold-out/unavailable item appears in menu -> cashier/customer attempt add -> selects substitute -> completes bill. | Availability truth is consistent and stale carts fail safely. |

### Phase F — customer QR menu, privacy, status, and repeat ordering

| ID | Priority | End-to-end live workflow | Required final proof and cleanup |
|---|---|---|---|
| MASTER-E2E-051 | P0 | Guest scans open table -> browses category sections -> adds round -> submits without entering a name -> sees current bill. | Name-free order; correct current session and total. |
| MASTER-E2E-052 | P0 | Round one -> KDS status changes -> guest sees live progress -> round two -> combined total -> pay/close. | Live status and same-session invariants hold. |
| MASTER-E2E-053 | P0 | Guest on T07 manipulates URL with T08 token/id -> opens another old QR tab -> navigates back. | No unauthorized bill/history exposure or writable session. |
| MASTER-E2E-054 | P1 | Two devices/tabs scan same table -> each adds one round near-simultaneously -> staff verifies bill/KDS. | Both valid rounds appear once with a stable total. |
| MASTER-E2E-055 | P1 | Guest builds cart -> reloads/back/forward -> submits -> reloads confirmation. | Defined cart persistence; no ghost or duplicate order. |
| MASTER-E2E-056 | P1 | Guest uses search then category jump/sticky header -> scrolls 100+ products -> adds item from distant category. | Menu is navigable without a wall-of-items failure. |
| MASTER-E2E-057 | P1 | Guest orders image and no-image products -> verifies names/prices -> kitchen fulfills. | Missing image never hides product identity or action. |
| MASTER-E2E-058 | P1 | Guest sends Unicode/punctuation note within allowed length -> verifies KDS/receipt -> completes. | Safe encoding, wrapping, and no script execution. |
| MASTER-E2E-059 | P1 | Guest loses network before submit -> retries after reconnect -> staff verifies once. | Clear offline state and idempotent recovery. |
| MASTER-E2E-060 | P0 | Guest requests payment -> attempts order/change -> cashier completes payment -> page receives paid/closed state. | Defined request lock/reopen policy; no post-payment order. |

### Phase G — kitchen, beverage, service states, and production pressure

| ID | Priority | End-to-end live workflow | Required final proof and cleanup |
|---|---|---|---|
| MASTER-E2E-061 | P0 | Mixed food/drink order -> Kitchen receives food only -> Beverage receives drink only -> both serve -> bill pays. | Station routing, counts, notes and final state agree. |
| MASTER-E2E-062 | P0 | Food-only and beverage-only orders from two tables -> progress independently -> close one first. | No lane/table/status cross-contamination. |
| MASTER-E2E-063 | P1 | Five tables submit close together -> kitchen sorts/reads -> advances one at a time -> waiter serves. | No hidden ticket, misread table, or accidental bulk action. |
| MASTER-E2E-064 | P1 | Long 20-line ticket with modifiers/allergies -> station views portrait/landscape -> completes. | Scannable hierarchy and reachable actions under load. |
| MASTER-E2E-065 | P1 | Kitchen leaves KDS open -> new QR order arrives -> audio/visual/live cue -> acknowledges without refresh. | New-ticket awareness is reliable. |
| MASTER-E2E-066 | P1 | Pending -> Preparing -> Ready -> Served -> observe completion toast/countdown -> verify customer/POS. | Every transition persists once and is understandable. |
| MASTER-E2E-067 | P1 | Manager finds old backlog -> opens affected bill/table -> resolves with reason -> returns to live shift. | Backlog is auditable and live board is clean. |
| MASTER-E2E-068 | P1 | Sent item is manager-voided -> KDS sees cancellation -> acknowledges -> receipt/bill reconcile. | Kitchen cannot prepare an invisible void; audit preserved. |
| MASTER-E2E-069 | P1 | KDS network disconnect -> orders submitted -> reconnect -> catches up -> completes each once. | No lost ticket, duplicate service, or wrong ordering. |
| MASTER-E2E-070 | P1 | Kitchen serves before beverage -> waiter checks table -> beverage serves -> payment becomes available/continues per policy. | Partial station completion is explicit and safe. |

### Phase H — payments, financial truth, receipts, close, and corrections

| ID | Priority | End-to-end live workflow | Required final proof and cleanup |
|---|---|---|---|
| MASTER-E2E-071 | P0 | Customer requests terminal -> yellow state appears -> cashier confirms terminal settlement -> green -> prints -> closes. | Request is not payment; paid amount/method/reference reconcile. |
| MASTER-E2E-072 | P0 | Customer starts HitPay sandbox -> completes success -> Sakorio return/webhook -> cashier closes. | Exactly one paid transaction and correct History/report. |
| MASTER-E2E-073 | P0 | Customer starts HitPay -> abandons/cancels -> bill remains unpaid -> retries successfully -> closes. | Failed request cannot create paid/duplicate state. |
| MASTER-E2E-074 | P0 | HitPay success return is refreshed/reopened -> webhook/return repeats -> check bill/payment/receipt. | Idempotent one-payment result. |
| MASTER-E2E-075 | P1 | Staff opens payment drawer -> exits -> changes order -> reopens -> terminal pays. | Amount refreshes and abandoned drawer changes nothing. |
| MASTER-E2E-076 | P1 | Double-click terminal/payment confirmation -> navigate away/back -> inspect audit. | One settlement, one receipt series, no duplicate close. |
| MASTER-E2E-077 | P1 | Attempt customer Cash -> verify absent -> authorized cashier Cash/Terminal policy path if enabled -> close. | Role/channel payment options are correct. |
| MASTER-E2E-078 | P1 | Manager applies supported discount/correction with reason -> cashier pays -> report/history/receipt reconcile. | Authorization, tax and audit are correct. |
| MASTER-E2E-079 | P1 | Manager tests supported refund/reopen on disposable paid bill -> verifies table state/revenue/audit. | Clear supported policy; no silent revenue mutation. |
| MASTER-E2E-080 | P0 | End-to-end order -> payment -> customer receipt -> close -> table reset -> new guest opens same fixed QR. | Complete lifecycle and session boundary proven. |

### Phase I — Orders, History, Reports, and end-of-day reconciliation

| ID | Priority | End-to-end live workflow | Required final proof and cleanup |
|---|---|---|---|
| MASTER-E2E-081 | P0 | Create two rounds -> inspect Orders current -> serve -> pay -> inspect paid-awaiting-close -> close -> History. | Each lifecycle bucket changes at the correct event. |
| MASTER-E2E-082 | P1 | Search/filter order by table, ID, payment and time -> open detail -> return without filter loss. | Operators can find one bill quickly and accurately. |
| MASTER-E2E-083 | P1 | Compare POS bill, Orders detail, History, receipt and Reports for one completed transaction. | Items, subtotal, tax, total, method, table and time reconcile. |
| MASTER-E2E-084 | P1 | Create unpaid open bill -> open Today's Reports/end-day -> settle -> refresh reports. | Open/unpaid count and revenue use Singapore day consistently. |
| MASTER-E2E-085 | P1 | Void/cancel disposable bill -> inspect report revenue and audit/history. | Cancelled value is not paid revenue and remains traceable. |
| MASTER-E2E-086 | P1 | Complete transaction around local-day boundary test window or controlled date fixture. | Business date is Singapore time across all modules. |
| MASTER-E2E-087 | P1 | End-day review active tables, unpaid bills, KDS backlog, queue, reservations, shifts, printers. | One reliable checklist exposes every unresolved operation. |
| MASTER-E2E-088 | P2 | Export/view report filters -> change date/category/staff -> return today. | Accurate filters and no stale totals or layout break. |
| MASTER-E2E-089 | P1 | Compare payment-requested versus paid versus closed records in reports. | Requested is never counted as paid; closed timing is distinct. |
| MASTER-E2E-090 | P0 | Final financial reconciliation for all QA payments -> confirm no extra receipt/payment/order IDs. | Sum and count agree across payments, orders, receipts and reports. |

### Phase J — staff, shifts, timetable, users, and manager operations

| ID | Priority | End-to-end live workflow | Required final proof and cleanup |
|---|---|---|---|
| MASTER-E2E-091 | P1 | Staff selects profile on any day -> clocks in without planned shift -> performs service -> clocks out -> timetable updates. | Actual start/end/duration appear once on correct date. |
| MASTER-E2E-092 | P1 | Staff with planned shift selects profile -> clock in -> break start/end -> clock out. | Planned versus actual and break duration reconcile. |
| MASTER-E2E-093 | P1 | Staff attempts second concurrent clock-in -> resumes open shift -> clocks out. | One open attendance record only. |
| MASTER-E2E-094 | P1 | Manager checks open shift -> corrects supported mistake with reason -> employee/timetable view updates. | Audited correction and accurate hours. |
| MASTER-E2E-095 | P1 | Owner records annual leave/MC on disposable entitlement -> calendar and remaining balance update -> reverses. | Balance-before/after and audit are correct. |
| MASTER-E2E-096 | P1 | Regular staff opens Timetable/My Shift -> attempts rates -> owner views rates. | Hourly rates remain administrator-only. |
| MASTER-E2E-097 | P1 | Owner creates disposable employee/role -> staff logs in/clocks in -> owner disables account -> protected access ends. | Complete account lifecycle and least privilege. |
| MASTER-E2E-098 | P2 | Manager creates/moves/deletes planned shift using calendar controls -> employee view refreshes. | Calendar behavior is predictable and persistent. |
| MASTER-E2E-099 | P1 | Staff uses Android tablet camera/profile clock-in permission flow -> completes clock-out. | Permission prompts/recovery are understandable on physical device. |
| MASTER-E2E-100 | P0 | Manager performs end-of-shift reconciliation -> clocks everyone out -> clears operational QA state -> logs out. | Zero unexplained active QA resources and signed checklist. |

### Phase K — cross-cutting security, privacy, permissions, and audit

| ID | Priority | Complete test path | Required proof |
|---|---|---|---|
| MASTER-XCUT-101 | P0 | Close table -> reuse signed QR URL in fresh/private tab -> attempt history/order/payment access. | Token is expired/closed and reveals no previous bill. |
| MASTER-XCUT-102 | P0 | Open two table QR sessions -> swap table/token URL components -> attempt read/write. | Signature/session binding rejects tampering. |
| MASTER-XCUT-103 | P0 | Logout -> back button -> refresh cached POS -> directly open Users/Reports/Settings. | No protected content/action survives logout. |
| MASTER-XCUT-104 | P1 | Waiter attempts users, rates, settings, report exports, void/refund and override actions. | Every forbidden capability is absent or denied server-side. |
| MASTER-XCUT-105 | P1 | Manager and cashier perform same correction path. | Manager succeeds with audit; cashier is denied safely. |
| MASTER-XCUT-106 | P1 | Submit script-like text/HTML in public name/note/search fields -> view across modules. | Text is encoded; no execution, broken layout, or secret leak. |
| MASTER-XCUT-107 | P1 | Repeated wrong login/public queue/reservation submits within safe bounds. | Rate-limit/feedback protects service without locking legitimate recovery. |
| MASTER-XCUT-108 | P1 | Inspect visible URLs/errors during login, QR, payment, image and printer operations. | No password, API key, printer token, stack trace, or internal path leaks. |
| MASTER-XCUT-109 | P1 | Two staff roles work same table/order nearly simultaneously. | Conflict handling prevents lost updates and explains recovery. |
| MASTER-XCUT-110 | P1 | Review audit/history for seat, transfer, void, correction, payment, close and attendance changes. | Actor, time, target, reason and before/after are traceable. |

### Phase L — concurrency, idempotency, realtime, and network recovery

| ID | Priority | Complete test path | Required proof |
|---|---|---|---|
| MASTER-XCUT-111 | P0 | Double-submit QR order under throttled network -> reconnect -> check bill/KDS/prints. | Exactly one order mutation and defined feedback. |
| MASTER-XCUT-112 | P0 | Repeat HitPay return/webhook/reload path safely. | Exactly one settlement and one paid transition. |
| MASTER-XCUT-113 | P1 | Double-click queue Ping/Seat/Cancel with guest page open. | One state transition and correct realtime guest state. |
| MASTER-XCUT-114 | P1 | Double-click reservation Assign/Seat/Finish with second host tab. | One table session and one final reservation status. |
| MASTER-XCUT-115 | P1 | Double-click Send, Serve, Print and Close actions. | Each business side effect occurs once. |
| MASTER-XCUT-116 | P1 | Disconnect customer network during status updates -> reconnect. | Page catches up without resubmitting or showing false state. |
| MASTER-XCUT-117 | P1 | Disconnect KDS network while two tickets arrive -> reconnect. | Both tickets appear once with accurate age/order. |
| MASTER-XCUT-118 | P1 | Close/reopen staff browser during active table/cart/payment request. | Server truth restores; unsent local state behavior is clear. |
| MASTER-XCUT-119 | P1 | Let WebSocket idle -> queue ping/new ticket/payment change. | Automatic reconnect or clear recovery indicator. |
| MASTER-XCUT-120 | P1 | Force safe API error/timeout during a nonfinancial action -> retry. | Action result is known, retryable and not duplicated. |

### Phase M — Android ESC/POS printer and job lifecycle

| ID | Priority | Complete test path | Required proof |
|---|---|---|---|
| MASTER-XCUT-121 | P0 | Launch Android Sakorio -> login -> pair XP-80T -> register agent/token -> observe `1/1 online`. | Physical paired device and live agent state. |
| MASTER-XCUT-122 | P0 | Three-item food order -> kitchen item-per-slip mode. | Three distinct readable slips, correct restaurant/table/item/note. |
| MASTER-XCUT-123 | P0 | Mixed food/drink order -> kitchen and beverage printer routes. | Correct printer/station; no missing or duplicate slip. |
| MASTER-XCUT-124 | P0 | Paid bill -> cashier/customer receipt. | Restaurant name, items, quantities, non-zero SGD prices, tax/total/method. |
| MASTER-XCUT-125 | P1 | Printer off -> create jobs -> restore Bluetooth/agent. | Waiting jobs retry once and drain without data loss. |
| MASTER-XCUT-126 | P1 | Agent/app restarts with pending and completed jobs. | Pending resumes; completed receipts do not reprint. |
| MASTER-XCUT-127 | P1 | Printer paper-out/disconnect during multi-slip batch -> recover. | Operator sees failure/pending state and safely completes remainder. |
| MASTER-XCUT-128 | P1 | Manual reprint authorized receipt/ticket with reason. | Reprint clearly identified and auditable, original untouched. |
| MASTER-XCUT-129 | P1 | Revoke/replace printer-agent token -> old app polls -> new app connects. | Old token denied; new token online without secret exposure. |
| MASTER-XCUT-130 | P0 | Full Android order-to-print-to-payment-to-close journey after app relaunch. | Native/tablet workflow and physical receipts complete end to end. |

### Phase N — responsive UI, iPad/Android simulation, accessibility, and pressure usability

| ID | Priority | Full UI journey | Required proof |
|---|---|---|---|
| MASTER-UX-131 | P1 | POS table select -> add items -> cart -> payment -> back/switch table at 1024x768. | No overlap, hidden lane, page trap, or excessive whole-page scroll. |
| MASTER-UX-132 | P1 | Same POS journey at 768x1024 with orientation change mid-cart. | Context and controls survive; no horizontal overflow. |
| MASTER-UX-133 | P1 | Android 1280x800 complete table-order-pay-close with touch. | Primary targets are reachable and appropriately sized. |
| MASTER-UX-134 | P1 | Android 800x1280 complete add-round and payment request. | Portrait hierarchy and sticky actions remain clear. |
| MASTER-UX-135 | P1 | Customer 390x844 scan -> category -> item -> cart -> order -> status -> payment request. | No keyboard/footer/cart obstruction or confusing scroll wall. |
| MASTER-UX-136 | P1 | Customer 360x800 with long product names, missing images and long note. | Text wraps; price/action remain visible; no clipping. |
| MASTER-UX-137 | P1 | Host reservation find -> assignment -> seat on iPad landscape/portrait. | Table labels include accessible names such as `Assign T07`. |
| MASTER-UX-138 | P1 | Host queue ping -> seat -> cancel/no-show on tablet while counters update. | Selection/counter/status remain obvious without refresh. |
| MASTER-UX-139 | P1 | KDS five-ticket pressure run at 1280x800 using touch only. | Ticket/table/status hierarchy supports fast accurate work. |
| MASTER-UX-140 | P1 | Orders current/history/detail/search/payment handoff on tablet. | Table-based overview is compact; one order does not dominate screen. |
| MASTER-UX-141 | P2 | Keyboard-only login, sidebar, POS search/cart and logout. | Logical focus order, visible focus and actionable controls. |
| MASTER-UX-142 | P2 | Screen-reader-oriented inspection of forms, status chips, icons and table actions. | Names, roles, errors and live statuses are announced meaningfully. |
| MASTER-UX-143 | P2 | Zoom staff pages to 200% -> execute safe table/search actions. | Content reflows; no critical control loss. |
| MASTER-UX-144 | P2 | High-contrast/color-independence check for unpaid/requested/paid and KDS states. | Text/icon conveys state independently of red/yellow/green. |
| MASTER-UX-145 | P2 | Trigger validation, conflict, offline, payment and success toasts on mobile/tablet. | Feedback is readable, persistent enough and action-specific. |
| MASTER-UX-146 | P2 | Open virtual keyboard in QR notes/POS search/reservation/queue fields. | Focused field and Submit remain reachable; keyboard dismissal is clean. |
| MASTER-UX-147 | P1 | Browse/search/category-jump all 100+ menu items on customer and POS surfaces. | Fast navigation, stable images, accurate active category and scroll. |
| MASTER-UX-148 | P2 | Simulate reduced motion and slow network during menus/status transitions. | No motion dependency; skeleton/loading/error states explain progress. |
| MASTER-UX-149 | P1 | Run complete reservation-to-close journey without expert knowledge, counting actions/time. | No redundant re-entry or ambiguous handoff; improvement points quantified. |
| MASTER-UX-150 | P0 | Run final customer + host + waiter + kitchen + cashier journey on target tablet/mobile combination. | Core launch journey scores at least 9.5 with no P0/P1 issue. |

## 11. Required evidence pack

The execution report must contain:

- one result record for every ID, including `BLOCKED` and `NEEDS-SPEC` cases;
- redacted screenshots at decisive transitions, not only final pages;
- table, order, queue, reservation, ticket, payment and print-job IDs;
- before/after counts for shared queues and backlogs;
- live update observation before refresh and persistence observation after refresh;
- viewport and device for every UI case;
- measured cold-start, route-load, order-submit, queue-ping, KDS-arrival, payment-return and print times;
- defect register linking each failure to all affected cases;
- cleanup register proving what was removed, closed, cancelled, served, clocked out or intentionally preserved.

Never publish raw signed QR URLs, auth cookies, passwords, HitPay secrets, printer tokens, or customer PII in the report.

## 12. Execution order and checkpoints

1. **Checkpoint 0 — safety and baseline:** MASTER-E2E-001 to 010. Stop if version/auth/clean-board state is unreliable.
2. **Checkpoint 1 — ingress:** 011 to 030. Reservations and queue must hand off cleanly.
3. **Checkpoint 2 — service:** 031 to 070. Tables, POS, QR and production truth must hold.
4. **Checkpoint 3 — settlement:** 071 to 090. Payment and reports are launch gates.
5. **Checkpoint 4 — workforce:** 091 to 100. Attendance/permissions/end-shift.
6. **Checkpoint 5 — cross-cutting:** 101 to 130. Security, concurrency, recovery and physical printer.
7. **Checkpoint 6 — device/UX:** 131 to 150. Supported layouts and final target-device journey.

At each checkpoint, update the scorecard and defect register. A P0 stops subsequent mutation until triaged. P1 failures may continue for evidence collection only if they cannot corrupt payment, privacy, or data.

## 13. Launch exit criteria

Launch can be recommended only when all conditions are met:

- all 150 cases have a real status and evidence; no case is silently inferred from code;
- every P0/P1 case passes its retest;
- zero open P0 and P1 defects;
- no unexplained score below 9.0; all scores below 10 include an owned improvement;
- the 20 non-negotiable invariants are proven;
- HitPay success, cancel, retry and idempotency are verified in sandbox;
- terminal request/settlement/receipt/table reset is verified;
- Android printer agent is online and the physical receipt acceptance set passes;
- food/beverage routing and KDS backlog are clean;
- Today's Reports reconcile with open/paid/closed floor state in Singapore time;
- owner, manager, cashier, waiter and staff permission checks pass;
- customer mobile, Android tablet, iPad simulation and KDS layouts pass;
- final cleanup shows no orphan QA data;
- a named owner accepts any remaining P2/P3 item with mitigation and target date.

## 14. Deliverables after execution

1. `Sakorio master 150-case live-browser QA results` with every case score.
2. Prioritized defect register with reproducible browser steps and evidence.
3. Cross-module reconciliation sheet for orders, payments, receipts and reports.
4. Android/printer physical acceptance report.
5. Device and viewport UI/UX report.
6. Cleanup ledger.
7. Final `GO`, `CONDITIONAL GO`, or `NO-GO` decision with unresolved risks.

This brief is deliberately stricter than a normal regression pass. It prevents a collection of isolated green buttons from being mistaken for a launch-ready restaurant operating system.
