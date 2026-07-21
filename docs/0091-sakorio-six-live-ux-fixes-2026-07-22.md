# Sakorio POS six live UX fixes - 2026-07-22

This document records the fix batch requested after the focused browser QA pass. The baseline observations were taken from the live deployed Sakorio domains before coding.

## Live baseline evidence

1. Reservation phone validation UX
   - Live page: `https://order.sakorio.com/book/1?qa=baseline-phone-validation`
   - Observed: the public booking phone input had no placeholder or visible format example.
   - Risk: guests entering `80000000` see a validation failure without an obvious correction path.

2. Queue stale QA/test entry cleanup/archive
   - Live page: `https://staff.sakorio.com/queue?qa=baseline-queue-cleanup`
   - Observed: the queue hid 3 stale entries and showed "Show stale", but had no cleanup/archive action.
   - Risk: hosts can see the stale problem but cannot resolve it from the board before service.

3. Reservation host page search/highlight
   - Live page: `https://staff.sakorio.com/reservations?qa=baseline-six-fixes`
   - Observed: search was phone-only. New or synthetic bookings were harder to locate by name, ID, or table.
   - Risk: host confidence drops after a public booking because staff cannot quickly prove the booking appeared.

4. Table assignment labels
   - Live page: `https://staff.sakorio.com/reservations?qa=baseline-assign-labels`
   - Observed: assignment entry point was generic; table picker action labels were not deterministic enough for automation/accessibility.
   - Risk: repeated "Assign" buttons are harder for staff, QA automation, and screen readers.

5. Close table / reservation finish confirmation
   - Live page: `https://staff.sakorio.com/pos?qa=baseline-close-confirm`
   - Observed: final close/reset/reservation-finish consequences were not clearly stated on the deployed POS view.
   - Risk: cashier may close a table without understanding QR reset, history movement, and linked reservation finish.
   - Follow-up finding: a native `window.confirm` was stronger than the old flow, but it was awkward in browser/iPad QA and not ideal for a touch-first POS. This was upgraded to an in-app confirmation dialog.

6. KDS Served completion feedback
   - Live page: `https://staff.sakorio.com/kitchen?qa=baseline-served-toast`
   - Observed: the KDS describes that served tickets leave the board, but there was no completion toast/countdown.
   - Risk: kitchen user may think a served ticket disappeared unexpectedly.

## Fixes implemented

1. Public reservation phone UX
   - Added `+65 9123 4567` placeholder.
   - Added inline helper text: "Use international format... Singapore local numbers should include +65."
   - On invalid phone submit, the form now scrolls/focuses the phone input.

2. Queue stale cleanup/archive
   - Added a stale cleanup panel when stale active queue rows exist.
   - Added "Review stale" action.
   - Added confirmed "Archive stale entries" action that marks stale active rows as `expired`.
   - No deletion is performed.

3. Reservation search/highlight
   - Expanded host search to name, phone, email, `#ID`, table, and notes.
   - Search is now local over the loaded service date instead of phone-only API filtering.
   - New/updated/assigned reservations are highlighted and sorted to the top.

4. Assignment labels
   - Table picker actions now render labels such as `Assign T07`, `Seat at T07`, `Saving T07`, or `Assigned T07`.
   - The same label is exposed through `aria-label`.

5. Final close/finish confirmation
   - POS `Close table` now opens an in-app final confirmation dialog instead of a native browser prompt.
   - The dialog confirms final reset, QR session end, bill history movement, and linked reservation finish.
   - After staff sends a table order, the POS drawer now routes to `Bill / Pay` instead of staying on `Orders`, reducing one redundant cashier step.
   - Close success notice now states when a linked reservation was finished.
   - Reservation `Finish after close` now asks for confirmation before moving the booking out of active service.

6. KDS served toast/countdown
   - Served / Delivered bulk action now shows a completion toast with item count.
   - Toast includes a 5-second countdown and states that the ticket leaves the live board.

## Live browser verification results

1. Public booking phone validation
   - Live page: `https://order.sakorio.com/book/1?qa=verify-phone-final-7f36e73`
   - Result: placeholder/helper text appeared. Submitting `80000000` kept the guest on the booking page, showed the `+65 9123 4567` example, and focused `#book-phone`.
   - Status: Passed.

2. Queue stale cleanup
   - Live page: `https://staff.sakorio.com/queue?qa=verify-final-queue-7f36e73`
   - Result: stale cleanup panel appeared with `Review stale` and `Archive stale`; archive confirmation explained rows are expired, not deleted.
   - Status: Passed.

3. Reservation search/highlight
   - Live page: `https://staff.sakorio.com/reservations?qa=verify-final-res-7f36e73`
   - Result: searching `#70` reduced the list to `1 of 3 reservations`; the selected card showed `NEW / SELECTED`.
   - Status: Passed.

4. Assignment labels
   - Live page: `https://staff.sakorio.com/reservations?qa=verify-final-res-7f36e73`
   - Result: table assignment actions exposed clear labels such as `Assign T07`, `Assign T09`, and `Assign T04`.
   - Status: Passed.

5. KDS Served completion
   - Live page: `https://staff.sakorio.com/kitchen?qa=verify-final-kds-order138`
   - Result: QA order #138 was advanced Start -> Ready -> Served; toast showed `Ticket #138 served`, item count, and `5s` countdown.
   - Status: Passed.

6. POS close table confirmation
   - Live page before modal upgrade: `https://staff.sakorio.com/pos?qa=final-t07-state&tableId=7&orderId=138`
   - Result: live browser confirmed T07 had paid QA bill #138 and a visible `Close table` action. Native confirmation was hard to operate in automated browser QA, which validated the need for an in-app POS confirmation.
   - Follow-up fix: `Close table` now opens a visible in-app dialog with `Keep table open` and `Yes, close table`.
   - Final deployed verification: on `2.1.6 a7352423`, order #139 was paid by terminal; `Close table` opened the in-app dialog with reset/QR/history copy; `Keep table open` preserved the paid table; `Yes, close table` reset T07 to `Available`.
   - Status: Passed.

7. POS send-order handoff
   - Live page: `https://staff.sakorio.com/pos?qa=verify-close-modal-a2b89082&tableId=7&orderId=138`
   - Result: T07 reset correctly from the previous QA bill. A fresh Coffee order #139 was created, but after `Send order` the drawer stayed on `Orders`; attempting to reach `Bill / Pay` was not smooth enough for cashier flow.
   - Follow-up fix: after `Send order`, the drawer now moves directly to `Bill / Pay` with copy prompting the cashier to review the bill, add another round, or collect payment.
   - Final deployed verification: `2.1.6 a7352423` was live before final POS verification. The existing #139 bill reached `Bill / Pay`, terminal payment recorded successfully, and table close/reset completed.
   - Status: Passed.

## Verification checklist for the redeployed modal commit

1. Open `https://staff.sakorio.com/pos?qa=verify-close-modal`.
2. Select a paid/closable table.
3. Click `Close table`.
4. Confirm the in-app dialog shows final reset, QR session end, bill history movement, and reservation finish copy when applicable.
5. Click `Keep table open` once and confirm the table remains paid/closable.
6. Reopen the dialog, click `Yes, close table`, and confirm the table resets to available.
