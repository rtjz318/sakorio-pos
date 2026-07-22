# Sakorio next five fixes - live browser results

Date: 2026-07-22  
Environment: live Sakorio domains (`staff.sakorio.com`, `order.sakorio.com`)  
Branch: `development`

## Executive outcome

Completed and browser-verified the next launch-polish batch. The most important extra finding from this pass was a real POS tap bug: product cards were visible but physically covered by higher/sticky UI layers, so staff taps did not add items. This is now fixed and verified live, including iPad portrait.

## Fix 1 - Public reservation availability mismatch

Status: Fixed in `59d6cbc5` and verified live.

Code change:

- `front/src/app/shared/reservation-week-slot-grid.component.ts`
- Exact day-slot loading now runs when the month aggregate is non-final, so the public booking page does not stay stuck in an all-disabled/closed-looking state.

Live browser verification:

- Opened `https://order.sakorio.com/book/1`.
- Initial loading cleared.
- July 22, 2026 showed valid time slots from `15:00` onward.
- Phone helper copy remains visible: `Use international format, for example +65 9123 4567`.

Result: Pass.

## Fix 2 - Public waitlist token handoff and stale position

Status: Fixed in `59d6cbc5`, `a663ae0d`, and `a2ea1bc9`; verified live.

Code changes:

- `front/src/app/waitlist-public/waitlist-public.component.ts`
  - Added an active status-token guard so a newly joined queue entry is not overwritten by stale polling from an old token.
  - Terminal statuses clear the saved token.
- `back/app/main.py`
  - Added a shared stale queue checker.
  - Public queue info excludes active rows older than 12 hours.
  - Public queue position calculation excludes stale rows too.
- `back/tests/test_guest_queue_summary_stale.py`
  - Added regression coverage for staff queue summary, public queue info, and public queue position.

Live browser verification:

- Public waitlist initially showed `0 parties ahead`.
- Created temporary queue entry `Q0039`.
- Customer page switched to the new token and showed `Position 1`.
- Clicked `Leave queue`.
- Customer page showed `Queue entry cancelled` and `Join again`.

Result: Pass.

## Fix 3 - Staff POS second-round ordering and product tap reliability

Status: Fixed in `59d6cbc5`, `16efd5b2`, and `1d49ca90`; verified live.

Code changes:

- `front/src/app/cashier-pos/cashier-pos.component.ts`
  - Added clearer live-bill add-on flow copy and `Send add-on round` CTA.
  - Raised `.pos-service-overlay` above the app sidebar (`z-index: 120`) so the sidebar cannot steal drawer taps.
  - Removed sticky positioning from `.pos-service-toolbar`; the sticky search/category bar was covering product cards in short drawer heights.

Live browser verification:

- Staff bundle confirmed: `2.1.6 1d49ca90`.
- Opened POS, selected available table `T04`.
- Product card hit target resolved to the product button itself.
- Tapped `Coca Cola`; cart showed:
  - `Coca Cola`
  - `Items 1 item`
  - `Total SGD 3.00`
  - `Send order`
- Sent first order as bill `#148`.
- Clicked `Add items`.
- Tapped `Coffee`; cart showed:
  - `Coffee`
  - `Send add-on round`
  - updated total `SGD 5.50`
- Sent add-on round; bill `#148` stayed as one current ticket with 2 items.
- Recorded terminal payment for SGD 5.50.
- Closed table; `T04` returned to `Available`.

Result: Pass.

## Fix 4 - Render wake/deploy risk documentation

Status: Documented in `0096`; live deploy state checked in Render browser.

Documentation:

- `docs/0096-sakorio-launch-stability-runbook-2026-07-22.md`

Live browser verification:

- Render API service was on `Standard`.
- Staff web remained on `Free`; Render still warns that free instances can spin down and delay requests.
- API deployments for `a663ae0d` and `a2ea1bc9` went live.
- Staff web deployments for `16efd5b2` and `1d49ca90` went live.

Result: Operational risk documented. For launch, staff/customer web services should also be upgraded if zero cold-start risk is required.

## Fix 5 - Stale QA/test queue cleanup and live summaries

Status: Fixed and verified live.

Code changes:

- `back/app/main.py`
  - `/queue/summary` now reports only non-stale live queue rows.
  - This fixes Dashboard/Tables host pulse numbers being inflated by hidden stale rows.
- `back/tests/test_guest_queue_summary_stale.py`
  - Staff queue summary regression test added.

Live browser verification:

- Queue page showed `3 stale hidden`.
- Cleaned up active QA entry `QA Fix Wait 6617017` through the live Queue confirmation flow.
- Dashboard before backend fix showed stale-inflated values.
- After `a663ae0d` API deploy, Dashboard showed:
  - `WAITING NOW 0`
  - `OPEN QUEUE 0`
  - `Queue is clear right now.`
- Public waitlist also now starts from `0 parties ahead`.

Result: Pass.

## iPad/tablet verification

Viewport set through the live browser to `820 x 1180`.

Observed:

- Measured `innerWidth: 820`, `innerHeight: 1180`, content width `812`.
- No horizontal overflow on POS (`scrollWidth: 812`, `clientWidth: 812`).
- Selected available table `T05`.
- Product card hit target resolved to its own product button.
- Tapped `Coca Cola`; cart showed:
  - `Coca Cola`
  - `Items 1 item`
  - `Total SGD 3.00`
  - `Send order`
- Cleared the unsent cart; no backend order was created for T05.

Result: Pass.

## Verification commands

Backend:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back pytest tests/test_guest_queue_summary_stale.py
```

Result: `2 passed`.

Frontend:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T front npm run build -- --configuration production-static
```

Result: Passed. Existing warnings remain:

- cashier POS SCSS warning budget
- `dijkstrajs` CommonJS warning from QR dependency

Logs checked:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --since 5m --tail=80 front
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --since 5m --tail=80 back
```

Result: no new compiler/runtime errors observed.

## Commits in this batch

- `a663ae0d` - `fix: exclude stale rows from live queue summaries`
- `a2ea1bc9` - `fix: ignore stale rows in public queue position`
- `16efd5b2` - `fix: keep POS service drawer above sidebar`
- `1d49ca90` - `fix: prevent POS menu toolbar covering product taps`

## Remaining recommendations

1. Upgrade staff/customer web services from Free before launch if cold starts are unacceptable.
2. Keep the Queue stale panel as a daily opening checklist item.
3. Later refactor cashier POS SCSS to reduce the existing component style budget warning.
4. Convert the live browser POS/iPad tap checks into a dedicated Playwright smoke test so this exact regression is caught automatically.
