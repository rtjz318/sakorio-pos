# Sakorio XP-80T iPad App Conversion Status

Date: 2026-08-25  
Target device: iPad cashier/waiter POS  
Target printer: Xprinter XP-80T USB + Bluetooth  
Status: app conversion groundwork exists; physical iPad Bluetooth validation still required

## 1. Why this document exists

The latest successful printer tests were performed from a Windows computer using Bluetooth serial on COM4. That proves:

- Sakorio receipt job creation works.
- The print queue works.
- Kitchen/customer receipt rendering works.
- XP-80T can receive ESC/POS-style bytes from a Windows Bluetooth serial bridge.

It does not prove iPad Bluetooth printing, because iPad Safari/PWA cannot directly access most Bluetooth receipt printers and iOS does not expose generic Bluetooth SPP/COM-port printing to web apps.

For an iPad-only restaurant setup, Sakorio needs to run as a native iPad app wrapper with a native Bluetooth printing layer.

## 2. Launch architecture for iPad-only shop

```text
Sakorio iPad App
  Angular staff POS inside Capacitor WebView
  ↓
Sakorio API
  durable print queue
  ↓
iPad printer worker
  leases pending jobs from API
  ↓
Native iOS XP-80T plugin
  CoreBluetooth / vendor SDK / MFi transport
  ↓
XP-80T Bluetooth printer
```

The backend print queue should remain the source of truth. The iPad app should not print only from local cart state, because the queue gives audit history, retries, idempotency, and kitchen/customer receipt consistency.

## 3. What is already in the repository

### Capacitor app base

- `front/capacitor.config.json`
  - app id: `com.sakorio.pos`
  - app name: `Sakorio POS`
  - web build directory: `dist/front/browser`
  - `Xp80tPrinter` plugin configuration exists

### iOS native plugin scaffold

- `front/native/ios-xp80t/Xp80tPrinterPlugin.swift`
- `front/native/ios-xp80t/Xp80tPrinterPlugin.m`
- `front/native/ios-xp80t/Info.plist-snippet.xml`
- `front/native/ios-xp80t/README.md`

The scaffold defines the expected JavaScript surface:

- `requestPermissions()`
- `scan()`
- `connect({ deviceId })`
- `disconnect()`
- `print({ jobId, payloadBase64 })`
- `getStatus()`

### iPad printer services

- `front/src/app/services/xp80t-printer.service.ts`
- `front/src/app/services/ipad-printer-worker.service.ts`
- `front/src/app/services/ipad-printer-job-runner.ts`
- `front/src/app/services/xp80t-printer-readiness.ts`
- `front/src/app/settings/xp80t-native-setup.component.ts`

### Build / verification scripts

- `front/scripts/check-xp80t-native-scaffold.mjs`
- `front/scripts/check-capacitor-ios-readiness.mjs`
- `front/scripts/apply-ios-native-scaffold.mjs`
- `front/scripts/prepare-xp80t-ios-project.mjs`
- `front/scripts/test-ipad-printer-worker-simulation.mjs`
- `front/scripts/test-xp80t-receipt-renderer.mjs`
- `front/scripts/test-xp80t-readiness.mjs`

## 4. Current verification result

Run on 2026-08-25 using the bundled Codex Node runtime:

```text
check-xp80t-native-scaffold: OK
check-capacitor-ios-readiness: OK with expected warnings
```

Expected warnings:

- `@capacitor/cli` is not installed/pinned yet.
- The Capacitor iOS project has not been generated yet.

The deeper TypeScript-based printer simulation scripts could not be run in this local checkout because `node_modules/typescript` is not currently installed in the working directory and Docker Desktop was not running. This is an environment limitation, not a failed printer scaffold check.

## 5. Updated XP-80T compatibility finding

After checking the referenced XP-80T product information, this exact printer model is a realistic target for Sakorio iPad-app printing.

Confirmed / documented for XP-80T:

- interface variants include USB, Ethernet/LAN, USB + Bluetooth, and USB + WiFi;
- ESC/POS command support is listed/documented;
- 80mm paper, 72mm print width, 203 DPI, auto-cutter/partial cut;
- iOS POS-app Bluetooth workflow is documented as an in-app printer search flow, not a normal iPad Settings pairing flow;
- Xprinter's download area lists Apple/iOS SDK documentation for receipt printer products covering 58/80 series printers.

This means the implementation should now prioritize the Xprinter iOS SDK route first, while keeping CoreBluetooth direct BLE as a fallback if the SDK is unavailable or unnecessary.

## 6. Remaining iPad Bluetooth compatibility gate

Windows shows the printer as a COM port, which usually means Bluetooth Classic SPP on Windows.

iPad apps normally cannot use generic Bluetooth Classic SPP unless the printer supports one of these iOS-compatible paths:

1. Xprinter iOS SDK that talks to the printer.
2. BLE with a writable characteristic that accepts ESC/POS bytes.
3. MFi / ExternalAccessory support.
4. A network/cloud bridge instead of direct Bluetooth.

The current native Swift scaffold assumes BLE writable characteristic. If the Xprinter iOS SDK is used, keep the same JavaScript plugin surface but replace the Swift transport internals with SDK calls.

Before committing to iPad-only Bluetooth launch, the physical iPad test must confirm that the XP-80T is discoverable and writable from the native iOS app. If the printer is Classic-SPP-only and the SDK/MFi route is not available, Sakorio cannot print directly from iPad Bluetooth without a bridge device.

## 7. What must be done next

### Phase A — Dependency and build prep

1. Add/pin `@capacitor/cli` to `front/package.json` and `front/package-lock.json`.
2. Run `npm ci --ignore-scripts` in the front build environment.
3. Run:

```bash
cd front
npm run test:xp80t-native-scaffold
npm run test:capacitor-ios-readiness
npm run test:xp80t-receipt-renderer
npm run test:ipad-printer-worker-sim
```

### Phase B — Mac/Xcode iOS project generation

Requires Mac with Xcode:

```bash
cd front
npm run build -- --configuration production
npx cap add ios
npx cap sync ios
npm run ios:prepare-xp80t
npm run ios:check-native-scaffold
```

Then open the iOS project in Xcode and confirm:

- `Xp80tPrinterPlugin.swift` is included in the app target.
- `Xp80tPrinterPlugin.m` bridge is included.
- Bluetooth permission keys from `Info.plist-snippet.xml` are merged.
- app bundle id is correct.
- signing team is configured.

If using the Xprinter iOS SDK:

- add the Xprinter SDK library/framework to the iOS target;
- replace the placeholder BLE write internals in `Xp80tPrinterPlugin.swift`;
- keep the existing JavaScript API unchanged so Angular does not need another large workflow rewrite;
- confirm SDK connection, write, disconnect, and error callback behavior.

### Phase C — Physical iPad and XP-80T validation

On the real iPad:

1. Install the Sakorio iPad app build.
2. Open Settings → Printing.
3. Tap native printer setup.
4. Allow Bluetooth permission.
5. Scan for XP-80T.
6. Connect.
7. Print a short test receipt.
8. Print a kitchen ticket.
9. Print a customer receipt.
10. Turn printer off mid-job and confirm the job fails visibly.
11. Turn printer back on and confirm retry works.
12. Redeploy backend/frontend and confirm app still prints after refresh/login.

### Phase D — Production readiness

Before live use:

- Decide distribution route: TestFlight, Apple Business Manager, or direct supervised-device install.
- Keep printer-agent Windows/bridge path as emergency backup if iPad Bluetooth fails.
- Label the physical printer and pair only one cashier iPad initially.
- Run a paid/void/refund/close-table print regression before launch day.

## 8. Recommendation

Proceed with the iPad app build using XP-80T as the target printer.

Preferred implementation order:

1. Xprinter iOS SDK route.
2. Direct CoreBluetooth/BLE route.
3. Bridge fallback if the final hardware cannot be written to directly from iPad.

The decision is now stronger than the previous "maybe supported" status because the XP-80T documentation includes iOS POS-app Bluetooth workflow and ESC/POS support. The final acceptance test is still physical: Sakorio iPad app must discover the printer, connect, print kitchen/customer receipts, cut paper, handle disconnects, and mark print jobs completed/failed correctly.

## 9. Reference links checked

- Official XP-80T product page: https://www.xprinter.net/product/733.html
- Official Xprinter driver / SDK download area: https://www.xprinter.net/companyfile/1/
- XP-80T user manual mirror checked for iOS Bluetooth workflow and ESC/POS notes: https://manuals.plus/m/b098c3bb1bb3bf4c3a0cdfca0faab61492ee4c0840ef59556182239389cfcbec
