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
