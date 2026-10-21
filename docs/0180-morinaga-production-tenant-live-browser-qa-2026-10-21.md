# Morinaga Ramen Izakaya — Production Tenant Live-Browser QA

**Date:** 2026-10-21 (Asia/Singapore)  
**Environment:** Production (`staff.sakorio.com`, `order.sakorio.com`, `api.sakorio.com`)  
**Tenant:** Morinaga Ramen Izakaya (`tenant_id=3`)  
**Staff build shown:** `2.1.6 / 86dea963`  
**Public build shown:** `2.1.6 / bc9a7c21`  
**Tester role:** Owner  
**Method:** Live browser only. No localhost or code-derived result was counted as a QA pass.

## 1. Executive result

**Launch-readiness score: 74/100 — CONDITIONAL / NOT YET READY FOR LIVE PAYMENTS.**

The Morinaga tenant is correctly isolated, the owner can authenticate, the public brand and opening hours are correct, 10 tables and 112 menu products are available, public booking handles the overnight schedule, and desktop/iPad layouts are usable without visible overlap. The API and database health endpoints are healthy.

The restaurant should **not** take live payments yet. Morinaga has no tenant-specific HitPay API key or webhook salt, printing readiness is only 13% with no paired print agent, 2FA is disabled, the owner password is temporary/weak, and legal/contact/reservation policy fields remain incomplete. A complete order-to-kitchen-to-payment-to-close-table transaction was intentionally not represented as a pass because those dependencies are not ready.

## 2. Scoring model

Each case is scored from 0–10:

- **10:** verified live and launch-quality
- **9:** verified live with only minor polish remaining
- **8:** usable, but launch preparation is incomplete
- **6–7:** material setup or evidence gap
- **1–5:** major blocker
- **0:** unavailable or unsafe to execute

Statuses:

- **PASS:** verified live and acceptable
- **PARTIAL:** verified only through the safe portion of the workflow
- **BLOCKED:** dependency or production-safety constraint prevented an honest pass
- **FAIL:** live behavior is not launch-ready

## 3. Live environment baseline

| Item | Live evidence |
|---|---|
| API database health | `status=ok`, `database=connected`, schema `20261021170000` |
| Restaurant identity | Morinaga Ramen Izakaya, production tenant (`is_demo=false`) |
| Owner access | Authenticated Owner, Morinaga-only dashboard |
| Tables | 10 total: T01–T05 with 4 seats; T06–T10 with 2 seats |
| Menu | 112 products across 6 categories |
| Product images | 90/112 products have an image (80.4%) |
| Open bills/orders | 0 / 0 at test start and end |
| Queue/reservations | 0 / 0 at test start and end |
| Kitchen stations | Kitchen and Beverages |
| HitPay | Sandbox selected, tenant key and webhook salt absent |
| Printing | 13% readiness; 0/0 agents; 0 dry-run or real receipts |
| Staff | One Owner account only |

## 4. Fifty-case live-browser matrix

| ID | End-to-end case | Live outcome | Status | Score |
|---|---|---|---|---:|
| MOR-QA-001 | Open production API health → verify service response | API responded normally | PASS | 10 |
| MOR-QA-002 | Open database health → verify connection and schema | Connected; schema `20261021170000` | PASS | 10 |
| MOR-QA-003 | Staff login → dashboard → confirm owner role | Login succeeded and Owner dashboard loaded | PASS | 10 |
| MOR-QA-004 | Login → inspect tenant banner on protected pages | Morinaga identity remained consistent | PASS | 10 |
| MOR-QA-005 | Logout → visit protected Settings route | Redirected to `/login` | PASS | 10 |
| MOR-QA-006 | Re-login after session invalidation | Owner session restored successfully | PASS | 10 |
| MOR-QA-007 | Force an Ajisen table ID in Morinaga POS URL | Foreign table was not opened; only Morinaga tables loaded | PASS | 10 |
| MOR-QA-008 | Public tenant list → inspect production/demo markers | Morinaga is production; Ajisen is demo | PASS | 10 |
| MOR-QA-009 | Public restaurant chooser → identify stray tenants | A separate `test` demo tenant is still publicly visible | PARTIAL | 7 |
| MOR-QA-010 | Dashboard load → validate operational summary | 10 ready tables, zero queue pressure, zero arrivals | PASS | 10 |
| MOR-QA-011 | Business profile → verify restaurant identity | Name, type, description, timezone and SG code correct | PASS | 9 |
| MOR-QA-012 | Contact settings → verify guest-facing details | Phone, WhatsApp, address, website and Maps link present; email/UEN absent | PARTIAL | 8 |
| MOR-QA-013 | Opening hours → verify overnight schedule | Mon–Sat 18:30–04:30; Sunday closed | PASS | 10 |
| MOR-QA-014 | Currency/tax → verify Singapore setup | SGD and GST 9% selected | PASS | 9 |
| MOR-QA-015 | SMTP settings → verify tenant email delivery readiness | Tenant SMTP fields are empty; global fallback not proven in this pass | PARTIAL | 6 |
| MOR-QA-016 | Security settings → verify account hardening | 2FA available but disabled; temporary password still weak | FAIL | 5 |
| MOR-QA-017 | Reservation policy → verify launch rules | Cancellation, arrival tolerance, turn time, slot cap and dress code are blank | FAIL | 5 |
| MOR-QA-018 | Brand assets → verify logo and public header | Restaurant name is correct; logo/header assets are absent | PARTIAL | 6 |
| MOR-QA-019 | Products page → count restaurant menu | 112 products loaded | PASS | 10 |
| MOR-QA-020 | Products page → verify category structure | Six categories with usable filters | PASS | 10 |
| MOR-QA-021 | Products/POS/public menu → sample price consistency | Sampled item prices matched across surfaces | PASS | 10 |
| MOR-QA-022 | Public menu → verify image completeness | 90 of 112 products have images; 22 use text/initial fallback | PARTIAL | 8 |
| MOR-QA-023 | POS menu → search for `Kimchi` | Three matching controls were returned | PASS | 10 |
| MOR-QA-024 | POS menu → select Drink category | Drink-only catalog rendered with 41 items | PASS | 10 |
| MOR-QA-025 | Public menu → browse category sections | Six collapsible sections, names/prices readable | PASS | 10 |
| MOR-QA-026 | Public menu without table token → attempt ordering context | Menu stayed browse-only, preventing anonymous table ordering | PASS | 10 |
| MOR-QA-027 | POS floor → wait for board synchronization | 10 tables, 0 open bills, SGD 0 paid, 112 catalog items | PASS | 10 |
| MOR-QA-028 | Tables board → verify layout/capacity/status | T01–T10 and seat counts correct; all idle | PASS | 10 |
| MOR-QA-029 | POS → select idle T01 without submitting an order | Table drawer opened; no order or bill was created | PASS | 10 |
| MOR-QA-030 | Table drawer → verify service-loop actions | Add items, Bill/Pay, Orders, History and switch-table actions present | PASS | 9 |
| MOR-QA-031 | Table drawer → verify empty cart safeguards | Zero total and payment action disabled | PASS | 10 |
| MOR-QA-032 | Table drawer → verify one-bill guardrail text | Guardrail is explicit and readable | PASS | 9 |
| MOR-QA-033 | POS → menu card density and readability | Images, names, categories and prices remained usable | PASS | 9 |
| MOR-QA-034 | Create order → kitchen ticket → order overview | Not executed on clean production tenant without approved cleanup plan | BLOCKED | 0 |
| MOR-QA-035 | Same table → second round → same active session | Not executed; requires controlled synthetic order and later cleanup | BLOCKED | 0 |
| MOR-QA-036 | Orders tabs → inspect active/unpaid/paid/history states | Empty-state UI and filters loaded correctly | PASS | 10 |
| MOR-QA-037 | Kitchen display → verify route/station filters | All, Kitchen and Beverages routes available | PASS | 10 |
| MOR-QA-038 | Kitchen display → verify clean launch backlog | Zero active tickets; no stale backlog visible | PASS | 10 |
| MOR-QA-039 | Kitchen ticket → in prep → ready → served | Not executable until a controlled test order is approved | BLOCKED | 0 |
| MOR-QA-040 | Host queue → load permanent QR and service lanes | Waiting, notified and seated lanes loaded; zero stale entries | PASS | 10 |
| MOR-QA-041 | Public waitlist → verify guest intake form | Morinaga identity, party details and disabled-until-valid submit present | PASS | 10 |
| MOR-QA-042 | Join queue → host ping → customer auto-update | Not submitted because it creates a live guest record and notification | BLOCKED | 0 |
| MOR-QA-043 | Staff reservations → service-day view | Correct date, active-service filter and empty summary loaded | PASS | 10 |
| MOR-QA-044 | Public booking → load availability | Future selectable dates and 15-minute slots loaded | PASS | 10 |
| MOR-QA-045 | Public booking → inspect Sunday overnight carry-over | Sunday exposed 00:00–03:30 only, correctly carrying Saturday service | PASS | 10 |
| MOR-QA-046 | Submit reservation → confirmation email → host arrival | Blocked by missing tenant SMTP proof and incomplete policy settings | BLOCKED | 0 |
| MOR-QA-047 | Tenant payment settings → verify isolation | UI states credentials belong only to this restaurant; fields are empty | PARTIAL | 7 |
| MOR-QA-048 | HitPay checkout → webhook → paid state → close table | Tenant key/salt absent; no live or sandbox payment can be certified | BLOCKED | 0 |
| MOR-QA-049 | Print agent → kitchen/customer receipts | 13% readiness, 0 agents, plugin unavailable in browser, no dry run | FAIL | 1 |
| MOR-QA-050 | iPad portrait/landscape → POS and public menu | Responsive controls and two-column product grid usable; no overlap observed | PASS | 9 |

## 5. Module scorecard

| Module | Score | Launch interpretation |
|---|---:|---|
| Identity and tenant isolation | 98/100 | Strong; cross-tenant table ID did not open |
| Public restaurant/menu experience | 88/100 | Good; complete brand assets and 22 missing images |
| POS/table shell | 91/100 | Strong non-transactional UX; transaction lifecycle still unproven |
| Reservations | 76/100 | Availability works; policies and confirmation-email evidence incomplete |
| Queue | 80/100 | Both surfaces work; realtime ping round-trip unproven |
| Kitchen/KDS | 74/100 | Stations and empty baseline correct; no live ticket lifecycle run |
| Payments | 30/100 | Blocked by missing Morinaga HitPay credentials |
| Printing | 13/100 | Not launch-ready; no paired device, heartbeat or receipt evidence |
| Workforce/reports | 82/100 | Core pages load; only one staff profile and no attendance history |
| Security/configuration | 62/100 | 2FA off, weak temporary password, incomplete legal/policy data |
| iPad/responsive layout | 90/100 | No visible overlaps in portrait or landscape simulation |

## 6. Launch blockers and required order

### P0 — must complete before taking live payments

1. Add Morinaga’s tenant-specific HitPay key and webhook salt; verify Sandbox first, then intentionally switch to Live.
2. Complete a controlled payment: table order → HitPay redirect → webhook completion → paid indicator → table close → history/report reconciliation.
3. Pair the Android XP-80T/print agent, obtain online heartbeat, and print both kitchen and customer receipts.
4. Replace the temporary owner password with a unique password and enable OTP/2FA.

### P1 — must complete before public launch

1. Fill the official business email, UEN/GST identity and legal contact data.
2. Add cancellation policy, table-hold tolerance, table-turn time, slot capacity and dress code/guest guidance.
3. Prove confirmation and reminder email delivery to a real controlled inbox.
4. Upload official logo/header assets and complete the remaining 22 product images or explicitly approve text fallbacks.
5. Create individual staff accounts/roles; do not operate the restaurant from one shared Owner login.
6. Hide or archive the public `test` demo tenant if it is no longer needed.

### P2 — controlled operational rehearsal

Run one named rehearsal window using synthetic records only:

1. Reservation → arrival → table assignment.
2. QR first-round order → second-round order in the same table session.
3. Kitchen and beverage routing → in prep → ready → served.
4. Customer/cashier payment → paid state → close table → report check.
5. Queue join → realtime ping → seating → queue number removal.
6. Staff clock-in/photo → clock-out → timetable/report reconciliation.
7. Clean up the synthetic records and confirm zero open bills, tickets, queue entries and clock sessions.

## 7. Browser QA evidence summary

- All passes in this report were observed on the live production domains.
- Desktop and explicit iPad portrait (`768×1024`) and landscape (`1024×768`) viewport simulations were used.
- The browser console showed zero warnings/errors on the final staff and public checks.
- The protected-route test logged out, verified redirect to `/login`, and restored the Morinaga Owner session.
- The tenant-isolation test forced an Ajisen-era table ID; Morinaga loaded only its own T01–T10 board and did not open the foreign table.
- No customer reservation, queue entry, order, payment, receipt or attendance record was fabricated on the production tenant during this pass.

## 8. Final gate

Morinaga is **ready for a controlled restaurant rehearsal**, but **not ready for an unconditional public launch**. The application shell, tenant boundaries, menu, table board, public booking/waitlist, KDS structure, reports and iPad layout are in good condition. Payment, printing, security hardening, legal/policy data and one complete synthetic service cycle remain mandatory before go-live approval.
