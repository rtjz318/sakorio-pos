# Sakorio POS live iPad browser QA

Date: 2026-07-22  
Environment: live Sakorio staff/customer domains  
Staff bundle observed: 2.1.6 `6c163303`  
Browser mode: Codex in-app browser with verified iPad viewport override

## Viewports verified

| Mode | Requested | Measured in live page | Result |
| --- | ---: | ---: | --- |
| iPad portrait | 820 × 1180 | 820 × 1180 / 812 content width | Valid iPad simulation |
| iPad landscape | 1180 × 820 | 1180 × 820 / 1172 content width | Valid iPad simulation |

No major horizontal page overflow was observed in either portrait or landscape.

## End-to-end live workflow executed

### E2E-IPAD-001 — reservation handoff, POS, KDS, payment, close

Flow executed in browser:

1. Staff opened Reservations at iPad portrait size.
2. Created reservation `#74` for `QA iPad IPAD188645`.
3. Seated reservation at `T09`.
4. POS opened `T09` with QR active.
5. Added `Coca Cola` and `Tacos de Carne Asada` from the in-drawer POS menu.
6. Sent order `#142`.
7. Verified `#142` appeared on Orders overview under `T09`.
8. Opened Kitchen & Beverages.
9. Advanced `#142`: `Start ticket` → `Ready for pass` → `Served / Delivered`.
10. Returned to POS.
11. Paid `#142` by terminal for SGD 15.00.
12. Closed `T09`.
13. Confirmed `T09` reset to Available and linked reservation `#74` finished automatically.

Score: 9.1 / 10

Passed:

- POS drawer stayed in the same table workflow on iPad.
- Cart, send order, payment, and close table were reachable.
- Payment state updated immediately after terminal payment.
- KDS lanes updated without reload.
- KDS served toast/countdown appeared.
- Close-table confirmation clearly explained QR session end, bill history move, and linked reservation completion.
- Table reset correctly after close.

Needs improvement:

- `Open customer QR` / `Copy QR link` did not expose a visible fallback URL in the live DOM when the browser popup/clipboard path did not provide a usable tab/link. This blocks reliable customer-side continuation from staff POS in constrained browsers.

### E2E-IPAD-002 — queue walk-in to table handoff, cleanup

Flow executed in browser:

1. Staff opened Queue at iPad portrait size.
2. Created walk-in queue entry `QA Queue IPAD188645`.
3. Verified it appeared under Waiting with party size, quoted wait, phone, and notes.
4. Verified stale QA warning remained visible.
5. Seated the queue guest to recommended table `T07`.
6. POS opened `T07` from queue handoff.
7. Created cleanup ticket `#143` with `Coffee`.
8. Served `#143` in KDS.
9. Paid `#143` by terminal for SGD 2.50.
10. Closed `T07`.
11. Confirmed `T07` reset to Available and queue guest name cleared.

Score: 8.7 / 10

Passed:

- Queue creation works at iPad size.
- Queue details and recommended table list are readable.
- Queue → POS table handoff works.
- KDS/payment/close path works after the guest has an order.

Needs improvement:

- Recommended table cards need clearer accessible labels, e.g. `Seat QA Queue IPAD188645 at T07`; current label is the entire card text.
- After seating a queue guest with no order, POS does not show an obvious empty-table reset/undo button. Staff must create/pay/close a ticket or use another path.

## Page-by-page iPad scores

| Page | Portrait score | Landscape score | Notes |
| --- | ---: | ---: | --- |
| Dashboard | 9.2 | Not separately scored | No overflow, readable cards/navigation. |
| POS | 8.5 | 8.5 | Functional and much improved; compact product/action buttons and QR handoff issue remain. |
| Tables | 8.5 | 8.5 | No overflow; dense action controls remain the main iPad weakness. |
| Orders | 9.2 | 9.2 | T09 current bill surfaced clearly; delivered items and payment CTA were readable. |
| Reservations | 8.5 | 8.5 | Seat-at-table labels are clear; availability may initially show loading/disabled before resolving. |
| Queue | 9.2 | 9.2 | Strong host workflow; stale warning visible; accessible seat labels need polish. |
| Kitchen & beverages | 9.2 | 9.2 | Best iPad module in this pass; lanes, actions, and served countdown are clear. |
| Timetable | 8.5 | 8.5 | Rich and usable; dense month grid and many `+ Add`/delete controls are compact on iPad. |

## Timetable iPad check

Verified:

- Route opens at `/working-plan/calendar`.
- Timetable naming is visible.
- Employee roster is visible.
- `Add shift` controls are visible.
- Week/Calendar toggles are visible.
- Leave / MC ledger is visible.
- Coverage warning is visible.
- Monthly calendar renders without horizontal overflow.

Score: 8.5 / 10

Needs improvement:

- Month calendar is information-dense on iPad. Consider a stronger tablet mode: sticky employee/action tray, larger day tap zones, and a focused day drawer after tapping a date.
- Many repeated `+ Add` controls are technically usable but visually noisy.

## Main required fixes from this iPad pass

1. Make POS QR handoff deterministic on iPad and restricted browsers:
   - Always show a visible QR URL/link panel after `Open customer QR` and `Copy QR link`.
   - Keep the panel visible after any table refresh/load.
   - Add a clear success/error toast.
2. Add an empty seated-table reset/undo path:
   - For a queue/reservation-seated table with no bill, show `Release table` / `Undo seating`.
   - Require confirmation and finish/cancel the queue/reservation state appropriately.
3. Improve queue table-card accessible labels:
   - Example: `Seat QA Queue IPAD188645 at T07`.
4. Improve iPad Timetable density:
   - Larger day touch zones.
   - Focused day drawer.
   - Reduce repeated `+ Add` noise by showing add controls on selected day.
5. Continue reducing compact controls in POS/Tables/Reservations:
   - Keep touch targets closer to 44 px where possible.
   - Use clearer labels on repeated action buttons.

## Launch readiness judgement

The core staff iPad flow is operational and close to launch quality for staff-driven ordering:

- Reservation/queue handoff to table works.
- POS ordering works without page-jump.
- KDS works well.
- Terminal payment and close-table reset work.

The biggest launch blocker for self-ordering remains QR handoff reliability from staff POS on iPad/constrained browsers. Until staff can always see or copy the exact current QR session URL, customer self-ordering can still fail at the handoff step even though the downstream POS/KDS/payment flow is healthy.
