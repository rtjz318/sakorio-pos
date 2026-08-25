# Sakorio XP-80T Android Project Generation

Date: 2026-08-25  
Branch: development  
Purpose: generate the Capacitor Android project and wire the XP-80T Bluetooth native plugin.

## 1. Node 22 Docker upgrade

Updated:

```text
front/Dockerfile
front/Dockerfile.prod
```

from:

```text
node:20-alpine
```

to:

```text
node:22-alpine
```

Reason:

```text
@capacitor/cli@8.5.0 requires Node >=22.0.0
```

Verification:

```text
node v22.23.2
capacitor 8.5.0
```

## 2. Android project generated

Executed:

```bash
cd front
npm run build -- --configuration production-static
npx cap add android
npx cap sync android
```

Result:

```text
[success] android platform added
```

Generated folder:

```text
front/android/
```

## 3. XP-80T plugin wired

Copied Android plugin scaffold into:

```text
front/android/app/src/main/java/com/sakorio/pos/Xp80tPrinterPlugin.java
```

Registered plugin in:

```text
front/android/app/src/main/java/com/sakorio/pos/MainActivity.java
```

Added Bluetooth permissions in:

```text
front/android/app/src/main/AndroidManifest.xml
```

Permissions added:

```text
android.permission.BLUETOOTH_SCAN
android.permission.BLUETOOTH_CONNECT
android.permission.BLUETOOTH
android.permission.BLUETOOTH_ADMIN
android.permission.ACCESS_FINE_LOCATION
```

## 4. Verification completed

Executed:

```bash
npm run test:xp80t-native-scaffold
npm run test:capacitor-android-readiness
```

Result:

```text
[xp80t-scaffold] OK
[capacitor-android-readiness] OK
```

Frontend build:

```text
Application bundle generation complete.
```

Frontend Docker hot reload after Node 22 rebuild:

```text
Application bundle generation complete.
Page reload sent to client(s).
```

## 5. Current build gate

This Windows shell does not currently have Java or Android SDK available on PATH:

```text
java: The term 'java' is not recognized
```

So APK/AAB building is not completed yet.

Next required tool:

- Android Studio, or
- JDK + Android SDK command-line tools.

## 6. Next commands after Android Studio/JDK is available

From PowerShell:

```powershell
cd "C:\Users\rickt\OneDrive\Pictures\Documents\Sakorio\front\android"
.\gradlew.bat assembleDebug
```

Expected output:

```text
front/android/app/build/outputs/apk/debug/app-debug.apk
```

Then install onto Android tablet and test:

1. Pair XP-80T / Printer001 in Android Bluetooth settings.
2. Open Sakorio Android app.
3. Settings → Printing.
4. Scan paired devices.
5. Connect XP-80T.
6. Print test receipt.
7. Run live POS print queue test.

## 7. Acceptance target

Android project generation is complete. APK build and real tablet/printer physical test are the next launch gates.

