# Sakorio XP-80T Android Tablet Pivot

Date: 2026-08-25  
Branch: development  
Decision: launch printer support on Android tablet first.

## 1. Decision summary

Sakorio should pivot the first native POS app build from iPad-first to Android-first.

Reason:

- The XP-80T Bluetooth printer appeared as `Printer001` / serial-style Bluetooth during Windows testing.
- Android can usually use Bluetooth Classic SPP directly.
- iPad/Safari cannot print directly to Bluetooth receipt printers.
- iPad native app printing remains possible, but depends more heavily on Xprinter iOS SDK / BLE / MFi confirmation.

Android tablet is therefore the faster and lower-risk launch route.

## 2. Target architecture

```text
Sakorio Android Tablet App
→ Capacitor WebView running existing Angular staff POS
→ native Android Xp80tPrinter plugin
→ Bluetooth SPP or Xprinter Android SDK
→ XP-80T ESC/POS receipt printer
```

The backend print queue remains unchanged.

```text
Sakorio API
→ PrintJob queue
→ Android tablet printer worker
→ XP-80T printer
→ job complete/fail callback
```

## 3. Files added / updated

Added Android native scaffold:

```text
front/native/android-xp80t/Xp80tPrinterPlugin.java
front/native/android-xp80t/AndroidManifest-snippet.xml
front/native/android-xp80t/README.md
```

Added Android readiness checker:

```text
front/scripts/check-capacitor-android-readiness.mjs
```

Updated scaffold checker:

```text
front/scripts/check-xp80t-native-scaffold.mjs
```

Updated package script:

```text
npm run test:capacitor-android-readiness
```

## 4. Android plugin behavior

The Android scaffold currently:

- uses Capacitor plugin name `Xp80tPrinter`;
- scans paired/bonded Bluetooth devices;
- filters likely printer names such as `Printer001`, `XP`, `80`, `printer`;
- connects using Bluetooth Classic SPP UUID:

```text
00001101-0000-1000-8000-00805F9B34FB
```

- decodes `payloadBase64`;
- writes ESC/POS bytes to the Bluetooth socket output stream;
- reports status with transport `androidBluetoothSpp`.

The Angular printer service can keep using the same plugin API already planned for iOS:

```ts
requestPermissions()
scan()
connect({ deviceId })
disconnect()
print({ jobId, payloadBase64 })
getStatus()
```

## 5. Android dependency gate

Current `front/package.json` already has:

```text
@capacitor/core 8.5.0
@capacitor/ios  8.5.0
```

Android launch requires adding:

```text
@capacitor/cli     8.5.0
@capacitor/android 8.5.0
```

This must be done with npm/package-lock, not pnpm:

```bash
cd front
npm install --package-lock-only --ignore-scripts --save-exact --save-dev @capacitor/cli@8.5.0 @capacitor/android@8.5.0
npm ci --ignore-scripts
npm run test:xp80t-native-scaffold
npm run test:capacitor-android-readiness
```

Do not commit `node_modules`.

## 6. Android project generation

After dependencies are pinned:

```bash
cd front
npm run build -- --configuration production-static
npx cap add android
npx cap sync android
```

Then copy/register the native plugin scaffold into the generated Android app:

```text
front/native/android-xp80t/Xp80tPrinterPlugin.java
→ front/android/app/src/main/java/com/sakorio/pos/Xp80tPrinterPlugin.java
```

Merge permissions from:

```text
front/native/android-xp80t/AndroidManifest-snippet.xml
```

into:

```text
front/android/app/src/main/AndroidManifest.xml
```

## 7. Physical tablet workflow

1. Turn on XP-80T.
2. On Android tablet, open Bluetooth settings.
3. Pair with `Printer001` / XP-80T.
4. Use PIN `0000` if prompted.
5. Open Sakorio Android app.
6. Go to Settings → Printing.
7. Scan paired devices.
8. Select XP-80T.
9. Print test receipt.
10. Run POS table order → kitchen print → customer receipt → payment → close table.

## 8. Verification performed in this pass

Executed locally with bundled Node runtime:

```text
node scripts/check-xp80t-native-scaffold.mjs
node scripts/check-capacitor-android-readiness.mjs
```

Result:

```text
[xp80t-scaffold] OK
[capacitor-android-readiness] OK
```

Expected warnings:

- `@capacitor/cli` is not installed yet.
- `@capacitor/android` is not installed yet.
- Capacitor Android project is not generated yet.

## 9. Acceptance target

Sakorio Android POS printing is launch-ready only when a real Android tablet can:

- pair with XP-80T;
- find XP-80T inside Sakorio;
- connect;
- print test receipt;
- print kitchen tickets;
- print customer receipts with correct company name/items/prices;
- auto-cut;
- fail visibly when printer is off;
- retry without duplicate receipts;
- keep working after app restart/reconnect.

