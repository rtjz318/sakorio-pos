# Sakorio live order, payment, and queue regression — 30 August 2026

## Scope

This pass continued hosted-browser acceptance against `staff.sakorio.com` and `order.sakorio.com`. It exercised a real customer table session, kitchen routing, print-job generation, both customer payment-request paths, and public/host queue real-time behaviour. Software fixes discovered during the run were built, deployed, and re-tested live before this report was written.

## Release evidence

| Change | Commit | Hosted verification |
|---|---|---:|
| Keep the customer menu usable while building a cart | `1742435f` | Pass |
| Surface customer terminal notes in POS | `9554aeff` | Pass |
| Connect the host Queue board to live updates | `8971e5cc` | Pass |

The hosted footer displayed `2.1.6 8971e5cc` at the end of the pass.

## E2E-REG-272 — table QR order to kitchen and payment request

### Customer order

1. Opened the signed fixed QR for T09.
2. Added A1 Kimchi (SGD 4.00), Green Tea (Hot or Cold) (SGD 5.00), and Rice (SGD 3.00).
3. Confirmed that the customer menu did not request a customer name.
4. Submitted the order as order 272 for SGD 12.00.
5. Confirmed that the current order displayed only the active table session.

### Defect found and fixed: cart obstructed menu selection

Before the fix, the first added item automatically expanded the cart sheet to approximately 60% of the viewport. The sheet covered the menu and made subsequent product buttons appear available while intercepting interaction. Its summary and chevron were also non-semantic elements.

Fix:

- keep the cart collapsed while the guest builds the order;
- expose a real `Review current cart` / `Collapse current cart` button;
- add region and expanded-state accessibility semantics;
- remove the misleading pointer behaviour from the decorative handle.

Live result: all three items were added consecutively without the menu being covered.

### Kitchen and beverage routing

- A1 Kimchi routed to Kitchen / Quick Bites.
- Rice routed to Kitchen / Noodle & Rice.
- Green Tea routed to Beverage / Drink Menu.
- Order 272 advanced Pending → Preparing → Ready → Served.
- Serving displayed `Ticket #272 served`, the three-item delivered count, and clearing feedback.
- The customer page changed to Delivered without a refresh and showed all three lines as delivered.

Result: **9.8/10 — pass.** Physical printer output remains outside browser scope.

### Print-job generation

The hosted Printing page contained exactly three order-272 station jobs:

- one Bar ticket;
- two Kitchen tickets.

All three were Pending with zero attempts because the page showed `ONLINE AGENTS 0/3`. There was no failed job requiring attention. This verifies item/station job creation, but not paper output.

Result: **8.0/10 — software routing passes; physical acceptance is blocked until the Android printer agent is online.**

### Customer payment choices and HitPay handoff

- `Pay Now` offered only HitPay and Card at Table; Cash was not exposed to the customer.
- HitPay created a real sandbox request and opened the Ji Dan Private Limited sandbox checkout.
- The description was `Order #272 at Ajisen Ramen - T09`.
- Sakorio immediately showed `Payment requested` on Tables and POS.
- Leaving the external checkout without payment did not lose the order; reopening the signed QR recovered order 272 and its Pay Now action.
- No sandbox payment was finalized during this pass.

Result: **9.2/10 — handoff and recovery pass; final webhook/paid/close lifecycle still requires an explicitly authorized sandbox settlement.**

### Card-at-table request and staff note

The customer selected Card at Table, entered `QA Order #272 — please bring card terminal`, and submitted Request Payment. The customer received the clear confirmation `Payment requested! A waiter will come to your table to process the payment.`

Defect found: the backend stored the marked customer note on the order, but the selected live bill did not display it to the cashier.

Fix:

- extract only marked `[CUSTOMER NOTE]` entries from the order notes;
- show the newest note in a prominent warning panel in both live-bill layouts;
- avoid exposing unrelated internal or kitchen notes as payment messages.

Live result: T09 / bill 272 displayed `Customer payment note` followed by the exact customer request.

Result: **9.8/10 — pass after deployed fix.**

## E2E-REG-Q003 — public queue to host ping and real-time reversal

### Public join

1. Opened the permanent host QR destination, `order.sakorio.com/waitlist/1`.
2. Joined as the marked two-person QA party `QA Regression 273`.
3. Received a large, accessible queue number, Q003.
4. Confirmed status, party size, parties ahead, live-update state, Save status link, and Leave queue action.

The page briefly reported the queue as unavailable during a deployment warm-up, then loaded normally after the backend stabilized. The public endpoint itself returned HTTP 200 with the correct CORS origin.

### Host board and customer ping

- After a manual refresh on the pre-fix host build, Q003 appeared with phone, party size, source, notes, table fit, and recommended T07 assignment.
- The host selected Notify guest.
- The already-open customer page changed instantly to `Your table is nearly ready` and asked the guest to return to the host stand.

### Defect found and fixed: host Queue never opened its WebSocket

The Queue component subscribed to `queueUpdates$` but never called the API service's WebSocket connection method. A customer-created entry therefore did not reach an already-open host board until Refresh.

Fix: connect the authenticated tenant WebSocket when the Queue component initializes.

Live verification used two independent authenticated staff tabs:

1. Host tab A remained open on Queue.
2. Host tab B changed Q003 from Notified back to Waiting.
3. Host tab A changed from Notified to Waiting without Refresh.
4. The customer page simultaneously changed back to `You are in the queue` and `Updated just now`.

Result: **9.8/10 — pass after deployed fix.**

## Build and compiler verification

| Check | Result |
|---|---:|
| Angular `production-static` build after customer-note fix | Pass |
| Angular `production-static` build after Queue WebSocket fix | Pass |
| Front container hot-reload compilation | Pass |
| Hosted footer for latest commit | Pass — `8971e5cc` |

Only the existing component-style budget and `dijkstrajs` CommonJS warnings remain; no TypeScript or Angular compiler errors remain.

## Outstanding physical and operational gates

1. **Android tablet is not connected to this workstation.** `adb devices -l` returned no devices, so this pass could not install/refresh the APK or inspect the native printer agent on hardware.
2. **Printing has 0/3 online agents.** Order 272's three station jobs are correctly queued but cannot print until an Android agent authenticates and connects to the XP-80T.
3. **Order 272 remains payment-requested and T09 remains open.** No payment was finalized and no table was closed during this pass.
4. **Q003 remains a marked QA queue entry.** It was left Waiting so destructive cleanup was not performed implicitly.
5. **Final sandbox acceptance remains.** It must cover successful HitPay webhook confirmation, customer/POS paid state, receipt generation, and the final close/reset confirmation.

## Launch assessment from this pass

The browser-visible table ordering, kitchen routing, payment-request, HitPay handoff, queue number, customer ping, and host/customer real-time update paths now pass. The two new UI/real-time defects discovered in this run were corrected and verified on the hosted build.

Overall browser software score: **9.6/10**.

Launch is not yet a full 10/10 because physical Android Bluetooth printing and a finalized sandbox payment/close-table cycle are still unverified, not because of an unresolved compiler or hosted-browser failure.
