# Sakorio live UI/UX audit — customer, waiter, cashier

Date: 2026-07-26  
Surface tested: Live browser only  
Customer URL tested: `https://order.sakorio.com` table menu flow  
Staff URL tested: `https://staff.sakorio.com`  
Live frontend build observed: `2.1.6 b57fb5ce`  
Restaurant/menu data observed: Ajisen Ramen, 112 menu items

## Executive summary

The current UI/UX is launch-close and materially stronger than earlier passes. The POS table flow now feels aligned with the Tables workflow: staff can pick a table, add items, send to kitchen, see the bill, and keep payment controls on the right without leaving the service context. Customer QR ordering is also much clearer now: the customer is not asked for a name, categories break up the menu wall, current order status is visible, and payment options are correctly limited to HitPay or card-at-table.

Overall UI/UX readiness score: **8.9 / 10**

The product is workable for a real soft-launch, but I would still polish a few areas before calling it a “10/10” restaurant-grade experience:

1. Customer menu category navigation needs a sticky “jump bar” or active section indicator on long menus.
2. Product images lazy-load correctly, but only a subset is loaded at first view; the customer needs graceful placeholders/skeletons so it never feels broken.
3. Staff POS menu cards are compact and functional, but item names can still feel dense with 112 items.
4. Orders page initially shows “Loading orders…” for a few seconds; add a more service-friendly loading skeleton.
5. Live QA data should be cleaned/reset before physical launch rehearsal.

## Live journeys tested

### Journey A — closed customer QR state

Flow:

1. Opened an older table QR menu link.
2. Observed customer-facing state.

Result:

- Page showed “Table Closed”.
- Message was clear: “This table is not currently accepting orders. Please ask a member of staff for assistance.”
- No customer actions were available, which is correct for a closed session.

Score: **10 / 10**

UX notes:

- This is a good guardrail. Customers cannot order from stale QR sessions.
- The state is plain and understandable.

### Journey B — staff dashboard entry

Flow:

1. Logged into the live staff portal.
2. Landed on dashboard.
3. Reviewed main navigation and dashboard cards.

Result:

- Dashboard loaded successfully.
- Navigation was complete for manager/admin context.
- Dashboard cards clearly point to POS, Orders, Reservations, Queue, Tables, Kitchen, Products, Catalog, Customers, Timetable, Reports, Users, and Settings.

Score: **9 / 10**

UX notes:

- Strong operational overview.
- The dashboard is information-rich; for non-owner roles, the recent role-scope cleanup keeps it much less noisy.
- For manager/admin, it is still a lot of navigation, but acceptable because the manager needs breadth.

### Journey C — cashier opens POS floor board

Flow:

1. Opened POS.
2. Reviewed table board.
3. Checked table status summary.

Observed:

- Tables loaded: 10.
- Open bills before test order: 0.
- Paid today displayed.
- Catalog count displayed as 112.
- Tables showed statuses such as Available, Occupied, Open order, and Seated.

Score: **9 / 10**

UX notes:

- Table selection is much better than the older vertical-only POS flow.
- The board is readable and quick to scan.
- “Start order” and “Orders (count)” are easy enough to understand.

Polish recommendation:

- Add stronger visual separation between truly available tables and occupied/seated/open-bill tables.
- Consider using color-coded left borders or icons:
  - Green = available
  - Amber = seated/no order
  - Blue = open bill
  - Grey = closed/history

### Journey D — cashier selects table and opens service drawer

Flow:

1. Selected T07.
2. Observed active POS table service area.

Result:

- POS stayed on one page.
- T07 opened in a table service drawer.
- The QR block that used to clutter the top is no longer present.
- Staff can switch table, view current orders, add items, view bill/pay, and view history.

Score: **9.2 / 10**

UX notes:

- This now feels much closer to the Tables workflow the user liked.
- The service loop wording is useful.
- The launch guardrail is clear.
- The current order panel stays contextually close to the table.

Polish recommendation:

- The history count can be large and visually loud, e.g. “History 92”. Consider softening it with secondary styling so it does not compete with active service actions.

### Journey E — cashier adds item to POS cart

Flow:

1. Added `A12 Boiled Seasoned Egg`.
2. Observed cart and bill state.

Result:

- Item added successfully.
- Cart showed 1 item.
- Bill/pay total updated to SGD 2.00.
- Menu item count badge updated from plus to quantity.
- Cart area showed item, quantity controls, total, Send order, and Pay bill.

Score: **9 / 10**

UX notes:

- The add-to-cart interaction is fast and clear.
- No layout overlap was detected at desktop width.
- Product images were loaded in the POS menu view: 90 / 90 visible images loaded during the test.

Polish recommendation:

- Menu cards are compact, which is good for speed, but long names still feel dense. A slightly stronger hierarchy between item code, item name, and price would improve scan speed.

### Journey F — cashier payment panel

Flow:

1. Opened Bill / Pay after adding an item.
2. Reviewed payment methods.

Result:

- Staff payment area showed:
  - Staff Cash
  - Terminal
- It included explanatory copy:
  - “Customer QR checkout shows HitPay or card-at-table only. Cash is staff-only for counter settlement and manager reconciliation.”
- Payment action showed terminal charge amount.

Score: **8.8 / 10**

UX notes:

- The distinction between staff cash and customer payment is now much clearer.
- For staff/cashier, Staff Cash remains available, which is operationally useful.
- Customer payment separately excludes cash.

Polish recommendation:

- “Staff Cash” should stay visually labelled as internal/counter only. Current copy is good, but the label could be made even more explicit: “Counter cash — staff only”.

### Journey G — cashier sends ticket to kitchen

Flow:

1. Added `A12 Boiled Seasoned Egg`.
2. Sent the order to kitchen.
3. Observed POS response.

Result:

- Test ticket created: Order `#254`, Table `T07`.
- POS showed confirmation: order sent for T07.
- Table board updated:
  - Open bills became 1.
  - T07 changed to Open order.
  - Bill #254 became live.
- Service panel showed “Bill #254 in service”.

Score: **9.3 / 10**

UX notes:

- This is the strongest part of the staff workflow.
- The user does not get bounced to another page.
- The table remains the anchor point.

Polish recommendation:

- Add a small non-blocking toast after sending, e.g. “Sent to kitchen • #254 • T07”, then fade it after a few seconds.

### Journey H — kitchen receives ticket

Flow:

1. Opened Kitchen & beverage display after sending T07 order.
2. Checked new-ticket lane.

Result:

- Kitchen showed 1 active ticket.
- Ticket `#254 · T07` appeared in New tickets.
- Item showed:
  - `1x A12 Boiled Seasoned Egg`
  - Station: Kitchen
  - Category: Quick Bites
  - Status: Pending
- Lane structure was clear:
  - Send to prep
  - Working now
  - Hand off

Score: **9.2 / 10**

UX notes:

- Kitchen board is clean and focused.
- The empty-lane states are understandable.
- Full-screen and timer settings are discoverable.

Polish recommendation:

- The “Start ticket” button is clear, but in a noisy kitchen, larger touch targets and stronger color contrast for the next action would help.

### Journey I — staff Orders page sees active table order

Flow:

1. Opened Orders after sending T07 order.
2. Waited for data to load.

Result:

- Orders page eventually showed Active Orders: 1.
- T07 table group showed:
  - 1 active ticket
  - SGD 2.00 on this table
  - Latest #254
  - `1x A12 Boiled Seasoned Egg`
- Actions available:
  - Open table POS
  - View tickets

Score: **8.7 / 10**

UX notes:

- The table-based grouping is correct and much better than one ticket taking over the whole page.
- Search placeholder is useful: “Search #48, T07, table name, customer, item, payment...”

Polish recommendation:

- Initial “Loading orders...” lingered for a few seconds. Replace with skeleton rows/cards and a small “Syncing live orders…” state.

### Journey J — customer opens active QR/table menu

Flow:

1. Opened active T07 customer menu.
2. Reviewed customer ordering interface.

Result:

- Customer menu opened successfully once T07 had a live table session.
- Customer was not asked to enter a name.
- Current order status was visible at the top:
  - Pending
  - Order #254
  - SGD 2.00
  - Item pending
- Menu categories appeared:
  - All
  - Deep Fried Menu
  - Drink Menu
  - Izakaya Menu
  - Noodle & Rice Menu
  - Quick Bites
  - Stir Fried Menu
- Page was segmented with category headers and item counts.

Score: **9 / 10**

UX notes:

- Removing the customer name step improves the flow a lot.
- Category sections make the 112-item menu less intimidating.
- Current order visibility is good; customers can see what is already pending.

Polish recommendation:

- With 112 items, the page is still long. Add:
  - sticky category navigation
  - active category highlight while scrolling
  - “Back to top” button after scrolling past the first screen
  - optional search field for customers

### Journey K — customer adds an item

Flow:

1. Customer selected `A7 Edamame`.
2. Observed cart/add panel.

Result:

- Item add interaction opened correctly.
- Quantity input appeared.
- Special request field appeared with placeholder: “e.g. less spicy, no chilli”.
- Cart area showed:
  - 1 item
  - SGD 6.00
  - A7 Edamame
  - Add to order

Score: **8.8 / 10**

UX notes:

- Special request field is useful and friendly.
- Quantity control is simple.
- The add panel appears while still preserving the menu context.

Polish recommendation:

- Add stronger confirmation after “Add to order”, e.g. a sticky mini-cart update or toast. Customers need immediate reassurance that the item has joined the table order.

### Journey L — customer payment options

Flow:

1. Customer clicked Pay Now on active order.
2. Reviewed payment methods.

Result:

- Customer saw:
  - Pay with HitPay
  - Pay with Card at Table
- Customer did not see Cash.

Score: **10 / 10**

UX notes:

- This matches the launch requirement.
- Payment wording is clear.
- Card-at-table option is understandable for dine-in restaurant service.

## Page-level UI/UX scorecard

| Area | Score | Current state | Main improvement |
| --- | ---: | --- | --- |
| Customer closed QR state | 10.0 | Correctly blocks stale sessions | None urgent |
| Customer active menu | 9.0 | Good category segmentation, no name input | Sticky category jump bar/search |
| Customer cart/add item | 8.8 | Works, special requests clear | Stronger add confirmation |
| Customer payment | 10.0 | HitPay/card-at-table only | None urgent |
| Staff dashboard | 9.0 | Clear manager overview | Reduce noise for owner/admin if desired |
| POS table board | 9.0 | Fast, table-first workflow | More visual table status hierarchy |
| POS active table drawer | 9.2 | Smooth, no page bounce | Soften large history count |
| POS menu/cart | 9.0 | Compact and functional | Better item typography hierarchy |
| Staff payment | 8.8 | Functional, clear enough | Rename staff cash to be more explicit |
| Kitchen display | 9.2 | Clean lane workflow | Bigger “next action” touch target |
| Orders overview | 8.7 | Table grouping works | Better loading skeleton |
| Reservations page | 8.8 | Strong service-day view | Continue improving newly-created booking highlight |
| Queue page | 8.7 | Comprehensive host stand workflow | Long page; needs tighter above-fold layout |
| Tables page | 9.0 | Strong floor workflow | QR/open-menu button labels could be more explicit |

## Key UX strengths

1. **Table-first mental model is now consistent.** POS, Tables, Orders, and Kitchen all anchor work around tables and tickets.
2. **Customer ordering is lighter.** No name input, no unnecessary friction.
3. **Customer payment is correct.** Cash is removed from customer checkout.
4. **POS no longer feels like a separate checkout page.** Staff can add, send, pay, and switch table from the same context.
5. **Kitchen handoff is readable.** Ticket #254 appeared cleanly in the correct lane.
6. **Menu pictures are present and persist visually.** POS menu loaded visible images successfully; customer menu lazy-loads without broken images.

## Key UX risks before launch

### Risk 1 — Customer long-menu fatigue

The customer menu has 112 items. Categories help, but scrolling is still long.

Recommended fix:

- Sticky category bar.
- Active section highlight.
- Customer search field.
- Back-to-top floating action.

Priority: High

### Risk 2 — Staff order page loading state

Orders page initially showed “Loading orders...” before the table grouping appeared.

Recommended fix:

- Replace plain loading text with skeleton cards.
- Add “Syncing live orders…” label.
- Keep last known orders visible during refresh if possible.

Priority: Medium

### Risk 3 — Staff Cash wording

Staff Cash is appropriate for cashier/admin use, but the wording should be impossible to confuse with customer cash.

Recommended fix:

- Rename to “Counter cash — staff only”.
- Keep internal settlement subtitle.

Priority: Medium

### Risk 4 — Table history noise

History counts like `History 92` may distract staff from the current session.

Recommended fix:

- Keep history secondary.
- Use smaller text or muted chip.
- Show history only after staff clicks History.

Priority: Medium

### Risk 5 — Table QR/open-menu controls

Tables page has `Open menu` and `Copy`, but labels could be clearer for real waiters.

Recommended fix:

- Rename:
  - `Open menu` → `Open customer menu`
  - `Copy` → `Copy table QR link`

Priority: Low-Medium

## Recommended next polish batch

1. Customer menu sticky category/search improvements.
2. Orders page skeleton/loading polish.
3. Rename Staff Cash and QR/link labels.
4. Tighter POS item typography for long item names.
5. Table status color hierarchy.

## Live test data created during audit

The audit created one small live staff test order to verify POS → Kitchen → Orders behavior:

- Table: T07
- Order: #254
- Item: A12 Boiled Seasoned Egg
- Value: SGD 2.00
- Purpose: UI/UX handoff verification

Before physical launch rehearsal, QA/test tickets and occupied table state should be cleaned or reset according to the restaurant’s launch data policy.

## Final UI/UX conclusion

Sakorio POS is now suitable for a controlled soft-launch rehearsal. The core end-to-end UI/UX works:

Customer QR ordering → active order visibility → no name input → category menu → add item → customer payment options → staff POS table management → kitchen display → orders overview.

It is not yet a perfect 10/10 because long-menu navigation, loading polish, and a few label refinements still matter for real restaurant speed. But the system is no longer structurally confusing; the remaining work is polish, not foundational rescue.
