# Sakorio Round 6 Fix Log - 2026-07-21

Source QA brief: `docs/0088-sakorio-round-6-full-flow-browser-results-2026-07-21.md`

## Fix 1 - Table move destination safety

- QA source: `R6-FLOW-033`, cross-case finding 42.
- Problem found: the Tables tab exposed `Move table`, but the destination/confirmation UX was unclear. In one live QA run, clicking move appeared to place the active bill on an unexpected table.
- Change made:
  - Removed automatic first-destination selection when opening the move drawer.
  - Added `Choose destination table...` placeholder.
  - Added explicit From -> To confirmation card.
  - Added required confirmation checkbox: staff must confirm guests are moving to the selected table.
  - Added programmatic guard so `moveQuickBill()` refuses to run unless the target is selected and confirmed.
  - Changing the destination resets the confirmation checkbox.
- Expected improvement:
  - Prevents accidental one-click moves to the first available table.
  - Makes the target table obvious before staff commits the move.
  - Improves iPad/waiter safety without requiring slow typed confirmation.
- Verification:
  - Angular frontend hot-reload rebuilt successfully in Docker after the change.
  - Local browser UI check stopped at login; live-domain browser verification should be rerun after deployment.

## Fix 2 - Orders item correction discoverability

- QA source: `R6-FLOW-030`, `R6-FLOW-031`, cross-case findings 2, 3, 17, 18.
- Problem found: active table tickets had correction ability, but it was too easy to miss:
  - Table orders mainly showed `Open bill`, so staff could think corrections must be done from POS/payment instead of Orders.
  - Line-item removal was a small icon-only `X`, which is weak for cashier/manager audit workflows.
  - The edit order modal was narrow, causing item controls to feel cramped on tablet-sized layouts.
- Change made:
  - Added a visible `Edit ticket` action to active table order cards, including orders that also have `Open bill`.
  - Changed line-item remove controls from icon-only to labelled `Remove item` buttons in active ticket cards and the edit order modal.
  - Kept the existing backend audited staff removal endpoint; ready/delivered items still require reason through the existing confirmation modal.
  - Widened the edit order modal and allowed edit rows to wrap so quantity/status/modifier/remove controls do not squeeze on iPad/tablet.
- Expected improvement:
  - Cashier and manager can find ticket correction directly from the Orders overview.
  - Staff have clearer confidence that they are removing/voiding a line item, not tapping an ambiguous icon.
  - Reduces correction workflow score losses from hidden controls and cramped tablet UI.
- Verification:
  - Angular frontend hot-reload rebuilt successfully in Docker after the change.
  - Docker frontend log error scan returned no `error`, `failed`, `TS*`, or `NG*` matches.
  - Live-domain browser verification should be rerun after deployment.

## Fix 3 - POS first-item cart binding from reservation/queue handoff

- QA source: `R6-FLOW-004`, `R6-FLOW-006`, `R6-FLOW-020`, cross-case finding 6.
- Problem found: waiter-assisted POS ordering could fail in the handoff state where a reservation/queue table was active for QR ordering but had no existing ticket yet. The product grid could be open, but first-item cart binding depended too narrowly on `selectedTable()`.
- Change made:
  - Added a robust POS cart target resolver that checks:
    1. existing cart-bound table,
    2. selected table,
    3. route `tableId` fallback from the active POS URL.
  - Product action labels and disabled state now use that same resolver.
  - First item added from the POS grid now rehydrates `selectedTableId` from the resolved target before binding the cart.
  - Checkout/effective table resolution also uses the robust target resolver.
- Expected improvement:
  - A waiter opening POS from reservation or queue handoff can add the first item even before any customer QR order exists.
  - Reduces silent “tap product but nothing happens” risk during first-ticket creation.
  - Keeps existing cart table locking, so staff still cannot accidentally mix carts across tables.
- Verification:
  - Angular frontend hot-reload initially caught the half-written helper reference, then rebuilt successfully after the helper was added.
  - Final short-window Docker frontend error scan returned no `error`, `failed`, `TS*`, or `NG*` matches.
  - Live-domain browser verification should be rerun after deployment.

## Fix 4 - Same-day sold-out / restore availability workflow

- QA source: `R6-FLOW-040`, cross-case finding 44.
- Problem found:
  - There was no fast operational control for a manager to mark an item sold out during service.
  - Product availability dates existed, but POS did not consistently apply them to cashier-visible sellable items.
  - Backend product update ignored explicit `available_until: null`, so a future restore action could not reliably clear a sold-out date.
- Change made:
  - Added a Products table `Availability` column with status pill and quick `Sold out today` / `Restore` action.
  - `Sold out today` sets `available_until` to yesterday, using the existing availability-window logic to hide the product immediately.
  - `Restore` clears `available_until`.
  - Fixed backend product and tenant-product update handling so explicit null availability fields are applied instead of ignored.
  - Kept Product-to-TenantProduct availability sync intact, including clear/null restores.
  - Added POS cashier filtering for `available_from` / `available_until`, so sold-out items disappear from staff POS as well as QR/customer menu.
- Expected improvement:
  - Manager can remove a sold-out item from live QR and POS ordering without deleting the product.
  - Restoring a product is reversible and uses the existing product edit API.
  - Reduces launch risk for real service when kitchen/beverage items run out mid-shift.
- Verification:
  - Backend syntax check passed with `python -m py_compile app/main.py` inside the Docker backend container.
  - Angular frontend hot-reload rebuilt successfully after the Products/POS changes.
  - Final short-window Docker frontend error scan returned no `error`, `failed`, `TS*`, or `NG*` matches.
  - Live-domain browser verification should be rerun after deployment.

## Fix 5 - QR menu sold-out parity for older/imported menu rows

- QA source: Priority order 3 live browser retest on `staff.sakorio.com` and `order.sakorio.com`.
- Problem found:
  - Marking Coffee sold out in Products hid Coffee from staff POS.
  - The active table QR menu still showed Coffee because the customer menu was reading a same-name `TenantProduct` row that was not reliably linked to the legacy `Product` row updated by the staff Products screen.
- Change made:
  - Product availability sync now also updates same-tenant `TenantProduct` rows with a matching normalized name when `product_id` linkage is missing.
  - The public QR menu endpoint now suppresses tenant-product rows when a same-name legacy product is unavailable, closing the launch-data gap for older/imported products.
- Expected improvement:
  - Staff “Sold out today” decisions apply consistently to staff POS and customer QR ordering.
  - Imported menu rows no longer keep a sold-out item visible to customers just because the historical linkage is incomplete.
- Verification:
  - Backend syntax check passed with `python -m py_compile app/main.py` inside the Docker backend container.
  - Live retest before the second backend filter confirmed the exact gap: staff POS hid Coffee, QR still showed Coffee.
  - Live QR retest must be repeated after this follow-up backend commit is deployed.

## Fix 6 - Reservation time selection safety

- QA source: end-to-end reservation seating cases where the intended booking time and seated session time could diverge.
- Problem found:
  - The reservation week slot grid could silently auto-select the first bookable slot after calendar/day data loaded.
  - Fast booking flows risked submitting an unintended earliest slot instead of the customer’s intended time.
- Change made:
  - Removed automatic first-slot selection.
  - When a selected time is invalid for the chosen day, the time is cleared and the user must explicitly choose a valid slot.
- Expected improvement:
  - Public and staff reservation flows become safer and more predictable.
  - Prevents “customer booked 7pm but system seated/recorded an earlier slot” confusion during host handoff.
- Verification:
  - Angular frontend hot-reload rebuilt successfully in Docker after the change.
  - Live-domain browser verification should be rerun after deployment.

## Fix 7 - Launch guardrails for payments, paid orders, split/merge policy and KDS workflow

- QA source: Priority QA 1-4 follow-up from the 80-case regression scoring.
- Problem found:
  - Some real-world flows are operationally important but not fully enabled as accounting-grade modules yet: split bills, partial payments, paid-bill reopen, refunds/voids after settlement, and table merge settlement policy.
  - Kitchen/bar tickets were functionally improved, but the action sequence could still rely too much on staff inference during rush.
- Change made:
  - POS checkout now clearly states the launch policy: one table session settles as one bill; split/partial/refund/reopen workflows require manager/accounting handling outside the POS checkout screen.
  - Orders paid-awaiting-close and History screens now show paid-bill policy callouts so staff know those screens are for closing/printing/read-only records, not hidden post-settlement edits.
  - KDS now shows a visible service-flow guide: New tickets -> In prep -> Ready pass -> Served/delivered, including the live-board/backlog behavior.
- Expected improvement:
  - Staff no longer hunt for unsupported controls during service.
  - Launch behavior is explicit and safer until the future accounting/refund/split-bill modules are built.
  - Kitchen/beverage operators have clearer steady-state workflow guidance.
- Verification:
  - Backend syntax check passed with `python -m py_compile app/main.py` inside the Docker backend container.
  - Angular frontend hot-reload rebuilt successfully after the POS, Orders and KDS changes.
  - Final Docker frontend error scan returned no `error`, `failed`, `TS*`, `NG*`, or bundle-failure matches.
