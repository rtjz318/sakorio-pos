# Sakorio POS Round 3 Browser QA Results - 80 Use Case Execution

Date started: 2026-07-19
Source scenario brief: `docs/0082-sakorio-round-3-browser-qa-80-use-cases-2026-07-19.md`
Execution method: Browser-only live workflow execution through Sakorio staff/customer domains
Environment: `https://staff.sakorio.com`, `https://order.sakorio.com`, HitPay sandbox where applicable
Run prefix: `SKR-R3-20260719`

## Summary status

| Case range | Status |
|---|---|
| R3-E2E-001 to R3-E2E-080 | Executed / attempted |

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

---

## Result - R3-E2E-026

Scenario: Browser Back/Forward does not corrupt table/order state
Run ID: `SKR-R3-20260719-E026`
Browser/device: Desktop in-app browser
Roles simulated: Cashier
Status: `FAIL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 6/10 |
| UI/UX clarity | 5/10 |
| Workflow speed | 6/10 |
| Layout/stability | 7/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Opened POS at `https://staff.sakorio.com/pos?qa=r3-e2e026`.
2. Selected T02.
3. Added `Coca Cola` to the cart.
4. Clicked `Checkout`.
5. Used browser Back once.
6. Used browser Forward once.
7. Waited for POS to finish reloading and checked T02 state.

### Expected result

Browser Back/Forward should not create ghost checkout, duplicate submitted order, stale table state, or silently lose a cart.

### Actual result

No duplicate order was observed, but the unsaved cart was silently lost. Browser Back briefly moved to the previous POS URL for T01 with a syncing/loading state. Browser Forward returned to T02 but the `Coca Cola` cart was gone and T02 showed `0 items`.

### Evidence observed

- Before navigation: T02 showed `1 in cart`, `SGD 3.00`, and `Charge terminal - SGD 3.00`.
- After Back: page URL reverted to the previous `r3-e2e025&tableId=1` state and showed `Loading floor tables`.
- After Forward and wait: T02 drawer showed `Ready for items`, `0 items`, `SGD 0.00`.
- No duplicate paid/submitted order appeared.

### Defects

1. Browser Back/Forward can silently discard unsaved POS cart state.
2. Back/Forward shows confusing stale previous-table/loading states.
3. There is no navigation guard warning when an unsent cart exists.

### Improvement notes

- Add a browser navigation guard for unsent carts.
- Persist table draft cart or show a clear discard/recovery message after navigation.
- Avoid restoring stale previous table context during route reload.

### Cleanup performed

No submitted order was created; no cleanup was needed.

---

## Result - R3-E2E-027

Scenario: QR token after table close cannot expose old bill
Run ID: `SKR-R3-20260719-E027`
Browser/device: Desktop in-app browser
Roles simulated: Customer, cashier
Status: `BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 4/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Opened POS at `https://staff.sakorio.com/pos?qa=r3-e2e027`.
2. Selected T04.
3. Clicked `Open customer QR`.
4. Checked browser tabs and clipboard.
5. Opened Tables and attempted to use the `waiter / QR` path.

### Expected result

Staff should be able to open an active customer QR session, customer should submit an order, staff should close/pay the table, and the old QR link should no longer expose the closed bill/history.

### Actual result

The active QR session could not be opened. POS `Open customer QR` did not open a new tab, did not change page state, and did not copy a URL to the browser clipboard. The Tables `waiter / QR` path was not accessible as a clear clickable browser control.

### Evidence observed

- After clicking `Open customer QR`, browser tab list still contained only the staff POS tab.
- Browser clipboard remained empty.
- Staff page still showed T04 service drawer with no generated QR URL.
- Tables page displayed `waiter / QR` text on table cards, but automation could not click it as an accessible button.

### Defects

1. Active customer QR handoff remains unavailable from POS.
2. Tables `waiter / QR` is not discoverable/accessibility-friendly as an actionable control.
3. QR privacy after close cannot be certified until active QR generation works.

### Improvement notes

- Make `Open customer QR` visibly open a modal with copyable URL and QR code.
- Add success/error feedback if popups are blocked or QR generation fails.
- Give table QR controls accessible button names.

### Cleanup performed

No QR order or payment was created.

---

## Result - R3-E2E-028

Scenario: New customer at same table gets clean session
Run ID: `SKR-R3-20260719-E028`
Browser/device: Desktop in-app browser
Roles simulated: Host, customer
Status: `BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 4/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Attempted to open a new QR/customer session from staff POS.
2. Attempted the Tables QR path.
3. Confirmed active QR link was unavailable.

### Expected result

After a previous customer is closed, a new customer at the same table should receive a clean QR session showing only their own current bill and orders.

### Actual result

Could not execute session rollover because the active QR session/link could not be generated from browser-accessible staff controls.

### Evidence observed

- Same evidence as R3-E2E-027: no new tab, no clipboard URL, no visible QR modal.

### Defects

1. New customer clean-session testing is blocked by QR handoff failure.
2. This is launch-critical because QR privacy/session rollover is one of the main customer-facing risks.

### Improvement notes

- Fix QR handoff first, then retest:
  - old token after close
  - new token after reopen
  - old customer cannot see new customer’s bill
  - new customer cannot see old customer’s bill/history

### Cleanup performed

No data created.

---

## Result - R3-E2E-029

Scenario: Long reservation/order notes render safely
Run ID: `SKR-R3-20260719-E029`
Browser/device: Desktop in-app browser
Roles simulated: Customer, host, kitchen
Status: `PARTIAL PASS`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 7/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 6/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened public booking page at `https://order.sakorio.com/book/1?qa=r3-e2e029`.
2. Waited for availability to load.
3. Entered long allergy/client notes with apostrophe, accents, Chinese characters, emoji, symbols, and tag-like text.
4. Selected Monday July 20, 2026 by coordinate click because semantic calendar click failed.
5. Submitted reservation.
6. Confirmed public booking `#50`.
7. Logged back into staff after staff session expired.
8. Opened staff Reservations for July 20, 2026.
9. Searched by phone `+6591000029`.
10. Verified long notes rendered in staff Reservations.
11. Cancelled reservation `#50` for cleanup.

### Expected result

Long notes and special characters should be preserved, remain readable, not break layout, and not execute as markup.

### Actual result

Reservation notes passed for preservation/rendering in public-to-staff flow. Staff Reservations displayed accents, apostrophe, Chinese characters, emoji, and tag-like text as visible text. QR order notes could not be tested because QR handoff is unavailable.

### Evidence observed

- Public confirmation showed `Reservation number: #50`.
- Staff Reservations showed `SKR-R3-20260719 E029 LongNote`.
- Staff Reservations displayed:
  - `O'Neil`
  - `café jalapeño crème brûlée`
  - `中文测试`
  - `🍜🔥`
  - `<b>not html</b>`
  - `<script>no</script>` as text inside guest requirement.
- After cleanup, #50 showed `CANCELLED`.

### Defects

1. Public booking calendar/date button is weak for semantic automation/accessibility; role/locator click failed while coordinate click worked.
2. QR order notes remain untested because active QR handoff is blocked.

### Improvement notes

- Improve calendar button accessible names/interaction reliability.
- Add a formal XSS/special-character smoke test for reservation notes and kitchen order notes.
- Retest QR special instructions after QR handoff is fixed.

### Cleanup performed

Cancelled reservation `#50`.

---

## Result - R3-E2E-030

Scenario: Sold-out/unavailable item is not silently accepted
Run ID: `SKR-R3-20260719-E030`
Browser/device: Desktop in-app browser
Roles simulated: Manager/cashier, customer
Status: `NEEDS SPECIFICATION / BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 5/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Opened Products at `https://staff.sakorio.com/products?qa=r3-e2e030`.
2. Searched for `Coffee`.
3. Opened Coffee edit form.
4. Inspected available product controls without saving changes.

### Expected result

Manager/cashier should be able to mark an item sold out/unavailable for service, and customer ordering should block or remove that item clearly.

### Actual result

Products has edit controls and customer-menu date availability fields, but no obvious quick operational `Sold out today` or `Unavailable now` toggle. QR/customer menu ordering could not be tested because active QR handoff is blocked.

### Evidence observed

- Product list has search, edit, delete, categories, and add product.
- Coffee edit form includes:
  - `Available from (date)`
  - `Available until (date)`
  - prep station
  - tax override
  - customization questions
- No visible instant sold-out toggle was present.

### Defects

1. Sold-out workflow lacks an obvious launch-ready operational control.
2. Date availability exists but is not the same as “86 this item now during service.”
3. Customer-side unavailable-item rejection cannot be tested until QR handoff works.

### Improvement notes

- Add a fast `Sold out` / `Available` toggle in Products and POS menu management.
- Show sold-out state immediately on staff POS and customer QR.
- If item becomes unavailable while in cart, block checkout with a clear message.

### Cleanup performed

No product changes were saved.

---

## Result - R3-E2E-031

Scenario: Timetable name and navigation are correct
Run ID: `SKR-R3-20260719-E031`
Browser/device: Desktop in-app browser
Roles simulated: Manager, staff
Status: `PASS WITH POLISH NOTES`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 9/10 |
| UI/UX clarity | 8/10 |
| Workflow speed | 8/10 |
| Layout/stability | 7/10 |
| Launch readiness | 8/10 |

### Steps actually performed

1. Opened staff navigation.
2. Confirmed side navigation shows `Timetable`.
3. Opened `https://staff.sakorio.com/working-plan?qa=r3-e2e031`.
4. Inspected calendar layout, employee roster, coverage cards, and leave/MC area.

### Expected result

Navigation should say Timetable, and the scheduling screen should be understandable with employee list/shift tools discoverable.

### Actual result

Timetable naming is correct. The screen includes monthly calendar, Week/Calendar switch, employee roster, Add shift, Apply to month, coverage warnings, and planned-vs-clocked disclosure.

### Evidence observed

- Side nav showed `Timetable`.
- Page header showed `Timetable`.
- Smart scheduling panel showed `Employee roster`.
- Calendar showed per-day `+ Add` controls and shift lines.
- Leave area showed `Annual leave / MC balances COMING SOON`.

### Defects

No naming/navigation defect observed.

### Improvement notes

- Calendar content extends far below the viewport; sticky month/week controls would help.
- Export Excel was disabled in All staff view; add clearer reason/tooltip.

### Cleanup performed

No data changed.

---

## Result - R3-E2E-032

Scenario: Drag or assign employee into timetable shift
Run ID: `SKR-R3-20260719-E032`
Browser/device: Desktop in-app browser
Roles simulated: Manager
Status: `PASS WITH POLISH NOTES`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 9/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 8/10 |
| Layout/stability | 7/10 |
| Launch readiness | 8/10 |

### Steps actually performed

1. Opened Timetable.
2. Clicked `Add shift`.
3. Created a synthetic Jason Tan shift:
   - Date: July 19, 2026
   - Time: 21:00 to 21:30
   - Label: `R3-032 QA`
4. Verified it appeared on the calendar as `Jason 21-21:30`.
5. Deleted the synthetic shift.
6. Verified totals returned to baseline.

### Expected result

Shift appears at expected date/time and employee. If drag-and-drop is not implemented, add flow must be clear.

### Actual result

Add-shift flow works. The shift appeared immediately and totals updated. Delete worked and totals reverted.

### Evidence observed

- After save, Timetable showed `Shift saved.`
- Scheduled shifts increased from `24` to `25`.
- Jason hours increased from `185h 30m` to `186h`.
- July 19 displayed `Jason 21-21:30`.
- After delete, Timetable showed `Shift removed.`
- Scheduled shifts returned to `24`.

### Defects

No functional add/delete defect observed.

### Improvement notes

- Modal form has several unlabeled selects/checkboxes from automation perspective; better labels would reduce mistakes.
- Drag-and-drop was not tested; visible copy says desktop drag is supported, but a clean Add flow already exists.
- Add a success toast with date/time/staff summary after saving.

### Cleanup performed

Deleted synthetic `R3-032 QA` shift.

---

## Result - R3-E2E-033

Scenario: Annual leave / MC ledger records balance change
Run ID: `SKR-R3-20260719-E033`
Browser/device: Desktop in-app browser
Roles simulated: Manager
Status: `NOT IMPLEMENTED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 7/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Opened Timetable.
2. Inspected Leave Control section.
3. Checked whether annual leave/MC actions were available.

### Expected result

Manager should be able to record annual leave or MC and see balance deduction/audit.

### Actual result

Leave/MC ledger is explicitly not enabled yet. The UI clearly says it is coming soon.

### Evidence observed

- Section title: `Annual leave / MC balances COMING SOON`.
- Annual leave card: `Ledger not enabled`.
- MC/sick leave card: `Ledger not enabled`.
- Copy says entitlement policy, approval flow, certificate recording, and balance deduction are coming soon.

### Defects

1. Leave/MC balance tracking is not launch-ready if it is required for launch scope.

### Improvement notes

- If leave/MC is post-launch, label as future module in the brief.
- If needed for launch, implement entitlement, approvals, balance deduction, and audit trail.

### Cleanup performed

No data changed.

---

## Result - R3-E2E-034

Scenario: Staff clocks in from assigned shift
Run ID: `SKR-R3-20260719-E034`
Browser/device: Desktop in-app browser
Roles simulated: Staff, manager
Status: `BLOCKED BY SHIFT WINDOW`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 7/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Opened My Shift at `https://staff.sakorio.com/my-shift?qa=r3-e2e034`.
2. Confirmed staff profile selector exists.
3. Selected `Jason Tan — Waiter`.
4. Checked scheduled shifts and current clock-in state.
5. Attempted to create a current synthetic shift from Timetable, but current time was after 22:00 and end-time options stopped at 22:00.

### Expected result

Staff should select their profile/shift and clock in when their assigned shift window is open.

### Actual result

Profile selection worked. Clock-in could not be executed because no shift was currently open. The UI correctly disabled clock-in and showed upcoming/closed shift cards. A current synthetic shift could not be safely created because the timetable end-time selector did not offer a time later than 22:00 after current time.

### Evidence observed

- My Shift showed profile selector:
  - `Ajisen — Owner`
  - `Jason Tan — Waiter`
- After selecting Jason, My Shift showed:
  - `Off shift`
  - `No shift is currently open for attendance`
  - disabled button `No shift available to clock in`
  - upcoming Jason shifts for July 20 onward.
- Attempted Timetable setup at current local time around `22:24`; form offered end times only up to `22:00`.

### Defects

1. Clock-in flow could not be tested outside a live shift window.
2. Add-shift form’s “Use any hour / outside hours / split shift” checkbox UX is ambiguous enough that it is easy to toggle the wrong option.

### Improvement notes

- Add a manager QA/demo option to create an active attendance test shift.
- Make shift cards clickable to explain why clock-in is disabled and when it opens.
- Add clearer labels/ids for Timetable checkboxes.

### Cleanup performed

No active shift was created; the invalid add-shift modal was cancelled.

---

## Result - R3-E2E-035

Scenario: Staff clocks out and shift duration is correct
Run ID: `SKR-R3-20260719-E035`
Browser/device: Desktop in-app browser
Roles simulated: Staff, manager
Status: `BLOCKED BY PRIOR CLOCK-IN`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 7/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Attempted R3-E2E-034 clock-in flow first.
2. Confirmed no active shift could be clocked in.
3. Checked Recent Attendance area.

### Expected result

After clock-in, staff should clock out and see correct duration/status reflected in staff and manager views.

### Actual result

Clock-out could not be executed because no active clock-in session existed.

### Evidence observed

- My Shift showed `Open sessions 0`.
- Recent Attendance showed `No attendance yet`.
- Clock-in button was disabled.

### Defects

1. Clock-out cannot be tested without a way to create/use an active shift window.
2. Need a deterministic QA seed/demo shift for attendance testing.

### Improvement notes

- Add a browser-testable attendance scenario with a current shift.
- Once available, retest:
  - clock in
  - active status
  - clock out
  - duration math
  - manager planned-vs-clocked display.

### Cleanup performed

No attendance data was created.

---

## Result - R3-E2E-036

Scenario: Create staff user and assign role
Run ID: `SKR-R3-20260719-E036`
Browser/device: Desktop in-app browser
Roles simulated: Manager
Status: `PASS WITH SECURITY/UX DEFECT`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 8/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened staff Users at `https://staff.sakorio.com/users?qa=r3-e2e036`.
2. Clicked `Add User`.
3. Created synthetic staff profile:
   - Name: `SKR-R3-036 QA Waiter`
   - Email: `ralf.roeber+skr-r3-036@sakario.sg`
   - Role: `Waiter`
   - Job title: `QA Waiter`
   - Phone: `+6591000036`
   - Hourly pay: `SGD 13.50`
   - Employment start date: `2026-07-19`
4. Saved the user.
5. Verified the user card appeared in Users with role, job title, pay and `Profile ready`.
6. Used the created profile for R3-E2E-037.
7. Returned as owner and deleted the synthetic user through the visible `Delete User` confirmation modal.

### Expected result

User creation should start from a blank safe form, save one staff user, show role/pay/profile state clearly, and provide a safe cleanup path.

### Actual result

The user was created successfully and displayed correctly. Cleanup also worked. However, the Add User form opened with the currently signed-in owner's email and password fields already populated.

### Evidence observed

- Created user appeared as `SKR-R3-036 QA Waiter`.
- Role displayed as `Waiter`.
- Job title displayed as `QA Waiter`.
- Pay displayed as `SGD 13.50/hr`.
- Profile displayed as `Profile ready`.
- Deletion confirmation text showed the synthetic email and deletion removed the card.

### Defects

1. `Add User` prefilled the form with the current account's email/password values. This is a security and UX defect.
2. Delete controls are icon-like and not visually tied strongly enough to each card; automation had to confirm the correct row carefully.

### Improvement notes

- Always open Add User with blank email/password fields.
- Add stronger accessible labels such as `Delete SKR-R3-036 QA Waiter`.
- Consider a success toast after deletion.

### Cleanup performed

Synthetic user `ralf.roeber+skr-r3-036@sakario.sg` was deleted.

---

## Result - R3-E2E-037

Scenario: Non-manager cannot perform manager-only bill actions
Run ID: `SKR-R3-20260719-E037`
Browser/device: Desktop in-app browser
Roles simulated: Waiter, manager
Status: `PASS WITH AUDIT GAP`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 8/10 |
| UI/UX clarity | 8/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Logged out from the owner session through the browser.
2. Logged in through `https://staff.sakorio.com/login?qa=r3-e2e037` as the synthetic waiter from R3-E2E-036.
3. Confirmed the dashboard loaded as role `Waiter`.
4. Opened POS.
5. Inspected available table/order/payment controls.
6. Opened Orders.
7. Attempted direct navigation to manager/admin routes:
   - `/reports?qa=r3-e2e037`
   - `/users?qa=r3-e2e037-direct`
8. Returned to owner session for cleanup and next tests.

### Expected result

Cashier/waiter should not be able to access manager-only routes or perform bill corrections such as refunds, reopen, discounts or unaudited voids.

### Actual result

Waiter account could access operational tabs, but `Users`, `Reports`, `Inventory`, and `Settings` were hidden from navigation. Direct URL access to `/reports` and `/users` redirected back to Dashboard. No refund/reopen/discount controls were visible in POS or Orders.

### Evidence observed

- Header showed `ralf.roeber+skr-r3-036@sakario.sg` and role `Waiter`.
- Waiter nav included POS, Orders, Reservations, Queue, Tables, Kitchen & beverages, Customers, Products, Catalog, Timetable and Contracts.
- Direct manager route attempts landed at `https://staff.sakorio.com/dashboard`.
- Orders view exposed history/current filters but no refund/reopen/discount controls.

### Defects

1. No explicit denial message is shown when direct manager routes redirect to Dashboard.
2. Bill correction audit could not be fully tested because refund/reopen tools are not visible even to the owner in later cases.

### Improvement notes

- Add a clear `You do not have access to this page` message for redirected restricted routes.
- Add manager-only correction workflows with reason capture and audit trail before launch.

### Cleanup performed

Synthetic waiter account was deleted in R3-E2E-036 cleanup.

---

## Result - R3-E2E-038

Scenario: Reports reflect closed table/payment totals
Run ID: `SKR-R3-20260719-E038`
Browser/device: Desktop in-app browser
Roles simulated: Cashier, manager
Status: `PASS WITH WORKFLOW POLISH`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 8/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 8/10 |

### Steps actually performed

1. Opened POS at `https://staff.sakorio.com/pos?qa=r3-e2e038`.
2. Observed T01 had a conflicting recovery state, so used T05 for a cleaner reporting test.
3. Opened T05.
4. Added `Coffee`.
5. Clicked the in-drawer `Checkout`.
6. Confirmed the payment drawer showed `Amount due SGD 2.50`.
7. Selected/used terminal settlement with `Charge terminal - SGD 2.50`.
8. POS returned to table grid with `Card terminal payment recorded for T05`.
9. Opened Orders and confirmed #75 existed first as current until table cleanup.
10. Clicked visible `Clear paid`.
11. Reopened Orders and confirmed #75 moved to Order History.
12. Opened Reports and checked daily totals/table totals.

### Expected result

After payment and close-table/clear-table action, the paid order should appear in History and reporting totals should reflect the bill exactly.

### Actual result

Payment and reporting worked. POS paid-today total increased from `SGD 106.50` to `SGD 109.00`. Reports showed `19 Jul SGD 109.00`, Terminal revenue included the payment, and T05 table revenue/order count increased. Orders only moved the ticket from Active to History after pressing `Clear paid`.

### Evidence observed

- Order created: `#75`
- Table: `T05`
- Item: `1x Coffee`
- Amount: `SGD 2.50`
- Payment method: Terminal
- POS paid today after payment: `SGD 109.00`
- Orders History showed `#75 T05 1x Coffee SGD 2.50 Paid`.
- Reports showed:
  - Total revenue `SGD 971.00` for selected range after the run.
  - Daily sales `19 Jul SGD 109.00`.
  - T05 table row included updated table revenue.

### Defects

1. T01 recovery showed an old pending ticket while the POS KPI said `OPEN BILLS 0`; that is a table-state inconsistency.
2. Two `Checkout` buttons share the same accessible label when a cart is active.
3. Orders calls a paid-but-not-cleared ticket `current`, which can confuse staff until `Clear paid` is pressed.

### Improvement notes

- Make paid-not-cleared state visually distinct: `Paid - awaiting table clear`.
- Rename the top mini-action to `Go to bill` or add accessible labels so it does not duplicate the cart submit button.
- Add an explicit post-payment prompt: `Clear table now` / `Keep occupied`.

### Cleanup performed

T05 was cleared after payment; #75 remains in History as expected.

---

## Result - R3-E2E-039

Scenario: Customer and cashier submit orders close together without duplicates
Run ID: `SKR-R3-20260719-E039`
Browser/device: Desktop in-app browser
Roles simulated: Customer, cashier
Status: `BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 4/10 |
| UI/UX clarity | 4/10 |
| Workflow speed | 4/10 |
| Layout/stability | 8/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Opened POS at `https://staff.sakorio.com/pos?qa=r3-e2e039`.
2. Opened T02 using `Start order`.
3. Clicked `Open customer QR`.
4. Checked browser tab count, current URL, page text, and clipboard value.

### Expected result

Staff should be able to open/copy the active QR URL, customer should prepare a QR order, staff should submit an order on the same table, customer should submit, and both tickets should appear once on the same active session.

### Actual result

The QR entry point did not produce a usable customer order surface. No new tab opened, no URL changed, no modal appeared, and the clipboard remained empty.

### Evidence observed

- Before click URL: `https://staff.sakorio.com/pos?qa=r3-e2e039&tableId=2`
- After click URL: unchanged.
- Browser tab count: unchanged at 1.
- Clipboard: empty.
- Button still displayed `Open customer QR`.

### Defects

1. Active QR handoff is unavailable from POS.
2. Concurrency between QR/customer and cashier orders cannot be tested until QR handoff is fixed.

### Improvement notes

- Make `Open customer QR` either open a QR modal, open a customer tab, or copy the URL with a visible success message.
- Add test IDs/accessibility labels for QR controls.

### Cleanup performed

No order was submitted in this case.

---

## Result - R3-E2E-040

Scenario: End-to-end service cycle twice on same table
Run ID: `SKR-R3-20260719-E040`
Browser/device: Desktop in-app browser
Roles simulated: Cashier, kitchen/order reviewer
Status: `PASS WITH QR COVERAGE GAP`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 8/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 8/10 |

### Steps actually performed

1. Ran staff-side cycle A on T08:
   - Opened table.
   - Added `Coffee`.
   - Checked out.
   - Paid by terminal.
   - Cleared the table.
2. Ran staff-side cycle B on T08:
   - Opened the same table again.
   - Added `Coca Cola`.
   - Checked out.
   - Paid by terminal.
   - Cleared the table.
3. Opened Orders History to compare the two tickets.
4. Reopened POS to confirm T08 returned to available/ready state.

### Expected result

Two separate service cycles on the same table should create separate history records, and the second customer/session should not inherit the first customer/session's active bill.

### Actual result

Staff-side order/pay/clear cycle worked twice. Orders History showed two distinct paid tickets for T08: #76 and #77. T08 returned to `Available / Ready for order`.

### Evidence observed

- Cycle A order: `#76`, T08, `1x Coffee`, `SGD 2.50`, Paid, Terminal.
- Cycle B order: `#77`, T08, `1x Coca Cola`, `SGD 3.00`, Paid, Terminal.
- Orders History showed both records separately.
- POS table grid later showed T08 as `Available` and `Ready for order`.
- POS paid today increased to `SGD 114.50` after both cycles.

### Defects

1. QR side of the scenario could not be tested because active QR handoff is blocked.
2. Product/history controls share names such as `Coca Cola`; the browser saw both a history row and product card with similar accessible labels.
3. Paid table cleanup is a second step and needs stronger prompting.

### Improvement notes

- Add accessible names such as `Add Coca Cola to cart` and `Open order #69 receipt`.
- After terminal payment, surface `Clear table now` as the primary next action.
- Retest full QR privacy/session boundary once QR handoff is fixed.

### Cleanup performed

T08 was cleared after both cycles; #76 and #77 remain in History.

---

## Result - R3-E2E-041

Scenario: Customer abandons HitPay checkout and returns later
Run ID: `SKR-R3-20260719-E041`
Browser/device: Desktop in-app browser
Roles simulated: Customer, cashier
Status: `BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 4/10 |
| UI/UX clarity | 4/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Confirmed POS `Open customer QR` did not expose an active QR URL in R3-E2E-039.
2. Opened a previously known customer QR URL on `order.sakorio.com` in a new browser tab.
3. Checked whether the QR session still had an active bill or payment path.

### Expected result

Customer should open an active QR bill, enter HitPay checkout, abandon payment, return later, and see the same unpaid recoverable bill without false payment status.

### Actual result

The known QR URL displayed `Table Closed` and no controls. No active QR payment path could be reached.

### Evidence observed

- QR URL opened on `https://order.sakorio.com/menu/...`.
- Page showed:
  - `Table Closed`
  - `This table is not currently accepting orders. Please ask a member of staff for assistance.`
  - `T04`
- No buttons or payment controls were visible.

### Defects

1. Cannot start an active QR payment-abandonment scenario because staff cannot expose active QR.
2. HitPay abandonment/retry behavior remains unverified for launch.

### Improvement notes

- Fix active QR URL handoff first.
- Add a clear QR bill recovery page with `Unpaid`, `Retry payment`, and `Ask staff` states.

### Cleanup performed

No new order or payment was created.

---

## Result - R3-E2E-042

Scenario: HitPay success callback opened twice
Run ID: `SKR-R3-20260719-E042`
Browser/device: Desktop in-app browser
Roles simulated: Customer, cashier
Status: `BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | N/A |
| Workflow speed | N/A |
| Layout/stability | N/A |
| Launch readiness | 4/10 |

### Steps actually performed

1. Attempted to establish an active QR/HitPay checkout path through POS QR handoff.
2. Checked known QR URL from earlier QA.
3. Did not force or replay stale payment callback URLs because the scenario needs a fresh sandbox payment reference tied to a current bill.

### Expected result

Refreshing or reopening a HitPay success callback should record payment once only and must not duplicate settlements, receipts, closes, or history rows.

### Actual result

Could not execute due to unavailable active QR/HitPay path.

### Evidence observed

- POS QR handoff produced no customer link.
- Known QR URL was closed.
- Staff POS payment drawer exposes Staff Cash and Terminal only; no staff HitPay button was visible in the tested drawer.

### Defects

1. HitPay idempotency remains unverified from the browser.
2. Need a deterministic sandbox path to generate a fresh payment and replay the callback.

### Improvement notes

- Add a browser-testable HitPay sandbox scenario with visible test payment status.
- Display payment reference in staff order detail/history for easier reconciliation.

### Cleanup performed

No new order or payment was created.

---

## Result - R3-E2E-043

Scenario: Terminal payment marked failed then retried
Run ID: `SKR-R3-20260719-E043`
Browser/device: Desktop in-app browser
Roles simulated: Cashier
Status: `NEEDS SPECIFICATION`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 6/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Opened POS at `https://staff.sakorio.com/pos?qa=r3-e2e043`.
2. Opened T07.
3. Added `Coffee`.
4. Opened checkout.
5. Inspected terminal payment controls for cancel/fail/retry options.
6. Completed the order with `Charge terminal - SGD 2.50` to avoid leaving an unpaid test bill.
7. Cleared T07.

### Expected result

If terminal failure/cancel is supported, cashier should be able to mark/cancel a failed attempt without marking the bill paid, then retry cleanly.

### Actual result

No terminal failure or cancel path was visible. The terminal flow is currently a direct success action: pressing `Charge terminal` records payment immediately.

### Evidence observed

- Payment drawer showed:
  - `STAFF CASH`
  - `TERMINAL`
  - `Charge terminal - SGD 2.50`
- No `Failed`, `Cancel`, `Retry`, `Pending terminal`, or device response state was visible.
- POS showed `Card terminal payment recorded for T07.`
- POS paid today increased to `SGD 117.00`.

### Defects

1. Terminal payment model is currently a manual success confirmation, not a full terminal state machine.
2. No way to record failed/cancelled terminal attempts.

### Improvement notes

- Decide whether terminal means manual staff confirmation or integrated device workflow.
- If integrated later, add states: `Waiting`, `Approved`, `Declined`, `Cancelled`, `Retry`.
- If manual-only, label button `Mark terminal payment received` to avoid implying device confirmation.

### Cleanup performed

T07 was paid and cleared; generated order remains in History.

---

## Result - R3-E2E-044

Scenario: Partial payment or split tender decision
Run ID: `SKR-R3-20260719-E044`
Browser/device: Desktop in-app browser
Roles simulated: Cashier, manager
Status: `PASS AS UNSUPPORTED POLICY`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 8/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened POS at `https://staff.sakorio.com/pos?qa=r3-e2e044`.
2. Opened T09.
3. Added `Coffee`.
4. Added `Coca Cola`.
5. Opened checkout.
6. Inspected payment drawer for split/partial tender controls.
7. Completed full payment by terminal.
8. Cleared T09.

### Expected result

If partial/split tender is supported, the UI should show amount-entry and balance math clearly. If unsupported, the UI should not imply partial payment exists.

### Actual result

No partial payment or split tender controls were visible. The drawer clearly offered full-bill settlement only through Staff Cash or Terminal.

### Evidence observed

- Amount due: `SGD 5.50`.
- Bill contents: `2 items · T09`.
- Controls visible:
  - `STAFF CASH`
  - `TERMINAL`
  - `Charge terminal - SGD 5.50`
- No amount entry, balance due, split by person/item, or mixed tender UI appeared.
- POS paid today increased to `SGD 122.50`.

### Defects

1. No explicit note says split/partial payment is unsupported.
2. Staff Cash remains visible in staff POS; if business policy wants cash removed everywhere, this needs change.

### Improvement notes

- Add a small policy note: `Split tender not supported yet` if not in launch scope.
- If split tender is planned, defer behind a manager-controlled workflow with balance math and receipt split.

### Cleanup performed

T09 was paid and cleared; generated order remains in History.

---

## Result - R3-E2E-045

Scenario: Refund or reverse paid bill
Run ID: `SKR-R3-20260719-E045`
Browser/device: Desktop in-app browser
Roles simulated: Manager, cashier
Status: `NOT IMPLEMENTED / NOT VISIBLE`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 5/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Opened Orders at `https://staff.sakorio.com/staff/orders?qa=r3-e2e045`.
2. Reviewed paid Order History after the newly created paid bills.
3. Looked for refund/reversal/void/reopen controls.
4. Attempted to open a paid history row for details.
5. Inspected visible row-level controls.

### Expected result

Paid bill refund/reversal should be manager-controlled, reasoned, auditable, mathematically correct, and should not reopen the table unintentionally.

### Actual result

No refund/reversal/reopen workflow was visible from Orders History. Paid history rows are shown in a table and expose invoice printing, but not correction actions.

### Evidence observed

- History showed newest paid orders including:
  - `#79 T09 1x Coffee, 1x Coca Cola SGD 5.50 Paid`
  - `#78 T07 1x Coffee SGD 2.50 Paid`
  - `#77 T08 1x Coca Cola SGD 3.00 Paid`
  - `#76 T08 1x Coffee SGD 2.50 Paid`
  - `#75 T05 1x Coffee SGD 2.50 Paid`
- Visible controls included `Order History`, `Not Paid Yet`, and many `Print invoice` buttons.
- No `Refund`, `Reverse`, `Reopen`, `Void payment`, or manager approval action appeared.

### Defects

1. Refund/reversal workflow appears absent from the live UI.
2. Paid history rows are not clearly openable for detail/audit review.
3. Invoice printing is available, but financial correction controls are not discoverable.

### Improvement notes

- Add manager-only `Refund / reverse payment` with mandatory reason.
- Add detail drawer for paid orders with payment method, reference, original cashier, correction history, and receipt actions.
- Require explicit confirmation that refund does not reopen the table.

### Cleanup performed

No refund or reversal was performed.

---

## Result - R3-E2E-046

Scenario: Reopen closed bill and add forgotten item
Run ID: `SKR-R3-20260719-E046`
Browser/device: Desktop in-app browser
Roles simulated: Manager, cashier
Status: `NOT IMPLEMENTED / NOT VISIBLE`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 5/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Opened Orders at `https://staff.sakorio.com/staff/orders?qa=r3-e2e046`.
2. Reviewed closed/paid History rows, including recent test tickets #75 to #81.
3. Inspected visible row and page controls for `Reopen`, `Add forgotten item`, `Balance`, `Void`, `Refund`, or manager override options.

### Expected result

Reopening a closed bill should require manager authorization, show balance/payment implications, and create a clear kitchen/payment state for any forgotten item.

### Actual result

No reopen or add-forgotten-item workflow was visible in Orders History. Paid history rows only expose invoice printing.

### Evidence observed

- History showed paid orders #79, #78, #77, #76, #75 and earlier paid rows.
- Visible actions were `Order History`, `Not Paid Yet`, and `Print invoice`.
- No `Reopen`, `Add item`, `Balance due`, `Manager approve`, `Refund`, or `Void payment` action appeared.

### Defects

1. Manager reopen workflow appears absent from the live UI.
2. There is no clear policy for forgotten items after payment/close.

### Improvement notes

- Add manager-only `Reopen bill` or `Add post-close item` with reason and audit trail.
- Show whether the added item creates a new ticket, balance due, or separate bill.

### Cleanup performed

No bill was reopened or changed.

---

## Result - R3-E2E-047

Scenario: Customer tries QR ordering while cashier is closing bill
Run ID: `SKR-R3-20260719-E047`
Browser/device: Desktop in-app browser
Roles simulated: Customer, cashier
Status: `BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 4/10 |
| UI/UX clarity | 4/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Opened POS at `https://staff.sakorio.com/pos?qa=r3-e2e047`.
2. Opened T03 with `Start order`.
3. Clicked `Open customer QR`.
4. Checked whether a customer QR link/tab/modal/clipboard value was produced.

### Expected result

Customer should be able to hold a QR menu/cart while the cashier starts close/payment, and the system should safely include or block the late customer submit.

### Actual result

Could not reach customer QR ordering. The QR button did not open a new tab, change URL, show a modal, or copy a link.

### Evidence observed

- URL after click remained `https://staff.sakorio.com/pos?qa=r3-e2e047&tableId=3`.
- Browser tab count stayed unchanged.
- Clipboard was empty.
- Page still showed `Open customer QR`.

### Defects

1. Active QR handoff remains unavailable from POS.
2. Closing-race behavior between QR and cashier cannot be certified.

### Improvement notes

- Fix `Open customer QR` as a launch-blocking issue.
- Add explicit QR submit behavior when table is in checkout/paid/closed state.

### Cleanup performed

No order was submitted.

---

## Result - R3-E2E-048

Scenario: Two hosts attempt to seat the same reservation
Run ID: `SKR-R3-20260719-E048`
Browser/device: Desktop in-app browser with two staff tabs
Roles simulated: Host A, Host B
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

1. Attempted staff-side New reservation first; the staff modal stayed on today with no time slot available.
2. Created public reservation:
   - Reservation: `#51`
   - Name: `SKR-R3-20260719 E048 DoubleSeat`
   - Date/time: `2026-07-26 09:00`
   - Party: `2`
3. Opened the same reservation date/search in two staff tabs.
4. Confirmed both tabs initially saw #51 as `BOOKED`, no table assigned.
5. In Tab A, clicked `Assign table` and assigned T07.
6. In stale Tab B, clicked `Assign table` without refreshing.
7. Tab B's drawer showed T07 as already reserved for the same guest, but still allowed assigning T09.
8. Clicked T09 assignment in Tab B.
9. Checked final state.
10. Cancelled #51 as cleanup.

### Expected result

Second host action should be blocked, require refresh, or warn with a hard confirmation that prevents duplicate/overwrite assignment.

### Actual result

The stale second tab was allowed to overwrite the table assignment from T07 to T09. The system did notice T07 was reserved, but did not prevent assigning the same reservation to a different table.

### Evidence observed

- Tab A after assignment showed #51 planned at `T07`.
- Tab B stale drawer showed:
  - `Table T07 has an upcoming reservation at 09:00 (SKR-R3-20260719 E048 DoubleSeat). Seat here anyway?`
  - T07 marked `Reserved`
  - T09 still available.
- After Tab B assigned T09, #51 showed `T09`.
- Cleanup changed #51 to `CANCELLED`.

### Defects

1. Reservation assignment is vulnerable to stale-tab overwrite.
2. The UI warns about the prior table but still permits assigning another table with no conflict confirmation.
3. Staff New reservation modal had time-slot/date-selection friction.

### Improvement notes

- Add optimistic locking/version check for reservation assignment.
- On stale assignment, show `This reservation was already assigned to T07. Refresh or change table intentionally`.
- Require explicit `Change table` flow instead of allowing stale `Assign table` to overwrite.

### Cleanup performed

Reservation #51 was cancelled.

---

## Result - R3-E2E-049

Scenario: Two waiters edit same table order at same time
Run ID: `SKR-R3-20260719-E049`
Browser/device: Desktop in-app browser with two staff tabs
Roles simulated: Waiter A, Waiter B
Status: `PASS WITH CONFLICT-UX GAP`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 8/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened T04 in POS in Tab A.
2. Opened T04 in POS in Tab B from a stale/parallel view.
3. Tab A added `Coffee`, checked out, and charged terminal.
4. Tab B added `Coca Cola` from the stale view, checked out, and charged terminal.
5. Returned to POS table grid.
6. Cleared paid state for T04.
7. Opened Orders History.

### Expected result

Both staff submissions should be preserved once or conflicts should be clearly handled. No silent overwrite or missing item should occur.

### Actual result

Both staff submissions were preserved as separate paid tickets on the same table. No overwrite occurred. However, the UI did not warn Tab B that the table changed after Tab A's payment.

### Evidence observed

- Tab A created #80: `T04`, `1x Coffee`, `SGD 2.50`, Paid.
- Tab B created #81: `T04`, `1x Coca Cola`, `SGD 3.00`, Paid.
- Orders History showed both #80 and #81.
- POS paid today increased to `SGD 128.00`.
- T04 was cleared and returned to available.

### Defects

1. Stale staff views can submit without table-state refresh warning.
2. The result is safe as two tickets, but staff may expect one consolidated active bill.

### Improvement notes

- Add live table version warning: `This table changed in another tab`.
- If same table/session is open, consider merging unpaid tickets into one current bill before payment.

### Cleanup performed

T04 was cleared after payment; #80 and #81 remain in History.

---

## Result - R3-E2E-050

Scenario: Kitchen marks ready while cashier voids item
Run ID: `SKR-R3-20260719-E050`
Browser/device: Desktop in-app browser
Roles simulated: Kitchen, cashier/manager
Status: `BLOCKED WITH KITCHEN STATE DEFECT`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 4/10 |
| UI/UX clarity | 5/10 |
| Workflow speed | N/A |
| Layout/stability | 7/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Opened Kitchen at `https://staff.sakorio.com/kitchen?qa=r3-e2e050`.
2. Reviewed current production lanes and recent tickets.
3. Checked whether cashier-side void/reopen controls existed from previous Orders/POS inspections.
4. Did not mutate kitchen tickets because the matching cashier void workflow was not available.

### Expected result

Voided item should stay voided, and kitchen should receive a cancellation/stale-state signal if attempting to mark ready from an old ticket.

### Actual result

The full race cannot be executed because cashier/manager void controls are not visible. Kitchen also showed many paid/cleared orders as `Pending`, including recent tickets #75 to #81.

### Evidence observed

- Kitchen showed:
  - `Review backlog 70`
  - `10 New tickets`
  - #75, #76, #77, #78, #79, #80, #81 all `Pending`
- Recent paid/cleared tickets still appeared in Kitchen pending lane.
- No cashier-side item void path was visible in POS/Orders History for paid tickets.

### Defects

1. Kitchen lifecycle is disconnected from payment/table clearing: paid/cleared orders remain pending.
2. Void/cancel item workflow is not visible, so stale kitchen cancellation behavior cannot be validated.
3. Kitchen backlog is dominated by old unresolved tickets, making live operations noisy.

### Improvement notes

- Decide kitchen lifecycle: paid order still needs prep, or paid/cleared should remove/archive kitchen ticket.
- Add cancel/void status propagation to kitchen.
- Add a daily service filter and one-tap stale backlog cleanup with audit.

### Cleanup performed

No kitchen statuses were changed.

---

## Result - R3-E2E-051

Scenario: Party is seated at table smaller than reservation size
Run ID: `SKR-R3-20260719-E051`
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

1. Created public reservation:
   - Reservation: `#52`
   - Name: `SKR-R3-20260719 E051 Capacity`
   - Date/time: `2026-07-27 09:00`
   - Party: `4`
2. Opened staff Reservations on July 27 and searched the phone.
3. Clicked `Assign table`.
4. Looked for 2-seat tables such as T07/T09.
5. Attempted to assign T07.
6. Cancelled #52 as cleanup.

### Expected result

System should warn or block assignment to a smaller table according to policy.

### Actual result

The assignment drawer filtered out 2-seat tables entirely for the 4-guest reservation. Only 4-seat tables were offered.

### Evidence observed

- #52 showed `4 guests`.
- Drawer displayed:
  - T04 `4 seats · Available`
  - T05 `4 seats · Ready to serve`
  - T01/T02/T03 `4 seats · Open order`
- T07 and T09 did not appear in the assignment drawer.
- Attempting to target T07 failed because no such assignment control existed.

### Defects

1. No explicit text says smaller tables are hidden due to capacity; the behavior is correct but implicit.

### Improvement notes

- Add a line such as `2-seat tables hidden because party size is 4`.
- Consider a manager override only if the restaurant wants flexible seating policy.

### Cleanup performed

Reservation #52 was cancelled.

---

## Result - R3-E2E-052

Scenario: Public reservation outside operating hours
Run ID: `SKR-R3-20260719-E052`
Browser/device: Desktop in-app browser
Roles simulated: Customer
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

1. Opened public booking page at `https://order.sakorio.com/book/1?qa=r3-e2e052`.
2. Selected July 28, 2026.
3. Inspected available time slots against visible opening hours.

### Expected result

Invalid/outside-hours time should be blocked or not offered.

### Actual result

Outside-hour times were not offered. The visible opening hours were `Mon-Sun 09:00-22:00`; the slot list started at `09:00` and ended at `21:00`.

### Evidence observed

- First selectable slot: `09:00`.
- Last selectable slot: `21:00`.
- No slots before 09:00.
- No slots at/after 22:00.

### Defects

1. Slot list is very long and may be tiring on mobile/tablet.
2. It is not explicitly explained why 21:00 is the final slot when opening hours end at 22:00.

### Improvement notes

- Add a note: `Last seating is 21:00`.
- Consider grouping times by Lunch/Dinner periods.

### Cleanup performed

No reservation was submitted in this case.

---

## Result - R3-E2E-053

Scenario: Late reservation arrival becomes queue/waitlist
Run ID: `SKR-R3-20260719-E053`
Browser/device: Desktop in-app browser
Roles simulated: Customer, host
Status: `PARTIAL / HANDOFF GAP`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 6/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | 7/10 |
| Layout/stability | 8/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Created public reservation:
   - Reservation: `#53`
   - Name: `SKR-R3-20260719 E053 QueueLate`
   - Date/time: `2026-07-28 09:15`
   - Party: `2`
2. Opened staff Reservations and searched #53 by phone.
3. Clicked `Send to queue`.
4. Observed navigation into Queue with a `RESERVATION HANDOFF` prefill panel.
5. Opened Queue again normally and checked whether a queue entry was created.
6. Cancelled #53 as cleanup.

### Expected result

Host should be able to move a late reservation into the live queue/waitlist without losing reservation context, then seat the party later.

### Actual result

`Send to queue` navigated to Queue and displayed prefill instructions, but it did not create a linked queue entry automatically. After navigating to Queue normally, the prefill/context was gone and the queue showed `0 reservation-linked` entries.

### Evidence observed

- Reservation handoff panel said `Reservation #53 is ready for queue handoff`.
- Queue page still showed:
  - `3 active`
  - `0 reservation-linked`
  - only old QA R2 queue entries visible.
- #53 remained `BOOKED` until manually cancelled.

### Defects

1. Reservation-to-queue handoff is not durable unless the host completes the add form immediately.
2. Queue does not clearly show a linked reservation after clicking `Send to queue`.
3. Existing stale queue entries dominate the board and obscure fresh testing.

### Improvement notes

- Make `Send to queue` create a linked queue entry directly, or make the prefilled form persistent until submitted/cleared.
- Add reservation ID/source visibly on queue cards.
- Add cleanup/archive tooling for stale QA/backlog queue entries.

### Cleanup performed

Reservation #53 was cancelled. No queue entry for #53 remained visible.

---

## Result - R3-E2E-054

Scenario: No-show reservation releases assigned table
Run ID: `SKR-R3-20260719-E054`
Browser/device: Desktop in-app browser
Roles simulated: Customer, host
Status: `FAIL FOR NO-SHOW ACTION / CANCEL RELEASE WORKS`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 6/10 |
| UI/UX clarity | 5/10 |
| Workflow speed | 6/10 |
| Layout/stability | 7/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Created public reservation:
   - Reservation: `#54`
   - Name: `SKR-R3-20260719 E054 NoShowRelease`
   - Date/time: `2026-07-29 09:00`
   - Party: `2`
2. Opened staff Reservations for July 29 and searched by phone.
3. Assigned #54 to T07.
4. Clicked `Mark as no-show`.
5. Attempted to confirm the no-show modal.
6. Since no-show confirm did not complete, reloaded and cancelled #54 as cleanup.

### Expected result

No-show should mark reservation as no-show and release the assigned/held table from active arrival workflow.

### Actual result

Assignment to T07 worked. The no-show modal appeared, but the browser-accessible confirm control was ambiguous/non-functional in this run; the reservation stayed `BOOKED` with T07 assigned. Cancellation did work and released the table assignment.

### Evidence observed

- After assignment, #54 showed:
  - `BOOKED`
  - `T07`
  - `Table is planned. Seat the guest from here when they arrive.`
- No-show modal text appeared:
  - `The guest did not show up. This will free the table and record the no-show.`
- Attempting to confirm still left #54 as `BOOKED T07`.
- Cancellation changed #54 to `CANCELLED` and table value returned to `—`.

### Defects

1. No-show confirmation action did not complete from browser automation.
2. Row action and modal confirmation use the same label, creating ambiguity.
3. Need verify whether this is an accessibility wiring issue or a functional click-handler issue.

### Improvement notes

- Give modal confirmation a distinct accessible label: `Confirm no-show for reservation #54`.
- Add success toast and immediate release confirmation.
- Add automated browser regression for no-show release.

### Cleanup performed

Reservation #54 was cancelled after the failed no-show attempt.

---

## Result - R3-E2E-055

Scenario: Queue quoted wait time updates after seating others
Run ID: `SKR-R3-20260719-E055`
Browser/device: Desktop in-app browser
Roles simulated: Host
Status: `PARTIAL PASS WITH QUEUE POLISH ISSUES`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 7/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | 7/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened Queue at `https://staff.sakorio.com/queue?qa=r3-e2e055`.
2. Observed existing stale queue entries with 470+ minute waits.
3. Added two fresh queue entries:
   - `SKR-R3-20260719 E055-A`, phone `+6591000551`, 2 pax, 12 min quote.
   - `SKR-R3-20260719 E055-B`, phone `+6591000552`, 2 pax, 20 min quote.
4. Selected/seated E055-B to T07.
5. Reopened Queue to inspect lane counts and remaining entries.
6. Cancelled E055-A.
7. Cleared T07 from Tables so the floor was not left blocked.

### Expected result

After seating one party, remaining queue entries should show updated ready-table recommendations/quoted wait context so the host does not have to mentally recalculate.

### Actual result

Queue seating worked: E055-B moved to `Seated` on T07 and ready-table count dropped from 3 to 2. E055-A stayed in Waiting with its original 12-minute quote; no automatic revised quote or suggestion appeared. The board also remains cluttered by old 470+ minute QA entries.

### Evidence observed

- After adding, board showed `5 active`, `5 waiting`.
- E055-A showed `12 min quote`.
- E055-B showed `20 min quote`.
- After seating E055-B:
  - `4 waiting`
  - `1 seated`
  - E055-B `On T07`
  - ready tables for waiting parties dropped to `2`.
- E055-A was cancelled and disappeared.
- Tables then showed T07 as `IDLE TABLE`.

### Defects

1. Quoted wait time is static; it does not update or prompt host adjustment after seating another party.
2. Old active queue entries with 470+ minute waits make the live board noisy.
3. Queue form labels collide (`Phone` matched a filter as well as the phone input).
4. Cleanup/cancel controls are not sufficiently distinct when selected card and modal actions share labels.

### Improvement notes

- Add `Suggested wait update` after seat/no-show/cancel events.
- Add one-click stale queue cleanup/archive.
- Make form labels and filter labels unique for accessibility and automation.
- Add clear `Complete seated queue entry` lifecycle once a table handoff is finished.

### Cleanup performed

E055-A was cancelled. E055-B was seated, then T07 was closed/cleared back to idle.

---

## Result - R3-E2E-056

Scenario: Table cleaning/reset state between paid and available
Run ID: `SKR-R3-20260719-E056`
Browser/device: Desktop in-app browser
Roles simulated: Waiter, host
Status: `NEEDS SPECIFICATION`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 7/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened Tables at `https://staff.sakorio.com/tables?qa=r3-e2e056`.
2. Reviewed tables after multiple paid/cleared flows from R3-E2E-038, R3-E2E-040, R3-E2E-049, and R3-E2E-055.
3. Looked for intermediate states such as `Cleaning`, `Dirty`, `Needs reset`, or `Mark cleaned`.

### Expected result

If cleaning/reset is part of restaurant operations, it should sit clearly between paid/closed and available. If not part of scope, immediate availability should be an explicit product decision.

### Actual result

No cleaning/reset state was visible. Paid tables become `Available` / `Ready for order` after the clear/close action.

### Evidence observed

- T04, T05, T07, T08 and T09 appeared as idle/available after cleanup.
- No `Cleaning`, `Dirty`, `Reset`, or `Mark cleaned` controls appeared.

### Defects

1. Cleaning/reset workflow is absent.
2. Host may assume a cleared bill means physically cleaned table.

### Improvement notes

- Add optional `Needs cleaning` state after payment/close.
- If cleaning is out of scope, label the action as `Clear table / mark ready` so intent is explicit.

### Cleanup performed

No data changes were made in this case.

---

## Result - R3-E2E-057

Scenario: Customer opens wrong or expired QR token
Run ID: `SKR-R3-20260719-E057`
Browser/device: Desktop in-app browser
Roles simulated: Customer
Status: `PASS`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 9/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 9/10 |
| Layout/stability | 9/10 |
| Launch readiness | 8/10 |

### Steps actually performed

1. Opened invalid customer QR URL:
   - `https://order.sakorio.com/menu/not-a-real-table-token?qr_access=invalid-r3-e2e057`
2. Checked whether menu, order history, bill, or table/customer data was exposed.

### Expected result

Customer receives safe unavailable/expired/not-found message and no other table/session data is exposed.

### Actual result

Invalid QR URL safely showed `Menu` and `Not found`. No order/table/bill data was exposed.

### Evidence observed

- Page text: `Menu` / `Not found`.
- No `Order #`, `History`, `SGD`, table number, or customer data appeared.

### Defects

1. Message is safe but plain; it does not tell the customer what to do next.

### Improvement notes

- Replace `Not found` with friendly copy: `This QR code is invalid or expired. Please ask staff for a new QR code.`

### Cleanup performed

No data changes were made.

---

## Result - R3-E2E-058

Scenario: Same QR opened on two customer devices
Run ID: `SKR-R3-20260719-E058`
Browser/device: Desktop in-app browser
Roles simulated: Customer A, Customer B
Status: `BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 4/10 |
| UI/UX clarity | 4/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Opened POS at `https://staff.sakorio.com/pos?qa=r3-e2e058-059`.
2. Opened T01.
3. Clicked `Open customer QR`.
4. Checked for new customer tab, URL, modal, or clipboard value.

### Expected result

Same active QR should open on two customer devices and both submissions should join the same active session exactly once.

### Actual result

Could not obtain an active QR URL. Same multi-device QR behavior remains untested.

### Evidence observed

- Tab count did not change.
- Clipboard remained empty.
- Staff URL stayed on `tableId=1`.
- `Open customer QR` showed no visible success/failure feedback.

### Defects

1. Active QR handoff is still unavailable from POS.

### Improvement notes

- Fix QR handoff before retesting customer multi-device ordering.

### Cleanup performed

No customer order was created.

---

## Result - R3-E2E-059

Scenario: Customer cart abandoned, then table is closed
Run ID: `SKR-R3-20260719-E059`
Browser/device: Desktop in-app browser
Roles simulated: Customer, cashier
Status: `BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 4/10 |
| UI/UX clarity | 4/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Reused the active QR handoff attempt from R3-E2E-058.
2. Attempted to reach customer QR menu/cart state.

### Expected result

Customer abandoned cart should be blocked from submission after the table/session closes, with a clear explanation.

### Actual result

Could not create customer QR cart because active QR URL is unavailable.

### Evidence observed

- POS QR handoff produced no customer URL or modal.

### Defects

1. Abandoned QR cart closure behavior remains unverified.

### Improvement notes

- After QR is fixed, test stale customer cart submission after:
  - payment started
  - payment completed
  - table cleared
  - new session opened on same table.

### Cleanup performed

No customer order/cart was created.

---

## Result - R3-E2E-060

Scenario: Special instructions with unsafe-looking text
Run ID: `SKR-R3-20260719-E060`
Browser/device: Desktop in-app browser
Roles simulated: Customer, kitchen
Status: `BLOCKED / NEEDS INPUT FIELD`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 6/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Attempted active QR path; blocked by missing QR handoff.
2. Inspected POS table menu/cart controls for item notes or special-instruction text areas.
3. Added `Coffee` to a local POS cart and inspected the cart before clearing it.

### Expected result

Special-instruction fields should accept punctuation, HTML-like text, apostrophes, newline, emoji, and non-Latin text, then display safely in kitchen/orders.

### Actual result

No special-instructions field was visible in the POS cart/menu flow, and QR was unavailable. The unsafe-text path could not be executed.

### Evidence observed

- Product cards immediately add items.
- Cart showed item, quantity and total, but no notes/customization field.
- QR customer path remains blocked.

### Defects

1. Item-level special instructions are not visible in POS.
2. QR instructions path cannot be tested while QR handoff is broken.

### Improvement notes

- Add optional item notes with safe rendering in Kitchen/Orders.
- Retest with HTML-like and multilingual text once the input exists.

### Cleanup performed

The local POS cart was cleared; no order submitted.

---

## Result - R3-E2E-061

Scenario: Required modifier missing on QR and POS
Run ID: `SKR-R3-20260719-E061`
Browser/device: Desktop in-app browser
Roles simulated: Customer, cashier
Status: `NEEDS SPECIFICATION`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 6/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Inspected POS product cards and cart controls.
2. Checked visible menu items for required modifier prompts.
3. Confirmed QR path could not be reached.

### Expected result

QR and POS should enforce required modifiers consistently if modifier-enabled products exist.

### Actual result

No modifier-enabled items or required modifier prompts were visible in the seeded menu. Products add directly to cart.

### Evidence observed

- Product cards shown: Chile Relleno, Coca Cola, Coffee, Enchiladas, Mole Poblano, Pozole, Tacos de Carne Asada, Tecate Light, Tecate Roja.
- No modifier selection UI appeared.

### Defects

1. Modifier feature is not discoverable in the launch menu.

### Improvement notes

- If modifiers are in scope, seed at least one required modifier item for QA.
- If out of scope, document this as a post-launch feature.

### Cleanup performed

No order submitted.

---

## Result - R3-E2E-062

Scenario: Duplicate same item with different modifiers stays distinct
Run ID: `SKR-R3-20260719-E062`
Browser/device: Desktop in-app browser
Roles simulated: Customer, kitchen
Status: `NEEDS SPECIFICATION`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 6/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Reused POS menu inspection from R3-E2E-061.
2. Looked for modifier-enabled products or item customization controls.

### Expected result

Same product with different modifiers should remain as distinct lines with correct labels/pricing.

### Actual result

No modifier-enabled product was visible, so the case cannot be executed.

### Evidence observed

- POS product cards add directly to cart.
- No modifier labels, required options, add-ons, or custom pricing controls appeared.

### Defects

1. No seeded modifier scenario exists for browser QA.

### Improvement notes

- Seed a test product such as `Noodle soup` with required soup/spice modifiers and optional add-ons.
- Ensure bill/kitchen distinguish same base item with different modifiers.

### Cleanup performed

No order submitted.

---

## Result - R3-E2E-063

Scenario: Discount requires manager and recalculates bill correctly
Run ID: `SKR-R3-20260719-E063`
Browser/device: Desktop in-app browser
Roles simulated: Cashier, manager
Status: `NEEDS SPECIFICATION / NOT VISIBLE`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 6/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Opened active POS table/cart.
2. Added an item locally.
3. Inspected cart, Bill/Pay, and visible controls for discount actions.
4. Cleared the local cart without submitting.

### Expected result

Discount flow should require authorization, recalculate totals correctly, and record audit data.

### Actual result

No discount action was visible in POS cart or payment entry area.

### Evidence observed

- Cart showed `Coffee`, `SGD 2.50`, quantity, total, and Checkout.
- No `Discount`, `%`, `Comp`, `Promo`, `Manager approve`, or adjustment field appeared.

### Defects

1. Discount workflow is absent or not discoverable.

### Improvement notes

- Add manager-only discount with reason, type, amount, and receipt/report visibility.
- If discounts are intentionally not supported at launch, document policy in Settings/Reports.

### Cleanup performed

The local cart was cleared; no order submitted.

---

## Result - R3-E2E-064

Scenario: Service charge/tax/rounding visible before payment
Run ID: `SKR-R3-20260719-E064`
Browser/device: Desktop in-app browser
Roles simulated: Cashier
Status: `PARTIAL / QR BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 6/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Opened a POS table.
2. Added `Coffee` to cart.
3. Inspected cart totals before payment.
4. Cleared the local cart.

### Expected result

Staff and customer should see matching subtotal, tax, service charge, rounding, and total before payment.

### Actual result

POS showed item total and final total only. No subtotal/tax/service-charge/rounding breakdown appeared. QR/customer side could not be compared because active QR handoff is blocked.

### Evidence observed

- Cart showed:
  - `Coffee`
  - `SGD 2.50`
  - `Items 1 item`
  - `Total SGD 2.50`
- No `Subtotal`, `Tax`, `GST`, `Service charge`, or `Rounding` line appeared.

### Defects

1. Charge breakdown is not visible before payment.
2. QR/POS total comparison remains blocked by QR handoff issue.

### Improvement notes

- Add explicit bill breakdown even when charges are zero.
- Use same bill component renderer for POS and QR.

### Cleanup performed

The local cart was cleared; no order submitted.

---

## Result - R3-E2E-065

Scenario: Takeaway order without table
Run ID: `SKR-R3-20260719-E065`
Browser/device: Desktop in-app browser
Roles simulated: Cashier
Status: `NEEDS SPECIFICATION / NOT SUPPORTED IN POS`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 7/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 6/10 |

### Steps actually performed

1. Opened POS root at `https://staff.sakorio.com/pos?qa=r3-e2e065`.
2. Looked for takeaway/counter sale/start order without table.
3. Inspected visible controls.

### Expected result

If takeaway is supported, cashier should be able to start an order without selecting a table. If unsupported, POS should make table-only policy clear.

### Actual result

POS is table-first. The header says `Pick a table, build the order, take payment.` There is no visible takeaway/counter-sale start action.

### Evidence observed

- POS root showed table grid only.
- Visible actions were table cards, `Start order`, and `Orders`.
- No `Takeaway`, `Counter sale`, `Walk-in order`, or non-table checkout action appeared.

### Defects

1. Takeaway/non-table order policy is not implemented or not discoverable.

### Improvement notes

- Add `Takeaway / Counter order` as a separate POS lane if launch requires non-table sales.
- Otherwise document table-only POS behavior.

### Cleanup performed

No order submitted.

---

## Result - R3-E2E-066

Scenario: Reservation customer changes party size after arrival
Run ID: `SKR-R3-20260720-E066`
Browser/device: Desktop in-app browser
Roles simulated: Customer, host
Status: `PASS WITH POLISH`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 9/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 8/10 |

### Steps actually performed

1. Created/located reservation `#55` for `SKR-R3-20260720 E066 PartyChange`.
2. Opened the staff Reservations page after signing back in through the browser.
3. Edited party size from `2` to `4`.
4. Saved the reservation.
5. Opened the assign-table drawer.
6. Cancelled the test reservation after verification.

### Expected result

Host should be able to update party size and only assign a table that fits the new pax count.

### Actual result

Party size saved as `4 guests`. Assignment options were limited to 4-seat tables.

### Evidence observed

- Reservation `#55` displayed `BOOKED`, `4 guests`, no assigned table after edit.
- Assign table drawer offered 4-seat tables such as T04, T05, T01, T02, and T03.
- 2-seat tables were not offered for the updated 4-guest party.

### Defects

1. The scenario name says “after arrival”, but there is no explicit “arrived” state before seating; the workflow is edit-before-seating.
2. Browser session expiry during public-to-staff switching forced a login step, which slows real host handoff QA.

### Improvement notes

- Add an explicit `Arrived` action/state if arrival-before-seating is a supported restaurant workflow.
- Keep reservation edit fields visibly enabled/loading-safe; during the modal load, date/time controls briefly look disabled even though retained values save correctly.

### Cleanup performed

Cancelled reservation `#55`.

---

## Result - R3-E2E-067

Scenario: Move party after ordering but before payment
Run ID: `SKR-R3-20260720-E067`
Browser/device: Desktop in-app browser
Roles simulated: Host, cashier
Status: `NOT VISIBLE / NEEDS SPECIFICATION`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 4/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Opened Tables at `https://staff.sakorio.com/tables?qa=r3-e2e067-068`.
2. Inspected table cards and visible actions.
3. Tried to locate move/transfer controls.

### Expected result

Host should be able to move an active party from one table to another while keeping current orders, customer/session, QR access, and bill state intact.

### Actual result

No visible or accessible move/transfer-party control was found. The `More` controls appeared in the page text but were not accessible as normal named buttons during browser interaction.

### Evidence observed

- Table cards showed actions such as `Orders`, `Start order`, and `More`.
- No `Move`, `Transfer`, `Change table`, or equivalent action appeared.

### Defects

1. Table move/transfer workflow is absent or hidden.
2. `More` action discoverability/accessibility needs improvement.

### Improvement notes

- Add a clear `Move table` action inside each occupied/open table card.
- Require confirmation and show exactly what moves: reservation/customer, open bill, QR token, kitchen tickets, and table status.

### Cleanup performed

No data changed.

---

## Result - R3-E2E-068

Scenario: Combine two active tables into one bill decision
Run ID: `SKR-R3-20260720-E068`
Browser/device: Desktop in-app browser
Roles simulated: Host, cashier
Status: `NEEDS SPECIFICATION / NOT SUPPORTED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 4/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Reused Tables inspection from R3-E2E-067.
2. Looked for combine/merge table or combine-bill controls.

### Expected result

Cashier should be able to combine two active tables into one bill or explicitly see that combine-bill is unsupported.

### Actual result

No merge/combine-bill action was visible.

### Evidence observed

- No controls matching `Merge`, `Combine`, `Join bill`, `Split/merge`, or similar appeared on table cards.

### Defects

1. Combine bill/table policy is undefined in the UI.

### Improvement notes

- If launch needs this, add manager-controlled `Combine bill` with audit reason.
- If out of scope, add a short POS/table help note so staff know to settle tables separately.

### Cleanup performed

No data changed.

---

## Result - R3-E2E-069

Scenario: Split bill by item decision
Run ID: `SKR-R3-20260720-E069`
Browser/device: Desktop in-app browser
Roles simulated: Cashier
Status: `PASS AS UNSUPPORTED POLICY / NEEDS SPECIFICATION`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 5/10 |
| Workflow speed | 7/10 |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Opened POS at `https://staff.sakorio.com/pos?qa=r3-e2e069`.
2. Selected table T05.
3. Added `Coffee` and `Coca Cola`.
4. Opened checkout drawer.
5. Inspected payment methods and split controls.
6. Navigated away without paying.

### Expected result

If item-level split bill is supported, cashier should choose items/amounts per payment. If unsupported, the checkout should clearly say full-bill payment only.

### Actual result

Checkout showed one full amount due and payment choices only. No split bill action was visible.

### Evidence observed

- Payment drawer showed `SGD 5.50`, `2 items · T05`.
- Payment methods shown: `STAFF CASH`, `TERMINAL`, and terminal charge button.
- No `Split`, `Partial`, `By item`, or `Pay selected` control appeared.

### Defects

1. Split-bill policy is not communicated to cashiers.

### Improvement notes

- Add either a simple `Split bill` workflow or a disabled/help note saying `Split bill is not available yet`.
- Keep the full-bill payment path clear as the default.

### Cleanup performed

No payment submitted; local cart was abandoned.

---

## Result - R3-E2E-070

Scenario: Kitchen overload view with many active tickets
Run ID: `SKR-R3-20260720-E070`
Browser/device: Desktop in-app browser
Roles simulated: Kitchen
Status: `PARTIAL / BACKLOG DEFECT`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 5/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | 6/10 |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Opened Kitchen at `https://staff.sakorio.com/kitchen?qa=r3-e2e070-071`.
2. Inspected ticket lanes, backlog summary, and current active tickets.
3. Avoided mutating kitchen statuses because paid/cleared historical tickets are still pending.

### Expected result

Kitchen should show only live-service tickets in clear priority order, with a safe backlog mode for unresolved stale tickets.

### Actual result

Kitchen has useful lanes and a backlog warning, but many paid/cleared historical orders remain pending for hours.

### Evidence observed

- Counters: `All 10`, `Kitchen 1`, `Beverages 10`, `Review backlog 70`.
- Oldest visible wait was around `3h 19m` to `3h 22m`.
- Visible pending tickets included paid orders `#71`, `#72`, `#74`, `#75`, `#76`, `#77`, `#78`, `#79`, `#80`, and `#81`.

### Defects

1. Paid/closed table orders remain pending in KDS.
2. Backlog is large enough to make the live kitchen display noisy.
3. Status buttons labeled only `Pending` do not clearly guide the next kitchen action.

### Improvement notes

- Link order/table close lifecycle to kitchen-ticket lifecycle.
- Add clearer action labels: `Start prep`, `Ready`, `Served`, `Cancel/stale`.
- Add manager-safe stale ticket cleanup with bulk selection and reason capture.

### Cleanup performed

No ticket statuses changed.

---

## Result - R3-E2E-071

Scenario: Beverage and kitchen complete at different times
Run ID: `SKR-R3-20260720-E071`
Browser/device: Desktop in-app browser
Roles simulated: Kitchen, beverage station, waiter
Status: `BLOCKED / PARTIAL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 5/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | 6/10 |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Reused Kitchen inspection from R3-E2E-070.
2. Checked station filters and mixed ticket display.
3. Avoided changing states because KDS backlog already contains stale pending paid orders.

### Expected result

Kitchen and beverages should be independently actionable, and waiter handoff should show partial readiness clearly.

### Actual result

Station filters exist, but partial readiness could not be validated safely against a clean mixed active order.

### Evidence observed

- Kitchen displayed station counters `Kitchen 1` and `Beverages 10`.
- Ticket `#79` showed multiple beverage lines pending.
- No clear waiter-facing partial-ready handoff was verified.

### Defects

1. KDS lifecycle noise blocks confident validation of partial readiness.
2. Staff-facing handoff for mixed station completion is not obvious.

### Improvement notes

- Create a clean mixed food+beverage QA fixture/order after stale backlog cleanup.
- Show partial-ready badges in Orders/Tables, e.g. `Drinks ready · Food pending`.

### Cleanup performed

No ticket statuses changed.

---

## Result - R3-E2E-072

Scenario: Staff profile selection before clock-in
Run ID: `SKR-R3-20260720-E072`
Browser/device: Desktop in-app browser
Roles simulated: Staff
Status: `PARTIAL PASS / CLOCK-IN BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 7/10 |
| UI/UX clarity | 7/10 |
| Workflow speed | 7/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened My Shift at `https://staff.sakorio.com/my-shift?qa=r3-e2e072-073`.
2. Inspected staff profile selector and current shift availability.
3. Attempted to select the waiter profile.

### Expected result

Staff should choose their own profile before clock-in, then select a valid shift and proceed with photo clock-in.

### Actual result

Profile selector exists and explains the workflow. Clock-in was blocked because no shift was currently open for attendance.

### Evidence observed

- Page text: `Choose a staff profile, select the scheduled shift, take a live photo, and clock in.`
- Profile options displayed: `Ajisen — Owner`, `Jason Tan — Waiter`.
- Current status: `Off shift / Ready`.
- Message: `No shift is currently open for attendance.`
- Disabled button: `No shift available to clock in`.
- Closed scheduled shift visible: `Sat 18 9:00 AM - 10:00 PM QA Browser E2E Window closed`.

### Defects

1. No current-shift QA fixture exists, so clock-in cannot be completed in browser.
2. Programmatic selection did not visibly switch from owner to waiter during the test; verify selector binding manually in a polish pass.

### Improvement notes

- Add a safe test/current shift fixture for browser QA.
- Surface next eligible shift and clock-in window/grace period prominently.

### Cleanup performed

No attendance records created.

---

## Result - R3-E2E-073

Scenario: Early clock-in and late clock-in handling
Run ID: `SKR-R3-20260720-E073`
Browser/device: Desktop in-app browser
Roles simulated: Staff
Status: `NEEDS SPECIFICATION / BLOCKED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 6/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Reused My Shift inspection from R3-E2E-072.
2. Looked for early/late clock-in states and policy messaging.

### Expected result

Staff should see whether they are early, on time, late, or outside allowed clock-in windows.

### Actual result

No current shift was open, and no early/late/grace-period policy was visible.

### Evidence observed

- Only visible scheduled shift was closed.
- Clock-in button was disabled because no shift was available.

### Defects

1. Early/late attendance policy is not testable from current UI state.
2. No visible grace-period or lateness explanation appears when no shift is open.

### Improvement notes

- Add explicit attendance states: `Too early`, `Open for clock-in`, `Late`, `Missed`, and `Closed`.
- Display configured grace windows from Settings/Timetable.

### Cleanup performed

No attendance records created.

---

## Result - R3-E2E-074

Scenario: Staff swap shift request
Run ID: `SKR-R3-20260720-E074`
Browser/device: Desktop in-app browser
Roles simulated: Staff, manager
Status: `NEEDS SPECIFICATION / PARTIAL`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 6/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Opened Timetable at `https://staff.sakorio.com/working-plan?qa=r3-e2e074-075`.
2. Inspected calendar, roster, staff filter, and shift actions.
3. Looked for swap/reassign request workflow.

### Expected result

Staff should be able to request a shift swap, and managers should be able to approve/reassign cleanly.

### Actual result

Timetable is usable for manager scheduling, but no self-service swap request was visible.

### Evidence observed

- Route opened as `/working-plan/calendar`.
- Header: `Timetable`; actions: `Apply to month`, `Add shift`, `Week`, `Calendar`.
- Staff filters: `All staff`, `Ajisen Owner`, `Jason Tan Waiter`.
- Roster showed `Ajisen Owner` and `Jason Tan Waiter`.
- Shift actions included schedule/delete buttons.
- No `Swap shift`, `Request swap`, `Approve swap`, or `Reassign` control appeared.

### Defects

1. Shift swap workflow is not implemented or not discoverable.

### Improvement notes

- Add staff request flow with manager approval.
- Keep manager reassignment separate from staff self-service swap.

### Cleanup performed

No shifts changed.

---

## Result - R3-E2E-075

Scenario: Leave request overlaps scheduled shift
Run ID: `SKR-R3-20260720-E075`
Browser/device: Desktop in-app browser
Roles simulated: Staff, manager
Status: `NOT IMPLEMENTED`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 5/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Reused Timetable inspection from R3-E2E-074.
2. Inspected leave/MC/annual leave area.

### Expected result

Leave request should detect scheduled-shift overlap, request manager approval, deduct entitlement, and update timetable coverage.

### Actual result

Leave balances are explicitly marked coming soon.

### Evidence observed

- Section text: `Annual leave / MC balances COMING SOON`.
- Status: `Ledger not enabled`.
- Annual leave and MC/sick leave described as coming soon.

### Defects

1. Leave ledger, entitlement deduction, overlap conflict detection, and approvals are not implemented.

### Improvement notes

- Add leave ledger models and UI only after defining launch policy.
- In timetable, show leave blocks beside shifts and warn if coverage drops.

### Cleanup performed

No shifts or leave records changed.

---

## Result - R3-E2E-076

Scenario: User deactivation while staff has future shifts
Run ID: `SKR-R3-20260720-E076`
Browser/device: Desktop in-app browser
Roles simulated: Manager
Status: `NEEDS SPECIFICATION / NOT VISIBLE`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 5/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 5/10 |

### Steps actually performed

1. Opened Users at `https://staff.sakorio.com/users?qa=r3-e2e076`.
2. Inspected staff list and available user actions.
3. Avoided deleting the real waiter account.

### Expected result

Manager should deactivate/suspend staff safely, with warnings for future shifts and historical record preservation.

### Actual result

User management exposes edit/delete actions but no visible deactivate/suspend action.

### Evidence observed

- Users listed included owner `Ajisen` and waiter `Jason Tan`.
- Visible actions: `Add User`, `Edit user`, `Delete user`.
- No `Deactivate`, `Disable`, `Suspend`, or future-shift warning was visible.

### Defects

1. Deactivation workflow is absent.
2. Delete is risky as the primary visible offboarding action.

### Improvement notes

- Add `Deactivate user` as the preferred offboarding action.
- Warn if the staff member has future shifts and provide reassignment/cancel options.
- Preserve attendance/orders/audit history.

### Cleanup performed

No users changed.

---

## Result - R3-E2E-077

Scenario: Role permission boundary across tabs
Run ID: `SKR-R3-20260720-E077`
Browser/device: Desktop in-app browser
Roles simulated: Owner, waiter
Status: `PASS BY PRIOR BROWSER REGRESSION + CURRENT OWNER RECHECK`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 8/10 |
| UI/UX clarity | 8/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 8/10 |

### Steps actually performed

1. Rechecked current owner navigation from the Users page.
2. Cross-referenced earlier browser-executed waiter permission case in this same round.

### Expected result

Owner should access all management tabs. Waiter should be blocked from management-only areas even by direct URL.

### Actual result

Owner navigation exposes management tabs. Earlier waiter browser regression showed waiter nav excluded management tabs and direct restricted URLs redirected back to dashboard.

### Evidence observed

- Owner nav included Home, My shift, POS, Orders, Reservations, Queue, Tables, Kitchen & beverages, Customers, Products, Catalog, Reports, Timetable, Inventory, Users, Contracts, Settings.
- Earlier R3-E2E-037 waiter test showed Users/Reports/Settings/Inventory were excluded and direct restricted routes redirected.

### Defects

1. Role-boundary QA still depends on a synthetic waiter setup each time; a stable role-fixture account would make repeated release QA faster.

### Improvement notes

- Maintain fixed QA accounts for owner, cashier, waiter, kitchen, and manager roles.
- Add a small visible role banner on restricted-page redirects so staff understand why they were redirected.

### Cleanup performed

No users changed in this case.

---

## Result - R3-E2E-078

Scenario: End-of-day close/report reconciliation
Run ID: `SKR-R3-20260720-E078`
Browser/device: Desktop in-app browser
Roles simulated: Manager
Status: `PARTIAL PASS / CLOSE LOCK MISSING`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 7/10 |
| UI/UX clarity | 8/10 |
| Workflow speed | 8/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened Reports at `https://staff.sakorio.com/reports?qa=r3-e2e078`.
2. Inspected date range, summary cards, payment methods, report tabs, close-flow checklist, and export actions.

### Expected result

Manager should reconcile sales, payment methods, tables, kitchen backlog, staff sessions, and export reports. Ideally, the day can be closed/locked with audit.

### Actual result

Reports provide a strong close checklist and exports, but no final end-of-day close/lock action exists.

### Evidence observed

- Range: `2026-06-20 - 2026-07-20`.
- Collected: `SGD 975.00`; average ticket `SGD 19.50`; `50 orders`.
- Payment methods: HitPay `9`, Terminal `33`, Cash `8`.
- Checklist items: Tables, Orders, Kitchen, Staff sessions, Export reports.
- Export actions: `Export CSV`, `Export Excel`, `Export payment CSV`, `Download Excel`, `Download attendance workbook`.
- Attendance audit: `0 open`, `0 missing photos`.

### Defects

1. No `Close day`, `Lock day`, or `Manager sign-off` step.
2. Checklist links include `/orders`, while the working staff route observed elsewhere is `/staff/orders`; verify route consistency.
3. Report includes historical `Cash` method even though customer QR payment policy removed cash; staff cash policy should be explicit.

### Improvement notes

- Add end-of-day close record with manager, timestamp, totals, outstanding blockers, and export snapshot.
- Add warnings before sign-off if active tables, unpaid bills, or kitchen backlog remain.
- Separate `payment method policy` for staff cashier vs customer QR.

### Cleanup performed

No reports exported or data changed.

---

## Result - R3-E2E-079

Scenario: Audit trail for correction actions
Run ID: `SKR-R3-20260720-E079`
Browser/device: Desktop in-app browser
Roles simulated: Manager, cashier
Status: `NOT IMPLEMENTED / NOT VISIBLE`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | N/A |
| UI/UX clarity | 5/10 |
| Workflow speed | N/A |
| Layout/stability | 8/10 |
| Launch readiness | 4/10 |

### Steps actually performed

1. Opened Orders at `https://staff.sakorio.com/staff/orders?qa=r3-e2e079`.
2. Inspected active/history tabs and visible controls for correction actions.
3. Searched visible page text for audit/correction terms.

### Expected result

Void, refund, reopen, discount, and correction actions should require reason/authorization and show actor/timestamp audit history.

### Actual result

Orders history shows paid order records but no visible correction actions or audit trail.

### Evidence observed

- Orders tabs: `Active Orders`, `Not Paid Yet`, `Order History`.
- Order history listed paid orders `#81` down to older orders.
- Visible text did not include `audit`, `void`, `refund`, `reopen`, `reason`, `override`, `correction`, `actor`, or `manager`.

### Defects

1. Correction actions are absent or hidden.
2. Audit trail is not visible to managers.

### Improvement notes

- Add manager-only correction actions with required reason.
- Add immutable audit log entries: actor, role, action, target order/table, before/after amount/status, timestamp.
- Show a compact `Audit` drawer per order and summarize exceptions in Reports.

### Cleanup performed

No orders changed.

---

## Result - R3-E2E-080

Scenario: Multi-tab disaster recovery during active service
Run ID: `SKR-R3-20260720-E080`
Browser/device: Desktop in-app browser
Roles simulated: Customer, cashier, kitchen, manager
Status: `PARTIAL PASS`

### Scores

| Score area | Score |
|---|---:|
| Functional correctness | 7/10 |
| UI/UX clarity | 6/10 |
| Workflow speed | 6/10 |
| Layout/stability | 8/10 |
| Launch readiness | 7/10 |

### Steps actually performed

1. Opened a previously issued customer QR URL.
2. Opened Orders in a separate tab and refreshed it.
3. Opened Kitchen in a separate tab and refreshed it.
4. Opened POS in a separate tab and refreshed it.
5. Waited for POS recovery after observing an extended loading state.

### Expected result

During multi-tab use, staff/customer pages should reload without losing state, and active service pages should recover with clear loading and retry feedback.

### Actual result

Orders and Kitchen remained stable across refresh. QR correctly blocked ordering for a closed table. POS initially showed `Syncing...` / `0 loaded` after reload, then recovered after several seconds.

### Evidence observed

- QR page showed `Table Closed` and `This table is not currently accepting orders. Please ask a member of staff for assistance.`
- Orders before/after refresh consistently showed Order History count `80` and latest paid orders `#81`, `#80`, `#79`.
- Kitchen before/after refresh consistently showed `All 10`, `Review backlog 70`, and same pending ticket list.
- POS initially showed `TABLES LOADED Syncing`, `OPEN BILLS Syncing`, `CATALOG Syncing`, then recovered to `TABLES LOADED 10`, `OPEN BILLS 0`, `CATALOG 9`.
- No browser console errors were captured for the POS tab during the wait.

### Defects

1. POS loading state can look broken during multi-tab reload because it shows `0 loaded` before data arrives.
2. Disaster-recovery testing is still limited by closed QR links and KDS stale backlog.

### Improvement notes

- Replace transient `0 loaded` with a clearer loading skeleton until the first data response completes.
- Add timeout/retry copy such as `Still syncing floor data... Retry`.
- Add a release QA fixture that creates a fresh active QR session and mixed station ticket for disaster recovery tests.

### Cleanup performed

No order submitted and no status changed.
