# Sakorio master pre-launch stress test and technical blueprint

Prepared: 6 November 2026 (Asia/Singapore)  
Primary launch tenant: Morinaga Ramen Izakaya (`tenant_id=3`)  
Purpose: single source of truth for architecture, workflow invariants, 100
end-to-end stress scenarios, evidence, defect control and final launch approval.

## 1. Executive position

Sakorio has a verified working reservation-to-table-to-order-to-kitchen-to-
payment-to-close path. The most recent live production pilot scored **9.9/10**
and reconciled reservation `#101`, bill `#275`, five items and SGD 32.80.

That pilot proves the core browser workflow, not unconditional launch readiness.
This document expands the test surface to normal operations, concurrency,
privacy, failure recovery, payment truth, physical printing, roles, reporting
and a 20-table dinner rush. It supersedes informal ad-hoc test lists but should
be executed with the detailed component checklist in `docs/0184-...` and the
latest result record in `docs/0185-...`.

Launch requires all of the following:

- every scenario designated launch-critical executed in the live interface;
- score at least 9/10 for every launch-critical scenario;
- no unresolved P0 or P1 defect;
- exact reconciliation across POS, Orders, KDS, payment, receipt and Reports;
- physical XP-80T printing, 9% GST and HitPay certification completed;
- named staff-role accounts, recovery procedures and launch support in place.

## 2. Validation performed while preparing this blueprint

This is not a speculative architecture description. It was checked against the
current repository and the latest browser evidence.

| Validation | Result |
| --- | --- |
| Repository | `development`, `origin=https://github.com/rtjz318/sakorio-pos.git` |
| Frontend manifest | Angular `21.2.26`, Angular build/SSR `21.2.29`, Capacitor `8.6.0`, RxJS `7.8.2` |
| Backend manifest | FastAPI, SQLModel, PostgreSQL/psycopg, Redis, JWT, bcrypt, OTP, SMTP and report libraries |
| Local stack | Backend, frontend, HAProxy, PostgreSQL, Redis and WebSocket bridge running |
| Local HTTP smoke | HAProxy landing response HTTP `200` |
| Core backend validation | **77 passed**: order lifecycle, table close, reservations, queue, payments, printing, roles, route inventory, sessions |
| Public/security validation | **53 passed**: booking capacity, QR session, tenant IDOR, settings, uploads, reporting and public menu |
| Total focused tests | **130 passed**, one dependency deprecation warning, no failure |
| Container logs | Backend health requests returned HTTP `200`; no new frontend compiler error was emitted |
| Live browser baseline | Production pilot in `0186` passed the full internal-Terminal service loop at **9.9/10** |
| Document integrity | **100 unique scenario IDs** across ten workflow domains; category totals and master scorecard reconcile |

The containerized Puppeteer landing script could not start Chrome because the
frontend image intentionally does not contain a browser binary. This is an
environment limitation, not a product pass. Live browser evidence and the HTTP
smoke cover the current baseline; all scenarios below still require their own
browser/device evidence.

## 3. Current technical architecture

```text
Customer phone / Android tablet / staff browser
                 |
             HTTPS/WSS
                 |
        Nginx or HAProxy edge
          |       |       |
   Angular SPA  FastAPI  WebSocket bridge
                    |        |
                PostgreSQL  Redis pub/sub
                    |
        tenant-scoped business records

Optional external/local edges:
- HitPay hosted checkout + signed webhook
- SMTP reservation/reset/reminder delivery
- Android native printer agent -> Bluetooth ESC/POS XP-80T
- Render deployment, logs, metrics, disk and database recovery
```

### 3.1 Frontend

- Angular single-page application, lazy routes and route guards.
- Public routes: restaurant menu, table-token menu, booking, waitlist,
  reservation view, feedback and payment return.
- Staff routes: dashboard, POS, Orders, Tables, Reservations, Queue, KDS,
  Products, Reports, Timetable, Users and Settings.
- Guards enforce authentication, UI-module availability and role/permission
  access. POS is limited to owner/admin/waiter/receptionist; KDS is limited to
  owner/admin/kitchen/bartender; financial/settings surfaces are admin-scoped.
- Capacitor Android packaging provides the native boundary required for
  Bluetooth ESC/POS printing; browser Bluetooth is not the production path.

### 3.2 Backend and data layer

- FastAPI exposes public capability-token endpoints and authenticated staff
  endpoints.
- SQLModel maps tenant-owned records to PostgreSQL 18.
- Every restaurant-owned entity carries `tenant_id`; tenant lookups and role
  dependencies must fail closed.
- Schema changes run through the migration runner before production traffic.
- Redis provides rate-limit support and pub/sub for realtime events.
- A separate WebSocket bridge authenticates tenant staff channels, validates
  table tokens and isolates public queue tokens.

### 3.3 Core domain records

| Domain | Primary records | Ownership/invariant |
| --- | --- | --- |
| Restaurant | Tenant, Tax, opening hours, settings | All operational configuration belongs to one tenant |
| People | User, role, StaffProfile, WorkSession, Shift, Leave | No shared staff account; hourly rates are admin-only |
| Floor | Floor, Table, TableGroup | A physical table belongs to one tenant and has one active visit/bill |
| Guest intake | Reservation, GuestQueueEntry, daily QueueCounter | Reservation and queue identity are explicit; phone matching is not identity |
| Ordering | Order, OrderItem, product/menu records | One live bill per table visit; browser session sees only its current visit |
| Production | KitchenStation, per-item status | Every submitted item has exactly one route and terminal status |
| Payment | payment request IDs, method, paid timestamp, staff actor | Redirect is not payment proof; settlement must be idempotent |
| Printing | PrinterAgent, PrintJob, lease token/status | Jobs are tenant/station scoped and printed at most once |
| Audit/reporting | order history, queue conversion, attendance and exports | Closed records remain attributable and reconcilable |

### 3.4 State machines that must never be bypassed

```text
Reservation: booked -> seated -> finished
                      -> cancelled | no_show

Queue: waiting -> notified -> seated -> completed
       |            |          -> converted_to_reservation
       +------------+----------> cancelled | no_show | expired

Order: pending -> preparing -> ready -> partially_delivered -> paid/completed
       +-----------------------------------------------------> cancelled

Order item: pending -> preparing -> ready -> delivered
            +-------------------------------> cancelled

Table visit: available -> activated/occupied -> bill open
             -> payment requested -> paid -> explicit close -> available

Print job: pending -> leased -> completed
           +--------> failed -> leased retry (bounded attempts)
```

Illegal transition examples are stop-ship defects: closing an unpaid table,
marking payment from a redirect alone, serving an item that never existed,
showing a previous visit to a new QR session or reusing a completed print job.

### 3.5 Realtime design

- `orders:tenant:{tenant_id}` updates staff/KDS.
- `orders:table:{table_id}` updates the active customer table session.
- `reservations:tenant:{tenant_id}` updates the host view.
- `queue:tenant:{tenant_id}` updates staff queue/POS.
- public queue updates use a private token fingerprint, never a public tenant
  broadcast containing guest data.
- WebSocket loss must degrade to visible reconnect/reload behavior without
  losing database truth.

### 3.6 Payment design

- Staff settlements support controlled Cash or Terminal confirmation.
- Customer checkout must not offer Cash.
- HitPay credentials and webhook salt are tenant-specific.
- A hosted-checkout redirect is informational; a valid signed webhook or
  approved confirmation path establishes payment truth.
- Amount, currency, tenant, order reference and request ID must all match.
- Repeated clicks, callbacks and retries must be idempotent.
- A paid bill remains attached to its table until explicit table close.

### 3.7 Printing design

- API creates tenant/station-scoped print jobs.
- Android printer agent authenticates with a one-time-issued agent token,
  heartbeats, leases jobs, writes ESC/POS over Bluetooth and acknowledges
  completion.
- Lease expiry makes a job retryable; completed jobs are not leased again.
- Cashier receipt and kitchen one-slip-per-item modes are separately tested.

### 3.8 Deployment and recovery

- Routine code moves through `development`; production promotion is controlled.
- Production services must remain always-on and health-checked.
- Database and uploads require independent recovery evidence.
- A release is identified by frontend build/commit and backend schema version.
- Rollback must restore a known-good application without reversing committed
  financial/order data.

## 4. Actors and minimum test identities

| Actor | Required capability |
| --- | --- |
| Anonymous customer | Book, join queue, view own token, scan fixed table QR, order and request payment |
| Host/receptionist | Manage reservations/queue, assign and seat tables, no financial administration |
| Waiter/cashier | Open table, order, add round, request/record approved settlement and close table |
| Kitchen | View and progress food items only |
| Bartender | View and progress beverage items only |
| Manager/admin | Correct, void/refund, configure menu/tax/printing, view reports and rates |
| Owner | Full tenant administration, recovery and launch approval |
| Support tester | Read-only technical observation unless a controlled mutation is approved |

Do not certify roles using only the owner account. Each role needs a named,
individual test identity; shared passwords invalidate the role test.

## 5. Test data and execution controls

- Prefix synthetic guests and notes with `PLQA-<date>-<case-id>`.
- Use dedicated QA tables or a controlled closed-service window.
- Record reservation, queue, table, bill, payment request and print-job IDs.
- Never use a real customer's phone, email, card or order.
- Never send test email to `example.com`; use the configured real QA inbox.
- Do not delete financial/history evidence. Mark retained synthetic rows in the
  cleanup register; remove only disposable accounts/config after approval.
- Reconcile starting and ending counts for tables, bills, queue, reservations,
  KDS, printer jobs and open shifts.
- HitPay live-mode tests require owner approval for the exact small charge.

## 6. Evidence and scoring protocol

Every scenario receives 100 points:

| Dimension | Weight |
| --- | ---: |
| Functional correctness and complete end state | 25 |
| Order/payment/session/data integrity | 25 |
| Usability, clarity and operator effort | 15 |
| Realtime, interruption and recovery behavior | 15 |
| Permission, privacy and tenant isolation | 10 |
| Evidence, reconciliation and cleanup quality | 10 |

Status rules:

- `PASS`: at least 90/100, no P0/P1 and all expected end states proven.
- `PARTIAL`: some proof missing or score 75–89; never launch-credit.
- `FAIL`: incorrect state, score below 75 or any P0/P1.
- `BLOCKED`: prerequisite/device/account unavailable; never treated as pass.
- `NOT RUN`: no execution evidence.

Evidence for each case must include build/commit, SGT timestamp, actor, device,
start state, action trace, generated IDs, final UI state, cross-module totals,
console/network errors where relevant and cleanup proof.

## 7. One hundred end-to-end pre-launch scenarios

### A. Reservations — 12 scenarios

| ID | End-to-end journey | Pass criteria and evidence |
| --- | --- | --- |
| RES-001 | Customer books today -> host finds booking -> assigns table -> seats -> two order rounds -> KDS -> Terminal -> close | One reservation, one visit, one bill; reservation Finished and table Available |
| RES-002 | Staff creates phone booking -> guest arrives -> host seats -> waiter orders -> pays -> closes | Source is Staff, all guest details persist and report attribution is correct |
| RES-003 | Customer books an after-midnight slot -> arrives during overnight service -> completes visit | Service date, local timestamp and reporting day remain correct in Asia/Singapore |
| RES-004 | Customer books -> staff changes time/party -> capacity refreshes -> guest completes visit | Updated booking is the only active version; no overbooking or stale table hint |
| RES-005 | Customer submits delay notice -> host sees it live -> holds table -> seats late -> closes | Notice appears without refresh; timeline and final reservation state are accurate |
| RES-006 | Booking reaches tolerance -> host marks no-show -> table is freed -> walk-in uses it | No-show remains auditable; walk-in visit has no reservation identity leakage |
| RES-007 | Customer cancels before arrival -> host timeline updates -> capacity becomes bookable | Token cancels only its booking; cancelled record remains and no table stays blocked |
| RES-008 | Guest arrives materially early -> host selects booking -> seats intentionally -> completes | UI warns with booked/current time; override is clear and does not corrupt schedule |
| RES-009 | Customer requests party above capacity -> correct error -> chooses valid size -> books | No phantom reservation; focus and message make correction obvious |
| RES-010 | Two customers attempt last slot simultaneously -> one succeeds -> other gets next option | Capacity transaction prevents overbooking and both users receive truthful results |
| RES-011 | Guest requests floor/zone/allergy preference -> host assigns suitable table -> kitchen sees note | Preferences survive booking, seating and production without becoming public history |
| RES-012 | Confirmation/reminder email fails -> booking still exists -> host and customer recover by token | Email failure is visible/alerted but never rolls back or duplicates reservation |

### B. Queue and walk-in seating — 10 scenarios

| ID | End-to-end journey | Pass criteria and evidence |
| --- | --- | --- |
| QUE-001 | Customer joins waitlist -> sees large Q number -> host pings -> customer updates live -> seat -> order -> pay -> close | Same queue ID/number throughout; no refresh required; final conversion reconciles |
| QUE-002 | Guest opens queue status on two phones -> host changes status -> both update | Private token limits data to that party; status versions remain consistent |
| QUE-003 | Same phone attempts duplicate active join -> resolves existing entry -> later rejoins after completion | No two active places; new service visit receives a new valid daily number |
| QUE-004 | Customer joins -> cancels from phone -> host board/POS updates -> next party advances | Cancel is idempotent and does not expose other queue entries |
| QUE-005 | Host pings -> guest does not arrive -> no-show -> table offered to next party | No-show reason/time retained; queue order and waiting counts are correct |
| QUE-006 | Host converts future walk-in to reservation -> later assigns/seats -> completes bill | Explicit linked IDs; it is not counted as both seated queue and unrelated booking |
| QUE-007 | Large party joins while only small tables clear -> waits -> grouped capacity clears -> seats | UI never offers an impossible table; quoted wait and capacity update correctly |
| QUE-008 | Queue spans midnight -> new service-day counter starts -> old entries remain history | Daily numbers are unique within service date and never silently reused in one day |
| QUE-009 | Ten guests join concurrently -> host sees ten unique ordered numbers -> seats/cancels mix | Atomic numbering, no duplicates, exact summary counts and clean terminal states |
| QUE-010 | Reservation arrival is due while walk-ins wait -> host chooses table with warning -> both journeys finish | Reservation pressure is visible and no guest identity/table state is overwritten |

### C. Customer fixed-QR ordering — 12 scenarios

| ID | End-to-end journey | Pass criteria and evidence |
| --- | --- | --- |
| QR-001 | Guest scans fixed table QR -> browses categories -> first round -> KDS -> requests bill -> Terminal -> close | No PIN/name required; correct table/session; old token loses visit access after close |
| QR-002 | Guest sends first round -> adds second round -> views current total -> pays | Same bill accumulates both rounds; history from earlier visitors is invisible |
| QR-003 | Two diners on separate phones order same table nearly together -> KDS -> one bill | No lost/duplicate line; totals and session privacy reconcile on both devices |
| QR-004 | New party scans QR after prior table close -> places order | New session cannot see or edit prior bill; prior history remains staff-only |
| QR-005 | Guest builds cart -> refreshes/rotates/goes offline briefly -> returns -> submits once | Cart recovery is understandable; submission key prevents duplicate order |
| QR-006 | Guest double-taps Submit under slow network -> KDS receives one round | Exactly one submission key/order mutation and one set of print jobs |
| QR-007 | Guest chooses modifiers and allergy note -> submits -> waiter/KDS/receipt view it | Modifier price and note appear once, route correctly and print legibly |
| QR-008 | Product becomes unavailable after menu load -> guest tries submit -> replaces item | Clear error, no zero/ghost line, valid replacement succeeds |
| QR-009 | Guest requests payment -> table indicator turns Requested -> cashier settles -> customer updates | Requested is not Paid; only settlement changes financial truth |
| QR-010 | Guest calls waiter twice -> POS receives actionable alert -> waiter acknowledges | Calls are visible but deduplicated/rate-limited and table identity is correct |
| QR-011 | Guest manipulates order/session/table identifiers -> attempts another table/history | Request is rejected; no foreign guest, line, total or token leaks |
| QR-012 | New customer uses 360/390/412px mobile -> category navigation -> search -> cart -> submit | No wall-of-menu trap, overlap, hidden CTA or keyboard obstruction |

### D. Staff POS and table service — 16 scenarios

| ID | End-to-end journey | Pass criteria and evidence |
| --- | --- | --- |
| POS-001 | Walk-in -> cashier opens available table -> orders -> KDS -> pays -> closes | Table status, bill and guest-free visit remain consistent end to end |
| POS-002 | Reservation -> T assignment -> seat -> POS handoff -> order -> close | Guest/reservation identity persists and finishes automatically |
| POS-003 | Queue entry -> ping -> seat -> POS handoff -> order -> close | Queue number/party remain visible; seated conversion is reported once |
| POS-004 | Waiter sends round one -> returns to floor -> reopens table -> sends round two | One live bill; table selection stays intuitive and no premature History movement |
| POS-005 | Waiter adds quantities -> edits/removes unsent lines -> submits | Cart arithmetic, notes and item counts are exact before/after send |
| POS-006 | Mixed food/drink order with table and line notes -> submit | Correct KDS routes, printable notes and no station omission |
| POS-007 | Waiter abandons an unsent cart -> switches tables -> returns | No item crosses tables; intentional cart persistence/discard is explicit |
| POS-008 | Manager cancels one submitted item with reason -> kitchen and bill update | Only that line changes; actor/reason/audit and total are correct |
| POS-009 | Waiter marks delayed live order urgent -> KDS prioritizes -> serves | Urgent state is visible, reversible by terminal service state and auditable |
| POS-010 | Guests move tables with open bill -> authorized move -> complete visit | Bill/items/guest follow once; source table becomes correct/available |
| POS-011 | Staff tries open occupied/reserved/incompatible table -> chooses valid alternative | UI blocks or warns truthfully; no second active bill is created |
| POS-012 | Two waiters edit same table near-simultaneously -> submit different rounds | Server serialization/idempotency preserves both valid rounds without overwrite |
| POS-013 | Browser crashes after submission -> staff reopens POS -> resumes bill -> pays | Database truth wins; no resend prompt creates duplicate lines |
| POS-014 | Twenty-table board under service load -> find target -> open/add/pay/return | Tables remain scannable on Android landscape with bounded taps and no overlap |
| POS-015 | Close paid table -> immediately start next visit -> first order | New visit is isolated and table History shows the old bill separately |
| POS-016 | Staff requests split/merge/paid correction outside supported path -> manager workflow | Guardrail prevents silent accounting mutation and records the approved decision |

### E. Kitchen and beverage production — 10 scenarios

| ID | End-to-end journey | Pass criteria and evidence |
| --- | --- | --- |
| KDS-001 | Mixed round enters kitchen/bar -> each station prepares -> ready -> served | Every line appears at the correct station and terminal order state reconciles |
| KDS-002 | Whole ticket progresses Pending -> Preparing -> Ready -> Served | Counts, timers, toast/countdown and removal are correct on every lane |
| KDS-003 | Items on one ticket progress independently -> partial delivery -> final serve | Partially delivered state is truthful; no ready item disappears early |
| KDS-004 | Ticket exceeds yellow/orange/red thresholds -> staff completes it | Timer colors include text/time, escalation is accurate and history is retained |
| KDS-005 | Customer second round arrives while first is preparing -> station receives live | New lines are distinguishable and do not reset/hide prior work |
| KDS-006 | Waiter marks order urgent -> both applicable stations see priority -> serve | Priority ordering is stable and clears only when operationally complete |
| KDS-007 | Manager cancels one line while preparing -> station acknowledges -> bill updates | Cancelled line cannot be served/charged; remaining lines continue normally |
| KDS-008 | KDS loses Wi-Fi/reloads -> reconnects -> resumes current tickets | No ticket loss/duplication; stale local action cannot overwrite newer state |
| KDS-009 | Dinner-rush backlog across 20 tables -> filter stations -> clear in order | No hidden ticket; counts and oldest-wait metrics match the backlog |
| KDS-010 | Duplicate WebSocket event/reconnect replay occurs -> staff serves once | UI and database remain idempotent; one terminal event per line/ticket |

### F. Billing and payments — 14 scenarios

| ID | End-to-end journey | Pass criteria and evidence |
| --- | --- | --- |
| PAY-001 | Complete visit -> cashier selects Terminal -> confirms -> closes | Exact total/method/actor recorded; table stays until explicit close |
| PAY-002 | Complete visit -> staff-only Cash -> confirms -> closes -> reports | Cash is absent from customer UI and separated correctly in reports |
| PAY-003 | QR guest opens HitPay sandbox -> pays -> signed webhook -> paid -> close | Correct tenant/order/SGD amount; one settlement and customer success state |
| PAY-004 | Guest opens checkout -> abandons/cancels -> returns to table | Bill remains unpaid and recoverable; no false green/paid state |
| PAY-005 | Invalid webhook signature targets an order -> cashier later settles validly | Invalid event is rejected/logged without state change or secret leakage |
| PAY-006 | HitPay sends duplicate completion webhook -> staff refreshes -> closes | One paid timestamp/request and one financial record only |
| PAY-007 | Webhook amount/currency/reference mismatches -> reconciliation screen | Payment is quarantined/rejected; intended bill remains unpaid |
| PAY-008 | Valid webhook is delayed -> staff waits/refreshes -> event arrives | No duplicate checkout/charge; delayed event resolves the original request |
| PAY-009 | Customer requests payment -> staff sees yellow Requested -> records Terminal | Requested never equals Paid; status changes red/yellow/green correctly |
| PAY-010 | Staff attempts close with unpaid bill -> returns to payment -> settles -> closes | Initial close is blocked; no lines/history/session are lost |
| PAY-011 | Customer adds item while cashier reviews payment -> cashier refreshes total -> settles | Stale amount cannot be charged/closed; final bill includes the new item |
| PAY-012 | Cashier double-taps settlement under latency -> closes once | Idempotency prevents two payments, receipts or report entries |
| PAY-013 | Waiter attempts refund/void -> denied -> manager records correction/reason | Role boundary, audit trail and financial/report effect are exact |
| PAY-014 | GST 9% + approved tip case -> HitPay/Terminal -> receipt -> reports | Inclusive/exclusive basis, cents rounding, tax/tip splits and paid total reconcile |

### G. Android and XP-80T printing — 8 scenarios

| ID | End-to-end journey | Pass criteria and evidence |
| --- | --- | --- |
| PRT-001 | Paid bill -> cashier receipt job -> Android leases -> XP-80T prints/cuts | Morinaga header, lines, prices, GST/payment and total match the bill |
| PRT-002 | Three kitchen items -> one-slip-per-item mode -> three prints/cuts | Exactly three identified slips, correct table/order/time/note and no price if configured |
| PRT-003 | Mixed kitchen/beverage order -> station-scoped agents print | Food and drink reach only their configured destinations |
| PRT-004 | Printer offline during order -> jobs visible Pending/Failed -> reconnect -> print | Jobs retry once successfully; operator sees actionable state |
| PRT-005 | App retries/reloads after acknowledgement -> polls again | Completed jobs never reprint; job/lease IDs prove at-most-once completion |
| PRT-006 | Paper out mid-rush -> restore paper -> retry remaining jobs | Failed/partial state is clear and no order is silently lost |
| PRT-007 | Android/tablet/printer restart -> agent reconnects -> new order prints | Agent heartbeat returns online without generating duplicate old receipts |
| PRT-008 | Long names, Unicode and notes -> print/cut | Text is legible on 80mm paper; wrapping never hides quantity/table/order |

### H. Staff, roles and attendance — 6 scenarios

| ID | End-to-end journey | Pass criteria and evidence |
| --- | --- | --- |
| STF-001 | Each named role logs in -> performs allowed shift workflow -> logs out | Navigation and APIs enforce the same permission matrix |
| STF-002 | Waiter/receptionist opens profile/timetable/reports/settings URLs | Hourly rates, payroll, settings and financial reports remain inaccessible |
| STF-003 | Unscheduled staff selects profile -> photo clock-in -> works -> photo clock-out | Actual session appears on the correct date with accurate duration |
| STF-004 | Staff clocks in -> starts/ends break -> clocks out | Paid working time excludes break once; duplicate taps are idempotent |
| STF-005 | Admin corrects a mistaken clock time with reason -> export/report | Original/new times, actor and reason are retained; totals update once |
| STF-006 | Admin records annual leave/MC -> timetable coverage -> staff returns/works | Leave balances and schedule/actual attendance stay distinct and accurate |

### I. Realtime, interruption and recovery — 6 scenarios

| ID | End-to-end journey | Pass criteria and evidence |
| --- | --- | --- |
| RCV-001 | Active table/order -> browser refresh/crash -> reopen -> finish | Truth restores from server; cart/submission ambiguity is safely resolved |
| RCV-002 | Controlled API restart with open visits -> recovery -> order/pay/close | Persistent state survives and clients show reconnect/retry, not false success |
| RCV-003 | Controlled Redis/WebSocket restart -> queue/KDS changes -> reconnect | Database writes persist; missed events reconcile after reconnect |
| RCV-004 | Brief restaurant Wi-Fi loss across POS/KDS/customer -> restore | No lost/duplicated order/payment/print; offline state is visible |
| RCV-005 | Fresh logical backup -> disposable restore -> health/login/read checks | RPO/RTO recorded; tables/orders/images and schema are usable in restored stack |
| RCV-006 | Bad release detected -> rollback application -> resume open operations | Known-good build returns without reversing committed transaction data |

### J. Security, capacity and final dress rehearsal — 6 scenarios

| ID | End-to-end journey | Pass criteria and evidence |
| --- | --- | --- |
| LCH-001 | Morinaga user forces foreign tenant table/order/product/media IDs | Every access/mutation fails closed; no foreign metadata or timing leak |
| LCH-002 | Old QR, reservation, queue and access tokens are replayed after terminal state | Only intended read-only receipt/status remains; mutation and prior-session access fail |
| LCH-003 | Controlled invalid-login/join/call-waiter/order burst -> recovery | Rate limits protect service without locking legitimate restaurant operation |
| LCH-004 | 20 tables, 60 guest sessions, 10 staff/KDS sessions, two ordering rounds | <1% error, p95 core actions <2s, no lost/duplicate data and safe resource headroom |
| LCH-005 | End-of-day close after mixed reservation/queue/walk-in/HitPay/Terminal/Cash | Floor, KDS, queue, shifts, print jobs, payments, GST and reports reconcile exactly |
| LCH-006 | Opening-day rehearsal: health -> login -> QR -> order -> print -> pay -> close -> backup | All launch gates signed, no P0/P1, support/rollback ready and final smoke passes |

## 8. Controlled 20-table stress workload

The capacity run is not a request flood. It simulates a realistic peak service:

- 20 occupied tables and 60 customer browser sessions;
- 6 waiters/cashiers, 2 hosts, kitchen and bar displays;
- 20 first rounds within five minutes, mixed 2–8 items;
- second rounds on 10 tables while first rounds are preparing;
- 5 payment requests, 5 Terminal settlements and controlled HitPay sandbox
  settlements during the same window;
- reservations and queue joins continuing during the order burst;
- printer jobs for cashier plus station-routed item slips;
- one client Wi-Fi interruption and one KDS reconnect.

Capture p50/p95 action latency, HTTP/WebSocket errors, CPU, memory, DB
connections, Redis health, job backlog and exact entity counts. The run passes
only when all orders, items, tickets, settlements and receipts reconcile, not
merely when the UI remains responsive.

## 9. Execution waves

1. **Baseline:** freeze build, backup, health, tenant data, named accounts and
   clean operational counts.
2. **Normal journeys:** RES-001, QUE-001, QR-001, POS-001, KDS-001, PAY-001.
3. **Variants:** all remaining reservation, queue, QR, POS and KDS cases.
4. **Financial:** PAY-002 through PAY-014 after GST/HitPay configuration.
5. **Physical:** PRT-001 through PRT-008 on the actual tablet and XP-80T.
6. **Roles/workforce:** STF-001 through STF-006 with named accounts.
7. **Recovery/security:** RCV and LCH-001 through LCH-003 in a controlled window.
8. **Capacity:** LCH-004 with monitoring and prepared cleanup.
9. **Close/rehearsal:** LCH-005 and LCH-006, backup, owner/technical sign-off.

Do not advance a wave while it contains a P0/P1. P2 defects require an owner,
target release and explicit acceptance before final rehearsal.

## 10. Defect severity and stop-ship rules

| Severity | Meaning | Action |
| --- | --- | --- |
| P0 | Privacy breach, false/duplicate charge, lost order, cross-tenant mutation, unrecoverable corruption | Stop immediately, isolate, preserve evidence, rollback/disable affected path |
| P1 | Core journey blocked, incorrect total/state, printing unavailable, role bypass, material recovery failure | No launch; fix and rerun affected plus adjacent scenarios |
| P2 | Usability/recovery weakness with safe workaround | Fix before launch or record explicit owner acceptance and operator instruction |
| P3 | Cosmetic/non-blocking improvement | Backlog with evidence; no effect on launch score |

Automatic stop-ship conditions:

- any guest/session/cross-tenant privacy leak;
- any lost, duplicated or misrouted submitted item;
- any false, duplicated or unreconciled payment;
- unpaid close without an explicit audited manager override;
- customer access to a prior table visit after close;
- POS, KDS, print, Orders or Reports disagree on the same transaction;
- physical cashier/kitchen print path fails restaurant requirements;
- HitPay sandbox, 9% GST or final controlled payment is incomplete;
- no tested backup restore/rollback path;
- any unresolved P0/P1.

## 11. Per-scenario result record

```md
### <CASE-ID> — <title>

- Date/time SGT:
- Production build/commit/API schema:
- Actor accounts and roles:
- Browser/device/viewport/printer:
- Synthetic trace label:
- Start-state counts:
- Generated reservation/queue/table/order/payment/print IDs:
- Steps executed in the live UI:
- Expected state transitions:
- Actual result:
- POS/Orders/KDS/payment/receipt/report reconciliation:
- Functional correctness: /25
- Integrity: /25
- Usability: /15
- Realtime/recovery: /15
- Permission/privacy: /10
- Evidence/cleanup: /10
- Total: /100 and /10
- Status: PASS / PARTIAL / FAIL / BLOCKED / NOT RUN
- Defect/severity:
- Evidence links:
- Cleanup/retention proof:
- Retest build/result:
- Launch effect:
```

## 12. Master launch scorecard

| Area | Cases | Minimum | Status |
| --- | ---: | ---: | --- |
| Reservations | 12 | each >=9/10 | NOT RUN |
| Queue | 10 | each >=9/10 | NOT RUN |
| Customer QR | 12 | each >=9/10 | NOT RUN |
| Staff POS | 16 | each >=9/10 | NOT RUN |
| Kitchen/bar | 10 | each >=9/10 | NOT RUN |
| Billing/payment | 14 | each >=9/10 | NOT RUN |
| Android printing | 8 | each >=9/10 | NOT RUN |
| Staff/attendance | 6 | each >=9/10 | NOT RUN |
| Recovery | 6 | each >=9/10 | NOT RUN |
| Security/capacity/rehearsal | 6 | each >=9/10 | NOT RUN |
| **Total** | **100** | **no P0/P1** | **NOT RUN** |

## 13. Current known launch gates

The design and core service loop are validated, but these gates remain open
until proven by the cases above:

1. actual Android tablet + XP-80T Bluetooth receipt/kitchen slip run;
2. final Morinaga 9% GST configuration and accountant-approved arithmetic;
3. HitPay tenant sandbox, webhook and one controlled live-payment run;
4. named host/waiter/kitchen/manager accounts and full role matrix;
5. transactional email/password recovery;
6. owner MFA and recovery;
7. 20-table capacity run with Render metrics;
8. disposable backup restore rehearsal;
9. first-service support and rollback roster.

## 14. Final approval record

- Production commit:
- Backend schema:
- Backup/export timestamp:
- Upload backup timestamp:
- Test execution report:
- P0 open: `0 required`
- P1 open: `0 required`
- Accepted P2/P3 risks, owners and dates:
- HitPay approval:
- GST/accounting approval:
- Printer/device approval:
- Operations approval:
- Technical approval:
- Launch date/time:
- First-service responder:
- Final decision: `NOT YET ASSESSED`

The final decision may change to **LAUNCH READY** only after execution evidence,
not document completion alone.

