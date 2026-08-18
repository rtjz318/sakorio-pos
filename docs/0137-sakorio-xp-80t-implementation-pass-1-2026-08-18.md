# Sakorio XP-80T Compatibility Implementation Pass 1

Date: 2026-08-18  
Branch: `development`  
Scope: first code implementation toward XP-80T Bluetooth/iPad compatibility

## What was implemented

This pass prepares Sakorio for an XP-80T iPad-app printing build without
breaking the existing browser POS or WiFi/LAN printer-agent path.

## Backend changes

### Printer-agent metadata

`PrinterAgent` now supports optional operational metadata:

- `device_type`
  - `local_agent`
  - `ipad_app`
  - `xp80t`
- `transport`
  - `network`
  - `bluetooth_serial`
  - `ios_bluetooth`
- `app_version`

Files:

- `back/app/models.py`
- `back/app/printing_routes.py`
- `back/migrations/20260818120000_add_printer_agent_device_metadata.sql`

Why this matters:

- Settings can distinguish a normal WiFi/LAN bridge from an XP-80T iPad app
  printer client.
- The same print queue can support multiple delivery modes.
- Future operations/debugging can show whether the device is a native iPad
  Bluetooth client or a local bridge.

## Frontend changes

### Printing Settings pairing UI

Settings → Printing now supports selecting:

- device type;
- printer transport.

Paired devices also show labels like:

```text
XP-80T · native iPad Bluetooth
Local bridge · Bluetooth serial
Local bridge · Wi-Fi/LAN
```

File:

- `front/src/app/settings/printing-settings.component.ts`

### XP-80T native plugin boundary

Added a safe TypeScript service that detects and calls a future native
Capacitor plugin only when it exists:

- `front/src/app/services/xp80t-printer.service.ts`

Expected native plugin name:

```text
window.Capacitor.Plugins.Xp80tPrinter
```

Supported app-facing methods:

- `requestPermissions`
- `scan`
- `connect`
- `disconnect`
- `print`
- `getStatus`

### ESC/POS receipt renderer

Added a TypeScript ESC/POS renderer compatible with Sakorio receipt payloads:

- `front/src/app/services/escpos-receipt-renderer.ts`

It produces:

- ESC/POS initialize command;
- text receipt body;
- customer totals;
- kitchen/bar item notes;
- full cut command.

### iPad printer worker

Added an app-side print worker:

- `front/src/app/services/ipad-printer-worker.service.ts`

Responsibilities:

1. heartbeat to Sakorio API;
2. lease print jobs;
3. render ESC/POS receipt bytes;
4. send bytes to XP-80T native plugin;
5. mark job completed;
6. mark job failed with error when Bluetooth printing fails.

This mirrors the existing external `printer-agent`, but is designed to run
inside the future native iPad app.

## What is not implemented yet

This pass does not yet add:

1. Capacitor dependencies/project files.
2. iOS/Xcode project.
3. Swift native Bluetooth implementation.
4. XP-80T real-device Bluetooth scan/connect/print code.
5. iOS Keychain storage for printer token.
6. App Store/TestFlight packaging.

Reason:

- Adding Capacitor dependencies changes package/lock files and should be done as
  a dedicated dependency/install pass.
- iOS native compilation requires Xcode/macOS and a physical iPad/XP-80T.

## Validation run

Commands run:

```powershell
& 'C:\Users\rickt\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' printer-agent/test_agent.py
docker exec pos-back python -m pytest -q tests/test_printing_service.py
docker exec pos-front npm run build -- --configuration production-static
```

Results:

| Check | Result |
| --- | --- |
| Bluetooth/local printer-agent tests | Passed, 7/7 |
| Backend print queue tests | Passed, 5/5 |
| Angular production-static build | Passed |

Known existing warnings:

- `cashier-pos.component.ts` SCSS budget warning.
- `menu.component.scss` budget warning.
- `dijkstrajs` CommonJS warning through QR code dependency.

These warnings existed outside this implementation and did not block the build.

## Next implementation pass

Recommended next pass:

1. Add Capacitor packages using lockfile-safe dependency flow.
2. Create the iOS app shell.
3. Add native plugin placeholder files.
4. Add iOS Bluetooth permissions.
5. Add app pairing screen or Settings action to store printer token securely.
6. Test the app shell on a real iPad.

After the XP-80T arrives:

1. confirm whether XP-80T exposes BLE writable characteristic, iOS SDK, or MFi
   protocol;
2. implement the Swift print transport;
3. run real test print;
4. run kitchen ticket and customer receipt end-to-end.
