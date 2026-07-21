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

