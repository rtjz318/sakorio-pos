# Morinaga Ramen Izakaya — final pre-launch certification execution results

Execution started: 5 November 2026 (Asia/Singapore)  
Controlling specification: `docs/0184-morinaga-final-prelaunch-certification-checklist-2026-11-05.md`  
Environment: live Sakorio production domains and authenticated Render workspace  
Tenant: `3` — Morinaga Ramen Izakaya  
Execution status: **IN PROGRESS — six live-browser batches recorded, including security hardening verification**

## 1. Rules applied

- Browser-visible production behavior is the acceptance evidence.
- No source-derived assertion is counted as a live QA pass.
- No real reservation, queue entry, order, payment or account was created in
  this first safe/read-only batch.
- Batch 3 used the owner-approved synthetic reservation, queue, table, order,
  terminal-payment and table-close records documented below. No real HitPay
  charge was attempted.
- HitPay and 9% GST remain deferred to Phase P by owner direction.
- Any `BLOCKED` or `NOT RUN` item is not a pass.
- Secrets, signed backup URLs and credentials are deliberately omitted.

## 2. Live baseline observed

| Item | Live evidence |
| --- | --- |
| Current deployed commit | `19bdc391` |
| API service | Render Standard, deployed and healthy |
| Active Render resources | Six active services: API, customer web, staff web, owner web, PostgreSQL and Redis/Valkey |
| API health | `status=ok` |
| Database health | `database=connected`, schema `20261023110000` |
| Runtime logs | Repeated health-check 200 responses; `ERROR` filter returned no visible entries in the inspected last hour |
| Database recovery | Seven-day point-in-time recovery visible |
| Logical export | Export created 5 November 2026 at 5:49 PM and completed with a downloadable backup file |
| Public build | `2.1.6 / 86faca8f` |
| Public restaurants | Ajisen visibly marked demo/training; Morinaga shown as production |
| Morinaga public menu | Correct restaurant identity; six category sections; SGD prices and product imagery rendered |
| Booking first usable availability | Approximately 20 seconds in this observed run; target is under 2 seconds |
| Staff authentication | Previously supplied Morinaga owner credential rejected by live staff login in this run |
| Password recovery | Owner account exists for tenant `3`, but both tenant SMTP credentials and global Render SMTP credentials are absent; the reset request cannot send email. A production-shell hard reset subsequently updated owner user `13`; live sign-in verification remains pending |

## 3. Phase A — release baseline and change control

| ID | Result | Score | Status | Evidence / required follow-up |
| --- | --- | ---: | --- | --- |
| MOR-LCH-001 | Production API and public build visibly identify commit `86faca8f` | 10 | PASS | Render deploy and public footer agree |
| MOR-LCH-002 | Render deploy is traceable to `rtjz318/sakorio-pos`, `development`, commit `86faca8f` | 10 | PASS | Live deploy page |
| MOR-LCH-003 | No formal owner-approved configuration freeze was recorded | 0 | BLOCKED | Name freeze start/end and change approver before dress rehearsal |
| MOR-LCH-004 | API `/health` returned `{"status":"ok"}` | 10 | PASS | Live browser response |
| MOR-LCH-005 | `/health/db` returned connected with schema `20261023110000` | 10 | PASS | Live browser response |
| MOR-LCH-006 | Redis/Valkey is present and active; realtime functional exercise remains | 8 | PARTIAL | Complete queue/KDS realtime checks later |
| MOR-LCH-007 | All six required services appear in Render's Active list; API is Standard | 9 | PASS | Reconfirm each frontend/Redis/database paid plan in infrastructure phase |
| MOR-LCH-008 | Last-hour API log view showed health 200s and no visible match for `ERROR` | 9 | PASS | Repeat after mutation and load phases |
| MOR-LCH-009 | Booking UI used the 5 November Singapore service date and exposed upcoming evening slots | 9 | PASS | Cross-midnight transaction timestamps remain to be tested |
| MOR-LCH-010 | Clean operational baseline could not be proven without staff access | 0 | BLOCKED | Restore owner login, then record tables/bills/KDS/queue/shifts |

Phase A provisional score (completed evidence only): **9.3/10**.  
Phase A certification status: **BLOCKED** by MOR-LCH-003 and MOR-LCH-010.

## 4. Phase B — tenant isolation, security and authentication

| ID | Result | Score | Status | Evidence / required follow-up |
| --- | --- | ---: | --- | --- |
| MOR-LCH-011 | Staff login page loaded, but saved Morinaga owner credential was rejected. Live recovery request could not send email because SMTP is not configured. A hidden-input production-shell hard reset then returned `Password updated` for owner user `13` | 5 | PARTIAL | Complete live sign-in with the newly selected private password; configure transactional SMTP before launch |
| MOR-LCH-012 | Management route displayed owner/admin-only scope; authentication not completed | 7 | PARTIAL | Re-run with working owner and non-admin account |
| MOR-LCH-013 | Not run; requires authenticated Morinaga session | 0 | NOT RUN | Force foreign table ID after login |
| MOR-LCH-014 | Not run; requires authenticated Morinaga session | 0 | NOT RUN | Force foreign order ID after login |
| MOR-LCH-015 | Not run; requires authenticated Morinaga session | 0 | NOT RUN | Attempt foreign product/media mutation safely |
| MOR-LCH-016 | Menu, booking and waitlist consistently identified Morinaga | 10 | PASS | Public live browser evidence |
| MOR-LCH-017 | Public restaurant chooser clearly labelled Ajisen `DEMO RESTAURANT — TRAINING ONLY`; Morinaga was not marked demo | 10 | PASS | Public chooser evidence |
| MOR-LCH-018 | Not run because staff login failed | 0 | BLOCKED | Login, logout, refresh and back-navigation sequence |
| MOR-LCH-019 | Not run because staff login failed | 0 | BLOCKED | Session-expiry recovery sequence |
| MOR-LCH-020 | Not run in safe batch | 0 | NOT RUN | Controlled throttling test with approved QA account |
| MOR-LCH-021 | Staff roster/role accounts are not yet available | 0 | BLOCKED | Create individual roles before role-matrix execution |
| MOR-LCH-022 | Not run because role accounts are unavailable | 0 | BLOCKED | Verify hourly-rate privacy with owner and waiter |
| MOR-LCH-023 | Not run in this browser batch | 0 | NOT RUN | Inspect production response headers |
| MOR-LCH-024 | Not run in this browser batch | 0 | NOT RUN | Approved/untrusted origin comparison |
| MOR-LCH-025 | Previously hardened; current browser re-verification still pending | 0 | NOT RUN | Capture current PostgreSQL inbound-rule screen |
| MOR-LCH-026 | Not run; requires repository/asset/response secret scan plus browser bundle check | 0 | NOT RUN | Produce scan evidence without exposing findings |
| MOR-LCH-027 | MFA/credential-rotation evidence is absent | 0 | BLOCKED | Rotate owner credential and enable MFA |
| MOR-LCH-028 | Staff roster remains owner-deferred | 0 | BLOCKED | Record account-retirement owner/date before launch |

Important UX finding: the `?tenant=3` customer/staff login surfaces do not
visibly identify Morinaga. The management route says `Management sign in` and
`Owners and administrators only`, but it also omits the restaurant name. This
creates wrong-restaurant risk in a shared deployment and is logged as P2 until
tenant identity is visible before credentials are entered.

## 5. Phase C — public master-data/menu observations

| ID | Result | Score | Status | Evidence / required follow-up |
| --- | --- | ---: | --- | --- |
| MOR-LCH-029 | Morinaga display name and description are correct; legal identity is not visible/approved | 8 | PARTIAL | Complete legal/UEN evidence in Phase P |
| MOR-LCH-030 | Public phone, WhatsApp, Orchard Plaza address, website and map link rendered | 9 | PASS | Business email/UEN still required |
| MOR-LCH-031 | Public booking showed Mon–Sat 18:30–04:30 and Sunday closed; overnight slots were present | 9 | PASS | Complete controlled booking across service-day boundary |
| MOR-LCH-032 | Public menu consistently displayed SGD with two decimals | 10 | PASS | Reconcile POS/receipt/report later |
| MOR-LCH-033 | Six category sections rendered; full 112-item source reconciliation remains | 8 | PARTIAL | Run complete count/source comparison |
| MOR-LCH-034 | Sample names rendered without encoding corruption; full name audit remains | 8 | PARTIAL | Check all 112 against approved source |
| MOR-LCH-035 | Sample prices rendered as non-zero SGD values; full source check remains | 8 | PARTIAL | Check every product price |
| MOR-LCH-036 | Many product images loaded; some text-only products remain visible | 8 | PARTIAL | Count image success/fallback and redeploy persistence |
| MOR-LCH-038 | Six collapsible category headers prevent an unstructured menu wall | 10 | PASS | Repeat on mobile viewports |
| MOR-LCH-047 | Restaurant name/description appear consistently on public menu | 9 | PASS | Official logo/header approval remains |

Public-landing UX finding: the guest home page still exposes `Create account`,
`Provider login`, `Courier login` and `Register as provider`. These are not part
of a restaurant customer's core journey and add avoidable cognitive load. Log
as P2 for a dedicated/tenant-directed launch experience.

## 6. Phase E — reservation observations

| ID | Result | Score | Status | Evidence / required follow-up |
| --- | --- | ---: | --- | --- |
| MOR-LCH-058 | Calendar shell rendered quickly, but usable availability appeared only after approximately 20 seconds | 4 | FAIL (P1) | Profile/fix availability query; target under 2 seconds |
| MOR-LCH-059 | Empty required fields kept submission disabled; focus/error behavior not yet exercised | 6 | PARTIAL | Requires controlled non-production form submission sequence |
| MOR-LCH-060 | Phone field shows clear `+65 9123 4567` guidance | 8 | PARTIAL | Error focus/correction not yet executed |
| MOR-LCH-062 | Friday exposed both 00:00–03:30 and 18:30 onward, consistent with overnight operation | 10 | PASS | Verify completed reservation maps to intended service day |

No reservation was submitted because creation is an external side effect and
requires action-time approval with the exact synthetic guest details.

## 7. Phase F — public queue observations

The Morinaga waitlist loaded with correct restaurant identity, `0 parties
ahead`, name/mobile/party-size/notes inputs and a disabled-until-valid join
button. Queue number, live ping, seating, cancellation and rollover cannot be
certified until a controlled queue entry is created.

## 8. Phase O — backup and recovery observations

| ID | Result | Score | Status | Evidence / required follow-up |
| --- | --- | ---: | --- | --- |
| MOR-LCH-193 | Fresh logical database export completed on 5 November 2026 at 5:49 PM | 10 | PASS | Signed download URL intentionally omitted |
| MOR-LCH-194 | Render visibly offered recovery to any timestamp in the previous seven days | 10 | PASS | Current PITR evidence captured |
| MOR-LCH-196 | Disposable restore rehearsal has not been performed | 0 | BLOCKED | Creating a paid recovery database requires action-time financial approval |

## 9. Defects and blockers opened in batch 1

| Defect | Severity | Affected checks | Result |
| --- | --- | --- | --- |
| Live Morinaga owner credential rejected | P1 | 010–015, 018–022 and all protected phases | Production hard reset succeeded for owner user `13`; live sign-in verification is the remaining access gate |
| Transactional email is not configured | P1 | 011, password recovery and all email-dependent launch flows | Live shell confirmed the owner exists under Morinaga tenant `3`; tenant SMTP user/password are unset and the API has no global SMTP user/password variables, so reset email delivery is impossible |
| Reservation availability takes about 20 seconds | P1 | 058, 171 | Fails the under-two-second launch target |
| Tenant `3` login pages omit Morinaga identity | P2 | 011, 012, 016, 192 | Shared-stack wrong-restaurant confusion risk |
| Guest landing contains provider/courier/account links | P2 | 016, 192 | Distracts from booking/queue/table ordering |
| Staff roster and individual role accounts unavailable | P1 | 021, 022, 048–057 | Role, rates and operations cannot be certified |

## 10. Next executable batch

Once owner access is restored, continue in this order:

1. record clean operational baseline;
2. execute authenticated tenant-isolation checks;
3. run role/permission checks for available accounts;
4. verify menu/table/QR data from staff surfaces;
5. prepare controlled reservation and queue records for action-time approval;
6. begin POS/KDS order lifecycle using designated QA tables;
7. record every mutation and cleanup proof.

Current launch decision: **NO-GO — certification in progress**.

## 11. Authenticated live-browser batch 2

The owner password was hard-reset through a hidden-input production shell and
the live staff portal then accepted the new credential. The authenticated
header identified `Morinaga Ramen Izakaya`, the account email, and role
`Owner`. The staff build displayed `2.1.6 / 9eeb23eb`.

| ID | Result | Score | Status | Evidence / required follow-up |
| --- | --- | ---: | --- | --- |
| MOR-LCH-010 | Clean baseline: 10 available tables, 0 open bills, 0 active orders, 0 queue records, 0 reservations, 0 kitchen tickets and 0 open staff sessions | 10 | PASS | Live Tables, POS, Orders, Queue, Reservations, Kitchen and Reports pages |
| MOR-LCH-011 | Morinaga owner login accepted after the production hard reset; tenant name and Owner role rendered | 10 | PASS | Live staff dashboard |
| MOR-LCH-013 | Forcing Ajisen table ID `1` into the Morinaga POS did not expose or select that table; only Morinaga's ten tables rendered | 10 | PASS | Authenticated live URL-forcing test |
| MOR-LCH-014 | Forcing Ajisen order ID `273` with Morinaga table ID `11` removed the foreign `orderId` from the URL and exposed no Ajisen order data | 10 | PASS | Authenticated live URL-forcing test |
| MOR-LCH-021 | User Management contains only the Morinaga owner/administrator | 1 | BLOCKED (P1) | Create individual host, waiter/cashier, kitchen and manager accounts before role certification |
| MOR-LCH-027 | Optional OTP is currently disabled for the owner | 2 | BLOCKED (P1) | Enable and recovery-test owner MFA before launch |
| MOR-LCH-037 | POS reported 112 catalog items across six menu categories; all sampled prices were non-zero SGD values | 9 | PASS | Full approved-source reconciliation still required |
| MOR-LCH-039 | POS category counts total 112 and match the live catalog total | 10 | PASS | `8 + 41 + 8 + 24 + 19 + 12 = 112` |
| MOR-LCH-048 | Dynamic attendance page is operational and allows unscheduled clock-in with photo | 8 | PARTIAL | Controlled photo clock-in/out still required |
| MOR-LCH-049 | Timetable shows actual attendance automatically and planned shifts as optional | 8 | PARTIAL | Controlled clock-in/out evidence still required |
| MOR-LCH-050 | No operational staff profiles exist; timetable contains only the owner account | 1 | BLOCKED (P1) | Add named employee profiles |
| MOR-LCH-189 | Printing reports `0/0` online agents, no printer, no heartbeat and 13% XP-80T readiness | 1 | BLOCKED (P1) | Complete tablet plugin/token/Bluetooth/heartbeat and receipt tests |

### Batch 2 configuration facts

- Currency is `SGD`.
- HitPay is set to `Sandbox`; final payment certification remains deferred to
  Phase P by owner direction.
- Immediate payment is disabled.
- Fiscal mode is off.
- Tenant SMTP fields and global SMTP variables are absent; email-dependent
  flows are not launch-ready.
- Both `GST 0%` and `GST 9%` are currently active from 10 July 2026. The final
  tax selection and receipt arithmetic remain deferred to Phase P, but the
  simultaneous records must be resolved before live orders.
- Optional account OTP is disabled.
- Printer launch readiness is 13%, with no paired/online agent or completed
  print job.

### New live defect

The Queue page reported `0 clear tables` while Tables and POS simultaneously
showed all ten Morinaga tables as idle/available. This is a **P1 host-stand
consistency defect** because it can prevent or confuse queue-to-table seating.
The availability calculation must be aligned and re-tested before launch.

Current launch decision after batch 2: **NO-GO**. Protected access and tenant
isolation pass, but operational role coverage, queue/table consistency,
transactional email, printer readiness, MFA, tax finalization and controlled
end-to-end transactions remain incomplete.

## 12. Controlled live-browser batch 3 — complete restaurant service loop

Execution date: 5 November 2026 (Asia/Singapore)

Live staff build: `2.1.6 / 9eeb23eb`

Operator role: Morinaga `Owner`

Test data: synthetic QA guest, reservation and queue records approved by the
owner before mutation

This batch exercised the live production UI from host-stand intake to final
reporting. The browser was used for every state transition. No API or database
shortcut was used to manufacture a pass.

### 12.1 Transaction evidence

| Record | Live result |
| --- | --- |
| Reservation | `#100`, party of 2, created by staff for the current service day and later finished automatically when T01 closed |
| Queue | `Q001` / backend entry `64`, party of 2, progressed from Waiting to Notified to Seated at T06 |
| Reservation table | T01 |
| Queue table | T06; released after the controlled seating check because no order was opened there |
| Order | `#274`, T01, two items, SGD 9.00 |
| Kitchen routing | Food item routed to Kitchen; drink routed to Beverages |
| Payment | Synthetic internal Terminal payment, SGD 9.00; no external card or HitPay charge |
| Final state | T01 and T06 available; no open bills, active orders or live kitchen tickets |

The two ordered items were `A1 Kimchi` at SGD 4.00 and `Green Tea (Hot or
Cold)` at SGD 5.00. The order history, POS bill and report total all reconciled
to SGD 9.00.

### 12.2 End-to-end scorecard

| Flow | Score | Status | Live result |
| --- | ---: | --- | --- |
| Staff authentication and tenant identity | 10/10 | PASS | Owner login succeeded and Morinaga tenant identity remained visible |
| Reservation creation | 8/10 | PARTIAL | Reservation created correctly; availability took about 22 seconds to become usable |
| Reservation arrival and table assignment | 7/10 | FAIL (P1) | Seating at T01 worked, but an unrelated queue record with the same phone number was incorrectly shown as this reservation's queue history |
| Queue creation and number visibility | 9/10 | PASS | Q001 was immediately visible with party and wait details |
| Queue notify transition | 9/10 | PASS | Waiting changed to Notified without a refresh; external handset/SMS delivery was not independently verified |
| Queue seating and table handoff | 9/10 | PASS | Q001 seated at T06 and POS opened with a queue-handoff confirmation |
| Table release/reset | 10/10 | PASS | Empty T06 was released through explicit confirmation and returned to Available |
| POS catalog, cart and order submission | 10/10 | PASS | Two items totalled SGD 9.00 and submitted as order #274 |
| Orders overview | 10/10 | PASS | Active order showed T01, two items and the correct total |
| Kitchen and beverage routing | 10/10 | PASS | Food and beverage appeared in their correct production lanes |
| KDS lifecycle | 10/10 | PASS | Start, Ready and Served states completed; served toast included a five-second removal countdown |
| POS payment panel | 10/10 | PASS | Terminal payment recorded as paid with the correct amount and method |
| Table close and linked reservation finish | 10/10 | PASS | Final confirmation explained consequences; T01 reset and reservation #100 finished automatically |
| Order history | 10/10 | PASS | #274 retained item, guest, table, paid-state and SGD 9.00 evidence |
| Sales reporting | 9/10 | PASS | SGD 9.00 collected, one order, SGD 9.00 average ticket, Terminal 100% |
| Reservation reporting source | 6/10 | FAIL (P2) | Staff-created reservation was classified as `Public (book page)` |
| Queue conversion reporting | 3/10 | FAIL (P1) | Completed queue entry reported `0 seated / 0% seated` after Q001 was visibly seated at T06 |
| End-of-day operational state | 10/10 | PASS | Reports showed zero active tables, open bills and kitchen tickets |

The earlier `0 clear tables` queue defect was not reproduced in this batch: the
queue seating dialog showed all ten Morinaga tables as clear, and Q001 was
successfully assigned to T06. Treat that earlier defect as **recovered but
regression-sensitive**, not as an open blocker.

Batch 3 weighted operational score: **8.8/10**.

Core order-to-kitchen-to-payment score: **10/10**.

Host/reports data-integrity score: **6.6/10**.

## 13. Defects proven by batch 3

### MOR-P1-001 — reservation/queue identity is correlated by shared phone data

Reservation `#100` and queue `Q001` were deliberately created as separate QA
records but used the same test phone. The reservation card immediately claimed
that its guest was already on the live queue, then followed the unrelated queue
through Notified, Seated and Completed states. The queue source remained `Host
stand` and its guest name differed from the reservation guest name.

Required correction:

1. Link a reservation to a queue entry only through an explicit foreign key or
   handoff identifier.
2. Never infer current queue ownership from phone number alone.
3. Keep phone matching as a clearly labelled suggestion requiring staff
   confirmation if duplicate detection is desired.
4. Add regression cases for two unrelated parties sharing a phone, family
   bookings, repeat visits and a phone reused on different service days.

Severity: **P1** because the host can act on the wrong party and the reservation
timeline becomes false.

### MOR-P1-002 — seated queue entry is not counted as seated conversion

Q001 visibly moved through Waiting, Notified and Seated at T06. Reports later
showed one completed queue entry but `0 seated`, `0% seated conversion`, and
daily throughput `1 total · 0 seated`.

Required correction:

1. Persist a dedicated seated timestamp/outcome when the host assigns a table.
2. Do not overwrite the seated outcome when a table is later released or the
   queue record becomes Completed.
3. Derive conversion from immutable lifecycle events rather than the current
   display status.
4. Reconcile queue detail, daily throughput and outcome widgets from the same
   source of truth.

Severity: **P1** for launch analytics and operational decision accuracy. The
guest-facing/host-facing seating action itself worked.

### MOR-P2-003 — staff-created reservation source is mislabeled as public

Reservation #100 was created from the authenticated Reservations page, but the
report classified it as `Public (book page) 1 (100%)`.

Required correction: persist the creation channel at write time (`public`,
`staff`, `import`, `phone` or equivalent) and report the stored channel without
guessing from missing fields.

### MOR-P2-004 — booking availability remains too slow

The staff reservation form took approximately 22 seconds before current/future
slots were usable. The flow eventually worked but fails the under-two-second
launch target and creates a high risk of duplicate clicks or abandoned phone
bookings during service.

## 14. Cleanup and retained audit data

- T01 and T06 were returned to Available.
- The POS showed no open bill after closing T01.
- Kitchen showed no active ticket after serving #274.
- Active queue and active reservation boards returned to zero.
- Reservation #100 remains as Finished history.
- Queue Q001 remains as completed history.
- Paid order #274 remains as order/report evidence for SGD 9.00.
- No history record was deleted. Deletion was not necessary for operational
  cleanup and would require explicit destructive-action confirmation.

## 15. Updated launch decision

The live core service path is proven functional: **table assignment → cart →
order → kitchen/beverage routing → served → terminal settlement → close table
→ history/report reconciliation** all passed.

The system is **not yet certified 10/10 or unconditional GO** because the two
P1 data-integrity defects above can misidentify a reservation party and
misreport queue conversion. The current decision is:

**CONDITIONAL NO-GO pending MOR-P1-001 and MOR-P1-002, plus the already-open
operational launch gates for role accounts, printer, final GST/HitPay setup,
transactional email and MFA.**

After the two P1 fixes are deployed, rerun this exact transaction pattern with:

1. separate phone numbers to prove normal behavior;
2. the same phone number on unrelated reservation/queue records to prove no
   false linkage;
3. one queue party seated and one cancelled/no-show to reconcile every report
   widget;
4. a staff-created and public-created reservation to verify source reporting.

## 16. Batch 4 — P1 remediation and live targeted regression

Fix commit: `9fc49498` — `fix: preserve queue seating truth in host workflows`

Deployment evidence:

- API Render service deployed `9fc49498` and reported Live.
- Staff web Render service deployed `9fc49498` and reported Live.
- The authenticated staff header displayed `POS 2.1.6 / 9fc49498` for Morinaga.

### 16.1 MOR-P1-001 closure — explicit reservation/queue identity

Implementation:

- Reservation and Queue screens now resolve reservation queue history only
  when `GuestQueueEntry.linked_reservation_id` equals the reservation ID.
- The unsafe phone-number fallback was removed.
- The UI no longer presents an unrelated phone match as `Recent queue history`.

Live proof using the original defect records:

- Reservation `#100` displayed as Finished with its own guest, party and notes.
- It displayed no queue-history chip or queue-derived status.
- Queue `Q001` remained visible under Include closed with the same phone number,
  a different guest name, source `Host stand`, status Completed and table T06.
- The Queue board reported `0 reservation-linked`, confirming Q001 was not
  explicitly linked to reservation #100.

Result: **PASS — P1 defect closed in live browser.**

### 16.2 MOR-P1-002 closure — durable queue seating conversion

Implementation:

- Queue analytics now treat `seated_at` as the durable seating outcome.
- A visit remains counted as seated after its live status changes from Seated
  to Completed when the table is closed or released.
- The conversion numerator uses unique lifecycle outcomes, avoiding double
  counting a converted record that also contains seating evidence.
- Daily throughput and the summary conversion use the same seating predicate.

Live proof using Q001:

| Report signal | Before fix | After live deployment |
| --- | ---: | ---: |
| Queue entries | 1 | 1 |
| Seated count | 0 | 1 |
| Seat conversion | 0% | 100% |
| Daily throughput | 1 total · 0 seated | 1 total · 1 seated |
| Daily seated rate | 0% | 100% |

Result: **PASS — P1 defect closed in live browser.**

### 16.3 Automated and local verification

- Targeted backend suite: **9 passed**.
- Added an integration regression proving a Completed queue visit with
  `seated_at` remains included in conversion and daily throughput.
- Added unit coverage for completed-seated, completed-unseated and legacy live
  seated records.
- Angular hot-reload compilation completed without TypeScript/Angular errors.
- Local HAProxy landing request returned HTTP `200`.
- Backend and frontend container logs contained no new application/compiler
  errors after the change.

### 16.4 Updated scores and launch decision

| Area | Previous | Current | Result |
| --- | ---: | ---: | --- |
| Reservation/queue identity | 7/10 | 10/10 | Explicit linkage only |
| Queue conversion reporting | 3/10 | 10/10 | Durable seated outcome reconciled |
| Host/reports data integrity | 6.6/10 | 9/10 | P2 source attribution remains |
| Core order-to-payment flow | 10/10 | 10/10 | No regression |

The two P1 defects discovered in batch 3 are closed. The launch decision
remains **CONDITIONAL NO-GO** for the separate already-documented launch gates:

1. operational role accounts and role-matrix certification;
2. printer/tablet agent readiness and physical receipt tests;
3. final 9% GST configuration and receipt arithmetic;
4. final HitPay sandbox/production payment certification;
5. transactional email/password recovery;
6. owner MFA and recovery testing;
7. P2 reservation source attribution and reservation availability latency.

No new live reservation, queue entry, order or payment was created for batch 4;
the regression reused the retained batch-3 audit records.

## 17. Batch 5 — reservation reporting and booking-speed remediation

Fix commit: `3d8458c2` — `fix: make reservation reporting and availability reliable`

Deployment evidence:

- API Render service deployed `3d8458c2` and reported Live.
- Staff web Render service deployed `3d8458c2` and reported Live.
- The authenticated staff header displayed `POS 2.1.6 / 3d8458c2` for Morinaga.

### 17.1 MOR-P2-003 remediation — explicit reservation source

Implementation:

- Added a persisted reservation source with the canonical values `public`,
  `staff`, and `queue`.
- Public booking writes `public`; authenticated reservation creation writes
  `staff`; queue conversion writes `queue`.
- Reservation serialization exposes the stored source to staff clients.
- Reports now aggregate the persisted source instead of guessing that every
  reservation with a public-view token came from the public book page.
- The migration safely defaults historical rows to `public` because their
  original authenticated/public channel was not stored and cannot be inferred
  reliably after the fact.

Verification:

- Endpoint-level tests created one unauthenticated public booking and one
  authenticated staff booking and confirmed both API responses and database
  rows retained distinct sources.
- Reporting regression created public, staff and queue-source reservations,
  all with tokens, and confirmed the report returned one count for each source.
- The live report loaded successfully on `3d8458c2`. Its retained reservation
  #100 is a historical row and therefore remains under the documented legacy
  default; no production booking was fabricated merely to alter the chart.

Result: **PASS in deployed code and endpoint/report integration tests.** A new
real staff booking after this deployment will report as Staff.

### 17.2 MOR-P2-004 closure — bounded booking availability

Root cause:

- Month and week availability repeated the same table, seated-reservation,
  active-order, reservation-demand and opening-hours queries for every slot.
- Query volume therefore grew with days × time slots and caused the observed
  approximately 22-second staff wait.

Implementation:

- Added one request-scoped availability snapshot for tables, active occupancy,
  orders and reservation demand.
- Added a range-based opening-hours resolver that loads baseline schedules and
  date overrides once, while preserving overnight, baseline and narrowest-
  override semantics.
- Month, week and day availability now reuse these snapshots without changing
  the capacity or zone rules.

Live browser measurements on Morinaga after deployment:

| Signal | Result |
| --- | ---: |
| Month availability endpoint | 162 ms |
| Selected-day slots endpoint | 108 ms |
| Reservation modal to usable calendar + time control | 277 ms |
| Launch target | under 2 seconds |

The month regression also enforces a maximum of 20 SQL statements for the
whole calendar request, preventing the slot-by-slot query pattern from
returning.

Result: **PASS — availability latency reduced from about 22 seconds to well
under the two-second target in the live browser.**

### 17.3 Verification summary

- Distinct focused backend tests: **21 passed**.
- Opening-hours range resolver was proven equivalent to the single-date rules
  across baseline changes, overrides, closed dates and overnight service.
- Angular hot-reload compilation completed successfully with no TypeScript or
  Angular compiler error.
- Local HAProxy landing request returned HTTP `200`.
- Backend startup applied migration `20261105170000` and remained healthy.
- No new production reservation, queue record, order, payment or message was
  created during this batch.

### 17.4 Updated scores and decision

| Area | Previous | Current | Result |
| --- | ---: | ---: | --- |
| Reservation source attribution | 6/10 | 9/10 | Explicit write-time source; historical row remains non-inferable |
| Reservation availability latency | 6/10 | 10/10 | 277 ms live UI readiness |
| Host/reports data integrity | 9/10 | 9.5/10 | P1 defects closed; source schema corrected |
| Core order-to-payment flow | 10/10 | 10/10 | No regression |

The software-controlled reservation defects from batch 3 are now remediated.
The launch decision remains **CONDITIONAL NO-GO** only for the separate physical
and configuration gates already documented: role-account certification,
printer/tablet receipt testing, final GST arithmetic, final HitPay payment
certification, transactional email/password recovery, and owner MFA/recovery.

## 18. Batch 6 — security boundary and browser hardening certification

Fix commit: `19bdc391` — `fix: add restrictive browser content security policy`

### 18.1 Live authentication and tenant boundary

| ID | Result | Score | Status | Evidence / required follow-up |
| --- | --- | ---: | --- | --- |
| MOR-LCH-011 | Morinaga owner login succeeded and the staff shell rendered the Morinaga tenant and Owner role | 10 | PASS | Live browser on `19bdc391` |
| MOR-LCH-012 | Owner-only management surfaces are available; no production non-admin role account exists yet | 8 | PARTIAL | Complete the role matrix after named staff accounts are provisioned |
| MOR-LCH-013 | An authenticated foreign table/order deep link rendered only Morinaga's ten-table floor and selected no foreign table | 10 | PASS | Live browser URL-forcing test |
| MOR-LCH-014 | The foreign order ID was not rendered and no foreign order content appeared | 10 | PASS | Live browser URL-forcing test |
| MOR-LCH-015 | Order IDOR, upload and settings-isolation suites passed; production data was not mutated for this test | 8 | PARTIAL | Add a disposable second-tenant mutation fixture in staging for a future destructive pass |
| MOR-LCH-018 | Logout returned to login; browser back plus reload did not restore protected access; owner could sign in again | 10 | PASS | Live browser logout/back/refresh sequence |

### 18.2 Response, origin and asset hardening

- Staff and customer web responses now return a Content-Security-Policy in
  addition to HSTS, `nosniff`, `DENY` framing, strict referrer policy and a
  restrictive permissions policy.
- The CSP restricts scripts, API/WebSocket connections, images, fonts, forms,
  plugins, framing, workers and mixed content to the minimum currently needed
  by the Angular SPA, Sakorio API and Google-hosted Inter font.
- Staff Dashboard and Products loaded on the deployed commit with no browser
  CSP warning/error. The customer restaurant chooser and full Morinaga public
  menu also loaded, including API-hosted product images, with no CSP violation.
- Approved preflight from `https://staff.sakorio.com` returned that exact
  allow-origin. An untrusted origin returned HTTP 400 and no allow-origin.
- Both `https://staff.sakorio.com/` and `https://order.sakorio.com/` returned
  HTTP 200 with the new CSP after deployment.

| ID | Result | Score | Status | Evidence / required follow-up |
| --- | --- | ---: | --- | --- |
| MOR-LCH-023 | Required browser headers, including the newly deployed CSP, are present on both live portals | 10 | PASS | Live HTTPS headers plus browser console regression |
| MOR-LCH-024 | Approved Sakorio origin allowed; untrusted origin rejected without allow-origin | 10 | PASS | Live API preflight comparison |
| MOR-LCH-026 | Tracked-source secret-pattern scan returned zero files | 10 | PASS | Scan intentionally reported file count only; no secret material was printed |

### 18.3 Automated security evidence

- Route inventory, order IDOR, upload isolation, settings security and payment
  security: **26 passed**.
- The fail-closed route inventory still requires every new FastAPI route to be
  protected or explicitly reviewed as public/capability-token based.
- Full production Docker build completed and the Angular compiler reported no
  error. Nginx configuration validation passed.

### 18.4 Newly discovered dependency launch blocker

The production-only Node dependency audit is not clean:

- **2 critical** advisories;
- **9 high** advisories;
- **1 moderate** advisory.

The affected direct runtime families include Angular and Capacitor. Fixed
versions are available, but the pinned manifest and lockfile must be upgraded
together in a controlled container-only change, followed by the complete
Angular build, native-shell build checks and live browser regression. No
`npm audit fix --force` was used because an unreviewed forced dependency rewrite
would be unsafe immediately before launch.

Security boundary score excluding the unresolved dependency versions:
**9.7/10**. Overall security launch gate: **NO-GO until the dependency upgrade
and regression pass are complete**. Existing role-account, physical printer,
GST, HitPay, SMTP and MFA launch gates remain unchanged.
