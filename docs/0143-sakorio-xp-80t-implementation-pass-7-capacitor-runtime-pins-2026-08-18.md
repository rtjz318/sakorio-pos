# Sakorio XP-80T Implementation Pass 7 — Capacitor Runtime Pins

Date: 2026-08-18  
Scope: XP-80T iPad native Bluetooth printing compatibility

## Outcome

This pass pins the minimal Capacitor runtime packages needed by the Sakorio frontend before the Mac/Xcode iOS project generation pass.

Added frontend dependencies:

- `@capacitor/core` `8.5.0`
- `@capacitor/ios` `8.5.0`

Both packages are pinned in `front/package.json` and `front/package-lock.json`.

## Why this was done

The Sakorio XP-80T workflow now has:

- a native Bluetooth printer plugin scaffold;
- a native secure token storage scaffold;
- a browser-safe iPad setup panel;
- local agent and native worker paths;
- receipt rendering through ESC/POS formatting.

The next technical bridge is to make the frontend project aware of Capacitor runtime packages so the iOS app shell can later be generated and wired on a Mac with Xcode.

## What was intentionally not added yet

`@capacitor/cli` was not added in this pass.

Reason: the repository rule forbids `npm install`, and the CLI brings in a much larger dependency tree. Adding it manually to the lockfile would be unnecessarily risky. It should be added in a dedicated Mac/iOS generation pass using the approved container/package workflow, then followed by `npx cap add ios` or equivalent on a Mac with Xcode available.

## Verification

All checks were run inside containers.

### Dependency install

Command:

```bash
docker exec pos-front npm ci --ignore-scripts
```

Result: passed.

Note: npm reported existing audit vulnerabilities. No automated fix was run because that would change dependency versions outside this XP-80T scope.

### Capacitor readiness

Command:

```bash
docker exec pos-front npm run test:capacitor-ios-readiness
```

Result: passed.

Remaining expected warnings:

- `@capacitor/cli` is not installed yet.
- Capacitor iOS project is not generated yet.

### Native scaffold checks

Commands:

```bash
docker exec pos-front npm run test:xp80t-native-scaffold
docker exec pos-front npm run ios:check-native-scaffold
```

Result: passed.

### Backend printing tests

Command:

```bash
docker exec pos-back python -m pytest -q tests/test_printing_service.py tests/test_printing_routes.py
```

Result: passed, 6 tests.

### Frontend production build

Command:

```bash
docker exec pos-front npm run build -- --configuration production-static
```

Result: passed.

Known warnings remain:

- `cashier-pos.component.ts` style budget warning.
- `menu.component.scss` style budget warning.
- `dijkstrajs` CommonJS warning via QR code dependency.

## Current XP-80T readiness status

Sakorio is now ready for the next XP-80T build phase:

1. Add Capacitor CLI through an approved dependency workflow.
2. Generate the iOS project on a Mac.
3. Apply the native XP-80T and Keychain scaffolds into the generated iOS project.
4. Open in Xcode.
5. Add Bluetooth usage descriptions from the provided plist snippet.
6. Test with a real XP-80T printer on iPad.

## Launch caveat

This pass does not prove physical Bluetooth printing yet. It proves that the Sakorio web/native codebase is prepared for the iPad app shell and remains build-safe after the Capacitor runtime dependency pins.

