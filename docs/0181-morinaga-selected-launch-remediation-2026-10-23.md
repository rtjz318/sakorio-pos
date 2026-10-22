# Morinaga Ramen Izakaya — Selected Launch Remediation

**Date:** 2026-10-23 (Asia/Singapore)  
**Environment:** Production (`staff.sakorio.com`, `order.sakorio.com`, `api.sakorio.com`)  
**Tenant:** Morinaga Ramen Izakaya (`tenant_id=3`)  
**Development commit:** `c1c2343e0df5ed50751f9fa58b463a8be20f79e5`  
**Method:** Code changes were container-tested first, then deployed and re-verified on the live domains through the browser.

## 1. Scope

The owner requested remediation of the earlier launch list **except items 1, 3, 4 and 6**. This pass therefore covered:

| Earlier item | Scope | Result |
|---|---|---|
| 2 | XP-80T printing readiness | Prepared; physical tablet pairing and receipt proof still require the restaurant device |
| 5 | Twenty-two menu products without images | Closed as approved source-parity text fallback, not broken media |
| 7 | Public stray `test` tenant | Fixed, deployed and verified live |
| 8 | Controlled end-to-end rehearsal | Test surfaces prepared; side-effecting records/payment and hardware output require explicit execution approval |

Items 1 (HitPay credentials), 3 (security/password/OTP), 4 (reservation policy/email) and 6 (staff accounts) were deliberately not changed in this pass.

## 2. Public tenant archive — completed

### Change

- Added `Tenant.is_publicly_listed`, defaulting to `true`.
- Added migration `20261023110000_add_tenant_public_listing.sql`.
- The migration marks the legacy tenant named `test` as not publicly listed.
- `/public/tenants` now returns only publicly listed tenants.
- Direct tenant access remains available, so the record is archived from discovery rather than deleted.
- Added automated coverage proving that an unlisted tenant disappears from discovery while its direct public detail endpoint remains reachable.

### Live-browser evidence

- Render deployed commit `c1c2343` successfully.
- `https://api.sakorio.com/public/tenants` returned only:
  - Ajisen Ramen (`is_demo=true`)
  - Morinaga Ramen Izakaya (`is_demo=false`)
- `https://api.sakorio.com/public/tenants/2` still returned the archived `test` tenant, confirming reversibility.
- `https://order.sakorio.com/` showed exactly the Ajisen demo card and Morinaga production card; the stray tenant was absent.
- Public footer build evidence showed `2.1.6 / c1c2343e`.

**Result:** PASS — 10/10.

## 3. Menu image review — closed as source parity

### Findings

- Morinaga has 112 products.
- 90 products have uploaded images.
- 22 products use the intentional text/initial fallback.
- The same 22 product names are text-only in the Ajisen source menu used to create Morinaga; there is no missing source image to copy.
- The live Morinaga public menu rendered every name and price without broken-image controls.

### Text-only products

Bottle Water; Calpis (Water or Soda); Calpis Sour; Coca-Cola; Coca-Cola Zero; Coke High; Green Tea (Hot or Cold); Green Tea High; Lemon Sour; Oolong High; Oolong Tea (Cold); Sprite; Add Kimchi $2; Add Spring Onion Negi $1; Char Siu 1pc; Kaedama add noodle; Nori seaweed 3pcs; Rice; Shoyu Tsukemen; Harusame Salad (Vermicelli); Steamed Chicken; B7 Ramen Izakaya Style Omelette.

### Decision

Do not invent photographs or reuse inaccurate images. The current fallback is honest, readable and matches the source catalog. Official images can be uploaded later when the restaurant supplies them.

**Result:** PASS WITH INTENTIONAL TEXT FALLBACK — 9/10.

## 4. XP-80T printing readiness — prepared, hardware proof pending

### Live configuration prepared

- Device name: `Morinaga XP-80T Android Tablet`
- Receipt route: all kitchen and bar stations
- Device type: Sakorio tablet app
- Printer transport: native tablet Bluetooth

### Current live state

- Online agents: `0/0`
- Waiting jobs: `0`
- Failed jobs: `0`
- Printed jobs: `0`
- Readiness: `13%`
- No printer-agent token has been created yet.
- No Android heartbeat or completed receipt exists yet.

### Required acceptance sequence

1. Create the persistent printer-agent pairing credential in Settings → Printing.
2. Paste and save it in the Sakorio Android tablet app.
3. Pair the tablet to the XP-80T over Bluetooth.
4. Start the print worker and verify `1/1` online within 90 seconds.
5. Print one kitchen item ticket, one grouped cashier receipt and a multi-item kitchen split test.
6. Confirm restaurant name, item names, quantities, prices, totals, station route and paper cut.

Creating the credential is intentionally held at the final button because it grants persistent device access. Physical pairing cannot be certified without the restaurant tablet and printer online.

**Result:** PARTIAL — 3/10 until the physical receipt acceptance test passes.

## 5. Controlled rehearsal — prepared, transactional proof pending

The clean Morinaga baseline remains suitable for a controlled rehearsal: no stale public test tenant is discoverable, no waiting print jobs exist, and the public/menu/table surfaces are available.

The required live rehearsal remains:

1. Create one clearly named synthetic reservation.
2. Arrive and assign the reservation to a Morinaga table.
3. Place QR first-round and second-round orders in the same table session.
4. Verify Kitchen and Beverages routing, then progress tickets to served.
5. Mark a small controlled bill as terminal-paid without charging a card.
6. Close the table and reconcile Orders, History and Reports.
7. Join the queue, verify realtime host ping, seat/cancel it and confirm the customer page updates.
8. Run clock-in and clock-out with a designated test profile.
9. Verify printing once the Android agent is online.
10. Record and, with approval, remove or retain the clearly named synthetic evidence.

Submitting the guest records and marking a bill paid are external side effects, so this report does not misrepresent them as completed before action-time approval.

**Result:** READY TO EXECUTE; NOT YET SCORED AS A PASS.

## 6. Verification record

- Focused backend tests: **9 passed**.
- Full backend suite: **359 passed, 2 warnings**.
- Local migrations completed through schema `20261023110000`.
- Local API health returned `status=ok` after restart.
- Fresh backend logs showed the migration current and the API healthy.
- Render auto-deploy and the duplicate manual deploy both completed successfully on commit `c1c2343`.
- Live public discovery and the public restaurant picker were rechecked after deployment.

During verification, the older migration `20261021170000_transfer_morinaga_owner_email.sql` was corrected to exit safely when Morinaga does not exist in a clean development/test database. This preserves production behavior while restoring idempotent local migrations.

## 7. Current launch interpretation

Item 7 is fully fixed. Item 5 is resolved as intentional source parity rather than by assigning misleading images. Items 2 and 8 cannot be honestly marked complete until the persistent agent credential, physical XP-80T/tablet connection and side-effecting live rehearsal are executed and observed.

The system should therefore remain in **controlled rehearsal status**, not unconditional launch approval.
