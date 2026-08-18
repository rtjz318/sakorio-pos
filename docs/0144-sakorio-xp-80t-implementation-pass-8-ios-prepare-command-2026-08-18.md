# Sakorio XP-80T Implementation Pass 8 — iOS Prepare Command

Date: 2026-08-18  
Scope: XP-80T iPad native Bluetooth printing compatibility

## Outcome

This pass adds a single iOS preparation command for the future Mac/Xcode build step.

Added script:

- `front/scripts/prepare-xp80t-ios-project.mjs`

Added package commands:

- `npm run ios:prepare-xp80t:check`
- `npm run ios:prepare-xp80t`

## Why this matters

Sakorio is a web POS today, but XP-80T Bluetooth printing on iPad needs a native shell. The previous passes created the native plugin scaffolds, token storage scaffold, and printer workflow. This pass makes the next developer’s iOS build path clearer and repeatable.

## What the command does

### Check-only mode

Command:

```bash
npm run ios:prepare-xp80t:check
```

This validates:

- Capacitor config exists.
- App ID is `com.sakorio.pos`.
- App name is `Sakorio POS`.
- Web directory is `dist/front/browser`.
- `@capacitor/core` and `@capacitor/ios` are pinned.
- Native XP-80T scaffold command is available.
- It reports remaining Mac/iOS steps.

This mode is safe on Windows and CI because it does not generate the iOS project.

### Prepare mode

Command:

```bash
npm run ios:prepare-xp80t -- --generate
```

Expected Mac/Xcode usage:

1. Build the Angular app if needed.
2. Run `npx cap add ios` if the iOS project is missing.
3. Run `npx cap sync ios` when an iOS project already exists.
4. Apply the XP-80T Bluetooth printer plugin scaffold.
5. Apply the secure token storage scaffold.

## Current expected warnings on this Windows desktop

The check command is expected to warn that:

- `@capacitor/cli` is not installed yet.
- The Capacitor iOS project is not generated yet.

These are not launch bugs. They are the remaining native build-machine steps.

## Verification

This pass should be verified with:

```bash
docker exec pos-front npm run ios:prepare-xp80t:check
docker exec pos-front npm run test:capacitor-ios-readiness
docker exec pos-front npm run test:xp80t-native-scaffold
docker exec pos-front npm run ios:check-native-scaffold
docker exec pos-front npm run build -- --configuration production-static
```

Backend printing regression:

```bash
docker exec pos-back python -m pytest -q tests/test_printing_service.py tests/test_printing_routes.py
```

## Next remaining XP-80T phase

The next pass should be done on a Mac with Xcode:

1. Add and pin `@capacitor/cli`.
2. Run `npm ci --ignore-scripts`.
3. Run `npm run build -- --configuration production-static`.
4. Run `npm run ios:prepare-xp80t -- --generate`.
5. Open the generated project in Xcode.
6. Confirm Bluetooth permission prompts.
7. Pair/connect the XP-80T printer.
8. Print kitchen and cashier test receipts from a real iPad.

