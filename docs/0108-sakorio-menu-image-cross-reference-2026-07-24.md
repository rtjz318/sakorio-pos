# Sakorio Menu Image Cross-Reference Update

Date: 2026-07-24  
Image source PDF: `C:/Users/rickt/Downloads/MENU (1).pdf`  
Live staff domain checked: `https://staff.sakorio.com`  
Live customer ordering domain checked: `https://order.sakorio.com`  
Tenant observed: Ajisen Ramen / tenant id 1

## Outcome

The existing live POS menu products were cross-referenced against `MENU (1).pdf`, and matching product images were uploaded to the live POS catalog.

- No products were deleted in this pass.
- No product names or prices were changed in this pass.
- Product images were updated only when the PDF image could be confidently matched to the existing POS product name/code.
- 75 live products were updated with images.
- 28 products were intentionally left without images because the PDF did not provide a clear exact match or the item was an add-on/generic/ambiguous drink item.

## Method

1. Rendered the 14-page PDF to high-resolution page images.
2. Visually reviewed the full PDF contact sheet.
3. Cropped high-confidence product images from the PDF pages.
4. Matched crops to existing live POS product names.
5. Uploaded each matched crop through the live staff Products UI image-upload flow.
6. Verified the live Products page and live customer QR menu in the browser.

## Products updated by category

| Category | Total products | Products with images after update | Products without images |
| --- | ---: | ---: | ---: |
| Deep Fried Menu | 8 | 8 | 0 |
| Drink Menu | 32 | 16 | 16 |
| Izakaya Menu | 8 | 8 | 0 |
| Noodle & Rice Menu | 24 | 15 | 9 |
| Quick Bites | 19 | 17 | 2 |
| Stir Fried Menu | 12 | 11 | 1 |
| Total | 103 | 75 | 28 |

## High-confidence image matches uploaded

### Food

- Quick Bites: A1 to A16 where matching images were present, plus boiled gyoza add-on.
- Stir Fried Menu: B1 to B6.5 matching variants.
- Deep Fried Menu: C1 to C5 matching variants, plus deep fried gyoza add-on.
- Izakaya Menu: D1 to D7 matching variants, plus cream croquette add-on.
- Noodle & Rice Menu: Tsukemen, Spicy Tsukemen, Mazesoba, T4 Stir Fried Noodles, key ramen items, and rice items with matching photos.

### Drinks

Clear drink image matches were uploaded for:

- Asahi Beer/330ml
- Kaku Highball
- Suntory Whisky Kaku
- Chita Highball
- THE CHITA/Bottle
- Ichiro's Molt/Glass
- Ichiro's Molt/Bottle
- DAIYAME/Glass
- DAIYAME/Bottle
- Mitake/Glass
- Mitake/Bottle
- Chill Green/Glass
- Chill Green/Bottle
- Umeshu/Glass
- Umeshu/Bottle
- (Promo) Sake Yume no Kaori 180ml $18

## Items intentionally left without images

These were left untouched because the PDF did not provide a clear one-to-one product image match, or the item is a generic/add-on item:

- Kaedama add noodle
- Mentai rice
- Miso Ramen
- Nori seaweed 3pcs
- Rice
- Shoyu Tsukemen
- Calpis Sour
- Calpis Water/Soda $6 Dollars
- Coke High
- Green Tea High
- Lemon Sour
- Oolong High
- Sake 300ml $43
- Sake 720ml $120
- Sake 720ml $180
- Sake 720ml $98
- Soda $3
- Soft drink $7
- Wine $128
- Wine $98
- Yoshinogawa/Bottle
- Yoshinogawa/Glass
- Add Kimchi $2
- Add Spring Onion Negi $1
- Char Siu 1pc
- Harusame Salad (Vermicelli)
- Steamed Chicken
- Stir-Fried Vegetables

## Live browser verification

### Staff Products page

Verified on the live staff Products page:

- 103 product rows loaded.
- 75 rows now have product images.
- 28 rows remain without images for the reasons listed above.
- Category image counts matched the expected update plan.

### Customer QR menu

Verified on a live active T09 customer QR menu:

- Customer menu loaded successfully.
- Menu displayed 103 items.
- Product images rendered on menu cards.
- Sample product names and prices were visible with images:
  - A1 Kimchi - SGD 4.00
  - Asahi Beer/330ml - SGD 9.00
  - C1 (2pcs)Deep Fried Chicken Karaage - SGD 6.00
  - Tonkotsu Ramen - SGD 12.80
  - Umeshu/Bottle - SGD 98.00
  - Fried shrimp rice ebi - SGD 13.80

The QR access token used for browser verification is intentionally not recorded here.

## Notes and recommendations

1. The food image coverage is strong: all clear food-card matches from the PDF were uploaded.
2. Drink image coverage is partial by design: only clear bottle/glass matches were uploaded.
3. The generic sake and wine products should be renamed into specific bottle names if the restaurant wants accurate bottle images for each one.
4. If needed, the next menu-polish pass should add proper images for the remaining generic items from a cleaner source image set rather than guessing from the PDF.

