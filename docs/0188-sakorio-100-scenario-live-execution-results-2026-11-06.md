# Sakorio 100-scenario live pre-launch execution results

Execution started: 6 November 2026 (Asia/Singapore)  
Controlling plan: `docs/0187-sakorio-master-prelaunch-stress-test-and-technical-blueprint-2026-11-06.md`  
Environment: live Sakorio production portals, supplemented only by explicitly
identified local automated validation  
Primary tenant: Morinaga Ramen Izakaya (`tenant_id=3`)  
Observed live build: `2.1.6 / 288f1b05`  
Status: **IN PROGRESS**

## 1. Execution rules

- A browser-visible production result is required for every functional pass.
- Automated tests can support integrity/security evidence but cannot replace a
  missing live journey.
- `BLOCKED` and `NOT RUN` are never counted as passes.
- Synthetic records use `PLQA-1106-<case-id>` labels.
- External payment, destructive cleanup and third-party communication follow
  action-time safety confirmation requirements even when the broader test run
  is pre-authorized.
- Physical printer cases require the actual Android tablet and XP-80T; browser
  simulations cannot be promoted to physical passes.

## 2. Starting live baseline

| Area | Live evidence |
| --- | --- |
| Authentication | Morinaga Owner login succeeded |
| Floor/POS | 10 tables loaded, 10 available, 0 open bills, SGD 32.80 paid today, 112 products |
| Queue | 0 waiting, 0 notified, 0 active; dashboard shows 1 historical seated conversion |
| Reservations | 0 active; reservation `#101` remains Finished |
| Order history | Bill `#275` remains Paid for SGD 32.80 |
| Printing | 0/0 agents online; 9 pending jobs; 0 printed; native plugin unavailable in browser; readiness 13% |
| Staff accounts | One account only: Morinaga Administrator / Owner |
| Tax | Open-ended GST 0% and GST 9% records both visible from 10 July 2026 |
| HitPay | Sandbox mode; credentials masked/blank by design |
| SMTP | Tenant SMTP fields empty |
| MFA | Owner OTP disabled |

## 3. Baseline launch findings

| Defect | Severity | Affected cases | Initial result |
| --- | --- | --- | --- |
| No online printer agent and nine pending jobs | P1 | PRT-001–008, LCH-005–006 | BLOCKED/FAIL |
| No named host, waiter, kitchen, bartender or manager accounts | P1 | STF-001–006 and role portions of other cases | BLOCKED |
| SMTP not configured | P1 | RES-012 and credential-recovery launch gate | BLOCKED |
| Owner MFA disabled | P1 security gate | LCH-006 | BLOCKED |
| GST 0% and 9% both have no end date | P1 financial configuration | PAY-014, LCH-005–006 | FAIL until corrected/certified |
| HitPay remains Sandbox and final credentials/webhook are unverified | P1 payment gate | PAY-003–008, PAY-014, LCH-005–006 | BLOCKED |

## 4. Validation already executed in this run

- Focused backend workflow/security suites: **130 passed**, no failures.
- Local HAProxy application response: HTTP `200`.
- Backend health traffic remained HTTP `200` in inspected logs.
- Latest live full service pilot (`0186`): **9.9/10**, internal Terminal only.

## 5. Scenario results

All 100 IDs were evaluated against the live build. A prior live record was
reused only where its IDs and terminal state were still visible in the live
browser during this run. A scenario that needed an unavailable role, physical
device, external credential, concurrent operator, controlled outage or a new
state-changing production submission is explicitly `BLOCKED`; it is not
silently promoted from unit coverage.

### 5.1 Reservations

| ID | Status | Score | Live result / blocker |
| --- | --- | ---: | --- |
| RES-001 | PASS | 98 | Live `#101` remains Finished and linked pilot bill `#275` remains Paid; T06 is Available and reports reconcile SGD 32.80. |
| RES-002 | BLOCKED | 0 | No non-owner host identity exists and no staff-created booking was present for an attributable live replay. |
| RES-003 | FAIL | 45 | Booking page advertises 18:30–04:30 but today offers only 18:30–23:45; after-midnight service cannot be booked. |
| RES-004 | BLOCKED | 0 | No active synthetic booking was available for an edit-and-capacity replay. |
| RES-005 | BLOCKED | 0 | A new delay notice would require a live guest submission; no active booking existed to verify the realtime change. |
| RES-006 | BLOCKED | 0 | No tolerance-expired booking was available for no-show-to-walk-in execution. |
| RES-007 | BLOCKED | 0 | Cancellation was not performed against production history; no disposable active token existed. |
| RES-008 | BLOCKED | 0 | No materially early active booking was available for an override journey. |
| RES-009 | FAIL | 68 | Party size 50 disables every date but labels every day “Fully booked” instead of explaining that the party exceeds supported capacity. |
| RES-010 | BLOCKED | 0 | Two controlled customer sessions and a disposable last slot were unavailable. |
| RES-011 | PARTIAL | 78 | Public allergy/preferences inputs and live pilot notes exist; a fresh booking-to-KDS propagation was not executed. |
| RES-012 | BLOCKED | 0 | Tenant SMTP fields are empty, so confirmation/reminder failure and recovery cannot be certified. |

Additional defect: the public header says **Sun Closed**, while every future
Sunday in November is announced as **Available, select to book**. This is a P1
booking-truth defect independent of RES-003.

### 5.2 Queue and walk-in

| ID | Status | Score | Live result / blocker |
| --- | --- | ---: | --- |
| QUE-001 | PARTIAL | 85 | Public join form and empty live staff board work; reports retain one completed conversion, but a fresh phone ping/update was not created. |
| QUE-002 | BLOCKED | 0 | No disposable live queue token existed for a two-device realtime replay. |
| QUE-003 | BLOCKED | 0 | Duplicate active join and later rejoin require production queue mutations. |
| QUE-004 | BLOCKED | 0 | Customer cancellation needs a live disposable entry. |
| QUE-005 | BLOCKED | 0 | No pinged no-show candidate existed. |
| QUE-006 | PARTIAL | 75 | Host UI exposes reservation-linked source/filtering, but no queue-to-reservation conversion exists in current reports. |
| QUE-007 | BLOCKED | 0 | Grouped-table capacity cannot be proven with the current ten-table, no-group configuration. |
| QUE-008 | BLOCKED | 0 | Midnight counter rollover needs a controlled service-day window or seeded live fixture. |
| QUE-009 | BLOCKED | 0 | Ten concurrent public guests were not available for live atomic-numbering execution. |
| QUE-010 | BLOCKED | 0 | No simultaneous due reservation and walk-in queue pressure existed. |

### 5.3 Customer QR ordering

| ID | Status | Score | Live result / blocker |
| --- | --- | ---: | --- |
| QR-001 | PASS | 94 | Current T01 fixed QR shows Morinaga and correctly blocks ordering while closed; the linked pilot proves scan/order/KDS/Terminal/close. |
| QR-002 | PASS | 93 | Live pilot bill `#275` retains one bill and five lines from the completed visit; closed QR exposes no prior total/history. |
| QR-003 | BLOCKED | 0 | Two simultaneous customer phones on one active table were unavailable. |
| QR-004 | PASS | 95 | After close, the current fixed QR shows only “Table Closed”; previous `#274/#275` details remain staff-only. |
| QR-005 | BLOCKED | 0 | Offline cart recovery needs an active visit and controlled network interruption. |
| QR-006 | BLOCKED | 0 | Slow-network double-submit needs an active disposable round. |
| QR-007 | PARTIAL | 82 | Notes and mixed items are represented in the UI and prior pilot, but modifier pricing/receipt propagation was not freshly executed. |
| QR-008 | BLOCKED | 0 | No active cart plus safely togglable sold-out item was available. |
| QR-009 | PARTIAL | 84 | Payment Requested/settlement design exists; no active customer request was available for yellow-to-green live transition. |
| QR-010 | BLOCKED | 0 | No active customer session existed for duplicate waiter-call throttling. |
| QR-011 | PASS | 96 | Forced foreign `tableId=1&orderId=273` stayed on the Morinaga ten-table board and exposed no foreign drawer/order; focused backend isolation tests also pass. |
| QR-012 | PARTIAL | 88 | Booking and queue journeys fit 360/390/412 px with no horizontal overflow and visible CTAs; active QR menu could not be opened while all tables were closed. |

### 5.4 Staff POS

| ID | Status | Score | Live result / blocker |
| --- | --- | ---: | --- |
| POS-001 | PASS | 96 | Historical walk-in `#274` is Paid for SGD 9.00; T01 is Available and absent from Active Orders. |
| POS-002 | PASS | 99 | Reservation `#101` -> T06 -> `#275` remains the fully reconciled 9.9/10 live pilot. |
| POS-003 | PARTIAL | 84 | Reports retain one seated queue conversion, but queue number/party-to-bill attribution was not visible on a current ticket. |
| POS-004 | PASS | 96 | Pilot order remained one bill through multiple-item service and moved to History only after close. |
| POS-005 | PARTIAL | 88 | Menu/cart quantity controls and exact prior totals are visible; fresh unsent edit/remove was not submitted. |
| POS-006 | PASS | 95 | `#275` contains food and beverage items and prior KDS completion reconciles to one paid bill. |
| POS-007 | BLOCKED | 0 | Cross-table unsent-cart persistence requires creating a disposable cart on two tables. |
| POS-008 | BLOCKED | 0 | Submitted-line cancellation needs a manager identity and active disposable line. |
| POS-009 | BLOCKED | 0 | No active delayed ticket was available for urgent promotion. |
| POS-010 | BLOCKED | 0 | Table move/merge is intentionally guarded and no approved manager workflow was available. |
| POS-011 | PARTIAL | 86 | Current board truthfully exposes ten Available tables; occupied/reserved conflict path could not be produced safely. |
| POS-012 | BLOCKED | 0 | Requires two named waiter sessions; only the owner account exists. |
| POS-013 | PARTIAL | 86 | Server-backed closed history survives reload and Active Orders remains clean; crash during an active submission was not executed. |
| POS-014 | PARTIAL | 88 | Tablet landscape has no overlap, table cards are two-column and the order drawer keeps cart fixed right; only ten, not twenty, tables exist. |
| POS-015 | PASS | 95 | T01/T06 are Available for a new visit and prior orders appear only in History. |
| POS-016 | PARTIAL | 80 | POS launch guardrail explicitly routes split/merge/refund/paid corrections to manager/accounting handling; approved correction was not executed. |

### 5.5 Kitchen and beverage display

| ID | Status | Score | Live result / blocker |
| --- | --- | ---: | --- |
| KDS-001 | PASS | 95 | Prior mixed pilot cleared both station routes and live KDS now reconciles to zero active tickets. |
| KDS-002 | PASS | 95 | Prior pilot progressed through service; current KDS displays zero New/In prep/Ready with explicit workflow guidance. |
| KDS-003 | PARTIAL | 84 | Per-item states are supported; independent partial-delivery replay needs a new active ticket. |
| KDS-004 | BLOCKED | 0 | Timer escalation requires a controlled aged ticket. |
| KDS-005 | PASS | 93 | Pilot multi-round behavior produced one final bill and no residual KDS ticket. |
| KDS-006 | BLOCKED | 0 | No active urgent ticket and no named station role. |
| KDS-007 | BLOCKED | 0 | No active cancelled line and no manager identity. |
| KDS-008 | BLOCKED | 0 | Controlled KDS connectivity loss was not safe on the live service. |
| KDS-009 | BLOCKED | 0 | Twenty-table backlog fixture does not exist. |
| KDS-010 | BLOCKED | 0 | Duplicate WebSocket/replay injection requires controlled infrastructure tooling. |

### 5.6 Payments and reconciliation

| ID | Status | Score | Live result / blocker |
| --- | --- | ---: | --- |
| PAY-001 | PASS | 96 | `#275` records Terminal, SGD 32.80, then explicit table close; reports show Terminal totals. |
| PAY-002 | BLOCKED | 0 | Cash was not re-executed and current launch intent is Terminal/HitPay; role/report separation remains uncertified. |
| PAY-003 | BLOCKED | 0 | HitPay is still Sandbox and no certified tenant webhook checkout was executed in this run. |
| PAY-004 | BLOCKED | 0 | No disposable hosted checkout existed for abandon/recovery. |
| PAY-005 | BLOCKED | 0 | Invalid-signature injection is covered by backend tests, not a browser-visible live event. |
| PAY-006 | BLOCKED | 0 | Duplicate webhook replay needs signed sandbox tooling and a disposable request. |
| PAY-007 | BLOCKED | 0 | Mismatch quarantine needs controlled HitPay payloads. |
| PAY-008 | BLOCKED | 0 | Delayed webhook needs controlled sandbox timing. |
| PAY-009 | PARTIAL | 85 | Requested/paid indicator design is visible in prior evidence; no active bill was available for the transition. |
| PAY-010 | PASS | 94 | Prior live pilot retained bill until Terminal settlement and close; no unpaid order is now present. |
| PAY-011 | BLOCKED | 0 | Concurrent customer add while cashier reviews amount needs two active sessions. |
| PAY-012 | BLOCKED | 0 | Settlement double-tap cannot be run without creating a live payment record. |
| PAY-013 | BLOCKED | 0 | No waiter and manager identities exist to prove denial/escalation. |
| PAY-014 | FAIL | 25 | Open-ended GST 0% and 9% records overlap; HitPay is Sandbox, so tax/tip/receipt reconciliation is not launch-certifiable. |

### 5.7 Printing

| ID | Status | Score | Live result / blocker |
| --- | --- | ---: | --- |
| PRT-001 | BLOCKED | 0 | No online agent or physical XP-80T; nine jobs remain waiting and zero are printed. |
| PRT-002 | BLOCKED | 0 | One-slip-per-item cannot be verified without physical cuts. |
| PRT-003 | BLOCKED | 0 | No station-scoped agents are configured online. |
| PRT-004 | BLOCKED | 0 | Offline retry cannot complete while agent count is 0/0. |
| PRT-005 | BLOCKED | 0 | At-most-once acknowledgement needs a functioning native agent. |
| PRT-006 | BLOCKED | 0 | Paper-out recovery is physical. |
| PRT-007 | BLOCKED | 0 | Tablet/printer restart recovery is physical. |
| PRT-008 | BLOCKED | 0 | Unicode/wrapping/cut quality requires the 80 mm device. |

### 5.8 Staff, shifts and permissions

| ID | Status | Score | Live result / blocker |
| --- | --- | ---: | --- |
| STF-001 | BLOCKED | 0 | Only one Owner account exists; named host/waiter/kitchen/bartender/manager logins do not exist. |
| STF-002 | BLOCKED | 0 | Cannot prove restricted navigation using the Owner account. |
| STF-003 | BLOCKED | 0 | My Shift correctly offers unscheduled photo clock-in, but no staff profiles or camera proof were available. |
| STF-004 | BLOCKED | 0 | Break/clock-out needs an active staff work session. |
| STF-005 | BLOCKED | 0 | Correction needs a completed session and administrator audit. |
| STF-006 | BLOCKED | 0 | No leave balances or named employee timetable exist. |

### 5.9 Recovery and continuity

| ID | Status | Score | Live result / blocker |
| --- | --- | ---: | --- |
| RCV-001 | PARTIAL | 85 | Reload restores closed order history and clean floor/KDS state; no active-order crash replay was created. |
| RCV-002 | BLOCKED | 0 | Production API restart with open visits requires an approved maintenance window. |
| RCV-003 | BLOCKED | 0 | Redis/WebSocket restart requires an approved maintenance window. |
| RCV-004 | BLOCKED | 0 | Restaurant-wide Wi-Fi interruption needs physical devices and a controlled service rehearsal. |
| RCV-005 | BLOCKED | 0 | No disposable production-backup restore evidence was available. |
| RCV-006 | BLOCKED | 0 | No rollback rehearsal window or known-bad release was provisioned. |

Live health endpoints passed: `/health` returned `{"status":"ok"}` and
`/health/db` returned database connected with schema `20261105170000`.

### 5.10 Security, load and launch rehearsal

| ID | Status | Score | Live result / blocker |
| --- | --- | ---: | --- |
| LCH-001 | PASS | 97 | Foreign table/order deep link failed closed in the browser; no Ajisen order/table metadata was exposed. |
| LCH-002 | PASS | 94 | Current closed QR and older tokens reveal only closed/reset guidance, not prior order history or mutation controls. |
| LCH-003 | PARTIAL | 84 | Focused backend rate-limit/security suites pass; a deliberate production login/order burst was not generated. |
| LCH-004 | BLOCKED | 0 | Live tenant has 10 tables, not 20, and no 60-guest/10-staff load harness was provisioned. |
| LCH-005 | PARTIAL | 82 | End-day checklist is green for floor/orders/KDS/shifts and reports reconcile 2 orders/SGD 41.80; HitPay, GST and printing remain open. |
| LCH-006 | FAIL | 20 | Health/login/QR/POS/report smoke passed, but printing, roles, SMTP, MFA, GST and HitPay launch gates are not satisfied. |

## 6. Master scorecard

| Outcome | Count | Launch credit |
| --- | ---: | ---: |
| PASS | 17 | 17% |
| PARTIAL | 17 | 0% |
| FAIL | 4 | 0% |
| BLOCKED | 62 | 0% |
| **Total** | **100** | **17% fully certified** |

The 17% figure is not a product-quality average. It is the deliberately strict
percentage of the master scenarios with complete launch evidence. Existing core
behavior is stronger than that figure, but unavailable prerequisites prevent
certification.

## 7. Live browser evidence log

| SGT observation | Surface | Evidence |
| --- | --- | --- |
| 6 Nov 2026, 13:35–13:55 | Dashboard/POS | Build `2.1.6 / 288f1b05`; 10 tables, 0 open bills, 112 products, SGD 32.80 paid today |
| Same run | Tables | T01–T10 Available; fixed QR closed when tables are idle |
| Same run | Reservations | `#101` Finished; Active service 0, All statuses 1 for today |
| Same run | Public booking | 360/390/412 px fit; invalid party 50 shown as fully booked; Sunday incorrectly available; overnight slots missing |
| Same run | Queue/public waitlist | 0 active; join CTA visible at 360/390/412 px without horizontal overflow |
| Same run | Orders | Active Orders 0; History contains only `#274` and `#275`, totals SGD 9.00 and SGD 32.80 |
| Same run | KDS | 0 New, 0 In prep, 0 Ready; no active tickets |
| Same run | Reports | 2 paid Terminal orders, SGD 41.80 collected; 2 finished reservations; one completed queue entry |
| Same run | Tablet POS | 1024×768 table grid and fixed-right cart render without text/container overlap |
| Same run | Security | Forced foreign IDs expose only Morinaga board; old QR/session tokens expose no prior order |
| Same run | Health | API and DB health OK; schema `20261105170000`; browser console had no error/warning entries |

## 8. Defect register and launch decision

| Priority | Defect / missing prerequisite | Required closure evidence |
| --- | --- | --- |
| P1 | Sunday shown bookable while declared closed | Live Sunday is disabled and correctly labelled Closed / not bookable |
| P1 | Overnight 00:00–04:30 slots missing | Book/seat/report an after-midnight synthetic reservation on the correct service date |
| P1 | GST 0% and 9% overlap | One unambiguous effective GST record; paid receipt and report cents reconcile |
| P1 | No online printer agent; nine waiting jobs | Physical XP-80T run: cashier receipt, per-item slips, retry and no-duplicate proof |
| P1 | HitPay uncertified | Tenant sandbox checkout, signed webhook, abandon, duplicate and mismatch cases pass |
| P1 | Only Owner account exists | Named host, waiter, kitchen, bartender and manager role matrix passes |
| P1 | SMTP empty | Real QA inbox receives reservation/reset mail and recovery is documented |
| P1 | Owner MFA disabled | Owner MFA enrollment and recovery-code handoff are verified |
| P2 | Oversize party described as fully booked | Focused capacity message explains supported maximum and recovery path |
| P2 | 20-table/concurrency fixture missing | Staged rehearsal proves 20 tables, 60 guests, 10 staff and two rounds |
| P2 | Recovery drills absent | Backup restore, API/Redis restart and application rollback evidence recorded |

**Decision: NO-GO for unconditional launch.** The core reservation-to-Terminal
path is healthy, tenant isolation is good and tablet layout is materially
usable. However the P1 list includes booking truth, tax/payment truth, physical
printing, role separation and recovery/security prerequisites. No production
launch should be signed until every P1 is closed and the affected scenarios are
rerun to PASS at 90/100 or higher.

