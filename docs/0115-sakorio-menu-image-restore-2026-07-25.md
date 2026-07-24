# Sakorio menu image restore and live verification

Date: 2026-07-25  
Source PDF: `C:/Users/rickt/Downloads/MENU (1).pdf`  
Live surfaces checked:

- Staff Products: `https://staff.sakorio.com/products`
- Customer QR menu: `https://order.sakorio.com/menu/f3237d03-0203-4c74-b726-9e758e21053f?qr_access=cCrrsvgcFg7XkgADQAfmZd9hJ8TQNwyHcpsf3moSN0g`

## Objective

Restore the menu pictures from `MENU (1).pdf` into the live Sakorio POS menu so that staff and customer ordering pages show the correct product images.

The prior issue was that product records had image filenames, but the live uploaded image files were missing on the API host, causing broken/404 images in the browser.

## Work completed

1. Reused the previously verified PDF image crops from:
   - `tmp/menu_product_crops/`
   - `tmp/menu_product_crops/menu_product_image_map.json`
2. Uploaded images into the live Sakorio staff Products interface through the real browser UI.
3. Matched images by exact product name and curated aliases only.
4. Avoided unsafe fuzzy matching where product names were similar but visually different.
5. Verified the restored images on both staff and customer-facing live browser pages.

## Staff Products verification

Live browser page: `https://staff.sakorio.com/products?qa=image-restore-verify-products-0116`

Result:

| Check | Result |
| --- | ---: |
| Total product rows | 112 |
| Rows with image tag | 90 |
| Rows with loaded image | 90 |
| Broken image tags | 0 |
| Text-only products without image | 22 |

Sample verified loaded images:

- A9 Boiled Gyoza Dumplings with Ponzu Sauce (3 pcs)
- A5 Chanja
- A7 Edamame
- A12 Boiled Seasoned Egg
- add (1pcs)Boiled Gyoza
- A10 Cold Tofu
- A14 Radish Pickles with Yuzu
- B1 Stir-Fried Bean Sprouts

## Customer QR menu verification

The currently open customer QR tab for T02 was closed and correctly showed:

> Table Closed — This table is not currently accepting orders.

So customer verification was performed on an active T01 QR menu.

Live browser page:

`https://order.sakorio.com/menu/f3237d03-0203-4c74-b726-9e758e21053f?qr_access=cCrrsvgcFg7XkgADQAfmZd9hJ8TQNwyHcpsf3moSN0g`

Result after scrolling through the live QR menu to trigger lazy-loaded images:

| Check | Result |
| --- | ---: |
| Rendered images | 96 |
| Rendered upload images | 96 |
| Loaded images after scroll | 96 |
| Broken customer menu images | 0 |

Note: the customer menu renders some product images more than once due to the UI layout/featured sections. This is why the QR menu shows 96 rendered images while Staff Products has 90 image-backed products.

## Text-only products intentionally left without image

These products currently remain text-only:

- Kaedama add noodle
- Nori seaweed 3pcs
- Rice
- Shoyu Tsukemen
- Calpis Sour
- Coke High
- Green Tea High
- Lemon Sour
- Oolong High
- Add Kimchi $2
- Add Spring Onion Negi $1
- Char Siu 1pc
- Harusame Salad (Vermicelli)
- Steamed Chicken
- Calpis (Water or Soda)
- Oolong Tea (Cold)
- Bottle Water
- B7 Ramen Izakaya Style Omelette
- Green Tea (Hot or Cold)
- Coca-Cola
- Coca-Cola Zero
- Sprite

## Outcome

Menu image restore is complete for the current live Sakorio POS menu:

- Staff Products: pass
- Customer QR ordering menu: pass
- Broken image count: 0
- PDF-backed image products restored: 90

## Remaining launch caveat

The restored image files must survive future Render deploys.

If `back/uploads` is not backed by persistent storage, object storage, or a mounted Render persistent disk, a redeploy can remove the physical image files while leaving image filenames in the database. That would recreate the old 404/broken-image issue.

Recommended next infrastructure action:

1. Confirm whether the live API service has persistent storage mounted for uploaded files.
2. If not, configure a Render persistent disk or move product uploads to object storage.
3. Run a redeploy smoke check:
   - Staff Products should still show 90/90 loaded images.
   - Customer QR menu should still show 0 broken images after scrolling.

