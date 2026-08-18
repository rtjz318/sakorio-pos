# Sakorio XP-80T Implementation Pass 5 — Capacitor iOS Shell Readiness

Date: 2026-08-18  
Branch: `development`  
Scope: iPad app shell readiness checks and runbook

## Summary

This pass prepares the repository for the real Capacitor/iOS shell generation
without installing packages or generating Xcode files on this Windows desktop.

The repo now has a readiness check that confirms the Sakorio XP-80T native
scaffold is present and clearly reports what still needs to happen during the
dedicated Mac/Xcode dependency pass.

## Implemented

Added:

```text
front/scripts/check-capacitor-ios-readiness.mjs
```

Added package script:

```bash
npm run test:capacitor-ios-readiness
```

The checker validates:

1. `capacitor.config.json` exists.
2. app id is `com.sakorio.pos`.
3. app name is `Sakorio POS`.
4. web directory is `dist/front/browser`.
5. XP-80T native plugin scaffold exists.
6. secure storage Keychain plugin scaffold exists.
7. Angular native printer services exist.
8. whether Capacitor dependencies are present.
9. whether the Angular app shell has been built.
10. whether the iOS Xcode project has been generated.

## Current expected readiness result

On this Windows desktop, the readiness script should pass with warnings:

```text
@capacitor/core is not installed yet
@capacitor/cli is not installed yet
@capacitor/ios is not installed yet
Capacitor iOS project is not generated yet
```

That is expected at this stage.

## Why dependency installation was not done in this pass

Repository rules prohibit casual `npm install`; dependency changes must be done
through the project-approved lockfile-safe process. Also, a real iOS app shell
requires macOS/Xcode for meaningful validation.

## Dedicated Mac/Xcode dependency pass

Run this later on a Mac with Xcode installed.

### 1. Sync repo

```bash
git checkout development
git pull --rebase --autostash origin development
```

### 2. Add Capacitor packages

Use the repo-approved dependency update process. Do not run a casual unreviewed
install. The required packages are:

```text
@capacitor/core
@capacitor/cli
@capacitor/ios
```

After the package/lockfile update, run:

```bash
cd front
npm ci --ignore-scripts
```

### 3. Build Angular app shell

```bash
cd front
npm run build -- --configuration production-static
```

### 4. Initialize / generate iOS app

If Capacitor has not been initialized:

```bash
npx cap init "Sakorio POS" "com.sakorio.pos" --web-dir dist/front/browser
```

Then:

```bash
npx cap add ios
npx cap sync ios
```

### 5. Register native plugins in Xcode

Copy/register:

```text
front/native/ios-xp80t/Xp80tPrinterPlugin.swift
front/native/ios-xp80t/Xp80tPrinterPlugin.m
front/native/ios-secure-storage/SakorioSecureStoragePlugin.swift
front/native/ios-secure-storage/SakorioSecureStoragePlugin.m
```

into:

```text
front/ios/App/App/
```

Ensure both Swift files and Objective-C bridge files are added to the app
target.

### 6. Add iOS permissions

Apply:

```text
front/native/ios-xp80t/Info.plist-snippet.xml
```

to:

```text
front/ios/App/App/Info.plist
```

Minimum required key:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Sakorio uses Bluetooth to connect to the restaurant XP-80T receipt printer.</string>
```

Only enable `UIBackgroundModes` after foreground printing works.

### 7. Run readiness checks

```bash
cd front
npm run test:xp80t-native-scaffold
npm run test:capacitor-ios-readiness
npm run test:capacitor-ios-readiness -- --strict
```

Strict mode should pass only after dependencies, build output, and iOS project
are present.

### 8. Physical iPad + XP-80T test

1. Install app on iPad.
2. Login to Sakorio.
3. Settings → Printing.
4. Create XP-80T / native iPad Bluetooth printer-agent token.
5. Check app plugin.
6. Allow Bluetooth.
7. Scan XP-80T.
8. Connect.
9. Save token.
10. Start worker.
11. Send kitchen ticket.
12. Pay bill and print customer receipt.
13. Power-cycle printer and test failure/retry.

## Validation run in this pass

Commands:

```powershell
docker exec pos-front npm run test:capacitor-ios-readiness
docker exec pos-front npm run test:xp80t-native-scaffold
docker exec pos-front npm run build -- --configuration production-static
```

Expected result:

- readiness script passes with warnings;
- scaffold script passes;
- Angular build passes.

## Next recommended implementation pass

Once the team is ready to touch dependencies, perform the dedicated Capacitor
dependency pass. Until then, the codebase is prepared for iPad app generation
without disrupting the web POS.
