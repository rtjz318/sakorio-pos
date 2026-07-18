# Sakorio POS end-day live QA recovery

Date: 2026-07-18  
Environment: live Sakorio staff domain  
Final verified staff build: `2.1.6 f4d559e9`

## Scope

This pass continued the final launch-readiness QA using the browser only on the Sakorio domains. The focus was operational consistency between POS, Tables, Orders, and Kitchen & beverages after the HitPay recovery work.

## Fixes completed during this pass

1. Kitchen live/backlog timestamp handling
   - Problem: recent tickets were hidden in the "older than 6h" backlog even though the visible timer showed they were only minutes old.
   - Fix: Kitchen filtering and sorting now use the same UTC-safe timestamp parser as the visible waiting-time labels.
   - Commit: `bedb09b8 Fix kitchen live shift timestamp filtering`

2. POS open-bill count and stale table-session fallback
   - Problem: POS counted old unpaid historical table orders as live bills after the table session had already moved on.
   - Fix: POS now only treats a table order as live when it belongs to the current table session, active table order, or current backend table-session markers.
   - Commit: `d7bac5dc Align POS table status with current sessions`

3. POS stale table labels
   - Problem: after the count was fixed, some idle tables still showed stale labels such as "Open order" or "Ready" while their action said "Start order."
   - Fix: POS now hides stale `open_order` / `ready_to_serve` visual labels when there is no current active order or service ticket.
   - Commit: `f4d559e9 Hide stale POS table state labels`

## Verification performed

### Build and smoke checks

- `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec front npm run build -- --configuration production-static`
  - Passed after each frontend change.
  - Existing warnings only:
    - POS SCSS budget warning.
    - `qrcode` CommonJS dependency warning via `dijkstrajs`.
- Front container hot-reload logs checked after each change.
  - No Angular or TypeScript errors.
- Local `/kitchen` route smoke returned HTTP 200 after the Kitchen fix.

### Live browser QA

All live QA below was performed in the in-app browser against `staff.sakorio.com`.

#### POS

Final observed build: `2.1.6 f4d559e9`

Observed final state:

- Tables loaded: 10
- Open bills: 1
- Paid today: SGD 1,977.00
- Catalog: 9
- T07: live bill `#53`
- T01, T02, T03, T04, T05, T08: Available / Ready for order / Start order
- T06, T10: seated guests
- T09: reserved soon

Outcome: Pass. POS now agrees with Tables on which tables are actually live.

#### Tables

Observed final state:

- T07: Live order, Bill `#53`
- T01, T02, T03, T04, T05, T08: Idle table
- T06, T10: Seated
- T09: Reserved soon
- Queue: 0 waiting / 0 notified

Outcome: Pass. Tables remains the strongest operational floor view and now aligns with POS.

#### Kitchen & beverages

Observed final state:

- Active tickets: 2
- Active tickets shown:
  - `#56` T04, 5h 32m waiting
  - `#57` T04, 27m waiting
- Backlog count: 55 unresolved tickets older than the live shift window.

Outcome: Pass for the timestamp recovery. Recent tickets are no longer hidden in backlog.

Operational note: T04 is financially/table-session closed, but it still has kitchen line items pending. This is expected with the current workflow because kitchen item fulfillment is separate from payment/table closure. Before launch, stale kitchen tickets should be cleared or marked delivered/cancelled during end-day cleanup.

#### Orders

Observed final state:

- Active Orders: 3
- Visible table group: T07, latest `#53`, SGD 23.00
- Order History: 54

Outcome: Usable, but not a full floor-status command center. For table occupancy and current floor state, staff should use POS/Tables. Orders is better as ticket/history review.

## Scores after this pass

| Area | Score | Notes |
| --- | ---: | --- |
| POS table-status accuracy | 9/10 | Open-bill count and stale labels fixed. |
| Tables floor workflow | 9/10 | Clear and consistent; remains the preferred floor-control view. |
| Kitchen live shift focus | 8/10 | Timestamp bug fixed; backlog cleanup process still needs operational discipline. |
| Orders overview | 7/10 | Works for active ticket review, but can still be clearer as a table/session overview. |
| Cross-tab consistency | 8.5/10 | POS and Tables are aligned; Kitchen has separate fulfillment state by design. |

## Remaining launch notes

1. Kitchen backlog cleanup should be run before real service so old unresolved test tickets do not distract staff.
2. Decide whether closing/settling a table should optionally mark remaining kitchen items as delivered/cancelled, or whether kitchen fulfillment must always be completed separately.
3. Orders could be improved later to make its scope more obvious: "Active unpaid tickets" vs "All current table sessions."
4. Printer integration remains a future-fix item as previously agreed.

