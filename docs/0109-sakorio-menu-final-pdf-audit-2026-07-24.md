# Sakorio Menu Final PDF Audit - 2026-07-24

Source checked: `C:/Users/rickt/Downloads/MENU (1).pdf`

Live surfaces checked:

- Staff Products: `https://staff.sakorio.com/products`
- Staff Tables: `https://staff.sakorio.com/tables`
- Customer QR menu: active T01 QR session generated from the live Tables page

## Result

Status: Passed for live names, prices, and image-backed PDF corrections.

The live Products catalog now contains 112 products. The customer QR menu also rendered `112 items`.

## What was corrected live

### Product names and prices

I ran the staff Products table against the PDF mismatch checklist and confirmed 59 targeted name/price checks passed with zero failures. The same 59 checks were then verified on the live customer QR menu with zero failures.

Key corrected examples:

| Product | Live price |
|---|---:|
| Flat Noodle Rich Soy Sauce Ramen | SGD 13.80 |
| R4 Aburi Pork Chashu Don | SGD 10.80 |
| B7 Ramen Izakaya Style Omelette | SGD 12.00 |
| A3 Herring and Herring Roe with Malt | SGD 7.00 |
| A9 Boiled Gyoza Dumplings with Ponzu Sauce (3 pcs) | SGD 6.00 |
| Special KOTTERI Collagen Ramen | SGD 19.80 |
| Tonkotsu Shoyu Ramen | SGD 12.80 |
| Shrimp Fried Rice | SGD 13.80 |
| Pork Chashu Fried Rice | SGD 13.80 |
| Calpis (Water or Soda) | SGD 6.00 |
| Bottle Water | SGD 5.00 |
| THE CHITA/Bottle (700ml) | SGD 168.00 |
| Suntory Whisky Kaku/Bottle (700ml) | SGD 128.00 |
| DAIYAME/Bottle (900ml) | SGD 110.00 |
| Mitake/Bottle (900ml) | SGD 120.00 |
| Chill Green/Bottle (720ml) | SGD 110.00 |
| Mogamigawa 300ml | SGD 43.00 |
| Hanauyou Dewasansan 300ml | SGD 43.00 |
| Iwaki Kotobuki 720ml | SGD 98.00 |
| Yamatoya Zennai 720ml | SGD 98.00 |
| Kankiku Gohyakumangoku 720ml | SGD 118.00 |
| Danchigai Karakuchi (Super Dry) 720ml | SGD 118.00 |
| 98WINES SOU 2024 WHITE | SGD 128.00 |
| 98WINES SOU 2024 ROSE | SGD 128.00 |
| Arugabranca Clareza 2024 | SGD 98.00 |
| Aruga-no Fuego | SGD 98.00 |
| Yume no Kaori 180ml | SGD 26.00 |
| Kicchomu/Bottle (720ml Yellow) | SGD 145.00 |
| Kicchomu/Bottle (720ml Pottery) | SGD 155.00 |

### Missing PDF rows added

These 9 PDF items were added through the live staff Products bulk import and verified in the live table:

| Added product | Live price |
|---|---:|
| Green Tea (Hot or Cold) | SGD 5.00 |
| Coca-Cola | SGD 5.00 |
| Coca-Cola Zero | SGD 5.00 |
| Sprite | SGD 5.00 |
| Yume no Kaori 180ml | SGD 26.00 |
| 98WINES SOU 2024 ROSE | SGD 128.00 |
| Aruga-no Fuego | SGD 98.00 |
| Kicchomu/Bottle (720ml Yellow) | SGD 145.00 |
| Kicchomu/Bottle (720ml Pottery) | SGD 155.00 |

## Image audit

Before the final image pass, the new sake/wine/Kicchomu rows existed but did not have images. I uploaded the cropped images through the live Products edit modal using the browser upload flow.

Final verified image-backed products:

| Product | Image status |
|---|---|
| Flat Noodle Rich Soy Sauce Ramen | Loaded |
| R4 Aburi Pork Chashu Don | Loaded |
| Yume no Kaori 180ml | Loaded |
| Mogamigawa 300ml | Loaded |
| Hanauyou Dewasansan 300ml | Loaded |
| Iwaki Kotobuki 720ml | Loaded |
| Yamatoya Zennai 720ml | Loaded |
| Kankiku Gohyakumangoku 720ml | Loaded |
| Danchigai Karakuchi (Super Dry) 720ml | Loaded |
| 98WINES SOU 2024 WHITE | Loaded |
| 98WINES SOU 2024 ROSE | Loaded |
| Arugabranca Clareza 2024 | Loaded |
| Aruga-no Fuego | Loaded |
| Kicchomu/Bottle (720ml Yellow) | Loaded |
| Kicchomu/Bottle (720ml Pottery) | Loaded |

Staff Products final image count: 90 of 112 products have product images attached.

The 22 products still without product images are mostly add-ons, simple drinks, or text-only items where no confident crop was attached in this pass:

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

## Customer QR verification

I activated a live T01 QR session from the staff Tables page and opened the customer QR menu in the browser.

Customer-facing checks:

- QR menu rendered for Ajisen Ramen / T01.
- Menu displayed `112 items`.
- Corrected PDF names/prices were visible on the customer QR menu.
- The 59-item correction checklist had zero customer-side failures.
- Customer QR page had 96 image elements in the rendered menu. This is higher than the 90 staff product-image count because featured products can appear more than once on the customer menu.

## Cleanup note

T01 was opened only to verify the live customer QR menu. The visible close-table control did not reset T01 during this pass, so T01 may still show as seated/open for QR ordering. No order was placed from this QA session.

## Launch-readiness note

For this menu-import task, the live catalog is ready from a names/prices standpoint. Image-backed PDF corrections completed successfully. The only remaining manual decision is whether the 22 intentionally/no-confident-image products should stay text-only or receive placeholder/product photos later.
