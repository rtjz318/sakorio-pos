# Sakorio launch stability runbook

Date: 2026-07-22

This runbook records the operational fix for the live-browser QA finding where `order.sakorio.com` briefly returned Render `502 Bad Gateway` while the service was waking.

## Why this matters

During restaurant service, QR ordering cannot depend on a sleeping free instance. A guest who scans a QR code should see the menu immediately, not a Render wake/interstitial/502 page.

## Required launch setting

Before production launch, the public customer service and staff service must run on an always-on paid Render instance.

Minimum recommendation:

- Public customer web: **Starter or higher**
- Staff web: **Starter or higher**
- API/backend: **Starter or higher**

If budget allows, use **Standard** for the API/backend during launch week because all POS, QR, reservation, queue, KDS, and payment flows depend on it.

## Pre-service health checklist

Run this before opening service:

1. Open `https://order.sakorio.com/`.
2. Open one live table QR URL.
3. Open `https://order.sakorio.com/book/1`.
4. Open `https://order.sakorio.com/waitlist/1`.
5. Open `https://staff.sakorio.com/pos`.
6. Open `https://staff.sakorio.com/kitchen`.
7. Confirm no Render wake/interstitial/502 page appears.

If any page wakes slowly or returns 502:

1. Keep refreshing until the app loads.
2. Check Render service status/logs.
3. Do not launch service until the affected service is upgraded to always-on.

## QA note

This is an infrastructure setting, not an Angular/FastAPI code bug. The app recovered after warm-up during the live QA run, but launch readiness requires removing the wake-up condition entirely.

