# Sakorio POS live browser regression: ordered passes 1-5

Date: 2026-07-22  
Environment: live Sakorio domains (`staff.sakorio.com`, `order.sakorio.com`)  
Staff bundle verified: `2.1.6 229eac83`  
Browser mode: live in-app browser, narrow viewport confirmed during final scoring at ~764 × 912

## Executive outcome

Overall launch-readiness score from this pass: **8.8 / 10**.

The core restaurant flow is working: staff can seat reservations/queue guests, QR ordering reaches POS and KDS, KDS can clear tickets, terminal payment records correctly, close-table confirmation resets the table, and history only moves after close.

The remaining launch risks are not core checkout failures, but they are important:

1. **Public reservation calendar initially showed every day as outside opening hours** on the public booking page while the staff reservation form had valid slots.
2. **Public waitlist customer status stayed on an old cancelled entry after “Join queue”**, even though the staff queue received the new web waitlist entry.
3. **Staff POS second-round ordering is less obvious than QR second-round ordering.** QR correctly uses `Add to order`; staff POS did not expose a fresh `Send order` after an active bill and product taps did not clearly create a new staff round.
4. **Render free-instance wake/sleep caused a temporary 502 on `order.sakorio.com`** during QR payment-policy testing. It recovered after warm-up.

## Pass 1 — Reservation full E2E

Scenario: Customer booking/reservation created → staff seats → QR opens → customer orders → KDS → terminal payment → close table.

Result: **Pass with public booking issue**  
Score: **8.7 / 10**

Steps executed:

1. Opened public reservation page: `https://order.sakorio.com/book/1`.
2. Public calendar showed July 2026 days as “outside opening hours,” including future days; no public booking could be completed from that state.
3. Continued via staff reservation form.
4. Created reservation `QA Live LIVE15957171`, reservation `#75`, 1 guest.
5. Staff reservation list immediately showed the new reservation highlighted/searchable.
6. Used `Seat at T07` from reservation handoff.
7. POS opened `T07` with visible QR link and `QR active`.
8. Customer QR placed order `#144`:
   - 1 × Tacos de Carne Asada
   - 1 × Coca Cola
   - Total SGD 15.00
9. KDS showed `#144 · T07` immediately.
10. KDS advanced:
    - Start ticket
    - Ready for pass
    - Served / Delivered
11. POS showed bill `#144` payable.
12. Staff terminal payment recorded SGD 15.00.
13. Close table showed strong final confirmation:
    - table becomes available
    - QR session ends
    - linked reservation finishes
14. Confirmed close; `T07` reset to Available and reservation `#75` finished.

Needs improvement:

- Public booking calendar availability needs investigation because staff booking had valid time slots while public calendar initially blocked the month.

## Pass 2 — Queue full E2E

Scenario: Customer joins queue → host seats → QR visible → release empty table test → second queue real order/payment/close.

Result: **Pass with public customer status issue**  
Score: **8.5 / 10**

Steps executed:

1. Opened public waitlist: `https://order.sakorio.com/waitlist/1`.
2. Page initially showed old cancelled queue entry `Q0032`.
3. Clicked `Join again`, filled:
   - `QA Queue QPASS2801363`
   - phone `+6592801363`
   - 2 guests
4. Public page still displayed cancelled `Q0032`.
5. Staff Queue did receive the web waitlist entry correctly.
6. Staff Queue selected `QA Queue QPASS2801363`.
7. Seat buttons were clear and accessible:
   - `Seat QA Queue QPASS2801363 at T07`
   - `Seat QA Queue QPASS2801363 at T09`
   - `Seat QA Queue QPASS2801363 at T04`
8. Seated at `T07`.
9. POS opened with QR visible and `Release table`.
10. Tested empty-table release:
    - confirmation showed “Release T07?”
    - explained QR session ends and table returns Available
    - confirmed release
    - `T07` became Available
11. Created second queue entry from staff: `QA Queue QREAL6697613`.
12. Seated at `T07`.
13. Customer QR placed order `#145`:
    - 1 × Enchiladas
    - 1 × Water
    - Total SGD 20.00
14. KDS cleared `#145`.
15. Staff terminal payment recorded SGD 20.00.
16. Closed table; `T07` reset to Available.

Needs improvement:

- Public waitlist customer status handoff must update to the newly joined queue entry instead of remaining on a stale cancelled entry.
- Queue page still reports stale active entries, though the stale cleanup UI is visible.

## Pass 3 — POS stress pass

Scenario: Add first round → add second round → current orders stay current → payment → close → history only after close.

Result: **Pass for session/history rule; staff second-round UX needs polish**  
Score: **8.6 / 10**

Steps executed:

1. Opened POS `T01`.
2. Added first staff POS item:
   - 1 × Tacos de Carne Asada
3. Sent order `#146`.
4. POS showed:
   - `Orders 1`
   - `History 18`
   - SGD 12.00 current bill
5. Attempted staff second-round add via POS product cards.
6. Staff POS did not expose `Send order` for a second staff round after the active bill was created.
7. Opened active customer QR for `T01`.
8. Added second round:
   - 1 × Coffee
9. Customer QR correctly changed CTA to `Add to order`.
10. Submitted second round into same live bill `#146`.
11. POS showed:
    - Tacos + Coffee
    - SGD 14.50
    - `Orders 1`
    - `History 18`
12. KDS cleared `#146`.
13. Terminal payment recorded SGD 14.50.
14. Closed table.
15. POS showed `T01` Available and `Orders (19)`.

What this confirms:

- The previous bug where a new round moved the first order to History before close is not reproduced.
- History only increments after close.

Needs improvement:

- Staff POS needs a clearer “Add another round / Send added items” path once a live bill exists.
- Product taps during an active staff bill need stronger feedback if they are intentionally disabled or if they add to the current bill.

## Pass 4 — Customer QR payment policy

Scenario: Customer QR payment options should show HitPay / terminal only; no Cash; only current-session bill.

Result: **Pass, with runtime wake-up note**  
Score: **9.1 / 10**

Steps executed:

1. Opened inactive `T02` QR before activation.
2. Customer page correctly showed:
   - `Table Closed`
   - “This table is not currently accepting orders.”
3. Activated `T02` QR from staff POS via QR handoff.
4. First customer reload hit temporary live Render `502 Bad Gateway`.
5. Waited and reloaded; customer QR page recovered.
6. Customer placed order `#147`:
   - 1 × Coca Cola
   - Total SGD 3.00
7. Clicked `Pay Now`.
8. Customer checkout showed:
   - `Pay with HitPay`
   - `Pay with Card at Table`
9. Customer checkout did **not** show Cash.
10. Cleaned up by serving `#147`, recording terminal payment, and closing `T02`.

Needs improvement:

- Render free-instance wake-up/502 is a launch-readiness concern. Paid instance or always-on behavior should be used before launch.

## Pass 5 — Narrow viewport/iPad page scoring

Viewport evidence from live browser final pass:

- Confirmed narrow viewport around `innerWidth: 764`, `innerHeight: 912`.
- Checked `overflowX` and `mainOverflowX` on each page.

| Page | UI/UX score | Workflow score | Overflow result | Notes |
|---|---:|---:|---|---|
| POS | 9.0 | 8.7 | No horizontal overflow | Table-first workflow is compact and readable; second-round staff add needs clearer CTA. |
| Tables | 8.8 | 8.6 | No horizontal overflow | Floor and queue hints visible; still busy because historical/test queue entries are shown in context. |
| Orders | 8.7 | 8.8 | No horizontal overflow | History-only model is clear; broad history list is dense but usable. |
| Reservations | 8.8 | 8.5 | No horizontal overflow | Staff flow works; public availability mismatch needs fix. |
| Queue | 8.6 | 8.4 | No horizontal overflow | Host controls are strong; stale queue cleanup and customer status page need attention. |
| Kitchen & beverages | 9.2 | 9.3 | No horizontal overflow | Clear lanes, clean zero-state, served ticket leaves board correctly. |
| Timetable | 9.0 | 8.8 | No horizontal overflow | Selected-day panel and schedule controls are visible; good tablet-readiness. |

## Cleanup confirmed

The regression created and closed these live orders/tables:

- `#144` on `T07`, paid and closed.
- `#145` on `T07`, paid and closed.
- `#146` on `T01`, paid and closed.
- `#147` on `T02`, paid and closed.

Tables reset:

- `T01`: Available
- `T02`: Available
- `T07`: Available

Known pre-existing occupied/demo tables remained untouched:

- `T06`: Luca Rossi demo/open state
- `T10`: Emma Wilson demo/seated state

## Priority fixes from this pass

1. **Fix public reservation availability mismatch**
   - Public `/book/1` initially showed all July dates as outside opening hours.
   - Staff reservation form showed valid slots on the same service day.

2. **Fix public waitlist status handoff**
   - Public waitlist “Join again” created/registered a new web waitlist entry in staff Queue, but customer page still displayed stale cancelled `Q0032`.

3. **Polish staff POS second-round ordering**
   - QR second-round flow is good (`Add to order`).
   - Staff POS needs an equally obvious “Add another round” flow after a live bill exists.

4. **Remove/mitigate launch-time Render wake issues**
   - Staff and customer domains can wake slowly; customer QR briefly returned 502.
   - This is not acceptable for launch service hours.

5. **Keep stale QA/test entries under control**
   - Queue and Tables still surface stale/test context.
   - Existing `Archive stale` path should be used or automated before service.

