# Sakorio POS pre-launch live-browser QA brief - 100 deep end-to-end scenarios

Date: 2026-07-25  
Run prefix: `SKR-PRELAUNCH-20260725-E2E`  
Target: live Sakorio domains through browser only  
Status: scenario brief ready for execution  
Primary goal: prove whether Sakorio POS is truly launch-ready under real restaurant workflows, not just individual button checks.

## 1. Executive purpose

This is the pre-live "every nook and cranny" QA script for Sakorio POS after the imported menu, menu images, persistent uploads, POS table drawer polish, QR-session hardening, and payment-flow improvements.

Every case below must be executed through the live browser. Code inspection can be used later to diagnose defects, but a workflow can only receive a pass score when the visible live product proves it.

Each scenario is intentionally end-to-end. A case starts from a realistic restaurant situation and ends with a resolved operating state, such as:

- reservation created, seated, ordered, paid, closed, and visible in history;
- walk-in queue guest seated, served, paid, and removed from active queue;
- customer QR round one and round two kept inside the same active table session;
- staff POS verbal add-on combined with customer QR order on one bill;
- kitchen/beverage tickets received, progressed, served, and reflected in bill state;
- cashier payment truth verified for terminal and HitPay sandbox;
- iPad/tablet layout verified while actual service actions are performed;
- staff shift/timetable workflow created, clocked in/out, and auditable;
- end-of-day report/history/checklist confirms no orphan QA data remains.

Do not mark a case as passed because one page loaded. The case passes only when the final state is visibly confirmed across every relevant module.

## 2. Live surfaces

- Staff portal: `https://staff.sakorio.com`
- Customer QR ordering: `https://order.sakorio.com/menu/<table_token>?qr_access=<token>`
- Public booking: `https://order.sakorio.com/book/1`
- Public waitlist: `https://order.sakorio.com/waitlist/1`
- HitPay sandbox checkout: only when reached from Sakorio
- Render dashboard: deploy/status observation only, not UX scoring

## 3. Roles to simulate

- Customer using QR ordering
- Customer booking a reservation
- Customer joining public waitlist
- Host managing reservations, queues, seating, and table assignment
- Waiter starting table service and adding verbal orders
- Cashier managing POS, payments, bills, and table close
- Kitchen user receiving and progressing food tickets
- Beverage user receiving and progressing drink tickets
- Manager correcting bills, checking reports, overseeing staff and timetable
- Staff member selecting profile, clocking in, clocking out
- Owner/launch auditor checking final service-day readiness

## 4. Non-negotiable launch invariants

1. QR customers must never see another customer/session history.
2. Same-table orders must stay current until the table is closed.
3. Closed tables must move previous orders to History only.
4. Old QR links must not reopen a closed session or expose old bills.
5. Customer checkout must not show Cash.
6. Terminal payment and HitPay payment must not be treated as paid until actually completed.
7. Abandoned/cancelled HitPay requests must leave the bill unpaid/open.
8. Unpaid tables must not be closable without a strong guardrail.
9. Close-table confirmation must be explicit and table-specific.
10. POS, Tables, Orders, Kitchen, Reservations, Queue, and Reports must agree on table/order/payment state.
11. Kitchen and beverage tickets must be readable during real service pressure.
12. Menu names, prices, categories, and images must match the imported menu state.
13. Staff protected routes must require valid staff authentication after logout.
14. iPad/tablet layouts must have no overlapping text, hidden critical actions, or impossible tap targets.
15. End-of-day state must be clean: no orphan carts, unpaid QA bills, stale queue rows, or stuck kitchen tickets.

## 5. Scoring model

Each executed case receives these scores:

| Area | Score | What it measures |
|---|---:|---|
| Functional correctness | /10 | Did the business workflow complete correctly? |
| UI/UX clarity | /10 | Would a real staff/customer know what to do under pressure? |
| Workflow speed | /10 | Are there excessive clicks, hidden steps, tab-hopping, or needless scrolling? |
| Layout/device stability | /10 | Any overlap, clipping, stale panel, bad iPad behavior, or broken container? |
| Data/payment/session integrity | /10 | Are table, order, QR, kitchen, reservation, queue, payment, and history states consistent? |
| Launch readiness | /10 | Is this safe for real service? |

Final case score is a weighted judgement after the six scores above.

Hard caps:

- Any payment truth defect caps the score at 6.0.
- Any cross-table or cross-customer privacy leak caps the score at 5.0.
- Any unpaid table that can be closed accidentally caps the score at 6.5.
- Any critical action hidden/unusable on iPad caps the score at 8.0.
- Any staff logout/protected-route failure caps access/session cases at 7.5.
- Any case not completed in browser is `BLOCKED`, `PARTIAL`, or `NEEDS SPECIFICATION`, not `PASS`.

## 6. Execution result skeleton

Use this exact shape when running each case:

```md
### SKR-PRELAUNCH-20260725-E2E-###

- Priority:
- Roles simulated:
- Browser/device mode:
- Starting state:
- Test data:
- Browser steps executed:
- Expected final state:
- Actual final state:
- Cross-module verification:
- Functional correctness:
- UI/UX clarity:
- Workflow speed:
- Layout/device stability:
- Data/payment/session integrity:
- Launch readiness:
- Final score:
- Status: PASS / PARTIAL / FAIL / BLOCKED / NEEDS SPECIFICATION
- Evidence:
- Defects found:
- Improvements needed:
- Cleanup performed:
- Launch decision:
```

## 7. Required evidence per case

- Full URL or page path used for each module.
- Role simulated.
- Table number, order ID, reservation ID, queue ticket, payment reference, or staff shift ID where applicable.
- Device mode: desktop, iPad landscape, iPad portrait, or mobile.
- Evidence note for every score below 10.
- Cleanup proof: table reset, queue archived/cancelled, reservation finished/cancelled, ticket served, test cart cleared.

## 8. Recommended run order

1. Run access/session and clean-board checks first.
2. Run one clean QR/POS/payment/close proof before reservation/queue pressure tests.
3. Keep at least two known clean tables available.
4. Run reservation and queue flows with synthetic QA names only.
5. Run HitPay sandbox success and abandon tests before final payment signoff.
6. Run kitchen/beverage tests while live tickets exist.
7. Run iPad/tablet cases with real action, not just screenshots.
8. Finish with reporting/end-of-day cleanup.

## 9. Scenario catalog - 100 end-to-end launch simulations

### Phase A - Access, session, health, and clean launch board

| ID | Priority | Roles | End-to-end simulation | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-PRELAUNCH-20260725-E2E-001 | P0 | Staff, owner | Log in to staff portal, open Dashboard, POS, Tables, Orders, Reservations, Queue, Kitchen, Products, Reports, Timetable, Users, then log out and attempt protected routes. | Staff portal only, after logout visit `/pos`, `/reports`, `/users`. | Auth is stable; logout clears session; protected routes block correctly. |
| SKR-PRELAUNCH-20260725-E2E-002 | P0 | Cashier | Fresh login, open POS, refresh twice, navigate away/back, verify table board settles quickly. | POS counters, table grid, catalog count, console. | POS does not stay stuck, redirect, or show stale loading. |
| SKR-PRELAUNCH-20260725-E2E-003 | P0 | Manager | Identify active QA orders/tables/queue/reservation data from old tests; safely close, cancel, or document intentionally preserved data. | POS, Tables, Orders, Kitchen, Reservations, Queue. | Test run starts from a known clean or intentionally seeded state. |
| SKR-PRELAUNCH-20260725-E2E-004 | P0 | Staff, customer | Open one staff POS tab, one staff Orders tab, one customer QR tab, reload all, verify session/table identity remains correct. | Multi-tab browser. | No forced logout, stale tab confusion, or cross-session leak. |
| SKR-PRELAUNCH-20260725-E2E-005 | P1 | Staff | Change language and return to English, then open core modules again. | Sidebar, labels, route stability. | Language switch does not break navigation or critical labels. |
| SKR-PRELAUNCH-20260725-E2E-006 | P1 | Staff | Let Render wake/idled service load, then use POS without manual refresh spam. | Staff app startup. | Wake page transitions to app cleanly; user knows what is happening. |
| SKR-PRELAUNCH-20260725-E2E-007 | P1 | Manager | Open Products and verify imported menu count/images, then POS and QR show same menu availability. | Products, POS, QR menu. | Backend menu state matches staff/customer menu state. |
| SKR-PRELAUNCH-20260725-E2E-008 | P1 | Staff | Use sidebar collapse/fullscreen controls while POS table drawer is open. | POS desktop/iPad. | Drawer and payment lane remain usable after layout changes. |
| SKR-PRELAUNCH-20260725-E2E-009 | P2 | Staff | Hard refresh each core route once and check no route returns a blank page. | Dashboard, POS, Tables, Orders, Kitchen, Queue, Reservations. | Frontend routing is resilient. |
| SKR-PRELAUNCH-20260725-E2E-010 | P2 | Owner | Review visible app version/commit, then verify it matches the deployed build expected for launch QA. | Staff footer/sidebar/version label. | Browser QA is on correct deployment. |

### Phase B - Customer QR ordering and session privacy

| ID | Priority | Roles | End-to-end simulation | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-PRELAUNCH-20260725-E2E-011 | P0 | Customer, kitchen, cashier | Customer scans clean table QR, browses menu, adds one item, places order, kitchen receives it, cashier sees current bill. | QR, Kitchen, POS/Orders. | First QR order lands on correct table/session. |
| SKR-PRELAUNCH-20260725-E2E-012 | P0 | Customer, kitchen, cashier | Customer orders round one, reloads QR, orders round two, staff verifies both rounds stay in current bill. | QR bill, Orders, Kitchen, POS. | Same customer session does not push first order to History before close. |
| SKR-PRELAUNCH-20260725-E2E-013 | P0 | Customer | Customer opens current QR bill/order status after ordering and checks total. | QR page only. | Customer sees only current session and total bill. |
| SKR-PRELAUNCH-20260725-E2E-014 | P0 | Customer | Customer uses old QR link after table has been closed/reset. | Old QR URL. | Old QR is blocked/closed and does not expose previous bill. |
| SKR-PRELAUNCH-20260725-E2E-015 | P0 | Customer, cashier | Customer starts QR checkout; verify no Cash option appears; choose allowed HitPay/terminal path as available. | QR checkout. | Customer payment choices are correct and clear. |
| SKR-PRELAUNCH-20260725-E2E-016 | P1 | Customer | Customer rapidly adds/removes same item, clears cart, submits only when cart has valid items. | QR cart. | No negative quantity, empty order, or duplicate submission. |
| SKR-PRELAUNCH-20260725-E2E-017 | P1 | Customer, kitchen | Customer adds special kitchen note/allergy note, submits order, kitchen verifies note. | QR cart, Kitchen ticket. | Notes persist and are readable. |
| SKR-PRELAUNCH-20260725-E2E-018 | P1 | Customer | Customer searches imported menu item by name/category, opens/uses card, adds to cart, checks price. | QR menu. | Large menu is searchable and price is correct. |
| SKR-PRELAUNCH-20260725-E2E-019 | P1 | Customer | Customer browses 30+ items with images on mobile/iPad and submits one order. | QR mobile/iPad viewport. | Menu remains usable without overlap or hidden cart actions. |
| SKR-PRELAUNCH-20260725-E2E-020 | P2 | Customer | Customer opens same QR in two tabs and attempts order/status refresh from both. | Two QR tabs. | Same table/session state is understandable; no duplicate/confusing bill. |

### Phase C - Reservations to seating to QR/order/payment/close

| ID | Priority | Roles | End-to-end simulation | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-PRELAUNCH-20260725-E2E-021 | P0 | Customer, host, kitchen, cashier | Customer reserves online, host searches booking, seats at table, customer QR orders, kitchen serves, cashier pays/closes. | Booking, Reservations, Tables, QR, Kitchen, POS. | Full reservation lifecycle succeeds. |
| SKR-PRELAUNCH-20260725-E2E-022 | P0 | Customer, host | Customer enters invalid phone/email, receives clear error, fixes details, books, host finds booking. | Public booking and Reservations search. | Validation is clear and corrected data is searchable. |
| SKR-PRELAUNCH-20260725-E2E-023 | P1 | Host | Host creates reservation manually, edits party size, assigns suitable table, seats, then customer orders/pays/closes. | Reservations, Tables, QR/POS. | Edited reservation data drives correct table assignment. |
| SKR-PRELAUNCH-20260725-E2E-024 | P1 | Host, customer | Reservation arrives early; host uses seat-now path; QR ordering starts before original time. | Reservations, Tables, QR. | Early seating is clear and safe. |
| SKR-PRELAUNCH-20260725-E2E-025 | P1 | Host, customer | Reservation arrives late while a queue guest exists; host chooses correct seating action and records outcome. | Reservations, Queue, Tables. | Host has enough state to avoid wrong seating. |
| SKR-PRELAUNCH-20260725-E2E-026 | P1 | Host | Host cancels/no-shows reservation, then attempts to seat it accidentally. | Reservations. | Cancelled/no-show booking cannot create wrong active table. |
| SKR-PRELAUNCH-20260725-E2E-027 | P1 | Host, waiter | Seated reservation asks to move tables before ordering; host/waiter moves or cleanly releases/reseats. | Reservations, Tables, QR. | Old table/QR does not retain live session. |
| SKR-PRELAUNCH-20260725-E2E-028 | P1 | Host, waiter | Seated reservation orders first round, then requests table move. | Tables, Orders, Kitchen, QR/POS. | System either supports move safely or blocks with clear reason. |
| SKR-PRELAUNCH-20260725-E2E-029 | P2 | Customer, host | Customer books with long name/remarks; host views on desktop and iPad. | Reservations desktop/iPad. | Long text wraps cleanly without layout overlap. |
| SKR-PRELAUNCH-20260725-E2E-030 | P2 | Host | Two reservations at similar time are seated to different tables, both order and close. | Reservations, Tables, QR, POS. | Parallel reservations do not cross-link. |

### Phase D - Queue and walk-in lifecycle

| ID | Priority | Roles | End-to-end simulation | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-PRELAUNCH-20260725-E2E-031 | P0 | Customer, host, kitchen, cashier | Customer joins public waitlist, host seats, customer QR orders, kitchen serves, cashier pays/closes. | Waitlist, Queue, Tables, QR, Kitchen, POS. | Full queue-to-table lifecycle works. |
| SKR-PRELAUNCH-20260725-E2E-032 | P1 | Host, waiter | Host creates manual walk-in queue entry, edits party size/name, seats, waiter POS orders, cashier closes. | Queue, Tables, POS. | Staff-created queue handoff is clean. |
| SKR-PRELAUNCH-20260725-E2E-033 | P1 | Customer, host | Customer duplicates waitlist with same phone/name; host detects and handles duplicate before seating. | Public waitlist, Queue. | Duplicate active queue entries are blocked or obvious. |
| SKR-PRELAUNCH-20260725-E2E-034 | P1 | Host | Large party queue entry is assigned to too-small table, then corrected to valid table. | Queue, Tables. | Capacity warning is clear. |
| SKR-PRELAUNCH-20260725-E2E-035 | P1 | Customer, host | Customer joins queue, leaves/cancels, then rejoins later and is seated. | Waitlist, Queue. | Only one active queue row remains. |
| SKR-PRELAUNCH-20260725-E2E-036 | P1 | Host | Queue guest is notified, seated, then active queue counter updates. | Queue, Tables. | Notified/seated transition clears active waiting. |
| SKR-PRELAUNCH-20260725-E2E-037 | P1 | Host | Queue guest seated but places no order; staff releases empty table session. | Queue, Tables, POS. | Empty queue seating can be undone safely. |
| SKR-PRELAUNCH-20260725-E2E-038 | P2 | Host | Host reviews stale/closed queue entries, archives one QA row, returns to active queue. | Queue filters/history. | Active queue remains clean and fast. |
| SKR-PRELAUNCH-20260725-E2E-039 | P2 | Host | Queue guest is converted to future reservation if supported; otherwise document unsupported safe behavior. | Queue, Reservations. | Guest context is preserved or unsupported flow is clear. |
| SKR-PRELAUNCH-20260725-E2E-040 | P2 | Host, customer | Queue guest has special request/large note; host views/seats on iPad. | Queue iPad viewport. | Notes do not crush controls or table suggestions. |

### Phase E - POS cashier table service and payments

| ID | Priority | Roles | End-to-end simulation | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-PRELAUNCH-20260725-E2E-041 | P0 | Cashier, kitchen | Cashier selects idle table in POS, adds item, sends order, kitchen receives, cashier terminal-pays, closes table. | POS, Kitchen, Tables, Orders. | POS table-first flow is complete and table resets. |
| SKR-PRELAUNCH-20260725-E2E-042 | P0 | Cashier, customer | Active QR table exists; cashier adds verbal add-on in POS, verifies combined bill, pays, closes. | QR, POS, Orders. | QR and POS entries combine correctly. |
| SKR-PRELAUNCH-20260725-E2E-043 | P0 | Cashier | Cashier attempts close table with unpaid bill, then completes payment, then closes. | POS close controls/confirmation. | Unpaid close is blocked; paid close is explicit. |
| SKR-PRELAUNCH-20260725-E2E-044 | P0 | Customer, cashier | Customer completes HitPay sandbox payment; Sakorio return updates paid state; cashier closes table. | QR, HitPay sandbox, POS, Orders. | HitPay success is truthful. |
| SKR-PRELAUNCH-20260725-E2E-045 | P0 | Customer, cashier | Customer starts HitPay sandbox then abandons/cancels; staff verifies bill remains unpaid/open. | HitPay, POS, Orders. | Payment request is not falsely paid. |
| SKR-PRELAUNCH-20260725-E2E-046 | P1 | Cashier | Cashier switches among three active tables with carts/orders, returns to each, and verifies isolation. | POS table drawer. | No cart/order/table mix-up. |
| SKR-PRELAUNCH-20260725-E2E-047 | P1 | Cashier | Cashier searches large imported menu by exact item, category chip, and scroll; adds exact item and verifies price. | POS menu grid/cart. | Menu grid is fast, compact, and accurate. |
| SKR-PRELAUNCH-20260725-E2E-048 | P1 | Manager, cashier | Wrong item added before send/payment; manager voids/corrects if supported, cashier pays correct bill. | POS/Orders permission flow. | Correction is authorized and totals are correct. |
| SKR-PRELAUNCH-20260725-E2E-049 | P1 | Manager | Recently closed bill is reviewed in History; reopen/refund action is tested if supported or documented as unsupported. | Orders/Tables History. | Post-close correction policy is clear. |
| SKR-PRELAUNCH-20260725-E2E-050 | P2 | Cashier | Cashier performs table service on iPad landscape and confirms payment lane remains reachable. | POS iPad `1024x768`. | No overlap, hidden Pay button, or excessive scroll trap. |

### Phase F - Orders tab, history, and bill truth

| ID | Priority | Roles | End-to-end simulation | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-PRELAUNCH-20260725-E2E-051 | P0 | Cashier, manager | Create active table order, open Orders tab, verify it appears in current orders, then pay/close and verify History. | Orders current/history, POS/Tables. | Current vs History boundary is correct. |
| SKR-PRELAUNCH-20260725-E2E-052 | P0 | Customer, cashier | Two QR rounds on same table; Orders tab must show both in current session until close. | QR, Orders, POS. | No premature History movement. |
| SKR-PRELAUNCH-20260725-E2E-053 | P1 | Cashier | Staff filters/searches Orders by table, order number, unpaid/paid state after a live transaction. | Orders filters/search. | Staff can quickly find the right bill. |
| SKR-PRELAUNCH-20260725-E2E-054 | P1 | Manager | Manager opens paid order detail, verifies item lines, totals, payment method, table, close timestamp. | Orders History/detail. | Audit details are accurate. |
| SKR-PRELAUNCH-20260725-E2E-055 | P1 | Cashier | Active order is served in Kitchen but unpaid; Orders must still show unpaid/current. | Kitchen, Orders. | Served is not paid or closed. |
| SKR-PRELAUNCH-20260725-E2E-056 | P1 | Cashier | Table has no active bill but many History records; Orders button/history badge behavior is verified. | POS/Tables/Orders. | History is reachable without confusing it with current bill. |
| SKR-PRELAUNCH-20260725-E2E-057 | P2 | Cashier | Staff opens order detail on iPad and checks line wrapping/controls. | Orders iPad. | Detail view is usable on tablet. |
| SKR-PRELAUNCH-20260725-E2E-058 | P2 | Manager | Paid order appears in reports/end-day checklist after close. | Orders, Reports. | Sales trail reconciles. |
| SKR-PRELAUNCH-20260725-E2E-059 | P2 | Manager | Cancelled/voided/unpaid test order, if supported, is searchable but not counted as paid revenue. | Orders/Reports. | Revenue truth is protected. |
| SKR-PRELAUNCH-20260725-E2E-060 | P2 | Cashier | Staff refreshes Orders while live order changes in QR/POS/Kitchen. | Orders live updates. | Refresh does not lose table/order context. |

### Phase G - Kitchen and beverage operations

| ID | Priority | Roles | End-to-end simulation | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-PRELAUNCH-20260725-E2E-061 | P0 | Customer, kitchen, beverage | Customer submits mixed food and drink order; food and beverage tickets route/read correctly. | QR/POS, Kitchen & beverage display. | Station routing is clear. |
| SKR-PRELAUNCH-20260725-E2E-062 | P1 | Kitchen | Kitchen progresses ticket through available states, refreshes after each, and serves. | Kitchen, Orders. | Status persists and served feedback is visible. |
| SKR-PRELAUNCH-20260725-E2E-063 | P1 | Kitchen | Two tables submit orders close together; kitchen serves one and leaves the other active. | Kitchen backlog. | Table labels prevent mix-ups. |
| SKR-PRELAUNCH-20260725-E2E-064 | P1 | Beverage | Beverage-only order is submitted and processed. | Kitchen/beverage display, Orders. | Drink lane is not noisy/confusing. |
| SKR-PRELAUNCH-20260725-E2E-065 | P1 | Kitchen | Long multi-item order with notes is viewed on kitchen iPad. | Kitchen iPad viewport. | Ticket remains scannable. |
| SKR-PRELAUNCH-20260725-E2E-066 | P1 | Kitchen, cashier | Kitchen serves order; cashier immediately pays/closes table; kitchen refreshes. | Kitchen, POS. | Served/closed state clears safely. |
| SKR-PRELAUNCH-20260725-E2E-067 | P2 | Kitchen | Kitchen display is left open while new order comes in from QR. | Kitchen auto-refresh/manual refresh. | Staff can notice new order reliably. |
| SKR-PRELAUNCH-20260725-E2E-068 | P2 | Kitchen | Kitchen filters by station/status if controls exist; then resets filter. | Kitchen filters. | Filters do not hide active tickets accidentally. |
| SKR-PRELAUNCH-20260725-E2E-069 | P2 | Kitchen | Ticket with item image-less product and image product both show readable names/categories. | Kitchen ticket content. | Kitchen does not depend on images to identify dishes. |
| SKR-PRELAUNCH-20260725-E2E-070 | P2 | Waiter | Waiter marks served/ready flow and then checks POS bill. | Kitchen, POS. | Service state supports billing handoff. |

### Phase H - Menu, products, images, and catalog accuracy

| ID | Priority | Roles | End-to-end simulation | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-PRELAUNCH-20260725-E2E-071 | P0 | Manager, customer | Compare 20 random live QR menu items to imported PDF audit: name, price, image where available. | QR menu, Products, PDF audit reference. | No funny characters, wrong prices, or missing key images. |
| SKR-PRELAUNCH-20260725-E2E-072 | P1 | Manager | Products page search/filter for five menu categories, open item detail/edit view without saving accidental changes. | Products. | Menu management is usable and safe. |
| SKR-PRELAUNCH-20260725-E2E-073 | P1 | Customer | QR category chips for all major categories are tapped; counts and products change logically. | QR menu. | Category navigation works with 112-item menu. |
| SKR-PRELAUNCH-20260725-E2E-074 | P1 | Cashier | POS category/search exact add for image product and no-image product. | POS menu grid/cart. | Staff can sell all items even if image missing. |
| SKR-PRELAUNCH-20260725-E2E-075 | P1 | Manager | Reload Products/QR after redeploy/cache refresh and verify images persist. | Products, QR direct image URLs if visible. | Persistent disk/image path remains stable. |
| SKR-PRELAUNCH-20260725-E2E-076 | P2 | Customer | Search using lowercase/partial menu text and category text. | QR search. | Search is forgiving. |
| SKR-PRELAUNCH-20260725-E2E-077 | P2 | Cashier | Search using item code-like names, long names, promo names, and drink names. | POS search. | Long imported item names remain readable. |
| SKR-PRELAUNCH-20260725-E2E-078 | P2 | Manager | Products page on iPad: search, scroll, image cards, edit/open controls. | Products iPad. | Product admin is tablet-usable. |
| SKR-PRELAUNCH-20260725-E2E-079 | P2 | Customer | QR menu on slower first load after cache clear/reload. | QR menu. | Loading state is clear; menu eventually appears. |
| SKR-PRELAUNCH-20260725-E2E-080 | P2 | Owner | Spot-check visible tax/currency formatting across QR, POS, Orders, Reports. | QR/POS/Orders/Reports. | SGD formatting is consistent. |

### Phase I - Timetable, users, permissions, and staff operations

| ID | Priority | Roles | End-to-end simulation | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-PRELAUNCH-20260725-E2E-081 | P1 | Manager, staff | Manager creates or selects QA staff profile; staff selects profile and clocks in; manager verifies active shift. | Users, My shift/Timetable. | Staff profile clock-in is clear. |
| SKR-PRELAUNCH-20260725-E2E-082 | P1 | Staff, manager | Staff clocks out; manager reviews shift duration and attendance record. | My shift, Timetable. | Clock-out is saved and auditable. |
| SKR-PRELAUNCH-20260725-E2E-083 | P1 | Manager | Manager adds timetable shift, edits time/person, saves, reloads page. | Timetable. | Scheduling changes persist. |
| SKR-PRELAUNCH-20260725-E2E-084 | P1 | Manager | Manager records leave/MC/absence if supported, checks remaining leave display. | Timetable/Users. | Leave tracking is understandable or unsupported safely. |
| SKR-PRELAUNCH-20260725-E2E-085 | P1 | Waiter | Waiter role logs in and tries POS/Tables/Kitchen/Reports/Users. | Staff role account. | Permission boundaries are correct. |
| SKR-PRELAUNCH-20260725-E2E-086 | P2 | Manager | Timetable calendar week/month navigation, today button, add shift button, and employee list behavior. | Timetable. | Calendar feels operational, not decorative. |
| SKR-PRELAUNCH-20260725-E2E-087 | P2 | Staff | Staff tries clock-in without scheduled shift and with scheduled shift. | My shift. | Rules and warnings are clear. |
| SKR-PRELAUNCH-20260725-E2E-088 | P2 | Manager | Users page create/edit/deactivate QA user if safe; otherwise inspect non-destructive profile view. | Users. | User management actions are clear and guarded. |
| SKR-PRELAUNCH-20260725-E2E-089 | P2 | Manager | Timetable on iPad: employee list, shift cards, controls, long names. | Timetable iPad. | Scheduling UI avoids overlap and hidden actions. |
| SKR-PRELAUNCH-20260725-E2E-090 | P2 | Owner | Login as/with alternate role after logout; protected admin page should not leak previous owner session. | Staff auth and routes. | Role switching is safe on shared tablets. |

### Phase J - Reporting, end-of-day, resilience, and final launch rehearsal

| ID | Priority | Roles | End-to-end simulation | Required browser verification | Expected final state / risk focus |
|---|---:|---|---|---|---|
| SKR-PRELAUNCH-20260725-E2E-091 | P0 | Manager, cashier | Complete one controlled paid table, then verify Orders History and Reports show payment/table/items/time. | POS, Orders, Reports. | Revenue trail is correct. |
| SKR-PRELAUNCH-20260725-E2E-092 | P0 | Owner | End-of-day cleanup: no open QA bills, no stale queue entries, no stuck kitchen tickets, no active test reservations. | POS, Tables, Orders, Queue, Kitchen, Reservations. | Launch board is clean. |
| SKR-PRELAUNCH-20260725-E2E-093 | P1 | Cashier, customer | Double-click/refresh during order submission and payment return. | QR, POS, Orders. | No duplicate order/payment. |
| SKR-PRELAUNCH-20260725-E2E-094 | P1 | Customer, cashier | Browser back/forward after QR checkout and after close. | QR browser navigation. | Old state does not become actionable. |
| SKR-PRELAUNCH-20260725-E2E-095 | P1 | Staff | Staff app network hiccup simulation by refresh/reopen during active table workflow. | POS/Orders/Kitchen. | State recovers without data loss. |
| SKR-PRELAUNCH-20260725-E2E-096 | P1 | Host, cashier | Table is occupied/seated but no active bill; release/reset path is tested. | Tables/POS. | Empty table can be released safely. |
| SKR-PRELAUNCH-20260725-E2E-097 | P2 | Owner | Print-related placeholders/receipt actions are inspected but not required for launch if intentionally deferred. | POS/Orders/Kitchen. | Printer future work is documented, not blocking if out of scope. |
| SKR-PRELAUNCH-20260725-E2E-098 | P2 | Staff | Open every main tab at iPad landscape and portrait sizes with active service state where possible. | iPad viewport. | No tab has launch-blocking overlap. |
| SKR-PRELAUNCH-20260725-E2E-099 | P2 | Owner | Check Settings/tenant basics are readable and do not expose secrets in UI. | Settings. | Launch config is reviewable and safe. |
| SKR-PRELAUNCH-20260725-E2E-100 | P0 | Owner, full team | Final full dinner rehearsal: reservation guest, queue guest, direct walk-in, QR order, POS add-on, kitchen/beverage, terminal/HitPay payment, close all, end-day report. | All live surfaces. | System is launch-ready only if every active record reconciles and cleanup is complete. |

## 10. Cleanup checklist after execution

- All QA tables are paid/closed/reset.
- All QR sessions used in testing are closed or blocked.
- All QA reservations are seated/finished/cancelled/no-showed intentionally.
- All QA queue rows are seated/cancelled/archived.
- All kitchen/beverage QA tickets are served or explicitly cleaned.
- All test carts are cleared if not sent.
- All unpaid test bills are either paid/closed or documented as intentional blockers.
- Any QA staff/user/shift records are removed, disabled, or labelled.
- HitPay sandbox references are recorded without exposing secrets.
- Browser tabs are reduced to only the final evidence/handoff tabs.

## 11. Launch gate

Sakorio should not be called 100% launch-ready until:

- Every P0 case scores 10/10 or has an explicit business-approved exception.
- Every P1 case scores at least 9/10.
- No payment/session/privacy/table-state defect remains.
- iPad POS, QR, Kitchen, Queue, Reservations, and Timetable are browser-proven.
- The final cleanup checklist is complete.

## 12. Execution notes for the next pass

Use this document as the master script. The result document should be a separate file with the same run prefix and should include:

- score table for all 100 cases;
- detailed result sections for all failures/partials;
- exact defects and polish improvements found;
- cleanup performed;
- final launch recommendation.
