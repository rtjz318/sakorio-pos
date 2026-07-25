# Sakorio menu image persistence check

Date: 2026-07-25  
Live domains checked:

- Staff Products: `https://staff.sakorio.com/products?qa=image-persistence-check-0117`
- Customer QR menu: `https://order.sakorio.com/menu/f3237d03-0203-4c74-b726-9e758e21053f?qr_access=cCrrsvgcFg7XkgADQAfmZd9hJ8TQNwyHcpsf3moSN0g`
- API uploaded image sample: `https://api.sakorio.com/uploads/1/products/67e30174-89dc-4781-97fa-0680b0475533.jpg`

## Check outcome

The image restore itself succeeded earlier, but the persistence check found that the uploaded image files have already disappeared from the live API filesystem.

This confirms the launch-blocking storage risk: product rows still contain image filenames, but the actual files under `/uploads` are no longer available.

## Evidence

### Raw API image URL

Checked:

`https://api.sakorio.com/uploads/1/products/67e30174-89dc-4781-97fa-0680b0475533.jpg`

Result:

- HTTP status: `404 Not Found`

### Staff Products page

Staff login succeeded through the live browser.

Staff Products result:

| Check | Result |
| --- | ---: |
| Product rows | 112 |
| Product rows with image tags | 90 |
| Loaded product images | 0 |
| Broken image tags | 90 |
| Text-only products | 22 |

The staff page still has product image URLs, but all 90 image-backed products fail to decode because the files are missing from the API host.

### Customer QR menu

The active T01 QR menu loaded the menu content correctly, but after a full scroll pass:

| Check | Result |
| --- | ---: |
| Rendered QR menu images | 96 |
| Loaded QR menu images | 0 |
| Broken QR menu images | 96 |

## Root cause

The current application stores uploaded product images on the backend service filesystem.

Relevant code/config:

- `back/app/main.py` defines `UPLOADS_DIR = Path(__file__).parent.parent / "uploads"`.
- Product uploads are stored below `{UPLOADS_DIR}/{tenant_id}/products/`.
- Staff/customer images are served from `https://api.sakorio.com/uploads/...`.
- Local Docker compose bind-mounts `./back/uploads:/app/uploads`, but the Render API service does not appear to have persistent upload storage confirmed from the live check.

Render services have ephemeral filesystems by default. If no persistent disk or object storage is attached, runtime file uploads can be lost after a deploy/restart.

## Render dashboard access note

The in-app browser was not signed into Render during this check, so the Render service Disks page could not be inspected directly.

The live behavior is still enough to confirm the operational issue: uploads are not currently surviving on the API host.

## Required fix

Fix the API service storage first, then reupload the images.

The service that needs persistent storage is:

- `restaurant-pos-staging-api`
- Public host: `https://api.sakorio.com`

The staff/customer web services do not store product images. Upgrading only `restaurant-pos-staging-staff-web` will not fix this image issue.

### If the API service is Render native Python

Based on the hosted service mapping, the API is a Python web service with root directory `back`.

Use persistent disk mount path:

`/opt/render/project/src/uploads`

Why: with Render native runtimes, the checked-out root directory is under `/opt/render/project/src`, and the backend code resolves uploads to `<rootDir>/uploads`.

### If the API service is Docker

If the API service is actually running from `back/Dockerfile`, use:

`/app/uploads`

Why: the Dockerfile sets `WORKDIR /app`.

## Recommended sequence

1. Open Render Dashboard.
2. Open `restaurant-pos-staging-api`, not staff web.
3. Upgrade the API instance if it is on Free, because persistent disks require a paid service.
4. Add a persistent disk:
   - Name: `sakorio-api-uploads`
   - Size: minimum practical size, e.g. `1 GB` to start.
   - Mount path:
     - `/opt/render/project/src/uploads` for native Python
     - `/app/uploads` for Docker
5. Let Render redeploy the API service.
6. Reupload the 90 menu product images from `MENU (1).pdf`.
7. Re-run the image smoke check:
   - Staff Products should show `90 / 90` loaded images.
   - Customer QR menu should show `96 / 96` rendered images loaded after scrolling.
   - Sample raw API image URL should return `200`.
8. Trigger one more redeploy/restart and repeat the same check to prove persistence.

## Launch status

Menu images are not launch-ready until persistent upload storage is configured and the image set is reuploaded.

