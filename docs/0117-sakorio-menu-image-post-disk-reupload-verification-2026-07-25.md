# Sakorio menu image post-disk reupload verification

Date: 2026-07-25  
Context: Render persistent disk was added to `restaurant-pos-staging-api`, then the API was redeployed.

## Objective

Reupload all menu images from `MENU (1).pdf` after persistent storage was configured, then verify that images load after live page reloads.

## Work completed

All 90 PDF-backed product images were reuploaded through the live staff Products browser UI.

The same curated product-to-image mapping from the previous PDF extraction pass was reused. No fuzzy matching was used.

## Staff Products verification

Live page:

`https://staff.sakorio.com/products?qa=reupload-images-after-disk-verify-0118`

Result after navigating/reloading the staff Products page:

| Check | Result |
| --- | ---: |
| Product rows | 112 |
| Products with image tags | 90 |
| Loaded product images | 90 |
| Broken product images | 0 |
| Text-only products | 22 |

Sample loaded images:

- A9 Boiled Gyoza Dumplings with Ponzu Sauce (3 pcs)
- A5 Chanja
- A7 Edamame
- A12 Boiled Seasoned Egg
- add (1pcs)Boiled Gyoza
- A10 Cold Tofu
- A14 Radish Pickles with Yuzu
- B1 Stir-Fried Bean Sprouts

## Direct API file verification

Sample image URLs were checked directly against `https://api.sakorio.com/uploads/...`.

| Sample | HTTP result |
| --- | --- |
| A9 Boiled Gyoza image | `200 image/jpeg` |
| T4 Stir Fried Noodle image | `200 image/jpeg` |
| Kicchomu/Bottle (720ml Pottery) image | `200 image/jpeg` |

## Customer QR menu verification

Live page:

`https://order.sakorio.com/menu/f3237d03-0203-4c74-b726-9e758e21053f?qr_access=cCrrsvgcFg7XkgADQAfmZd9hJ8TQNwyHcpsf3moSN0g&qa=image-persist-verify-0118`

Result after opening the QR page and scrolling through the menu to trigger lazy-loaded images:

| Check | Result |
| --- | ---: |
| Rendered QR menu images | 96 |
| Rendered upload images | 96 |
| Loaded QR menu images | 96 |
| Broken QR menu images | 0 |

The customer QR menu renders some images more than once in the UI, so the QR page count is 96 while the staff product image-backed product count is 90.

## Outcome

Post-disk reupload verification passed.

- Staff Products image load: pass
- Direct API image file availability: pass
- Customer QR image load after scroll/reload: pass

## Next recommended persistence proof

The current check proves images survive normal live page reloads and are served by the API after the disk-backed reupload.

For a final infrastructure proof, run one more API redeploy/restart after this reupload and repeat:

1. Staff Products should still show `90 / 90` loaded images.
2. Customer QR menu should still show `96 / 96` loaded images after scrolling.
3. A sample API image URL should still return `200 image/jpeg`.

