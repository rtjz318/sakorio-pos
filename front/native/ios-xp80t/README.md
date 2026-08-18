# XP-80T Capacitor iOS native plugin scaffold

This folder contains the native iOS starting point for Sakorio XP-80T Bluetooth
printing.

It is not compiled by the current Angular browser build. After the Capacitor iOS
project is created, copy these files into the iOS app target and wire them in
Xcode.

## Files

- `Xp80tPrinterPlugin.swift` — CoreBluetooth scanner/connector/ESC-POS writer
  skeleton.
- `Xp80tPrinterPlugin.m` — Capacitor Objective-C plugin registration bridge.
- `Info.plist-snippet.xml` — required iOS Bluetooth permission keys.

## Expected JavaScript plugin surface

The Angular service at `front/src/app/services/xp80t-printer.service.ts` expects:

```ts
window.Capacitor.Plugins.Xp80tPrinter.requestPermissions()
window.Capacitor.Plugins.Xp80tPrinter.scan()
window.Capacitor.Plugins.Xp80tPrinter.connect({ deviceId })
window.Capacitor.Plugins.Xp80tPrinter.disconnect()
window.Capacitor.Plugins.Xp80tPrinter.print({ jobId, payloadBase64 })
window.Capacitor.Plugins.Xp80tPrinter.getStatus()
```

## Real hardware notes

The Swift scaffold assumes the XP-80T exposes a BLE writable characteristic. If
the final printer uses a vendor iOS SDK or MFi/ExternalAccessory instead, keep
the same JavaScript plugin surface but replace the Swift transport internals.

Before launch, verify:

1. iPad can discover the XP-80T.
2. app can connect to the printer.
3. ESC/POS text prints clearly.
4. full cut command works.
5. large receipts print using chunked writes.
6. failed/disconnected prints are reported back to Sakorio as failed jobs.
