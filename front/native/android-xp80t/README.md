# XP-80T Android Bluetooth Printer Plugin

This folder contains the Android native scaffold for Sakorio XP-80T Bluetooth receipt printing.

## Why Android-first

The XP-80T Bluetooth model appeared as `Printer001` / Bluetooth serial during Windows testing. Android can usually connect to this kind of printer through Bluetooth Classic SPP, which is much more practical than iPad browser printing.

The launch target is now:

```text
Sakorio Android Tablet App
→ Capacitor WebView running the existing Angular staff POS
→ native Android Xp80tPrinter plugin
→ Bluetooth SPP / Xprinter Android SDK
→ XP-80T ESC/POS printer
```

## Expected shop workflow

1. Turn on XP-80T.
2. On Android tablet, open Bluetooth settings.
3. Pair with `Printer001` / XP-80T using PIN `0000`.
4. Open Sakorio Android app.
5. Go to Settings → Printing.
6. Scan paired devices.
7. Select XP-80T.
8. Print test receipt.
9. Leave the printer worker running while POS is open.

## Plugin API

The Android plugin exposes the same JavaScript API as the iOS scaffold:

```ts
requestPermissions()
scan()
connect({ deviceId })
disconnect()
print({ jobId, payloadBase64 })
getStatus()
```

This means the existing Angular service can stay mostly unchanged.

## Current scaffold behavior

`Xp80tPrinterPlugin.java` currently:

- scans paired/bonded Bluetooth devices;
- filters likely printer names;
- connects using Bluetooth SPP UUID `00001101-0000-1000-8000-00805F9B34FB`;
- writes base64-decoded ESC/POS bytes to the printer output stream;
- reports status and disconnects cleanly.

## Future SDK route

If the official Xprinter Android SDK is available and provides more reliable discovery/connection, keep the same JavaScript API and replace the transport internals.

Recommended order:

1. Test current Bluetooth SPP scaffold with the real XP-80T.
2. If stable, launch with SPP.
3. If unstable, wire the Xprinter Android SDK behind the same plugin API.

## Required Android permissions

Use `AndroidManifest-snippet.xml` after the Capacitor Android project is generated.

For Android 12+, Bluetooth permissions may also need runtime permission handling from Capacitor/Android.

## Acceptance test

The Android app route is accepted only when the real Android tablet can:

- pair with XP-80T;
- find XP-80T inside Sakorio;
- connect;
- print short test receipt;
- print kitchen tickets;
- print customer receipt with prices/company name;
- cut paper;
- show failure when printer is off;
- retry a failed queued job without duplicate receipt;
- continue printing after app restart/reconnect.

