# Sakorio XP-80T Android Capacitor Dependency Pass

Date: 2026-08-25  
Branch: development  
Purpose: add the Android Capacitor build dependencies for the Sakorio Android tablet POS route.

## 1. Dependencies added

Added to `front/package.json` dev dependencies:

```text
@capacitor/android 8.5.0
@capacitor/cli     8.5.0
```

Already present:

```text
@capacitor/core 8.5.0
@capacitor/ios  8.5.0
```

`front/package-lock.json` was updated by npm.

## 2. Commands executed

Executed inside the existing `front` Docker container:

```bash
npm install --package-lock-only --ignore-scripts --save-exact --save-dev @capacitor/cli@8.5.0 @capacitor/android@8.5.0
npm ci --ignore-scripts
npm run test:xp80t-native-scaffold
npm run test:capacitor-android-readiness
npm run build -- --configuration production-static
```

## 3. Verification result

```text
[xp80t-scaffold] OK
[capacitor-android-readiness] OK
```

Production-static Angular build:

```text
Application bundle generation complete.
```

Warnings only:

- `@capacitor/cli@8.5.0` requires Node `>=22.0.0`, while the current front Docker container is Node `20.20.2`.
- Angular style budget warnings already exist for POS/menu styles.
- CommonJS optimization warning from `qrcode` / `dijkstrajs`.

## 4. Important Node version note

The dependency install and readiness checks completed under Node 20, but Capacitor CLI 8.5.0 declares:

```text
node >=22.0.0
```

Before generating the Android project or building APK/AAB, use a build environment with Node 22+.

Recommended:

```bash
node --version
# must be v22 or newer
```

## 5. Next implementation step

Generate the Android project in a Node 22+ environment:

```bash
cd front
npm ci --ignore-scripts
npm run build -- --configuration production-static
npx cap add android
npx cap sync android
```

Then copy/register the Android native plugin scaffold:

```text
front/native/android-xp80t/Xp80tPrinterPlugin.java
→ front/android/app/src/main/java/com/sakorio/pos/Xp80tPrinterPlugin.java
```

and merge permissions from:

```text
front/native/android-xp80t/AndroidManifest-snippet.xml
```

into:

```text
front/android/app/src/main/AndroidManifest.xml
```

## 6. Acceptance target

The dependency pass is complete. Android project generation and physical XP-80T Bluetooth printing are the next gates.

