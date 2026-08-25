# Xprinter XP-80T iOS SDK Integration Notes

This folder is the native iOS print layer for the Sakorio iPad app.

## Current target

Printer: Xprinter XP-80T USB + Bluetooth  
Receipt language: ESC/POS  
Preferred iPad transport: official Xprinter iOS SDK  
Fallback transport: CoreBluetooth BLE writable characteristic

## Why SDK-first

The XP-80T manual describes an iOS POS-app workflow where the user opens the POS app, enters printer settings, selects Bluetooth printing, searches for the printer inside the app, and connects there.

That matches a native app integration, not Safari/PWA printing.

If the Xprinter SDK handles the printer's Bluetooth transport internally, Sakorio should use the SDK rather than depending only on raw CoreBluetooth BLE writes.

## Stable JavaScript API

Do not change the JavaScript API unless the Angular service is updated at the same time.

Angular expects:

```ts
window.Capacitor.Plugins.Xp80tPrinter.requestPermissions()
window.Capacitor.Plugins.Xp80tPrinter.scan()
window.Capacitor.Plugins.Xp80tPrinter.connect({ deviceId })
window.Capacitor.Plugins.Xp80tPrinter.disconnect()
window.Capacitor.Plugins.Xp80tPrinter.print({ jobId, payloadBase64 })
window.Capacitor.Plugins.Xp80tPrinter.getStatus()
```

## Where to wire the SDK

After the Capacitor iOS project is generated, add the official Xprinter SDK/framework to the iOS app target.

Then replace the SDK seam methods in:

```text
native/ios-xp80t/Xp80tPrinterPlugin.swift
```

Methods to replace:

```swift
scanWithXprinterSdkIfAvailable(_ call: CAPPluginCall) -> Bool
connectWithXprinterSdkIfAvailable(_ call: CAPPluginCall, deviceId: String) -> Bool
disconnectXprinterSdkIfConnected(_ call: CAPPluginCall) -> Bool
printWithXprinterSdkIfConnected(_ call: CAPPluginCall, data: Data) -> Bool
```

Return `true` when the SDK path handles the call. Return `false` to fall back to the existing CoreBluetooth BLE scaffold.

## Required physical tests

Run these on a real iPad with the real XP-80T:

1. App requests Bluetooth permission.
2. App scans and shows XP-80T / Printer001.
3. App connects from inside Sakorio, not from iPad Bluetooth Settings.
4. Short ESC/POS test receipt prints.
5. Kitchen ticket prints one item per ticket when configured.
6. Customer receipt prints company name, table, items, prices, total, payment status.
7. Auto-cut works.
8. Printer-off failure is shown in Sakorio.
9. Printer-on retry completes the same queued job without duplication.
10. App restart keeps printer setup or clearly asks cashier to reconnect.

## Acceptance rule

The app route is accepted only when the iPad app can discover, connect, print, cut, report failures, and mark Sakorio print jobs completed from the real XP-80T.

