# Sakorio POS Round 3 Browser QA Results - 80 Use Case Execution

Date started: 2026-07-19
Source scenario brief: `docs/0082-sakorio-round-3-browser-qa-80-use-cases-2026-07-19.md`
Execution method: Browser-only live workflow execution through Sakorio staff/customer domains
Environment: `https://staff.sakorio.com`, `https://order.sakorio.com`, HitPay sandbox where applicable
Run prefix: `SKR-R3-20260719`

## Summary status

| Case range | Status |
|---|---|
| R3-E2E-001 to R3-E2E-025 | Executed / attempted |
| R3-E2E-026 to R3-E2E-080 | Pending execution |

## Cross-run notes

- Staff session was already authenticated in the in-app browser as an owner/admin account.
- First staff navigation briefly showed the Render wake interstitial, then the Sakorio app loaded normally.
- Browser-only testing is being used. No direct database edits or local-login shortcuts are used to verify workflow state.
- Payment actions are limited to visible staff terminal/sandbox-style confirmation or HitPay sandbox. No real card data is entered.

---

## Result - R3-E2E-001

Scenario: Reservation to seated QR order to kitchen to close table
Run ID: `SKR-R3-20260719-E001`
Browser/device: Desktop in-app browser
Roles simulated: Customer, host, waiter/cashier, kitchen
Status: `FAIL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 6/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | 7/10 |
| Layout/stability | 8/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Opened public reservation page at `https://order.sakorio.com/book/1?qa=r3-e2e001`.
2. Waited for reservation availability to finish loading.
3. Created synthetic reservation:
   - Reservation number: `#48`
   - Name: `SKR-R3-20260719 E001 Guest`
   - Date/time: `2026-07-19 16:30`
   - Party size: `2`
4. Opened staff Reservations at `https://staff.sakorio.com/reservations?qa=r3-e2e001`.
5. Found reservation `#48` in the service timeline.
6. Clicked the `Seat at table` button inside the reservation `#48` card.
7. Selected table `T07`.
8. Staff POS opened with URL containing `tableId=7&reservationId=48`.
9. Confirmed T07 showed:
   - Guest `SKR-R3-20260719 E001 Guest`
   - Status `Seated`
   - `Guests seated Â· 2`
   - No live orders yet
   - Prior orders were shown under History, separate from current orders.
10. Clicked `Open customer QR`.
11. Observed no new tab, no dialog, no clipboard value, and no visible QR/link feedback.
12. Continued staff-side ordering to complete remaining service path:
   - Added `Coffee`
   - Added `Coca Cola`
   - Bill/Pay total became `SGD 5.50`
13. Opened checkout.
14. Confirmed terminal was selected by default and clicked `Charge terminal - SGD 5.50`.
15. POS recorded bill `#67`.
16. Opened Orders and Kitchen to verify state.
17. Cleaned up table T07 using visible `Clear paid`.

### Expected result

The full reservation handoff should allow a customer QR order, kitchen ticket creation, staff bill review, payment, receipt/status confirmation, and close-table/reset. Reservation, table, order, kitchen, payment, and close-table states should agree across screens.

### Actual result

Reservation creation and seating worked. POS table-first workflow loaded correctly, and staff-side ordering/payment could create a paid bill. Kitchen received ticket `#67` as a new pending ticket.

However, the customer QR step failed because `Open customer QR` did not visibly open or expose the QR link. Also, after terminal payment, POS said bill `#67` was paid, but the Orders tab still showed `#67` under `Active Orders` / `Not Paid Yet`.

### Evidence observed

- Public booking confirmation displayed reservation `#48`.
- Staff Reservations displayed reservation `#48` and allowed seating at T07.
- POS displayed T07 as seated for the reservation guest.
- `Open customer QR` click produced no visible result, no new controlled/user tab, no browser dialog, and an empty clipboard value.
- POS payment banner showed: `Terminal payment recorded for T07. T07 is up next. T07 is ready for the next order.`
- POS table card showed: `T07 ... Ready ... Last bill #67 ... Paid`.
- Orders showed: `Active Orders 1`, `Not Paid Yet`, `T07`, `Latest #67`, `SGD 5.50`.
- Kitchen showed: `#67`, `Pending`, `T07`, guest name, `1x Coffee`, `1x Coca Cola`.
- Cleanup showed: `T07 is clear. T07 is ready for the next cashier bill. T07 is ready for the next order.`

### Defects

1. `Open customer QR` button has no visible effect or feedback from staff POS.
2. Payment status is inconsistent between POS and Orders:
   - POS: paid
   - Orders: active / not paid yet
3. Staff POS checkout allows payment while the ticket is still described as `No tickets yet` / `2 in cart`, which is confusing for dine-in kitchen workflow.
4. Table reset wording says `Clear paid` instead of the clearer restaurant action `Close table` or `Close / clear paid table`.

### Improvement notes

- `Open customer QR` should either open the QR URL in a new tab, show a modal with QR/link/copy action, or display a toast confirming the copied link.
- Orders should use the same payment truth as POS immediately after payment.
- Checkout should make it clearer whether it is submitting a kitchen ticket, taking payment, or doing both.
- Replace or augment `Clear paid` with clearer service language.

### Cleanup performed

Clicked `Clear paid` for T07 after payment confirmation so the table returned to available/ready state for future tests.

---

## Result - R3-E2E-002

Scenario: Walk-in queue to table assignment to cashier order to terminal checkout
Run ID: `SKR-R3-20260719-E002`
Browser/device: Desktop in-app browser
Roles simulated: Host, waiter/cashier
Status: `FAIL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 7/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened Queue at `https://staff.sakorio.com/queue?qa=r3-e2e002`.
2. Created synthetic walk-in:
   - Name: `SKR-R3-20260719 E002 Walkin`
   - Phone: `+6591000002`
   - Party size: `2`
   - Quoted wait: `10` minutes
   - Notes: `R3 E002 walk-in queue to table to terminal checkout.`
3. Confirmed the new entry appeared in the Waiting lane and was auto-selected.
4. Confirmed queue recommended ready tables including T07, T09, and T04.
5. Selected T09 from the table choices.
6. Confirmed staff POS opened with URL containing `tableId=9&queueEntryId=13`.
7. Added `Tecate Light`.
8. Opened checkout.
9. Confirmed terminal was selected and clicked `Charge terminal - SGD 4.00`.
10. Confirmed POS created bill `#68`.
11. Reopened Queue to verify the walk-in status.
12. Reopened Orders to verify bill state.
13. Cleaned up table T09 using `Clear paid`.

### Expected result

The queue entry should move from Waiting to Seated, the assigned table should become active/occupied, cashier should be able to add items and take terminal payment, and the paid order should move out of current unpaid orders after settlement/close.

### Actual result

Queue creation, seat assignment, POS handoff, item add, and terminal payment all worked. Queue correctly moved `SKR-R3-20260719 E002 Walkin` into the Seated lane on T09.

However, after terminal payment, Orders again showed the new paid bill as `Active Orders` / `Not Paid Yet`.

### Evidence observed

- Queue showed `4 waiting` after adding the test walk-in.
- Selected guest panel showed `SKR-R3-20260719 E002 Walkin`, `2 pax`, `waiting`, `QUOTE 10 min`, phone `+6591000002`.
- POS handoff banner showed: `T09 opened from queue handoff for SKR-R3-20260719 E002 Walkin.`
- POS payment banner showed: `Terminal payment recorded for T09. T09 is up next. T09 is ready for the next order.`
- POS table card showed: `T09 ... Ready ... Last bill #68 ... Paid`.
- Queue verification showed the synthetic entry under `Seated` with `On T09`.
- Orders verification showed: `Active Orders 1`, `Not Paid Yet`, `T09`, `Latest #68`, `SGD 4.00`.
- Cleanup showed: `T09 is clear. T09 is ready for the next cashier bill. T09 is ready for the next order.`

### Defects

1. Repeat payment/status mismatch:
   - POS says bill `#68` is paid.
   - Orders says bill `#68` is active / not paid yet.
2. POS table card after queue seating showed `Occupied` instead of the walk-in guest name, even though the handoff banner had the guest name.
3. Checkout again showed `No tickets yet` / `1 in cart` at payment stage, which is confusing for dine-in operations.
4. Stale queue records from prior QA remain prominent and can distract host testing. This is not necessarily a bug, but the default queue view may need stronger cleanup/history separation.

### Improvement notes

- Fix Orders payment-status mapping before launch. This is now observed in both reservation-origin and queue-origin POS payments.
- Preserve/display queue guest context on the POS table card and service drawer.
- Consider clearer kitchen/payment separation: `Send order`, `Send & Pay`, or `Pay now` depending on intended workflow.
- Queue board is strong overall: recommendations and table-fit explanations are useful.

### Cleanup performed

Clicked `Clear paid` for T09 after payment confirmation so the table returned to ready state for future tests.

---

## Result - R3-E2E-003

Scenario: POS table-first flow mirrors Tables workflow with checkout added
Run ID: `SKR-R3-20260719-E003`
Browser/device: Desktop in-app browser
Roles simulated: Waiter/cashier
Status: `NEEDS SPECIFICATION`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 8/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 7/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened POS without a table ID at `https://staff.sakorio.com/pos?qa=r3-e2e003`.
2. Confirmed the page opened to a table-first grid, not a giant menu/cart-first view.
3. Selected table `T08`.
4. Confirmed the table service drawer opened with menu categories, bill/pay lane, current orders, and history.
5. Added `Coca Cola` to T08.
6. Confirmed bill/pay total became `SGD 3.00`.
7. Clicked `Back / switch table`.
8. Observed the drawer did not close or return to table selection because there was an active unsent cart.
9. Completed terminal checkout to clean up the test cart.
10. POS created bill `#69`.
11. Cleared paid table T08.

### Expected result

POS should start with table selection. Once a table is selected, the waiter should be able to add items, checkout, or easily return to the table grid. If unsent cart protection exists, the system should offer clear choices such as `Continue editing`, `Discard cart`, or `Checkout`.

### Actual result

The table-first POS redesign is much improved. POS starts at the table grid and selecting a table opens a focused table service drawer with compact menu items and payment available.

However, after adding an item, `Back / switch table` did not switch tables. Instead it kept the table drawer open and showed the message `Finish or clear T08's current ticket before returning to the floor.` This protection is understandable, but the UI did not provide an obvious `Clear cart` / `Discard ticket` button.

### Evidence observed

- POS no-table state showed only the floor table grid and table cards.
- Selecting T08 changed URL to include `tableId=8`.
- Service drawer showed `T08`, `Ready for a new order`, `Add items`, `Bill / Pay`, `Orders`, `History`, and product grid.
- After adding Coca Cola, service loop showed `T08 Â· 1 item Â· SGD 3.00`, `1 in cart`.
- `Back / switch table` showed warning text instead of returning to the grid.
- Cleanup payment created bill `#69`, then `Clear paid` returned T08 to ready state.

### Defects

No hard functional failure in the table-first POS shell.

### Improvement notes

- Add a clear unsent-cart decision modal when leaving a table:
  - `Stay on table`
  - `Discard cart`
  - `Checkout now`
- If the current behavior is intended, rename `Back / switch table` while cart is dirty to something like `Finish or discard ticket`.
- Keep table-first design. It is much closer to the desired Tables workflow.
- The repeated checkout wording issue remains: `No tickets yet` / `in cart` appears at payment stage.

### Cleanup performed

Completed terminal checkout for bill `#69` and clicked `Clear paid` for T08.

---

## Result - R3-E2E-004

Scenario: Add second order to same active table without moving first order to history
Run ID: `SKR-R3-20260719-E004`
Browser/device: Desktop in-app browser
Roles simulated: Customer, waiter/cashier
Status: `BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 5/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Attempted to use an existing customer QR tab at `order.sakorio.com/menu/c2e9b521...`.
2. Observed the QR page showed `Table Closed` for `T04`.
3. Attempted to use another existing customer QR tab at `order.sakorio.com/menu/3b89cb81...`.
4. Observed the QR page showed `Table Closed` for `T07`.
5. Cross-referenced R3-E2E-001, where staff POS `Open customer QR` produced no visible QR URL, tab, dialog, or clipboard value.

### Expected result

Tester should be able to open an active table QR session, submit one order, submit a second order for the same table/session, and confirm both remain under current orders until table close.

### Actual result

The scenario could not be executed because no active customer QR session was available, and staff POS did not provide a working visible path to open the current table QR.

### Evidence observed

- Existing QR for T04 showed: `Table Closed - This table is not currently accepting orders.`
- Existing QR for T07 showed: `Table Closed - This table is not currently accepting orders.`
- R3-E2E-001 already showed staff POS `Open customer QR` had no visible effect.

### Defects

1. Active customer QR access is currently not discoverable/recoverable from staff POS.
2. Without a working active QR handoff, customer multi-order regression cannot be completed in browser.

### Improvement notes

- Fix `Open customer QR` first. This will unblock R3-E2E-004, R3-E2E-006, R3-E2E-007, and multiple customer QR discovery cases.
- Staff should have a table QR modal showing:
  - QR code
  - direct URL
  - copy link
  - token/session status
  - clear closed-session warning

### Cleanup performed

No new data was created for this case.

---

## Result - R3-E2E-005

Scenario: Close table button is visible and closes only after bill is settled
Run ID: `SKR-R3-20260719-E005`
Browser/device: Desktop in-app browser
Roles simulated: Waiter/cashier
Status: `NEEDS SPECIFICATION`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 8/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened POS at `https://staff.sakorio.com/pos?qa=r3-e2e005`.
2. Selected available table `T07`.
3. Confirmed no `Close table` or `Clear paid` action was visible before adding/payment.
4. Added `Coffee` to the table cart.
5. Confirmed bill/pay total became `SGD 2.50`.
6. Checked visible close/reset controls while unpaid:
   - Drawer close `x`
   - `Back / switch table`
   - `Checkout`
   - Cart `Clear`
7. Completed terminal checkout with `Charge terminal - SGD 2.50`.
8. POS created bill `#70`.
9. Confirmed T07 showed `Ready`, `Last bill #70`, `Paid`, and `Clear paid`.
10. Clicked `Clear paid`.
11. Confirmed T07 returned to `Available` / `Ready for order`.

### Expected result

Unpaid close should be blocked or require manager authorization. After payment, staff should have an obvious table-close/reset action that releases the table and moves the session to history.

### Actual result

The system safely avoids an unpaid table-close action. Before payment, the only destructive cart action visible is `Clear`, which appears to clear the current unsent cart. After payment, `Clear paid` works as the table reset action and returns the table to available.

The main issue is terminology and discoverability. The restaurant workflow language requested by the owner is `Close table`; the UI currently says `Clear paid`.

### Evidence observed

- Unpaid T07 with Coffee showed `T07 Â· 1 item Â· SGD 2.50`, `1 in cart`, `Checkout`.
- Close-like controls while unpaid were drawer `x`, `Back / switch table`, cart `Clear`, and `Checkout`; no `Close table`.
- After terminal payment, POS showed `Card terminal payment recorded for T07`.
- T07 card showed `Ready`, `Last bill #70`, `Paid`, `Clear paid`.
- After reset, banner showed `T07 is clear. T07 is ready for the next cashier bill. T07 is ready for the next order.`

### Defects

No hard safety defect observed for unpaid close; the system does not expose an obvious unpaid close.

### Improvement notes

- Rename or augment `Clear paid` to `Close table / clear paid bill`.
- Add a clear table lifecycle panel:
  - `Current order`
  - `Payment status`
  - `Close table`
  - `History`
- Keep `Clear` for unsent cart, but make it visually distinct from closing a table.

### Cleanup performed

Completed terminal checkout for bill `#70` and clicked `Clear paid` for T07.

---

## Result - R3-E2E-006

Scenario: Customer QR shows only current session bill and orders
Run ID: `SKR-R3-20260719-E006`
Browser/device: Desktop in-app browser
Roles simulated: Customer
Status: `BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 6/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Opened existing customer QR tab for T04.
2. Observed page state.
3. Opened existing customer QR tab for T07.
4. Observed page state.
5. Cross-checked R3-E2E-001 where staff POS could not expose a new active QR link.

### Expected result

An active QR session should show only the current table session and total bill. Previous sessions should not be visible. Closed/expired sessions should not expose prior guest order history.

### Actual result

Both available QR tabs showed closed-session messaging and did not expose order history:

- T04: `Table Closed - This table is not currently accepting orders.`
- T07: `Table Closed - This table is not currently accepting orders.`

This is good for closed-session privacy, but the active-session portion could not be executed because no active QR URL was available through staff POS.

### Evidence observed

- T04 QR page had no menu buttons, payment buttons, or order history.
- T07 QR page had no menu buttons, payment buttons, or order history.
- Staff POS `Open customer QR` still has no visible successful output from R3-E2E-001.

### Defects

1. Active QR session testing is blocked by missing/broken staff QR handoff.

### Improvement notes

- Treat the closed-session privacy behavior as a partial positive.
- Fix QR handoff before final privacy scoring. The real launch risk is active table session isolation, not only closed-session blocking.

### Cleanup performed

No data created.

---

## Result - R3-E2E-010

Scenario: Terminal checkout label and fallback behavior are clear
Run ID: `SKR-R3-20260719-E010`
Browser/device: Desktop in-app browser
Roles simulated: Waiter/cashier
Status: `NEEDS SPECIFICATION`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 8/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened POS at `https://staff.sakorio.com/pos?qa=r3-e2e010`.
2. Selected table `T08`.
3. Added `Coffee` to the cart.
4. Opened checkout.
5. Confirmed terminal payment was selected by default.
6. Confirmed terminal payment copy was visible:
   - `TERMINAL`
   - `Use terminal`
   - `Machine confirmed`
   - `Selected method Terminal`
   - `Collect SGD 2.50 and close the bill.`
7. Used `Add items` to leave payment review without charging.
8. Confirmed the cart was still intact.
9. Used cart `Clear` to remove the unsent item.
10. Confirmed T08 returned to `SGD 0.00`.

### Expected result

Terminal flow should clearly explain what staff should do, allow staff to back out before charging, and avoid recording payment unless the final charge button is clicked.

### Actual result

Terminal wording is understandable and the selected method is clear. Staff can back out by clicking `Add items`, and the cart remains available. No payment was recorded because the final charge button was not clicked.

The remaining UX gap is that there is no explicit `Cancel payment` / `Back to cart` button in the payment lane. `Add items` works, but it is indirect.

### Evidence observed

- Checkout showed `Selected method Terminal`.
- Checkout showed `Charge terminal - SGD 2.50`.
- After clicking `Add items`, the cart still showed `T08 Â· 1 item Â· SGD 2.50`.
- After clicking cart `Clear`, the cart showed `Ready for items`, `SGD 0.00`, and `0 items`.

### Defects

No hard functional failure observed.

### Improvement notes

- Add an explicit `Back to cart` or `Cancel payment` control in the payment panel.
- Keep the current terminal copy; it is clear enough for staff.
- Consider replacing `Collect SGD ... and close the bill` with `Confirm terminal collected SGD ...` so staff understand they must only click after the physical terminal succeeds.

### Cleanup performed

Cleared the unsent T08 cart. No order or payment was created for this case.

---

## Result - R3-E2E-011

Scenario: Move active bill from one table to another
Run ID: `SKR-R3-20260719-E011`
Browser/device: Desktop in-app browser
Roles simulated: Host, waiter/cashier
Status: `FAIL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 4/10 |
| UI/UX clarity | 5/10 |
| Workflow speed | 5/10 |
| Layout/stability | 7/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Logged back into staff app after the browser session expired.
2. Opened Queue and created synthetic walk-in:
   - Name: `SKR-R3-20260719 E011 MoveSource`
   - Phone: `+6591000011`
   - Party size: `2`
   - Quoted wait: `5` minutes
3. Seated the guest at T07 from the Queue recommended table choices.
4. Confirmed POS opened with `tableId=7&queueEntryId=14`.
5. Confirmed T07 was occupied in POS.
6. Looked for a `Move table` action in POS table drawer.
7. Opened Tables at `https://staff.sakorio.com/tables?qa=r3-e2e011`.
8. Confirmed T07 appeared as `SEATED - START ORDER`.
9. Looked for a visible `Move table` action in the T07 table card.
10. Attempted to open the T07 `More` action, but the actual menu button was not visibly interactable to browser automation.
11. Cleaned up by clicking `Close table` for T07 and confirming the close modal.

### Expected result

The waiter/host should be able to move the active table/session from T07 to an available destination table. Source table should become available; destination should carry the active session/orders.

### Actual result

The move-table workflow was not discoverable. POS did not show a visible `Move table` action. Tables showed `Close table`, but not `Move table`. The table card had a `More` label, but the underlying `Open menu` control was hidden/icon-like and failed as non-visible in browser interaction.

### Evidence observed

- T07 POS card showed `Occupied` after queue handoff.
- POS table drawer showed `Open customer QR`, `Back / switch table`, `Current orders`, `Add items`, `Bill / Pay`, `Orders`, and `History`; no `Move table`.
- Tables T07 card showed `Orders`, `Start order`, `Close table`, `More`, and `waiter / QR`; no visible `Move table`.
- Attempt to click scoped `Open menu` inside T07 card failed because the element was not visible.
- `Close table` opened a clear confirmation modal: `Close table "T07"? This will end the current session.`

### Defects

1. Move-table workflow is not visible/discoverable in POS or Tables.
2. T07 queue guest name did not persist visibly on the POS/Tables table card; it showed generic `Occupied`.
3. The `More` action has weak accessibility/automation visibility. If important actions are inside it, they are too hidden for launch-critical operations.

### Improvement notes

- Add first-class `Move table` button to the active table drawer and/or Tables card.
- If `Move table` remains under `More`, make the More button visibly labelled and accessible.
- Preserve queue/reservation guest context on the table card.
- Keep the Tables `Close table` modal; it is clearer than POS `Clear paid`.

### Cleanup performed

Closed synthetic T07 table session through Tables `Close table` confirmation.

---

## Result - R3-E2E-012

Scenario: Attempt to move active bill to occupied table
Run ID: `SKR-R3-20260719-E012`
Browser/device: Desktop in-app browser
Roles simulated: Host, waiter
Status: `BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 5/10 |
| Workflow speed | N/A |
| Layout/stability | 7/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Used the same POS/Tables inspection from R3-E2E-011.
2. Confirmed there were occupied/seated tables available in the floor state, including T06 and T10.
3. Attempted to locate a move-table action from an active/seated table.

### Expected result

System should allow starting a move action and then clearly block or warn when selecting an occupied destination table.

### Actual result

The occupied-destination guardrail could not be tested because the move-table action itself was not discoverable or accessible.

### Evidence observed

- T06 and T10 were already seated/occupied.
- T07 was synthetically seated during R3-E2E-011.
- No visible `Move table` action appeared in POS or Tables.

### Defects

1. Move-table action missing/hidden blocks occupied-destination guardrail testing.

### Improvement notes

- After implementing visible `Move table`, rerun this case specifically to verify occupied destination is blocked.
- Destination picker should label tables as `Available`, `Occupied`, `Paid`, or `Unavailable` and prevent unsafe overwrite.

### Cleanup performed

No additional data created beyond R3-E2E-011 cleanup.

---

## Result - R3-E2E-013

Scenario: Queue board sort and search remains usable during service
Run ID: `SKR-R3-20260719-E013`
Browser/device: Desktop in-app browser
Roles simulated: Host
Status: `FAIL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 7/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 7/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened Queue at `https://staff.sakorio.com/queue?qa=r3-e2e013`.
2. Created three synthetic queue entries:
   - `SKR-R3-20260719 E013 Alpha`, 2 pax, 6 min quote
   - `SKR-R3-20260719 E013 Bravo`, 3 pax, 12 min quote
   - `SKR-R3-20260719 E013 Charlie`, 4 pax, 18 min quote
3. Confirmed all three appeared in the Waiting lane.
4. Used the queue search field with `E013 Bravo`.
5. Cleared search.
6. Seated `E013 Charlie` at recommended table T04.
7. Returned to Queue and confirmed Charlie moved to Seated.
8. Selected `E013 Bravo` and clicked `Cancel`.
9. Cleaned up by cancelling remaining `E013 Alpha`.
10. Closed synthetic T04 table from Tables.

### Expected result

Queue should support easy sorting/filtering/searching. Search should narrow the visible board to matching entries. Seat and cancel actions should update queue lanes and table state.

### Actual result

Queue creation, seating, cancellation, and table handoff worked. Table fit recommendations were useful. However, the search field did not filter the visible queue list: searching `E013 Bravo` still left `E013 Alpha` and `E013 Charlie` visible.

### Evidence observed

- After creating entries, Queue showed `6 active`, `6 visible`, `6 loaded`, and all three synthetic entries.
- Searching `E013 Bravo` still showed Alpha, Bravo, and Charlie.
- Charlie handoff opened POS with `tableId=4&queueEntryId=17`.
- Queue later showed Charlie under `Seated` with `On T04`.
- Bravo selected panel showed `cancelled` after clicking Cancel.
- T04 was successfully closed from Tables cleanup.

### Defects

1. Queue search field does not visibly filter the queue board.
2. Queue defaults still show old stale R2 entries at the top, making live service testing harder.
3. Queue cancellation leaves cancelled entry visible in selected panel, which is fine for confirmation, but needs clearer visual separation from active waiting entries.

### Improvement notes

- Fix search filtering so only matching queue cards remain visible.
- Add a quick `Hide stale/old QA entries` or stronger default of active/current service only.
- Keep table recommendation copy; it is genuinely useful.

### Cleanup performed

Cancelled remaining synthetic queue entry and closed T04 synthetic seating session.

---

## Result - R3-E2E-014

Scenario: Reservation double-submit does not create duplicate booking
Run ID: `SKR-R3-20260719-E014`
Browser/device: Desktop in-app browser
Roles simulated: Customer, host
Status: `PASS`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 9/10 |
| UI/UX clarity | 8/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 9/10 |

### Steps actually performed

1. Opened public booking page at `https://order.sakorio.com/book/1?qa=r3-e2e014`.
2. Today had no selectable upcoming slot late in the service day, so selected tomorrow, Monday July 20, 2026.
3. Selected `09:00`.
4. Entered synthetic guest details:
   - Name: `SKR-R3-20260719 E014 DoubleSubmit`
   - Phone: `+6591000014`
   - Email: `ralf.roeber+skr-r3-e014@sakario.sg`
5. Double-clicked `Book table`.
6. Public confirmation displayed reservation `#49`.
7. Opened staff Reservations.
8. Used the service-date next control to view Monday, July 20.
9. Verified staff Reservations showed exactly one matching booking.
10. Cancelled reservation `#49` for cleanup.

### Expected result

Double-clicking the public booking confirmation action should create only one reservation or block the duplicate attempt clearly.

### Actual result

Only one reservation was created and visible in staff Reservations. Duplicate prevention appears to work for this flow.

### Evidence observed

- Public confirmation showed `Reservation number: #49`.
- Staff Reservations for Monday, July 20 showed `1 reservations`.
- Matching name appeared exactly once.
- After cleanup, `#49` showed `CANCELLED`.

### Defects

No duplicate creation defect observed.

### Improvement notes

- Date navigation buttons in staff Reservations have weak accessible names; the next-day button had to be selected as `button.date-step` rather than by a clear label.
- Public booking correctly disabled todayâ€™s time slot dropdown when no upcoming slots were available; that behavior is sensible.

### Cleanup performed

Cancelled reservation `#49`.

---

## Result - R3-E2E-008

Scenario: Staff POS HitPay checkout returns to the correct order/table state
Run ID: `SKR-R3-20260719-E008`
Browser/device: Desktop in-app browser
Roles simulated: Waiter/cashier
Status: `FAIL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 5/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | 7/10 |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Opened POS at `https://staff.sakorio.com/pos?qa=r3-e2e008`.
2. Selected table `T08`.
3. Added `Coffee` to the cart.
4. Opened checkout.
5. Inspected available staff POS payment methods.
6. Switched back to `Add items`.
7. Used cart `Clear` to remove the unsent item and avoid creating a paid ticket.

### Expected result

If staff POS HitPay is supported, checkout should show HitPay as a payment option, complete the HitPay sandbox flow, return to POS, and keep table/order/payment state correct.

### Actual result

Staff POS checkout did not show HitPay. It showed only:

- `STAFF CASH - Cash (staff) - Internal counter settlement`
- `TERMINAL - Use terminal - Machine confirmed`

Because HitPay was not available in the staff POS checkout UI, the HitPay return workflow could not be executed from staff POS.

### Evidence observed

- Checkout displayed `Amount due SGD 2.50`.
- Checkout displayed `STAFF CASH` and `TERMINAL`.
- No `HitPay`, `Online`, `QR payment`, or equivalent option was visible.
- Cart was cleared afterward and T08 returned to `SGD 0.00`.

### Defects

1. Staff POS HitPay checkout is not available in the visible payment method list.

### Improvement notes

- Decide whether HitPay should be available from staff POS, customer QR only, or both.
- If staff POS should support HitPay, add a visible `HitPay` payment card next to Terminal and route through sandbox checkout.
- If staff POS intentionally excludes HitPay, update the scenario/spec and label the owner-facing payment policy clearly.

### Cleanup performed

Cleared the unsent T08 cart. No order or payment was created for this case.

---

## Result - R3-E2E-015

Scenario: Reservation edit retains linked table/session state
Run ID: `SKR-R3-20260719-E015`
Browser/device: Desktop in-app browser
Roles simulated: Host
Status: `FAIL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 4/10 |
| UI/UX clarity | 3/10 |
| Workflow speed | 3/10 |
| Layout/stability | 3/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Opened staff Reservations at `https://staff.sakorio.com/reservations?qa=r3-e2e015b`.
2. Clicked `New reservation`.
3. Inspected the create-reservation form in the browser.
4. Scrolled within the form area and attempted to enter a future reservation.
5. Filled visible customer fields:
   - Name: `SKR-R3-20260719 E015 EditBase`
   - Phone: `+6591000015`
   - Email: `ralf.roeber+skr-r3-e015@sakario.sg`
   - Client notes: `R3 E015 edit flow base notes`
6. Attempted to fill date and time fields.
7. Clicked `Save`.

### Expected result

Host should be able to create a future reservation, edit name/time/party/notes, assign or change a table if supported, and seat the guest without creating duplicate reservations or losing the linked table/session state.

### Actual result

The normal browser workflow could not complete reservation creation. Customer fields were fillable after scrolling, but date/time controls were not reliably usable. The form stayed open after save and no new reservation was created for the synthetic E015 guest.

### Evidence observed

- In the open `New reservation` form, `gridDate` rendered at approximately `26px` wide and below the visible viewport.
- `gridTime` also rendered at approximately `26px` wide and remained empty/unreachable.
- The main calendar day buttons for July 20 and later were disabled as `Outside opening hours` in the staff modal, while the previous public reservation test was able to book July 20 at `09:00`.
- Browser fill attempts for `input[name="gridDate"]` and `input[name="gridTime"]` timed out.
- Clicking `Save` left the modal open and the reservations list unchanged.

### Defects

1. Staff `New reservation` modal has a layout/container issue: critical date/time controls render tiny and below the practical viewport.
2. Staff reservation creation cannot be completed reliably through the live browser path.
3. Public/staff availability behavior appears inconsistent: public booking allowed July 20 `09:00`, while the staff modal marked July 20 as outside opening hours.
4. The scenario could not proceed to edit/seat validation because creation failed.

### Improvement notes

- Rebuild the staff reservation modal as a fixed-height, scrollable panel with sticky action buttons.
- Ensure date/time controls have normal width, clear labels, and keyboard/focus support.
- Align public booking and staff booking availability calculations.
- Add an explicit validation message when date/time is missing instead of silently remaining on the form.

### Cleanup performed

No E015 reservation was created. No table was seated for this case.

---

## Result - R3-E2E-009

Scenario: Customer QR HitPay checkout completes without duplicate orders
Run ID: `SKR-R3-20260719-E009`
Browser/device: Desktop in-app browser
Roles simulated: Customer, cashier
Status: `BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 5/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Attempted to use existing customer QR tabs.
2. Confirmed both QR pages were closed sessions.
3. Cross-checked R3-E2E-001 where staff POS `Open customer QR` produced no usable active QR handoff.

### Expected result

Customer should submit an order through QR, proceed to HitPay sandbox, complete payment, return to the QR/order app, and staff should see exactly one order/payment linked to the table.

### Actual result

Could not reach customer QR ordering or customer QR HitPay payment because active QR session access was unavailable.

### Evidence observed

- Existing customer QR links showed `Table Closed`.
- Staff POS did not expose a working active QR link.

### Defects

1. Customer QR HitPay cannot be retested until active QR handoff is fixed.

### Improvement notes

- This is a launch-critical blocker for QR self-order/payment confidence.
- Retest immediately after the QR handoff defect is fixed.

### Cleanup performed

No data created.

---

## Result - R3-E2E-016

Scenario: Orders overview is table-based and compact
Run ID: `SKR-R3-20260719-E016`
Browser/device: Desktop in-app browser
Roles simulated: Cashier, manager
Status: `PASS WITH POLISH NOTES`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 9/10 |
| UI/UX clarity | 8/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 8/10 |

### Steps actually performed

1. Opened Orders at `https://staff.sakorio.com/staff/orders?qa=r3-e2e016`.
2. Checked `Active Orders`, `Not Paid Yet`, and `Order History`.
3. Created a synthetic mixed table ticket from Tables/POS:
   - T01 / bill `#71`
   - `1x Coffee`
   - `1x Tacos de Carne Asada`
   - Total `SGD 14.50`
4. Reopened Orders and verified the active overview.
5. Expanded the table card using `View tickets`.
6. Compared the active order card against the live bill amount.

### Expected result

Orders should show a compact table-based overview by default for current service. One table should not consume most of the page until expanded. History should be separate.

### Actual result

Active Orders showed a compact table-grouped card for T01 with latest ticket, total, and quick actions. Expanding with `View tickets` revealed the item-level ticket details. This is a strong improvement over the previous wide/order-row-heavy flow.

### Evidence observed

- Active Orders showed `T01`, `1 active ticket`, `SGD 14.50`, `Latest #71`, `Open table POS`, and `View tickets`.
- Expanded view showed ticket `#71`, `Coffee`, `Tacos de Carne Asada`, statuses, and total.
- History remained separate under `Order History`.

### Defects

No functional defect observed in the active table-based overview.

### Improvement notes

- Add search/filter by table number in Orders for busy service.
- Keep `View tickets` collapsed by default; this is the right direction.
- History is still a long row table and would benefit from optional grouping by table/session/day.

### Cleanup performed

T01 bill `#71` was paid by terminal and cleared after related station/served-state tests.

---

## Result - R3-E2E-017

Scenario: Current Orders versus History separation
Run ID: `SKR-R3-20260719-E017`
Browser/device: Desktop in-app browser
Roles simulated: Cashier
Status: `PASS WITH POLISH NOTES`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 9/10 |
| UI/UX clarity | 8/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 8/10 |

### Steps actually performed

1. Created active bill `#71` on T01 through the Tables order workflow.
2. Confirmed Orders showed `Active Orders 1`.
3. Paid T01 by terminal from POS.
4. Clicked `Clear paid` for T01.
5. Reopened Orders.
6. Checked `Active Orders`, `Not Paid Yet`, and `Order History`.

### Expected result

Current Orders should show only active/current-session orders. Closed/paid sessions should move to History only after the table is settled/cleared.

### Actual result

The active/current separation worked for the tested flow. After payment and clearing, Active Orders showed no orders, Not Paid Yet showed all paid, and History showed the paid synthetic orders.

### Evidence observed

- Before settlement: Active Orders displayed T01 with `1 active ticket`.
- After terminal payment and `Clear paid`: POS showed `T01 is clear` and `OPEN BILLS 0` after T03 cleanup.
- Orders after cleanup showed `No orders yet` in Active Orders.
- Order History showed `#72 T03 Paid` and `#71 T01 Paid` at the top.

### Defects

No current/history lifecycle defect observed for this specific browser flow.

### Improvement notes

- History table should replace the temporary `Loading...` text once loaded; it currently remains visible above the loaded rows.
- Add a clearer â€œHistoryâ€ entry from each table card so staff can review closed sessions without going through global Orders.

### Cleanup performed

T01 bill `#71` and T03 bill `#72` were paid by terminal and cleared.

---

## Result - R3-E2E-018

Scenario: Kitchen station item chips improve clarity under mixed order
Run ID: `SKR-R3-20260719-E018`
Browser/device: Desktop in-app browser
Roles simulated: Kitchen, beverage staff, waiter
Status: `FAIL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 5/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | 7/10 |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Reused synthetic mixed ticket `#71` on T01:
   - Beverage: `Coffee`
   - Food: `Tacos de Carne Asada`
2. Opened Kitchen & Beverages at `https://staff.sakorio.com/kitchen?qa=r3-e2e018`.
3. Checked `All`, `Kitchen`, and `Beverages` station filters.
4. Moved `Tacos de Carne Asada` from `Pending` to `Preparing` to `Ready`.
5. Verified the unrelated beverage item stayed separate.

### Expected result

Mixed food/beverage tickets should route clearly by station. Updating one station item should not overwrite or hide the unrelated station item.

### Actual result

Station filtering initially worked, but the lifecycle did not persist correctly after route reload/cleanup. Kitchen-only showed only the food item from #71 and Beverages-only showed the beverage item, but after later payment/clear and Kitchen reload, #71 reappeared in production as Pending even though the bill had been settled/cleared.

### Evidence observed

- `Kitchen 1` showed `#71 T01 1x Tacos de Carne Asada Pending`.
- `Beverages 2` showed `#71 T01 1x Coffee Pending` plus one old stale beverage ticket.
- After status update, #71 showed `Coffee Pending` and `Tacos de Carne Asada Ready`.
- After returning later to Kitchen, #71 reappeared as `Pending` in both Kitchen/Beverages production despite T01 being paid and cleared.

### Defects

1. Backlog warning/count is still noisy during normal live service.
2. Ready item counts/lanes were not always intuitive: after moving one item ready, the ticket still appeared in the Send to Prep lane because another item remained pending.
3. Status action menus can conflict with similarly named summary controls (`Ready pass` versus dropdown `Ready`) for automation and accessibility.
4. Kitchen item status/order lifecycle appears not to persist reliably across reload or paid/cleared table lifecycle.

### Improvement notes

- Keep the station filter behavior; it is useful.
- Add clearer item-level station chips, e.g. `Kitchen Â· Ready`, `Beverage Â· Pending`.
- Show a per-ticket mixed-state summary such as `1 pending drink Â· 1 ready kitchen item`.

### Cleanup performed

T01 bill `#71` was later paid by terminal and cleared.

---

## Result - R3-E2E-019

Scenario: Beverage-only order routes without kitchen noise
Run ID: `SKR-R3-20260719-E019`
Browser/device: Desktop in-app browser
Roles simulated: Waiter, beverage staff
Status: `FAIL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 5/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Created a synthetic beverage-only order from Tables:
   - T03 / bill `#72`
   - `1x Coca Cola`
   - Total `SGD 3.00`
2. Opened Kitchen & Beverages.
3. Checked `Beverages`, `Kitchen`, and `All`.
4. Moved Coca Cola from `Pending` to `Preparing` to `Ready` to `Delivered`.
5. Paid and cleared T03 from POS.

### Expected result

Beverage-only orders should appear in the beverage workflow and should not clutter Kitchen-only unless the system is configured to show all.

### Actual result

Beverage-only routing initially worked, but lifecycle persistence failed after reload. T03/#72 appeared in Beverages and All, Kitchen-only initially showed no active tickets, and the item could be moved to Delivered. However, after later reload, #72 reappeared in Beverages as Pending even after being delivered, paid, and cleared.

### Evidence observed

- Beverages-only showed `#72 Pending T03 1x Coca Cola Pending`.
- Kitchen-only showed `No active orders` and `Kitchen 0`.
- Moving Coca Cola to Ready placed #72 in the `Hand off / Ready pass` lane.
- Moving Coca Cola to Delivered removed #72 from the beverage live lane.
- After route reload, Beverages-only again showed `#72 Pending T03 1x Coca Cola Pending`.

### Defects

1. Beverage item status did not persist reliably after route reload.
2. Paid/cleared beverage-only bill reappeared in live beverage production.

### Improvement notes

- Routing itself is good, but lifecycle persistence must be fixed before launch.
- Backlog warning remains visually prominent even when the active workflow is correct; consider collapsing it after acknowledgement.
- The final station action says `Delivered`; waiter-facing language may be clearer as `Served` depending on restaurant operations.

### Cleanup performed

T03 bill `#72` was paid by terminal and cleared.

---

## Result - R3-E2E-020

Scenario: Mark item served updates waiter/order view clearly
Run ID: `SKR-R3-20260719-E020`
Browser/device: Desktop in-app browser
Roles simulated: Kitchen, waiter
Status: `FAIL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 5/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 7/10 |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Used T01 bill `#71` with `Coffee` and `Tacos de Carne Asada`.
2. In Kitchen & Beverages, moved `Tacos de Carne Asada` to `Ready`.
3. Opened Orders.
4. Expanded T01 using `View tickets`.
5. Confirmed item statuses were visible in the waiter/order view.
6. Clicked the Ready item status and moved it to `Delivered`.
7. Verified the table bill stayed active and payable.

### Expected result

Served state should be visible to waiter/cashier and should not remove unpaid items from the bill.

### Actual result

The item-level served/delivered state worked in the immediate Orders view, but did not remain reliable after Kitchen reload and table settlement. Orders showed `Tacos de Carne Asada Ready`, then `Delivered`, while the T01 bill remained visible at `SGD 14.50` until payment. Later, Kitchen showed the same T01 food item as Pending again after T01 was paid and cleared.

### Evidence observed

- Orders expanded ticket showed:
  - `Coffee SGD 2.50 Pending`
  - `Tacos de Carne Asada SGD 12.00 Ready`
- Clicking Ready opened actions: `GO BACK Preparing` and `MOVE FORWARD Delivered`.
- After moving forward, Orders showed `Tacos de Carne Asada Delivered`.
- Ticket summary changed to `Partially Delivered`.
- The bill still showed `Total: SGD 14.50`.
- After later Kitchen reload, `#71 T01 1x Tacos de Carne Asada Pending` reappeared in Kitchen-only view despite the prior Ready/Delivered progression and bill cleanup.

### Defects

1. Waiter-facing status language says `Delivered`, not `Served`. For restaurant floor staff, `Served` may be more intuitive.
2. The ticket-level status showed `Preparing`/`Partially Delivered`, which is accurate but could be clearer when only some items are delivered.
3. Action menu discoverability relies on clicking the small status badge; this may be missed on iPad during rush service.
4. Served/delivered item state does not appear to persist reliably into Kitchen after reload.
5. Paid/cleared table items can remain or reappear in production display, which is launch-critical.

### Improvement notes

- Add a prominent `Mark served` action for ready items in the waiter/order view.
- Keep item-level statuses visible; this is valuable.
- Add a small ticket progress label such as `1/2 served`.

### Cleanup performed

T01 bill `#71` was paid by terminal and cleared.

---

## Result - R3-E2E-007

Scenario: Customer QR payment offers HitPay/terminal only, not Cash
Run ID: `SKR-R3-20260719-E007`
Browser/device: Desktop in-app browser
Roles simulated: Customer
Status: `BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 6/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Reused the two available customer QR tabs.
2. Checked whether either QR page had an active payable bill.
3. Confirmed both QR pages were closed sessions.

### Expected result

On an active customer QR bill, payment choices should exclude Cash and allow only HitPay/terminal policy-compliant options.

### Actual result

The payment screen could not be reached because both QR sessions were closed. No Cash option was visible, but that is not enough to pass the scenario because there was no active bill/payment flow.

### Evidence observed

- T04 and T07 QR pages showed `Table Closed`.
- No buttons or payment options were visible on either closed QR page.

### Defects

1. Active customer QR payment cannot be tested until QR session handoff is fixed.

### Improvement notes

- After `Open customer QR` is fixed, rerun this immediately.
- The pass condition should be strict: active customer QR checkout must not show Cash anywhere.

### Cleanup performed

No data created.

---

## Result - R3-E2E-021

Scenario: Manager void of sent item creates clear bill and kitchen effect
Run ID: `SKR-R3-20260719-E021`
Browser/device: Desktop in-app browser
Roles simulated: Cashier, manager, kitchen
Status: `FAIL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 6/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | 7/10 |
| Layout/stability | 8/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Created a synthetic sent kitchen item from Tables:
   - T01 / bill `#73`
   - `1x Enchiladas`
   - Total `SGD 20.00`
2. Opened Orders.
3. Expanded the active T01 ticket.
4. Clicked the item remove icon for Enchiladas.
5. Confirmed the remove action in the browser modal.
6. Opened Kitchen & Beverages to check production impact.

### Expected result

Voiding a sent item should require/record the right manager authority, remove the item from the bill, and show a clear kitchen cancellation/void indicator so production staff do not prepare the item.

### Actual result

The item was removed from the bill/order view, but the browser flow did not show a manager override reason, audit note, or clear kitchen cancellation/void marker. Kitchen no longer showed #73, but it also did not show a cancelled/voided Enchiladas indicator.

### Evidence observed

- Orders initially showed T01 `#73`, `1x Enchiladas`, `SGD 20.00`, `Pending`.
- Remove action showed a simple modal: `Are you sure you want to remove this item?` with `Cancel` and `Confirm`.
- After confirming, Orders showed `Item removed successfully`.
- #73 disappeared from active Orders/History.
- Kitchen after void did not show #73 or a cancellation marker.

### Defects

1. Sent-item void does not visibly require or record manager override details in the browser flow.
2. No required void reason was requested.
3. Kitchen cancellation/void indicator was not visible; the ticket simply disappeared.
4. This creates operational risk: kitchen may have already started production but receives no clear â€œcancel itemâ€ signal.

### Improvement notes

- Require a reason for sent-item voids.
- Show `VOIDED/CANCELLED` on Kitchen for a short period or in a cancellation lane.
- Record who voided it and from which role/session.
- Keep `Show Removed Items` useful in Orders by exposing removed item details and reason.

### Cleanup performed

No payment was needed after #73 item removal; the synthetic active bill disappeared from Orders.

---

## Result - R3-E2E-022

Scenario: POS iPad/tablet layout with active checkout lane
Run ID: `SKR-R3-20260719-E022`
Browser/device: Desktop in-app browser, 1280 x 720 viewport
Roles simulated: Waiter, cashier
Status: `PARTIAL / DEVICE COVERAGE BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 7/10 |
| UI/UX clarity | 8/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened POS at `https://staff.sakorio.com/pos?qa=r3-e2e022-023`.
2. Selected T01 from the POS table grid.
3. Inspected selected-table drawer layout in the browser.
4. Confirmed menu lane and cart/payment lane positioning at the available desktop viewport.

### Expected result

At iPad/tablet width, POS should keep menu compact and keep cart/payment reachable without overlapping text/containers.

### Actual result

The available in-app browser session did not expose a true tablet/iPad device mode, so this case could not be fully certified for iPad. At 1280 x 720, the selected-table drawer was stable: menu items were central/left and the cart lane stayed pinned on the right.

### Evidence observed

- Browser viewport was `1280 x 720`.
- Selected-table drawer showed `pos-service-cart-pane` on the right at approximately `x=907`, `w=336`.
- Cart lane showed `Current cart`, item count, total, and Checkout.
- No overlap was observed at desktop width.

### Defects

1. True iPad/tablet viewport coverage was not available in the current in-app browser QA run.
2. After the prior void case, POS still displayed `Live order #73` while also saying T01 was ready/new with 0 orders; that ghost label should be fixed.

### Improvement notes

- Add an automated iPad viewport smoke test in CI/browser QA.
- Verify 1024 x 768 and 1180 x 820 specifically.
- Keep the right-side cart/payment lane behavior; it is good at desktop width.

### Cleanup performed

No submitted order was created by this layout-only case.

---

## Result - R3-E2E-023

Scenario: Large menu list remains compact and searchable
Run ID: `SKR-R3-20260719-E023`
Browser/device: Desktop in-app browser
Roles simulated: Waiter
Status: `PASS WITH POLISH NOTES`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 8/10 |
| UI/UX clarity | 8/10 |
| Workflow speed | 7/10 |
| Layout/stability | 8/10 |
| Launch readiness | 8/10 |

### Steps actually performed

1. Opened T01 in POS selected-table mode.
2. Reviewed the visible menu grid.
3. Used category chips: `All`, `Beverages`, `Main Course`.
4. Added `Coffee` to the cart.
5. Attempted to add a second item while testing table-switch behavior.

### Expected result

Menu cards should stay compact and staff should be able to filter/search/add items quickly without massive scrolling when the catalog grows to 20 to 30 items.

### Actual result

For the current 9-item demo catalog, cards are compact and much better than the earlier oversized-menu layout. Category filters are available. However, there was no obvious text search input despite the `Search menu` label, and the second item click did not add during the table-switch test sequence.

### Evidence observed

- POS showed `All 9`, `Beverages 4`, `Main Course 5`.
- Cards were compact with initials, category, item name, price, and add control.
- Cart updated to `1 item`, `SGD 2.50` after adding Coffee.
- No clear text-entry search field was visible.

### Defects

1. `Search menu` appears as copy/label but a search box is not obvious.
2. Add feedback for second/further item taps should be stronger so waiters know whether a tap registered.

### Improvement notes

- Add a visible search input with placeholder such as `Search menu items`.
- Add a sticky category row for large menus.
- Add a small toast or button animation when an item is added.

### Cleanup performed

The synthetic cart was later settled/cleared during cleanup because the clear-cart path was not obvious in Bill/Pay mode.

---

## Result - R3-E2E-024

Scenario: Return from active table to table grid is obvious
Run ID: `SKR-R3-20260719-E024`
Browser/device: Desktop in-app browser
Roles simulated: Waiter
Status: `FAIL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 5/10 |
| UI/UX clarity | 5/10 |
| Workflow speed | 5/10 |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Opened T01 in POS.
2. Added Coffee to the current cart.
3. Clicked `Back / switch table`.
4. Attempted to select another table from the table grid.
5. Returned to T01 and checked cart/session state.
6. Attempted to clear the cart from the visible controls.

### Expected result

Waiter should be able to switch tables quickly without losing submitted orders or becoming trapped. If an unsent cart blocks switching, the system should show clear choices: `Save/send`, `Discard cart`, or `Stay`.

### Actual result

With an unsent cart, `Back / switch table` did not actually return to table selection. It moved/kept the user in a Bill/Pay state and displayed `Finish or clear T01's current ticket before returning to the floor.` Attempting to select another table did not switch away. The clear-cart action was not discoverable from Bill/Pay mode.

### Evidence observed

- T01 showed `1 in cart`, `SGD 2.50`.
- After `Back / switch table`, the app still showed T01 drawer and Bill/Pay controls.
- Message displayed: `Finish or clear T01's current ticket before returning to the floor.`
- No visible `Clear` action was found from Bill/Pay mode.
- Cleanup required paying the synthetic cart by terminal and then clicking `Clear paid`.

### Defects

1. Table switching is blocked by unsent cart, but the exit/clear path is not obvious.
2. `Back / switch table` behaves like a guard message instead of a navigation choice.
3. The waiter cannot easily jump to another table mid-order without either submitting/paying or hunting for a hidden clear path.

### Improvement notes

- Replace the guard-only behavior with a clear modal:
  - `Send to kitchen`
  - `Discard cart`
  - `Stay on table`
- Keep table grid visible/usable once the waiter intentionally chooses to discard or save.
- Add a persistent `Clear cart` button in Bill/Pay as well as Add Items.

### Cleanup performed

The synthetic Coffee cart was paid by terminal and T01 was cleared.

---

## Result - R3-E2E-025

Scenario: Browser refresh on POS active table preserves state
Run ID: `SKR-R3-20260719-E025`
Browser/device: Desktop in-app browser
Roles simulated: Cashier
Status: `FAIL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 6/10 |
| UI/UX clarity | 5/10 |
| Workflow speed | 7/10 |
| Layout/stability | 8/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Opened POS at `https://staff.sakorio.com/pos?qa=r3-e2e025`.
2. Selected T01.
3. Added Coffee to the unsaved cart.
4. Refreshed the browser.
5. Checked T01 drawer, cart, and history after reload.

### Expected result

Refresh should not duplicate submitted orders. Unsaved cart behavior should be clear: either persist the cart, or discard it with a clear warning/recovery path.

### Actual result

No duplicate submitted order was observed, but the unsaved cart was silently lost after refresh. T01 reopened with `0 items`, while T01 history remained stable.

### Evidence observed

- Before refresh: T01 showed `1 in cart`, `Coffee`, `SGD 2.50`, and `Checkout`.
- After refresh: T01 drawer showed `Ready for items`, `0 items`, `SGD 0.00`.
- T01 history still showed the prior paid Coffee ticket from cleanup; no extra duplicate was seen.

### Defects

1. Unsaved POS cart is silently discarded on browser refresh.
2. No warning, draft recovery, or confirmation explains what happened.

### Improvement notes

- Add a refresh/navigation guard when an unsent cart exists.
- Persist draft cart per table/session for a short period, or explicitly discard with a clear banner.
- Add a recovery toast after reload: `Draft cart was cleared` or `Draft cart restored`.

### Cleanup performed

No additional cleanup was needed after refresh because the unsaved cart disappeared.
