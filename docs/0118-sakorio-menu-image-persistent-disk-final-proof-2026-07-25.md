# Sakorio menu image persistent disk final proof

Date: 2026-07-25  
Backend fix commit: `585deb6b`  
Render API service: `restaurant-pos-staging-api`  
API domain: `https://api.sakorio.com`

## Objective

Prove that menu images survive a real API redeploy/restart after adding Render persistent disk storage.

## What happened

The first Render disk was mounted at:

`/opt/render/project/src/uploads`

The backend originally resolved uploads to:

`Path(__file__).parent.parent / "uploads"`

Because the Render API service uses root directory `back`, that path resolves to:

`/opt/render/project/src/back/uploads`

So the disk existed, but the backend was still writing product images into the old non-persistent path. A manual API deploy immediately reproduced the problem: uploaded product image URLs returned `404` again.

## Code fix

Updated `back/app/main.py` so runtime uploads are resolved through `_resolve_uploads_dir()`.

Resolution order:

1. `UPLOADS_DIR` environment variable, if explicitly configured.
2. Render disk path `/opt/render/project/src/uploads`, if it exists.
3. Existing local/dev fallback: `back/uploads`.

This lets local Docker/dev keep working while the Render API uses the persistent disk.

## Deployment sequence

1. Pushed backend fix commit `585deb6b`.
2. Render auto-deployed `restaurant-pos-staging-api`.
3. Confirmed API deploy became Live.
4. Reuploaded all PDF-backed menu product images through the live staff Products UI.
5. Verified Staff Products before final redeploy.
6. Triggered one more manual API deploy from Render.
7. Confirmed final manual deploy became Live.
8. Re-ran Staff Products, customer QR, and direct API image checks.

## Pre-final-redeploy verification

Live staff Products page:

`https://staff.sakorio.com/products?qa=correct-disk-upload-verify-before-final-redeploy-0119`

| Check | Result |
| --- | ---: |
| Product rows | 112 |
| Product image tags | 90 |
| Loaded product images | 90 |
| Broken product images | 0 |

## Final redeploy proof

Manual API deploy:

- Service: `restaurant-pos-staging-api`
- Commit: `585deb6b`
- Status: Live
- Trigger: Manual
- Duration observed in Render: about `1m10s`

## Post-final-redeploy staff verification

Live staff Products page:

`https://staff.sakorio.com/products?qa=post-final-redeploy-persistence-0119`

| Check | Result |
| --- | ---: |
| Product rows | 112 |
| Product image tags | 90 |
| Loaded product images | 90 |
| Broken product images | 0 |

Sample loaded products:

- A5 Chanja
- A7 Edamame
- A12 Boiled Seasoned Egg
- add (1pcs)Boiled Gyoza
- A10 Cold Tofu
- A14 Radish Pickles with Yuzu
- B1 Stir-Fried Bean Sprouts
- A15 Spicy Negi Chashu
- C1 (2pcs)Deep Fried Chicken
- C2 (2pcs)Deep Fried Chicken with Yurinchi Sauce

## Post-final-redeploy customer QR verification

Live customer QR menu:

`https://order.sakorio.com/menu/f3237d03-0203-4c74-b726-9e758e21053f?qr_access=cCrrsvgcFg7XkgADQAfmZd9hJ8TQNwyHcpsf3moSN0g&qa=post-final-redeploy-persistence-0119`

After scrolling through the menu to trigger lazy-loaded images:

| Check | Result |
| --- | ---: |
| Rendered QR menu images | 96 |
| Rendered upload images | 96 |
| Loaded QR menu images | 96 |
| Broken QR menu images | 0 |

## Direct API image checks

Fresh loaded image URLs sampled after the final API redeploy:

| Sample URL | Result |
| --- | --- |
| `https://api.sakorio.com/uploads/1/products/118a1307-169c-4486-ba6c-5065e2be03e1.jpg` | `200 image/jpeg` |
| `https://api.sakorio.com/uploads/1/products/3513bdad-d253-489d-8c7b-93e25b3454e9.jpg` | `200 image/jpeg` |
| `https://api.sakorio.com/uploads/1/products/bb011e95-55df-43e9-995e-364597bd2623.jpg` | `200 image/jpeg` |

## Final outcome

Persistent upload storage is now proven for menu images.

- Backend now writes uploads to the Render disk path.
- Product images survived a full manual API redeploy.
- Staff Products loads `90 / 90` product images.
- Customer QR menu loads `96 / 96` rendered images.
- Direct API image URLs return `200 image/jpeg`.

The menu image persistence blocker is resolved.

