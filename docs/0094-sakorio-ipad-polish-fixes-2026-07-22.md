# Sakorio iPad QA polish fixes

Date: 2026-07-22  
Branch: development

## Fix 1 — POS QR handoff must be deterministic

Changed:

- POS table drawer now shows the active customer QR panel whenever the selected table is active and has a customer QR URL.
- The QR/link panel also appears before activation, with copy telling staff to tap Open or Copy to activate before guests order.
- The visible QR/link is no longer dependent on popup success or clipboard success.
- After activation, the selected table is updated locally so Release Table and the active QR state appear immediately while fresh data reloads.
- The inline QR panel `Open` and `Copy link` actions now use the activation-safe flow instead of bypassing table activation.
- Removed the misleading `Hide` action because the requirement is that staff can always recover the current QR link on iPad/constrained browsers.

Expected QA result:

- Staff opens a seated/active table in POS.
- QR card and exact `order.sakorio.com/menu/...` link are visible.
- `Open` and `Copy link` remain available even if popup/clipboard behavior is restricted.

## Fix 2 — Empty seated table needs a release/undo path

Changed:

- Added `Release table` for active tables with no active bill and no unsent cart.
- Reused the final confirmation modal with release-specific copy.
- Release ends the QR session and returns the table to Available.
- Paid tables still use the stronger `Close table` confirmation and bill-history language.

Expected QA result:

- Queue/reservation handoff opens a table.
- If no order has been sent, staff can tap `Release table`.
- Confirmation says the empty table will be released.
- Table returns to Available without forcing a dummy ticket.

## Fix 3 — Queue seat-card accessible labels

Changed:

- Queue recommended table buttons now expose labels like `Seat QA Queue IPAD188645 at T07`.
- Visible CTA now says `Seat at T07`, `Seat at T09`, etc.
- Table choice cards received a larger minimum touch target.

Expected QA result:

- Queue detail recommended table cards remain readable.
- Browser/accessibility tooling can identify each target table cleanly.
- Staff can seat guests without ambiguous repeated `Seat guest here` labels.

## Fix 4 — Timetable iPad density

Changed:

- Added a selected-day panel in calendar mode.
- Calendar defaults the selected day to today.
- Tapping a calendar cell highlights the day and shows that day’s shifts in a focused panel.
- The selected-day panel has a large `Add shift on this day` action.
- On tablet widths, non-selected calendar add buttons collapse to a compact `+` to reduce visual noise.

Expected QA result:

- iPad users can tap a date, inspect the day, and add a shift from one focused place.
- The monthly grid remains available but is less noisy.

## Fix 5 — Reduce compact-control friction

Changed:

- Queue table cards now have larger card/action tap areas.
- Timetable selected-day controls use larger tablet-friendly action sizing.
- POS gains functional polish through deterministic QR and release controls without increasing component CSS beyond the existing budget.

Expected QA result:

- Queue and Timetable should feel less fiddly on iPad.
- POS should be operationally clearer even where product cards remain dense.

## Verification completed before commit

- `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T front npm run build -- --configuration production-static`
  - Passed.
  - Existing warnings remain: cashier POS component CSS warning budget and `qrcode` CommonJS dependency.
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --since 10m --tail=120 front`
  - Final rebuild completed successfully after the transient cart signal naming error was fixed.

## Live browser QA still required after deployment

After Render deploys this commit, run live iPad browser checks for:

1. POS active table shows visible QR link immediately.
2. Queue/reservation-seated empty table can be released without creating a dummy order.
3. Queue recommended cards expose `Seat <guest> at <table>` labels.
4. Timetable calendar shows selected-day panel and add-shift CTA.
5. iPad portrait and landscape have no horizontal overflow.
