# Sakorio XP-80T Implementation Pass 2 — Native iPad Scaffold

Date: 2026-08-18  
Branch: `development`  
Scope: Capacitor/iOS native printer scaffold for XP-80T compatibility

## Summary

This pass adds a repo-level native iPad scaffold for XP-80T Bluetooth printing
without installing Capacitor packages yet and without disrupting the existing
browser POS deployment.

The current production/staging Angular build remains valid. The native files
are staged under `front/native/ios-xp80t/` until the project moves to a Mac/Xcode
environment.

## Implemented files

### Capacitor config

Added:

```text
front/capacitor.config.json
```

Key settings:

- app id: `com.sakorio.pos`
- app name: `Sakorio POS`
- web directory: `dist/front/browser`

### Native iOS plugin scaffold

Added:

```text
front/native/ios-xp80t/Xp80tPrinterPlugin.swift
front/native/ios-xp80t/Xp80tPrinterPlugin.m
front/native/ios-xp80t/Info.plist-snippet.xml
front/native/ios-xp80t/README.md
```

The Swift plugin skeleton includes:

- CoreBluetooth manager;
- Bluetooth permission request surface;
- scan method;
- connect method;
- disconnect method;
- print method accepting `payloadBase64`;
- status method;
- writable characteristic discovery;
- ESC/POS chunked writes;
- disconnect event emission.

### Scaffold verification

Added:

```text
front/scripts/check-xp80t-native-scaffold.mjs
```

Added package script:

```bash
npm run test:xp80t-native-scaffold
```

This confirms that the expected native scaffold files exist and that the config
points to the correct Angular output directory.

## Why Capacitor packages were not installed in this pass

Repository rules require careful dependency handling and prohibit casual
`npm install`. This pass avoids dependency churn and keeps the browser build
safe.

The next dedicated dependency pass should add:

```text
@capacitor/core
@capacitor/cli
@capacitor/ios
```

using the repo-approved lockfile-safe process.

## What still requires Mac/Xcode

The following cannot be completed on this Windows desktop alone:

1. Generate `front/ios/` with Capacitor.
2. Open the project in Xcode.
3. Add the Swift/Objective-C plugin files to the iOS target.
4. Add Bluetooth usage keys to `Info.plist`.
5. Build/run on a physical iPad.
6. Test with real XP-80T printer hardware.

## Real printer protocol risk

The Swift scaffold assumes the XP-80T exposes a BLE writable characteristic. If
the purchased unit instead uses:

- Xprinter vendor iOS SDK;
- MFi / ExternalAccessory protocol;
- proprietary app-only Bluetooth;

then the JavaScript-facing plugin interface should remain the same, but the
Swift internals must be replaced with the correct vendor/protocol transport.

## Next recommended pass

1. Add Capacitor dependencies and update lockfile safely.
2. Generate the iOS app shell on a Mac.
3. Copy/register the XP-80T plugin scaffold into the iOS target.
4. Wire secure printer-token storage, preferably iOS Keychain.
5. Add a visible Settings → Printing native pairing/test-print panel.
6. Test on actual iPad + XP-80T.

## Validation command

From `front/`:

```bash
npm run test:xp80t-native-scaffold
```
