# Android Bluetooth ESC/POS Printer Plugin

This folder contains the Android native scaffold for Sakorio Bluetooth ESC/POS receipt printing. It supports XPrinter XP-80T, Epson TM models with Bluetooth Classic SPP, and compatible generic ESC/POS printers.

## Why Android-first

The original XP-80T Bluetooth model appeared as `Printer001` / Bluetooth serial during Windows testing. Android can connect to this class of printer through Bluetooth Classic SPP. Epson TM Bluetooth support uses the same raw ESC/POS route when the selected model/interface exposes Classic SPP.

The launch target is now:

```text
Sakorio Android Tablet App
→ Capacitor WebView running the existing Angular staff POS
→ native Android Xp80tPrinter plugin (legacy API name)
→ Bluetooth Classic SPP
→ XPrinter / Epson TM / compatible ESC/POS printer
```

## Expected shop workflow

1. Turn on the supported Bluetooth ESC/POS printer.
2. On Android tablet, open Bluetooth settings.
3. Pair with the printer using the PIN or pairing method in its manufacturer manual.
4. Open Sakorio Android app.
5. Go to Settings → Printing.
6. Scan paired devices.
7. Select the paired printer. Sakorio labels Epson and XPrinter devices automatically.
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
- recognises Android imaging devices and likely XPrinter, Epson TM and generic receipt-printer names;
- connects using Bluetooth SPP UUID `00001101-0000-1000-8000-00805F9B34FB`;
- retries with Android's insecure RFCOMM socket for already-paired printers that reject authenticated SPP;
- writes base64-decoded ESC/POS bytes to the printer output stream;
- reports status and disconnects cleanly.

## Vendor SDK fallback

The raw SPP route avoids bundling a vendor SDK and preserves one workflow for supported XPrinter and Epson devices. If a particular Epson model does not expose Bluetooth Classic SPP, integrate Epson ePOS SDK behind the same JavaScript API rather than changing the POS workflow.

Recommended order:

1. Test the Bluetooth SPP scaffold with each approved physical printer model.
2. If stable, launch with SPP.
3. If a model is not SPP-compatible, wire its official vendor SDK behind the same plugin API.

## Required Android permissions

Use `AndroidManifest-snippet.xml` after the Capacitor Android project is generated.

For Android 12+, Bluetooth permissions may also need runtime permission handling from Capacitor/Android.

## Acceptance test

The Android app route is accepted only when the real Android tablet can:

- pair with the approved XPrinter or Epson TM model;
- find and correctly label it inside Sakorio;
- connect;
- print short test receipt;
- print kitchen tickets;
- print customer receipt with prices/company name;
- cut paper;
- show failure when printer is off;
- retry a failed queued job without duplicate receipt;
- continue printing after app restart/reconnect.

