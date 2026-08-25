# Sakorio Android Native Login/API Fix

Date: 2026-08-25  
Branch: development  
Purpose: fix the first installed Android APK opening the public landing page instead of the staff login screen.

## 1. Issue observed

After installing the first Android debug APK, the app did not open on the staff login screen.

Root cause:

- Sakorio route `/` is the public landing page.
- Capacitor Android app launches the bundled app at the root route.
- Native shell hostname/protocol differs from `staff.sakorio.com`, so production API detection also needed a native-app override.

## 2. Fixes made

Added native shell detection helper:

```text
front/src/app/shared/native-shell.util.ts
```

Updated landing page:

```text
front/src/app/landing/landing.component.ts
```

Behavior:

```text
If running inside native Capacitor app:
  / → /login
```

Web behavior remains unchanged.

Updated production environment:

```text
front/src/environments/environment.prod.ts
```

Behavior:

```text
If running inside native Capacitor app:
  apiUrl = https://api.sakorio.com
  wsUrl  = wss://api.sakorio.com/ws
```

## 3. Verification

Executed:

```bash
npm run build -- --configuration production-static
npx cap sync android
npm run test:xp80t-native-scaffold
npm run test:capacitor-android-readiness
.\gradlew.bat assembleDebug
```

Result:

```text
BUILD SUCCESSFUL in 6s
```

Updated APK:

```text
front/android/app/build/outputs/apk/debug/app-debug.apk
```

## 4. Next test

Reinstall the updated APK on the Android tablet.

Expected result:

```text
Open Sakorio Android app
→ staff login screen appears
→ login uses https://api.sakorio.com
```

After login, continue physical XP-80T Bluetooth test:

```text
Settings → Printing → scan paired devices → connect XP-80T → print test receipt
```

