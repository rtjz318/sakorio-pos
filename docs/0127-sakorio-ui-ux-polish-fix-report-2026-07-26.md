# Sakorio UI/UX polish fix report

Date: 2026-07-26  
Source audit: `docs/0126-sakorio-live-ui-ux-audit-customer-staff-2026-07-26.md`  
Scope: Customer menu, POS table board, POS payment labels, Orders loading UX

## Changes implemented

### 1. Customer menu long-scroll polish

Added:

- Customer-facing menu search field in the sticky category area.
- Search filtering across item name, category, subcategory, descriptions, ingredients, winery/country/region fields.
- Search result count copy.
- Floating “Top” button after scrolling.

Reason:

- The Ajisen menu has 112 items. Category segmentation was already present, but search and top navigation reduce menu fatigue.

### 2. Orders loading skeleton

Replaced the plain `Loading orders...` empty state with:

- “Syncing live orders” copy.
- Skeleton table-ticket cards.
- Explicit message that live bills and kitchen states are refreshing.

Reason:

- The Orders page can take a few seconds to hydrate active table groups. A skeleton feels steadier and less broken during service.

### 3. Staff payment label clarity

Changed staff cash payment labels from:

- `Staff cash`
- `Cash (staff)`

To:

- `Counter cash`
- `Counter cash — staff only`

Reason:

- Customers do not see Cash. Staff still need counter settlement, but the label must be impossible to confuse with customer payment options.

### 4. POS table status hierarchy

Added table-state styling via `data-table-state`:

- Available tables get a green status accent.
- Occupied/reserved tables get a warning/amber accent.
- Open-order tables get a primary accent.
- Ready/awaiting-clear tables get a success accent.
- Closed tables are visually muted.

Reason:

- Waiters/cashiers need to scan table state quickly without reading every line.

### 5. POS item card readability

Improved POS product card hierarchy:

- Category label is now a small uppercase pill.
- Item name and price have stronger visual weight.
- Hover state is clearer.

Reason:

- Long Japanese menu item names are easier to scan when category, name, helper text, and price have distinct hierarchy.

## Verification completed

Local frontend compiler:

- Docker frontend hot reload rebuilt `menu-component`, `orders-component`, and `cashier-pos-component`.
- Build output: `Application bundle generation complete`.

Local smoke:

- `http://127.0.0.1:4202/` returned HTTP `200`.

## Live-browser QA still required after deployment

Once Render deploys this commit, verify live:

1. Customer QR active menu shows search, category chips, and Top button.
2. Customer search filters menu items correctly.
3. POS table cards show stronger state hierarchy.
4. POS payment panel shows `Counter cash — staff only`.
5. Orders page skeleton appears during refresh/loading.

## Expected UI/UX score lift

Previous audit score: `8.9 / 10`  
Expected after live verification: `9.2–9.4 / 10`

The remaining gap to 10/10 is mainly physical iPad rehearsal, real service stress, and data cleanup before launch.
