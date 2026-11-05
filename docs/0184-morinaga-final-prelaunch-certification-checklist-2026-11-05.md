# Morinaga Ramen Izakaya — final pre-launch certification checklist

Date prepared: 5 November 2026 (Asia/Singapore)  
System: Sakorio POS  
Production tenant: `3` — Morinaga Ramen Izakaya  
Deployment decision: shared Sakorio production infrastructure  
Operating scale: maximum 20 simultaneously active tables  
Status: **certification specification ready; execution has not started**

## 1. Purpose and launch standard

This is the final launch-certification checklist for Morinaga. It is designed
to prove that a complete restaurant service can operate without losing or
duplicating an order, exposing another guest or restaurant's data, creating a
false payment state, routing an item to the wrong station, closing an unpaid
table, or leaving staff without a safe recovery path.

No software can be guaranteed to have zero future failures. The launch standard
is therefore:

1. every critical workflow has been executed on the deployed system;
2. every business state is truthful and reconciles across affected modules;
3. common failures have a tested recovery path;
4. no unresolved P0 or P1 defect remains;
5. every launch-critical section scores at least 95/100;
6. the complete dress rehearsal finishes with a clean operational baseline.

The owner has chosen to leave **HitPay sandbox acceptance** and the final
**9% GST configuration/verification** to the last certification phase. They
remain stop-ship gates and cannot be waived merely because the preceding
phases pass.

## 2. System under test

| Surface | Production target |
| --- | --- |
| Staff portal | `https://staff.sakorio.com` |
| Customer ordering | `https://order.sakorio.com/menu/<table-token>?qr_access=<signed-token>` |
| Reservations | Morinaga public booking route for tenant `3` |
| Waitlist | Morinaga public waitlist route for tenant `3` |
| API | `https://api.sakorio.com` |
| HitPay webhook | `https://api.sakorio.com/api/payments/hitpay/webhook` |
| Android POS | Morinaga-bound Sakorio Android build |
| Receipt printer | XP-80T ESC/POS Bluetooth printer through the Sakorio printer agent |
| Infrastructure | Shared always-on Sakorio API, PostgreSQL, Redis and persistent upload disk |

At execution start, record the visible frontend version, Git commit, API schema
version, deployment timestamp, browser versions, Android build, printer firmware
or self-test details, and Singapore time.

## 3. Roles required for certification

| Role | Certification responsibility |
| --- | --- |
| Customer | Reservation, queue, QR menu, two ordering rounds, bill review and payment handoff |
| Host | Reservation arrival, queue management, seating, transfer and no-show handling |
| Waiter | Table service, item entry, notes, round submission, status and payment request |
| Cashier | Bill truth, supported settlement, receipt, close and table reset |
| Kitchen | Food ticket receipt, preparation, ready and served states |
| Beverage | Drink routing and independent completion |
| Staff | Profile selection, clock in and clock out |
| Manager | Overrides, voids, recovery, backlog and reconciliation |
| Owner/admin | Users, roles, rates, settings, reports and launch sign-off |
| Printer agent | Pairing, heartbeat, job routing, offline queue and duplicate prevention |

The owner account must not be shared during live service. Disposable QA users
may be used during certification, but each role must be tested independently.

## 4. Non-negotiable launch invariants

1. A guest can access only the current open session for the scanned table.
2. A guest cannot see a previous session, another table or another tenant.
3. Closing a table invalidates the previous customer session for ordering and payment.
4. All rounds for one open table remain in the same active table session.
5. A submitted order appears exactly once in POS, Orders and the correct KDS lanes.
6. Food and drink items route to their configured stations without silent loss.
7. Payment state is based on verified settlement, never a button press or redirect alone.
8. Customer checkout does not offer Cash.
9. An unpaid table cannot be closed without an explicit, authorized and audited override.
10. A paid table is not reset until an operator confirms the correct table and amount.
11. POS, Tables, Orders, Kitchen, receipts, Reports and History agree on totals and state.
12. Reservation and queue records belong only to Morinaga and the correct service day.
13. Queue number and ping state update for the guest without a manual refresh.
14. Role permissions protect rates, users, settings and financial corrections.
15. Double-click, refresh, reconnect and duplicate webhook delivery are idempotent.
16. Every menu name, price, category, image, availability and tax treatment agrees.
17. Printer jobs print once, route correctly and remain recoverable after disconnection.
18. A transient outage never creates a false paid, served, printed or closed state.
19. The 20-table peak load remains responsive and produces no lost business state.
20. Certification ends with no orphan bill, ticket, queue row, reservation, shift or print job.

## 5. Execution, evidence and scoring protocol

### 5.1 Test-data rules

- Prefix every synthetic record with `MOR-LAUNCH-<check-id>-<timestamp>`.
- Reserve named QA tables before execution; do not use a table serving a real guest.
- Use only HitPay sandbox until the final controlled live-payment approval.
- Never paste passwords, API keys, webhook salts, signed QR tokens or database URLs into this document.
- Do not delete unexplained production-looking data. Isolate it and escalate it.
- Record generated reservation, queue, order, payment and print-job IDs in the protected evidence register.
- Clean up each case or explicitly hand its state into the next documented case.

### 5.2 Evidence required for every checklist item

- Singapore start/end time;
- visible build/commit;
- role, browser/device and viewport;
- starting and final state;
- steps executed through the live interface;
- expected versus actual result;
- cross-module reconciliation;
- screenshot at the decisive state, with sensitive tokens redacted;
- performance observation where relevant;
- cleanup proof;
- score, severity and retest decision.

Source inspection and automated tests can diagnose a defect but cannot convert
an unverified live workflow into a browser-QA pass.

### 5.3 Scoring

| Dimension | Weight |
| --- | ---: |
| Functional correctness | 30 |
| Order/payment/session integrity | 25 |
| Usability and operator efficiency | 15 |
| Realtime, recovery and idempotency | 10 |
| Layout and accessibility | 10 |
| Performance and operational readiness | 10 |

- General pass: at least 90/100 and no P0/P1 defect.
- Launch-critical pass: at least 95/100.
- `BLOCKED` and `NOT RUN` are not passes.
- A score of 10/10 requires no material improvement to be observed.

### 5.4 Severity

| Severity | Definition | Release treatment |
| --- | --- | --- |
| P0 | Privacy breach, cross-tenant leak, false/duplicate charge or destructive corruption | Immediate stop; launch prohibited |
| P1 | Lost/duplicate order, wrong station, unpaid close, auth bypass, unusable core flow | Fix and retest before launch |
| P2 | Workaround exists but causes service risk, confusion or material delay | Fix before launch unless formally accepted |
| P3 | Cosmetic or low-frequency issue with no truth/safety impact | Backlog with evidence |

## 6. Phase A — release baseline and change control

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-001 | Record production frontend/API versions | All surfaces show the intended release; hashes are recorded | Version screenshots and API response |
| MOR-LCH-002 | Confirm `development` release was intentionally promoted | Deployed commit is traceable to reviewed Git history | Commit and deployment record |
| MOR-LCH-003 | Freeze launch-affecting menu/config changes | Named owner approves freeze window | Signed launch record |
| MOR-LCH-004 | Verify API health | Health endpoint is 200 with no dependency failure | Timestamped response |
| MOR-LCH-005 | Verify database health/schema | Connected and expected migration is current | Timestamped response |
| MOR-LCH-006 | Verify Redis connectivity | Realtime/rate-limit dependency is healthy | Render health/log evidence |
| MOR-LCH-007 | Verify all Render services are always-on | No launch service is on a sleeping/free plan | Render plan evidence |
| MOR-LCH-008 | Review deployment logs | No migration, startup, Angular or recurring application error | Log extract without secrets |
| MOR-LCH-009 | Verify time and timezone | API, tenant and visible service day use Asia/Singapore | UI/API comparison |
| MOR-LCH-010 | Record clean starting baseline | Zero unexplained open bills, KDS tickets, queue rows and shifts | Dashboard screenshots |

## 7. Phase B — tenant isolation, security and authentication

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-011 | Morinaga staff login identity | Login names Morinaga and opens only tenant `3` | Login/dashboard screenshots |
| MOR-LCH-012 | Management login scope | Only owner/admin reaches management functions | Role-specific attempt |
| MOR-LCH-013 | Cross-tenant table-ID attempt | Foreign table never opens or leaks data | Rejected/neutral result |
| MOR-LCH-014 | Cross-tenant order-ID attempt | Foreign order is 404/403 and no metadata leaks | Network/UI evidence |
| MOR-LCH-015 | Cross-tenant product/media attempt | Morinaga cannot edit foreign product or upload path | Rejected attempt |
| MOR-LCH-016 | Public tenant identity | All guest pages consistently identify Morinaga | Menu/booking/queue screenshots |
| MOR-LCH-017 | Demo separation | Demo restaurant is visibly marked and unavailable to Morinaga staff | Portal evidence |
| MOR-LCH-018 | Protected-route logout | Logout invalidates session; refresh/back cannot restore access | Browser sequence |
| MOR-LCH-019 | Expired session handling | User returns safely to login without losing false state | Expiry/relogin evidence |
| MOR-LCH-020 | Login rate limiting | Repeated invalid attempts are throttled without account disclosure | Controlled test/log |
| MOR-LCH-021 | Role matrix | Waiter, host, kitchen, cashier, manager and owner permissions match policy | Role matrix record |
| MOR-LCH-022 | Hourly-rate privacy | Only authorized owner/admin can view rates | Two-role comparison |
| MOR-LCH-023 | HTTPS and security headers | HTTPS, HSTS, frame, MIME, referrer and permissions protections are present | Header capture |
| MOR-LCH-024 | CORS/trusted-host restrictions | Approved Sakorio origins work; untrusted origin is rejected | Header/API evidence |
| MOR-LCH-025 | Database network restriction | PostgreSQL is inaccessible from the public Internet | Render rule evidence |
| MOR-LCH-026 | Secret hygiene | No secret is present in Git, screenshots, logs or client bundle | Scan/report |
| MOR-LCH-027 | Admin MFA and credential rotation | Production owner/admin and infrastructure accounts use MFA/unique credentials | Owner attestation |
| MOR-LCH-028 | QA account retirement plan | Every disposable account has a removal/disable owner and date | Account register |

## 8. Phase C — restaurant master data, menu, tables and QR

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-029 | Restaurant identity | Display/legal names are approved and consistent | Settings/public/receipt comparison |
| MOR-LCH-030 | Contact and address | Approved phone, email, address, map and website are correct | Settings/public comparison |
| MOR-LCH-031 | Operating hours | Normal, overnight and closed-day behavior is correct | Settings and public slots |
| MOR-LCH-032 | Currency | SGD is used everywhere with two decimals | POS/menu/report sample |
| MOR-LCH-033 | Menu count and categories | Approved source count and category structure match live | Reconciliation sheet |
| MOR-LCH-034 | Every product name | No corruption, funny character or unintended duplicate | Full export comparison |
| MOR-LCH-035 | Every product price | Live POS and public price match approved source | Full price comparison |
| MOR-LCH-036 | Images and persistence | Approved images load and remain after redeploy/reload | Before/after evidence |
| MOR-LCH-037 | Availability controls | Sold-out/hidden item disappears or is blocked consistently | Staff/customer comparison |
| MOR-LCH-038 | Category navigation | Customer can navigate without a wall of unsorted items | Mobile usability evidence |
| MOR-LCH-039 | Search/filter accuracy | Staff search and category filters return expected items | Search samples |
| MOR-LCH-040 | Add-on and notes | Item modifiers/notes reach cart, order and KDS unchanged | End-to-end sample |
| MOR-LCH-041 | Station routing map | Every food/drink product has an approved destination | Routing export/check |
| MOR-LCH-042 | Table inventory | Exactly the approved 20-or-fewer physical tables exist | Table reconciliation |
| MOR-LCH-043 | Table names/capacities | Labels and seat counts match floor plan | Floor-plan comparison |
| MOR-LCH-044 | Fixed QR identity | Each printed QR opens only its intended table | Scan every QR |
| MOR-LCH-045 | QR durability | Reload/orientation/browser reopen preserves valid current access | Device evidence |
| MOR-LCH-046 | Old-session invalidation | Prior QR session cannot act after table close/reset | Negative test |
| MOR-LCH-047 | Branding assets | Logo/header and restaurant name render cleanly on supported devices | Visual evidence |

## 9. Phase D — staff profiles, roles and attendance

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-048 | Individual production accounts | Every operating staff member has an individual account and role | Account list, no passwords |
| MOR-LCH-049 | Profile selection | Staff can select only valid Morinaga profiles | Clock-in UI |
| MOR-LCH-050 | Clock in without preplanned shift | Actual session starts with correct user/time/date | Timetable/session evidence |
| MOR-LCH-051 | Duplicate clock-in protection | Second action resumes/blocks rather than creating duplicate session | Two-action evidence |
| MOR-LCH-052 | Clock out | Session closes at actual time and appears on timetable | Before/after evidence |
| MOR-LCH-053 | Cross-midnight attendance | Overnight clock-in/out stays attached to correct service day | Controlled rehearsal |
| MOR-LCH-054 | Device independence | Staff can clock in from the designated shared tablet safely | Physical/tablet evidence |
| MOR-LCH-055 | Manager correction audit | Authorized correction records operator, reason and timestamps | Audit/report evidence |
| MOR-LCH-056 | Unauthorized rates access | Waiter/host/kitchen cannot view or infer hourly rates | Role attempts |
| MOR-LCH-057 | Timetable/report agreement | Attendance totals reconcile between timetable and report | Cross-module comparison |

## 10. Phase E — reservations

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-058 | Booking page first load | Usable date/slot controls appear within 2 seconds at normal load | Timing capture |
| MOR-LCH-059 | Required-field validation | Errors are clear, focused and do not erase valid input | Mobile recording |
| MOR-LCH-060 | Phone validation | Singapore example and correction path are clear | Validation evidence |
| MOR-LCH-061 | Capacity/slot enforcement | Invalid party or unavailable slot cannot be booked | Negative test |
| MOR-LCH-062 | Overnight service date | After-midnight slots map to intended restaurant service | Booking/host comparison |
| MOR-LCH-063 | Confirmation identity | Submitted booking returns one unique reference | Customer confirmation |
| MOR-LCH-064 | Host same-day visibility | Booking appears only on the applicable operating day | Host view evidence |
| MOR-LCH-065 | Search/highlight | Host can find a newly created booking immediately | Timed workflow |
| MOR-LCH-066 | Arrival and table assignment | Booking is assigned to an available table exactly once | Reservation/table evidence |
| MOR-LCH-067 | Double-seat protection | Two host tabs cannot assign one booking twice | Concurrency test |
| MOR-LCH-068 | Edit/cancel/no-show | Authorized actions update status and table truth consistently | Status sequence |
| MOR-LCH-069 | Customer confirmation email | Real controlled inbox receives accurate content | Redacted email evidence |
| MOR-LCH-070 | Reservation-to-order handoff | Seated table opens the correct QR/POS session | Full handoff evidence |
| MOR-LCH-071 | Policy visibility | Cancellation, holding time and guest guidance are approved and visible | Public/settings evidence |

## 11. Phase F — queue and walk-in seating

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-072 | Guest queue join | Valid submission creates one Morinaga entry | Customer/host comparison |
| MOR-LCH-073 | Queue number visibility | Guest sees a large, unambiguous queue number | Mobile screenshot |
| MOR-LCH-074 | POS/host visibility | Same number and party details appear to staff | Cross-screen evidence |
| MOR-LCH-075 | Atomic numbering | Concurrent joins receive unique ordered numbers | Concurrency evidence |
| MOR-LCH-076 | Ping realtime update | Guest receives notified state without refresh | Two-device recording |
| MOR-LCH-077 | Reconnect recovery | Guest state catches up after temporary network loss | Offline/reconnect evidence |
| MOR-LCH-078 | Cancel/no-show | Staff action removes/labels correct guest without affecting others | Host/customer comparison |
| MOR-LCH-079 | Seat from queue | Correct table becomes occupied and queue row leaves active lane | Queue/table evidence |
| MOR-LCH-080 | Duplicate seat protection | Repeated action does not create two sessions | Double-action test |
| MOR-LCH-081 | Day rollover | New service day numbering/state does not expose prior queue | Rollover test |
| MOR-LCH-082 | Stale QA cleanup | No historical test entry remains in the active queue | Final baseline |

## 12. Phase G — core POS and table ordering

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-083 | Table-first POS entry | POS initially shows an efficient table board, not an unintended order | UI evidence |
| MOR-LCH-084 | Select table | Menu/cart opens for the selected table without page confusion | Timed workflow |
| MOR-LCH-085 | First staff order | Items, quantities and notes submit exactly once | POS/Orders/KDS reconciliation |
| MOR-LCH-086 | First customer QR order | Guest order enters the same current table session once | Customer/staff reconciliation |
| MOR-LCH-087 | Second-round order | Additional items remain under the same active session | Orders/history evidence |
| MOR-LCH-088 | Mixed staff/customer rounds | Both sources coexist without overwriting or duplicating | Order timeline |
| MOR-LCH-089 | Quantity adjustment | Increase/decrease/removal changes only intended unsent cart line | Cart evidence |
| MOR-LCH-090 | Sold-out race | Item becoming unavailable is rejected clearly at submission | Concurrent test |
| MOR-LCH-091 | Double-submit protection | Rapid repeat click creates one order/ticket set | IDs/log evidence |
| MOR-LCH-092 | Refresh during submission | Final state is recoverable and not duplicated | Refresh test |
| MOR-LCH-093 | Two customer phones | Same table supports safe sequential rounds and current total | Two-device evidence |
| MOR-LCH-094 | Concurrent different tables | Orders remain attached to their originating tables | Multi-table reconciliation |
| MOR-LCH-095 | Switch/back to tables | Waiter can serve another table without losing cart/order truth | Navigation evidence |
| MOR-LCH-096 | Current orders versus history | Open session orders stay current until table close | Orders UI evidence |
| MOR-LCH-097 | Transfer table | Authorized transfer preserves bill/items/session audit correctly | Before/after evidence |
| MOR-LCH-098 | Merge/split guardrail | Unsupported action is blocked or manager-controlled, never silent | UI/audit evidence |
| MOR-LCH-099 | Item void before preparation | Authorized void updates bill and removes/marks KDS correctly | Cross-module evidence |
| MOR-LCH-100 | Item void after preparation | Manager workflow records reason and retains audit truth | Audit/report evidence |
| MOR-LCH-101 | Network interruption | Offline action gives clear feedback and safe retry behavior | Disconnect test |
| MOR-LCH-102 | Long menu usability | 100+ products remain searchable, categorized and touch-usable | Tablet timing/visual evidence |

## 13. Phase H — kitchen and beverage operations

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-103 | Food routing | Food lines arrive once in Kitchen | KDS/order comparison |
| MOR-LCH-104 | Beverage routing | Drink lines arrive once in Beverages | KDS/order comparison |
| MOR-LCH-105 | Mixed order split | One order splits by station without losing table/order identity | Two-lane evidence |
| MOR-LCH-106 | Notes/allergies visibility | Critical notes are prominent and unchanged | POS/KDS comparison |
| MOR-LCH-107 | Ticket ordering | New and aging tickets have clear, stable priority | KDS screenshot |
| MOR-LCH-108 | In-prep transition | Action updates once and persists after refresh | State evidence |
| MOR-LCH-109 | Ready transition | Waiter/POS can identify ready items promptly | Cross-screen evidence |
| MOR-LCH-110 | Served transition | Completion gives clear toast/countdown and leaves correct audit | KDS/Orders evidence |
| MOR-LCH-111 | Partial station completion | Food/drink can finish independently without closing whole order incorrectly | Mixed order evidence |
| MOR-LCH-112 | Duplicate action | Repeated status click is idempotent | ID/state evidence |
| MOR-LCH-113 | KDS reconnect | Live backlog is restored correctly after refresh/network loss | Reconnect recording |
| MOR-LCH-114 | Rush readability | At least 20 concurrent table tickets remain distinguishable | Load screenshot/timing |
| MOR-LCH-115 | Backlog baseline | Launch begins and ends with zero unexplained active ticket | Dashboard evidence |

## 14. Phase I — billing, settlement truth and table close

HitPay-specific acceptance is deferred to Phase P, but every other billing
invariant must be proven before it is enabled.

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-116 | Bill composition | Every submitted item, quantity and approved adjustment appears once | Bill/order comparison |
| MOR-LCH-117 | Bill arithmetic | Subtotal, tax, rounding and grand total recompute correctly | Independent calculation |
| MOR-LCH-118 | Customer bill privacy | QR guest sees only current session and total | Customer evidence |
| MOR-LCH-119 | Customer payment methods | Cash is absent; only approved customer methods are shown | Checkout screenshot |
| MOR-LCH-120 | Payment requested state | Request produces yellow state without claiming payment | Table/POS evidence |
| MOR-LCH-121 | Terminal/manual unpaid state | Request remains red/unpaid until staff confirms settlement | State sequence |
| MOR-LCH-122 | Paid state | Only confirmed settlement produces green/paid state | Cross-module evidence |
| MOR-LCH-123 | Under/overpayment handling | Invalid amount cannot silently close the bill | Negative test |
| MOR-LCH-124 | Double settlement protection | Repeated confirmation does not record payment twice | Payment IDs/report |
| MOR-LCH-125 | Payment during add-on race | New items cannot disappear behind a stale checkout amount | Concurrency evidence |
| MOR-LCH-126 | Unpaid close prevention | Normal user cannot close unpaid table | Rejected attempt |
| MOR-LCH-127 | Manager override | Authorized exception requires reason and audit record | Audit evidence |
| MOR-LCH-128 | Paid close confirmation | Table-specific summary precedes final reset | Confirmation screenshot |
| MOR-LCH-129 | Close/reset result | Table becomes ready; old session is inaccessible; history remains | Table/customer/history evidence |
| MOR-LCH-130 | Refund/void permission | Only authorized role can initiate and result is auditable | Role/audit evidence |
| MOR-LCH-131 | Reports reconciliation | Payment method and amount equal bill and receipt | Report comparison |

## 15. Phase J — receipts and Android/XP-80T printing

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-132 | Android app binding | App identifies Morinaga and production API only | App settings evidence |
| MOR-LCH-133 | Bluetooth pairing | XP-80T pairs and reconnects after restart | Android recording |
| MOR-LCH-134 | Printer-agent heartbeat | Staff Settings shows the expected agent online | Settings screenshot |
| MOR-LCH-135 | Company header | Receipt prints approved Morinaga identity | Physical receipt photo |
| MOR-LCH-136 | Price accuracy | Cashier receipt prints non-zero, correct prices and totals | Receipt/bill comparison |
| MOR-LCH-137 | Kitchen one-slip-per-item mode | Three items generate three correctly identified slips | Physical receipt set |
| MOR-LCH-138 | Beverage routing | Drink slip reaches only configured printer/station | Physical evidence |
| MOR-LCH-139 | Notes and Unicode | Notes and approved menu characters print legibly | Receipt sample |
| MOR-LCH-140 | Paper width/cut | Content fits 80 mm and each job cuts correctly | Physical evidence |
| MOR-LCH-141 | Offline queue | Disconnected printer retains jobs visibly for retry | Agent/queue evidence |
| MOR-LCH-142 | Reconnect and retry | Pending jobs print once after reconnect | Job/receipt evidence |
| MOR-LCH-143 | Duplicate prevention | Refresh/retry does not reprint completed job | Job IDs/evidence |
| MOR-LCH-144 | Paper-out recovery | Operator receives actionable state and resumes safely | Physical test |
| MOR-LCH-145 | Restart recovery | Android/tablet/printer restart restores normal operation | Restart sequence |

## 16. Phase K — realtime, interruption and recovery

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-146 | WebSocket/live update health | Queue/KDS/POS updates arrive without manual refresh | Two-screen recording |
| MOR-LCH-147 | Brief Wi-Fi loss | UI identifies interruption and catches up without false state | Disconnect test |
| MOR-LCH-148 | API restart | Open tables/orders recover after service restoration | Before/after evidence |
| MOR-LCH-149 | Redis restart/fallback | No order/payment data is lost; live clients recover | Controlled maintenance evidence |
| MOR-LCH-150 | Browser crash/reopen | Operator resumes truthful current state | Reopen evidence |
| MOR-LCH-151 | Stale-tab mutation | Old tab cannot overwrite a newer terminal state silently | Concurrency evidence |
| MOR-LCH-152 | Payment return interruption | Unconfirmed payment remains open and recoverable | Recovery sequence |
| MOR-LCH-153 | Duplicate webhook/retry | Repeated event is idempotent | Order/payment audit |
| MOR-LCH-154 | Clock skew/service day | Near-midnight actions use Singapore business time correctly | Timestamp evidence |
| MOR-LCH-155 | Error-message quality | Staff/customer sees actionable wording without secret leakage | UI evidence |

## 17. Phase L — reports, audit and end-of-day reconciliation

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-156 | Active-floor reconciliation | Open tables equal active bills/orders | Cross-module count |
| MOR-LCH-157 | Order history | Closed session appears once with correct lines/status | History evidence |
| MOR-LCH-158 | Sales totals | Gross/net/tax/payment totals match controlled transactions | Independent reconciliation |
| MOR-LCH-159 | Payment-method totals | Terminal/HitPay/manual methods are separated accurately | Report evidence |
| MOR-LCH-160 | Voids/refunds | Corrections retain operator, reason and financial effect | Audit evidence |
| MOR-LCH-161 | KDS completion | Served items reconcile to order lines | KDS/report comparison |
| MOR-LCH-162 | Attendance totals | Clock sessions reconcile to timetable/report | Workforce comparison |
| MOR-LCH-163 | Export usability | CSV/PDF output opens and matches visible filters/totals | Export evidence |
| MOR-LCH-164 | Role protection | Unauthorized user cannot open financial reports | Role attempt |
| MOR-LCH-165 | End-day clean state | No unexplained open bill, ticket, queue, reservation or shift | Closing checklist |

## 18. Phase M — performance and 20-table capacity certification

This phase must use controlled synthetic data and a window approved by the
owner. It must not be run as an uncontrolled denial-of-service test.

### Workload

- 20 simultaneously occupied tables;
- up to 60 active customer sessions;
- 10 staff/KDS/host/cashier sessions;
- first-round burst across all 20 tables;
- second-round add-ons on at least 10 tables;
- mixed food and beverage routing;
- reservation and queue activity during the order burst;
- payment-request and table-close activity after kitchen completion.

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-166 | Baseline latency | Health and ordinary reads are stable before load | Timing record |
| MOR-LCH-167 | 20-table first-round burst | No submission is lost/duplicated; each table is correct | ID reconciliation |
| MOR-LCH-168 | Add-on burst | Same-session second rounds remain correct | Order/session evidence |
| MOR-LCH-169 | KDS rush | Tickets route/read correctly with no hidden backlog | KDS evidence |
| MOR-LCH-170 | Realtime fan-out | Staff/customer states update without persistent lag | Screen recording |
| MOR-LCH-171 | Reservation response | First usable availability appears in under 2 seconds | Timing capture |
| MOR-LCH-172 | Queue during rush | Join/number/ping/seat stays responsive and unique | Two-device evidence |
| MOR-LCH-173 | API reliability | Error rate is below 1%; no 5xx attributable to capacity | Metrics/logs |
| MOR-LCH-174 | User-action latency | 95th percentile core action is under 2 seconds, excluding external checkout | Metrics/timing |
| MOR-LCH-175 | Resource headroom | CPU, memory, DB connections/storage and Redis show safe headroom | Render metrics |
| MOR-LCH-176 | Recovery after burst | Backlog drains and system returns to baseline promptly | Metrics/baseline evidence |
| MOR-LCH-177 | Data reconciliation | All 20 tables, orders, tickets and totals reconcile exactly | Reconciliation workbook |

Capacity sign-off requires evidence, not an estimate. If the PostgreSQL
Basic-256mb plan shows sustained memory pressure, connection exhaustion or
material latency, upgrade the database plan before launch even if the API
remains healthy.

## 19. Phase N — UI/UX, accessibility and device matrix

Test staff desktop at 1440×900 and 1366×768; Android tablet at 1280×800 and
800×1280; iPad simulation at 1024×768 and 768×1024; customer mobile at 390×844,
412×915 and 360×800.

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-178 | No overlap/overflow | No core control or content clips at supported viewports | Viewport screenshots |
| MOR-LCH-179 | Touch targets | Critical actions are reliably tappable without precision | Physical/simulated evidence |
| MOR-LCH-180 | POS table board | Twenty tables remain scannable without one-by-one horizontal hunting | Tablet evidence |
| MOR-LCH-181 | POS menu density | Products/cart/payment stay usable within the viewport | Tablet evidence |
| MOR-LCH-182 | Fixed payment lane | Payment/cart controls remain discoverable and do not cover content | Tablet evidence |
| MOR-LCH-183 | Customer menu sections | Sticky/category navigation prevents endless unstructured scrolling | Mobile evidence |
| MOR-LCH-184 | Forms and keyboard | Virtual keyboard does not hide required fields/actions | Mobile recording |
| MOR-LCH-185 | Loading/empty/error states | Every major page explains current state and recovery action | State matrix |
| MOR-LCH-186 | Confirmation language | Destructive/financial actions identify table, bill and consequence | Dialog evidence |
| MOR-LCH-187 | Focus and keyboard | Logical focus, visible focus and keyboard operation work on staff web | Accessibility record |
| MOR-LCH-188 | Contrast and text size | Critical statuses and prices are readable in restaurant lighting | Visual assessment |
| MOR-LCH-189 | Status not color-only | Paid/unpaid/requested/ready states include text/icon labels | UI evidence |
| MOR-LCH-190 | Orientation/reload | State and layout recover after rotation and refresh | Device recording |
| MOR-LCH-191 | Operator step count | Common table order and close flows have no avoidable navigation loop | Timed task analysis |
| MOR-LCH-192 | Customer comprehension | New user completes QR order without staff explanation | Observed usability test |

## 20. Phase O — deployment, backups, monitoring and support

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-193 | Fresh logical export | Post-configuration export completes and timestamp is recorded | Render Recovery evidence |
| MOR-LCH-194 | PITR window | Seven-day recovery window is visible and available | Render evidence |
| MOR-LCH-195 | Upload persistence | Product images survive deploy and upload disk has snapshots | Before/after evidence |
| MOR-LCH-196 | Disposable restore rehearsal | Restored DB passes health and launch smoke checks | Restore record |
| MOR-LCH-197 | Recovery cleanup | Temporary recovery resource is removed after approval | Render record |
| MOR-LCH-198 | Deployment rollback | Previous known-good release and rollback steps are identified | Runbook evidence |
| MOR-LCH-199 | Uptime/error alerts | Named responder receives API/frontend/DB failure alerts | Test alert evidence |
| MOR-LCH-200 | Payment/webhook alerts | Failed or delayed payment events are actionable | Alert test |
| MOR-LCH-201 | Disk/storage alerts | Thresholds cover DB and uploaded media growth | Render settings |
| MOR-LCH-202 | First-service support | Named owner, developer escalation path and contact window exist | Support roster |
| MOR-LCH-203 | Incident runbook | Order, payment, printer, network and outage actions are documented | Approved runbook |
| MOR-LCH-204 | Credential recovery | Authorized owners can recover access without shared credentials | Controlled evidence |
| MOR-LCH-205 | Launch rollback decision | Criteria to pause orders or revert release are explicit | Go/no-go record |

## 21. Phase P — final deferred gates: HitPay sandbox and 9% GST

This phase is deliberately last, per owner direction. It is nevertheless
mandatory before accepting live online payments or declaring launch-ready.

### 21.1 HitPay sandbox

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-206 | HitPay account security | Dashboard password rotated after handoff and MFA enabled | Owner attestation |
| MOR-LCH-207 | Tenant sandbox credentials | Morinaga API key and webhook salt saved only to tenant `3` | Masked settings evidence |
| MOR-LCH-208 | Webhook registration | Production webhook URL subscribes to `payment_request.completed` | HitPay dashboard evidence |
| MOR-LCH-209 | Customer sandbox checkout | QR order opens correct amount/reference and completes | Customer/payment evidence |
| MOR-LCH-210 | Cashier sandbox checkout | POS checkout opens correct table/bill exactly once | POS/payment evidence |
| MOR-LCH-211 | Webhook confirmation | Valid signed event marks the intended order paid | Webhook/order evidence |
| MOR-LCH-212 | Redirect is not payment proof | Abandoned/cancelled return leaves bill open | Negative test |
| MOR-LCH-213 | Amount/reference/currency validation | Mismatch is rejected and cannot mark order paid | Security test |
| MOR-LCH-214 | Duplicate webhook | Repeated event does not duplicate settlement | Audit evidence |
| MOR-LCH-215 | Delayed webhook recovery | Staff can safely refresh/reconcile without double charge | Recovery evidence |
| MOR-LCH-216 | Paid close/reset | Paid indicator, receipt, reports, close and old-session invalidation agree | Full reconciliation |
| MOR-LCH-217 | Live credential switch | Only after sandbox sign-off; no demo/global credential is inherited | Masked settings evidence |
| MOR-LCH-218 | Controlled live payment | One small approved real payment reconciles end to end | Redacted transaction evidence |

### 21.2 GST at 9%

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-219 | Legal GST identity | Legal name, UEN and GST registration are approved | Owner/accountant sign-off |
| MOR-LCH-220 | 9% tenant tax configuration | Morinaga default tax is exactly 9%; no demo tax is inherited | Settings evidence |
| MOR-LCH-221 | Menu price basis | Management confirms inclusive/exclusive treatment | Signed decision |
| MOR-LCH-222 | Line calculation | Sample single/multiple/discounted lines calculate correctly | Independent calculation |
| MOR-LCH-223 | Rounding | Fractional-cent cases follow approved SGD rounding | Test matrix |
| MOR-LCH-224 | Customer display | Menu/cart/bill clearly reflect approved tax presentation | Customer screenshots |
| MOR-LCH-225 | Receipt disclosure | Receipt contains required GST identity and tax amount | Physical receipt evidence |
| MOR-LCH-226 | Reports/export | Tax totals reconcile to receipts and controlled orders | Report comparison |
| MOR-LCH-227 | Payment amount | HitPay amount equals the final GST-inclusive bill exactly | Payment reconciliation |

## 22. Phase Q — full dress rehearsal and go-live day

| ID | Checklist | Pass condition | Evidence |
| --- | --- | --- | --- |
| MOR-LCH-228 | Reservation journey | Book → arrive → assign table → QR first/second round → KDS → pay → close/reset | Complete trace |
| MOR-LCH-229 | Queue journey | Join → number → ping → seat → order → pay → close/reset | Complete trace |
| MOR-LCH-230 | Walk-in staff journey | Open table → staff order → add-on → KDS → terminal/approved settlement → close | Complete trace |
| MOR-LCH-231 | Mixed 20-table service | All roles operate concurrently with no P0/P1 and exact reconciliation | Service report |
| MOR-LCH-232 | End-of-day close | Floor, KDS, queue, attendance and reports end cleanly | Closing evidence |
| MOR-LCH-233 | QA cleanup | All disposable users/data/jobs are removed or formally retained | Cleanup register |
| MOR-LCH-234 | Final security scan | No launch-critical finding or exposed secret remains | Scan report |
| MOR-LCH-235 | Backup after certification | New logical export and upload snapshot exist after final setup | Render evidence |
| MOR-LCH-236 | Go/no-go meeting | Owner, operations and technical approver review all blockers | Signed decision |
| MOR-LCH-237 | Launch-day smoke | Login, menu, table QR, order, KDS, payment, receipt and health pass before opening | Smoke record |
| MOR-LCH-238 | First-hour monitoring | Metrics, errors, payments, printer and floor truth are actively watched | Monitoring log |
| MOR-LCH-239 | First-service reconciliation | Actual sales/orders/payments/tax/receipts reconcile before support ends | Signed reconciliation |

## 23. Stop-ship conditions

Launch is prohibited if any of these remains:

- any guest/session or cross-tenant privacy leak;
- any false, duplicated or unreconciled payment;
- any lost, duplicated or wrongly routed submitted order;
- unpaid table close without an explicit audited override;
- inconsistency between POS, KDS, receipts, Orders and Reports;
- broken logout, role authorization or exposed hourly rates;
- customer QR session remains active after table close;
- 20-table rehearsal produces material errors or unusable latency;
- no recoverable database/media backup;
- no working production receipt and kitchen-print path;
- HitPay sandbox is incomplete;
- 9% GST arithmetic, disclosure or legal identity is unapproved;
- any unresolved P0/P1 defect.

## 24. Result record template

```md
### MOR-LCH-<ID> — <title>

- Date/time (SGT):
- Build/commit/API schema:
- Role(s):
- Browser/device/viewport:
- Trace label and generated IDs:
- Starting state:
- Steps executed in the live interface:
- Expected result:
- Actual result:
- Cross-module reconciliation:
- Functional correctness /30:
- Order/payment/session integrity /25:
- Usability and efficiency /15:
- Realtime/recovery/idempotency /10:
- Layout/accessibility /10:
- Performance/operational readiness /10:
- Total /100 and /10:
- Status: PASS / PARTIAL / FAIL / BLOCKED / NOT RUN
- Defect severity:
- Evidence reference:
- Improvement required:
- Cleanup proof:
- Retest result:
- Launch effect:
```

## 25. Phase scorecard

| Phase | Score | P0 | P1 | P2 | Status | Approver |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| A Release baseline |  |  |  |  | NOT RUN |  |
| B Isolation/security |  |  |  |  | NOT RUN |  |
| C Master data/menu/tables |  |  |  |  | NOT RUN |  |
| D Staff/attendance |  |  |  |  | NOT RUN |  |
| E Reservations |  |  |  |  | NOT RUN |  |
| F Queue |  |  |  |  | NOT RUN |  |
| G POS/ordering |  |  |  |  | NOT RUN |  |
| H Kitchen/beverage |  |  |  |  | NOT RUN |  |
| I Billing/close |  |  |  |  | NOT RUN |  |
| J Printing |  |  |  |  | NOT RUN |  |
| K Recovery/realtime |  |  |  |  | NOT RUN |  |
| L Reports/audit |  |  |  |  | NOT RUN |  |
| M 20-table performance |  |  |  |  | NOT RUN |  |
| N UI/UX/devices |  |  |  |  | NOT RUN |  |
| O Backup/monitoring |  |  |  |  | NOT RUN |  |
| P HitPay/GST |  |  |  |  | DEFERRED TO FINAL |  |
| Q Dress rehearsal/go-live |  |  |  |  | NOT RUN |  |

## 26. Final approval

- Final launch decision: `NOT YET ASSESSED`
- Unresolved blockers:
- Accepted P2/P3 risks and owner:
- Production commit:
- Backup/export timestamp:
- Launch date and opening time:
- First-service technical responder:
- Restaurant operations approver:
- Technical approver:
- Approval timestamp:

The system may be marked **LAUNCH READY** only after all launch-critical items
are evidenced, Phase P is complete, the 20-table rehearsal passes, the final
dress rehearsal reconciles, and the named approvers sign this section.
