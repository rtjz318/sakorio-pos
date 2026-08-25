# Sakorio XP-80T Implementation Pass 13 — SDK-First iPad App Scaffold

Date: 2026-08-25  
Branch: development  
Purpose: move the iPad Bluetooth printing implementation from generic BLE-only thinking to an Xprinter SDK-first app scaffold.

## 1. Context

The printer is confirmed as Xprinter XP-80T USB + Bluetooth.

The printer supports ESC/POS, and the XP-80T iOS instructions describe an in-app POS Bluetooth discovery flow. This means the correct Sakorio direction remains:

```text
Sakorio iPad App
→ native iOS printer plugin
→ Xprinter SDK or CoreBluetooth BLE fallback
→ XP-80T ESC/POS receipts
```

## 2. Changes made

### 2.1 Native plugin scaffold updated

Updated:

```text
front/native/ios-xp80t/Xp80tPrinterPlugin.swift
```

Added:

- explicit SDK-first implementation notes;
- `TransportMode` enum;
- `transport` field in `getStatus()`;
- SDK seam methods:
  - `scanWithXprinterSdkIfAvailable`
  - `connectWithXprinterSdkIfAvailable`
  - `disconnectXprinterSdkIfConnected`
  - `printWithXprinterSdkIfConnected`
- fallback behavior remains the existing CoreBluetooth BLE scan/connect/write path.

The Angular/JavaScript API remains stable.

### 2.2 SDK integration guide added

Added:

```text
front/native/ios-xp80t/SDK-INTEGRATION.md
```

This explains:

- why the Xprinter iOS SDK is the preferred route;
- where to wire the SDK inside the Swift plugin;
- which JavaScript API must stay stable;
- the physical iPad + XP-80T acceptance tests.

### 2.3 Scaffold checker strengthened

Updated:

```text
front/scripts/check-xp80t-native-scaffold.mjs
```

It now verifies the SDK integration guide exists and checks for SDK-first markers inside the Swift scaffold.

## 3. Verification

Executed with bundled Codex Node runtime:

```text
node scripts/check-xp80t-native-scaffold.mjs
node scripts/check-capacitor-ios-readiness.mjs
```

Result:

```text
[xp80t-scaffold] OK
[capacitor-ios-readiness] OK
```

Expected warnings still remain:

- `@capacitor/cli` is not installed/pinned yet.
- Capacitor iOS project is not generated yet.

These are expected because the actual iOS app generation must be performed on a Mac/Xcode environment.

## 4. Remaining next steps

1. Add/pin `@capacitor/cli` in the frontend dependency pass.
2. Run `npm ci --ignore-scripts` in the front build environment.
3. Generate the iOS project on Mac:

```bash
cd front
npm run build -- --configuration production-static
npx cap add ios
npx cap sync ios
npm run ios:prepare-xp80t
```

4. Add the official Xprinter iOS SDK/framework to the Xcode target.
5. Replace the SDK seam methods in `Xp80tPrinterPlugin.swift`.
6. Run physical iPad + XP-80T tests.

## 5. Acceptance target

Sakorio is accepted for iPad Bluetooth printing only when the real iPad app can:

- discover the XP-80T in-app;
- connect;
- print a test receipt;
- print kitchen tickets;
- print customer receipts;
- cut paper;
- show failed jobs when printer is off;
- retry without duplicate receipts;
- mark print jobs completed in Sakorio.

