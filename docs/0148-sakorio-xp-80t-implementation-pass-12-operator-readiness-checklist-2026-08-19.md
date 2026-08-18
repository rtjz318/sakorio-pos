# Sakorio XP-80T Implementation Pass 12 — Operator Readiness Checklist

Date: 2026-08-19  
Scope: XP-80T iPad Bluetooth printing preparation before physical hardware testing

## Outcome

This pass adds an operator-facing XP-80T readiness checklist to the Settings printing panel.

Added:

- `front/src/app/services/xp80t-printer-readiness.ts`
- `front/scripts/test-xp80t-readiness.mjs`
- `npm run test:xp80t-readiness`

Updated:

- `front/src/app/settings/xp80t-native-setup.component.ts`
- `front/package.json`

## Why this matters

Before a physical XP-80T is connected, staff still need a clear setup screen that explains what is missing:

- native iPad app plugin;
- Bluetooth printer connection;
- printer-agent token;
- iOS Keychain storage;
- worker running;
- backend heartbeat;
- last print confirmation;
- current worker errors.

Without this checklist, the setup screen can say "not connected" but not tell the operator what to fix next.

## Readiness scoring

The setup panel now shows:

- readiness label;
- percentage score;
- next action;
- checklist of pass/fail items.

The checklist intentionally does not claim launch readiness until the worker has connected, heartbeated, and cleared errors.

## Scenarios verified

### XP80T-O01 — Browser mode / plugin missing

Expected:

- not ready;
- tells operator to open Sakorio through the native iPad app.

### XP80T-O02 — Connected but worker not started

Expected:

- not ready;
- tells operator to start the worker.

### XP80T-O03 — Worker has Bluetooth error

Expected:

- not ready;
- surfaces exact error message for troubleshooting.

### XP80T-O04 — Fully configured

Expected:

- ready;
- score is 100%;
- label is `Ready for XP-80T service`.

## Verification commands

```bash
docker exec pos-front npm run test:xp80t-readiness
docker exec pos-front npm run test:ipad-printer-worker-sim
docker exec pos-front npm run test:xp80t-receipt-renderer
docker exec pos-front npm run build -- --configuration production-static
```

Backend printing regression:

```bash
docker exec pos-back python -m pytest -q tests/test_printing_service.py tests/test_printing_routes.py
```

## Remaining physical requirement

This pass improves the operator setup workflow but still cannot prove Bluetooth radio behavior.

Still required:

1. Mac/Xcode iOS project generation.
2. Real iPad app install.
3. XP-80T Bluetooth pairing.
4. Live kitchen ticket print.
5. Live cashier receipt print.
6. Reconnect test after iPad/printer sleep.

