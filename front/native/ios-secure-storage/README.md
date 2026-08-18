# Sakorio secure storage iOS plugin scaffold

This scaffold stores app-only secrets in iOS Keychain once Sakorio is packaged
as a Capacitor iPad app.

Primary launch use:

- store the XP-80T printer-agent token used by
  `front/src/app/services/ipad-printer-worker.service.ts`.

The browser build does not compile these files. After the Capacitor iOS project
is created, copy/register these files into the iOS app target.

## JavaScript contract

Angular calls:

```ts
window.Capacitor.Plugins.SakorioSecureStorage.get({ key })
window.Capacitor.Plugins.SakorioSecureStorage.set({ key, value })
window.Capacitor.Plugins.SakorioSecureStorage.remove({ key })
```

## Security notes

- Keychain accessibility is `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.
- Tokens are not synced to other iCloud devices.
- Disable/recreate the printer-agent token in Sakorio Settings if an iPad is
  lost or reassigned.
- Do not store HitPay, Render, database, or SMTP credentials in the app.
