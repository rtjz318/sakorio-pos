# Sakorio XP-80T Implementation Pass 9 — Receipt Renderer Use-Case Tests

Date: 2026-08-18  
Scope: XP-80T iPad/native Bluetooth printing compatibility

## Outcome

This pass adds a repeatable internal receipt-renderer regression test for XP-80T printing.

Added:

- `front/scripts/test-xp80t-receipt-renderer.mjs`
- `npm run test:xp80t-receipt-renderer`

## Why this matters

Before physical Bluetooth testing, Sakorio needs to prove that the receipt payloads are rendered safely and consistently for XP-80T style ESC/POS printing.

This test checks the actual TypeScript receipt renderer by transpiling `src/app/services/escpos-receipt-renderer.ts` in Node, then executing the exported renderer functions.

It does not test a copied/mock renderer.

## Use cases covered

### XP80T-R01 — Kitchen ticket for table QR first round

Checks:

- Kitchen header renders.
- Table number renders.
- Item quantities render.
- Kitchen notes render.
- Order notes render.
- Kitchen ticket does not include customer totals.

### XP80T-R02 — Customer paid receipt

Checks:

- Customer receipt header renders.
- Line item prices render.
- Subtotal renders.
- Tip renders.
- Total renders.
- HitPay payment method renders.
- Thank-you footer renders.

### XP80T-R03 — Long item names and long notes

Checks:

- Long menu names stay within the 42-character 80mm receipt width.
- Long notes wrap safely.
- Terminal payment method renders.
- Large totals render safely.

### XP80T-R04 — Counter / walk-in fallback

Checks:

- Non-table orders fall back to `Counter`.
- String order references render.
- Empty item arrays do not crash the renderer.

## Technical checks

For every use case, the test verifies:

- `renderEscposReceipt()` returns `Uint8Array`.
- ESC/POS initialize command is present.
- ESC/POS paper cut command is present.
- Receipt lines stay within 42 characters.
- Receipt text has no null bytes.

## Verification commands

Run inside the frontend container:

```bash
docker exec pos-front npm run test:xp80t-receipt-renderer
docker exec pos-front npm run test:xp80t-native-scaffold
docker exec pos-front npm run test:capacitor-ios-readiness
docker exec pos-front npm run build -- --configuration production-static
```

Backend print queue regression:

```bash
docker exec pos-back python -m pytest -q tests/test_printing_service.py tests/test_printing_routes.py
```

## Remaining physical launch requirement

This pass verifies ESC/POS receipt generation internally. It does not replace the physical iPad + XP-80T Bluetooth print test.

Physical testing still needs:

1. Mac/Xcode iOS project generation.
2. Native plugin application.
3. Real iPad install.
4. Real XP-80T Bluetooth pairing.
5. Kitchen and cashier receipt print tests from live POS workflows.

