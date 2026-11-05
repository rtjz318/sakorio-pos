# Morinaga Ramen Izakaya — final pre-launch certification execution results

Execution started: 5 November 2026 (Asia/Singapore)  
Controlling specification: `docs/0184-morinaga-final-prelaunch-certification-checklist-2026-11-05.md`  
Environment: live Sakorio production domains and authenticated Render workspace  
Tenant: `3` — Morinaga Ramen Izakaya  
Execution status: **IN PROGRESS — two live-browser batches recorded**

## 1. Rules applied

- Browser-visible production behavior is the acceptance evidence.
- No source-derived assertion is counted as a live QA pass.
- No real reservation, queue entry, order, payment or account was created in
  this first safe/read-only batch.
- HitPay and 9% GST remain deferred to Phase P by owner direction.
- Any `BLOCKED` or `NOT RUN` item is not a pass.
- Secrets, signed backup URLs and credentials are deliberately omitted.

## 2. Live baseline observed

| Item | Live evidence |
| --- | --- |
| Current deployed commit | `86faca8f` |
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
