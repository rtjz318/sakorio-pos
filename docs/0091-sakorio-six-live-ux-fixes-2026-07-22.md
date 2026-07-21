# Sakorio POS six live UX fixes — 2026-07-22

This document records the fix batch requested after the focused browser QA pass. The baseline observations were taken from the live deployed Sakorio domains before coding.

## Live baseline evidence

1. Reservation phone validation UX
   - Live page: `https://order.sakorio.com/book/1?qa=baseline-phone-validation`
   - Observed: the public booking phone input had no placeholder or visible format example.
   - Risk: guests entering `80000000` see a validation failure without an obvious correction path.

2. Queue stale QA/test entry cleanup/archive
   - Live page: `https://staff.sakorio.com/queue?qa=baseline-queue-cleanup`
   - Observed: the queue hid 3 stale entries and showed “Show stale”, but had no cleanup/archive action.
   - Risk: hosts can see the stale problem but cannot resolve it from the board before service.

3. Reservation host page search/highlight
   - Live page: `https://staff.sakorio.com/reservations?qa=baseline-six-fixes`
   - Observed: search was phone-only. New or synthetic bookings were harder to locate by name, ID, or table.
   - Risk: host confidence drops after a public booking because staff cannot quickly prove the booking appeared.

4. Table assignment labels
   - Live page: `https://staff.sakorio.com/reservations?qa=baseline-assign-labels`
   - Observed: assignment entry point was generic; table picker action labels were not deterministic enough for automation/accessibility.
   - Risk: repeated “Assign” buttons are harder for staff, QA automation, and screen readers.

5. Close table / reservation finish confirmation
   - Live page: `https://staff.sakorio.com/pos?qa=baseline-close-confirm`
   - Observed: final close/reset/reservation-finish consequences were not clearly stated on the deployed POS view.
   - Risk: cashier may close a table without understanding QR reset, history movement, and linked reservation finish.

6. KDS Served completion feedback
   - Live page: `https://staff.sakorio.com/kitchen?qa=baseline-served-toast`
   - Observed: the KDS describes that served tickets leave the board, but there was no completion toast/countdown.
   - Risk: kitchen user may think a served ticket disappeared unexpectedly.

## Fixes implemented

1. Public reservation phone UX
   - Added `+65 9123 4567` placeholder.
   - Added inline helper text: “Use international format… Singapore local numbers should include +65.”
   - On invalid phone submit, the form now scrolls/focuses the phone input.

2. Queue stale cleanup/archive
   - Added a stale cleanup panel when stale active queue rows exist.
   - Added “Review stale” action.
   - Added confirmed “Archive stale entries” action that marks stale active rows as `expired`.
   - No deletion is performed.

3. Reservation search/highlight
   - Expanded host search to name, phone, email, `#ID`, table, and notes.
   - Search is now local over the loaded service date instead of phone-only API filtering.
   - New/updated/assigned reservations are highlighted and sorted to the top.

4. Assignment labels
   - Table picker actions now render labels such as `Assign T07`, `Seat at T07`, `Saving T07`, or `Assigned T07`.
   - The same label is exposed through `aria-label`.

5. Final close/finish confirmation
   - POS `Close table` now confirms final reset, QR session end, bill history movement, and linked reservation finish.
   - Close success notice now states when a linked reservation was finished.
   - Reservation `Finish after close` now asks for confirmation before moving the booking out of active service.

6. KDS served toast/countdown
   - Served / Delivered bulk action now shows a completion toast with item count.
   - Toast includes a 5-second countdown and states that the ticket leaves the live board.

## Post-deploy browser verification checklist

1. Public booking: open `/book/1`, confirm phone placeholder/helper, trigger invalid phone and confirm focus.
2. Queue: open `/queue`, confirm stale cleanup panel appears when stale active rows exist; open confirmation modal from “Archive stale”.
3. Reservations: create or locate a QA booking, search by name and `#ID`, confirm highlighted result.
4. Reservations assignment: open a 2-pax assignable booking and confirm table buttons say `Assign Txx` or `Seat at Txx`.
5. POS: after a paid QA bill, click `Close table`, confirm final browser dialog copy, then cancel once and accept once.
6. KDS: advance a QA ticket to Served / Delivered and confirm completion toast/countdown appears before the ticket leaves the board.
