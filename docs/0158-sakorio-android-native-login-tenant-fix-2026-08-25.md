# Sakorio Android Native Login Tenant Fix — 2026-08-25

## Context

The first Android debug APK opened the cleaned staff login screen, but staff login could still fail even when the known Sakorio staff credentials were typed correctly.

The staff web login normally has enough browser/session/domain context to reach the correct tenant, but the native Capacitor shell was entering the login route as `/login` with no tenant query parameter.

## Change made

- Added `NATIVE_SAKORIO_TENANT_ID = 1` in `front/src/app/shared/native-shell.util.ts`.
- Native shell landing redirect now opens `/login?tenant=1`.
- Native shell login falls back to tenant `1` when no tenant query parameter is present.
- Forgot-password link also preserves tenant `1` inside the native shell.

## Expected behavior

On Android tablet:

1. Open Sakorio POS app.
2. App lands on the staff login screen.
3. Login submits against Sakorio tenant `1`.
4. Successful staff login routes to the dashboard.

## APK rebuilt

Latest debug APK path:

`front/android/app/build/outputs/apk/debug/app-debug.apk`

Reinstall this APK on the Android tablet before retesting login.

## Verification performed

- Angular production-static build passed.
- Capacitor Android sync passed.
- Gradle debug APK build passed.

Known non-blocking build warnings remain unchanged:

- Existing Angular SCSS budget warnings.
- Existing CommonJS warning for `dijkstrajs` via `qrcode`.

