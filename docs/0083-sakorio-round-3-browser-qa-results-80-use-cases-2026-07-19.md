# Sakorio POS Round 3 Browser QA Results - 80 Use Case Execution

Date started: 2026-07-19  
Source scenario brief: `docs/0082-sakorio-round-3-browser-qa-80-use-cases-2026-07-19.md`  
Execution method: Browser-only live workflow execution through Sakorio staff/customer domains  
Environment: `https://staff.sakorio.com`, `https://order.sakorio.com`, HitPay sandbox where applicable  
Run prefix: `SKR-R3-20260719`

## Summary status

| Case range | Status |
|---|---|
| R3-E2E-001 to R3-E2E-010 | Executed / attempted |
| R3-E2E-011 to R3-E2E-080 | Pending execution |

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
   - `Guests seated · 2`
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
- After adding Coca Cola, service loop showed `T08 · 1 item · SGD 3.00`, `1 in cart`.
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

- Unpaid T07 with Coffee showed `T07 · 1 item · SGD 2.50`, `1 in cart`, `Checkout`.
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
- After clicking `Add items`, the cart still showed `T08 · 1 item · SGD 2.50`.
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
