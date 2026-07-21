# Sakorio live browser regression - Step 1 to Step 4 - 2026-07-22

This brief records the live-browser QA cycle requested for launch readiness. All QA observations below were taken through the deployed Sakorio domains, not local login pages or local-only checks.

## Step 1 - Live deployment check

- Live staff URL: `https://staff.sakorio.com/pos?qa=launch-regression-step1`
- Observed version: `2.1.6 a7352423`
- Result: Passed.
- Note: `a7352423` is the latest frontend-affecting commit. The later `55626ccf` commit was documentation-only and did not change the browser bundle.

## Step 2 - Focused end-to-end restaurant workflow

Scenario executed:

Customer reserves online -> host assigns T07 -> host seats guest -> customer QR opens -> customer orders first round -> KDS receives and serves -> customer adds second round -> KDS receives and serves add-on -> cashier collects terminal payment -> cashier closes table -> reservation auto-finishes.

### Results

| Area | Live result | Score | Notes |
|---|---:|---:|---|
| Public reservation page | Passed | 9.5/10 | Phone placeholder/helper visible. |
| Public reservation creation | Passed | 10/10 | Created reservation `#72` for QA E2E flow. |
| Host search/highlight | Passed | 9.5/10 | New booking appeared at top with `NEW / SELECTED`. |
| Host table assignment | Passed | 10/10 | Clear `Assign T07` label appeared and assignment worked. |
| Host seat reservation | Passed | 10/10 | Reservation moved to seated; summary updated to 1 seated / 0 awaiting. |
| Reservation QR/menu handoff | Needs polish | 8/10 | `Open QR/menu` relied on new-tab behavior; not enough visible fallback on host page. Fixed in code by adding an inline QR link. |
| POS QR handoff | Passed after visible link appeared | 8.5/10 | Clipboard read did not return link in automation, but POS displayed the current QR URL inline after opening QR. |
| Customer QR menu | Passed | 10/10 | Correct T07 session opened; no other table history appeared. |
| Customer first QR order | Passed | 10/10 | Order `#140` created with Coffee. |
| KDS receives first order | Passed | 10/10 | KDS showed `#140 · T07`, guest name, Coffee. |
| KDS prep -> ready -> served | Passed with refresh lag | 8.5/10 | Ready transition needed a refresh before lane display settled. Fixed in code with optimistic local ticket status update. |
| Customer add-on order | Passed | 9/10 | The correct button label after first order is `Add to order`, not `Place order`. |
| KDS receives add-on | Passed | 10/10 | Water add-on appeared on same order `#140`, pending. |
| KDS add-on served | Passed | 9.5/10 | Served toast/countdown worked. |
| Cashier payment view | Passed with pointer click | 8.5/10 | Visible click worked; duplicate `Pay bill` accessible labels were ambiguous for automation. Fixed in code with clearer aria labels. |
| Terminal payment | Passed after reload | 8.5/10 | Payment succeeded, but table card needed reload before showing Paid. Fixed in code with immediate local paid-state update. |
| Close table confirmation | Passed | 10/10 | In-app modal showed reset, QR end, history move, and linked reservation finish warning. |
| Table reset | Passed | 10/10 | T07 returned to `Available`. |
| Reservation auto-finish | Passed | 10/10 | Reservation `#72` moved to `FINISHED`. |

Overall Step 2 score: 9.3/10 before code polish, expected 9.6+/10 after the Step 4 fixes are deployed and re-tested.

## Step 3 - iPad/tablet viewport QA

Live staff screens checked at the browser's measured viewport:

- POS floor
- POS T07 drawer
- Reservations
- Queue
- KDS

Observed layout outcome:

- No horizontal overflow detected on POS, Queue, Reservations, or KDS at the measured browser width.
- No small critical touch-target offenders detected in the automated DOM scan.
- Reservations page showed `SERVICE TIMELINE` correctly; one earlier failure was only a case-sensitive assertion mismatch.

Viewport limitation:

- Requested iPad portrait override: `820x1180`
- Measured browser dimensions remained approximately `1280x720`.
- Result: iPad portrait simulation could not be honestly marked as complete through the available in-app browser viewport tool.
- Follow-up: run the same live paths on a real iPad/Safari or a browser surface where the viewport override actually applies.

## Step 4 - Fixes implemented from live observations

1. Reservation QR handoff fallback
   - Added an inline `Txx QR ready` handoff block after `Open QR/menu`.
   - The inline block includes `Open customer ordering page`.
   - This gives hosts a visible fallback when the browser blocks or reuses pop-up tabs.

2. KDS lane refresh lag
   - Added optimistic local status update after bulk ticket actions.
   - KDS should now move items between Pending -> Preparing -> Ready -> Delivered immediately, while the background API refresh still reconciles truth.

3. POS payment state lag
   - Added immediate local paid-state update after cash/terminal settlement.
   - The table card should show Paid/Close table immediately instead of needing a reload.

4. POS duplicate payment accessible names
   - Added more specific aria labels for drawer payment buttons.
   - This reduces ambiguity for browser automation and accessibility tools while keeping visible copy simple for staff.

## Build and local verification

- Command: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T front npm run build -- --configuration production-static`
- Result: Passed.
- Existing warnings:
  - POS component style budget warning at warning threshold.
  - `dijkstrajs` CommonJS warning from QR code dependency.

## Post-deploy verification required

After the Step 4 commit is deployed, re-test only these focused live paths:

1. Reservation `Open QR/menu` shows inline `Txx QR ready` link.
2. KDS `Ready for pass` visually moves the ticket without manual refresh.
3. Terminal payment immediately changes the table to Paid/Close table without manual reload.
4. POS payment buttons expose clearer unique accessible labels.
5. Run real iPad/Safari smoke pass because the in-app browser viewport override did not apply.

