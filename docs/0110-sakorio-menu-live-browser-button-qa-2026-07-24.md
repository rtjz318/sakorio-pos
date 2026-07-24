# Sakorio Menu Live Browser Button QA - 2026-07-24

Scope: live-browser QA after the Ajisen menu import/image pass.

Tested live domains:

- Customer QR ordering: `order.sakorio.com`
- Staff dashboard/tables/orders/kitchen/products/POS: `staff.sakorio.com`

Test table/session:

- T02 was opened from Staff Tables for this QA pass.
- Customer QA order created: `#229`
- QA item: `B1 Stir-Fried Bean Sprouts`, SGD 12.00
- QA note: `QA browser test - no kitchen prep needed`

## Summary

Overall menu/browser score: 8.6/10

The imported menu itself is working well on the customer QR menu and staff product/catalog views. Customer ordering, category filtering, cart quantity controls, order placement, Orders visibility, and KDS movement all worked in live browser testing.

The system is not 10/10 yet because staff auth/session behavior and POS route loading were inconsistent during this run.

## Customer QR menu QA

Fresh QR source:

- Generated from Staff Tables for T02.
- Customer QR page rendered Ajisen Ramen / T02 correctly.
- Menu showed `112 items`.
- Customer page rendered 96 image elements.

### Buttons and controls tested

| Area | Button/control | Result |
|---|---|---|
| Language | Language select | Pass - switched to Spanish, then back to English using the select control |
| Guest name | `(optional - you can skip this)` | Pass - revealed the guest name input |
| Category nav | All | Pass - returned to the full `112 items` menu |
| Category nav | Deep Fried Menu | Pass - showed `8 items` and deep fried products |
| Category nav | Drink Menu | Pass - showed `41 items` and drink products |
| Category nav | Izakaya Menu | Pass - showed `8 items`, including D-series izakaya products |
| Category nav | Noodle & Rice Menu | Pass - showed `24 items`, including ramen/rice products |
| Category nav | Quick Bites | Pass - showed `19 items`, including A-series quick bites |
| Category nav | Stir Fried Menu | Pass - showed `12 items`, including B-series stir fried products |
| Item add | Add B1 Stir-Fried Bean Sprouts | Pass - added to cart |
| Cart | Special request input | Pass - accepted QA note |
| Cart | Quantity plus | Pass - quantity moved 1 to 2, total SGD 12.00 to SGD 24.00 |
| Cart | Quantity minus | Pass - quantity moved 2 to 1, total SGD 24.00 to SGD 12.00 |
| Cart | Place order | Pass - created Order #229 |
| Payment entry | Pay Now | Pass - opened payment choices |
| Payment choices | Pay with HitPay / Pay with Card at Table visibility | Pass - both options appeared |
| Payment choices | Cash option | Pass - Cash was not shown |

### Customer result

After placing the order, the customer menu showed:

- `Your order status: Pending`
- `Order #229`
- `B1 Stir-Fried Bean Sprouts`
- `SGD 12.00`
- `Cancel`
- `Pay Now`
- `Order received! Items added to Order #229`

No console errors/warnings were captured on the customer QR page during the order placement and Pay Now checks.

## Staff Tables / Orders / Kitchen QA

### Tables

T02 was opened from Staff Tables and generated a QR link successfully. The table changed from idle/closed to ready/open for QR ordering.

Pass:

- Staff Tables page loaded after login.
- T02 table service panel opened.
- Menu list loaded inside the table service panel.
- `Open table for QR ordering` worked.
- The T02 QR link was displayed.

### Orders

Pass:

- Staff Orders showed T02 with `1 active ticket`.
- Latest ticket showed `#229`.
- Product line showed `1x B1 Stir-Fried Bean Sprouts`.
- Table total showed SGD 12.00.
- `Open table POS` and `View tickets` were visible.

### Kitchen & beverage display

Pass:

- KDS showed `#229 · T02`.
- Ticket contained `1x B1 Stir-Fried Bean Sprouts`.
- Station/category showed Kitchen / Stir Fried Menu.
- Special request note was visible.
- `Start ticket` moved the item to In Prep.
- `Ready for pass` moved the item to Ready.
- `Served / Delivered` removed the ticket from the live board.
- KDS returned to zero active tickets.

No console errors/warnings were captured on the KDS page during ticket movement.

## Staff Products QA

Products page after re-login:

- Product rows: 112
- Product images: 90
- Search input present.
- Category buttons present:
  - All Categories
  - Deep Fried Menu
  - Drink Menu
  - Izakaya Menu
  - Noodle & Rice Menu
  - Quick Bites
  - Stir Fried Menu

### Buttons and controls tested

| Area | Button/control | Result |
|---|---|---|
| Products page | Page load | Pass - 112 rows rendered |
| Products page | Images | Pass - 90 product images rendered |
| Search | Search `Flat Noodle Rich Soy Sauce Ramen` | Pass - narrowed to 1 row |
| Search result | Flat Noodle price | Pass - showed SGD 13.80 |
| Search result | Flat Noodle image | Pass - image present |
| Category filter | Drink Menu after clearing search | Pass - showed 41 drink rows |

Note: while automation `fill('')` did not clear the search field in one attempt, normal user-style keyboard clearing (`Ctrl+A`, Backspace) worked and category filtering then worked. I do not consider this a user-facing defect unless it reproduces manually.

### Destructive/admin buttons intentionally not clicked

These were observed as visible/enabled, but not clicked because they would mutate production/live data:

- Delete all
- Delete product row
- Sold out today
- Bulk import
- Edit product save
- Add product save
- Logout

## POS route QA

POS route result: needs follow-up.

What happened:

1. POS opened and initially showed the cashier shell.
2. It remained in `Refreshing... / Syncing` state with:
   - `0 loaded`
   - `0 open`
   - `0 paid today`
   - `Loading floor tables...`
3. After reload, the POS tab redirected to login.
4. A later clean login attempt also failed once, while another clean retry earlier succeeded.

This means I cannot honestly mark POS as fully passing in this live browser run.

Observed risk:

- Staff authentication/session persistence feels fragile across multiple live tabs/reloads.
- POS can get stuck syncing or redirect to login instead of loading floor/table data.

Recommended fix priority: High.

## Staff login QA

Result: mixed / intermittent.

Pass:

- A clean retry using the existing owner credential did successfully log into `/dashboard`.
- Staff dashboard rendered and navigation loaded.

Fail / concern:

- Another clean login attempt returned `Sign-in failed. Check your details and try again.`
- Some protected routes loaded as blank shells or redirected to login during the same QA session.

Recommendation:

- Treat auth/session persistence as a launch-critical follow-up.
- Do not create a random new tenant account via public `/register`; that would not be attached to the Ajisen/Sakorio live tenant and would not help staff check the imported menu.
- If fresh credentials are required, create them under the existing tenant via authenticated `/users` or the Users UI after the owner session is stable.

## Payment QA

Pass:

- Customer `Pay Now` button opened payment choices.
- Customer payment choices showed:
  - Pay with HitPay
  - Pay with Card at Table
- Cash was not shown.

Not completed:

- I did not complete the external HitPay checkout in this pass.
- I did not mark the QA order as paid because this was a menu/button QA pass, not a payment settlement pass.

## Cleanup status

Completed cleanup:

- KDS ticket #229 was moved through Start ticket -> Ready for pass -> Served / Delivered.
- Kitchen board returned to zero active tickets.

Remaining:

- Staff Orders may still show Order #229 as unpaid/active on T02 until it is settled/cancelled/closed from staff Orders/POS.
- Reopening the QR after serving produced a blank state once, so customer-side cleanup was not completed from QR.

## Findings that should be fixed before launch

1. POS route loading/session issue
   - POS stayed stuck in syncing state, then redirected to login after reload.
   - This is the biggest issue from the pass.

2. Staff auth/session inconsistency
   - Existing owner credential worked in one clean retry and failed in another.
   - Protected routes sometimes blanked or redirected.

3. Customer QR after served/reopen edge case
   - Reopening the fresh T02 QR after serving the KDS ticket returned blank content once.
   - Earlier active QR menu rendering worked correctly before and during order placement.

4. Products search clear UX
   - User-style clearing worked, but automation `fill('')` did not clear once.
   - Low priority unless reproduced manually.

5. QA data cleanup
   - Order #229 should be closed/cancelled once staff POS/auth stability is fixed.

## Final recommendation

Menu data and customer ordering are in strong shape. The imported menu is usable and the customer-facing buttons worked through a real order.

Before calling the browser/POS system launch-ready, fix and retest:

- Staff login/session stability
- POS route table/catalog loading
- Active QR re-open behavior after served ticket
- QA order #229 cleanup

