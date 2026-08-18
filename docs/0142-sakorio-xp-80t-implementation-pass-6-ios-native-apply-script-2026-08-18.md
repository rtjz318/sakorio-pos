# Sakorio XP-80T Implementation Pass 6 — iOS Native Scaffold Apply Script

Date: 2026-08-18  
Branch: `development`  
Scope: repeatable script for applying XP-80T/Keychain native files into the future Capacitor iOS project

## Summary

This pass adds a script that will copy Sakorio’s native XP-80T Bluetooth plugin
and secure-storage Keychain plugin into the generated Capacitor iOS app folder.

The script is safe before `front/ios/` exists. In the current Windows/browser
environment, it checks that the source scaffold exists and exits cleanly with a
message explaining that the Capacitor iOS project has not been generated yet.

## Implemented

Added:

```text
front/scripts/apply-ios-native-scaffold.mjs
```

Added package scripts:

```bash
npm run ios:check-native-scaffold
npm run ios:apply-native-scaffold
```

Updated:

```text
front/scripts/check-capacitor-ios-readiness.mjs
```

so the apply script is included in readiness checks.

## What the apply script does

When `front/ios/App/App` exists, the script copies:

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

It also patches:

```text
front/ios/App/App/Info.plist
```

with:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Sakorio uses Bluetooth to connect to the restaurant XP-80T receipt printer.</string>
```

## Mac/Xcode usage sequence

After Capacitor packages are added and the iOS shell is generated:

```bash
cd front
npm run build -- --configuration production-static
npx cap add ios
npx cap sync ios
npm run ios:apply-native-scaffold
npm run test:capacitor-ios-readiness -- --strict
```

Then open:

```bash
npx cap open ios
```

In Xcode, confirm:

1. Swift and Objective-C bridge files are included in the app target.
2. `Info.plist` contains the Bluetooth usage description.
3. The app builds on a real iPad.
4. Settings → Printing detects the native XP-80T plugin.

## Current validation expectation

On this Windows desktop before the iOS shell exists:

```bash
npm run ios:check-native-scaffold
```

should output:

```text
ios/App/App does not exist yet
source scaffold OK
```

This is a pass for the current stage.

## Next recommended pass

The next pass should be either:

1. dependency pass — add Capacitor packages and lockfile safely; or
2. continue browser-safe improvements — add UI copy/status polish and test
   coverage while waiting for Mac/iPad/XP-80T hardware.

Do not claim physical XP-80T printing is complete until tested on real iPad and
printer hardware.
