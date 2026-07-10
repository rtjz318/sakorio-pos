# Sakorio Gap Checklist

Last reviewed: 2026-07-10

Repository: `tanjunnan0101/pos`

## 1. Scope Clarification

This checklist records the agreed Sakorio-specific product gaps to close on top of the current POS repo.

Important product decisions already confirmed:

- **No split-payment workflow** is required.
- When the product says "split payments" for Sakorio, it should be interpreted as **sales reporting by payment type**, not multi-party bill splitting.
- The three payment buckets that matter for reporting are:
  - `hitpay`
  - `terminal`
  - `cash`
- POS menu items should support **photo-forward presentation** wherever that improves cashier speed and confidence.

## 2. Active Phases

### Phase A: Payment-Type Sales Reporting

Goal:

- Show sales totals grouped by payment type.
- Normalize existing payment values into Sakorio's reporting buckets.
- Keep reporting consistent across:
  - backend payload
  - reports UI
  - CSV export
  - Excel workbook export

Acceptance target:

- Paid orders are grouped as `hitpay`, `terminal`, `cash`, or `other`.
- Reports show:
  - order count
  - revenue
  - tips
  - collected total
  - average ticket
  - share of collected sales
- Excel workbook includes a dedicated **By Payment Method** sheet.
- CSV export supports a `payment` dataset.

Status:

- Implemented in code, pending user QA.

Implementation notes:

- Manual settle flows already normalize into Sakorio buckets:
  - `cash`
  - `terminal`
  - `hitpay`
  - `other`
- Reports UI now shows payment-method totals with:
  - order count
  - revenue
  - tips
  - collected total
  - average ticket
  - share of collected sales
- Excel export includes a dedicated **By Payment Method** sheet with the same metrics.
- CSV export supports the `payment` dataset and now includes share-of-collected-sales output.
- Reports UI exposes a direct **Export payment CSV** action from the payment-method section.

### Phase B: POS Item Photos

Goal:

- Improve cashier speed by making menu items easier to scan visually.

Expected direction:

- Menu cards in cashier POS should support product thumbnails or hero images where present.
- Image treatment should not slow the dense cashier grid.
- Missing photos should degrade gracefully to text-first cards.

Acceptance target:

- Product cards can render optional images without breaking fast selection.
- Images remain secondary to:
  - product name
  - price
  - modifier/customization entry
  - add-to-ticket action

Status:

- Implemented in code, pending cashier UX QA.

Implementation notes:

- Cashier POS product cards now support optional image rendering from existing product image fields.
- Broken-image fallback is already handled so missing assets fall back to text-first cards.
- The remaining work has moved into broader cashier workflow polish, not missing photo support.

### Phase C: Cashier Workflow Polish

Goal:

- Make the cashier POS feel like a fast, production-ready counter workflow instead of a feature-complete prototype.

Expected direction:

- Strengthen the primary checkout hierarchy so the operator always knows the next action.
- Reduce duplicated buttons and repeated settlement calls across the checkout rail.
- Tighten product-card density so photos help scanning without pushing primary actions too low.
- Improve the table-to-ticket flow so selecting a table, adding items, and settling a bill feels linear.
- Keep category controls and quick product actions close to the product search rail.

Acceptance target:

- One clearly dominant checkout action is always visible when the cart is ready.
- Product cards stay compact, aligned, and easy to scan at cashier speed.
- Table assignment stays obvious before payment.
- The cart, totals, and payment mode feel like one coherent dock.
- Category filtering and quick product/category management stay reachable from the cashier lane.

Status:

- Implemented in code and now largely moved into final production polish.
- Remaining validation is focused on localhost cashier walk-through QA and edge-case settlement review.

Implementation notes:

- Current cashier POS already supports:
  - table selection
  - item search
  - category filtering
  - quick product creation
  - manual settlement
  - HitPay handoff
- Phase C now includes:
  - a simplified cashier dock with duplicated checkout prompts removed
  - a stronger primary settlement CTA with amount-first wording
  - hold-bill actions removed from the primary payment rail so the cashier sees only live settlement paths in front
  - cart-to-payment jump actions inside the active ticket rail
  - quick-tap category chips in addition to the category dropdown
  - automatic table selection when the cashier starts from the product lane with no table chosen
  - protection against accidentally starting a fresh cashier cart on a table that already has a live bill
  - live-bill continuation that keeps add-on ordering and settlement in one dock
  - a renamed recent-bills rail for selected tables with clearer operator actions:
    - `Continue`
    - `Settle`
    - `View`
  - a more cashier-readable product options modal with:
    - explicit add-to-ticket / add-to-bill wording
    - clearer required-choice progress
    - clearer footer summary before commit
  - shorter cashier-first language across:
    - the current ticket dock
    - settlement mode cards
    - selected-table actions
    - live bill / open bill queue actions
  - denser queue and history summaries using relative age labels instead of heavier timestamp copy
  - a tighter queue/history rail with:
    - denser table-group cards
    - stronger primary/secondary action hierarchy
    - cleaner history-card wrapping
    - better tablet-width fallback for grouped action buttons
    - simpler group status pills and more direct queue action wording
  - deterministic post-settlement handoff so paid or cleared tables move the cashier onto the next ready table after reload
  - clearer post-payment notice copy that surfaces which table is up next when one is available
- Remaining gap is continued localhost cashier walk-through QA before moving fully into the next product phase.
- Final copy cleanup also landed in the cashier dock:
  - shorter empty-state wording
  - cleaner live-bill language
  - more direct settlement CTA wording
  - less repeated status language inside queue and history surfaces
- A final Phase D cashier wording pass also landed:
  - selected-table summaries now read in plain cashier language:
    - `Open bill #...`
    - `Ready to pay #...`
    - `Last settled #...`
    - `No active bill`
  - grouped queue primary actions were shortened to operator verbs:
    - `Settle`
    - `Resume`
    - `Counter`
  - grouped queue helper text is now shorter and less instructional:
    - `Settle now`
    - `Add items or collect later`
    - `Review receipt if needed`
  - empty checkout states now use simpler route actions:
    - `Choose table`
    - `Open floor`
  - grouped queue cards now surface the primary cashier action first, with the order-review button secondary
  - linked-table history pills were shortened from descriptive labels to tighter cashier counts:
    - `x live`
    - `x settled`
    - `x tickets`
  - compact settlement mode cards were widened slightly and re-balanced for better tablet readability
  - the selected-table dock and payment-state strip were visually de-emphasized so the main settlement CTA stays dominant

### Phase D: Production Counter Polish

Goal:

- Close the last usability gap between a working cashier screen and a market-ready counter POS.

Expected direction:

- Keep the settlement dock visually quiet and action-first.
- Tighten tablet-density and queue readability without hiding critical states.
- Improve fast operator recovery after payment, clear-table, or reopen actions.
- Add only high-signal refinements from this point onward:
  - keyboard / numpad acceleration
  - denser tablet spacing
  - cleaner reopen / history flow
  - print / void / refund handoff hooks where needed

Acceptance target:

- The cashier can run a full table workflow without hunting for the next button.
- Payment, reopen, and post-settlement handoff feel immediate.
- The surface reads like one coherent counter tool instead of multiple stitched modules.

Status:

- Implemented in code, pending full cashier smoke QA and production-fit review.

Implementation notes:

- The repo's original cashier module plan is effectively past phases 1 to 4 already:
  - cashier shell exists
  - table-deep integration exists
  - HitPay flow exists
  - direct staff order creation exists
- Sakorio-specific work is now focused on final production polish rather than missing infrastructure.
- Cashier keyboard accelerators now exist for local service flow:
  - `F2` to jump to menu search
  - `F4` to jump to payment dock
  - `F6` to move to the next ready table
  - `F8` to trigger the primary settlement action when checkout is ready
- The cashier shell has been tightened further for tablet-density:
  - narrower lane spacing
  - denser product cards
  - a quieter settlement dock
  - more compact queue rows
- Queue grouping and ordering now prioritize cashier urgency:
  - settlement-ready bills first
  - then live unpaid bills
  - then paid review items
- The post-checkout outcome card can now reopen the just-settled bill directly, in addition to moving the cashier to the next ready table.
- The cashier table/bill language is now more consistent:
  - `Orders` instead of mixed `Bills` / `Orders`
  - `Resume bill`, `Collect payment`, and `Orders` action wording
  - selected-table summaries now distinguish:
    - live bill in service
    - awaiting payment
    - last paid bill
    - clear table ready for a new bill
- Selected-table order history now supports a compact recent-first mode with an explicit `Show all` toggle for longer bill trails.
- The checkout dock is now more table-first and state-aware:
  - selected-table empty states use the same primary action wording as the floor cards
  - settlement rows show a short state caption plus a concise bill badge
  - live-bill carts now label add-on work explicitly instead of reading like a fresh blank ticket
- Next-table recovery now moves the cashier back into the menu lane immediately instead of only changing selection.
- Queue groups now sort their linked orders by cashier urgency inside each table bucket, not only by newest timestamp.
- Queue cards now surface a clearer next-step hint plus grouped order-count actions so the counter rail reads like a taskboard instead of a generic order list.
- Selected-table history now exposes a compact open / paid / latest summary before the bill grid so table recovery is easier to scan under pressure.
- Post-settlement recovery is now shorter:
  - the outcome card can clear the just-paid table directly
  - history actions now read as `Collect`, `Resume`, and `Receipt`
- The open-bill queue now starts with a top-level cashier summary strip:
  - bills awaiting payment
  - live unpaid bills
  - paid review items
- Table selection now resolves the linked bill using the same cashier-priority queue ranking, so floor clicks and queue clicks stay aligned.
- The cashier table lane has been widened and simplified further so floor cards now behave more like operator control tiles than compressed info cards:
  - stronger primary-action placement
  - clearer secondary `Orders` / `Clear paid` actions
  - less metadata wrapping inside narrow table cards
- The settlement dock has been tightened again:
  - smaller settlement mode cards
  - a quieter, denser sticky checkout rail
  - checkout outcome actions and primary settlement CTA now stack more predictably in narrower cashier layouts
  - the active settlement summary now stays pinned inside the cashier rail while the cart scrolls
  - the selected settlement mode now sits inside the summary pill row instead of a separate column
  - grouped queue previews are denser and more tile-like for faster table scanning
- The selected-table history / recovery rail now uses more cashier-native bill wording:
  - table-linked history reads as recovery rather than generic orders
  - action labels are shorter (`Collect`, `Resume`, `Receipt`)
  - linked bill copy now distinguishes live, awaiting-payment, and settled states more clearly
  - recovery cards are denser and no longer stretch full-width actions across every history tile
- Recovery transitions now guide the operator more clearly:
  - reopening a settled bill explicitly enters review mode
  - awaiting-payment bills consistently point the cashier to the checkout dock
  - next-table actions now confirm that the next table is clear and ready to build from the catalog
- Grouped cashier queue copy is now shorter and more scanable:
  - counts lead the summary
  - `awaiting payment` replaces vaguer settle wording in the supporting copy
  - empty-state language now reflects cashier attention instead of only open bills
- A repo-wide Angular build issue still exists outside the cashier module:
  - unresolved SCSS / Angular SSR path resolution
  - this is not introduced by the cashier POS polish pass, but it still blocks a clean local production build until the broader frontend config is repaired

## 3. Integration Notes

These changes must fit the current stack, not replace it:

- **Frontend:** Angular
- **Backend:** FastAPI + SQLModel
- **Payments:** HitPay already exists in repo
- **Reports:** existing `/reports` route and export flow should be extended, not duplicated
- **POS:** current cashier shell should be enhanced, not rebuilt as a disconnected module

## 4. Non-Goals

The following are explicitly out of scope for this checklist:

- split bills
- partial payments against one order
- multi-payer settlement
- payment-provider abstraction rewrite
- replacing HitPay

## 5. Execution Order

1. Phase A: Payment-type sales reporting
2. Phase B: POS item photos
3. Phase C: Cashier workflow polish
4. Phase D: Production counter polish
5. Re-check UI polish after all phases land

## 6. QA Focus

When validating these Sakorio gaps, check:

- Payment method values remain consistent from order write-paths to reports.
- HitPay online orders still mark correctly as `hitpay`.
- Staff mark-paid actions map cleanly to `cash` or `terminal`.
- Exported reports match the on-screen totals.
- POS images do not push key actions below the fold or reduce touch accuracy.
