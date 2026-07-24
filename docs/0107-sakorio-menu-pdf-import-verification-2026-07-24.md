# Sakorio PDF Menu Import Verification

Date: 2026-07-24  
Source PDF: `C:/Users/rickt/Downloads/MENU.pdf`  
Live staff domain checked: `https://staff.sakorio.com`  
Live customer ordering domain checked: `https://order.sakorio.com`  
Tenant observed: Ajisen Ramen / tenant id 1

## Outcome

The live POS product catalog was replaced with the cleaned menu from `MENU.pdf`.

- Removed the existing live products through the staff Products page.
- Deleted 10 old products.
- Imported 103 fixed-price products from the PDF.
- Removed broken/non-menu characters from product names and categories, including Japanese extraction fragments, emoji, and mojibake.
- Preserved useful item codes from the PDF such as `C1`, `B2.5`, and `A10`.
- Verified that the imported live products match the cleaned PDF extract by name, category, and price.

## Import rules used

- Product names were taken from the PDF item-name column.
- Categories were taken from the PDF category column.
- Prices were taken from the PDF price column.
- Non-ASCII and broken PDF extraction characters were removed from names and categories.
- Repeated whitespace was collapsed.
- Fixed prices were imported as sellable POS products.
- Variable/open-price rows were not imported because the current product catalog requires a positive fixed price.

## Imported category counts

| Category | Products imported |
| --- | ---: |
| Deep Fried Menu | 8 |
| Drink Menu | 32 |
| Izakaya Menu | 8 |
| Noodle & Rice Menu | 24 |
| Quick Bites | 19 |
| Stir Fried Menu | 12 |
| Total | 103 |

## Skipped PDF rows

| PDF item | Category | PDF price | Reason |
| --- | --- | --- | --- |
| Open Drink | Drink Menu | variable | Current POS catalog requires a fixed positive price. |
| Open Food | Izakaya Menu | variable | Current POS catalog requires a fixed positive price. |

Recommendation: if the restaurant needs ad-hoc/open-price sales, add a proper cashier-only "open item" flow instead of forcing these into the fixed-price product catalog.

## Live verification summary

| Area checked | Result |
| --- | --- |
| PDF extraction | 105 total rows found: 103 fixed-price import rows, 2 variable-price skipped rows. |
| Staff bulk-import preview | 103 of 103 rows ready; 103 new; 0 updates; 0 errors. |
| Old product removal | Staff Products page confirmed 10 products deleted. |
| Product import | Staff Products page confirmed 103 products created, 0 updated. |
| Staff Products browser comparison | 103 live rows matched 103 expected rows; 0 missing; 0 extra; 0 price mismatches. |
| Character cleanup | 0 funny/broken characters detected in live product names/categories after import. |
| Customer QR menu browser check | Live QR menu showed 103 items and the imported categories. |
| Backend API check | `/products` returned 103 products with expected sample prices and 0 funny-character detections. |

## Spot-check samples

| Product | Category | Expected price | Live result |
| --- | --- | ---: | --- |
| C1 (2pcs)Deep Fried Chicken Karaage | Deep Fried Menu | SGD 6.00 | Matched |
| Asahi Beer/330ml | Drink Menu | SGD 9.00 | Matched |
| Miso Ramen | Noodle & Rice Menu | SGD 14.80 | Matched |
| Sake 720ml $120 | Drink Menu | SGD 120.00 | Matched |
| B2.5 (Full)Mapo Tofu | Stir Fried Menu | SGD 15.00 | Matched |
| Stir-Fried Vegetables | Stir Fried Menu | SGD 12.00 | Matched |

## Customer ordering browser check

The live customer QR menu was opened through `order.sakorio.com`.

Observed:

- Page loaded successfully.
- Menu count displayed as 103 items.
- Imported categories were visible:
  - Deep Fried Menu
  - Drink Menu
  - Izakaya Menu
  - Noodle & Rice Menu
  - Quick Bites
  - Stir Fried Menu
- Imported products and prices were visible on the customer menu.
- No broken PDF characters were visible in the checked menu cards.

The full QR access token used during the check is intentionally not recorded in this document.

## Staff POS route caveat

The menu import itself is verified on the live Products page, customer QR menu, and backend API.

One separate live-browser caveat remains: the staff POS page did not complete a visual post-import check during this pass. The route loaded the POS shell, but counters stayed in a syncing/loading state for an extended period. After repeated retries, the staff browser session became unstable and login attempts began failing, likely due to session expiry or rate limiting.

Direct API checks for POS dependencies were healthy:

- Products endpoint returned 103 products.
- Tables endpoint returned 10 tables.
- Active/all orders endpoint returned data.

Observed risk: the order endpoint had a large live/staging backlog, which can make the POS hydration feel slow or stuck. If staff POS still hangs after the login rate limit clears, the next fix should investigate POS initial loading and stale QA order/history volume, not the menu import data.

## Follow-up recommendations

1. Re-check staff POS visually after the login/rate-limit window clears.
2. Add a cashier-only open-price item flow if `Open Drink` and `Open Food` are required operationally.
3. Clean or archive stale QA/test orders so the POS initial sync stays fast.
4. Keep this PDF import file as the source-of-truth audit for this menu refresh.

