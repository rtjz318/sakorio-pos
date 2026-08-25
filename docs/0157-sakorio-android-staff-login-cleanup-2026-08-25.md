# Sakorio Android Staff Login Cleanup

Date: 2026-08-25  
Branch: development  
Purpose: remove unnecessary public/marketing links from the native Android POS login screen.

## 1. Requested cleanup

The Android POS app login screen should be staff-only.

Remove from the native app login screen:

- Create Account
- Provider Login
- Courier Login
- Register as Provider
- Contact Us
- public legal/footer link cluster

## 2. Implementation

Updated:

```text
front/src/app/auth/login.component.ts
```

Behavior:

```text
If running inside native Capacitor app:
  hide public/marketing login footer
Else:
  keep normal web login footer unchanged
```

The app keeps:

- email field;
- password field;
- password visibility toggle;
- forgot password;
- language picker;
- OTP step if required;
- staff login button.

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
BUILD SUCCESSFUL in 3s
```

Updated APK:

```text
front/android/app/build/outputs/apk/debug/app-debug.apk
```

## 4. Expected result after reinstall

Open Sakorio Android app:

```text
Staff login screen
No Create Account
No Provider Login
No Courier Login
No Register as Provider
No Contact Us
```

Next test after reinstall:

```text
Login → Settings → Printing → scan/connect XP-80T → print test receipt
```

