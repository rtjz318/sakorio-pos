# Sakorio XP-80T Implementation Pass 3 — Settings UI and Worker Control

Date: 2026-08-18  
Branch: `development`  
Scope: staff-facing XP-80T native setup UI

## Summary

This pass adds the first operational UI for the future Sakorio iPad app +
XP-80T Bluetooth printing workflow.

The UI is safe in the current browser build. It detects that the native iPad
plugin is unavailable and does not attempt direct browser Bluetooth printing.
When the app is later packaged through Capacitor and the native plugin is
registered, the same UI will allow staff to scan, connect, configure, and start
the iPad print worker.

## Implemented

Added:

```text
front/src/app/settings/xp80t-native-setup.component.ts
```

Embedded in:

```text
front/src/app/settings/printing-settings.component.ts
```

## UI capabilities

The new Settings → Printing panel supports:

1. Native plugin detection.
2. Bluetooth permission request button.
3. XP-80T scan button.
4. Device list and connect action.
5. Printer-agent token input.
6. Configure worker action.
7. Start/stop iPad printer worker actions.
8. Printer connected/offline status.
9. Worker running/stopped status.
10. Last printed job/heartbeat status.

## Browser behavior

In the current web/browser POS, the panel shows:

```text
App plugin not detected
```

This is expected. iPad Bluetooth printing requires the native Capacitor app
plugin.

## Native app behavior target

Once the iOS app shell and Swift plugin are active:

```text
Settings → Printing
→ Check app plugin
→ Allow Bluetooth
→ Scan XP-80T
→ Connect
→ Paste printer-agent token
→ Configure worker
→ Start worker
→ Sakorio print jobs lease and print automatically
```

## Validation

Command run:

```powershell
docker exec pos-front npm run build -- --configuration production-static
```

Result:

```text
Passed
```

Known existing warnings remain:

- `cashier-pos.component.ts` SCSS budget warning.
- `menu.component.scss` budget warning.
- `dijkstrajs` CommonJS warning.

## Next recommended pass

Add the secure native token storage boundary so the iPad app can persist the
printer-agent token in iOS Keychain instead of a browser-only/session value.

After that, proceed to dependency/iOS shell generation when ready to perform the
Capacitor install step.
