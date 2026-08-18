# Sakorio XP-80T Implementation Pass 4 — Secure Token Storage Boundary

Date: 2026-08-18  
Branch: `development`  
Scope: native secure storage scaffold for iPad printer-agent token

## Summary

This pass adds the secure-token-storage boundary required for the future
Sakorio iPad app. The XP-80T printer-agent token can now be stored through a
native secure-storage plugin contract instead of relying on browser/session
state.

Browser mode remains safe: no token is persisted unless the native Capacitor
secure-storage plugin is available.

## Implemented

### Angular secure storage service

Added:

```text
front/src/app/services/native-secure-storage.service.ts
```

The service exposes:

- `get(key)`
- `set(key, value)`
- `remove(key)`
- native availability detection
- last error state

Expected native plugin:

```text
window.Capacitor.Plugins.SakorioSecureStorage
```

### iOS Keychain plugin scaffold

Added:

```text
front/native/ios-secure-storage/SakorioSecureStoragePlugin.swift
front/native/ios-secure-storage/SakorioSecureStoragePlugin.m
front/native/ios-secure-storage/README.md
```

The Swift scaffold uses iOS Keychain through the `Security` framework.

Keychain accessibility:

```text
kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
```

This keeps the token on the specific iPad and prevents iCloud sync.

### XP-80T setup panel updates

Updated:

```text
front/src/app/settings/xp80t-native-setup.component.ts
```

The panel now supports:

1. detecting whether native secure storage is available;
2. loading saved printer token from Keychain;
3. saving token to Keychain;
4. clearing saved token;
5. showing whether token storage is Keychain-backed or session-only.

## Security behavior

| Environment | Token behavior |
| --- | --- |
| Browser POS | Session-only, not persisted |
| Future Capacitor iPad app without plugin | Session-only, visible error |
| Future Capacitor iPad app with plugin | Stored in iOS Keychain |

## Validation

Commands run:

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

Add the real Capacitor dependency/iOS shell setup when ready:

1. add `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`;
2. generate `front/ios/`;
3. register `Xp80tPrinterPlugin`;
4. register `SakorioSecureStoragePlugin`;
5. add iOS Bluetooth permission keys;
6. run on a physical iPad.
